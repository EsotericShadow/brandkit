use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value as JsonValue};

use super::LlmAdapter;

pub struct MockAdapter;
impl MockAdapter { pub fn new() -> Self { Self } }

#[async_trait]
impl LlmAdapter for MockAdapter {
    fn provider_id(&self) -> &'static str { "mock" }
    async fn generate_json(&self, prompt: &str, schema: Option<JsonValue>, _temperature: Option<f32>) -> Result<JsonValue> {
        let _ = (prompt, schema);
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

    async fn generate_json_model(&self, _model: &str, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue> {
        self.generate_json(prompt, schema, temperature).await
    }

    async fn generate_text_model(&self, _model: &str, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String> {
        self.generate_text(prompt, system, temperature).await
    }
}
