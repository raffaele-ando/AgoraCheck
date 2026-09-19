/*
 * Spotted — la storia, 1080x1920.
 *
 * Lo stesso spotted del carosello, in verticale pieno: la storia dura
 * ventiquattro ore e serve a portare la gente al carosello, quindi porta
 * anche il link. Non ha la barra — in una storia non c'e' una fila.
 *
 * Il riquadro del link e' facoltativo: senza indirizzo sparisce insieme
 * alla sua graffetta, invece di restare li' vuoto come nel file
 * originale.
 */
import type { Modello } from "../tipi";
import { CREMA, INCHIOSTRO, campoAteneo, firma, riga, testata } from "../marchio";

export const spottedStoria: Modello = {
  id: "spotted-storia",
  nome: "Spotted — storia",
  descrizione: "Lo spotted a tutta altezza, con il link al carosello.",
  formato: "storia",
  fondo: CREMA,

  campi: [
    campoAteneo,
    { id: "quando", nome: "Quando", tipo: "testo", esempio: "30 maggio", gruppo: "Lo spotted" },
    { id: "dove", nome: "Dove", tipo: "testo", esempio: "Pegli", gruppo: "Lo spotted" },
    { id: "messaggio", nome: "Il messaggio", tipo: "paragrafo", esempio: "Gruppo di ragazzi in panda bianca", gruppo: "Lo spotted" },
    { id: "link", nome: "Link (facoltativo)", tipo: "testo", esempio: "agora.theproject.world", gruppo: "Lo spotted" },
  ],

  elementi: [
    ...testata({ ateneo: 9.19, spotted: 16.94 }),
    ...riga(1, 30.22, 16.0, "calendario", "quando", 4.32),
    ...riga(2, 51.56, 16.0, "puntina", "dove", 4.32),
    ...riga(3, 72.89, 53.33, "lente", "messaggio", 4.32),
    ...riga(4, 131.56, 13.33, "graffetta", "link", 4.32, true),
    ...firma(),
  ],

  varianti: [
    { id: "crema", nome: "Crema" },
    {
      id: "inchiostro", nome: "Inchiostro", fondo: INCHIOSTRO,
      ritocchi: {
        ateneo: { colore: "#f2ecdf" }, quando: { colore: "#f2ecdf" },
        dove: { colore: "#f2ecdf" }, messaggio: { colore: "#f2ecdf" },
        link: { colore: "#f2ecdf" },
        riq1: { colore: "#2b2927" }, riq2: { colore: "#2b2927" },
        riq3: { colore: "#2b2927" }, riq4: { colore: "#2b2927" },
      },
    },
  ],
};
