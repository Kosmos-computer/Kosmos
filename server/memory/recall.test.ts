/**
 * Unit tests for budgeted memory recall formatting.
 */
import { describe, expect, it } from "vitest";
import { formatRecallForPrompt } from "./recall.js";
import type { RecallBundle } from "../../shared/capabilities/memory.js";

describe("formatRecallForPrompt", () => {
  it("returns empty string for no hits", () => {
    expect(formatRecallForPrompt({ hits: [], tokenEstimate: 0 })).toBe("");
  });

  it("formats hits with kind and id", () => {
    const bundle: RecallBundle = {
      tokenEstimate: 40,
      hits: [
        {
          entryId: "abc",
          kind: "semantic",
          title: "Prefers dark mode",
          excerpt: "User likes dark UI",
          score: 1,
        },
      ],
    };
    const text = formatRecallForPrompt(bundle);
    expect(text).toContain("Relevant memory");
    expect(text).toContain("semantic");
    expect(text).toContain("id=abc");
    expect(text).toContain("Prefers dark mode");
  });
});
