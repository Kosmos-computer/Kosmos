"""Arco voice server — a fully-local, full-duplex voice pipeline.

One Pipecat pipeline provides the system implementation of the os.voice@1
capability (see shared/capabilities/voice.ts):

    transport.input → VAD (Silero) + Smart Turn v3 → STT (Whisper)
                    → brain (any OpenAI-compatible endpoint) → TTS (Kokoro)
                    → transport.output

Barge-in and cancellation are handled by Pipecat: VAD stays live during bot
playback, and user speech onset flushes buffered bot audio and cancels
in-flight LLM/TTS work. Echo cancellation happens client-side (browser AEC
over WebRTC) — see src/voice/VoiceClient.ts.

Every stage is chosen by voice.config.json; swapping engines (Kokoro→Piper,
Ollama→Arco agent) is a config edit, not a code change. Models auto-download
to ~/.cache on first run.

Run:  .venv/bin/python bot.py --host localhost --port 4630
"""

import asyncio
import io
import json
import os
import wave
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import HTTPException, Response
from loguru import logger
from pydantic import BaseModel

from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frameworks.rtvi import RTVIObserver, RTVIProcessor
from pipecat.runner.run import app as voice_app
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transcriptions.language import Language
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.turns.user_stop import TurnAnalyzerUserTurnStopStrategy
from pipecat.turns.user_turn_strategies import UserTurnStrategies

SERVER_DIR = Path(__file__).resolve().parent
# Arco's settings.json lives in the repo's data dir; the voice server reads it
# (never writes) when brain.useArcoSettings is on, so "Use in Arco" in the
# model manager also configures voice.
ARCO_SETTINGS = SERVER_DIR.parent / "data" / "settings.json"

# Spoken output goes through TTS verbatim — the prompt exists to keep the
# brain's text speakable (no markdown, short sentences).
SYSTEM_INSTRUCTION = (
    "You are Arco, a helpful voice assistant. You are talking with the user "
    "over audio: respond conversationally, in short plain sentences. Never "
    "use markdown, bullet points, code blocks, or emoji — everything you "
    "write is spoken aloud."
)


def load_config() -> dict[str, Any]:
    config_path = Path(os.environ.get("ARCO_VOICE_CONFIG", SERVER_DIR / "voice.config.json"))
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    logger.info(f"Loaded voice config from {config_path}")
    return config


def resolve_brain(config: dict[str, Any]) -> dict[str, str]:
    """The brain slot is always just an OpenAI-compatible endpoint: Ollama,
    Arco Models (llama-server), or the Arco agent's /v1/chat/completions."""
    brain = dict(config.get("brain", {}))
    if brain.get("useArcoSettings"):
        try:
            settings = json.loads(ARCO_SETTINGS.read_text(encoding="utf-8"))
            if settings.get("provider") == "mock":
                logger.warning("Arco settings use the mock provider; keeping voice.config.json brain")
            else:
                brain["baseUrl"] = settings.get("baseUrl", brain.get("baseUrl"))
                brain["model"] = settings.get("model", brain.get("model"))
                brain["apiKey"] = settings.get("apiKey", brain.get("apiKey", ""))
                logger.info(f"Brain from Arco settings: {brain['model']} @ {brain['baseUrl']}")
        except (OSError, json.JSONDecodeError) as err:
            logger.warning(f"Could not read Arco settings ({err}); using voice.config.json brain")
    return brain


def parse_language(code: str) -> Language | None:
    try:
        return Language(code)
    except ValueError:
        logger.warning(f"Unknown language code {code!r}; letting the engine auto-detect")
        return None


# ── Slot factories ───────────────────────────────────────────────────────────
# Engines are lazily imported so an uninstalled fallback (e.g. Piper) never
# blocks startup of the configured stack.


def build_stt(config: dict[str, Any]):
    stt_cfg = config.get("stt", {})
    engine = stt_cfg.get("engine", "whisper-mlx")
    language = parse_language(stt_cfg.get("language", "en"))

    if engine == "whisper-mlx":
        from pipecat.services.whisper.stt import MLXModel, WhisperSTTServiceMLX

        # Config uses short names ("large-v3-turbo"); MLX needs the full HF
        # repo id ("mlx-community/whisper-large-v3-turbo"). Full ids (anything
        # containing "/") pass through untouched.
        raw_model = stt_cfg.get("model", "large-v3-turbo")
        if "/" in raw_model:
            model = raw_model
        else:
            try:
                model = MLXModel[raw_model.upper().replace("-", "_")].value
            except KeyError:
                valid = ", ".join(m.name.lower().replace("_", "-") for m in MLXModel)
                raise ValueError(f"Unknown MLX Whisper model {raw_model!r} (expected {valid})")
        logger.info(f"STT: whisper-mlx model {model}")

        return WhisperSTTServiceMLX(
            settings=WhisperSTTServiceMLX.Settings(
                model=model,
                language=language,
            ),
        )
    if engine == "faster-whisper":
        from pipecat.services.whisper.stt import WhisperSTTService

        return WhisperSTTService(
            settings=WhisperSTTService.Settings(
                model=stt_cfg.get("model", "base"),
                language=language,
            ),
        )
    raise ValueError(f"Unknown STT engine: {engine!r} (expected whisper-mlx | faster-whisper)")


def build_tts(config: dict[str, Any]):
    tts_cfg = config.get("tts", {})
    engine = tts_cfg.get("engine", "kokoro")

    if engine == "kokoro":
        from pipecat.services.kokoro.tts import KokoroTTSService

        return KokoroTTSService(
            settings=KokoroTTSService.Settings(voice=tts_cfg.get("voice", "af_heart")),
        )
    if engine == "piper":
        # Piper is a client to a separately-running piper HTTP server.
        from pipecat.services.piper.tts import PiperTTSService

        return PiperTTSService(base_url=tts_cfg.get("piperBaseUrl", "http://localhost:5000"))
    raise ValueError(f"Unknown TTS engine: {engine!r} (expected kokoro | piper)")


# ── Read-aloud (one-shot TTS, outside the conversational pipeline) ──────────
# The Chat app's per-message "Read aloud" button hits this directly: no STT,
# no LLM, no WebRTC turn-taking — just text in, a WAV file out, synthesized
# with whatever engine/voice voice.config.json configures for live
# conversation, so read-aloud and the voice assistant always sound the same.


class TtsRequest(BaseModel):
    text: str


_kokoro: Any = None


def _get_kokoro():
    """Lazily construct (and cache) the kokoro-onnx engine, downloading model
    files on first use exactly like KokoroTTSService does inside the live
    pipeline — so the two paths share one on-disk cache."""
    global _kokoro
    if _kokoro is None:
        import requests
        from kokoro_onnx import Kokoro

        from pipecat.services.kokoro.tts import KOKORO_CACHE_DIR, KOKORO_MODEL_URL, KOKORO_VOICES_URL

        KOKORO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        model_file = KOKORO_CACHE_DIR / "kokoro-v1.0.onnx"
        voices_file = KOKORO_CACHE_DIR / "voices-v1.0.bin"
        for url, dest in ((KOKORO_MODEL_URL, model_file), (KOKORO_VOICES_URL, voices_file)):
            if not dest.exists():
                logger.info(f"Downloading {url} to {dest}...")
                resp = requests.get(url, stream=True, timeout=300)
                resp.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
        _kokoro = Kokoro(str(model_file), str(voices_file))
    return _kokoro


def _synthesize_kokoro(text: str, tts_cfg: dict[str, Any]) -> bytes:
    """Blocking (CPU/ONNX-bound) synthesis — run this off the event loop."""
    from pipecat.services.kokoro.tts import language_to_kokoro_language

    kokoro = _get_kokoro()
    voice = tts_cfg.get("voice", "af_heart")
    language = parse_language(tts_cfg.get("language", "en")) or Language.EN
    samples, sample_rate = kokoro.create(
        text, voice=voice, lang=language_to_kokoro_language(language)
    )

    pcm = (samples * 32767).astype(np.int16).tobytes()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm)
    return buf.getvalue()


async def _synthesize_piper(text: str, tts_cfg: dict[str, Any]) -> bytes:
    import aiohttp

    base_url = tts_cfg.get("piperBaseUrl", "http://localhost:5000")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            base_url, json={"text": text, "voice": tts_cfg.get("voice")}
        ) as resp:
            if resp.status != 200:
                detail = await resp.text()
                raise RuntimeError(f"Piper TTS error ({resp.status}): {detail}")
            return await resp.read()


@voice_app.post("/api/tts")
async def synthesize_speech(req: TtsRequest) -> Response:
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    tts_cfg = load_config().get("tts", {})
    engine = tts_cfg.get("engine", "kokoro")
    try:
        if engine == "kokoro":
            wav_bytes = await asyncio.to_thread(_synthesize_kokoro, text, tts_cfg)
        elif engine == "piper":
            wav_bytes = await _synthesize_piper(text, tts_cfg)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown TTS engine: {engine!r}")
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err)) from err
    return Response(content=wav_bytes, media_type="audio/wav")


def build_brain(config: dict[str, Any]):
    brain = resolve_brain(config)
    return OpenAILLMService(
        api_key=brain.get("apiKey") or "local",
        base_url=brain.get("baseUrl", "http://localhost:11434/v1"),
        settings=OpenAILLMService.Settings(
            model=brain.get("model", "qwen2.5:7b"),
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )


def build_user_params(config: dict[str, Any]) -> LLMUserAggregatorParams:
    """Turn-taking: Silero VAD gives fast voice-presence; Smart Turn v3 reads
    intonation/linguistic cues so a pause for breath doesn't end the turn.
    If Smart Turn classifies "incomplete" but silence continues past stop_secs,
    Pipecat auto-completes the turn (built-in fallback)."""
    vad_cfg = config.get("vad", {})
    vad = SileroVADAnalyzer(
        params=VADParams(
            start_secs=float(vad_cfg.get("startSecs", 0.12)),
            stop_secs=float(vad_cfg.get("stopSecs", 0.2)),
        ),
    )
    if not config.get("turn", {}).get("smartTurn", True):
        return LLMUserAggregatorParams(vad_analyzer=vad)
    return LLMUserAggregatorParams(
        vad_analyzer=vad,
        user_turn_strategies=UserTurnStrategies(
            stop=[TurnAnalyzerUserTurnStopStrategy(turn_analyzer=LocalSmartTurnAnalyzerV3())],
        ),
    )


# ── Pipeline ─────────────────────────────────────────────────────────────────


async def run_bot(transport: BaseTransport, config: dict[str, Any]) -> None:
    stt = build_stt(config)
    tts = build_tts(config)
    llm = build_brain(config)

    # RTVI relays transcripts + speaking-state events to the browser client
    # over the WebRTC data channel (consumed by src/voice/VoiceClient.ts).
    rtvi = RTVIProcessor(transport=transport)

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=build_user_params(config),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    # enable_metrics logs per-turn TTFB for STT/LLM/TTS — the latency
    # breakdown that tells you which stage to blame when a turn feels slow.
    task = PipelineTask(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        observers=[RTVIObserver(rtvi)],
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport: BaseTransport, client: Any) -> None:
        logger.info("Voice client connected")
        context.add_message(
            {"role": "system", "content": "The user just connected. Greet them in one short sentence."}
        )
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport: BaseTransport, client: Any) -> None:
        logger.info("Voice client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)


async def bot(runner_args: RunnerArguments) -> None:
    """Entry point invoked by the Pipecat dev runner per client session."""
    config = load_config()
    transport = await create_transport(
        runner_args,
        {
            "webrtc": lambda: TransportParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
            ),
        },
    )
    await run_bot(transport, config)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
