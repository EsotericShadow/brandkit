#[path = "adapters/gemini.rs"]
pub mod gemini;
#[path = "adapters/mock.rs"]
pub mod mock;
#[path = "adapters/schemas.rs"]
pub mod schemas;
#[path = "adapters/openai.rs"]
pub mod openai;
#[path = "adapters/cascade_v2.rs"]
pub mod cascade;

use async_trait::async_trait;
use serde_json::Value as JsonValue;
use anyhow::{Result};

#[derive(Clone, Copy)]
pub enum Provider { Gemini, OpenAi, Mock }

impl Provider {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "gemini" => Some(Self::Gemini),
            "openai" | "open-ai" | "oai" => Some(Self::OpenAi),
            "mock" => Some(Self::Mock),
            _ => None,
        }
    }
}

#[async_trait]
pub trait LlmAdapter: Send + Sync {
    fn provider_id(&self) -> &'static str;
    // Back-compat convenience (defaults to Flash)
    async fn generate_json(&self, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue>;
    async fn generate_text(&self, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String>;

    // New: explicit model selection (e.g., "gemini-2.5-pro" or "gemini-2.5-flash")
    async fn generate_json_model(&self, model: &str, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue>;
    async fn generate_text_model(&self, model: &str, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String>;
}

pub type AdapterDyn = dyn LlmAdapter;

pub fn make_adapter(p: Provider) -> Result<Box<AdapterDyn>> {
    // Provider chain: allow fallback to secondary provider if primary fails
    // Order is determined by DEFAULT_PROVIDER and availability of API keys.
    let has_gemini = std::env::var("GEMINI_API_KEY").ok().map(|k| !k.is_empty()).unwrap_or(false);
    let has_openai = std::env::var("OPENAI_API_KEY").ok().map(|k| !k.is_empty()).unwrap_or(false);

    let mut chain: Vec<Box<AdapterDyn>> = Vec::new();
    match p {
        Provider::Gemini => {
            if has_gemini { chain.push(Box::new(gemini::GeminiAdapter::new(std::env::var("GEMINI_API_KEY").unwrap()))); }
            if has_openai { chain.push(Box::new(openai::OpenAiAdapter::new(std::env::var("OPENAI_API_KEY").unwrap()))); }
        }
        Provider::OpenAi => {
            if has_openai { chain.push(Box::new(openai::OpenAiAdapter::new(std::env::var("OPENAI_API_KEY").unwrap()))); }
            if has_gemini { chain.push(Box::new(gemini::GeminiAdapter::new(std::env::var("GEMINI_API_KEY").unwrap()))); }
        }
        Provider::Mock => {
            chain.push(Box::new(mock::MockAdapter::new()));
        }
    }

    if chain.is_empty() {
        tracing::warn!("No API key configured for requested provider; using Mock adapter");
        return Ok(Box::new(mock::MockAdapter::new()));
    }
    if chain.len() == 1 {
        Ok(chain.into_iter().next().unwrap())
    } else {
        Ok(Box::new(cascade::CascadeAdapter::new(chain)))
    }
}

