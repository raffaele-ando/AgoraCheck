/* Quello che gli altri file importano come "../firebase". */
import { UTENTE } from "./auth";
export const db = {};
export const auth = {
  currentUser: UTENTE,
  onAuthStateChanged: (cb: any) => {
    setTimeout(() => cb(UTENTE), 0);
    return () => {};
  },
};
export const googleProvider = {};
export default { db, auth };
