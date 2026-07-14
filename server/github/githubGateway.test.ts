import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGitHubIssueRef } from "./githubGateway.js";

describe("parseGitHubIssueRef", () => {
  it("parses issue URLs", () => {
    assert.deepEqual(parseGitHubIssueRef("https://github.com/arco-os/kosmos/issues/42"), {
      owner: "arco-os",
      repo: "kosmos",
      number: 42,
    });
  });

  it("parses pull request URLs as issues", () => {
    assert.deepEqual(parseGitHubIssueRef("https://github.com/arco-os/kosmos/pull/7"), {
      owner: "arco-os",
      repo: "kosmos",
      number: 7,
    });
  });

  it("parses short refs", () => {
    assert.deepEqual(parseGitHubIssueRef("arco-os/kosmos#99"), {
      owner: "arco-os",
      repo: "kosmos",
      number: 99,
    });
  });

  it("rejects invalid input", () => {
    assert.throws(() => parseGitHubIssueRef("not-an-issue"), /Expected a GitHub issue/);
  });
});
