/**
 * Unit tests for Slack mention gating and mention stripping.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slackMessageMentionsBot, stripSlackBotMention } from "./slack.js";

describe("slackMessageMentionsBot", () => {
  it("treats app_mention as mentioned", () => {
    assert.equal(slackMessageMentionsBot("do this", "U123", "app_mention"), true);
  });

  it("detects <@BOTID> in message text", () => {
    assert.equal(slackMessageMentionsBot("hey <@U123> ship it", "U123", "message"), true);
  });

  it("ignores unrelated channel chatter", () => {
    assert.equal(slackMessageMentionsBot("lunch plans?", "U123", "message"), false);
  });
});

describe("stripSlackBotMention", () => {
  it("strips leading bot mention", () => {
    assert.equal(stripSlackBotMention("<@U123> draft posts", "U123"), "draft posts");
  });

  it("leaves text without mention intact", () => {
    assert.equal(stripSlackBotMention("draft posts", "U123"), "draft posts");
  });
});
