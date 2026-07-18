/**
 * Unit tests for agent profile id helpers (Phase 0).
 */
import { describe, expect, it } from "vitest";
import {
  BUILTIN_AGENT_ID,
  builtinAgentProfile,
  isValidAgentId,
  slugifyAgentName,
  userAgentId,
} from "./agents.js";

describe("agent id helpers", () => {
  it("slugifies names", () => {
    expect(slugifyAgentName("Alice Bot")).toBe("alice-bot");
    expect(slugifyAgentName("  ")).toBe("agent");
  });

  it("builds user ids", () => {
    expect(userAgentId("alice")).toBe("agent:user:alice");
  });

  it("validates ids", () => {
    expect(isValidAgentId(BUILTIN_AGENT_ID)).toBe(true);
    expect(isValidAgentId("agent:user:alice")).toBe(true);
    expect(isValidAgentId("agent:acp:claude-code")).toBe(true);
    expect(isValidAgentId("agent:channel:telegram")).toBe(false);
    expect(isValidAgentId("builtin")).toBe(false);
  });

  it("seeds builtin profile", () => {
    const p = builtinAgentProfile("2026-01-01T00:00:00.000Z");
    expect(p.id).toBe(BUILTIN_AGENT_ID);
    expect(p.principalId).toBe(BUILTIN_AGENT_ID);
    expect(p.runtime.kind).toBe("builtin");
    expect(p.modelSlot).toBe("agent.chat");
  });
});
