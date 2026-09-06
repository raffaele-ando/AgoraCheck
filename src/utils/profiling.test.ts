import { test } from "node:test";
import assert from "node:assert";
import {
  computeDeviceProfileId,
  extractDeviceToken,
  extractAllDeviceTokens,
  extractDeviceTraits,
  areDeviceTraitsCompatible,
  getProfileIdConfidence,
} from "./profiling";

test("computeDeviceProfileId: persistent token is the identity", (t) => {
  const deviceInfo = { userAgent: "Mozilla/5.0" };

  // Same token in different backend slots => SAME device id.
  const a = computeDeviceProfileId({ ids: { srv: "tok-123" } }, deviceInfo);
  const b = computeDeviceProfileId({ b: { ttv: "tok-123" } }, deviceInfo);
  const c = computeDeviceProfileId({ ids: { ls: "tok-123" } }, deviceInfo);
  assert.strictEqual(a, b, "srv and ttv of same token must match");
  assert.strictEqual(a, c, "srv and ls of same token must match");
  assert.ok(a.startsWith("DEV-"), "token-based id is prefixed DEV-");

  // Different tokens => different devices.
  const d = computeDeviceProfileId({ ids: { srv: "tok-999" } }, deviceInfo);
  assert.notStrictEqual(a, d, "different tokens must not collide");
});

test("Instagram handle is NOT part of the identity (no poisoning)", (t) => {
  const deviceInfo = { userAgent: "Mozilla/5.0" };
  const withHandle = computeDeviceProfileId(
    { ids: { srv: "tok-1" } },
    deviceInfo,
    "victim_user",
  );
  const withoutHandle = computeDeviceProfileId(
    { ids: { srv: "tok-1" } },
    deviceInfo,
  );
  assert.strictEqual(
    withHandle,
    withoutHandle,
    "the handle must never change the device id",
  );
});

test("legacy fallback: stable hardware seed, no volatile signals", (t) => {
  const deviceInfo = { userAgent: "Mozilla/5.0" };
  // Two sends from the same device where the (volatile) audio differs must map
  // to the SAME id, because audio is no longer part of the seed.
  const s1 = {
    h: { uaDeviceModel: "iPhone14,5", physicalRes: "1170x2532", cores: "6" },
    s: { audioFingerprint: "124.043", canvasFingerprint: "abc" },
  };
  const s2 = {
    h: { uaDeviceModel: "iPhone14,5", physicalRes: "1170x2532", cores: "6" },
    s: { audioFingerprint: "Unknown", canvasFingerprint: "abc" },
  };
  const id1 = computeDeviceProfileId(s1, deviceInfo);
  const id2 = computeDeviceProfileId(s2, deviceInfo);
  assert.strictEqual(id1, id2, "volatile audio must not fragment identity");
  assert.ok(id1.startsWith("HW-"), "legacy hw id is prefixed HW-");
});

test("extractDeviceToken ignores sentinels", (t) => {
  assert.strictEqual(extractDeviceToken({ ids: { srv: "Unknown" } }), "");
  assert.strictEqual(extractDeviceToken({ ids: { srv: "real-token" } }), "real-token");
});

// ---------------------------------------------------------------------------
// Prova deterministica: token co-osservati.
// ---------------------------------------------------------------------------

test("extractAllDeviceTokens returns every co-observed token", (t) => {
  // Un messaggio inviato durante una transizione porta con sé sia il valore
  // vecchio sia quello nuovo: è ciò che permette di riunire i due profili.
  const tokens = extractAllDeviceTokens({
    ids: {
      srv: "server-token-aaaaaa",
      ls: "vecchio-token-bbbbbb",
      idb: null,
      ck: "Unknown",
      etag: "etag-token-cccccc",
      prov: "provvisorio-dddddd",
    },
    b: { ttv: "server-token-aaaaaa" },
  });

  assert.ok(tokens.includes("server-token-aaaaaa"));
  assert.ok(tokens.includes("vecchio-token-bbbbbb"));
  assert.ok(tokens.includes("etag-token-cccccc"));
  assert.ok(tokens.includes("provvisorio-dddddd"));
  // I valori sentinella non devono creare unioni fra dispositivi estranei.
  assert.ok(!tokens.some((v) => v.toLowerCase() === "unknown"));
  // Lo stesso token in due slot conta una volta sola.
  assert.strictEqual(
    tokens.filter((v) => v === "server-token-aaaaaa").length,
    1,
  );
});

test("extractAllDeviceTokens rejects values too short to be identifiers", (t) => {
  assert.deepStrictEqual(extractAllDeviceTokens({ ids: { srv: "abc" } }), []);
  assert.deepStrictEqual(extractAllDeviceTokens(null), []);
});

// ---------------------------------------------------------------------------
// Vincolo negativo: tratti fisici incompatibili.
// ---------------------------------------------------------------------------

test("device traits are read from the Instagram UA parse and the user agent", (t) => {
  const ios = extractDeviceTraits(
    { igx: { platform: "ios", deviceModel: "iPhone14,5" } },
    { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)" },
  );
  assert.strictEqual(ios.platform, "ios");
  assert.strictEqual(ios.model, "iPhone14,5");

  // Anche senza advancedInfo la piattaforma si ricava dallo user agent.
  const android = extractDeviceTraits(null, {
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36",
  });
  assert.strictEqual(android.platform, "android");
});

test("incompatible devices can never be the same physical device", (t) => {
  const iphone = { platform: "ios" as const, model: "iPhone14,5" };
  const samsung = { platform: "android" as const, model: "SM-G991B" };
  const unknown = { platform: "unknown" as const, model: "" };

  assert.strictEqual(areDeviceTraitsCompatible(iphone, samsung), false);
  assert.strictEqual(
    areDeviceTraitsCompatible(iphone, { platform: "ios", model: "iPhone13,2" }),
    false,
    "due modelli iOS diversi sono due apparecchi diversi",
  );
  assert.strictEqual(areDeviceTraitsCompatible(iphone, iphone), true);
  assert.strictEqual(
    areDeviceTraitsCompatible(iphone, unknown),
    true,
    "un dato mancante non deve mai impedire un collegamento",
  );
});

// ---------------------------------------------------------------------------
// Affidabilità dell'identificativo.
// ---------------------------------------------------------------------------

test("profile id confidence distinguishes token identities from legacy seeds", (t) => {
  assert.strictEqual(getProfileIdConfidence("DEV-1a2b3c4d5e6f"), "token");
  assert.strictEqual(getProfileIdConfidence("HW-1a2b3c4d5e6f"), "legacy");
  assert.strictEqual(getProfileIdConfidence("UA-1a2b3c4d5e6f"), "legacy");
  assert.strictEqual(getProfileIdConfidence("UNKNOWN"), "unknown");
  // I gruppi creati a mano da un operatore valgono quanto un token.
  assert.strictEqual(getProfileIdConfidence("MANUAL-ABC123"), "token");
});
