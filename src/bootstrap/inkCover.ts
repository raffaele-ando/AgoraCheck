/**
 * Decide, PRIMA che React esista, se la copertura d'inchiostro resta o sparisce.
 *
 * Deve girare al primo fotogramma: per questo non è un modulo importato da
 * main.tsx, ma un file compilato a parte e iniettato dentro index.html (vedi
 * il plugin in vite.config.ts, stessa tecnica usata per l'apertura di Orbite).
 * Se aspettasse il bundle dell'applicazione, lo schermo resterebbe scoperto
 * esattamente nell'istante che deve coprire.
 *
 * Il tasto "indietro" NON è un caso speciale: si torna e basta. L'avevo tenuto
 * come eccezione per poterci disegnare sopra l'apertura della porta, ma non
 * funziona per come il browser gestisce la navigazione: premendo indietro
 * mostra per primo il PROPRIO ritratto della pagina di destinazione, che ha
 * già in memoria, e solo dopo lascia spazio al documento vero. Qualunque cosa
 * disegniamo noi arriva dopo quel ritratto — si vedeva la bacheca, poi il
 * nero, poi l'animazione. Non è un difetto di sincronia da aggiustare: è
 * l'ordine imposto dal browser, e contro quello si perde sempre.
 *
 * Indietro vuol dire "torna com'era", e com'era è già sullo schermo: la cosa
 * giusta è arrivarci subito, senza interruzioni.
 */
import { INTRO_KEY } from "../brand/introKey";

try {
  if (
    sessionStorage.getItem(INTRO_KEY) === "1" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.documentElement.className += " ag-booted";
  }
} catch {
  /* archiviazione bloccata: si mostra l'apertura, non è un danno */
}
