use anyhow::{Result, bail};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value as JsonValue};
use std::time::Duration;

use super::LlmAdapter;

pub struct GeminiAdapter { key: String, http: Client }
impl GeminiAdapter {
    pub fn new(key: String) -> Self {
        let timeout_ms: u64 = std::env::var("GEMINI_HTTP_TIMEOUT_MS")
            .ok()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(60000);
        let http = Client::builder()
            .pool_max_idle_per_host(8)
            .tcp_keepalive(Some(Duration::from_secs(30)))
            .timeout(Duration::from_millis(timeout_ms))
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { key, http }
    }
}

#[async_trait]
impl LlmAdapter for GeminiAdapter {
    async fn generate_json(&self, prompt: &str, schema: Option<JsonValue>, temperature: Option<f32>) -> Result<JsonValue> {
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", self.key);
        let mut generation_config = json!({"temperature": temperature.unwrap_or(0.6), "responseMimeType": "application/json"});
        if let Some(s) = schema { generation_config["responseSchema"] = s; }
        let body = json!({
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": generation_config
        });
        let resp = self.http.post(&url).json(&body).send().await?;
        if !resp.status().is_success() { bail!(format!("Gemini error: {}", resp.text().await?)); }
        let v: JsonValue = resp.json().await?;
        let text = v["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("").to_string();
        let parsed: JsonValue = serde_json::from_str(&text).unwrap_or(json!({"error": "invalid_json_from_model"}));
        Ok(parsed)
    }

    async fn generate_text(&self, prompt: &str, system: Option<&str>, temperature: Option<f32>) -> Result<String> {
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", self.key);
        let mut req = json!({
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature.unwrap_or(0.7)}
        });
        if let Some(sys) = system { req["systemInstruction"] = json!({"role":"system","parts":[{"text": sys}]}); }
        let resp = self.http.post(&url).json(&req).send().await?;
        if !resp.status().is_success() { bail!(format!("Gemini error: {}", resp.text().await?)); }
        let v: JsonValue = resp.json().await?;
        let text = v["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("").to_string();
        Ok(text)
    }
}

