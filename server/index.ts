/**
 * Arco OS server — Hono over @hono/node-server.
 *
 * Routes:
 *   POST /api/chat                 — run an agent turn, stream AgentEvents over SSE
 *   GET  /api/sessions[/:id]      — session list / transcript
 *   POST /api/sessions/:id/fork   — branch conversation into a new session
 *   POST /api/sessions/:id/truncate — drop trailing messages (regenerate / edit)
 *   POST /api/sessions/:id/restore-checkpoint — rewind chat and/or tracked files
 *   CRUD /api/apps                — generated apps + versions/restore
 *   POST /api/tools/invoke        — app runtime Query/Mutation bridge (no LLM)
 *   CRUD /api/automations         — schedules + run-now + history
 *   GET/PUT /api/files            — workspace browser
 *   POST /api/exec                — terminal command runner
 *   GET/PUT /api/settings         — LLM provider config + shell prefs
 *   GET/POST /api/mail/*          — Gmail OAuth + live mail proxy
 *   GET/POST /api/social/*        — Bluesky/Mastodon/Nostr live social proxy
 *
 * In production it also serves the built shell from dist/.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { serve, type HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { RESPONSE_ALREADY_SENT } from "@hono/node-server/utils/response";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import fs from "node:fs/promises";
import { createReadStream, existsSync, type ReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  AgentBackend,
  AgentEvent,
  AutomationTrigger,
  DirListing,
  Settings,
} from "../shared/types.js";
import { requireAuth, requireCap, currentUser, type AuthEnv } from "./auth/middleware.js";
import { authRoutes } from "./auth/routes.js";
import { mobileShellCors } from "./cors.js";
import { createEntryGate } from "./security/entryGate.js";
import {
  pickTurnRunner,
  resolveAcpCommand,
  resolveTurnKind,
} from "./agent/turnRunner.js";
import { withProfileActivity } from "./agents/activity.js";
import { resolveProfileForTurn } from "./agents/resolveProfile.js";
import { stopAllAcpRuns } from "./acp/acpAgent.js";
import { stopAllCursorRuns } from "./cursor/cursorAgent.js";
import { listCursorModels, testCursorConnection } from "./cursor/cursorConnect.js";
import { stopAllOpenhandsRuns } from "./openhands/openhandsAgent.js";
import { testOpenhandsConnection } from "./openhands/openhandsConnect.js";
import { stopAllKosmosRemoteRuns } from "./kosmos-remote/kosmosRemoteAgent.js";
import { testKosmosConnection } from "./kosmos-remote/kosmosRemoteConnect.js";
import { listOpenRouterModels } from "./openrouter/openrouterModels.js";
import { openaiCompatRoutes } from "./agent/openaiCompat.js";
import { invokeRuntimeTool, runExec } from "./agent/tools.js";
import { resolveClientRequest } from "./agent/clientRequests.js";
import { resolveConfirmation } from "./agent/confirmations.js";
import { runAutomationNow, startScheduler } from "./automations/scheduler.js";
import { eventTriggerMatches, verifyWebhookSecret } from "./automations/eventMatcher.js";
import { describeSchedule } from "./automations/scheduleUtils.js";
import { dataDirs, ensureDataDirs, loadSettings, maskSettings, saveSettings } from "./env.js";
import { probeLlm } from "./agent/llm.js";
import { runDoctor } from "./system/doctor.js";
import {
  gitBranches,
  gitCheckout,
  gitCommit,
  gitFileDiff,
  gitInfo,
  gitPull,
  gitPush,
  gitWorktreeAdd,
  gitWorktreeRemove,
  gitWorktrees,
} from "./git.js";
import { listRuns, runLog, startRun, stopRun } from "./runManager.js";
import { appStore } from "./stores/appStore.js";
import { modelStore } from "./stores/modelStore.js";
import { modelRoutes } from "./routes/models.js";
import { llamaEngine } from "./services/llamaEngine.js";
import { bitsocialDaemon } from "./services/bitsocialDaemon.js";
import { LOCAL_ENGINE_BASE_URL } from "../shared/models.js";
import { automationStore } from "./stores/automationStore.js";
import { projectStore } from "./stores/projectStore.js";
import {
  resolveProjectPath,
  toWorkspaceRelative,
  workspaceStore,
} from "./stores/workspaceStore.js";
import { sessionStore } from "./stores/sessionStore.js";
import { checkpointStore } from "./stores/checkpointStore.js";
import { generatorCatalogStore } from "./stores/generatorCatalogStore.js";
import { generateUiFromPrompt } from "./services/generatorService.js";
import { imageGenStore } from "./stores/imageGenStore.js";
import { generateImageFromPrompt, getImageGenStatus } from "./services/imageGenService.js";
import { webAppStore } from "./stores/webAppStore.js";
import { installedAppStore, APPS_DIR } from "./platform/installedAppStore.js";
import { grantStore, readAudit } from "./platform/grantStore.js";
import { parseManifest } from "./platform/manifestSchema.js";
import { BridgeError, dispatchAppBridge, mintToken, resolveToken } from "./platform/bridge.js";
import { policyStore } from "./agent/policyStore.js";
import { describeSystemTools } from "./agent/toolRegistry.js";
import { getProviders, setProvider } from "./capabilities/registry.js";
import { CONTRACTS } from "../shared/capabilities/index.js";
import { mcpServerStore } from "./mcp/serverStore.js";
import { mcpSupervisor } from "./mcp/supervisor.js";
import { seedMcpPresets } from "./mcp/seedPresets.js";
import { mcpLogFile } from "./mcp/client.js";
import "./mcp/tools.js"; // registers the MCP tool contributor with the agent registry
import "./platform/appTools.js"; // registers installed apps' tool contributions
import "./channels/tools.js"; // registers channel_send with the agent registry
import "./mail/tools.js"; // registers mail_list / mail_read / mail_send
import { channelStore } from "./channels/channelStore.js";
import { channelGateway } from "./channels/gateway.js";
import { channelWebhookRoutes } from "./channels/webhookRoutes.js";
import { pushWebhookInbound } from "./channels/adapters/webhookQueue.js";
import { webchatDrainReplies } from "./channels/adapters/webchat.js";
import { isChannelKind, CHANNEL_CATALOG } from "../shared/channelCatalog.js";
import { handleOutwardMcp } from "./mcp/outward.js";
import { externalClients } from "./platform/externalClients.js";
import { skillStore } from "./skills/skillStore.js";
import { bus } from "./bus.js";
import { shellClientConnected, shellClientCount } from "./shellChannel.js";
import { filesService } from "./services/filesService.js";
import { calendarService } from "./services/calendarService.js";
import { tasksService } from "./services/tasksService.js";
import { boardService } from "./services/boardService.js";
import { torrentService } from "./services/torrentService.js";
import type { CalendarEventInput } from "../shared/capabilities/calendar.js";
import type { TaskInput, TaskStatus } from "../shared/capabilities/tasks.js";
import type { BoardColumnId, WorkItemInput } from "../shared/capabilities/board.js";
import type { TorrentAddInput } from "../shared/capabilities/downloads.js";
import { searchPlaces, geocodePlace, getDrivingRoute } from "./services/mapsService.js";
import { webSearch } from "./services/searchService.js";
import { browseErrorHtml, fetchBrowsePage } from "./services/browseProxyService.js";
import {
  fetchStudioPreviewPage,
  studioPreviewErrorHtml,
} from "./services/studioPreviewProxy.js";
import { listMusicTracksAsSeedStatus, statAnyMusicTrack } from "./services/musicLibraryService.js";
import {
  getMusicTrack,
  importMusicTrack,
  importMusicUpload,
  removeMusicTrack,
  scanMusicLibrary,
} from "./services/musicLibraryService.js";
import { resolveTrackArt } from "./services/musicArtService.js";
import {
  addSubscribedMusicFeed,
  fetchMusicFeedMetadata,
  fetchMusicFeedSongs,
  invalidateMusicFeedCache,
  listRssSongs,
  listSubscribedMusicFeeds,
  proxyMusicFeedCover,
  proxyMusicRssEnclosure,
  proxyMusicSongCover,
  removeSubscribedMusicFeed,
  seedAudioBroadcastFeeds,
  warmMusicRssFeeds,
} from "./services/musicRssService.js";
import { listMusicLiveStations, proxyMusicLiveStream } from "./services/musicLiveService.js";
import { listLocalVideos, statLocalVideo } from "./services/videoSeedService.js";
import { listLocalEpisodes, resolveLocalEpisode, statLocalEpisode } from "./services/podcastSeedService.js";
import {
  addSubscribedFeed,
  fetchFeedEpisodes,
  fetchFeedMetadata,
  invalidateFeedCache,
  listRssEpisodes,
  listSubscribedFeeds,
  proxyRssCover,
  proxyFeedCover,
  proxyRssEnclosure,
  removeSubscribedFeed,
  warmPodcastRssFeeds,
} from "./services/podcastRssService.js";
import { syncPodcastDownloads, warmPodcastDownloads } from "./services/podcastDownloadService.js";
import {
  getPodcastDriveSave,
  listPodcastDriveSaves,
  savePodcastEpisodeToDrive,
} from "./services/podcastDriveService.js";
import {
  getPodcastTranscript,
  listPodcastTranscripts,
  transcribePodcastEpisode,
} from "./services/podcastTranscriptService.js";
import { creditsInsufficientMessage, isCreditsInsufficientError } from "./agent/creditsError.js";
import { transcriptionRoutes } from "./routes/transcription.js";
import { shareRoutes } from "./routes/shareRoutes.js";
import { usageRoutes } from "./routes/usage.js";
import { billingRoutes } from "./routes/billing.js";
import { storageRoutes } from "./routes/storage.js";
import { memoryRoutes } from "./routes/memory.js";
import { agentRoutes } from "./routes/agents.js";
import { packRoutes } from "./routes/packs.js";
import { acpRoutes } from "./routes/acp.js";
import { startTranscriptionSupervisor } from "./transcription/supervisor.js";
import { listRemoteVideos, listRemotePodcastEpisodes } from "./services/mediaRemoteService.js";
import type { FileCreateInput } from "../shared/capabilities/files.js";
import type { MailFolderId, MailInboxFilter } from "../shared/mail.js";
import { mailGateway } from "./mail/mailGateway.js";
import {
  buildGoogleAuthUrl,
  consumeOAuthState,
  createOAuthState,
  webOriginAfterOAuth,
} from "./mail/googleOAuth.js";
import { mailStore } from "./mail/mailStore.js";
import { getInstallStatus } from "./system/installStatus.js";
import { getWorkspaceFeatures } from "./system/workspaceFeatures.js";
import { cloneGitRepo } from "./gitClone.js";
import {
  buildGitHubAuthUrl,
  consumeOAuthState as consumeGitHubOAuthState,
  createOAuthState as createGitHubOAuthState,
  webOriginAfterOAuth as githubWebOriginAfterOAuth,
} from "./github/githubOAuth.js";
import { githubGateway } from "./github/githubGateway.js";
import { githubStore } from "./github/githubStore.js";
import { socialGateway } from "./social/socialGateway.js";
import { getOpsStatus } from "./ops/deployOps.js";
import { startSelfHeal } from "./ops/selfHeal.js";

const execFileAsync = promisify(execFile);

ensureDataDirs();
installedAppStore.ensureSeeds();
modelStore.ensureSeeded();
// A chat slot already pointing at the local engine means the user expects
// locally-hosted models to answer — bring the router up in the background.
if (
  modelStore
    .slots()
    .some((s) => s.requires === "text.chat" && modelStore.resolveModel(s.id).baseUrl === LOCAL_ENGINE_BASE_URL)
) {
  void llamaEngine.ensureRunning();
}
// Don't orphan supervised sidecars on shutdown.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    llamaEngine.dispose();
    bitsocialDaemon.dispose();
    process.exit(0);
  });
}
filesService.ensureSeeds();
void torrentService.ensureReady().catch((err) => {
  console.warn("[downloads] failed to start torrent client:", err);
});
// Defer RSS-heavy warmups on small VPS hosts so the process can bind :4600
// and pass health checks before background feed/download work runs.
const deferWarmups = () => {
  warmPodcastRssFeeds();
  warmMusicRssFeeds();
  warmPodcastDownloads();
};
if (process.env.ARCO_LOW_MEMORY === "1") {
  setTimeout(deferWarmups, 60_000);
} else {
  deferWarmups();
}
// Skills: static seeds from ./skills, plus the generated OpenUI app-authoring
// guide as a gating skill (it left the always-on system prompt in Phase C).
skillStore.ensureSeeds(path.resolve("skills"));
skillStore.ensureGeneratedSeed(
  "openui-app-authoring",
  "OpenUI app authoring",
  "REQUIRED before app_create or app_update. The complete durable-app surface: components, reactivity, data bindings, adaptive layout rules.",
  ["app_create", "app_update"],
  path.resolve("server/generated/app-prompt.md"),
);

const app = new Hono<AuthEnv>();

// Hosted instances can require a magic URL before even the login shell or
// auth API is visible. This must run before CORS, auth, and static handlers.
app.use("*", createEntryGate());
app.use("*", mobileShellCors);

// ── Auth ─────────────────────────────────────────────────────────────────────
//
// /api/auth/* is the only unauthenticated API surface; everything else under
// /api requires a live, unlocked session. Capability guards (requireCap) then
// gate the sensitive routes per role — see ROLE_CAPABILITIES in shared/types.

app.route("/api/auth", authRoutes);

/** Setup readiness; the entry gate protects this when configured. */
app.get("/api/system/install-status", async (c) => c.json(await getInstallStatus()));

/**
 * First-run LLM probe — unauthenticated so InstallFlow can prove connectivity
 * before the owner account exists. Body may supply intended settings; otherwise
 * current on-disk settings are used.
 */
app.post("/api/install/probe-llm", async (c) => {
  let body: Partial<Settings> = {};
  try {
    body = (await c.req.json()) as Partial<Settings>;
  } catch {
    body = {};
  }
  const current = loadSettings();
  const settings: Settings = {
    ...current,
    ...body,
    // Prefer explicit probe keys over vault/masked leftovers from disk.
    apiKey:
      typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("••••")
        ? body.apiKey.trim()
        : current.apiKey,
  };
  return c.json(await probeLlm(settings));
});

/** Minimal deployment probe; deliberately exempt from the entry gate. */
app.get("/health", (c) => c.json({ ok: true }));

app.use("/api/*", requireAuth);

/** How many desktops hold /api/shell-events — voice uses this for interactive vs headless. */
app.get("/api/system/shell-status", (c) =>
  c.json({ clients: shellClientCount(), interactive: shellClientCount() > 0 }),
);

app.route("/", shareRoutes);

// ── OpenAI-compatible agent endpoint ─────────────────────────────────────────
//
// Loopback-only /v1/chat/completions exposing the agent to local OpenAI
// clients — notably the voice server's brain slot (voice-server/README.md).

app.route("/v1", openaiCompatRoutes);

app.route("/api/transcription", transcriptionRoutes);
app.route("/api/memory", memoryRoutes);
app.route("/api/agents", agentRoutes);
app.route("/api/packs", packRoutes);
// Webhooks are unauthenticated by design (platform callbacks); verify per-adapter secrets later.
app.route("/api/channels/webhook", channelWebhookRoutes);
app.route("/api/acp", acpRoutes);

// ── Model registry (docs/model-hub-plan.md) ──────────────────────────────────
app.route("/api/models", modelRoutes);
app.route("/api/usage", usageRoutes);
app.route("/api/billing", billingRoutes);
app.route("/api/storage", storageRoutes);

// ── Chat ─────────────────────────────────────────────────────────────────────

const activeChatTurns = new Map<string, AbortController>();

app.get("/api/chat/:sessionId/status", requireCap("chat"), (c) =>
  c.json({ active: activeChatTurns.has(c.req.param("sessionId")) }),
);

app.post("/api/chat/:sessionId/cancel", requireCap("chat"), (c) => {
  const controller = activeChatTurns.get(c.req.param("sessionId"));
  controller?.abort();
  return c.json({ cancelled: Boolean(controller) });
});

app.post("/api/chat", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as {
    sessionId?: string;
    message: string;
    /** "ask" runs the turn with write tools removed (answer-only). */
    mode?: "agent" | "ask";
    /**
     * How the agent should pause for confirmation this turn.
     * Defaults to "smart" when omitted.
     */
    approvalMode?: "strict" | "smart" | "full";
    /** Workspace folder for new sessions (null = sandbox). */
    projectId?: string | null;
    /** Agent profile for this turn / new session (agent:builtin, agent:user:…). */
    profileId?: string | null;
    /** Composer toolset chips — scopes tools for this turn. */
    toolsetIds?: string[];
  };
  const message = (body.message ?? "").trim();
  if (!message) return c.json({ error: "message is required" }, 400);

  const approvalMode =
    body.approvalMode === "strict" || body.approvalMode === "full" || body.approvalMode === "smart"
      ? body.approvalMode
      : "smart";

  const toolsetIds = Array.isArray(body.toolsetIds)
    ? body.toolsetIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : undefined;

  let session = body.sessionId
    ? await sessionStore.get(body.sessionId)
    : await sessionStore.create("chat", "New chat", {
        projectId: body.projectId ?? null,
        profileId: body.profileId ?? null,
      });
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (body.sessionId && session.projectId == null) {
    session = await sessionStore.tagProjectIfMissing(session, body.projectId ?? null);
  }
  if (body.profileId && session.profileId !== body.profileId) {
    session = (await sessionStore.setProfileId(session.id, body.profileId)) ?? session;
  }
  if (activeChatTurns.has(session.id)) {
    return c.json({ error: "A turn is already running for this session" }, 409);
  }
  const turnController = new AbortController();
  activeChatTurns.set(session.id, turnController);

  return streamSSE(c, async (stream) => {
    // Queue writes so terminal events (error/done) flush before close — a bare
    // void writeSSE can be dropped when the stream closes immediately after.
    const pending: Promise<void>[] = [];
    const emit = (event: AgentEvent) => {
      pending.push(stream.writeSSE({ data: JSON.stringify(event) }).catch(() => {}));
    };
    emit({ type: "session", sessionId: session.id });
    try {
      // Profile.runtime.kind wins when set; otherwise Settings.agent (shell default).
      // Concurrent turns are rejected above via activeChatTurns (409); the client
      // queues follow-ups. Cancel uses turnController — see POST …/cancel.
      const profile = resolveProfileForTurn({
        profileId: body.profileId ?? session.profileId,
        sessionProfileId: session.profileId,
      });
      const kind = resolveTurnKind(profile);
      const turnRunner = pickTurnRunner(kind);
      await withProfileActivity(profile.id, () =>
        turnRunner({
          sessionId: session.id,
          userMessage: message,
          emit,
          signal: turnController.signal,
          interactive: true,
          readOnly: body.mode === "ask",
          approvalMode,
          userId: currentUser(c).id,
          profileId: profile.id,
          ...(toolsetIds && toolsetIds.length > 0 ? { toolsetIds } : {}),
          ...(kind === "acp" ? { acpCommand: resolveAcpCommand(profile) } : {}),
        }),
      );
      emit({ type: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent turn failed";
      emit({
        type: "error",
        message,
        ...(isCreditsInsufficientError(message) || message === creditsInsufficientMessage()
          ? { code: "credits_insufficient" as const }
          : {}),
      });
    }
    activeChatTurns.delete(session.id);
    await Promise.all(pending);
    await stream.close().catch(() => {});
  });
});

// ── Shell events (out-of-band agent → desktop channel) ──────────────────────
//
// Chat turns stream their AgentEvents over the /api/chat SSE response, but
// turns started elsewhere (the voice server via /v1, future headless callers)
// have no client stream. Those callers put shell-relevant events on the bus
// ("shell_event"), and every connected desktop receives them here.

app.get("/api/shell-events", (c) => {
  // Disable proxy buffering (Vite / nginx) so the desktop counts as connected
  // immediately and cursor_request events flush in real time.
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async (stream) => {
    const forward = (event: AgentEvent) => {
      void stream.writeSSE({ data: JSON.stringify(event) });
    };
    bus.on("shell_event", forward);
    const disconnect = shellClientConnected();
    // Keep-alive comments defeat proxy idle timeouts (vite dev proxy included).
    const keepAlive = setInterval(() => void stream.writeSSE({ data: '{"type":"ping"}' }), 25_000);
    const closed = new Promise<void>((resolve) => {
      stream.onAbort(() => resolve());
    });
    await closed;
    clearInterval(keepAlive);
    bus.off("shell_event", forward);
    disconnect();
  });
});

// ── Sessions ─────────────────────────────────────────────────────────────────

app.get("/api/sessions", async (c) => c.json(await sessionStore.list()));

app.get("/api/sessions/:id", async (c) => {
  const session = await sessionStore.get(c.req.param("id"));
  if (!session) return c.json({ error: "Not found" }, 404);
  return c.json(session);
});

app.delete("/api/sessions/:id", requireCap("chat"), async (c) => {
  await sessionStore.delete(c.req.param("id"));
  return c.json({ ok: true });
});

app.patch("/api/sessions/:id", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { title?: string; workItemId?: string | null };
  const id = c.req.param("id");
  try {
    if (body.workItemId !== undefined) {
      const session = await sessionStore.setWorkItemId(id, body.workItemId);
      if (!session) return c.json({ error: "Not found" }, 404);
      if (body.workItemId) {
        try {
          boardService.linkSession(body.workItemId, id, { promoteInProgress: true });
        } catch {
          // Work item may have been deleted — session binding still saved.
        }
      }
      if (typeof body.title === "string" && body.title.trim()) {
        return c.json(await sessionStore.updateTitle(id, body.title.trim()));
      }
      return c.json(session);
    }
    const title = (body.title ?? "").trim();
    if (!title) return c.json({ error: "title or workItemId is required" }, 400);
    const session = await sessionStore.updateTitle(id, title);
    return c.json(session);
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

/** Count tracked file edits at/after a user message (for restore confirm copy). */
app.get("/api/sessions/:id/checkpoint-edits", requireCap("chat"), async (c) => {
  const from = Number(c.req.query("fromUserMessageIndex"));
  if (!Number.isInteger(from) || from < 0) {
    return c.json({ error: "fromUserMessageIndex is required" }, 400);
  }
  const session = await sessionStore.get(c.req.param("id"));
  if (!session) return c.json({ error: "Not found" }, 404);
  const editCount = await checkpointStore.editCountFrom(c.req.param("id"), from);
  return c.json({ editCount });
});

/**
 * Restore a checkpoint — Claude Code / Cursor style.
 * mode=both → revert tracked file edits + truncate conversation
 * mode=conversation → truncate only
 * mode=code → revert tracked file edits only
 * Saves a pending undo so the client can “Redo checkpoint” before the next turn.
 */
app.post("/api/sessions/:id/restore-checkpoint", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as {
    upToUserMessageIndex?: number;
    mode?: "both" | "conversation" | "code";
  };
  const upTo = body.upToUserMessageIndex;
  const mode = body.mode ?? "both";
  if (typeof upTo !== "number" || !Number.isInteger(upTo) || upTo < 0) {
    return c.json({ error: "upToUserMessageIndex is required" }, 400);
  }
  if (mode !== "both" && mode !== "conversation" && mode !== "code") {
    return c.json({ error: "mode must be both, conversation, or code" }, 400);
  }
  const id = c.req.param("id");
  const session = await sessionStore.get(id);
  if (!session) return c.json({ error: "Not found" }, 404);
  if (upTo >= session.messages.length || session.messages[upTo]?.role !== "user") {
    return c.json({ error: "upToUserMessageIndex must point at a user message" }, 400);
  }

  const discardedMessages =
    mode === "both" || mode === "conversation" ? session.messages.slice(upTo + 1) : [];
  let restoredFiles: { path: string; content: string | null }[] = [];
  let removedTurns = await checkpointStore.peekTurnsFrom(id, upTo);
  let redoFiles: { path: string; content: string | null; diffBefore: string | null }[] = [];

  try {
    if (mode === "both" || mode === "code") {
      const fileResult = await checkpointStore.restoreFilesFrom(id, upTo);
      restoredFiles = fileResult.restoredFiles;
      removedTurns = fileResult.removedTurns;
      redoFiles = fileResult.redoFiles;
    } else {
      // Conversation-only: keep turn edit history for a later code restore, but
      // still capture turns in the undo bundle if we drop them via truncate.
      removedTurns = [];
      redoFiles = [];
    }
    if (mode === "both" || mode === "conversation") {
      await sessionStore.truncate(id, upTo + 1);
    }
    await checkpointStore.savePendingUndo({
      sessionId: id,
      mode,
      discardedMessages,
      removedTurns: mode === "conversation" ? [] : removedTurns,
      redoFiles,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    return c.json({ error: message }, 400);
  }

  const next = await sessionStore.get(id);
  return c.json({
    session: next,
    restoredFiles,
    editCount: restoredFiles.length,
    canUndo: true,
  });
});

/** Undo the last restore (“Redo checkpoint” in Cursor) before the next turn. */
app.post("/api/sessions/:id/redo-checkpoint", requireCap("chat"), async (c) => {
  const id = c.req.param("id");
  const undo = await checkpointStore.getPendingUndo(id);
  if (!undo) return c.json({ error: "Nothing to redo" }, 404);

  try {
    let reappliedFiles: { path: string; content: string | null }[] = [];
    if (undo.mode === "both" || undo.mode === "code") {
      reappliedFiles = await checkpointStore.applyRedoFiles(undo.redoFiles);
      await checkpointStore.restoreTurns(id, undo.removedTurns);
    }
    if ((undo.mode === "both" || undo.mode === "conversation") && undo.discardedMessages.length > 0) {
      await sessionStore.appendMessagesRaw(id, undo.discardedMessages);
    }
    await checkpointStore.clearPendingUndo(id);
    const session = await sessionStore.get(id);
    return c.json({
      session,
      reappliedFiles,
      redoFiles: undo.redoFiles,
      mode: undo.mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Redo failed";
    return c.json({ error: message }, 400);
  }
});

/** Dismiss the pending restore undo without reapplying. */
app.delete("/api/sessions/:id/restore-undo", requireCap("chat"), async (c) => {
  await checkpointStore.clearPendingUndo(c.req.param("id"));
  return c.json({ ok: true });
});

/** Drop trailing messages so a turn can be regenerated or edited. */
app.post("/api/sessions/:id/truncate", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { keepCount?: number };
  if (typeof body.keepCount !== "number" || !Number.isInteger(body.keepCount) || body.keepCount < 0) {
    return c.json({ error: "keepCount is required" }, 400);
  }
  try {
    const session = await sessionStore.truncate(c.req.param("id"), body.keepCount);
    return c.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Truncate failed";
    if (message.startsWith("Session not found")) return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

/** Branch a conversation into a new session with history up to a message. */
app.post("/api/sessions/:id/fork", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { upToMessageIndex?: number };
  if (
    typeof body.upToMessageIndex !== "number" ||
    !Number.isInteger(body.upToMessageIndex) ||
    body.upToMessageIndex < 0
  ) {
    return c.json({ error: "upToMessageIndex is required" }, 400);
  }
  try {
    const session = await sessionStore.fork(c.req.param("id"), body.upToMessageIndex);
    return c.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fork failed";
    if (message.startsWith("Session not found")) return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

// ── Apps ─────────────────────────────────────────────────────────────────────

app.get("/api/apps", async (c) => c.json(await appStore.list()));

app.get("/api/apps/:id", async (c) => {
  const record = await appStore.get(c.req.param("id"));
  if (!record) return c.json({ error: "Not found" }, 404);
  return c.json(record);
});

app.delete("/api/apps/:id", requireCap("apps:manage"), async (c) => {
  await appStore.delete(c.req.param("id"));
  return c.json({ ok: true });
});

app.post("/api/apps/:id/restore", requireCap("apps:manage"), async (c) => {
  const body = (await c.req.json()) as { versionIndex: number };
  const record = await appStore.restore(c.req.param("id"), body.versionIndex);
  return c.json(record);
});

// ── UI Generator (Studio-backed openui-lang synthesis + saved catalog) ─────

app.get("/api/generator/catalog", async (c) => c.json(await generatorCatalogStore.list()));

app.post("/api/generator/generate", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return c.json({ error: "prompt is required" }, 400);
  try {
    return c.json(await generateUiFromPrompt(prompt, c.req.raw.signal));
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      500,
    );
  }
});

app.post("/api/generator/catalog", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as {
    label?: string;
    code?: string;
    prompt?: string;
    tier?: "atom" | "card" | "block" | "widget" | "saved";
  };
  const code = (body.code ?? "").trim();
  if (!code) return c.json({ error: "code is required" }, 400);
  const entry = await generatorCatalogStore.add({
    label: body.label ?? "Generated UI",
    code,
    prompt: body.prompt,
    tier: body.tier,
  });
  return c.json(entry);
});

app.delete("/api/generator/catalog/:id", requireCap("chat"), async (c) => {
  const ok = await generatorCatalogStore.remove(c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Image Gen (OpenAI Images API + gallery) ────────────────────────────────

app.get("/api/image-gen/status", async (c) => c.json(getImageGenStatus()));

app.get("/api/image-gen/history", async (c) => c.json(await imageGenStore.list()));

app.post("/api/image-gen/generate", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as {
    prompt?: string;
    size?: "1024x1024" | "1024x1792" | "1792x1024";
    style?: "vivid" | "natural";
  };
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return c.json({ error: "prompt is required" }, 400);
  try {
    const item = await generateImageFromPrompt(
      { prompt, size: body.size, style: body.style },
      c.req.raw.signal,
    );
    return c.json({ item });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      500,
    );
  }
});

app.get("/api/image-gen/assets/:filename", async (c) => {
  const assetPath = await imageGenStore.assetPath(c.req.param("filename"));
  if (!assetPath) return c.json({ error: "Not found" }, 404);
  const ext = path.extname(assetPath).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
  const stream = createReadStream(assetPath);
  return c.body(stream as unknown as ReadableStream, 200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
});

app.delete("/api/image-gen/history/:id", requireCap("chat"), async (c) => {
  const removed = await imageGenStore.remove(c.req.param("id"));
  if (!removed) return c.json({ error: "Not found" }, 404);
  const filename = path.basename(removed.imageUrl);
  const assetPath = await imageGenStore.assetPath(filename);
  if (assetPath) await fs.unlink(assetPath).catch(() => {});
  return c.json({ ok: true });
});

// ── App runtime tool bridge (Query/Mutation — no LLM in the loop) ───────────

app.post("/api/tools/invoke", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { tool: string; params?: Record<string, unknown> };
  try {
    const result = await invokeRuntimeTool(body.tool, body.params ?? {});
    return c.json({ result });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Tool invoke failed" }, 400);
  }
});

// ── Automations ──────────────────────────────────────────────────────────────

function parsePagination(c: { req: { query: (key: string) => string | undefined } }) {
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(c.req.query("offset") ?? 0) || 0);
  return { limit, offset };
}

/** Validate a client-supplied delivery target (or null to clear it). */
function parseDeliver(raw: unknown): import("../shared/types.js").DeliveryTarget | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  if (typeof d.channelId === "string" && d.channelId && typeof d.chatId === "string" && d.chatId) {
    return { channelId: d.channelId, chatId: d.chatId };
  }
  return undefined;
}

function parseTrigger(raw: unknown, scheduleFallback?: string): AutomationTrigger | undefined {
  if (!raw || typeof raw !== "object") {
    if (scheduleFallback) {
      return { type: "schedule", schedule: scheduleFallback, scheduleHuman: describeSchedule(scheduleFallback) };
    }
    return undefined;
  }
  const t = raw as Record<string, unknown>;
  if (t.type === "event") {
    return {
      type: "event",
      source: typeof t.source === "string" ? t.source : undefined,
      on: t.on as AutomationTrigger["on"],
      filter: typeof t.filter === "string" ? t.filter : undefined,
    };
  }
  const schedule =
    typeof t.schedule === "string"
      ? t.schedule
      : typeof scheduleFallback === "string"
        ? scheduleFallback
        : undefined;
  if (!schedule) return undefined;
  return { type: "schedule", schedule, scheduleHuman: describeSchedule(schedule) };
}

app.get("/api/automations/health", async (c) =>
  c.json({
    status: "ok" satisfies import("../shared/types.js").AutomationHealthResponse["status"],
    ops: await getOpsStatus(),
  }),
);

app.get("/api/automations", async (c) => {
  const { limit, offset } = parsePagination(c);
  return c.json(await automationStore.list({ limit, offset }));
});

app.get("/api/automations/:id", async (c) => {
  const automation = await automationStore.get(c.req.param("id"));
  if (!automation) return c.json({ error: "Not found" }, 404);
  return c.json(automation);
});

app.get("/api/automations/:id/runs", async (c) => {
  const automation = await automationStore.get(c.req.param("id"));
  if (!automation) return c.json({ error: "Not found" }, 404);
  const { limit, offset } = parsePagination(c);
  return c.json(await automationStore.listRuns(c.req.param("id"), { limit, offset }));
});

app.post("/api/automations", requireCap("automations:manage"), async (c) => {
  const body = (await c.req.json()) as {
    name: string;
    schedule?: string;
    prompt: string;
    trigger?: unknown;
    timezone?: string;
    model?: string;
    mcpServerIds?: string[];
    deliver?: unknown;
    checkIn?: boolean;
    profileId?: string | null;
  };
  const deliver = parseDeliver(body.deliver);
  const trigger = parseTrigger(body.trigger, body.schedule);
  const automation = await automationStore.create({
    name: body.name,
    prompt: body.prompt,
    ...(trigger ? { trigger } : { schedule: body.schedule ?? "0 9 * * *" }),
    ...(typeof body.timezone === "string" ? { timezone: body.timezone } : {}),
    ...(typeof body.model === "string" ? { model: body.model } : {}),
    ...(Array.isArray(body.mcpServerIds) ? { mcpServerIds: body.mcpServerIds } : {}),
    ...(deliver ? { deliver } : {}),
    ...(typeof body.checkIn === "boolean" ? { checkIn: body.checkIn } : {}),
    ...(body.profileId !== undefined ? { profileId: body.profileId } : {}),
  });
  bus.emit("automations_changed");
  return c.json(automation);
});

app.patch("/api/automations/:id", requireCap("automations:manage"), async (c) => {
  const body = (await c.req.json()) as Partial<{
    name: string;
    schedule: string;
    prompt: string;
    enabled: boolean;
    deliver: unknown;
    trigger: unknown;
    timezone: string;
    model: string;
    mcpServerIds: string[];
    webhookSecret: string;
    checkIn: boolean;
    profileId: string | null;
  }>;
  const patch: Parameters<typeof automationStore.update>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.prompt === "string") patch.prompt = body.prompt;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.schedule === "string") patch.schedule = body.schedule;
  if (typeof body.timezone === "string") patch.timezone = body.timezone;
  if (typeof body.model === "string") patch.model = body.model;
  if (Array.isArray(body.mcpServerIds)) patch.mcpServerIds = body.mcpServerIds;
  if (typeof body.webhookSecret === "string") patch.webhookSecret = body.webhookSecret;
  if (typeof body.checkIn === "boolean") patch.checkIn = body.checkIn;
  if ("profileId" in body) patch.profileId = body.profileId ?? null;
  if (body.trigger !== undefined) {
    const trigger = parseTrigger(body.trigger, body.schedule);
    if (trigger) patch.trigger = trigger;
  }
  if ("deliver" in body) patch.deliver = parseDeliver(body.deliver);
  const automation = await automationStore.update(c.req.param("id"), patch);
  bus.emit("automations_changed");
  return c.json(automation);
});

app.delete("/api/automations/:id", requireCap("automations:manage"), async (c) => {
  await automationStore.delete(c.req.param("id"));
  bus.emit("automations_changed");
  return c.json({ ok: true });
});

async function dispatchAutomation(c: import("hono").Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Not found" }, 404);
  const automation = await automationStore.get(id);
  if (!automation) return c.json({ error: "Not found" }, 404);
  const run = await runAutomationNow(id);
  return c.json(run);
}

app.post("/api/automations/:id/run", requireCap("automations:manage"), dispatchAutomation);
app.post("/api/automations/:id/dispatch", requireCap("automations:manage"), dispatchAutomation);

app.post("/api/webhooks/automations/:id", async (c) => {
  const automation = await automationStore.get(c.req.param("id"));
  if (!automation || !automation.enabled) return c.json({ error: "Not found" }, 404);
  if (automation.trigger.type !== "event") return c.json({ error: "Not an event automation" }, 400);

  const rawBody = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (!verifyWebhookSecret(automation.webhookSecret, headers, rawBody)) {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  let body: unknown = {};
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
  }

  if (!eventTriggerMatches(automation.trigger, { headers, body })) {
    return c.json({ ok: true, skipped: true });
  }

  const run = await runAutomationNow(automation.id);
  return c.json(run);
});

// ── Workspace files (rooted at the active project) ──────────────────────────

app.get("/api/files", requireCap("files:read"), async (c) => {
  const rel = c.req.query("path") ?? ".";
  const ws = workspaceStore.get();
  if (ws.backend === "drive") {
    try {
      const { listDriveWorkspace } = await import("./stores/driveWorkspace.js");
      return c.json(listDriveWorkspace(rel));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Drive list failed" }, 400);
    }
  }
  // Multi-root virtual listing at workspace top.
  if ((rel === "." || rel === "") && ws.roots.length > 1) {
    const now = new Date().toISOString();
    return c.json(
      ws.roots.map((r) => ({
        name: r.name,
        path: r.name,
        type: "dir" as const,
        size: 0,
        modifiedAt: now,
      })),
    );
  }
  const abs = resolveProjectPath(rel);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const out = await Promise.all(
    entries
      // .git is enormous and never useful in the tree; the Git tab covers it.
      .filter((e) => e.name !== ".git")
      .map(async (e) => {
      const full = path.join(abs, e.name);
      const stat = await fs.stat(full);
      return {
        name: e.name,
        path: toWorkspaceRelative(full),
        type: e.isDirectory() ? ("dir" as const) : ("file" as const),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    }),
  );
  out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  return c.json(out);
});

app.get("/api/files/content", requireCap("files:read"), async (c) => {
  const rel = c.req.query("path");
  if (!rel) return c.json({ error: "path is required" }, 400);
  if (workspaceStore.get().backend === "drive") {
    try {
      const { readDriveWorkspace } = await import("./stores/driveWorkspace.js");
      return c.json(readDriveWorkspace(rel));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Drive read failed" }, 400);
    }
  }
  const content = await fs.readFile(resolveProjectPath(rel), "utf-8");
  return c.json({ path: rel, content });
});

app.put("/api/files/content", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { path: string; content: string };
  if (workspaceStore.get().backend === "drive") {
    try {
      const { writeDriveWorkspace } = await import("./stores/driveWorkspace.js");
      writeDriveWorkspace(body.path, body.content);
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Drive write failed" }, 400);
    }
  }
  const abs = resolveProjectPath(body.path);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body.content, "utf-8");
  return c.json({ ok: true });
});

// ── Drive (os.files@1 — the OS document store) ───────────────────────────────

app.get("/api/drive/entries", requireCap("files:read"), (c) => {
  const starred = c.req.query("starred") === "true";
  const trashed = c.req.query("trashed") === "true";
  const parentIdRaw = c.req.query("parentId");
  const parentId =
    parentIdRaw === undefined ? undefined : parentIdRaw === "null" || parentIdRaw === "" ? null : parentIdRaw;
  return c.json(filesService.list({ parentId, trashed, starred }));
});

app.get("/api/drive/recent", requireCap("files:read"), (c) => {
  const limit = Number(c.req.query("limit") ?? "20");
  return c.json(filesService.recent(Number.isFinite(limit) ? limit : 20));
});

app.get("/api/drive/search", requireCap("files:read"), (c) => {
  const query = c.req.query("q") ?? "";
  return c.json(filesService.search(query));
});

app.get("/api/search/web", async (c) => {
  const q = c.req.query("q") ?? "";
  if (!q.trim()) {
    return c.json({ query: "", results: [], resultCount: 0, elapsedMs: 0 });
  }
  const limit = Number(c.req.query("limit") ?? "10");
  const max = Math.min(Math.max(Number.isFinite(limit) ? limit : 10, 1), 20);
  try {
    const start = performance.now();
    const results = await webSearch(q, max);
    const elapsedMs = performance.now() - start;
    return c.json({
      query: q.trim(),
      results,
      resultCount: results.length,
      elapsedMs,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.get("/api/search/browse", async (c) => {
  const raw = c.req.query("url") ?? "";
  if (!raw.trim()) return c.text("Missing url", 400);
  try {
    const { html, contentType } = await fetchBrowsePage(raw);
    return c.body(html, 200, { "Content-Type": contentType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Browse failed";
    return c.html(browseErrorHtml(message), 502);
  }
});

/** Same-origin project preview for Studio Design Mode (browser/cloud). Allows loopback. */
app.get("/api/studio/preview", requireCap("files:read"), async (c) => {
  const raw = c.req.query("url") ?? "";
  if (!raw.trim()) return c.text("Missing url", 400);
  try {
    const { html, contentType } = await fetchStudioPreviewPage(raw);
    return c.body(html, 200, {
      "Content-Type": contentType,
      // Allow embedding in the Studio shell iframe.
      "X-Frame-Options": "SAMEORIGIN",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    return c.html(studioPreviewErrorHtml(message), 502);
  }
});

app.get("/api/maps/search", async (c) => {
  const q = c.req.query("q") ?? "";
  if (!q.trim()) return c.json([]);
  try {
    const viewbox = c.req.query("viewbox");
    const bounded = c.req.query("bounded") === "1";
    const limit = Number(c.req.query("limit") ?? "12");
    const results = await searchPlaces(q, {
      viewbox,
      bounded,
      limit: Number.isFinite(limit) ? limit : 12,
    });
    return c.json(results);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.get("/api/maps/geocode", async (c) => {
  const q = c.req.query("q") ?? "";
  if (!q.trim()) return c.json(null);
  try {
    return c.json(await geocodePlace(q));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.get("/api/maps/route", async (c) => {
  const fromLat = Number(c.req.query("fromLat"));
  const fromLon = Number(c.req.query("fromLon"));
  const toLat = Number(c.req.query("toLat"));
  const toLon = Number(c.req.query("toLon"));
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) {
    return c.json({ error: "fromLat, fromLon, toLat, and toLon are required" }, 400);
  }

  const fromName = c.req.query("fromName")?.trim() || "Start";
  const toName = c.req.query("toName")?.trim() || "Destination";
  const from = {
    id: "route-from",
    name: fromName,
    category: "Route",
    address: fromName,
    lat: fromLat,
    lon: fromLon,
  };
  const to = {
    id: "route-to",
    name: toName,
    category: "Route",
    address: toName,
    lat: toLat,
    lon: toLon,
  };

  try {
    return c.json(await getDrivingRoute(from, to));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.get("/api/music/tracks", (c) => c.json(listMusicTracksAsSeedStatus()));

app.post("/api/music/tracks/import", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    path?: string;
    driveFileId?: string;
    torrentId?: string;
    fileName?: string;
    title?: string;
    artists?: string;
    album?: string;
  };
  try {
    const result = await importMusicTrack(body);
    return c.json(result, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import track";
    return c.json({ error: message }, 400);
  }
});

app.post("/api/music/tracks/upload", async (c) => {
  try {
    const form = await c.req.parseBody();
    const file = form.file;
    if (!file || typeof file === "string") {
      return c.json({ error: "file is required" }, 400);
    }
    const data = Buffer.from(await file.arrayBuffer());
    const track = importMusicUpload(file.name || "upload.mp3", data, {
      title: typeof form.title === "string" ? form.title : undefined,
      artists: typeof form.artists === "string" ? form.artists : undefined,
      album: typeof form.album === "string" ? form.album : undefined,
    });
    return c.json(track, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload track";
    return c.json({ error: message }, 400);
  }
});

app.post("/api/music/tracks/scan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    source?: "torrents" | "seed" | "path";
    path?: string;
  };
  try {
    const result = await scanMusicLibrary(body);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to scan for music";
    return c.json({ error: message }, 400);
  }
});

app.delete("/api/music/tracks/:id", (c) => {
  try {
    return c.json(removeMusicTrack(c.req.param("id")));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove track";
    const status = message === "Track not found" ? 404 : 400;
    return c.json({ error: message }, status);
  }
});

app.get("/api/music/tracks/:id", (c) => {
  const track = getMusicTrack(c.req.param("id"));
  if (!track) return c.json({ error: "Track not found" }, 404);
  return c.json(track);
});

/** Avoid process crashes when a client disconnects during a file stream. */
function createSafeReadStream(absPath: string, options?: { start?: number; end?: number }): ReadStream {
  const stream = createReadStream(absPath, options);
  stream.on("error", () => stream.destroy());
  return stream;
}

function attachStreamAbort(stream: ReadStream, signal?: AbortSignal) {
  signal?.addEventListener("abort", () => stream.destroy(), { once: true });
}

app.get("/api/music/stream/:id", (c) => {
  const resolved = statAnyMusicTrack(c.req.param("id"));
  if (!resolved) return c.json({ error: "Track not found" }, 404);

  const ext = path.extname(resolved.absPath).toLowerCase();
  const contentType =
    ext === ".m4a" || ext === ".aac"
      ? "audio/mp4"
      : ext === ".wav"
        ? "audio/wav"
        : ext === ".ogg"
          ? "audio/ogg"
          : ext === ".flac"
            ? "audio/flac"
            : "audio/mpeg";

  const range = c.req.header("range");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
    if (!match) return c.json({ error: "Invalid range" }, 416);

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : resolved.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= resolved.size) {
      return c.json({ error: "Invalid range" }, 416);
    }

    const stream = createSafeReadStream(resolved.absPath, { start, end });
    attachStreamAbort(stream, c.req.raw.signal);
    return c.body(stream as unknown as ReadableStream, 206, {
      "Content-Range": `bytes ${start}-${end}/${resolved.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": contentType,
    });
  }

  const stream = createSafeReadStream(resolved.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream as unknown as ReadableStream, 200, {
    "Content-Length": String(resolved.size),
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  });
});

app.get("/api/music/art/:id", (c) => {
  const art = resolveTrackArt(c.req.param("id"));
  if (!art) return c.json({ error: "Artwork not found" }, 404);

  const stream = createSafeReadStream(art.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream as unknown as ReadableStream, 200, {
    "Content-Type": art.mime,
    "Cache-Control": "public, max-age=86400",
  });
});

app.get("/api/music/rss/feeds", (c) => c.json(listSubscribedMusicFeeds()));

app.post("/api/music/rss/seed-audio", async (c) => {
  try {
    const result = await seedAudioBroadcastFeeds();
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to seed audio feeds";
    return c.json({ error: message }, 502);
  }
});

app.post("/api/music/rss/feeds", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { url?: string };
  const url = body.url?.trim();
  if (!url) return c.json({ error: "Feed URL is required" }, 400);

  try {
    new URL(url);
  } catch {
    return c.json({ error: "Invalid feed URL" }, 400);
  }

  try {
    const metadata = await fetchMusicFeedMetadata(url);
    const feed = addSubscribedMusicFeed(metadata);
    invalidateMusicFeedCache(url);
    return c.json(feed, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add feed";
    return c.json({ error: message }, 502);
  }
});

app.delete("/api/music/rss/feeds/:id", (c) => {
  const feedId = c.req.param("id");
  const feed = listSubscribedMusicFeeds().find((entry) => entry.id === feedId);
  if (!feed) return c.json({ error: "Feed not found" }, 404);
  removeSubscribedMusicFeed(feedId);
  invalidateMusicFeedCache(feed.url);
  return c.json({ ok: true });
});

app.get("/api/music/rss/songs", async (c) => {
  try {
    return c.json(await listRssSongs());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load RSS feeds";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/music/rss/feed-songs", async (c) => {
  const feedUrl = c.req.query("url")?.trim();
  if (!feedUrl) return c.json({ error: "Feed URL is required" }, 400);

  try {
    new URL(feedUrl);
  } catch {
    return c.json({ error: "Invalid feed URL" }, 400);
  }

  try {
    return c.json(await fetchMusicFeedSongs(feedUrl));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load feed songs";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/music/rss/stream/:id", async (c) => {
  try {
    const proxied = await proxyMusicRssEnclosure(
      c.req.param("id"),
      c.req.header("range"),
      c.req.query("feedUrl"),
    );
    if (!proxied) return c.json({ error: "Song not found" }, 404);
    return c.body(proxied.body, proxied.status as 200 | 206, proxied.headers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to stream song";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/music/rss/art/:id", async (c) => {
  try {
    const proxied = await proxyMusicSongCover(c.req.param("id"));
    if (!proxied) return c.json({ error: "Artwork not found" }, 404);
    return c.body(proxied.body, 200, {
      "Content-Type": proxied.contentType,
      "Cache-Control": "public, max-age=86400",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load song artwork";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/music/rss/feed-art", async (c) => {
  const feedUrl = c.req.query("url")?.trim();
  if (!feedUrl) return c.json({ error: "Feed URL is required" }, 400);

  try {
    new URL(feedUrl);
  } catch {
    return c.json({ error: "Invalid feed URL" }, 400);
  }

  try {
    const proxied = await proxyMusicFeedCover(feedUrl);
    if (!proxied) return c.json({ error: "Artwork not found" }, 404);
    return c.body(proxied.body, 200, {
      "Content-Type": proxied.contentType,
      "Cache-Control": "public, max-age=86400",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load feed artwork";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/music/live/stations", (c) => c.json(listMusicLiveStations()));

app.get("/api/music/live/stream/:id", async (c) => {
  try {
    const proxied = await proxyMusicLiveStream(c.req.param("id"));
    if (!proxied) return c.json({ error: "Station not found" }, 404);
    return c.body(proxied.body, 200, proxied.headers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to stream station";
    return c.json({ error: message }, 502);
  }
});
app.get("/api/video/videos", (c) => c.json(listLocalVideos()));

app.post("/api/video/remote", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    provider?: string;
    token?: string;
    query?: string;
  };
  if (body.provider !== "youtube" && body.provider !== "vimeo") {
    return c.json({ error: "Invalid video provider" }, 400);
  }
  return c.json(await listRemoteVideos({ provider: body.provider, token: body.token, query: body.query }));
});

app.get("/api/video/stream/:id", (c) => {
  const resolved = statLocalVideo(c.req.param("id"));
  if (!resolved) return c.json({ error: "Video not found" }, 404);

  const range = c.req.header("range");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
    if (!match) return c.json({ error: "Invalid range" }, 416);

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : resolved.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= resolved.size) {
      return c.json({ error: "Invalid range" }, 416);
    }

    const stream = createSafeReadStream(resolved.absPath, { start, end });
    attachStreamAbort(stream, c.req.raw.signal);
    return c.body(stream as unknown as ReadableStream, 206, {
      "Content-Range": `bytes ${start}-${end}/${resolved.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": resolved.video.mimeType,
    });
  }

  const stream = createSafeReadStream(resolved.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream as unknown as ReadableStream, 200, {
    "Content-Length": String(resolved.size),
    "Content-Type": resolved.video.mimeType,
    "Accept-Ranges": "bytes",
  });
});

app.get("/api/podcast/episodes", (c) => c.json(listLocalEpisodes()));

// ── Downloads / BitTorrent (os.downloads@1) ───────────────────────────────────

app.get("/api/downloads/torrents", requireCap("files:read"), async (c) => {
  try {
    return c.json(await torrentService.list());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

app.get("/api/downloads/torrents/:id", requireCap("files:read"), async (c) => {
  try {
    return c.json(await torrentService.get(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

app.get("/api/downloads/stats", requireCap("files:read"), async (c) => {
  try {
    return c.json(await torrentService.stats());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

app.get("/api/downloads/settings", requireCap("files:read"), (c) => {
  return c.json(torrentService.getSettings());
});

app.put("/api/downloads/settings", requireCap("files:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { seedAfterDownload?: boolean };
  try {
    return c.json(await torrentService.updateSettings(body));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.post("/api/downloads/torrents", requireCap("files:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as TorrentAddInput;
  try {
    const torrent = await torrentService.add(body);
    return c.json(torrent, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.post("/api/downloads/torrents/:id/pause", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.pause(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

app.post("/api/downloads/torrents/:id/resume", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.resume(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

app.post("/api/downloads/torrents/:id/stop", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.stop(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

app.delete("/api/downloads/torrents/:id", requireCap("files:write"), async (c) => {
  const deleteFiles = c.req.query("deleteFiles") === "1" || c.req.query("deleteFiles") === "true";
  try {
    return c.json(await torrentService.remove(c.req.param("id"), deleteFiles));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

app.post("/api/downloads/torrents/:id/drive", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.ensureInDrive(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.post("/api/downloads/reveal", requireCap("files:read"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { path?: string };
  const target = body.path?.trim();
  if (!target) return c.json({ error: "path is required" }, 400);
  try {
    return c.json(await torrentService.revealPath(target));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.get("/api/podcast/rss/feeds", (c) => c.json(listSubscribedFeeds()));

app.post("/api/podcast/rss/feeds", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { url?: string };
  const url = body.url?.trim();
  if (!url) return c.json({ error: "Feed URL is required" }, 400);

  try {
    new URL(url);
  } catch {
    return c.json({ error: "Invalid feed URL" }, 400);
  }

  try {
    const metadata = await fetchFeedMetadata(url);
    const feed = addSubscribedFeed(metadata);
    invalidateFeedCache(url);
    void syncPodcastDownloads().catch(() => undefined);
    return c.json(feed, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add feed";
    return c.json({ error: message }, 502);
  }
});

app.delete("/api/podcast/rss/feeds/:id", (c) => {
  const feedId = c.req.param("id");
  const feed = listSubscribedFeeds().find((entry) => entry.id === feedId);
  if (!feed) return c.json({ error: "Feed not found" }, 404);
  removeSubscribedFeed(feedId);
  invalidateFeedCache(feed.url);
  return c.json({ ok: true });
});

app.post("/api/podcast/rss/sync", async (c) => {
  try {
    return c.json(await syncPodcastDownloads());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/podcast/drive/saves", (c) => c.json(listPodcastDriveSaves()));

app.get("/api/podcast/drive/:id", (c) => {
  const save = getPodcastDriveSave(c.req.param("id"));
  if (!save) return c.json({ saved: false });
  try {
    return c.json({ saved: true, file: filesService.get(save.driveFileId), save });
  } catch {
    return c.json({ saved: false });
  }
});

app.post("/api/podcast/drive/:id", requireCap("files:write"), async (c) => {
  try {
    const entry = await savePodcastEpisodeToDrive(c.req.param("id"));
    return c.json(entry, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save to Drive";
    const status = message.includes("not found") ? 404 : 502;
    return c.json({ error: message }, status);
  }
});

app.get("/api/podcast/transcripts", (c) => c.json(listPodcastTranscripts()));

app.get("/api/podcast/transcripts/:id", (c) => {
  const transcript = getPodcastTranscript(c.req.param("id"));
  if (!transcript) return c.json({ error: "Transcript not found" }, 404);
  return c.json(transcript);
});

app.post("/api/podcast/transcripts/:id", async (c) => {
  const episodeId = c.req.param("id");
  const existing = getPodcastTranscript(episodeId);
  try {
    const transcript = await transcribePodcastEpisode(episodeId);
    return c.json(transcript, existing ? 200 : 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    const status = message.includes("not found") ? 404 : 502;
    return c.json({ error: message }, status);
  }
});

app.get("/api/podcast/rss/episodes", async (c) => {
  try {
    return c.json(await listRssEpisodes());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load RSS feeds";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/podcast/rss/feed-episodes", async (c) => {
  const feedUrl = c.req.query("url")?.trim();
  if (!feedUrl) return c.json({ error: "Feed URL is required" }, 400);

  try {
    new URL(feedUrl);
  } catch {
    return c.json({ error: "Invalid feed URL" }, 400);
  }

  try {
    return c.json(await fetchFeedEpisodes(feedUrl));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load feed episodes";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/podcast/rss/feed-art", async (c) => {
  const feedUrl = c.req.query("url")?.trim();
  if (!feedUrl) return c.json({ error: "Feed URL is required" }, 400);

  try {
    new URL(feedUrl);
  } catch {
    return c.json({ error: "Invalid feed URL" }, 400);
  }

  try {
    const proxied = await proxyFeedCover(feedUrl);
    if (!proxied) return c.json({ error: "Artwork not found" }, 404);
    return c.body(proxied.body, 200, {
      "Content-Type": proxied.contentType,
      "Cache-Control": "public, max-age=86400",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load feed artwork";
    return c.json({ error: message }, 502);
  }
});

app.post("/api/podcast/remote", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    provider?: string;
    token?: string;
    query?: string;
    kind?: string;
  };
  if (body.provider !== "spotify" && body.provider !== "apple-podcasts" && body.provider !== "audible") {
    return c.json({ error: "Invalid podcast provider" }, 400);
  }
  const kind =
    body.kind === "podcast" || body.kind === "audiobook" || body.kind === "all" ? body.kind : "all";
  return c.json(
    listRemotePodcastEpisodes({
      provider: body.provider,
      token: body.token,
      query: body.query,
      kind,
    }),
  );
});

app.get("/api/podcast/stream/:id", async (c) => {
  const episodeId = c.req.param("id");
  if (episodeId.startsWith("rss-")) {
    const proxied = await proxyRssEnclosure(episodeId, c.req.header("range"));
    if (!proxied) return c.json({ error: "Episode not found" }, 404);
    return c.body(proxied.body, proxied.status as 200 | 206, proxied.headers);
  }

  const resolved = statLocalEpisode(episodeId);
  if (!resolved) return c.json({ error: "Episode not found" }, 404);

  const range = c.req.header("range");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
    if (!match) return c.json({ error: "Invalid range" }, 416);

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : resolved.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= resolved.size) {
      return c.json({ error: "Invalid range" }, 416);
    }

    const stream = createSafeReadStream(resolved.absPath, { start, end });
    attachStreamAbort(stream, c.req.raw.signal);
    return c.body(stream as unknown as ReadableStream, 206, {
      "Content-Range": `bytes ${start}-${end}/${resolved.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": resolved.mimeType,
    });
  }

  const stream = createSafeReadStream(resolved.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream as unknown as ReadableStream, 200, {
    "Content-Length": String(resolved.size),
    "Content-Type": resolved.mimeType,
    "Accept-Ranges": "bytes",
  });
});

app.get("/api/podcast/art/:id", async (c) => {
  const episodeId = c.req.param("id");
  if (episodeId.startsWith("rss-")) {
    const proxied = await proxyRssCover(episodeId);
    if (!proxied) return c.json({ error: "Artwork not found" }, 404);
    return c.body(proxied.body, 200, {
      "Content-Type": proxied.contentType,
      "Cache-Control": "public, max-age=86400",
    });
  }

  const art = resolveTrackArt(episodeId);
  if (!art) {
    const episode = resolveLocalEpisode(c.req.param("id"));
    if (!episode?.episode.musicTrackId) return c.json({ error: "Artwork not found" }, 404);
    const trackArt = resolveTrackArt(episode.episode.musicTrackId);
    if (!trackArt) return c.json({ error: "Artwork not found" }, 404);
    const stream = createSafeReadStream(trackArt.absPath);
    attachStreamAbort(stream, c.req.raw.signal);
    return c.body(stream as unknown as ReadableStream, 200, {
      "Content-Type": trackArt.mime,
      "Cache-Control": "public, max-age=86400",
    });
  }

  const stream = createSafeReadStream(art.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream as unknown as ReadableStream, 200, {
    "Content-Type": art.mime,
    "Cache-Control": "public, max-age=86400",
  });
});

app.get("/api/drive/entries/:id", requireCap("files:read"), (c) => {
  try {
    return c.json(filesService.get(c.req.param("id")));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

app.get("/api/drive/content/:id", requireCap("files:read"), (c) => {
  try {
    return c.json(filesService.readContent(c.req.param("id")));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

app.get("/api/drive/blob/:id", requireCap("files:read"), (c) => {
  try {
    const { entry, data } = filesService.readBlob(c.req.param("id"));
    return c.body(new Uint8Array(data), 200, {
      "Content-Type": entry.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${entry.name.replace(/"/g, "")}"`,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

app.put("/api/drive/content/:id", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { content: string };
  try {
    return c.json(filesService.writeContent(c.req.param("id"), body.content ?? ""));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.post("/api/drive/entries", requireCap("files:write"), async (c) => {
  try {
    const body = (await c.req.json()) as FileCreateInput;
    return c.json(filesService.create(body), 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.patch("/api/drive/entries/:id", requireCap("files:write"), async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { name?: string; starred?: boolean; parentId?: string | null };
  try {
    if (body.name !== undefined) filesService.rename(id, body.name);
    if (body.starred !== undefined) filesService.star(id, body.starred);
    if (body.parentId !== undefined) filesService.move(id, body.parentId);
    return c.json(filesService.get(id));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.post("/api/drive/entries/:id/trash", requireCap("files:write"), (c) => {
  try {
    return c.json(filesService.trash(c.req.param("id")));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.post("/api/drive/entries/:id/restore", requireCap("files:write"), (c) => {
  try {
    return c.json(filesService.restore(c.req.param("id")));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.delete("/api/drive/entries/:id", requireCap("files:write"), (c) => {
  try {
    return c.json({ deleted: filesService.delete(c.req.param("id")) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ── Calendar (os.calendar@1 — the OS event store) ────────────────────────────

app.get("/api/calendar/events", (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  try {
    return c.json(
      calendarService.list({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
    );
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.get("/api/calendar/events/:id", (c) => {
  const event = calendarService.get(c.req.param("id"));
  if (!event) return c.json({ error: "Event not found" }, 404);
  return c.json(event);
});

app.post("/api/calendar/events", async (c) => {
  try {
    const body = (await c.req.json()) as CalendarEventInput;
    return c.json(calendarService.create(body), 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.patch("/api/calendar/events/:id", async (c) => {
  try {
    const body = (await c.req.json()) as Partial<CalendarEventInput>;
    return c.json(calendarService.update(c.req.param("id"), body));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.delete("/api/calendar/events/:id", (c) => {
  try {
    return c.json({ deleted: calendarService.delete(c.req.param("id")) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ── Tasks (os.tasks@1 — the OS task store) ───────────────────────────────────

app.get("/api/tasks", (c) => {
  const status = c.req.query("status");
  const archived = c.req.query("archived");
  const dueBefore = c.req.query("dueBefore");
  const dueAfter = c.req.query("dueAfter");
  try {
    return c.json(
      tasksService.list({
        ...(status ? { status: status as TaskStatus } : {}),
        ...(archived === "true" ? { archived: true } : archived === "false" ? { archived: false } : {}),
        ...(dueBefore ? { dueBefore } : {}),
        ...(dueAfter ? { dueAfter } : {}),
      }),
    );
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.get("/api/tasks/:id", (c) => {
  const task = tasksService.get(c.req.param("id"));
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(task);
});

app.post("/api/tasks", async (c) => {
  try {
    const body = (await c.req.json()) as TaskInput;
    return c.json(tasksService.create(body), 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.patch("/api/tasks/:id", async (c) => {
  try {
    const body = (await c.req.json()) as Partial<TaskInput>;
    return c.json(tasksService.update(c.req.param("id"), body));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.post("/api/tasks/:id/complete", async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as { completed?: boolean };
    return c.json(tasksService.complete(c.req.param("id"), body.completed !== false));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.delete("/api/tasks/:id", (c) => {
  try {
    return c.json({ deleted: tasksService.delete(c.req.param("id")) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ── Board (os.board@1 — SDLC work items) ─────────────────────────────────────

app.get("/api/board/items", (c) => {
  const columnId = c.req.query("columnId");
  const projectId = c.req.query("projectId");
  const archived = c.req.query("archived");
  try {
    return c.json(
      boardService.list({
        ...(columnId ? { columnId: columnId as BoardColumnId } : {}),
        ...(projectId === "null"
          ? { projectId: null }
          : projectId
            ? { projectId }
            : {}),
        ...(archived === "true" ? { archived: true } : { archived: false }),
      }),
    );
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.get("/api/board/items/:id", (c) => {
  const item = boardService.get(c.req.param("id"));
  if (!item) return c.json({ error: "Work item not found" }, 404);
  return c.json(item);
});

app.post("/api/board/items", async (c) => {
  try {
    const body = (await c.req.json()) as WorkItemInput;
    return c.json(boardService.create(body), 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.patch("/api/board/items/:id", async (c) => {
  try {
    const body = (await c.req.json()) as Partial<WorkItemInput>;
    return c.json(boardService.update(c.req.param("id"), body));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.post("/api/board/items/:id/move", async (c) => {
  try {
    const body = (await c.req.json()) as { columnId: BoardColumnId; position?: number };
    return c.json(boardService.move(c.req.param("id"), body.columnId, body.position));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

app.delete("/api/board/items/:id", (c) => {
  try {
    return c.json({ deleted: boardService.delete(c.req.param("id")) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ── Projects (open folders) ──────────────────────────────────────────────────

app.get("/api/projects", (c) => c.json(projectStore.list()));

app.post("/api/projects", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { path: string };
  try {
    const project = projectStore.add(body.path);
    if (workspaceStore.get().backend !== "local") {
      workspaceStore.setBackend("local");
    }
    workspaceStore.setPrimary(body.path);
    return c.json(project);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Invalid path" }, 400);
  }
});

/** Clone owner/repo or a URL into the managed projects directory, then register it. */
app.post("/api/projects/clone-git", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { repo: string; branch?: string };
  if (!body.repo?.trim()) return c.json({ error: "repo is required" }, 400);
  try {
    const user = currentUser(c);
    const token = githubGateway.accessTokenFor(user.id);
    const dest = await cloneGitRepo(body.repo, body.branch, token);
    const project = projectStore.add(dest);
    workspaceStore.setBackend("local");
    workspaceStore.setPrimary(dest);
    return c.json(project);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Clone failed" }, 400);
  }
});

app.post("/api/projects/active", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { id: string | null };
  try {
    projectStore.setActive(body.id);
    if (body.id === null) {
      workspaceStore.clearToSandbox();
    } else {
      const project = projectStore.list().projects.find((p) => p.id === body.id);
      if (project) {
        if (workspaceStore.get().backend !== "local") {
          workspaceStore.setBackend("local");
        }
        workspaceStore.setPrimary(project.path);
      }
    }
    return c.json(projectStore.list());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Unknown project" }, 400);
  }
});

app.delete("/api/projects/:id", requireCap("files:write"), (c) => {
  projectStore.remove(c.req.param("id"));
  return c.json(projectStore.list());
});

/**
 * Folder browser for the "Open Folder" picker — directories only, one level
 * at a time, starting from the home directory. Flags git repos so the picker
 * can badge them.
 */
app.get("/api/fs/browse", requireCap("files:read"), async (c) => {
  const requested = c.req.query("path") || os.homedir();
  const abs = path.resolve(requested);
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch (err) {
    // macOS TCC guards Documents/Desktop/Downloads: readdir fails with EPERM
    // until the app that launched this server is granted disk access.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES") {
      return c.json(
        {
          error: `macOS is blocking access to ${abs}. Grant Full Disk Access to the app running the Arco server (System Settings → Privacy & Security → Full Disk Access), then restart the server.`,
        },
        403,
      );
    }
    return c.json({ error: `Cannot read directory: ${abs}` }, 400);
  }
  const dirs = await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map(async (e) => {
        const full = path.join(abs, e.name);
        const isRepo = await fs
          .stat(path.join(full, ".git"))
          .then(() => true)
          .catch(() => false);
        return { name: e.name, path: full, isRepo };
      }),
  );
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  const parent = path.dirname(abs);
  const listing: DirListing = { path: abs, parent: parent === abs ? null : parent, dirs };
  return c.json(listing);
});

// ── Git (runs in the active project root) ───────────────────────────────────

app.get("/api/git/info", async (c) => c.json(await gitInfo()));

app.get("/api/git/diff", async (c) => {
  const rel = c.req.query("path");
  if (!rel) return c.json({ error: "path is required" }, 400);
  return c.json(await gitFileDiff(rel));
});

app.post("/api/git/commit", requireCap("git:write"), async (c) => {
  const body = (await c.req.json()) as { message: string; paths?: string[] };
  if (!body.message?.trim()) return c.json({ error: "Commit message is required" }, 400);
  try {
    return c.json(await gitCommit(body.message.trim(), body.paths));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Commit failed" }, 400);
  }
});

app.post("/api/git/push", requireCap("git:write"), async (c) => {
  try {
    return c.json(await gitPush());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Push failed" }, 400);
  }
});

app.post("/api/git/pull", requireCap("git:write"), async (c) => {
  try {
    return c.json(await gitPull());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Pull failed" }, 400);
  }
});

app.get("/api/git/branches", async (c) => {
  try {
    return c.json(await gitBranches());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Branches failed" }, 400);
  }
});

app.post("/api/git/checkout", requireCap("git:write"), async (c) => {
  const body = (await c.req.json()) as { branch: string; create?: boolean };
  try {
    return c.json(await gitCheckout(body.branch, body.create === true));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Checkout failed" }, 400);
  }
});

app.get("/api/git/worktrees", async (c) => {
  try {
    return c.json(await gitWorktrees());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Worktrees failed" }, 400);
  }
});

app.post("/api/git/worktrees", requireCap("git:write"), async (c) => {
  const body = (await c.req.json()) as { path: string; branch: string };
  if (!body.path?.trim() || !body.branch?.trim()) {
    return c.json({ error: "path and branch are required" }, 400);
  }
  try {
    return c.json(await gitWorktreeAdd(body.path, body.branch));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Worktree add failed" }, 400);
  }
});

app.delete("/api/git/worktrees", requireCap("git:write"), async (c) => {
  const body = (await c.req.json()) as { path: string };
  if (!body.path?.trim()) return c.json({ error: "path is required" }, 400);
  try {
    return c.json(await gitWorktreeRemove(body.path));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Worktree remove failed" }, 400);
  }
});

// ── Studio workspace (multi-root) ───────────────────────────────────────────

app.get("/api/workspace", (c) => c.json(workspaceStore.get()));

app.put("/api/workspace", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as Partial<import("../shared/types.js").WorkspaceState>;
  try {
    return c.json(
      workspaceStore.set({
        backend: body.backend ?? "local",
        remoteProfileId: body.remoteProfileId ?? null,
        roots: body.roots ?? [],
        worktreePath: body.worktreePath ?? null,
      }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Invalid workspace" }, 400);
  }
});

app.post("/api/workspace/backend", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as {
    backend: "local" | "drive" | "remote";
    remoteProfileId?: string | null;
  };
  try {
    return c.json(workspaceStore.setBackend(body.backend, body.remoteProfileId ?? null));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Backend switch failed" }, 400);
  }
});

app.post("/api/workspace/roots", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as {
    location: string;
    name?: string;
    asPrimary?: boolean;
  };
  if (!body.location?.trim()) return c.json({ error: "location is required" }, 400);
  try {
    if (body.asPrimary || workspaceStore.get().roots.length === 0) {
      return c.json(workspaceStore.setPrimary(body.location, body.name));
    }
    return c.json(workspaceStore.addRoot(body.location, body.name));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Add root failed" }, 400);
  }
});

app.delete("/api/workspace/roots/:id", requireCap("files:write"), (c) => {
  try {
    return c.json(workspaceStore.removeRoot(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Remove root failed" }, 400);
  }
});

app.post("/api/workspace/primary", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { id: string };
  try {
    return c.json(workspaceStore.setPrimaryId(body.id));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Set primary failed" }, 400);
  }
});

app.post("/api/workspace/worktree", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { path: string | null };
  try {
    return c.json(workspaceStore.setWorktreePath(body.path));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Set worktree failed" }, 400);
  }
});

app.post("/api/workspace/sandbox", requireCap("files:write"), (c) => {
  return c.json(workspaceStore.clearToSandbox());
});

// ── Web apps (dock-mounted user projects) ────────────────────────────────────

app.get("/api/webapps", (c) => c.json(webAppStore.list()));

app.post("/api/webapps", requireCap("apps:manage"), async (c) => {
  const body = (await c.req.json()) as {
    name: string;
    url: string;
    command?: string;
    projectPath?: string;
  };
  if (!body.name?.trim() || !body.url?.trim()) {
    return c.json({ error: "name and url are required" }, 400);
  }
  // A launch command runs arbitrary shell on the host — registering one is
  // an exec-level act even though managing plain URLs is not.
  if (body.command?.trim() && !c.get("user").capabilities.includes("exec")) {
    return c.json({ error: "Missing permission: exec (required to register launch commands)" }, 403);
  }
  return c.json(
    webAppStore.add({
      name: body.name.trim(),
      url: body.url.trim(),
      ...(body.command?.trim() ? { command: body.command.trim() } : {}),
      ...(body.projectPath?.trim() ? { projectPath: body.projectPath.trim() } : {}),
    }),
  );
});

app.delete("/api/webapps/:id", requireCap("apps:manage"), (c) => {
  webAppStore.remove(c.req.param("id"));
  return c.json({ ok: true });
});

/**
 * Launch probe: report whether the app's URL responds; if it doesn't and the
 * registration includes a start command, spawn it (once — clients poll this
 * endpoint and we mustn't stack servers, so "starting" is tracked per app).
 */
const startingApps = new Set<string>();

app.post("/api/webapps/:id/launch", async (c) => {
  const webApp = webAppStore.get(c.req.param("id"));
  if (!webApp) return c.json({ error: "Not found" }, 404);

  const running = await fetch(webApp.url, { signal: AbortSignal.timeout(1500) })
    .then(() => true)
    .catch(() => false);
  if (running) {
    startingApps.delete(webApp.id);
    return c.json({ running: true, starting: false });
  }
  if (webApp.command && !startingApps.has(webApp.id)) {
    startingApps.add(webApp.id);
    startRun(webApp.command, webApp.projectPath);
  }
  return c.json({ running: false, starting: startingApps.has(webApp.id) });
});

// ── Installed apps (manifest-based platform apps) ────────────────────────────

app.get("/api/installed-apps", (c) =>
  c.json(
    installedAppStore.list().map((a) => ({
      ...a,
      grants: grantStore.grants(a.manifest.id),
    })),
  ),
);

/** Install from a manifest URL or a raw manifest object. Same id = upgrade. */
app.post("/api/installed-apps", requireCap("apps:manage"), async (c) => {
  const body = (await c.req.json()) as { url?: string; manifest?: unknown };
  let raw = body.manifest;
  if (!raw && body.url?.trim()) {
    try {
      const res = await fetch(body.url.trim(), { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return c.json({ error: `Manifest fetch failed: ${res.status}` }, 400);
      raw = await res.json();
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Manifest fetch failed" }, 400);
    }
  }
  if (!raw) return c.json({ error: "Provide a manifest or a manifest url" }, 400);
  const { manifest, error } = parseManifest(raw);
  if (!manifest) return c.json({ error }, 400);
  const record = installedAppStore.install(manifest, body.url ? "url" : "manifest");
  return c.json({ ...record, grants: grantStore.grants(manifest.id) });
});

app.patch("/api/installed-apps/:id", requireCap("apps:manage"), async (c) => {
  const body = (await c.req.json()) as { enabled?: boolean };
  const record = installedAppStore.setEnabled(c.req.param("id"), body.enabled !== false);
  if (!record) return c.json({ error: "Not found" }, 404);
  return c.json({ ...record, grants: grantStore.grants(record.manifest.id) });
});

app.delete("/api/installed-apps/:id", requireCap("apps:manage"), (c) => {
  installedAppStore.uninstall(c.req.param("id"));
  return c.json({ ok: true });
});

app.put("/api/installed-apps/:id/grants", requireCap("apps:manage"), async (c) => {
  const body = (await c.req.json()) as { key: string; state: "granted" | "denied" | "ask" };
  if (!body.key || !["granted", "denied", "ask"].includes(body.state)) {
    return c.json({ error: "key and state (granted|denied|ask) are required" }, 400);
  }
  grantStore.set(c.req.param("id"), body.key, body.state);
  return c.json({ grants: grantStore.grants(c.req.param("id")) });
});

/**
 * Mint a per-window bridge token. The AppHost attaches it to every forwarded
 * bridge call — app identity comes from this token, never from the app.
 */
app.post("/api/installed-apps/:id/token", (c) => {
  const record = installedAppStore.get(c.req.param("id"));
  if (!record || !record.enabled) return c.json({ error: "App not installed or disabled" }, 404);
  return c.json({ token: mintToken(record.manifest.id) });
});

// ── Bridge (the single choke point for app calls) ────────────────────────────

app.post("/api/bridge", async (c) => {
  const token = c.req.header("x-app-token") ?? "";
  const appId = resolveToken(token);
  if (!appId) return c.json({ error: "Invalid or expired bridge token" }, 403);
  const body = (await c.req.json()) as { method?: string; params?: Record<string, unknown> };
  try {
    const result = await dispatchAppBridge(appId, String(body.method ?? ""), body.params ?? {});
    return c.json({ result });
  } catch (err) {
    if (err instanceof BridgeError) return c.json({ error: err.message }, 403);
    return c.json({ error: err instanceof Error ? err.message : "Bridge call failed" }, 400);
  }
});

// ── Dev-server runs (Browser tab) ────────────────────────────────────────────

app.get("/api/runs", (c) => c.json(listRuns()));

app.post("/api/runs", requireCap("exec"), async (c) => {
  const body = (await c.req.json()) as { command: string };
  if (!body.command?.trim()) return c.json({ error: "command is required" }, 400);
  return c.json(startRun(body.command.trim()));
});

app.get("/api/runs/:id/log", requireCap("exec"), (c) => c.json({ log: runLog(c.req.param("id")) }));

app.delete("/api/runs/:id", requireCap("exec"), (c) => c.json({ ok: stopRun(c.req.param("id")) }));

// ── macOS integration ────────────────────────────────────────────────────────
//
// A browser page can't show OS permission prompts or native dialogs, but the
// local server can: it pops the real Finder folder chooser (which carries
// user-intent weight with TCC and triggers consent prompts), and deep-links
// into the Privacy & Security pane when access was already denied.

app.get("/api/system/workspace-features", async (c) => c.json(await getWorkspaceFeatures()));

app.post("/api/system/native-pick", requireCap("files:write"), async (c) => {
  try {
    const { stdout } = await execFileAsync(
      "osascript",
      ["-e", 'POSIX path of (choose folder with prompt "Open a folder in Arco")'],
      { timeout: 120_000 },
    );
    const picked = stdout.trim().replace(/\/$/, "");
    return c.json({ path: picked });
  } catch {
    // Cancelled dialog and script errors both land here — not exceptional.
    return c.json({ error: "No folder chosen" }, 400);
  }
});

app.post("/api/system/open-privacy-settings", requireCap("settings:write"), async (c) => {
  await execFileAsync("open", [
    "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
  ]);
  return c.json({ ok: true });
});

// ── Exec / policy confirmations ──────────────────────────────────────────────

app.post("/api/confirmations/:id", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { approved: boolean; remember?: string };
  const remember =
    body.remember === "session" || body.remember === "always" ? body.remember : undefined;
  const known = resolveConfirmation(c.req.param("id"), {
    approved: Boolean(body.approved),
    ...(remember ? { remember } : {}),
  });
  return c.json({ ok: known });
});

// ── Agent policy (which tools the agent may use, and how) ───────────────────

app.get("/api/agent-policy", requireCap("settings:write"), (c) =>
  c.json({ rules: policyStore.rules() }),
);

app.put("/api/agent-policy", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { key?: string; decision?: string | null };
  const key = body.key?.trim();
  if (!key) return c.json({ error: "key is required" }, 400);
  if (body.decision === null) {
    policyStore.remove(key);
  } else if (body.decision === "auto" || body.decision === "confirm" || body.decision === "deny") {
    policyStore.set(key, body.decision);
  } else {
    return c.json({ error: "decision must be auto|confirm|deny|null" }, 400);
  }
  return c.json({ rules: policyStore.rules() });
});

// ── Agent tools (built-in tool catalog + per-tool enable state) ─────────────

app.get("/api/agent-tools", (c) => c.json(describeSystemTools()));

// ── Audit log (read side — writes happen in the bridge and tool layer) ──────

app.get("/api/audit", requireCap("settings:write"), (c) => {
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 100), 1), 500);
  const caller = c.req.query("caller") || undefined;
  return c.json(readAudit(limit, caller));
});

// ── Skills (reusable instruction bundles for the agent) ─────────────────────

app.get("/api/skills", (c) => c.json(skillStore.list()));

app.get("/api/skills/proposals", (c) => c.json(skillStore.listProposals()));

app.post("/api/skills/proposals/:id/apply", requireCap("settings:write"), (c) => {
  const skill = skillStore.applyProposal(c.req.param("id"));
  if (!skill) return c.json({ error: "Not found or not applyable" }, 404);
  return c.json(skill);
});

app.post("/api/skills/proposals/:id/reject", requireCap("settings:write"), (c) => {
  const proposal = skillStore.rejectProposal(c.req.param("id"));
  if (!proposal) return c.json({ error: "Not found" }, 404);
  return c.json(proposal);
});

app.post("/api/skills/proposals/:id/quarantine", requireCap("settings:write"), (c) => {
  const proposal = skillStore.quarantineProposal(c.req.param("id"));
  if (!proposal) return c.json({ error: "Not found" }, 404);
  return c.json(proposal);
});

app.get("/api/skills/:id", (c) => {
  const skill = skillStore.get(c.req.param("id"));
  if (!skill) return c.json({ error: "Not found" }, 404);
  return c.json(skill);
});

app.post("/api/skills", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as {
    name?: string;
    description?: string;
    body?: string;
    gates?: string[];
  };
  if (!body.name?.trim() || !body.description?.trim() || !body.body?.trim()) {
    return c.json({ error: "name, description, and body are required" }, 400);
  }
  return c.json(
    skillStore.create({
      name: body.name.trim(),
      description: body.description.trim(),
      body: body.body,
      ...(Array.isArray(body.gates) ? { gates: body.gates.map(String) } : {}),
      source: "user",
    }),
  );
});

app.patch("/api/skills/:id", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as {
    name?: string;
    description?: string;
    body?: string;
    gates?: string[];
    enabled?: boolean;
  };
  const patch: Parameters<typeof skillStore.update>[1] = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.body === "string") patch.body = body.body;
  if (Array.isArray(body.gates)) patch.gates = body.gates.map(String);
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  const skill = skillStore.update(c.req.param("id"), patch);
  if (!skill) return c.json({ error: "Not found" }, 404);
  return c.json(skill);
});

app.delete("/api/skills/:id", requireCap("settings:write"), (c) => {
  if (!skillStore.remove(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Mail (Gmail OAuth + live proxy) ─────────────────────────────────────────

app.get("/api/mail/status", (c) => {
  const user = currentUser(c);
  const oauth = mailGateway.oauthStatus();
  return c.json({
    oauthConfigured: oauth.configured,
    oauth,
    accounts: mailGateway.listAccounts(user.id),
  });
});

app.put("/api/mail/oauth/config", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    clientId?: string;
    clientSecret?: string;
  };
  try {
    const oauth = mailGateway.saveOAuthSettings({
      clientId: body.clientId,
      clientSecret: body.clientSecret,
    });
    return c.json(oauth);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not save Google OAuth settings" },
      400,
    );
  }
});

app.delete("/api/mail/oauth/config", requireCap("settings:write"), (c) => {
  return c.json(mailGateway.clearOAuthSettings());
});

app.get("/api/mail/accounts", (c) => c.json(mailGateway.listAccounts(currentUser(c).id)));

app.delete("/api/mail/accounts/:id", (c) => {
  const ok = mailGateway.disconnect(currentUser(c).id, c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

app.post("/api/mail/accounts/password", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    imapHost?: string;
    imapPort?: number;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
  };
  try {
    const account = await mailGateway.connectWithPassword(currentUser(c).id, {
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      endpoints: {
        imapHost: body.imapHost,
        imapPort: body.imapPort,
        smtpHost: body.smtpHost,
        smtpPort: body.smtpPort,
        smtpSecure: body.smtpSecure,
      },
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect mail account" },
      400,
    );
  }
});

app.get("/api/mail/oauth/google/start", (c) => {
  if (!mailGateway.oauthConfigured()) {
    return c.json({ error: "Google OAuth is not configured on this server" }, 503);
  }
  const user = currentUser(c);
  const state = createOAuthState(user.id);
  return c.redirect(buildGoogleAuthUrl(state));
});

app.get("/api/mail/oauth/google/callback", async (c) => {
  const error = c.req.query("error");
  if (error) {
    return c.redirect(`${webOriginAfterOAuth()}/?mailError=${encodeURIComponent(error)}`);
  }
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) {
    return c.redirect(`${webOriginAfterOAuth()}/?mailError=missing_code`);
  }
  const userId = consumeOAuthState(state);
  if (!userId) {
    return c.redirect(`${webOriginAfterOAuth()}/?mailError=invalid_state`);
  }
  try {
    await mailStore.completeGoogleOAuth({ userId, code });
    return c.redirect(`${webOriginAfterOAuth()}/?mailConnected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return c.redirect(`${webOriginAfterOAuth()}/?mailError=${encodeURIComponent(message)}`);
  }
});

// ── GitHub (OAuth + repo picker) ─────────────────────────────────────────────

app.get("/api/github/status", (c) => {
  const user = currentUser(c);
  return c.json({
    oauthConfigured: githubGateway.oauthConfigured(),
    accounts: githubGateway.listAccounts(user.id),
  });
});

app.get("/api/github/accounts", (c) => c.json(githubGateway.listAccounts(currentUser(c).id)));

app.delete("/api/github/accounts/:id", requireCap("settings:write"), (c) => {
  const ok = githubGateway.disconnect(currentUser(c).id, c.req.param("id"));
  if (!ok) return c.json({ error: "Account not found" }, 404);
  return c.json({ ok: true });
});

app.post("/api/github/accounts/pat", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { token?: string };
  try {
    const account = await githubGateway.connectWithPat(currentUser(c).id, body.token ?? "");
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect GitHub account" },
      400,
    );
  }
});

app.get("/api/github/repos", async (c) => {
  const query = c.req.query("q") ?? undefined;
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    return c.json(
      await githubGateway.listRepos(currentUser(c).id, query, accountId),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not list repos" }, 400);
  }
});

app.get("/api/github/issue", async (c) => {
  const ref = c.req.query("ref") ?? c.req.query("url") ?? "";
  const accountId = c.req.query("accountId") ?? undefined;
  if (!ref.trim()) {
    return c.json({ error: "Missing issue ref (url or owner/repo#n)" }, 400);
  }
  try {
    return c.json(await githubGateway.fetchIssue(currentUser(c).id, ref, accountId));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not fetch issue" }, 400);
  }
});

app.get("/api/github/oauth/start", (c) => {
  if (!githubGateway.oauthConfigured()) {
    return c.json({ error: "GitHub OAuth is not configured on this server" }, 503);
  }
  const user = currentUser(c);
  const state = createGitHubOAuthState(user.id);
  return c.redirect(buildGitHubAuthUrl(state));
});

app.get("/api/github/oauth/callback", async (c) => {
  const error = c.req.query("error");
  if (error) {
    return c.redirect(`${githubWebOriginAfterOAuth()}/?githubError=${encodeURIComponent(error)}`);
  }
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) {
    return c.redirect(`${githubWebOriginAfterOAuth()}/?githubError=missing_code`);
  }
  const userId = consumeGitHubOAuthState(state);
  if (!userId) {
    return c.redirect(`${githubWebOriginAfterOAuth()}/?githubError=invalid_state`);
  }
  try {
    await githubStore.completeGitHubOAuth({ userId, code });
    return c.redirect(`${githubWebOriginAfterOAuth()}/?githubConnected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return c.redirect(`${githubWebOriginAfterOAuth()}/?githubError=${encodeURIComponent(message)}`);
  }
});

// ── Social (Bluesky / Mastodon / Nostr / X / Facebook live proxy) ─────────────

app.get("/api/social/status", (c) => {
  return c.json(socialGateway.status(currentUser(c).id));
});

app.get("/api/social/accounts", (c) => c.json(socialGateway.listAccounts(currentUser(c).id)));

app.delete("/api/social/accounts/:id", async (c) => {
  const ok = socialGateway.disconnect(currentUser(c).id, c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

app.post("/api/social/accounts/bluesky", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    handle?: string;
    appPassword?: string;
    service?: string;
  };
  try {
    const account = await socialGateway.connectWithAppPassword(currentUser(c).id, {
      handle: String(body.handle ?? ""),
      appPassword: String(body.appPassword ?? ""),
      service: body.service,
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect Bluesky account" },
      400,
    );
  }
});

app.post("/api/social/accounts/mastodon", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    instanceUrl?: string;
    accessToken?: string;
  };
  try {
    const account = await socialGateway.connectMastodon(currentUser(c).id, {
      instanceUrl: String(body.instanceUrl ?? ""),
      accessToken: String(body.accessToken ?? ""),
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect Mastodon account" },
      400,
    );
  }
});

app.post("/api/social/accounts/nostr", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    nsec?: string;
    relays?: string[] | string;
  };
  const relays = Array.isArray(body.relays)
    ? body.relays.map(String)
    : String(body.relays ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);
  try {
    const account = await socialGateway.connectWithNostrKey(currentUser(c).id, {
      nsec: String(body.nsec ?? ""),
      relays,
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect Nostr account" },
      400,
    );
  }
});

app.patch("/api/social/accounts/:id/relays", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    relays?: string[] | string;
  };
  const relays = Array.isArray(body.relays)
    ? body.relays.map(String)
    : String(body.relays ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);
  try {
    const account = socialGateway.updateNostrRelays(currentUser(c).id, c.req.param("id"), {
      relays,
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not update Nostr relays" },
      400,
    );
  }
});

app.post("/api/social/accounts/twitter", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { accessToken?: string };
  try {
    const account = await socialGateway.connectTwitter(currentUser(c).id, {
      accessToken: String(body.accessToken ?? ""),
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect X/Twitter account" },
      400,
    );
  }
});

app.post("/api/social/accounts/facebook", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    accessToken?: string;
    pageId?: string;
  };
  try {
    const account = await socialGateway.connectFacebook(currentUser(c).id, {
      accessToken: String(body.accessToken ?? ""),
      pageId: body.pageId ? String(body.pageId) : undefined,
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect Facebook account" },
      400,
    );
  }
});

app.post("/api/social/accounts/reddit", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    accessToken?: string;
    defaultSubreddit?: string;
  };
  try {
    const account = await socialGateway.connectReddit(currentUser(c).id, {
      accessToken: String(body.accessToken ?? ""),
      defaultSubreddit: body.defaultSubreddit ? String(body.defaultSubreddit) : undefined,
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect Reddit account" },
      400,
    );
  }
});

app.post("/api/social/accounts/bitsocial", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    rpcUrl?: string;
    communities?: string[] | string;
  };
  const communities = Array.isArray(body.communities)
    ? body.communities.map(String)
    : String(body.communities ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);
  try {
    const account = await socialGateway.connectBitsocial(currentUser(c).id, {
      rpcUrl: String(body.rpcUrl ?? ""),
      communities,
    });
    return c.json(account);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not connect Bitsocial account" },
      400,
    );
  }
});

app.get("/api/social/bitsocial/daemon", async (c) => {
  return c.json(await bitsocialDaemon.status());
});

app.post("/api/social/bitsocial/daemon/start", async (c) => {
  try {
    return c.json(await bitsocialDaemon.start());
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Could not start Bitsocial daemon" },
      500,
    );
  }
});

app.post("/api/social/bitsocial/daemon/stop", async (c) => {
  return c.json(await bitsocialDaemon.stop());
});

app.get("/api/social/bitsocial/daemon/logs", (c) => c.json({ lines: bitsocialDaemon.logs() }));

app.get("/api/social/feed", async (c) => {
  const cursor = c.req.query("cursor") ?? undefined;
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    return c.json(await socialGateway.getHomeFeed(currentUser(c).id, { cursor, accountId }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not load feed" }, 502);
  }
});

app.get("/api/social/profile", async (c) => {
  const actor = c.req.query("actor") ?? "";
  const cursor = c.req.query("cursor") ?? undefined;
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    return c.json(
      await socialGateway.getProfile(currentUser(c).id, { actor, cursor, accountId }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not load profile" }, 502);
  }
});

app.get("/api/social/thread", async (c) => {
  const uri = c.req.query("uri") ?? "";
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    return c.json(await socialGateway.getThread(currentUser(c).id, { uri, accountId }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not load thread" }, 502);
  }
});

app.get("/api/social/sidebar", async (c) => {
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    return c.json(await socialGateway.getSidebar(currentUser(c).id, { accountId }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not load sidebar" }, 502);
  }
});

app.get("/api/social/search", async (c) => {
  const query = c.req.query("q") ?? "";
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    return c.json(await socialGateway.searchActors(currentUser(c).id, { query, accountId }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not search" }, 502);
  }
});

app.post("/api/social/posts", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { text?: string; accountId?: string };
  try {
    return c.json(
      await socialGateway.createPost(currentUser(c).id, {
        text: String(body.text ?? ""),
        accountId: body.accountId,
      }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not create post" }, 400);
  }
});

app.post("/api/social/posts/reply", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    text?: string;
    parentUri?: string;
    parentCid?: string;
    rootUri?: string;
    rootCid?: string;
    accountId?: string;
  };
  try {
    return c.json(
      await socialGateway.replyToPost(currentUser(c).id, {
        text: String(body.text ?? ""),
        parentUri: String(body.parentUri ?? ""),
        parentCid: String(body.parentCid ?? ""),
        rootUri: String(body.rootUri ?? ""),
        rootCid: String(body.rootCid ?? ""),
        accountId: body.accountId,
      }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not reply" }, 400);
  }
});

app.post("/api/social/posts/like", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    uri?: string;
    cid?: string;
    unlike?: boolean;
    likeUri?: string;
    accountId?: string;
  };
  try {
    return c.json(
      await socialGateway.likePost(currentUser(c).id, {
        uri: String(body.uri ?? ""),
        cid: String(body.cid ?? ""),
        unlike: Boolean(body.unlike),
        likeUri: body.likeUri,
        accountId: body.accountId,
      }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not like post" }, 400);
  }
});

app.post("/api/social/posts/repost", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    uri?: string;
    cid?: string;
    unrepost?: boolean;
    repostUri?: string;
    accountId?: string;
  };
  try {
    return c.json(
      await socialGateway.repostPost(currentUser(c).id, {
        uri: String(body.uri ?? ""),
        cid: String(body.cid ?? ""),
        unrepost: Boolean(body.unrepost),
        repostUri: body.repostUri,
        accountId: body.accountId,
      }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not repost" }, 400);
  }
});

app.post("/api/social/actors/follow", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    did?: string;
    unfollow?: boolean;
    followUri?: string;
    accountId?: string;
  };
  try {
    return c.json(
      await socialGateway.followActor(currentUser(c).id, {
        did: String(body.did ?? ""),
        unfollow: Boolean(body.unfollow),
        followUri: body.followUri,
        accountId: body.accountId,
      }),
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not follow" }, 400);
  }
});

app.get("/api/mail/threads", async (c) => {
  const folder = (c.req.query("folder") ?? "inbox") as MailFolderId;
  const filter = (c.req.query("filter") ?? "all") as MailInboxFilter;
  const query = c.req.query("q") ?? undefined;
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    const threads = await mailGateway.listThreads(currentUser(c).id, {
      accountId,
      folder,
      query,
      filter,
    });
    return c.json(threads);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not load mail" }, 502);
  }
});

app.get("/api/mail/threads/:id", async (c) => {
  const accountId = c.req.query("accountId") ?? undefined;
  try {
    const thread = await mailGateway.getThread(currentUser(c).id, c.req.param("id"), accountId);
    void mailGateway.markRead(currentUser(c).id, c.req.param("id"), true, accountId).catch(() => {});
    return c.json(thread);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not load thread" }, 502);
  }
});

app.post("/api/mail/send", async (c) => {
  const body = (await c.req.json()) as {
    to?: string;
    subject?: string;
    body?: string;
    accountId?: string;
  };
  try {
    await mailGateway.send(
      currentUser(c).id,
      {
        to: String(body.to ?? ""),
        subject: String(body.subject ?? ""),
        body: String(body.body ?? ""),
      },
      body.accountId,
    );
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Send failed" }, 502);
  }
});

app.post("/api/mail/threads/:id/star", async (c) => {
  const body = (await c.req.json()) as { starred?: boolean; accountId?: string };
  try {
    await mailGateway.setStarred(
      currentUser(c).id,
      c.req.param("id"),
      body.starred === true,
      body.accountId,
    );
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not update star" }, 502);
  }
});

// ── MCP servers (external tool providers for the agent) ─────────────────────

app.get("/api/mcp-servers", (c) => c.json(mcpSupervisor.list()));

app.post("/api/mcp-servers", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { name?: string; transport?: unknown };
  const transport = parseTransport(body.transport);
  if (!body.name?.trim() || !transport) {
    return c.json({ error: "name and a valid transport (stdio command or http/sse url) are required" }, 400);
  }
  const cfg = mcpServerStore.add({ name: body.name.trim(), transport });
  await mcpSupervisor.sync(cfg.id);
  return c.json(mcpSupervisor.list().find((s) => s.config.id === cfg.id));
});

app.patch("/api/mcp-servers/:id", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as {
    name?: string;
    transport?: unknown;
    enabled?: boolean;
    disabledTools?: string[];
  };
  const patch: Parameters<typeof mcpServerStore.update>[1] = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (Array.isArray(body.disabledTools)) patch.disabledTools = body.disabledTools.map(String);
  if (body.transport !== undefined) {
    const transport = parseTransport(body.transport);
    if (!transport) return c.json({ error: "Invalid transport" }, 400);
    patch.transport = transport;
  }
  const cfg = mcpServerStore.update(id, patch);
  if (!cfg) return c.json({ error: "Not found" }, 404);
  // Connection-affecting edits need a reconnect; a disabledTools change
  // only affects the next tool assembly.
  if (patch.transport !== undefined || patch.enabled !== undefined) await mcpSupervisor.sync(id);
  return c.json(mcpSupervisor.list().find((s) => s.config.id === id));
});

app.delete("/api/mcp-servers/:id", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  await mcpSupervisor.remove(id);
  mcpServerStore.remove(id);
  return c.json({ ok: true });
});

app.post("/api/mcp-servers/:id/restart", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  if (!mcpServerStore.get(id)) return c.json({ error: "Not found" }, 404);
  await mcpSupervisor.restart(id);
  return c.json(mcpSupervisor.list().find((s) => s.config.id === id));
});

app.get("/api/mcp-servers/:id/log", requireCap("settings:write"), async (c) => {
  try {
    const content = await fs.readFile(mcpLogFile(c.req.param("id")), "utf-8");
    return c.json({ log: content.slice(-20_000) });
  } catch {
    return c.json({ log: "" });
  }
});

/** Validate a client-supplied transport into the discriminated union. */
function parseTransport(raw: unknown): import("../shared/types.js").McpTransport | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (t.kind === "stdio" && typeof t.command === "string" && t.command.trim()) {
    return {
      kind: "stdio",
      command: t.command.trim(),
      ...(Array.isArray(t.args) ? { args: t.args.map(String) } : {}),
      ...(t.env && typeof t.env === "object" ? { env: t.env as Record<string, string> } : {}),
    };
  }
  if ((t.kind === "http" || t.kind === "sse") && typeof t.url === "string" && t.url.trim()) {
    try {
      new URL(t.url);
    } catch {
      return null;
    }
    return {
      kind: t.kind,
      url: t.url.trim(),
      ...(t.headers && typeof t.headers === "object"
        ? { headers: t.headers as Record<string, string> }
        : {}),
    };
  }
  return null;
}

// ── Channels (external messaging: Telegram, …) ──────────────────────────────
//
// Config mutations require settings:write (like MCP servers); the gateway
// reconciles the live adapter after every connection-affecting change.
// Pairing approval is deliberately here — in the authenticated Settings
// surface — never on the channel itself.

app.get("/api/channels", (c) => c.json(channelGateway.list()));

app.get("/api/channels/catalog", (c) => c.json(CHANNEL_CATALOG));

app.post("/api/channels", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as {
    kind?: string;
    name?: string;
    token?: string;
    appToken?: string;
    options?: Record<string, string>;
  };
  if (!body.kind || !isChannelKind(body.kind)) {
    return c.json({ error: "unknown channel kind" }, 400);
  }
  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
  }
  const meta = CHANNEL_CATALOG.find((m) => m.kind === body.kind);
  const tokenRequired = meta?.fields.some((f) => f.key === "token" && f.required !== false) ?? true;
  // webchat: token optional room secret
  if (tokenRequired && body.kind !== "webchat" && !body.token?.trim()) {
    return c.json({ error: "token is required" }, 400);
  }
  if (body.kind === "slack" && !body.appToken?.trim()) {
    return c.json({ error: "Slack requires appToken (xapp-… Socket Mode token)" }, 400);
  }
  const cfg = channelStore.add({
    kind: body.kind,
    name: body.name.trim(),
    token: body.token?.trim() || (body.kind === "webchat" ? "webchat" : ""),
    ...(body.appToken?.trim() ? { appToken: body.appToken.trim() } : {}),
    ...(body.options ? { options: body.options } : {}),
  });
  await channelGateway.sync(cfg.id);
  return c.json(channelGateway.list().find((ch) => ch.config.id === cfg.id));
});

app.patch("/api/channels/:id", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as {
    name?: string;
    token?: string;
    appToken?: string;
    options?: Record<string, string>;
    enabled?: boolean;
    requireMention?: boolean;
  };
  const patch: Parameters<typeof channelStore.update>[1] = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.token === "string" && body.token.trim()) patch.token = body.token.trim();
  if (typeof body.appToken === "string") patch.appToken = body.appToken.trim();
  if (body.options && typeof body.options === "object") patch.options = body.options;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.requireMention === "boolean") patch.requireMention = body.requireMention;
  const cfg = channelStore.update(id, patch);
  if (!cfg) return c.json({ error: "Not found" }, 404);
  if (
    patch.token !== undefined ||
    patch.appToken !== undefined ||
    patch.options !== undefined ||
    patch.enabled !== undefined
  ) {
    await channelGateway.sync(id);
  }
  return c.json(channelGateway.list().find((ch) => ch.config.id === id));
});

/** WebChat client: post a message (triggers pairing / agent). */
app.post("/api/channels/:id/webchat/messages", async (c) => {
  const id = c.req.param("id");
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== "webchat" || !cfg.enabled) {
    return c.json({ error: "WebChat channel not found" }, 404);
  }
  const body = (await c.req.json()) as { chatId?: string; text?: string; label?: string };
  if (!body.chatId?.trim() || !body.text?.trim()) {
    return c.json({ error: "chatId and text required" }, 400);
  }
  pushWebhookInbound(id, {
    chatId: body.chatId.trim(),
    label: body.label?.trim() || "WebChat guest",
    text: body.text.trim(),
    isGroup: false,
    mentioned: true,
  });
  return c.json({ ok: true });
});

/** WebChat client: poll agent replies. */
app.get("/api/channels/:id/webchat/messages", async (c) => {
  const id = c.req.param("id");
  const chatId = c.req.query("chatId");
  if (!chatId) return c.json({ error: "chatId required" }, 400);
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== "webchat") return c.json({ error: "not found" }, 404);
  return c.json({ messages: webchatDrainReplies(id, chatId) });
});

app.delete("/api/channels/:id", requireCap("settings:write"), (c) => {
  const id = c.req.param("id");
  channelGateway.remove(id);
  channelStore.remove(id);
  return c.json({ ok: true });
});

app.post("/api/channels/:id/restart", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  if (!channelStore.get(id)) return c.json({ error: "Not found" }, 404);
  await channelGateway.restart(id);
  return c.json(channelGateway.list().find((ch) => ch.config.id === id));
});

app.post("/api/channels/:id/pairings/:code", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { approve?: boolean };
  const peer = channelStore.resolvePairing(id, c.req.param("code"), body.approve === true);
  if (body.approve && !peer) return c.json({ error: "Pairing not found" }, 404);
  // Tell the waiting sender they're in — best-effort, the approval stands
  // even if the channel is momentarily down.
  if (peer) {
    await channelGateway
      .send(id, peer.chatId, "You're paired. Say hello!")
      .catch(() => {});
  }
  return c.json(channelGateway.list().find((ch) => ch.config.id === id));
});

app.delete("/api/channels/:id/peers/:chatId", requireCap("settings:write"), (c) => {
  channelStore.removePeer(c.req.param("id"), c.req.param("chatId"));
  return c.json(channelGateway.list().find((ch) => ch.config.id === c.req.param("id")));
});

app.patch("/api/channels/:id/peers/:chatId", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const chatId = c.req.param("chatId");
  const body = (await c.req.json()) as { profileId?: string | null };
  if (!("profileId" in body)) {
    return c.json({ error: "profileId is required (string or null)" }, 400);
  }
  const profileId = body.profileId === null || body.profileId === "" ? null : body.profileId;
  if (profileId) {
    const { agentStore } = await import("./agents/agentStore.js");
    const profile = agentStore.get(profileId);
    if (!profile) return c.json({ error: "Agent profile not found" }, 404);
    if (!profile.enabled) return c.json({ error: "Agent profile is disabled" }, 400);
  }
  const peer = channelStore.updatePeer(id, chatId, { profileId });
  if (!peer) return c.json({ error: "Peer not found" }, 404);
  return c.json(channelGateway.list().find((ch) => ch.config.id === id));
});

/** Reef friends — mint / list / request / respond (channel must be running). */
app.get("/api/channels/:id/reef/friends", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== "reef") return c.json({ error: "not a reef channel" }, 404);
  const { getReefFriends } = await import("./channels/reef/runtime.js");
  const mgr = getReefFriends(id);
  if (!mgr) return c.json({ error: "Reef channel not running" }, 409);
  try {
    return c.json({ friends: await mgr.list() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

app.post("/api/channels/:id/reef/friends/mint", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== "reef") return c.json({ error: "not a reef channel" }, 404);
  const { getReefFriends } = await import("./channels/reef/runtime.js");
  const mgr = getReefFriends(id);
  if (!mgr) return c.json({ error: "Reef channel not running" }, 409);
  try {
    return c.json(await mgr.mintCode());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

app.post("/api/channels/:id/reef/friends/request", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== "reef") return c.json({ error: "not a reef channel" }, 404);
  const body = (await c.req.json()) as { peer?: string; code?: string };
  if (!body.peer?.trim()) return c.json({ error: "peer required" }, 400);
  const { getReefFriends } = await import("./channels/reef/runtime.js");
  const mgr = getReefFriends(id);
  if (!mgr) return c.json({ error: "Reef channel not running" }, 409);
  try {
    const result = await mgr.request(body.peer.trim(), body.code?.trim() || undefined);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

app.post("/api/channels/:id/reef/friends/respond", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== "reef") return c.json({ error: "not a reef channel" }, 404);
  const body = (await c.req.json()) as { peer?: string; accept?: boolean };
  if (!body.peer?.trim() || typeof body.accept !== "boolean") {
    return c.json({ error: "peer and accept required" }, 400);
  }
  const { getReefFriends } = await import("./channels/reef/runtime.js");
  const mgr = getReefFriends(id);
  if (!mgr) return c.json({ error: "Reef channel not running" }, 409);
  try {
    if (body.accept) {
      await mgr.reconcileApproved([body.peer.trim()]);
    } else {
      await mgr.remove(body.peer.trim());
    }
    return c.json({ friends: await mgr.list() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

// ── Outward MCP (external agents drive Arco's intents) ──────────────────────
//
// /mcp sits OUTSIDE /api on purpose: it authenticates with scoped bearer
// tokens (externalClients), never with a user session cookie. Stateless
// JSON mode — each POST is a complete MCP exchange.

app.post("/mcp", async (c) => {
  const bearer = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const body = await c.req.json().catch(() => undefined);
  const { incoming, outgoing } = c.env as unknown as HttpBindings;
  await handleOutwardMcp(incoming, outgoing, body, bearer);
  return RESPONSE_ALREADY_SENT;
});

app.get("/mcp", (c) =>
  c.json({ error: "This MCP endpoint is stateless — use POST with JSON-RPC" }, 405),
);

// ── External access management (Settings → External access) ─────────────────

app.get("/api/external-access", requireCap("settings:write"), (c) =>
  c.json(externalClients.info()),
);

app.put("/api/external-access", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { enabled?: boolean };
  externalClients.setEnabled(body.enabled === true);
  return c.json(externalClients.info());
});

app.post("/api/external-access/clients", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { name?: string; scope?: string };
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);
  const scope = body.scope === "readwrite" ? "readwrite" : "read";
  // The token appears in this response and nowhere else — the store only
  // ever lists previews afterwards.
  return c.json(externalClients.mint(body.name.trim(), scope));
});

app.patch("/api/external-access/clients/:id", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { enabled?: boolean; scope?: string };
  const ok = externalClients.update(c.req.param("id"), {
    ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
    ...(body.scope === "read" || body.scope === "readwrite" ? { scope: body.scope } : {}),
  });
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json(externalClients.info());
});

app.delete("/api/external-access/clients/:id", requireCap("settings:write"), (c) => {
  externalClients.revoke(c.req.param("id"));
  return c.json(externalClients.info());
});

// ── Capability providers (default apps per contract) ────────────────────────

app.get("/api/capability-providers", (c) => {
  const providers = getProviders();
  const installed = installedAppStore.list();
  return c.json(
    Object.keys(CONTRACTS).map((contractId) => ({
      contractId,
      provider: providers[contractId] ?? "system",
      // Who could provide this contract: the system service plus any enabled
      // installed app that declares `implements: [contractId]`.
      options: [
        { id: "system", name: "System" },
        ...installed
          .filter((a) => a.enabled && a.manifest.implements?.includes(contractId))
          .map((a) => ({ id: a.manifest.id, name: a.manifest.name })),
      ],
    })),
  );
});

app.put("/api/capability-providers", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { contractId?: string; providerId?: string };
  if (!body.contractId || !CONTRACTS[body.contractId]) {
    return c.json({ error: "Unknown contractId" }, 400);
  }
  if (!body.providerId) return c.json({ error: "providerId is required" }, 400);
  setProvider(body.contractId, body.providerId);
  return c.json({ ok: true });
});

// ── Client requests (agent cursor & other shell-executed tool work) ─────────

app.post("/api/client-requests/:id", requireCap("chat"), async (c) => {
  const result = (await c.req.json()) as unknown;
  const known = resolveClientRequest(c.req.param("id"), result);
  return c.json({ ok: known });
});

// ── Terminal ─────────────────────────────────────────────────────────────────

app.post("/api/exec", requireCap("exec"), async (c) => {
  const body = (await c.req.json()) as { command: string };
  return c.json(await runExec(body.command ?? ""));
});

// ── Settings ─────────────────────────────────────────────────────────────────

app.get("/api/settings", (c) => c.json(maskSettings(loadSettings())));

app.get("/api/doctor", (c) =>
  c.json({
    ok: true,
    steps: [
      {
        id: "info",
        status: "ok" as const,
        detail: "POST /api/doctor to run repair migrations",
      },
    ],
  }),
);

app.post("/api/doctor", requireCap("settings:write"), async (c) => c.json(await runDoctor()));

app.put("/api/settings", requireCap("settings:write"), async (c) => {
  const patch = (await c.req.json()) as Partial<Settings>;
  // A masked key echoed back from the client must not clobber the real one.
  if (patch.apiKey && patch.apiKey.startsWith("••••")) delete patch.apiKey;
  if (patch.cursorApiKey && patch.cursorApiKey.startsWith("••••")) delete patch.cursorApiKey;
  if (patch.apiKeys) {
    const saved = loadSettings().apiKeys ?? {};
    patch.apiKeys = Object.fromEntries(
      Object.entries({ ...saved, ...patch.apiKeys }).map(([ref, key]) => [
        ref,
        key.startsWith("••••") ? (saved[ref] ?? "") : key,
      ]),
    );
  }
  if (patch.agentBackends) {
    // A masked apiKey echoed back for an existing backend must not clobber the real one.
    const saved = new Map(loadSettings().agentBackends.map((b) => [b.id, b]));
    patch.agentBackends = patch.agentBackends.map((b) => ({
      ...b,
      apiKey: b.apiKey.startsWith("••••") ? (saved.get(b.id)?.apiKey ?? "") : b.apiKey,
    }));
  }
  // Agent config changes tear down live ACP/Cursor/OpenHands/kosmos-remote
  // runs so the next turn respawns with the new command/connection; running
  // turns fail fast rather than continuing on stale settings.
  if (
    patch.agent !== undefined ||
    patch.acpCommand !== undefined ||
    patch.cursorApiKey !== undefined ||
    patch.cursorModel !== undefined ||
    patch.cursorRuntime !== undefined ||
    patch.cursorRepoUrl !== undefined ||
    patch.agentBackends !== undefined ||
    patch.activeAgentBackendId !== undefined
  ) {
    stopAllAcpRuns();
    stopAllCursorRuns();
    stopAllOpenhandsRuns();
    stopAllKosmosRemoteRuns();
  }
  const merged = saveSettings(patch);
  // Legacy write path: keep the model registry's agent.chat slot in step
  // with the settings block (docs/model-hub-plan.md migration mirror).
  if (patch.provider !== undefined || patch.baseUrl !== undefined || patch.model !== undefined) {
    modelStore.syncFromSettings(merged);
  }
  return c.json(maskSettings(merged));
});

// ── Cursor connection ────────────────────────────────────────────────────────

app.post("/api/cursor/test", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { apiKey?: string };
  return c.json(await testCursorConnection(body.apiKey));
});

app.get("/api/cursor/models", requireCap("settings:write"), async (c) => {
  try {
    const models = await listCursorModels();
    return c.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list Cursor models";
    return c.json({ error: message, models: [] as { id: string; displayName: string }[] }, 400);
  }
});

// ── Remote agent backends (OpenHands + kosmos) ──────────────────────────────
//
// A lightweight authenticated no-op, also reachable with a scoped
// external-client bearer token (see requireAuth) — used by testKosmosConnection
// to validate a remote kosmos backend's host + token before it's saved.
app.get("/api/remote/ping", (c) => c.json({ ok: true }));

app.post("/api/agent-backends/test", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string;
    host?: string;
    apiKey?: string;
  };
  if (body.kind === "kosmos") {
    return c.json(await testKosmosConnection(body.host ?? "", body.apiKey ?? ""));
  }
  return c.json(await testOpenhandsConnection(body.host ?? "", body.apiKey));
});

app.post("/api/agent-backends/:id/test", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const settings = loadSettings();
  const backend = settings.agentBackends.find((b) => b.id === id);
  if (!backend) return c.json({ error: "Backend not found" }, 404);
  if (backend.kind === "kosmos") {
    return c.json(await testKosmosConnection(backend.host, backend.apiKey));
  }
  return c.json(await testOpenhandsConnection(backend.host, backend.apiKey));
});

app.get("/api/agent-backends", requireCap("settings:write"), (c) => {
  const settings = loadSettings();
  return c.json({
    backends: settings.agentBackends.map((b) => ({ ...b, apiKey: b.apiKey ? "••••" : "" })),
    activeId: settings.activeAgentBackendId,
  });
});

app.post("/api/agent-backends", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as Omit<AgentBackend, "id">;
  if (body.kind !== "openhands" && body.kind !== "kosmos") {
    return c.json({ error: "kind must be openhands or kosmos" }, 400);
  }
  if (!body.host?.trim()) return c.json({ error: "Host is required" }, 400);
  const backend: AgentBackend = {
    id: crypto.randomUUID(),
    name: body.name?.trim() || body.host.trim(),
    kind: body.kind,
    host: body.host.trim(),
    apiKey: body.apiKey?.trim() ?? "",
    ...(body.kind === "openhands" ? { variant: body.variant === "cloud" ? "cloud" : "local" } : {}),
  };
  const settings = loadSettings();
  stopAllOpenhandsRuns();
  stopAllKosmosRemoteRuns();
  const merged = saveSettings({
    agentBackends: [...settings.agentBackends, backend],
    activeAgentBackendId: backend.id,
  });
  return c.json({ backend, activeId: merged.activeAgentBackendId });
});

app.post("/api/agent-backends/:id/activate", requireCap("settings:write"), (c) => {
  const id = c.req.param("id");
  const settings = loadSettings();
  if (!settings.agentBackends.some((b) => b.id === id)) {
    return c.json({ error: "Backend not found" }, 404);
  }
  stopAllOpenhandsRuns();
  stopAllKosmosRemoteRuns();
  const merged = saveSettings({ activeAgentBackendId: id });
  return c.json({ activeId: merged.activeAgentBackendId });
});

app.delete("/api/agent-backends/:id", requireCap("settings:write"), (c) => {
  const id = c.req.param("id");
  const settings = loadSettings();
  const remaining = settings.agentBackends.filter((b) => b.id !== id);
  stopAllOpenhandsRuns();
  stopAllKosmosRemoteRuns();
  const merged = saveSettings({
    agentBackends: remaining,
    activeAgentBackendId: settings.activeAgentBackendId === id ? null : settings.activeAgentBackendId,
  });
  return c.json({ backends: merged.agentBackends, activeId: merged.activeAgentBackendId });
});

app.post("/api/openrouter/models", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { apiKey?: string };
  try {
    const models = await listOpenRouterModels(body.apiKey);
    return c.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list OpenRouter models";
    return c.json({ error: message, models: [] as { id: string; displayName: string }[] }, 400);
  }
});

// ── App static assets (unauthenticated, like the shell itself) ──────────────
//
// Bundled core apps are served from ./apps/<name>/ at /apps/<name>/, and the
// app SDK at /app-sdk.js so bundle apps can import it without a build step.
// Privileged calls still require the bridge token + session.

app.get("/app-sdk.js", async (c) => {
  const sdkPath = path.resolve(process.cwd(), "packages/app-sdk/sdk.js");
  try {
    const source = await fs.readFile(sdkPath, "utf-8");
    return c.body(source, 200, { "Content-Type": "text/javascript; charset=utf-8" });
  } catch {
    return c.json({ error: "SDK not found" }, 404);
  }
});

app.use(
  "/apps/*",
  serveStatic({
    root: path.relative(process.cwd(), APPS_DIR) || ".",
    rewriteRequestPath: (p) => p.replace(/^\/apps/, ""),
  }),
);

// ── Static shell (production + embedded mobile sidecar) ─────────────────────

const shellDistRoot = path.resolve(process.cwd(), "dist");
const serveProductionShell =
  process.env.NODE_ENV === "production" || process.env.ARCO_MOBILE_LOCAL === "1";

if (serveProductionShell) {
  if (!existsSync(shellDistRoot)) {
    console.error(`[arco] shell dist not found at ${shellDistRoot}`);
  }
  app.use("/assets/*", serveStatic({ root: shellDistRoot }));
  app.use("/locales/*", serveStatic({ root: shellDistRoot }));
  app.get("/mobile-install.html", serveStatic({ root: shellDistRoot }));
  app.get("/", serveStatic({ root: shellDistRoot, path: "index.html" }));
  app.get("*", serveStatic({ root: shellDistRoot, path: "index.html" }));
}

const port = Number(process.env.PORT ?? 4600);
const listenHost = process.env.ARCO_MOBILE_LOCAL === "1" ? "127.0.0.1" : undefined;
seedMcpPresets();
startScheduler();
startSelfHeal();
// Connect enabled MCP servers in the background — a slow or dead server
// must not delay the shell from coming up.
void mcpSupervisor.start();
// Same posture for messaging channels: connect in the background, isolate
// failures per channel.
void channelGateway.start();
startTranscriptionSupervisor();
const httpServer = serve({ fetch: app.fetch, port, hostname: listenHost }, () => {
  const host = listenHost ?? "localhost";
  console.log(`[arco] server listening on http://${host}:${port}`);
  console.log(`[arco] data dir: ${dataDirs.root}`);
});
void import("./channels/adapters/voiceStream.js").then(({ attachVoiceStreamUpgrade }) =>
  attachVoiceStreamUpgrade(httpServer as import("node:http").Server).catch((err) =>
    console.warn("[voicecall] stream upgrade:", err instanceof Error ? err.message : err),
  ),
);
