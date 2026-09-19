/*
 * Divulgativo — il post che spiega qualcosa.
 *
 * E' l'unico modello che non nasce da un tuo file: nei ventitre fogli non
 * c'e'. Ma non e' inventato — e' costruito sulle regole ricavate dagli
 * altri, che stanno scritte in SISTEMA.md. Dove ho dovuto scegliere, la
 * scelta e' scritta qui sotto con la sua ragione, cosi' si puo'
 * contestare una cosa alla volta.
 *
 * 1. LA TESTATA E' «ATENEO AGORÀ», NON «ATENEO SPOTTED».
 *    E' la distinzione che regge la pagina: «Spotted» vuol dire «questo
 *    l'ha mandato qualcuno», il marchio vuol dire «questo lo diciamo
 *    noi». Un post divulgativo con la testata Spotted sembra un
 *    messaggio di uno studente. E' anche a questo che servono i fogli da
 *    3000x3750 che mi hai mandato: sono quella seconda testata.
 *
 * 2. LA FOTOGRAFIA STA NEL RIQUADRO, NON SOTTO IL TESTO.
 *    Nella mia prima versione era a tutto schermo con le scritte sopra e
 *    una banda sfumata per renderle leggibili. Non e' il tuo sistema: da
 *    te il contenuto sta SEMPRE dentro un riquadro beige, nella colonna
 *    di destra, con la sua icona a sinistra. Una fotografia e' contenuto
 *    come il resto. E ha il vantaggio di non dipendere da com'e' la foto:
 *    il testo non ci finisce mai sopra, quindi non serve scurirla.
 *
 * 3. IL TITOLO E IL TESTO STANNO IN RIQUADRI A TUTTA LARGHEZZA.
 *    Nei tuoi file esistono gia' due tipi di riquadro: quello da 67.1%
 *    che lascia la colonna delle icone, e quello da 80% che parte da 10 e
 *    la occupa — e' quello dell'invito «Hai visto qualcuno?». Il secondo
 *    si usa quando non c'e' un'icona da mettere, ed e' il caso qui: il
 *    genere del post lo dice gia' l'etichetta in alto, e ripetere la
 *    lente accanto al titolo la userebbe due volte per due cose diverse.
 *    Un'icona, un significato.
 *
 * 4. L'OCCHIELLO E' UN'ETICHETTA DI SEZIONE.
 *    Come «RISULTATI»: colonna di sinistra, Archivo Black maiuscolo
 *    arancione, con la sua icona. Non un titoletto sopra al contenuto.
 *
 * 5. IL FORMATO PREDEFINITO E' IL POST VERTICALE 1080x1350.
 *    Il divulgativo resta nel profilo, non sparisce in ventiquattro ore,
 *    quindi il posto giusto e' il feed.
 */
import type { Modello } from "../tipi";
import {
  CARATTERE_TESTO, CORPO_MINORE, CORPO_TESTO, CREMA, INCHIOSTRO,
  PIENO_LARGHEZZA, PIENO_X, RIQUADRO, campoAteneo, etichetta, firma, testataAgora,
} from "../marchio";

export const divulgativo: Modello = {
  id: "divulgativo",
  nome: "Divulgativo — post",
  descrizione: "Il post che spiega qualcosa: un'immagine, un titolo, il testo e la fonte.",
  formato: "post",
  fondo: CREMA,

  campi: [
    campoAteneo,
    {
      id: "occhiello", nome: "Occhiello", tipo: "testo",
      predefinito: "LO SAPEVI?", gruppo: "Il post",
    },
    { id: "titolo", nome: "Titolo", tipo: "paragrafo", esempio: "La biblioteca del Leonardo resta aperta fino alle 23", gruppo: "Il post" },
    { id: "testo", nome: "Il testo", tipo: "paragrafo", esempio: "Dal lunedì al venerdì, anche in sessione.", gruppo: "Il post" },
    { id: "foto", nome: "Immagine (facoltativa)", tipo: "immagine", gruppo: "Il post" },
    { id: "fonte", nome: "Fonte (facoltativa)", tipo: "testo", esempio: "polimi.it", gruppo: "Coda" },
  ],

  elementi: [
    ...testataAgora(1.9),

    /* L'occhiello come etichetta di sezione: colonna di sinistra, come
       «RISULTATI». Non un titoletto sopra al contenuto. */
    ...etichetta("occhiello-et", 19.38, "lente", { campo: "occhiello" }),

    /* La fotografia, a tutta larghezza come i riquadri che la seguono.
       Sparisce se non la carichi, e quello che viene dopo NON si sposta:
       un post senza immagine ha semplicemente piu' aria in alto, invece
       di avere tutto il resto in un posto diverso. */
    {
      id: "foto", tipo: "immagine", campo: "foto",
      riquadro: { x: PIENO_X, y: 38, larghezza: PIENO_LARGHEZZA, altezza: 28 },
      riempimento: "cover", raggio: 2.7, seCampo: "foto",
    },

    /* Il titolo: riquadro pieno a tutta larghezza. */
    {
      id: "riq-titolo", tipo: "forma",
      riquadro: { x: PIENO_X, y: 71.56, larghezza: PIENO_LARGHEZZA, altezza: 16.25 },
      colore: RIQUADRO, raggio: 2.7,
    },
    {
      id: "titolo", tipo: "testo", campo: "titolo",
      riquadro: { x: PIENO_X + 3, y: 74.6, larghezza: PIENO_LARGHEZZA - 6, altezza: 10.25 },
      corpo: CORPO_TESTO, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_TESTO, interlinea: 1.25, verticale: "center",
    },

    /* Il testo, uno spazio di sistema piu' sotto. */
    {
      id: "riq-testo", tipo: "forma",
      riquadro: { x: PIENO_X, y: 93.37, larghezza: PIENO_LARGHEZZA, altezza: 16.25 },
      colore: RIQUADRO, raggio: 2.7, seCampo: "testo",
    },
    {
      id: "testo", tipo: "testo", campo: "testo",
      riquadro: { x: PIENO_X + 3, y: 96.0, larghezza: PIENO_LARGHEZZA - 6, altezza: 11.0 },
      corpo: CORPO_MINORE, peso: 700, colore: INCHIOSTRO,
      famiglia: CARATTERE_TESTO, interlinea: 1.4, verticale: "center", seCampo: "testo",
    },

    /* La fonte: piccola, allineata al bordo dei riquadri. */
    {
      id: "fonte", tipo: "testo", campo: "fonte",
      riquadro: { x: PIENO_X, y: 113.9, larghezza: PIENO_LARGHEZZA, altezza: 4.38 },
      corpo: CORPO_MINORE * 0.78, peso: 700, colore: "#6b6660",
      famiglia: CARATTERE_TESTO, adatta: false, seCampo: "fonte",
    },

    ...firma(),
  ],

  varianti: [
    { id: "crema", nome: "Crema" },
    {
      id: "inchiostro", nome: "Inchiostro", fondo: "#1c1b1a",
      ritocchi: {
        ateneo: { colore: CREMA },
        titolo: { colore: CREMA },
        testo: { colore: CREMA },
        fonte: { colore: "#9b968e" },
        "riq-titolo": { colore: "#2b2927" },
        "riq-testo": { colore: "#2b2927" },
      },
    },
  ],
};
