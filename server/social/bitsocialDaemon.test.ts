/**
 * Bitsocial daemon supervisor helpers.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bitsocialRpcUrl,
  isManagedBitsocialRpcUrl,
  resolveBitsocialLaunch,
} from "../services/bitsocialDaemon.js";
import { BITSOCIAL_DEFAULT_RPC } from "./adapters/bitsocial.js";

describe("isManagedBitsocialRpcUrl", () => {
  it("accepts the local default RPC", () => {
    assert.equal(isManagedBitsocialRpcUrl(BITSOCIAL_DEFAULT_RPC), true);
    assert.equal(isManagedBitsocialRpcUrl("ws://127.0.0.1:9138"), true);
    assert.equal(isManagedBitsocialRpcUrl("ws://localhost:9138/auth-key"), true);
  });

  it("rejects remote or non-default ports", () => {
    assert.equal(isManagedBitsocialRpcUrl("ws://example.com:9138"), false);
    assert.equal(isManagedBitsocialRpcUrl("ws://localhost:9000"), false);
  });
});

describe("bitsocialRpcUrl", () => {
  it("defaults to the Bitsocial local endpoint", () => {
    assert.equal(bitsocialRpcUrl(), BITSOCIAL_DEFAULT_RPC);
  });
});

describe("resolveBitsocialLaunch", () => {
  it("resolves a launchable command", () => {
    const launch = resolveBitsocialLaunch();
    assert.ok(launch.command);
    assert.ok(launch.args.includes("daemon"));
    assert.ok(launch.label.length > 0);
  });
});
