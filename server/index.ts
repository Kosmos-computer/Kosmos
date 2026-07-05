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
 *
 * In production it also serves the built shell from dist/.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { AgentEvent, DirListing, Settings } from "../shared/types.js";
import { requireAuth, requireCap, type AuthEnv } from "./auth/middleware.js";
import { authRoutes } from "./auth/routes.js";
import { runAgentTurn } from "./agent/loop.js";
import { invokeRuntimeTool, runExec } from "./agent/tools.js";
import { resolveClientRequest } from "./agent/clientRequests.js";
import { resolveConfirmation } from "./agent/confirmations.js";
import { runAutomationNow, startScheduler } from "./automations/scheduler.js";
import { dataDirs, ensureDataDirs, loadSettings, maskSettings, saveSettings } from "./env.js";
import { gitCommit, gitFileDiff, gitInfo, gitPull, gitPush } from "./git.js";
import { listRuns, runLog, startRun, stopRun } from "./runManager.js";
import { appStore } from "./stores/appStore.js";
import { automationStore } from "./stores/automationStore.js";
import { getActiveRoot, projectStore, resolveProjectPath } from "./stores/projectStore.js";
import { sessionStore } from "./stores/sessionStore.js";
import { webAppStore } from "./stores/webAppStore.js";
import { installedAppStore, APPS_DIR } from "./platform/installedAppStore.js";
import { grantStore } from "./platform/grantStore.js";
import { parseManifest } from "./platform/manifestSchema.js";
import { BridgeError, dispatchAppBridge, mintToken, resolveToken } from "./platform/bridge.js";
import { bus } from "./bus.js";

const execFileAsync = promisify(execFile);

ensureDataDirs();
installedAppStore.ensureSeeds();

const app = new Hono<AuthEnv>();

// ── Auth ─────────────────────────────────────────────────────────────────────
//
// /api/auth/* is the only unauthenticated API surface; everything else under
// /api requires a live, unlocked session. Capability guards (requireCap) then
// gate the sensitive routes per role — see ROLE_CAPABILITIES in shared/types.

app.route("/api/auth", authRoutes);
app.use("/api/*", requireAuth);

// ── Chat ─────────────────────────────────────────────────────────────────────

app.post("/api/chat", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { sessionId?: string; message: string };
  const message = (body.message ?? "").trim();
  if (!message) return c.json({ error: "message is required" }, 400);

  const session = body.sessionId
    ? await sessionStore.get(body.sessionId)
    : await sessionStore.create("chat", "New chat");
  if (!session) return c.json({ error: "Session not found" }, 404);

  return streamSSE(c, async (stream) => {
    const emit = (event: AgentEvent) => {
      // Fire-and-forget: hono queues writes; a client disconnect aborts the stream.
      void stream.writeSSE({ data: JSON.stringify(event) });
    };
    emit({ type: "session", sessionId: session.id });
    try {
      await runAgentTurn({
        sessionId: session.id,
        userMessage: message,
        emit,
        signal: c.req.raw.signal,
        interactive: true,
      });
      emit({ type: "done" });
    } catch (err) {
      emit({ type: "error", message: err instanceof Error ? err.message : "Agent turn failed" });
    }
    await stream.close();
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

app.get("/api/automations", async (c) => c.json(await automationStore.list()));

app.post("/api/automations", requireCap("automations:manage"), async (c) => {
  const body = (await c.req.json()) as { name: string; schedule: string; prompt: string };
  const automation = await automationStore.create(body);
  bus.emit("automations_changed");
  return c.json(automation);
});

app.patch("/api/automations/:id", requireCap("automations:manage"), async (c) => {
  const body = (await c.req.json()) as Partial<{
    name: string;
    schedule: string;
    prompt: string;
    enabled: boolean;
  }>;
  const automation = await automationStore.update(c.req.param("id"), body);
  bus.emit("automations_changed");
  return c.json(automation);
});

app.delete("/api/automations/:id", requireCap("automations:manage"), async (c) => {
  await automationStore.delete(c.req.param("id"));
  bus.emit("automations_changed");
  return c.json({ ok: true });
});

app.post("/api/automations/:id/run", requireCap("automations:manage"), async (c) => {
  const run = await runAutomationNow(c.req.param("id"));
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

// ── Exec confirmations ───────────────────────────────────────────────────────

app.post("/api/confirmations/:id", requireCap("chat"), async (c) => {
  const body = (await c.req.json()) as { approved: boolean };
  const known = resolveConfirmation(c.req.param("id"), Boolean(body.approved));
  return c.json({ ok: known });
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
  return c.json(maskSettings(saveSettings(patch)));
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
serve({ fetch: app.fetch, port }, () => {
  console.log(`[arco] server listening on http://localhost:${port}`);
  console.log(`[arco] data dir: ${dataDirs.root}`);
});
