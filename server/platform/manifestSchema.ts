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
    // Path segment only — no traversal, resolved under ./apps/.
    path: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "bundle path must be a plain folder name"),
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
    features: z.array(z.enum(["notify", "windows", "clipboard"])).min(1),
  }),
]);

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
});

export function parseManifest(raw: unknown): { manifest?: AppManifest; error?: string } {
  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return { error: `Invalid manifest: ${first.path.join(".")} — ${first.message}` };
  }
  return { manifest: result.data as AppManifest };
}
