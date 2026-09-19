/* Finto firebase/auth: sempre collegati, come super amministratore. */
export const UTENTE = {
  uid: "banco",
  email: "andolinaraffaele70@gmail.com",
  displayName: "Raffaele A.",
};
export const getAuth = () => ({ currentUser: UTENTE });
export class GoogleAuthProvider {}
export const signOut = async () => {};
export const signInWithPopup = async () => ({ user: UTENTE });
export const signInWithRedirect = async () => {};
export const getRedirectResult = async () => null;
export const onAuthStateChanged = (_a: any, cb: any) => {
  setTimeout(() => cb(UTENTE), 0);
  return () => {};
};
export type User = typeof UTENTE;

export const signInAnonymously = async () => ({ user: UTENTE });
export const signInWithEmailAndPassword = async () => ({ user: UTENTE });
