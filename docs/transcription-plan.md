# Transcription — System Design & v1 Roadmap

> Written 2026-07-07. Companion to `memory-plan.md` (durable job + capability
> patterns), `office-suite-plan.md` (`os.files@1` blob storage), and
> `open-standards-map.md` (standards posture). This doc covers how Arco
> transcribes, chapterizes, and enriches audio/video — migrating Podium/Fathom
> pipeline logic into Arco's Node + React stack without importing Fathom infra.
>
> **Status: PROPOSED v1.** Partial plumbing exists today: podcast flat-text STT
> (`podcastTranscriptService`), voice-server one-shot `/api/stt`, and a full
> Longformer editor UI backed by mocks. There is no unified job model, structured
> transcript schema, or enrichment pipeline.
>
> **Reference material:** cloned Fathom/Podium repos live in
> `reference/fathom-labs/` (read-only; gitignored). Primary sources:
> `fathom-core`, `fathom-orchestration`, `fathom-asr-core`, `podium-web`.

## Why

Fathom/Podium ships a complete audio content pipeline: ingest media, transcribe
with diarization, normalize to a word-level transcript format, generate AI
chapters, summaries, clip suggestions, and expose a transcript editor. Arco's
Longformer app mocks this entire surface; the Podcast app transcribes to flat
text only; Music has no transcription path at all.

Without a system transcription service:

- Longformer remains a UI prototype with no backend.
- Podcast transcription blocks HTTP requests until ffmpeg + Whisper finish.
- Music broadcasts, Drive uploads, Meet recordings, and agent automations cannot
  share one pipeline.
- Fathom's battle-tested algorithms (chapterization, summarization) have no
  home in Arco.

The product thesis ("transcribe anything in the OS, edit it in Longformer, use
it in Podcast/Music/Search") requires transcription to be a **system service
with a capability contract**, not an ad-hoc function inside `podcastTranscriptService`.

## Design principles

1. **Contracts over engines.** Arco defines `os.transcription@1` — job lifecycle
   intents, transcript schema, artifact kinds. STT backends (voice-server,
   OpenAI Whisper, Deepgram, optional GPU ASR service) are **swappable engines**
   behind that contract (same posture as `os.memory@1` + vector backends).
2. **One choke point.** Every transcribe/enrich/edit request flows through
   `transcriptionService` + `jobStore`. Progress, retry, and audit live there —
   not in app stores or route handlers.
3. **Steps are explicit.** A transcription job is not one blob. Ingest,
   transcode, STT, normalize, diarize, chapterize, and artifact generation are
   separate **idempotent steps** with independent status flags. The orchestrator
   only decides which step runs next (Fathom process-attribute pattern).
4. **Jobs are async.** HTTP handlers enqueue work and return immediately.
   Clients poll job status or subscribe to shell events. No blocking POST for
   hour-long episodes.
5. **One transcript schema.** `TranscriptDetail` (today in Longformer types) is
   promoted to `shared/transcription/types.ts` and used by server, Longformer,
   Podcast, and Music. Flat `.txt` exports are derived views, not the source of
   truth.
6. **Voice stays separate.** `os.voice@1` is real-time conversational ASR.
   `os.transcription@1` is batch/offline job processing. They may share a
   voice-server engine adapter but never merge contracts.
7. **Start local, bridge outward.** v1 defaults to voice-server + OpenAI Whisper
   (already wired). Deepgram and optional GPU ASR attach as engine providers —
   never required for a working install.
8. **Port algorithms, not infra.** Extract chapterization and summarization from
   `fathom-core/utilities/text.py`. Do not import Celery, Orator, MySQL, S3,
   Pinecone, or ECS patterns.

---

## 1. Evaluation — what to build for v1

### 1.1 Arco today (verified against code)

| Area | Status | Evidence |
| --- | --- | --- |
| **Podcast flat STT** | Shipped | `server/services/podcastTranscriptService.ts`, `podcastStore.transcribeEpisode` |
| **Podcast transcript UI** | Shipped | Transcripts library, episode detail tab, plain text display |
| **Voice real-time ASR** | Shipped | `voice-server/bot.py`, `src/voice/`, `os.voice@1` types |
| **Voice one-shot STT** | Shipped | `POST /api/stt` — plain text, 16 kHz WAV |
| **Longformer editor UI** | Shipped (mock) | `src/apps/longformer/`, `useLongformerStub.ts`, `longformerMock.ts` |
| **Structured transcript schema** | Types only | `TranscriptSegment`, `TranscriptWord`, `TimelineChapter`, `GeneratedArtifact` |
| **Job queue / pipeline** | Missing | Synchronous `POST /api/podcast/transcripts/:id` |
| **Chapterization / diarization** | Missing | Mock data in Longformer only |
| **Music transcription** | Missing | No routes or store hooks |
| **`os.transcription@1`** | Missing | No capability contract |

### 1.2 Reference patterns (Fathom/Podium → Arco)

| Source | Keep | Skip for v1 |
| --- | --- | --- |
| **fathom-core** | Process-attribute step machine; `pre_process`/`post_process` ordering; `generate_ai_chapters`, `generate_episode_summary`; Rev JSON transcript format; RSS chapter parsing from show notes | Orator ORM, MySQL schema, S3 keys, Stripe credits, Pinecone/Milvus vectors, SendGrid |
| **fathom-orchestration** | `FathomCollectionProcessor` pattern (poll DB → run one step per entity); pre/post process task split | Celery, Redis, ECS Terraform, Datadog |
| **fathom-asr-core** | Diarization + Whisper + alignment assembly into word-level JSON | EC2 spot management, shared ASR job DB, boto3 |
| **podium-web** | Transcript editor UX: speaker rename, clip from selection, playbar sync, status polling | Nuxt/Vue/Apollo stack; GraphQL schema as-is |
| **podium-video-editor** | Remotion clip/reel export concept | AWS Lambda render pipeline |
| **podbook-web-api** | — | Duplicate of fathom-core podbook mixin; not production |
| **fathom-tasks** | Step ordering reference | Prefect 1.x (superseded by Celery) |
| **Arco podcastTranscriptService** | ffmpeg chunking, engine fallback order, episode audio resolution | Flat-text-only output; synchronous execution; isolated storage |

### 1.3 STT engine options

| Engine | Pros | Cons | v1 verdict |
| --- | --- | --- | --- |
| **voice-server** (`/api/stt`) | Local-first; already integrated; no API key | Plain text today; no diarization; not for GPU batch | **Default local engine** |
| **OpenAI Whisper** (`whisper-1`) | Already wired; `verbose_json` gives word timestamps | No diarization; 25 MB limit (ffmpeg chunking helps); cloud cost | **Default cloud fallback** |
| **Deepgram prerecorded** | Fathom production path; `diarize: true`; fast integration | Cloud cost; API key | **Recommended Phase 1 upgrade** for structured output |
| **fathom-asr-core** (Python microservice) | Full diarization + alignment; battle-tested | GPU ops; pyannote HF token; heaviest path | **Phase 5 optional** — `AsrServiceEngine` adapter |
| **Rev.ai / external** | Fathom legacy provider | Async polling; external dependency | **Skip v1** |

**Swap surface:** only `SttEngine` implementations are pluggable. Job store,
step orchestration, and transcript schema stay in Arco core.

### 1.4 Recommended v1 stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Shell apps: Longformer (workspace), Podcast, Music (sources)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST / shell-events
┌────────────────────────────▼────────────────────────────────────┐
│  transcriptionService (choke point)                             │
│    • createJob / getJob / getTranscript / saveEdits             │
│    • artifact generation dispatch                               │
└─────┬──────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  pipelineSupervisor (in-process, boot-time)                     │
│    jobStore.listReadyJobs() → pipeline.runNextStep(job)         │
│    announceAppEvent("transcription.*")                          │
└─────┬──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────┬──────────────┬──────────────┬────────────────────┐
│ steps/       │ engines/     │ enrich/      │ persist            │
│ resolveMedia │ voiceServer  │ chapterize   │ filesService or    │
│ transcode    │ openaiWhisper│ summarize    │ data/transcripts/  │
│ transcribe   │ deepgram     │ clipSuggest  │                    │
│ normalize    │ asrService*  │              │                    │
│ diarize*     │              │              │                    │
└──────────────┴──────────────┴──────────────┴────────────────────┘
      * optional steps / Phase 5 engine
```

---

## 2. Pipeline taxonomy

### 2.1 Canonical steps

Steps mirror Fathom `PodiumPackage.default_process_attributes`, adapted for Arco:

| Step | Fathom equivalent | Required v1? | Notes |
| --- | --- | --- | --- |
| `media_resolved` | `audio_stored` | Yes | Resolve local seed, RSS download, Drive upload, or stream URL |
| `audio_transcoded` | `make_media_readable` / transcode | Yes | ffmpeg → normalized WAV/MP3 in working dir |
| `transcription_requested` | `transcription_job_requested` | Yes | Dispatch to STT engine |
| `transcription_complete` | `transcription_job_finished` | Yes | Raw engine output available |
| `transcript_normalized` | `transcribed` / `store_transcription` | Yes | Convert to `TranscriptDetail` segments |
| `diarization_complete` | (in ASR core) | Phase 2+ | Skip if engine provides speakers |
| `chapters_generated` | `chapters_generated` | Phase 3 | RSS chapters + AI chapters |
| `artifacts_generated` | `summary_generated` | Phase 3 | Summaries, titles, quotes, notes |
| `clips_generated` | `previews_generated` | Phase 3 | Suggested clip markers |
| `transcript_persisted` | `package_generated` | Yes | Write canonical JSON + derived `.txt` |
| `search_indexed` | `search_ingested` | Phase 5 | Full-text / vector index |

### 2.2 Job lifecycle

```ts
type TranscriptJobStatus = "queued" | "processing" | "ready" | "failed";

type StepStatus = "pending" | "running" | "complete" | "failed" | "skipped";

interface TranscriptionJob {
  id: string;
  sourceType: TranscriptSourceType;
  sourceRef: string;           // episodeId, driveFileId, uploadId, etc.
  title: string;
  status: TranscriptJobStatus;
  steps: Record<TranscriptionStep, StepState>;
  engine: string;              // resolved STT engine id
  durationMs?: number;
  wordCount?: number;
  speakerCount?: number;
  language?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  transcriptId?: string;       // set when transcript_persisted completes
}
```

`TranscriptSourceType` reuses Longformer values: `call | meeting | podcast |
upload | recording | memory | broadcast` (add `broadcast` for Music RSS).

### 2.3 Pre-process vs post-process

**Pre-process** (user waits for playable transcript):

`media_resolved` → `audio_transcoded` → `transcription_requested` →
`transcription_complete` → `transcript_normalized` → `transcript_persisted`

**Post-process** (can continue in background after transcript is readable):

`chapters_generated` → `artifacts_generated` → `clips_generated` →
`search_indexed`

Longformer editor opens as soon as `transcript_persisted` completes with
`status: ready` (enrichment steps may still be `running`).

---

## 3. Transcript data model

### 3.1 Canonical schema

Promote `src/apps/longformer/types.ts` → `shared/transcription/types.ts`:

| Type | Role |
| --- | --- |
| `TranscriptSummary` | Library row (job list, Podcast transcripts nav) |
| `TranscriptDetail` | Full editor payload: segments, speakers, chapters, tracks, artifacts |
| `TranscriptSegment` | Speaker-attributed utterance block |
| `TranscriptWord` | Word-level timing for editor + playbar sync |
| `TimelineChapter` | Chapter markers on timeline |
| `GeneratedArtifact` | Chapters list, summary, clips script, titles, quotes |
| `Speaker` | Id, display name, color token |

### 3.2 External format adapters

| Format | Source | Adapter location |
| --- | --- | --- |
| Rev.ai JSON | Fathom ASR, Deepgram reformat | `shared/transcription/formats/rev.ts` |
| Deepgram response | Deepgram engine | `shared/transcription/formats/deepgram.ts` |
| OpenAI `verbose_json` | Whisper engine | `shared/transcription/formats/whisper.ts` |
| Plain text | Legacy podcast transcripts | `shared/transcription/formats/plain.ts` (single segment) |

### 3.3 Storage

| Data | Store | Notes |
| --- | --- | --- |
| Job state + step flags | SQLite `data/transcription/jobs.sqlite` | Queryable; retry-safe |
| Transcript JSON | `data/transcripts/{id}.json` v1; Drive v2 | Prefer `filesService` once `os.files@1` is load-bearing |
| Plain text export | Derived `{id}.txt` | Backward compat for Podcast |
| Working audio | Temp dir per job | Cleaned on job complete/fail |
| Source audio | Existing podcast paths / Drive | Reference only; do not duplicate |

**Migration:** existing `data/podcast-transcripts/` records upgrade via
`plain.ts` adapter (single segment, no speakers) until re-transcribed.

---

## 4. Core interfaces (swappable engines)

### 4.1 `SttEngine`

```ts
interface SttEngine {
  readonly id: string;           // e.g. "voice-server", "openai-whisper", "deepgram"
  readonly capabilities: ("word_timestamps" | "diarization" | "language_detect")[];

  isAvailable(): Promise<boolean>;
  transcribe(input: SttInput): Promise<SttResult>;
}

interface SttInput {
  audioPath: string;             // normalized WAV/MP3 on disk
  language?: string;
  durationMs?: number;
}

interface SttResult {
  format: "rev" | "deepgram" | "whisper_verbose" | "plain";
  raw: unknown;
  language?: string;
}
```

Registered in `sttEngineRegistry`. Job config or settings pick priority order
(mirror voice-server → OpenAI fallback in `podcastTranscriptService` today).

### 4.2 `EnrichmentProvider`

```ts
interface EnrichmentProvider {
  readonly id: string;
  generateChapters(detail: TranscriptDetail): Promise<TimelineChapter[]>;
  generateSummary(detail: TranscriptDetail): Promise<GeneratedArtifact>;
  suggestClips(detail: TranscriptDetail): Promise<TimelineClip[]>;
  generateArtifact(kind: ArtifactKind, detail: TranscriptDetail): Promise<GeneratedArtifact>;
}
```

v1 default: `builtin-llm` (Arco agent LLM settings). `fathom-text` provider
wraps ported Python algorithms converted to TypeScript.

### 4.3 `PipelineStep`

```ts
interface PipelineStep {
  readonly name: TranscriptionStep;
  shouldRun(job: TranscriptionJob): boolean;
  run(job: TranscriptionJob, ctx: PipelineContext): Promise<void>;
}
```

Steps are idempotent: re-running a `complete` step is a no-op unless `force: true`.

---

## 5. Capability contract (`os.transcription@1`)

Separate from `os.voice@1`. Register in `shared/capabilities/transcription.ts`
and `server/capabilities/registry.ts`.

| Intent | Access | Description |
| --- | --- | --- |
| `transcription.job.create` | write | Enqueue job from source ref or upload |
| `transcription.job.status` | read | Job + step progress |
| `transcription.job.cancel` | write | Cancel queued/running job |
| `transcription.transcript.get` | read | `TranscriptDetail` by job or transcript id |
| `transcription.transcript.update` | write | Persist editor changes |
| `transcription.artifact.generate` | write | Regenerate chapters, summary, clips, etc. |

Agent tools (Phase 2+):

| Tool | Access | Description |
| --- | --- | --- |
| `transcribe_media` | write | Create job from Drive path or episode id |
| `get_transcript` | read | Fetch transcript for agent context |
| `search_transcript` | read | Full-text search within segments (Phase 5) |

---

## 6. HTTP API

Prefix: `/api/transcription/`. Extract to `server/routes/transcription.ts`;
mount from `server/index.ts`.

| Method | Path | Role |
| --- | --- | --- |
| POST | `/jobs` | Create job (`sourceType`, `sourceRef`, optional `engine`, `steps`) |
| GET | `/jobs` | List jobs (filters: status, sourceType, q) |
| GET | `/jobs/:id` | Job detail + step progress |
| DELETE | `/jobs/:id` | Cancel / delete job |
| GET | `/jobs/:id/transcript` | `TranscriptDetail` |
| PATCH | `/jobs/:id/transcript` | Save editor edits (segments, speakers, words) |
| POST | `/jobs/:id/artifacts/:kind` | Generate or regenerate artifact |
| GET | `/engines` | Available STT engines + capabilities |

**Podcast compatibility aliases** (thin wrappers, deprecate over time):

| Legacy | Maps to |
| --- | --- |
| `GET /api/podcast/transcripts` | `GET /api/transcription/jobs?sourceType=podcast` |
| `POST /api/podcast/transcripts/:id` | `POST /api/transcription/jobs` with `sourceType: podcast`, `sourceRef: id` |
| `GET /api/podcast/transcripts/:id` | `GET /api/transcription/jobs/:id/transcript` (flat `text` field retained) |

**Progress events:** `announceAppEvent("transcription.job.updated", { jobId, step, status })`
on `bus.ts`; shell apps subscribe via `/api/shell-events`.

---

## 7. UI — Longformer workspace

Longformer is the **transcript workspace** (Tier-1 shell app). Podcast and Music
are **source adapters** that enqueue jobs and link into Longformer.

| View | Current | v1 target |
| --- | --- | --- |
| Library | Mock list | Live job list from `GET /api/transcription/jobs` |
| Editor | Mock `BEACHCUBE_PODCAST_DETAIL` | Real `TranscriptDetail` with playbar sync |
| Timeline | Mock chapters/clips | Live `TimelineChapter` + clip tracks |
| Artifacts panel | 900ms fake delay | `POST /jobs/:id/artifacts/:kind` |
| Uploads | Simulated processing | Drive pick → `POST /jobs` |
| In-progress | Static badge | Poll job status / shell-events |

**Replace** `useLongformerStub.ts` with `longformerStore.ts` (Zustand + fetch),
matching the Podcast store pattern.

**Podcast integration:**

- `transcribeEpisode()` → `POST /api/transcription/jobs`
- Episode detail transcript tab → structured segments when available
- "Edit in Longformer" → `openApp("longformer", { jobId })`

**Music integration (Phase 2):**

- Broadcast detail → "Transcribe" → `sourceType: broadcast`
- No separate music transcription module

---

## 8. Integration points

| Existing piece | Transcription integration |
| --- | --- |
| `podcastTranscriptService` | Becomes thin adapter delegating to `transcriptionService` |
| `podcastStore` | `transcribeEpisode` enqueues job; poll status |
| `podcastRssService` | RSS chapter hints passed to `chapterize` step |
| `musicStore` / `musicRssService` | Broadcast transcription via shared API (Phase 2) |
| `filesService` | Upload source + transcript artifact storage (Phase 2+) |
| `voice-server` | `VoiceServerSttEngine` adapter only |
| `server/agent/loop.ts` | Agent tools `transcribe_media`, `get_transcript` (Phase 2) |
| `server/automations/` | Optional `transcribeOnSync` on RSS feed config (Phase 3) |
| `server/capabilities/registry.ts` | Register `os.transcription@1` system handlers |
| `bus.ts` | `transcription.*` shell events |

**Do not merge with:**

- `os.voice@1` — different SLA and session model
- RichMarkdown/widget pipeline (`docs/rich-content-widgets-plan.md`) — text content, not audio

---

## 9. Open standards posture

| Piece | Posture |
| --- | --- |
| Rev.ai transcript JSON | **Adopt** — Fathom canonical format; adapter to Arco types |
| OpenAI Whisper API | **Adopt** — cloud STT engine |
| Deepgram API | **Adopt** — preferred structured STT for v1 production |
| ffmpeg | **Adopt** — transcode + chunk (already in use) |
| Transcript wire format | **Define** — `os.transcription@1` + `shared/transcription/types.ts` |
| WebVTT / SRT export | **Bridge** — export formats from `TranscriptDetail` (Phase 4) |
| Celery / Prefect / Orator | **Reject** — not ported |
| Pinecone / Elasticsearch | **Bridge** — Phase 5 search only |

Add row to `open-standards-map.md` when Phase 1 ships.

---

## 10. v1 roadmap (phased)

### Phase 0 — Spec & stubs (1 week)

- [x] Land this doc (includes §16 copy/port inventory)
- [ ] `shared/transcription/types.ts` — extract from Longformer types
- [ ] `shared/capabilities/transcription.ts` — contract + intent schemas only
- [ ] `server/transcription/jobStore.ts` — SQLite schema stub
- [ ] `server/routes/transcription.ts` — route skeleton returning 501/mock
- [ ] `longformerStore.ts` stub matching API shapes in §6
- [ ] Copy `chapters_test.py` fixtures → `rssChapters.test.ts` spec (§16.2)

**Exit:** Types and API shapes agreed; Longformer can compile against real types.

### Phase 1 — Kernel + structured STT (2–3 weeks)

**Goal:** Async jobs with word-level transcript; Longformer editor shows real data.

- [ ] `jobStore` + `pipelineSupervisor` (in-process poll loop)
- [ ] Steps: `media_resolved`, `audio_transcoded`, `transcription_requested`,
  `transcription_complete`, `transcript_normalized`, `transcript_persisted`
- [ ] `sttEngineRegistry` + `voiceServerStt` + `openaiWhisper` engines
- [ ] Add Deepgram engine OR Whisper `verbose_json` for word timestamps
- [ ] **Port format converters** (§16.2): `deepgram.ts`, `rev.ts`, `whisper.ts`, `plain.ts`
- [ ] REST: `POST/GET /api/transcription/jobs`, `GET .../transcript`
- [ ] Shell events on step completion
- [ ] Wire Longformer library + editor to live API (replace stub for new jobs)

**Exit:** Upload or podcast episode produces a job; Longformer editor renders
word-level segments with playbar sync.

### Phase 2 — Podcast & Music bridge (1–2 weeks)

**Goal:** Existing apps use unified pipeline; no more blocking POST.

- [ ] `podcastTranscriptService` delegates to `transcriptionService`
- [ ] `podcastStore.transcribeEpisode` enqueues + polls
- [ ] Podcast compatibility routes (§6 aliases)
- [ ] Migrate `data/podcast-transcripts/` manifest to job store
- [ ] Music broadcast "Transcribe" entry point (`sourceType: broadcast`)
- [ ] `os.transcription@1` registered in capability registry

**Exit:** Podcast transcribe is async with progress; Music broadcasts can transcribe.

### Phase 3 — Enrichment (2–3 weeks)

**Goal:** Chapters, summaries, clips — Longformer artifacts panel goes live.

- [ ] Port `get_chapters` + tests from `fathom-core` (§16.2)
- [ ] Port `get_sentences` / `get_segments` (§16.2)
- [ ] Port AI chapter + summary prompts from `text.py` (§16.3)
- [ ] `summarize` + `clipSuggest` enrichment providers
- [ ] Steps: `chapters_generated`, `artifacts_generated`, `clips_generated`
- [ ] `POST /jobs/:id/artifacts/:kind`
- [ ] Agent tool: `transcribe_media`

**Exit:** Full artifact generation from real transcript data; chapters on timeline.

### Phase 4 — Editing & export (2 weeks)

**Goal:** Production editor parity with Podium UX patterns.

- [ ] Persist transcript edits (`PATCH /jobs/:id/transcript`)
- [ ] Port `split_and_add_speaker`, `merge_monologues` (§16.2)
- [ ] Speaker rename propagation across segments
- [ ] Clip from selection (`podium-web/components/Transcript.vue` — §16.4)
- [ ] Export: `.txt`, `.srt`, `.vtt` derived from `TranscriptDetail`
- [ ] Optional: Remotion props export (`podium-video-editor` — §16.4)

**Exit:** User can edit, clip, and export transcripts without leaving Arco.

### Phase 5 — Scale & search (ongoing)

- [ ] Copy `fathom-asr-core` → `services/asr-server/` (§16.2, strip AWS/Orator)
- [ ] `diarization_complete` step for multi-speaker without Deepgram
- [ ] Transcript full-text index for Search app
- [ ] Vector semantic search over segments (coordinate with memory plan)
- [ ] Meet / Video / Files upload sources
- [ ] Automation: auto-transcribe on RSS sync

---

## 11. v1 evaluation scorecard

| Criterion | Target |
| --- | --- |
| **Async** | Hour-long episode transcribes without holding HTTP connection |
| **Structured** | Transcript has segments with word timestamps |
| **Swappable** | Change STT engine in settings without code changes outside engines |
| **Unified** | Podcast and Music use same `/api/transcription/jobs` API |
| **Editor** | Longformer renders real data; stub mock removed for new jobs |
| **Enriched** | At least AI chapters + summary generated post-transcript |
| **Compatible** | Legacy podcast flat-text routes still work during migration |
| **Local-first** | Transcription works offline with voice-server + no cloud keys |
| **Separated** | Voice real-time ASR unchanged; transcription is separate contract |

---

## 12. Non-goals (v1)

- Importing Fathom Celery/ECS/Orator/MySQL infrastructure wholesale
- Pinecone / Milvus / Elasticsearch vector indexing
- Stripe credit billing per transcription minute
- Podbook generation (separate product surface)
- Remotion Lambda video rendering pipeline
- Real-time live-captioning during playback (different from batch STT)
- Multi-user cloud sync of transcript jobs
- Replacing voice-server Pipecat pipeline with batch ASR
- Lyric transcription for Music (out of scope; broadcasts only)

---

## 13. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Fathom code licensing unclear | Confirm reuse rights before production copy; §16.1; keep `reference/` for audit |
| Long episode HTTP timeout | Async jobs from Phase 1; never block POST |
| ffmpeg missing on user machine | Clear error in job `failed` state; setup docs |
| voice-server unavailable | Engine registry falls through to OpenAI Whisper |
| Deepgram cost at scale | Local engines first; Deepgram opt-in in Settings |
| fathom-core Python port drift | Port only tested functions; keep `reference/` for diff |
| `server/index.ts` bloat | Extract `server/routes/transcription.ts` in Phase 0 |
| Legacy podcast transcripts | `plain.ts` adapter; re-transcribe upgrades format |
| GPU ASR ops complexity | Defer to Phase 5; Deepgram covers diarization earlier |

---

## 14. File ownership (when implementing)

See §16.7 for Fathom/Podium source file mapping.

| Area | Path |
| --- | --- |
| Types + formats | `shared/transcription/types.ts`, `shared/transcription/formats/` |
| Format converters (ported) | `shared/transcription/formats/deepgram.ts`, `rev.ts` — from §16.2 |
| RSS chapters (ported) | `server/transcription/enrich/rssChapters.ts` — from `text.py:get_chapters` |
| Chapter tests (copied) | `server/transcription/enrich/rssChapters.test.ts` — from `chapters_test.py` |
| Sentences/segments (ported) | `server/transcription/enrich/sentences.ts` — from `podium_package_transcript_file.py` |
| Speaker edits (ported) | `server/transcription/enrich/speakerEdits.ts` — from §16.2 |
| Enrichment prompts (ported) | `server/transcription/enrich/chapterize.ts`, `summarize.ts` — from `text.py` |
| Capability contract | `shared/capabilities/transcription.ts` |
| Job store | `server/transcription/jobStore.ts` |
| Pipeline orchestrator | `server/transcription/pipeline.ts`, `server/transcription/supervisor.ts` |
| Steps | `server/transcription/steps/` |
| STT engines | `server/transcription/engines/` |
| Enrichment | `server/transcription/enrich/` |
| Public facade | `server/services/transcriptionService.ts` |
| Podcast adapter | `server/services/podcastTranscriptService.ts` (thin delegate) |
| API routes | `server/routes/transcription.ts` |
| Agent tools | `server/agent/tools.ts` (Phase 3) |
| UI store | `src/apps/longformer/longformerStore.ts` |
| UI components | `src/apps/longformer/` (existing; wire to store) |
| Podcast hooks | `src/apps/podcast/podcastStore.ts` |
| Music hooks | `src/apps/music/musicStore.ts` (Phase 2) |
| Data | `data/transcription/`, `data/transcripts/` |
| Reference (read-only) | `reference/fathom-labs/` (gitignored) |
| Optional GPU service | `services/asr-server/` (Phase 5) |

Coordinate with office-suite owner: transcript blob storage should migrate to
`filesService` once `os.files@1` is the default artifact store (Phase 2+).

Coordinate with memory-plan owner: transcript semantic search shares embedder
interfaces but not storage — separate collections.

---

## 15. Relationship to consolidated roadmap

Insert as **Phase 1b — Audio content pipeline** in `docs/roadmap.md` (parallel
to office-suite Phase 1 and memory Phase 0). Does not block RichMarkdown/widget
pipeline (Phase 2 content pipeline is text, not audio).

| Roadmap phase | Transcription dependency |
| --- | --- |
| Office-suite `os.files@1` | Soft — v1 uses `data/transcripts/`; migrate to Drive later |
| Memory plan | Soft — semantic transcript search is Phase 5 |
| Agent extensibility | Hard — Phase 3 needs `toolRegistry` for `transcribe_media` |
| Voice / model-hub | Soft — shares LLM settings for enrichment; separate STT path |

---

## 16. Fathom/Podium — copy, port, and reference inventory

This section records what from the cloned `reference/fathom-labs/` repos can be
**copied** (drop in with thin adapters), **ported** (same logic, Arco stack),
used as **reference** (UX/API shape only), or **skipped**. It complements §1.2's
high-level table with file-level detail.

> **Licensing:** `fathom-core/setup.py` declares `license=''` (no SPDX). Confirm
> reuse rights before landing proprietary Fathom code in Arco production paths.
> Internal/proprietary ownership is fine; external OSS redistribution is not
> documented in the reference clones.

### 16.1 Tier definitions

| Tier | Meaning | Arco action |
| --- | --- | --- |
| **Copy** | Small, mostly pure functions or self-contained packages | Drop in or port verbatim with adapter layer |
| **Port** | Valuable logic tied to Fathom SDKs/ORM | Rewrite in TypeScript; keep algorithms + prompts |
| **Reference** | Wrong stack (Vue, GraphQL, Celery) but right behavior | Read for UX/API; reimplement in React/REST |
| **Skip** | Infra, billing, or duplicate surfaces | Do not import |

**Bottom line:** ~500 lines of transcript math, format converters, and golden tests
are high-ROI copies. Whole repos (Orator models, Celery, `podium-web`) are not.

### 16.2 Copy — drop in or port almost verbatim

#### Transcript format converters (~120 lines)

Pure data transforms; no cloud/ORM deps. Target: `shared/transcription/formats/`.

| Function | Source file | Lines (approx.) | Output |
| --- | --- | --- | --- |
| `reformat_deepgram_transcript` | `fathom-core/.../podium_package_transcript_file.py` | ~50 | Deepgram words → Rev-style `monologues[]` with `speaker`, `ts`, `end_ts` |
| `get_podium_format` | same | ~70 | Rev `speaker`/`ts` → Podium `speaker_id`/`start`/`end` |
| `split_and_add_speaker` | same | ~40 | Reassign speaker on word range (editor) |
| `merge_monologues` | same | ~25 | Merge adjacent speaker blocks |

Maps directly to Longformer `TranscriptSegment`, `TranscriptWord`, `Speaker`.
**First implementation spike:** port these four to TypeScript before any STT work.

#### RSS chapter parsing (`get_chapters` + helpers)

Source: `fathom-core/fathom_core/utilities/text.py`

| Function | Role |
| --- | --- |
| `get_chapters` | Parse timestamped show notes from podcast episode descriptions |
| `cleanhtml`, `remove_emojis` | Normalize RSS HTML descriptions |
| `format_timestamps`, `convert_timestamps_to_seconds` | `MM:SS` / `H:MM:SS` → seconds |
| `get_timestamp_indices`, `get_titles_by_rules` | Pair timestamps with chapter titles |
| `sort_chapters`, `cleanse_chapters` | Ordered `TimelineChapter[]` |

~200 lines of regex/string logic. Many podcast RSS feeds already ship chapters in
show notes — usable on day one via `podcastRssService` episode descriptions.

**Golden tests to copy:** `fathom-core/tests/chapters_test.py` (164 lines, real
episode fixtures). Land as `server/transcription/enrich/rssChapters.test.ts` (or
keep Python tests runnable against a subprocess during port).

#### Sentence / segment building

Source: `fathom-core/.../podium_package_transcript_file.py`

| Function | Role | Target path |
| --- | --- | --- |
| `get_sentences` | Word elements → timed sentences | `server/transcription/enrich/sentences.ts` |
| `get_segments` | Sentences → ~350-word segments | same |
| `get_sentences_between_start_end` | Clip boundary extraction | same |

~300 lines; inputs/outputs are JSON — no Fathom DB. Feeds chapterization,
summaries, and clip suggestions.

#### Deepgram integration pattern (~15 lines + converter)

Source: `fathom-core/.../podium_package.py` → `request_transcription()`

```python
options = {'punctuate': True, 'language': 'en', 'model': 'general-enhanced', 'diarize': True}
response = await dg_client.transcription.prerecorded(source, options)
# → reformat_deepgram_transcript(response)
```

Arco target: `server/transcription/engines/deepgram.ts` calling the ported
`shared/transcription/formats/deepgram.ts` converter.

#### `fathom-asr-core` as optional Python sidecar

Copy package → `services/asr-server/`; strip Orator/S3/EC2; expose `POST /transcribe`.

| Module | File | Role |
| --- | --- | --- |
| `Diarizer` | `fathom_asr_core/utilities/asr.py` | pyannote speaker diarization |
| `Transcriber` | same | Whisper large-v3 |
| `Aligner`, `Punctuation` | same | Word alignment + punctuation restore |
| Audio helpers | `fathom_asr_core/utilities/audio_processing.py` | `mp3_to_wav`, silence splitting |

~280 lines in `asr.py` + audio helpers. Arco Node pipeline calls via
`AsrServiceEngine` adapter. **Do not merge into `voice-server/`** — different
latency SLA (batch/GPU vs real-time Pipecat).

#### Test fixtures (copy wholesale)

| File | Role |
| --- | --- |
| `fathom-core/tests/chapters_test.py` | Chapter parsing regression spec |
| Transcript JSON samples in `fathom-core/tests/` | Format adapter conformance |

Use as Arco's transcription conformance suite when porting format adapters.

### 16.3 Port — rewrite logic, keep algorithms and prompts

#### Enrichment / LLM (`text.py`, ~1700 lines total — port selectively)

Source: `fathom-core/fathom_core/utilities/text.py`

| Function | Value | Deps to replace |
| --- | --- | --- |
| `get_paragraphs` | AI chapter boundary detection | Fathom "AI previews" model → Arco `server/agent/llm.ts` |
| `get_samples_to_score_for_topical_breaks` | Topical break scoring | same |
| `gpt3_chapter_title` | Chapter title generation | `openai==0.28.1` → Arco LLM settings |
| `get_episode_summary` | Show notes / episode summary | same |
| `generate_advanced_summary` | Extended show notes | same |
| `generate_title_for_shownotes` | Title suggestions | same |
| `generate_keywords_for_shownotes` | Keyword extraction | same |
| `generate_full_key_points_from_summary` | Bullet key points | same |

Port **prompt text and data-flow** (sentences → paragraphs → breaks → titles),
not the legacy OpenAI SDK calls.

#### Orchestration pattern (not Celery code)

Source: `fathom-orchestration/fathom_orchestration/tasks/`

Example: `pre_process_podium_packages.py` (~31 lines) — poll DB for ids, call
`package.pre_process()`. Copy the **pattern** into `server/transcription/supervisor.ts`
(SQLite poll loop). Do **not** copy Celery, Redis, ECS Terraform, or Datadog.

#### Step ordering (not model files)

Source: `fathom-core/.../podium_package.py`

| Artifact | Copy as |
| --- | --- |
| `default_process_attributes` list | `shared/transcription/steps.ts` canonical step names |
| `pre_process()` call order | Pre-process step graph (§2.3) |
| `post_process()` call order | Post-process / enrichment step graph |

Do **not** copy the 2800-line `PodiumPackage` Orator model.

### 16.4 Reference only — do not copy files

#### `podium-web` (Nuxt 3 / Vue 3 / Tailwind / Apollo GraphQL)

| File | Size | Use in Arco |
| --- | --- | --- |
| `components/Transcript.vue` | ~1,329 lines | Reference for Longformer editor interactions |
| `store/main.ts` | ~613 lines | Reference for speaker name/role resolution, GraphQL polling shapes |
| `pages/job/[id].vue` | — | Job workspace tab layout (Status, Transcript, Chapters, Clips) |

Reimplement in `src/apps/longformer/` with Arco tokens. Key UX patterns to mirror:

- Text selection → floating "Change Speaker" / "Create Clip" toolbar
- Playbar ↔ active word highlight scroll-sync
- Speaker rename propagation across monologues/segments

#### `podium-video-editor` (Remotion / Next.js / AWS Lambda)

Useful in Phase 4+ for reel export. Copy **Remotion composition props schema**
concept only; rebuild render pipeline (no Lambda dependency in v1).

#### `fathom-web-api` (FastAPI / Graphene GraphQL)

Inspire REST shapes from GraphQL types: `PodiumMonologue`, `PodiumChapter`,
compressed word arrays, processing flag polling. Implement as §6 REST routes.

### 16.5 Skip — do not copy

| Component | Source | Why |
| --- | --- | --- |
| Orator data models | `podium_package.py` (~2800 lines), `podcast_episode.py`, etc. | MySQL-coupled; Arco uses SQLite job store |
| Celery / ECS orchestration | `fathom-orchestration` workers + Terraform | Wrong ops model for desktop Arco |
| S3 / boto3 storage | `process_and_store_transcript`, CloudFront URLs | Use `filesService` / `data/transcripts/` |
| Pinecone / Milvus / Elasticsearch | `fathom-core` vector + search ingest | Phase 5+ only |
| Stripe credits | `podium_package.py` `deduct_credits` | Podium SaaS billing |
| SendGrid / Firebase | `fathom-core/services/` | Notifications infra |
| `fathom-tasks` Prefect flows | Legacy; README says migrated to Celery | Reference for step order only |
| `podbook-web-api` | Node experiment | Incomplete; duplicates fathom-core podbook mixin |
| `fathom-asr-api` | Sanic stub | Real ASR is in `fathom-asr-core` workers |
| `fathom-processing` / `pi-core` | Private git dep + separate inference DB | Use Deepgram or `asr-server` instead for v1 |
| `podium-web` auth, billing, dashboard | Stripe, Apollo auth | SaaS shell — not transcription domain |

### 16.6 Practical copy plan (ordered by ROI)

Maps to §10 roadmap phases.

```
Phase 0–1 — Copy/port immediately
├── shared/transcription/formats/deepgram.ts    ← reformat_deepgram_transcript
├── shared/transcription/formats/rev.ts         ← get_podium_format + Rev types
├── server/transcription/enrich/rssChapters.ts  ← get_chapters + helpers
└── server/transcription/enrich/rssChapters.test.ts ← chapters_test.py fixtures

Phase 1 — STT wiring
├── server/transcription/engines/deepgram.ts    ← request_transcription options
└── shared/transcription/formats/whisper.ts     ← OpenAI verbose_json (new)

Phase 2 — Segment building
├── server/transcription/enrich/sentences.ts    ← get_sentences, get_segments
└── server/transcription/enrich/speakerEdits.ts  ← split_and_add_speaker, merge_monologues

Phase 3 — Enrichment prompts
├── server/transcription/enrich/chapterize.ts     ← get_paragraphs, topical breaks
└── server/transcription/enrich/summarize.ts      ← get_episode_summary, title/keyword prompts

Phase 4 — Editor UX (reference podium-web)
└── src/apps/longformer/LongformerTranscriptPane.tsx ← Transcript.vue interactions

Phase 5 — Optional GPU service
└── services/asr-server/                        ← copy fathom-asr-core, strip AWS/Orator
```

### 16.7 Source file index (quick lookup)

| Arco target | Fathom/Podium source |
| --- | --- |
| `shared/transcription/formats/deepgram.ts` | `fathom-core/.../podium_package_transcript_file.py:240` `reformat_deepgram_transcript` |
| `shared/transcription/formats/rev.ts` | `fathom-core/.../podium_package_transcript_file.py:710` `get_podium_format` |
| `server/transcription/enrich/rssChapters.ts` | `fathom-core/fathom_core/utilities/text.py:553` `get_chapters` |
| `server/transcription/enrich/rssChapters.test.ts` | `fathom-core/tests/chapters_test.py` |
| `server/transcription/enrich/sentences.ts` | `fathom-core/.../podium_package_transcript_file.py:461` `get_sentences` |
| `server/transcription/enrich/sentences.ts` | `fathom-core/.../podium_package_transcript_file.py:310` `get_segments` |
| `server/transcription/enrich/speakerEdits.ts` | `fathom-core/.../podium_package_transcript_file.py` `split_and_add_speaker`, `merge_monologues` |
| `server/transcription/enrich/chapterize.ts` | `fathom-core/fathom_core/utilities/text.py` `get_paragraphs`, `get_samples_to_score_for_topical_breaks`, `gpt3_chapter_title` |
| `server/transcription/enrich/summarize.ts` | `fathom-core/fathom_core/utilities/text.py` `get_episode_summary`, `generate_*` helpers |
| `server/transcription/engines/deepgram.ts` | `fathom-core/.../podium_package.py:1807` Deepgram `prerecorded` call |
| `server/transcription/supervisor.ts` | `fathom-orchestration/.../pre_process_podium_packages.py` (pattern only) |
| `server/transcription/pipeline.ts` | `fathom-core/.../podium_package.py` `pre_process` / `post_process` order |
| `services/asr-server/` | `fathom-asr-core/fathom_asr_core/` (package copy) |
| `src/apps/longformer/LongformerTranscriptPane.tsx` | `podium-web/components/Transcript.vue` (UX reference) |
| `src/apps/longformer/longformerStore.ts` | `podium-web/store/main.ts` (polling/status reference) |

### 16.8 Cloned reference repos (`reference/fathom-labs/`)

Shallow clones for migration evaluation (gitignored). Sizes approximate.

| Repo | Size | Role in inventory |
| --- | --- | --- |
| `fathom-core` | ~7.4 MB | **Primary** — domain logic, formats, enrichment, tests |
| `podium-web` | ~8.5 MB | **Reference** — transcript editor UX |
| `fathom-asr-core` | ~356 KB | **Copy** (Phase 5) — GPU ASR package |
| `fathom-orchestration` | ~340 KB | **Pattern** — supervisor task shape |
| `fathom-web-api` | ~844 KB | **Reference** — GraphQL → REST inspiration |
| `podium-video-editor` | ~1.6 MB | **Reference** (Phase 4+) — Remotion export |
| `fathom-tasks` | ~308 KB | **Skip** — legacy Prefect |
| `whisper-processing` | ~184 KB | **Skip** — EC2 worker loop (use asr-server instead) |
| `fathom-processing` | ~168 KB | **Skip** — private `pi-core` dep |
| `fathom-asr-api` | ~192 KB | **Skip** — HTTP stub |
| `fathom-engine-api` | ~232 KB | **Skip** v1 — search consumer |
| `podbook-web-api` | ~880 KB | **Skip** — incomplete Node rewrite |

Additional repos exist on the `fathom-labs` GitHub org (whisper-coordinator,
fathom-pinecone, etc.) — not cloned; consult org listing if a specific component
is needed later.

---

## 17. Immediate next step

Execute **Phase 0**:

1. Create `shared/transcription/types.ts` (move types from Longformer; re-export
   in `src/apps/longformer/types.ts` for backward compat).
2. Create `shared/capabilities/transcription.ts` with intent ids and schemas.
3. Scaffold `server/transcription/jobStore.ts` + `server/routes/transcription.ts`.
4. Add `longformerStore.ts` stub that matches §6 API shapes.
5. **Optional first copy spike (§16.2):** port `reformat_deepgram_transcript` +
   `get_podium_format` to `shared/transcription/formats/`; copy `chapters_test.py`
   fixtures as the chapter parser spec.

Phase 1 can begin once the job store schema and route module exist.
