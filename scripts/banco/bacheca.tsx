/* La bacheca pubblica nel banco di prova: stessa finzione di Firebase. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Home from "../../src/pages/Home";
import "../../src/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  </StrictMode>,
);
