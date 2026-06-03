import { test } from 'node:test';
import assert from 'node:assert';
import { computeDeviceProfileId } from './profiling';

test('computeDeviceProfileId backward compatibility', (t) => {
  const deviceInfo = { userAgent: "Mozilla/5.0" };
  
  // 1. Format v1 (software / hardware full structure)
  const v1 = {
    software: {
      canvasFingerprint: "c1",
      audioFingerprint: "a1"
    },
    hardware: {
      gpu: "g1",
      screen: "s1",
      cores: "4"
    }
  };
  
  // 2. Format v2 (s / h full structure)
  const v2 = {
    s: {
      canvasFingerprint: "c1",
      audioFingerprint: "a1"
    },
    h: {
      gpu: "g1",
      screen: "s1",
      cores: "4"
    }
  };

  // 3. Format v3 (s / h minified structure)
  const v3 = {
    s: {
      c: "c1",
      a: "a1"
    },
    h: {
      g: "g1",
      s: "s1",
      c: "4"
    }
  };

  const id1 = computeDeviceProfileId(v1, deviceInfo);
  const id2 = computeDeviceProfileId(v2, deviceInfo);
  const id3 = computeDeviceProfileId(v3, deviceInfo);

  // Assert that different parse formats over time yield the exact same device ID
  assert.strictEqual(id1, id2, 'Format v1 should yield same ID as v2');
  assert.strictEqual(id1, id3, 'Format v1 should yield same ID as v3');
  assert.ok(id1 !== "UNKNOWN", 'ID should not be UNKNOWN');

  // Test instagram prioritization
  const instId = computeDeviceProfileId(v1, deviceInfo, "testuser");
  const instId2 = computeDeviceProfileId({}, deviceInfo, "testuser");
  assert.strictEqual(instId, instId2, 'Instagram ID should override hardware seed');
  assert.ok(instId !== id1, 'Instagram ID should be different from hardware ID');

  // Test empty profile fallback
  const emptyId = computeDeviceProfileId({}, deviceInfo);
  const ipId = computeDeviceProfileId(null, { userAgent: "Mozilla/5.0" });
  
  // When no adv info is given, fallback to userAgent fingerprint
  assert.strictEqual(emptyId, computeDeviceProfileId({s:{}, h:{}}, deviceInfo), 'Empty objects fall back to IP/UserAgent');
});
