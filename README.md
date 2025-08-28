<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and develop locally (provider-agnostic)

This repo now uses a provider-agnostic backend to keep API keys private. The frontend calls a local server under `/api`. The backend is implemented in Rust (Axum) under `server-rust/`. Gemini is supported; other providers can be added via adapters.

## Run Locally

Prerequisites: Node.js, Rust (cargo)

1. Install frontend deps:
   `npm install`
2. Configure the backend (Rust):
   - Copy `server-rust/.env.example` to `server-rust/.env` and set `GEMINI_API_KEY`.
   - Optionally set `DEFAULT_PROVIDER=gemini`.
3. Build and run the backend:
   `cargo run --manifest-path server-rust/Cargo.toml`
4. In a separate terminal, run the frontend on port 3000:
   `npm run dev -- --port 3000`

By default, the frontend proxies `/api` to `http://localhost:8787` in dev (see `vite.config.ts`).

### Provider selection
- Optionally set `VITE_AI_PROVIDER` in `.env.local` (default is `gemini`).
- Backend also supports `DEFAULT_PROVIDER`.

### Security
- API keys are never exposed to the browser. Keys live only in `server-rust/.env`.
