import { test } from "node:test";
import assert from "node:assert";
import {
  migrateAdvancedInfo,
  migrateAdvancedInfoString,
  migrateProfile,
  migrateVisit,
  ADV_MAPS,
  IG_CONTEXT_MAP,
} from "./migrate-field-names.mjs";

/** Un `advancedInfo` come lo scriveva il client prima della rinomina. */
const legacyAdvancedInfo = () => ({
  n: { ip: "1.2.3.4", localIp: "192.168.1.7", isp: "Vodafone", city: "Milano" },
  h: {
    gpu: "Apple A17",
    mediaDevicesCount: 3,
    gamepadsCount: 0,
    gamepadsIds: [],
    advancedSensors: "Accelerometer",
    igMeta: { deviceModel: "iPhone14,5", physicalRes: "1170x2532", igInstallId: "590530890" },
  },
  s: {
    canvasFingerprint: "abc",
    audioFingerprint: "124.043",
    mathFingerprint: { pi: 3.14 },
    webglSceneFingerprint: "scene",
    fontMetricsFingerprint: "fm",
    timerResolution: "0.1",
    clientRectsFingerprint: "rects",
    fontsIdentified: ["Arial"],
    botStatus: "Umano/Manuale",
  },
  b: {
    keyStrokes: 42,
    backspaces: 3,
    rageClicks: 1,
    mouseDistance: 900,
    fieldFocusTimes: { lookingFor: 5000 },
    autofillUsed: false,
    typingProfile: { mean: 120 },
    deviceOrientation: { alpha: 10, beta: 20, gamma: 30 },
    ttv: "tok-123",
  },
  ids: { srv: "srv-tok", etag: "etag-tok" },
});

test("advancedInfo: ogni vecchio nome diventa quello letto oggi", () => {
  const adv = legacyAdvancedInfo();
  assert.strictEqual(migrateAdvancedInfo(adv), true);

  // Nessuna chiave vecchia sopravvive...
  for (const [section, map] of Object.entries(ADV_MAPS)) {
    for (const [oldKey, newKey] of Object.entries(map)) {
      if (!(section in adv)) continue;
      assert.ok(!(oldKey in adv[section]), `${section}.${oldKey} doveva sparire`);
    }
  }
  // ...e i valori sono intatti sotto il nome nuovo.
  assert.strictEqual(adv.n.netHint, "192.168.1.7");
  assert.strictEqual(adv.n.netProvider, "Vodafone");
  assert.strictEqual(adv.h.mediaDeviceCount, 3);
  assert.strictEqual(adv.h.extraSensors, "Accelerometer");
  assert.strictEqual(adv.h.igContext.deviceModel, "iPhone14,5");
  assert.strictEqual(adv.h.igContext.igTailId, "590530890");
  assert.ok(!("igInstallId" in adv.h.igContext));
  assert.strictEqual(adv.s.canvasSample, "abc");
  assert.strictEqual(adv.s.audioSample, "124.043");
  assert.strictEqual(adv.s.clockResolution, "0.1");
  assert.strictEqual(adv.s.layoutRectsSample, "rects");
  assert.strictEqual(adv.s.automationSignal, "Umano/Manuale");
  assert.strictEqual(adv.b.keyEvents, 42);
  assert.strictEqual(adv.b.corrections, 3);
  assert.strictEqual(adv.b.repeatClicks, 1);
  assert.strictEqual(adv.b.pointerDistance, 900);
  assert.deepStrictEqual(adv.b.fieldDurations, { lookingFor: 5000 });
  assert.strictEqual(adv.b.fieldAutoFilled, false);
  assert.deepStrictEqual(adv.b.keyPaceProfile, { mean: 120 });
  assert.deepStrictEqual(adv.b.orientationSample, { alpha: 10, beta: 20, gamma: 30 });
  assert.strictEqual(adv.b.cmk, "tok-123");
  assert.strictEqual(adv.ids.cacheTag, "etag-tok");
  assert.strictEqual(adv.ids.srv, "srv-tok", "le chiavi non mappate restano intatte");
});

test("advancedInfo: funziona anche con le sezioni in forma lunga", () => {
  const adv = { behavior: { ttv: "t" }, software: { canvasFingerprint: "c" } };
  assert.strictEqual(migrateAdvancedInfo(adv), true);
  assert.strictEqual(adv.behavior.cmk, "t");
  assert.strictEqual(adv.software.canvasSample, "c");
});

test("advancedInfo: idempotente, un secondo passaggio non tocca nulla", () => {
  const once = JSON.parse(JSON.stringify(legacyAdvancedInfo()));
  migrateAdvancedInfo(once);
  const snapshot = JSON.stringify(once);
  assert.strictEqual(migrateAdvancedInfo(once), false, "niente più da migrare");
  assert.strictEqual(JSON.stringify(once), snapshot, "documento invariato");
});

test("advancedInfo: un valore già migrato vince su quello vecchio", () => {
  const adv = { b: { ttv: "vecchio", cmk: "nuovo" } };
  migrateAdvancedInfo(adv);
  assert.strictEqual(adv.b.cmk, "nuovo");
  assert.ok(!("ttv" in adv.b));
});

test("advancedInfo come stringa JSON: dentro e fuori nello stesso formato", () => {
  const raw = JSON.stringify(legacyAdvancedInfo());
  const out = migrateAdvancedInfoString(raw);
  assert.ok(out.startsWith("{"), "resta JSON in chiaro");
  assert.strictEqual(JSON.parse(out).b.cmk, "tok-123");

  // Un documento già migrato non produce scritture.
  assert.strictEqual(migrateAdvancedInfoString(out), null);
});

test("advancedInfo in base64: viene riscritto ancora in base64", () => {
  const json = JSON.stringify(legacyAdvancedInfo());
  const b64 = Buffer.from(encodeURIComponent(json), "binary").toString("base64");
  const out = migrateAdvancedInfoString(b64);
  assert.ok(!out.startsWith("{"), "resta base64");
  const decoded = JSON.parse(
    decodeURIComponent(Buffer.from(out, "base64").toString("binary")),
  );
  assert.strictEqual(decoded.b.cmk, "tok-123");
  assert.strictEqual(decoded.s.canvasSample, "abc");
});

test("advancedInfo illeggibile: si lascia intatto invece di romperlo", () => {
  assert.strictEqual(migrateAdvancedInfoString("non-json-e-non-base64-{{{"), null);
  assert.strictEqual(migrateAdvancedInfoString(""), null);
  assert.strictEqual(migrateAdvancedInfoString(undefined), null);
});

test("profiles: le decisioni dell'operatore sopravvivono", () => {
  const { updates, deletes } = migrateProfile({
    name: "Mario",
    suspects: ["a", "b"],
    isolateFromAutoGrouping: true,
    manualMergeProfileId: "DEV-123",
    ignoredFromAnalytics: false,
  });
  assert.deepStrictEqual(updates, {
    possibleAliases: ["a", "b"],
    excludeFromAutoGrouping: true,
    linkedToProfileId: "DEV-123",
  });
  assert.deepStrictEqual(deletes.sort(), [
    "isolateFromAutoGrouping",
    "manualMergeProfileId",
    "suspects",
  ]);

  // Già migrato: niente da fare.
  assert.deepStrictEqual(migrateProfile({ possibleAliases: ["a"] }), {
    updates: {},
    deletes: [],
  });
});

test("analytics_visits: anche il VALORE di exitField porta il vecchio prefisso", () => {
  const { updates, deletes } = migrateVisit({
    timeSpentWhen: 12,
    timeSpentWhere: 3,
    timeSpentLookingFor: 7,
    timeSpentInstagram: 0,
    abandonedAfter: "timeSpentLookingFor",
    hasSubmitted: false,
  });
  assert.strictEqual(updates.fieldTimeWhen, 12);
  assert.strictEqual(updates.fieldTimeWhere, 3);
  assert.strictEqual(updates.fieldTimeLookingFor, 7);
  assert.strictEqual(updates.fieldTimeInstagram, 0);
  assert.strictEqual(
    updates.exitField,
    "fieldTimeLookingFor",
    "altrimenti Analytics non riesce più a togliere il prefisso",
  );
  assert.strictEqual(deletes.length, 5);

  // Il valore sentinella "none" non ha prefisso e non va toccato.
  const none = migrateVisit({ abandonedAfter: "none" });
  assert.strictEqual(none.updates.exitField, "none");
});
