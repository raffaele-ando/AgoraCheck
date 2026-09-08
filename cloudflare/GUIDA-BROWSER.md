# Cloudflare dal browser (senza terminale)

Tutto quello che serve si fa dalla dashboard di Cloudflare. Non serve `wrangler`,
non serve installare niente.

> **Cosa cambia rispetto a prima**: `agora.theproject.world` smette di essere
> servito da una sua origine e comincia a servire **questo sito** (AgoraCheck,
> pubblicato su GitHub Pages). Il Worker non sta più davanti a tutto il
> dominio: resta solo sui quattro indirizzi che un sito statico non può
> servire da sé — identità del dispositivo e upload immagini. Tutto il resto
> del dominio (le pagine vere e proprie) arriva direttamente da GitHub Pages,
> senza passare dal Worker.
>
> Se salti questi passaggi il dominio non mostra ancora il nuovo sito — resta
> quello di prima, o smette di rispondere, a seconda di cosa c'era.

---

## Cosa è già pronto

Nel repository, senza bisogno di fare nulla:
- il file `public/CNAME` (contiene `agora.theproject.world`) dice a GitHub
  Pages di rispondere anche su quel dominio, non solo su
  `raffaele-ando.github.io/AgoraCheck`;
- la build usa già `VITE_MEDIA_UPLOAD_URL=https://agora.theproject.world/media`,
  quindi appena il Worker (sotto) è attivo i nuovi upload ci vanno da soli.

Nel tuo account Cloudflare, già pronti:

| Cosa | Nome | ID |
|---|---|---|
| Bucket R2 | `agora-media` | — |
| KV namespace | `agora-identity` | `14176b51077746ffb3e9ddc8bcf58e84` |
| Worker | `agora-edge` | (già creato, codice non ancora aggiornato) |

---

## Passo 1 — Aggiornare il codice del Worker

1. Vai su **dash.cloudflare.com** → **Workers & Pages** → apri **`agora-edge`**.
2. Premi **Edit code** (in alto a destra).
3. **Cancella tutto** il codice che vedi e **incolla** il contenuto di
   `cloudflare/worker.ts` di questo repository (apri il file su GitHub, premi
   **Copy raw file**).
4. Premi **Deploy** in alto a destra.

Se bucket, KV e segreto erano già collegati da prima, restano collegati:
questo passo sostituisce solo il codice, non tocca i binding.

## Passo 2 — Puntare il dominio a GitHub Pages (DNS)

Nel pannello della zona **`theproject.world`** → **DNS** → **Records**:

1. Trova il record per **`agora`** (probabilmente un CNAME).
2. Modificalo così:
   - **Tipo**: CNAME
   - **Nome**: `agora`
   - **Destinazione**: `raffaele-ando.github.io`
   - **Proxy**: **attivo** (nuvoletta **arancione**) — obbligatorio, altrimenti
     il Worker del Passo 3 non entra mai in gioco.
3. Salva.

Poi, sempre nella stessa zona, vai su **SSL/TLS → Overview** e imposta la
modalità su **Full** o **Full (strict)**. GitHub Pages serve HTTPS con un
certificato valido, quindi entrambe vanno bene; la modalità **Flexible**
invece va evitata — darebbe un ciclo di redirect, perché GitHub forza sempre
HTTPS.

## Passo 3 — Restringere la Route del Worker a quattro percorsi

Nel Worker `agora-edge` → **Settings** → **Domains & Routes**:

- Se c'è già una Route con pattern `agora.theproject.world/*`, **eliminala**:
  con quella lì, ogni pagina del sito passerebbe dal Worker invece che da
  GitHub Pages.
- Aggiungi queste **quattro** Route (una alla volta, stesso bottone **Add** →
  **Route**, zona sempre `theproject.world`):

  | Route |
  |---|
  | `agora.theproject.world/id` |
  | `agora.theproject.world/px.gif` |
  | `agora.theproject.world/media` |
  | `agora.theproject.world/media/*` |

Da questo momento: quei quattro indirizzi rispondono dal Worker; **ogni altro
indirizzo** (la home, `/milano/spotted`, `/orbite/`, tutto) arriva
**direttamente da GitHub Pages**, senza mai toccare il Worker.

## Passo 4 — Verificare che bucket, KV e segreto siano ancora collegati

Sempre in **Settings** del Worker `agora-edge`:

**a) Variabile segreta** — sezione **Variables and Secrets**: deve esserci
`ID_SECRET` (tipo **Secret**). Se manca: **Add** → Name `ID_SECRET` → Value
una stringa lunga a caso (40 caratteri, quel che vuoi, basta non cambiarla
più) → **Deploy**.

**b) Bucket R2** — sezione **Bindings**: deve esserci `MEDIA` → bucket
`agora-media`. Se manca: **Add binding** → Variable name `MEDIA` → R2 bucket
`agora-media` → **Save**.

**c) KV** — sezione **Bindings**: deve esserci `IDENTITY` → namespace
`agora-identity`. Se manca: **Add binding** → **KV namespace** → Variable
name `IDENTITY` → namespace `agora-identity` → **Save and Deploy**.

## Passo 5 — Verificare che il sito sia raggiungibile

Il DNS può metterci da qualche minuto a un'ora a propagarsi. Passato quel
tempo:

- `https://agora.theproject.world/` → deve mostrare AgoraCheck (la bacheca),
  non il vecchio sito.
- `https://agora.theproject.world/id` → deve rispondere qualcosa tipo:
  ```json
  {"token":"a1b2c3d4-....xxxxx"}
  ```
- `https://agora.theproject.world/orbite/` → deve mostrare Agorà Orbite.

Se vedi tutti e tre, è fatto. ✅

## (Facoltativo) Certificato HTTPS lato GitHub

Nel repository → **Settings → Pages**, GitHub in genere rileva da solo il
dominio dal file `CNAME` pubblicato e mostra `agora.theproject.world` come
**Custom domain**, con la casella **Enforce HTTPS** che si abilita da sola
dopo la verifica (può volerci qualche minuto). Se dopo un po' non compare,
riscrivi lo stesso indirizzo in quel campo e premi **Save**: forza GitHub a
riverificarlo.

---

## Se qualcosa va storto

- **Il dominio mostra ancora il sito vecchio, o non risponde** → il DNS del
  Passo 2 non è ancora propagato, o il record non è proxato (nuvoletta grigia
  invece che arancione).
- **`/id` dà 404** → le Route del Passo 3 non sono attive, o il pattern è
  scritto in modo diverso da come è qui sopra.
- **`/id` dà errore 500** → manca un binding (Passo 4).
- **Ciclo di redirect / "troppi redirect"** → la modalità SSL/TLS del Passo 2
  è su Flexible invece che Full: cambiala.
- **Vuoi tornare indietro** → togli le quattro Route del Passo 3: il sito
  resta comunque servito da GitHub Pages via DNS, semplicemente `/id`,
  `/px.gif` e `/media` smettono di rispondere (il resto del sito non è
  toccato). Per tornare del tutto al sito precedente, riporta anche il record
  DNS del Passo 2 alla destinazione di prima.
