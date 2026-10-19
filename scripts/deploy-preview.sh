#!/usr/bin/env bash
# Deploy the preview shell. This never touches kosmos.tiru.fm.
# Usage: ./scripts/deploy-preview.sh [short-sha]
set -euo pipefail

HOST="${COOLIFY_HOST:-root@kosmos.tiru.fm}"
COMPOSE_DIR="/data/coolify/applications/kosmos-preview"
IMAGE_REPO="ghcr.io/kosmos-computer/kosmos"
PREVIEW_HOST="${PREVIEW_HOST:-kosmos-preview.5.78.83.70.sslip.io}"
CONTAINER="kosmos-preview"
PRODUCTION_DIR="/data/coolify/applications/kosmos-os"
PRODUCTION_CONTAINER="kosmos-os-4600"

if [[ "${COMPOSE_DIR}" == "${PRODUCTION_DIR}" || "${CONTAINER}" == "${PRODUCTION_CONTAINER}" ]]; then
  echo "Refusing to deploy preview onto the production app" >&2
  exit 1
fi

SHORT_SHA="${1:-$(git rev-parse --short HEAD)}"
TAG="${SHORT_SHA}-amd64"
IMAGE="${IMAGE_REPO}:${TAG}"
SSH_OPTS="${SSH_OPTS:--o BatchMode=yes}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_SRC="${ROOT}/deploy/coolify/docker-compose.preview.yml"

echo "Deploying ${IMAGE} to https://${PREVIEW_HOST} …"

ssh ${SSH_OPTS} "${HOST}" "mkdir -p '${COMPOSE_DIR}' && chmod 700 '${COMPOSE_DIR}'"
scp ${SSH_OPTS} "${COMPOSE_SRC}" "${HOST}:${COMPOSE_DIR}/docker-compose.yaml.next"

REMOTE_GHCR_TOKEN="${GHCR_TOKEN:-}"
REMOTE_GHCR_USER="${GHCR_USER:-github}"

ssh ${SSH_OPTS} "${HOST}" bash -s <<EOF
set -euo pipefail
COMPOSE_DIR="${COMPOSE_DIR}"
IMAGE="${IMAGE}"
PREVIEW_HOST="${PREVIEW_HOST}"
CONTAINER="${CONTAINER}"
PRODUCTION_DIR="${PRODUCTION_DIR}"
PRODUCTION_CONTAINER="${PRODUCTION_CONTAINER}"
GHCR_TOKEN="${REMOTE_GHCR_TOKEN}"
GHCR_USER="${REMOTE_GHCR_USER}"

if [[ "\${COMPOSE_DIR}" == "\${PRODUCTION_DIR}" ]]; then
  echo "Refusing to write the production compose directory" >&2
  exit 1
fi

available_bytes="\$(df --output=avail -B1 / | tail -n 1 | tr -d ' ')"
if ! docker image inspect "\${IMAGE}" >/dev/null 2>&1; then
  if [[ "\${available_bytes}" -lt 5368709120 ]]; then
    echo "Less than 5 GiB free; keeping the running preview container and skipping the pull"
    df -h /
    rm -f "\${COMPOSE_DIR}/docker-compose.yaml.next"
    docker inspect "\${CONTAINER}" --format 'Preview container {{.Config.Image}}' || true
    exit 0
  fi
fi

python3 - "\${COMPOSE_DIR}/docker-compose.yaml.next" "\${IMAGE}" "\${PREVIEW_HOST}" <<'PY'
import pathlib, sys
path, image, host = sys.argv[1:]
text = pathlib.Path(path).read_text()
text = text.replace("ghcr.io/kosmos-computer/kosmos:PREVIEW_TAG", image)
text = text.replace("PREVIEW_HOST", host)
if "kosmos-os-data" in text or "kosmos-os-4600" in text:
    raise SystemExit("preview compose still points at production")
bare = text.replace("preview.kosmos.tiru.fm", "")
if "kosmos.tiru.fm" in bare:
    raise SystemExit("preview compose still points at production")
pathlib.Path(path).write_text(text)
PY
mv "\${COMPOSE_DIR}/docker-compose.yaml.next" "\${COMPOSE_DIR}/docker-compose.yaml"

ENV_FILE="\${COMPOSE_DIR}/.env"
if [[ ! -s "\${ENV_FILE}" ]]; then
  umask 077
  printf 'ARCO_SECRETS_KEK=%s\nARCO_ENTRY_MAGIC_KEY=%s\n' \
    "\$(openssl rand -hex 32)" "\$(openssl rand -hex 32)" > "\${ENV_FILE}"
  chmod 600 "\${ENV_FILE}"
  echo "Created a new preview env file"
fi
chmod 600 "\${ENV_FILE}"

# Publish only the entry path, mode 600, so the secret is not printed in CI logs.
python3 - "\${ENV_FILE}" "\${COMPOSE_DIR}/entry-url" "\${PREVIEW_HOST}" <<'PY'
import pathlib, sys
env_path, out_path, host = sys.argv[1:]
key = ""
for line in pathlib.Path(env_path).read_text().splitlines():
    if line.startswith("ARCO_ENTRY_MAGIC_KEY="):
        key = line.split("=", 1)[1].strip()
if len(key) < 32:
    raise SystemExit("preview entry key is missing")
path = pathlib.Path(out_path)
path.write_text(f"https://{host}/entry/{key}\n")
path.chmod(0o600)
PY

if [[ -n "\${GHCR_TOKEN}" ]]; then
  echo "\${GHCR_TOKEN}" | docker login ghcr.io -u "\${GHCR_USER}" --password-stdin
fi

if ! docker pull "\${IMAGE}"; then
  docker image inspect "\${IMAGE}" >/dev/null
fi

cd "\${COMPOSE_DIR}"
docker compose -f docker-compose.yaml up -d --remove-orphans

# A failed preview start must not be followed by any production command.
for attempt in \$(seq 1 36); do
  if docker exec "\${CONTAINER}" node -e "fetch('http://127.0.0.1:4600/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    docker inspect "\${CONTAINER}" --format 'Preview container {{.Config.Image}}'
    docker inspect "\${PRODUCTION_CONTAINER}" --format 'Production container still {{.Config.Image}}'
    exit 0
  fi
  sleep 5
done
echo "Preview container failed its health check" >&2
docker logs --tail 80 "\${CONTAINER}" >&2 || true
exit 1
EOF

echo "Verifying https://${PREVIEW_HOST}/health …"
for attempt in $(seq 1 18); do
  if curl --fail --silent --show-error --max-time 15 \
    "https://${PREVIEW_HOST}/health" | grep -q '"ok":true'; then
    echo "Preview is up at https://${PREVIEW_HOST}"
    echo "Entry link is on the server at ${COMPOSE_DIR}/entry-url"
    exit 0
  fi
  sleep 5
done
echo "Preview container is healthy, but the public route is not yet" >&2
exit 1
