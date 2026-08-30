// ===========================================================================
// Agorà edge Worker (Cloudflare)
//
// Deploy this in FRONT of agora.theproject.world (route: agora.theproject.world/*)
// so it can add durable identity + serve media, and pass everything else through
// to the existing origin. It intentionally does NOT change page content.
//
// Endpoints:
//   GET  /id            -> issues an HttpOnly, 400-day signed device token cookie
//                          (this is the iOS fix: document.cookie is capped at 7
//                          days by ITP, but a Set-Cookie from the server is not).
//   GET  /px.gif        -> 1x1 gif whose ETag is the device token (survives a
//                          localStorage/IndexedDB clear via the HTTP cache).
//   POST /media         -> stores an uploaded file in R2, returns its public URL.
//   GET  /media/<key>   -> serves a file from R2 (immutable, cached).
//   (everything else)   -> proxied to the origin unchanged.
//
// Bindings (see wrangler.toml): MEDIA (R2), IDENTITY (KV), ID_SECRET (secret).
// ===========================================================================

const COOKIE = "aid";
const YEAR = 365 * 24 * 60 * 60;
const MAX_AGE = Math.round(1.1 * YEAR); // ~400 days

const enc = new TextEncoder();

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function readCookie(req, name) {
  const c = req.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function cors(req, extra = {}) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Filename",
    ...extra,
  };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors(req) });
    }

    // --- /id : durable HttpOnly device token ---------------------------------
    if (path === "/id") {
      let aid = readCookie(req, COOKIE);
      let setCookie = null;
      if (!aid) {
        aid = crypto.randomUUID();
        setCookie =
          `${COOKIE}=${aid}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
        // Best-effort durable record.
        ctx.waitUntil(
          env.IDENTITY?.put(
            `aid:${aid}`,
            JSON.stringify({ created: Date.now(), ip: req.headers.get("CF-Connecting-IP") || "" }),
            { expirationTtl: MAX_AGE },
          ) ?? Promise.resolve(),
        );
      }
      const secret = env.ID_SECRET || "dev-secret-change-me";
      const token = `${aid}.${await hmac(secret, aid)}`;
      const headers = cors(req, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      if (setCookie) headers["Set-Cookie"] = setCookie;
      return new Response(JSON.stringify({ token }), { headers });
    }

    // --- /px.gif : ETag persistence -----------------------------------------
    if (path === "/px.gif") {
      let aid = readCookie(req, COOKIE) || req.headers.get("If-None-Match")?.replace(/"/g, "");
      if (!aid) aid = crypto.randomUUID();
      const gif = Uint8Array.from(
        atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
        (c) => c.charCodeAt(0),
      );
      return new Response(gif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "private, max-age=31536000, immutable",
          ETag: `"${aid}"`,
        },
      });
    }

    // --- POST /media : store in R2 ------------------------------------------
    if (path === "/media" && req.method === "POST") {
      if (!env.MEDIA) return new Response("R2 not bound", { status: 500, headers: cors(req) });
      const ct = req.headers.get("Content-Type") || "application/octet-stream";
      const name = (req.headers.get("X-Filename") || crypto.randomUUID()).replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `${Date.now()}-${name}`;
      await env.MEDIA.put(key, req.body, { httpMetadata: { contentType: ct } });
      const publicUrl = `${url.origin}/media/${key}`;
      return new Response(JSON.stringify({ url: publicUrl, key }), {
        headers: cors(req, { "Content-Type": "application/json" }),
      });
    }

    // --- GET /media/<key> : serve from R2 -----------------------------------
    if (path.startsWith("/media/") && req.method === "GET") {
      if (!env.MEDIA) return new Response("R2 not bound", { status: 500 });
      const key = decodeURIComponent(path.slice("/media/".length));
      const obj = await env.MEDIA.get(key);
      if (!obj) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(obj.body, { headers });
    }

    // --- everything else: pass through to origin ----------------------------
    return fetch(req);
  },
};
