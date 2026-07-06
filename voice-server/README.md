# Arco voice server

A local, full-duplex voice pipeline (Pipecat) that provides the system
implementation of the `os.voice@1` capability. Silero VAD + Smart Turn v3
handle turn-taking and barge-in; Whisper handles STT; Kokoro handles TTS;
the "brain" is any OpenAI-compatible endpoint.

## Setup (once)

```bash
cd voice-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Requires Python 3.11+. First run downloads models (~1–2 GB total: Whisper,
Kokoro, Silero, Smart Turn v3) into `~/.cache`.

## Run

```bash
npm run voice          # from the repo root, or:
.venv/bin/python bot.py --host localhost --port 4630
```

The Arco shell's mic button (Chat app) lights up when the server is healthy
(`GET http://localhost:4630/status` returns `{"status":"ready",...}`). A
standalone debug client is also served at `http://localhost:4630/client`.

Port **4630** is chosen to avoid colliding with Arco Models (model-manager
dev server on **4620**).

## Swapping engines

Every stage is a slot in `voice.config.json` — no code changes needed:

| Slot | Engines | Notes |
|------|---------|-------|
| `stt.engine` | `whisper-mlx` (Apple Silicon), `faster-whisper` | `model`: any Whisper size |
| `tts.engine` | `kokoro` (default), `piper` | Piper needs its own server at `tts.piperBaseUrl` |
| `brain` | any OpenAI-compatible URL | see below |
| `vad` / `turn` | Silero params, Smart Turn on/off | `stopSecs: 0.2` recommended |

### Brains

- **Ollama** (default): `{ "baseUrl": "http://localhost:11434/v1", "model": "qwen2.5:7b" }`
- **Arco Models** (llama-server): `{ "baseUrl": "http://127.0.0.1:4650/v1", "model": "<router id>" }`
- **Arco agent** (full tool-using agent): `{ "baseUrl": "http://localhost:4600/v1", "model": "arco-agent" }`
  — slower per turn, but it can build apps, run tools, etc.
- Set `"useArcoSettings": true` to follow whatever `data/settings.json` says
  (i.e. the model chosen in Arco's Settings app / model manager).

The whole STT→LLM→TTS cascade can later be replaced by a single
speech-to-speech realtime service (OpenAI Realtime, Gemini Live, Ultravox…)
— Pipecat ships those as drop-in pipeline services; the browser client and
face rig are unaffected.
