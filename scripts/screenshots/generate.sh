#!/bin/bash
set -e

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly SCREENSHOTS_IMAGE="${SCREENSHOTS_IMAGE:-calendar-week-grid-screenshots:local}"
readonly WORK_DIR="/app"

readonly NPM_CMD="screenshots:generate"

# Run container with project mounted
# Use a named volume for node_modules to prevent corruption of host node_modules
# Named volume for npm cache speeds up repeated npm ci.
# Note: Do not use --platform linux/amd64 on Mac; QEMU emulation breaks Chromium's
# software rasterizer (opacity, compositing). Native arch (arm64 on Mac, amd64 in CI)
# renders correctly, but screenshots may differ slightly between Mac and CI.
printf "Generating screenshots...\n"
export DOCKER_BUILDKIT=1
docker build \
  -t "$SCREENSHOTS_IMAGE" \
  -f "$SCRIPT_DIR/Dockerfile" \
  "$SCRIPT_DIR"

docker run --rm \
  --user root \
  -v "$PROJECT_ROOT:$WORK_DIR" \
  -v "screenshot-node-modules:$WORK_DIR/node_modules" \
  -v "screenshot-npm-cache:/root/.npm" \
  -w "$WORK_DIR" \
  -e NODE_OPTIONS=--no-deprecation \
  -e FORCE_COLOR=1 \
  -e NPM_CMD="$NPM_CMD" \
  -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
  -e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  "$SCREENSHOTS_IMAGE" \
  sh -c 'npm ci && npm run "$NPM_CMD"'
