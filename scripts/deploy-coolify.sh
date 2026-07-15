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
CURRENT_IMAGE_ID="\$(docker inspect --format '{{.Image}}' kosmos-os-4600 2>/dev/null || true)"
CURRENT_HEALTH="\$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' kosmos-os-4600 2>/dev/null || true)"
PRIOR_IMAGE_ID=""
PRIOR_IMAGE_REF=""
while read -r image_id image_ref; do
  full_id="\$(docker image inspect --format '{{.Id}}' "\${image_id}" 2>/dev/null || true)"
  if [[ "\${CURRENT_HEALTH}" == "unhealthy" && "\${full_id}" == "\${CURRENT_IMAGE_ID}" ]]; then
    echo "Skipping unhealthy current image \${image_ref} as rollback candidate"
  elif [[ -n "\${full_id}" && "\${full_id}" != "\${TARGET_IMAGE_ID}" && "\${image_ref}" != *'<none>'* ]]; then
    PRIOR_IMAGE_ID="\${full_id}"
    PRIOR_IMAGE_REF="\${image_ref}"
    break
  fi
done < <(docker image ls "\${IMAGE_REPO}" --format '{{.ID}} {{.Repository}}:{{.Tag}}')

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

configure_journal_limits() {
  local config_dir=/etc/systemd/journald.conf.d
  local config_file="\${config_dir}/kosmos-disk-limits.conf"

  install -d -m 0755 "\${config_dir}"
  if [[ ! -f "\${config_file}" ]] || ! grep -q '^SystemKeepFree=1G$' "\${config_file}"; then
    printf '%s\n' \
      '[Journal]' \
      'SystemMaxUse=100M' \
      'SystemKeepFree=1G' \
      'SystemMaxFileSize=10M' \
      'RuntimeMaxUse=50M' \
      'RuntimeKeepFree=256M' \
      'MaxRetentionSec=7day' > "\${config_file}"
    systemctl restart systemd-journald || true
  fi
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
      remove_ref="\${image_ref}"
      if [[ "\${image_ref}" == *'<none>'* ]]; then
        remove_ref="\${image_id}"
      fi
      docker image rm "\${remove_ref}"
    fi
  done < <(docker image ls "\${IMAGE_REPO}" --format '{{.ID}} {{.Repository}}:{{.Tag}}')
  docker image prune --force
}

wait_for_kosmos_health() {
  local attempts=36
  local attempt
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if docker exec kosmos-os-4600 node -e "fetch('http://127.0.0.1:4600/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      return 0
    fi
    container_status="\$(docker inspect --format '{{.State.Status}}' kosmos-os-4600 2>/dev/null || true)"
    restart_count="\$(docker inspect --format '{{.RestartCount}}' kosmos-os-4600 2>/dev/null || echo 0)"
    if [[ "\${container_status}" == "exited" || "\${container_status}" == "dead" ]]; then
      break
    fi
    if [[ "\${restart_count}" =~ ^[0-9]+$ && "\${restart_count}" -ge 3 ]]; then
      break
    fi
    sleep 5
  done
  return 1
}

configure_journal_limits
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

SECRETS_ENV="\${COMPOSE_DIR}/.env"
ARCO_SECRETS_KEK="\$(sed -n 's/^ARCO_SECRETS_KEK=//p' "\${SECRETS_ENV}" 2>/dev/null | tail -n 1)"
if [[ -z "\${ARCO_SECRETS_KEK}" ]]; then
  umask 077
  ARCO_SECRETS_KEK="\$(openssl rand -hex 32)"
  printf '\nARCO_SECRETS_KEK=%s\n' "\${ARCO_SECRETS_KEK}" >> "\${SECRETS_ENV}"
  chmod 600 "\${SECRETS_ENV}"
  echo "Generated persistent ARCO_SECRETS_KEK for the deployment"
fi
export ARCO_SECRETS_KEK

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
    printf '    environment:\n'
    printf '      ARCO_SECRETS_KEK: "\${ARCO_SECRETS_KEK}"\n'
  done < <(docker compose -f docker-compose.yaml config --services)
} > "\${LOGGING_OVERRIDE}"

docker compose -f docker-compose.yaml -f "\${LOGGING_OVERRIDE}" up -d --remove-orphans
if ! wait_for_kosmos_health; then
  echo "New Kosmos container failed its health check" >&2
  docker logs --tail 200 kosmos-os-4600 >&2 || true
  if [[ -n "\${PRIOR_IMAGE_REF}" ]]; then
    echo "Rolling back to \${PRIOR_IMAGE_REF}" >&2
    sed -i "s|image: ghcr.io/kosmos-computer/kosmos:[^[:space:]]*|image: \${PRIOR_IMAGE_REF}|" "\${COMPOSE_DIR}/docker-compose.yaml"
    docker compose -f docker-compose.yaml -f "\${LOGGING_OVERRIDE}" up -d --remove-orphans
    if wait_for_kosmos_health; then
      echo "Rollback is healthy; marking deployment failed" >&2
    else
      echo "Rollback also failed its health check" >&2
      docker logs --tail 200 kosmos-os-4600 >&2 || true
    fi
  fi
  exit 1
fi
prune_old_kosmos_images

echo "Running image:"
docker inspect kosmos-os-4600 --format '{{.Config.Image}}'
EOF

wait_for_public_health() {
  local attempts=18
  local consecutive_successes=0
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time 10 \
      "https://kosmos.tiru.fm/health" | grep -q '"ok":true'; then
      consecutive_successes=$((consecutive_successes + 1))
      if [[ "${consecutive_successes}" -ge 3 ]]; then
        return 0
      fi
    else
      consecutive_successes=0
    fi
    sleep 5
  done

  return 1
}

echo "Verifying public route https://kosmos.tiru.fm/health …"
if ! wait_for_public_health; then
  echo "Public Kosmos health check failed after deployment" >&2
  exit 1
fi

echo "Done. https://kosmos.tiru.fm"
