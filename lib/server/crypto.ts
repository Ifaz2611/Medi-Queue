// Real field-level AES-256-GCM encryption for clinical notes (FR-04).
// Server-only: uses node:crypto so the key never reaches the browser.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { FIELD_ENCRYPTION_KEY } from "../supabase/config";

const PREFIX = "enc:v2:";

/** Derive a stable 32-byte key from the configured secret. */
function encryptionKey(): Buffer {
  return createHash("sha256")
    .update(FIELD_ENCRYPTION_KEY || "mediqueue-dev-field-key-change-me")
    .digest();
}

/** Encrypt plaintext notes, returning `enc:v2:<iv>:<tag>:<ciphertext>`. */
export function encryptNotes(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [
      iv.toString("base64"),
      tag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":")
  );
}

/** Decrypt notes; invalid encrypted payloads return empty, legacy plaintext passes through. */
export function decryptNotes(payload: string): string {
  if (!payload) return "";
  if (!payload.startsWith("enc:")) return payload;
  if (!payload.startsWith(PREFIX)) return "";

  const fields = payload.slice(PREFIX.length).split(":");
  if (fields.length !== 3 || fields.some((field) => !field)) return "";

  try {
    const decoded = fields.map((field) => Buffer.from(field, "base64"));
    // Buffer's base64 decoder accepts malformed input. Require the exact format
    // produced by encryptNotes, including a full 128-bit authentication tag.
    if (decoded.some((value, index) => value.toString("base64") !== fields[index])) {
      return "";
    }
    const [iv, tag, data] = decoded;
    if (iv.length !== 12 || tag.length !== 16) return "";

    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv, {
      authTagLength: 16,
    });
    decipher.setAuthTag(tag);
    // Never return partial plaintext before authentication succeeds in final().
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // Corrupted notes must not crash appointment reads or expose crypto errors,
    // clinical content, or keys through a response or diagnostic log (FR-04).
    return "";
  }
}
