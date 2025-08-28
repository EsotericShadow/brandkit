use axum::{Json, extract::{State, Query}};
use serde_json::json;
use crate::{AppState, models::{GenerateGuideRequest, RewriteRequest, ConsistencyRequest, UserInputs}, prompts};
use tokio::time::{timeout, Duration};
use axum::http::StatusCode;

pub async fn health() -> Json<serde_json::Value> {
    tracing::info!("health: ok");
    Json(json!({"ok": true}))
}

pub async fn generate_guide(State(state): State<AppState>, Json(payload): Json<GenerateGuideRequest>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("generate_guide: received request");
    let prompt = prompts::build_guide_prompt(&payload.inputs);
let schema = crate::adapters::schemas::guide_schema();
    let data = state.adapter.generate_json(&prompt, Some(schema), Some(0.6)).await.map_err(internal_err)?;
    // Build palette using the same thematic, aesthetic logic used elsewhere
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
    ];
    let mut suggested_map = derive_palette_fallback(&payload.inputs, &roles);
    // user-provided overrides suggestions
    for (k, v) in payload.inputs.palette.iter() {
        suggested_map.insert(k.clone(), json!(v));
    }
    let mut full = data;
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
pub struct PaletteQuery { pub roles: Option<String> }

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

    // Cache key based on brand + roles + provided palette snapshot
    let cache_key = format!(
        "{}|{}|{}|{}|{}",
        inputs.brandName,
        inputs.industry,
        inputs.toneTraits.join(","),
        roles.join(","),
        serde_json::to_string(&inputs.palette).unwrap_or_default()
    );

    // Fast path: cache hit
    if let Some(hit) = {
        let mut guard = state.palette_cache.lock().await;
        guard.get(&cache_key).cloned()
    } {
        return Ok(Json(hit));
    }

    // Build upstream request and local fallback concurrently; return the fastest within a short timeout
    let palette_prompt = crate::prompts::build_palette_prompt_with_roles(&inputs, &roles);
    let palette_schema = crate::adapters::schemas::palette_schema_for_roles(&roles);
    let adapter = state.adapter.clone();
    let inputs_clone = inputs.clone();
    let roles_clone = roles.clone();

    let upstream_fut = async move {
        let mut suggested = adapter.generate_json(&palette_prompt, Some(palette_schema), Some(0.2)).await?;
        if let Some(map) = suggested.as_object_mut() {
            for (k, v) in inputs_clone.palette.iter() { map.insert(k.clone(), json!(v)); }
            if !roles_clone.is_empty() {
                let want: std::collections::HashSet<String> = roles_clone.iter().map(|s| s.to_lowercase()).collect();
                let keep: Vec<String> = map.keys().cloned().collect();
                for k in keep { if !want.contains(&k.to_lowercase()) { map.remove(&k); } }
            }
        }
        Ok::<serde_json::Value, anyhow::Error>(suggested)
    };

    let inputs_for_fallback = inputs.clone();
    let roles_for_fallback = roles.clone();
    let fallback_fut = async move {
        let derived = derive_palette_fallback(&inputs_for_fallback, &roles_for_fallback);
        Ok::<serde_json::Value, anyhow::Error>(json!(derived))
    };

    // Use a tight timeout for upstream; if it doesn't respond quickly, use fallback to keep UX snappy
    // We need two independent fallbacks because futures are not clonable
    let inputs_fb1 = inputs.clone();
    let roles_fb1 = roles.clone();
    let fallback_fut1 = async move {
        let derived = derive_palette_fallback(&inputs_fb1, &roles_fb1);
        Ok::<serde_json::Value, anyhow::Error>(json!(derived))
    };
    let inputs_fb2 = inputs.clone();
    let roles_fb2 = roles.clone();
    let fallback_fut2 = async move {
        let derived = derive_palette_fallback(&inputs_fb2, &roles_fb2);
        Ok::<serde_json::Value, anyhow::Error>(json!(derived))
    };

    let result = tokio::select! {
        biased;
        // If upstream returns within timeout, use it
        r = async { timeout(Duration::from_millis(1200), upstream_fut).await } => {
            match r { Ok(Ok(v)) => v, _ => fallback_fut1.await.unwrap_or(json!({})) }
        }
        // If fallback wins the race first, take it immediately
        v = fallback_fut2 => v.unwrap_or(json!({})),
    };

    // Store in cache
    {
        let mut guard = state.palette_cache.lock().await;
        guard.put(cache_key, result.clone());
    }

    Ok(Json(result))
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
    fn clamp01(x: f32) -> f32 { x.max(0.0).min(1.0) }

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
        while safety < 10 {
            let rgb = parse_hex(&hex).unwrap_or((0,0,0));
            if contrast(rgb, bg) >= target { break; }
            // If bg is light, darken; else lighten
            let (_,_,bl) = rgb_to_hsl(bg.0, bg.1, bg.2);
            let (mut h,s,mut l) = rgb_to_hsl(rgb.0,rgb.1,rgb.2);
            if bl >= 0.5 { l = (l - 0.08).max(0.0); } else { l = (l + 0.08).min(1.0); }
            hex = hsl_to_hex(h,s,l);
            safety += 1;
        }
        hex
    }

    fn hue_delta(a: f32, b: f32) -> f32 { let mut d = (a-b).abs() % 360.0; if d > 180.0 { d = 360.0 - d; } d }

    // Inputs
    let primary_hex = inputs.palette.get("primary").cloned().unwrap_or("#3366cc".into());
    let (pr,pg,pb) = parse_hex(&primary_hex).unwrap_or((0x33,0x66,0xcc));
    let (p_h, p_s, p_l) = rgb_to_hsl(pr,pg,pb);

    let bg_hex = inputs.palette.get("background").cloned().unwrap_or("#ffffff".into());
    let text_hex = inputs.palette.get("text").cloned().unwrap_or_else(|| {
        let bg = parse_hex(&bg_hex).unwrap_or((255,255,255));
        let c_black = contrast((0,0,0), bg);
        let c_white = contrast((255,255,255), bg);
        if c_black >= c_white { "#000000".into() } else { "#ffffff".into() }
    });

    // Link: derived from primary but distinct and accessible
    let mut link_hex = inputs.palette.get("link").cloned().unwrap_or_else(|| {
        let (mut h,s,mut l) = (p_h - 8.0, (p_s*1.1).clamp(0.0,1.0), p_l);
        // adjust by bg lightness
        let bg_l = {
            let (r,g,b) = parse_hex(&bg_hex).unwrap_or((255,255,255));
            let (_,_,bl) = rgb_to_hsl(r,g,b); bl
        };
        if bg_l >= 0.5 { l = (l - 0.12).max(0.0); } else { l = (l + 0.12).min(1.0); }
        hsl_to_hex(h,s,l)
    });
    link_hex = ensure_contrast(link_hex, &bg_hex, 4.5);

    // Aesthetic scheme selection based on tone/industry
    fn vibe_from_tone(traits: &Vec<String>) -> &'static str {
        let t: Vec<String> = traits.iter().map(|s| s.to_lowercase()).collect();
        let bold = ["bold","vibrant","energetic","playful","innovative","disruptive","confident"];
        let subtle = ["calm","trustworthy","minimal","minimalist","refined","elegant","soft","approachable"];
        if t.iter().any(|x| bold.contains(&x.as_str())) { "bold" }
        else if t.iter().any(|x| subtle.contains(&x.as_str())) { "subtle" } else { "balanced" }
    }
    fn scheme_from_context(traits: &Vec<String>, industry: &str) -> &'static str {
        let t: Vec<String> = traits.iter().map(|s| s.to_lowercase()).collect();
        let ind = industry.to_lowercase();
        let conservative = ["finance","bank","banking","insurance","legal","law","enterprise","b2b","health","healthcare"];
        let playful = ["startup","tech","saas","consumer","gaming","ecommerce"];
        let natural = ["outdoor","outdoors","wellness","sustainability","green","agriculture"];
        if conservative.iter().any(|k| ind.contains(k)) || t.iter().any(|x| ["calm","trustworthy","minimal","professional"].contains(&x.as_str())) { "analogous" }
        else if natural.iter().any(|k| ind.contains(k)) || t.iter().any(|x| ["grounded","earthy","warm"].contains(&x.as_str())) { "analogous" }
        else if playful.iter().any(|k| ind.contains(k)) || t.iter().any(|x| ["bold","playful","vibrant","innovative"].contains(&x.as_str())) { "split" }
        else { "split" }
    }
    fn theme_from_context(traits: &Vec<String>, industry: &str) -> &'static str {
        let t: Vec<String> = traits.iter().map(|s| s.to_lowercase()).collect();
        let ind = industry.to_lowercase();
        let earthy = ["earthy","grounded","organic","natural","warm","rustic"];
        let pastel = ["pastel","gentle","soft","friendly","approachable","calm"];
        let neon = ["neon","edgy","youthful","street","bold","electric"];
        let muted = ["muted","minimal","professional","understated","subtle"];
        let vintage = ["vintage","heritage","classic","retro","timeless"];
        let mono = ["monochrome","mono","black","white","grayscale"];
        let vibr = ["vibrant","playful","energetic","lively"];
        if t.iter().any(|x| earthy.contains(&x.as_str())) || ["outdoor","outdoors","wellness","sustainability","green","agriculture"].iter().any(|k| ind.contains(*k)) { "earthy" }
        else if t.iter().any(|x| pastel.contains(&x.as_str())) { "pastel" }
        else if t.iter().any(|x| neon.contains(&x.as_str())) || ["gaming","streetwear","music","festival"].iter().any(|k| ind.contains(*k)) { "neon" }
        else if t.iter().any(|x| vintage.contains(&x.as_str())) || ["craft","heritage","artisan"].iter().any(|k| ind.contains(*k)) { "vintage" }
        else if t.iter().any(|x| mono.contains(&x.as_str())) { "monochrome" }
        else if t.iter().any(|x| muted.contains(&x.as_str())) || ["finance","legal","enterprise","b2b"].iter().any(|k| ind.contains(*k)) { "muted" }
        else if t.iter().any(|x| vibr.contains(&x.as_str())) || ["startup","tech","saas","ecommerce"].iter().any(|k| ind.contains(*k)) { "vibrant" }
        else { "muted" }
    }
    let vibe = vibe_from_tone(&inputs.toneTraits);
    let scheme = scheme_from_context(&inputs.toneTraits, &inputs.industry);
    let theme = theme_from_context(&inputs.toneTraits, &inputs.industry);

    // Dark mode counterparts
    let mut s_dark = 0.05f32; let mut l_dark = 0.11f32;
    match theme {
        "monochrome" => { s_dark = 0.0; l_dark = 0.10; },
        "pastel" => { s_dark = 0.03; l_dark = 0.12; },
        "earthy" | "vintage" => { s_dark = 0.06; l_dark = 0.12; },
        "muted" => { s_dark = 0.04; l_dark = 0.115; },
        "neon" | "vibrant" => { s_dark = 0.08; l_dark = 0.12; },
        _ => {}
    }
    let background_dark = hsl_to_hex(p_h, s_dark, l_dark);
    let text_dark = ensure_contrast("#ffffff".to_string(), &background_dark, 4.5);
    let mut link_dark = {
        let (mut h,s,mut l) = (p_h - 8.0, (p_s*1.2).clamp(0.0,1.0), p_l);
        // Dark bg -> lighten link
        l = (l + 0.12).min(1.0);
        hsl_to_hex(h,s,l)
    };
    link_dark = ensure_contrast(link_dark, &background_dark, 4.5);


    let mut s_mul: f32 = match vibe { "bold" => 1.15, "subtle" => 0.9, _ => 1.0 };
    let mut l_accent: f32 = match vibe { "bold" => (p_l+0.02).clamp(0.45,0.58), "subtle" => (p_l+0.06).clamp(0.56,0.7), _ => (p_l+0.04).clamp(0.5,0.62) };
    let mut l_secondary: f32 = match vibe { "bold" => (p_l+0.06).clamp(0.5,0.65), "subtle" => (p_l+0.08).clamp(0.58,0.72), _ => (p_l+0.07).clamp(0.52,0.68) };

    // Theme-based tuning
    match theme {
        "earthy" => { s_mul *= 0.95; l_accent = l_accent.clamp(0.48,0.6); l_secondary = l_secondary.clamp(0.52,0.66); },
        "pastel" => { s_mul *= 0.7; l_accent = (p_l+0.1).clamp(0.65,0.78); l_secondary = (p_l+0.12).clamp(0.7,0.82); },
        "neon" | "vibrant" => { s_mul = s_mul.max(1.2); l_accent = (p_l+0.01).clamp(0.48,0.56); l_secondary = (p_l+0.03).clamp(0.5,0.6); },
        "muted" => { s_mul *= 0.85; l_accent = l_accent.clamp(0.52,0.64); l_secondary = l_secondary.clamp(0.54,0.66); },
        "vintage" => { s_mul *= 0.9; l_accent = l_accent.clamp(0.5,0.62); l_secondary = l_secondary.clamp(0.54,0.66); },
        "monochrome" => { s_mul *= 0.6; l_accent = l_accent.clamp(0.5,0.65); l_secondary = l_secondary.clamp(0.52,0.68); },
        _ => {}
    }

    let norm = |x:f32| -> f32 { let mut h = x % 360.0; if h < 0.0 { h += 360.0; } h };

    // Curated designer chord patterns selected by theme and primary hue band
    let in_range = |h:f32, a:f32, b:f32| -> bool { let x = norm(h); let lo = norm(a); let hi = norm(b); if lo <= hi { x>=lo && x<=hi } else { x>=lo || x<=hi } };
    let band = |h:f32| -> &'static str {
        if in_range(h,345.0,360.0) || in_range(h,0.0,15.0) { "red" }
        else if in_range(h,15.0,45.0) { "orange" }
        else if in_range(h,45.0,75.0) { "yellow" }
        else if in_range(h,75.0,105.0) { "warm-green" }
        else if in_range(h,105.0,150.0) { "green" }
        else if in_range(h,150.0,190.0) { "cyan" }
        else if in_range(h,190.0,250.0) { "blue" }
        else if in_range(h,250.0,275.0) { "indigo" }
        else if in_range(h,275.0,305.0) { "violet" }
        else if in_range(h,305.0,335.0) { "magenta" } else { "pink" }
    };
    #[derive(Clone, Copy)]
    struct Pattern { bands: &'static [&'static str], sec: f32, acc: f32, acc_sat_mul: f32, sec_sat_mul: f32 }
    fn curated_for(theme: &str) -> Vec<Pattern> {
        match theme {
            "earthy" => vec![
                Pattern{ bands: &["warm-green","green","cyan"], sec: 20.0, acc: 40.0, acc_sat_mul: 0.95, sec_sat_mul: 0.90 },
                Pattern{ bands: &["blue","indigo","violet","magenta","pink"], sec: 25.0, acc: 35.0, acc_sat_mul: 0.95, sec_sat_mul: 0.90 },
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: -20.0, acc: 30.0, acc_sat_mul: 0.90, sec_sat_mul: 0.90 },
            ],
            "vintage" => vec![
                Pattern{ bands: &["blue","indigo","violet"], sec: 20.0, acc: 45.0, acc_sat_mul: 0.90, sec_sat_mul: 0.90 },
                Pattern{ bands: &["cyan","blue"], sec: -25.0, acc: 35.0, acc_sat_mul: 0.90, sec_sat_mul: 0.90 },
            ],
            "pastel" => vec![
                Pattern{ bands: &["blue","indigo","violet"], sec: 25.0, acc: 50.0, acc_sat_mul: 0.65, sec_sat_mul: 0.65 },
                Pattern{ bands: &["warm-green","green","cyan","yellow"], sec: -20.0, acc: 35.0, acc_sat_mul: 0.68, sec_sat_mul: 0.65 },
            ],
            "muted" => vec![
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: 30.0, acc: 60.0, acc_sat_mul: 0.85, sec_sat_mul: 0.80 },
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: -30.0, acc: 45.0, acc_sat_mul: 0.85, sec_sat_mul: 0.80 },
            ],
            "monochrome" => vec![
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: -15.0, acc: 15.0, acc_sat_mul: 0.60, sec_sat_mul: 0.55 },
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: 20.0, acc: -20.0, acc_sat_mul: 0.55, sec_sat_mul: 0.60 },
            ],
            "neon" | "vibrant" => vec![
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: 150.0, acc: -150.0, acc_sat_mul: 1.30, sec_sat_mul: 1.20 },
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: 120.0, acc: -120.0, acc_sat_mul: 1.25, sec_sat_mul: 1.15 },
            ],
            _ => vec![
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: 30.0, acc: 150.0, acc_sat_mul: 1.0, sec_sat_mul: 0.95 },
                Pattern{ bands: &["red","orange","yellow","warm-green","green","cyan","blue","indigo","violet","magenta","pink"], sec: -30.0, acc: 150.0, acc_sat_mul: 1.0, sec_sat_mul: 0.95 },
            ]
        }
    }
    let p_band = band(p_h);
    let candidates = curated_for(theme);
    let mut filtered: Vec<Pattern> = candidates.into_iter().filter(|p| p.bands.contains(&p_band) ).collect();
    if filtered.is_empty() { filtered = curated_for("default"); }
    let idx = (((p_h / 15.0).round() as i32).rem_euclid(filtered.len() as i32)) as usize;
    let chosen = filtered[idx];

    let mut accent_h = p_h + chosen.acc;
    let mut secondary_h = p_h + chosen.sec;
    let acc_sat_mul_base = chosen.acc_sat_mul;
    let sec_sat_mul_base = chosen.sec_sat_mul;

    // Theme hue biases
    let warm = 45.0; let cool = 200.0;
    match theme {
        "earthy" | "vintage" => { accent_h = norm(accent_h * 0.7 + warm * 0.3); },
        "neon" | "vibrant" => { accent_h = norm(accent_h + 10.0); },
        "monochrome" => { accent_h = norm(accent_h * 0.85 + p_h * 0.15); secondary_h = norm(secondary_h * 0.85 + p_h * 0.15); },
        "pastel" => { accent_h = norm(accent_h * 0.8 + cool * 0.2); },
        _ => {}
    }

    const MIN_HUE_DELTA: f32 = 40.0;
    let mut enforce_sep = |base:f32, target:f32| {
        let mut h = norm(target);
        if hue_delta(base, h) < MIN_HUE_DELTA { h = norm(base + if h>base { MIN_HUE_DELTA } else { -MIN_HUE_DELTA }); }
        h
    };
    accent_h = enforce_sep(p_h, accent_h);
    secondary_h = enforce_sep(p_h, secondary_h);
    if hue_delta(accent_h, secondary_h) < MIN_HUE_DELTA { secondary_h = norm(accent_h + MIN_HUE_DELTA); }

    // Aesthetic clash mitigation rules
    let in_range = |h:f32, a:f32, b:f32| -> bool {
        let x = norm(h); let lo = norm(a); let hi = norm(b);
        if lo <= hi { x >= lo && x <= hi } else { x >= lo || x <= hi }
    };
    let band = |h:f32| -> &'static str {
        if in_range(h,345.0,360.0) || in_range(h,0.0,15.0) { "red" }
        else if in_range(h,15.0,45.0) { "orange" }
        else if in_range(h,45.0,75.0) { "yellow" }
        else if in_range(h,75.0,105.0) { "warm-green" }
        else if in_range(h,105.0,150.0) { "green" }
        else if in_range(h,150.0,190.0) { "cyan" }
        else if in_range(h,190.0,250.0) { "blue" }
        else if in_range(h,250.0,275.0) { "indigo" }
        else if in_range(h,275.0,305.0) { "violet" }
        else if in_range(h,305.0,335.0) { "magenta" } else { "pink" }
    };
    let is_complement_like = |a:f32, b:f32| (hue_delta(a,b) - 180.0).abs() < 20.0;

    let p_band = band(p_h); let a_band = band(accent_h); let s_band = band(secondary_h);

    // Rule 1: Avoid seasonal red-green traps
    if p_band == "green" && ((a_band=="magenta" || a_band=="violet" || a_band=="pink") && (s_band=="red" || s_band=="pink")) {
        accent_h = norm(45.0);
        // analogous secondary away from new accent
        let cand1 = enforce_sep(p_h, p_h + 30.0);
        let cand2 = enforce_sep(p_h, p_h - 30.0);
        secondary_h = if hue_delta(cand1, accent_h) > hue_delta(cand2, accent_h) { cand1 } else { cand2 };
    }

    // Rule 2: Allow at most one complement-like role
    let acc_comp = is_complement_like(accent_h, p_h);
    let sec_comp = is_complement_like(secondary_h, p_h);
    if acc_comp && sec_comp {
        let cand1 = enforce_sep(p_h, p_h + 30.0);
        let cand2 = enforce_sep(p_h, p_h - 30.0);
        secondary_h = if hue_delta(cand1, accent_h) > hue_delta(cand2, accent_h) { cand1 } else { cand2 };
    }

    // Rule 3: If both roles are very far, pull secondary toward analogous
    if hue_delta(accent_h, p_h) > 150.0 && hue_delta(secondary_h, p_h) > 150.0 {
        let side = if hue_delta(p_h + 30.0, accent_h) > hue_delta(p_h - 30.0, accent_h) { p_h + 30.0 } else { p_h - 30.0 };
        secondary_h = enforce_sep(p_h, side);
    }

    let ind = inputs.industry.to_lowercase();
    if ["finance","bank","banking","insurance","legal","law","enterprise","b2b","health","healthcare"].iter().any(|k| ind.contains(*k)) {
        accent_h = norm(accent_h * 0.7 + p_h * 0.3);
        secondary_h = norm(secondary_h * 0.7 + p_h * 0.3);
    }
    if ["outdoor","outdoors","wellness","sustainability","green","agriculture"].iter().any(|k| ind.contains(*k)) {
        let warm = 45.0; accent_h = norm(accent_h * 0.6 + warm * 0.4);
    }

    let mut accent_hex = hsl_to_hex(accent_h, (p_s*(s_mul*acc_sat_mul_base)).clamp(0.35,0.9), l_accent);
    let mut secondary_hex = hsl_to_hex(secondary_h, (p_s*(s_mul*sec_sat_mul_base)).clamp(0.35,0.9), l_secondary);

    accent_hex = ensure_contrast(accent_hex, &bg_hex, 4.5);
    secondary_hex = ensure_contrast(secondary_hex, &bg_hex, 4.5);

    // Neutrals from background with theme influence
    let (nbgr,nbgg,nbgb) = parse_hex(&bg_hex).unwrap_or((255,255,255));
    let (mut n_h, mut n_s, n_l) = rgb_to_hsl(nbgr,nbgg,nbgb);
    n_s = n_s.clamp(0.0, 0.15);
    match theme {
        "earthy" | "vintage" => { n_h = norm(n_h + 10.0); n_s = (n_s + 0.03).clamp(0.05,0.12); },
        "pastel" => { n_s = n_s.min(0.08); },
        "neon" | "vibrant" => { n_s = n_s.clamp(0.06,0.15); },
        "monochrome" => { n_s = 0.0; },
        "muted" => { n_s = n_s.min(0.1); },
        _ => {}
    }
    let neutral_light = hsl_to_hex(n_h, n_s, (n_l+0.06).clamp(0.0,1.0));
    let neutral_light = ensure_contrast(neutral_light, &bg_hex, 4.5);
    let neutral_dark = hsl_to_hex(n_h, n_s, (n_l-0.78).clamp(0.0,1.0));
    let neutral_dark = ensure_contrast(neutral_dark, &bg_hex, 4.5);

    // Neutrals for dark background
    let (dbgr,dbgg,dbgb) = parse_hex(&background_dark).unwrap_or((0,0,0));
    let (mut dn_h, mut dn_s, dn_l) = rgb_to_hsl(dbgr,dbgg,dbgb);
    dn_s = dn_s.clamp(0.0, 0.12);
    match theme {
        "earthy" | "vintage" => { dn_h = norm(dn_h + 8.0); dn_s = (dn_s + 0.02).clamp(0.04,0.12); },
        "pastel" => { dn_s = dn_s.min(0.08); },
        "neon" | "vibrant" => { dn_s = dn_s.clamp(0.06,0.14); },
        "monochrome" => { dn_s = 0.0; },
        "muted" => { dn_s = dn_s.min(0.09); },
        _ => {}
    }
    let neutral_light_dark = ensure_contrast(hsl_to_hex(dn_h, dn_s, (dn_l+0.18).clamp(0.0,1.0)), &background_dark, 4.5);
    let neutral_dark_dark = ensure_contrast(hsl_to_hex(dn_h, dn_s, (dn_l-0.06).clamp(0.0,1.0)), &background_dark, 4.5);

    // Candidate map
    let mut candidates: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    candidates.insert("primary".into(), primary_hex.clone());
    candidates.insert("background".into(), bg_hex.clone());
    candidates.insert("text".into(), text_hex.clone());
    candidates.insert("link".into(), link_hex.clone());
    candidates.insert("backgroundDark".into(), background_dark.clone());
    candidates.insert("textDark".into(), text_dark.clone());
    candidates.insert("linkDark".into(), link_dark.clone());
    candidates.insert("secondary".into(), secondary_hex.clone());
    candidates.insert("accent".into(), accent_hex.clone());
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

