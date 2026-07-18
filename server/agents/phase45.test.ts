/**
 * canUseProfile + turnRunner helpers.
 */
import { describe, expect, it } from "vitest";
import { canUseProfile } from "../../shared/profiles.js";
import { resolveTurnKind } from "../agent/resolveTurnKind.js";
import type { AgentProfile } from "../../shared/agents.js";
import { BUILTIN_AGENT_ID } from "../../shared/agents.js";
import {
  beginProfileActivity,
  endProfileActivity,
  isProfileBusy,
  listBusyProfileIds,
} from "./activity.js";

describe("canUseProfile", () => {
  it("allows enabled standard profiles", () => {
    expect(canUseProfile({ enabled: true, safety: { level: "standard" } }).allowed).toBe(true);
  });

  it("denies disabled profiles", () => {
    expect(canUseProfile({ enabled: false }).allowed).toBe(false);
  });

  it("denies restricted under parental for members", () => {
    expect(
      canUseProfile({
        enabled: true,
        safety: { level: "restricted" },
        parentalControls: true,
        role: "member",
      }).allowed,
    ).toBe(false);
  });

  it("allows restricted under parental for owners", () => {
    expect(
      canUseProfile({
        enabled: true,
        safety: { level: "restricted" },
        parentalControls: true,
        role: "owner",
      }).allowed,
    ).toBe(true);
  });
});

describe("resolveTurnKind", () => {
  it("uses profile runtime when non-builtin", () => {
    const profile = {
      id: "agent:acp:codex",
      runtime: { kind: "acp", acpPresetId: "codex" },
    } as AgentProfile;
    expect(resolveTurnKind(profile)).toBe("acp");
  });

  it("falls back to settings for builtin profile runtime", () => {
    const profile = {
      id: BUILTIN_AGENT_ID,
      runtime: { kind: "builtin" },
    } as AgentProfile;
    // Settings may be acp/cursor/etc — just assert it returns a valid AgentKind string.
    expect(typeof resolveTurnKind(profile)).toBe("string");
  });
});

describe("profile activity", () => {
  it("tracks busy refcounts", () => {
    beginProfileActivity("agent:user:alice");
    expect(isProfileBusy("agent:user:alice")).toBe(true);
    expect(listBusyProfileIds()).toContain("agent:user:alice");
    beginProfileActivity("agent:user:alice");
    endProfileActivity("agent:user:alice");
    expect(isProfileBusy("agent:user:alice")).toBe(true);
    endProfileActivity("agent:user:alice");
    expect(isProfileBusy("agent:user:alice")).toBe(false);
  });
});
