/* Lo Studio sul banco di prova: senza Firebase e senza accesso. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Studio from "../../src/pages/Studio";
import "../../src/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Studio />
    </BrowserRouter>
  </StrictMode>,
);
