/**
 * Bitsocial adapter mapping tests — page comment → SocialFeedPost DTO.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BITSOCIAL_DEFAULT_COMMUNITIES,
  BITSOCIAL_DEFAULT_RPC,
  decodeBitsocialService,
  encodeBitsocialService,
  mapBitsocialComment,
  normalizeBitsocialCommunities,
  normalizeBitsocialRpcUrl,
  type BitsocialPageComment,
} from "./adapters/bitsocial.js";

function pageComment(overrides: {
  content?: string;
  title?: string;
  link?: string;
  cid?: string;
  parentCid?: string;
  postCid?: string;
  depth?: number;
  deleted?: boolean;
} = {}): BitsocialPageComment {
  return {
    comment: {
      content: overrides.content ?? "Hello from Bitsocial",
      title: overrides.title,
      link: overrides.link,
      timestamp: 1_720_000_000,
      depth: overrides.depth ?? 0,
      parentCid: overrides.parentCid,
      postCid: overrides.postCid,
      author: { address: "12D3KooWAuthorExample", displayName: "alice" },
      signature: { publicKey: "12D3KooWAuthorExample" },
      communityAddress: "askseedit.bso",
    },
    commentUpdate: {
      cid: overrides.cid ?? "QmTestCid1234567890",
      upvoteCount: 3,
      replyCount: 1,
      edit: overrides.deleted ? { deleted: true } : undefined,
    },
  };
}

describe("mapBitsocialComment", () => {
  it("maps author, text, counts, and reply target for a root post", () => {
    const mapped = mapBitsocialComment(pageComment(), "askseedit.bso");
    assert.ok(mapped);
    assert.equal(mapped.uri, "QmTestCid1234567890");
    assert.equal(mapped.cid, "QmTestCid1234567890");
    assert.equal(mapped.author.did, "12D3KooWAuthorExample");
    assert.equal(mapped.author.displayName, "alice");
    assert.match(mapped.text, /Hello from Bitsocial/);
    assert.equal(mapped.counts.likes, 3);
    assert.equal(mapped.counts.replies, 1);
    assert.deepEqual(mapped.replyTarget, {
      parentUri: "QmTestCid1234567890",
      parentCid: "QmTestCid1234567890",
      rootUri: "QmTestCid1234567890",
      rootCid: "QmTestCid1234567890",
    });
  });

  it("returns null for deleted comments", () => {
    assert.equal(mapBitsocialComment(pageComment({ deleted: true })), null);
  });

  it("extracts image links as embeds", () => {
    const mapped = mapBitsocialComment(
      pageComment({ link: "https://cdn.example/a.png", title: "pic" }),
    );
    assert.equal(mapped?.embeds?.[0]?.type, "images");
  });
});

describe("normalizeBitsocialRpcUrl / communities", () => {
  it("defaults blank URL to local daemon", () => {
    assert.equal(normalizeBitsocialRpcUrl(""), BITSOCIAL_DEFAULT_RPC);
    assert.equal(normalizeBitsocialRpcUrl("   "), BITSOCIAL_DEFAULT_RPC);
  });

  it("defaults protocol to ws://", () => {
    assert.equal(normalizeBitsocialRpcUrl("localhost:9138"), "ws://localhost:9138");
  });

  it("preserves auth-key path", () => {
    assert.equal(
      normalizeBitsocialRpcUrl("ws://localhost:9138/secret-key"),
      "ws://localhost:9138/secret-key",
    );
  });

  it("rejects non-websocket schemes", () => {
    assert.throws(() => normalizeBitsocialRpcUrl("https://localhost:9138"), /ws:\/\/ or wss:\/\//);
  });

  it("falls back to default communities when empty", () => {
    assert.deepEqual(normalizeBitsocialCommunities([]), [...BITSOCIAL_DEFAULT_COMMUNITIES]);
  });

  it("round-trips service encoding", () => {
    const session = {
      rpcUrl: BITSOCIAL_DEFAULT_RPC,
      communities: ["askseedit.bso"],
    };
    assert.deepEqual(decodeBitsocialService(encodeBitsocialService(session)), session);
  });
});
