/**
 * Share routes — authenticated management + anonymous public access.
 *
 * Public routes never use session caps; they resolve opaque share tokens only.
 */
import { Hono } from "hono";
import { FOLDER_MIME, isBinaryMime } from "../../shared/capabilities/files.js";
import type { ShareCreateInput } from "../../shared/capabilities/shares.js";
import { requireCap, currentUser, type AuthEnv } from "../auth/middleware.js";
import { filesService } from "../services/filesService.js";
import { shareService, ShareAccessError } from "../services/shareService.js";

function sharePassword(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | undefined {
  return c.req.header("X-Share-Password") ?? c.req.query("password") ?? undefined;
}

function publicShareUrl(token: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/s/${token}`;
}

function shareViewerHtml(opts: {
  token: string;
  name: string;
  kind: "file" | "folder";
  needsPassword: boolean;
  error?: string;
}): string {
  const title = opts.name.replace(/</g, "&lt;");
  const error = opts.error ? `<p class="err">${opts.error.replace(/</g, "&lt;")}</p>` : "";
  const passwordForm = opts.needsPassword
    ? `<form method="GET" action="/s/${opts.token}">
        <label>Password <input type="password" name="password" required /></label>
        <button type="submit">Continue</button>
      </form>`
    : "";
  const body = opts.needsPassword
    ? passwordForm
    : opts.kind === "folder"
      ? `<p>Folder share — open the <a href="/public/shares/${opts.token}/children">file list</a> or use the API.</p>`
      : `<p><a href="/public/shares/${opts.token}/blob" download>Download</a></p>
         <iframe src="/public/shares/${opts.token}/blob" style="width:100%;height:70vh;border:0" title="preview"></iframe>`;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Shared</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#111}
  .err{color:#b00020} form{display:flex;gap:.5rem;align-items:end;margin:1rem 0}
  input{padding:.4rem .6rem} button{padding:.45rem .9rem;cursor:pointer}
</style></head><body>
<h1>${title}</h1>
<p>Shared via Kosmos Drive</p>
${error}
${body}
</body></html>`;
}

export const shareRoutes = new Hono<AuthEnv>();

// ── Authenticated share management ────────────────────────────────────────────

shareRoutes.get("/api/shares", requireCap("files:read"), (c) => {
  const fileId = c.req.query("fileId");
  const user = currentUser(c);
  const shares = shareService.list({
    ...(fileId ? { fileId } : {}),
    createdBy: user.id,
  });
  const origin = new URL(c.req.url).origin;
  return c.json(
    shares.map((share) => ({
      ...share,
      url: publicShareUrl(share.token, origin),
    })),
  );
});

shareRoutes.post("/api/shares", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as ShareCreateInput;
  if (!body.fileId) return c.json({ error: "fileId is required" }, 400);
  const user = currentUser(c);
  try {
    const share = shareService.create(body, user.id);
    const origin = new URL(c.req.url).origin;
    return c.json({ ...share, url: publicShareUrl(share.token, origin) }, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

shareRoutes.delete("/api/shares/:id", requireCap("files:write"), (c) => {
  try {
    return c.json(shareService.revoke(c.req.param("id")));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

shareRoutes.patch("/api/shares/:id", requireCap("files:write"), async (c) => {
  const body = (await c.req.json()) as {
    mode?: "download" | "view";
    allowDownload?: boolean;
    password?: string;
    expiresAt?: string | null;
    label?: string | null;
  };
  try {
    const share = shareService.update(c.req.param("id"), body);
    const origin = new URL(c.req.url).origin;
    return c.json({ ...share, url: publicShareUrl(share.token, origin) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ── Public share surface (token auth only) ──────────────────────────────────

shareRoutes.get("/public/shares/:token", async (c) => {
  try {
    const resolved = shareService.resolveToken(c.req.param("token"), sharePassword(c));
    const { file, share } = resolved;
    return c.json({
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      kind: file.mimeType === FOLDER_MIME ? "folder" : "file",
      mode: share.mode,
      allowDownload: shareService.canDownload(resolved),
      updatedAt: file.updatedAt,
    });
  } catch (err) {
    if (err instanceof ShareAccessError) return c.json({ error: err.message }, err.status);
    return c.json({ error: (err as Error).message }, 500);
  }
});

shareRoutes.get("/public/shares/:token/children", async (c) => {
  try {
    const resolved = shareService.resolveToken(c.req.param("token"), sharePassword(c));
    const children = shareService.listPublicChildren(resolved).map((entry) => ({
      id: entry.id,
      name: entry.name,
      mimeType: entry.mimeType,
      size: entry.size,
      kind: entry.mimeType === FOLDER_MIME ? "folder" : "file",
      updatedAt: entry.updatedAt,
    }));
    return c.json(children);
  } catch (err) {
    if (err instanceof ShareAccessError) return c.json({ error: err.message }, err.status);
    return c.json({ error: (err as Error).message }, 500);
  }
});

shareRoutes.get("/public/shares/:token/content", async (c) => {
  try {
    const resolved = shareService.resolveToken(c.req.param("token"), sharePassword(c));
    if (!shareService.canDownload(resolved)) {
      return c.json({ error: "Download not permitted for this share" }, 403);
    }
    const fileId = c.req.query("fileId") ?? resolved.file.id;
    const entry = shareService.assertFileAccess(resolved, fileId);
    if (isBinaryMime(entry.mimeType)) {
      return c.json({ error: "Use the blob endpoint for binary files" }, 400);
    }
    return c.json(filesService.readContent(entry.id));
  } catch (err) {
    if (err instanceof ShareAccessError) return c.json({ error: err.message }, err.status);
    return c.json({ error: (err as Error).message }, 500);
  }
});

shareRoutes.get("/public/shares/:token/blob", async (c) => {
  try {
    const resolved = shareService.resolveToken(c.req.param("token"), sharePassword(c));
    if (!shareService.canDownload(resolved)) {
      return c.json({ error: "Download not permitted for this share" }, 403);
    }
    const fileId = c.req.query("fileId") ?? resolved.file.id;
    const entry = shareService.assertFileAccess(resolved, fileId);
    const { data } = filesService.readBlob(entry.id);
    return c.body(new Uint8Array(data), 200, {
      "Content-Type": entry.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${entry.name.replace(/"/g, "")}"`,
    });
  } catch (err) {
    if (err instanceof ShareAccessError) return c.json({ error: err.message }, err.status);
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** Minimal HTML viewer — no Kosmos shell. */
shareRoutes.get("/s/:token", async (c) => {
  const token = c.req.param("token");
  const password = sharePassword(c);
  try {
    const peek = shareService.peekToken(token);
    if (peek.hasPassword && !password) {
      return c.html(
        shareViewerHtml({
          token,
          name: peek.fileName,
          kind: "file",
          needsPassword: true,
        }),
      );
    }
    const resolved = shareService.resolveToken(token, password);
    const kind = resolved.file.mimeType === FOLDER_MIME ? "folder" : "file";
    return c.html(shareViewerHtml({ token, name: resolved.file.name, kind, needsPassword: false }));
  } catch (err) {
    if (err instanceof ShareAccessError && err.status === 401) {
      const peek = shareService.peekToken(token);
      return c.html(
        shareViewerHtml({
          token,
          name: peek.fileName,
          kind: "file",
          needsPassword: true,
          error: "Incorrect password",
        }),
        401,
      );
    }
    if (err instanceof ShareAccessError) {
      return c.html(
        `<!DOCTYPE html><html><body><h1>Share unavailable</h1><p>${err.message}</p></body></html>`,
        err.status,
      );
    }
    return c.html(`<html><body><p>${(err as Error).message}</p></body></html>`, 500);
  }
});
