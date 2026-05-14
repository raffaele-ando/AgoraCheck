/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminGuard } from "./components/AdminGuard";

const DashboardInfo = lazy(() => import("./pages/Dashboard"));

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
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
