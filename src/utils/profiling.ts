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

/**
 * Every persistent token CO-OBSERVED on a single message.
 *
 * `resolveIdentity` snapshots each backend BEFORE re-seeding them all with the
 * primary, so a message sent during a transition (server cookie appears while
 * localStorage still holds an older id, a partial ITP clear, a cross-browser
 * handoff) carries BOTH the old and the new value. Two device profiles that
 * share any one of these values are therefore the same physical device with
 * certainty — this is the deterministic evidence the L1 layer is built on, and
 * what lets the dashboard re-unite a device that would otherwise split when its
 * primary token changes.
 *
 * Order is irrelevant here: the caller unions, it does not pick a winner.
 * `extractDeviceToken` above remains the (unchanged) priority-based selector
 * used to mint the profile id.
 */
export const extractAllDeviceTokens = (parsedAdv: any): string[] => {
  if (!parsedAdv) return [];
  const b = parsedAdv.behavior || parsedAdv.b || {};
  const ids = parsedAdv.ids || parsedAdv.i || {};
  const out = new Set<string>();
  for (const raw of [
    ids.srv,
    ids.ho,
    ids.ls,
    ids.idb,
    ids.ck,
    ids.anon,
    b.ttv,
    b.vToken,
  ]) {
    const v = clean(raw);
    // Guard against degenerate values that would union unrelated devices.
    if (v && v.length >= 8) out.add(v);
  }
  return Array.from(out);
};

/**
 * How much the profile id can be trusted.
 *  - "token"  : minted from a persistent device token — deterministic.
 *  - "legacy" : minted from a hardware seed or the user agent (messages sent
 *               before tokens existed). On homogenised platforms these seeds are
 *               identical across every unit of the same model, so such a profile
 *               may well aggregate several different people. Surfaced in the UI
 *               so an operator never mistakes it for a confirmed identity.
 */
export const getProfileIdConfidence = (
  profileId: string,
): "token" | "legacy" | "unknown" => {
  if (!profileId || profileId === "UNKNOWN") return "unknown";
  if (profileId.startsWith("DEV-")) return "token";
  if (profileId.startsWith("HW-") || profileId.startsWith("UA-")) return "legacy";
  // Manual group ids (assigned by an operator) are as trustworthy as a token.
  return "token";
};

/**
 * The stable, physically-immutable traits of a device.
 *
 * Deliberately EXCLUDES the OS version, the browser version and the Instagram
 * app version: those all change on update, so treating them as identity would
 * make a device stop matching itself. What is left cannot change without the
 * user physically replacing the handset.
 */
export interface DeviceTraits {
  platform: "android" | "ios" | "desktop" | "unknown";
  model: string; // "iPhone14,5" | "SM-G991B" | ""
}

export const extractDeviceTraits = (
  parsedAdv: any,
  deviceInfo?: any,
): DeviceTraits => {
  const h = parsedAdv?.hardware || parsedAdv?.h || {};
  const igx = parsedAdv?.igx || {};
  const igMeta = h.igMeta || {};
  const ua = String(
    parsedAdv?.software?.userAgent ||
      parsedAdv?.s?.userAgent ||
      deviceInfo?.userAgent ||
      "",
  );

  const model = clean(
    igx.deviceModel || igMeta.deviceModel || h.uaDeviceModel || h.deviceModel || "",
  );

  let platform: DeviceTraits["platform"] = "unknown";
  const igPlatform = String(igx.platform || "");
  if (igPlatform === "android" || igPlatform === "ios") {
    platform = igPlatform;
  } else if (/Android/i.test(ua)) {
    platform = "android";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = "ios";
  } else if (/Windows|Macintosh|Mac OS X|Linux|CrOS/i.test(ua)) {
    platform = "desktop";
  }

  return { platform, model };
};

/**
 * NEGATIVE CONSTRAINT — may two profiles be the same PHYSICAL DEVICE?
 *
 * Returns false only when the traits are mutually exclusive: an iPhone14,5 can
 * never also be an SM-G991B. Anything unknown stays compatible, so missing data
 * never blocks a link.
 *
 * Applies to device-level evidence only (hardware seeds, network). It is NOT
 * applied to person-level evidence: one person legitimately owns an iPhone and
 * an Android, so an Instagram handle or an operator's manual merge may — and
 * should — still join them.
 */
export const areDeviceTraitsCompatible = (
  a: DeviceTraits,
  b: DeviceTraits,
): boolean => {
  if (
    a.platform !== "unknown" &&
    b.platform !== "unknown" &&
    a.platform !== b.platform
  ) {
    return false;
  }
  if (a.model && b.model && a.model !== b.model) return false;
  return true;
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
