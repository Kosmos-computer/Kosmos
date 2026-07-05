/**
 * App tool contributions — installed apps extend the agent. A manifest can
 * declare `tools`; each compiles to a RegisteredTool named
 * app__<kebab-id>__<name> with source {kind:"app", appId}.
 *
 * Two security layers stack on every call:
 *   1. The app's own grant sheet — dispatch runs with the APP's identity
 *      through the same checks as the bridge, so an app cannot hand the
 *      agent more power than the user granted the app itself.
 *   2. The agent policy layer (loop-side) — `app:<id>` rules, with write
 *      intents defaulting to confirm.
 *
 * Bindings are declarative, so dispatch is deterministic code: an intent
 * through the capability registry, or a fixed SELECT on the app's own
 * storage namespace. No app code runs to serve a tool call.
 */
import { intentMeta } from "../../shared/capabilities/index.js";
import { describePermissionKey, type ToolContribution } from "../../shared/manifest.js";
import { registerToolContributor, type RegisteredTool } from "../agent/toolRegistry.js";
import { invokeIntent } from "../capabilities/registry.js";
import { dbQuery } from "../stores/db.js";
import { storageNamespace } from "./bridge.js";
import { appendAudit, grantStore } from "./grantStore.js";
import { installedAppStore } from "./installedAppStore.js";

/** "core.calendar" → "core-calendar" (LLM tool names forbid dots). */
function kebabId(appId: string): string {
  return appId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function compile(appId: string, appName: string, tool: ToolContribution): RegisteredTool {
  const access =
    tool.binding.kind === "storage-query"
      ? "read"
      : (intentMeta(tool.binding.intent)?.access ?? "write");

  return {
    name: `app__${kebabId(appId)}__${tool.name}`.slice(0, 64),
    description: `[${appName}] ${tool.description}`,
    parameters: tool.parameters,
    source: { kind: "app", appId },
    access,
    execute: async (args) => {
      if (tool.binding.kind === "intent") {
        const intentId = tool.binding.intent;
        // The app's grant sheet decides — same check, same audit shape as a
        // bridge call from the app's own window.
        const check = grantStore.checkIntent(appId, intentId);
        appendAudit({
          caller: { kind: "app", appId },
          method: `intent.invoke:${intentId}`,
          detail: "agent tool",
          allowed: check.allowed,
        });
        if (!check.allowed) {
          return {
            error: `${appName} lacks the permission "${describePermissionKey(check.key)}" (${check.state}). The user manages grants in Settings → Apps.`,
          };
        }
        return invokeIntent(intentId, args);
      }
      // storage-query: a fixed SELECT over the app's own namespace, with the
      // model's arguments as named bind parameters only — never SQL.
      return dbQuery(tool.binding.sql, args, storageNamespace(appId));
    },
  };
}

registerToolContributor(() =>
  installedAppStore
    .list()
    .filter((a) => a.enabled && (a.manifest.tools?.length ?? 0) > 0)
    .flatMap((a) => a.manifest.tools!.map((t) => compile(a.manifest.id, a.manifest.name, t))),
);
