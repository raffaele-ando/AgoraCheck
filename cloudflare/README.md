# Agorà — Cloudflare edge

Provisioned in your account (ready to use):

| Resource | Name | ID |
|---|---|---|
| R2 bucket | `agora-media` | — |
| KV namespace | `agora-identity` | `14176b51077746ffb3e9ddc8bcf58e84` |

## What the Worker adds

`agora.theproject.world` ora punta, via DNS, direttamente ad AgoraCheck su
GitHub Pages: quello serve tutte le pagine del sito. `worker.ts` **non** sta
più davanti all'intero dominio — è instradato solo su questi quattro
percorsi, che un sito statico non può servire da sé:

- **`GET /id`** — issues an `HttpOnly; Secure; SameSite=Lax` session token valid for rate-limiting and anti-abuse protection.
  and returns a signed token. This is the **iOS durability fix**: Safari/
  WKWebView ITP caps `document.cookie` at 7 days, but a server `Set-Cookie` is
  not capped. The client (`src/utils/identity.ts`) already calls `/id` and
  folds the token into the device identity — it silently no-ops until the Worker
  is deployed, so nothing breaks in the meantime.
- **`GET /px.gif`** — a 1×1 gif whose `ETag` is the device token, so identity
  survives a localStorage/IndexedDB clear (lives in the HTTP cache instead). Technical heartbeat endpoint for session continuity.
- **`POST /media`** + **`GET /media/<key>`** — store/serve binary assets in R2.

## Deploy

Le quattro Route (`/id`, `/px.gif`, `/media`, `/media/*`) sono già scritte in
`wrangler.toml`, attive (non più commentate). Restano da fare, nell'ordine:

```bash
cd cloudflare
npx wrangler secret put ID_SECRET     # paste any long random string
npx wrangler deploy
```

**Prima del deploy**, nel pannello Cloudflare della zona `theproject.world`:

1. **DNS** — il record per `agora` deve puntare a `raffaele-ando.github.io`
   (tipo CNAME), **proxato** (nuvoletta arancione): senza il proxy le Route
   del Worker non si attivano mai.
2. **SSL/TLS → Overview** — modalità **Full** o **Full (strict)**: GitHub
   Pages serve HTTPS con un certificato valido, e la modalità "Flexible"
   darebbe un ciclo di redirect (GitHub forza sempre HTTPS).

Dopo il deploy, verifica in **Workers & Pages → agora-edge → Triggers** che le
quattro Route compaiano attive sulla zona giusta.

Hai già un Worker `polimiagora` sull'account; questo (`agora-edge`) resta un
Worker separato, scelta più semplice da tracciare che incollare questi
handler dentro un altro progetto.

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

## Client wiring for media (DONE — attivo automaticamente in compilazione)

`src/utils/media.ts` espone `uploadMedia(file)`. Chiama
`import.meta.env.VITE_MEDIA_UPLOAD_URL` quando è impostata, altrimenti
restituisce `null` e chi chiama resta sulla via precedente.

`.github/workflows/deploy-pages.yml` la imposta già a
`https://agora.theproject.world/media` a ogni compilazione: non c'è nessun
passo manuale da fare qui, **a patto che il Worker sia stato distribuito**
(sezione "Deploy" sopra) — finché non lo è, quell'indirizzo risponde 522/523
e `uploadMedia` fallisce silenziosamente, ricadendo sulla via precedente
(niente si rompe, semplicemente i nuovi media non passano ancora da R2).

`LogoSettings`, `StoryTemplateConfig` e `CarouselTemplateConfig` chiamano già
`uploadMedia` per primo e ricadono sulla via vecchia (upload su GitHub per i
loghi, dataURL in Firestore per template/carosello) solo quando restituisce
`null`. Da quando il Worker è attivo, tutte le nuove immagini vanno su R2 e in
Firestore resta solo l'indirizzo. I dataURL esistenti continuano a funzionare
(sono comunque `<img src>` validi): nessuna migrazione dei dati necessaria.
