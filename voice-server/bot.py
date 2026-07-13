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
from fastapi import File, HTTPException, Response, UploadFile
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
    # Local Whisper is slower than cloud STT; Smart Turn waits this long for a
    # transcript after VAD stop before giving up (default 1.0s is too short).
    ttfs_p99 = float(stt_cfg.get("ttfsP99Latency", 3.0))

    if engine == "whisper-mlx":
        from pipecat.frames.frames import ErrorFrame, TranscriptionFrame
        from pipecat.services.settings import assert_given
        from pipecat.services.whisper.stt import MLXModel, WhisperSTTServiceMLX
        from pipecat.utils.time import time_now_iso8601

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
        logger.info(f"STT: whisper-mlx model {model} (ttfs_p99={ttfs_p99}s)")

        # Pipecat's segment filter defaults to 0.6 and drops the mlx top-level
        # `text` when every segment is filtered — that leaves Smart Turn waiting
        # for a transcript that never comes, then the 5s turn watchdog fires
        # with an empty aggregation (UI stuck on Thinking, no chat bubble).
        no_speech_prob = float(stt_cfg.get("noSpeechProb", 0.85))

        class ResilientWhisperSTTServiceMLX(WhisperSTTServiceMLX):
            """Whisper MLX with empty-result fallbacks and diagnostics."""

            async def run_stt(self, audio: bytes):
                try:
                    import mlx_whisper

                    await self.start_processing_metrics()

                    audio_float = (
                        np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0
                    )
                    duration_s = len(audio_float) / float(self.sample_rate or 16_000)
                    rms = (
                        float(np.sqrt(np.mean(np.square(audio_float)))) if len(audio_float) else 0.0
                    )

                    model_path = assert_given(self._settings.model)
                    if model_path is None:
                        raise ValueError("Whisper model must be specified")
                    temperature = assert_given(self._settings.temperature)
                    lang = assert_given(self._settings.language)
                    language_code = getattr(lang, "value", None) or str(lang)

                    chunk = await asyncio.to_thread(
                        mlx_whisper.transcribe,
                        audio_float,
                        path_or_hf_repo=model_path,
                        temperature=temperature,
                        language=language_code,
                        no_speech_threshold=0.8,
                        condition_on_previous_text=False,
                    )

                    text = ""
                    no_speech_prob_threshold = assert_given(self._settings.no_speech_prob)
                    kept_segments = 0
                    for segment in chunk.get("segments", []) or []:
                        if segment.get("compression_ratio", None) == 0.5555555555555556:
                            continue
                        if (
                            no_speech_prob_threshold is not None
                            and segment.get("no_speech_prob", 0.0) < no_speech_prob_threshold
                        ):
                            text += f"{segment.get('text', '')} "
                            kept_segments += 1

                    text = text.strip()
                    raw_text = (chunk.get("text") or "").strip()
                    if not text and raw_text:
                        logger.warning(
                            f"STT segments filtered (kept={kept_segments}); "
                            f"falling back to mlx text={raw_text!r} "
                            f"(duration={duration_s:.2f}s rms={rms:.4f})"
                        )
                        text = raw_text

                    await self.stop_processing_metrics()

                    if not text:
                        try:
                            debug_path = SERVER_DIR / "last-empty-stt.wav"
                            with wave.open(str(debug_path), "wb") as wf:
                                wf.setnchannels(1)
                                wf.setsampwidth(2)
                                wf.setframerate(int(self.sample_rate or 16_000))
                                wf.writeframes(audio)
                            logger.warning(
                                f"STT empty (duration={duration_s:.2f}s rms={rms:.4f} "
                                f"segments={len(chunk.get('segments') or [])}); "
                                f"wrote {debug_path}"
                            )
                        except OSError as err:
                            logger.warning(f"STT empty and failed to write debug wav: {err}")
                        return

                    await self._handle_transcription(text, True, lang)
                    logger.debug(f"Transcription: [{text}]")
                    yield TranscriptionFrame(
                        text,
                        self._user_id,
                        time_now_iso8601(),
                        lang,
                    )
                except Exception as e:
                    logger.exception(f"STT failed: {e}")
                    yield ErrorFrame(error=f"Unknown error occurred: {e}")

        return ResilientWhisperSTTServiceMLX(
            ttfs_p99_latency=ttfs_p99,
            settings=WhisperSTTServiceMLX.Settings(
                model=model,
                language=language,
                no_speech_prob=no_speech_prob,
            ),
        )
    if engine == "faster-whisper":
        from pipecat.services.whisper.stt import WhisperSTTService

        return WhisperSTTService(
            ttfs_p99_latency=ttfs_p99,
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


# Read-aloud (one-shot TTS) and dictation (one-shot STT) sit outside the
# conversational pipeline — see /api/tts and /api/stt below.


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


# ── Dictation (one-shot STT, outside the conversational pipeline) ───────────
# Notes dictation in the browser hits this when Web Speech API is unavailable:
# record audio in the client, convert to 16 kHz mono WAV, POST here, get text.


def _read_wav_mono(wav_bytes: bytes) -> tuple[np.ndarray, int]:
    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        frames = wf.readframes(wf.getnframes())
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        if sample_width != 2:
            raise ValueError(f"Unsupported WAV sample width: {sample_width}")
        samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        if channels > 1:
            samples = samples.reshape(-1, channels).mean(axis=1)
        return samples, wf.getframerate()


def _resample_linear(samples: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    if src_rate == dst_rate:
        return samples
    duration = len(samples) / src_rate
    dst_length = max(1, int(round(duration * dst_rate)))
    src_times = np.linspace(0.0, duration, num=len(samples), endpoint=False)
    dst_times = np.linspace(0.0, duration, num=dst_length, endpoint=False)
    return np.interp(dst_times, src_times, samples).astype(np.float32)


def _resolve_mlx_model(stt_cfg: dict[str, Any]) -> str:
    raw_model = stt_cfg.get("model", "large-v3-turbo")
    if "/" in raw_model:
        return raw_model
    from pipecat.services.whisper.stt import MLXModel

    try:
        return MLXModel[raw_model.upper().replace("-", "_")].value
    except KeyError as err:
        valid = ", ".join(m.name.lower().replace("_", "-") for m in MLXModel)
        raise ValueError(f"Unknown MLX Whisper model {raw_model!r} (expected {valid})") from err


def _transcribe_wav(wav_bytes: bytes, config: dict[str, Any]) -> dict[str, Any]:
    samples, sample_rate = _read_wav_mono(wav_bytes)
    samples = _resample_linear(samples, sample_rate, 16_000)
    stt_cfg = config.get("stt", {})
    engine = stt_cfg.get("engine", "whisper-mlx")
    language_code = stt_cfg.get("language", "en") or None

    if engine == "whisper-mlx":
        import mlx_whisper

        model = _resolve_mlx_model(stt_cfg)
        logger.info(f"Dictation STT: whisper-mlx model {model}")
        result = mlx_whisper.transcribe(
            samples,
            path_or_hf_repo=model,
            language=language_code,
        )
        segments = [
            {
                "start": float(segment["start"]),
                "end": float(segment["end"]),
                "text": str(segment.get("text", "")).strip(),
            }
            for segment in result.get("segments", [])
            if str(segment.get("text", "")).strip()
        ]
        return {
            "text": str(result.get("text", "")).strip(),
            "language": result.get("language"),
            "segments": segments,
        }

    if engine == "faster-whisper":
        from faster_whisper import WhisperModel

        model_name = stt_cfg.get("model", "base")
        logger.info(f"Dictation STT: faster-whisper model {model_name}")
        whisper = WhisperModel(model_name)
        segments_iter, info = whisper.transcribe(
            samples,
            language=language_code,
        )
        segments = [
            {
                "start": float(segment.start),
                "end": float(segment.end),
                "text": segment.text.strip(),
            }
            for segment in segments_iter
            if segment.text.strip()
        ]
        return {
            "text": " ".join(segment["text"] for segment in segments).strip(),
            "language": info.language,
            "segments": segments,
        }

    raise ValueError(f"Unknown STT engine: {engine!r} (expected whisper-mlx | faster-whisper)")


@voice_app.post("/api/stt")
async def transcribe_speech(file: UploadFile = File(...)) -> dict[str, Any]:
    wav_bytes = await file.read()
    if not wav_bytes:
        raise HTTPException(status_code=400, detail="audio file is required")
    try:
        result = await asyncio.to_thread(_transcribe_wav, wav_bytes, load_config())
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err)) from err
    return result


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
    # Local Whisper can take a few seconds (cold start much longer). The
    # default 5s turn watchdog finalizes with an empty aggregation before STT
    # lands, which skips the LLM and leaves the client on Thinking…
    turn_stop_timeout = float(config.get("turn", {}).get("stopTimeoutSecs", 12.0))
    if not config.get("turn", {}).get("smartTurn", True):
        return LLMUserAggregatorParams(
            vad_analyzer=vad,
            user_turn_stop_timeout=turn_stop_timeout,
        )
    return LLMUserAggregatorParams(
        vad_analyzer=vad,
        user_turn_stop_timeout=turn_stop_timeout,
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
