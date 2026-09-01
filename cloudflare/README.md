# Agorà — Cloudflare edge

Provisioned in your account (ready to use):

| Resource | Name | ID |
|---|---|---|
| R2 bucket | `agora-media` | — |
| KV namespace | `agora-identity` | `14176b51077746ffb3e9ddc8bcf58e84` |

## What the Worker adds

`worker.js` is meant to run **in front of** `agora.theproject.world` and pass
everything through to the current origin, adding only:

- **`GET /id`** — issues an `HttpOnly; Secure; SameSite=Lax` cookie valid
  and returns a signed token. This is the **iOS durability fix**: Safari/
  WKWebView ITP caps `document.cookie` at 7 days, but a server `Set-Cookie` is
  not capped. The client (`src/utils/identity.ts`) already calls `/id` and
  folds the token into the device identity — it silently no-ops until the Worker
  is deployed, so nothing breaks in the meantime.
- **`GET /px.gif`** — a 1×1 gif whose `ETag` is the device token, so identity
  survives a localStorage/IndexedDB clear (lives in the HTTP cache instead).
- **`POST /media`** + **`GET /media/<key>`** — store/serve binary assets in R2.

## Deploy

```bash
cd cloudflare
npx wrangler secret put ID_SECRET     # paste any long random string
# edit wrangler.toml -> uncomment the [[routes]] block with your zone
npx wrangler deploy
```

You already have a `polimiagora` Worker on the account; you can either deploy
this as a second Worker (`agora-edge`) on the route, or paste the endpoint
handlers from `worker.js` into that existing Worker.

## Firebase vs Cloudflare — division of responsibility

**Keep in Firebase**
- **Firestore** — structured, queried, realtime data: `messages`, `profiles`,
  `rate_limits`, `stats`, `admins`, and small JSON `settings` (widget/link/logo
  config, template box coordinates). Realtime listeners (`onSnapshot`) power the
  dashboard and stay on Firestore.
- **Firebase Auth** — anonymous auth today, Google login for admins, and the
  planned user login.

**Move to Cloudflare**
- **R2 (`agora-media`)** — all binary assets. Today logos and story/carousel
  **background images are stored as base64 dataURLs inside Firestore documents**
  (`logos/*`, `settings/story_template_image_*`, `settings/carousel_bg_*`) and
  logo uploads are pushed to a separate GitHub repo via `server.ts`
  `/api/upload-github`. Both are wrong homes for blobs: dataURLs bloat documents
  (~33% overhead), are billed as document reads/writes, and slow every snapshot.
  R2 has no egress fees and serves images cached at the edge. Migrate these to
  `POST /media` and store only the returned URL in Firestore.
- **KV (`agora-identity`)** — the server device-token records and (future)
  short-lived cross-browser handoff claim codes.
- **D1 (optional, at scale)** — if visit/behavioural telemetry volume grows,
  append-only events are far cheaper in D1 than as Firestore documents. Keep
  aggregates in Firestore for the dashboard.

## Client wiring for media (DONE — activate with an env var)

`src/utils/media.ts` exposes `uploadMedia(file)`. It posts to
`import.meta.env.VITE_MEDIA_UPLOAD_URL` (e.g. `https://agora.theproject.world/media`)
when set, else returns `null` so callers keep their current path.

`LogoSettings`, `StoryTemplateConfig` and `CarouselTemplateConfig` already call
`uploadMedia` first and only fall back to the old path (GitHub upload for logos,
Firestore dataURL for template/carousel images) when it returns `null`. So:

1. Deploy the Worker (above).
2. Set `VITE_MEDIA_UPLOAD_URL=https://agora.theproject.world/media` at build time.

From then on all new images go to R2 and only their URL is stored in Firestore.
Existing dataURLs keep working (they are still valid `<img src>` values), so no
data migration is required — old assets can be re-uploaded lazily if desired.
