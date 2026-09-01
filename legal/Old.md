# Agorà — Documentazione legale (bozze) e analisi di conformità

> **⚠️ BOZZA — NON REVISIONATA LEGALMENTE / DRAFT — NOT LEGALLY REVIEWED**
>
> Questa cartella contiene **bozze di lavoro** predisposte a fini di preparazione interna. Non costituiscono consulenza legale e devono essere sottoposte a revisione da parte di un professionista abilitato prima di qualsiasi pubblicazione o utilizzo. Il servizio Agorà **non è ancora aperto al pubblico**.

## Contenuto della cartella

| File | Descrizione |
|------|-------------|
| `privacy-policy.md` | Informativa sulla Privacy ex artt. 13-14 GDPR — bozza completa |
| `terms-and-conditions.md` | Termini e Condizioni d'uso — bozza completa |
| `README.md` | Questo documento: sintesi della ricerca, citazioni e checklist di conformità |

Tutti i documenti riportano placeholder `[DA COMPILARE]` per: denominazione/titolare, indirizzo, e-mail, P.IVA/CF, contatto DPO.

---

## 1. Quadro normativo di riferimento (2024-2026)

### 1.1 GDPR — Regolamento (UE) 2016/679
- **Art. 6** — Basi giuridiche (per Agorà: 6(1)(b) contratto, 6(1)(c) obbligo legale, 6(1)(f) legittimo interesse, **6(1)(a) consenso** per tracciamento/profilazione).
- **Art. 7** — Condizioni per il consenso: libero, specifico, informato, inequivocabile; **revocabile con la stessa facilità** con cui è prestato; onere della prova a carico del titolare.
- **Art. 8** — Condizioni per il consenso dei minori nei servizi della società dell'informazione.
- **Art. 9** — Categorie particolari di dati (possibile emersione nei contenuti "spotted").
- **Artt. 12-14** — Trasparenza e informativa.
- **Artt. 15-22** — Diritti dell'interessato (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, decisioni automatizzate).
- **Art. 22** — Profilazione e decisioni automatizzate (rilevante per anti-abuso automatico e blocchi).
- **Art. 26** — Contitolarità (se più soggetti gestiscono il servizio).
- **Art. 28** — Responsabili del trattamento (DPA con Google/Cloudflare).
- **Art. 30** — Registro delle attività di trattamento.
- **Art. 32** — Sicurezza del trattamento.
- **Artt. 33-34** — Notifica e comunicazione dei data breach (72 ore).
- **Art. 35 (e 36)** — DPIA (Valutazione d'impatto) e consultazione preventiva.
- **Art. 37** — Nomina del DPO (obbligatoria in caso di monitoraggio sistematico su larga scala).
- **Artt. 44-49** — Trasferimenti internazionali di dati.
- **Art. 77** — Reclamo all'Autorità di controllo (Garante).

### 1.2 Normativa italiana
- **D.lgs. 30 giugno 2003, n. 196 (Codice Privacy)**, come modificato dal **D.lgs. 10 agosto 2018, n. 101**:
  - **Art. 2-quinquies** — età del consenso digitale del minore fissata in Italia a **14 anni** (deroga in ribasso rispetto ai 16 dell'art. 8 GDPR).
  - **Art. 122** — archiviazione di informazioni / accesso a informazioni già archiviate nel terminale dell'utente: **consenso preventivo**, salvo stretta necessità tecnica (recepimento dell'art. 5(3) ePrivacy).
- **Garante per la protezione dei dati personali** — autorità di controllo competente (reclami ex art. 77 GDPR; provvedimenti e linee guida).

### 1.3 ePrivacy e regole "cookie/tracciamento"
- **Direttiva 2002/58/CE (ePrivacy)**, **art. 5(3)**: consenso preventivo per storing/access di informazioni nel terminale, salvo stretta necessità.
- **Garante — "Linee guida cookie e altri strumenti di tracciamento", 10 giugno 2021** (doc. web **n. 9677876**; pubblicate in **G.U. n. 163 del 9 luglio 2021**):
  - Il **fingerprinting** è espressamente qualificato come strumento di tracciamento soggetto alla stessa disciplina dei cookie → **consenso** salvo stretta necessità.
  - Requisiti del banner: **consenso preventivo e granulare**; **niente caselle pre-selezionate**; lo **scroll non è consenso**; **"Accetta tutto" e "Rifiuta tutto" con pari evidenza/agevolezza**; pulsante **"X"** per chiudere senza consenso; **divieto di "cookie wall"** generalizzato; **revoca facile**; **ripresentazione** del banner di norma non prima di 6 mesi.
- **EDPB — Guidelines 2/2023** sull'ambito tecnico dell'art. 5(3) ePrivacy (adottate nel 2023; versione finale ottobre 2024): confermano che rientrano nell'ambito di applicazione **fingerprinting, tracking pixel/link, determinate forme di IP tracking**, e l'uso di **localStorage/IndexedDB/cache-ETag** quando servono a identificare o tracciare.

### 1.4 Trasferimenti internazionali (Firebase/Google, Cloudflare = USA)
- **EU-U.S. Data Privacy Framework (DPF)** — decisione di adeguatezza della Commissione europea del **10 luglio 2023**. **Google LLC** e **Cloudflare, Inc.** risultano tra i soggetti **certificati** (verificare sempre l'attualità su https://www.dataprivacyframework.gov).
- **Clausole Contrattuali Tipo (SCC)** — Decisione di esecuzione (UE) **2021/914**, con eventuali **misure supplementari** (post-Schrems II).
- Riferimenti fornitori: Firebase https://firebase.google.com/support/privacy ; Cloudflare DPA https://www.cloudflare.com/cloudflare-customer-dpa/ .

### 1.5 Altre normative potenzialmente rilevanti
- **Regolamento (UE) 2022/2065 (Digital Services Act)** — obblighi per servizi di intermediazione/hosting (segnalazioni, moderazione, trasparenza), ove applicabile per soglia/tipologia.
- **D.lgs. 206/2005 (Codice del Consumo)** — foro del consumatore (art. 66-bis), clausole vessatorie, ADR/ODR.
- **Codice civile artt. 1341-1342** — clausole vessatorie nelle condizioni generali di contratto.

---

## 2. Analisi del gap di conformità (specifico per Agorà)

Le pratiche di raccolta dati descritte per Agorà toccano **proprio** le aree di massima attenzione del Garante e dell'EDPB. Punti critici:

1. **Fingerprinting esteso** (canvas, WebGL, audio, font, hardware) → tracciamento ex art. 5(3) ePrivacy / art. 122 Codice Privacy → **richiede consenso preventivo**, non basta il legittimo interesse.
2. **Identificativi persistenti "supercookie" fino a ~400 giorni** (cookie + localStorage + IndexedDB + ETag), progettati per resistere alla cancellazione → alto impatto; consenso + trasparenza sulla durata + rispetto della revoca.
3. **Handoff cross-browser via URL** (passaggio di identificativi dall'in-app browser di Instagram a Safari/Chrome) → tecnica di riconciliazione dell'identità particolarmente invasiva → **consenso** e valutazione DPIA.
4. **Telemetria comportamentale** (typing cadence, mouse/touch, scroll, sensori di movimento/orientamento) → profilazione → **consenso**; i sensori di movimento richiedono anche autorizzazione a livello di browser.
5. **Collegamento handle Instagram al profilo del dispositivo** → arricchimento del profilo con identità social → **consenso specifico e separato**.
6. **Monitoraggio sistematico su larga scala + profilazione + possibili minori** → **DPIA molto probabilmente obbligatoria (art. 35)** e **DPO probabilmente obbligatorio (art. 37)**.
7. **Trasferimenti USA** via Firebase/Cloudflare → base di trasferimento (DPF/SCC) da documentare e mantenere aggiornata; valutare **residenza dati UE**.
8. **Rischio "cookie wall"**: il servizio deve restare fruibile senza acconsentire alle tecniche non necessarie.

> **Messaggio chiave per il legale:** la combinazione fingerprinting + identificativi a lunga durata + handoff cross-browser è esattamente ciò che il Garante scrutina; queste finalità **devono** essere subordinate al consenso e disattivate in sua assenza.

---

## 3. Checklist di conformità prioritizzata (pre-lancio)

### Priorità ALTA (bloccanti per il lancio)
- [ ] **Compilare tutti i placeholder** `[DA COMPILARE]` (titolare, sede, P.IVA/CF, e-mail, PEC, DPO).
- [ ] **Revisione legale** delle due bozze da parte di un professionista abilitato.
- [ ] **Implementare un banner/CMP conforme** al Garante: consenso preventivo, granulare, "Accetta tutto"/"Rifiuta tutto" a pari agevolezza, nessuna casella pre-spuntata, "X" per chiudere, nessun cookie wall, revoca facile ("Preferenze privacy" persistente).
- [ ] **Gating tecnico del tracciamento**: fingerprinting, telemetria, identificativi persistenti non tecnici, handoff cross-browser e collegamento Instagram **NON devono attivarsi senza consenso**. Il servizio deve funzionare con i soli strumenti strettamente necessari.
- [ ] **Redigere la DPIA (art. 35)** prima dell'apertura al pubblico; valutare consultazione preventiva del Garante (art. 36) se residua rischio elevato.
- [ ] **Verificare/nominare il DPO (art. 37)** e pubblicarne i contatti.
- [ ] **Stipulare/verificare i DPA (art. 28)** con Google (Firebase) e Cloudflare; archiviare le SCC e la certificazione DPF; verificarne l'attualità.

### Priorità MEDIA
- [ ] **Definire i periodi di conservazione** effettivi per ciascuna categoria e formalizzarli nel **Registro dei trattamenti (art. 30)**.
- [ ] **Mappare i flussi transfrontalieri** e configurare, ove possibile, la **residenza dei dati nell'UE** per Firebase/Cloudflare.
- [ ] **Meccanismo di verifica dell'età** (14 anni) e gestione del consenso per i minori di 14 anni.
- [ ] **Procedura di esercizio dei diritti** (artt. 15-22), incl. gestione delle richieste per utenti **anonimi** (art. 11/12).
- [ ] **Procedura data breach** (artt. 33-34) con soglia 72 ore.
- [ ] **Flussi di moderazione e segnalazione** dei contenuti; valutare applicabilità del **DSA**.
- [ ] Valutare la **specifica approvazione ex artt. 1341-1342 c.c.** per le clausole potenzialmente vessatorie dei Termini.

### Priorità BASSA / continuativa
- [ ] Documentare i **bilanciamenti di legittimo interesse (LIA)** per i trattamenti basati sull'art. 6(1)(f).
- [ ] Pagina **"Preferenze privacy"** sempre accessibile per rivedere/revocare i consensi.
- [ ] **Registri dei consensi** (prova del consenso ex art. 7(1)).
- [ ] Revisione periodica di informativa, Termini, elenco responsabili e stato certificazioni DPF.
- [ ] Formazione del personale/moderatori.

---

## 4. Fonti consultate
- Garante — Linee guida cookie 10 giugno 2021 (doc. web 9677876): https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876
- Garante — comunicato linee guida cookie: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9679893
- Garante — sezione Minori: https://www.garanteprivacy.it/temi/minori
- EDPB — Guidelines 2/2023 (art. 5(3) ePrivacy): https://www.edpb.europa.eu/system/files/2023-11/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_en.pdf
- EU-U.S. Data Privacy Framework list: https://www.dataprivacyframework.gov
- Firebase — Privacy and Security: https://firebase.google.com/support/privacy
- Cloudflare — Data Processing Addendum: https://www.cloudflare.com/cloudflare-customer-dpa/
- Cloudflare — GDPR FAQ: https://www.cloudflare.com/trust-hub/gdpr/

*Struttura e tono delle informative sono stati ispirati, come riferimento strutturale (senza copia di testo), alle policy in lingua italiana di grandi piattaforme (Meta/Instagram, TikTok, Google, Vinted, Subito.it).*
