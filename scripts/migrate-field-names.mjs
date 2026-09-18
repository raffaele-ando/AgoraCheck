#!/usr/bin/env node
// ===========================================================================
// Migrazione una tantum dei nomi dei campi su Firestore.
//
// I documenti salvati prima della rinomina degli identificativi usano i nomi
// vecchi, che il codice attuale non legge più: i messaggi storici perdono i
// segnali di raggruppamento, le unioni manuali dei profili smettono di avere
// effetto e lo storico delle visite risulta a zero. Questo script riscrive i
// documenti esistenti con i nomi nuovi, così il sorgente non deve reintrodurre
// i vecchi nomi come alias di lettura.
//
// Uso:
//   npm i --no-save firebase-admin
//   GOOGLE_APPLICATION_CREDENTIALS=/percorso/service-account.json \
//     node scripts/migrate-field-names.mjs            # anteprima, non scrive
//   GOOGLE_APPLICATION_CREDENTIALS=/percorso/service-account.json \
//     node scripts/migrate-field-names.mjs --apply    # esegue la scrittura
//
// È idempotente: un documento già migrato viene saltato, quindi lo script può
// essere rilanciato senza danni.
// ===========================================================================

// --- mappature vecchio -> nuovo -------------------------------------------
// Ricavate meccanicamente dal diff del payload fra il commit precedente alla
// campagna di rinomine e quello attuale: una riga per ogni chiave sparita.

/** Sezioni di `advancedInfo`. I documenti usano la forma breve o quella lunga. */
export const SECTION_ALIASES = {
  n: ["n", "network"],
  h: ["h", "hardware"],
  s: ["s", "software"],
  b: ["b", "behavior"],
  ids: ["ids", "i"],
};

export const ADV_MAPS = {
  n: {
    localIp: "netHint",
    isp: "netProvider",
  },
  h: {
    mediaDevicesCount: "mediaDeviceCount",
    gamepadsCount: "inputDeviceCount",
    gamepadsIds: "inputDeviceIds",
    advancedSensors: "extraSensors",
    igMeta: "igContext",
  },
  s: {
    fontsIdentified: "fontsDetected",
    canvasFingerprint: "canvasSample",
    webglSceneFingerprint: "webglSceneSample",
    fontMetricsFingerprint: "fontMetricsSample",
    timerResolution: "clockResolution",
    clientRectsFingerprint: "layoutRectsSample",
    audioFingerprint: "audioSample",
    mathFingerprint: "mathSample",
    botStatus: "automationSignal",
  },
  b: {
    keyStrokes: "keyEvents",
    autofillUsed: "fieldAutoFilled",
    backspaces: "corrections",
    rageClicks: "repeatClicks",
    fieldFocusTimes: "fieldDurations",
    mouseDistance: "pointerDistance",
    typingProfile: "keyPaceProfile",
    typingCadenceMs: "keyPaceMs",
    deviceOrientation: "orientationSample",
    ttv: "cmk",
    vToken: "clientMark",
  },
  ids: {
    etag: "cacheTag",
  },
};

/** Chiavi annidate dentro `h.igContext` (già `h.igMeta`). */
export const IG_CONTEXT_MAP = { igInstallId: "igTailId" };

/** Documenti della collezione `profiles`. */
export const PROFILE_MAP = {
  suspects: "possibleAliases",
  isolateFromAutoGrouping: "excludeFromAutoGrouping",
  manualMergeProfileId: "linkedToProfileId",
};

/** Documenti della collezione `analytics_visits`. */
export const VISIT_MAP = {
  timeSpentWhen: "fieldTimeWhen",
  timeSpentWhere: "fieldTimeWhere",
  timeSpentLookingFor: "fieldTimeLookingFor",
  timeSpentInstagram: "fieldTimeInstagram",
  abandonedAfter: "exitField",
};

// --- trasformazioni pure ---------------------------------------------------

/**
 * Rinomina le chiavi di primo livello di `obj` secondo `map`.
 * Se la chiave nuova è già presente, quella vecchia viene solo rimossa: il
 * valore già migrato vince, così un secondo passaggio non sovrascrive nulla.
 */
function renameKeys(obj, map) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  let changed = false;
  for (const [oldKey, newKey] of Object.entries(map)) {
    if (!Object.prototype.hasOwnProperty.call(obj, oldKey)) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, newKey)) obj[newKey] = obj[oldKey];
    delete obj[oldKey];
    changed = true;
  }
  return changed;
}

/** Applica tutte le mappature all'oggetto `advancedInfo` già deserializzato. */
export function migrateAdvancedInfo(adv) {
  if (!adv || typeof adv !== "object") return false;
  let changed = false;

  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      if (renameKeys(adv[alias], ADV_MAPS[section])) changed = true;
      // Il campo numerico finale dell'UA Instagram vive dentro h.igContext.
      if (section === "h" && adv[alias] && typeof adv[alias] === "object") {
        if (renameKeys(adv[alias].igContext, IG_CONTEXT_MAP)) changed = true;
      }
    }
  }
  return changed;
}

/**
 * `advancedInfo` è una stringa JSON; i documenti più vecchi la conservano
 * codificata in base64 (il dashboard gestisce entrambi i casi). Si riscrive
 * sempre nello stesso formato in cui è stata trovata.
 */
export function migrateAdvancedInfoString(raw) {
  if (typeof raw !== "string" || !raw) return null;

  const isBase64 = !raw.startsWith("{");
  let json = raw;
  if (isBase64) {
    try {
      json = decodeURIComponent(Buffer.from(raw, "base64").toString("binary"));
    } catch {
      return null; // illeggibile: si lascia intatto
    }
  }

  let adv;
  try {
    adv = JSON.parse(json);
  } catch {
    return null;
  }

  if (!migrateAdvancedInfo(adv)) return null;

  const out = JSON.stringify(adv);
  if (!isBase64) return out;
  return Buffer.from(encodeURIComponent(out), "binary").toString("base64");
}

/**
 * Campi di un documento `analytics_visits`. `exitField` conserva il nome del
 * campo su cui l'utente si è fermato, che portava a sua volta il vecchio
 * prefisso: va convertito anche il valore, non solo la chiave.
 */
export function migrateVisit(data) {
  const updates = {};
  const deletes = [];
  for (const [oldKey, newKey] of Object.entries(VISIT_MAP)) {
    if (!Object.prototype.hasOwnProperty.call(data, oldKey)) continue;
    deletes.push(oldKey);
    if (Object.prototype.hasOwnProperty.call(data, newKey)) continue;
    let value = data[oldKey];
    if (newKey === "exitField" && typeof value === "string") {
      value = value.replace(/^timeSpent/, "fieldTime");
    }
    updates[newKey] = value;
  }
  return { updates, deletes };
}

/** Campi di un documento `profiles`. */
export function migrateProfile(data) {
  const updates = {};
  const deletes = [];
  for (const [oldKey, newKey] of Object.entries(PROFILE_MAP)) {
    if (!Object.prototype.hasOwnProperty.call(data, oldKey)) continue;
    deletes.push(oldKey);
    if (Object.prototype.hasOwnProperty.call(data, newKey)) continue;
    updates[newKey] = data[oldKey];
  }
  return { updates, deletes };
}

// --- esecuzione ------------------------------------------------------------

const BATCH_SIZE = 400; // il limite di Firestore è 500 scritture per batch
const PAGE_SIZE = 500;

/**
 * Il progetto non ha un database `(default)`: ne usa uno con id proprio. Lo si
 * legge dalla stessa configurazione da cui lo prende il sito, così la
 * migrazione non può finire per sbaglio su un altro database.
 */
async function resolveDatabaseId() {
  const fromArg = process.argv.find((a) => a.startsWith("--database="));
  if (fromArg) return fromArg.slice("--database=".length);
  if (process.env.FIRESTORE_DATABASE_ID) return process.env.FIRESTORE_DATABASE_ID;

  const { readFileSync } = await import("node:fs");
  const config = readFileSync(new URL("../src/firebase.ts", import.meta.url), "utf8");
  const match = config.match(/databaseId:\s*"([^"]+)"/);
  if (!match) {
    throw new Error(
      "databaseId non trovato in src/firebase.ts: passalo con --database=<id>",
    );
  }
  return match[1];
}

/** Apre il database così come lo apre il sito. */
async function openDatabase() {
  // Import modulari: in ESM `firebase-admin` non espone più l'oggetto unico
  // con `credential`/`firestore()` sotto il default export.
  const { initializeApp, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");

  const databaseId = await resolveDatabaseId();
  initializeApp({ credential: applicationDefault() });
  return { db: getFirestore(databaseId), FieldValue, databaseId };
}

async function run() {
  const apply = process.argv.includes("--apply");
  const backupArg = process.argv.find((a) => a.startsWith("--backup="));
  const backupPath = backupArg ? backupArg.slice("--backup=".length) : null;

  // La migrazione cancella i nomi vecchi: senza una copia di ciò che c'era
  // prima non si torna indietro. Scrivere senza rete richiede quindi di dirlo.
  if (apply && !backupPath && !process.argv.includes("--no-backup")) {
    throw new Error(
      "Con --apply serve --backup=<file> (o --no-backup per rinunciare al ripristino).",
    );
  }

  const { appendFileSync, writeFileSync } = await import("node:fs");
  if (apply && backupPath) writeFileSync(backupPath, "");
  /** Una riga per documento: quanto basta a rimettere le cose come stavano. */
  const saveBackup = (entry) => {
    if (apply && backupPath) appendFileSync(backupPath, JSON.stringify(entry) + "\n");
  };

  const { db, FieldValue, databaseId } = await openDatabase();

  const label = apply ? "SCRITTURA" : "ANTEPRIMA (nessuna scrittura)";
  console.log(`\n=== Migrazione nomi campi — ${label} ===`);
  console.log(`Database: ${databaseId}`);
  if (apply) console.log(`Backup:   ${backupPath || "NESSUNO (ripristino impossibile)"}`);
  console.log();

  const stats = {};
  const record = (col, key) => {
    stats[col] ??= { letti: 0, migrati: 0 };
    stats[col][key]++;
  };

  /**
   * Scorre una collezione a pagine. `handler` restituisce `{ write, backup }`:
   * `write` è ciò che finisce sul documento, `backup` ciò che serve a disfarlo.
   */
  async function eachDoc(collection, handler) {
    let cursor = null;
    let batch = db.batch();
    let pending = 0;

    for (;;) {
      let q = db.collection(collection).orderBy("__name__").limit(PAGE_SIZE);
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        record(collection, "letti");
        const result = handler(doc);
        if (!result) continue;
        record(collection, "migrati");
        if (apply) {
          saveBackup({ c: collection, id: doc.id, ...result.backup });
          batch.set(doc.ref, result.write, { merge: true });
          if (++pending >= BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            pending = 0;
          }
        }
      }

      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < PAGE_SIZE) break;
    }

    if (apply && pending > 0) await batch.commit();
  }

  /** Rinomina di campi semplici: si salvano i vecchi valori e i nuovi nomi. */
  const fieldRename = (doc, migrateFn) => {
    const data = doc.data();
    const { updates, deletes } = migrateFn(data);
    if (deletes.length === 0) return null;
    const before = {};
    for (const key of deletes) before[key] = data[key];
    const write = { ...updates };
    for (const key of deletes) write[key] = FieldValue.delete();
    // `updates` contiene solo i nomi nuovi creati ora, mai quelli già presenti:
    // al ripristino si possono togliere senza cancellare dati altrui.
    return { write, backup: { set: before, del: Object.keys(updates) } };
  };

  // 1. messages — i nomi vivono dentro la stringa JSON `advancedInfo`
  await eachDoc("messages", (doc) => {
    const original = doc.get("advancedInfo");
    const migrated = migrateAdvancedInfoString(original);
    if (!migrated) return null;
    return {
      write: { advancedInfo: migrated },
      backup: { set: { advancedInfo: original }, del: [] },
    };
  });

  // 2. profiles — unioni manuali, isolamenti e liste di alias dell'operatore
  await eachDoc("profiles", (doc) => fieldRename(doc, migrateProfile));

  // 3. analytics_visits — storico dei tempi per campo
  await eachDoc("analytics_visits", (doc) => fieldRename(doc, migrateVisit));

  // 4. rate_limits -> send_throttle: la collezione ha cambiato nome, quindi i
  //    cooldown in corso vanno copiati per non azzerarsi. Nulla viene tolto da
  //    `rate_limits`, quindi per disfare basta cancellare le copie create.
  {
    const snap = await db.collection("rate_limits").get();
    let batch = db.batch();
    let pending = 0;
    for (const doc of snap.docs) {
      record("rate_limits→send_throttle", "letti");
      const dest = db.collection("send_throttle").doc(doc.id);
      if ((await dest.get()).exists) continue; // già migrato o già attivo
      record("rate_limits→send_throttle", "migrati");
      if (apply) {
        saveBackup({ c: "send_throttle", id: doc.id, created: true });
        batch.set(dest, doc.data(), { merge: true });
        if (++pending >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
    }
    if (apply && pending > 0) await batch.commit();
  }

  console.log("Collezione                     letti   da migrare");
  for (const [col, s] of Object.entries(stats)) {
    console.log(`${col.padEnd(30)} ${String(s.letti).padStart(5)}   ${String(s.migrati).padStart(10)}`);
  }
  console.log(
    apply
      ? `\nMigrazione completata.${backupPath ? ` Per disfarla: --restore=${backupPath}\n` : "\n"}`
      : "\nNessuna scrittura effettuata. Rilancia con --apply per applicare.\n",
  );
}

/** Riporta i documenti allo stato salvato nel file di backup. */
async function runRestore(backupPath) {
  const { readFileSync } = await import("node:fs");
  const lines = readFileSync(backupPath, "utf8").split("\n").filter(Boolean);
  const { db, FieldValue, databaseId } = await openDatabase();

  console.log(`\n=== Ripristino da ${backupPath} ===`);
  console.log(`Database: ${databaseId}`);
  console.log(`Documenti da riportare indietro: ${lines.length}\n`);

  let batch = db.batch();
  let pending = 0;
  let restored = 0;

  for (const line of lines) {
    const entry = JSON.parse(line);
    const ref = db.collection(entry.c).doc(entry.id);
    if (entry.created) {
      batch.delete(ref); // copia creata dalla migrazione: si toglie
    } else {
      const payload = { ...entry.set };
      for (const key of entry.del || []) payload[key] = FieldValue.delete();
      batch.set(ref, payload, { merge: true });
    }
    restored++;
    if (++pending >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  console.log(`Ripristinati ${restored} documenti.\n`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const restoreArg = process.argv.find((a) => a.startsWith("--restore="));
  const task = restoreArg
    ? runRestore(restoreArg.slice("--restore=".length))
    : run();
  task.catch((err) => {
    console.error("Interrotto:", err.message || err);
    process.exit(1);
  });
}
