use anyhow::Result;
use serde_json::Value;

use crate::{adapters::AdapterDyn, models::UserInputs};

const MODEL_PRO: &str = "gemini:gemini-2.5-pro";
const MODEL_FLASH: &str = "gemini:gemini-2.5-flash";
const OAI_4O: &str = "openai:gpt-4o";
const OAI_4O_MINI: &str = "openai:gpt-4o-mini";

pub struct OrchestrationResult {
    pub guide_core: Value, // without palette/logo; palette merged in route
    pub checklist_md: String,
}

pub async fn generate_guide_multiagent(
    adapter: &AdapterDyn,
    inputs: &UserInputs,
    events: Option<&tokio::sync::mpsc::UnboundedSender<String>>,
    user_notes: Option<&std::sync::Arc<tokio::sync::Mutex<Vec<String>>>>,
) -> Result<OrchestrationResult> {
    // 1) Orchestrator (Pro): split inputs into briefs + shared context + initial checklist
    let split_prompt = build_orchestrator_split_prompt(inputs);
    let split_schema = crate::adapters::schemas::split_schema();
    let split = generate_with_retry(adapter, OAI_4O, OAI_4O_MINI, &split_prompt, Some(split_schema), Some(0.2), events, "ORCH").await?;

    let checklist = split["checklist"].as_str().unwrap_or("# Orchestration\n- [ ] discovery\n- [ ] analysis\n- [ ] conceptualization\n- [ ] composition\n- [ ] refinement/polish\n- [ ] delivery\n").to_string();

    // These will be included in each agent prompt
    let shared = &split["shared"];
    let bg_brief = split["bgBrief"].as_str().unwrap_or("");
    let me_brief = split["meBrief"].as_str().unwrap_or("");
    let cc_brief = split["ccBrief"].as_str().unwrap_or("");

    // 2) analysis roundtable — agents build shared understanding (logs only)
    let analysis = crate::agents::analysis::run_analysis_round(adapter, shared, &banlist(), events, user_notes).await?;
    tracing::info!(target: "orchestrator", "[ROUNDUP] analysis.cc_notes=\n{}", serde_json::to_string_pretty(&analysis.cc_notes).unwrap_or_default());

    // 3) BG (Flash): tone description + dos/donts
    let mut bg_prompt = build_bg_prompt(shared, bg_brief, &checklist);
    if let Some(store) = user_notes { if let Some(snip) = snapshot_user_notes(store, 5).await { bg_prompt.push_str("\n\nLive chat (recent USER messages):\n"); bg_prompt.push_str(&snip); } }
    tracing::info!(target: "orchestrator", "[BG DELIVERABLE] prompt=\n{}", bg_prompt);
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"deliverable","phase":"BG","kind":"prompt","data": bg_prompt }))); }
    let bg_schema = crate::adapters::schemas::bg_schema();
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"BG","state":"start"}).to_string()); }
    let bg_out = match generate_with_retry(adapter, OAI_4O_MINI, MODEL_FLASH, &bg_prompt, Some(bg_schema), Some(0.62), events, "BG").await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("[BG DELIVERABLE] generation failed: {} — using deterministic fallback", e);
            if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"deliverable","phase":"BG","kind":"fallback","data":"BG failed; using deterministic tone"}).to_string()); }
            fallback_bg_deliverable(shared)
        }
    };
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"BG","state":"stop"}).to_string()); }
    tracing::info!(target: "orchestrator", "[BG DELIVERABLE] out=\n{}", serde_json::to_string_pretty(&bg_out).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"deliverable","phase":"BG","kind":"out","data": bg_out }))); }

    // 3) ME (Flash): audience + pitch scaffold/notes
    let mut me_prompt = build_me_prompt(shared, me_brief, &checklist);
    if let Some(store) = user_notes { if let Some(snip) = snapshot_user_notes(store, 5).await { me_prompt.push_str("\n\nLive chat (recent USER messages):\n"); me_prompt.push_str(&snip); } }
    tracing::info!(target: "orchestrator", "[ME DELIVERABLE] prompt=\n{}", me_prompt);
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"deliverable","phase":"ME","kind":"prompt","data": me_prompt }))); }
    let me_schema = crate::adapters::schemas::me_schema();
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"ME","state":"start"}).to_string()); }
    let me_out = match generate_with_retry(adapter, OAI_4O_MINI, MODEL_FLASH, &me_prompt, Some(me_schema), Some(0.55), events, "ME").await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("[ME DELIVERABLE] generation failed: {} — using deterministic fallback", e);
            if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"deliverable","phase":"ME","kind":"fallback","data":"ME failed; using deterministic audience & pitchNotes"}).to_string()); }
            fallback_me_deliverable(shared)
        }
    };
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"ME","state":"stop"}).to_string()); }
    tracing::info!(target: "orchestrator", "[ME DELIVERABLE] out=\n{}", serde_json::to_string_pretty(&me_out).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"deliverable","phase":"ME","kind":"out","data": me_out }))); }

    // 4) CC (Flash): mission + elevator pitch + taglines with rationale, given BG/ME outputs
    let mut cc_prompt = build_cc_prompt(shared, cc_brief, &bg_out, &me_out, &checklist, inputs.existingTagline.as_deref());
    if let Some(store) = user_notes { if let Some(snip) = snapshot_user_notes(store, 5).await { cc_prompt.push_str("\n\nLive chat (recent USER messages):\n"); cc_prompt.push_str(&snip); } }
    tracing::info!(target: "orchestrator", "[CC DELIVERABLE] prompt=\n{}", cc_prompt);
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"deliverable","phase":"CC","kind":"prompt","data": cc_prompt }))); }
    let cc_schema = crate::adapters::schemas::cc_schema();
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"CC","state":"start"}).to_string()); }
    let cc_out = match generate_with_retry(adapter, OAI_4O, OAI_4O_MINI, &cc_prompt, Some(cc_schema), Some(0.68), events, "CC").await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("[CC DELIVERABLE] generation failed: {} — using deterministic fallback", e);
            if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"deliverable","phase":"CC","kind":"fallback","data":"CC failed; using deterministic mission, elevatorPitch & taglines"}).to_string()); }
            fallback_cc_deliverable(shared)
        }
    };
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"CC","state":"stop"}).to_string()); }
    tracing::info!(target: "orchestrator", "[CC DELIVERABLE] out=\n{}", serde_json::to_string_pretty(&cc_out).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"deliverable","phase":"CC","kind":"out","data": cc_out }))); }

    // 5) Orchestrator (Pro): refine & assemble final JSON (no palette/logo)
    let mut assemble_prompt = build_orchestrator_assemble_prompt(shared, &bg_out, &me_out, &cc_out);
    if let Some(store) = user_notes { if let Some(snip) = snapshot_user_notes(store, 5).await { assemble_prompt.push_str("\n\nLive chat (recent USER messages) to enforce in final output:\n"); assemble_prompt.push_str(&snip); } }
    tracing::info!(target: "orchestrator", "[ASSEMBLE] prompt=\n{}", assemble_prompt);
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"assemble","kind":"prompt","data": assemble_prompt }))); let _ = tx.send(serde_json::json!({"type":"typing","role":"ORCH","state":"start"}).to_string()); }
    let guide_schema = crate::adapters::schemas::guide_schema();
    let final_core_initial = generate_with_retry(adapter, OAI_4O, OAI_4O_MINI, &assemble_prompt, Some(guide_schema), Some(0.2), events, "ORCH").await?;
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"ORCH","state":"stop"}).to_string()); }
    tracing::info!(target: "orchestrator", "[ASSEMBLE] out=\n{}", serde_json::to_string_pretty(&final_core_initial).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"assemble","kind":"out","data": final_core_initial }))); }

    // 5b) Repair pass: ensure required fields are populated and non-empty
    let mut final_core = final_core_initial.clone();
    if needs_repair(&final_core) {
        if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"assemble","kind":"repair","data":"Starting repair pass to ensure complete guide"}).to_string()); }
        match repair_guide_with_llm(adapter, shared, &bg_out, &me_out, &cc_out, &final_core, events).await {
            Ok(repaired) => { final_core = repaired; }
            Err(e) => {
                tracing::warn!("repair_guide_with_llm failed: {} — using deterministic fallback", e);
                final_core = deterministic_fill(&final_core, shared, &bg_out, &me_out, &cc_out);
                if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"assemble","kind":"repair","data":"Applied deterministic fallback fill"}).to_string()); }
            }
        }
        if let Some(tx) = events { let _ = tx.send(format!("{}", serde_json::json!({"type":"assemble","kind":"out","data": final_core }))); }
    }

    // 6) Orchestrator updates checklist to done (internal)
    let mut final_checklist = checklist;
    if !final_checklist.contains("[x] delivery") {
        final_checklist = final_checklist.replace("[ ] discovery", "[x] discovery")
            .replace("[ ] analysis", "[x] analysis")
            .replace("[ ] conceptualization", "[x] conceptualization")
            .replace("[ ] composition", "[x] composition")
            .replace("[ ] refinement/polish", "[x] refinement/polish")
            .replace("[ ] delivery", "[x] delivery");
    }

    Ok(OrchestrationResult { guide_core: final_core, checklist_md: final_checklist })
}

fn needs_repair(v: &Value) -> bool {
    let Some(obj) = v.as_object() else { return true };
    let missing = |k: &str| !obj.contains_key(k) || obj[k].is_null() || (obj[k].is_string() && obj[k].as_str().unwrap_or("").trim().is_empty());
    missing("brandName") || missing("industry") || missing("mission") || missing("audience") || missing("elevatorPitch") || !obj.get("tone").map(|t| t.is_object()).unwrap_or(false) || !obj.get("taglines").map(|t| t.is_array() && t.as_array().unwrap().len() >= 3).unwrap_or(false)
}

async fn repair_guide_with_llm(
    adapter: &AdapterDyn,
    shared: &Value,
    bg: &Value,
    me: &Value,
    cc: &Value,
    current: &Value,
    events: Option<&tokio::sync::mpsc::UnboundedSender<String>>,
) -> Result<Value> {
    let prompt = format!(
        r#"Orchestrator (Pro) — REPAIR PASS
Goal: Ensure the brand guide JSON is complete and conforms to the strict schema. No empty or placeholder fields.
Rules:
- If a field is missing or blank, infer the best plausible content from Shared/BG/ME/CC and current.
- Keep language conversational, concise, and specific. Use contractions. Avoid buzzwords and grand metaphors.
- Taglines: at least 3. Each must have a rationale (plain talk, not marketing-speak).
- Audience: 2–3 sentences (who, pains/triggers, objections) in plain language.
- ElevatorPitch: 35–60 words, active voice, conversational, clear differentiation.

Shared: {shared}
BG: {bg}
ME: {me}
CC: {cc}
Current: {current}

Return STRICT JSON only (no wrappers).
"#,
        shared = serde_json::to_string_pretty(shared).unwrap_or_default(),
        bg = serde_json::to_string_pretty(bg).unwrap_or_default(),
        me = serde_json::to_string_pretty(me).unwrap_or_default(),
        cc = serde_json::to_string_pretty(cc).unwrap_or_default(),
        current = serde_json::to_string_pretty(current).unwrap_or_default(),
    );
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"assemble","kind":"repair","data": prompt}).to_string()); }
    let schema = crate::adapters::schemas::guide_schema();
    let out = generate_with_retry(adapter, OAI_4O, OAI_4O_MINI, &prompt, Some(schema), Some(0.2), events, "ORCH").await?;
    Ok(out)
}

fn deterministic_fill(current: &Value, shared: &Value, bg: &Value, me: &Value, cc: &Value) -> Value {
    use serde_json::{json, Value as V};
    let mut out = current.clone();
    let o = out.as_object_mut().unwrap();
    // brandName, industry
    if !o.contains_key("brandName") || o["brandName"].as_str().unwrap_or("").is_empty() { o.insert("brandName".into(), shared.get("brandName").cloned().unwrap_or(json!(""))); }
    if !o.contains_key("industry") || o["industry"].as_str().unwrap_or("").is_empty() { o.insert("industry".into(), shared.get("industry").cloned().unwrap_or(json!(""))); }
    // mission
    if o.get("mission").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
        if let Some(m) = cc.get("mission").and_then(|v| v.as_str()) { o.insert("mission".into(), json!(m)); }
        else if let Some(m) = shared.get("mission").and_then(|v| v.as_str()) { o.insert("mission".into(), json!(m)); }
    }
    // audience
    if o.get("audience").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
        let brand = o.get("brandName").and_then(|v| v.as_str()).unwrap_or("");
        let industry = o.get("industry").and_then(|v| v.as_str()).unwrap_or("");
        let base = me.get("audience").and_then(|v| v.as_str()).unwrap_or("");
        let synth = if !base.is_empty() { base.to_string() } else { format!("{} serves Canadian organizations seeking dependable {} that address real operational constraints and objections like budget, complexity, and adoption.", brand, industry) };
        o.insert("audience".into(), json!(synth));
    }
    // elevatorPitch
    if o.get("elevatorPitch").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
        let brand = o.get("brandName").and_then(|v| v.as_str()).unwrap_or("");
        let mission = o.get("mission").and_then(|v| v.as_str()).unwrap_or("");
        let aud = o.get("audience").and_then(|v| v.as_str()).unwrap_or("");
        let mut pitch = format!("At {}, we design and ship custom web apps, automation, and AI that save time and move the needle. You work with one senior developer who keeps things clear, reduces risk, and fits the build to how your team works.", brand);
        if !mission.is_empty() { pitch = format!("{} {}", pitch, mission); }
        o.insert("elevatorPitch".into(), json!(pitch));
    }
    // tone
    if !o.contains_key("tone") || !o["tone"].is_object() {
        let mut tone = serde_json::Map::new();
        if let Some(t) = bg.get("tone").and_then(|v| v.as_object()) { tone = t.clone(); }
        if !tone.contains_key("traits") { tone.insert("traits".into(), json!(shared.get("toneTraits").and_then(|v| v.as_array()).cloned().unwrap_or_default())); }
        if !tone.contains_key("description") { tone.insert("description".into(), json!("Clear, conversational, and human. Short sentences. Plain language.")); }
        if !tone.contains_key("dosAndDonts") { tone.insert("dosAndDonts".into(), json!({
            "dos":["Use contractions","Prefer plain words","Keep it short and concrete","Focus on outcomes","Sound confident and helpful","Write like a person"],
            "donts":["Corporate phrasing","Buzzwords","Grand metaphors","Overlong sentences","Exclamation marks","Empty filler"]
        })); }
        o.insert("tone".into(), V::Object(tone));
    }
    // taglines
    let mut tags: Vec<V> = o.get("taglines").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    if tags.len() < 3 {
        // seed from CC if present
        if let Some(arr) = cc.get("taglines").and_then(|v| v.as_array()) {
            for it in arr { if let (Some(tl), Some(r)) = (it.get("tagline"), it.get("rationale")) { tags.push(json!({"tagline": tl, "rationale": r})); } }
        }
        // add defaults up to 3
        let defaults = vec![
            ("Built For Real Work", "Plain promise: useful software for day‑to‑day operations"),
            ("Make It Work Better", "What clients want: smoother, faster, fewer headaches"),
            ("Simple. Solid. Shipped.", "Conversational cadence with focus on delivery"),
            ("North‑Ready Software", "A subtle nod to Canadian context; practical and reliable")
        ];
        for (t, r) in defaults {
            if tags.len() >= 3 { break; }
            tags.push(json!({"tagline": t, "rationale": r}));
        }
    } else {
        // ensure each has rationale
        for it in tags.iter_mut() {
            if it.get("rationale").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
                let tl = it.get("tagline").and_then(|v| v.as_str()).unwrap_or("");
                let rationale = format!("Explains how '{}' reflects outcomes and tone.", tl);
                if let Some(obj) = it.as_object_mut() { obj.insert("rationale".into(), json!(rationale)); }
            }
        }
    }
    o.insert("taglines".into(), json!(tags));
    out
}

fn banlist() -> String { crate::prompts::BANNED.join(", ") }

fn build_orchestrator_split_prompt(inputs: &UserInputs) -> String {
    format!(
        "Orchestrator (Pro) — Split Inputs\nAvoid banned buzzwords: {}\n\nUser Inputs:\n- Brand: {}\n- Industry: {}\n- Mission: {}\n- Audience: {}\n- Tone Traits: {}\n\nTask: Return STRICT JSON with keys: shared, bgBrief, meBrief, ccBrief, checklist.\n- shared must include: brandName, industry, mission, audience, toneTraits (array).\n- bgBrief: short guidance for Branding Guru.\n- meBrief: short guidance for Marketing Expert.\n- ccBrief: short guidance for Chief Copywriter.\n- checklist: Markdown with phases: discovery, analysis, conceptualization, composition, refinement/polish, delivery. Leave all unchecked.\n",
        banlist(),
        inputs.brandName,
        inputs.industry,
        inputs.mission,
        inputs.audience,
        inputs.toneTraits.join(", ")
    )
}

fn style_rules() -> &'static str {
    "Style: Conversational, plainspoken, and friendly‑professional. Use contractions (we're, it's).\n- Write like you're talking to a Canadian small‑business owner.\n- Prefer short sentences (8–16 words).\n- Avoid corporate or academic tone.\n- No buzzwords or grand metaphors.\n- Keep lists tight and concrete.\n"
}

fn build_bg_prompt(shared: &Value, brief: &str, checklist: &str) -> String {
    let pre = "Chatroom: Collaborative roundtable. Participants: ORCH, BG, ME, CC, USER. Treat USER as a core stakeholder.";
    format!(
        "{}\nBranding Guru (Flash) — Tone & Guardrails\nShared: {}\nBrief: {}\nChecklist (read-only):\n{}\n\n{}\nDeliver STRICT JSON: {{ \"tone\": {{ \"traits\": [strings], \"description\": string (60–100 words, conversational; optionally include a simple analogy if it truly clarifies; do not label it), \"dosAndDonts\": {{ \"dos\":[5–6 short strings], \"donts\":[5–6 short strings] }} }} }}\nNo emojis/exclamations. Avoid banned buzzwords: {}\n",
        pre,
        serde_json::to_string_pretty(shared).unwrap_or_default(),
        brief,
        checklist,
        style_rules(),
        banlist()
    )
}

fn build_me_prompt(shared: &Value, brief: &str, checklist: &str) -> String {
    let pre = "Chatroom: Collaborative roundtable. Participants: ORCH, BG, ME, CC, USER. Treat USER as a core stakeholder.";
    format!(
        "{}\nMarketing Expert (Flash) — Audience & Pitch Scaffold\nShared: {}\nBrief: {}\nChecklist (read-only):\n{}\n\n{}\nDeliver STRICT JSON: {{ \"audience\": string (2–3 sentences, plain language; cover who/need/triggers/objections), \"pitchNotes\": string (short, friendly, and concrete) }}\nAvoid banned buzzwords: {}\n",
        pre,
        serde_json::to_string_pretty(shared).unwrap_or_default(),
        brief,
        checklist,
        style_rules(),
        banlist()
    )
}

fn build_cc_prompt(shared: &Value, brief: &str, bg: &Value, me: &Value, checklist: &str, existing_tagline: Option<&str>) -> String {
    let pre = "Chatroom: Collaborative roundtable. Participants: ORCH, BG, ME, CC, USER. Treat USER as a core stakeholder.";
    let existing = existing_tagline.unwrap_or("");
    let existing_block = if existing.is_empty() { String::new() } else { format!("\nExisting user tagline: \"{}\"\nInclude it as one of the taglines with a rationale, then add two fresh options.", existing) };
    format!(
        "{}\nChief Copywriter (Flash) — Mission, Pitch, Taglines\nShared: {}\nBrief: {}\nBG Deliverable: {}\nME Deliverable: {}\nChecklist (read-only):\n{}\n\n{}{}\nDeliver STRICT JSON: {{ \"mission\": string (single sentence, 8–18 words, active voice, conversational), \"elevatorPitch\": string (35–60 words, active voice, conversational; use we/you; concrete differentiation), \"taglines\": [{{\"tagline\": string (2–5 words, no punctuation at end), \"rationale\": string (one plain sentence)}}] }}\nAvoid banned buzzwords: {}\n",
        pre,
        serde_json::to_string_pretty(shared).unwrap_or_default(),
        brief,
        serde_json::to_string_pretty(bg).unwrap_or_default(),
        serde_json::to_string_pretty(me).unwrap_or_default(),
        checklist,
        style_rules(),
        existing_block,
        banlist()
    )
}

async fn drain_user_notes(adapter: &AdapterDyn, store: &std::sync::Arc<tokio::sync::Mutex<Vec<String>>>) -> Option<String> {
    let mut guard = store.lock().await;
    if guard.is_empty() { return None; }
    let items = guard.drain(..).collect();
    if let Ok(feedbacks) = crate::agents::json::batch_convert_notes(adapter, items).await {
        let mut out = String::new();
        for v in feedbacks {
            // Format JSON nicely with "area" header
            if let Some(obj) = v.as_object() {
                if let (Some(kind), Some(area), Some(priority), Some(detail)) =
                    (obj.get("kind").and_then(|x| x.as_str()),
                     obj.get("area").and_then(|x| x.as_str()),
                     obj.get("priority").and_then(|x| x.as_str()),
                     obj.get("detail").and_then(|x| x.as_str()))
                {
                    let high = if priority == "high" { " (!HIGH)" } else { "" };
                    out.push_str(&format!("[{}] ", area.to_uppercase()));
                    match kind {
                        "fix" => out.push_str(&format!("{} - FIX{}: ", "🔧", high)),
                        "idea" => out.push_str(&format!("{} - IDEA{}: ", "💡", high)),
                        "clarification" => out.push_str(&format!("{} - CLARIFY{}: ", "❓", high)),
                        _ => out.push_str(&format!("{} - {}: ", "📝", high)),
                    }
                    out.push_str(detail);
                    out.push('\n');
                }
            }
        }
        if !out.is_empty() { return Some(out); }
    }
    None
}

fn fallback_bg_deliverable(shared: &Value) -> Value {
    use serde_json::json;
    let traits = shared.get("toneTraits").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let brand = shared.get("brandName").and_then(|v| v.as_str()).unwrap_or("");
    let tone_list: String = if traits.is_empty() { "friendly‑professional".to_string() } else { traits.iter().map(|t| t.as_str().unwrap_or("")).collect::<Vec<_>>().join(", ") };
    let desc = format!("{} speaks in a clear, conversational voice—friendly, direct, and human. Short sentences. Plain language. If an analogy helps, keep it simple and practical.", brand);
    json!({
        "tone": {
            "traits": traits,
            "description": desc,
            "dosAndDonts": {
                "dos": [
                    "Use contractions (we're, it's)",
                    "Prefer plain words over jargon",
                    "Keep sentences short and concrete",
                    "Talk about outcomes customers care about",
                    "Sound confident but approachable",
                    "Write like a person, not a brochure"
                ],
                "donts": [
                    "Corporate or academic phrasing",
                    "Buzzwords and vague claims",
                    "Grand metaphors or clichés",
                    "Overlong sentences",
                    "Exclamation marks",
                    "Empty filler"
                ]
            }
        }
    })
}

fn fallback_me_deliverable(shared: &Value) -> Value {
    use serde_json::json;
    let brand = shared.get("brandName").and_then(|v| v.as_str()).unwrap_or("");
    let industry = shared.get("industry").and_then(|v| v.as_str()).unwrap_or("");
    let audience = format!(
        "{} serves Canadian organizations seeking dependable {} that translate into measurable results, with clear onboarding and support that reduce risk and complexity.",
        brand, industry
    );
    let notes = "Focus on who/need/objections: highlight triggers (inefficiency, manual work), objections (budget, complexity), and show proof (case studies).";
    json!({"audience": audience, "pitchNotes": notes})
}

fn fallback_cc_deliverable(shared: &Value) -> Value {
    use serde_json::json;
    let brand = shared.get("brandName").and_then(|v| v.as_str()).unwrap_or("");
    let mission = format!("We build useful software that helps Canadian businesses run better.");
    let pitch = format!("At {}, we design and ship custom web apps, automation, and AI that save time and move the needle. You work with one senior developer who keeps things clear, reduces risk, and fits the build to how your team works.", brand);
    let taglines = vec![
        json!({"tagline": "Built For Real Work", "rationale": "Plain promise: useful software for day‑to‑day operations."}),
        json!({"tagline": "Make It Work Better", "rationale": "Says what clients want: smoother, faster, fewer headaches."}),
        json!({"tagline": "Simple. Solid. Shipped.", "rationale": "Conversational cadence with focus on delivery."})
    ];
    json!({"mission": mission, "elevatorPitch": pitch, "taglines": taglines})
}

async fn generate_with_retry(
    adapter: &AdapterDyn,
    primary_model: &str,
    alt_model: &str,
    prompt: &str,
    schema: Option<serde_json::Value>,
    temp: Option<f32>,
    events: Option<&tokio::sync::mpsc::UnboundedSender<String>>,
    role: &str,
) -> Result<Value> {
    use tokio::time::{sleep, Duration};
    let attempts: Vec<(&str, u64)> = vec![(primary_model, 0), (primary_model, 1000), (alt_model, 2500)];
    let mut last_err: Option<anyhow::Error> = None;
    for (idx, (model, wait_ms)) in attempts.iter().enumerate() {
        if *wait_ms > 0 { sleep(Duration::from_millis(*wait_ms)).await; }
        let schema_clone = schema.as_ref().cloned();
        match adapter.generate_json_model(model, prompt, schema_clone, temp).await {
            Ok(v) => return Ok(v),
            Err(e) => {
                last_err = Some(e);
                if let Some(tx) = events {
                    let _ = tx.send(serde_json::json!({
                        "type":"retry",
                        "role": role,
                        "data": {"attempt": idx + 1, "model": model, "error": last_err.as_ref().map(|er| er.to_string()).unwrap_or_default()}
                    }).to_string());
                }
            }
        }
    }
    Err(last_err.unwrap_or_else(|| anyhow::anyhow!("unknown generation error")))
}

async fn snapshot_user_notes(store: &std::sync::Arc<tokio::sync::Mutex<Vec<String>>>, limit: usize) -> Option<String> {
    let guard = store.lock().await;
    if guard.is_empty() { return None; }
    let start = if guard.len() > limit { guard.len() - limit } else { 0 };
    let items = guard[start..].to_vec();
    let mut out = String::new();
    for n in items { out.push_str("- "); out.push_str(&n); out.push('\n'); }
    Some(out)
}

fn build_orchestrator_assemble_prompt(shared: &Value, bg: &Value, me: &Value, cc: &Value) -> String {
    format!(
        "Orchestrator (Pro) — Assemble Final JSON\nAvoid banned buzzwords: {}\nShared: {}\nBG: {}\nME: {}\nCC: {}\n\n{}\nTask: Merge into STRICT JSON with keys exactly: brandName, industry, mission, audience, tone{{traits, description, dosAndDonts{{dos, donts}}}}, taglines[{{tagline, rationale}}], elevatorPitch.\nUse shared.brandName and shared.industry directly. Use BG.tone. Use ME.audience. Use CC.mission, CC.elevatorPitch, CC.taglines. No extra keys.\n",
        banlist(),
        serde_json::to_string_pretty(shared).unwrap_or_default(),
        serde_json::to_string_pretty(bg).unwrap_or_default(),
        serde_json::to_string_pretty(me).unwrap_or_default(),
        serde_json::to_string_pretty(cc).unwrap_or_default(),
        style_rules()
    )
}
