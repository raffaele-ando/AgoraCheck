import { test } from "node:test";
import assert from "node:assert";
import { computeDeviceProfileId, extractDeviceToken } from "./profiling";

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
