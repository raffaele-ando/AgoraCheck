# Cloudflare dal browser (senza terminale)

Tutto quello che serve si fa dalla dashboard di Cloudflare. Non serve `wrangler`,
non serve installare niente.

> Nota: il sito **funziona anche senza fare questo**. Questi passaggi servono solo
> ad attivare il cookie durevole a ~400 giorni su iOS e lo storage immagini su R2.
> Finché non li fai, l'app usa i backend del browser (7 giorni su iOS).

---

## Cosa è già pronto sul tuo account

Li ho già creati io:

| Cosa | Nome | ID |
|---|---|---|
| Bucket R2 | `agora-media` | — |
| KV namespace | `agora-identity` | `14176b51077746ffb3e9ddc8bcf58e84` |

---

## Passo 1 — Creare il Worker

1. Vai su **dash.cloudflare.com** → menu a sinistra **Workers & Pages**.
2. Bottone **Create** → scheda **Workers** → **Start with Hello World!** → **Deploy**.
3. Dai il nome **`agora-edge`**.
4. Ora premi **Edit code** (in alto a destra).
5. **Cancella tutto** il codice che vedi e **incolla** il contenuto del file
   `cloudflare/worker.js` di questo repository
   (lo trovi su GitHub: apri il file, premi il tasto **Copy raw file**).
6. Premi **Deploy** in alto a destra.

## Passo 2 — Collegare bucket, KV e il segreto

Sempre nella pagina del Worker `agora-edge` → scheda **Settings**:

**a) Variabile segreta**
- Sezione **Variables and Secrets** → **Add** →
  - Type: **Secret**
  - Name: `ID_SECRET`
  - Value: una stringa lunga a caso (es. 40 caratteri casuali — scrivi quello che
    vuoi, basta che sia lunga e non la cambi più)
- **Deploy** / Save.

**b) Bucket R2**
- Sezione **Bindings** (o **R2 Bucket Bindings**) → **Add binding** →
  - Variable name: `MEDIA`
  - R2 bucket: **agora-media**
- Save.

**c) KV**
- Sezione **Bindings** → **Add binding** → **KV namespace** →
  - Variable name: `IDENTITY`
  - KV namespace: **agora-identity**
- Save and Deploy.

## Passo 3 — Metterlo davanti al sito

Sempre in **Settings** del Worker → sezione **Domains & Routes** → **Add** → **Route**:

- Route: `agora.theproject.world/*`
- Zone: `theproject.world`

Salva. Da questo momento il Worker riceve le richieste del sito: risponde lui a
`/id`, `/px.gif` e `/media/*`, e **tutto il resto passa invariato** al sito
attuale (non cambia nulla di visibile).

## Passo 4 — Verificare che funzioni

Apri nel browser: `https://agora.theproject.world/id`

Devi vedere una risposta tipo:

```json
{"token":"a1b2c3d4-....xxxxx"}
```

Se la vedi, è fatto. ✅

## Passo 5 (facoltativo) — Immagini su R2

Serve solo se vuoi che loghi e sfondi vadano su R2 invece che dentro Firestore.
Nel repository, la variabile d'ambiente di build:

```
VITE_MEDIA_UPLOAD_URL=https://agora.theproject.world/media
```

Il codice è già pronto: se la variabile non c'è, continua a usare il metodo
vecchio; se c'è, carica su R2 e salva solo l'URL. Le immagini già esistenti
continuano a funzionare, non serve migrare niente.

---

## Se qualcosa va storto

- **`/id` dà 404** → la Route del Passo 3 non è attiva o è scritta male.
- **`/id` dà errore 500** → manca un binding (Passo 2).
- **Il sito smette di funzionare** → togli la Route (Passo 3) e torna tutto come
  prima: il Worker non è indispensabile.
