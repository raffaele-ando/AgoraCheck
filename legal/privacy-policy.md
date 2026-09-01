> **⚠️ BOZZA — NON REVISIONATA LEGALMENTE / DRAFT — NOT LEGALLY REVIEWED**
>
> Questo documento è una **bozza di lavoro** predisposta a fini di preparazione interna. **NON** costituisce consulenza legale, **non** è stato validato da un professionista abilitato e **non** deve essere pubblicato né considerato vincolante prima di una revisione legale completa. Tutti i campi contrassegnati con `[DA COMPILARE]` devono essere completati prima di qualsiasi utilizzo.

---

# Informativa sulla Privacy — Agorà

**Informativa sul trattamento dei dati personali ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR)**

- **Servizio:** Agorà — bacheca sociale ("", sondaggi e messaggi)
- **Sito / applicazione:** https://agora.theproject.world
- **Versione bozza:** 0.1
- **Data ultimo aggiornamento:** [DA COMPILARE]
- **Stato del servizio:** non ancora aperto al pubblico (fase di preparazione)

---

## 1. Titolare del trattamento

Il Titolare del trattamento dei dati personali è:

- **Denominazione / Ragione sociale:** [DA COMPILARE]
- **Forma giuridica:** [DA COMPILARE]
- **Sede legale:** [DA COMPILARE — indirizzo completo]
- **Partita IVA / Codice Fiscale:** [DA COMPILARE]
- **Indirizzo e-mail:** [DA COMPILARE]
- **PEC:** [DA COMPILARE]
- **Telefono:** [DA COMPILARE]

Qualora il servizio sia gestito, in tutto o in parte, da un soggetto diverso (es. associazione studentesca, persona fisica), i relativi dati identificativi dovranno essere indicati in questa sezione. Se sono presenti contitolari del trattamento ai sensi dell'art. 26 GDPR, dovrà essere indicato l'accordo di contitolarità e il punto di contatto.

### 1.1 Responsabile della protezione dei dati (DPO / RPD)

- **Nominato:** ☐ Sì  ☐ No — [DA COMPILARE / VALUTARE]
- **Contatto DPO:** [DA COMPILARE — e-mail dedicata]

> **Nota di compliance.** La nomina del DPO è obbligatoria nei casi previsti dall'art. 37 GDPR, in particolare quando l'attività principale del titolare consiste in trattamenti che richiedono il **monitoraggio regolare e sistematico degli interessati su larga scala**. Considerata l'intensità del tracciamento comportamentale e del fingerprinting descritti nella presente informativa, la nomina di un DPO è **fortemente raccomandata** e va valutata prima dell'apertura al pubblico. È inoltre necessario valutare la **Valutazione d'impatto sulla protezione dei dati (DPIA)** ai sensi dell'art. 35 GDPR (v. sezione 14).

---

## 2. Sintesi in linguaggio semplice (informativa "a strati")

Per rispettare il principio di trasparenza (artt. 12-14 GDPR), forniamo una sintesi. **Ti invitiamo comunque a leggere l'intera informativa.**

- Agorà è una bacheca per utenti dove puoi pubblicare messaggi ("") e partecipare a sondaggi, in futuro, con un account.
- Anche senza registrarti, l'applicazione **raccoglie numerose informazioni tecniche sul tuo dispositivo e sul tuo comportamento** allo scopo di creare un identificativo stabile del dispositivo (tecniche di *fingerprinting*), prevenire abusi e far funzionare il servizio.
- Alcune di queste tecniche (fingerprinting, identificativi persistenti, memorizzazione di dati sul tuo dispositivo per finalità non strettamente tecniche) **richiedono il tuo consenso preventivo**, che ti chiederemo tramite un banner/schermata dedicata.
- Puoi collegare, in via facoltativa, il tuo **handle Instagram** al profilo del tuo dispositivo.
- I dati sono conservati su **Google Firebase (Firestore)** e su **Cloudflare (R2/D1/KV)**, con possibile trasferimento verso gli Stati Uniti (v. sezione 10).
- Hai diritto di accedere, rettificare, cancellare e limitare i tuoi dati, di opporti al trattamento, alla portabilità e di **revocare il consenso** in qualsiasi momento (v. sezione 11).

---

## 3. Categorie di dati personali trattati

Agorà tratta un insieme ampio di dati. Di seguito l'elenco **completo e trasparente** delle categorie raccolte, anche quando l'utente non è registrato.

### 3.1 Dati di identificazione del dispositivo e del browser (fingerprinting)
- **Canvas fingerprint** (rendering grafico via HTML Canvas)
- **WebGL fingerprint** (informazioni su GPU/renderer e rendering 3D)
- **Audio fingerprint** (caratteristiche dell'AudioContext)
- **Elenco e metriche dei font** installati/renderizzati
- **Caratteristiche dello schermo** (risoluzione, profondità colore, densità di pixel, dimensione della finestra)
- **Caratteristiche hardware** (numero di core della CPU, memoria disponibile, tipo di dispositivo, capacità del touch)
- **Impostazioni del browser** (lingua/locale, fuso orario, plugin, preferenze)

Combinati, questi elementi costituiscono un **identificativo pseudonimo del dispositivo** (device fingerprint).

### 3.2 Indirizzi di rete
- **Indirizzo IP pubblico**
- **Indirizzi IP locali/privati** rilevati tramite **WebRTC**
- **Inferenza della posizione geografica** approssimativa a partire dall'indirizzo IP (geolocalizzazione a livello di città/regione)

### 3.3 Dati derivati dallo User-Agent e dal browser in-app
- Parsing dello **User-Agent** (browser, motore, sistema operativo, versione)
- **Dati particolarmente ricchi rilevabili dal browser interno di Instagram (Instagram in-app browser)**, tra cui: modello del dispositivo, versione del sistema operativo, risoluzione dello schermo, locale/lingua

### 3.4 Identificativi persistenti (persistenza "supercookie")
Identificativi memorizzati e ricostruiti sul dispositivo dell'utente tramite molteplici meccanismi, tra cui:
- **Cookie**
- **localStorage** e **sessionStorage**
- **IndexedDB**
- **Cache / ETag** (persistenza tramite header di validazione HTTP)

Tali identificativi possono avere una durata prolungata, **fino a circa 400 giorni**, e sono progettati per **sopravvivere alla cancellazione parziale** dei dati del browser ("supercookie"). *Questa è una pratica ad alto impatto sulla riservatezza: v. sezioni 5, 6 e 14.*

### 3.5 Dati comportamentali / telemetria
- **Cadenza di digitazione** (typing cadence, ritmi di battitura)
- **Movimenti del mouse / del tocco (touch)**, clic, pressioni
- **Profondità e comportamento di scorrimento** (scroll depth)
- **Tempo trascorso per campo** e tempo di permanenza sulle schermate
- **Dati dei sensori di movimento e orientamento del dispositivo** (device motion / device orientation), ove disponibili e autorizzati

### 3.6 Passaggio di identità cross-browser
- Trasferimento degli identificativi raccolti tramite **parametri nell'URL** quando l'utente passa dal browser interno di Instagram a un browser esterno (es. Safari/Chrome), al fine di **riconciliare l'identità del dispositivo tra i due browser** (cross-browser identity handoff).

### 3.7 Dati di account e profilo (facoltativi)
- **Handle / nome utente Instagram** fornito facoltativamente dall'utente e collegato al profilo del dispositivo
- Dati dell'**account di accesso** (funzionalità pianificata): credenziali, identificativo utente ed eventuali dati di profilo forniti in fase di registrazione

### 3.8 Contenuti generati dagli utenti (UGC)
- Testi dei messaggi "", voti e risposte ai sondaggi, e ogni altro contenuto pubblicato dall'utente. **Ricorda che potresti inserire, di tua iniziativa, dati personali (tuoi o di terzi) all'interno dei contenuti**: v. sezione 13.

### 3.9 Log tecnici e dati di sicurezza
- Log di sistema, timestamp, richieste effettuate, esiti di operazioni, dati necessari a prevenire frodi, spam e abusi.

> **Categorie particolari di dati (art. 9 GDPR).** Agorà **non richiede** intenzionalmente dati appartenenti a categorie particolari (origine etnica, opinioni politiche, convinzioni religiose, dati sulla salute, vita/orientamento sessuale, dati biometrici a fini identificativi, ecc.). Tuttavia, per la natura della bacheca (""), tali dati potrebbero **emergere dai contenuti liberamente pubblicati** dagli utenti. Non è consentito pubblicare dati particolari di terzi senza base giuridica idonea (v. Termini e Condizioni). Il Titolare adotta misure di moderazione per limitare tali contenuti (v. sezione 7).

---

## 4. Fonti dei dati

- **Direttamente dall'interessato:** contenuti pubblicati, handle Instagram, dati di registrazione.
- **Automaticamente dal dispositivo/browser:** tutti i dati tecnici, di fingerprinting, di rete, comportamentali e i sensori descritti nella sezione 3, raccolti tramite script eseguiti nel browser dell'utente.
- **Da terzi:** dati tecnici veicolati dal contesto di navigazione (es. informazioni esposte dal browser interno di Instagram). Agorà non acquista elenchi di dati da data broker.

---

## 5. Finalità del trattamento

I dati sono trattati per le seguenti finalità:

| # | Finalità | Esempi di dati |
|---|----------|----------------|
| A | **Erogazione del servizio** (pubblicazione , sondaggi, autenticazione  e, in futuro, tramite account) | Contenuti UGC, identificativi tecnici minimi, dati di account |
| B | **Sicurezza, prevenzione di abusi, spam, frodi e voti multipli/duplicati** | Fingerprint del dispositivo, IP, identificativi persistenti, log |
| C | **Identificazione e riconoscimento stabile del dispositivo** (anche tra browser diversi) | Fingerprinting, identificativi persistenti, handoff cross-browser |
| D | **Analisi comportamentale e telemetria** (comprensione dell'uso, rilevamento di comportamenti anomali/bot, miglioramento del servizio) | Telemetria di digitazione, mouse/touch, scroll, sensori |
| E | **Collegamento facoltativo dell'handle Instagram al profilo del dispositivo** | Handle Instagram, fingerprint |
| F | **Adempimento di obblighi di legge** e gestione di richieste dell'Autorità/di richieste degli interessati | Log, dati di contatto |
| G | **Difesa in giudizio** e accertamento/esercizio di diritti | Log, contenuti, identificativi |

> **Importante.** Le finalità **C, D ed E** — fingerprinting, identificativi persistenti a lunga durata, telemetria comportamentale, handoff cross-browser e collegamento dell'handle Instagram — sono **finalità di tracciamento e/o profilazione** che, come chiarito dalla sezione 6, **richiedono il consenso preventivo** dell'utente e **non possono fondarsi sul solo legittimo interesse**.

---

## 6. Basi giuridiche del trattamento (art. 6 GDPR) e regole "cookie/tracciamento"

Per ciascuna finalità individuiamo la base giuridica ai sensi dell'**art. 6 GDPR**, tenendo conto anche dell'**art. 122 del D.lgs. 196/2003 (Codice Privacy)**, dell'**art. 5(3) della Direttiva 2002/58/CE (ePrivacy)** e delle **Linee guida cookie e altri strumenti di tracciamento del Garante del 10 giugno 2021**.

| Finalità | Base giuridica | Note |
|----------|----------------|------|
| A — Erogazione del servizio | **Art. 6(1)(b)** — esecuzione del contratto/misure precontrattuali. Per gli strumenti tecnici strettamente necessari, si applica l'esenzione da consenso dell'art. 122 c.1 Codice Privacy | Include gli identificativi **strettamente necessari** a far funzionare il servizio (es. sessione  essenziale) |
| B — Sicurezza di base / anti-abuso essenziale | **Art. 6(1)(f)** — legittimo interesse; per gli strumenti che comportano archiviazione/accesso al terminale, solo se **strettamente necessari** all'erogazione del servizio richiesto | Va documentato un **bilanciamento (LIA)**. Le tecniche invasive eccedenti la stretta necessità richiedono consenso |
| C — Identificazione stabile del dispositivo (fingerprinting, identificativi persistenti, handoff cross-browser) | **Art. 6(1)(a)** — **consenso** dell'interessato | Il fingerprinting e gli identificativi non tecnici rientrano nell'art. 5(3) ePrivacy / art. 122 Codice Privacy e richiedono **consenso preventivo, libero, specifico, informato e inequivocabile** |
| D — Analisi comportamentale / telemetria / profilazione | **Art. 6(1)(a)** — **consenso** | Anche la profilazione a fini analitici non "solo tecnici" richiede consenso |
| E — Collegamento handle Instagram al dispositivo | **Art. 6(1)(a)** — **consenso** | Consenso specifico e separato |
| F — Obblighi di legge | **Art. 6(1)(c)** — obbligo legale | — |
| G — Difesa in giudizio | **Art. 6(1)(f)** — legittimo interesse | Accertamento/esercizio/difesa di un diritto |

### 6.1 Perché queste pratiche richiedono il consenso e non il solo legittimo interesse

Il **fingerprinting del dispositivo**, il **passaggio di identificativi tra browser diversi tramite URL** e gli **identificativi persistenti a lunga durata (fino a ~400 giorni)** sono esattamente le pratiche oggetto di particolare attenzione da parte del **Garante** e dell'**EDPB**:

- L'**art. 5(3) della Direttiva 2002/58/CE** (ePrivacy) e l'**art. 122 del Codice Privacy** subordinano al **consenso preventivo** ogni operazione di **archiviazione di informazioni, o accesso a informazioni già archiviate**, nel terminale dell'utente, salvo che sia **strettamente necessaria** a fornire il servizio esplicitamente richiesto.
- Le **Linee guida del Garante del 10 giugno 2021** (doc. web n. 9677876, pubblicate in G.U. n. 163 del 9 luglio 2021) qualificano espressamente il **fingerprinting** come strumento di tracciamento soggetto alla medesima disciplina dei cookie: richiede quindi **consenso**, salvo l'ipotesi di stretta necessità tecnica.
- Le **Linee guida EDPB 2/2023** sull'ambito tecnico dell'art. 5(3) ePrivacy (adottate nel 2023, versione finale ottobre 2024) confermano che rientrano nell'ambito di applicazione, tra l'altro: le **tecniche di fingerprinting**, il **tracciamento tramite pixel e link**, **determinate forme di tracciamento dell'indirizzo IP**, e la **memorizzazione/lettura di informazioni** nel terminale (localStorage, IndexedDB, cache/ETag inclusi quando usati per identificare).

**Conclusione di compliance:** per Agorà, le finalità C, D ed E **non possono legittimamente fondarsi sul legittimo interesse** e devono essere attivate **solo previo consenso** raccolto tramite un banner/schermata conforme (v. sezione 6.2). In assenza di consenso, tali tecniche non devono essere eseguite; il servizio deve restare fruibile con i soli strumenti strettamente necessari.

### 6.2 Requisiti del banner/della schermata di consenso

Coerentemente con le Linee guida del Garante, il meccanismo di raccolta del consenso deve:

- essere **preventivo**: nessun tracciamento non necessario prima del consenso;
- prevedere un **consenso granulare** per finalità distinte (sicurezza avanzata, fingerprinting, telemetria, collegamento Instagram), senza raggruppamenti forzati;
- **non utilizzare caselle pre-selezionate** o consensi impliciti (lo **scroll** della pagina **non** vale come consenso);
- offrire i pulsanti **"Accetta tutto"** e **"Rifiuta tutto"** con **pari evidenza, accessibilità e semplicità** (parità grafica e di percorso), oltre a un'opzione **"Personalizza"** e a una **"X"** per chiudere senza prestare il consenso;
- **non imporre un "cookie wall"**: l'accesso al servizio non può essere subordinato all'accettazione del tracciamento non necessario (salvo eventuali ipotesi eccezionali e in presenza di un'alternativa equivalente);
- consentire di **revocare il consenso** con la stessa facilità con cui è stato prestato e **ripresentare le scelte** (es. link permanente "Preferenze privacy");
- **ripresentare** la richiesta secondo i termini indicati dal Garante (di norma non prima di 6 mesi), salvo mutamenti delle condizioni del trattamento.

---

## 7. Modalità del trattamento, moderazione e decisioni automatizzate

### 7.1 Modalità
Il trattamento avviene con strumenti elettronici, adottando misure tecniche e organizzative adeguate (art. 32 GDPR) a garantire riservatezza, integrità e disponibilità dei dati. L'accesso ai dati è limitato al personale autorizzato e ai responsabili del trattamento (v. sezione 9).

### 7.2 Moderazione dei contenuti
I contenuti pubblicati possono essere sottoposti a **moderazione** (automatica e/o manuale) per rimuovere contenuti illeciti, offensivi, diffamatori, o che violino i Termini. La moderazione può comportare la rimozione di contenuti e la sospensione/blocco del dispositivo o dell'account.

### 7.3 Profilazione e decisioni automatizzate (art. 22 GDPR)
- Agorà effettua **profilazione** del dispositivo/utente per finalità di sicurezza anti-abuso e di analisi (finalità B, C, D).
- Possono essere adottate **misure automatizzate** (es. blocco di un dispositivo identificato come autore di spam/voti multipli, filtri anti-bot).
- Ove tali misure producano **effetti giuridici o incidano in modo analogo significativamente** sull'interessato ai sensi dell'**art. 22 GDPR**, l'interessato ha diritto di **ottenere l'intervento umano**, **esprimere la propria opinione** e **contestare la decisione** (contatti in sezione 11). Il Titolare valuta caso per caso l'applicabilità dell'art. 22 e le relative garanzie.

---

## 8. Periodi di conservazione (data retention)

I dati sono conservati per il tempo strettamente necessario alle finalità per cui sono raccolti e, comunque, secondo i seguenti criteri **indicativi** (da definire e formalizzare nel registro dei trattamenti prima del lancio — `[DA COMPILARE/VALIDARE]`):

| Categoria | Criterio / durata indicativa |
|-----------|------------------------------|
| Identificativi persistenti sul dispositivo (cookie/localStorage/IndexedDB/ETag) | Durata massima indicata al momento del consenso; **fino a ~400 giorni**, salvo revoca del consenso o cancellazione anticipata |
| Fingerprint e profilo del dispositivo | Per il tempo necessario alle finalità di sicurezza/identificazione; riesame periodico `[DA COMPILARE]` |
| Telemetria comportamentale | Il minor tempo possibile;  `[DA COMPILARE]` |
| Contenuti generati dagli utenti (, sondaggi) | Per la durata di pubblicazione e per un periodo successivo `[DA COMPILARE]`; possibile conservazione in forma aggregata |
| Handle Instagram collegato | Fino a revoca del consenso o cancellazione dell'associazione |
| Dati di account (funzionalità futura) | Per la durata del rapporto e nei termini di legge successivi |
| Log tecnici e di sicurezza | Periodo `[DA COMPILARE]` proporzionato alle esigenze di sicurezza e agli obblighi di legge |
| Dati necessari alla difesa in giudizio | Fino al termine di prescrizione applicabile |



---

## 9. Destinatari e responsabili del trattamento (art. 28 GDPR)

I dati possono essere trattati, per conto del Titolare, dai seguenti **responsabili del trattamento** e destinatari, con cui deve essere in essere un **accordo ex art. 28 GDPR (DPA)**:

| Destinatario | Ruolo | Servizio | Ubicazione dei dati |
|--------------|-------|----------|---------------------|
| **Google Ireland Ltd. / Google LLC (Firebase — Firestore)** | Responsabile del trattamento | Database, autenticazione, hosting dati | UE e/o USA (v. sezione 10) |
| **Cloudflare, Inc. (R2, D1, KV)** | Responsabile del trattamento | Storage oggetti (R2), database (D1), key-value store (KV), CDN/sicurezza | Rete globale, incl. USA (v. sezione 10) |
| Eventuali fornitori di analytics, e-mail, anti-abuso | Responsabile del trattamento | `[DA COMPILARE se presenti]` | `[DA COMPILARE]` |
| Autorità pubbliche, forze dell'ordine, autorità giudiziaria | Autonomi titolari | Su richiesta legittima / obblighi di legge | UE |
| Consulenti legali/professionisti del Titolare | Responsabili o titolari autonomi | Assistenza e difesa | UE |

I dati **non sono oggetto di diffusione** né di vendita a terzi. Un elenco aggiornato dei responsabili del trattamento può essere richiesto ai contatti in sezione 1.

---

## 10. Trasferimenti di dati extra-UE/SEE (artt. 44-49 GDPR)

L'utilizzo di **Google Firebase** e **Cloudflare** può comportare il **trasferimento di dati personali verso gli Stati Uniti** e altri Paesi terzi in cui tali fornitori operano.

Tali trasferimenti sono legittimati, in via alternativa o cumulativa, dalle seguenti garanzie:

- **Decisione di adeguatezza — EU-U.S. Data Privacy Framework (DPF):** la Commissione europea, con decisione del **10 luglio 2023**, ha riconosciuto un livello di protezione adeguato per i trasferimenti verso organizzazioni statunitensi **certificate** nel DPF. **Google LLC** e **Cloudflare, Inc.** risultano tra i soggetti certificati nel Data Privacy Framework; occorre **verificare periodicamente la validità e l'attualità della certificazione** nell'elenco ufficiale (https://www.dataprivacyframework.gov).
- **Clausole Contrattuali Tipo (SCC):** in aggiunta o in alternativa, i fornitori adottano le **Clausole Contrattuali Standard** approvate dalla Commissione (Decisione di esecuzione (UE) 2021/914), integrate — ove necessario — da **misure supplementari** (es. cifratura, minimizzazione).

Copia delle garanzie adottate può essere richiesta ai contatti in sezione 1. Le informazioni aggiornate sui trasferimenti sono reperibili nelle informative dei fornitori:
- Firebase/Google: https://firebase.google.com/support/privacy
- Cloudflare (DPA): https://www.cloudflare.com/cloudflare-customer-dpa/

> **Nota di compliance.** Occorre verificare, per ciascun servizio Firebase/Cloudflare effettivamente utilizzato, la **regione di archiviazione** configurata, l'ambito della certificazione DPF (che copre solo i trattamenti indicati dall'azienda) e mantenere aggiornato il mapping dei flussi transfrontalieri. Va valutata la configurazione di **residenza dei dati nell'UE** ove disponibile.

---

## 11. Diritti dell'interessato (artt. 15-22 GDPR) e modalità di esercizio

In qualità di interessato, hai diritto di:

- **Accesso (art. 15):** ottenere conferma del trattamento e copia dei tuoi dati.
- **Rettifica (art. 16):** correggere dati inesatti o incompleti.
- **Cancellazione / "diritto all'oblio" (art. 17):** ottenere la cancellazione dei dati nei casi previsti.
- **Limitazione (art. 18):** ottenere la limitazione del trattamento in determinati casi.
- **Portabilità (art. 20):** ricevere in formato strutturato, di uso comune e leggibile da dispositivo automatico i dati trattati sulla base del consenso o del contratto, e trasmetterli ad altro titolare.
- **Opposizione (art. 21):** opporti al trattamento fondato sul legittimo interesse.
- **Non essere sottoposto a decisioni automatizzate (art. 22):** incluso il diritto all'intervento umano (v. sezione 7.3).
- **Revoca del consenso (art. 7, par. 3):** revocare in qualsiasi momento il consenso prestato, senza pregiudicare la liceità del trattamento effettuato prima della revoca. La revoca deve essere **facile come la prestazione** del consenso.
- **Reclamo all'Autorità di controllo (art. 77):** proporre reclamo al **Garante per la protezione dei dati personali** (Piazza Venezia 11, 00187 Roma; https://www.garanteprivacy.it), fatto salvo ogni altro ricorso amministrativo o giurisdizionale.

**Come esercitare i diritti.** Puoi inviare una richiesta all'indirizzo **[DA COMPILARE — e-mail dedicata]** (o al DPO, se nominato). Il Titolare risponde **senza ingiustificato ritardo e comunque entro un mese** dalla richiesta (prorogabile di due mesi per richieste complesse, con informativa all'interessato, ex art. 12 GDPR). L'esercizio dei diritti è **gratuito**, salvo richieste manifestamente infondate o eccessive.

> **Nota per l'utente.** Se utilizzi Agorà senza account, per esercitare i diritti potremmo doverti chiedere **informazioni aggiuntive** utili a identificare i dati riferiti al tuo dispositivo (art. 11 e art. 12 GDPR). Se non siamo in grado di identificarti, potremmo non poter dar seguito ad alcune richieste.

---

## 12. Natura del conferimento e conseguenze del rifiuto

- I dati **strettamente necessari** all'erogazione del servizio (finalità A e sicurezza di base) sono indispensabili: in loro assenza il servizio potrebbe non funzionare.
- Il consenso alle finalità **C, D ed E** (fingerprinting, telemetria/profilazione, collegamento Instagram) è **facoltativo**: il rifiuto non impedisce l'accesso alle funzionalità essenziali del servizio (assenza di "cookie wall"), ma può limitare alcune funzioni avanzate o di sicurezza rafforzata.
- Il conferimento dell'**handle Instagram** e dei dati di **registrazione** è sempre facoltativo.

---

## 13. Dati personali contenuti nei contenuti pubblicati

Quando pubblichi uno "", un sondaggio o un commento, **potresti inserire dati personali** tuoi o di terzi. Ti ricordiamo che:
- non devi pubblicare dati personali di terzi senza una base giuridica idonea o il loro consenso;
- non devi pubblicare dati appartenenti a **categorie particolari** (art. 9 GDPR) di terzi;
- sei responsabile dei contenuti che pubblichi (v. Termini e Condizioni).
Rispetto ai dati di terzi eventualmente presenti nei contenuti, il Titolare tratta tali dati per le finalità di gestione del servizio e di moderazione, e dà seguito alle richieste degli interessati secondo la presente informativa.

---

## 14. Misure di sicurezza, DPIA e violazioni dei dati

- **Sicurezza (art. 32):** sono adottate misure tecniche e organizzative adeguate (cifratura in transito, controlli di accesso, minimizzazione, ecc. — `[DA DETTAGLIARE]`).
- **DPIA (art. 35):** dato l'uso combinato di **fingerprinting**, **monitoraggio sistematico su larga scala**, **profilazione comportamentale**, **identificativi persistenti** e possibile trattamento di **minori**, la **Valutazione d'impatto sulla protezione dei dati è, con ogni probabilità, obbligatoria** e deve essere completata **prima del lancio**. Va considerata la consultazione preventiva del Garante (art. 36) qualora residui un rischio elevato non mitigabile.
- **Registro dei trattamenti (art. 30):** deve essere predisposto e mantenuto aggiornato.
- **Violazioni dei dati (artt. 33-34):** in caso di *data breach*, il Titolare notifica al Garante entro **72 ore** ove ricorrano i presupposti e informa gli interessati quando il rischio è elevato.

---

## 15. Minori

Agorà è destinata a utenti. Ai sensi dell'**art. 8 GDPR** e dell'**art. 2-quinquies del D.lgs. 196/2003** (come modificato dal D.lgs. 101/2018), in Italia il minore che ha compiuto **14 anni** può prestare autonomamente il consenso ai servizi della società dell'informazione; per i minori di 14 anni il consenso deve essere prestato o autorizzato da chi esercita la responsabilità genitoriale. Il Titolare adotta misure ragionevoli per verificare l'età e non tratta consapevolmente dati di minori di 14 anni senza le condizioni di legge. Vedi anche i Termini e Condizioni per i requisiti di età di accesso al servizio.

---

## 16. Modifiche alla presente informativa

La presente informativa può essere aggiornata nel tempo. Le modifiche saranno pubblicate su questa pagina con indicazione della data di aggiornamento; in caso di modifiche sostanziali che incidano sui trattamenti basati sul consenso, sarà **richiesto un nuovo consenso**.

---

## 17. Riferimenti normativi citati

- **Regolamento (UE) 2016/679 (GDPR)** — in particolare artt. 6, 7, 8, 9, 12-22, 26, 28, 30, 32, 33-34, 35-36, 37, 44-49, 77.
- **D.lgs. 30 giugno 2003, n. 196 (Codice Privacy)**, come modificato dal **D.lgs. 10 agosto 2018, n. 101** — in particolare artt. 2-quinquies e 122.
- **Direttiva 2002/58/CE (ePrivacy)** — in particolare art. 5(3).
- **Garante per la protezione dei dati personali — "Linee guida cookie e altri strumenti di tracciamento", 10 giugno 2021** (doc. web n. 9677876; G.U. n. 163 del 9 luglio 2021).
- **EDPB — Guidelines 2/2023** sull'ambito tecnico dell'art. 5(3) della Direttiva ePrivacy.
- **Commissione europea — Decisione di adeguatezza EU-U.S. Data Privacy Framework** del 10 luglio 2023; **Clausole Contrattuali Tipo**, Decisione di esecuzione (UE) 2021/914.

---

*Fine dell'Informativa sulla Privacy (bozza 0.1). Documento da sottoporre a revisione legale prima della pubblicazione.*
