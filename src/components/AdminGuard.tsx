import React, { useState, useEffect } from "react";
import {
  getDocs,
  query,
  collection,
  limit,
  getDoc,
  getDocFromCache,
  doc,
} from "firebase/firestore";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { db, auth, googleProvider } from "../firebase";
import { Logo } from "./Logo";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

// Contrassegno lasciato prima di uscire dalla pagina per un accesso con
// reindirizzamento, così al ritorno sappiamo che c'è un risultato da
// riscuotere. Vive in sessionStorage: sparisce con la scheda, che è
// esattamente la durata di un reindirizzamento.
const REDIRECT_PENDING_KEY = "agora_auth_redirect_pending";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isStuck, setIsStuck] = useState(false);

  // Lo stato corrente letto dai timer senza entrare fra le loro dipendenze.
  const authLoadingRef = React.useRef(authLoading);
  const verifyingRef = React.useRef(verifying);
  authLoadingRef.current = authLoading;
  verifyingRef.current = verifying;

  useEffect(() => {
    // Hard stop: if auth never resolves (offline, an expired token whose refresh
    // hangs, blocked storage), do not spin forever. Fall back to the sign-in
    // screen, which is actionable, instead of an endless spinner.
    //
    // Le dipendenze erano [authLoading, verifying]: ogni cambiamento di stato
    // faceva RIPARTIRE entrambi i timer, quindi il setVerifying(true) all'inizio
    // del controllo azzerava il conto alla rovescia e la scadenza non era mai
    // assoluta. Bastava che l'autenticazione oscillasse perché lo spinner
    // restasse acceso a tempo indeterminato: è il "buffering che non smette".
    //
    // Ora la scadenza parte al montaggio e a ogni NUOVO accesso (il cambio di
    // `user`), non a ogni transizione interna del controllo.
    const warn = setTimeout(() => {
      if (authLoadingRef.current || verifyingRef.current) setIsStuck(true);
    }, 5000);

    const giveUp = setTimeout(() => {
      if (!authLoadingRef.current && !verifyingRef.current) return;
      setUser(null);
      setIsAdmin(null);
      setAuthLoading(false);
      setVerifying(false);
    }, 12000);

    return () => {
      clearTimeout(warn);
      clearTimeout(giveUp);
    };
  }, [user]);

  // Complete a redirect-based sign-in (used when the popup is blocked).
  //
  // Questa chiamata era incondizionata, ed era la causa principale dell'attesa
  // all'accesso. getRedirectResult obbliga Firebase a inizializzare il
  // "redirect resolver": scarica apis.google.com/js/api.js e apre un iframe
  // nascosto verso <authDomain>/__/auth/iframe, aspettandone la stretta di
  // mano. Finché quella non finisce, Firebase NON emette il primo stato di
  // autenticazione — quindi onAuthStateChanged resta muto e la pagina mostra
  // lo spinner. Su rete mobile è il grosso dei secondi di attesa, e lo pagava
  // ogni visita, comprese le moltissime in cui nessun reindirizzamento era
  // mai stato avviato.
  //
  // Il reindirizzamento lo iniziamo noi (vedi handleLogin) e lasciamo un
  // contrassegno prima di uscire dalla pagina: solo al ritorno, quindi solo
  // quando c'è davvero un risultato da riscuotere, paghiamo quel costo.
  useEffect(() => {
    let pending = false;
    try {
      pending = sessionStorage.getItem(REDIRECT_PENDING_KEY) === "1";
    } catch {
      // Archiviazione bloccata dal browser: è anche il caso in cui il popup
      // non funziona e si finisce sul reindirizzamento, quindi qui conviene
      // riscuotere comunque piuttosto che perdere l'accesso.
      pending = true;
    }
    if (!pending) return;
    getRedirectResult(auth)
      .catch((e) => {
        console.warn("Redirect sign-in did not complete:", e?.code || e);
      })
      .finally(() => {
        try {
          sessionStorage.removeItem(REDIRECT_PENDING_KEY);
        } catch {
          /* archiviazione non disponibile: nulla da ripulire */
        }
      });
  }, []);

  // Il blocco di codice della Dashboard è a caricamento differito, quindi la
  // sua richiesta partiva solo DOPO che il controllo di accesso era concluso:
  // due attese in fila invece che sovrapposte. Qui lo si scarica in anticipo,
  // così quando il controllo passa il codice è già in cache.
  //
  // Ma NON subito: la Dashboard tira con sé le sue dipendenze (fra cui la
  // libreria di animazione), e avviarlo insieme al primo disegno gli farebbe
  // contendere la banda proprio all'autenticazione — misurato, non supposto.
  // Si aspetta quindi che il browser sia inattivo, cioè che la schermata
  // d'accesso sia disegnata.
  //
  // Chi non è amministratore ha scaricato un file che resta in cache: nessun
  // dato riservato, quelli restano protetti dalle regole di Firestore.
  const prefetchDashboard = React.useCallback(() => {
    void import("../pages/Dashboard").catch(() => {
      /* la rotta lo richiederà di nuovo mostrando il proprio errore */
    });
  }, []);

  useEffect(() => {
    if (typeof requestIdleCallback !== "function") {
      const t = setTimeout(prefetchDashboard, 1200);
      return () => clearTimeout(t);
    }
    const handle = requestIdleCallback(prefetchDashboard, { timeout: 3000 });
    return () => cancelIdleCallback(handle);
  }, [prefetchDashboard]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // An ANONYMOUS session (created by the public board for rate limiting) is
      // not a login. Previously it was treated as "signed in", so the guard ran
      // the admin check against the anonymous uid, found nothing, and rendered
      // "Accesso Negato" without ever offering the Google button.
      if (currentUser && currentUser.isAnonymous) {
        setUser(null);
        setIsAdmin(null);
        setAuthLoading(false);
        return;
      }

      setUser(currentUser);
      if (currentUser) {
        verifyAdminAccess(currentUser);
      } else {
        setIsAdmin(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Gli identificativi sotto i quali un amministratore può essere registrato.
  // Le email sono salvate in minuscolo da AppSettings, quindi si confronta
  // senza distinzione di maiuscole.
  const adminDocIds = (user: User) => {
    const ids = [user.uid];
    if (user.email) {
      ids.push(user.email);
      const lower = user.email.toLowerCase();
      if (lower !== user.email) ids.push(lower);
    }
    return ids;
  };

  const verifyAdminAccess = async (user: User) => {
    // Prima si interroga la cache locale di Firestore, che risponde senza
    // rete. Se l'esito è già noto da una visita precedente la Dashboard
    // compare subito e la conferma dal server arriva in sottofondo: prima
    // invece OGNI apertura restava ferma sullo spinner per il tempo di un
    // giro di rete completo, anche quando la risposta era immutata da mesi.
    //
    // Mostrare la Dashboard in anticipo non allarga i permessi di nessuno:
    // il vero controllo sono le regole di Firestore sul server, che negano
    // comunque i dati a chi non è autorizzato. Questo è solo il cancello
    // dell'interfaccia, e il responso del server lo corregge se sbagliato.
    let settledFromCache = false;
    try {
      const cached = await Promise.all(
        adminDocIds(user).map((id) =>
          getDocFromCache(doc(db, "admins", id)).catch(() => null),
        ),
      );
      if (cached.some((snap) => snap?.exists())) {
        setIsAdmin(true);
        setAuthLoading(false);
        settledFromCache = true;
      }
    } catch {
      /* nessuna cache disponibile: si procede con il controllo in rete */
    }

    if (!settledFromCache) setVerifying(true);
    try {
      // Both lookups must tolerate failure independently: previously the uid
      // lookup had no .catch(), so a single permission error rejected the whole
      // Promise.all and denied an admin who matched on email.
      const safe = (p: Promise<any>) =>
        p.catch(() => ({ exists: () => false }) as any);

      const results = await Promise.all(
        adminDocIds(user).map((id) => safe(getDoc(doc(db, "admins", id)))),
      );
      const isUserAdmin = results.some((res) => res.exists());
      setIsAdmin(isUserAdmin);
    } catch (error: any) {
      if (
        error.code === "permission-denied" ||
        error.message.includes("Missing or insufficient permissions")
      ) {
        setIsAdmin(false);
      } else {
        console.error("Verification error", error);
        setIsAdmin(false); // Default to denying access on unknown errors
      }
    } finally {
      setVerifying(false);
      setAuthLoading(false);
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    // Da qui l'intenzione è certa: se il precaricamento non è ancora partito
    // (browser mai inattivo, clic immediato) si scarica ora, mentre l'utente
    // sceglie l'account nel popup di Google. È tempo che sarebbe comunque
    // speso ad aspettare.
    prefetchDashboard();
    try {
      // If an anonymous session is active, drop it first so the Google sign-in
      // replaces it cleanly.
      if (auth.currentUser?.isAnonymous) {
        await signOut(auth).catch(() => {});
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login popup error:", error);
      if (error.code === "auth/unauthorized-domain") {
        alert(
          "ERRORE: Il dominio da cui stai accedendo non è autorizzato in Firebase. Aggiungilo nella console Firebase (Authentication -> Settings -> Authorized domains).",
        );
      } else if (
        error.code === "auth/cancelled-popup-request" ||
        error.message?.includes("cancelled-popup-request")
      ) {
        // Just ignore if they cancelled it.
      } else if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/operation-not-supported-in-this-environment" ||
        error.code === "auth/web-storage-unsupported" ||
        error.message?.includes("popup")
      ) {
        // Popup blocked or unusable (third-party cookie restrictions, in-app
        // browsers, strict privacy settings): fall back to a full-page redirect,
        // which does not depend on popups or third-party storage.
        try {
          // Segnato PRIMA di navigare via: al ritorno è l'unico indizio che
          // esista un risultato da riscuotere.
          try {
            sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
          } catch {
            /* archiviazione bloccata: si riscuoterà comunque al prossimo giro */
          }
          await signInWithRedirect(auth, googleProvider);
          return; // page navigates away
        } catch (redirectErr: any) {
          try {
            sessionStorage.removeItem(REDIRECT_PENDING_KEY);
          } catch {
            /* niente da ripulire */
          }
          console.error("Redirect sign-in failed:", redirectErr);
          alert(
            "Il login con Google non è riuscito: il browser ha bloccato sia il popup sia il reindirizzamento. Prova a disattivare il blocco popup o ad usare un'altra finestra del browser.",
          );
        }
      } else {
        alert(`Errore durante il login: ${error.message || "Errore sconosciuto"}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (authLoading || verifying) {
    return (
      <div className="min-h-screen bg-[var(--ag-bg)] flex flex-col gap-4 items-center justify-center transition-colors">
        <div className="w-8 h-8 border-4 border-[var(--ag-accent)] border-t-transparent rounded-full animate-spin"></div>
        {isStuck && (
          <div className="text-center text-sm text-[var(--ag-muted)] px-4 max-w-sm mt-4">
            Il controllo dell'accesso sta impiegando più del previsto.
            {window.self !== window.top
              ? " La pagina è dentro un iframe: aprila in una nuova scheda."
              : " Ricarica la pagina; se il problema persiste, esci e rifai il login."}
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-[var(--ag-surface-2)] text-[var(--ag-text)] border border-[var(--ag-border)] text-xs font-bold"
              >
                Ricarica
              </button>
              <button
                onClick={async () => {
                  await signOut(auth).catch(() => {});
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold"
              >
                Esci e riprova
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--ag-bg)] flex items-center justify-center p-4 relative transition-colors">
        <Link
          to="/"
          className="absolute top-8 left-8 text-sm font-medium hover:underline text-[var(--ag-muted)] hover:text-[var(--ag-text)]"
        >
          &larr; Torna alla Home
        </Link>
        {/*
          Era un <motion.div> per una sola dissolvenza in entrata. Costava
          l'intera libreria di animazione — circa 100 kB — sul percorso
          critico di /dashboard, cioè proprio la schermata d'accesso di cui si
          lamenta la lentezza. La stessa animazione in CSS pesa due righe
          (ag-fade-in, in index.css) e non richiede JavaScript.
        */}
        <div className="ag-fade-in bg-[var(--ag-surface)] p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-[var(--ag-border)]">
          <Logo className="mb-8 w-48 h-16 mx-auto" />
          <h2 className="text-2xl font-bold mb-2 text-[var(--ag-text-strong)]">Accesso Riservato</h2>
          <p className="text-[var(--ag-muted)] mb-8">
            Accedi con l'account amministratore per visualizzare i messaggi.
          </p>

          {window.self !== window.top && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm">
              <p className="font-semibold mb-2">Problemi di Accesso?</p>
              <p className="mb-3">Il login con Google potrebbe non funzionare all'interno di questa anteprima (iframe). Per accedere correttamente, apri l'app in una nuova scheda.</p>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block w-full py-2 px-4 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 rounded-lg text-center font-medium transition-colors"
              >
                Apri in una nuova scheda
              </a>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            /* Era nero fisso: sul pannello scuro (#241f1a) il pulsante
               principale spariva quasi nel fondo. Ora usa l'arancio del
               marchio, che è il colore dell'azione in entrambi i temi. */
            className="w-full py-3 px-4 bg-[var(--ag-accent)] text-[var(--ag-on-accent)] rounded-xl font-medium hover:bg-[var(--ag-accent-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-[var(--ag-on-accent)] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {/* La "G" a quattro colori di Google sta su una piastrella
                    bianca: sull'arancio del pulsante il giallo e il rosso del
                    marchio si confonderebbero con il fondo, ed è anche il
                    trattamento previsto dalle linee guida di Google. */}
                <span className="w-7 h-7 -ml-1 rounded-lg bg-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                </span>
                <span>Accedi con Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[var(--ag-bg)] flex items-center justify-center p-4 relative transition-colors">
        <Link
          to="/"
          className="absolute top-8 left-8 text-sm font-medium hover:underline text-[var(--ag-muted)] hover:text-[var(--ag-text)]"
        >
          &larr; Torna alla Home
        </Link>
        <div className="bg-[var(--ag-surface)] p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-[var(--ag-border)]">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4 border dark:border-red-800">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[var(--ag-text-strong)]">Accesso Negato</h2>
          <p className="text-[var(--ag-muted)] mb-2">
            L'account corrente non è autorizzato o non dispone dei permessi
            necessari per visualizzare la bacheca.
          </p>
          {user?.email && (
            <p className="text-xs font-mono text-[var(--ag-muted)] mb-6 break-all">
              Account: {user.email}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                await signOut(auth).catch(() => {});
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-[var(--ag-accent)] text-[var(--ag-on-accent)] hover:bg-[var(--ag-accent-hover)] transition-colors rounded-xl font-medium text-sm"
            >
              Esci e accedi con un altro account
            </button>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-[var(--ag-muted)] hover:text-[var(--ag-text)] transition-colors"
            >
              Disconnetti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
