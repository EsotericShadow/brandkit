use axum::{Json, extract::{State, Query}};
use serde_json::json;
use crate::{AppState, models::{GenerateGuideRequest, RewriteRequest, ConsistencyRequest, UserInputs}, prompts};
use crate::agents::orchestrator as orchestration;
use tokio::time::{timeout, Duration};
use axum::http::StatusCode;
use axum::extract::ws::{WebSocketUpgrade, Message, WebSocket};
use axum::response::Response;

pub async fn health() -> Json<serde_json::Value> {
    tracing::info!("health: ok");
    Json(json!({"ok": true}))
}

pub async fn generate_guide(State(state): State<AppState>, Json(payload): Json<GenerateGuideRequest>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("generate_guide: received request (multi-agent)");
    let orchestration = orchestration::generate_guide_multiagent(&*state.adapter, &payload.inputs, None, None).await.map_err(internal_err)?;
    tracing::debug!(checklist = %orchestration.checklist_md, "orchestration checklist updated");
    let core = orchestration.guide_core;

    // Build palette using the same thematic logic as before
    let roles = vec![
        "primary".to_string(),
        "secondary".to_string(),
        "accent".to_string(),
        "neutralLight".to_string(),
        "neutralDark".to_string(),
        "neutralLightDark".to_string(),
        "neutralDarkDark".to_string(),
        "background".to_string(),
        "backgroundDark".to_string(),
        "text".to_string(),
        "textDark".to_string(),
        "link".to_string(),
        "linkDark".to_string(),
        "onPrimary".to_string(),
    ];
    let mut suggested_map = derive_palette_fallback(&payload.inputs, &roles);
    for (k, v) in payload.inputs.palette.iter() { suggested_map.insert(k.clone(), json!(v)); }

    let mut full = core;
    full["palette"] = serde_json::Value::Object(suggested_map);
    full["logoUrl"] = serde_json::to_value(&payload.inputs.logoUrl).unwrap_or(json!(null));
    Ok(Json(full))
}

pub async fn rewrite_text(State(state): State<AppState>, Json(payload): Json<RewriteRequest>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("rewrite_text: received request, text_len={} chars", payload.textToRewrite.len());
    let sys = prompts::build_rewrite_system(&payload.brandGuide, payload.options.as_ref());
    let text = state.adapter.generate_text(&payload.textToRewrite, Some(&sys), Some(0.6)).await.map_err(internal_err)?;
    Ok(Json(json!({"text": text})))
}

pub async fn check_consistency(State(state): State<AppState>, Json(payload): Json<ConsistencyRequest>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("check_consistency: received request, text_len={} chars", payload.textToCheck.len());
    let prompt = prompts::build_consistency_prompt(&payload.textToCheck, &payload.brandGuide);
let schema = crate::adapters::schemas::consistency_schema();
    let data = state.adapter.generate_json(&prompt, Some(schema), Some(0.3)).await.map_err(internal_err)?;
    Ok(Json(data))
}

fn internal_err<E: std::fmt::Display>(e: E) -> (StatusCode, String) {
    // Log full error server-side, but do not leak upstream URLs or secrets to clients
    tracing::error!("Upstream error: {}", e);
    (StatusCode::BAD_GATEWAY, "Upstream provider error".to_string())
}

#[derive(Debug, Default, Clone, serde::Deserialize)]
pub struct PaletteQuery {
    pub roles: Option<String>,
    pub seed: Option<u64>,
    pub preset: Option<String>,
    pub model: Option<String>,
}

#[allow(unused_variables, unused_mut)]
pub async fn suggest_palette(
    State(state): State<AppState>,
    Query(q): Query<PaletteQuery>,
    Json(inputs): Json<UserInputs>
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("suggest_palette: request received, brand='{}'", inputs.brandName);
    // Determine desired roles: from query ?roles=..., otherwise from user inputs or sensible defaults
    let roles: Vec<String> = if let Some(r) = q.roles.as_ref() {
        r.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
    } else if !inputs.palette.is_empty() {
        inputs.palette.keys().cloned().collect()
    } else {
        vec!["primary".into(), "secondary".into(), "accent".into(), "background".into(), "text".into(), "link".into()]
    };

    // Seed and preset controls for variety
    let seed: u64 = q.seed.unwrap_or(0);
    let preset = q.preset.clone().unwrap_or_else(|| "balanced".to_string());
    let model = q.model.clone().unwrap_or_else(|| "gemini:gemini-2.5-flash".to_string());

    // Cache key based on brand + roles + provided palette snapshot + seed/preset/model
    let cache_key = format!(
        "{}|{}|{}|{}|{}|seed:{}|preset:{}|model:{}",
        inputs.brandName,
        inputs.industry,
        inputs.toneTraits.join(","),
        roles.join(","),
        serde_json::to_string(&inputs.palette).unwrap_or_default(),
        seed,
        preset,
        model,
    );

    // Fast path: cache hit
    if let Some(hit) = {
        let mut guard = state.palette_cache.lock().await;
        guard.get(&cache_key).cloned()
    } {
        return Ok(Json(hit));
    }

    // Prepare base (fallback) palette to use as a guardrail for the LLM
    let base_map_json = derive_palette_fallback(&inputs, &roles);
    let mut base_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for (k, v) in base_map_json.iter() {
        if let Some(s) = v.as_str() { base_map.insert(k.clone(), s.to_string()); }
        else if v.is_string() { base_map.insert(k.clone(), v.to_string()); }
    }

    // Build upstream request and local fallback concurrently; return the fastest within a short timeout
    let palette_prompt = crate::prompts::build_palette_prompt_with_roles_seeded(&inputs, &roles, &base_map, seed, Some(&preset));
    let palette_schema = crate::adapters::schemas::palette_schema_for_roles(&roles);
    let adapter = state.adapter.clone();
    let inputs_clone = inputs.clone();
    let roles_clone = roles.clone();
    let model_clone = model.clone();

    let upstream_fut = async move {
        // temperature tuned by preset
        let temp = match preset.to_lowercase().as_str() {
            "bold" => 0.45,
            "subtle" => 0.25,
            _ => 0.35,
        };
        let mut suggested = adapter.generate_json_model(&model_clone, &palette_prompt, Some(palette_schema), Some(temp)).await?;
        if let Some(map) = suggested.as_object_mut() {
            // Preserve any user provided roles exactly
            for (k, v) in inputs_clone.palette.iter() { map.insert(k.clone(), json!(v)); }
            if !roles_clone.is_empty() {
                let want: std::collections::HashSet<String> = roles_clone.iter().map(|s| s.to_lowercase()).collect();
                let keep: Vec<String> = map.keys().cloned().collect();
                for k in keep { if !want.contains(&k.to_lowercase()) { map.remove(&k); } }
            }
        }
        Ok::<serde_json::Value, anyhow::Error>(suggested)
    };

    // Use a tight timeout for upstream; if it doesn't respond quickly, use fallback to keep UX snappy
    // We need two independent fallbacks because futures are not clonable
    let inputs_fb1 = inputs.clone();
    let roles_fb1 = roles.clone();
    let fallback_fut1 = async move {
        let derived = derive_palette_fallback(&inputs_fb1, &roles_fb1);
        Ok::<serde_json::Value, anyhow::Error>(json!(derived))
    };

    // Await the LLM up to a short timeout; only then fall back to deterministic palette
    let mut result = match timeout(Duration::from_millis(1500), upstream_fut).await {
        Ok(Ok(v)) => v,
        _ => fallback_fut1.await.unwrap_or(json!({})),
    };

    // Post-process: enforce brand-system constraints and tint neutrals if the model returned generic grays
    fn parse_hex(s: &str) -> Option<(u8,u8,u8)> {
        let t = s.trim();
        let h = t.strip_prefix('#').unwrap_or(t);
        if h.len() != 6 { return None; }
        let r = u8::from_str_radix(&h[0..2], 16).ok()?;
        let g = u8::from_str_radix(&h[2..4], 16).ok()?;
        let b = u8::from_str_radix(&h[4..6], 16).ok()?;
        Some((r,g,b))
    }
    fn to_hex(r: u8,g: u8,b: u8) -> String { format!("#{:02x}{:02x}{:02x}", r,g,b) }
    fn rgb_to_hsl(r: u8, g: u8, b: u8) -> (f32,f32,f32) {
        let r = r as f32 / 255.0; let g = g as f32 / 255.0; let b = b as f32 / 255.0;
        let max = r.max(g.max(b)); let min = r.min(g.min(b));
        let mut h = 0.0; let mut s = 0.0; let l = (max + min) / 2.0;
        if (max - min) > 0.00001 {
            let d = max - min;
            s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max - min) };
            h = if (max - r).abs() < 1e-6 { (g - b) / d + if g < b { 6.0 } else { 0.0 } }
                else if (max - g).abs() < 1e-6 { (b - r) / d + 2.0 }
                else { (r - g) / d + 4.0 };
            h /= 6.0;
        }
        (h * 360.0, s, l)
    }
    fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8,u8,u8) {
        let h = ((h % 360.0) + 360.0) % 360.0;
        let c = (1.0 - (2.0*l - 1.0).abs()) * s;
        let x = c * (1.0 - (((h/60.0) % 2.0) - 1.0).abs());
        let m = l - c/2.0;
        let (r1,g1,b1) = if h < 60.0 {(c,x,0.0)} else if h < 120.0 {(x,c,0.0)} else if h < 180.0 {(0.0,c,x)} else if h < 240.0 {(0.0,x,c)} else if h < 300.0 {(x,0.0,c)} else {(c,0.0,x)};
        let r = ((r1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
        let g = ((g1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
        let b = ((b1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
        (r,g,b)
    }
    fn hsl_to_hex(h: f32, s: f32, l: f32) -> String { let (r,g,b) = hsl_to_rgb(h,s,l); to_hex(r,g,b) }
    fn norm(x:f32) -> f32 { let mut h = x % 360.0; if h < 0.0 { h += 360.0; } h }
    fn contrast(a: (u8,u8,u8), b: (u8,u8,u8)) -> f32 {
        fn chan(c: u8) -> f32 { let x = c as f32 / 255.0; if x <= 0.03928 { x/12.92 } else { ((x+0.055)/1.055).powf(2.4) } }
        let la = 0.2126*chan(a.0) + 0.7152*chan(a.1) + 0.0722*chan(a.2);
        let lb = 0.2126*chan(b.0) + 0.7152*chan(b.1) + 0.0722*chan(b.2);
        let (br, dr) = if la > lb { (la, lb) } else { (lb, la) };
        (br + 0.05) / (dr + 0.05)
    }
    fn ensure_contrast(mut hex: String, bg_hex: &str, target: f32) -> String {
        let mut safety = 0;
        let bg = parse_hex(bg_hex).unwrap_or((255,255,255));
        while safety < 12 {
            let rgb = parse_hex(&hex).unwrap_or((0,0,0));
            if contrast(rgb, bg) >= target { break; }
            let (h,s,mut l) = rgb_to_hsl(rgb.0,rgb.1,rgb.2);
            let (_,_,bl) = rgb_to_hsl(bg.0,bg.1,bg.2);
            if bl >= 0.5 { l = (l - 0.06).max(0.0); } else { l = (l + 0.06).min(1.0); }
            hex = hsl_to_hex(h,s,l);
            safety += 1;
        }
        hex
    }
    fn hue_distance(a_h: f32, b_h: f32) -> f32 {
        let mut d = (a_h - b_h).abs();
        while d >= 360.0 { d -= 360.0; }
        if d > 180.0 { 360.0 - d } else { d }
    }
    fn hue_of(hex: &str) -> Option<f32> { let (r,g,b) = parse_hex(hex)?; Some(rgb_to_hsl(r,g,b).0) }
    fn sat_of(hex: &str) -> Option<f32> { let (r,g,b) = parse_hex(hex)?; Some(rgb_to_hsl(r,g,b).1) }

    let conservative_industries = ["finance","bank","banking","insurance","legal","law","enterprise","b2b","health","healthcare"];
    let is_conservative = conservative_industries.iter().any(|k| inputs.industry.to_lowercase().contains(k));

    if let Some(map) = result.as_object_mut() {
        // Establish primary and background context
        let primary = inputs.palette.get("primary").cloned()
            .or_else(|| map.get("primary").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or("#3366cc".to_string());
        let background = inputs.palette.get("background").cloned()
            .or_else(|| map.get("background").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| base_map.get("background").cloned().unwrap_or("#ffffff".to_string()));
        let primary_h = hue_of(&primary).unwrap_or(220.0);
        let (p_h, p_s, p_l) = { let (r,g,b) = parse_hex(&primary).unwrap_or((0x33,0x66,0xcc)); rgb_to_hsl(r,g,b) };

        // Neutrals: avoid pure grays unless conservative; tint toward primary
        if !is_conservative {
            let nL_bad = map.get("neutralLight").and_then(|v| v.as_str()).map(|s| s.to_string());
            if let Some(nl) = nL_bad {
                let s = sat_of(&nl).unwrap_or(0.0);
                let too_gray = s <= 0.01 || nl.to_lowercase().starts_with("#fafafa") || nl.to_lowercase().starts_with("#f5f5f5");
                if too_gray {
                    let (_, _, bg_l) = { let (r,g,b) = parse_hex(&background).unwrap_or((255,255,255)); rgb_to_hsl(r,g,b) };
                    let repl = hsl_to_hex(p_h, 0.04, (bg_l+0.06).clamp(0.85, 0.98));
                    map.insert("neutralLight".to_string(), json!(ensure_contrast(repl, &background, 4.5)));
                }
            } else if let Some(base) = base_map.get("neutralLight") { map.insert("neutralLight".to_string(), json!(base)); }

            let nD_bad = map.get("neutralDark").and_then(|v| v.as_str()).map(|s| s.to_string());
            if let Some(nd) = nD_bad {
                let s = sat_of(&nd).unwrap_or(0.0);
                let too_gray = s <= 0.01 || nd.to_lowercase().starts_with("#333") || nd.to_lowercase().starts_with("#323232");
                if too_gray {
                    let (_, _, bg_l) = { let (r,g,b) = parse_hex(&background).unwrap_or((255,255,255)); rgb_to_hsl(r,g,b) };
                    let repl = hsl_to_hex(p_h, 0.04, (bg_l-0.78).clamp(0.08, 0.2));
                    map.insert("neutralDark".to_string(), json!(ensure_contrast(repl, &background, 4.5)));
                }
            } else if let Some(base) = base_map.get("neutralDark") { map.insert("neutralDark".to_string(), json!(base)); }
        }

        // Accent/Secondary: ensure separation and tasteful family for green/cyan brands
        let acc_opt = map.get("accent").and_then(|v| v.as_str()).map(|s| s.to_string());
        if let Some(acc) = acc_opt {
            let acc_h = hue_of(&acc).unwrap_or(primary_h);
            let d = hue_distance(primary_h, acc_h);
            // If too close or (for balanced/subtle) harsh complement, remap to warmer counterpoint
            let low_sep = d < 40.0;
            let near_complement = (d-180.0).abs() < 18.0;
            let tone: Vec<String> = inputs.toneTraits.iter().map(|s| s.to_lowercase()).collect();
            let is_subtle = tone.iter().any(|t| ["calm","trustworthy","minimal","professional","refined"].contains(&t.as_str()));
            let is_bold = tone.iter().any(|t| ["bold","vibrant","energetic","playful","innovative","confident"].contains(&t.as_str()));
            let band = |h: f32| -> &'static str {
                let h = norm(h);
                if h < 15.0 || h >= 345.0 { "red" }
                else if h < 45.0 { "orange" }
                else if h < 75.0 { "yellow" }
                else if h < 105.0 { "warm-green" }
                else if h < 150.0 { "green" }
                else if h < 190.0 { "cyan" }
                else if h < 250.0 { "blue" }
                else if h < 275.0 { "indigo" }
                else if h < 305.0 { "violet" }
                else if h < 335.0 { "magenta" } else { "pink" }
            };
            let pb = band(primary_h);
            if low_sep || (near_complement && (is_subtle || !is_bold)) {
                let target_h = match pb {
                    "green" | "cyan" => if is_bold { 30.0 } else if is_subtle { 260.0 } else { 35.0 },
                    "blue" => 35.0,
                    "indigo" | "violet" => 40.0,
                    "red" | "orange" => 200.0,
                    "yellow" => 220.0,
                    _ => norm(primary_h + 150.0),
                };
                let acc_s = if is_bold { (p_s*1.1).clamp(0.45,0.85) } else if is_subtle { (p_s*0.75).clamp(0.18,0.6) } else { (p_s*0.95).clamp(0.28,0.7) };
                let acc_l = if is_bold { (p_l+0.00).clamp(0.48,0.58) } else if is_subtle { (p_l+0.06).clamp(0.54,0.66) } else { (p_l+0.04).clamp(0.5,0.62) };
                let mut repl = hsl_to_hex(target_h, acc_s, acc_l);
                repl = ensure_contrast(repl, &background, 3.0);
                map.insert("accent".to_string(), json!(repl));
            }
        } else if let Some(base) = base_map.get("accent") { map.insert("accent".to_string(), json!(base)); }

        if let Some(sec) = map.get("secondary").and_then(|v| v.as_str()).map(|s| s.to_string()) {
            let sec_h = hue_of(&sec).unwrap_or(primary_h);
            let d = hue_distance(primary_h, sec_h);
            if d < 12.0 || d > 36.0 {
                if let Some(base) = base_map.get("secondary") { map.insert("secondary".to_string(), json!(base)); }
                else {
                    // recompute analog secondary
                    let sec_offset = if primary_h >= 60.0 && primary_h <= 200.0 { -18.0 } else { 20.0 };
                    let mut repl = hsl_to_hex(norm(primary_h + sec_offset), (p_s*0.82).clamp(0.18,0.78), (p_l+0.06).clamp(0.46,0.72));
                    repl = ensure_contrast(repl, &background, 3.0);
                    map.insert("secondary".to_string(), json!(repl));
                }
            }
        } else if let Some(base) = base_map.get("secondary") { map.insert("secondary".to_string(), json!(base)); }

        // Link: ensure AA on background
        if let Some(l) = map.get("link").and_then(|v| v.as_str()).map(|s| s.to_string()) {
            let fixed = ensure_contrast(l, &background, 4.5);
            map.insert("link".to_string(), json!(fixed));
        }
    }

    // Store in cache
    {
        let mut guard = state.palette_cache.lock().await;
        guard.put(cache_key, result.clone());
    }

    Ok(Json(result))
}

pub async fn ws_orchestrate(State(state): State<AppState>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(move |socket| handle_ws_session(state, socket))
}

async fn handle_ws_session(state: AppState, socket: WebSocket) {
    // Expect first client message to be JSON of GenerateGuideRequest
    use futures::{StreamExt, SinkExt};
    let (mut ws_tx, mut ws_rx) = socket.split();
    if let Some(Ok(Message::Text(first))) = ws_rx.next().await {
        let req: Result<crate::models::GenerateGuideRequest, _> = serde_json::from_str(&first);
        match req {
            Ok(payload) => {
                // Channel to stream events
                let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
                let adapter = state.adapter.clone();
                let inputs = payload.inputs;
                // storage for user notes
                let notes_store = std::sync::Arc::new(tokio::sync::Mutex::new(Vec::<String>::new()));
                // Spawn orchestration in background
                let tx_clone = tx.clone();
                let roles = vec![
                    "primary".to_string(), "secondary".to_string(), "accent".to_string(),
                    "neutralLight".to_string(), "neutralDark".to_string(),
                    "neutralLightDark".to_string(), "neutralDarkDark".to_string(),
                    "background".to_string(), "backgroundDark".to_string(),
                    "text".to_string(), "textDark".to_string(),
                    "link".to_string(), "linkDark".to_string(),
                ];
                let notes_for_orch = notes_store.clone();
                tokio::spawn(async move {
                    let core = match orchestration::generate_guide_multiagent(&*adapter, &inputs, Some(&tx_clone), Some(&notes_for_orch)).await {
                        Ok(v) => v,
                        Err(e) => {
                            let _ = tx_clone.send(serde_json::json!({"type":"error","message": e.to_string()}).to_string());
                            return;
                        }
                    };
                    // Merge palette like HTTP route
                    let mut suggested_map = derive_palette_fallback(&inputs, &roles);
                    for (k, v) in inputs.palette.iter() { suggested_map.insert(k.clone(), serde_json::json!(v)); }
                    let mut full = core.guide_core;
                    full["palette"] = serde_json::Value::Object(suggested_map);
                    full["logoUrl"] = serde_json::to_value(&inputs.logoUrl).unwrap_or(serde_json::json!(null));
                    let _ = tx_clone.send(serde_json::json!({"type":"final","data": full}).to_string());
                });
                // Pump server events to client (writer task)
                let mut writer = ws_tx;
                tokio::spawn(async move {
                    while let Some(msg) = rx.recv().await {
                        if writer.send(Message::Text(msg)).await.is_err() { break; }
                    }
                });

                // Read user interjections
                let notes_for_read = notes_store.clone();
                while let Some(Ok(msg)) = ws_rx.next().await {
                    if let Message::Text(txt) = msg {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                            let t = v.get("type").and_then(|x| x.as_str()).unwrap_or("");
                            if t.eq_ignore_ascii_case("user") {
                                if let Some(m) = v.get("message").and_then(|x| x.as_str()) {
                                    {
                                        let mut guard = notes_for_read.lock().await;
                                        guard.push(m.to_string());
                                    }
                                    // Echo to client
                                    let _ = tx.send(serde_json::json!({"type":"user","role":"USER","data":{"message": m}}).to_string());
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = ws_tx.send(Message::Text(serde_json::json!({"type":"error","message": format!("bad request: {}", e)}).to_string())).await;
            }
        }
    } else {
        let _ = ws_tx.send(Message::Text(serde_json::json!({"type":"error","message":"expected first message with request json"}).to_string())).await;
    }
}

fn derive_palette_fallback(inputs: &UserInputs, roles: &[String]) -> serde_json::Map<String, serde_json::Value> {
    use serde_json::Value;
    let mut out = serde_json::Map::new();

    // Helpers
    fn parse_hex(s: &str) -> Option<(u8,u8,u8)> {
        let t = s.trim();
        let h = t.strip_prefix('#').unwrap_or(t);
        if h.len() != 6 { return None; }
        let r = u8::from_str_radix(&h[0..2], 16).ok()?;
        let g = u8::from_str_radix(&h[2..4], 16).ok()?;
        let b = u8::from_str_radix(&h[4..6], 16).ok()?;
        Some((r,g,b))
    }
    fn to_hex(r: u8,g: u8,b: u8) -> String { format!("#{:02x}{:02x}{:02x}", r,g,b) }

    fn rgb_to_hsl(r: u8, g: u8, b: u8) -> (f32,f32,f32) {
        let r = r as f32 / 255.0; let g = g as f32 / 255.0; let b = b as f32 / 255.0;
        let max = r.max(g.max(b)); let min = r.min(g.min(b));
        let mut h = 0.0; let mut s = 0.0; let l = (max + min) / 2.0;
        if (max - min) > 0.00001 {
            let d = max - min;
            s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max - min) };
            h = if (max - r).abs() < 1e-6 { (g - b) / d + if g < b { 6.0 } else { 0.0 } }
                else if (max - g).abs() < 1e-6 { (b - r) / d + 2.0 }
                else { (r - g) / d + 4.0 };
            h /= 6.0;
        }
        (h * 360.0, s, l)
    }
    fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8,u8,u8) {
        let h = ((h % 360.0) + 360.0) % 360.0;
        let c = (1.0 - (2.0*l - 1.0).abs()) * s;
        let x = c * (1.0 - (((h/60.0) % 2.0) - 1.0).abs());
        let m = l - c/2.0;
        let (r1,g1,b1) = if h < 60.0 {(c,x,0.0)} else if h < 120.0 {(x,c,0.0)} else if h < 180.0 {(0.0,c,x)} else if h < 240.0 {(0.0,x,c)} else if h < 300.0 {(x,0.0,c)} else {(c,0.0,x)};
        let r = ((r1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
        let g = ((g1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
        let b = ((b1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
        (r,g,b)
    }
    fn hsl_to_hex(h: f32, s: f32, l: f32) -> String { let (r,g,b) = hsl_to_rgb(h,s,l); to_hex(r,g,b) }

    fn rel_lum(r: u8, g: u8, b: u8) -> f32 {
        fn chan(c: u8) -> f32 { let x = c as f32 / 255.0; if x <= 0.03928 { x/12.92 } else { ((x+0.055)/1.055).powf(2.4) } }
        0.2126*chan(r) + 0.7152*chan(g) + 0.0722*chan(b)
    }
    fn contrast(a: (u8,u8,u8), b: (u8,u8,u8)) -> f32 {
        let la = rel_lum(a.0,a.1,a.2); let lb = rel_lum(b.0,b.1,b.2);
        let (br, dr) = if la > lb { (la, lb) } else { (lb, la) };
        (br + 0.05) / (dr + 0.05)
    }

    fn ensure_contrast(mut hex: String, bg_hex: &str, target: f32) -> String {
        let mut safety = 0;
        let bg = parse_hex(bg_hex).unwrap_or((255,255,255));
        while safety < 12 {
            let rgb = parse_hex(&hex).unwrap_or((0,0,0));
            if contrast(rgb, bg) >= target { break; }
            // If bg is light, darken; else lighten
            let (_,_,bl) = rgb_to_hsl(bg.0, bg.1, bg.2);
            let (h,s,mut l) = rgb_to_hsl(rgb.0,rgb.1,rgb.2);
            if bl >= 0.5 { l = (l - 0.06).max(0.0); } else { l = (l + 0.06).min(1.0); }
            hex = hsl_to_hex(h,s,l);
            safety += 1;
        }
        hex
    }

    fn norm(x:f32) -> f32 { let mut h = x % 360.0; if h < 0.0 { h += 360.0; } h }

    // Inputs
    let primary_hex = inputs.palette.get("primary").cloned().unwrap_or("#3366cc".into());
    let (pr,pg,pb) = parse_hex(&primary_hex).unwrap_or((0x33,0x66,0xcc));
    let (p_h, p_s, p_l) = rgb_to_hsl(pr,pg,pb);

    // Background: near-white with subtle brand tint
    let mut bg_hex = inputs.palette.get("background").cloned().unwrap_or_else(|| {
        let tint_s = 0.015f32; let tint_l = 0.97f32;
        hsl_to_hex(p_h, tint_s, tint_l)
    });
    // Text for background
    let mut text_hex = inputs.palette.get("text").cloned().unwrap_or_else(|| {
        let bg = parse_hex(&bg_hex).unwrap_or((255,255,255));
        let c_black = contrast((0,0,0), bg);
        let c_white = contrast((255,255,255), bg);
        if c_black >= c_white { "#0e0f10".into() } else { "#ffffff".into() }
    });
    text_hex = ensure_contrast(text_hex.clone(), &bg_hex, 7.0);

    // Secondary: analog hue ±12–28°, slightly different lightness
    let sec_offset = if p_h >= 60.0 && p_h <= 200.0 { -18.0 } else { 20.0 };
    let mut secondary_h = norm(p_h + sec_offset);
    let mut secondary_s = (p_s * 0.82).clamp(0.18, 0.78);
    let mut secondary_l = (p_l + 0.06).clamp(0.46, 0.72);

    // Accent: tasteful counterpoint by hue family mapping
    fn band(h: f32) -> &'static str {
        let h = norm(h);
        if h < 15.0 || h >= 345.0 { "red" }
        else if h < 45.0 { "orange" }
        else if h < 75.0 { "yellow" }
        else if h < 105.0 { "warm-green" }
        else if h < 150.0 { "green" }
        else if h < 190.0 { "cyan" }
        else if h < 250.0 { "blue" }
        else if h < 275.0 { "indigo" }
        else if h < 305.0 { "violet" }
        else if h < 335.0 { "magenta" } else { "pink" }
    }
    let vibe = {
        let t: Vec<String> = inputs.toneTraits.iter().map(|s| s.to_lowercase()).collect();
        let bold = ["bold","vibrant","energetic","playful","innovative","confident"];
        let subtle = ["calm","trustworthy","minimal","refined","professional","serious"];
        if t.iter().any(|x| bold.contains(&x.as_str())) { "bold" }
        else if t.iter().any(|x| subtle.contains(&x.as_str())) { "subtle" } else { "balanced" }
    };
    let mut accent_h = match (band(p_h), vibe) {
        ("green", "subtle") | ("cyan", "subtle") => 260.0, // indigo/violet
        ("green", "bold") | ("cyan", "bold") => 30.0,       // amber
        ("blue", _) => 35.0,                                   // saffron
        ("indigo", _) | ("violet", _) => 40.0,                // warm gold
        ("red", _) | ("orange", _) => 200.0,                   // teal/cyan
        ("yellow", _) => 220.0,                                 // blue
        _ => norm(p_h + 150.0),
    };
    // Tune saturation/lightness per vibe
    let mut accent_s = match vibe { "bold" => (p_s*1.1).clamp(0.45,0.85), "subtle" => (p_s*0.75).clamp(0.18,0.6), _ => (p_s*0.95).clamp(0.28,0.7) };
    let mut accent_l = match vibe { "bold" => (p_l+0.00).clamp(0.48,0.58), "subtle" => (p_l+0.06).clamp(0.54,0.66), _ => (p_l+0.04).clamp(0.5,0.62) };

    // Neutrals: very low-sat tints of primary hue (cohesive UI)
    let (_, _, bg_l) = { let (r,g,b) = parse_hex(&bg_hex).unwrap_or((255,255,255)); rgb_to_hsl(r,g,b) };
    let neutral_light = hsl_to_hex(p_h, 0.02, (bg_l+0.06).clamp(0.85, 0.98));
    let neutral_dark  = hsl_to_hex(p_h, 0.02, (bg_l-0.78).clamp(0.08, 0.2));

    // Build role colors
    let mut secondary_hex = hsl_to_hex(secondary_h, secondary_s, secondary_l);
    let mut accent_hex    = hsl_to_hex(accent_h, accent_s, accent_l);

    // Link: related to primary but distinct
    let (mut link_h, mut link_s, mut link_l) = (norm(p_h - 10.0), (p_s*1.05).clamp(0.22,0.9), p_l);
    let bg_l_for_link = bg_l;
    if bg_l_for_link >= 0.5 { link_l = (link_l - 0.12).max(0.18); } else { link_l = (link_l + 0.12).min(0.82); }
    let mut link_hex = hsl_to_hex(link_h, link_s, link_l);

    // Dark mode companions
    let background_dark = hsl_to_hex(p_h, 0.06, 0.12);
    let text_dark = ensure_contrast("#ffffff".to_string(), &background_dark, 4.5);
    let mut link_dark = hsl_to_hex(norm(link_h - 4.0), (link_s*1.1).clamp(0.2,0.95), (link_l+0.18).clamp(0.32,0.9));

    // Ensure contrast
    link_hex = ensure_contrast(link_hex, &bg_hex, 4.5);
    secondary_hex = ensure_contrast(secondary_hex, &bg_hex, 3.0); // not required text-on-bg
    accent_hex    = ensure_contrast(accent_hex, &bg_hex, 3.0);

    // onPrimary: pick white/black by contrast
    let on_primary = {
        let prgb = parse_hex(&primary_hex).unwrap_or((0,0,0));
        let c_black = contrast(prgb, (0,0,0));
        let c_white = contrast(prgb, (255,255,255));
        if c_white >= c_black { "#ffffff".to_string() } else { "#000000".to_string() }
    };

    // Dark neutrals from tinted dark background
    let (_, _, bd_l) = { let (r,g,b) = parse_hex(&background_dark).unwrap_or((0,0,0)); rgb_to_hsl(r,g,b) };
    let neutral_light_dark = ensure_contrast(hsl_to_hex(p_h, 0.02, (bd_l+0.20).clamp(0.20,0.4)), &background_dark, 4.5);
    let neutral_dark_dark  = ensure_contrast(hsl_to_hex(p_h, 0.02, (bd_l-0.08).clamp(0.04,0.16)), &background_dark, 4.5);

    // Candidate map
    let mut candidates: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    candidates.insert("primary".into(), primary_hex.clone());
    candidates.insert("secondary".into(), secondary_hex.clone());
    candidates.insert("accent".into(), accent_hex.clone());
    candidates.insert("background".into(), bg_hex.clone());
    candidates.insert("text".into(), text_hex.clone());
    candidates.insert("link".into(), link_hex.clone());
    candidates.insert("onPrimary".into(), on_primary.clone());
    candidates.insert("backgroundDark".into(), background_dark.clone());
    candidates.insert("textDark".into(), text_dark.clone());
    candidates.insert("linkDark".into(), link_dark.clone());
    candidates.insert("neutralLight".into(), neutral_light.clone());
    candidates.insert("neutralDark".into(), neutral_dark.clone());
    candidates.insert("neutralLightDark".into(), neutral_light_dark.clone());
    candidates.insert("neutralDarkDark".into(), neutral_dark_dark.clone());

    // Merge user-provided values first
    for (k, v) in inputs.palette.iter() {
        if !v.trim().is_empty() { out.insert(k.clone(), Value::String(v.clone())); }
    }
    // Then fill requested roles from candidates
    for role in roles {
        if !out.contains_key(role) {
            if let Some(v) = candidates.get(&role.to_string()) { out.insert(role.clone(), Value::String(v.clone())); }
            else if let Some(v) = candidates.get(&role.to_lowercase()) { out.insert(role.clone(), Value::String(v.clone())); }
        }
    }

    out
}

