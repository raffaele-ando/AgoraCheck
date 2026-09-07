/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AdminGuard } from "./components/dashboard/AdminGuard";
import { Portal } from "./components/ui/Portal";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Home torna a essere un import statico.
//
// L'avevo resa differita per alleggerire /dashboard, ma il prezzo lo pagava
// la pagina che vedono TUTTI: la bacheca si apriva su una rotella di
// caricamento, perché il suo codice partiva solo dopo il primo disegno. Un
// segnaposto sulla pagina d'ingresso è il peggior posto dove risparmiare
// qualche decina di kB: chi arriva vede un'attesa invece del sito.
//
// Il guadagno su /dashboard si è comunque quasi tutto conservato per altre
// vie — la libreria di animazione e Analytics restano in blocchi separati.
import Home from "./pages/Home";
const DashboardInfo = lazy(() => import("./pages/Dashboard"));
const VideoPresentation = lazy(() => import("./pages/Video"));
const Video2 = lazy(() => import("./pages/VideoExport"));

function DynamicBrand() {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
        // index.html porta già una favicon SVG valida, quindi questa lettura
        // non serve a mostrare qualcosa: serve solo a sostituirla con quella
        // eventualmente caricata dalle impostazioni. Partiva però insieme a
        // tutto il resto, contendendo la connessione a Firestore con
        // l'autenticazione e con i messaggi — un giro di rete speso, sul
        // percorso critico, per un'icona da 16 pixel.
        //
        // Ora si aspetta che il browser sia inattivo. L'icona cambia qualche
        // istante più tardi e nessuno se ne accorge.
        await new Promise<void>((resolve) => {
          if (typeof requestIdleCallback === "function") {
            requestIdleCallback(() => resolve(), { timeout: 4000 });
          } else {
            setTimeout(resolve, 2000);
          }
        });
        const logoDoc = await getDoc(doc(db, "logos", "favicon"));
        if (logoDoc.exists() && logoDoc.data()?.dataUrl) {
          const faviconDataUrl = logoDoc.data().dataUrl;
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = faviconDataUrl;
        }
      } catch (err) {
        console.error("Error loading favicon", err);
      }
    };
    loadFavicon();
  }, []);
  return null;
}

/*
  Attesa fra una rotta e l'altra: una superficie vuota, non una rotella.

  La rotella che gira è stata tolta ovunque. Non comunica niente — nessuno sa
  quanto durerà — e sulle attese brevi, che sono la norma qui perché i blocchi
  sono già precaricati, lampeggia per un istante e infastidisce e basta. Un
  fondo del colore giusto è invisibile quando l'attesa è breve, che è come
  deve essere; quando è lunga, davanti c'è l'apertura del marchio.
*/
function RouteFallback() {
  return <div className="min-h-screen bg-[var(--ag-bg)]" />;
}

/** L'apertura è già stata mostrata in questa scheda? */
const INTRO_KEY = "agora_intro";
function reducedMotion() {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
function introAlreadyPlayed() {
  try {
    if (reducedMotion()) return true;
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Si è arrivati qui col tasto "indietro" (o "avanti")?
 *
 * Serve a dare un'animazione anche al ritorno: si torna da Orbite e la porta
 * si riapre sulla bacheca, come all'andata. Senza, il ritorno era l'unico
 * passaggio secco rimasto fra i due siti.
 *
 * Il tipo di navigazione è quello dichiarato dal browser; quando la pagina
 * viene invece ripescata dalla memoria (bfcache) non c'è nessuna navigazione
 * da leggere e se ne accorge l'evento pageshow, gestito più sotto.
 */
function cameFromHistory() {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return nav?.type === "back_forward";
  } catch {
    return false;
  }
}

/**
 * L'apertura del marchio al posto del caricamento iniziale.
 *
 * La copertura d'inchiostro esiste già dal primo fotogramma (vedi #ag-boot in
 * index.html); questo componente ci disegna sopra gli archi che si compongono
 * e poi aprono la porta sul sito. Una volta sola per scheda: rivederla a ogni
 * navigazione interna sarebbe un pedaggio, non un benvenuto.
 */
function BootIntro() {
  const [playing, setPlaying] = useState(
    () => !introAlreadyPlayed() || cameFromHistory(),
  );
  /**
   * Si parte dal marchio già composto quando si arriva dalla cronologia.
   *
   * Tornando indietro da Orbite, la crescita degli archi è già stata vista
   * andando: rifarla sarebbe la stessa animazione due volte. Resta la sola
   * apertura, che è il movimento che racconta "sei rientrato".
   */
  const [composed] = useState(() => cameFromHistory());
  /**
   * L'animazione non parte finché l'app non ha finito di avviarsi.
   *
   * È la correzione che toglie gli scatti, e non è un'ottimizzazione
   * dell'animazione: misurando gli intervalli fra un fotogramma e l'altro,
   * la mediana era 17 ms — perfettamente fluida — ma in mezzo c'era un blocco
   * isolato da 250 ms. Quel quarto di secondo è React che monta, Firebase che
   * si inizializza e Firestore che apre la connessione: lavoro che occupa il
   * filo principale e che stava girando PROPRIO durante l'animazione.
   *
   * Non c'è motivo di sovrapporli. Lo schermo è già coperto d'inchiostro dal
   * primo fotogramma (#ag-boot in index.html), quindi far aspettare l'apertura
   * non si vede: si vede solo che, quando parte, parte liscia.
   *
   * Il tetto serve perché su una connessione pessima l'avvio può non
   * concludersi mai: passato quel tempo si parte comunque.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let done = false;
    let handle = 0;
    const go = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    // Non basta UN momento di quiete: il primo arriva appena c'è una pausa fra
    // un pezzo di lavoro e il successivo, non quando il lavoro è finito.
    // Misurato, l'animazione partiva mentre la bacheca stava ancora montando i
    // suoi riquadri, e le attività lunghe che ne seguivano diventavano scatti.
    //
    // Si aspettano quindi DUE finestre di quiete consecutive e larghe: due
    // pause di seguito con tempo libero davanti significano che la coda si è
    // davvero svuotata. Il conteggio riparte da zero appena una finestra
    // risulta stretta o scaduta.
    //
    // Al RITORNO da Orbite l'attesa è però molto più corta: là c'è solo la
    // posa e l'apertura, mezzo movimento invece di uno intero, e chi ha
    // premuto "indietro" vuole rientrare, non guardare. Due secondi di
    // inchiostro prima ancora che l'animazione cominci sono un'attesa, non
    // una presentazione: basta una finestra di quiete e un tetto breve.
    const needCalm = composed ? 1 : 2;
    let calm = 0;
    const waitCalm = () => {
      if (done) return;
      if (typeof requestIdleCallback !== "function") {
        handle = setTimeout(go, composed ? 120 : 400) as unknown as number;
        return;
      }
      handle = requestIdleCallback(
        (dl) => {
          calm = !dl.didTimeout && dl.timeRemaining() > 8 ? calm + 1 : 0;
          if (calm >= needCalm) go();
          else waitCalm();
        },
        { timeout: 300 },
      );
    };

    // Tetto assoluto: su una rete o un telefono molto lenti la quiete potrebbe
    // non arrivare mai, e la copertura non può restare all'infinito.
    const cap = setTimeout(go, composed ? 700 : 2000);
    waitCalm();

    return () => {
      clearTimeout(cap);
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, [playing, composed]);

  const finish = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* archiviazione bloccata: si rivedrà, non è un danno */
    }
    document.documentElement.classList.add("ag-booted");
    setPlaying(false);
  };

  // Rete di sicurezza: se l'animazione non arrivasse in fondo (scheda in
  // secondo piano, quindi nessun fotogramma) la copertura resterebbe sullo
  // schermo e il sito sarebbe inutilizzabile. Meglio scoprirlo comunque.
  useEffect(() => {
    if (!playing) {
      document.documentElement.classList.add("ag-booted");
      return;
    }
    const t = setTimeout(finish, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Ritorno col tasto "indietro": il browser ripresenta la pagina congelata,
  // ma i timer e l'animazione non ripartono. Senza questo, tornando indietro
  // si potrebbe restare sotto la copertura d'avvio senza via d'uscita.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      // Ritorno dalla MEMORIA del browser: la pagina ricompare istantanea,
      // già disegnata, senza ricaricare nulla. Qui NON si anima: coprire con
      // l'inchiostro una schermata che è già sotto gli occhi, per poi
      // scoprirla, sarebbe un lampo aggiunto a un passaggio che era già
      // immediato. L'apertura al ritorno vale per il caso in cui la pagina si
      // ricarica davvero, gestito da cameFromHistory().
      document.documentElement.classList.add("ag-booted");
      setPlaying(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (!playing) return null;
  // Finché non si è pronti resta soltanto la copertura d'inchiostro statica.
  if (!ready) return null;
  return (
    <Portal
      open
      startComposed={composed}
      // La copertura statica di index.html va tolta appena il velo del portale
      // copre lo schermo. Restava invece fino alla fine dell'animazione, e
      // siccome sta SOTTO il portale, il vano della porta si apriva su altro
      // inchiostro anziché sulla pagina: è il motivo per cui la porta finale
      // non era trasparente come in Orbite.
      onVeiled={() => document.documentElement.classList.add("ag-booted")}
      onDone={finish}
    />
  );
}

export default function App() {
  // Home serve quattro rotte diverse (la bacheca e le sue scorciatoie con
  // parametri): l'elemento è lo stesso, quindi si costruisce una volta sola.
  // Nessun Suspense: l'import è statico, non c'è nulla da attendere.
  const homeRoute = <Home />;

  return (
    <ErrorBoundary>
      {/* Sopra ogni cosa finché la porta non si è aperta. */}
      <BootIntro />
      <DynamicBrand />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={homeRoute} />
          <Route path="/video" element={
            <Suspense fallback={<div className="min-h-screen bg-black" />}>
              <VideoPresentation />
            </Suspense>
          } />
          <Route path="/video2" element={
            <Suspense fallback={<div className="min-h-screen bg-black" />}>
              <Video2 />
            </Suspense>
          } />
          <Route path="/:param1" element={homeRoute} />
          <Route path="/:param1/:param2" element={homeRoute} />
          <Route path="/:param1/:param2/:param3" element={homeRoute} />
          <Route
            path="/dashboard"
            element={
              <AdminGuard>
                {/* Il blocco della Dashboard è già stato precaricato dal
                    controllo d'accesso, quindi qui non c'è quasi mai nulla da
                    attendere: una superficie del colore giusto passa
                    inosservata, una rotella no. */}
                <Suspense fallback={<RouteFallback />}>
                  <DashboardInfo />
                </Suspense>
              </AdminGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
