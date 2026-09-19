/*
 * Spotted — la scheda del carosello, 1080x1350.
 *
 * E' il pezzo che pubblichi piu' spesso: uno spotted per scheda, fino a
 * venti in un carosello solo.
 *
 * Tutto misurato dal PDF di Canva. Due cose che il file originale non
 * poteva fare e qui si fanno da sole:
 *
 * - l'ateneo si scrive UNA volta e vale per tutte le schede (nel file
 *   originale sta in testa a ognuna, ed e' sempre lo stesso);
 * - la barra in cima segna la posizione nella fila, contata in
 *   automatico. Nei tuoi file sono venti rettangoli disegnati a mano, e
 *   ogni scheda ne ha uno acceso in piu': 9, 10, 11, 15, 16 nelle pagine
 *   che mi hai mandato. Contarli a mano e' l'unico modo per far uscire un
 *   carosello con due schede numero 7.
 */
import type { Modello } from "../tipi";
import { CARATTERE_TESTO, CREMA, INCHIOSTRO, barraCarosello, campoAteneo, firma, riga, testata } from "../marchio";

export const spottedCarosello: Modello = {
  id: "spotted-carosello",
  nome: "Spotted — carosello",
  descrizione: "Uno spotted per scheda: quando, dove, e il messaggio. La barra si numera da sola.",
  formato: "post",
  fondo: CREMA,
  multiplo: true,

  campi: [
    campoAteneo,
    { id: "quando", nome: "Quando", tipo: "testo", esempio: "30 maggio", gruppo: "Lo spotted" },
    { id: "dove", nome: "Dove", tipo: "testo", esempio: "Pegli", gruppo: "Lo spotted" },
    { id: "messaggio", nome: "Il messaggio", tipo: "paragrafo", esempio: "Gruppo di ragazzi in panda bianca", gruppo: "Lo spotted" },
  ],

  elementi: [
    barraCarosello,
    ...testata({ ateneo: 1.59, spotted: 9.34 }),
    ...riga(1, 24.09, 15.95, "calendario", "quando", 3.04),
    ...riga(2, 45.59, 15.95, "puntina", "dove", 3.04),
    // Il riquadro del messaggio arriva fino alla firma: e' lui a prendersi
    // i 90 pixel che il formato 3:4 aggiunge, invece di lasciarli come
    // buco in fondo. E' il campo che piu' spesso non ci sta.
    ...riga(3, 67.09, 56.2, "lente", "messaggio", 3.04),
    ...firma(),
  ],

  varianti: [
    { id: "crema", nome: "Crema" },
    {
      id: "inchiostro", nome: "Inchiostro", fondo: INCHIOSTRO,
      ritocchi: {
        ateneo: { colore: "#f2ecdf" },
        quando: { colore: "#f2ecdf" },
        dove: { colore: "#f2ecdf" },
        messaggio: { colore: "#f2ecdf" },
        riq1: { colore: "#2b2927" },
        riq2: { colore: "#2b2927" },
        riq3: { colore: "#2b2927" },
      },
    },
  ],
};
