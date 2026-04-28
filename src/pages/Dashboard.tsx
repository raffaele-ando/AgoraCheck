import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, limit } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged, User, getRedirectResult } from "firebase/auth";
import { db, auth, googleProvider } from "../firebase";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Logo } from "../components/Logo";
import { LogOut, Monitor, Smartphone, Globe, Clock, Inbox, MapPin, Calendar, Search, Activity, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  lookingFor: string;
  when?: string;
  where?: string;
  createdAt: Timestamp | null;
  deviceInfo: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
  };
  advancedInfo?: any;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch(err => console.error("Redirect result error:", err));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      setIsAuthorized(null);
      return;
    }

    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setIsAuthorized(true);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setIsAuthorized(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login popup error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("ERRORE: Il dominio da cui stai accedendo (es. agora.theproject.world) non è autorizzato in Firebase. Devi andare nella console Firebase -> Authentication -> Settings -> Authorized domains e aggiungere il tuo dominio.");
      } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.message.includes('popup')) {
        const fallback = window.confirm("Il popup di accesso è stato bloccato dal browser (molto comune su Safari/iOS e app interne). Vuoi provare ad accedere reindirizzando la pagina?");
        if (fallback) {
          import("firebase/auth").then(({ signInWithRedirect }) => {
            signInWithRedirect(auth, googleProvider);
          });
        }
      } else {
        alert("Errore di accesso: " + error.message);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo spotted? Questa azione è irreversibile.")) {
      try {
        await deleteDoc(doc(db, "messages", messageId));
      } catch (error) {
        console.error("Errore durante l'eliminazione:", error);
        alert("Errore durante l'eliminazione del messaggio.");
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-center p-4 relative">
        <Link to="/polimi" className="absolute top-8 left-8 text-sm font-medium hover:underline text-gray-500">
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
          
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Accedi con Google
            </button>
          </div>
          
          <p className="mt-6 text-xs text-red-500 font-medium">
            * Se l'accesso fallisce, aprilo in una nuova finestra/browser!
          </p>
        </motion.div>
      </div>
    );
  }

  if (user && isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8" />
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

  return (
    <div className="min-h-screen bg-[#F4F1EA] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm">
          <div className="flex items-center gap-4">
            <Link to="/polimi">
              <Logo className="scale-75 sm:scale-50 origin-left hover:opacity-80 transition-opacity" />
            </Link>
            <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 hidden md:block">
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
              title="Disconnetti"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/20">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nessun messaggio</h3>
            <p className="text-gray-500">I messaggi ricevuti appariranno qui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {msg.createdAt ? format(msg.createdAt.toDate(), "d MMM yyyy, HH:mm", { locale: it }) : "Data sconosciuta"}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                      ID: {msg.id.slice(0, 8)}
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Elimina Messaggio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Search className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Chi/Cosa</span>
                    </div>
                    <p className="text-gray-900 font-medium whitespace-pre-wrap break-words">
                      {msg.lookingFor}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                      <div className="flex items-center gap-2 text-orange-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Quando</span>
                      </div>
                      <p className="text-gray-800 text-sm">
                        {msg.when || <span className="text-gray-400 italic">Non specificato</span>}
                      </p>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Dove</span>
                      </div>
                      <p className="text-gray-800 text-sm">
                        {msg.where || <span className="text-gray-400 italic">Non specificato</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dettagli Dispositivo</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Monitor className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Piattaforma</div>
                        <div className="text-sm font-medium text-gray-900 truncate" title={msg.deviceInfo?.platform}>
                          {msg.deviceInfo?.platform || "Sconosciuta"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Risoluzione</div>
                        <div className="text-sm font-medium text-gray-900">
                          {msg.deviceInfo?.screenResolution || "Sconosciuta"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Lingua & Fuso</div>
                        <div className="text-sm font-medium text-gray-900 truncate" title={`${msg.deviceInfo?.language} / ${msg.deviceInfo?.timezone}`}>
                          {msg.deviceInfo?.language || "N/A"} • {msg.deviceInfo?.timezone?.split('/')[1]?.replace('_', ' ') || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t border-gray-200/50">
                    <div className="text-[10px] text-gray-400 font-mono break-all leading-tight">
                      {msg.deviceInfo?.userAgent}
                    </div>
                    {msg.advancedInfo && (
                      <div className="mt-4 border-t border-gray-200/50 pt-3">
                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Dati Telemetrici Avanzati
                        </div>
                        {(() => {
                           try {
                             const adv = typeof msg.advancedInfo === 'string' ? JSON.parse(msg.advancedInfo) : msg.advancedInfo;
                             return (
                               <div className="grid grid-cols-1 gap-4 text-[10px] font-mono text-gray-600 bg-white p-2 rounded border border-gray-100">
                                  <div className="space-y-1">
                                     <strong className="text-gray-800 border-b border-gray-200 pb-1 mb-1 block">Rete & Posizione</strong>
                                     <div>IP: {adv.network?.ip}</div>
                                     <div>Località: {adv.network?.city}, {adv.network?.region} ({adv.network?.country})</div>
                                     <div className="truncate" title={adv.network?.isp}>ISP: {adv.network?.isp}</div>
                                     <div className="truncate" title={adv.network?.referer}>Referer: {adv.network?.referer}</div>
                                  </div>
                                  <div className="space-y-1">
                                     <strong className="text-gray-800 border-b border-gray-200 pb-1 mb-1 block">Hardware Fingerprint</strong>
                                     <div className="truncate" title={adv.hardware?.gpu}>GPU: {adv.hardware?.gpu}</div>
                                     <div>CPU/RAM: {adv.hardware?.cores} Core / {adv.hardware?.ram}GB</div>
                                     <div>Disp. Multimediali: {adv.hardware?.mediaDevicesCount}</div>
                                     <div>Batteria: {adv.hardware?.battery?.level} (In carica: {adv.hardware?.battery?.charging ? 'Si' : 'No'})</div>
                                  </div>
                                  <div className="space-y-1">
                                     <strong className="text-gray-800 border-b border-gray-200 pb-1 mb-1 block">Comportamento (In-Session)</strong>
                                     <div>Durata Sessione (all'invio): {adv.behavior?.sessionTimeSeconds}s</div>
                                     <div>Scroll Massimo: {adv.behavior?.maxScrollDepth}%</div>
                                     <div>Clicks / Tasti Premuti: {adv.behavior?.clicks} / {adv.behavior?.keyStrokes}</div>
                                     <div>Uscite dalla pagina (Blur): {adv.behavior?.blurCount}</div>
                                     <div>Orientamento / Focus: {adv.behavior?.orientation} / {adv.behavior?.windowActive ? 'Attivo' : 'Inattivo'}</div>
                                  </div>
                                  <div className="space-y-1">
                                     <strong className="text-gray-800 border-b border-gray-200 pb-1 mb-1 block">Software Fingerprint</strong>
                                     <div>Canvas Hash ID: {adv.software?.canvasFingerprint}</div>
                                     <div>Audio Hash ID: {adv.software?.audioFingerprint || "N/A"}</div>
                                     <div className="truncate" title={adv.software?.fontsIdentified?.join(', ')}>Font Rilevati ({adv.software?.fontsIdentified?.length}): {adv.software?.fontsIdentified?.join(', ')}</div>
                                  </div>
                               </div>
                             );
                           } catch {
                             return <div className="text-[10px] text-gray-400 break-all bg-gray-100 p-2 rounded">{msg.advancedInfo}</div>;
                           }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
