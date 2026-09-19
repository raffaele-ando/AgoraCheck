/*
 * «Entra nel gruppo WhatsApp» — la storia che porta la gente nel gruppo.
 *
 * Nel tuo file l'icona di WhatsApp e' un'immagine sopra un quadrato nero
 * che non si vede: e' la sagoma dietro, che serviva a Canva e non al
 * disegno. Qui c'e' solo l'icona.
 */
import type { Modello } from "../tipi";
import { ARANCIO, CARATTERE_TESTO, CREMA, INCHIOSTRO, RIQUADRO, campoAteneo, firma, testata } from "../marchio";

export const gruppo: Modello = {
  id: "gruppo",
  nome: "Gruppo WhatsApp",
  descrizione: "La storia che porta al gruppo. Cambia solo l'ateneo.",
  formato: "storia",
  fondo: CREMA,

  campi: [
    campoAteneo,
    { id: "occhiello", nome: "Occhiello", tipo: "testo", predefinito: "SPOTTED, eventi ed altro.", gruppo: "Testo" },
    { id: "invito", nome: "L'invito", tipo: "testo", predefinito: "Entra nel Gruppo Whatsapp!", gruppo: "Testo" },
  ],

  elementi: [
    ...testata({ ateneo: 9.19, spotted: 16.94 }),
    { id: "icona", tipo: "immagine", fonte: "/studio/whatsapp.png", riquadro: { x: 43.4, y: 31.64, larghezza: 13.2, altezza: 13.16 }, riempimento: "contain" },
    { id: "riq", tipo: "forma", riquadro: { x: 16.5, y: 50.67, larghezza: 67, altezza: 17.78 }, colore: RIQUADRO, raggio: 2.7 },
    {
      id: "occhiello", tipo: "testo", campo: "occhiello",
      riquadro: { x: 19, y: 53.33, larghezza: 62, altezza: 6.04 },
      corpo: 3.73, peso: 700, colore: ARANCIO, famiglia: CARATTERE_TESTO,
      allineamento: "center", adatta: false,
    },
    {
      id: "invito", tipo: "testo", campo: "invito",
      riquadro: { x: 19, y: 59.73, larghezza: 62, altezza: 6.4 },
      corpo: 3.73, peso: 700, colore: INCHIOSTRO, famiglia: CARATTERE_TESTO,
      allineamento: "center", adatta: false,
    },
    ...firma(),
  ],
};
