/*
 * «RISULTATI» — la storia che racconta com'e' finita.
 *
 * Rifatta misurando la pagina 6 del tuo file, dopo che la prima versione
 * l'avevo disegnata a occhio. Tre cose che avevo sbagliato:
 *
 * 1. QUANDO e DOVE stanno AFFIANCATI, non impilati. A meta' larghezza la
 *    colonna delle icone sparisce e il segno passa sopra al riquadro.
 * 2. Il riquadro dell'esito non e' pieno: e' crema col filo arancione. E'
 *    un secondo tipo di contenitore, e dice «com'e' finita» invece di
 *    «questo e' il contenuto».
 * 3. Dietro all'esito c'e' il suo numero, grande e chiaro.
 *
 * Il secondo esito compare solo se lo scrivi: nei tuoi file sono due
 * documenti diversi per una differenza che e' un campo vuoto.
 */
import type { Modello } from "../tipi";
import {
  CORPO_TESTO, CREMA, arcoSopra, campoAteneo, esito, etichetta, firma, mezzeRighe, riga, testata,
} from "../marchio";

export const risultati: Modello = {
  id: "risultati",
  nome: "Risultati",
  descrizione: "Com'è finita: uno o due esiti, il secondo compare se lo scrivi.",
  formato: "storia",
  fondo: CREMA,

  campi: [
    campoAteneo,
    { id: "quando", nome: "Quando", tipo: "testo", esempio: "30 maggio", gruppo: "Lo spotted" },
    { id: "dove", nome: "Dove", tipo: "testo", esempio: "Pegli", gruppo: "Lo spotted" },
    { id: "messaggio", nome: "Il messaggio", tipo: "paragrafo", esempio: "Gruppo di ragazzi in panda bianca", gruppo: "Lo spotted" },
    { id: "esito1", nome: "Primo esito", tipo: "paragrafo", esempio: "Si sono trovati!", gruppo: "Risultati" },
    { id: "esito2", nome: "Secondo esito (facoltativo)", tipo: "paragrafo", gruppo: "Risultati" },
  ],

  elementi: [
    arcoSopra,
    ...testata({ ateneo: 9.19, spotted: 16.94 }),
    ...mezzeRighe(34.29, { icona: "calendario", campo: "quando" }, { icona: "puntina", campo: "dove" }, CORPO_TESTO),
    ...riga(1, 61.62, 22.7, "lente", "messaggio", CORPO_TESTO),
    ...etichetta("risultati-et", 93.42, "bersaglio", { fisso: "Risultati" }),
    ...esito(1, 102.13, "esito1", CORPO_TESTO),
    ...esito(2, 133.94, "esito2", CORPO_TESTO),
    // In questa pagina il marchio non c'e': solo i tre pallini, e a
    // destra invece che a sinistra. E' cosi' nel tuo file — l'ho tenuto
    // com'e' invece di uniformarlo, e l'incoerenza sta scritta in
    // SISTEMA.md perche' e' una cosa da decidere, non da nascondere.
    ...firma({ marchio: false, pallini: "destra" }),
  ],

  varianti: [
    { id: "crema", nome: "Crema" },
    {
      id: "inchiostro", nome: "Inchiostro", fondo: "#1c1b1a",
      ritocchi: {
        ateneo: { colore: CREMA }, quando: { colore: CREMA }, dove: { colore: CREMA },
        messaggio: { colore: CREMA }, esito1: { colore: CREMA }, esito2: { colore: CREMA },
        mez1: { colore: "#2b2927" }, mez2: { colore: "#2b2927" }, riq1: { colore: "#2b2927" },
        "esito1-riq": { colore: "#1c1b1a" }, "esito2-riq": { colore: "#1c1b1a" },
        "esito1-num": { colore: "#332f2c" }, "esito2-num": { colore: "#332f2c" },
      },
    },
  ],
};
