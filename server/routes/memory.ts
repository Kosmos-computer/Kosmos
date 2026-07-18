/**
 * Memory REST API — Phase 1 document store + ACLs.
 * Mounted at /api/memory.
 */
import { Hono } from "hono";
import type {
  MemoryGrant,
  MemoryKind,
  MemoryScope,
  MemoryStatus,
} from "../../shared/capabilities/memory.js";
import { MEMORY_KINDS } from "../memory/memoryGrantStore.js";
import {
  MemoryAccessError,
  MemoryNotFoundError,
  memoryStore,
} from "../memory/memoryStore.js";
import { requireCap, type AuthEnv } from "../auth/middleware.js";

/** UI / REST calls act as the user principal (admin on all by default). */
const USER_PRINCIPAL = "user";

function isMemoryKind(v: unknown): v is MemoryKind {
  return typeof v === "string" && (MEMORY_KINDS as string[]).includes(v);
}

function handleMemoryError(c: { json: (body: unknown, status: number) => Response }, err: unknown) {
  if (err instanceof MemoryAccessError) {
    return c.json({ error: err.message }, 403);
  }
  if (err instanceof MemoryNotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  const message = err instanceof Error ? err.message : "Memory error";
  return c.json({ error: message }, 400);
}

export const memoryRoutes = new Hono<AuthEnv>();

// ── Entries ──────────────────────────────────────────────────────────────────

memoryRoutes.get("/entries", requireCap("chat"), (c) => {
  try {
    const kind = c.req.query("kind");
    const collectionId = c.req.query("collectionId") ?? c.req.query("collection") ?? undefined;
    const status = c.req.query("status") as MemoryStatus | undefined;
    const q = c.req.query("q") ?? undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    return c.json(
      memoryStore.listEntries(USER_PRINCIPAL, {
        ...(isMemoryKind(kind) ? { kind } : {}),
        ...(collectionId ? { collectionId } : {}),
        ...(status ? { status } : {}),
        ...(q ? { q } : {}),
        ...(limit != null && !Number.isNaN(limit) ? { limit } : {}),
      }),
    );
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

memoryRoutes.get("/entries/:id", requireCap("chat"), (c) => {
  try {
    const entry = memoryStore.getEntry(USER_PRINCIPAL, c.req.param("id"));
    if (!entry) return c.json({ error: "Not found" }, 404);
    return c.json(entry);
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

memoryRoutes.post("/entries", requireCap("chat"), async (c) => {
  try {
    const body = (await c.req.json()) as {
      kind?: string;
      title?: string;
      summary?: string;
      body?: string;
      tags?: string[];
      collectionId?: string;
      status?: MemoryStatus;
      source?: string;
      confidence?: number;
      sourceSessionId?: string | null;
    };
    if (!isMemoryKind(body.kind)) {
      return c.json({ error: "kind is required and must be a valid MemoryKind" }, 400);
    }
    if (!body.title?.trim() || !body.summary?.trim()) {
      return c.json({ error: "title and summary are required" }, 400);
    }
    const entry = memoryStore.createEntry(USER_PRINCIPAL, {
      kind: body.kind,
      title: body.title,
      summary: body.summary,
      ...(typeof body.body === "string" ? { body: body.body } : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags.map(String) } : {}),
      ...(body.collectionId ? { collectionId: body.collectionId } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.source ? { source: body.source } : {}),
      ...(typeof body.confidence === "number" ? { confidence: body.confidence } : {}),
      ...(body.sourceSessionId !== undefined ? { sourceSessionId: body.sourceSessionId } : {}),
    });
    return c.json(entry, 201);
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

memoryRoutes.patch("/entries/:id", requireCap("chat"), async (c) => {
  try {
    const body = (await c.req.json()) as {
      title?: string;
      summary?: string;
      body?: string | null;
      status?: MemoryStatus;
      tags?: string[];
      confidence?: number;
    };
    const entry = memoryStore.updateEntry(USER_PRINCIPAL, c.req.param("id"), {
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.summary === "string" ? { summary: body.summary } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags.map(String) } : {}),
      ...(typeof body.confidence === "number" ? { confidence: body.confidence } : {}),
    });
    return c.json(entry);
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

memoryRoutes.delete("/entries/:id", requireCap("chat"), (c) => {
  try {
    if (!memoryStore.deleteEntry(USER_PRINCIPAL, c.req.param("id"))) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

// ── Search ───────────────────────────────────────────────────────────────────

memoryRoutes.get("/search", requireCap("chat"), (c) => {
  try {
    const q = c.req.query("q") ?? "";
    const kind = c.req.query("kind");
    const kindsParam = c.req.query("kinds");
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const kinds: MemoryKind[] = [];
    if (isMemoryKind(kind)) kinds.push(kind);
    if (kindsParam) {
      for (const part of kindsParam.split(",")) {
        const k = part.trim();
        if (isMemoryKind(k) && !kinds.includes(k)) kinds.push(k);
      }
    }
    return c.json(
      memoryStore.search(USER_PRINCIPAL, {
        query: q,
        ...(kinds.length > 0 ? { kinds } : {}),
        ...(limit != null && !Number.isNaN(limit) ? { limit } : {}),
      }),
    );
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

// ── Collections ──────────────────────────────────────────────────────────────

memoryRoutes.get("/collections", requireCap("chat"), (c) => {
  try {
    // Materialize default collections so the UI has something to show.
    for (const kind of MEMORY_KINDS) {
      memoryStore.ensureDefaultCollection(kind);
    }
    return c.json(memoryStore.listCollections(USER_PRINCIPAL));
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

memoryRoutes.post("/collections", requireCap("chat"), async (c) => {
  try {
    const body = (await c.req.json()) as {
      kind?: string;
      name?: string;
      description?: string;
      id?: string;
      retentionDays?: number | null;
    };
    if (!isMemoryKind(body.kind) || !body.name?.trim()) {
      return c.json({ error: "kind and name are required" }, 400);
    }
    const collection = memoryStore.createCollection(USER_PRINCIPAL, {
      kind: body.kind,
      name: body.name,
      ...(typeof body.description === "string" ? { description: body.description } : {}),
      ...(body.id ? { id: body.id } : {}),
      ...(body.retentionDays !== undefined ? { retentionDays: body.retentionDays } : {}),
    });
    return c.json(collection, 201);
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

// ── Grants ───────────────────────────────────────────────────────────────────

memoryRoutes.get("/grants", requireCap("settings:write"), (c) => {
  try {
    return c.json(memoryStore.listGrants(USER_PRINCIPAL));
  } catch (err) {
    return handleMemoryError(c, err);
  }
});

memoryRoutes.put("/grants", requireCap("settings:write"), async (c) => {
  try {
    const body = (await c.req.json()) as {
      grants?: MemoryGrant[];
      principalId?: string;
      scope?: MemoryScope;
      access?: MemoryGrant["access"];
    };
    if (Array.isArray(body.grants)) {
      return c.json(memoryStore.setGrants(USER_PRINCIPAL, body.grants));
    }
    if (body.principalId && body.scope && body.access) {
      return c.json(
        memoryStore.setGrant(USER_PRINCIPAL, {
          principalId: body.principalId,
          scope: body.scope,
          access: body.access,
        }),
      );
    }
    return c.json({ error: "Provide grants[] or principalId+scope+access" }, 400);
  } catch (err) {
    return handleMemoryError(c, err);
  }
});
