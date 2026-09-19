/*
 * Carosello, 1080x1350, a piu' schede.
 *
 * `multiplo: true` e' l'unica differenza rispetto agli altri: la pagina
 * capisce da sola che deve tenere un elenco di valori invece di uno solo,
 * e che l'esportazione produce N file numerati nell'ordine giusto.
 * La struttura resta una sola, come dev'essere in un carosello.
 */
import type { Modello } from "../tipi";

export const carosello: Modello = {
  id: "carosello",
  nome: "Carosello — schede",
  descrizione: "Piu' schede con la stessa struttura: numero, titolo, testo.",
  formato: "ritratto",
  fondo: "#f3ece0",
  multiplo: true,

  campi: [
    { id: "numero", nome: "Numero", tipo: "testo", esempio: "01", gruppo: "Scheda" },
    { id: "titolo", nome: "Titolo", tipo: "paragrafo", esempio: "Il titolo della scheda", gruppo: "Scheda" },
    { id: "testo", nome: "Testo", tipo: "paragrafo", esempio: "Il corpo della scheda, quanto serve.", gruppo: "Scheda" },
    { id: "foto", nome: "Immagine (facoltativa)", tipo: "immagine", gruppo: "Scheda" },
    { id: "coda", nome: "Scritta in fondo", tipo: "testo", predefinito: "Scorri →", gruppo: "Scheda" },
  ],

  elementi: [
    { id: "barra", tipo: "forma", riquadro: { x: 0, y: 0, larghezza: 100, altezza: 1 }, colore: "#dc5f00" },
    { id: "foto", tipo: "immagine", campo: "foto", riquadro: { x: 8, y: 8, larghezza: 84, altezza: 34 }, riempimento: "cover", raggio: 3, seCampo: "foto" },
    {
      id: "numero", tipo: "testo", campo: "numero",
      riquadro: { x: 8, y: 46, larghezza: 20, altezza: 5 },
      corpo: 3.2, peso: 800, colore: "#dc5f00", adatta: false,
    },
    {
      id: "titolo", tipo: "testo", campo: "titolo",
      riquadro: { x: 8, y: 53, larghezza: 84, altezza: 14 },
      corpo: 4.6, peso: 800, colore: "#1c1b1a", interlinea: 1.08,
    },
    {
      id: "testo", tipo: "testo", campo: "testo",
      riquadro: { x: 8, y: 69, larghezza: 84, altezza: 20 },
      corpo: 2.2, peso: 400, colore: "#4a463f", interlinea: 1.38,
    },
    {
      id: "coda", tipo: "testo", campo: "coda",
      riquadro: { x: 8, y: 93, larghezza: 84, altezza: 4 },
      corpo: 1.5, peso: 700, colore: "#9b968e", maiuscolo: true, spaziatura: 0.2, adatta: false,
    },
  ],

  varianti: [
    { id: "crema", nome: "Crema" },
    {
      id: "inchiostro", nome: "Inchiostro", fondo: "#1c1b1a",
      ritocchi: { titolo: { colore: "#ffffff" }, testo: { colore: "#cfc9c0" }, coda: { colore: "#6b6660" } },
    },
  ],
};
