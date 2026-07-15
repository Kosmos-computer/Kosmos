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

SSH_OPTS="${SSH_OPTS:--o BatchMode=yes}"

echo "Deploying ${IMAGE} to ${HOST} …"

# Pass GHCR creds from the local environment into the remote deploy.
REMOTE_GHCR_TOKEN="${GHCR_TOKEN:-}"
REMOTE_GHCR_USER="${GHCR_USER:-github}"

ssh ${SSH_OPTS} "${HOST}" bash -s <<EOF
set -euo pipefail
COMPOSE_DIR="${COMPOSE_DIR}"
IMAGE_REPO="${IMAGE_REPO}"
IMAGE="${IMAGE}"
TAG="${TAG}"
GHCR_TOKEN="${REMOTE_GHCR_TOKEN}"
GHCR_USER="${REMOTE_GHCR_USER}"

TARGET_IMAGE_ID="\$(docker image inspect --format '{{.Id}}' "\${IMAGE}" 2>/dev/null || true)"
PRIOR_IMAGE_ID=""
while read -r image_id; do
  full_id="\$(docker image inspect --format '{{.Id}}' "\${image_id}" 2>/dev/null || true)"
  if [[ -n "\${full_id}" && "\${full_id}" != "\${TARGET_IMAGE_ID}" ]]; then
    PRIOR_IMAGE_ID="\${full_id}"
    break
  fi
done < <(docker image ls "\${IMAGE_REPO}" --format '{{.ID}}')

prune_old_kosmos_images() {
  while read -r image_id image_ref; do
    [[ -n "\${image_id}" && "\${image_ref}" != "\${IMAGE}" ]] || continue
    full_id="\$(docker image inspect --format '{{.Id}}' "\${image_id}" 2>/dev/null || true)"
    if [[ -n "\${PRIOR_IMAGE_ID}" && "\${full_id}" == "\${PRIOR_IMAGE_ID}" ]]; then
      echo "Keeping rollback image \${image_ref}"
    elif [[ -n "\$(docker ps -aq --filter "ancestor=\${image_id}")" ]]; then
      echo "Keeping in-use image \${image_ref}"
    else
      docker image rm "\${image_ref}"
    fi
  done < <(docker image ls "\${IMAGE_REPO}" --format '{{.ID}} {{.Repository}}:{{.Tag}}')
  docker image prune --force
}

echo "Disk usage before Docker cleanup:"
df -h /
prune_old_kosmos_images

if [[ -n "\${GHCR_TOKEN}" ]]; then
  echo "\${GHCR_TOKEN}" | docker login ghcr.io -u "\${GHCR_USER}" --password-stdin
fi

docker pull "\${IMAGE}"

sed -i "s|image: ghcr.io/kosmos-computer/kosmos:[^[:space:]]*|image: \${IMAGE}|" "\${COMPOSE_DIR}/docker-compose.yaml"
sed -i "s|^SOURCE_COMMIT=.*|SOURCE_COMMIT=\$(docker inspect --format='{{index .RepoDigests 0}}' "\${IMAGE}" 2>/dev/null || echo "${SHORT_SHA}")|" "\${COMPOSE_DIR}/.env" || true

cd "\${COMPOSE_DIR}"
docker compose up -d --remove-orphans
prune_old_kosmos_images

echo "Running image:"
docker inspect kosmos-os-4600 --format '{{.Config.Image}}'
EOF

echo "Done. https://kosmos.tiru.fm"
