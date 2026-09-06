/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminGuard } from "./components/AdminGuard";
import { Portal } from "./components/Portal";
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
const Video2 = lazy(() => import("./pages/Video2"));

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
function introAlreadyPlayed() {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return sessionStorage.getItem(INTRO_KEY) === "1";
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
  const [playing, setPlaying] = useState(() => !introAlreadyPlayed());

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
      document.documentElement.classList.add("ag-booted");
      setPlaying(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (!playing) return null;
  return (
    <Portal
      open
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
