/*
 * Il modello di dati dello Studio.
 *
 * Perche' non ho esteso "Template storia" e "Carosello": in quei due
 * pannelli i campi sono scritti nel codice. La storia sa fare `chi`,
 * `quando`, `dove`; il carosello sa fare `cerco`, `quando`, `dove`. Sono
 * nomi cablati dentro la struttura `TemplateConfig`, dentro il modulo che
 * disegna e dentro il modulo che esporta. Un post divulgativo vuole
 * titolo, testo, fonte e una fotografia: non c'e' modo di ottenerlo se non
 * scrivendo un terzo pannello uguale ai primi due, e poi un quarto.
 *
 * Qui il modello e' un DATO. Un modello dichiara i propri campi e i propri
 * elementi; la maschera si costruisce da sola leggendo i campi, e la tela
 * si disegna da sola leggendo gli elementi. Aggiungere un modello vuol
 * dire scrivere un file di una trentina di righe, non un pannello.
 *
 * Le coordinate sono in PERCENTUALE del formato, mai in pixel: lo stesso
 * elemento vale a 1080x1920 e nell'anteprima da 270 pixel, e un modello
 * si puo' portare da una storia a un post quadrato senza rifare i conti.
 */

/** I formati che Instagram accetta senza ritagliare. */
export interface Formato {
  id: string;
  nome: string;
  larghezza: number;
  altezza: number;
}

export const FORMATI: Record<string, Formato> = {
  storia: { id: "storia", nome: "Storia", larghezza: 1080, altezza: 1920 },
  ritratto: { id: "ritratto", nome: "Post verticale", larghezza: 1080, altezza: 1350 },
  quadrato: { id: "quadrato", nome: "Post quadrato", larghezza: 1080, altezza: 1080 },
};

/* --- I campi: cio' che chi pubblica riempie ogni volta --- */

export type TipoCampo =
  | "testo"        // una riga
  | "paragrafo"    // piu' righe
  | "immagine"     // un file dal computer
  | "colore"
  | "scelta"       // fra opzioni dichiarate dal modello
  | "numero"
  | "interruttore";

export interface Campo {
  /** La chiave con cui gli elementi lo richiamano. */
  id: string;
  /** L'etichetta nella maschera. */
  nome: string;
  tipo: TipoCampo;
  /** Il valore di partenza, cosi' l'anteprima non e' mai vuota. */
  predefinito?: string | number | boolean;
  /** Suggerimento dentro la casella, non una seconda etichetta. */
  esempio?: string;
  /** Solo per `scelta`. */
  opzioni?: { valore: string; nome: string }[];
  /** Solo per `numero`. */
  min?: number;
  max?: number;
  passo?: number;
  /** Raggruppa i campi nella maschera; senza, finisce in "Contenuto". */
  gruppo?: string;
  /**
   * Dove vive il valore.
   *
   * "scheda" (il difetto) e' cio' che cambia da una scheda all'altra: il
   * messaggio, la data, il luogo.
   *
   * "progetto" vale per tutto il carosello e si scrive una volta sola.
   * E' la correzione piu' importante fatta dopo aver guardato i post
   * veri: l'ateneo sta in testa a OGNI scheda ed e' sempre lo stesso, e
   * un carosello puo' avere venti schede. Scriverlo venti volte non era
   * un fastidio, era un errore di progetto — e prima o poi due schede
   * dello stesso carosello escono con due atenei diversi.
   */
  ambito?: "progetto" | "scheda";
}

/* --- Gli elementi: cio' che il modello disegna, sempre uguale --- */

/** Riquadro in percentuale del formato. */
export interface Riquadro {
  x: number;
  y: number;
  larghezza: number;
  altezza: number;
}

export interface BaseElemento {
  id: string;
  riquadro: Riquadro;
  /** Ruota di N gradi attorno al centro. */
  rotazione?: number;
  /**
   * Mostra l'elemento solo se il campo indicato e' pieno (o acceso).
   * Serve ai modelli con parti facoltative — un sottotitolo, un bollino —
   * senza obbligare a fare due modelli quasi uguali.
   */
  seCampo?: string;
  /** Ordine di sovrapposizione; senza, vale l'ordine di dichiarazione. */
  piano?: number;
  /**
   * Un campo `numero` (da 0 a 100) che regola l'opacita'.
   * Serve ai veli sopra le fotografie: quanto scurire non e' una scelta
   * del modello, dipende dalla foto di quel post.
   */
  campoOpacita?: string;
}

export interface ElementoTesto extends BaseElemento {
  tipo: "testo";
  /** Il campo da cui prende il testo. */
  campo?: string;
  /** Testo fisso, per le scritte che non cambiano mai. */
  fisso?: string;
  /**
   * Il corpo, in percentuale della LARGHEZZA del formato.
   *
   * Della larghezza e non dell'altezza, che e' come l'avevo scritto
   * all'inizio. Misurando le testate dei post veri: nella storia
   * 1080x1920 e nella scheda 1080x1350 il nome dell'ateneo e' largo 295
   * pixel e alto 70 in TUTTI E DUE. Su Instagram la larghezza e' sempre
   * 1080 e cambia solo l'altezza, quindi un corpo legato all'altezza
   * faceva crescere il testo del 42% passando dal carosello alla storia —
   * la stessa scritta, due dimensioni diverse.
   */
  corpo: number;
  peso?: number;
  colore: string;
  /** Un campo `colore` che ha la precedenza su `colore`, se dichiarato. */
  campoColore?: string;
  allineamento?: "left" | "center" | "right";
  verticale?: "flex-start" | "center" | "flex-end";
  interlinea?: number;
  spaziatura?: number;
  maiuscolo?: boolean;
  /** Inclinato. Abril Fatface non ha un corsivo suo: lo inclina il browser. */
  corsivo?: boolean;
  famiglia?: string;
  /**
   * Rimpicciolisce il corpo finche' il testo non entra nel riquadro.
   * Acceso quasi sempre: chi scrive non deve contare i caratteri.
   */
  adatta?: boolean;
}

export interface ElementoImmagine extends BaseElemento {
  tipo: "immagine";
  /** Il campo `immagine` da cui prende il file. */
  campo?: string;
  /** Un file fisso del modello (una texture, un fondo). */
  fonte?: string;
  /** `cover` riempie e ritaglia, `contain` entra tutta. */
  riempimento?: "cover" | "contain";
  /** Vedi `ElementoForma.raggio`. */
  raggio?: number;
  opacita?: number;
}

export interface ElementoForma extends BaseElemento {
  tipo: "forma";
  forma?: "rettangolo" | "ellisse";
  colore: string;
  campoColore?: string;
  /**
   * L'arrotondamento degli angoli, in percentuale della LARGHEZZA DEL
   * FORMATO.
   *
   * Non dell'elemento: in CSS un raggio in percentuale si misura sui lati
   * dell'elemento stesso, quindi su un riquadro basso e largo lo stesso
   * numero dava un'ellisse, e su due riquadri di altezza diversa dava due
   * arrotondamenti diversi. Nei post originali i riquadri hanno tutti lo
   * stesso raggio e altezze diverse: con la regola vecchia non si poteva
   * scrivere.
   */
  raggio?: number;
  opacita?: number;
  /**
   * Sfuma da `colore` a questo, in gradi. Serve alle bande scure sotto le
   * fotografie, dove un colore pieno taglia e una sfumatura no.
   */
  sfumaA?: string;
  angolo?: number;
}

/**
 * Una fila di forme uguali: la barra dei pallini in cima alle schede.
 *
 * Nei file originali quella barra sono venti rettangoli disegnati a mano
 * uno per uno, e cambiare "a che punto sei" vuol dire rifare la barra.
 * Qui e' un elemento solo: quanti ce ne sono, quanti sono accesi, e come
 * cambiano i due stati.
 */
export interface ElementoSerie extends BaseElemento {
  tipo: "serie";
  /** Quanti segni in tutto. */
  quanti: number;
  /**
   * Quanti segni sono accesi. Tre modi, in ordine di precedenza:
   * `"indice"` = il numero della scheda, contato in automatico;
   * un campo `numero`; oppure un valore fisso.
   *
   * `"indice"` esiste perche' nei post veri quella barra e' la posizione
   * nel carosello, e nella prima versione la scrivevo a mano per ogni
   * scheda: venti numeri da tenere allineati con l'ordine delle schede,
   * cioe' venti occasioni di sbagliare per un dato che il programma
   * conosce gia'.
   */
  accesiDa?: "indice";
  campoAccesi?: string;
  accesi?: number;
  /**
   * Dove comincia il primo segno e ogni quanto si ripete, in percentuale
   * della LARGHEZZA DEL FORMATO — come tutto il resto del modello.
   *
   * Prima erano percentuali del riquadro della serie, e bastava spostare
   * il riquadro perche' i segni cambiassero dimensione: un numero preso
   * dal file originale non ci finiva dentro senza essere ricalcolato. Il
   * riquadro adesso serve solo a dire a che altezza sta la barra.
   */
  inizio: number;
  passo: number;
  /** Il segno acceso e quello spento: stessa larghezza, altezza diversa. */
  acceso: { larghezza: number; altezza: number; colore: string; raggio?: number };
  spento: { larghezza: number; altezza: number; colore: string; raggio?: number };
}

export type Elemento = ElementoTesto | ElementoImmagine | ElementoForma | ElementoSerie;

/**
 * Un ritocco di variante.
 *
 * Non e' `Partial<Elemento>`: `tipo` e `id` non si possono cambiare — una
 * variante e' lo stesso disegno in un altro colore, non un altro disegno —
 * e toglierli di mezzo evita anche che l'unione dei tre tipi si annulli.
 */
export type Ritocco = Partial<
  Omit<ElementoTesto, "tipo" | "id"> &
    Omit<ElementoImmagine, "tipo" | "id"> &
    Omit<ElementoForma, "tipo" | "id"> &
    Omit<ElementoSerie, "tipo" | "id">
>;

/* --- Il modello --- */

export interface Modello {
  id: string;
  nome: string;
  /** Una riga che dice a cosa serve: si legge nell'elenco dei modelli. */
  descrizione: string;
  formato: string;
  /** Il colore del foglio sotto a tutto. */
  fondo?: string;
  campi: Campo[];
  elementi: Elemento[];
  /**
   * Le varianti: stessa struttura, aspetto diverso. Ogni variante e' un
   * elenco di ritocchi agli elementi, per chiave.
   *
   * E' la ragione per cui i modelli "sono troppi": nella pratica non sono
   * modelli diversi, sono lo stesso modello in tre colori. Qui restano un
   * modello solo.
   */
  varianti?: {
    id: string;
    nome: string;
    fondo?: string;
    ritocchi?: Record<string, Ritocco>;
  }[];
  /**
   * Un modello a piu' schede diventa un carosello: ogni scheda ha i suoi
   * valori, la struttura e' la stessa.
   */
  multiplo?: boolean;
}

/** I valori riempiti da chi pubblica, per una scheda. */
export type Valori = Record<string, string | number | boolean>;
