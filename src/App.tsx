/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminGuard } from "./components/AdminGuard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Home era un import statico, quindi finiva nel blocco iniziale insieme a
// tutta la libreria di animazione e al codice di raccolta dei dati: chi
// apriva /dashboard scaricava per intero la bacheca pubblica prima di poter
// vedere la schermata d'accesso. Ora ogni rotta porta solo il proprio peso.
const Home = lazy(() => import("./pages/Home"));
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

/* Attesa fra una rotta e l'altra, nei colori della palette: prima il
   segnaposto era crema fisso e in tema scuro faceva lampeggiare la pagina. */
function RouteSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ag-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--ag-accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function App() {
  // Home serve quattro rotte diverse (la bacheca e le sue scorciatoie con
  // parametri): l'elemento è lo stesso, quindi si costruisce una volta sola.
  const homeRoute = (
    <Suspense fallback={<RouteSpinner />}>
      <Home />
    </Suspense>
  );

  return (
    <ErrorBoundary>
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
                <Suspense
                  fallback={
                    // Il fondo era fissato al crema del tema chiaro e la
                    // rotella al nero: in tema scuro l'attesa era un lampo
                    // bianco fra due schermate scure. Ora entrambi seguono
                    // le variabili della palette.
                    <div className="min-h-screen flex items-center justify-center bg-[var(--ag-bg)]">
                      <div className="w-8 h-8 border-4 border-[var(--ag-accent)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  }
                >
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
