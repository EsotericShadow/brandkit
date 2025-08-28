use axum::{routing::{get, post}, Router};
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{EnvFilter, fmt};

mod models;
mod prompts;
mod adapters;
mod routes;

use adapters::{Provider, make_adapter, AdapterDyn};
use routes::{health, generate_guide, rewrite_text, check_consistency};

#[derive(Clone)]
pub struct AppState {
    pub adapter: Arc<AdapterDyn>,
    pub palette_cache: Arc<tokio::sync::Mutex<lru::LruCache<String, serde_json::Value>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // logging
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    fmt().with_env_filter(filter).init();

    tracing::info!("Boot: loading .env and reading configuration");
    dotenvy::dotenv().ok();
    let port: u16 = std::env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(8787);
    let provider_raw = std::env::var("DEFAULT_PROVIDER").unwrap_or_else(|_| "gemini".to_string());
    let provider = Provider::from_str(&provider_raw).unwrap_or(Provider::Gemini);
    let has_gemini_key = std::env::var("GEMINI_API_KEY").ok().map(|k| !k.is_empty()).unwrap_or(false);
    tracing::info!(port = port, provider = %provider_raw, has_gemini_key, "Boot: config loaded");

    tracing::info!("Boot: creating adapter");
    let adapter = make_adapter(provider)?;
    tracing::info!("Boot: adapter created");

    // Simple in-memory LRU cache for palette suggestions (capacity ~256 entries)
    let cache = lru::LruCache::new(std::num::NonZeroUsize::new(256).unwrap());
    let state = AppState { adapter: Arc::from(adapter), palette_cache: Arc::new(tokio::sync::Mutex::new(cache)) };

    tracing::info!("Boot: building router and CORS layer");
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/generate-guide", post(generate_guide))
        .route("/api/rewrite", post(rewrite_text))
        .route("/api/consistency", post(check_consistency))
        .route("/api/suggest-palette", post(routes::suggest_palette))
        .with_state(state)
        .layer(cors);

    let addr = SocketAddr::from(([0,0,0,0], port));
    tracing::info!("Boot: binding listener on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("Rust AI server listening on http://{}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}

