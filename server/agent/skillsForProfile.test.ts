/**
 * skillsForProfile — allowlist replace + denylist semantics.
 */
import { describe, expect, it, vi } from "vitest";
import type { AgentProfile } from "../../shared/agents.js";
import { BUILTIN_AGENT_ID } from "../../shared/agents.js";

vi.mock("../skills/skillStore.js", () => ({
  skillStore: {
    list: () => [
      { id: "a", description: "A", enabled: true, gates: [] },
      { id: "b", description: "B", enabled: true, gates: [] },
      { id: "c", description: "C", enabled: false, gates: [] },
      { id: "d", description: "D", enabled: true, gates: [] },
    ],
  },
}));

import { skillsForProfile } from "../agent/systemPrompt.js";

function profile(partial: Partial<AgentProfile>): AgentProfile {
  return {
    id: BUILTIN_AGENT_ID,
    name: "Arco",
    enabled: true,
    principalId: BUILTIN_AGENT_ID,
    runtime: { kind: "builtin" },
    source: "seed",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("skillsForProfile", () => {
  it("omitted skills returns all enabled", () => {
    expect(skillsForProfile(profile({})).map((s) => s.id)).toEqual(["a", "b", "d"]);
  });

  it("empty allowlist returns none", () => {
    expect(skillsForProfile(profile({ skills: [] }))).toEqual([]);
  });

  it("allowlist replace then denylist", () => {
    expect(
      skillsForProfile(profile({ skills: ["a", "b", "d"], skillsDisabled: ["b"] })).map(
        (s) => s.id,
      ),
    ).toEqual(["a", "d"]);
  });
});
