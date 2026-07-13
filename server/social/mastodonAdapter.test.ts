/**
 * Mastodon adapter mapping tests — status → SocialFeedPost DTO.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapMastodonStatus,
  normalizeInstanceUrl,
  stripMastodonHtml,
  type MastodonStatus,
} from "./adapters/mastodon.js";

function status(overrides: Partial<MastodonStatus> = {}): MastodonStatus {
  return {
    id: "109123",
    uri: "https://mastodon.social/users/alice/statuses/109123",
    url: "https://mastodon.social/@alice/109123",
    created_at: "2026-07-13T18:00:00.000Z",
    content: "<p>Hello from <strong>Mastodon</strong></p>",
    reblogs_count: 3,
    favourites_count: 4,
    replies_count: 2,
    favourited: false,
    reblogged: false,
    in_reply_to_id: null,
    account: {
      id: "42",
      username: "alice",
      acct: "alice",
      display_name: "Alice",
      avatar: "https://cdn.example/avatar.jpg",
    },
    media_attachments: [],
    card: null,
    reblog: null,
    ...overrides,
  };
}

describe("stripMastodonHtml", () => {
  it("converts paragraph and bold markup to plain text", () => {
    assert.equal(stripMastodonHtml("<p>Hello <strong>world</strong></p>"), "Hello world");
  });
});

describe("normalizeInstanceUrl", () => {
  it("adds https and strips trailing slash", () => {
    assert.equal(normalizeInstanceUrl("mastodon.social/"), "https://mastodon.social");
  });

  it("rejects empty values", () => {
    assert.throws(() => normalizeInstanceUrl("   "), /instance URL is required/i);
  });
});

describe("mapMastodonStatus", () => {
  it("maps author, text, counts, and reply target", () => {
    const mapped = mapMastodonStatus(status());
    assert.equal(mapped.uri, "109123");
    assert.equal(mapped.cid, "109123");
    assert.equal(mapped.author.handle, "alice");
    assert.equal(mapped.author.displayName, "Alice");
    assert.equal(mapped.author.avatar, "https://cdn.example/avatar.jpg");
    assert.equal(mapped.text, "Hello from Mastodon");
    assert.deepEqual(mapped.counts, { replies: 2, reposts: 3, likes: 4 });
    assert.deepEqual(mapped.replyTarget, {
      parentUri: "109123",
      parentCid: "109123",
      rootUri: "109123",
      rootCid: "109123",
    });
  });

  it("preserves favourite/reblog viewer state and unwraps boosts", () => {
    const mapped = mapMastodonStatus(
      status({
        favourited: true,
        reblogged: true,
        reblog: status({
          id: "999",
          content: "<p>Boosted note</p>",
          account: {
            id: "7",
            username: "bob",
            acct: "bob@other.social",
            display_name: "Bob",
          },
        }),
      }),
    );
    assert.equal(mapped.uri, "999");
    assert.equal(mapped.author.handle, "bob@other.social");
    assert.equal(mapped.text, "Boosted note");
    assert.equal(mapped.viewer.like, "999");
    assert.equal(mapped.viewer.repost, "999");
  });

  it("maps image attachments", () => {
    const mapped = mapMastodonStatus(
      status({
        media_attachments: [
          {
            id: "m1",
            type: "image",
            url: "https://cdn.example/full.jpg",
            preview_url: "https://cdn.example/thumb.jpg",
            description: "A cat",
          },
        ],
      }),
    );
    assert.equal(mapped.embeds?.[0]?.type, "images");
    if (mapped.embeds?.[0]?.type === "images") {
      assert.equal(mapped.embeds[0].images[0]?.alt, "A cat");
      assert.equal(mapped.embeds[0].images[0]?.fullsize, "https://cdn.example/full.jpg");
    }
  });
});
