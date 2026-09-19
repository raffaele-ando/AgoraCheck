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
/** Le etichette di sezione: Archivo Black. Vedi SISTEMA.md, punto 6. */
export const CARATTERE_ETICHETTA = "Archivo Black";

/* --- I cinque corpi del sistema, in percentuale della larghezza --- */
export const CORPO_ATENEO = 9.74;
export const CORPO_SPOTTED = 4.31;
export const CORPO_ETICHETTA = 4.8;
export const CORPO_TESTO = 4.32;
export const CORPO_MINORE = 3.76;

/* --- La griglia, misurata. Vedi SISTEMA.md, punto 1. --- */
/** Dove comincia la colonna delle icone. */
export const COLONNA_ICONE = 10;
/** Quanto sono larghe le icone. */
export const LARGHEZZA_ICONA = 9;
/*
 * Le quattro larghezze di riquadro del sistema, misurate su tutte le
 * pagine. Vedi SISTEMA.md, punto 1.
 */
/** Con l'icona nella colonna di sinistra: il caso normale. */
export const RIQUADRI_X = 22.95;
export const RIQUADRI_LARGHEZZA = 67.05;
/** A tutta larghezza, senza colonna: quando non c'e' un'icona. */
export const PIENO_X = 10;
export const PIENO_LARGHEZZA = 80;
/** Due mezze affiancate: l'icona ci sta SOPRA, non a sinistra. */
export const MEZZA_LARGHEZZA = 36.72;
export const MEZZA_SINISTRA = 9.9;
export const MEZZA_DESTRA = 53.28;
/** L'altezza di una riga normale. */
export const RIGA_ALTEZZA = 22.7;
/** Lo spazio fra una riga e la successiva. */
/**
 * Lo spazio fra una riga e la successiva: 60 pixel.
 *
 * Misurato sul carosello — le righe cominciano ogni 232 pixel e sono alte
 * 172 — non dedotto da una percentuale. Avevo scritto 7.9 convertendo
 * male dal formato storia, dove quel numero non l'avevo mai misurato.
 */
export const SPAZIO = 5.56;

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
      riquadro: { x: 10, y: posto.ateneo, larghezza: 80, altezza: 11.25 },
      corpo: 9.74, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_ATENEO, spaziatura: SPAZIATURA_ATENEO,
      allineamento: "center", maiuscolo: true, adatta: true,
    },
    {
      id: "spotted", tipo: "testo", fisso: "Spotted",
      riquadro: { x: 10, y: posto.spotted, larghezza: 80, altezza: 6.25 },
      corpo: 4.31, peso: 400, colore: ARANCIO, corsivo: true,
      famiglia: CARATTERE_SPOTTED, allineamento: "center", adatta: false,
    },
  ];
}

/**
 * L'altra testata: il nome dell'ateneo e sotto il marchio AGORÀ.
 *
 * Non e' una variante grafica della prima, e' l'altra voce della pagina.
 * «ATENEO Spotted» vuol dire «questo l'ha mandato qualcuno»; «ATENEO
 * AGORÀ» vuol dire «questo lo diciamo noi». Usare la prima per un post
 * divulgativo lo fa sembrare uno spotted.
 *
 * Le proporzioni sono misurate sui fogli da 3000x3750: il marchio e'
 * alto 0.619 volte le maiuscole del nome, e sta 0.051 volte piu' sotto.
 */
export function testataAgora(y: number, corpo = CORPO_ATENEO): Elemento[] {
  const capPc = corpo * 0.661; // le maiuscole di League Spartan
  return [
    {
      id: "ateneo", tipo: "testo", campo: "ateneo",
      riquadro: { x: 10, y, larghezza: 80, altezza: corpo * 1.25 },
      corpo, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_ATENEO, spaziatura: SPAZIATURA_ATENEO,
      allineamento: "center", maiuscolo: true, adatta: true,
    },
    {
      id: "marchio-testata", tipo: "immagine", fonte: "/studio/agora.png",
      riquadro: {
        x: 50 - (capPc * 0.619 * (2292 / 712)) / 2,
        y: y + corpo * 1.1,
        larghezza: capPc * 0.619 * (2292 / 712),
        altezza: capPc * 0.619,
      },
      riempimento: "contain",
    },
  ];
}

/**
 * Un'etichetta di sezione: l'icona e la parola, nella colonna di
 * sinistra. Vedi SISTEMA.md, punto 6 — non e' un titolo sopra al
 * contenuto, e' un segnale a margine.
 */
export function etichetta(
  id: string,
  y: number,
  icona: string,
  testo: { fisso: string } | { campo: string },
): Elemento[] {
  // La parola sta SOPRA e l'icona sotto, non affiancate: misurato sulla
  // pagina dei risultati, dove «RISULTATI» e' a 52.55 e il bersaglio a
  // 55.70. Cosi' l'etichetta si legge in fila col resto e il segno resta
  // nella colonna delle icone, accanto a cio' che annuncia.
  return [
    {
      id, tipo: "testo", ...testo,
      riquadro: { x: COLONNA_ICONE - 0.1, y, larghezza: 50, altezza: 5 },
      corpo: CORPO_ETICHETTA, peso: 400, colore: ARANCIO,
      famiglia: CARATTERE_ETICHETTA, maiuscolo: true, adatta: false,
    },
    {
      id: `${id}-ic`, tipo: "immagine", fonte: `/studio/${icona}.png`,
      riquadro: { x: COLONNA_ICONE - 0.1, y: y + 5.6, larghezza: 9.6, altezza: 9.6 },
      riempimento: "contain",
    },
  ];
}

/**
 * La firma in fondo: il marchio al centro e i tre pallini blu a sinistra.
 * Sta in ogni formato alla stessa altezza relativa.
 */
export interface ComeFirmare {
  /** Il marchio AGORÀ al centro. Nei risultati non c'e': solo i pallini. */
  marchio?: boolean;
  /** Da che parte stanno i tre pallini. */
  pallini?: "sinistra" | "destra";
  y?: number;
}

export function firma(come: ComeFirmare = {}): Elemento[] {
  // `y` e' la distanza DAL FONDO, non dall'alto: il marchio e' alto 41
  // pixel in ogni formato ma sta a 29 pixel dal bordo nel post e a 91
  // nella storia. Ancorandolo in basso, un formato nuovo non lo sposta.
  const { marchio = true, pallini = "sinistra", y = 2.69 } = come;
  const px = pallini === "destra" ? 87.17 : 2.28;
  /*
   * y = 94.81 e' misurato sull'INCHIOSTRO del file originale, non sul
   * riquadro dell'immagine. Nel PDF quel riquadro parte da 89.12 ed e'
   * alto il 15%, ma dentro c'e' un margine trasparente enorme: preso alla
   * lettera, il marchio finiva dentro il riquadro del messaggio. Le
   * immagini qui sono ritagliate sull'inchiostro, quindi il numero giusto
   * e' dove il nero comincia davvero — 1280 di 1350.
   */
  return [
    ...(marchio
      ? [{
          id: "marchio", tipo: "immagine" as const, fonte: "/studio/agora.png",
          riquadro: { x: 40.5, y, larghezza: 15.9, altezza: 3.8, dalBasso: true },
          riempimento: "contain" as const,
        }]
      : []),
    { id: "bollo1", tipo: "immagine", fonte: "/studio/pallini-blu-a.png", riquadro: { x: px, y: y + 1.72, larghezza: 2.26, altezza: 2.34, dalBasso: true }, riempimento: "contain" },
    { id: "bollo2", tipo: "immagine", fonte: "/studio/pallini-blu-b.png", riquadro: { x: px + 3.4, y: y + 1.72, larghezza: 2.26, altezza: 2.26, dalBasso: true }, riempimento: "contain" },
    { id: "bollo3", tipo: "immagine", fonte: "/studio/pallini-blu-c.png", riquadro: { x: px + 1.7, y: y - 0.23, larghezza: 2.26, altezza: 2.26, dalBasso: true }, riempimento: "contain" },
  ];
}

/** L'arco del marchio sopra la testata: c'e' nei risultati. */
export const arcoSopra: Elemento = {
  id: "arco", tipo: "immagine", fonte: "/studio/arco.png",
  riquadro: { x: 46.4, y: 1.99, larghezza: 7.22, altezza: 7.22 },
  riempimento: "contain",
};

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
      // Se la riga e' facoltativa sparisce TUTTA, riquadro compreso.
      // Prima spariva solo l'icona e restava un riquadro beige vuoto in
      // fondo a ogni storia senza link: si vedeva in ogni esportazione.
      ...(opzionale ? { seCampo: campo } : {}),
    },
    {
      id: `ic${n}`, tipo: "immagine", fonte: `/studio/${icona}.png`,
      riquadro: { x: 8.8, y: y + 2.4, larghezza: 9.5, altezza: 9.5 },
      riempimento: "contain",
      ...(opzionale ? { seCampo: campo } : {}),
    },
    {
      id: campo, tipo: "testo", campo,
      riquadro: { x: 26, y: y + 3.3, larghezza: 60, altezza: altezza - 6.6 },
      corpo, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_TESTO, interlinea: 1.35,
      verticale: altezza < 25 ? "center" : "flex-start",
      ...(opzionale ? { seCampo: campo } : {}),
    },
  ];
}

/**
 * Due mezze righe affiancate, con l'icona SOPRA invece che a sinistra.
 *
 * E' cosi' nei post dei risultati: quando lo spazio si divide in due, la
 * colonna delle icone non c'e' piu', e il segno passa sopra al proprio
 * riquadro. Non e' un capriccio — a meta' larghezza una colonna di icone
 * mangerebbe un terzo del riquadro.
 */
export function mezzeRighe(
  y: number,
  sinistra: { icona: string; campo: string },
  destra: { icona: string; campo: string },
  corpo: number,
): Elemento[] {
  const fai = (x: number, n: number, p: { icona: string; campo: string }): Elemento[] => [
    {
      id: `mez${n}-ic`, tipo: "immagine", fonte: `/studio/${p.icona}.png`,
      riquadro: { x: x + 1, y: y - 11.8, larghezza: 9.6, altezza: 9.6 },
      riempimento: "contain",
    },
    {
      id: `mez${n}`, tipo: "forma",
      riquadro: { x, y, larghezza: MEZZA_LARGHEZZA, altezza: RIGA_ALTEZZA },
      colore: RIQUADRO, raggio: 2.7,
    },
    {
      id: p.campo, tipo: "testo", campo: p.campo,
      riquadro: { x: x + 3, y: y + 5.7, larghezza: MEZZA_LARGHEZZA - 6, altezza: RIGA_ALTEZZA - 11.4 },
      corpo, peso: 700, colore: INCHIOSTRO, famiglia: CARATTERE_TESTO, verticale: "center",
    },
  ];
  return [...fai(sinistra ? MEZZA_SINISTRA : 0, 1, sinistra), ...fai(MEZZA_DESTRA, 2, destra)];
}

/**
 * Il riquadro di un esito: crema come il foglio, con un filo arancione.
 *
 * E' il secondo tipo di contenitore del sistema, e dice un'altra cosa dal
 * riquadro pieno: «questo e' com'e' finita», non «questo e' il
 * contenuto». Dietro c'e' il numero dell'esito, grande e chiaro.
 */
export function esito(n: number, y: number, campo: string, corpo: number): Elemento[] {
  return [
    {
      id: `${campo}-num`, tipo: "testo", fisso: String(n),
      riquadro: { x: 21.8, y: y - 11, larghezza: 20, altezza: 48 },
      corpo: 24, peso: 700, colore: "#d9cdb8",
      famiglia: CARATTERE_TESTO, adatta: false, seCampo: campo,
    },
    {
      id: `${campo}-riq`, tipo: "forma",
      riquadro: { x: RIQUADRI_X, y, larghezza: RIQUADRI_LARGHEZZA, altezza: 27.13 },
      colore: CREMA, bordo: 0.45, coloreBordo: ARANCIO, tratteggiato: true, raggio: 2.7, seCampo: campo,
    },
    {
      id: campo, tipo: "testo", campo,
      riquadro: { x: RIQUADRI_X + 3, y: y + 5.3, larghezza: RIQUADRI_LARGHEZZA - 6, altezza: 16.5 },
      corpo, peso: 700, colore: INCHIOSTRO, famiglia: CARATTERE_TESTO,
      verticale: "center", seCampo: campo,
    },
  ];
}

/** La barra dell'avanzamento del carosello: venti segni, misurati. */
export const barraCarosello: Elemento = {
  id: "barra", tipo: "serie",
  riquadro: { x: 0, y: 15.29, larghezza: 100, altezza: 4.19 },
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
