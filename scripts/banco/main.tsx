/*
 * L'ingresso del banco: la dashboard vera, il controllo d'accesso saltato,
 * i moduli Firebase sostituiti dalle finzioni (vedi vite.banco.config.ts).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import DashboardNext from "../../src/pages/DashboardNext";
import "../../src/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <DashboardNext />
    </MemoryRouter>
  </StrictMode>,
);
