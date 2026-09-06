# Agorà

La bacheca di quartiere: spotted, sondaggi e messaggi della propria zona, per
le università italiane. Il sito pubblico è una pagina sola; dietro `/dashboard`
c'è l'area riservata per moderare i messaggi e configurare l'app.

Applicazione React + TypeScript, compilata con Vite, dati su Firestore.

## Avvio

Serve Node.js.

```bash
npm install
npm run dev        # server di sviluppo
npm run lint       # controllo dei tipi
npm run build      # compilazione per la produzione
```

Le chiavi di Firebase hanno un valore predefinito pubblico in `src/firebase.ts`
— la configurazione web di Firebase non è un segreto, la protezione sono le
regole di sicurezza di Firestore — quindi il sito funziona senza impostare
nulla. Si possono comunque sovrascrivere con le variabili `VITE_FIREBASE_*`.

## Struttura

```
src/
  App.tsx              rotte e apertura del marchio all'avvio
  firebase.ts          inizializzazione di Firebase (database CON NOME, non "(default)")
  index.css            palette, tema chiaro/scuro, animazioni condivise

  components/
    ui/                pezzi riusabili senza dominio proprio
                       Logo, Portal (l'apertura del marchio), Squircle, ErrorBoundary
    board/             la bacheca pubblica
                       Board.tsx è la schermata che vedono tutti
    dashboard/         area riservata: moderazione, impostazioni, template storie

  data/                dati e accesso a Firestore, senza interfaccia
    locations.ts       città e atenei serviti, con i nomi come vanno mostrati
    settings.ts        configurazioni salvate: link WhatsApp, widget eventi

  pages/               una per rotta: Home, Dashboard, Video, VideoExport
  hooks/               hook React condivisi
  utils/               funzioni pure e accessi a basso livello
                       identity/profiling sono il riconoscimento del dispositivo

public/
  orbite/              Agorà Orbite, sito statico separato servito da /orbite/
  favicon.svg          marchio per la scheda del browser
  icon-maskable.svg    marchio per l'icona dell'applicazione (Android la maschera)
  icon-*.png           generati da icon-maskable.svg, vedi scripts/

scripts/               strumenti da eseguire a mano, non in compilazione
cloudflare/            worker per la persistenza dell'identificativo
legal/                 informativa privacy e condizioni d'uso
```

### Due regole che spiegano la disposizione

**I dati non dipendono da chi li mostra.** `data/` non importa niente da
`components/`. Prima i caricatori delle configurazioni stavano dentro la
schermata delle impostazioni, e la bacheca pubblica — che ha bisogno solo di
leggere i link di WhatsApp — si portava dietro l'intero pannello di
amministrazione: 35 kB di moduli e pulsanti scaricati da ogni visitatore.

**Il nome dice cosa c'è dentro, non da dove viene.** `NewTheme.tsx` era la
bacheca, `HeaderVariations.tsx` era l'elenco degli atenei, `Video2.tsx` era
l'esportazione del video: nomi rimasti da versioni precedenti che costringevano
ad aprire il file per sapere cosa fosse.

## Pubblicazione

Il sito si pubblica su GitHub Pages **solo da `main`**: l'ambiente
`github-pages` accetta il solo ramo predefinito, quindi da un ramo di lavoro la
compilazione riesce e la pubblicazione fallisce. Vedi
`.github/workflows/deploy-pages.yml`.
