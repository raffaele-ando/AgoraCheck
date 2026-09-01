# Agorà — Documentazione Legale, Architettura di Compliance e Linee Guida di Rilascio

> **⚠️ BOZZA DI LAVORO — PER USO INTERNO**
>
> Questo repository contiene la documentazione legale e le linee guida di conformità predisposte per la piattaforma **Agorà** (bacheche digitali di prossimità, messaggi di community e consultazioni). I testi riflettono il quadro normativo europeo e italiano vigente (GDPR, Codice Privacy, ePrivacy, Digital Services Act) e devono essere completati nei campi contrassegnati con `[DA COMPILARE]` prima del lancio in produzione.

---

## 📁 Struttura della Documentazione

| File | Descrizione | Stato |
|---|---|---|
| `terms-and-conditions.md` | **Termini e Condizioni Generali d'Uso** (disciplina contrattuale, licenza UGC, ecosistema Instagram, clausole di salvaguardia e manleva, notice & action DSA). | Versione 1.0 |
| `privacy-policy.md` | **Informativa sul Trattamento dei Dati Personali** ex artt. 13-14 GDPR (token tecnici, basi giuridiche, flussi cross-platform, retention policy, diritti degli interessati). | Versione 1.0 |
| `README.md` | **Quadro normativo, sintesi dell'architettura di conformità e checklist operativa di pre-lancio.** | Versione 1.0 |

---

## 1. Quadro Normativo di Riferimento

La documentazione e l'architettura tecnica di Agorà sono strutturate in conformità ai seguenti presidi normativi:

### 1.1 Regolamento (UE) 2016/679 (GDPR)
- **Art. 6(1)(b) [Contratto]:** Base giuridica per l'erogazione del servizio, la pubblicazione delle bacheche, la partecipazione ai sondaggi e la gestione della licenza UGC per la diffusione social.
- **Art. 6(1)(f) [Legittimo Interesse]:** Base giuridica per la sicurezza informatica, il contrasto a bot/spam, la protezione delle votazioni e la prevenzione di abusi (inclusa l'applicazione di blocchi tecnici).
- **Art. 8 GDPR e Art. 2-quinquies D.lgs. 196/2003:** Fissazione inderogabile dell'**età minima di accesso a 14 anni**, con esclusione totale dei minori di 14 anni per azzerare i rischi di raccolta dati priva di idoneo consenso genitoriale verificabile.
- **Art. 9 [Categorie Particolari di Dati]:** Divieto assoluto di pubblicazione di dati relativi a salute, sfera sessuale o orientamento sessuale di terzi (*divieto di outing*).
- **Artt. 15-22 [Diritti dell'Interessato]:** Procedure per l'esercizio dei diritti di accesso, rettifica, cancellazione rapida (*untag*) e opposizione.
- **Art. 28 [Responsabili del Trattamento]:** Contratti di elaborazione dati (DPA) con i fornitori di infrastruttura cloud (Google Cloud/Firebase e Cloudflare).
- **Artt. 44-49 [Trasferimenti Extra-UE]:** Copertura dei flussi transfrontalieri verso gli USA tramite il **Data Privacy Framework UE-USA (DPF)** e le **Clausole Contrattuali Tipo (SCC)**.

### 1.2 Disciplina ePrivacy e Strumenti di Archiviazione Locale
- **Art. 122 D.lgs. 196/2003 (Codice Privacy) e Direttiva 2002/58/CE:** Esenzione dal consenso preventivo per l'utilizzo di identificatori tecnici e token crittografici di sessione in quanto **strettamente necessari** alla fornitura del servizio richiesto e all'integrità della piattaforma.
- **Linee Guida del Garante Privacy (10 giugno 2021):** Piena conformità mediante l'adozione di misure tecniche trasparenti, assenza di profilazione commerciale cross-site e divieto di cookie wall ingiustificati.

### 1.3 Regolamento (UE) 2022/2065 (Digital Services Act - DSA)
- **Artt. 6 e 16 DSA [Hosting Provider Safe Harbor]:** Regime di esenzione da responsabilità civile per i contenuti generati dagli utenti, subordinato alla tempestiva rimozione o disabilitazione dell'accesso non appena a conoscenza dell'illiceità del materiale (*Notice and Action*).
- **Artt. 11-12 DSA:** Istituzione di un punto di contatto unico dedicato per comunicazioni dirette con le Autorità e gli Utenti.

### 1.4 Diritto Civile e Tutela del Consumatore
- **D.lgs. 206/2005 (Codice del Consumo):** Tutela del foro inderogabile del consumatore (Art. 66-bis) e calibrazione delle clausole di manleva e limitazione di responsabilità (Art. 33).
- **Artt. 1341-1342 Codice Civile:** Identificazione e richiamo espresso delle clausole contrattuali standard onerose.

---

## 2. Architettura di Conformità Adottata (Scelte Strategiche)

Per garantire la massima efficacia operativa riducendo a zero l'esposizione al rischio sanzionatorio o risarcitorio, il sistema adotta le seguenti soluzioni:
              ┌───────────────────────────────────────────────┐
              │                 SITO WEB AGORÀ                │
              │  (Accesso senza account / Token crittografico) │
              └───────────────────────┬───────────────────────┘
                                      │
                    Selezione e Formattazione Grafica
                                      │
                                      ▼
              ┌───────────────────────────────────────────────┐
              │          PROFILI SOCIAL UFFICIALI (IG)        │
              │   (Storie, Post, Highlights "Persone Trovate")│
              └───────────────────────┬───────────────────────┘
                                      │
                    Interazione & Riscontro Utenti (DM)
                                      │
                                      ▼
              ┌───────────────────────────────────────────────┐
              │          NOTICE & TAKEDOWN PRIORITARIO        │
              │  (Rimozione tempestiva su richiesta = Tutela) │
              └───────────────────────────────────────────────┘

1. **Token Tecnici di Sicurezza:**  
   Non vengono raccolti dati biometrici o telemetria comportamentale non necessaria. Il riconoscimento anti-abuso e la validazione dei sondaggi si basano su token crittografici generati lato server e memorizzati localmente, qualificati come presidi tecnici essenziali esenti da banner di consenso bloccanti.
2. **Integrazione della Licenza Cross-Platform:**  
   I Termini d'Uso includono una licenza d'uso espressa e trasferibile che autorizza il Fornitore a trasformare i post del sito in grafiche per Instagram, gestire le "persone trovate" e archiviare i contenuti nelle Storie in Evidenza, con piena discrezionalità editoriale.
3. **Equilibrio Privacy:**  
   È permessa la ricerca di contatto amichevole e la condivisione di handle social in buona fede, vietando categoricamente il *doxxing*, la pubblicazione di numeri privati o l'esposizione dell'orientamento sessuale altrui (Art. 9 GDPR).
4. **Procedura di Rimozione Rapida (Rimedio Esclusivo):**  
   Chiunque sia menzionato può richiedere la rimozione immediata del tag o del post via DM su Instagram o via email. La cancellazione tempestiva costituisce adempimento esaustivo che estingue pretese risarcitorie ai sensi del DSA.

---

## 3. Checklist di Conformità Operativa (Pre-Lancio)

### 🔴 Priorità ALTA (Bloccanti prima di andare online)
- [ ] **Completamento Dati Titolare:** Compilare tutti i campi `[DA COMPILARE]` nei documenti (Nome/Società, Sede legale, CF/P.IVA, PEC, Email).
- [ ] **Attivazione Canale Segnalazioni / DSA:** Configurare un indirizzo email dedicato (es. `legal@theproject.world` o `moderazione@theproject.world`) indicato sia nei Termini sia nella Privacy Policy.
- [ ] **Informativa al Primo Accesso (UX/UI):** Inserire un banner o avviso visibile al primo accesso dell'utente:  
  *«Utilizzando Agorà accetti i [Termini e Condizioni](/terms) e confermi di aver letto l'[Informativa Privacy](/privacy). Piattaforma riservata a maggiori di 14 anni.»*
- [ ] **Collegamento nella Bio Instagram:** Inserire nel link in bio (o aggregatore link) il rimando permanente: *«Termini d'uso e Segnalazioni: agora.theproject.world/terms»*.
- [ ] **Data Processing Agreement (DPA):**  
  - Accettare online il DPA di **Google Cloud / Firebase** (disponibile nella Firebase Console).  
  - Accettare online il DPA di **Cloudflare** (Customer DPA accessibile dalla dashboard).  
  - Verificare che entrambi i fornitori mantengano attiva la certificazione **EU-U.S. Data Privacy Framework**.

### 🟡 Priorità MEDIA (Da finalizzare nelle prime settimane di esercizio)
- [ ] **Configurazione Regionale Database:** Impostare, ove possibile nelle impostazioni di Firebase/Firestore e Cloudflare, la preferenza di archiviazione dati primaria all'interno dell'Unione Europea (regione `europe-west`).
- [ ] **Registro dei Trattamenti (Art. 30 GDPR):** Formalizzare il file interno del Registro dei Trattamenti del Titolare, inserendo le categorie e le finalità descritte nella Privacy Policy.
- [ ] **SLA di Moderazione Instagram:** Definire la procedura operativa interna per gestire i messaggi diretti (DM) di richiesta rimozione entro un tempo congruo (es. lavorazione entro poche ore dalla notifica).

### 🟢 Priorità BASSA / Monitoraggio Continuativo
- [ ] **Verifica Periodica Certificazioni DPF:** Controllare a cadenza annuale il registro ufficiale statunitense (*dataprivacyframework.gov*) per confermare lo stato attivo di Google LLC e Cloudflare, Inc.
- [ ] **Monitoraggio Nuove Funzionalità:** Se in futuro verranno introdotti sistemi di account nominali con login, acquisti in-app o circuiti pubblicitari terzi, aggiornare tempestivamente i Termini e la Privacy Policy.

---

## 4. Fonti Giuridiche e Istituzionali Consultate

- **Garante per la Protezione dei Dati Personali:**  
  - *Linee guida cookie e altri strumenti di tracciamento* (10 giugno 2021, doc. web n. 9677876).  
  - *Sezione tematica e indirizzi su Minori e consenso digitale* (Art. 2-quinquies Codice Privacy).
- **European Data Protection Board (EDPB):**  
  - *Guidelines 2/2023 on the Technical Scope of Art. 5(3) of the ePrivacy Directive*.
- **Commissione Europea:**  
  - *Adequacy Decision on the EU-U.S. Data Privacy Framework* (C(2023) 4745 final del 10 luglio 2023).  
  - *Regolamento (UE) 2022/2065 sui Servizi Digitali (Digital Services Act)*.
- **Normativa Nazionale:**  
  - *D.lgs. 30 giugno 2003, n. 196 (Codice Privacy)* integrato con il *D.lgs. 101/2018*.  
  - *D.lgs. 6 settembre 2005, n. 206 (Codice del Consumo)*.
