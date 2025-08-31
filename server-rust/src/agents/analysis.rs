use anyhow::Result;
use serde_json::Value;
use crate::adapters::AdapterDyn;

const MODEL_PRO: &str = "gemini:gemini-2.5-pro";
const MODEL_FLASH: &str = "gemini:gemini-2.5-flash";
const OAI_4O: &str = "openai:gpt-4o";
const OAI_4O_MINI: &str = "openai:gpt-4o-mini";

pub struct AnalysisTranscript {
    #[allow(dead_code)]
    pub bg_notes: Value,
    #[allow(dead_code)]
    pub me_notes: Value,
    pub cc_notes: Value,
}

pub async fn run_analysis_round(
    adapter: &AdapterDyn,
    shared: &Value,
    banlist: &str,
    events: Option<&tokio::sync::mpsc::UnboundedSender<String>>,
    user_notes: Option<&std::sync::Arc<tokio::sync::Mutex<Vec<String>>>>,
) -> Result<AnalysisTranscript> {
    // Snapshot recent USER chat to include in prompts (chatroom style)
    let mut user_chat_snippet: Option<String> = None;
    if let Some(store) = user_notes {
        if let Some(snip) = snapshot_user_notes(store, 5).await {
            user_chat_snippet = Some(format!("\n\nLive chat (recent USER messages):\n{}\n", snip));
        }
    }

    // BG analysis
    let mut bg_prompt = format!(
        r#"Chatroom: Collaborative roundtable. Participants: ORCH, BG, ME, CC, USER. Treat USER as a core stakeholder.
Branding Guru (Flash) — ANALYSIS
Shared: {shared}
Task: Provide STRICT JSON: {{ "notes": "3 bullets inline", "questions": ["3 short questions"] }}. Avoid banned terms: {ban}
Style: Plainspoken and conversational. Use contractions. Short lines (≤16 words). No buzzwords or grand metaphors.
"#,
        shared = serde_json::to_string_pretty(shared).unwrap_or_default(),
        ban = banlist
    );
    if let Some(snippet) = &user_chat_snippet { bg_prompt.push_str(snippet); }
    let bg_schema = json_schema_bg();
    tracing::info!(target: "orchestrator", "[BG ANALYSIS] prompt=\n{}", bg_prompt);
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"analysis","role":"BG","kind":"prompt","data": bg_prompt}).to_string()); let _ = tx.send(serde_json::json!({"type":"typing","role":"BG","state":"start"}).to_string()); }
    let bg_out = gen_with_retry(adapter, &bg_prompt, Some(bg_schema), Some(0.35), MODEL_FLASH, OAI_4O_MINI, events, "BG").await?;
    tracing::info!(target: "orchestrator", "[BG ANALYSIS] out=\n{}", serde_json::to_string_pretty(&bg_out).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"BG","state":"stop"}).to_string()); let _ = tx.send(serde_json::json!({"type":"analysis","role":"BG","kind":"out","data": bg_out}).to_string()); }

    // ME analysis (respond to BG)
    let mut me_prompt = format!(
        r#"Marketing Expert (Flash) — ANALYSIS
Shared: {shared}
BG Notes: {bg}
Task: Provide STRICT JSON: {{ "notes": "3 bullets inline", "answers": ["short answers to BG questions"], "risks": ["2-3 risks to watch"] }}. Avoid banned terms: {ban}
Style: Keep it human and direct. Use contractions. Short, concrete sentences. No fluff.
"#,
        shared = serde_json::to_string_pretty(shared).unwrap_or_default(),
        bg = serde_json::to_string_pretty(&bg_out).unwrap_or_default(),
        ban = banlist
    );
    let me_schema = json_schema_me();
    if let Some(snippet) = &user_chat_snippet { let mut p = me_prompt.clone(); p.push_str(snippet); me_prompt = p; }
    tracing::info!(target: "orchestrator", "[ME ANALYSIS] prompt=\n{}", me_prompt);
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"analysis","role":"ME","kind":"prompt","data": me_prompt}).to_string()); let _ = tx.send(serde_json::json!({"type":"typing","role":"ME","state":"start"}).to_string()); }
    let me_out = gen_with_retry(adapter, &me_prompt, Some(me_schema), Some(0.35), MODEL_FLASH, OAI_4O_MINI, events, "ME").await?;
    tracing::info!(target: "orchestrator", "[ME ANALYSIS] out=\n{}", serde_json::to_string_pretty(&me_out).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"ME","state":"stop"}).to_string()); let _ = tx.send(serde_json::json!({"type":"analysis","role":"ME","kind":"out","data": me_out}).to_string()); }

    // CC analysis (synthesize consensus)
    let mut cc_prompt = format!(
        r#"Chief Copywriter (Pro) — ANALYSIS
Shared: {shared}
BG Notes: {bg}
ME Notes: {me}
Task: Provide STRICT JSON: {{ "consensus": ["3 bullets"], "gaps": ["2-3 gaps to clarify"], "notes": "short summary" }}. Avoid banned terms: {ban}
Style: Plain language, short sentences, approachable tone. Focus on what matters. No buzzwords.
"#,
        shared = serde_json::to_string_pretty(shared).unwrap_or_default(),
        bg = serde_json::to_string_pretty(&bg_out).unwrap_or_default(),
        me = serde_json::to_string_pretty(&me_out).unwrap_or_default(),
        ban = banlist
    );
    let cc_schema = json_schema_cc();
    if let Some(snippet) = &user_chat_snippet { let mut p = cc_prompt.clone(); p.push_str(snippet); cc_prompt = p; }
    tracing::info!(target: "orchestrator", "[CC ANALYSIS] prompt=\n{}", cc_prompt);
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"analysis","role":"CC","kind":"prompt","data": cc_prompt}).to_string()); let _ = tx.send(serde_json::json!({"type":"typing","role":"CC","state":"start"}).to_string()); }
    let cc_out = gen_with_retry(adapter, &cc_prompt, Some(cc_schema), Some(0.4), OAI_4O, MODEL_PRO, events, "CC").await?;
    tracing::info!(target: "orchestrator", "[CC ANALYSIS] out=\n{}", serde_json::to_string_pretty(&cc_out).unwrap_or_default());
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"CC","state":"stop"}).to_string()); let _ = tx.send(serde_json::json!({"type":"analysis","role":"CC","kind":"out","data": cc_out}).to_string()); }

    Ok(AnalysisTranscript { bg_notes: bg_out, me_notes: me_out, cc_notes: cc_out })
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
                    // Add priority only for high to save space
                    let high = if priority == "high" { " (!HIGH)" } else { "" };
                    out.push_str(&format!("[{}] ", area.to_uppercase()));
                    // Prefix indicators
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

async fn gen_with_retry(
    adapter: &AdapterDyn,
    prompt: &str,
    schema: Option<serde_json::Value>,
    temp: Option<f32>,
    primary: &str,
    alt: &str,
    events: Option<&tokio::sync::mpsc::UnboundedSender<String>>,
    role: &str,
) -> Result<Value> {
    use tokio::time::{sleep, Duration};
    let attempts: Vec<(&str, u64)> = vec![(primary, 0), (primary, 1000), (alt, 2500)];
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

fn json_schema_bg() -> serde_json::Value {
    serde_json::json!({
        "type":"object",
        "properties":{
            "notes": {"type":"string"},
            "questions": {"type":"array","items":{"type":"string"}}
        }
    })
}
fn json_schema_me() -> serde_json::Value {
    serde_json::json!({
        "type":"object",
        "properties":{
            "notes": {"type":"string"},
            "answers": {"type":"array","items":{"type":"string"}},
            "risks": {"type":"array","items":{"type":"string"}}
        }
    })
}
fn json_schema_cc() -> serde_json::Value {
    serde_json::json!({
        "type":"object",
        "properties":{
            "consensus": {"type":"array","items":{"type":"string"}},
            "gaps": {"type":"array","items":{"type":"string"}},
            "notes": {"type":"string"}
        }
    })
}
