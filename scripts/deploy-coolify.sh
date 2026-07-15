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

available_root_bytes() {
  df --output=avail -B1 / | tail -n 1 | tr -d ' '
}

report_largest_docker_logs() {
  echo "Largest Docker container logs:"
  while read -r log_size log_path; do
    [[ -n "\${log_size:-}" && -n "\${log_path:-}" ]] || continue
    container_id="\$(basename "\$(dirname "\${log_path}")")"
    container_details="\$(docker inspect --format '{{.Name}} {{.Config.Image}}' "\${container_id}" 2>/dev/null || echo unknown)"
    echo "  \${log_size} bytes  \${container_details}  \${log_path}"
  done < <(find /var/lib/docker/containers -type f -name '*-json.log' -printf '%s %p\n' 2>/dev/null | sort -nr | sed -n '1,10p')
}

ensure_docker_headroom() {
  # Docker only needs a small amount of working space before the targeted image
  # cleanup below can reclaim the bulk of the disk. Requiring hundreds of MiB
  # here can prevent that cleanup from ever running on a completely full host.
  local minimum_bytes=16777216
  local available
  available="\$(available_root_bytes)"
  [[ "\${available}" -ge "\${minimum_bytes}" ]] && return

  echo "Root filesystem has less than 16 MiB free; clearing safe caches"
  report_largest_docker_logs
  apt-get clean || true
  if command -v journalctl >/dev/null 2>&1; then
    journalctl --rotate || true
    journalctl --vacuum-size=50M || true
  fi
  sync

  available="\$(available_root_bytes)"
  while read -r log_size log_path; do
    [[ "\${available}" -lt "\${minimum_bytes}" ]] || break
    [[ -n "\${log_size:-}" && "\${log_size}" -gt 0 && -n "\${log_path:-}" ]] || continue
    echo "Truncating oversized Docker log \${log_path} (\${log_size} bytes)"
    truncate --size=0 "\${log_path}"
    sync
    available="\$(available_root_bytes)"
  done < <(find /var/lib/docker/containers -type f -name '*-json.log' -printf '%s %p\n' 2>/dev/null | sort -nr)

  available="\$(available_root_bytes)"
  if [[ "\${available}" -lt "\${minimum_bytes}" ]]; then
    # ext4 excludes root-reserved blocks from df's available count. Cache and
    # log cleanup can therefore make Docker metadata writes possible while df
    # continues to report zero; let the targeted Docker cleanup be the test.
    echo "df still reports less than 16 MiB free; attempting Docker cleanup using reserved headroom"
  fi
}

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

ensure_docker_headroom
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
LOGGING_OVERRIDE="\${COMPOSE_DIR}/docker-compose.logging.yaml"
{
  echo "services:"
  while read -r service_name; do
    [[ -n "\${service_name}" ]] || continue
    printf '  %s:\n' "\${service_name}"
    printf '    logging:\n'
    printf '      driver: json-file\n'
    printf '      options:\n'
    printf '        max-size: "10m"\n'
    printf '        max-file: "3"\n'
  done < <(docker compose -f docker-compose.yaml config --services)
} > "\${LOGGING_OVERRIDE}"

docker compose -f docker-compose.yaml -f "\${LOGGING_OVERRIDE}" up -d --remove-orphans
prune_old_kosmos_images

echo "Running image:"
docker inspect kosmos-os-4600 --format '{{.Config.Image}}'
EOF

echo "Done. https://kosmos.tiru.fm"
