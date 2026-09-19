/*
 * Spotted — la scheda del carosello, 1080x1350.
 *
 * Non e' disegnata a occhio sui tuoi post: e' MISURATA dal PDF di Canva.
 * Ogni numero qui sotto viene dal flusso di disegno del file originale,
 * gia' in percentuale del formato. I colori sono quelli veri letti dal
 * PDF, non quelli che sembravano giusti.
 *
 * Cosa cambia rispetto all'originale, e perche':
 *
 * - La barra in cima nel file di Canva sono venti rettangoli disegnati
 *   uno per uno, e cambiare "a che punto sei" vuol dire rifarla. Qui e'
 *   un elemento solo con un numero: quanti pallini sono accesi.
 * - Le emoji stanno come immagini e non come testo. Nel PDF sono
 *   caratteri Type3 — cioe' disegni travestiti da lettere — e un browser
 *   le renderebbe con le proprie, che sono diverse da quelle di Canva.
 * - «Spotted» e' un'immagine: nell'originale e' un carattere di Canva che
 *   non si puo' ridistribuire. Tanto quella parola non cambia mai.
 */
import type { Modello } from "../tipi";

const CREMA = "#f2ecdf";
const RIQUADRO = "#e9dfd0";
const ARANCIO = "#db5e00";
const INCHIOSTRO = "#1c1b1a";

export const spottedScheda: Modello = {
  id: "spotted-scheda",
  nome: "Spotted — scheda",
  descrizione: "La scheda del carosello: data, luogo e messaggio, con la barra di avanzamento.",
  formato: "ritratto",
  fondo: CREMA,
  multiplo: true,

  campi: [
    { id: "ateneo", nome: "Ateneo", tipo: "testo", predefinito: "POLIMI", gruppo: "Testata" },
    { id: "quando", nome: "Quando", tipo: "testo", esempio: "30 maggio", gruppo: "Scheda" },
    { id: "dove", nome: "Dove", tipo: "testo", esempio: "Pegli", gruppo: "Scheda" },
    { id: "messaggio", nome: "Il messaggio", tipo: "paragrafo", esempio: "Gruppo di ragazzi in panda bianca", gruppo: "Scheda" },
    {
      id: "avanzamento", nome: "Pallini accesi", tipo: "numero",
      predefinito: 9, min: 0, max: 20, passo: 1, gruppo: "Barra",
    },
  ],

  elementi: [
    /* --- la barra in cima: 20 segni, passo 4.72%, misurati --- */
    {
      id: "barra", tipo: "serie",
      riquadro: { x: 0, y: 12.23, larghezza: 100, altezza: 3.35 },
      quanti: 20, campoAccesi: "avanzamento", inizio: 3.03, passo: 4.72,
      acceso: { larghezza: 4.17, altezza: 100, colore: ARANCIO },
      spento: { larghezza: 4.17, altezza: 40, colore: ARANCIO },
    },

    /* --- la testata --- */
    {
      id: "ateneo", tipo: "testo", campo: "ateneo",
      riquadro: { x: 20, y: 1.76, larghezza: 60, altezza: 6.2 },
      corpo: 6.17, peso: 700, colore: INCHIOSTRO,
      famiglia: "League Spartan", allineamento: "center", adatta: true,
    },
    {
      id: "spotted", tipo: "immagine", fonte: "/studio/spotted.png",
      riquadro: { x: 42.18, y: 6.99, larghezza: 15.6, altezza: 3.9 },
      riempimento: "contain",
    },

    /* --- le tre righe: icona a sinistra, riquadro a destra --- */
    { id: "riq1", tipo: "forma", riquadro: { x: 22.95, y: 19.27, larghezza: 67.03, altezza: 12.76 }, colore: RIQUADRO, raggio: 2.7 },
    { id: "ic1", tipo: "immagine", fonte: "/studio/calendario.png", riquadro: { x: 8.8, y: 21.5, larghezza: 9.5, altezza: 7.6 }, riempimento: "contain" },
    {
      id: "quando", tipo: "testo", campo: "quando",
      riquadro: { x: 26, y: 22.5, larghezza: 60, altezza: 6.5 },
      corpo: 2.43, peso: 700, colore: INCHIOSTRO, famiglia: "Open Sans", verticale: "center",
    },

    { id: "riq2", tipo: "forma", riquadro: { x: 22.95, y: 36.47, larghezza: 67.03, altezza: 12.76 }, colore: RIQUADRO, raggio: 2.7 },
    { id: "ic2", tipo: "immagine", fonte: "/studio/puntina.png", riquadro: { x: 8.8, y: 38.7, larghezza: 9.5, altezza: 7.6 }, riempimento: "contain" },
    {
      id: "dove", tipo: "testo", campo: "dove",
      riquadro: { x: 26, y: 39.7, larghezza: 60, altezza: 6.5 },
      corpo: 2.43, peso: 700, colore: INCHIOSTRO, famiglia: "Open Sans", verticale: "center",
    },

    { id: "riq3", tipo: "forma", riquadro: { x: 22.95, y: 53.67, larghezza: 67.03, altezza: 38.33 }, colore: RIQUADRO, raggio: 2.7 },
    { id: "ic3", tipo: "immagine", fonte: "/studio/lente.png", riquadro: { x: 8.8, y: 55.9, larghezza: 9.5, altezza: 7.6 }, riempimento: "contain" },
    {
      id: "messaggio", tipo: "testo", campo: "messaggio",
      riquadro: { x: 26, y: 56.5, larghezza: 60, altezza: 32.5 },
      corpo: 2.43, peso: 700, colore: INCHIOSTRO, famiglia: "Open Sans", interlinea: 1.35,
    },

    /* --- la firma in fondo --- */
    { id: "firma", tipo: "immagine", fonte: "/studio/agora-parola-piccola.png", riquadro: { x: 40.53, y: 89.12, larghezza: 18.8, altezza: 15.04 }, riempimento: "contain" },
    { id: "bollo1", tipo: "immagine", fonte: "/studio/pallini-blu-a.png", riquadro: { x: 2.28, y: 94.91, larghezza: 2.26, altezza: 1.87 }, riempimento: "contain" },
    { id: "bollo2", tipo: "immagine", fonte: "/studio/pallini-blu-b.png", riquadro: { x: 5.68, y: 94.91, larghezza: 2.26, altezza: 1.81 }, riempimento: "contain" },
    { id: "bollo3", tipo: "immagine", fonte: "/studio/pallini-blu-c.png", riquadro: { x: 3.98, y: 96.47, larghezza: 2.26, altezza: 1.81 }, riempimento: "contain" },
  ],
};
