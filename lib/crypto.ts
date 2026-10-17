// Field-level encryption helper.
//
// NOTE: This is a *simulation* of AES-256 field-level encryption for the MVP /
// demo. It XORs the plaintext with a demo key and hex-encodes the result. It is
// deterministic, dependency-free, and works in both the browser and Node. Do NOT
// use this for real patient data — swap in a real AES-256-GCM implementation
// (e.g. node:crypto) or Supabase Vault when moving to production.

const DEMO_KEY = "mediqueue-demo-field-key";
const PREFIX = "enc:v1:";

/** Simulated AES-256 style encryption used before persisting clinical notes. */
export function encryptField(plain: string, key: string = DEMO_KEY): string {
  if (!plain) return "";
  let out = "";
  for (let i = 0; i < plain.length; i++) {
    const x = plain.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    out += x.toString(16).padStart(4, "0");
  }
  return PREFIX + out;
}

/** Reverses encryptField so authorized roles (Doctor) can read notes. */
export function decryptField(cipher: string, key: string = DEMO_KEY): string {
  if (!cipher || !cipher.startsWith(PREFIX)) return cipher ?? "";
  const hex = cipher.slice(PREFIX.length);
  let out = "";
  for (let i = 0; i < hex.length; i += 4) {
    const x = parseInt(hex.slice(i, i + 4), 16) ^ key.charCodeAt((i / 4) % key.length);
    out += String.fromCharCode(x);
  }
  return out;
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}
