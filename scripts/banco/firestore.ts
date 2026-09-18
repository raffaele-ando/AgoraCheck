/*
 * Un finto firebase/firestore: risponde con i dati del banco e ingoia ogni
 * scrittura. Serve a far girare la dashboard vera dentro un browser senza
 * rete, senza accesso e senza toccare il database di produzione.
 */
import { MESSAGGI, PROFILI, VISITE } from "./dati";

const docSnap = (id: string, data: any) => ({
  id,
  exists: () => data !== undefined,
  data: () => data,
  get: (k: string) => data?.[k],
});

const querySnap = (righe: { id: string; data: any }[]) => ({
  docs: righe.map((r) => ({ ...docSnap(r.id, r.data), ref: { id: r.id } })),
  size: righe.length,
  empty: righe.length === 0,
  forEach: (f: (d: any) => void) => righe.forEach((r) => f(docSnap(r.id, r.data))),
});

const perCollezione = (nome: string) => {
  if (nome === "messages") return MESSAGGI.map((m) => ({ id: m.id, data: m }));
  if (nome === "visits") return VISITE.map((v) => ({ id: v.id, data: v }));
  if (nome === "profiles")
    return Object.entries(PROFILI).map(([id, data]) => ({ id, data }));
  return [];
};

export const collection = (_db: any, nome: string) => ({ __nome: nome });
export const doc = (_db: any, nome: string, id?: string) => ({
  __nome: typeof nome === "string" ? nome : "",
  id: id ?? "finto",
});
export const query = (rif: any, ..._v: any[]) => rif;
export const orderBy = () => ({});
export const where = () => ({});
export const limit = () => ({});
export const startAfter = () => ({});
export const onSnapshot = (rif: any, cb: any) => {
  const nome = rif?.__nome ?? "";
  setTimeout(() => cb(querySnap(perCollezione(nome))), 0);
  return () => {};
};
export const getDocs = async (rif: any) => querySnap(perCollezione(rif?.__nome ?? ""));
export const getDoc = async (rif: any) => {
  if (rif?.__nome === "config")
    return docSnap(rif.id, { tagline: "Scrivi il tuo spotted", admins: [] });
  return docSnap(rif?.id ?? "x", undefined);
};
export const getDocFromCache = getDoc;
export const updateDoc = async () => {};
export const setDoc = async () => {};
export const addDoc = async () => ({ id: "nuovo" });
export const deleteDoc = async () => {};
export const deleteField = () => undefined;
export const arrayUnion = (...v: any[]) => v;
export const increment = (n: number) => n;
export const serverTimestamp = () => new Date();
export const writeBatch = () => ({
  update: () => {},
  set: () => {},
  delete: () => {},
  commit: async () => {},
});
export class Timestamp {
  static fromDate(d: Date) {
    return { toDate: () => d, toMillis: () => d.getTime() };
  }
  static now() {
    return Timestamp.fromDate(new Date());
  }
}
export const initializeFirestore = () => ({});
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
