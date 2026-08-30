/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// ---------------------------------------------------------------------------
// PUBLIC Firebase web config.
// A Firebase *web* config is not a secret: it ships in every client bundle and
// is protected by Firestore Security Rules, not by hiding these values. We keep
// a hard-coded fallback so static hosts (GitHub Pages) work with zero env setup,
// while still allowing overrides via Vite env vars for other environments.
// ---------------------------------------------------------------------------
const FALLBACK_CONFIG = {
  apiKey: "AIzaSyD-XjwIWQeUIoclmXxPADic2eSX_HPXh3s",
  authDomain: "gen-lang-client-0044830855.firebaseapp.com",
  projectId: "gen-lang-client-0044830855",
  storageBucket: "gen-lang-client-0044830855.firebasestorage.app",
  messagingSenderId: "846494086154",
  appId: "1:846494086154:web:26040e783abbf5e09edbf3",
  // IMPORTANT: production uses a NAMED Firestore database, not "(default)".
  // Connecting to "(default)" is what made the Dashboard hang / error / log out.
  databaseId: "ai-studio-63685bd1-0fce-44d7-9f31-2b379e8305a0",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK_CONFIG.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK_CONFIG.authDomain,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK_CONFIG.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    FALLBACK_CONFIG.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    FALLBACK_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FALLBACK_CONFIG.appId,
};

// The Firestore database id lives OUTSIDE firebaseConfig and must be passed as
// the 3rd argument of initializeFirestore — it is NOT a valid FirebaseOptions key.
const DATABASE_ID =
  import.meta.env.VITE_FIREBASE_DATABASE_ID || FALLBACK_CONFIG.databaseId;

let app: any;
let auth: any;
let db: any;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      // Pass the named database id so we hit the same DB as production.
      // Omitting it silently connects to "(default)".
      DATABASE_ID && DATABASE_ID !== "(default)" ? DATABASE_ID : undefined,
    );
  }
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();
export const FIRESTORE_DATABASE_ID = DATABASE_ID;
