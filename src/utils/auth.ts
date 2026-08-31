import { auth } from "../firebase";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";

// ===========================================================================
// Auth helpers.
//
// Firebase restores a persisted session ASYNCHRONOUSLY: `auth.currentUser` is
// null for the first moments after page load even when the user is signed in.
// The old code did `if (!auth.currentUser) signInAnonymously(auth)`, which
// therefore fired during that window and REPLACED a real (Google) session with
// a fresh anonymous one — the cause of "every deploy I have to log in again"
// and of the dashboard denying an admin who was already authorised.
//
// `authReady()` waits for the first auth state emission; `ensureAnonymousAuth()`
// only creates an anonymous user when there is genuinely no session at all.
// ===========================================================================

let readyPromise: Promise<User | null> | null = null;

/** Resolves once Firebase Auth has restored (or ruled out) a persisted session. */
export function authReady(): Promise<User | null> {
  if (!auth) return Promise.resolve(null);
  if (!readyPromise) {
    readyPromise = new Promise<User | null>((resolve) => {
      let done = false;
      const finish = (u: User | null) => {
        if (done) return;
        done = true;
        try {
          unsub();
        } catch {}
        resolve(u);
      };
      const unsub = onAuthStateChanged(
        auth,
        (u) => finish(u),
        () => finish(null),
      );
      // Safety net: never hang forever if auth cannot initialise.
      setTimeout(() => finish(auth?.currentUser ?? null), 8000);
    });
  }
  return readyPromise;
}

let anonPromise: Promise<User | null> | null = null;

/**
 * Ensure we have SOME session, without ever destroying a real one.
 * - If a session exists (anonymous or Google), it is returned untouched.
 * - Only when there is no session at all do we sign in anonymously.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth) return null;
  const restored = await authReady();
  if (restored) return restored;
  if (auth.currentUser) return auth.currentUser;
  if (!anonPromise) {
    anonPromise = signInAnonymously(auth)
      .then((cred) => cred.user)
      .catch((err) => {
        anonPromise = null;
        throw err;
      });
  }
  try {
    return await anonPromise;
  } catch {
    return null;
  }
}

/** True when the current session is a real (non-anonymous) sign-in. */
export function isRealUser(u: User | null | undefined): boolean {
  return !!u && !u.isAnonymous;
}
