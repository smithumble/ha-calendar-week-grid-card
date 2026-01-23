#!/bin/bash
set -e

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly BASE_IMAGE="timbru31/node-chrome:24-alpine"
readonly WORK_DIR="/app"

readonly NPM_CMD="screenshots:generate"

# Run container with project mounted
# Use a named volume for node_modules to prevent corruption of host node_modules
# Note: Do not use --platform linux/amd64 on Mac; QEMU emulation breaks Chromium's
# software rasterizer (opacity, compositing). Native arch (arm64 on Mac, amd64 in CI)
# renders correctly, but screenshots may differ slightly between Mac and CI.
printf "Generating screenshots...\n"
docker run --rm \
  --user root \
  -v "$PROJECT_ROOT:$WORK_DIR" \
  -v "screenshot-node-modules:$WORK_DIR/node_modules" \
  -w "$WORK_DIR" \
  -e NODE_OPTIONS=--no-deprecation \
  -e FORCE_COLOR=1 \
  -e NPM_CMD="$NPM_CMD" \
  -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
  -e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  "$BASE_IMAGE" \
  sh -c '
    apk add --no-cache font-noto font-noto-emoji ttf-dejavu ttf-liberation fontconfig curl && \
    mkdir -p /usr/share/fonts/truetype/google-sans && \
    curl -L "https://github.com/google/fonts/raw/main/ofl/googlesans/GoogleSans-Regular.ttf" -o /usr/share/fonts/truetype/google-sans/GoogleSans-Regular.ttf && \
    curl -L "https://github.com/google/fonts/raw/main/ofl/googlesans/GoogleSans-Medium.ttf" -o /usr/share/fonts/truetype/google-sans/GoogleSans-Medium.ttf && \
    curl -L "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf" -o /usr/share/fonts/truetype/Roboto-Regular.ttf && \
    curl -L "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Medium.ttf" -o /usr/share/fonts/truetype/Roboto-Medium.ttf && \
    fc-cache -f && \
    npm ci && \
    npm run "$NPM_CMD"
  '
