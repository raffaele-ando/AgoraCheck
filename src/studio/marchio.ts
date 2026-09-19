/*
 * I pezzi fissi del marchio, scritti una volta sola.
 *
 * Erano ripetuti in ogni modello — gli stessi colori, la stessa testata,
 * la stessa firma in fondo — e un ritocco al marchio avrebbe voluto dire
 * ritoccare ogni file, cioe' dimenticarne uno.
 *
 * Tutti i numeri qui dentro sono misurati dal PDF di Canva, non presi a
 * occhio: vedi `strumenti/stacca-elementi.py` per rifare la misura.
 */
import type { Elemento } from "./tipi";

export const CREMA = "#f2ecdf";
export const RIQUADRO = "#e9dfd0";
export const ARANCIO = "#db5e00";
export const INCHIOSTRO = "#1c1b1a";

/** Il nome dell'ateneo: League Spartan Bold. */
export const CARATTERE_ATENEO = "League Spartan";
/**
 * La spaziatura fra le lettere del nome dell'ateneo.
 *
 * Non e' una scelta: e' misurata, e il numero e' negativo per una ragione
 * precisa. Nei tuoi post «POLIMI» e' alto 70 pixel e largo 295. Il League
 * Spartan libero, portato a maiuscole alte 70, viene largo 374: il taglio
 * usato da Canva e' quello del 2014, piu' stretto, mentre quello su
 * Google Fonts e' il ridisegno del 2020. La singola lettera si sovrappone
 * all'88%, quindi il carattere e' lo stesso; a differire sono le
 * proporzioni. -0.067 em e' cio' che rimette la larghezza a 295 tenendo
 * l'altezza a 70.
 */
export const SPAZIATURA_ATENEO = -0.04;

/** «Spotted»: Abril Fatface, corsivo. */
export const CARATTERE_SPOTTED = "Abril Fatface";
/** I testi correnti: Open Sans Bold. */
export const CARATTERE_TESTO = "Open Sans";

/**
 * La testata: il nome dell'ateneo e sotto «Spotted».
 *
 * Sono testo e non immagini. Nella prima versione avevo estratto undici
 * PNG, uno per ateneo: bastava aprire un Agora in una citta' nuova per
 * doverne fare un dodicesimo a mano. Con i caratteri veri — entrambi
 * liberi — la testata si scrive.
 */
export interface PostoTestata {
  /** Dove comincia la casella dell'ateneo, in percentuale dell'altezza. */
  ateneo: number;
  /** Dove comincia la casella di «Spotted». */
  spotted: number;
}

/**
 * La testata: il nome dell'ateneo e sotto «Spotted».
 *
 * Sono testo e non immagini. Nella prima versione avevo estratto undici
 * PNG, uno per ateneo: bastava aprire un Agora in una citta' nuova per
 * doverne fare un dodicesimo a mano. Con i caratteri veri — entrambi
 * liberi — la testata si scrive.
 *
 * I corpi sono fissi e misurati sull'inchiostro dei post veri: ateneo
 * alto 70 pixel su 1080, «Spotted» alto 45. Sono gli stessi nella storia
 * e nel carosello, quindi non dipendono dal formato: cambia solo a che
 * altezza comincia la testata, ed e' l'unico numero che questa funzione
 * chiede.
 */
export function testata(posto: PostoTestata): Elemento[] {
  return [
    {
      id: "ateneo", tipo: "testo", campo: "ateneo",
      riquadro: { x: 10, y: posto.ateneo, larghezza: 80, altezza: 9 },
      corpo: 9.74, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_ATENEO, spaziatura: SPAZIATURA_ATENEO,
      allineamento: "center", maiuscolo: true, adatta: true,
    },
    {
      id: "spotted", tipo: "testo", fisso: "Spotted",
      riquadro: { x: 10, y: posto.spotted, larghezza: 80, altezza: 5 },
      corpo: 4.31, peso: 400, colore: ARANCIO, corsivo: true,
      famiglia: CARATTERE_SPOTTED, allineamento: "center", adatta: false,
    },
  ];
}

/**
 * La firma in fondo: il marchio al centro e i tre pallini blu a sinistra.
 * Sta in ogni formato alla stessa altezza relativa.
 */
export function firma(y = 94.81): Elemento[] {
  /*
   * y = 94.81 e' misurato sull'INCHIOSTRO del file originale, non sul
   * riquadro dell'immagine. Nel PDF quel riquadro parte da 89.12 ed e'
   * alto il 15%, ma dentro c'e' un margine trasparente enorme: preso alla
   * lettera, il marchio finiva dentro il riquadro del messaggio. Le
   * immagini qui sono ritagliate sull'inchiostro, quindi il numero giusto
   * e' dove il nero comincia davvero — 1280 di 1350.
   */
  return [
    {
      id: "marchio", tipo: "immagine", fonte: "/studio/agora.png",
      riquadro: { x: 40.5, y, larghezza: 15.9, altezza: 3.34 },
      riempimento: "contain",
    },
    { id: "bollo1", tipo: "immagine", fonte: "/studio/pallini-blu-a.png", riquadro: { x: 2.28, y: y + 0.1, larghezza: 2.26, altezza: 1.87 }, riempimento: "contain" },
    { id: "bollo2", tipo: "immagine", fonte: "/studio/pallini-blu-b.png", riquadro: { x: 5.68, y: y + 0.1, larghezza: 2.26, altezza: 1.81 }, riempimento: "contain" },
    { id: "bollo3", tipo: "immagine", fonte: "/studio/pallini-blu-c.png", riquadro: { x: 3.98, y: y + 1.66, larghezza: 2.26, altezza: 1.81 }, riempimento: "contain" },
  ];
}

/**
 * Una riga: l'icona a sinistra, il riquadro col testo a destra.
 *
 * Il corpo e' un parametro e non un numero fisso perche' fra la scheda e
 * la storia cambia davvero: misurato sui post veri, 32.8 pixel nella
 * scheda e 46.7 nella storia. E' l'unica cosa della riga che cambia.
 */
export function riga(
  n: number,
  y: number,
  altezza: number,
  icona: string,
  campo: string,
  corpo: number,
  opzionale = false,
): Elemento[] {
  return [
    {
      id: `riq${n}`, tipo: "forma",
      riquadro: { x: 22.95, y, larghezza: 67.03, altezza },
      colore: RIQUADRO, raggio: 2.7,
    },
    {
      id: `ic${n}`, tipo: "immagine", fonte: `/studio/${icona}.png`,
      riquadro: { x: 8.8, y: y + 2.2, larghezza: 9.5, altezza: altezza * 0.6 },
      riempimento: "contain",
      ...(opzionale ? { seCampo: campo } : {}),
    },
    {
      id: campo, tipo: "testo", campo,
      riquadro: { x: 26, y: y + 3.2, larghezza: 60, altezza: altezza - 6 },
      corpo, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_TESTO, interlinea: 1.35,
      verticale: altezza < 20 ? "center" : "flex-start",
    },
  ];
}

/** La barra dell'avanzamento del carosello: venti segni, misurati. */
export const barraCarosello: Elemento = {
  id: "barra", tipo: "serie",
  riquadro: { x: 0, y: 12.23, larghezza: 100, altezza: 3.35 },
  quanti: 20, accesiDa: "indice", inizio: 3.03, passo: 4.72,
  acceso: { larghezza: 4.17, altezza: 100, colore: ARANCIO },
  spento: { larghezza: 4.17, altezza: 40, colore: ARANCIO },
};

/** L'ateneo: lo stesso per tutto il carosello, scritto una volta. */
export const campoAteneo = {
  id: "ateneo", nome: "Ateneo", tipo: "testo" as const,
  predefinito: "POLIMI", ambito: "progetto" as const, gruppo: "Il progetto",
  esempio: "POLIMI, BOCCONI, IULM…",
};
