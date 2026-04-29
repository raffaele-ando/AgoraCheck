import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, limit, updateDoc, setDoc } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged, User, getRedirectResult } from "firebase/auth";
import { db, auth, googleProvider } from "../firebase";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Logo } from "../components/Logo";
import { LogOut, Monitor, Smartphone, Globe, Clock, Inbox, MapPin, Calendar, Search, Activity, Trash2, Fingerprint, ChevronDown, User as UserIcon, ShieldAlert, Cpu, CheckCircle2, Inbox as InboxIcon, Archive, ArchiveRestore } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  lookingFor: string;
  when?: string;
  where?: string;
  instagram?: string;
  createdAt: Timestamp | null;
  deviceInfo: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
  };
  advancedInfo?: any;
  profileGroupId?: string;
  isArchived?: boolean;
}

interface ProfileRecord {
  id: string;
  name?: string;
  suspects?: string[];
  instagram?: string; // deprecated
  customInstagrams?: string[];
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const [loading, setLoading] = useState(true);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileSuspectsInput, setProfileSuspectsInput] = useState("");
  const [profileCustomInstagramsInput, setProfileCustomInstagramsInput] = useState("");
  const [viewFilter, setViewFilter] = useState<'new' | 'archived'>('new');

  useEffect(() => {
    if (editingProfileId) {
      setProfileNameInput(profiles[editingProfileId]?.name || "");
      setProfileSuspectsInput(profiles[editingProfileId]?.suspects?.join(", ") || "");
      setProfileCustomInstagramsInput(profiles[editingProfileId]?.customInstagrams?.join(", ") || "");
    }
  }, [editingProfileId, profiles]);

  const saveProfile = async () => {
    if (!editingProfileId) return;
    try {
      await setDoc(doc(db, "profiles", editingProfileId), {
        name: profileNameInput.trim(),
        suspects: profileSuspectsInput.split(",").map(s => s.trim()).filter(Boolean),
        customInstagrams: profileCustomInstagramsInput.split(",").map(s => s.trim().replace(/[@\s]/g, '').toLowerCase()).filter(Boolean)
      }, { merge: true });
      setEditingProfileId(null);
    } catch (err: any) {
      if (err.message?.includes("Missing or insufficient permissions")) {
         const errInfo = {
          error: err instanceof Error ? err.message : String(err),
          operationType: "write",
          path: `profiles/${editingProfileId}`,
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            tenantId: auth.currentUser?.tenantId,
            providerInfo: auth.currentUser?.providerData?.map(provider => ({
              providerId: provider.providerId,
              email: provider.email,
            })) || []
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        alert("Errore salvataggio profilo");
        throw new Error(JSON.stringify(errInfo));
      }
      console.error(err);
      alert("Errore salvataggio profilo");
    }
  };

  const getDeviceProfile = (msg: Message) => {
    if (msg.profileGroupId) return msg.profileGroupId;
    if (!msg.advancedInfo) return "UNKNOWN";
    try {
      const adv = typeof msg.advancedInfo === 'string' ? JSON.parse(msg.advancedInfo) : msg.advancedInfo;
      const canvas = adv.software?.canvasFingerprint || "";
      const audio = adv.software?.audioFingerprint || "";
      const gpu = adv.hardware?.gpu || "";
      const screen = adv.hardware?.screen || "";
      const cores = adv.hardware?.cores || "";
      const seed = `${canvas}-${audio}-${gpu}-${screen}-${cores}`;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      return `AUTO-${Math.abs(hash).toString(16).toUpperCase().padStart(6, '0')}`;
    } catch {
      return "UNKNOWN";
    }
  };

  const getProfileInstagrams = (profileId: string): { tags: string[], hasMultiple: boolean } => {
    // Collect from messages
    const msgsWithInsta = messages.filter(m => getDeviceProfile(m) === profileId && m.instagram);
    const msgTags = msgsWithInsta.map(m => m.instagram!.toLowerCase().replace(/[@\s]/g, ''));
    
    // Collect from profiles (legacy single instagram + custom array)
    const profile = profiles[profileId];
    const profileTags = [];
    if (profile?.instagram) profileTags.push(profile.instagram.toLowerCase().replace(/[@\s]/g, ''));
    if (profile?.customInstagrams) profileTags.push(...profile.customInstagrams.map(t => t.toLowerCase().replace(/[@\s]/g, '')));
    
    // Unique list
    const uniqueTags = Array.from(new Set([...msgTags, ...profileTags]));
    return { tags: uniqueTags, hasMultiple: uniqueTags.length > 1 };
  };

  const getProfileColor = (profileId: string) => {
    let hash = 0;
    for (let i = 0; i < profileId.length; i++) {
      hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  useEffect(() => {
    getRedirectResult(auth).catch(err => {
      console.error("Redirect result error:", err);
      if (err?.code === 'auth/admin-restricted-operation') {
        alert("ERRORE: L'operazione è ristretta agli amministratori. Assicurati che Firebase Authentication consenta la creazione di nuovi account (Console -> Authentication -> Settings -> User actions -> Enable create).");
      }
    });

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
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setIsAuthorized(true);
      setLoading(false);
    }, (error) => {
      setIsAuthorized(false);
      setLoading(false);
    });

    const unsubscribeProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
      const pmap: Record<string, ProfileRecord> = {};
      snapshot.docs.forEach(doc => { pmap[doc.id] = { id: doc.id, ...doc.data() } as ProfileRecord; });
      setProfiles(pmap);
      setProfilesLoaded(true);
    }, (error) => {
      setProfilesLoaded(true);
      // Ignore fetch errors if unauthorized
    });

    return () => { unsubscribeMsgs(); unsubscribeProfiles(); };
  }, [user]);

  // Auto-sync discovered instagram tags to the persistent profile records
  useEffect(() => {
    if (!isAuthorized) return;
    const syncInstagrams = async () => {
      for (const msg of messages) {
        if (msg.instagram) {
          const cleanInsta = msg.instagram.toLowerCase().replace(/[@\s]/g, '');
          const pid = getDeviceProfile(msg);
          const currentProfile = profiles[pid];
          const currCustom = currentProfile?.customInstagrams || [];
          const currCustomNormalized = currCustom.map(t => t.toLowerCase().replace(/[@\s]/g, ''));
          // we check if it is already present in customInstagrams or legacy instagram
          if (currentProfile?.instagram?.toLowerCase().replace(/[@\s]/g, '') === cleanInsta || currCustomNormalized.includes(cleanInsta)) {
            continue;
          }
          try {
            const nextCustom = Array.from(new Set([...currCustom, cleanInsta]));
            await setDoc(doc(db, "profiles", pid), { customInstagrams: nextCustom }, { merge: true });
          } catch(e: any) {
            if (e.message?.includes("Missing or insufficient permissions")) {
               const errInfo = {
                error: e instanceof Error ? e.message : String(e),
                operationType: "write",
                path: `profiles/${pid}`,
                authInfo: {
                  userId: auth.currentUser?.uid,
                  email: auth.currentUser?.email,
                  emailVerified: auth.currentUser?.emailVerified,
                  isAnonymous: auth.currentUser?.isAnonymous,
                  tenantId: auth.currentUser?.tenantId,
                  providerInfo: auth.currentUser?.providerData?.map(provider => ({
                    providerId: provider.providerId,
                    email: provider.email,
                  })) || []
                }
              };
              console.error('Firestore Error: ', JSON.stringify(errInfo));
              throw new Error(JSON.stringify(errInfo));
            }
          }
        }
      }
    };
    syncInstagrams();
  }, [messages, profiles, isAuthorized]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login popup error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("ERRORE: Il dominio da cui stai accedendo (es. agora.theproject.world) non è autorizzato in Firebase. Devi andare nella console Firebase -> Authentication -> Settings -> Authorized domains e aggiungere il tuo dominio.");
      } else if (error.code === 'auth/admin-restricted-operation') {
        alert("ERRORE: L'operazione è ristretta agli amministratori. Se stai cercando di effettuare il login, assicurati che Firebase Authentication sia configurato per permettere la creazione di nuovi account: vai nella Console Firebase -> Authentication -> Settings -> User actions e assicurati che 'Enable create (sign-up)' sia attivo.");
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

  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; messageId: string | null; type: 'delete' | 'ungroup' | 'delete-bulk' | null }>({ isOpen: false, messageId: null, type: null });

  const confirmAction = async () => {
    if (!confirmModalState.messageId || !confirmModalState.type) return;
    
    try {
      if (confirmModalState.type === 'delete') {
        await deleteDoc(doc(db, "messages", confirmModalState.messageId));
      } else if (confirmModalState.type === 'ungroup') {
        await updateDoc(doc(db, "messages", confirmModalState.messageId), { profileGroupId: null });
      } else if (confirmModalState.type === 'delete-bulk') {
        await Promise.all(selectedMessages.map(id => deleteDoc(doc(db, "messages", id))));
        setSelectedMessages([]);
        setIsSelectMode(false);
      }
    } catch (error) {
      console.error(error);
      alert("Errore durante l'operazione.");
    } finally {
      setConfirmModalState({ isOpen: false, messageId: null, type: null });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setConfirmModalState({ isOpen: true, messageId, type: 'delete' });
  };

  const toggleArchiveStatus = async (messageId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "messages", messageId), { isArchived: !currentStatus });
    } catch (e) {
      console.error(e);
      alert("Errore durante l'operazione.");
    }
  };

  const handleBulkArchive = async () => {
    if (selectedMessages.length === 0) return;
    try {
      // Determiniamo in quale tab ci troviamo (new o archived) e invertirne lo stato per la selezione
      const targetStatus = viewFilter === 'new' ? true : false;
      const updates = selectedMessages.map(id => updateDoc(doc(db, "messages", id), { isArchived: targetStatus }));
      await Promise.all(updates);
      setIsSelectMode(false);
      setSelectedMessages([]);
    } catch (e) {
      console.error(e);
      alert("Errore durante l'operazione di massa.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedMessages(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");

  const handleGroupDevices = () => {
    if (selectedMessages.length < 2) {
      alert("Seleziona almeno 2 messaggi per raggrupparli.");
      return;
    }
    setGroupNameInput("");
    setShowGroupPrompt(true);
  };

  const confirmGroupDevices = async () => {
    const newProfileGroupId = groupNameInput.trim() || `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    try {
      await Promise.all(selectedMessages.map(id => 
        updateDoc(doc(db, "messages", id), { profileGroupId: newProfileGroupId })
      ));
      setSelectedMessages([]);
      setIsSelectMode(false);
      setShowGroupPrompt(false);
      // alert(`Messaggi raggruppati con successo nel profilo: ${newProfileGroupId}`);
    } catch (e) {
      console.error(e);
      alert("Errore durante il raggruppamento.");
    }
  };

  const handleUngroupDevice = (messageId: string) => {
    setConfirmModalState({ isOpen: true, messageId, type: 'ungroup' });
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

  const filteredMessages = messages.filter(m => viewFilter === 'archived' ? m.isArchived : !m.isArchived);

  return (
    <div className={`min-h-[100dvh] p-4 md:p-8 transition-colors duration-500 ${isSelectMode ? 'bg-slate-100/60' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <header className={`sticky top-2 sm:top-4 z-40 flex flex-col xl:flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 rounded-3xl border shadow-sm transition-all duration-500 ${isSelectMode ? 'bg-indigo-900/95 backdrop-blur-xl border-indigo-800 shadow-indigo-900/20 text-white shadow-lg scale-[1.01]' : 'bg-white/90 backdrop-blur-xl border-gray-200/60 shadow-sm'}`}>
          <div className="flex items-center gap-2 sm:gap-4 w-full xl:w-auto justify-between xl:justify-start min-w-0 shrink-0">
            <Link to="/" className="shrink-0 flex items-center">
              <Logo className={`scale-[0.6] sm:scale-50 origin-left hover:opacity-80 transition-all duration-300 ${isSelectMode ? 'invert brightness-0' : ''}`} />
            </Link>
            <div className={`h-8 w-px hidden sm:block transition-colors duration-300 ${isSelectMode ? 'bg-indigo-700' : 'bg-gray-300'}`}></div>
            {isSelectMode ? (
              <div className="flex items-center gap-2 min-w-0">
                 <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)] shrink-0"></div>
                 <h1 className="text-xs sm:text-base font-bold tracking-wider uppercase truncate">Tracciamento</h1>
              </div>
            ) : (
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 uppercase truncate">Dashboard</h1>
            )}
            
            {!isSelectMode && (
              <button
                onClick={handleLogout}
                className="xl:hidden p-2 bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0 ml-auto"
                title="Disconnetti"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-start gap-2 sm:gap-3 w-full xl:w-auto flex-wrap pb-2 xl:pb-0">
            {!isSelectMode && (
              <div className="text-xs sm:text-sm text-gray-500 font-medium hidden lg:block bg-gray-100/50 px-3 py-1.5 rounded-full border border-gray-200/50 truncate max-w-[200px] shrink-0">
                {user?.email}
              </div>
            )}
            
            {isSelectMode ? (
              <div className="flex xl:border-l xl:border-indigo-700/50 xl:pl-3 w-full sm:w-auto items-center justify-between sm:justify-start gap-2 flex-wrap animate-in fade-in slide-in-from-right-4 duration-300">
                <span className="text-xs sm:text-sm font-medium text-indigo-200 hidden md:inline-block whitespace-nowrap">
                  Selezionati: <span className="text-white font-black text-base">{selectedMessages.length}</span>
                </span>
                <button
                  onClick={handleGroupDevices}
                  disabled={selectedMessages.length === 0}
                  className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-500 text-white text-[10px] sm:text-sm font-black uppercase tracking-wide rounded-xl hover:bg-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span className="md:hidden">({selectedMessages.length})</span> Raggruppa
                </button>
                <button
                  onClick={handleBulkArchive}
                  disabled={selectedMessages.length === 0}
                  className="flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-500 text-white text-[10px] sm:text-sm font-black uppercase tracking-wide rounded-xl hover:bg-gray-400 focus:ring-4 focus:ring-gray-500/20 transition-all disabled:opacity-50 shadow-lg shadow-gray-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                  title={viewFilter === 'new' ? "Archivia Selezionati" : "Sposta in Nuovi"}
                >
                  {viewFilter === 'new' ? <Archive className="w-3.5 h-3.5 sm:hidden" /> : <ArchiveRestore className="w-3.5 h-3.5 sm:hidden" />}
                  <span className="hidden sm:inline">{viewFilter === 'new' ? "Archivia" : "Ripristina"}</span>
                </button>
                <button
                  onClick={() => setConfirmModalState({ isOpen: true, messageId: 'bulk', type: 'delete-bulk' })}
                  disabled={selectedMessages.length === 0}
                  className="flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500 text-white text-[10px] sm:text-sm font-black uppercase tracking-wide rounded-xl hover:bg-red-400 focus:ring-4 focus:ring-red-500/20 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                  title="Elimina Selezionati"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:hidden" />
                  <span className="hidden sm:inline">Elimina</span>
                </button>
                <button
                  onClick={() => { setIsSelectMode(false); setSelectedMessages([]); }}
                  className="flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-white/10 text-white text-[10px] sm:text-sm font-bold uppercase tracking-wide rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm active:scale-95"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsSelectMode(true); setSelectedMessages([]); }}
                className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200/60 text-[10px] sm:text-sm font-black uppercase tracking-wide rounded-xl hover:shadow-md hover:bg-indigo-100 transition-all active:scale-95"
              >
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                <span className="shrink-0">Tracciamento Manuale</span>
              </button>
            )}

            {!isSelectMode && (
              <button
                onClick={handleLogout}
                className="hidden xl:flex p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all shrink-0"
                title="Disconnetti"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {!isSelectMode && (
          <div className="flex items-center gap-2 mb-6 sm:mb-8 overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
            <button
              onClick={() => setViewFilter('new')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap ${viewFilter === 'new' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
              <InboxIcon className="w-4 h-4" />
              Spotted Nuovi
              {messages.filter(m => !m.isArchived).length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${viewFilter === 'new' ? 'bg-indigo-500 text-white border border-indigo-400' : 'bg-gray-100 text-gray-500'}`}>
                  {messages.filter(m => !m.isArchived).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewFilter('archived')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap ${viewFilter === 'archived' ? 'bg-gray-800 text-white shadow-md shadow-gray-300' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
              <Archive className="w-4 h-4" />
              Letti / Archiviati
              {messages.filter(m => m.isArchived).length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${viewFilter === 'archived' ? 'bg-gray-700 text-white border border-gray-600' : 'bg-gray-100 text-gray-500'}`}>
                  {messages.filter(m => m.isArchived).length}
                </span>
              )}
            </button>
          </div>
        )}

        {loading || !profilesLoaded ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/20">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nessun messaggio</h3>
            <p className="text-gray-500">I messaggi in questa sezione appariranno qui.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
            {filteredMessages.map((msg, idx) => {
              const profileId = getDeviceProfile(msg);
              const profileColor = getProfileColor(profileId);
              const isSelected = selectedMessages.includes(msg.id);

              return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0 
                }}
                transition={{ 
                  opacity: { delay: Math.min(idx * 0.02, 1), duration: 0.3 }, 
                  y: { delay: Math.min(idx * 0.02, 1), duration: 0.3 } 
                }}
                className={`bg-white rounded-3xl p-5 md:p-6 shadow-sm border break-inside-avoid inline-block w-full mb-6 ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-100' : isSelectMode ? 'border-gray-300 hover:border-indigo-400 opacity-80 hover:opacity-100' : 'border-gray-200 hover:border-gray-300'} transition-colors duration-300 relative group cursor-default z-0 hover:z-10`}
                onClick={() => isSelectMode ? toggleSelection(msg.id) : undefined}
                style={{ cursor: isSelectMode ? 'pointer' : 'default' }}
              >
                {/* Header: Profile & Actions */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    {isSelectMode && (
                      <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 scale-110 shadow-md' : 'border-gray-300 bg-white group-hover:border-indigo-400'}`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 items-start min-w-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (!isSelectMode) setEditingProfileId(profileId); }}
                        className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full text-white flex items-center gap-1.5 shadow-sm hover:opacity-90 max-w-full transition-opacity ${isSelectMode ? 'opacity-70 group-hover:opacity-100 pointer-events-none' : 'cursor-pointer'}`} 
                        style={{ backgroundColor: profileColor }}
                        title="Gestisci Profilo"
                      >
                        <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate">{profiles[profileId]?.name || (profileId.startsWith('AUTO-') ? "Auto" : "Manuale")} • {profileId.slice(0,8)}</span>
                      </button>
                      {msg.profileGroupId && !isSelectMode && (
                        <button onClick={(e) => { e.stopPropagation(); handleUngroupDevice(msg.id); }} className="text-[10px] text-gray-400 hover:text-red-500 hover:underline">
                          Rimuovi dal Gruppo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 font-mono">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{msg.createdAt ? format(msg.createdAt.toDate(), "d MMM HH:mm", { locale: it }) : "N/A"}</span>
                    </div>
                    {!isSelectMode && (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleArchiveStatus(msg.id, !!msg.isArchived); }}
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${msg.isArchived ? 'text-indigo-500 hover:bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          title={msg.isArchived ? "Sposta in Nuovi" : "Segna come Letto/Archivia"}
                        >
                          {msg.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                          title="Elimina Messaggio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Core Content */}
                <div className="space-y-4 mb-5">
                  <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Search className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-900/70">Target (Chi/Cosa)</span>
                    </div>
                    <p className="text-gray-900 font-medium whitespace-pre-wrap break-words text-lg leading-snug">
                      {msg.lookingFor}
                    </p>
                  </div>

                  {(msg.when || msg.where) && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {msg.when && (
                        <div className="flex-1 min-w-0 bg-gray-50/80 px-3 py-2.5 rounded-xl border border-gray-100 flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Quando</div>
                            <div className="text-sm font-medium text-gray-800 break-words">{msg.when}</div>
                          </div>
                        </div>
                      )}
                      {msg.where && (
                        <div className="flex-1 min-w-0 bg-gray-50/80 px-3 py-2.5 rounded-xl border border-gray-100 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dove</div>
                            <div className="text-sm font-medium text-gray-800 break-words">{msg.where}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const { tags, hasMultiple } = getProfileInstagrams(profileId);
                    if (tags.length === 0) return null;
                    return (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100/50 relative overflow-hidden shadow-sm">
                        {!msg.instagram && (
                          <div className="absolute top-0 right-0 bg-gradient-to-bl from-purple-200 to-purple-100/50 text-purple-700 text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider backdrop-blur-sm z-10 border-b border-l border-white/50">
                            Via Profilazione
                          </div>
                        )}
                        <div className={`flex items-center gap-2 text-purple-600 mb-3 ${!msg.instagram ? 'pr-20' : ''}`}>
                          <span className="text-xs font-bold uppercase tracking-wider">Instagram</span>
                          {hasMultiple && <span className="text-[9px] font-black bg-purple-200/80 px-1.5 py-0.5 rounded text-purple-800 shadow-sm shrink-0">MULTIPLE</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, idx) => (
                            <a key={idx} href={`https://instagram.com/${tag}`} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform text-white text-sm sm:text-base font-bold bg-gradient-to-r from-purple-600 to-pink-500 shadow-indigo-200/50 shadow-lg px-3 py-1.5 rounded-xl inline-block max-w-full truncate">
                              @{tag}
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {profiles[profileId]?.suspects && profiles[profileId].suspects!.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Sospetti Associati ({profiles[profileId].suspects!.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profiles[profileId].suspects!.map(s => (
                          <div key={s} className="px-2.5 py-1 bg-red-100/80 text-red-800 text-xs font-bold rounded-lg border border-red-200/50">
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetry Details */}
                <details className="group border-t border-gray-100 pt-4 cursor-pointer outline-none">
                  <summary className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider outline-none hover:text-gray-700 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-indigo-400" />
                      Fingerprint & Telemetria
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-mono lowercase">id: {msg.id.slice(0, 8)}</span>
                      <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  
                  <div className="pt-4 pb-1 space-y-4 opacity-0 group-open:opacity-100 transition-opacity duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <Monitor className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Piattaforma</div>
                          <div className="text-xs font-medium text-gray-700 truncate" title={msg.deviceInfo?.platform}>
                            {msg.deviceInfo?.platform || "Sconosciuta"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <Smartphone className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Risoluzione</div>
                          <div className="text-xs font-medium text-gray-700 truncate">
                            {msg.deviceInfo?.screenResolution || "Sconosciuta"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100 col-span-2 sm:col-span-1">
                        <Globe className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">Lingua & Fuso</div>
                          <div className="text-xs font-medium text-gray-700 truncate">
                            {msg.deviceInfo?.language || "N/A"} • {msg.deviceInfo?.timezone?.split('/')[1]?.replace('_', ' ') || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[9px] text-gray-400 font-mono break-all leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {msg.deviceInfo?.userAgent}
                    </div>
                    
                    {msg.advancedInfo && (() => {
                      try {
                        const adv = typeof msg.advancedInfo === 'string' ? JSON.parse(msg.advancedInfo) : msg.advancedInfo;
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] font-mono text-gray-600">
                            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <strong className="text-gray-800 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider"><Globe className="w-3 h-3 text-blue-500"/> Rete & Posizione</strong>
                              <div><span className="text-gray-400">IP:</span> {adv.network?.ip || "N/A"}</div>
                              <div><span className="text-gray-400">GEO:</span> {adv.network?.city}, {adv.network?.region}</div>
                              <div className="truncate"><span className="text-gray-400">ISP:</span> {adv.network?.isp}</div>
                              <div className="truncate"><span className="text-gray-400">REF:</span> {adv.network?.referer || "N/A"}</div>
                              <div><span className="text-gray-400">NET:</span> {adv.network?.connectionType} ({adv.network?.downlink}Mbps)</div>
                            </div>
                            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <strong className="text-gray-800 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider"><Cpu className="w-3 h-3 text-purple-500"/> Hardware</strong>
                              <div className="truncate"><span className="text-gray-400">GPU:</span> {adv.hardware?.gpu}</div>
                              <div><span className="text-gray-400">CPU/RAM:</span> {adv.hardware?.cores}C / {adv.hardware?.ram}GB</div>
                              <div><span className="text-gray-400">RES:</span> {adv.hardware?.screen} ({adv.hardware?.pixelRatio}x)</div>
                              <div><span className="text-gray-400">TCH:</span> {adv.hardware?.touchSupport ? 'Si' : 'No'} (Max: {adv.hardware?.maxTouchPoints})</div>
                              <div><span className="text-gray-400">BAT:</span> {adv.hardware?.battery?.level || "N/A"} ({adv.hardware?.battery?.charging ? 'Plugged' : 'Unplugged'})</div>
                            </div>
                            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <strong className="text-gray-800 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider"><Activity className="w-3 h-3 text-orange-500"/> Comportamento</strong>
                              <div><span className="text-gray-400">SESSION:</span> {adv.behavior?.sessionTimeSeconds}s</div>
                              <div><span className="text-gray-400">SCROLL MAX:</span> {adv.behavior?.maxScrollDepth}%</div>
                              <div><span className="text-gray-400">CLICKS:</span> {adv.behavior?.clicks}</div>
                              <div><span className="text-gray-400">KEYS:</span> {adv.behavior?.keyStrokes}</div>
                              <div><span className="text-gray-400">BLUR:</span> {adv.behavior?.blurCount}</div>
                            </div>
                            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <strong className="text-gray-800 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider"><Monitor className="w-3 h-3 text-emerald-500"/> Software / Hash</strong>
                              <div className="truncate"><span className="text-gray-400">PR:</span> {adv.software?.platform}</div>
                              <div><span className="text-gray-400">CANVAS_ID:</span> <span className="font-bold text-gray-800">{adv.software?.canvasFingerprint?.slice(0, 16)}...</span></div>
                              <div><span className="text-gray-400">AUDIO_ID:</span> <span className="font-bold text-gray-800">{adv.software?.audioFingerprint?.slice(0, 16) || "N/A"}...</span></div>
                              <div className="truncate" title={adv.software?.fontsIdentified?.join(', ')}><span className="text-gray-400">FONTS:</span> {adv.software?.fontsIdentified?.length} Identificati</div>
                              <div><span className="text-gray-400">PDF/DNT:</span> {adv.software?.pdfViewerEnabled ? 'Si' : 'No'} / {adv.software?.doNotTrack ? 'Si' : 'No'}</div>
                            </div>
                          </div>
                        );
                      } catch {
                        return <div className="text-[10px] text-gray-400 break-all bg-gray-100 p-3 rounded-xl border border-gray-200">{msg.advancedInfo}</div>;
                      }
                    })()}

                  </div>
                </details>
              </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {confirmModalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative text-center">
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Conferma Operazione</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              {confirmModalState.type === 'delete' 
                ? "Sei sicuro di voler eliminare questo messaggio? L'azione è irreversibile."
                : confirmModalState.type === 'delete-bulk'
                ? `Sei sicuro di voler eliminare i ${selectedMessages.length} messaggi selezionati? L'azione è irreversibile.`
                : "Vuoi rimuovere questo messaggio dal suo gruppo manuale? Verrà nuovamente tracciato separatamente."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModalState({ isOpen: false, messageId: null, type: null })} 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button 
                onClick={confirmAction} 
                className={`flex-1 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors text-white shadow-lg ${confirmModalState.type === 'delete' || confirmModalState.type === 'delete-bulk' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30' : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/30'}`}
              >
                Conferma
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showGroupPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Salva Gruppo</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Inserisci un identificativo per questo gruppo (lascia vuoto per casuale):</p>
            <input
              autoFocus
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Es. SconosciutaTreno"
              className="w-full bg-gray-50 border-2 border-gray-200 outline-none p-3 rounded-xl focus:border-indigo-500 transition-colors font-bold text-gray-900 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowGroupPrompt(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors">
                Annulla
              </button>
              <button onClick={confirmGroupDevices} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30">
                Conferma
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingProfileId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-xl font-bold mb-1">Gestione Profilo Singolo</h3>
            <div className="text-xs font-mono text-gray-500 mb-6 bg-gray-100 p-2 rounded inline-block">{editingProfileId}</div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nome Identificativo</label>
                <input
                  type="text" value={profileNameInput} onChange={e => setProfileNameInput(e.target.value)}
                  placeholder="Es. Il ragazzo coi capelli ricci"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Potenziali Sospetti (Separati da virgola)</label>
                <input
                  type="text" value={profileSuspectsInput} onChange={e => setProfileSuspectsInput(e.target.value)}
                  placeholder="Es. Mario Rossi, Luigi Bianchi"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Tag Instagram Custom (Separati da virgola)</label>
                <input
                  type="text" value={profileCustomInstagramsInput} onChange={e => setProfileCustomInstagramsInput(e.target.value)}
                  placeholder="Es. mario.rossi, luigi99"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="pt-4 flex gap-3 flex-col-reverse sm:flex-row">
                <button
                  onClick={() => setEditingProfileId(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={saveProfile}
                  className="flex-1 px-4 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Salva Profilo
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
