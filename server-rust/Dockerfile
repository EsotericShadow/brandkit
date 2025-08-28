# syntax=docker/dockerfile:1

# --- Build stage ---
FROM rust:1.87-slim AS builder
WORKDIR /app

# Cache dependencies
COPY server-rust/Cargo.toml server-rust/Cargo.lock ./
# Create a dummy src so build deps can be cached
RUN mkdir -p src && echo "fn main(){}" > src/main.rs && \
    cargo build --release || true

# Now copy the real source
RUN rm -rf src
COPY server-rust/src ./src

# Build the real binary
RUN cargo build --release

# --- Runtime stage ---
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy the binary from the builder
COPY --from=builder /app/target/release/brand_voice_ai_server /app/brand_voice_ai_server

# Unprivileged user
RUN useradd -m appuser
USER appuser

EXPOSE 8787
ENV PORT=8787
ENV DEFAULT_PROVIDER=gemini

CMD ["/app/brand_voice_ai_server"]

