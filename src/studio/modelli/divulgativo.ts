/*
 * Post divulgativo, 1080x1350.
 *
 * Il caso che i pannelli esistenti non sanno fare: una fotografia
 * caricata da chi pubblica, con il testo sopra. La banda sfumata sotto al
 * titolo non e' decorazione — senza, un titolo chiaro su una fotografia
 * chiara diventa illeggibile, e il testo non e' controllabile perche'
 * l'immagine cambia a ogni post.
 */
import type { Modello } from "../tipi";

export const divulgativo: Modello = {
  id: "divulgativo",
  nome: "Divulgativo — post",
  descrizione: "Una fotografia, un titolo, un occhiello e la fonte.",
  formato: "ritratto",
  fondo: "#1c1b1a",

  campi: [
    { id: "foto", nome: "Fotografia", tipo: "immagine", gruppo: "Immagine" },
    { id: "scurisci", nome: "Scurisci la foto", tipo: "numero", predefinito: 35, min: 0, max: 80, passo: 5, gruppo: "Immagine" },
    { id: "occhiello", nome: "Occhiello", tipo: "testo", predefinito: "LO SAPEVI?", gruppo: "Testo" },
    { id: "titolo", nome: "Titolo", tipo: "paragrafo", esempio: "Il Politecnico ha una biblioteca aperta fino alle 23", gruppo: "Testo" },
    { id: "sottotitolo", nome: "Sottotitolo", tipo: "paragrafo", esempio: "Una riga di contesto, se serve", gruppo: "Testo" },
    { id: "fonte", nome: "Fonte", tipo: "testo", esempio: "polimi.it", gruppo: "Coda" },
    { id: "firma", nome: "Firma", tipo: "testo", predefinito: "@agora.polimi", gruppo: "Coda" },
  ],

  elementi: [
    { id: "foto", tipo: "immagine", campo: "foto", riquadro: { x: 0, y: 0, larghezza: 100, altezza: 100 }, riempimento: "cover" },
    // Il velo: scurisce la fotografia quanto serve a quello scatto. Quanto
    // non lo decide il modello — dipende da com'e' la foto — quindi e' un
    // campo, non un numero scritto qui.
    { id: "velo", tipo: "forma", riquadro: { x: 0, y: 0, larghezza: 100, altezza: 100 }, colore: "#0d0c0b", campoOpacita: "scurisci" },
    // La banda: trasparente in alto, piena in basso, cosi' la fotografia
    // si vede e il testo resta leggibile qualunque foto sia.
    {
      id: "banda", tipo: "forma",
      riquadro: { x: 0, y: 38, larghezza: 100, altezza: 62 },
      colore: "rgba(28,27,26,0)", sfumaA: "rgba(28,27,26,0.94)", angolo: 180,
    },
    { id: "bollo", tipo: "forma", riquadro: { x: 8, y: 60, larghezza: 13, altezza: 0.45 }, colore: "#dc5f00" },
    {
      id: "occhiello", tipo: "testo", campo: "occhiello",
      riquadro: { x: 8, y: 64, larghezza: 84, altezza: 3.4 },
      corpo: 1.7, peso: 800, colore: "#dc5f00", maiuscolo: true, spaziatura: 0.26, adatta: false,
    },
    {
      id: "titolo", tipo: "testo", campo: "titolo",
      riquadro: { x: 8, y: 69, larghezza: 84, altezza: 15 },
      corpo: 5.4, peso: 800, colore: "#ffffff", interlinea: 1.08,
    },
    {
      id: "sottotitolo", tipo: "testo", campo: "sottotitolo",
      riquadro: { x: 8, y: 85, larghezza: 84, altezza: 6 },
      corpo: 2.1, peso: 400, colore: "#cfc9c0", interlinea: 1.3, seCampo: "sottotitolo",
    },
    {
      id: "fonte", tipo: "testo", campo: "fonte",
      riquadro: { x: 8, y: 93.5, larghezza: 50, altezza: 3.5 },
      corpo: 1.4, peso: 500, colore: "#9b968e", seCampo: "fonte", adatta: false,
    },
    {
      id: "firma", tipo: "testo", campo: "firma",
      riquadro: { x: 58, y: 93.5, larghezza: 34, altezza: 3.5 },
      corpo: 1.4, peso: 700, colore: "#9b968e", allineamento: "right", adatta: false,
    },
  ],

  varianti: [
    { id: "scuro", nome: "Su scuro" },
    {
      id: "chiaro", nome: "Su chiaro",
      ritocchi: {
        velo: { colore: "#f3ece0" },
        banda: { colore: "rgba(243,236,224,0)", sfumaA: "rgba(243,236,224,0.96)" },
        titolo: { colore: "#1c1b1a" },
        sottotitolo: { colore: "#4a463f" },
        fonte: { colore: "#6b7280" },
        firma: { colore: "#6b7280" },
      },
    },
  ],
};
