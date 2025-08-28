# Rust Axum server [exp]

- Endpoints:
  - GET /api/health
  - POST /api/generate-guide
  - POST /api/rewrite
  - POST /api/consistency
- Provider-agnostic via adapters::LlmAdapter; currently implements Gemini.
- Env: PORT, DEFAULT_PROVIDER, GEMINI_API_KEY
- Build: `cargo build`
- Run: `cargo run`
- Notes: Keep files under ~225 LOC and refactor as needed.

