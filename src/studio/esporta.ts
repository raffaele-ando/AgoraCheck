/*
 * L'esportazione.
 *
 * Il nodo viene disegnato FUORI SCHERMO alla risoluzione vera (1080 di
 * larghezza) e catturato con `pixelRatio: 1`. E' la stessa strada gia'
 * collaudata nel carosello, e non e' un dettaglio: catturare l'anteprima
 * da 270 pixel con `pixelRatio: 4` produce un file da 1080 che ha pero'
 * i bordi del testo sfrangiati, perche' il browser ingrandisce un disegno
 * gia' fatto invece di rifarlo grande.
 *
 * Fuori schermo e non nascosto: un nodo con `display:none` non ha
 * dimensioni, e il testo adattivo si misurerebbe su un riquadro alto zero
 * rimpicciolendosi fino a sparire.
 */
import { toPng } from "html-to-image";
import { downloadDataUrl } from "../utils/download";
import { FORMATI, type Modello } from "./tipi";

export function nomeFile(modello: Modello, indice?: number): string {
  const base = modello.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const giorno = new Date().toISOString().slice(0, 10);
  return indice === undefined ? `${base}-${giorno}.png` : `${base}-${giorno}-${indice + 1}.png`;
}

/** Cattura un nodo gia' disegnato alla risoluzione nativa. */
export async function catturaNodo(nodo: HTMLElement, modello: Modello): Promise<string> {
  const fmt = FORMATI[modello.formato] ?? FORMATI.storia;
  return toPng(nodo, {
    cacheBust: true,
    pixelRatio: 1,
    width: fmt.larghezza,
    height: fmt.altezza,
    // Gli sfondi arrivano da R2 e da GitHub: senza questo la tela
    // risulterebbe "sporcata" e la cattura fallirebbe in silenzio.
    fetchRequestInit: { mode: "cors", credentials: "omit" },
  });
}

/**
 * html-to-image sbaglia la prima cattura quando ci sono font o immagini
 * appena caricati: restituisce un PNG con i buchi. Catturare due volte e
 * tenere la seconda e' il rimedio che usa la libreria stessa nei propri
 * esempi, e costa qualche decimo di secondo una volta sola.
 */
export async function catturaSicura(nodo: HTMLElement, modello: Modello): Promise<string> {
  await catturaNodo(nodo, modello);
  return catturaNodo(nodo, modello);
}

export function scarica(dataUrl: string, nome: string): boolean {
  return downloadDataUrl(dataUrl, nome);
}
