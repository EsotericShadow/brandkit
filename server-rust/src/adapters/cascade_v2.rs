use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value as JsonValue;

use super::LlmAdapter;

pub struct CascadeAdapter { inner: Vec<Box<super::AdapterDyn>> }
impl CascadeAdapter { pub fn new(inner: Vec<Box<super::AdapterDyn>>) -> Self { Self { inner } } }

fn parse_provider_pref(model: &str) -> (Option<&str>, Option<&str>) {
    if let Some((prov, name)) = model.split_once(":") {
        let p = prov.trim().to_lowercase();
        if p == "openai" || p == "gemini" || p == "mock" {
            return (Some(Box::leak(p.into_boxed_str())), Some(name.trim()));
        }
    }
    (None, None)
}

#[async_trait]
impl LlmAdapter for CascadeAdapter {
    fn provider_id(&self) -> &'static str { "cascade" }

    async fn generate_json(&self, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue> {
        let mut last_err: Option<anyhow::Error> = None;
        for a in &self.inner {
            match a.generate_json(prompt, schema.clone(), temperature).await {
                Ok(v) => return Ok(v),
                Err(e) => { last_err = Some(e); }
            }
        }
        Err(last_err.unwrap_or_else(|| anyhow::anyhow!("all adapters failed")))
    }

    async fn generate_text(&self, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String> {
        let mut last_err: Option<anyhow::Error> = None;
        for a in &self.inner {
            match a.generate_text(prompt, system, temperature).await {
                Ok(v) => return Ok(v),
                Err(e) => { last_err = Some(e); }
            }
        }
        Err(last_err.unwrap_or_else(|| anyhow::anyhow!("all adapters failed")))
    }

    async fn generate_json_model(&self, model: &str, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue> {
        let (target_prov, model_name_opt) = parse_provider_pref(model);
        let selected: Vec<&Box<super::AdapterDyn>> = if let Some(tp) = target_prov {
            self.inner.iter().filter(|a| a.provider_id() == tp).collect()
        } else { self.inner.iter().collect() };
        let mut last_err: Option<anyhow::Error> = None;
        for a in selected {
            let pass_model = model_name_opt.unwrap_or(model);
            match a.generate_json_model(pass_model, prompt, schema.clone(), temperature).await {
                Ok(v) => return Ok(v),
                Err(e) => { last_err = Some(e); }
            }
        }
        Err(last_err.unwrap_or_else(|| anyhow::anyhow!("all adapters failed")))
    }

    async fn generate_text_model(&self, model: &str, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String> {
        let (target_prov, model_name_opt) = parse_provider_pref(model);
        let selected: Vec<&Box<super::AdapterDyn>> = if let Some(tp) = target_prov {
            self.inner.iter().filter(|a| a.provider_id() == tp).collect()
        } else { self.inner.iter().collect() };
        let mut last_err: Option<anyhow::Error> = None;
        for a in selected {
            let pass_model = model_name_opt.unwrap_or(model);
            match a.generate_text_model(pass_model, prompt, system, temperature).await {
                Ok(v) => return Ok(v),
                Err(e) => { last_err = Some(e); }
            }
        }
        Err(last_err.unwrap_or_else(|| anyhow::anyhow!("all adapters failed")))
    }
}

