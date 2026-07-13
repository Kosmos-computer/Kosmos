/**
 * Nostr adapter mapping tests — note event → SocialFeedPost DTO.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeEvent, generateSecretKey, getPublicKey, kinds, type Event } from "nostr-tools";
import {
  mapNostrNote,
  normalizeNostrRelays,
  NOSTR_DEFAULT_RELAYS,
  parseNostrRelays,
  parseNostrSecretKey,
} from "./adapters/nostr.js";

function noteEvent(overrides: {
  content?: string;
  replyRoot?: string;
  replyParent?: string;
  created_at?: number;
} = {}): Event {
  const sk = generateSecretKey();
  const tags: string[][] = [];
  if (overrides.replyRoot) tags.push(["e", overrides.replyRoot, "", "root"]);
  if (overrides.replyParent) tags.push(["e", overrides.replyParent, "", "reply"]);
  return finalizeEvent(
    {
      kind: kinds.ShortTextNote,
      created_at: overrides.created_at ?? 1_720_000_000,
      tags,
      content: overrides.content ?? "Hello from Kosmos Nostr",
    },
    sk,
  );
}

describe("mapNostrNote", () => {
  it("maps author, text, and reply target for a root note", () => {
    const event = noteEvent();
    const mapped = mapNostrNote(event);
    assert.equal(mapped.uri, event.id);
    assert.equal(mapped.cid, event.id);
    assert.equal(mapped.author.did, event.pubkey);
    assert.equal(mapped.text, "Hello from Kosmos Nostr");
    assert.deepEqual(mapped.replyTarget, {
      parentUri: event.id,
      parentCid: event.id,
      rootUri: event.id,
      rootCid: event.id,
    });
  });

  it("preserves root/reply e-tag markers", () => {
    const root = "a".repeat(64);
    const parent = "b".repeat(64);
    const event = noteEvent({ replyRoot: root, replyParent: parent });
    const mapped = mapNostrNote(event);
    assert.equal(mapped.replyTarget.rootUri, root);
    assert.equal(mapped.replyTarget.parentUri, parent);
  });

  it("extracts image urls as embeds", () => {
    const event = noteEvent({
      content: "pic https://cdn.example/a.png more",
    });
    const mapped = mapNostrNote(event);
    assert.equal(mapped.embeds?.[0]?.type, "images");
  });
});

describe("parseNostrSecretKey / normalizeNostrRelays", () => {
  it("accepts hex private keys", () => {
    const sk = generateSecretKey();
    const hex = Buffer.from(sk).toString("hex");
    const parsed = parseNostrSecretKey(hex);
    assert.equal(getPublicKey(parsed), getPublicKey(sk));
  });

  it("falls back to Snort default relays when empty", () => {
    assert.deepEqual(normalizeNostrRelays([]), [...NOSTR_DEFAULT_RELAYS]);
  });

  it("dedupes and normalizes relay urls", () => {
    const relays = normalizeNostrRelays([
      "wss://relay.snort.social/",
      "wss://relay.snort.social",
      "https://not-a-relay",
      "wss://nos.lol",
    ]);
    assert.deepEqual(relays, ["wss://relay.snort.social", "wss://nos.lol"]);
  });

  it("parseNostrRelays returns empty when nothing valid", () => {
    assert.deepEqual(parseNostrRelays(["https://not-a-relay", ""]), []);
  });
});
