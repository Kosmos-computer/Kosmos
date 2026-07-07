# Coolify local models for Arco

The **Arco Models** desktop app (`model-manager/`, Tauri + `llama-server` on `:4650`) is macOS/desktop-only and does not run inside Coolify containers.

For Coolify deployments, use **Ollama** on the same Docker network as Arco.

## Quick setup (already applied in your test instance)

1. Ollama container on network `coolify`:
   ```bash
   docker run -d --name arco-ollama --network coolify \
     -v arco-ollama-data:/root/.ollama \
     -e OLLAMA_HOST=0.0.0.0:11434 \
     --restart unless-stopped ollama/ollama:latest
   docker exec arco-ollama ollama pull qwen2.5:0.5b
   ```

2. Point Arco at Ollama (`data/settings.json` or Settings app):
   ```json
   {
     "provider": "ollama",
     "baseUrl": "http://arco-ollama:11434/v1",
     "model": "qwen2.5:0.5b",
     "apiKey": ""
   }
   ```

3. Open Arco and chat — the agent uses the local model.

## Coolify UI (optional)

Add `docker-compose.stack.yml` as a **Docker Compose** resource in the same project as `arco-os` so Ollama appears in Coolify and survives redeploys.

## Desktop vs Coolify

| | Desktop (`npm run models`) | Coolify |
|--|---------------------------|---------|
| UI | Arco Models Tauri app | Ollama CLI / Coolify service logs |
| Engine | `llama-server` router `:4650` | Ollama `:11434` |
| Models | Curated GGUF catalog | `ollama pull <name>` |
| GPU | Apple Metal | CPU in Colima VM (slow; use small models) |

On your Mac, keep using `npm run models` for the full model-manager experience with Metal. Use Ollama in Coolify for server-style local inference tests.
