import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGitHubLogin } from "./githubOAuth.js";

describe("resolveGitHubLogin", () => {
  it("rejects invalid tokens", async () => {
    await assert.rejects(() => resolveGitHubLogin("not-a-real-token"), /credentials|profile/i);
  });

  it("accepts a valid GitHub token when GH_TOKEN is set", async (t) => {
    const token = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
    if (!token) {
      t.skip("GH_TOKEN / GITHUB_TOKEN not set");
      return;
    }
    const login = await resolveGitHubLogin(token);
    assert.match(login, /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/);
  });
});
