/**
 * Protocol audit regressions — OpenClaw parity checks that broke at runtime.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { channelMeta } from "../../../shared/channelCatalog.js";
import { createTwitchAdapter } from "./twitch.js";
import { rememberLineReplyToken, takeLineReplyToken } from "./lineReplyCache.js";

describe("Twitch vs OpenClaw", () => {
  it("requires nick separate from OAuth token", () => {
    assert.throws(
      () =>
        createTwitchAdapter(
          {
            id: "t1",
            kind: "twitch",
            name: "tw",
            token: "oauth:abc",
            enabled: true,
            options: { channels: "mychan" },
          } as never,
          () => {},
        ),
      /options\.nick/,
    );
  });
});

describe("LINE reply tokens", () => {
  it("prefers reply then clears", () => {
    rememberLineReplyToken("ch1", "Uuser", "tok-1");
    assert.equal(takeLineReplyToken("ch1", "Uuser"), "tok-1");
    assert.equal(takeLineReplyToken("ch1", "Uuser"), undefined);
  });
});

describe("catalog honesty after audit", () => {
  it("marks remaining stubs honestly; promotes completed adapters", () => {
    assert.equal(channelMeta("reef")?.maturity, "beta");
    assert.equal(channelMeta("raft")?.maturity, "beta");
    assert.equal(channelMeta("nostr")?.maturity, "beta");
    assert.equal(channelMeta("voicecall")?.maturity, "beta");
    assert.equal(channelMeta("feishu")?.transport, "webhook");
    assert.match(channelMeta("matrix")?.setup ?? "", /Rust crypto|E2EE|encryption/i);
    assert.equal(channelMeta("msteams")?.maturity, "beta");
    assert.equal(channelMeta("googlechat")?.maturity, "beta");
  });
});
