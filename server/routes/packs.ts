/**
 * Installable agent packs (Content first). Thin HTTP surface over pack installers.
 */
import { Hono } from "hono";
import { requireCap } from "../auth/middleware.js";
import { channelStore } from "../channels/channelStore.js";
import {
  CONTENT_PROFILE_ID,
  getContentPackInfo,
  installContentPack,
} from "../packs/contentPack.js";
import { automationStore } from "../stores/automationStore.js";

export const packRoutes = new Hono();

packRoutes.get("/content", async (c) => {
  const info = getContentPackInfo();
  const channels = channelStore.list();
  const slack = channels.filter((ch) => ch.kind === "slack" && ch.enabled);
  const anyPeers = channels.some((ch) => channelStore.peers(ch.id).length > 0);
  const bound = channels.some((ch) =>
    channelStore.peers(ch.id).some((p) => p.profileId === CONTENT_PROFILE_ID),
  );
  const { automations } = await automationStore.list({ limit: 200, offset: 0 });
  const packAutos = automations.filter((a) => a.prompt.includes("[pack:content:"));
  return c.json({
    ...info,
    checklist: {
      brandVoice: false, // client-local / Notes — not detected server-side yet
      slackConnected: slack.length > 0,
      peerPaired: anyPeers,
      peerBoundToContent: bound,
      automationEnabled: packAutos.some((a) => a.enabled),
      firstAskDone: false,
    },
    automations: packAutos.map((a) => ({
      id: a.id,
      name: a.name,
      enabled: a.enabled,
      schedule: a.schedule,
      deliver: a.deliver ?? null,
    })),
  });
});

packRoutes.post("/content/install", requireCap("settings:write"), async (c) => {
  try {
    const result = await installContentPack();
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Install failed" }, 500);
  }
});
