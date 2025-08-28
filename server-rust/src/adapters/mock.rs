use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value as JsonValue};

use super::LlmAdapter;

pub struct MockAdapter;
impl MockAdapter { pub fn new() -> Self { Self } }

#[async_trait]
impl LlmAdapter for MockAdapter {
    async fn generate_json(&self, prompt: &str, schema: Option<JsonValue>, _temperature: Option<f32>) -> Result<JsonValue> {
        // Return a minimal valid JSON matching the schema when possible, otherwise echo prompt.
        let _ = (prompt, schema); // unused in mock
        Ok(json!({
            "brandName": "MockCo",
            "industry": "Mocking",
            "mission": "Make local dev easy.",
            "audience": "Developers",
            "tone": {"traits": ["friendly"], "description": "Mocked", "dosAndDonts": {"dos": ["test"], "donts": ["panic"]}},
            "taglines": [{"tagline": "Ship faster", "rationale": "Succinct"}],
            "elevatorPitch": "We mock things.",
        }))
    }

    async fn generate_text(&self, prompt: &str, system: Option<&str>, _temperature: Option<f32>) -> Result<String> {
        let sys = system.unwrap_or("");
        Ok(format!("[MOCKED] {} :: {}", sys, prompt))
    }
}
