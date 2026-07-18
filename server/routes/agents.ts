/**
 * Agent registry HTTP API — list/create/update/delete profiles.
 */
import { Hono } from "hono";
import type { CreateAgentProfileInput, UpdateAgentProfileInput } from "../../shared/agents.js";
import { requireCap } from "../auth/middleware.js";
import { agentStore } from "../agents/agentStore.js";

export const agentRoutes = new Hono();

agentRoutes.get("/", (c) => {
  return c.json({
    agents: agentStore.list(),
    defaultProfileId: agentStore.getDefault().id,
    busyProfileIds: agentStore.busyIds(),
  });
});

agentRoutes.get("/activity", (c) => {
  return c.json({ busyProfileIds: agentStore.busyIds() });
});

agentRoutes.get("/:id", (c) => {
  const profile = agentStore.get(c.req.param("id"));
  if (!profile) return c.json({ error: "Not found" }, 404);
  return c.json(profile);
});

agentRoutes.post("/", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as CreateAgentProfileInput;
  try {
    const profile = agentStore.create(body);
    return c.json(profile, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Create failed" }, 400);
  }
});

agentRoutes.patch("/:id", requireCap("settings:write"), async (c) => {
  const body = (await c.req.json()) as UpdateAgentProfileInput;
  try {
    const profile = agentStore.update(c.req.param("id"), body);
    if (!profile) return c.json({ error: "Not found" }, 404);
    return c.json(profile);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Update failed" }, 400);
  }
});

agentRoutes.delete("/:id", requireCap("settings:write"), (c) => {
  try {
    if (!agentStore.remove(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Delete failed" }, 400);
  }
});

agentRoutes.post("/:id/default", requireCap("settings:write"), (c) => {
  try {
    return c.json(agentStore.setDefault(c.req.param("id")));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Set default failed" }, 400);
  }
});
