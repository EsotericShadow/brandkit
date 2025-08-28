#!/usr/bin/env sh
set -eu

# Emit clear startup diagnostics so Render shows usable runtime logs
printf "[ENTRYPOINT] starting brand_voice_ai_server\n"
printf "[ENTRYPOINT] date_utc=%s\n" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf "[ENTRYPOINT] RUST_LOG=%s RUST_BACKTRACE=%s DEFAULT_PROVIDER=%s\n" "${RUST_LOG:-}" "${RUST_BACKTRACE:-}" "${DEFAULT_PROVIDER:-}"

if [ -z "${PORT:-}" ]; then
  PORT=10000
  export PORT
  printf "[ENTRYPOINT] PORT not set; defaulting to %s\n" "$PORT"
else
  printf "[ENTRYPOINT] PORT=%s\n" "$PORT"
fi

printf "[ENTRYPOINT] exec /app/brand_voice_ai_server\n"
exec /app/brand_voice_ai_server

