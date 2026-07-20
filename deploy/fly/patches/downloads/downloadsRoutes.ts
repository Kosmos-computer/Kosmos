/**
 * Downloads / BitTorrent HTTP routes for Fly dist-patch overlays.
 *
 * Mounted at /api/downloads on older tenant runtime images that lack the
 * HEAD server/index.ts downloads block.
 */
import { Hono } from "hono";
// Copied to /app/server/routes/downloads.ts — paths are relative to that location.
import { requireCap, type AuthEnv } from "../auth/middleware.js";
import { torrentService } from "../services/torrentService.js";
import type { TorrentAddInput } from "../../shared/capabilities/downloads.js";

export const downloadsRoutes = new Hono<AuthEnv>();

downloadsRoutes.get("/torrents", requireCap("files:read"), async (c) => {
  try {
    return c.json(await torrentService.list());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

downloadsRoutes.get("/torrents/:id", requireCap("files:read"), async (c) => {
  try {
    return c.json(await torrentService.get(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

downloadsRoutes.get("/stats", requireCap("files:read"), async (c) => {
  try {
    return c.json(await torrentService.stats());
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

downloadsRoutes.get("/settings", requireCap("files:read"), (c) => {
  return c.json(torrentService.getSettings());
});

downloadsRoutes.put("/settings", requireCap("files:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { seedAfterDownload?: boolean };
  try {
    return c.json(await torrentService.updateSettings(body));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

downloadsRoutes.post("/torrents", requireCap("files:write"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as TorrentAddInput;
  try {
    const torrent = await torrentService.add(body);
    return c.json(torrent, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

downloadsRoutes.post("/torrents/:id/pause", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.pause(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

downloadsRoutes.post("/torrents/:id/resume", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.resume(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

downloadsRoutes.post("/torrents/:id/stop", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.stop(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

downloadsRoutes.delete("/torrents/:id", requireCap("files:write"), async (c) => {
  const deleteFiles = c.req.query("deleteFiles") === "1" || c.req.query("deleteFiles") === "true";
  try {
    return c.json(await torrentService.remove(c.req.param("id"), deleteFiles));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 404);
  }
});

downloadsRoutes.post("/torrents/:id/drive", requireCap("files:write"), async (c) => {
  try {
    return c.json(await torrentService.ensureInDrive(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

downloadsRoutes.post("/reveal", requireCap("files:read"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { path?: string };
  const target = body.path?.trim();
  if (!target) return c.json({ error: "path is required" }, 400);
  try {
    return c.json(await torrentService.revealPath(target));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
