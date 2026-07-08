import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGitRef } from "./gitClone.js";

describe("parseGitRef", () => {
  it("parses owner/repo shorthand", () => {
    assert.deepEqual(parseGitRef("openhands/openhands"), {
      url: "https://github.com/openhands/openhands.git",
      name: "openhands",
    });
  });

  it("parses https github URLs", () => {
    assert.deepEqual(parseGitRef("https://github.com/arco-os/Arco-Prototype-2"), {
      url: "https://github.com/arco-os/Arco-Prototype-2.git",
      name: "Arco-Prototype-2",
    });
  });

  it("rejects empty input", () => {
    assert.throws(() => parseGitRef("  "), /required/i);
  });
});
