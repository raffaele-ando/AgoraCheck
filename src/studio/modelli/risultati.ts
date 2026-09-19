/*
 * «RISULTATI» — la storia che racconta com'e' finita.
 *
 * E' il seguito di uno spotted: si sono trovati, oppure no. Nei tuoi file
 * ne esistono due versioni, con uno e con due riquadri tratteggiati: qui
 * e' un modello solo, e il secondo riquadro compare quando lo riempi.
 * Erano due file per una differenza che e' un campo vuoto.
 */
import type { Modello } from "../tipi";
import { ARANCIO, CARATTERE_TESTO, CREMA, INCHIOSTRO, RIQUADRO, campoAteneo, firma, riga, testata } from "../marchio";

export const risultati: Modello = {
  id: "risultati",
  nome: "Risultati",
  descrizione: "Com'e' finita: uno o due esiti, il secondo compare se lo scrivi.",
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
    ...testata({ ateneo: 5.17, spotted: 9.53 }),
    ...riga(1, 17.0, 9.0, "calendario", "quando", 4.32),
    ...riga(2, 29.0, 9.0, "puntina", "dove", 4.32),
    ...riga(3, 41.0, 16.0, "lente", "messaggio", 4.32),

    { id: "bersaglio", tipo: "immagine", fonte: "/studio/bersaglio.png", riquadro: { x: 8.0, y: 60.6, larghezza: 6.5, altezza: 3.7 }, riempimento: "contain" },
    {
      id: "titolo", tipo: "testo", fisso: "RISULTATI",
      riquadro: { x: 16.0, y: 61.4, larghezza: 40, altezza: 3.2 },
      corpo: 3.38, peso: 700, colore: ARANCIO, famiglia: CARATTERE_TESTO,
      maiuscolo: true, spaziatura: 0.06, adatta: false,
    },
    { id: "cor1", tipo: "forma", riquadro: { x: 16.0, y: 66.0, larghezza: 74, altezza: 9.5 }, colore: RIQUADRO, raggio: 2.0 },
    {
      id: "esito1", tipo: "testo", campo: "esito1",
      riquadro: { x: 19.0, y: 68.0, larghezza: 68, altezza: 5.5 },
      corpo: 3.91, peso: 700, colore: INCHIOSTRO, famiglia: CARATTERE_TESTO, verticale: "center",
    },
    { id: "cor2", tipo: "forma", riquadro: { x: 16.0, y: 77.0, larghezza: 74, altezza: 9.5 }, colore: RIQUADRO, raggio: 2.0, seCampo: "esito2" },
    {
      id: "esito2", tipo: "testo", campo: "esito2",
      riquadro: { x: 19.0, y: 79.0, larghezza: 68, altezza: 5.5 },
      corpo: 3.91, peso: 700, colore: INCHIOSTRO, famiglia: CARATTERE_TESTO, verticale: "center",
      seCampo: "esito2",
    },
    ...firma(),
  ],
};
