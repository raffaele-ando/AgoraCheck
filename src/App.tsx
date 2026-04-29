/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/polimi" replace />} />
          <Route path="/polimi" element={<Home />} />
          <Route path="/polimi/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/polimi" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
