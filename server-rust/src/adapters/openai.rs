use anyhow::{Result, bail};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value as JsonValue};
use std::time::Duration;

use super::LlmAdapter;

pub struct OpenAiAdapter { key: String, http: Client, base: String, default_model: String }
impl OpenAiAdapter {
    pub fn new(key: String) -> Self {
        let timeout_ms: u64 = std::env::var("OPENAI_HTTP_TIMEOUT_MS").ok().and_then(|s| s.parse().ok()).unwrap_or(60000);
        let http = Client::builder()
            .pool_max_idle_per_host(8)
            .tcp_keepalive(Some(Duration::from_secs(30)))
            .timeout(Duration::from_millis(timeout_ms))
            .build()
            .unwrap_or_else(|_| Client::new());
        let base = std::env::var("OPENAI_BASE_URL").unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
        let default_model = std::env::var("OPENAI_MODEL_DEFAULT").unwrap_or_else(|_| "gpt-4o-mini".to_string());
        Self { key, http, base, default_model }
    }

    fn choose_model<'a>(&'a self, model: &'a str) -> &'a str {
        // If caller passes an OpenAI model (starts with gpt), use it; otherwise use our default
        if model.starts_with("gpt-") { model } else { &self.default_model }
    }
}

#[async_trait]
impl LlmAdapter for OpenAiAdapter {
    fn provider_id(&self) -> &'static str { "openai" }
    async fn generate_json(&self, prompt: &str, _schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue> {
        self.generate_json_model(&self.default_model, prompt, None, temperature).await
    }

    async fn generate_text(&self, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String> {
        self.generate_text_model(&self.default_model, prompt, system, temperature).await
    }

    async fn generate_json_model(&self, model: &str, prompt: &str, _schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue> {
        let model = self.choose_model(model);
        let url = format!("{}/chat/completions", self.base);
        let sys = "You are a senior brand strategist. Output strict JSON only; no markdown fences or commentary.";
        let body = json!({
            "model": model,
            "temperature": temperature.unwrap_or(0.5),
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": sys},
                {"role": "user", "content": prompt}
            ]
        });
        let resp = self.http.post(&url)
            .bearer_auth(&self.key)
            .json(&body)
            .send().await?;
        if !resp.status().is_success() { bail!(format!("OpenAI error: {}", resp.text().await?)); }
        let v: JsonValue = resp.json().await?;
        let text = v["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();
        let parsed: JsonValue = serde_json::from_str(&text).unwrap_or(json!({"error": "invalid_json_from_model"}));
        Ok(parsed)
    }

    async fn generate_text_model(&self, model: &str, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String> {
        let model = self.choose_model(model);
        let url = format!("{}/chat/completions", self.base);
        let mut messages = vec![];
        if let Some(sys) = system { messages.push(json!({"role":"system","content": sys})); }
        messages.push(json!({"role":"user","content": prompt}));
        let body = json!({"model": model, "temperature": temperature.unwrap_or(0.7), "messages": messages});
        let resp = self.http.post(&url)
            .bearer_auth(&self.key)
            .json(&body)
            .send().await?;
        if !resp.status().is_success() { bail!(format!("OpenAI error: {}", resp.text().await?)); }
        let v: JsonValue = resp.json().await?;
        let text = v["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();
        Ok(text)
    }
}
