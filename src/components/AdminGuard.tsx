import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getDocs, query, collection, limit } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { Logo } from './Logo';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch(err => {
      console.error("Redirect result error:", err);
      if (err?.code === 'auth/admin-restricted-operation') {
        alert("ERRORE: L'operazione è ristretta agli amministratori. Assicurati che Firebase Authentication consenta la creazione di nuovi account.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        verifyAdminAccess();
      } else {
        setIsAdmin(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const verifyAdminAccess = async () => {
    setVerifying(true);
    try {
      const q = query(collection(db, "messages"), limit(1));
      await getDocs(q);
      setIsAdmin(true);
    } catch (error: any) {
      if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login popup error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("ERRORE: Il dominio da cui stai accedendo non è autorizzato in Firebase. Aggiungilo nella console Firebase (Authentication -> Settings -> Authorized domains).");
      } else if (error.code === 'auth/cancelled-popup-request' || error.message?.includes('cancelled-popup-request')) {
        // Just ignore if they cancelled it.
      } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup')) {
        // Silently ignore or show a small alert
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
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center p-4 relative">
        <Link to="/" className="absolute top-8 left-8 text-sm font-medium hover:underline text-gray-500">
          &larr; Torna alla Home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <Logo className="mb-8 scale-75" />
          <h2 className="text-2xl font-bold mb-2">Accesso Riservato</h2>
          <p className="text-gray-500 mb-8">Accedi con l'account amministratore per visualizzare i messaggi.</p>
          
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Accedi con Google</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center p-4 relative">
        <Link to="/" className="absolute top-8 left-8 text-sm font-medium hover:underline text-gray-500">
          &larr; Torna alla Home
        </Link>
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Accesso Negato</h2>
          <p className="text-gray-500 mb-6">L'account corrente non è autorizzato o non dispone dei permessi necessari per visualizzare la bacheca.</p>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            Disconnetti
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
