#[path = "adapters/gemini.rs"]
pub mod gemini;
#[path = "adapters/mock.rs"]
pub mod mock;
#[path = "adapters/schemas.rs"]
pub mod schemas;

use async_trait::async_trait;
use serde_json::Value as JsonValue;
use anyhow::{Result};

#[derive(Clone, Copy)]
pub enum Provider { Gemini, Mock }

impl Provider {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "gemini" => Some(Self::Gemini),
            "mock" => Some(Self::Mock),
            _ => None,
        }
    }
}

#[async_trait]
pub trait LlmAdapter: Send + Sync {
    async fn generate_json(&self, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue>;
    async fn generate_text(&self, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String>;
}

pub type AdapterDyn = dyn LlmAdapter;

pub fn make_adapter(p: Provider) -> Result<Box<AdapterDyn>> {
    match p {
        Provider::Gemini => {
            let key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
            if key.is_empty() {
                tracing::warn!("GEMINI_API_KEY missing; falling back to Mock adapter");
                Ok(Box::new(mock::MockAdapter::new()))
            } else {
                Ok(Box::new(gemini::GeminiAdapter::new(key)))
            }
        }
        Provider::Mock => {
            tracing::info!("Using Mock adapter");
            Ok(Box::new(mock::MockAdapter::new()))
        }
    }
}

