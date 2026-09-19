/*
 * «Hai visto qualcuno?» — la storia che chiede di mandare uno spotted.
 *
 * E' il post che alimenta tutto il resto: senza messaggi in arrivo non ci
 * sono spotted da pubblicare. Nei tuoi file esiste in cinque copie, una
 * per ateneo, identiche tranne la testata — che qui e' un campo.
 */
import type { Modello } from "../tipi";
import { ARANCIO, CARATTERE_TESTO, CREMA, INCHIOSTRO, RIQUADRO, campoAteneo, firma, testata } from "../marchio";

export const invito: Modello = {
  id: "invito",
  nome: "Invito a mandare uno spotted",
  descrizione: "La storia che chiede i messaggi. Cambia solo l'ateneo.",
  formato: "storia",
  fondo: CREMA,

  campi: [
    campoAteneo,
    { id: "domanda", nome: "La domanda", tipo: "paragrafo", predefinito: "Hai visto qualcuno e\nvuoi sapere chi è?", gruppo: "Testo" },
    { id: "invito", nome: "L'invito", tipo: "testo", predefinito: "Inviaci il tuo spotted!", gruppo: "Testo" },
  ],

  elementi: [
    ...testata({ ateneo: 9.19, spotted: 16.94 }),
    { id: "lente", tipo: "immagine", fonte: "/studio/lente.png", riquadro: { x: 43.0, y: 42.13, larghezza: 13.9, altezza: 13.87 }, riempimento: "contain" },
    { id: "riq", tipo: "forma", riquadro: { x: 10, y: 61.33, larghezza: 80, altezza: 27.56 }, colore: RIQUADRO, raggio: 2.7 },
    {
      id: "domanda", tipo: "testo", campo: "domanda",
      riquadro: { x: 14, y: 63.47, larghezza: 72, altezza: 12.44 },
      corpo: 4.32, peso: 700, colore: INCHIOSTRO, famiglia: CARATTERE_TESTO,
      allineamento: "center", interlinea: 1.4,
    },
    {
      id: "invito", tipo: "testo", campo: "invito",
      riquadro: { x: 14, y: 80.71, larghezza: 72, altezza: 7.11 },
      corpo: 4.32, peso: 700, colore: ARANCIO, famiglia: CARATTERE_TESTO,
      allineamento: "center", adatta: false,
    },
    ...firma(),
  ],
};
