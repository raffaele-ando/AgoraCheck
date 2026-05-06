import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { collection, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, limit, updateDoc, setDoc, arrayUnion, where, startAfter, writeBatch, getDocs, deleteField } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
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
  computedProfileId?: string;
  computedProfileColor?: string;
  parsedAdvanced?: any;
}

interface ProfileRecord {
  id: string;
  name?: string;
  suspects?: string[];
  instagram?: string; // deprecated
  customInstagrams?: string[];
  removedInstagrams?: string[];
}

const computeDeviceProfileColor = (profileId: string) => {
  let hash = 0;
  for (let i = 0; i < profileId.length; i++) {
    hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const cColor = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - cColor.length) + cColor;
};

const computeDeviceProfileId = (parsedAdv: any, deviceInfo: any, vTokenMap?: Map<string, string>): string => {
  if (!parsedAdv) return "UNKNOWN";
  try {
    const canvas = parsedAdv.software?.canvasFingerprint || parsedAdv.s?.canvasFingerprint || parsedAdv.s?.c || "";
    const audio = parsedAdv.software?.audioFingerprint || parsedAdv.s?.audioFingerprint || parsedAdv.s?.a || "";
    const gpu = parsedAdv.hardware?.gpu || parsedAdv.h?.gpu || parsedAdv.h?.g || "";
    const screen = parsedAdv.hardware?.screen || parsedAdv.h?.screen || parsedAdv.h?.s || "";
    const cores = parsedAdv.hardware?.cores || parsedAdv.h?.cores || parsedAdv.h?.c || "";
    
    let seed = `${canvas}-${audio}-${gpu}-${screen}-${cores}`;
    
    const vToken = parsedAdv.behavior?.ttv || parsedAdv.b?.ttv || parsedAdv.b?.vToken || "";
    if (vTokenMap && vToken && vTokenMap.has(vToken)) {
       seed = vTokenMap.get(vToken)!;
    } else if (seed === "----" && deviceInfo) {
      const ip = deviceInfo.userAgent || "";
      seed = ip;
    }
    
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < seed.length; i++) {
        ch = seed.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1>>>0);

    return `AUTO-${hash.toString(16).toUpperCase().padStart(12, '0').slice(0, 8)}`;
  } catch {
    return "UNKNOWN";
  }
};

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const [loading, setLoading] = useState(true);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
  const historicalMessagesRef = useRef(0);
  
  useEffect(() => {
    historicalMessagesRef.current = historicalMessages.length;
  }, [historicalMessages]);
  
  const [lastDocSnapshot, setLastDocSnapshot] = useState<any>(null);
  
  const messages = useMemo(() => {
    const all = [...realtimeMessages, ...historicalMessages];
    const unique = [];
    const ids = new Set();
    // Sort by createdAt desc
    all.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    for (const m of all) {
      if (!ids.has(m.id)) {
        ids.add(m.id);
        unique.push(m);
      }
    }
    return unique;
  }, [realtimeMessages, historicalMessages]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileSuspectsInput, setProfileSuspectsInput] = useState("");
  const [profileCustomInstagramsInput, setProfileCustomInstagramsInput] = useState("");
  const [viewFilter, setViewFilter] = useState<'new' | 'archived'>('new');
  
  const editingProfileInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingProfileId) {
      if (editingProfileInitializedRef.current !== editingProfileId && profiles[editingProfileId]) {
        setProfileNameInput(profiles[editingProfileId]?.name || "");
        setProfileSuspectsInput(profiles[editingProfileId]?.suspects?.join(", ") || "");
        setProfileCustomInstagramsInput(profiles[editingProfileId]?.customInstagrams?.join(", ") || "");
        editingProfileInitializedRef.current = editingProfileId;
      }
    } else {
      editingProfileInitializedRef.current = null;
    }
  }, [editingProfileId, profiles]);

  const saveProfile = async () => {
    if (!editingProfileId) return;
    try {
      const newCustomInstagrams = profileCustomInstagramsInput.split(",").map(s => s.trim().replace(/[^a-z0-9._]/g, '').toLowerCase()).filter(Boolean);

      // Track removed tags to prevent auto-sync from restoring them
      const currentProfile = profiles[editingProfileId];
      const prevCustom = currentProfile?.customInstagrams || [];
      const prevLegacy = currentProfile?.instagram ? [currentProfile.instagram.toLowerCase().replace(/[^a-z0-9._]/g, '')] : [];
      const allPrevTags = Array.from(new Set([...prevCustom, ...prevLegacy]));
      
      const newlyRemoved = allPrevTags.filter(t => !newCustomInstagrams.includes(t));
      const removedInstagrams = Array.from(new Set([...(currentProfile?.removedInstagrams || []), ...newlyRemoved]));

      await setDoc(doc(db, "profiles", editingProfileId), {
        name: profileNameInput.trim(),
        suspects: profileSuspectsInput.split(",").map(s => s.trim()).filter(Boolean),
        customInstagrams: newCustomInstagrams,
        removedInstagrams,
        instagram: null
      }, { merge: true });

      // Clean up orphaned tags from messages
      const msgsForProfile = messages.filter(m => getDeviceProfile(m) === editingProfileId && m.instagram);
      
      if (msgsForProfile.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < msgsForProfile.length; i += batchSize) {
          const chunk = msgsForProfile.slice(i, i + batchSize);
          const batchOp = writeBatch(db);
          let hasUpdates = false;
          for (const m of chunk) {
            const cleanMsgInsta = m.instagram!.toLowerCase().replace(/[^a-z0-9._]/g, '');
            if (!newCustomInstagrams.includes(cleanMsgInsta)) {
              batchOp.update(doc(db, "messages", m.id), { instagram: null });
              hasUpdates = true;
            }
          }
          if (hasUpdates) {
            try {
              await batchOp.commit();
            } catch (e) {
              console.error("Could not remove instagram from message batch", e);
            }
          }
        }
      }

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
      } else {
        console.error(err);
        alert("Errore salvataggio profilo");
      }
    }
  };

  const parseAdvancedInfo = (msg: any) => {
    return msg.parsedAdvanced || null;
  };

  const vTokenMap = useMemo(() => {
    const map = new Map<string, string>();
    const reversed = [...messages].reverse();
    for (const msg of reversed) {
      if (!msg.advancedInfo) continue;
      const adv = parseAdvancedInfo(msg);
      if (!adv) continue;
      const vToken = adv.behavior?.ttv || adv.b?.ttv || adv.b?.vToken || "";
      if (vToken) {
        const canvas = adv.software?.canvasFingerprint || adv.s?.canvasFingerprint || adv.s?.c || "";
        const audio = adv.software?.audioFingerprint || adv.s?.audioFingerprint || adv.s?.a || "";
        const gpu = adv.hardware?.gpu || adv.h?.gpu || adv.h?.g || "";
        const screen = adv.hardware?.screen || adv.h?.screen || adv.h?.s || "";
        const cores = adv.hardware?.cores || adv.h?.cores || adv.h?.c || "";
        const seed = `${canvas}-${audio}-${gpu}-${screen}-${cores}`;
        if (!map.has(vToken)) {
          map.set(vToken, seed);
        }
      }
    }
    return map;
  }, [messages]);

  const getDeviceProfileCacheRef = useRef(new Map<string, { resolvedSeed: string | undefined, groupId: string | undefined, result: string }>());

  const getDeviceProfile = (msg: Message) => {
    if (msg.profileGroupId) return msg.profileGroupId;
    
    const cacheKey = msg.id;
    const cache = getDeviceProfileCacheRef.current.get(cacheKey);
    
    const adv = msg.parsedAdvanced;
    const vToken = adv ? (adv.behavior?.ttv || adv.b?.ttv || adv.b?.vToken || "") : "";
    const currentResolvedSeed = vToken ? vTokenMap.get(vToken) : undefined;
    
    if (cache && cache.resolvedSeed === currentResolvedSeed && cache.groupId === msg.profileGroupId) {
       return cache.result;
    }
    
    const result = computeDeviceProfileId(msg.parsedAdvanced, msg.deviceInfo, vTokenMap);
    
    getDeviceProfileCacheRef.current.set(cacheKey, { resolvedSeed: currentResolvedSeed, groupId: msg.profileGroupId, result });
    return result;
  };

  const getProfileInstagrams = (profileId: string): { tags: string[], hasMultiple: boolean } => {
    // Collect from messages
    const msgsWithInsta = messages.filter(m => getDeviceProfile(m) === profileId && m.instagram);
    const msgTags = msgsWithInsta.map(m => m.instagram!.toLowerCase().replace(/[^a-z0-9._]/g, ''));
    
    // Collect from profiles (legacy single instagram + custom array)
    const profile = profiles[profileId];
    const profileTags = [];
    if (profile?.instagram) profileTags.push(profile.instagram.toLowerCase().replace(/[^a-z0-9._]/g, ''));
    if (profile?.customInstagrams) profileTags.push(...profile.customInstagrams.map(t => t.toLowerCase().replace(/[^a-z0-9._]/g, '')));
    
    // Unique list
    const uniqueTags = Array.from(new Set([...msgTags, ...profileTags]));
    return { tags: uniqueTags, hasMultiple: uniqueTags.length > 1 };
  };

  const getProfileColorCacheRef = useRef(new Map<string, string>());
  
  const getProfileColor = (profileId: string) => {
    const cached = getProfileColorCacheRef.current.get(profileId);
    if (cached) return cached;
    const result = computeDeviceProfileColor(profileId);
    getProfileColorCacheRef.current.set(profileId, result);
    return result;
  };

  useEffect(() => {
    let q;
    const baseLimit = 100;
    if (viewFilter === 'archived') {
      q = query(
        collection(db, "messages"),
        where("isArchived", "==", true),
        orderBy("createdAt", "desc"),
        limit(baseLimit)
      );
    } else {
      q = query(
        collection(db, "messages"),
        where("isArchived", "==", false),
        orderBy("createdAt", "desc"),
        limit(baseLimit)
      );
    }
    
    // Reset historical messages when view filter changes
    setHistoricalMessages([]);
    setLastDocSnapshot(null);
    setHasMore(true);
    
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        let parsedAdv = null;
        if (data.advancedInfo) {
          try {
            let decodedStr = typeof data.advancedInfo === 'string' ? data.advancedInfo : JSON.stringify(data.advancedInfo);
            if (typeof data.advancedInfo === 'string' && !data.advancedInfo.startsWith('{')) {
              try { 
                const base64Decoded = atob(data.advancedInfo);
                decodedStr = decodeURIComponent(base64Decoded); 
              } catch (e) {
                 console.error("Error decoding base64 advancedInfo for message " + doc.id, e);
              }
            }
            parsedAdv = JSON.parse(decodedStr);
          } catch (e: any) {
             console.error(`Failed to parse advancedInfo for message ${doc.id}: ${e.message}`);
          }
        }
        
        let profileId = data.profileGroupId;
        if (!profileId) {
          profileId = computeDeviceProfileId(parsedAdv, data.deviceInfo);
        }
        
        const profileColor = computeDeviceProfileColor(profileId);
        
        return {
          id: doc.id,
          ...data,
          parsedAdvanced: parsedAdv,
          computedProfileId: profileId,
          computedProfileColor: profileColor
        };
      }) as (Message & { parsedAdvanced?: any, computedProfileId: string, computedProfileColor: string })[];
      
      setRealtimeMessages(msgs);
      setLastDocSnapshot((prev: any) => {
        // Se non abbiamo ancora caricato messaggi storici, aggiorniamo il cursore con l'ultimo del realtime snapshot
        if (historicalMessagesRef.current === 0 && snapshot.docs.length > 0) {
           return snapshot.docs[snapshot.docs.length - 1];
        }
        // Altrimenti manteniamo quello esistente (che punta alla fine dello storico)
        return prev;
      });
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    const unsubscribeProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
      const pmap: Record<string, ProfileRecord> = {};
      snapshot.docs.forEach(doc => { pmap[doc.id] = { id: doc.id, ...doc.data() } as ProfileRecord; });
      setProfiles(pmap);
      setProfilesLoaded(true);
    }, (error) => {
      setProfilesLoaded(true);
    });

    return () => { unsubscribeMsgs(); unsubscribeProfiles(); };
  }, [viewFilter]);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreMessages = async () => {
    if (!lastDocSnapshot) return;
    setIsLoadingMore(true);
    let q;
    const baseLimit = 100;
    if (viewFilter === 'archived') {
      q = query(
        collection(db, "messages"),
        where("isArchived", "==", true),
        orderBy("createdAt", "desc"),
        startAfter(lastDocSnapshot),
        limit(baseLimit)
      );
    } else {
      q = query(
        collection(db, "messages"),
        where("isArchived", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(lastDocSnapshot),
        limit(baseLimit)
      );
    }
    
    try {
      const snapshot = await getDocs(q);
      if (snapshot.docs.length < baseLimit) {
        setHasMore(false);
      }
      if (snapshot.docs.length > 0) {
        setLastDocSnapshot(snapshot.docs[snapshot.docs.length - 1]);
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          let parsedAdv = null;
          if (data.advancedInfo) {
            try {
              let decodedStr = typeof data.advancedInfo === 'string' ? data.advancedInfo : JSON.stringify(data.advancedInfo);
              if (typeof data.advancedInfo === 'string' && !data.advancedInfo.startsWith('{')) {
                try { 
                  const base64Decoded = atob(data.advancedInfo);
                  decodedStr = decodeURIComponent(base64Decoded); 
                } catch (e) {
                }
              }
              parsedAdv = JSON.parse(decodedStr);
            } catch (e: any) {
            }
          }
          
          let profileId = data.profileGroupId;
          if (!profileId) {
            profileId = computeDeviceProfileId(parsedAdv, data.deviceInfo);
          }
          
          const profileColor = computeDeviceProfileColor(profileId);
          
          return {
            id: doc.id,
            ...data,
            parsedAdvanced: parsedAdv,
            computedProfileId: profileId,
            computedProfileColor: profileColor
          };
        }) as (Message & { parsedAdvanced?: any, computedProfileId: string, computedProfileColor: string })[];
        setHistoricalMessages(prev => [...prev, ...msgs]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setSelectedMessages(prev => {
      if (prev.length === 0) return prev;
      const validIds = new Set(messages.map(m => m.id));
      const next = prev.filter(id => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [messages]);

  const processedSyncsRef = useRef<Set<string>>(new Set());

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // Auto-sync discovered instagram tags to the persistent profile records
  useEffect(() => {
    const syncInstagrams = async () => {
      const updatesByPid = new Map<string, Set<string>>();
      
      for (const msg of messages) {
        if (msg.instagram) {
          const cleanInsta = msg.instagram.toLowerCase().replace(/[^a-z0-9._]/g, '');
          const pid = getDeviceProfile(msg);
          
          if (pid === "UNKNOWN") continue;

          const syncKey = `${pid}-${cleanInsta}`;
          if (processedSyncsRef.current.has(syncKey)) continue;
          
          const currentProfile = profilesRef.current[pid];
          const currCustom = currentProfile?.customInstagrams || [];
          const currCustomNormalized = currCustom.map(t => t.toLowerCase().replace(/[^a-z0-9._]/g, ''));
          const removedInstas = currentProfile?.removedInstagrams || [];
          
          // Check if already present, or if user explicitly removed it before
          if (
            currentProfile?.instagram?.toLowerCase().replace(/[^a-z0-9._]/g, '') === cleanInsta || 
            currCustomNormalized.includes(cleanInsta) || 
            removedInstas.includes(cleanInsta)
          ) {
            processedSyncsRef.current.add(syncKey);
            continue;
          }
          
          processedSyncsRef.current.add(syncKey);
          
          if (!updatesByPid.has(pid)) {
            updatesByPid.set(pid, new Set());
          }
          updatesByPid.get(pid)!.add(cleanInsta);
        }
      }
      
      if (updatesByPid.size > 0) {
        try {
          const batchOp = writeBatch(db);
          for (const [pid, tags] of Array.from(updatesByPid.entries())) {
            batchOp.set(doc(db, "profiles", pid), { customInstagrams: arrayUnion(...Array.from(tags)) }, { merge: true });
          }
          await batchOp.commit();
        } catch (e: any) {
          console.error("Batch auto-sync error:", e);
        }
      }
    };
    
    const timeoutId = setTimeout(syncInstagrams, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages]); // Removed profiles from deps to avoid infinite loops

  const handleLogout = () => {
    signOut(auth);
  };

  type ConfirmModalState = 
    | { isOpen: false; messageId: null; type: null }
    | { isOpen: true; type: 'delete' | 'ungroup'; messageId: string }
    | { isOpen: true; type: 'delete-bulk'; messageId: null };

  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({ isOpen: false, messageId: null, type: null });

  const confirmAction = async () => {
    if (!confirmModalState.isOpen) return;
    
    try {
      if (confirmModalState.type === 'delete') {
        await deleteDoc(doc(db, "messages", confirmModalState.messageId));
      } else if (confirmModalState.type === 'ungroup') {
        await updateDoc(doc(db, "messages", confirmModalState.messageId), { profileGroupId: deleteField() });
      } else if (confirmModalState.type === 'delete-bulk') {
        const batchSize = 500;
        for (let i = 0; i < selectedMessages.length; i += batchSize) {
          const chunk = selectedMessages.slice(i, i + batchSize);
          const batchOp = writeBatch(db);
          for (const id of chunk) {
            batchOp.delete(doc(db, "messages", id));
          }
          try {
             await batchOp.commit();
          } catch (e) {
             console.error("Batch delete error:", e);
          }
        }
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
      const batchSize = 500;
      for (let i = 0; i < selectedMessages.length; i += batchSize) {
        const chunk = selectedMessages.slice(i, i + batchSize);
        const batchOp = writeBatch(db);
        for (const id of chunk) {
          batchOp.update(doc(db, "messages", id), { isArchived: targetStatus });
        }
        await batchOp.commit();
      }
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
      const batchSize = 500;
      for (let i = 0; i < selectedMessages.length; i += batchSize) {
        const chunk = selectedMessages.slice(i, i + batchSize);
        const batchOp = writeBatch(db);
        for (const id of chunk) {
          batchOp.update(doc(db, "messages", id), { profileGroupId: newProfileGroupId });
        }
        await batchOp.commit();
      }
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

  const filteredMessages = messages.filter(m => viewFilter === 'archived' ? !!m.isArchived : !m.isArchived);

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
                {auth.currentUser?.email}
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
                  onClick={() => setConfirmModalState({ isOpen: true, messageId: null, type: 'delete-bulk' })}
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
              onClick={() => { setViewFilter('new'); setSelectedMessages([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap ${viewFilter === 'new' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
              <InboxIcon className="w-4 h-4" />
              Spotted Nuovi
              {viewFilter === 'new' && filteredMessages.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 bg-indigo-500 text-white border border-indigo-400`}>
                  {filteredMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setViewFilter('archived'); setSelectedMessages([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap ${viewFilter === 'archived' ? 'bg-gray-800 text-white shadow-md shadow-gray-300' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
              <Archive className="w-4 h-4" />
              Letti / Archiviati
              {viewFilter === 'archived' && filteredMessages.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 bg-gray-700 text-white border border-gray-600`}>
                  {filteredMessages.length}
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
                        const p = parseAdvancedInfo(msg);
                        if (!p) return null;
                        
                        const adv = {
                           network: p.network || p.n || {},
                           hardware: p.hardware || p.h || {},
                           software: p.software || p.s || {},
                           behavior: p.behavior || p.b || {}
                        };
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] font-mono text-gray-600">
                            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <strong className="text-gray-800 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider"><Globe className="w-3 h-3 text-blue-500"/> Rete & Posizione</strong>
                              <div><span className="text-gray-400">IP:</span> {adv.network?.ip || "N/A"}</div>
                              <div><span className="text-gray-400">GEO:</span> {adv.network?.city}, {adv.network?.region}</div>
                              <div className="truncate"><span className="text-gray-400">ISP:</span> {adv.network?.isp}</div>
                              <div className="truncate"><span className="text-gray-400">REF:</span> {adv.network?.referer || "N/A"}</div>
                              <div><span className="text-gray-400">NET:</span> {adv.network?.connectionType === "Nascosto/Non Supportato" || adv.network?.connectionType === "Unknown" ? "Nascosto" : `${adv.network?.connectionType} (${adv.network?.downlink}Mbps)`}</div>
                            </div>
                            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <strong className="text-gray-800 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider"><Cpu className="w-3 h-3 text-purple-500"/> Hardware</strong>
                              <div className="truncate"><span className="text-gray-400">GPU:</span> {adv.hardware?.gpu}</div>
                              <div><span className="text-gray-400">CPU/RAM:</span> {adv.hardware?.cores}C / {adv.hardware?.ram}GB</div>
                              <div><span className="text-gray-400">RES:</span> {adv.hardware?.screen} ({adv.hardware?.pixelRatio}x)</div>
                              <div><span className="text-gray-400">TCH:</span> {adv.hardware?.touchSupport ? 'Si' : 'No'} (Max: {adv.hardware?.maxTouchPoints})</div>
                              <div><span className="text-gray-400">BAT:</span> {adv.hardware?.battery?.level === "Unknown" || adv.hardware?.battery?.level === "Sconosciuta" ? "Nascosta" : `${adv.hardware?.battery?.level} (${adv.hardware?.battery?.charging === true ? 'In Carica' : adv.hardware?.battery?.charging === false ? 'A Batteria' : 'Non Disp.'})`}</div>
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
                      } catch (err: any) {
                        return <div className="text-[10px] text-gray-400 break-all bg-gray-100 p-3 rounded-xl border border-gray-200">Error: {err.message} | Raw: {typeof msg.advancedInfo === 'string' ? msg.advancedInfo : JSON.stringify(msg.advancedInfo)}</div>;
                      }
                    })()}

                  </div>
                </details>
              </motion.div>
              );
            })}
          </div>
        )}

        {hasMore && messages.length >= 100 && (
          <div className="mt-8 flex justify-center pb-8 border-b-0">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoadingMore ? "Caricamento in corso..." : "Carica altri messaggi"}
            </button>
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
