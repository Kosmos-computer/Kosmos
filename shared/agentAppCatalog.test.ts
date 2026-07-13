/**
 * Smoke tests for the agent shell app catalog and control tagging.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShellAppCatalog,
  controlForInstalledManifest,
  controlForResolvedApp,
  controlForSystemApp,
} from "./agentAppCatalog.js";

describe("agentAppCatalog", () => {
  it("tags email and calendar system apps as tools", () => {
    assert.equal(controlForSystemApp("email").control, "tools");
    assert.equal(controlForSystemApp("calendar").control, "tools");
    assert.equal(controlForSystemApp("notes").control, "cursor");
  });

  it("tags installed apps: bundle=cursor/tools, url=open_only, openui=cursor", () => {
    assert.equal(
      controlForInstalledManifest({
        tier: "code",
        entry: { kind: "bundle", path: "docs/dist" },
        implements: ["os.docs@1"],
      }).control,
      "cursor",
    );
    assert.equal(
      controlForInstalledManifest({
        tier: "code",
        entry: { kind: "bundle", path: "calendar" },
        implements: ["os.calendar@1"],
      }).control,
      "tools",
    );
    assert.equal(
      controlForInstalledManifest({
        tier: "code",
        entry: { kind: "url", url: "https://example.com" },
      }).control,
      "open_only",
    );
    assert.equal(
      controlForInstalledManifest({
        tier: "declarative",
        entry: { kind: "openui", appId: "x" },
      }).control,
      "cursor",
    );
  });

  it("builds a catalog including all four kinds", () => {
    const catalog = buildShellAppCatalog({
      generated: [{ id: "gen1", title: "Todos", updatedAt: "2026-01-01" }],
      installed: [
        {
          enabled: true,
          manifest: {
            id: "core.docs",
            name: "Docs",
            version: "0.1.0",
            tier: "code",
            entry: { kind: "bundle", path: "docs/dist" },
            permissions: [],
          },
        },
      ],
      web: [{ id: "web1", name: "Local Dev" }],
    });
    assert.ok(catalog.some((e) => e.kind === "system" && e.id === "notes"));
    assert.ok(catalog.some((e) => e.kind === "generated" && e.id === "gen1"));
    assert.ok(catalog.some((e) => e.kind === "installed" && e.id === "core.docs" && e.control === "cursor"));
    assert.ok(catalog.some((e) => e.kind === "web" && e.id === "web1" && e.control === "open_only"));
    assert.equal(controlForResolvedApp("core.docs", catalog).control, "cursor");
  });
});
