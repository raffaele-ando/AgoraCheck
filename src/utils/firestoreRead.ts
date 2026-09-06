import {
  doc,
  getDoc,
  getDocFromCache,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Lettura di un documento che NON può restare appesa.
 *
 * Il problema che risolve: `getDoc` non rifiuta quando Firestore non riesce a
 * collegarsi. Resta in attesa, anche per sempre. Ogni pezzo di interfaccia che
 * lo attendeva mostrava quindi il proprio stato di caricamento a tempo
 * indeterminato — il logo restava un rettangolo grigio pulsante, il pulsante
 * di WhatsApp restava semitrasparente e sembrava disattivato. Non erano tre
 * difetti diversi: era sempre questo.
 *
 * Qui la lettura fa tre cose, in quest'ordine:
 *
 *  1. interroga la cache locale, che risponde senza rete: se il dato è già
 *     stato letto in passato torna subito;
 *  2. chiede il valore aggiornato al server;
 *  3. si arrende dopo `timeoutMs` restituendo `null`.
 *
 * Non solleva mai eccezioni: chi chiama riceve un documento oppure `null`, e
 * `null` significa "non lo so", che è una risposta con cui l'interfaccia sa
 * cosa fare — mostrare il ripiego — mentre l'attesa infinita no.
 */
export const DEFAULT_READ_TIMEOUT_MS = 3500;

export interface SafeReadResult {
  /** Il documento, oppure null se assente, non raggiungibile o scaduto. */
  snap: DocumentSnapshot<DocumentData> | null;
  /** true se la risposta arriva dalla cache locale e non dal server. */
  fromCache: boolean;
  /** true se si è esaurito il tempo: il valore mostrato è un ripiego. */
  timedOut: boolean;
}

export async function readDocSafe(
  path: [string, string],
  timeoutMs: number = DEFAULT_READ_TIMEOUT_MS,
): Promise<SafeReadResult> {
  const ref = doc(db, path[0], path[1]);

  // 1. Cache locale. Se il documento non c'è in cache questa rifiuta subito,
  //    quindi non costa attesa.
  const cached = await getDocFromCache(ref).catch(() => null);

  // 2. Server, con resa. Il timer viene sempre annullato: lasciarlo acceso
  //    terrebbe in vita un timeout per ogni lettura.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const TIMED_OUT = Symbol("timeout");
  const fresh = await Promise.race([
    getDoc(ref).catch(() => null),
    new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  if (fresh !== TIMED_OUT && fresh) {
    return { snap: fresh, fromCache: false, timedOut: false };
  }

  // 3. Il server non ha risposto in tempo (o ha fallito): meglio un valore
  //    vecchio che nessun valore.
  if (cached && cached.exists()) {
    return { snap: cached, fromCache: true, timedOut: fresh === TIMED_OUT };
  }

  return { snap: null, fromCache: false, timedOut: fresh === TIMED_OUT };
}

/** Comodità: i dati del documento, o null. Non solleva mai. */
export async function readDocDataSafe<T = DocumentData>(
  path: [string, string],
  timeoutMs?: number,
): Promise<T | null> {
  const { snap } = await readDocSafe(path, timeoutMs);
  return snap && snap.exists() ? (snap.data() as T) : null;
}
