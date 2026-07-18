/**
 * Manifest validation — every install path (seed folder, URL, raw JSON)
 * funnels through here. Zod gives precise errors back to the installer UI.
 */
import { z } from "zod";
import type { AppManifest } from "../../shared/manifest.js";

const entrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: z.string().url() }),
  z.object({
    kind: z.literal("bundle"),
    // Segments under ./apps/ — e.g. "calendar" or "docs/dist" for Vite builds.
    path: z
      .string()
      .min(1)
      .refine(
        (p) =>
          !p.includes("..") &&
          p.split("/").every((seg) => /^[a-z0-9][a-z0-9-]*$/.test(seg)),
        "bundle path must be folder segments under ./apps/ (no ..)",
      ),
  }),
  z.object({ kind: z.literal("openui"), appId: z.string().min(1) }),
]);

const permissionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("intent"), id: z.string().min(1) }),
  z.object({
    kind: z.literal("contract"),
    id: z.string().min(1),
    access: z.enum(["read", "write"]),
  }),
  z.object({ kind: z.literal("storage"), scope: z.literal("own") }),
  z.object({
    kind: z.literal("shell"),
    features: z.array(z.enum(["notify", "windows", "clipboard", "agent"])).min(1),
  }),
]);

const toolContributionSchema = z.object({
  // Local tool name — the compiler namespaces it, so only the charset the
  // LLM tool-name grammar allows.
  name: z.string().regex(/^[a-z0-9_]{1,40}$/, "tool name must be snake_case"),
  description: z.string().min(1).max(500),
  parameters: z.record(z.string(), z.unknown()),
  binding: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("intent"), intent: z.string().min(1) }),
    z.object({
      kind: z.literal("storage-query"),
      // Reads only — a contributed tool may look at the app's own data but
      // never mutate through this binding (writes go through intents).
      sql: z.string().regex(/^\s*select\b/i, "storage-query bindings must be a SELECT"),
    }),
  ]),
});

export const manifestSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, "id must be dot-namespaced, e.g. core.calendar"),
  name: z.string().min(1).max(80),
  version: z.string().regex(/^\d+\.\d+\.\d+/, "version must be semver"),
  description: z.string().max(500).optional(),
  icon: z.string().max(60).optional(),
  tier: z.enum(["declarative", "code"]),
  entry: entrySchema,
  implements: z.array(z.string()).optional(),
  permissions: z.array(permissionSchema),
  tools: z.array(toolContributionSchema).max(20).optional(),
  events: z
    .object({
      emits: z.array(z.string()).optional(),
      subscribes: z.array(z.string()).optional(),
    })
    .optional(),
  chrome: z
    .object({
      toolbar: z.boolean().optional(),
    })
    .optional(),
});

export function parseManifest(raw: unknown): { manifest?: AppManifest; error?: string } {
  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return { error: `Invalid manifest: ${first.path.join(".")} — ${first.message}` };
  }
  return { manifest: result.data as AppManifest };
}
