use anyhow::Result;
use serde_json::Value;
use crate::adapters::AdapterDyn;

const MODEL_FLASH: &str = "gemini-2.5-flash";

/// Converts raw user messages to structured JSON feedback
pub async fn batch_convert_notes(adapter: &AdapterDyn, notes: Vec<String>) -> Result<Vec<Value>> {
    let mut results = Vec::new();
    for note in notes {
        match convert_note_to_feedback(adapter, &note).await {
            Ok(json) => results.push(json),
            Err(e) => tracing::warn!(note = %note, error = %e, "Failed to convert note to JSON feedback"),
        }
    }
    Ok(results)
}

async fn convert_note_to_feedback(adapter: &AdapterDyn, note: &str) -> Result<Value> {
    let prompt = format!(
        "JSON Expert — Convert Text to Structured Feedback\n\
        User note: {}\n\
        Convert this note to STRICT JSON using this schema: {{ \"kind\": \"fix\" or \"idea\" or \"clarification\", \"area\": \"tone\" or \"pitch\" or \"audience\" or \"taglines\" or \"general\", \"priority\": \"high\" or \"medium\" or \"low\", \"detail\": string }}\n\
        Rules for detection:\n\
        - kind=fix for corrections/edits/issues to resolve\n\
        - kind=idea for suggestions/enhancements\n\
        - kind=clarification for questions or ambiguities\n\
        - area= what part of brand guide it relates to (default: general)\n\
        - priority= assess urgency based on words and tone (default: medium)\n\
        - detail= make concise and specific — describe the actual change/risk/etc.",
        note
    );

    let schema = feedback_schema();
    let out = adapter.generate_json_model(MODEL_FLASH, &prompt, Some(schema), Some(0.2)).await?;
    Ok(out)
}

fn feedback_schema() -> Value {
    serde_json::json!({
        "type": "object",
        "required": ["kind", "area", "priority", "detail"],
        "properties": {
            "kind": {
                "type": "string",
                "enum": ["fix", "idea", "clarification"]
            },
            "area": {
                "type": "string",
                "enum": ["tone", "pitch", "audience", "taglines", "general"]
            },
            "priority": {
                "type": "string",
                "enum": ["high", "medium", "low"]
            },
            "detail": {"type": "string"}
        }
    })
}
