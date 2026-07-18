/**
 * Toolset allowlist resolution tests.
 */
import { describe, expect, it } from "vitest";
import { resolveToolsetAllowlist } from "./toolsets.js";

describe("resolveToolsetAllowlist", () => {
  it("returns null for empty / all (no filter)", () => {
    expect(resolveToolsetAllowlist(undefined)).toBeNull();
    expect(resolveToolsetAllowlist([])).toBeNull();
    expect(resolveToolsetAllowlist(["all"])).toBeNull();
  });

  it("unions tool names from selected sets", () => {
    const set = resolveToolsetAllowlist(["memory"]);
    expect(set).not.toBeNull();
    expect(set!.has("memory_search")).toBe(true);
    expect(set!.has("session_search")).toBe(true);
    expect(set!.has("exec")).toBe(false);
  });
});
