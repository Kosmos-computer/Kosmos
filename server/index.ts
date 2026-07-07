/**
 * Arco OS server — Hono over @hono/node-server.
 *
 * Routes:
 *   POST /api/chat                 — run an agent turn, stream AgentEvents over SSE
 *   GET  /api/sessions[/:id]      — session list / transcript
 *   CRUD /api/apps                — generated apps + versions/restore
 *   POST /api/tools/invoke        — app runtime Query/Mutation bridge (no LLM)
 *   CRUD /api/automations         — schedules + run-now + history
 *   GET/PUT /api/files            — workspace browser
 *   POST /api/exec                — terminal command runner
 *   GET/PUT /api/settings         — LLM provider config + shell prefs
 *   GET/POST /api/mail/*          — Gmail OAuth + live mail proxy
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
import { createReadStream, type ReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  AgentEvent,
  AutomationTrigger,
  DirListing,
  Settings,
} from "../shared/types.js";
import { requireAuth, requireCap, currentUser, type AuthEnv } from "./auth/middleware.js";
import { authRoutes } from "./auth/routes.js";
import { runAgentTurn } from "./agent/loop.js";
import { runAcpTurn, stopAllAcpRuns } from "./acp/acpAgent.js";
import { runCursorTurn, stopAllCursorRuns } from "./cursor/cursorAgent.js";
import { listCursorModels, testCursorConnection } from "./cursor/cursorConnect.js";
import { openaiCompatRoutes } from "./agent/openaiCompat.js";
import { invokeRuntimeTool, runExec } from "./agent/tools.js";
import { resolveClientRequest } from "./agent/clientRequests.js";
import { resolveConfirmation } from "./agent/confirmations.js";
import { runAutomationNow, startScheduler } from "./automations/scheduler.js";
import { eventTriggerMatches, verifyWebhookSecret } from "./automations/eventMatcher.js";
import { describeSchedule } from "./automations/scheduleUtils.js";
import { dataDirs, ensureDataDirs, loadSettings, maskSettings, saveSettings } from "./env.js";
import { gitCommit, gitFileDiff, gitInfo, gitPull, gitPush } from "./git.js";
import { listRuns, runLog, startRun, stopRun } from "./runManager.js";
import { appStore } from "./stores/appStore.js";
import { automationStore } from "./stores/automationStore.js";
import { getActiveRoot, projectStore, resolveProjectPath } from "./stores/projectStore.js";
import { sessionStore } from "./stores/sessionStore.js";
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
import { mcpLogFile } from "./mcp/client.js";
import "./mcp/tools.js"; // registers the MCP tool contributor with the agent registry
import "./platform/appTools.js"; // registers installed apps' tool contributions
import "./channels/tools.js"; // registers channel_send with the agent registry
import { channelStore } from "./channels/channelStore.js";
import { channelGateway } from "./channels/gateway.js";
import { handleOutwardMcp } from "./mcp/outward.js";
import { externalClients } from "./platform/externalClients.js";
import { skillStore } from "./skills/skillStore.js";
import { bus } from "./bus.js";
import { shellClientConnected } from "./shellChannel.js";
import { filesService } from "./services/filesService.js";
import { calendarService } from "./services/calendarService.js";
import type { CalendarEventInput } from "../shared/capabilities/calendar.js";
import { searchPlaces, geocodePlace, getDrivingRoute } from "./services/mapsService.js";
import { webSearch } from "./services/searchService.js";
import { browseErrorHtml, fetchBrowsePage } from "./services/browseProxyService.js";
import { listSeedTracks, statSeedTrack } from "./services/musicSeedService.js";
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
import { transcriptionRoutes } from "./routes/transcription.js";
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

const execFileAsync = promisify(execFile);

ensureDataDirs();
installedAppStore.ensureSeeds();
filesService.ensureSeeds();
warmPodcastRssFeeds();
warmMusicRssFeeds();
warmPodcastDownloads();
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

// ── Auth ─────────────────────────────────────────────────────────────────────
//
// /api/auth/* is the only unauthenticated API surface; everything else under
// /api requires a live, unlocked session. Capability guards (requireCap) then
// gate the sensitive routes per role — see ROLE_CAPABILITIES in shared/types.

app.route("/api/auth", authRoutes);

/** Unauthenticated readiness probe for first boot and dev setup. */
app.get("/api/system/install-status", async (c) => c.json(await getInstallStatus()));

app.use("/api/*", requireAuth);

// ── OpenAI-compatible agent endpoint ─────────────────────────────────────────
//
// Loopback-only /v1/chat/completions exposing the agent to local OpenAI
// clients — notably the voice server's brain slot (voice-server/README.md).

app.route("/v1", openaiCompatRoutes);

app.route("/api/transcription", transcriptionRoutes);

// ── Chat ─────────────────────────────────────────────────────────────────────

app.post("/api/chat", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as {
    sessionId?: string;
    message: string;
    /** "ask" runs the turn with write tools removed (answer-only). */
    mode?: "agent" | "ask";
    /** Workspace folder for new sessions (null = sandbox). */
    projectId?: string | null;
  };
  const message = (body.message ?? "").trim();
  if (!message) return c.json({ error: "message is required" }, 400);

  let session = body.sessionId
    ? await sessionStore.get(body.sessionId)
    : await sessionStore.create("chat", "New chat", { projectId: body.projectId ?? null });
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (body.sessionId && session.projectId == null) {
    session = await sessionStore.tagProjectIfMissing(session, body.projectId ?? null);
  }

  return streamSSE(c, async (stream) => {
    // Queue writes so terminal events (error/done) flush before close — a bare
    // void writeSSE can be dropped when the stream closes immediately after.
    const pending: Promise<void>[] = [];
    const emit = (event: AgentEvent) => {
      pending.push(stream.writeSSE({ data: JSON.stringify(event) }));
    };
    emit({ type: "session", sessionId: session.id });
    try {
      // Interactive chat routes to whichever brain Settings selects; the
      // built-in loop stays the only agent for automations (headless ACP
      // has unresolved lifecycle semantics — see the extensibility plan).
      const agentKind = loadSettings().agent;
      const turnRunner =
        agentKind === "acp" ? runAcpTurn : agentKind === "cursor" ? runCursorTurn : runAgentTurn;
      await turnRunner({
        sessionId: session.id,
        userMessage: message,
        emit,
        signal: c.req.raw.signal,
        interactive: true,
        readOnly: body.mode === "ask",
      });
      emit({ type: "done" });
    } catch (err) {
      emit({ type: "error", message: err instanceof Error ? err.message : "Agent turn failed" });
    }
    await Promise.all(pending);
    await stream.close();
  });
});

// ── Shell events (out-of-band agent → desktop channel) ──────────────────────
//
// Chat turns stream their AgentEvents over the /api/chat SSE response, but
// turns started elsewhere (the voice server via /v1, future headless callers)
// have no client stream. Those callers put shell-relevant events on the bus
// ("shell_event"), and every connected desktop receives them here.

app.get("/api/shell-events", (c) =>
  streamSSE(c, async (stream) => {
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
  }),
);

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
  const body = (await c.req.json()) as { title?: string };
  const title = (body.title ?? "").trim();
  if (!title) return c.json({ error: "title is required" }, 400);
  try {
    const session = await sessionStore.updateTitle(c.req.param("id"), title);
    return c.json(session);
  } catch {
    return c.json({ error: "Not found" }, 404);
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
  c.json({ status: "ok" satisfies import("../shared/types.js").AutomationHealthResponse["status"] }),
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
        path: path.relative(getActiveRoot(), full),
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
  const content = await fs.readFile(resolveProjectPath(rel), "utf-8");
  return c.json({ path: rel, content });
});

app.put("/api/files/content", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { path: string; content: string };
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

app.get("/api/music/tracks", (c) => c.json(listSeedTracks()));

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
  const resolved = statSeedTrack(c.req.param("id"));
  if (!resolved) return c.json({ error: "Track not found" }, 404);

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
    return c.body(stream, 206, {
      "Content-Range": `bytes ${start}-${end}/${resolved.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": "audio/mpeg",
    });
  }

  const stream = createSafeReadStream(resolved.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream, 200, {
    "Content-Length": String(resolved.size),
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
  });
});

app.get("/api/music/art/:id", (c) => {
  const art = resolveTrackArt(c.req.param("id"));
  if (!art) return c.json({ error: "Artwork not found" }, 404);

  const stream = createSafeReadStream(art.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream, 200, {
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
    return c.body(stream, 206, {
      "Content-Range": `bytes ${start}-${end}/${resolved.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": resolved.video.mimeType,
    });
  }

  const stream = createSafeReadStream(resolved.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream, 200, {
    "Content-Length": String(resolved.size),
    "Content-Type": resolved.video.mimeType,
    "Accept-Ranges": "bytes",
  });
});

app.get("/api/podcast/episodes", (c) => c.json(listLocalEpisodes()));

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
    return c.body(stream, 206, {
      "Content-Range": `bytes ${start}-${end}/${resolved.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": resolved.mimeType,
    });
  }

  const stream = createSafeReadStream(resolved.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream, 200, {
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
    return c.body(stream, 200, {
      "Content-Type": trackArt.mime,
      "Cache-Control": "public, max-age=86400",
    });
  }

  const stream = createSafeReadStream(art.absPath);
  attachStreamAbort(stream, c.req.raw.signal);
  return c.body(stream, 200, {
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

// ── Projects (open folders) ──────────────────────────────────────────────────

app.get("/api/projects", (c) => c.json(projectStore.list()));

app.post("/api/projects", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { path: string };
  try {
    const project = projectStore.add(body.path);
    return c.json(project);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Invalid path" }, 400);
  }
});

app.post("/api/projects/active", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as { id: string | null };
  try {
    projectStore.setActive(body.id);
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
  return c.json({
    oauthConfigured: mailGateway.oauthConfigured(),
    accounts: mailGateway.listAccounts(user.id),
  });
});

app.get("/api/mail/accounts", (c) => c.json(mailGateway.listAccounts(currentUser(c).id)));

app.delete("/api/mail/accounts/:id", (c) => {
  const ok = mailGateway.disconnect(currentUser(c).id, c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
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

app.post("/api/channels", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as { kind?: string; name?: string; token?: string };
  if (body.kind !== "telegram") return c.json({ error: "kind must be \"telegram\"" }, 400);
  if (!body.name?.trim() || !body.token?.trim()) {
    return c.json({ error: "name and token are required" }, 400);
  }
  const cfg = channelStore.add({ kind: "telegram", name: body.name.trim(), token: body.token.trim() });
  await channelGateway.sync(cfg.id);
  return c.json(channelGateway.list().find((ch) => ch.config.id === cfg.id));
});

app.patch("/api/channels/:id", requireCap("settings:write"), async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { name?: string; token?: string; enabled?: boolean };
  const patch: Parameters<typeof channelStore.update>[1] = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.token === "string" && body.token.trim()) patch.token = body.token.trim();
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  const cfg = channelStore.update(id, patch);
  if (!cfg) return c.json({ error: "Not found" }, 404);
  // Token and enabled changes affect the live connection; a rename doesn't.
  if (patch.token !== undefined || patch.enabled !== undefined) await channelGateway.sync(id);
  return c.json(channelGateway.list().find((ch) => ch.config.id === id));
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

app.put("/api/settings", requireCap("settings:write"), async (c) => {
  const patch = (await c.req.json()) as Partial<Settings>;
  // A masked key echoed back from the client must not clobber the real one.
  if (patch.apiKey && patch.apiKey.startsWith("••••")) delete patch.apiKey;
  if (patch.cursorApiKey && patch.cursorApiKey.startsWith("••••")) delete patch.cursorApiKey;
  // Agent config changes tear down live ACP subprocesses so the next turn
  // respawns with the new command; running turns fail fast rather than
  // continuing on stale settings.
  if (
    patch.agent !== undefined ||
    patch.acpCommand !== undefined ||
    patch.cursorApiKey !== undefined ||
    patch.cursorModel !== undefined ||
    patch.cursorRuntime !== undefined ||
    patch.cursorRepoUrl !== undefined
  ) {
    stopAllAcpRuns();
    stopAllCursorRuns();
  }
  return c.json(maskSettings(saveSettings(patch)));
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

// ── Static shell (production) ────────────────────────────────────────────────

if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ root: "./dist", path: "index.html" }));
}

const port = Number(process.env.PORT ?? 4600);
startScheduler();
// Connect enabled MCP servers in the background — a slow or dead server
// must not delay the shell from coming up.
void mcpSupervisor.start();
// Same posture for messaging channels: connect in the background, isolate
// failures per channel.
void channelGateway.start();
startTranscriptionSupervisor();
serve({ fetch: app.fetch, port }, () => {
  console.log(`[arco] server listening on http://localhost:${port}`);
  console.log(`[arco] data dir: ${dataDirs.root}`);
});
