/*
 * Spotted, storia 1080x1920.
 *
 * Il caso piu' semplice: solo testo su un fondo pieno, piu' tre varianti
 * di colore. Le varianti esistono per non avere tre modelli identici in
 * elenco — era il problema da cui siamo partiti.
 */
import type { Modello } from "../tipi";

export const spottedStoria: Modello = {
  id: "spotted-storia",
  nome: "Spotted — storia",
  descrizione: "Il messaggio su fondo pieno, con zona e data. Tre colori.",
  formato: "storia",
  fondo: "#f3ece0",

  campi: [
    { id: "occhiello", nome: "Occhiello", tipo: "testo", predefinito: "SPOTTED", gruppo: "Testo" },
    { id: "messaggio", nome: "Il messaggio", tipo: "paragrafo", esempio: "Cerco la ragazza con la sciarpa rossa alla 7…", gruppo: "Testo" },
    { id: "zona", nome: "Zona", tipo: "testo", esempio: "Politecnico — Leonardo", gruppo: "Coda" },
    { id: "quando", nome: "Quando", tipo: "testo", esempio: "Martedì mattina", gruppo: "Coda" },
    { id: "firma", nome: "Firma in fondo", tipo: "testo", predefinito: "@agora.polimi", gruppo: "Coda" },
  ],

  elementi: [
    { id: "barra", tipo: "forma", riquadro: { x: 0, y: 0, larghezza: 100, altezza: 1.2 }, colore: "#dc5f00" },
    {
      id: "occhiello", tipo: "testo", campo: "occhiello",
      riquadro: { x: 9, y: 9, larghezza: 82, altezza: 4 },
      corpo: 1.5, peso: 800, colore: "#dc5f00", maiuscolo: true, spaziatura: 0.28, adatta: false,
    },
    {
      id: "messaggio", tipo: "testo", campo: "messaggio",
      riquadro: { x: 9, y: 17, larghezza: 82, altezza: 46 },
      corpo: 5.6, peso: 700, colore: "#2c2c2c", interlinea: 1.15, verticale: "flex-start",
    },
    { id: "filo", tipo: "forma", riquadro: { x: 9, y: 70, larghezza: 18, altezza: 0.35 }, colore: "#d9cdb8", seCampo: "zona" },
    {
      id: "zona", tipo: "testo", campo: "zona",
      riquadro: { x: 9, y: 74, larghezza: 82, altezza: 5 },
      corpo: 2.2, peso: 700, colore: "#2c2c2c", seCampo: "zona",
    },
    {
      id: "quando", tipo: "testo", campo: "quando",
      riquadro: { x: 9, y: 79.5, larghezza: 82, altezza: 5 },
      corpo: 2.2, peso: 500, colore: "#6b7280", seCampo: "quando",
    },
    {
      id: "firma", tipo: "testo", campo: "firma",
      riquadro: { x: 9, y: 91, larghezza: 82, altezza: 4 },
      corpo: 1.4, peso: 600, colore: "#6b7280", maiuscolo: true, spaziatura: 0.18, adatta: false,
    },
  ],

  varianti: [
    { id: "crema", nome: "Crema" },
    {
      id: "inchiostro", nome: "Inchiostro", fondo: "#1c1b1a",
      ritocchi: {
        messaggio: { colore: "#f3ece0" },
        zona: { colore: "#f3ece0" },
        quando: { colore: "#9b968e" },
        firma: { colore: "#9b968e" },
        filo: { colore: "#3a3835" },
      },
    },
    {
      id: "arancio", nome: "Arancio", fondo: "#dc5f00",
      ritocchi: {
        barra: { colore: "#1c1b1a" },
        occhiello: { colore: "#1c1b1a" },
        messaggio: { colore: "#ffffff" },
        zona: { colore: "#ffffff" },
        quando: { colore: "#ffe0c8" },
        firma: { colore: "#ffe0c8" },
        filo: { colore: "#b94f00" },
      },
    },
  ],
};
