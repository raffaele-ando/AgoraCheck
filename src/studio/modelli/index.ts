/*
 * L'elenco dei modelli.
 *
 * Aggiungerne uno vuol dire scrivere un file qui accanto e metterlo in
 * questa lista. Non si tocca ne' la tela, ne' la maschera, ne' la pagina:
 * e' tutto il punto dello Studio.
 *
 * I tre qui sotto non sono i modelli definitivi — quelli nascono dai tuoi
 * file veri. Sono i tre CASI che il motore deve saper fare, scritti per
 * dimostrare che li fa: solo testo, testo sopra una fotografia caricata,
 * e piu' schede in fila.
 */
import type { Modello } from "../tipi";
import { spottedStoria } from "./spotted-storia";
import { divulgativo } from "./divulgativo";
import { carosello } from "./carosello";

export const MODELLI: Modello[] = [spottedStoria, divulgativo, carosello];

export function modelloPerId(id: string): Modello | undefined {
  return MODELLI.find((m) => m.id === id);
}
