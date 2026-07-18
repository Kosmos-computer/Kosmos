/**
 * ACP session helpers — model discovery / selection for the composer picker.
 * Mounted at /api/acp.
 */
import { Hono } from "hono";
import {
  ensureAcpModels,
  peekAcpModels,
  setAcpSessionModel,
} from "../acp/acpAgent.js";
import { requireCap } from "../auth/middleware.js";

export const acpRoutes = new Hono();

function serializeModels(
  models: Awaited<ReturnType<typeof ensureAcpModels>>,
) {
  if (!models) return null;
  return {
    availableModels: models.availableModels.map((m) => ({
      modelId: m.modelId,
      name: m.name,
      description: m.description ?? null,
    })),
    currentModelId: models.currentModelId,
  };
}

acpRoutes.get("/models/:sessionKey", (c) => {
  const sessionKey = decodeURIComponent(c.req.param("sessionKey"));
  return c.json({ models: serializeModels(peekAcpModels(sessionKey)) });
});

acpRoutes.post("/models/ensure", requireCap("chat"), async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    sessionKey?: string;
    acpCommand?: string;
  } | null;
  const sessionKey = body?.sessionKey?.trim();
  const acpCommand = body?.acpCommand?.trim();
  if (!sessionKey || !acpCommand) {
    return c.json({ error: "sessionKey and acpCommand are required" }, 400);
  }
  try {
    const models = await ensureAcpModels(sessionKey, acpCommand);
    return c.json({ models: serializeModels(models) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ACP models";
    return c.json({ error: message }, 502);
  }
});

acpRoutes.put("/models", requireCap("chat"), async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    sessionKey?: string;
    acpCommand?: string;
    modelId?: string;
  } | null;
  const sessionKey = body?.sessionKey?.trim();
  const modelId = body?.modelId?.trim();
  const acpCommand = body?.acpCommand?.trim();
  if (!sessionKey || !modelId) {
    return c.json({ error: "sessionKey and modelId are required" }, 400);
  }
  try {
    const models = await setAcpSessionModel(sessionKey, modelId, acpCommand);
    return c.json({ models: serializeModels(models) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set ACP model";
    return c.json({ error: message }, 502);
  }
});
