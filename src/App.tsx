/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminGuard } from "./components/AdminGuard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const DashboardInfo = lazy(() => import("./pages/Dashboard"));
const VideoPresentation = lazy(() => import("./pages/Video"));
const Video2 = lazy(() => import("./pages/Video2"));

function DynamicBrand() {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
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

export default function App() {
  return (
    <ErrorBoundary>
      <DynamicBrand />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Home />} />
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
          <Route path="/:param1" element={<Home />} />
          <Route path="/:param1/:param2" element={<Home />} />
          <Route path="/:param1/:param2/:param3" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <AdminGuard>
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
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
