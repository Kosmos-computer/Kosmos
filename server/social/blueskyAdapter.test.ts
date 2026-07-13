/**
 * Bluesky adapter mapping tests — feed item → SocialFeedPost DTO.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppBskyFeedDefs } from "@atproto/api";
import { mapFeedViewPost } from "./adapters/bluesky.js";

function feedItem(overrides: {
  text?: string;
  like?: string;
  following?: string;
  avatar?: string;
  replyRoot?: { uri: string; cid: string };
  embed?: AppBskyFeedDefs.PostView["embed"];
}): AppBskyFeedDefs.FeedViewPost {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: overrides.text ?? "Hello from Kosmos",
    createdAt: "2026-07-13T18:00:00.000Z",
  };
  if (overrides.replyRoot) {
    record.reply = {
      parent: { uri: "at://did:plc:parent/app.bsky.feed.post/parent", cid: "bafyparent" },
      root: overrides.replyRoot,
    };
  }
  return {
    post: {
      uri: "at://did:plc:author/app.bsky.feed.post/abc",
      cid: "bafyabc",
      author: {
        did: "did:plc:author",
        handle: "alice.bsky.social",
        displayName: "Alice",
        avatar: overrides.avatar,
        viewer: overrides.following ? { following: overrides.following } : {},
      },
      record,
      embed: overrides.embed,
      indexedAt: "2026-07-13T18:00:00.000Z",
      replyCount: 2,
      repostCount: 3,
      likeCount: 4,
      viewer: {
        like: overrides.like,
      },
    },
  } as AppBskyFeedDefs.FeedViewPost;
}

describe("mapFeedViewPost", () => {
  it("maps author, text, counts, avatar, and reply target for a root post", () => {
    const mapped = mapFeedViewPost(feedItem({ avatar: "https://cdn.example/avatar.jpg" }));
    assert.equal(mapped.uri, "at://did:plc:author/app.bsky.feed.post/abc");
    assert.equal(mapped.cid, "bafyabc");
    assert.equal(mapped.author.handle, "alice.bsky.social");
    assert.equal(mapped.author.displayName, "Alice");
    assert.equal(mapped.author.avatar, "https://cdn.example/avatar.jpg");
    assert.equal(mapped.text, "Hello from Kosmos");
    assert.deepEqual(mapped.counts, { replies: 2, reposts: 3, likes: 4 });
    assert.deepEqual(mapped.replyTarget, {
      parentUri: "at://did:plc:author/app.bsky.feed.post/abc",
      parentCid: "bafyabc",
      rootUri: "at://did:plc:author/app.bsky.feed.post/abc",
      rootCid: "bafyabc",
    });
  });

  it("preserves viewer like/follow and reply root refs", () => {
    const mapped = mapFeedViewPost(
      feedItem({
        like: "at://did:plc:me/app.bsky.feed.like/1",
        following: "at://did:plc:me/app.bsky.graph.follow/1",
        replyRoot: { uri: "at://did:plc:root/app.bsky.feed.post/root", cid: "bafyroot" },
      }),
    );
    assert.equal(mapped.viewer.like, "at://did:plc:me/app.bsky.feed.like/1");
    assert.equal(mapped.viewer.following, "at://did:plc:me/app.bsky.graph.follow/1");
    assert.equal(mapped.replyTarget.rootUri, "at://did:plc:root/app.bsky.feed.post/root");
    assert.equal(mapped.replyTarget.rootCid, "bafyroot");
  });

  it("maps image embeds", () => {
    const mapped = mapFeedViewPost(
      feedItem({
        embed: {
          $type: "app.bsky.embed.images#view",
          images: [
            {
              thumb: "https://cdn.example/thumb.jpg",
              fullsize: "https://cdn.example/full.jpg",
              alt: "A cat",
            },
          ],
        } as AppBskyFeedDefs.PostView["embed"],
      }),
    );
    assert.ok(mapped.embeds);
    assert.equal(mapped.embeds?.[0]?.type, "images");
    if (mapped.embeds?.[0]?.type === "images") {
      assert.equal(mapped.embeds[0].images[0]?.alt, "A cat");
      assert.equal(mapped.embeds[0].images[0]?.fullsize, "https://cdn.example/full.jpg");
    }
  });
});
