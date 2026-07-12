import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sealSecret,
  secretLast4,
  unsealSecret,
  VaultCryptoError,
} from "./vaultCrypto.js";

describe("vaultCrypto", () => {
  const kek = "test-kek-material-do-not-use-in-prod";

  it("round-trips seal → unseal", () => {
    const sealed = sealSecret("sk-live-super-secret-key", kek, "test");
    assert.equal(sealed.v, 1);
    assert.equal(sealed.keyId, "test");
    assert.notEqual(sealed.ciphertext, "sk-live-super-secret-key");
    assert.equal(unsealSecret(sealed, kek), "sk-live-super-secret-key");
  });

  it("produces different ciphertext each seal (random IV/DEK)", () => {
    const a = sealSecret("same-secret", kek, "test");
    const b = sealSecret("same-secret", kek, "test");
    assert.notEqual(a.ciphertext, b.ciphertext);
    assert.notEqual(a.wrappedDek, b.wrappedDek);
  });

  it("fails unseal with the wrong KEK", () => {
    const sealed = sealSecret("secret", kek, "test");
    assert.throws(() => unsealSecret(sealed, "wrong-kek"), VaultCryptoError);
  });

  it("fails on tampered ciphertext", () => {
    const sealed = sealSecret("secret", kek, "test");
    const tampered = {
      ...sealed,
      ciphertext: Buffer.from("tampered").toString("base64"),
    };
    assert.throws(() => unsealSecret(tampered, kek), VaultCryptoError);
  });

  it("secretLast4 returns the tail", () => {
    assert.equal(secretLast4("sk-abcdefgh"), "efgh");
    assert.equal(secretLast4("ab"), "ab");
  });
});
