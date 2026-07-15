/**
 * Envelope encryption for the secrets vault (AES-256-GCM).
 *
 * Pattern mirrors Chromium / Bitwarden: a random DEK encrypts the secret;
 * the DEK is wrapped with a KEK. Hosted KEK comes from ARCO_SECRETS_KEK
 * (Fly Secrets / env — never on the data volume). See docs/security-plan.md.
 */
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

/** Version tag so we can rotate algorithms later. */
export const VAULT_CRYPTO_VERSION = 1;

export interface SealedSecret {
  v: typeof VAULT_CRYPTO_VERSION;
  /** Key encryption key id (for rotation). */
  keyId: string;
  /** Base64 AES-GCM ciphertext of the plaintext. */
  ciphertext: string;
  /** Base64 IV. */
  iv: string;
  /** Base64 auth tag. */
  tag: string;
  /** Base64 AES-GCM ciphertext of the DEK, wrapped by KEK. */
  wrappedDek: string;
  /** Base64 IV for DEK wrap. */
  wrapIv: string;
  /** Base64 auth tag for DEK wrap. */
  wrapTag: string;
}

export class VaultCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultCryptoError";
  }
}

/** Normalize a KEK string into a 32-byte key (sha256 of the material). */
export function deriveKek(material: string): Buffer {
  if (!material) throw new VaultCryptoError("KEK material is empty");
  return crypto.createHash("sha256").update(material, "utf8").digest();
}

/**
 * Resolve the active KEK. Prefer ARCO_SECRETS_KEK; in development, fall back
 * to a deterministic local key so vault APIs work without Fly secrets.
 * Production (NODE_ENV=production) requires the env var.
 */
export function resolveKekMaterial(): { keyId: string; material: string } {
  const fromEnv = process.env.ARCO_SECRETS_KEK?.trim();
  if (fromEnv) {
    return { keyId: process.env.ARCO_SECRETS_KEK_ID?.trim() || "env:default", material: fromEnv };
  }
  if (process.env.NODE_ENV === "production") {
    throw new VaultCryptoError(
      "ARCO_SECRETS_KEK is required in production. Set it via Fly Secrets / env (not on the data volume).",
    );
  }
  // Dev-only fallback — still encrypts, but the key is local and documented.
  const dataDir = process.env.ARCO_DATA_DIR ?? "data";
  return {
    keyId: "dev:local",
    material: `arco-dev-kek:${dataDir}`,
  };
}

function encryptAesGcm(key: Buffer, plaintext: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

function decryptAesGcm(key: Buffer, ciphertext: Buffer, iv: Buffer, tag: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function sealSecret(plaintext: string, kekMaterial?: string, keyId?: string): SealedSecret {
  const resolved = kekMaterial
    ? { keyId: keyId ?? "explicit", material: kekMaterial }
    : resolveKekMaterial();
  const kek = deriveKek(resolved.material);
  const dek = crypto.randomBytes(KEY_LEN);

  const body = encryptAesGcm(dek, Buffer.from(plaintext, "utf8"));
  const wrap = encryptAesGcm(kek, dek);

  return {
    v: VAULT_CRYPTO_VERSION,
    keyId: resolved.keyId,
    ciphertext: body.ciphertext.toString("base64"),
    iv: body.iv.toString("base64"),
    tag: body.tag.toString("base64"),
    wrappedDek: wrap.ciphertext.toString("base64"),
    wrapIv: wrap.iv.toString("base64"),
    wrapTag: wrap.tag.toString("base64"),
  };
}

export function unsealSecret(sealed: SealedSecret, kekMaterial?: string): string {
  if (sealed.v !== VAULT_CRYPTO_VERSION) {
    throw new VaultCryptoError(`Unsupported vault crypto version: ${sealed.v}`);
  }
  const material = kekMaterial ?? resolveKekMaterial().material;
  const kek = deriveKek(material);
  let dek: Buffer;
  try {
    dek = decryptAesGcm(
      kek,
      Buffer.from(sealed.wrappedDek, "base64"),
      Buffer.from(sealed.wrapIv, "base64"),
      Buffer.from(sealed.wrapTag, "base64"),
    );
  } catch {
    throw new VaultCryptoError("Failed to unwrap DEK — wrong KEK or corrupt sealed secret");
  }
  try {
    const plain = decryptAesGcm(
      dek,
      Buffer.from(sealed.ciphertext, "base64"),
      Buffer.from(sealed.iv, "base64"),
      Buffer.from(sealed.tag, "base64"),
    );
    return plain.toString("utf8");
  } catch {
    throw new VaultCryptoError("Failed to decrypt secret — corrupt sealed secret");
  }
}

/** Last 4 chars for UI recognition (empty string if too short). */
export function secretLast4(plaintext: string): string {
  const t = plaintext.trim();
  if (t.length < 4) return t;
  return t.slice(-4);
}
