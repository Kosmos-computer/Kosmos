/**
 * Plane issue parsing and the agent-only note. No network.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  messageForAgent,
  parsePlaneCycles,
  parsePlaneIssue,
  parsePlaneIssueList,
  pickActiveCycle,
  planeApiUrl,
  planeIssueNote,
} from "./planeIssue.js";

describe("parsePlaneIssueList", () => {
  it("reads a paginated results array into ENGINE keys", () => {
    const issues = parsePlaneIssueList(
      {
        results: [
          { id: "b", name: "Later", sequence_id: 4 },
          { id: "a", name: "First", sequence_id: 1 },
          { id: "", name: "Skip", sequence_id: 2 },
        ],
      },
      "ENGINE",
    );
    assert.deepEqual(
      issues.map((issue) => issue.key),
      ["ENGINE-1", "ENGINE-4"],
    );
    assert.equal(issues[0].id, "a");
  });

  it("accepts a bare array", () => {
    const issues = parsePlaneIssueList([{ id: "x", name: "One", sequence_id: "3" }], "ENGINE");
    assert.equal(issues[0]?.key, "ENGINE-3");
  });
});

describe("parsePlaneIssue", () => {
  it("returns null when the name is missing", () => {
    assert.equal(parsePlaneIssue({ id: "x", sequence_id: 1 }, "ENGINE"), null);
  });
});

describe("planeApiUrl", () => {
  it("uses the compose proxy when MCP is the Plane container", () => {
    assert.equal(
      planeApiUrl({ ARCO_PLANE_MCP_URL: "http://plane-plane-mcp-1:8211/http/api-key/mcp" }),
      "http://plane-proxy-1",
    );
  });

  it("keeps the laptop tunnel unless a URL is set", () => {
    assert.equal(planeApiUrl({}), "http://127.0.0.1:8090");
    assert.equal(planeApiUrl({ ARCO_PLANE_API_URL: "http://127.0.0.1:8090/" }), "http://127.0.0.1:8090");
  });
});

describe("pickActiveCycle", () => {
  const cycles = parsePlaneCycles({
    results: [
      { id: "old", name: "last week", start_date: "2026-10-01T00:00:00Z", end_date: "2026-10-10T00:00:00Z" },
      { id: "now", name: "2026-10-18", start_date: "2026-10-18T00:00:00Z", end_date: "2026-10-25T23:59:00Z" },
    ],
  });

  it("picks the cycle whose window contains now", () => {
    assert.equal(pickActiveCycle(cycles, new Date("2026-10-18T23:00:00Z"))?.id, "now");
  });

  it("falls back to the most recently ended cycle", () => {
    assert.equal(pickActiveCycle(cycles, new Date("2026-11-01T00:00:00Z"))?.id, "now");
  });

  it("reads an issue nested under a cycle membership row", () => {
    const issues = parsePlaneIssueList(
      [{ id: "membership", issue: { id: "issue", name: "Airship", sequence_id: 1 } }],
      "ENGINE",
    );
    assert.equal(issues[0]?.key, "ENGINE-1");
    assert.equal(issues[0]?.id, "issue");
  });
});

describe("planeIssueNote", () => {
  it("is empty for an unbound session", () => {
    assert.equal(planeIssueNote({}), "");
    assert.equal(messageForAgent({}, "hello"), "hello");
  });

  it("names the issue for the agent and leaves the user words in front", () => {
    const note = planeIssueNote({ planeIssueId: "uuid", planeIssueKey: "ENGINE-4" });
    assert.match(note, /ENGINE-4/);
    assert.match(note, /uuid/);
    assert.match(note, /Agent Canvas/);
    const sent = messageForAgent({ planeIssueId: "uuid", planeIssueKey: "ENGINE-4" }, "fix the hash");
    assert.ok(sent.startsWith("fix the hash\n\n["));
    assert.ok(sent.endsWith("]"));
  });
});
