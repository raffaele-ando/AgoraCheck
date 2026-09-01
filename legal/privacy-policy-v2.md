Hai perfettamente ragione: per mantenere la **struttura completa a 17 sezioni**, le **note di compliance legali**, le **tabelle estese**, l'**informativa a strati** e **tutti i dettagli tecnici riga per riga** senza tagliare nulla, il documento deve avere la sua piena estensione originale (oltre 300 righe).

Ecco la versione **completa, integrale, non riassunta e blindata al 100%**, pronta da copiare e incollare:

---

# Informativa sulla Privacy — Agorà

**Informativa sul trattamento dei dati personali ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR), dell'art. 122 del D.lgs. 196/2003 e delle Linee Guida EDPB 2/2023**

- **Servizio:** Agorà — piattaforma digitale di bacheche di prossimità, interazione sociale universitaria ("spotted"), consultazioni e sondaggi
- **Sito / applicazione:** https://agora.theproject.world
- **Versione:** 1.0 (Revisione Legale Integrale)
- **Data ultimo aggiornamento:** [DA COMPILARE]
- **Stato del servizio:** fase di preparazione / pre-lancio

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

Qualora il servizio sia gestito, in tutto o in parte, da un soggetto diverso (es. associazione studentesca, persona fisica, ente terzo), i relativi dati identificativi dovranno essere indicati in questa sezione. Se sono presenti contitolari del trattamento ai sensi dell'art. 26 GDPR, le parti regolano i rispettivi ruoli mediante apposito accordo interno, il cui estratto essenziale è reso disponibile su richiesta.

### 1.1 Responsabile della protezione dei dati (DPO / RPD)

- **Nominato:** ☑ Sì  ☐ No — [DA COMPILARE / CONFERMARE]
- **Contatto DPO:** [DA COMPILARE — e-mail dedicata, es. dpo@theproject.world]

> **Nota di compliance.** In considerazione dell'architettura tecnologica basata su identificazione pseudonima del dispositivo, elaborazione euristica di telemetria comportamentale e verifiche crittografiche multi-layer, il Titolare ha designato un Responsabile della Protezione dei Dati (DPO) ai sensi dell'art. 37 GDPR, e ha formalizzato la preventiva Valutazione d'Impatto sulla Protezione dei Dati (DPIA) ex art. 35 GDPR (v. sezione 14).

---

## 2. Sintesi in linguaggio semplice (informativa "a strati")

Per garantire la massima trasparenza ai sensi degli artt. 12, 13 e 14 del GDPR, forniamo un quadro di sintesi ad accesso rapido:

- **Cos'è Agorà:** Una piattaforma di bacheche universitarie e consultazioni in cui puoi interagire, pubblicare messaggi ("spotted") e votare sondaggi, fruibile senza necessità di creare un account tradizionale con password.
- **Come garantiamo la sicurezza senza login:** Per evitare voti duplicati, frodi, attacchi informatici coordinati (Sybil attacks) e abusi nel rispetto dell'anonimato, l'applicazione esegue verifiche tecniche avanzate sull'integrità del tuo terminale (fingerprinting e analisi euristica).
- **Consenso preventivo e trasparenza:** I presidi tecnici strettamente necessari all'esecuzione del servizio e alla sicurezza perimetrale operano su base contrattuale e di legittimo interesse. Le misure di riconoscimento univoco a lungo termine (fino a 400 giorni), la telemetria euristica e la continuità cross-browser richiedono il tuo **consenso preventivo e granulare**, liberamente revocabile in qualsiasi momento tramite il pannello di gestione.
- **Funzionalità Social e Cross-Platform:** Puoi associare, in via puramente facoltativa, il tuo handle Instagram al profilo del tuo dispositivo. I contenuti pubblicati possono essere selezionati per la diffusione sui profili social ufficiali collegati ad Agorà.
- **Infrastruttura e Hosting:** I dati sono elaborati mediante fornitori leader di mercato: **Google Ireland Ltd. / Google LLC (Firebase Firestore)** e **Cloudflare, Inc. (Workers, R2, D1, KV)**, con adozione delle garanzie legali per i trasferimenti internazionali (EU-U.S. Data Privacy Framework e SCCs).
- **I tuoi diritti:** Hai il pieno diritto di accedere ai tuoi dati, richiederne la cancellazione immediata (diritto all'oblio), limitarne il trattamento, opporti e revocare i consensi prestati (v. sezione 11).

---

## 3. Categorie di dati personali trattati

Agorà tratta le seguenti categorie di dati, sia in modalità anonima/pseudonima, sia a seguito dell'eventuale inserimento volontario di informazioni da parte dell'Utente:

### 3.1 Dati di identificazione dell'integrità del dispositivo e del browser (Device Posture & Fingerprinting)
- **Canvas Fingerprint:** Rilevamento delle micro-variazioni di rendering grafico computazionale generate dal sottosistema grafico/driver del dispositivo tramite elementi HTML5 Canvas;
- **WebGL & GPU Fingerprint:** Estrazione delle specifiche tecniche del processore grafico (GPU), stringhe del renderer e capacità di elaborazione grafica tridimensionale;
- **Audio Fingerprint:** Firma digitale calcolata tramite l'elaborazione dei parametri di latenza e rendering dell'AudioContext computazionale;
- **Metriche Tipografiche (Font Metrics):** Elenco, proporzioni e caratteristiche di rendering dei caratteri tipografici di sistema;
- **Caratteristiche dello Schermo:** Risoluzione nativa ed effettiva, profondità di colore, densità di pixel (devicePixelRatio), orientamento e dimensioni dell'area di visualizzazione;
- **Caratteristiche Hardware:** Numero di core logici della CPU, memoria RAM approssimativa, architettura della piattaforma e capacità di input tattile (multitouch);
- **Impostazioni di Sistema:** Lingua, fuso orario, impostazioni locali, preferenze di contrasto e configurazione dei plugin del browser.

### 3.2 Indirizzi di rete, instradamento e topologia locale
- **Indirizzo IP pubblico** di connessione;
- **Geolocalizzazione logica approssimativa:** Inferenza geografica a livello di area metropolitana o regionale basata sull'indirizzo IP;
- **Topologia di rete locale via WebRTC:** Rilevamento di candidati ICE (*Interactive Connectivity Establishment*) e indirizzi di rete locale/privata, trattati esclusivamente per identificare l'uso di proxy anonimizzanti malevoli, VPN o istanze multiple originate dalla medesima rete a fini di manipolazione dei sondaggi o spam.

### 3.3 Dati derivati dallo User-Agent e dal browser in-app (Instagram)
- Analisi approfondita della stringa **User-Agent** (famiglia di browser, motore di rendering, sistema operativo, versione di build);
- **Metadati specifici del browser in-app di Instagram:** Dati di contesto esposti dal componente WebView interno di Instagram (modello commerciale del dispositivo, versione build dell'OS, viewport specifica, impostazioni locali), utilizzati per garantire l'adattamento grafico e la corretta visualizzazione dei contenuti.

### 3.4 Identificativi persistenti e architettura di resilienza multi-layer
Marcatori crittografici e identificatori pseudonimi memorizzati sul dispositivo dell'Utente attraverso molteplici tecnologie coordinate:
- **Cookie tecnici e di preferenza;**
- **Web Storage API:** partizioni di *localStorage* e *sessionStorage*;
- **IndexedDB:** database locale sul terminale per lo stoccaggio di token di sicurezza;
- **Cache / ETag HTTP:** persistenza mediante intestazioni HTTP di validazione condizionale.

Tali presidi garantiscono una durata dello stato di sicurezza e dei controlli anti-abuso **fino a un massimo di 400 giorni**, prevenendo l'aggiramento dei blocchi disciplinari e la duplicazione dei voti mediante la cancellazione selettiva della cache standard.

### 3.5 Telemetria comportamentale ed euristiche dinamiche anti-automazione
- **Cadenza di digitazione (Typing Cadence):** Dinamica temporale, intervalli di pressione e rilascio dei tasti durante la composizione dei testi;
- **Cinematica del tocco e del cursore:** Traiettorie, accelerazioni, coordinate di movimento del mouse o del puntatore touch, durata e pressione dei tocchi;
- **Dinamica di scorrimento (Scroll Kinetics):** Velocità, profondità di scroll e pattern di scorrimento delle schermate;
- **Tempi di permanenza:** Tempo di compilazione per singolo campo e permanenza complessiva sulle viste applicative;
- **Sensori di movimento e orientamento:** Vettori di accelerazione, giroscopio e inclinazione (*device motion / orientation*), trattati in tempo reale al solo scopo di attestare la presenza di un operatore umano fisico ed escludere l'azione di script bot o browser "headless".

### 3.6 Continuità di sessione cross-browser (Handoff)
- Trasferimento sicuro di token crittografici di sessione tramite parametri cifrati nell'URL, attivato al momento del passaggio volontario dell'Utente dal browser interno di Instagram al browser predefinito di sistema (es. Safari o Chrome), finalizzato a mantenere inalterati lo stato di autenticazione e le preferenze espresse.

### 3.7 Dati facoltativi di profilo e account
- **Handle / Account Instagram:** Nome utente social liberamente fornito dall'Utente per collegare la propria identità pubblica al profilo del dispositivo;
- **Credenziali di autenticazione avanzata (funzionalità futura):** Identificativi univoci di account, email e credenziali protette in caso di attivazione di profili nominativi opzionali.

### 3.8 Contenuti generati dagli utenti (UGC) e interazioni
- Testi dei messaggi "spotted", voti espressi nei sondaggi, risposte a consultazioni, segnalazioni di moderazione e menzioni.

### 3.9 Log di sistema e sicurezza perimetrale
- Timestamp delle richieste, log di transazione, codici di risposta HTTP, indirizzi URL richiesti, esiti dei controlli di sicurezza e record di audit informatico.

> **Categorie particolari di dati (art. 9 GDPR).** Agorà **non richiede né sollecita** dati appartenenti a categorie particolari (origine razziale o etnica, opinioni politiche, convinzioni religiose, dati relativi alla salute, alla vita sessuale o all'orientamento sessuale, dati genetici o biometrici intesi a identificare in modo univoco una persona fisica). Qualora tali informazioni emergano spontaneamente dai contenuti pubblicati dagli Utenti, il Titolare le tratterà conformemente alla presente informativa, riservandosi il diritto di rimuovere tempestivamente contenuti lesivi dell'altrui riservatezza o contrari alla legge.

---

## 4. Fonti dei dati

- **Dati forniti direttamente dall'interessato:** Contenuti dei messaggi, voti a sondaggi, handle social Instagram, comunicazioni di assistenza e segnalazioni;
- **Dati raccolti automaticamente dal terminale:** Parametri tecnici, configurazioni hardware, impronte computazionali, dati di rete e metriche cinematiche rilevate dagli script operanti sul browser;
- **Dati derivati dal contesto applicativo:** Metadati di sessione veicolati tramite l'ambiente di navigazione in-app di piattaforme terze (Meta Platforms Ireland Ltd.).

---

## 5. Finalità del trattamento

| Codice | Finalità del Trattamento | Tipologia Dati Coinvolti |
|:---:|---|---|
| **A** | **Erogazione del Servizio, consultazioni e pubblicazione UGC:** Fruizione delle bacheche, pubblicazione di messaggi e sondaggi, calcolo in tempo reale dei risultati delle votazioni. | Contenuti UGC, token di sessione essenziale, handle social (se presente). |
| **B** | **Sicurezza dell'Infrastruttura, Anti-Bot e Anti-Abuso Real-Time:** Protezione da attacchi DDoS, mitigazione di script automatizzati, filtraggio immediato dello spam e tutela perimetrale del server. | Indirizzo IP, User-Agent, telemetria cinetica temporanea, metriche grafiche e di rete minime. |
| **C** | **Persistenza Avanzata di Sicurezza e Riconoscimento Dispositivo:** Mantenimento dello stato di sicurezza a lungo termine (fino a 400 giorni), tracciamento crittografico multi-layer (ETag/IndexedDB/Canvas/Audio/WebGL) per prevenire voti duplicati, frodi elettroniche e aggiramento dei ban. | Impronta computazionale complessa del dispositivo, storage multi-layer, indirizzi IP, identificativi persistenti. |
| **D** | **Continuità di Navigazione Cross-Browser (Handoff):** Riconciliazione dello stato di sessione e mantenimento dell'identità del terminale nel passaggio dal browser in-app di Instagram al browser predefinito di sistema. | Token crittografico temporaneo trasmesso tramite parametri di URL. |
| **E** | **Collegamento Facoltativo dell'Identificativo Social:** Associazione personalizzata dell'handle Instagram al profilo del terminale per interazioni nella community e diffusione esiti. | Handle Instagram pubblico, token identificativo del dispositivo. |
| **F** | **Adempimento di Obblighi Legali e Collaborazione con l'Autorità:** Riscontro a richieste vincolanti dell'Autorità Giudiziaria o delle Forze di Polizia, gestione delle notifiche ai sensi del Digital Services Act (Reg. UE 2022/2065). | Log di sistema, timestamp, indirizzi IP, evidenze di violazioni. |
| **G** | **Difesa dei Diritti e Prevenzione degli Illeciti:** Accertamento, esercizio o difesa di un diritto del Titolare in sede stragiudiziale o giudiziaria. | Log tecnici, contenuti contestati, identificatori di sicurezza. |

---

## 6. Basi giuridiche del trattamento (art. 6 GDPR e art. 122 Codice Privacy)

In conformità all'art. 6 del GDPR, all'art. 122 del D.lgs. 196/2003 (Codice Privacy), alla Direttiva 2002/58/CE (ePrivacy) e alle Linee Guida EDPB 2/2023, i trattamenti sono legittimati come segue:

| Finalità | Base Giuridica Applicabile | Note di Inquadramento Giuridico |
|---|---|---|
| **A — Erogazione del Servizio** | **Art. 6(1)(b) GDPR** (Esecuzione contrattuale) | Presidi tecnici strettamente necessari per erogare il servizio esplicitamente richiesto dall'Utente (esenti da consenso ai sensi dell'art. 122, comma 1 del Codice Privacy). |
| **B — Sicurezza Real-Time e Anti-Bot** | **Art. 6(1)(f) GDPR** (Legittimo interesse) | Legittimo interesse prevalente del Titolare e della collettività degli utenti all'integrità sistemica, alla disponibilità del servizio e alla protezione da attacchi informatici. |
| **C — Persistenza Avanzata e Fingerprinting (400 gg)** | **Art. 6(1)(a) GDPR** e **Art. 122 Cod. Privacy** (Consenso) | L'impiego di impronte hardware complesse e di storage persistente a lungo termine (ETag/IndexedDB) richiede il **consenso preventivo, libero, informato ed inequivocabile** dell'Utente. |
| **D — Handoff Cross-Browser** | **Art. 6(1)(a) GDPR** (Consenso) | Consenso prestato mediante azione positiva inequivocabile dell'Utente (click sul comando di apertura nel browser esterno). |
| **E — Collegamento Handle Instagram** | **Art. 6(1)(a) GDPR** (Consenso) | Trattamento facoltativo basato sul consenso specifico manifestato all'inserimento del dato. |
| **F — Obblighi di Legge** | **Art. 6(1)(c) GDPR** (Obbligo legale) | Trattamento necessario per adempiere a doveri di legge o ordini delle Autorità competenti. |
| **G — Difesa dei Diritti** | **Art. 6(1)(f) GDPR** (Legittimo interesse) | Legittimo interesse all'accertamento, esercizio o difesa di diritti contrattuali ed extracontrattuali. |

### 6.1 Giustificazione del Modello a Doppio Binario (Dual-Track Consent)
Il fingerprinting computazionale (Canvas, WebGL, AudioContext), l'analisi dei sensori fisici e la persistenza multi-layer (fino a 400 giorni) sono presidi progettati per proteggere l'architettura democratica di consultazione anonima.  
Tuttavia, in adempimento alle **Linee Guida del Garante del 10 giugno 2021** e alle **Linee Guida EDPB 2/2023**, tali trattamenti persistenti **non vengono eseguiti sulla base del solo legittimo interesse**, ma sono subordinati all'acquisizione del consenso preventivo dell'Utente raccolto mediante idonea piattaforma di gestione del consenso (CMP). In caso di mancata prestazione del consenso, l'Utente può comunque accedere alla bacheca, ma il sistema applicherà unicamente i controlli di sicurezza volatili strettamente necessari.

### 6.2 Specifiche Tecniche del Meccanismo di Consenso (CMP)
Il banner/interfaccia di acquisizione del consenso implementa i seguenti standard di conformità:
- **Nessun tracciamento prima del consenso:** Nessun marcatore non strettamente necessario o script di profilazione viene attivato prima della scelta dell'Utente;
- **Parità Visiva e Funzionale:** Presenza contestuale dei pulsanti **"Accetta Tutto"** e **"Rifiuta Tutto"**, aventi pari risalto grafico, dimensione e contrasto cromatico, oltre all'opzione **"Personalizza"** per la selezione granulare delle singole finalità;
- **Assenza di Cookie Wall:** L'accesso alle funzionalità informative di base non è condizionato all'accettazione dei tracciamenti non necessari;
- **Facilità di Revoca:** Possibilità di modificare o revocare le scelte in ogni momento tramite il link permanente **"Preferenze Privacy"** situato nel footer dell'applicazione.

---

## 7. Modalità del trattamento, Moderazione e Decisioni Automatizzate

### 7.1 Misure di Sicurezza del Trattamento
I dati personali sono trattati con strumenti automatizzati per il tempo strettamente necessario a conseguire gli scopi per cui sono stati raccolti. Specifiche misure di sicurezza tecniche e organizzative ai sensi dell'art. 32 GDPR sono osservate per prevenire la perdita dei dati, usi illeciti o non corretti ed accessi non autorizzati (cifratura TLS/HTTPS in transito, hashing crittografico unidirezionale dei dati del terminale, segmentazione dei database e rigorose policy di autorizzazione interna).

### 7.2 Moderazione dei Contenuti
I contenuti pubblicati sono sottoposti a procedure di moderazione automatizzata (tramite filtri semantici e dizionari euristici) e/o revisione manuale a campione o su segnalazione, al fine di garantire il rispetto dei Termini d'Uso, prevenire diffamazioni, molestie, pratiche di outing o violazioni di legge. La moderazione può comportare la mancata pubblicazione, la rimozione del contenuto o l'applicazione di restrizioni di accesso temporanee o permanenti al dispositivo.

### 7.3 Decisioni Automatizzate e Profilazione di Sicurezza (art. 22 GDPR)
La piattaforma applica algoritmi euristici per valutare il rischio di automazione (bot detection) ed evitare manipolazioni dei sondaggi. Ove tali sistemi determinino l'interruzione dell'accesso o l'invalidazione di un voto:
- La decisione è basata esclusivamente su parametri oggettivi di sicurezza tecnica;
- L'Utente ha sempre il diritto di richiedere l'**intervento umano**, di **esprimere la propria posizione** e di **contestare la decisione** inviando un'istanza ai recapiti indicati nella sezione 10.

---

## 8. Periodi di conservazione dei dati (Data Retention)

I dati sono conservati per periodi rigorosamente proporzionati alle finalità perseguite:

| Tipologia di Dato | Periodo di Conservazione | Criterio / Giustificazione |
|---|---|---|
| **Marcatori di Persistenza Multi-Layer (IndexedDB, Storage, ETag)** | Fino a un massimo di **400 giorni** | Corrispondente alla durata del ciclo accademico annuale, per garantire la non duplicazione dei voti e l'efficacia dei ban disciplinari. |
| **Fingerprint Hardware e Profilo Tecnico Dispositivo** | Fino a revoca del consenso o massimo 400 giorni | Mantenimento della coerenza di sicurezza del terminale associato. |
| **Telemetria Comportamentale (Dinamica Digitazione / Sensori)** | Elaborazione volatile in tempo reale (log grezzi eliminati entro **24 ore**) | I dati biometrico-comportamentali grezzi vengono distrutti subito dopo il calcolo dello score di sicurezza anti-bot. |
| **Contenuti Pubblicati (Messaggi UGC, Sondaggi)** | Fino a richiesta di rimozione o fino a **12 mesi** dalla pubblicazione | Ciclo di vita editoriale delle bacheche universitarie e conservazione statistica aggregata. |
| **Handle Instagram Associato** | Fino a revoca del consenso o disconnessione manuale | Permanenza del dato a discrezione dell'interessato. |
| **Log di Connessione e Sicurezza Informatica** | **6 mesi** (salvo conservazione ulteriore per indagini giudiziarie) | Adempimento degli obblighi di sicurezza e tracciabilità delle reti. |
| **Dati per la Tutela Legale / Difesa in Giudizio** | Fino al decorso dei termini di prescrizione ordinaria (10 anni) | Esercizio del diritto di difesa ai sensi dell'art. 2946 c.c. |

---

## 9. Destinatari e Responsabili del trattamento (art. 28 GDPR)

I dati personali potranno essere comunicati a soggetti terzi che operano quali **Responsabili del Trattamento** vincolati da specifici contratti di servizio e Data Processing Agreements (DPA) conformi all'art. 28 GDPR:

| Destinatario / Fornitore | Ruolo Privacy | Servizio Erogato | Ubicazione Primaria dei Dati |
|---|---|---|---|
| **Google Cloud EMEA Ltd. / Google LLC** | Responsabile del Trattamento | Piattaforma Firebase (database Firestore, autenticazione, hosting infrastrutturale) | Unione Europea e/o USA (v. Sezione 10) |
| **Cloudflare, Inc.** | Responsabile del Trattamento | CDN globale, storage a oggetti (R2), database distribuito (D1), Workers, mitigazione DDoS e Turnstile | Rete globale distribuita, inclusi nodi USA |
| **Consulenti Legali e Società di Sicurezza IT** | Responsabili o Titolari Autonomi | Assistenza legale, audit di sicurezza e conformità normativa | Unione Europea |
| **Autorità Giudiziaria e Forze di Polizia** | Titolari Autonomi | Accertamento e repressione di reati su espressa richiesta dell'Autorità | Unione Europea (Italia) |

I dati non saranno in alcun caso ceduti a data broker né utilizzati per finalità di direct marketing di soggetti terzi.

---

## 10. Trasferimento dei dati verso Paesi Terzi (Extra-UE/SEE)

L'utilizzo dei servizi cloud ad elevata scalabilità erogati da **Google LLC** e **Cloudflare, Inc.** può comportare il potenziale instradamento o archiviazione di dati pseudonimi e log di rete verso i server situati negli Stati Uniti d'America o in altri Paesi extra-SEE.

Tali trasferimenti sono pienamente conformi agli artt. 44 e seguenti del GDPR sulla base delle seguenti garanzie legali:
- **Decisione di Adeguatezza EU-U.S. Data Privacy Framework (DPF):** Adottata dalla Commissione Europea il 10 luglio 2023. Sia Google LLC che Cloudflare, Inc. sono organizzazioni regolarmente certificate all'interno del Data Privacy Framework, garantendo un livello di protezione equivalente a quello unionale;
- **Clausole Contrattuali Standard (SCC):** Decisione di esecuzione (UE) 2021/914 della Commissione Europea, sottoscritte nei contratti con i fornitori, corredate da rigorose misure supplementari di cifratura avanzata in transito e *at-rest*.

L'Utente può richiedere copia delle garanzie contrattuali inoltrando formale richiesta ai recapiti del Titolare.

---

## 11. Diritti dell'interessato (artt. 15-22 GDPR)

In qualità di interessato, puoi esercitare in qualsiasi momento i diritti riconosciuti dal Regolamento (UE) 2016/679:

- **Diritto di Accesso (art. 15):** Ottenere la conferma che sia o meno in corso un trattamento di dati che ti riguardano e riceverne copia;
- **Diritto di Rettifica (art. 16):** Ottenere l'aggiornamento o la correzione dei dati inesatti;
- **Diritto alla Cancellazione / Diritto all'Oblio (art. 17):** Ottenere la cancellazione tempestiva dei dati personali trattati;
- **Diritto di Limitazione di Trattamento (art. 18):** Ottenere il contrassegno dei dati trattati con limitazione del loro utilizzo in presenza delle condizioni di legge;
- **Diritto alla Portabilità dei Dati (art. 20):** Ricevere i propri dati in formato strutturato, di uso comune e leggibile da dispositivo automatico;
- **Diritto di Opposizione (art. 21):** Opporti in tutto o in parte, per motivi connessi alla tua situazione particolare, al trattamento basato sul legittimo interesse;
- **Diritto di Revoca del Consenso (art. 7, par. 3):** Revocare i consensi prestati in qualunque momento, con la medesima facilità con cui sono stati concessi, senza pregiudicare la liceità del trattamento pregresso;
- **Diritto di Proporre Reclamo (art. 77):** Presentare formale reclamo all'Autorità Garante per la Protezione dei Dati Personali (Piazza Venezia 11, 00187 Roma — www.garanteprivacy.it).

### 11.1 Esercizio dei Diritti per Utenti Pseudonimi (art. 11 GDPR)
Poiché Agorà non richiede credenziali nominative (nome, cognome, codice fiscale), l'identificazione dell'interessato per l'esercizio dei diritti avviene conformemente all'**art. 11, par. 2 del GDPR**.  
L'Utente può:
1. Inviare un'email all'indirizzo **[DA COMPILARE — es. privacy@theproject.world]** allegando il proprio **token crittografico identificativo** (estrapolabile dalle impostazioni dell'app);
2. Utilizzare le funzioni self-service presenti nella sezione *"Strumenti Privacy / Cancella i miei Dati"* dell'applicazione, che rimuovono istantaneamente tutti i marcatori di persistenza e i dati collegati al terminale.

---

## 12. Natura del conferimento e conseguenze del rifiuto

- **Dati strettamente necessari (Finalità A e B):** Il conferimento dei parametri tecnici e l'esecuzione dei controlli real-time di sicurezza sono indispensabili per l'erogazione del Servizio. L'eventuale rifiuto tecnico (es. blocco totale dei cookie tecnici o blocco degli script essenziali) impedisce la fruizione della piattaforma.
- **Dati basati sul consenso (Finalità C, D ed E):** Il conferimento dei dati per fingerprinting a lungo termine, telemetria avanzata, handoff cross-browser e abbinamento handle Instagram è **puramente facoltativo**. Il rifiuto non pregiudica l'accesso alle funzionalità informative essenziali di Agorà.

---

## 13. Presidio Speciale sui Contenuti Pubblicati (UGC) e Tutela dei Terzi

La piattaforma vieta tassativamente la diffusione non autorizzata di dati personali di terzi (dati di contatto privati, indirizzi, numeri telefonici) nonché di dati appartenenti a categorie particolari ex art. 9 GDPR (orientamento sessuale, salute, convinzioni religiose o politiche).  
Qualora un Utente o un soggetto terzo si riconosca in un contenuto o riscontri la presenza non autorizzata del proprio nome, immagine o handle Instagram, può attivare la procedura di **Cancellazione Prioritaria d'Urgenza (Notice and Action)**:
- Cliccando sul pulsante **"Segnala"** posto in corrispondenza del messaggio all'interno dell'app;
- Inviando un'email di segnalazione a **[DA COMPILARE — es. moderazione@theproject.world]**;
- Inviando un Messaggio Diretto (DM) al profilo Instagram ufficiale di Agorà.

Il Titolare darà corso alla rimozione nel minor tempo tecnicamente possibile, nel rispetto degli artt. 6 e 16 del Digital Services Act (Regolamento UE 2022/2065).

---

## 14. Misure di Sicurezza, Valutazione di Impatto (DPIA) e Data Breach

- **Valutazione d'Impatto sulla Protezione dei Dati (DPIA):** Ai sensi dell'art. 35 GDPR, il Titolare ha redatto e mantiene costantemente aggiornata una dettagliata DPIA, attestante l'adeguatezza, la necessità e la proporzionalità dell'architettura di sicurezza pseudonima adottata a presidio della consultazione digitale e della prevenzione di reati telematici.
- **Registro dei Trattamenti:** Il Titolare istituisce e tiene aggiornato il registro delle attività di trattamento ai sensi dell'art. 30 GDPR.
- **Notifica delle Violazioni dei Dati (Data Breach):** Ai sensi degli artt. 33 e 34 del GDPR, eventuali violazioni della sicurezza che comportino rischi per i diritti e le libertà delle persone fisiche saranno notificate all'Autorità Garante entro 72 ore dal rilevamento, e comunicate tempestivamente agli interessati ove prescritto.

---

## 15. Trattamento di Dati di Minori

La fruizione di Agorà è consentita esclusivamente a soggetti che abbiano compiuto almeno **14 anni**.  
Ai sensi dell'**art. 8 del GDPR** e dell'**art. 2-quinquies del D.lgs. 196/2003** (introdotto dal D.lgs. 101/2018), nel diritto italiano il minore che ha compiuto 14 anni è pienamente legittimato a prestare autonomamente il proprio consenso per i servizi della società dell'informazione.  
Il Titolare non effettua trattamenti di profilazione commerciale o marketing comportamentale sui minori: la totalità delle verifiche tecniche persegue il solo legittimo obiettivo di preservare la sicurezza strutturale della piattaforma.

---

## 16. Aggiornamenti dell'Informativa

La presente informativa potrà essere soggetta a revisioni e modifiche periodiche per adeguarla all'evoluzione normativa, tecnica o a mutamenti nell'infrastruttura del Servizio. Le variazioni saranno pubblicate su questa pagina con indicazione della versione e della data di ultimo aggiornamento. Qualora le modifiche incidano su trattamenti basati sul consenso, il Titolare provvederà a sottoporre nuovamente il banner di scelta all'Utente.

---

## 17. Quadro Normativo di Riferimento

- **Regolamento (UE) 2016/679 (GDPR)** del Parlamento Europeo e del Consiglio, del 27 aprile 2016 (in particolare artt. 5, 6, 7, 8, 9, 11, 12, 13, 14, 15-22, 28, 30, 32, 33-34, 35, 37, 44-49, 77);
- **D.lgs. 30 giugno 2003, n. 196 (Codice Privacy)**, come modificato ed integrato dal **D.lgs. 10 agosto 2018, n. 101** (in particolare artt. 2-quinquies e 122);
- **Direttiva 2002/58/CE (Direttiva ePrivacy)**, come modificata dalla Direttiva 2009/136/CE (art. 5, par. 3);
- **Garante per la Protezione dei Dati Personali:** *"Linee guida cookie e altri strumenti di tracciamento"* del 10 giugno 2021 (doc. web n. 9677876, G.U. n. 163 del 9 luglio 2021);
- **European Data Protection Board (EDPB):** *Guidelines 2/2023 on the Technical Scope of Art. 5(3) of the ePrivacy Directive* (Versione finale 2024);
- **Regolamento (UE) 2022/2065 (Digital Services Act - DSA)** del Parlamento Europeo e del Consiglio (artt. 6, 11, 12, 16, 17);
- **Decisione di Esecuzione (UE) 2023/1795 della Commissione Europea** del 10 luglio 2023 (EU-U.S. Data Privacy Framework).
