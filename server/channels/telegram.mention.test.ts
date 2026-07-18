/**
 * Unit tests for Telegram mention gating (OpenClaw group posture).
 */
import { describe, expect, it } from "vitest";
import { messageMentionsBot } from "./telegram.js";

describe("messageMentionsBot", () => {
  it("detects @mention entity", () => {
    const text = "hey @arco_bot do this";
    expect(
      messageMentionsBot(
        {
          chat: { id: 1, type: "group" },
          text,
          entities: [{ type: "mention", offset: 4, length: 9 }],
        },
        "arco_bot",
      ),
    ).toBe(true);
  });

  it("detects reply to bot", () => {
    expect(
      messageMentionsBot(
        {
          chat: { id: 1, type: "supergroup" },
          text: "yes",
          reply_to_message: { from: { id: 9, username: "arco_bot" } },
        },
        "arco_bot",
      ),
    ).toBe(true);
  });

  it("ignores unrelated group chatter", () => {
    expect(
      messageMentionsBot(
        {
          chat: { id: 1, type: "group" },
          text: "lunch plans?",
        },
        "arco_bot",
      ),
    ).toBe(false);
  });

  it("matches plain-text @bot without entities", () => {
    expect(
      messageMentionsBot(
        {
          chat: { id: 1, type: "group" },
          text: "@arco_bot status",
        },
        "@arco_bot",
      ),
    ).toBe(true);
  });
});
