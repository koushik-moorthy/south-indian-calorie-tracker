import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Symmetric encryption for secrets at rest (the user's OpenAI API key).
 * AES-256-GCM with a server-only key from SETTINGS_ENC_KEY. The plaintext key
 * is only ever handled on the server; the browser sees nothing but ciphertext.
 *
 * Stored format (base64): [12-byte IV][16-byte auth tag][ciphertext].
 */
function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENC_KEY;
  if (!raw) {
    throw new Error("SETTINGS_ENC_KEY is not set.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENC_KEY must be 32 bytes, base64-encoded.");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
