import { shortHash } from "./identity";

// ===========================================================================
// computeDeviceProfileId — the micro-profile (L1 DEVICE) identifier.
//
// Priority:
//   1. Persistent device token (cookie/localStorage/IndexedDB/server/anon uid).
//      This is deterministic device identity — a device is its token. Same token
//      => same profile, always. No fingerprint, no probability.
//   2. Fallback for LEGACY messages with no token: a STABLE hardware seed.
//      Deliberately excludes volatile signals (canvas/audio/webgl/math/rects):
//      inside a single browser engine those are identical per model (0 bits per
//      device) and, worse, unstable across sends (async races) — which used to
//      fragment one device into several profiles.
//
// The Instagram handle is NEVER part of the key. It is an attribute of the
// device/person (handled at the person layer). Keying by handle let anyone be
// merged into a victim's identity just by typing their username.
// ===========================================================================

const SENTINELS = new Set([
  "",
  "unknown",
  "error",
  "n/a",
  "na",
  "blocked/timeout",
  "suspended",
  "not supported",
  "nascosto",
  "sconosciuto",
]);

const clean = (v: any): string => {
  const s = String(v ?? "").trim();
  return SENTINELS.has(s.toLowerCase()) ? "" : s;
};

/** Extract every persistent token we might have stored on a message payload. */
export const extractDeviceToken = (parsedAdv: any): string => {
  if (!parsedAdv) return "";
  const b = parsedAdv.behavior || parsedAdv.b || {};
  const ids = parsedAdv.ids || parsedAdv.i || {};
  return (
    clean(ids.srv) ||
    clean(ids.ho) ||
    clean(ids.ls) ||
    clean(ids.idb) ||
    clean(ids.ck) ||
    clean(ids.anon) ||
    clean(b.ttv) ||
    clean(b.vToken) ||
    ""
  );
};

export const computeDeviceProfileId = (
  parsedAdv: any,
  deviceInfo: any,
  _instagram: string = "", // kept for signature compatibility; intentionally unused
): string => {
  try {
    // 1. Persistent token wins.
    const token = extractDeviceToken(parsedAdv);
    if (token) return "DEV-" + shortHash(token).slice(0, 12);

    // 2. Legacy fallback: stable hardware seed (no volatile signals, no handle).
    if (parsedAdv) {
      const s = parsedAdv.software || parsedAdv.s || {};
      const h = parsedAdv.hardware || parsedAdv.h || {};

      const model = clean(
        h.uaDeviceModel ||
          h.deviceModel ||
          (h.igMeta && h.igMeta.deviceModel) ||
          "",
      );
      const gpu = clean(h.gpu || h.g || "");
      const screen = clean(h.screen || h.s || "");
      const physicalRes = clean(
        (h.igMeta && h.igMeta.physicalRes) || h.physicalRes || "",
      );
      const cores = clean(h.cores || h.c || "");
      const pixelRatio = clean(h.pixelRatio || "");
      const colorDepth = clean(h.colorDepth || "");

      const parts = [
        model,
        physicalRes || screen,
        gpu,
        cores,
        pixelRatio,
        colorDepth,
      ].filter(Boolean);

      // Require a minimum of real, stable signal before minting an id.
      if (parts.length >= 2) {
        return "HW-" + shortHash(parts.join("-")).slice(0, 12);
      }
    }

    // 3. Last resort: user agent (legacy messages only).
    const ua = clean(deviceInfo?.userAgent || "");
    if (ua) return "UA-" + shortHash(ua).slice(0, 12);

    return "UNKNOWN";
  } catch (e) {
    console.error("Error in computeDeviceProfileId:", e);
    return "UNKNOWN";
  }
};
