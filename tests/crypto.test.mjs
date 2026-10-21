import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { describe, it } from "node:test";

// Import the real module using a QA-only secret. Do not load .env.local or use
// real clinical data, and restore the process environment after config loads.
const testSecret = "mediqueue-qa-only-secret-not-for-production";
const { encryptNotes, decryptNotes } = await (async () => {
  const original = process.env.FIELD_ENCRYPTION_KEY;
  try {
    process.env.FIELD_ENCRYPTION_KEY = testSecret;
    return await import("../lib/server/crypto.ts");
  } finally {
    if (original === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = original;
  }
})();

const testKey = createHash("sha256").update(testSecret).digest();
const sampleNote = "QA patient: rest, hydration, and follow-up in 48 hours.";

function replaceField(payload, field, value) {
  const parts = payload.split(":");
  parts[field] = value;
  return parts.join(":");
}

function flipByte(payload, field) {
  const bytes = Buffer.from(payload.split(":")[field], "base64");
  bytes[0] ^= 1;
  return replaceField(payload, field, bytes.toString("base64"));
}

function assertSafeRejection(payload, t) {
  const logs = ["log", "warn", "error"].map((method) =>
    t.mock.method(console, method, () => {}),
  );
  let result;
  assert.doesNotThrow(() => {
    result = decryptNotes(payload);
  });
  assert.equal(result, "", "Invalid encrypted notes must return no content");
  for (const log of logs) {
    assert.equal(log.mock.callCount(), 0, "Decryption must not log sensitive data");
  }
}

describe("AES-256-GCM clinical note encryption (FR-04)", () => {
  for (const [label, plain] of [
    ["ordinary clinical text", sampleNote],
    ["Unicode text", "বিশ্রাম নিন — follow-up 🩺"],
    ["multiline text and whitespace", "  Plan:\nRest\r\nReview\t48h  "],
    ["long text", "QA consultation notes. ".repeat(5000)],
  ]) {
    it(`round-trips ${label} without changing the contents`, () => {
      const encrypted = encryptNotes(plain);
      assert.notEqual(encrypted, plain);
      assert.ok(!encrypted.includes(plain));
      assert.ok(!encrypted.includes(testSecret));
      assert.equal(decryptNotes(encrypted), plain);
    });
  }

  it("preserves empty notes", () => {
    assert.equal(encryptNotes(""), "");
    assert.equal(decryptNotes(""), "");
  });

  it("preserves the existing plaintext compatibility behavior", () => {
    assert.equal(decryptNotes("Legacy QA note"), "Legacy QA note");
  });

  it("emits the versioned format with a 12-byte IV and 16-byte tag", () => {
    const fields = encryptNotes(sampleNote).split(":");
    assert.equal(fields.length, 5);
    assert.deepEqual(fields.slice(0, 2), ["enc", "v2"]);
    assert.equal(Buffer.from(fields[2], "base64").length, 12);
    assert.equal(Buffer.from(fields[3], "base64").length, 16);
    assert.equal(Buffer.from(fields[4], "base64").length, Buffer.byteLength(sampleNote));
    for (const field of fields.slice(2)) {
      assert.equal(Buffer.from(field, "base64").toString("base64"), field);
    }
  });

  it("uses a fresh IV and ciphertext for repeated encryption of the same note", () => {
    const first = encryptNotes(sampleNote);
    const second = encryptNotes(sampleNote);
    assert.notEqual(first, second);
    assert.notEqual(first.split(":")[2], second.split(":")[2]);
    assert.notEqual(first.split(":")[4], second.split(":")[4]);
    assert.equal(decryptNotes(first), sampleNote);
    assert.equal(decryptNotes(second), sampleNote);
  });

  it("produces ciphertext independently decryptable with AES-256-GCM", () => {
    const [, , iv, tag, data] = encryptNotes(sampleNote).split(":");
    const decipher = createDecipheriv("aes-256-gcm", testKey, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(data, "base64")),
      decipher.final(),
    ]).toString("utf8");
    assert.equal(plain, sampleNote);
  });

  it("decrypts a payload created independently with AES-256-GCM", () => {
    // A fixed IV is used only for this one test fixture, never for application encryption.
    const iv = Buffer.alloc(12, 7);
    const cipher = createCipheriv("aes-256-gcm", testKey, iv);
    const data = Buffer.concat([cipher.update(sampleNote, "utf8"), cipher.final()]);
    const payload = ["enc", "v2", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
    assert.equal(decryptNotes(payload), sampleNote);
  });
});

describe("corrupted notes fail safely without returning or logging secrets", () => {
  for (const [label, field] of [["IV", 2], ["authentication tag", 3], ["ciphertext", 4]]) {
    it(`rejects a modified ${label}`, (t) => {
      assertSafeRejection(flipByte(encryptNotes(sampleNote), field), t);
    });
  }

  it("rejects a payload encrypted with a different key", (t) => {
    const cipher = createCipheriv("aes-256-gcm", Buffer.alloc(32, 9), Buffer.alloc(12, 8));
    const data = Buffer.concat([cipher.update(sampleNote, "utf8"), cipher.final()]);
    const payload = ["enc", "v2", Buffer.alloc(12, 8).toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
    assertSafeRejection(payload, t);
  });

  for (const [label, corrupt] of [
    ["missing fields", (payload) => payload.split(":").slice(0, 4).join(":")],
    ["extra fields", (payload) => `${payload}:extra`],
    ["empty IV", (payload) => replaceField(payload, 2, "")],
    ["empty tag", (payload) => replaceField(payload, 3, "")],
    ["empty ciphertext", (payload) => replaceField(payload, 4, "")],
    ["invalid IV length", (payload) => replaceField(payload, 2, Buffer.alloc(8).toString("base64"))],
    ["invalid tag length", (payload) => replaceField(payload, 3, Buffer.alloc(3).toString("base64"))],
    ["shortened authentication tag", (payload) => replaceField(payload, 3, Buffer.from(payload.split(":")[3], "base64").subarray(0, 12).toString("base64"))],
    ["invalid base64 IV", (payload) => replaceField(payload, 2, `!${payload.split(":")[2]}`)],
    ["invalid base64 tag", (payload) => replaceField(payload, 3, `!${payload.split(":")[3]}`)],
    ["invalid base64 ciphertext", (payload) => replaceField(payload, 4, `!${payload.split(":")[4]}`)],
    ["noncanonical base64 tag", (payload) => replaceField(payload, 3, payload.split(":")[3].replace(/=+$/, ""))],
    ["truncated ciphertext", (payload) => replaceField(payload, 4, Buffer.from(payload.split(":")[4], "base64").subarray(0, -1).toString("base64"))],
    ["unsupported encrypted version", (payload) => replaceField(payload, 1, "v99")],
  ]) {
    it(`rejects ${label}`, (t) => {
      assertSafeRejection(corrupt(encryptNotes(sampleNote)), t);
    });
  }

  it("can still decrypt a valid note after a corrupted note is rejected", (t) => {
    const valid = encryptNotes(sampleNote);
    assertSafeRejection(flipByte(valid, 4), t);
    assert.equal(decryptNotes(valid), sampleNote);
  });
});
