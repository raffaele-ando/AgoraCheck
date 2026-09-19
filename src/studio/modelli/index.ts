/*
 * I modelli, in ordine di quanto si usano.
 *
 * Non sono "layout": sono i tipi di post che pubblichi davvero, e il nome
 * dice a cosa servono. Li ho ricavati guardando i ventitre fogli del tuo
 * file di Canva, non inventandoli:
 *
 *   sette storie      1080x1920  invito, gruppo, spotted, risultati
 *   cinque schede     1080x1350  il carosello, con la barra che avanza
 *   undici testate    3000x3750  una per ateneo
 *
 * Le undici testate NON sono undici modelli. Sono lo stesso disegno con
 * un nome diverso, e il nome e' un campo. Per questo non esiste un
 * modello "POLIMI": esiste il campo Ateneo, che vale per tutto il
 * progetto e si scrive una volta sola.
 *
 * Aggiungerne uno vuol dire scrivere un file qui accanto e metterlo in
 * questa lista: non si tocca ne' la tela, ne' la maschera, ne' la pagina.
 */
import type { Modello } from "../tipi";
import { spottedCarosello } from "./spotted-carosello";
import { spottedStoria } from "./spotted-storia";
import { risultati } from "./risultati";
import { invito } from "./invito";
import { gruppo } from "./gruppo";
import { divulgativo } from "./divulgativo";

export const MODELLI: Modello[] = [
  spottedCarosello,
  spottedStoria,
  risultati,
  invito,
  gruppo,
  divulgativo,
];

export function modelloPerId(id: string): Modello | undefined {
  return MODELLI.find((m) => m.id === id);
}
