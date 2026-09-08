// ===========================================================================
// Agorà edge Worker (Cloudflare)
//
// agora.theproject.world serve AgoraCheck direttamente da GitHub Pages (via
// DNS): questo Worker non sta più davanti a TUTTO il dominio. È instradato
// (vedi wrangler.toml) SOLO sui quattro percorsi qui sotto che un sito
// statico non può servire da sé — identità del dispositivo e upload dei
// media. Ogni altro indirizzo non passa mai da qui: Cloudflare lo consegna
// direttamente a GitHub Pages, senza che questo file venga invocato.
//
// Endpoints:
//   GET  /id            -> issues an HttpOnly, 400-day signed device token cookie
//                          (this is the iOS fix: document.cookie is capped at 7
//                          days by ITP, but a Set-Cookie from the server is not).
//   GET  /px.gif        -> 1x1 gif whose ETag is the device token (survives a
//                          localStorage/IndexedDB clear via the HTTP cache).
//   POST /media         -> stores an uploaded file in R2, returns its public URL.
//   GET  /media/<key>   -> serves a file from R2 (immutable, cached).
//   (everything else)   -> ripiego difensivo: con le Route scoped ai quattro
//                          percorsi sopra, questo ramo in condizioni normali
//                          non viene mai raggiunto (vedi wrangler.toml).
//
// Bindings (see wrangler.toml): MEDIA (R2), IDENTITY (KV), ID_SECRET (secret).
//
// Tipizzato con i tipi minimi in cloudflare/types/workers-lite.d.ts, non con
// il pacchetto ufficiale @cloudflare/workers-types — vedi quel file per il
// motivo. `wrangler deploy` accetta questo file direttamente: bundlizza da sé
// con esbuild, non serve alcuna compilazione a monte.
// ===========================================================================

const COOKIE = "aid";
const YEAR = 365 * 24 * 60 * 60;
const MAX_AGE = Math.round(1.1 * YEAR); // ~400 days

const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
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

function readCookie(req: Request, name: string): string | null {
  const c = req.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function cors(req: Request, extra: Record<string, string> = {}): Record<string, string> {
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
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors(req) });
    }

    // --- /id : durable HttpOnly device token ---------------------------------
    if (path === "/id") {
      let aid = readCookie(req, COOKIE);
      let setCookie: string | null = null;
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
      // Il token è `<aid>.<firma>`. La firma NON viene verificata da nessun
      // endpoint: serve solo a rendere il valore non falsificabile a vista.
      // Il rischio è che cambiando ID_SECRET lo stesso `aid` produca un token
      // diverso, facendo apparire nuovo ogni dispositivo e vanificando il
      // cookie da 400 giorni. Per questo, in assenza di un segreto configurato,
      // si restituisce l'aid nudo (già un UUID non indovinabile) invece di
      // firmarlo con un valore predefinito destinato a cambiare più avanti.
      //
      // Nota: una rotazione del segreto non è più distruttiva come prima —
      // la dashboard riunisce i profili che condividono un token co-osservato,
      // e il messaggio inviato durante la transizione trasporta sia il valore
      // vecchio sia quello nuovo — ma resta da evitare.
      const secret = env.ID_SECRET;
      const token = secret ? `${aid}.${await hmac(secret, aid)}` : aid;
      const headers = cors(req, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      if (setCookie) headers["Set-Cookie"] = setCookie;
      return new Response(JSON.stringify({ token }), { headers });
    }

    // --- /px.gif : ETag persistence -----------------------------------------
    if (path === "/px.gif") {
      const cookieAid = readCookie(req, COOKIE);
      let aid: string | null =
        cookieAid || req.headers.get("If-None-Match")?.replace(/"/g, "") || null;
      let setCookie: string | null = null;
      if (!aid) {
        aid = crypto.randomUUID();
      }
      // Allinea il cookie all'identificativo del pixel quando manca, così
      // /id e /px.gif convergono sullo stesso valore invece di emetterne due
      // diversi per lo stesso dispositivo.
      if (!cookieAid) {
        setCookie = `${COOKIE}=${aid}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
      }
      const gif = Uint8Array.from(
        atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
        (c) => c.charCodeAt(0),
      );
      const headers: Record<string, string> = {
        "Content-Type": "image/gif",
        "Cache-Control": "private, max-age=31536000, immutable",
        ETag: `"${aid}"`,
      };
      if (setCookie) headers["Set-Cookie"] = setCookie;
      return new Response(gif, { headers });
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
      // CORS so these images can be drawn into a canvas (html-to-image export)
      // without tainting it.
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Timing-Allow-Origin", "*");
      return new Response(obj.body, { headers });
    }

    // --- everything else: pass through to origin ----------------------------
    return fetch(req);
  },
};
