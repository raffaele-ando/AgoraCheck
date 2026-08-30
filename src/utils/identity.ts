// ===========================================================================
// identity.ts — single source of truth for device identification.
//
// Design (see project notes):
//  L1 DEVICE  = deterministic. A device == a set of co-observed persistent
//               tokens (cookie / localStorage / IndexedDB / ETag / anon uid).
//               No fingerprint enters here.
//  L2 PERSON  = probabilistic, handled server/dashboard side. Device class and
//               OS are NEGATIVE constraints only, never positive links.
//
// The Instagram in-app browser (IAB) exposes far richer UA data than Safari or
// Chrome (exact device model, physical resolution, dpi, chipset, locale). We
// capture it and, crucially, keep it available so that when the user leaves the
// IAB for the system browser it can be carried across in the URL (handoff).
// ===========================================================================

// ---------------------------------------------------------------------------
// Low-level persistent storage backends (best-effort, never throw)
// ---------------------------------------------------------------------------

const IDB_NAME = "agora_fp";
const IDB_STORE = "kv";

export const idbGet = (key: string): Promise<string | null> =>
  new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore(IDB_STORE);
        } catch {}
      };
      req.onsuccess = () => {
        try {
          const g = req.result
            .transaction(IDB_STORE, "readonly")
            .objectStore(IDB_STORE)
            .get(key);
          g.onsuccess = () => resolve((g.result as string) ?? null);
          g.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

export const idbSet = (key: string, val: string): Promise<void> =>
  new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore(IDB_STORE);
        } catch {}
      };
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).put(val, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

const ckGet = (n: string): string | null => {
  try {
    const m = document.cookie.match(
      new RegExp("(?:^|; )" + encodeURIComponent(n) + "=([^;]*)"),
    );
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
};

const ckSet = (n: string, v: string, days: number) => {
  try {
    document.cookie =
      encodeURIComponent(n) +
      "=" +
      encodeURIComponent(v) +
      "; expires=" +
      new Date(Date.now() + days * 864e5).toUTCString() +
      "; path=/; SameSite=Lax";
  } catch {}
};

const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

// ---------------------------------------------------------------------------
// Token keys. We deliberately mirror the token across several keys/backends so
// that a partial clear (e.g. iOS ITP purging localStorage after 30 days of
// inactivity, while the cookie survives) can still be reconciled.
// ---------------------------------------------------------------------------

const PID_KEY = "agora_pid_v2";
const LS_ALIASES = [PID_KEY, "app_state_hash", "vToken", "deviceId"];

const newId = (): string => {
  try {
    if ("crypto" in window && "randomUUID" in (crypto as any)) {
      return (crypto as any).randomUUID();
    }
  } catch {}
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).padEnd(20, "0");
};

// Server-issued id (HttpOnly cookie + signed token). Optional: only present when
// a backend endpoint exists (Cloud Run). On static hosting (GitHub Pages) this
// silently no-ops and we rely on the client backends. Never blocks, never throws.
async function fetchServerId(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("/id", {
      credentials: "include",
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

export interface DeviceTokens {
  srv?: string | null; // server HttpOnly cookie (strongest on iOS)
  ls?: string | null; // localStorage
  idb?: string | null; // IndexedDB
  ck?: string | null; // JS cookie
  anon?: string | null; // Firebase anonymous uid (set by caller)
  ho?: string | null; // token received via cross-browser handoff URL
}

const _cache: { primary: string | null; tokens: DeviceTokens } = {
  primary: null,
  tokens: {},
};

/** Write the primary token to EVERY client backend. */
export async function propagateToken(v: string): Promise<void> {
  for (const k of LS_ALIASES) lsSet(k, v);
  ckSet(PID_KEY, v, 365 * 3);
  await idbSet(PID_KEY, v);
}

/**
 * Resolve the device identity across all backends.
 * - Collects every token found (localStorage aliases, IndexedDB, cookie,
 *   server cookie, and any handoff token already ingested).
 * - Picks a stable primary (prefers server > handoff > existing client tokens).
 * - Re-seeds every backend with the primary so future partial clears reconcile.
 * Returns the primary id plus the full map of what was found (all sent to the
 * backend so the server can union tokens into one device).
 */
export async function resolveIdentity(
  anonUid?: string | null,
): Promise<{ primary: string; tokens: DeviceTokens; isNew: boolean }> {
  if (_cache.primary) {
    if (anonUid && !_cache.tokens.anon) _cache.tokens.anon = anonUid;
    return { primary: _cache.primary, tokens: _cache.tokens, isNew: false };
  }

  const [srv, idb, ho] = await Promise.all([
    fetchServerId(),
    idbGet(PID_KEY),
    Promise.resolve(getIngestedHandoffToken()),
  ]);

  let ls: string | null = null;
  for (const k of LS_ALIASES) {
    ls = ls || lsGet(k);
  }
  const ck = ckGet(PID_KEY);

  const tokens: DeviceTokens = { srv, ls, idb, ck, anon: anonUid || null, ho };

  // Primary selection priority: server (most durable) > handoff > client stores.
  const primary =
    srv ||
    ho ||
    ls ||
    idb ||
    ck ||
    anonUid ||
    (() => {
      const n = newId();
      return n;
    })();

  const isNew = !(srv || ho || ls || idb || ck);

  await propagateToken(primary);

  _cache.primary = primary;
  _cache.tokens = tokens;
  return { primary, tokens, isNew };
}

/** Synchronous best-effort primary token (for code paths that can't await). */
export function getPrimaryTokenSync(): string {
  if (_cache.primary) return _cache.primary;
  let ls: string | null = null;
  for (const k of LS_ALIASES) ls = ls || lsGet(k);
  const v = ls || ckGet(PID_KEY) || getIngestedHandoffToken() || newId();
  _cache.primary = v;
  // fire-and-forget propagation
  propagateToken(v).catch(() => {});
  return v;
}

// ---------------------------------------------------------------------------
// Instagram in-app browser UA parsing (Android + iOS, with/without IABMV token)
// ---------------------------------------------------------------------------

export interface IgMeta {
  isInstagram: boolean;
  platform: "android" | "ios" | "other";
  igVersion?: string;
  deviceModel?: string; // "SM-G991B" | "iPhone14,5"
  manufacturer?: string; // "samsung" (android)
  chipset?: string; // "exynos2100" (android)
  board?: string; // "o1s" (android)
  osVersion?: string; // "13" | "17_5_1"
  androidApi?: string; // "33"
  physicalRes?: string; // "1080x2159" | "1170x2532"
  dpi?: string; // "420dpi" (android)
  scale?: string; // "3.00" (ios devicePixelRatio)
  locale?: string; // "it_IT"
  igField?: string; // trailing numeric field (installId or build — TBD)
  raw: string;
}

export function parseIgUA(ua: string): IgMeta {
  const base: IgMeta = { isInstagram: false, platform: "other", raw: ua || "" };
  if (!ua) return base;

  // ANDROID: "... Instagram 302.0.0.23.114 Android (33/13; 420dpi; 1080x2159; samsung; SM-G991B; o1s; exynos2100; it_IT; 522754108)"
  const aMatch = ua.match(/Instagram\s+([\d.]+)\s+Android\s+\(([^)]*)\)/);
  if (aMatch) {
    const parts = aMatch[2].split(";").map((s) => s.trim());
    const apiOs = (parts[0] || "").split("/"); // "33/13"
    return {
      ...base,
      isInstagram: true,
      platform: "android",
      igVersion: aMatch[1],
      androidApi: apiOs[0] || "",
      osVersion: apiOs[1] || apiOs[0] || "",
      dpi: parts[1] || "",
      physicalRes: parts[2] || "",
      manufacturer: parts[3] || "",
      deviceModel: parts[4] || "",
      board: parts[5] || "",
      chipset: parts[6] || "",
      locale: parts[7] || "",
      igField: parts[8] || "",
    };
  }

  // iOS: "... Instagram 335.0.0.34.98 (iPhone14,5; iOS 17_5_1; it_IT; it; scale=3.00; 1170x2532; 590530890)"
  //  or with IABMV: "... (iPhone13,2; iOS 18_1; it_IT; it; scale=3.00; 1170x2532; IABMV/1; 961927775)"
  const iMatch = ua.match(/Instagram\s+([\d.]+)\s+\(([^)]*)\)/);
  if (iMatch) {
    const parts = iMatch[2].split(";").map((s) => s.trim());
    const scale = (parts.find((p) => p.startsWith("scale=")) || "").replace(
      "scale=",
      "",
    );
    const res = parts.find((p) => /^\d{3,4}x\d{3,4}$/.test(p)) || "";
    const osPart = parts.find((p) => /iOS/i.test(p)) || parts[1] || "";
    const numericTail = [...parts]
      .reverse()
      .find((p) => /^\d{5,}$/.test(p));
    return {
      ...base,
      isInstagram: true,
      platform: "ios",
      igVersion: iMatch[1],
      deviceModel: parts[0] || "",
      osVersion: osPart.replace(/iOS\s*/i, "").trim(),
      locale: parts.find((p) => /^[a-z]{2}_[A-Z]{2}$/.test(p)) || parts[2] || "",
      scale,
      physicalRes: res,
      igField: numericTail || "",
    };
  }

  // Not the IAB — still record coarse platform for negative constraints.
  if (/Android/i.test(ua)) return { ...base, platform: "android" };
  if (/iPhone|iPad|iOS/i.test(ua)) return { ...base, platform: "ios" };
  return base;
}

export function isInstagramBrowser(ua?: string): boolean {
  return /Instagram/i.test(ua || navigator.userAgent || "");
}

/**
 * Device CLASS — a coarse bucket used ONLY as a negative constraint
 * (different class => certainly different physical device). NEVER a positive
 * link. Deliberately excludes the Instagram *app version* (it changes on every
 * app update and would otherwise fragment a device from itself).
 */
export function computeDeviceClass(ig: IgMeta): string {
  const keyParts = [
    ig.platform,
    ig.osVersion || "",
    ig.deviceModel || "",
    ig.manufacturer || "",
    ig.chipset || "",
    ig.board || "",
    ig.physicalRes || "",
    ig.dpi || ig.scale || "",
  ];
  return "C:" + shortHash(keyParts.join("|"));
}

// ---------------------------------------------------------------------------
// Hashing (cyrb53, full 53-bit hex — NO truncation)
// ---------------------------------------------------------------------------

export function shortHash(seed: string): string {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0, ch; i < seed.length; i++) {
    ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).toUpperCase().padStart(14, "0");
}

// ---------------------------------------------------------------------------
// Cross-browser handoff.
//
// The IAB and the system browser are separate storage containers, so the ONLY
// channel that crosses them is the URL. We keep a compact, signed-ish payload of
// the IG-only signals reflected into the address bar while inside the IAB, so
// that when Instagram's native "Open in system browser" opens the *current* URL
// in Safari/Chrome, all the rich data comes along. On landing we ingest it,
// re-seed the client backends, then clean the URL (no user-visible artifact).
// ---------------------------------------------------------------------------

const HANDOFF_PARAM = "_ax";
let _ingestedToken: string | null = null;
let _ingestedPayload: Record<string, any> | null = null;

function b64urlEncode(obj: any): string {
  const json = JSON.stringify(obj);
  try {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

function b64urlDecode(s: string): any {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch {
    return null;
  }
}

/** Build the compact handoff payload (IG-only signals + device token). */
export function buildHandoffPayload(token: string, ig: IgMeta): any {
  return {
    v: 2,
    t: token,
    ts: Date.now(),
    src: ig.isInstagram ? "iab" : "web",
    p: ig.platform,
    m: ig.deviceModel || "",
    o: ig.osVersion || "",
    r: ig.physicalRes || "",
    d: ig.dpi || ig.scale || "",
    l: ig.locale || "",
    f: ig.igField || "",
    iv: ig.igVersion || "",
  };
}

/**
 * Reflect the handoff payload into the current URL WITHOUT a navigation or any
 * visible flash, so IG's "open in browser" carries it. Safe to call repeatedly.
 */
export function primeHandoffUrl(token: string, ig: IgMeta): void {
  try {
    const payload = buildHandoffPayload(token, ig);
    const enc = b64urlEncode(payload);
    if (!enc) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(HANDOFF_PARAM) === enc) return;
    url.searchParams.set(HANDOFF_PARAM, enc);
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {}
}

/**
 * On page load: if a handoff payload is present in the URL, ingest it (re-seed
 * the device token so this browser adopts the same identity), remember the IG
 * signals, then strip the param from the visible URL.
 */
export function ingestHandoffFromUrl(): Record<string, any> | null {
  try {
    const url = new URL(window.location.href);
    const enc = url.searchParams.get(HANDOFF_PARAM);
    if (!enc) return null;
    const payload = b64urlDecode(enc);
    // clean the URL regardless, so nothing is visible/shareable
    url.searchParams.delete(HANDOFF_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + (url.search ? url.search : "") + url.hash,
    );
    if (!payload || !payload.t) return null;
    _ingestedToken = String(payload.t);
    _ingestedPayload = payload;
    // Adopt the token in THIS browser's backends immediately.
    propagateToken(_ingestedToken).catch(() => {});
    return payload;
  } catch {
    return null;
  }
}

export function getIngestedHandoffToken(): string | null {
  return _ingestedToken;
}
export function getIngestedHandoffPayload(): Record<string, any> | null {
  return _ingestedPayload;
}
