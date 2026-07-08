# Coolify deployment for Arco OS

Arco stores all user state on disk under `ARCO_DATA_DIR` (default `./data`, Docker: `/data`):

- `settings.json`, `users.json`, auth sessions
- Chat sessions, generated apps, skills
- SQLite databases (`db/`)
- Agent workspace files (`workspace/`)

**Redeploys must mount a named Docker volume at `/data`.** Without it, every push wipes chats, apps, and settings.

## Persistent storage (required)

### Production: kosmos.tiru.fm

Verified on the server:

| Setting | Value |
|---------|-------|
| Volume name | `kosmos-os-data` |
| Mount path | `/data` |
| Env | `ARCO_DATA_DIR=/data` |
| Host path | `/var/lib/docker/volumes/kosmos-os-data/_data` |

Coolify compose includes:

```yaml
volumes:
  - kosmos-os-data:/data

volumes:
  kosmos-os-data:
    name: kosmos-os-data
```

The explicit `name:` is important — it prevents Coolify from creating a fresh anonymous volume on redeploy.

### New Coolify app checklist

1. **Persistent Storage** (Application → Storages):
   - Destination: `/data`
   - Name: `<app>-data` (e.g. `kosmos-os-data`)

2. **Environment variables**:
   ```
   ARCO_DATA_DIR=/data
   ARCO_SECURE_COOKIES=1
   NODE_ENV=production
   PORT=4600
   ```

3. **Dockerfile**: use repo root `Dockerfile` (runs `npm run build`). Do **not** use `Dockerfile.prod` — it skips the UI build.

4. **Redeploy safely**: push code → CI publishes a new GHCR image → redeploy the compose service. The named volume at `/data` is untouched.

## Auto-deploy on push to main

`kosmos.tiru.fm` runs a **pinned GHCR image** (`ghcr.io/kosmos-computer/kosmos:<sha>-amd64`), not a live git build. Pushing to GitHub alone does not update production until:

1. **GitHub Actions** (`.github/workflows/publish-docker.yml`) builds and pushes a new image on every `main` push, then **deploys to kosmos.tiru.fm** via SSH (secrets: `COOLIFY_SSH_KEY`, `COOLIFY_HOST`).
2. Manual redeploy (if needed):

   ```bash
   GHCR_TOKEN=$(gh auth token) GHCR_USER=$(gh api user -q .login) ./scripts/deploy-coolify.sh
   ```

   Requires a GitHub token with `read:packages` for private GHCR pulls when run locally.

### Verify persistence

On the host:

```bash
# Volume exists and is mounted
docker inspect <container> --format '{{json .Mounts}}' | jq .

# Data is present
docker exec <container> ls -la /data
```

From the app: `GET /api/system/install-status` should show `"data_dir": { "ok": true }`.

### Backup before risky changes

```bash
# Snapshot the volume on the Coolify host
docker run --rm \
  -v kosmos-os-data:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/kosmos-os-data-$(date +%Y%m%d).tar.gz -C /data .
```

Restore (stop the app first):

```bash
docker run --rm \
  -v kosmos-os-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/kosmos-os-data-YYYYMMDD.tar.gz"
```

Reference compose: `docker-compose.arco.yml`.

---

## Local models (Ollama)

The **Arco Models** desktop app (`model-manager/`, Tauri + `llama-server` on `:4650`) is macOS/desktop-only and does not run inside Coolify containers.

For Coolify deployments, use **Ollama** on the same Docker network as Arco.

### Quick setup

1. Ollama container on network `coolify`:
   ```bash
   docker run -d --name arco-ollama --network coolify \
     -v arco-ollama-data:/root/.ollama \
     -e OLLAMA_HOST=0.0.0.0:11434 \
     --restart unless-stopped ollama/ollama:latest
   docker exec arco-ollama ollama pull qwen2.5:0.5b
   ```

2. Point Arco at Ollama (env vars override persisted `settings.json` in Docker):
   ```bash
   LLM_PROVIDER=ollama
   LLM_BASE_URL=http://arco-ollama:11434/v1
   LLM_MODEL=qwen2.5:0.5b
   LLM_API_KEY=
   ```

   Or edit `data/settings.json` on the volume:
   ```json
   {
     "provider": "ollama",
     "baseUrl": "http://arco-ollama:11434/v1",
     "model": "qwen2.5:0.5b",
     "apiKey": ""
   }
   ```

3. Open Arco and chat — the agent uses the local model.

### Coolify UI (optional)

Add `docker-compose.stack.yml` as a **Docker Compose** resource in the same project as Arco so Ollama appears in Coolify and survives redeploys.

## Desktop vs Coolify

| | Desktop (`npm run models`) | Coolify |
|--|---------------------------|---------|
| UI | Arco Models Tauri app | Ollama CLI / Coolify service logs |
| Engine | `llama-server` router `:4650` | Ollama `:11434` |
| Models | Curated GGUF catalog | `ollama pull <name>` |
| GPU | Apple Metal | CPU in Colima VM (slow; use small models) |

On your Mac, keep using `npm run models` for the full model-manager experience with Metal. Use Ollama in Coolify for server-style local inference tests.

## Agent ops (Docker + Coolify)

When `ARCO_OPS_ENABLED=1` and the host mounts are present, Kosmos auto-seeds a **Kosmos Ops** MCP server with tools for:

- `create_directory` — workspace or Coolify app folders
- `docker_build` — build images (needs Docker socket)
- `coolify_create_app` — scaffold Dockerfile + compose under `/host-coolify/applications`
- `docker_compose_up` — deploy a compose stack

Required compose mounts (see `docker-compose.arco.yml`):

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - /data/coolify/applications:/host-coolify/applications
environment:
  ARCO_OPS_ENABLED: "1"
  ARCO_SELF_HEAL: "1"
  ARCO_COOLIFY_APPS_DIR: /host-coolify/applications
```

**Self-heal:** with `ARCO_SELF_HEAL=1`, Kosmos restarts failed MCP servers every 5 minutes and logs to `/data/ops-heal.log`.

**Codex in Docker:** the prod image installs `bubblewrap` and writes `/data/.codex/config.toml` for sandboxed file edits.

Local dev: Settings → MCP → **Kosmos Ops** quick-add, or set `ARCO_SEED_OPS_MCP=1`.
