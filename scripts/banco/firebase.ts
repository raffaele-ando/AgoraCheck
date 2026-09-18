/* Quello che gli altri file importano come "../firebase". */
import { UTENTE } from "./auth";
export const db = {};
export const auth = { currentUser: UTENTE };
export const googleProvider = {};
export default { db, auth };
