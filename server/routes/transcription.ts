/**
 * Transcription pipeline API — mounted at /api/transcription
 */
import { Hono } from "hono";
import type { ArtifactKind, TranscriptSourceType } from "../../shared/transcription/types.js";
import { transcriptionService } from "../services/transcriptionService.js";
import { advanceJob } from "../transcription/pipeline.js";

export const transcriptionRoutes = new Hono();

transcriptionRoutes.get("/jobs", (c) => {
  const status = c.req.query("status") as "queued" | "processing" | "ready" | "failed" | undefined;
  const sourceType = c.req.query("sourceType") as TranscriptSourceType | undefined;
  return c.json(transcriptionService.listJobs({ status, sourceType }));
});

transcriptionRoutes.post("/jobs", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!file || typeof file === "string") {
      return c.json({ error: "file is required" }, 400);
    }
    try {
      const result = await transcriptionService.createUploadJob(file);
      void advanceJob(result.jobId);
      return c.json(result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return c.json({ error: message }, 400);
    }
  }

  const payload = (await c.req.json().catch(() => null)) as {
    sourceType?: TranscriptSourceType;
    sourceRef?: string;
    title?: string;
  } | null;
  void payload;
  return c.json({ error: "Use multipart upload with file field, or podcast routes for episodes" }, 400);
});

transcriptionRoutes.get("/jobs/:id", (c) => {
  const job = transcriptionService.getJob(c.req.param("id"));
  if (!job) return c.json({ error: "Job not found" }, 404);
  const { mediaPath: _mediaPath, ...publicJob } = job;
  return c.json(publicJob);
});

transcriptionRoutes.delete("/jobs/:id", (c) => {
  const ok = transcriptionService.deleteJob(c.req.param("id"));
  if (!ok) return c.json({ error: "Job not found" }, 404);
  return c.json({ ok: true });
});

transcriptionRoutes.get("/jobs/:id/transcript", (c) => {
  const transcript = transcriptionService.getTranscript(c.req.param("id"));
  if (!transcript) return c.json({ error: "Transcript not found" }, 404);
  return c.json(transcript);
});

transcriptionRoutes.post("/jobs/:id/artifacts/:kind", async (c) => {
  const kind = c.req.param("kind") as ArtifactKind;
  try {
    const artifact = await transcriptionService.regenerateArtifact(c.req.param("id"), kind);
    return c.json(artifact);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Artifact generation failed";
    return c.json({ error: message }, 404);
  }
});

transcriptionRoutes.get("/engines", async (c) => {
  return c.json(await transcriptionService.listEngines());
});
