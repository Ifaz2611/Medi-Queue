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

/** Decrypt a value produced by encryptNotes (passes through legacy/plaintext). */
export function decryptNotes(payload: string): string {
  if (!payload || !payload.startsWith(PREFIX)) return payload ?? "";
  const [ivB64, tagB64, dataB64] = payload.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
