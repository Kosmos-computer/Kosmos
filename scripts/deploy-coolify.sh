#!/usr/bin/env bash
# Redeploy kosmos.tiru.fm after CI publishes a new GHCR image.
# Usage: ./scripts/deploy-coolify.sh [short-sha]
# Example: ./scripts/deploy-coolify.sh a0d3e70
set -euo pipefail

HOST="${COOLIFY_HOST:-root@kosmos.tiru.fm}"
COMPOSE_DIR="/data/coolify/applications/kosmos-os"
IMAGE_REPO="ghcr.io/kosmos-computer/kosmos"

SHORT_SHA="${1:-$(git rev-parse --short HEAD)}"
TAG="${SHORT_SHA}-amd64"
IMAGE="${IMAGE_REPO}:${TAG}"

echo "Deploying ${IMAGE} to ${HOST} …"

ssh -o BatchMode=yes "${HOST}" bash -s <<EOF
set -euo pipefail
COMPOSE_DIR="${COMPOSE_DIR}"
IMAGE="${IMAGE}"
TAG="${TAG}"

# Log in to GHCR if a token is available (optional — public packages skip this).
if [[ -n "\${GHCR_TOKEN:-}" ]]; then
  echo "\${GHCR_TOKEN}" | docker login ghcr.io -u "\${GHCR_USER:-github}" --password-stdin
fi

docker pull "\${IMAGE}"

sed -i "s|image: ghcr.io/kosmos-computer/kosmos:[^[:space:]]*|image: \${IMAGE}|" "\${COMPOSE_DIR}/docker-compose.yaml"
sed -i "s|^SOURCE_COMMIT=.*|SOURCE_COMMIT=\$(docker inspect --format='{{index .RepoDigests 0}}' "\${IMAGE}" 2>/dev/null || echo "${SHORT_SHA}")|" "\${COMPOSE_DIR}/.env" || true

cd "\${COMPOSE_DIR}"
docker compose up -d --remove-orphans

echo "Running image:"
docker inspect kosmos-os-4600 --format '{{.Config.Image}}'
EOF

echo "Done. https://kosmos.tiru.fm"
