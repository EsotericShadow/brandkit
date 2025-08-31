use anyhow::Result;
use serde_json::Value;
use crate::adapters::AdapterDyn;

const MODEL_FLASH: &str = "gemini:gemini-2.5-flash";
const OAI_4O_MINI: &str = "openai:gpt-4o-mini";

// Drain any queued user notes and turn them into structured JSON using a fast JSON agent.
pub async fn drain_and_transform_user_notes(
    adapter: &AdapterDyn,
    store: &std::sync::Arc<tokio::sync::Mutex<Vec<String>>>,
    events: Option<&tokio::sync::mpsc::UnboundedSender<String>>,
) -> Result<Option<(String, Value)>> {
    let mut guard = store.lock().await;
    if guard.is_empty() { return Ok(None); }
    let items: Vec<String> = guard.drain(..).collect();
    drop(guard);

    let mut raw = String::new();
    for n in &items { raw.push_str("- "); raw.push_str(n); raw.push('\n'); }

    let schema = crate::adapters::schemas::user_interjection_schema();
    let prompt = format!(
        r#"JSON Agent (Flash) — Normalize User Interjection
Raw user messages (may be corrections, constraints, preferences, or answers):
{raw}

Task: Convert the above into STRICT JSON with keys: constraints[], preferences[], corrections[], answers[], audienceHints[], elevatorPitch (optional string), palette (object of color role->hex), priorities[] .
- Do not invent facts.
- Keep items short and specific.
- Only include keys that have content; omit empty arrays/fields.
"#,
        raw = raw
    );

    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"analysis","role":"JSON","kind":"prompt","data": prompt}).to_string()); let _ = tx.send(serde_json::json!({"type":"typing","role":"JSON","state":"start"}).to_string()); }
    let out = adapter.generate_json_model(OAI_4O_MINI, &prompt, Some(schema), Some(0.2)).await;
    if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"typing","role":"JSON","state":"stop"}).to_string()); }

    match out {
        Ok(val) => {
            if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"analysis","role":"JSON","kind":"out","data": val}).to_string()); }
            Ok(Some((raw, val)))
        }
        Err(e) => {
            if let Some(tx) = events { let _ = tx.send(serde_json::json!({"type":"error","message": format!("json-agent failed: {}", e)}).to_string()); }
            // Return raw only so pipeline can still proceed
            Ok(Some((raw, serde_json::json!({}))))
        }
    }
}
