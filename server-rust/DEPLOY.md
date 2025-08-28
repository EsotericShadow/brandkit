# Deploying the Rust API (Axum) and wiring the Vercel frontend

This guide shows two easy paths to deploy the Rust backend and connect your Vercel site to it.

Prerequisites
- A GitHub repo (this project)
- A hosting account (Render, Railway, Fly.io, etc.)
- Your AI provider key (GEMINI_API_KEY or alternative) as a secret in the host

1) Build for production locally (optional sanity check)
- Ensure Rust toolchain is installed: rustup default stable
- From server-rust/: cargo build --release
- Run locally: PORT=8787 DEFAULT_PROVIDER=gemini GEMINI_API_KEY=... ./target/release/brand_voice_ai_server
- Health check: curl http://localhost:8787/api/health

2) Deploy to Render (Docker)
- Render will use render.yaml at repo root and server-rust/Dockerfile
- Steps:
  1. Push to GitHub (already done)
  2. In Render dashboard: New +> Blueprint, pick this repo
  3. Set env var GEMINI_API_KEY in the service
  4. Deploy. The service URL will look like https://brandkit-rust.onrender.com

3) Point the Vercel site to the Rust API
- In Vercel project settings:
  - Add Environment Variable: VITE_API_BASE = https://<your-rust-api-host>
  - Redeploy the site (or push a commit)
- The frontend uses import.meta.env.VITE_API_BASE so all API calls go to that host in production.

Notes
- vite.config.ts already proxies /api -> http://localhost:8787 in dev, so local DX stays the same.
- CORS is open (Any origin) in the Rust server for simplicity. Lock it down later if needed.
- If you still have /api/* serverless files in the Vercel project, they will be bypassed once VITE_API_BASE is set, because the frontend will call absolute URLs to the Rust API.

Alternative hosts
- Railway: create a service from this repo, specify Dockerfile server-rust/Dockerfile, set env vars, expose $PORT
- Fly.io: fly launch (Docker-based), set env vars, deploy — ensure the app binds to 0.0.0.0 (done in code)

