/**
 * Model registry API — mounted at /api/models.
 *
 *   GET    /                 — registry + slot table in one payload
 *   POST   /                 — register a model (raw manifest, URL, or custom endpoint)
 *   PATCH  /:id              — enable/disable
 *   DELETE /:id              — remove (non-seed only)
 *   PUT    /slots/:slotId    — assign a model to a use-case slot (null clears)
 *   POST   /slots            — add a user-defined use case
 *   DELETE /slots/:slotId    — remove a user-defined use case
 *
 * Local engine (server/services/llamaEngine.ts):
 *   GET    /engine           — phase + per-GGUF download/router state
 *   POST   /engine/start|stop
 *   GET    /engine/logs
 *   POST   /:id/download     — fetch GGUF(s); poll GET /engine for progress
 *   DELETE /:id/download     — delete GGUF(s) from disk
 *   POST   /:id/load|unload  — pre-warm / evict in the running router
 */
import { Hono } from "hono";
import { ZodError } from "zod";
import { llamaEngine } from "../services/llamaEngine.js";
import { modelStore } from "../stores/modelStore.js";
import { loadSettings, saveSettings } from "../env.js";
import { listRemoteLlmModels, resolveRemoteListApiKey } from "../llm/remoteModels.js";
import { requireCap } from "../auth/middleware.js";
import { redactSecretsInText } from "../security/redactSecrets.js";

export const modelRoutes = new Hono();

function errorMessage(err: unknown): string {
  if (err instanceof ZodError) {
    return redactSecretsInText(
      err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return redactSecretsInText(err instanceof Error ? err.message : String(err));
}

modelRoutes.get("/", (c) =>
  c.json({ models: modelStore.list(), slots: modelStore.slots() }),
);

/**
 * List models from an OpenAI-compatible endpoint (Kosmos Cloud gateway or
 * a custom baseUrl). Defaults to the saved Settings connection.
 */
modelRoutes.post("/remote", requireCap("chat"), async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    baseUrl?: string;
    apiKey?: string;
  } | null;
  const settings = loadSettings();
  const baseUrl = (body?.baseUrl ?? settings.baseUrl).trim();
  if (!baseUrl) {
    return c.json({ error: "No endpoint configured" }, 400);
  }
  const resolved = resolveRemoteListApiKey(baseUrl, settings, body?.apiKey);
  if ("code" in resolved) {
    // 422 — not 401 — so the web client does not treat this as a session logout.
    return c.json({ error: resolved.message, code: resolved.code }, 422);
  }
  try {
    const models = await listRemoteLlmModels(baseUrl, resolved.apiKey);
    return c.json({ models, baseUrl });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth_required") {
      return c.json({ error: errorMessage(err), code: "auth_required" }, 422);
    }
    return c.json({ error: errorMessage(err) }, 502);
  }
});

/**
 * Register a model. Three shapes, mirroring app installs:
 *   { manifest }            — raw manifest JSON (source "user")
 *   { url }                 — fetch a manifest from a URL (source "url")
 *   { manifest, apiKey }    — custom endpoint with its key; the key goes to
 *                             the settings key store, never the registry.
 */
modelRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    manifest?: unknown;
    url?: string;
    apiKey?: string;
  } | null;
  if (!body || (body.manifest === undefined && !body.url)) {
    return c.json({ error: "Provide a manifest or a manifest URL" }, 400);
  }

  try {
    let manifest = body.manifest;
    let source: "user" | "url" = "user";
    if (!manifest && body.url) {
      const res = await fetch(body.url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return c.json({ error: `Manifest fetch failed: ${res.status}` }, 400);
      manifest = await res.json();
      source = "url";
    }

    // Keys ride the request but land in the masked settings store, keyed by
    // the manifest's apiKeyRef (defaulting to the model id).
    if (body.apiKey && !body.apiKey.startsWith("••••")) {
      const m = manifest as { id?: string; runtime?: { kind?: string; apiKeyRef?: string } };
      if (m?.runtime?.kind === "openai-compatible" && m.id) {
        const ref = m.runtime.apiKeyRef ?? m.id;
        m.runtime.apiKeyRef = ref;
        saveSettings({ apiKeys: { ...loadSettings().apiKeys, [ref]: body.apiKey } });
      }
    }

    const record = modelStore.add(manifest, source);
    return c.json(record, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});

modelRoutes.put("/slots/:slotId", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { modelId?: string | null } | null;
  if (!body || body.modelId === undefined) {
    return c.json({ error: "Provide modelId (a registered id, or null to clear)" }, 400);
  }
  try {
    modelStore.assign(c.req.param("slotId"), body.modelId);
    // Assigning a locally-hosted model means the user expects it to answer —
    // bring the engine up in the background rather than failing the first turn.
    if (body.modelId && modelStore.get(body.modelId)?.manifest.runtime.kind === "llama-gguf") {
      void llamaEngine.ensureRunning();
    }
    return c.json({ slots: modelStore.slots() });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});

modelRoutes.post("/slots", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Provide label and requires capability" }, 400);
  try {
    const slot = modelStore.addSlot(body);
    return c.json({ slot, slots: modelStore.slots() }, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});

modelRoutes.delete("/slots/:slotId", (c) => {
  try {
    modelStore.removeSlot(c.req.param("slotId"));
    return c.json({ slots: modelStore.slots() });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});

// ── Local engine ─────────────────────────────────────────────────────────────

modelRoutes.get("/engine", async (c) => c.json(await llamaEngine.status()));

modelRoutes.post("/engine/start", async (c) => c.json(await llamaEngine.start()));

modelRoutes.post("/engine/stop", async (c) => c.json(await llamaEngine.stop()));

modelRoutes.get("/engine/logs", (c) => c.json({ lines: llamaEngine.logs() }));

modelRoutes.post("/:id/download", (c) => {
  const id = c.req.param("id");
  try {
    // Kick off in the background; the UI polls GET /engine for progress.
    void llamaEngine.download(id).catch(() => {
      // Error state is recorded per-file inside the engine service.
    });
    return c.json({ started: true }, 202);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});

modelRoutes.delete("/:id/download", (c) => {
  try {
    llamaEngine.removeDownload(c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});

modelRoutes.post("/:id/load", async (c) => {
  try {
    await llamaEngine.loadModel(c.req.param("id"), "load");
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 502);
  }
});

modelRoutes.post("/:id/unload", async (c) => {
  try {
    await llamaEngine.loadModel(c.req.param("id"), "unload");
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 502);
  }
});

modelRoutes.patch("/:id", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { enabled?: boolean } | null;
  if (typeof body?.enabled !== "boolean") return c.json({ error: "Provide enabled: boolean" }, 400);
  try {
    return c.json(modelStore.setEnabled(c.req.param("id"), body.enabled));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 404);
  }
});

modelRoutes.delete("/:id", (c) => {
  try {
    modelStore.remove(c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }
});
