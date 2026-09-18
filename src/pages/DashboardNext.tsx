import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { parseUserAgent } from "../utils/userAgent";
import {
  computeDeviceProfileId,
  computeProfileSlotColor,
  extractAllDeviceTokens,
  extractDeviceTraits,
  areDeviceTraitsCompatible,
  hasGeographicConflict,
  getProfileIdConfidence,
  type DeviceTraits,
  type GeoEvent,
} from "../utils/profiling";
import { motion } from "motion/react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  limit,
  updateDoc,
  setDoc,
  arrayUnion,
  where,
  startAfter,
  writeBatch,
  getDocs,
  getDoc,
  deleteField,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Logo } from "../components/ui/Logo";
import MessageRow from "../components/dashboard/MessageRow";
import MessagesToolbar from "../components/dashboard/MessagesToolbar";
import {
  IcArchivia,
  IcCarosello,
  IcCitta,
  IcDove,
  IcElimina,
  IcIncerta,
  IcInstagram,
  IcProfilo,
  IcQuando,
  IcStoria,
  IcTrovata,
  IcZona,
  IcAlias,
  IcAltro,
} from "../components/ui/AcIcons";
import {
  LogOut,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  Inbox,
  MapPin,
  Calendar,
  Search,
  Activity,
  Trash2,
  Fingerprint as DeviceIcon,
  ChevronDown,
  User as UserIcon,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  Inbox as InboxIcon,
  Archive,
  ArchiveRestore,
  Instagram,
  X,
  Layers,
  Moon,
  Sun,
  Image as ImageIcon,
  BarChart3,
  MessageSquare,
  LayoutTemplate,
  Settings,
  Sparkles,
  Check,
  Download,
  FileText,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";

/**
 * Componenti delle schede caricati SOLO quando la scheda viene aperta.
 *
 * Erano importati staticamente, quindi il pacchetto della Dashboard (700 KB)
 * conteneva anche recharts e html-to-image: chi apriva soltanto "Messaggi" —
 * cioè l'uso normale — li scaricava comunque. Ora ciascuno diventa un file a
 * parte, richiesto al primo utilizzo.
 */
const Analytics = lazy(() =>
  import("../components/dashboard/AnalyticsNext").then((m) => ({
    default: m.AnalyticsNext,
  })),
);
const StoryExportBeta = lazy(() => import("../components/dashboard/StoryExport"));
const StoryTemplateConfig = lazy(() => import("../components/dashboard/StoryTemplateConfig"));
const CarouselTemplateConfig = lazy(() => import("../components/dashboard/CarouselTemplateConfig"));
const AppSettings = lazy(() => import("../components/dashboard/AppSettings"));
// Le utilità di configurazione restano statiche: sono poche righe e servono
// subito, senza trascinare l'interfaccia delle impostazioni.
import { loadLinkConfigFromDB, LinkWidgetConfig, DEFAULT_LINK_CONFIG } from "../data/settings";
import { LinkWidgetCard } from "../components/dashboard/LinkWidgetCard";
import { LOCATIONS } from "../data/locations";
interface Message {
  id: string;
  lookingFor: string;
  when?: string;
  where?: string;
  city?: string;
  area?: string;
  type?: string;
  pollOptions?: string[];
  instagram?: string;
  resolution?: string;
  createdAt: Timestamp | null;
  isValidatedForCarousel?: boolean;
  deviceInfo: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    location?: { city?: string; country?: string };
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
  possibleAliases?: string[];
  instagram?: string;
  /* deprecated */ customInstagrams?: string[];
  removedInstagrams?: string[];
  excludeFromAutoGrouping?: boolean;
  linkedToProfileId?: string;
  ignoredFromAnalytics?: boolean;
  /**
   * Suggerimenti di unione che l'operatore ha respinto.
   *
   * Contiene il primo identificativo del gruppo proposto. Senza questo, un
   * "no" durava fino al ricalcolo successivo e la stessa proposta tornava
   * su ogni volta.
   */
  dismissedMatches?: string[];
}
/**
 * Iniziali da mostrare dentro il cerchio colorato del profilo.
 *
 * Il colore da solo non basta a distinguere i profili: è un hash, quindi due
 * profili possono avere tinte quasi identiche, e chi ha una ridotta percezione
 * dei colori perde del tutto l'informazione. Le iniziali restano leggibili in
 * ogni caso; l'icona generica resta come ripiego per i profili senza nome.
 */
const getProfileInitials = (name?: string): string | null => {
  const clean = (name || "").trim();
  if (
    !clean ||
    clean === "Sconosciuto" ||
    clean === "Profilo" ||
    clean === "Profilo Aggregato" ||
    clean.startsWith("Non identificato")
  ) {
    return null;
  }
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
};

// Delegato all'implementazione condivisa in utils/profiling: la copia locale
// duplicava la stessa funzione, con il rischio che le due divergessero e che
// lo stesso profilo apparisse di colori diversi in schede diverse.
const computeDeviceProfileColor = computeProfileSlotColor;

/** Documenti caricati all'apertura: copre abbondantemente le prime pagine. */
const MESSAGES_BASE_BUFFER = 120;
/**
 * Tetto assoluto di documenti sottoscritti. Le schede che analizzano l'intero
 * storico si fermano qui invece di scaricare la collezione senza limite.
 */
const MESSAGES_HARD_CAP = 2500;

/** Segnaposto mostrato mentre il codice di una scheda viene scaricato. */
function TabLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function DashboardNext() {
  // Il flag IGNORE_ANALYTICS ha un'unica fonte di verità nella scheda
  // Analytics, che lo mostra e lo modifica. Qui esisteva una seconda copia in
  // useState, mai usata dall'interfaccia: due stati indipendenti sulla stessa
  // chiave di localStorage, liberi di divergere nella stessa sessione.
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const [loading, setLoading] = useState(true);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [totalGlobalMessages, setTotalGlobalMessages] = useState<number | null>(null);
  const [isStuckLoading, setIsStuckLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);

  // --- Notifiche non bloccanti -------------------------------------------
  // Sostituiscono gli alert(): non bloccano il thread, non sono tematizzabili
  // e soprattutto permettono di riportare l'esito reale delle operazioni di
  // massa (che possono riuscire solo in parte).
  type Toast = {
    id: number;
    text: string;
    kind: "ok" | "error" | "info";
    /**
     * Come disfare cio' che la notifica annuncia.
     *
     * Archiviare e' reversibile, eppure era trattato come irreversibile:
     * agire subito e poter tornare indietro costa un clic, chiedere il
     * permesso ogni volta ne costa due e interrompe il lavoro. La finestra
     * di conferma resta a cio' che distrugge davvero.
     */
    undo?: { label: string; run: () => void };
  };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeqRef = useRef(0);
  const notify = useCallback(
    (text: string, kind: Toast["kind"] = "info", undo?: Toast["undo"]) => {
      const id = ++toastSeqRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, text, kind, undo }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        kind === "error" ? 7000 : undo ? 8000 : 3500,
      );
    },
    [],
  );
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Esegue N scritture rispettando il limite di 500 operazioni per batch
   * imposto da Firestore, e restituisce l'esito reale invece di limitarsi a un
   * console.error: le operazioni di massa possono riuscire solo in parte e
   * l'operatore deve saperlo.
   */
  const commitOperations = useCallback(
    async (ops: ((b: ReturnType<typeof writeBatch>) => void)[]) => {
      const BATCH_LIMIT = 500;
      let done = 0;
      let failed = 0;
      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const chunk = ops.slice(i, i + BATCH_LIMIT);
        const batchOp = writeBatch(db);
        for (const apply of chunk) apply(batchOp);
        try {
          await batchOp.commit();
          done += chunk.length;
        } catch (e) {
          console.error("Batch commit error:", e);
          failed += chunk.length;
        }
      }
      return { done, failed, total: ops.length };
    },
    [],
  );

  const reportBulkOutcome = useCallback(
    (res: { done: number; failed: number; total: number }, label: string) => {
      if (res.total === 0) return;
      if (res.failed === 0) {
        notify(`${res.done} ${label}`, "ok");
      } else if (res.done === 0) {
        notify(`Operazione non riuscita su ${res.failed} elementi`, "error");
      } else {
        notify(`${res.done} ${label}, ${res.failed} non riusciti`, "error");
      }
    },
    [notify],
  );

  useEffect(() => {
    let timeout = setTimeout(() => {
      if (loading || !profilesLoaded) {
        setIsStuckLoading(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading, profilesLoaded]);
  const [messages, setMessages] = useState<Message[]>([]);
  // Elenco zone DEDUPLICATO: due città possono avere una zona con lo stesso
  // nome (es. "Centro"), il che produceva chiavi React duplicate e voci doppie
  // nel menu, con un filtro che poi confondeva le due città.
  const zoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          Object.entries(LOCATIONS).flatMap(([city, areas]) => [
            city,
            ...areas.filter((a) => a !== city),
          ]),
        ),
      ),
    [],
  );
  const [fetchLimit, setFetchLimit] = useState(MESSAGES_BASE_BUFFER);
  // true quando il tetto è stato raggiunto: lo storico potrebbe essere parziale
  // e va detto all'operatore invece di mostrare conteggi falsamente completi.
  const [historyTruncated, setHistoryTruncated] = useState(false);
  const [carouselValidatedMessages, setCarouselValidatedMessages] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  // Il numero di elementi per pagina è indipendente per ciascuna scheda:
  // cambiarlo nei Messaggi non deve riconfigurare anche i Profili.
  const [pageSizeByTab, setPageSizeByTab] = useState<Record<string, number>>({
    messages: 20,
    profiles: 20,
  });
  // Ricerca libera sui messaggi (testo, @instagram, risoluzione, zona).
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [exportingMessage, setExportingMessage] = useState<Message | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [isProfileSelectMode, setIsProfileSelectMode] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [viewingMacroId, setViewingMacroId] = useState<string | null>(null);
  const [showMergeModal, setShowMergeModal] = useState<{
    isOpen: boolean;
    sourceMacroId: string | null;
  }>({ isOpen: false, sourceMacroId: null });
  const [mergeSelectedProfiles, setMergeSelectedProfiles] = useState<string[]>(
    [],
  );
  const [mergeSearchQuery, setMergeSearchQuery] = useState("");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profilePossibleAliasesInput, setProfilePossibleAliasesInput] = useState("");
  const [profileCustomInstagramsInput, setProfileCustomInstagramsInput] =
    useState("");
  const [viewFilter, setViewFilter] = useState<"new" | "archived">("new");
  const [activeTab, setActiveTab] = useState<
    "messages" | "profiles" | "analytics" | "story_template" | "settings" | "carousel"
  >("messages");
  const pageSize = pageSizeByTab[activeTab] ?? 20;
  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeByTab((prev) => ({ ...prev, [activeTab]: size }));
    },
    [activeTab],
  );
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  
  const isSuperAdmin = auth.currentUser?.email === "andolinaraffaele70@gmail.com";
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [onlyPostsFilter, setOnlyPostsFilter] = useState(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState("");
  const [resolutionInput, setResolutionInput] = useState("");
  const [configMenuOpen, setConfigMenuOpen] = useState(false);
  const [macroModalTab, setMacroModalTab] = useState<
    "timeline" | "dettagli" | "identita" | "log"
  >("timeline");
  const editingProfileInitializedRef = useRef<string | null>(null);
  const [locationInputCity, setLocationInputCity] = useState("");
  const [locationInputArea, setLocationInputArea] = useState("");
  const saveMessageLocation = async (msgId: string) => {
    try {
      await updateDoc(doc(db, "messages", msgId), {
        city: locationInputCity.trim() || deleteField(),
        area: locationInputArea.trim() || deleteField(),
      });
      setEditingMessageId(null);
      notify("Zona salvata", "ok");
    } catch (e: any) {
      console.error(e);
      notify("Errore durante il salvataggio della zona: " + e.message, "error");
    }
  };
  const saveMessageResolution = async (msgId: string) => {
    try {
      await updateDoc(doc(db, "messages", msgId), {
        // deleteField() invece di null: svuotare il campo deve rimuoverlo dal
        // documento, come già fa il salvataggio della zona. Con `null` i
        // messaggi "senza risoluzione" restavano indistinguibili da quelli mai
        // compilati e il campo sporcava ogni documento.
        resolution: resolutionInput.trim() || deleteField(),
      });
      setEditingMessageId(null);
      notify("Risoluzione salvata", "ok");
    } catch (e: any) {
      console.error(e);
      notify("Errore salvataggio risoluzione: " + e.message, "error");
    }
  };
  useEffect(() => {
    if (editingProfileId) {
      if (
        editingProfileInitializedRef.current !== editingProfileId &&
        profiles[editingProfileId]
      ) {
        setProfileNameInput(profiles[editingProfileId]?.name || "");
        setProfilePossibleAliasesInput(
          profiles[editingProfileId]?.possibleAliases?.join(", ") || "",
        );
        setProfileCustomInstagramsInput(
          profiles[editingProfileId]?.customInstagrams?.join(", ") || "",
        );
        editingProfileInitializedRef.current = editingProfileId;
      }
    } else {
      editingProfileInitializedRef.current = null;
    }
  }, [editingProfileId, profiles]);
  const saveProfile = async () => {
    if (!editingProfileId) return;
    try {
      const newCustomInstagrams = profileCustomInstagramsInput
        .split(",")
        .map((s) =>
          s
            .trim()
            .replace(/[^a-z0-9._]/g, "")
            .toLowerCase(),
        )
        .filter(Boolean);
      /* Track removed tags to prevent auto-sync from restoring them */ const currentProfile =
        profiles[editingProfileId];
      const prevCustom = currentProfile?.customInstagrams || [];
      const prevLegacy = currentProfile?.instagram
        ? [currentProfile.instagram.toLowerCase().replace(/[^a-z0-9._]/g, "")]
        : [];
      const allPrevTags = Array.from(new Set([...prevCustom, ...prevLegacy]));
      const newlyRemoved = allPrevTags.filter(
        (t) => !newCustomInstagrams.includes(t),
      );
      const removedInstagrams = Array.from(
        new Set([
          ...(currentProfile?.removedInstagrams || []),
          ...newlyRemoved,
        ]),
      );
      await setDoc(
        doc(db, "profiles", editingProfileId),
        {
          name: profileNameInput.trim(),
          possibleAliases: profilePossibleAliasesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          customInstagrams: newCustomInstagrams,
          removedInstagrams,
          instagram: deleteField(),
        },
        { merge: true },
      );
      /* Clean up orphaned tags from messages */ const msgsForProfile =
        messages.filter(
          (m) => getDeviceProfile(m) === editingProfileId && m.instagram,
        );
      if (msgsForProfile.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < msgsForProfile.length; i += batchSize) {
          const chunk = msgsForProfile.slice(i, i + batchSize);
          const batchOp = writeBatch(db);
          let hasUpdates = false;
          for (const m of chunk) {
            const cleanMsgInsta = m
              .instagram!.toLowerCase()
              .replace(/[^a-z0-9._]/g, "");
            if (!newCustomInstagrams.includes(cleanMsgInsta)) {
              batchOp.update(doc(db, "messages", m.id), {
                instagram: deleteField(),
              });
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
            providerInfo:
              auth.currentUser?.providerData?.map((provider: any) => ({
                providerId: provider.providerId,
                email: provider.email,
              })) || [],
          },
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
        notify("Errore nel salvataggio del profilo", "error");
      } else {
        console.error(err);
        notify("Errore nel salvataggio del profilo", "error");
      }
    }
  };
  const handleScollega = async (pid: string) => {
    try {
      await setDoc(
        doc(db, "profiles", pid),
        { excludeFromAutoGrouping: true, linkedToProfileId: deleteField() },
        { merge: true },
      );
    } catch (err: any) {
      if (err.message?.includes("Missing or insufficient permissions")) {
        const errInfo = {
          error: err instanceof Error ? err.message : String(err),
          operationType: "write",
          path: `profiles/${pid}`,
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
          },
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
      }
      console.error("Errore nello scollegamento", err);
    }
  };
  const handleRiabilitaAutoGroup = async (pid: string) => {
    try {
      await setDoc(
        doc(db, "profiles", pid),
        { excludeFromAutoGrouping: false },
        { merge: true },
      );
    } catch (err: any) {
      console.error("Errore nel riabilitare auto-group", err);
    }
  };
  const handleToggleIgnoreAnalytics = async (pid: string, currentStatus: boolean | undefined) => {
    try {
      await setDoc(
        doc(db, "profiles", pid),
        { ignoredFromAnalytics: !currentStatus },
        { merge: true },
      );
    } catch (err: any) {
      console.error("Errore nel toggle ignore analytics", err);
    }
  };
  const handleToggleMacroIgnoreAnalytics = async (macroId: string) => {
    const macro = macroProfiles.find((m) => m.id === macroId);
    if (!macro) return;
    const isPresentlyIgnored = macro.profileIds.some((pid: string) => profiles[pid]?.ignoredFromAnalytics);
    const newStatus = !isPresentlyIgnored;
    const batch = writeBatch(db);
    for (const pid of macro.profileIds) {
      batch.set(doc(db, "profiles", pid), { ignoredFromAnalytics: newStatus }, { merge: true });
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error("Errore nel toggle ignore analytics per macro", err);
    }
  };
  /**
   * Accetta un suggerimento in un colpo solo.
   *
   * Prima il sistema calcolava "87%, stesso dispositivo, stessa rete" e poi
   * lasciava rifare l'unione a mano: aprire l'altro profilo, tornare
   * indietro, aprire la fisarmonica, "Accorpa", ricercare il nome,
   * selezionarlo, confermare. Otto passaggi, e la percentuale che ti aveva
   * convinto non era piu' sotto gli occhi.
   */
  const handleAcceptSuggestion = async (
    sourceMacroId: string,
    targetMacroId: string,
  ) => {
      const source = macroProfiles.find((m) => m.id === sourceMacroId);
      const target = macroProfiles.find((m) => m.id === targetMacroId);
      if (!source || !target) return;
      try {
        const batch = writeBatch(db);
        for (const pid of target.profileIds) {
          batch.set(
            doc(db, "profiles", pid),
            { linkedToProfileId: source.profileIds[0], excludeFromAutoGrouping: false },
            { merge: true },
          );
        }
        await batch.commit();
        notify(`«${target.name}» unito a «${source.name}»`, "ok");
      } catch (e) {
        console.error("Errore unione suggerita", e);
        notify("Non sono riuscito a unire i due profili", "error");
    }
  };

  /** «Non e' la stessa persona»: il suggerimento non torna piu'. */
  const handleDismissSuggestion = async (
    sourceMacroId: string,
    dismissKey: string,
    targetName: string,
  ) => {
      const source = macroProfiles.find((m) => m.id === sourceMacroId);
      if (!source) return;
      try {
        await setDoc(
          doc(db, "profiles", source.profileIds[0]),
          { dismissedMatches: arrayUnion(dismissKey) },
          { merge: true },
        );
        notify(`«${targetName}» non verrà più proposto`, "ok");
      } catch (e) {
        console.error("Errore rifiuto suggerimento", e);
        notify("Non sono riuscito a salvare la scelta", "error");
    }
  };

  const confirmMergeMacro = async () => {
    if (!showMergeModal.sourceMacroId || mergeSelectedProfiles.length === 0)
      return;
    try {
      const sourceMacro = macroProfiles.find(
        (m) => m.id === showMergeModal.sourceMacroId,
      );
      if (!sourceMacro) return;
      const sourcePid = sourceMacro.profileIds[0];
      const batch = writeBatch(db);
      for (const targetMacroId of mergeSelectedProfiles) {
        const targetMacro = macroProfiles.find((m) => m.id === targetMacroId);
        if (!targetMacro) continue;
        for (const targetPid of targetMacro.profileIds) {
          batch.set(
            doc(db, "profiles", targetPid),
            { linkedToProfileId: sourcePid, excludeFromAutoGrouping: false },
            { merge: true },
          );
        }
      }
      await batch.commit();
      setShowMergeModal({ isOpen: false, sourceMacroId: null });
      setMergeSelectedProfiles([]);
    } catch (e) {
      console.error("Errore unione", e);
    }
  };
  const parseAdvancedInfo = (msg: any) => {
    return msg.parsedAdvanced || null;
  };
  const getDeviceProfileCacheRef = useRef(
    new Map<
      string,
      {
        result: string;
      }
    >(),
  );

  const getDeviceProfile = useCallback(
    (msg: Message) => {
      if (msg.profileGroupId) return msg.profileGroupId;
      const cacheKey = msg.id;
      const cache = getDeviceProfileCacheRef.current.get(cacheKey);

      if (cache) {
        return cache.result;
      }

      const result = computeDeviceProfileId(
        msg.parsedAdvanced,
        msg.deviceInfo,
        msg.instagram
      );

      getDeviceProfileCacheRef.current.set(cacheKey, {
        result,
      });
      return result;
    },
    [],
  );
  const profileInstagramsMap = useMemo(() => {
    const tagsByProfile = new Map<string, string[]>();
    for (const m of messages) {
      if (m.instagram) {
        const pId = getDeviceProfile(m);
        const cleanInsta = m.instagram
          .toLowerCase()
          .replace(/[^a-z0-9._]/g, "");
        if (!tagsByProfile.has(pId)) tagsByProfile.set(pId, []);
        tagsByProfile.get(pId)!.push(cleanInsta);
      }
    }
    const result = new Map<string, { tags: string[]; hasMultiple: boolean }>();
    const allProfileIds = new Set([
      ...Object.keys(profiles),
      ...Array.from(tagsByProfile.keys()),
    ]);
    for (const profileId of allProfileIds) {
      const msgTags = tagsByProfile.get(profileId) || [];
      const profile = profiles[profileId];
      const profileTags = [];
      if (profile?.instagram)
        profileTags.push(
          profile.instagram.toLowerCase().replace(/[^a-z0-9._]/g, ""),
        );
      if (profile?.customInstagrams)
        profileTags.push(
          ...profile.customInstagrams.map((t) =>
            t.toLowerCase().replace(/[^a-z0-9._]/g, ""),
          ),
        );
      const uniqueTags = Array.from(new Set([...msgTags, ...profileTags]));
      result.set(profileId, {
        tags: uniqueTags,
        hasMultiple: uniqueTags.length > 1,
      });
    }
    return result;
  }, [messages, profiles, getDeviceProfile]);

  const getProfileInstagrams = useCallback(
    (profileId: string): { tags: string[]; hasMultiple: boolean } => {
      return (
        profileInstagramsMap.get(profileId) || { tags: [], hasMultiple: false }
      );
    },
    [profileInstagramsMap],
  );
  const allProfileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      ids.add(getDeviceProfile(m));
    }
    for (const id of profileInstagramsMap.keys()) {
      ids.add(id);
    }
    return Array.from(ids);
  }, [messages, getDeviceProfile, profileInstagramsMap]);
  const macroProfiles = useMemo(() => {
    const nodes = allProfileIds;
    const adj = new Map<string, Set<string>>();
    const edgeReasons = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, new Set());
    const tagGroups = new Map<string, string[]>();
    
    // Tracking device footprints for debugging
    const deviceFootprints = new Map<string, any>();
    
    // We group by identical hardware footprints that provide high confidence:
    const hwGroups = new Map<string, Set<string>>();
    const clientMarkGroups = new Map<string, Set<string>>();
    const hwGroupsiOS = new Map<string, Set<string>>();
    const igTailIdGroups = new Map<string, Set<string>>();
    const ipGroups = new Map<string, Set<string>>();

    // Every persistent token ever co-observed on a message, per profile. Two
    // profiles sharing one of these are the same device with certainty.
    const tokenGroups = new Map<string, Set<string>>();
    // Immutable physical traits per profile — used as a NEGATIVE constraint.
    const traitsByPid = new Map<string, DeviceTraits>();
    // Quante volte ciascun profilo ha dichiarato ciascun handle, e quanti
    // messaggi con handle ha inviato in tutto. Serve a misurare quanto un
    // dispositivo "possiede" davvero un handle (vedi handleOwnership).
    const handleCountsByPid = new Map<string, Map<string, number>>();
    const handleTotalByPid = new Map<string, number>();
    // Dove e quando ciascun profilo si è manifestato — usato come vincolo
    // negativo temporale (vedi hasGeographicConflict).
    const geoEventsByPid = new Map<string, GeoEvent[]>();
    const GEO_EVENTS_PER_PROFILE = 40;

    for (const m of messages) {
       const pid = getDeviceProfile(m);
       if (profiles[pid]?.excludeFromAutoGrouping) continue;
       const adv = m.parsedAdvanced || null;

       // --- deterministic evidence: co-observed persistent tokens ------------
       for (const tok of extractAllDeviceTokens(adv)) {
         if (!tokenGroups.has(tok)) tokenGroups.set(tok, new Set());
         tokenGroups.get(tok)!.add(pid);
       }

       // --- quanto questo profilo usa davvero l'handle che dichiara --------
       if (m.instagram) {
         const cleanTag = m.instagram.toLowerCase().replace(/[^a-z0-9._]/g, "");
         if (cleanTag) {
           if (!handleCountsByPid.has(pid)) handleCountsByPid.set(pid, new Map());
           const perTag = handleCountsByPid.get(pid)!;
           perTag.set(cleanTag, (perTag.get(cleanTag) ?? 0) + 1);
           handleTotalByPid.set(pid, (handleTotalByPid.get(pid) ?? 0) + 1);
         }
       }

       // --- dove e quando il profilo si è manifestato ----------------------
       const eventCountry = String(adv?.network?.country || adv?.n?.country || "");
       const eventTime = m.createdAt?.toMillis?.();
       if (eventCountry && typeof eventTime === "number") {
         if (!geoEventsByPid.has(pid)) geoEventsByPid.set(pid, []);
         const list = geoEventsByPid.get(pid)!;
         // I messaggi arrivano dal più recente: ne bastano pochi per profilo,
         // il vincolo cerca una contraddizione, non una cronologia completa.
         if (list.length < GEO_EVENTS_PER_PROFILE) {
           list.push({
             t: eventTime,
             country: eventCountry,
             city: String(adv?.network?.city || adv?.n?.city || ""),
           });
         }
       }

       // --- immutable traits (also available without advancedInfo) ----------
       const traits = extractDeviceTraits(adv, m.deviceInfo);
       const knownTraits = traitsByPid.get(pid);
       if (!knownTraits) {
         traitsByPid.set(pid, traits);
       } else {
         // Keep the most specific view we have seen for this profile.
         traitsByPid.set(pid, {
           platform:
             knownTraits.platform !== "unknown" ? knownTraits.platform : traits.platform,
           model: knownTraits.model || traits.model,
         });
       }

       if (adv) {
         const tt = adv.behavior?.cmk || adv.b?.cmk || adv.b?.clientMark;
         if (tt) {
           if (!clientMarkGroups.has(tt)) clientMarkGroups.set(tt, new Set());
           clientMarkGroups.get(tt)!.add(pid);
         }

         const canvas = adv.software?.canvasSample || adv.s?.canvasSample || adv.s?.c || "";
         const audio = adv.software?.audioSample || adv.s?.audioSample || adv.s?.a || "";
         const gpu = adv.hardware?.gpu || adv.h?.gpu || adv.h?.g || "";
         const screen = adv.hardware?.screen || adv.h?.screen || adv.h?.s || "";
         const cores = adv.hardware?.cores || adv.h?.cores || adv.h?.c || "";
         // Include math for better precision, especially on Android devices.
         const math = adv.software?.mathSample
           ? JSON.stringify(adv.software.mathSample)
           : adv.s?.mathSample
           ? JSON.stringify(adv.s.mathSample)
           : "";

         // Nuovi segnali — già raccolti in Home.tsx, ora estratti per il seed
         const pixelRatio  = String(adv.h?.pixelRatio   || adv.hardware?.pixelRatio   || "");
         const colorDepth  = String(adv.h?.colorDepth   || adv.hardware?.colorDepth   || "");
         const webglVendor = String(adv.h?.detailedWebGL?.vendor        || adv.hardware?.detailedWebGL?.vendor        || "");
         const maxTexture  = String(adv.h?.detailedWebGL?.maxTextureSize || adv.hardware?.detailedWebGL?.maxTextureSize || "");
         const webglScene  = String(adv.s?.webglSceneSample   || adv.software?.webglSceneSample   || "");
         const fontMetrics = String(adv.s?.fontMetricsSample  || adv.software?.fontMetricsSample  || "");
         const timerRes    = String(adv.s?.clockResolution         || adv.software?.clockResolution         || "");
         const igContextRaw = adv.h?.igContext || adv.hardware?.igContext || null;
         const ua = adv.browser?.userAgent || adv.network?.userAgent || adv.n?.ua || adv.s?.userAgent || m.deviceInfo?.userAgent || "";
         
         // SEED stabile: solo segnali hardware puri (rects rimosso — è DOM-volatile)
         const hwSeed = [canvas, audio, gpu, screen, cores, math, pixelRatio, colorDepth].join("-");

         // SEED esteso: aggiunge rendering GPU (più discriminativo, immune a omogenizzazione iOS)
         const webglSceneOk = webglScene && webglScene !== "Error" && webglScene !== "N/A" && webglScene !== "ShaderErr";
         const hwSeedExtended = webglSceneOk
           ? hwSeed + "-" + webglScene
           : (webglVendor || maxTexture)
           ? hwSeed + "-" + webglVendor + "-" + maxTexture
           : hwSeed;

         // rects mantenuto come variabile separata (usato come segnale di sessione)
         const rects = adv.software?.layoutRectsSample || adv.s?.layoutRectsSample || "";
         
         const seed = hwSeedExtended;
         
         // Only group by hardware seed if it's NOT an Apple device.
         // Apple devices heavily restrict device signal collection and return identical seeds
         // for thousands of users with the same model, causing massive false positives.
         // iOS tracking will instead heavily rely on clientMark (local-store CMK) and Instagram Tags.
         const isAppleDevice = gpu.toLowerCase().includes("apple")
           || ua.includes("iPhone") || ua.includes("iPad") || ua.includes("Mac OS");

         // Footprint of the profile. Messages arrive newest-first, so the first
         // one seen wins; later (older) messages only FILL IN fields the newer
         // ones left empty, instead of being discarded outright as before —
         // otherwise one message with a blocked signal hid data we do have.
         const incomingFootprint: Record<string, any> = {
           canvas, audio, gpu, screen, cores, rects, math,
           hwSeed, hwSeedExtended,
           // `seed` is the field the report/UI reads (previously undefined).
           seed: tt || hwSeedExtended || "-",
           token: tt || "",
           pixelRatio, colorDepth, webglVendor, maxTexture,
           webglScene, fontMetrics, timerRes,
           igContext: igContextRaw,
           userAgent: ua,
           clientMark: tt || "",
           isApple: isAppleDevice,
         };
         const existingFootprint = deviceFootprints.get(pid);
         if (!existingFootprint) {
           deviceFootprints.set(pid, incomingFootprint);
         } else {
           for (const [k, v] of Object.entries(incomingFootprint)) {
             const cur = existingFootprint[k];
             const curEmpty =
               cur === undefined || cur === null || cur === "" || cur === "-";
             if (curEmpty && v !== undefined && v !== null && v !== "") {
               existingFootprint[k] = v;
             }
           }
         }

         if (!isAppleDevice) {
           // Android / Desktop: seed hardware completo
           const blankCheck = hwSeedExtended.replace(/-/g, "");
           if (blankCheck.length > 0) {
             if (!hwGroups.has(hwSeedExtended)) hwGroups.set(hwSeedExtended, new Set());
             hwGroups.get(hwSeedExtended)!.add(pid);
           }
         } else {
           // iOS / macOS: Apple omogenizza canvas e audio,
           // ma device model + physical resolution + GPU chip rimangono discriminativi
           const igDeviceModel = igContextRaw?.deviceModel || (() => {
             const mm = ua.match(/\(([A-Za-z]+\d+(?:,\d+)?);/);
             return mm?.[1] ?? "";
           })();
           const igPhysRes = igContextRaw?.physicalRes || (() => {
             const matches = ua.match(/(\d{3,4}x\d{3,4})/g);
             return matches ? matches[matches.length - 1] : "";
           })();
           // GPU chip: "Apple A17 Pro GPU" è discriminativo, "Apple GPU" non lo è
           const gpuChip = gpu.match(/Apple A\d+/)?.[0] ?? "";

           if (igDeviceModel && igPhysRes) {
             const iosSeed = [igDeviceModel, igPhysRes, gpuChip, pixelRatio].join("-");
             if (!hwGroupsiOS.has(iosSeed)) hwGroupsiOS.set(iosSeed, new Set());
             hwGroupsiOS.get(iosSeed)!.add(pid);
           }

           // Campo numerico finale dell'UA Instagram: potrebbe essere specifico
           // per installazione (cambia solo se l'utente disinstalla/reinstalla),
           // ma non è accertato — potrebbe anche essere un id di build condiviso.
           const igTailId = igContextRaw?.igTailId || "";
           if (igTailId && igTailId.length >= 6) {
             if (!igTailIdGroups.has(igTailId)) igTailIdGroups.set(igTailId, new Set());
             igTailIdGroups.get(igTailId)!.add(pid);
           }
         }

         // IP pubblico come segnale soft (evita IP privati e NAT aziendali)
         const publicIp = adv.n?.ip || adv.network?.ip || "";
         const isPrivateIp = !publicIp
           || publicIp === "Unknown"
           || publicIp.startsWith("10.")
           || publicIp.startsWith("192.168.")
           || publicIp.startsWith("172.16.")
           || publicIp.startsWith("127.")
           || publicIp.startsWith("::1");
         if (!isPrivateIp) {
           if (!ipGroups.has(publicIp)) ipGroups.set(publicIp, new Set());
           ipGroups.get(publicIp)!.add(pid);
         }
       }
    }

    const CONF = {
      TOKEN_UNION:  1.00,  // token persistente condiviso: deterministico
      MANUAL:       1.00,  // merge manuale: definitivo
      CLIENT_MARK:  0.98,  // stesso session token: quasi definitivo
      IG_TAG:       0.88,  // stesso handle Instagram: forte
      // --- segnali CORROBORANTI: non collegano mai da soli (vedi sotto) ---
      HW_ANDROID:   0.45,
      IG_TAIL:      0.35,
      HW_IOS:       0.20,
      IP_PUBLIC:    0.12,
    } as const;

    const LINK_THRESHOLD = 0.55;
    // Una coppia sostenuta SOLO da segnali corroboranti non viene mai unita in
    // automatico: viene proposta all'operatore (vedi mergeSuggestions).
    const SUGGEST_THRESHOLD = 0.40;

    const edgeConfidence = new Map<string, number>();
    // key -> (reasonKey -> confidence). Un Map interno perché lo stesso segnale
    // osservato N volte è UNA sola prova, non N prove indipendenti.
    const edgeSignals = new Map<
      string,
      Map<string, { conf: number; label: string; linking: boolean }>
    >();

    /**
     * Combinazione noisy-OR di prove indipendenti:  P = 1 - Π(1 - pᵢ)
     *
     * Sostituisce il precedente `max`, che buttava via ogni prova successiva
     * alla più forte: due indizi da 0.45 restavano 0.45 invece di valere 0.70.
     */
    const combineConfidence = (
      sigs: Map<string, { conf: number; label: string; linking: boolean }>,
    ) => {
      let inverse = 1;
      for (const s of sigs.values()) inverse *= 1 - s.conf;
      return 1 - inverse;
    };

    /**
     * Registra una prova su una coppia di profili.
     *
     * `linking`  : la prova può, da sola, giustificare l'unione (token, merge
     *              manuale, handle Instagram).
     * `deviceLevel`: la prova afferma «stesso dispositivo fisico», quindi è
     *              soggetta al VINCOLO NEGATIVO — viene scartata se i due
     *              profili hanno tratti hardware incompatibili (un iPhone14,5
     *              non può essere anche un SM-G991B). Le prove a livello di
     *              PERSONA (handle, merge manuale) non lo applicano: una persona
     *              possiede legittimamente sia un iPhone sia un Android.
     */
    const addSignal = (
      u: string,
      v: string,
      reasonKey: string,
      label: string,
      confidence: number,
      opts: { linking: boolean; deviceLevel: boolean },
    ) => {
      if (u === v) return;
      if (profiles[u]?.excludeFromAutoGrouping || profiles[v]?.excludeFromAutoGrouping) return;
      if (!adj.has(u) || !adj.has(v)) return;
      if (confidence <= 0) return;

      if (opts.deviceLevel) {
        const ta = traitsByPid.get(u);
        const tb = traitsByPid.get(v);
        if (ta && tb && !areDeviceTraitsCompatible(ta, tb)) return;

        // Impossibilità temporale: due paesi diversi a poca distanza di tempo.
        // Applicata SOLO alle prove deboli — una VPN può spostare il paese
        // apparente, quindi al massimo si perde un suggerimento, mai un
        // collegamento certo come quello dato da un token condiviso.
        if (!opts.linking) {
          const ga = geoEventsByPid.get(u);
          const gb = geoEventsByPid.get(v);
          if (ga && gb && hasGeographicConflict(ga, gb)) return;
        }
      }

      const key = [u, v].sort().join("|");
      if (!edgeSignals.has(key)) edgeSignals.set(key, new Map());
      const sigs = edgeSignals.get(key)!;
      const prev = sigs.get(reasonKey);
      if (!prev || confidence > prev.conf) {
        sigs.set(reasonKey, {
          conf: confidence,
          label: label + " (conf:" + Math.round(confidence * 100) + "%)",
          linking: opts.linking,
        });
      }
    };


    for (const n of nodes) {
      const prof = profiles[n];
      if (prof?.excludeFromAutoGrouping) continue;
      const { tags } = getProfileInstagrams(n);
      for (const tag of tags) {
        if (!tagGroups.has(tag)) tagGroups.set(tag, []);
        tagGroups.get(tag)!.push(n);
      }
    }
    /**
     * Quanto un dispositivo "possiede" un handle: la quota dei suoi messaggi
     * con handle in cui compare proprio quello.
     *
     * L'handle è testo libero, non verificato: chiunque può digitare quello di
     * un altro. Finora l'unica difesa era scartare gli handle rivendicati da
     * più di 3 dispositivi, quindi bastava digitarlo una o due volte per essere
     * fusi nell'identità della vittima.
     *
     * Un dispositivo che dichiara sempre lo stesso handle lo possiede davvero;
     * uno che lo nomina una volta su sei ha molto più probabilmente parlato di
     * qualcun altro. La confidenza dell'arco viene quindi ridotta in proporzione
     * al possesso PIÙ DEBOLE fra i due: un handle diluito non unisce più in
     * automatico, ma può ancora emergere come suggerimento se altri segnali lo
     * corroborano.
     *
     * Un tag che non proviene dai messaggi ma dal documento del profilo è stato
     * inserito da un operatore: vale come possesso pieno.
     */
    const handleOwnership = (pid: string, tag: string): number => {
      const total = handleTotalByPid.get(pid) ?? 0;
      if (total === 0) return 1;
      const used = handleCountsByPid.get(pid)?.get(tag) ?? 0;
      if (used === 0) return 1;
      return used / total;
    };

    const CONTESTED_HANDLE_MAX = 3; // handle claimed by >3 devices => contested
    for (const [tag, pids] of tagGroups.entries()) {
      const distinct = Array.from(new Set(pids));
      // A handle spread across many distinct devices is likely typed by several
      // people (or someone entering another user's username): do NOT auto-merge.
      if (distinct.length > CONTESTED_HANDLE_MAX) continue;
      for (let i = 0; i < distinct.length; i++) {
        for (let j = i + 1; j < distinct.length; j++) {
          const ownership = Math.min(
            handleOwnership(distinct[i], tag),
            handleOwnership(distinct[j], tag),
          );
          const confidence = CONF.IG_TAG * ownership;
          const label =
            ownership >= 0.999
              ? "Stesso tag Instagram (" + tag + ")"
              : "Stesso tag Instagram (" +
                tag +
                ", uso " +
                Math.round(ownership * 100) +
                "%)";
          addSignal(
            distinct[i],
            distinct[j],
            "ig_tag:" + tag,
            label,
            confidence,
            // PERSON-level: nessun vincolo negativo, una persona può usare lo
            // stesso handle da un iPhone e da un Android.
            { linking: true, deviceLevel: false },
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // PROVA DETERMINISTICA: token persistenti condivisi.
    //
    // resolveIdentity fotografa OGNI backend prima di riseminarli tutti con il
    // token primario, quindi un messaggio inviato durante una transizione
    // (compare il cookie di server mentre uno storage locale ha ancora il vecchio id,
    // una cancellazione parziale dello storage, un relay fra browser) trasporta sia il
    // valore vecchio sia quello nuovo. Due profili che condividono uno di questi
    // valori sono lo stesso dispositivo: nessuna probabilità, nessun
    // segnale probabilistico. È ciò che ricongiunge un dispositivo che altrimenti si
    // spezzerebbe in due profili quando il suo token primario cambia.
    // -----------------------------------------------------------------------
    for (const [tok, pidsSet] of tokenGroups.entries()) {
      const pids = Array.from(pidsSet);
      if (pids.length < 2) continue;
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) {
          addSignal(
            pids[i],
            pids[j],
            "token:" + tok,
            "Token di dispositivo condiviso (…" + tok.slice(-6) + ")",
            CONF.TOKEN_UNION,
            { linking: true, deviceLevel: false },
          );
        }
      }
    }

    for (const [, pidsSet] of clientMarkGroups.entries()) {
      const pids = Array.from(pidsSet);
      for (let i = 0; i < pids.length; i++)
        for (let j = i + 1; j < pids.length; j++)
          addSignal(
            pids[i],
            pids[j],
            "clientmark",
            "Stesso token di sessione (clientMark)",
            CONF.CLIENT_MARK,
            { linking: true, deviceLevel: true },
          );
    }

    // -----------------------------------------------------------------------
    // SEGNALI CORROBORANTI (segnali hardware, IG install id, IP pubblico).
    //
    // Non creano MAI un collegamento da soli: è esattamente ciò che in passato
    // fondeva persone diverse che possiedono lo stesso modello di telefono
    // (canvas/audio identici su iOS, seed hardware identico su Android) o la
    // stessa build dell'app Instagram.
    //
    // Ora vengono registrati come prove deboli: alzano la confidenza di una
    // coppia già sostenuta da una prova vera e, quando da soli non bastano,
    // diventano un SUGGERIMENTO DI UNIONE mostrato all'operatore invece di una
    // fusione silenziosa. Sono inoltre soggetti al vincolo negativo, quindi non
    // possono nemmeno essere proposti fra dispositivi fisicamente incompatibili.
    // -----------------------------------------------------------------------
    const addCorroborating = (
      groups: Map<string, Set<string>>,
      reasonPrefix: string,
      label: (k: string) => string,
      confidence: number,
    ) => {
      for (const [k, pidsSet] of groups.entries()) {
        const pids = Array.from(pidsSet);
        if (pids.length < 2) continue;
        // Un valore condiviso da moltissimi profili non è un indizio di
        // identità (es. NAT di ateneo, build dell'app diffusa): è rumore.
        if (pids.length > 8) continue;
        for (let i = 0; i < pids.length; i++) {
          for (let j = i + 1; j < pids.length; j++) {
            addSignal(pids[i], pids[j], reasonPrefix, label(k), confidence, {
              linking: false,
              deviceLevel: true,
            });
          }
        }
      }
    };

    addCorroborating(hwGroups, "hw_android", () => "Seed hardware identico (Android/Desktop)", CONF.HW_ANDROID);
    addCorroborating(hwGroupsiOS, "hw_ios", () => "Seed hardware identico (iOS)", CONF.HW_IOS);
    addCorroborating(igTailIdGroups, "ig_tail", () => "Stesso identificativo di coda Instagram", CONF.IG_TAIL);
    addCorroborating(ipGroups, "ip_public", (ip) => "Stesso IP pubblico (" + ip + ")", CONF.IP_PUBLIC);

    // Merge manuale — prova a livello di PERSONA: l'operatore ha già deciso,
    // quindi nessun vincolo negativo può annullarla.
    for (const n of nodes) {
      const prof = profiles[n];
      if (prof?.linkedToProfileId && adj.has(prof.linkedToProfileId)) {
        addSignal(n, prof.linkedToProfileId, "manual", "Merge manuale", CONF.MANUAL, {
          linking: true,
          deviceLevel: false,
        });
      }
    }

    // -----------------------------------------------------------------------
    // MATERIALIZZAZIONE: dalle prove agli archi.
    //
    // Una coppia diventa un arco solo se possiede almeno una prova capace di
    // collegare da sola E la confidenza combinata supera la soglia. Le coppie
    // sostenute unicamente da segnali corroboranti non vengono fuse: diventano
    // suggerimenti per l'operatore, che decide con il merge manuale.
    // -----------------------------------------------------------------------
    const suggestedPairs: {
      a: string;
      b: string;
      confidence: number;
      reasons: string[];
    }[] = [];

    for (const [key, sigs] of edgeSignals.entries()) {
      const [u, v] = key.split("|");
      if (!adj.has(u) || !adj.has(v)) continue;
      const combined = combineConfidence(sigs);
      const hasLinkingProof = Array.from(sigs.values()).some((s) => s.linking);
      const reasons = Array.from(sigs.values()).map((s) => s.label);

      if (hasLinkingProof && combined >= LINK_THRESHOLD) {
        edgeConfidence.set(key, combined);
        edgeReasons.set(key, reasons);
        adj.get(u)!.add(v);
        adj.get(v)!.add(u);
      } else if (combined >= SUGGEST_THRESHOLD) {
        suggestedPairs.push({ a: u, b: v, confidence: combined, reasons });
      }
    }

    const visited = new Set<string>();
    const components: string[][] = [];
    for (const n of nodes) {
      if (!visited.has(n)) {
        const comp: string[] = [];
        const q = [n];
        visited.add(n);
        while (q.length > 0) {
          const curr = q.shift()!;
          comp.push(curr);
          const neighbors = adj.get(curr);
          if (neighbors) {
            for (const neighbor of neighbors) {
              if (!visited.has(neighbor)) {
                visited.add(neighbor);
                q.push(neighbor);
              }
            }
          }
        }
        components.push(comp);
      }
    }

    // Suggerimenti di unione, riportati dal livello profilo a quello macro.
    const compIndexByPid = new Map<string, number>();
    components.forEach((comp, idx) =>
      comp.forEach((p) => compIndexByPid.set(p, idx)),
    );
    const macroIdByIndex = components.map((comp) => [...comp].sort().join("_"));
    const suggestionsByComp = new Map<
      number,
      Map<number, { confidence: number; reasons: string[] }>
    >();
    for (const s of suggestedPairs) {
      const ia = compIndexByPid.get(s.a);
      const ib = compIndexByPid.get(s.b);
      // Se sono già finiti nello stesso macro-profilo il suggerimento è inutile.
      if (ia === undefined || ib === undefined || ia === ib) continue;
      const record = (from: number, to: number) => {
        if (!suggestionsByComp.has(from)) suggestionsByComp.set(from, new Map());
        const m = suggestionsByComp.get(from)!;
        const prev = m.get(to);
        if (!prev || s.confidence > prev.confidence) {
          m.set(to, { confidence: s.confidence, reasons: s.reasons });
        }
      };
      record(ia, ib);
      record(ib, ia);
    }

    return components
      .map((comp, compIdx) => {
        comp.sort();
        const id = comp.join("_");
        const compMsgs = messages.filter((m) =>
          comp.includes(getDeviceProfile(m)),
        );
        const names = comp
          .map((p) => profiles[p]?.name)
          .filter(Boolean) as string[];
        let name = "Profilo";
        if (names.length > 0) {
          name = Array.from(new Set(names)).join(" & ");
        } else {
          name = "Sconosciuto";
        }
        if (comp.length > 1 && names.length === 0) name = "Profilo Aggregato";
        const possibleAliases = new Set<string>();
        comp.forEach((p) => {
          (profiles[p]?.possibleAliases || []).forEach((s) => possibleAliases.add(s));
        });
        const instagrams = new Set<string>();
        comp.forEach((p) => {
          getProfileInstagrams(p).tags.forEach((t) => instagrams.add(t));
        });
        const mostRecentMsg = compMsgs.sort(
          (a, b) =>
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
        )[0];
        const totalTime = compMsgs.reduce((acc, curr) => {
          const s = curr.parsedAdvanced?.behavior?.sessionTimeSeconds;
          return acc + (typeof s === "number" ? s : 0);
        }, 0);
        const lastIp = mostRecentMsg
          ? mostRecentMsg.parsedAdvanced?.network?.ip ||
            mostRecentMsg.parsedAdvanced?.n?.ip ||
            "Sconosciuto"
          : "Sconosciuto";
        const linkReasons: Record<string, string[]> = {};
        comp.forEach(p1 => {
          comp.forEach(p2 => {
            if (p1 !== p2) {
              const key = [p1, p2].sort().join("|");
              if (edgeReasons.has(key)) {
                linkReasons[key] = edgeReasons.get(key)!;
              }
            }
          });
        });
        
        const compFootprints: Record<string, any> = {};
        comp.forEach(p => {
          if (deviceFootprints.has(p)) {
            compFootprints[p] = deviceFootprints.get(p);
          }
        });

        // Suggerimenti verso altri macro-profili, ordinati per confidenza.
        const compSuggestions =
          suggestionsByComp.get(compIdx) ??
          new Map<number, { confidence: number; reasons: string[] }>();
        const dismissed = new Set<string>();
        comp.forEach((p) => {
          (profiles[p]?.dismissedMatches || []).forEach((d: string) =>
            dismissed.add(d),
          );
        });
        const suggestions = Array.from(compSuggestions.entries())
          .map(([otherIdx, info]) => ({
            macroId: macroIdByIndex[otherIdx],
            // Chiave stabile del suggerimento: il primo identificativo del
            // gruppo proposto. L'id del macro-profilo cambia appena la sua
            // composizione cambia, quindi non serve per ricordare un "no".
            dismissKey: [...components[otherIdx]].sort()[0],
            confidence: info.confidence,
            reasons: info.reasons,
          }))
          .filter((s) => !!s.macroId && !dismissed.has(s.dismissKey))
          .sort((a, b) => b.confidence - a.confidence);

        // Un macro-profilo è affidabile solo se OGNI profilo che lo compone
        // deriva da un token. Se anche uno solo proviene da un seed hardware
        // legacy, potrebbe aggregare persone diverse: va segnalato.
        const isLegacyIdentity = comp.some(
          (p) => getProfileIdConfidence(p) === "legacy",
        );

        return {
          id,
          profileIds: comp,
          name,
          possibleAliases: Array.from(possibleAliases),
          instagrams: Array.from(instagrams),
          msgCount: compMsgs.length,
          totalTime,
          lastIp,
          mostRecentMsg,
          linkReasons,
          compFootprints,
          suggestions,
          isLegacyIdentity,
        };
      })
      .sort(
        (a, b) =>
          (b.suggestions.length > 0 ? 1 : 0) - (a.suggestions.length > 0 ? 1 : 0) ||
          b.msgCount - a.msgCount,
      );
  }, [
    allProfileIds,
    profiles,
    getProfileInstagrams,
    messages,
    getDeviceProfile,
  ]);
  const profileToMacroMap = useMemo(() => {
    const map = new Map<string, typeof macroProfiles[0]>();
    for (const macro of macroProfiles) {
      for (const pid of macro.profileIds) {
        map.set(pid, macro);
      }
    }
    return map;
  }, [macroProfiles]);

  // --- Dati per la scheda Analytics ---------------------------------------
  // Erano tre useMemo scritti DENTRO le props JSX di <Analytics>: funzionavano
  // solo perché quel ramo è sempre montato, ma bastava racchiuderlo in una
  // condizione per rompere l'ordine degli hook. Inoltre ogni messaggio faceva
  // un macroProfiles.find() lineare (costo quadratico): ora si usa la mappa
  // profilo→macro già disponibile, con accesso costante.
  const ignoredProfileIds = useMemo(() => {
    const ignored = new Set<string>();
    for (const [pid, prof] of Object.entries(profiles)) {
      if (prof?.ignoredFromAnalytics) ignored.add(pid);
    }
    // Se anche un solo profilo del macro è escluso, lo è l'intero macro.
    for (const macro of macroProfiles) {
      if (macro.profileIds.some((id) => ignored.has(id))) {
        for (const id of macro.profileIds) ignored.add(id);
      }
    }
    return ignored;
  }, [profiles, macroProfiles]);

  const analyticsMessages = useMemo(
    () => messages.filter((m) => !ignoredProfileIds.has(getDeviceProfile(m))),
    [messages, ignoredProfileIds, getDeviceProfile],
  );

  const analyticsProfiles = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(profiles).filter(([pid]) => !ignoredProfileIds.has(pid)),
      ),
    [profiles, ignoredProfileIds],
  );

  const analyticsMacroProfiles = useMemo(
    () =>
      macroProfiles.filter(
        (m) => !m.profileIds.some((pid) => ignoredProfileIds.has(pid)),
      ),
    [macroProfiles, ignoredProfileIds],
  );

  const viewingMacro = useMemo(() => {
    if (!viewingMacroId) return null;
    return macroProfiles.find((m) => m.id === viewingMacroId) || null;
  }, [viewingMacroId, macroProfiles]);
  const viewingMacroStats = useMemo(() => {
    if (!viewingMacro) return null;
    const msgs = messages.filter((m) =>
      viewingMacro.profileIds.includes(getDeviceProfile(m)),
    );
    const sortedMsgs = [...msgs].sort(
      (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
    );
    const oldest =
      sortedMsgs[sortedMsgs.length - 1]?.createdAt?.toDate() || null;
    const newest = sortedMsgs[0]?.createdAt?.toDate() || null;
    const hardwareSignals = new Set<string>();
    const clientMarks = new Set<string>();
    let totalSessionTime = 0;
    const ipAddresses = new Set<string>();
    const automationSignals = new Set<string>();
    const netHints = new Set<string>();
    const permissionsList = new Set<string>();
    const storageInfo = new Set<string>();
    msgs.forEach((m) => {
      const adv = m.parsedAdvanced || null;
      if (adv) {
        const gpu = adv.hardware?.gpu || adv.h?.gpu || adv.h?.g || "";
        const screen = adv.hardware?.screen || adv.h?.screen || adv.h?.s || "";
        const cpu = adv.hardware?.cores || adv.h?.cores || adv.h?.c || "";
        const mem =
          adv.hardware?.memory ||
          adv.h?.memory ||
          adv.h?.m ||
          adv.hardware?.ram ||
          adv.h?.ram ||
          "";
        const canvas =
          adv.software?.canvasSample ||
          adv.s?.canvasSample ||
          adv.s?.c ||
          "";
        const audio =
          adv.software?.audioSample ||
          adv.s?.audioSample ||
          adv.s?.a ||
          "";
        const mathSampleFlag = adv.software?.mathSample?.pi ? "Supportato" : "";
        const extraSensors =
          adv.hardware?.extraSensors || adv.h?.extraSensors || "";
        const rectsId =
          adv.software?.layoutRectsSample || adv.s?.layoutRectsSample || "";
          
        if (gpu) hardwareSignals.add(`GPU: ${gpu}`);
        if (screen) hardwareSignals.add(`Schermo: ${screen}`);
        if (cpu) hardwareSignals.add(`CPU: ${cpu} core`);
        if (mem) hardwareSignals.add(`RAM: ${mem}GB`);
        if (canvas) hardwareSignals.add(`Canvas ID: ${canvas}`);
        if (audio) hardwareSignals.add(`Audio ID: ${audio}`);
        if (mathSampleFlag) hardwareSignals.add(`Math Fp: ${mathSampleFlag}`);
        if (rectsId) hardwareSignals.add(`Rects ID: ${rectsId}`);
        if (extraSensors)
          hardwareSignals.add(`Sensori: ${extraSensors}`);
        const sessionTime =
          adv.behavior?.sessionTimeSeconds ?? adv.b?.sessionTimeSeconds;
        if (typeof sessionTime === "number") totalSessionTime += sessionTime;
        const ip = adv.network?.ip || adv.n?.ip;
        if (ip) ipAddresses.add(ip);
        const netHint = adv.network?.netHint || adv.n?.netHint;
        if (netHint) netHints.add(netHint);
        const automationSignal = adv.software?.automationSignal || adv.s?.automationSignal;
        if (automationSignal) automationSignals.add(automationSignal);
        const incognito = adv.software?.incognito || adv.s?.incognito;
        if (incognito) automationSignals.add(`Incognito: ${incognito}`);
        const perms = adv.software?.permissions || adv.s?.permissions;
        if (perms)
          permissionsList.add(
            `Geo: ${perms.geolocation}, Camera: ${perms.camera}, Mic: ${perms.microphone}`,
          );
        const storage = adv.software?.storage || adv.s?.storage;
        if (storage) storageInfo.add(`Storage: ${storage}`);
        const tt = adv.behavior?.cmk || adv.b?.cmk || adv.b?.clientMark;
        if (tt) clientMarks.add(tt);
      }
      if (m.deviceInfo?.userAgent) {
        hardwareSignals.add(
          `Browser/Device: ${m.deviceInfo.userAgent}`
        );
      }
    });
    return {
      messages: sortedMsgs,
      oldest,
      newest,
      hardwareSignals: Array.from(hardwareSignals),
      clientMarks: Array.from(clientMarks),
      totalSessionTime,
      ipAddresses: Array.from(ipAddresses),
      netHints: Array.from(netHints),
      automationSignals: Array.from(automationSignals),
      permissionsList: Array.from(permissionsList),
      storageInfo: Array.from(storageInfo),
    };
  }, [viewingMacro, messages, getDeviceProfile]);
  const getProfileColorCacheRef = useRef(new Map<string, string>());
  const getProfileColor = (profileId: string) => {
    const cached = getProfileColorCacheRef.current.get(profileId);
    if (cached) return cached;
    const result = computeDeviceProfileColor(profileId);
    getProfileColorCacheRef.current.set(profileId, result);
    return result;
  };
  useEffect(() => {
    // 1. STATS
    getDoc(doc(db, "stats", "totali")).then((statsDoc) => {
      if (statsDoc.exists()) {
        setTotalGlobalMessages(statsDoc.data().totalMessages || null);
      }
    }).catch(err => console.error("error stats", err));
  }, []);

  useEffect(() => {
    // 2. PROFILES
    const unsubscribeProfiles = onSnapshot(collection(db, "profiles"), (profilesSnap) => {
      const pmap: Record<string, ProfileRecord> = {};
      profilesSnap.docs.forEach((doc) => {
        pmap[doc.id] = { id: doc.id, ...doc.data() } as ProfileRecord;
      });
      setProfiles(pmap);
      setProfilesLoaded(true);
    }, (error) => {
      console.error("Firestore profiles error:", error);
      // In precedenza il messaggio veniva concatenato a ogni errore, crescendo
      // senza limite ad ogni tentativo di riconnessione.
      setSnapshotsError("Profili: " + error.message);
      setProfilesLoaded(true);
    });

    return () => unsubscribeProfiles();
  }, []);

  useEffect(() => {
    // 2.5 CAROUSEL APPROVED MESSAGES (background)
    const qCarousel = query(collection(db, "messages"), where("isValidatedForCarousel", "==", true), limit(50));
    const unsubscribeCarousel = onSnapshot(qCarousel, (snapshot) => {
      const msgs: any[] = [];
      snapshot.docs.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // Sort in-memory to prioritize the pinned first slide (cover), then newest first
      msgs.sort((a, b) => {
        if (a.isFirstSlideOfCarousel && !b.isFirstSlideOfCarousel) return -1;
        if (!a.isFirstSlideOfCarousel && b.isFirstSlideOfCarousel) return 1;
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setCarouselValidatedMessages(msgs);
    }, (err) => {
      console.error("Error loading carousel approved messages:", err);
    });

    return () => unsubscribeCarousel();
  }, []);

  useEffect(() => {
    // 3. MESSAGES
    //
    // La sottoscrizione dipende SOLO da quanti documenti servono. In passato
    // dipendeva anche da viewFilter / onlyPostsFilter / selectedZoneFilter e
    // da currentPage: filtri applicati interamente lato client, che quindi non
    // cambiano la query. Ogni click su un filtro o su "pagina successiva"
    // distruggeva e ricreava l'onSnapshot, riscaricando e ri-parsificando
    // (base64 + JSON) migliaia di documenti.
    setLoading(true);
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      // Nessuna query senza limite: prima le schede Analytics/Profili e
      // l'apertura di un macro-profilo scaricavano l'INTERA collezione.
      limit(fetchLimit),
    );

    const unsubscribeMessages = onSnapshot(q, (msgsSnap) => {
      const msgs = msgsSnap.docs.map((doc) => {
        const data = doc.data();
        let parsedAdv = null;
        if (data.advancedInfo) {
          try {
            let decodedStr =
              typeof data.advancedInfo === "string"
                ? data.advancedInfo
                : JSON.stringify(data.advancedInfo);
            if (
              typeof data.advancedInfo === "string" &&
              !data.advancedInfo.startsWith("{")
            ) {
              try {
                const base64Decoded = atob(data.advancedInfo);
                decodedStr = decodeURIComponent(base64Decoded);
              } catch (e) {
                console.error(
                  "Error decoding base64 advancedInfo for message " + doc.id,
                  e,
                );
              }
            }
            parsedAdv = JSON.parse(decodedStr);
          } catch (e: any) {
            console.error(
              `Failed to parse advancedInfo for message ${doc.id}: ${e.message}`,
            );
          }
        }
        let profileId = data.profileGroupId;
        if (!profileId) {
          profileId = computeDeviceProfileId(parsedAdv, data.deviceInfo, data.instagram);
        }
        const profileColor = computeDeviceProfileColor(profileId);
        return {
          id: doc.id,
          ...data,
          parsedAdvanced: parsedAdv,
          computedProfileId: profileId,
          computedProfileColor: profileColor,
        };
      }) as (Message & {
        parsedAdvanced?: any;
        computedProfileId: string;
        computedProfileColor: string;
      })[];
      setMessages(msgs);
      setHistoryTruncated(msgs.length >= fetchLimit);
      setLoading(false);
      setSnapshotsError(null);
    }, (error) => {
      console.error("Firestore messages error:", error);
      setSnapshotsError("Messaggi: " + error.message);
      setLoading(false);
    });

    return () => unsubscribeMessages();
  }, [fetchLimit]);

  // Il tetto di documenti cresce solo quando serve davvero (schede che
  // analizzano l'intero storico, apertura di un macro-profilo, o navigazione
  // oltre il buffer già caricato) e non torna mai indietro: così cambiare
  // scheda o pagina non provoca una nuova sottoscrizione se i dati bastano.
  useEffect(() => {
    const needsFullHistory =
      activeTab === "analytics" ||
      activeTab === "profiles" ||
      viewingMacroId !== null;
    const needed = needsFullHistory
      ? MESSAGES_HARD_CAP
      : Math.min(
          MESSAGES_HARD_CAP,
          Math.max(MESSAGES_BASE_BUFFER, pageSize * currentPage * 3),
        );
    setFetchLimit((prev) => (needed > prev ? needed : prev));
  }, [activeTab, viewingMacroId, pageSize, currentPage]);

  useEffect(() => {
    // 4. VISITS (Only when analytics is requested)
    if (activeTab === "analytics" && visits.length === 0) {
      getDocs(collection(db, "analytics_visits")).then((visitsSnap) => {
        const v: any[] = [];
        visitsSnap.docs.forEach((doc) => {
          v.push({ id: doc.id, ...doc.data() });
        });
        setVisits(v);
      }).catch(error => {
        console.error("Firestore visits error:", error);
      });
    }
  }, [activeTab, visits.length]);
  /* Reset pagination when any filter, the page size or the tab changes */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    viewFilter,
    pageSize,
    activeTab,
    searchQuery,
    onlyPostsFilter,
    selectedZoneFilter,
  ]);
  /* Handle selected messages sync */ useEffect(() => {
    setSelectedMessages((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(messages.map((m) => m.id));
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [messages]);
  const processedSyncsRef = useRef<Set<string>>(new Set());
  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);
  /* Auto-sync discovered instagram tags to the persistent profile records */ useEffect(() => {
    // Senza i profili già caricati, `profilesRef.current` è vuoto: il controllo
    // su removedInstagrams non troverebbe nulla e i tag rimossi a mano
    // verrebbero re-inseriti da arrayUnion. Lo snapshot dei messaggi arriva
    // spesso prima di quello dei profili, quindi la condizione era reale.
    if (!profilesLoaded) return;

    const syncInstagrams = async () => {
      const updatesByPid = new Map<string, Set<string>>();
      // Le chiavi marcate in questo giro: vengono confermate come "processate"
      // solo se la scrittura va a buon fine, altrimenti un errore di rete
      // farebbe perdere il tag per sempre (nessun nuovo tentativo).
      const pendingSyncKeys: string[] = [];
      for (const msg of messages) {
        if (msg.instagram) {
          const cleanInsta = msg.instagram
            .toLowerCase()
            .replace(/[^a-z0-9._]/g, "");
          const pid = getDeviceProfile(msg);
          if (pid === "UNKNOWN") continue;
          const syncKey = `${pid}-${cleanInsta}`;
          if (processedSyncsRef.current.has(syncKey)) continue;
          const currentProfile = profilesRef.current[pid];
          const currCustom = currentProfile?.customInstagrams || [];
          const currCustomNormalized = currCustom.map((t) =>
            t.toLowerCase().replace(/[^a-z0-9._]/g, ""),
          );
          const removedInstas = currentProfile?.removedInstagrams || [];
          /* Check if already present, or if user explicitly removed it before */ if (
            currentProfile?.instagram
              ?.toLowerCase()
              .replace(/[^a-z0-9._]/g, "") === cleanInsta ||
            currCustomNormalized.includes(cleanInsta) ||
            removedInstas.includes(cleanInsta)
          ) {
            processedSyncsRef.current.add(syncKey);
            continue;
          }
          pendingSyncKeys.push(syncKey);
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
            batchOp.set(
              doc(db, "profiles", pid),
              { customInstagrams: arrayUnion(...Array.from(tags)) },
              { merge: true },
            );
          }
          await batchOp.commit();
          for (const k of pendingSyncKeys) processedSyncsRef.current.add(k);
        } catch (e: any) {
          console.error("Batch auto-sync error:", e);
          // Nessuna chiave marcata: al prossimo snapshot si riprova.
        }
      }
    };
    const timeoutId = setTimeout(syncInstagrams, 1000);
    return () => clearTimeout(timeoutId);
    // `profiles` resta volutamente fuori dalle dipendenze (si legge via ref)
    // per non innescare un ciclo: la sincronizzazione scrive sui profili.
  }, [messages, profilesLoaded]);
  /* Removed profiles from deps to avoid infinite loops */ const handleLogout =
    () => {
      signOut(auth);
    };
  type ConfirmModalState =
    | { isOpen: false; messageId: null; type: null }
    | { isOpen: true; type: "delete" | "ungroup"; messageId: string }
    | {
        isOpen: true;
        type: "delete-bulk" | "delete-profile-bulk";
        messageId: null;
      };
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(
    { isOpen: false, messageId: null, type: null },
  );
  const confirmAction = async () => {
    if (!confirmModalState.isOpen) return;
    try {
      if (confirmModalState.type === "delete") {
        await deleteDoc(doc(db, "messages", confirmModalState.messageId));
        notify("Messaggio eliminato", "ok");
      } else if (confirmModalState.type === "ungroup") {
        await updateDoc(doc(db, "messages", confirmModalState.messageId), {
          profileGroupId: deleteField(),
        });
        notify("Messaggio rimosso dal gruppo", "ok");
      } else if (confirmModalState.type === "delete-bulk") {
        const ops = selectedMessages.map(
          (id) => (b: ReturnType<typeof writeBatch>) =>
            b.delete(doc(db, "messages", id)),
        );
        const res = await commitOperations(ops);
        reportBulkOutcome(res, "messaggi eliminati");
        setSelectedMessages([]);
        setIsSelectMode(false);
      } else if (confirmModalState.type === "delete-profile-bulk") {
        // Prima si costruisce l'elenco COMPLETO delle operazioni, poi lo si
        // spezza in blocchi da 500. In precedenza si spezzavano i macro-profili
        // (500 macro per blocco), ma ciascuno contiene N profili PIÙ gli update
        // di pulizia: un solo blocco poteva superare di molto il limite di 500
        // operazioni imposto da Firestore e fallire per intero.
        const pidsToDelete = new Set<string>();
        for (const macroId of selectedProfiles) {
          const macro = macroProfiles.find((m) => m.id === macroId);
          if (macro) for (const pid of macro.profileIds) pidsToDelete.add(pid);
        }
        const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
        for (const pid of pidsToDelete) {
          ops.push((b) => b.delete(doc(db, "profiles", pid)));
        }
        // Pulizia dei riferimenti pendenti verso i profili eliminati. Si usa
        // set(merge) e non update(): update su un documento già cancellato in
        // un blocco precedente farebbe fallire l'intero blocco successivo.
        Object.entries(profiles).forEach(([childPid, childProf]) => {
          if (
            childProf.linkedToProfileId &&
            pidsToDelete.has(childProf.linkedToProfileId) &&
            !pidsToDelete.has(childPid)
          ) {
            ops.push((b) =>
              b.set(
                doc(db, "profiles", childPid),
                { linkedToProfileId: deleteField() },
                { merge: true },
              ),
            );
          }
        });
        const res = await commitOperations(ops);
        reportBulkOutcome(res, "profili eliminati");
        setSelectedProfiles([]);
        setIsProfileSelectMode(false);
      }
    } catch (error: any) {
      console.error(error);
      notify("Errore durante l'operazione: " + (error?.message || ""), "error");
    } finally {
      setConfirmModalState({ isOpen: false, messageId: null, type: null });
    }
  };
  const handleDeleteMessage = (messageId: string) => {
    setConfirmModalState({ isOpen: true, messageId, type: "delete" });
  };
  const toggleArchiveStatus = async (
    messageId: string,
    currentStatus: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        isArchived: !currentStatus,
      });
      notify(
        currentStatus ? "Rimesso fra i nuovi" : "Archiviato",
        "ok",
        {
          label: "Annulla",
          run: () => {
            updateDoc(doc(db, "messages", messageId), {
              isArchived: currentStatus,
            }).catch((e) => {
              console.error(e);
              notify("Non sono riuscito ad annullare", "error");
            });
          },
        },
      );
    } catch (e) {
      console.error(e);
      notify("Errore durante l'operazione", "error");
    }
  };
  const handleBulkArchive = async () => {
    if (selectedMessages.length === 0) return;
    /* Determiniamo in quale tab ci troviamo (new o archived) e invertirne lo stato per la selezione */
    const targetStatus = viewFilter === "new";
    const ops = selectedMessages.map(
      (id) => (b: ReturnType<typeof writeBatch>) =>
        b.update(doc(db, "messages", id), { isArchived: targetStatus }),
    );
    const touched = [...selectedMessages];
    const res = await commitOperations(ops);
    if (res.failed === 0 && res.done > 0) {
      // Anche in blocco: si agisce e si puo' tornare indietro, invece di
      // chiedere conferma prima per qualcosa che e' reversibile.
      notify(
        `${res.done} ${targetStatus ? "messaggi archiviati" : "messaggi ripristinati"}`,
        "ok",
        {
          label: "Annulla",
          run: () => {
            commitOperations(
              touched.map((id) => (b: ReturnType<typeof writeBatch>) =>
                b.update(doc(db, "messages", id), { isArchived: !targetStatus }),
              ),
            ).catch(() => notify("Non sono riuscito ad annullare", "error"));
          },
        },
      );
    } else {
      reportBulkOutcome(res, targetStatus ? "messaggi archiviati" : "messaggi ripristinati");
    }
    setIsSelectMode(false);
    setSelectedMessages([]);
  };
  const toggleSelection = (id: string) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const handleGroupDevices = () => {
    if (selectedMessages.length < 2) {
      notify("Seleziona almeno 2 messaggi per raggrupparli", "info");
      return;
    }
    setGroupNameInput("");
    setShowGroupPrompt(true);
  };
  const confirmGroupDevices = async () => {
    const newProfileGroupId =
      groupNameInput.trim() ||
      `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const ops = selectedMessages.map(
      (id) => (b: ReturnType<typeof writeBatch>) =>
        b.update(doc(db, "messages", id), { profileGroupId: newProfileGroupId }),
    );
    const res = await commitOperations(ops);
    if (res.failed === 0) {
      notify(`${res.done} messaggi raggruppati in "${newProfileGroupId}"`, "ok");
    } else {
      reportBulkOutcome(res, "messaggi raggruppati");
    }
    setSelectedMessages([]);
    setIsSelectMode(false);
    setShowGroupPrompt(false);
  };
  const handleUngroupDevice = (messageId: string) => {
    setConfirmModalState({ isOpen: true, messageId, type: "ungroup" });
  };

  const generateMacroLogReport = (macro: any) => {
    let report = `Report Profili Collegati (Macro ID: ${macro.id})\n`;
    report += `Generato il: ${new Date().toLocaleString()}\n`;
    report += `Numero Dispositivi: ${macro.profileIds.length}\n\n`;

    report += `--- REGOLE DI MATCH ATTIVATE ---\n`;
    const edgeKeys = Object.keys(macro.linkReasons || {});
    if (edgeKeys.length === 0) {
      report += `Nessun match esplicito salvato (profilo singolo o generato in fallback).\n`;
    } else {
      for (const [edgeKey, reasons] of Object.entries(macro.linkReasons || {})) {
        const [pid1, pid2] = edgeKey.split("|");
        const prof1 = profiles[pid1]?.name || pid1;
        const prof2 = profiles[pid2]?.name || pid2;
        report += `Relazione: ${prof1} <-> ${prof2}\n`;
        (reasons as string[]).forEach((r) => {
          report += `  - ${r}\n`;
        });
        report += `\n`;
      }
    }

    report += `\n--- DATI HARDWARE GREZZI ---\n`;
    macro.profileIds.forEach((pid: string) => {
      const fp = (macro.compFootprints as any)?.[pid];
      const pname = profiles[pid]?.name || pid;
      report += `Dispositivo: ${pname} (ID: ${pid})\n`;
      if (fp) {
        report += `  clientMark:  ${fp.clientMark || "-"}\n`;
        report += `  Canvas:      ${fp.canvas || "-"}\n`;
        report += `  Audio:       ${fp.audio || "-"}\n`;
        report += `  GPU:         ${fp.gpu || "-"}\n`;
        report += `  Screen:      ${fp.screen || "-"}\n`;
        report += `  Cores:       ${fp.cores || "-"}\n`;
        report += `  Rects:       ${fp.rects || "-"}\n`;
        report += `  Math:        ${fp.math || "-"}\n`;
        report += `  UserAgent:   ${fp.userAgent || "-"}\n`;
        report += `  SEED EXACT:  ${fp.seed}\n`;
      } else {
        report += `  (Impronta non calcolata / vecchi dati)\n`;
      }
      report += `\n`;
    });

    return report;
  };

  const handleCopyMacroLog = async (macro: any) => {
    try {
      await navigator.clipboard.writeText(generateMacroLogReport(macro));
      notify("Log copiato negli appunti", "ok");
    } catch (err) {
      console.error("Failed to copy log", err);
      notify("Errore durante la copia del log", "error");
    }
  };

  const handleDownloadMacroLog = (macro: any) => {
    const blob = new Blob([generateMacroLogReport(macro)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_gruppo_${macro.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => {
      // 1. Archive status filter
      const matchesArchive = viewFilter === "archived" ? !!m.isArchived : !m.isArchived;
      if (!matchesArchive) return false;

      // 2. Only Spotted filter
      if (onlyPostsFilter) {
        const isPostType = !m.type || m.type === "spotted";
        if (!isPostType) return false;
      }

      // 3. Zone filter
      if (selectedZoneFilter) {
        const filterLower = selectedZoneFilter.trim().toLowerCase();
        const matchCity = m.city && m.city.trim().toLowerCase() === filterLower;
        const matchArea = m.area && m.area.trim().toLowerCase() === filterLower;
        const matchWhere = m.where && m.where.trim().toLowerCase() === filterLower;

        if (!matchCity && !matchArea && !matchWhere) {
          return false;
        }
      }

      // 4. Ricerca libera su testo, handle, risoluzione e luoghi.
      if (q) {
        const haystack = [
          m.lookingFor,
          m.instagram,
          m.resolution,
          m.city,
          m.area,
          m.where,
          m.when,
          ...(m.pollOptions || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [messages, viewFilter, onlyPostsFilter, selectedZoneFilter, searchQuery]);

  const hasActiveFilters =
    onlyPostsFilter || selectedZoneFilter !== "" || searchQuery.trim() !== "";
  const clearAllFilters = useCallback(() => {
    setOnlyPostsFilter(false);
    setSelectedZoneFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  // Contatori per i badge delle schede: quanti spotted sono ancora da leggere.
  const unreadCount = useMemo(
    () => messages.reduce((n, m) => (m.isArchived ? n : n + 1), 0),
    [messages],
  );

  const totalPagesMsg = Math.ceil(filteredMessages.length / pageSize) || 1;
  // La pagina corrente può eccedere il totale dopo un filtro più restrittivo:
  // in quel caso si mostra l'ultima pagina utile invece di una lista vuota.
  const safePageMsg = Math.min(currentPage, totalPagesMsg);
  const paginatedMessages = filteredMessages.slice(
    (safePageMsg - 1) * pageSize,
    safePageMsg * pageSize,
  );
  const totalPagesProf = Math.ceil(macroProfiles.length / pageSize) || 1;
  const safePageProf = Math.min(currentPage, totalPagesProf);
  const paginatedProfiles = macroProfiles.slice(
    (safePageProf - 1) * pageSize,
    safePageProf * pageSize,
  );
  /**
   * Selezione di massa.
   *
   * "Tutti" selezionava l'INTERO risultato filtrato nei Messaggi ma solo la
   * pagina corrente nei Profili: chi vedeva 20 schede e premeva Tutti + Elimina
   * poteva cancellare migliaia di documenti credendo di eliminarne venti.
   * Ora il comportamento è uniforme e il comando che agisce su tutto dichiara
   * esplicitamente quanti elementi coinvolge.
   */
  const selectCurrentPage = useCallback(() => {
    if (activeTab === "messages") {
      setSelectedMessages(paginatedMessages.map((m) => m.id));
    } else {
      setSelectedProfiles(paginatedProfiles.map((p) => p.id));
    }
  }, [activeTab, paginatedMessages, paginatedProfiles]);

  const selectAllFiltered = useCallback(() => {
    if (activeTab === "messages") {
      setSelectedMessages(filteredMessages.map((m) => m.id));
    } else {
      setSelectedProfiles(macroProfiles.map((p) => p.id));
    }
  }, [activeTab, filteredMessages, macroProfiles]);

  const clearSelection = useCallback(() => {
    if (activeTab === "messages") setSelectedMessages([]);
    else setSelectedProfiles([]);
  }, [activeTab]);

  const selectableTotal =
    activeTab === "messages" ? filteredMessages.length : macroProfiles.length;

  const isAnySelectMode =
    (activeTab === "messages" && isSelectMode) ||
    (activeTab === "profiles" && isProfileSelectMode);

  useEffect(() => {
    const isAnyModalOpen =
      confirmModalState.isOpen ||
      showGroupPrompt ||
      showMergeModal.isOpen ||
      !!editingProfileId ||
      !!viewingMacroId ||
      // Mancava: con l'anteprima di esportazione aperta la pagina sottostante
      // continuava a scorrere.
      !!exportingMessage;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    confirmModalState.isOpen,
    showGroupPrompt,
    showMergeModal.isOpen,
    editingProfileId,
    viewingMacroId,
    exportingMessage,
  ]);

  /**
   * Esc chiude il livello modale più esterno. Nessuna finestra era chiudibile
   * da tastiera: l'unico modo era centrare il pulsante di chiusura.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (exportingMessage) return setExportingMessage(null);
      if (confirmModalState.isOpen)
        return setConfirmModalState({ isOpen: false, messageId: null, type: null });
      if (showGroupPrompt) return setShowGroupPrompt(false);
      if (showMergeModal.isOpen) {
        setShowMergeModal({ isOpen: false, sourceMacroId: null });
        setMergeSelectedProfiles([]);
        setMergeSearchQuery("");
        return;
      }
      if (editingProfileId) return setEditingProfileId(null);
      if (viewingMacroId) return setViewingMacroId(null);
      // Fuori dai modali, Esc annulla la modalità selezione.
      if (isSelectMode) {
        setIsSelectMode(false);
        setSelectedMessages([]);
      }
      if (isProfileSelectMode) {
        setIsProfileSelectMode(false);
        setSelectedProfiles([]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    exportingMessage,
    confirmModalState.isOpen,
    showGroupPrompt,
    showMergeModal.isOpen,
    editingProfileId,
    viewingMacroId,
    isSelectMode,
    isProfileSelectMode,
  ]);

  return (
    <div
      className="ac-next min-h-[100dvh] overflow-x-hidden p-4 md:p-8 transition-colors duration-500 bg-gray-50 dark:bg-gray-900"
    >

      <div className="max-w-7xl mx-auto">

        <header
          className={`sticky top-2 sm:top-4 z-40 mb-4 sm:mb-6 p-3 sm:p-4 rounded-3xl border shadow-sm transition-all duration-500 ${isAnySelectMode ? "bg-indigo-600 dark:bg-indigo-900 backdrop-blur-xl border-indigo-500 dark:border-indigo-800 shadow-indigo-500/20 dark:shadow-indigo-900/40 text-white shadow-lg scale-[1.01]" : "bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 shadow-sm"}`}
        >

          {/* NOT SELECT MODE */}
          {!isAnySelectMode && (
            <div className="flex flex-col gap-3 sm:gap-4 w-full">
              {/* Top Row: Logo & Actions */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Link to="/" className="shrink-0 flex items-center">
                    <Logo className="h-7 w-[90px] sm:h-9 sm:w-[120px] hover:opacity-80 transition-all duration-300" />
                  </Link>

                  {/* Contatore globale: veniva letto da Firestore a ogni
                      montaggio ma non era mostrato da nessuna parte. */}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {(activeTab === "messages" || activeTab === "profiles") && (
                    <button
                      onClick={() => {
                        if (activeTab === "messages") {
                          setIsSelectMode(true);
                          setSelectedMessages([]);
                        } else {
                          setIsProfileSelectMode(true);
                          setSelectedProfiles([]);
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold uppercase tracking-wide rounded-xl hover:shadow-md hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all active:scale-95 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span className="hidden sm:inline-block whitespace-nowrap">
                        Selezione
                      </span>
                    </button>
                  )}
                  <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-300 dark:border-gray-600 pl-1.5 sm:pl-2">
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                      title="Cambia tema"
                      aria-label="Cambia tema chiaro/scuro"
                    >
                      {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="p-2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                      title="Disconnetti"
                      aria-label="Disconnetti"
                    >
                      <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Navigation Tabs */}
              <div className="w-full overflow-x-auto hide-scrollbar -mx-1 px-1">
                <div className="flex items-center justify-start sm:justify-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700 min-w-max md:min-w-0">
                  <button
                    onClick={() => setActiveTab("messages")}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${ activeTab === "messages" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50" }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Messaggi
                  </button>
                  {isSuperAdmin && (
                    <>
                      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                      <button
                        onClick={() => setActiveTab("profiles")}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${ activeTab === "profiles" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50" }`}
                      >
                        <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Profili
                      </button>
                      <button
                        onClick={() => setActiveTab("analytics")}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${ activeTab === "analytics" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50" }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Analytics
                      </button>
                      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                      <div className="relative">
                        <button
                          onClick={() => setConfigMenuOpen((v) => !v)}
                          aria-expanded={configMenuOpen}
                          aria-haspopup="menu"
                          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === "story_template" ||
                            activeTab === "carousel" ||
                            activeTab === "settings"
                              ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                          }`}
                        >
                          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Configurazione
                          <span className="text-[9px] opacity-60">▾</span>
                        </button>
                        {configMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-[70]"
                              onClick={() => setConfigMenuOpen(false)}
                              aria-hidden="true"
                            />
                            <div
                              role="menu"
                              className="absolute right-0 mt-1.5 w-56 z-[80] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-1.5"
                            >
                              {(
                                [
                                  ["story_template", "Template storia", LayoutTemplate],
                                  ["carousel", "Carosello Instagram", Sparkles],
                                  ["settings", "Impostazioni", Settings],
                                ] as const
                              ).map(([tab, label, Icon]) => (
                                <button
                                  key={tab}
                                  role="menuitem"
                                  onClick={() => {
                                    setActiveTab(tab);
                                    setConfigMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2.5 transition-colors ${
                                    activeTab === tab
                                      ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  <Icon className="w-4 h-4 shrink-0 opacity-70" />
                                  {label}
                                </button>
                              ))}
                              <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                                {auth.currentUser?.email}
                                {totalGlobalMessages !== null && (
                                  <div className="mt-0.5 tabular-nums">
                                    {totalGlobalMessages.toLocaleString("it-IT")} messaggi in totale
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* SELECT MODE */}
          {isAnySelectMode && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">

              {/* Top Row on mobile, Left side on Desktop */}
              <div className="flex items-center justify-between w-full md:w-auto">

                <div className="flex items-center gap-3">

                  <button
                    onClick={() => {
                      if (activeTab === "messages") {
                        setIsSelectMode(false);
                        setSelectedMessages([]);
                      } else {
                        setIsProfileSelectMode(false);
                        setSelectedProfiles([]);
                      }
                    }}
                    className="p-2 sm:p-2 bg-white/10 hover:bg-red-500/80 rounded-full text-white transition-colors flex items-center justify-center shrink-0 border border-white/10 dark:bg-gray-900"
                    title="Annulla selezione"
                    aria-label="Annulla selezione"
                  >

                    <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                  </button>
                  <span className="text-sm font-black text-white bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 dark:bg-gray-900">

                    {activeTab === "messages"
                      ? selectedMessages.length
                      : selectedProfiles.length}
                    <span className="opacity-80 font-semibold hidden sm:inline-block ml-2">
                      selezionati
                    </span>
                  </span>
                </div>
                {/* Tutti / Nessuno on Mobile Top Right */}
                <div className="flex md:hidden items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10 shadow-inner dark:bg-gray-900">

                  <button
                    onClick={selectCurrentPage}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 dark:bg-gray-900"
                  >

                    Pagina
                  </button>
                  <div className="w-px h-4 bg-white/20 mx-0.5 dark:bg-gray-900"></div>
                  <button
                    onClick={selectAllFiltered}
                    className="px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 dark:bg-gray-900"
                    title={`Seleziona tutti i ${selectableTotal} elementi che corrispondono ai filtri`}
                  >
                    Tutti ({selectableTotal})
                  </button>
                  <div className="w-px h-4 bg-white/20 mx-0.5 dark:bg-gray-900"></div>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 dark:bg-gray-900"
                  >

                    Nessuno
                  </button>
                </div>
              </div>
              {/* Bottom Row on mobile, Right side on Desktop */}
              <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">

                {/* Tutti / Nessuno on Desktop */}
                <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10 shadow-inner mr-2 dark:bg-gray-900">

                  <button
                    onClick={selectCurrentPage}
                    className="px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 dark:bg-gray-900"
                  >

                    Pagina
                  </button>
                  <div className="w-px h-4 bg-white/20 mx-0.5 dark:bg-gray-900"></div>
                  <button
                    onClick={selectAllFiltered}
                    className="px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 dark:bg-gray-900"
                    title={`Seleziona tutti i ${selectableTotal} elementi che corrispondono ai filtri`}
                  >
                    Tutti ({selectableTotal})
                  </button>
                  <div className="w-px h-4 bg-white/20 mx-0.5 dark:bg-gray-900"></div>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 dark:bg-gray-900"
                  >

                    Nessuno
                  </button>
                </div>
                {/* Action Buttons */}
                <div className="flex items-center justify-between w-full md:w-auto gap-2">

                  {activeTab === "messages" && (
                    <button
                      onClick={handleGroupDevices}
                      disabled={selectedMessages.length === 0}
                      className="flex-1 md:flex-none px-2 py-2.5 sm:px-4 sm:py-2 bg-indigo-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wide rounded-xl hover:bg-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-1.5 border border-indigo-400/50"
                    >

                      <Layers className="w-4 h-4 shrink-0" />
                      <span className="inline-block sm:hidden xl:inline-block">
                        Gruppo
                      </span>
                      <span className="hidden sm:inline-block xl:hidden">
                        Raggruppa
                      </span>
                    </button>
                  )}
                  {activeTab === "profiles" ? (
                    <button
                      onClick={() =>
                        setConfirmModalState({
                          isOpen: true,
                          messageId: null,
                          type: "delete-profile-bulk",
                        })
                      }
                      disabled={selectedProfiles.length === 0}
                      className="flex-1 md:flex-none px-2 py-2.5 sm:px-4 sm:py-2 bg-red-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wide rounded-xl hover:bg-red-400 focus:ring-4 focus:ring-red-500/20 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-1.5 border border-red-400/50"
                      title="Elimina Selezionati"
                    >

                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span className="inline-block">Elimina</span>
                    </button>
                  ) : (
                    <>

                      <button
                        onClick={handleBulkArchive}
                        disabled={selectedMessages.length === 0}
                        className="flex-1 md:flex-none px-2 py-2.5 sm:px-4 sm:py-2 bg-slate-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wide rounded-xl hover:bg-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all disabled:opacity-50 shadow-lg shadow-slate-500/20 active:scale-95 flex items-center justify-center gap-1.5 border border-slate-500/50"
                        title={
                          viewFilter === "new"
                            ? "Archivia Selezionati"
                            : "Sposta in Nuovi"
                        }
                      >

                        {viewFilter === "new" ? (
                          <Archive className="w-4 h-4 shrink-0" />
                        ) : (
                          <ArchiveRestore className="w-4 h-4 shrink-0" />
                        )}
                        <span className="inline-block">
                          {viewFilter === "new" ? "Archivia" : "Ripristina"}
                        </span>
                      </button>
                      <button
                        onClick={() =>
                          setConfirmModalState({
                            isOpen: true,
                            messageId: null,
                            type: "delete-bulk",
                          })
                        }
                        disabled={selectedMessages.length === 0}
                        className="flex-1 md:flex-none px-2 py-2.5 sm:px-4 sm:py-2 bg-red-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wide rounded-xl hover:bg-red-400 focus:ring-4 focus:ring-red-500/20 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-1.5 border border-red-400/50"
                        title="Elimina Selezionati"
                      >

                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span className="inline-block">Elimina</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>
        {activeTab === "analytics" && (
          <Suspense fallback={<TabLoading />}>
            <Analytics
              messages={analyticsMessages}
              profiles={analyticsProfiles}
              macroProfiles={analyticsMacroProfiles}
              visits={visits}
            />
          </Suspense>
        )}
        {activeTab === "story_template" && (
          <Suspense fallback={<TabLoading />}>
            <StoryTemplateConfig />
          </Suspense>
        )}
        {activeTab === "settings" && (
          <Suspense fallback={<TabLoading />}>
            <AppSettings isSuperAdmin={isSuperAdmin} />
          </Suspense>
        )}
        {activeTab === "carousel" && (
          <Suspense fallback={<TabLoading />}>
            <CarouselTemplateConfig
              validatedMessages={carouselValidatedMessages}
              onUnvalidateMessage={async (msgId) => {
                const docRef = doc(db, "messages", msgId);
                await updateDoc(docRef, { isValidatedForCarousel: false });
              }}
            />
          </Suspense>
        )}
        <div className={activeTab === "messages" ? "block" : "hidden"}>
          <>
            <MessagesToolbar
              viewFilter={viewFilter}
              onViewFilter={(v) => {
                setViewFilter(v);
                setSelectedMessages([]);
              }}
              unreadCount={unreadCount}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              onlyPostsFilter={onlyPostsFilter}
              onOnlyPosts={() => setOnlyPostsFilter((v) => !v)}
              zoneOptions={zoneOptions}
              selectedZoneFilter={selectedZoneFilter}
              onZone={setSelectedZoneFilter}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAllFilters}
              resultCount={filteredMessages.length}
              pageSize={pageSize}
              onPageSize={setPageSize}
              onStartSelect={() => {
                setIsSelectMode(true);
                setSelectedMessages([]);
              }}
              isSuperAdmin={isSuperAdmin}
              carouselCount={carouselValidatedMessages.length}
              onOpenCarousel={() => setActiveTab("carousel")}
              linkWidget={
                <LinkWidgetCard latestMessage={messages.find((m) => !m.isArchived)} />
              }
            />

            {historyTruncated && (
              <div className="mb-6 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">
                Sono caricati i {messages.length} messaggi più recenti: i
                conteggi e la ricerca riguardano solo questi. Restringi il
                periodo o usa i filtri per analizzare lo storico più vecchio.
              </div>
            )}
            {loading || !profilesLoaded ? (
              <div className="flex flex-col gap-4">
                {/* Scheletro con la forma delle schede vere: quando i dati
                    arrivano non si sposta nulla. La rotella non riservava
                    spazio, quindi la pagina saltava al primo caricamento.
                    L'animazione si ferma da sola con prefers-reduced-motion
                    (regola in index.css sulla classe .ac-skeleton). */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="ac-skeleton w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <div className="ac-skeleton h-3 w-28 rounded mb-2" />
                          <div className="ac-skeleton h-2.5 w-20 rounded" />
                        </div>
                      </div>
                      <div className="ac-skeleton h-4 rounded mb-2" />
                      <div className="ac-skeleton h-4 rounded mb-2 w-[85%]" />
                      <div className="ac-skeleton h-4 rounded mb-5 w-[60%]" />
                      <div className="flex gap-2">
                        <div className="ac-skeleton h-9 w-32 rounded-xl" />
                        <div className="ac-skeleton h-9 w-36 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
                <span className="sr-only" role="status">Caricamento dei messaggi in corso</span>
                {(isStuckLoading || snapshotsError) && (
                  <div className="text-center text-sm text-gray-500 px-4 max-w-sm mt-2 dark:text-gray-400">
                    {snapshotsError ? (
                      <span className="text-red-500">Errore di connessione a Firebase: {snapshotsError}</span>
                    ) : (
                      "Il caricamento dei dati sta impiegando piu del previsto. Controlla la connessione e ricarica la pagina."
                    )}
                  </div>
                )}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
                {/* L'errore veniva mostrato SOLO nel ramo di caricamento: con
                    loading già a false e lista vuota l'operatore leggeva
                    "Nessun messaggio" mentre in realtà la connessione era
                    fallita. */}
                {snapshotsError ? (
                  <>
                    <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Impossibile caricare i dati
                    </h3>
                    <p className="text-red-500 text-sm max-w-md mx-auto mt-2 px-4">
                      {snapshotsError}
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
                    >
                      Ricarica
                    </button>
                  </>
                ) : hasActiveFilters ? (
                  <>
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Nessun risultato per i filtri attivi
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Ci sono {messages.length} messaggi caricati, ma nessuno
                      corrisponde alla ricerca.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
                    >
                      Rimuovi i filtri
                    </button>
                  </>
                ) : (
                  <>
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ">
                      Nessun messaggio
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 ">
                      I messaggi in questa sezione appariranno qui.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="max-w-3xl divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">

                {paginatedMessages.map((msg) => {
                  const profileId = getDeviceProfile(msg);
                  const profileColor = getProfileColor(profileId);
                  const isSelected = selectedMessages.includes(msg.id);
                  const msgMacro = profileToMacroMap.get(profileId);
                  const displayName = (() => {
                    if (
                      msgMacro?.name &&
                      msgMacro.name !== "Sconosciuto" &&
                      msgMacro.name !== "Profilo" &&
                      msgMacro.name !== "Profilo Aggregato"
                    ) {
                      return msgMacro.name;
                    }
                    // Il prefisso "AUTO-" apparteneva a uno schema di id
                    // precedente e non viene più generato: il test era sempre
                    // falso, così OGNI profilo automatico senza nome veniva
                    // etichettato "Profilo manuale", l'esatto contrario del vero.
                    if (profiles[profileId]?.name) return profiles[profileId]!.name;
                    if (msg.profileGroupId) return "Gruppo manuale";
                    return getProfileIdConfidence(profileId) === "legacy"
                      ? "Non identificato (storico)"
                      : "Non identificato";
                  })();
                  return (
                    <MessageRow
                      key={msg.id}
                      msg={msg}
                      isSelected={isSelected}
                      isSelectMode={isSelectMode}
                      isSuperAdmin={isSuperAdmin}
                      displayName={displayName}
                      profileId={profileId}
                      profileColor={profileColor}
                      msgMacro={msgMacro}
                      profiles={profiles}
                      macroProfiles={macroProfiles}
                      editingMessageId={editingMessageId}
                      locationInputCity={locationInputCity}
                      locationInputArea={locationInputArea}
                      resolutionInput={resolutionInput}
                      toggleSelection={toggleSelection}
                      setViewingMacroId={setViewingMacroId}
                      setEditingProfileId={setEditingProfileId}
                      setEditingMessageId={setEditingMessageId}
                      setLocationInputCity={setLocationInputCity}
                      setLocationInputArea={setLocationInputArea}
                      setResolutionInput={setResolutionInput}
                      saveMessageLocation={saveMessageLocation}
                      saveMessageResolution={saveMessageResolution}
                      handleUngroupDevice={handleUngroupDevice}
                      handleDeleteMessage={handleDeleteMessage}
                      toggleArchiveStatus={toggleArchiveStatus}
                      setExportingMessage={setExportingMessage}
                      toggleCarousel={(m) =>
                        updateDoc(doc(db, "messages", m.id), {
                          isValidatedForCarousel: !m.isValidatedForCarousel,
                        })
                      }
                      getProfileInstagrams={getProfileInstagrams}
                      parseAdvancedInfo={parseAdvancedInfo}
                      getProfileInitials={getProfileInitials}
                    />
                  );
                })}
              </div>
            )}
          </>
        </div>
        <div className={`flex flex-col gap-6 w-full max-w-7xl mx-auto ${activeTab === "profiles" ? "flex" : "hidden"}`}>

            {loading || !profilesLoaded ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
                {(isStuckLoading || snapshotsError) && (
                  <div className="text-center text-sm text-gray-500 px-4 max-w-sm mt-2 dark:text-gray-400">
                    {snapshotsError ? (
                      <span className="text-red-500">Errore di connessione: {snapshotsError}</span>
                    ) : (
                      "Il caricamento dei dati sta impiegando piu del previsto. Controlla la connessione e ricarica la pagina."
                    )}
                  </div>
                )}
              </div>
            ) : macroProfiles.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
                {snapshotsError ? (
                  <>
                    <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Impossibile caricare i profili
                    </h3>
                    <p className="text-red-500 text-sm max-w-md mx-auto mt-2 px-4">
                      {snapshotsError}
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
                    >
                      Ricarica
                    </button>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ">
                      Nessun profilo identificato
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 ">
                      I profili analizzati dal tracker appariranno qui.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max items-start">

                {paginatedProfiles.map((macro) => {
                  const profileColor = getProfileColor(macro.profileIds[0]);
                  const isProfileSelected = selectedProfiles.includes(macro.id);
                  return (
                    <div
                      key={macro.id}
                      className={`bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl border shadow-sm relative overflow-hidden flex flex-col group transition-colors duration-300 ${isProfileSelected ? "border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20" : isProfileSelectMode ? "border-gray-200 dark:border-gray-600 hover:border-indigo-400 cursor-pointer" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md"}`}
                      onClick={() => {
                        if (isProfileSelectMode) {
                          setSelectedProfiles((prev) =>
                            prev.includes(macro.id)
                              ? prev.filter((x) => x !== macro.id)
                              : [...prev, macro.id],
                          );
                        } else {
                          setViewingMacroId(macro.id);
                        }
                      }}
                    >


                      {/* Selection Mode Checkbox Overlay */}
                      {isProfileSelectMode && (
                        <div
                          className={`absolute top-3 left-3 z-30 transition-all duration-300 ${isProfileSelected ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-50"}`}
                        >

                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isProfileSelected ? "bg-indigo-500 border-indigo-500 text-white shadow-md" : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 backdrop-blur-sm"}`}
                          >

                            {isProfileSelected && (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-3 mb-4 pr-16 relative z-20 transition-transform duration-300 ${isProfileSelectMode ? "translate-x-8" : "translate-x-0"}`}
                      >

                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-inner font-bold text-sm"
                          style={{ backgroundColor: profileColor }}
                          aria-hidden="true"
                        >
                          {getProfileInitials(macro.name) ?? (
                            <UserIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">

                          <h3
                            className="font-bold text-gray-900 dark:text-gray-100 text-lg sm:text-xl break-words whitespace-pre-wrap relative z-20"
                            title={macro.name}
                          >

                            {macro.name}
                          </h3>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">

                            {macro.msgCount}{" "}
                            {macro.msgCount === 1
                              ? "Spotted Creato"
                              : "Spotted Creati"}
                          </div>
                          {/* Un profilo ricostruito da un seed hardware (dati
                              storici, prima dei token) può aggregare persone
                              diverse con lo stesso modello di telefono: va
                              detto, non presentato come identità certa. */}
                          {macro.isLegacyIdentity && (
                            <div
                              className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wide"
                              title="Identità dedotta da dati storici senza token: potrebbe raggruppare persone diverse con lo stesso modello di dispositivo."
                            >
                              <ShieldAlert className="w-3 h-3" /> Identità incerta
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Suggerimenti di unione: segnali deboli (hardware, IP,
                          install id) che NON uniscono da soli, proposti
                          all'operatore invece di essere applicati in silenzio. */}
                      {macro.suggestions.length > 0 && (
                        <div
                          className="mb-4 space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {macro.suggestions.slice(0, 3).map((sug) => {
                            const other = macroProfiles.find((x) => x.id === sug.macroId);
                            if (!other) return null;
                            return (
                              <div
                                key={sug.macroId}
                                className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-900/25 border border-indigo-200 dark:border-indigo-800"
                              >
                                <div className="text-[12.5px] text-gray-800 dark:text-gray-200 leading-snug">
                                  Potrebbe essere la stessa persona di{" "}
                                  <strong className="font-bold">{other.name}</strong>
                                  <span className="ml-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md align-middle">
                                    {Math.round(sug.confidence * 100)}%
                                  </span>
                                </div>
                                <div
                                  className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5"
                                  title={sug.reasons.join(" · ")}
                                >
                                  {sug.reasons.slice(0, 2).join(" · ")}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                  <button
                                    onClick={() => handleAcceptSuggestion(macro.id, sug.macroId)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold transition-colors"
                                  >
                                    Unisci
                                  </button>
                                  <button
                                    onClick={() => setViewingMacroId(sug.macroId)}
                                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[12px] font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-300"
                                  >
                                    Confronta
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDismissSuggestion(macro.id, sug.dismissKey, other.name)
                                    }
                                    className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800"
                                  >
                                    Non è lei
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mb-4">

                        <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 ">

                          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Ultima Attività
                          </div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 ">

                            {macro.mostRecentMsg &&
                            macro.mostRecentMsg.createdAt
                              ? format(
                                  macro.mostRecentMsg.createdAt.toDate(),
                                  "d MMM HH:mm",
                                  { locale: it },
                                )
                              : "N/A"}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 ">

                          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Tempo Speso
                          </div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 ">

                            {macro.totalTime > 0
                              ? macro.totalTime > 60
                                ? `${Math.floor(macro.totalTime / 60)}m ${macro.totalTime % 60}s`
                                : `${macro.totalTime}s`
                              : "N/A"}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 col-span-2">

                          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Ultimo Indirizzo IP
                          </div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all font-mono">

                            {macro.lastIp}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex-1 flex flex-col justify-between">

                        {/* Possible aliases */}
                        <div>

                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> Possibili Alias
                          </div>
                          <div className="flex flex-wrap gap-1.5">

                            {macro.possibleAliases.length > 0 ? (
                              macro.possibleAliases.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[10px] font-semibold"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                                Nessuno
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Instagrams */}
                        <div>

                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Instagram className="w-3.5 h-3.5" /> Instagram
                            Associati
                          </div>
                          <div className="flex flex-wrap gap-1.5">

                            {macro.instagrams.length > 0 ? (
                              macro.instagrams.map((i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800 rounded-md text-[10px] font-semibold"
                                >
                                  @{i}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                                Nessuno
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Sotto-profili se ci sono, + pulsanti scollega (collapsible for mobile) */}
                        <div
                          className="mt-2 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >

                          <details className="group">

                            <summary className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer list-none flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                              <span>
                                Profili Dispositivo/Manuali (
                                {macro.profileIds.length})
                              </span>
                              <div className="flex items-center gap-2">

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleToggleMacroIgnoreAnalytics(macro.id);
                                  }}
                                  className={`${macro.profileIds.some((pid: string) => profiles[pid]?.ignoredFromAnalytics) ? "bg-orange-600 text-white" : "bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"} hover:opacity-80 text-[10px] flex items-center gap-1 px-2 py-1 rounded-md transition-colors`}
                                  title="Escludi o Includi questo intero mega-profilo dalle statistiche"
                                >
                                  {macro.profileIds.some((pid: string) => profiles[pid]?.ignoredFromAnalytics) ? "Ignorato (Stats)" : "Ignora (Stats)"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowMergeModal({
                                      isOpen: true,
                                      sourceMacroId: macro.id,
                                    });
                                  }}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-[10px] flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-md"
                                >
                                  Accorpa
                                </button>
                                <svg
                                  className="w-4 h-4 text-gray-400 dark:text-gray-500 group-open:rotate-180 transition-transform"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </summary>
                            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1 hide-scrollbar">

                              {macro.profileIds.map((pid: string) => {
                                const isIso =
                                  profiles[pid]?.excludeFromAutoGrouping;
                                const profileMsgs = messages.filter(
                                  (m) =>
                                    getDeviceProfile(m) === pid &&
                                    m.lookingFor &&
                                    !m.isArchived,
                                );
                                return (
                                  <details
                                    key={pid}
                                    className="group/sub bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >

                                    <summary className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer list-none outline-none">

                                      <div className="break-words whitespace-pre-wrap flex-1 flex flex-col min-w-0 flex-row items-center gap-2">

                                        <svg
                                          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-open/sub:rotate-90 transition-transform shrink-0"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                          />
                                        </svg>
                                        <div className="flex flex-col min-w-0">

                                          <span className="font-semibold text-gray-800 dark:text-gray-200 text-xs break-words whitespace-pre-wrap">
                                            {profiles[pid]?.name ||
                                              "Profilo senza nome"}
                                          </span>
                                          <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 break-words whitespace-pre-wrap">
                                            {pid.slice(0, 12)}...
                                          </span>
                                        </div>
                                      </div>
                                        <div className="flex flex-wrap items-center gap-1 shrink-0 justify-end max-w-[200px]">

                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setEditingProfileId(pid);
                                            }}
                                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 font-bold px-2 py-1 rounded text-[10px] transition-colors"
                                            title="Modifica Identità Dati..."
                                          >
                                            Modifica
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleToggleIgnoreAnalytics(pid, profiles[pid]?.ignoredFromAnalytics);
                                            }}
                                            className={`${profiles[pid]?.ignoredFromAnalytics ? "bg-orange-600 text-white" : "bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400"} font-bold px-2 py-1 rounded text-[10px] transition-colors`}
                                            title="Escludi o Includi questo profilo dalle statistiche"
                                          >
                                            {profiles[pid]?.ignoredFromAnalytics ? "Ignorato (Stats)" : "Ignora (Stats)"}
                                          </button>
                                          {macro.profileIds.length > 1 ? (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleScollega(pid);
                                            }}
                                            className="bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold px-2 py-1 rounded text-[10px] transition-colors"
                                            title="Scollega da questo mega-profilo"
                                          >
                                            Scollega
                                          </button>
                                        ) : isIso ||
                                          profiles[pid]
                                            ?.linkedToProfileId ? (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleRiabilitaAutoGroup(pid);
                                            }}
                                            className="bg-green-50 dark:bg-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/60 text-green-600 dark:text-green-400 font-bold px-2 py-1 rounded text-[10px] transition-colors"
                                            title="Riabilita Auto-Join"
                                          >
                                            Reset Join
                                          </button>
                                        ) : null}
                                      </div>
                                    </summary>
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 -mx-2 -mb-2 px-2 pb-2">

                                      <div className="flex overflow-x-auto gap-2 pb-1 pt-1 hide-scrollbar snap-x">

                                        {profileMsgs.length > 0 ? (
                                          profileMsgs.map((msg) => (
                                            <div
                                              key={msg.id}
                                              className="w-[14rem] sm:w-[16rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md p-2.5 shadow-sm shrink-0 snap-start flex flex-col justify-between"
                                            >

                                              <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-2 break-words">
                                                "{msg.lookingFor}"
                                              </div>
                                              <div className="text-[9px] text-gray-500 dark:text-gray-400 space-y-0.5">

                                                {msg.when && (
                                                  <div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 ">
                                                      Quando:
                                                    </span>
                                                    <span className="break-words whitespace-pre-wrap block">
                                                      {msg.when}
                                                    </span>
                                                  </div>
                                                )}
                                                {msg.where && (
                                                  <div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 ">
                                                      Dove:
                                                    </span>
                                                    <span className="break-words whitespace-pre-wrap block">
                                                      {msg.where}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-[10px] text-gray-400 dark:text-gray-500 italic py-2">
                                            Nessuno spotted attivo.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </details>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        {/* Global Pagination */}
        {!loading &&
          (activeTab === "messages" || activeTab === "profiles") &&
          (activeTab === "messages"
            ? filteredMessages.length > 0
            : macroProfiles.length > 0) && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 py-8">

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 sm:px-4 sm:py-2 w-full sm:w-auto text-xs sm:text-sm ${currentPage === 1 ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 " : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 "} border border-gray-200 dark:border-gray-600 font-semibold rounded-xl shadow-sm transition-all text-center`}
              >

                Pagina Precedente
              </button>
              <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 order-first sm:order-none">

                Pagina {currentPage} di{" "}
                {activeTab === "messages" ? totalPagesMsg : totalPagesProf}
              </span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={
                  activeTab === "messages"
                    ? currentPage >= totalPagesMsg
                    : currentPage >= totalPagesProf
                }
                className={`px-4 py-2 sm:px-4 sm:py-2 w-full sm:w-auto text-xs sm:text-sm ${(activeTab === "messages" ? currentPage >= totalPagesMsg : currentPage >= totalPagesProf) ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 " : "bg-indigo-600 hover:bg-indigo-700 text-white"} border border-transparent font-semibold rounded-xl shadow-sm transition-all text-center`}
              >

                Prossima Pagina
              </button>
            </div>
          )}
      </div>
      {confirmModalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative text-center"
          >

            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100 mb-2">
              Conferma Operazione
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">

              {confirmModalState.type === "delete"
                ? "Sei sicuro di voler eliminare questo messaggio? L'azione è irreversibile."
                : confirmModalState.type === "delete-bulk"
                  ? `Sei sicuro di voler eliminare i ${selectedMessages.length} messaggi selezionati? L'azione è irreversibile.`
                  : confirmModalState.type === "delete-profile-bulk"
                    ? `Sei sicuro di voler eliminare i ${selectedProfiles.length} profili selezionati? L'azione è irreversibile e disconnetterà i messaggi collegati.`
                    : "Vuoi rimuovere questo messaggio dal suo gruppo manuale? Verrà nuovamente tracciato separatamente."}
            </p>
            <div className="flex gap-3">

              <button
                onClick={() =>
                  setConfirmModalState({
                    isOpen: false,
                    messageId: null,
                    type: null,
                  })
                }
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors"
              >

                Annulla
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors text-white shadow-lg ${confirmModalState.type === "delete" || confirmModalState.type === "delete-bulk" || confirmModalState.type === "delete-profile-bulk" ? "bg-red-600 hover:bg-red-500 shadow-red-500/30" : "bg-orange-500 hover:bg-orange-400 shadow-orange-500/30"}`}
              >

                Conferma
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showGroupPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative"
          >

            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100 mb-2">
              Salva Gruppo
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Inserisci un identificativo per questo gruppo (lascia vuoto per
              casuale):
            </p>
            <input
              autoFocus
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Es. SconosciutaTreno"
              className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-600 outline-none p-3 rounded-xl focus:border-indigo-500 transition-colors font-bold text-gray-900 dark:text-gray-100 mb-6"
            />
            <div className="flex gap-3">

              <button
                onClick={() => setShowGroupPrompt(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors"
              >

                Annulla
              </button>
              <button
                onClick={confirmGroupDevices}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30"
              >

                Conferma
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showMergeModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[80vh] flex flex-col"
          >

            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100 mb-2">
              Accorpa Profili
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
              Seleziona i profili che vuoi accorpare (questo diventerà il gruppo
              principale):
            </p>
            <div className="mb-4">

              <input
                type="text"
                placeholder="Cerca per nome profilo..."
                value={mergeSearchQuery}
                onChange={(e) => setMergeSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 outline-none p-3 rounded-xl focus:border-indigo-500 transition-colors font-semibold text-gray-900 dark:text-gray-100 "
              />
            </div>
            <div className="flex-1 overflow-y-auto mb-6 space-y-2 pr-1 hide-scrollbar">

              {(() => {
                const filtered = macroProfiles
                  .filter((m) => m.id !== showMergeModal.sourceMacroId)
                  .filter((m) => {
                    if (!mergeSearchQuery.trim()) return true;
                    const query = mergeSearchQuery.toLowerCase();
                    return (
                      (m.name && m.name.toLowerCase().includes(query)) ||
                      m.id.toLowerCase().includes(query)
                    );
                  });
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 font-medium">
                      Nessun profilo trovato.
                    </div>
                  );
                }
                const maxResults = 50;
                const truncated = filtered.slice(0, maxResults);
                const hasMore = filtered.length > maxResults;
                return (
                  <>

                    <div className="flex items-center gap-2 mb-3">

                      <button
                        onClick={() =>
                          setMergeSelectedProfiles(filtered.map((x) => x.id))
                        }
                        className="text-[10px] font-bold uppercase hover:bg-gray-200 dark:hover:bg-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all"
                      >

                        Seleziona Tutti
                      </button>
                      <button
                        onClick={() => setMergeSelectedProfiles([])}
                        className="text-[10px] font-bold uppercase hover:bg-gray-200 dark:hover:bg-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all"
                      >

                        Deseleziona
                      </button>
                    </div>
                    {truncated.map((macro) => {
                      const isSelected = mergeSelectedProfiles.includes(
                        macro.id,
                      );
                      return (
                        <button
                          key={macro.id}
                          onClick={() => {
                            setMergeSelectedProfiles((prev) =>
                              prev.includes(macro.id)
                                ? prev.filter((x) => x !== macro.id)
                                : [...prev, macro.id],
                            );
                          }}
                          className={`w-full text-left p-4 rounded-2xl transition-all group flex items-center gap-3 shadow-sm border ${isSelected ? "bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 ring-2 ring-indigo-500/20" : "bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border-gray-200 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-800 "}`}
                        >

                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-indigo-500 border-indigo-500 text-white" : "border-gray-400 bg-white dark:bg-gray-800 group-hover:border-indigo-400"}`}
                          >

                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-inner font-bold"
                            style={{
                              backgroundColor: getProfileColor(
                                macro.profileIds[0],
                              ),
                            }}
                          >

                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">

                            <h4 className="font-bold text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap">
                              {macro.name}
                            </h4>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 break-words whitespace-pre-wrap font-semibold uppercase tracking-wider mt-0.5">

                              {macro.profileIds.length} dispositivi
                              <span className="mx-1 opacity-50">•</span>
                              {macro.msgCount} msg
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {hasMore && (
                      <div className="text-center py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2 border-t py-4">

                        + {filtered.length - maxResults} altri profili... usa la
                        ricerca
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700 gap-3">

              <button
                onClick={() => {
                  setShowMergeModal({ isOpen: false, sourceMacroId: null });
                  setMergeSearchQuery("");
                  setMergeSelectedProfiles([]);
                }}
                className="px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors"
              >

                Annulla
              </button>
              <button
                onClick={confirmMergeMacro}
                disabled={mergeSelectedProfiles.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-sm py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >

                Conferma ({mergeSelectedProfiles.length})
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {editingProfileId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1100]">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
          >

            <h3 className="text-xl font-bold mb-1">
              Gestione Profilo Singolo
            </h3>
            <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-6 bg-gray-100 dark:bg-gray-700 p-2 rounded inline-block">
              {editingProfileId}
            </div>
            <div className="space-y-4">

              <div>

                <label className="block text-sm font-semibold mb-1">
                  Nome Identificativo
                </label>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="Es. Il ragazzo coi capelli ricci"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>

                <label className="block text-sm font-semibold mb-1">
                  Possibili Alias (Separati da virgola)
                </label>
                <input
                  type="text"
                  value={profilePossibleAliasesInput}
                  onChange={(e) => setProfilePossibleAliasesInput(e.target.value)}
                  placeholder="Es. Mario Rossi, Luigi Bianchi"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>

                <label className="block text-sm font-semibold mb-1">
                  Tag Instagram Custom (Separati da virgola)
                </label>
                <input
                  type="text"
                  value={profileCustomInstagramsInput}
                  onChange={(e) =>
                    setProfileCustomInstagramsInput(e.target.value)
                  }
                  placeholder="Es. mario.rossi, luigi99"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="pt-4 flex gap-3 flex-col-reverse sm:flex-row">

                <button
                  onClick={() => setEditingProfileId(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
      {viewingMacroId && viewingMacro && viewingMacroStats && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex justify-end z-[1000]">

          <motion.div
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-gray-800 w-full max-w-3xl h-full shadow-2xl relative flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700"
          >

            <div className="p-4 sm:p-5 md:px-6 md:py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">

              <div className="flex items-center gap-3 sm:gap-4">

                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-inner font-bold text-base sm:text-lg"
                  style={{
                    backgroundColor: getProfileColor(
                      viewingMacro.profileIds[0],
                    ),
                  }}
                >

                  <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>

                  <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100 leading-tight">

                    {viewingMacro.name}
                  </h2>
                  <div className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">

                    {viewingMacro.profileIds.length}{" "}
                    {viewingMacro.profileIds.length === 1
                      ? "Dispositivo"
                      : "Dispositivi"}
                    • {viewingMacroStats.messages.length} msg
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingMacroId(null)}
                className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/60 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                title="Chiudi"
                aria-label="Chiudi finestra"
              >

                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

              {/* Sidebar/Top Navbar for Modal */}
              <div className="md:w-56 lg:w-64 shrink-0 bg-gray-50 dark:bg-gray-800/50 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 p-3 md:p-4 flex flex-row md:flex-col gap-1.5 md:gap-2 overflow-x-auto md:overflow-y-auto hide-scrollbar">

                <button
                  onClick={() => setMacroModalTab("timeline")}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap md:whitespace-normal ${macroModalTab === "timeline" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                >

                  <Activity className="w-4 h-4 shrink-0" /> Timeline
                </button>
                <button
                  onClick={() => setMacroModalTab("identita")}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap md:whitespace-normal ${macroModalTab === "identita" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                >

                  <UserIcon className="w-4 h-4 shrink-0" /> Identità (
                  {viewingMacro.profileIds.length})
                </button>
                <button
                  onClick={() => setMacroModalTab("dettagli")}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap md:whitespace-normal ${macroModalTab === "dettagli" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                >

                  <Cpu className="w-4 h-4 shrink-0" /> Info Tecniche
                </button>
                <button
                  onClick={() => setMacroModalTab("log")}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap md:whitespace-normal ${macroModalTab === "log" ? "bg-orange-600 text-white shadow-md" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                >

                  <FileText className="w-4 h-4 shrink-0" /> Log Raggruppamento
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 md:p-6 relative">

                {macroModalTab === "timeline" && (
                  <div className="max-w-3xl mx-auto flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4">

                      <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">

                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400 " />
                        Timeline Accessi & Messaggi
                      </h4>
                      <div className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm self-start sm:self-auto uppercase tracking-wide">

                        {viewingMacroStats.messages.length} Eventi
                      </div>
                    </div>
                    <div className="space-y-4">

                      {viewingMacroStats.messages.length === 0 ? (
                        <div className="text-center py-10 font-medium text-gray-400 dark:text-gray-500 ">
                          Nessun evento registrato
                        </div>
                      ) : (
                        viewingMacroStats.messages.map((msg, idx) => {
                          const parsedUA = msg.deviceInfo?.userAgent ? parseUserAgent(msg.deviceInfo.userAgent) : null;
                          const hasMessage = !!msg.lookingFor;
                          const adv = msg.parsedAdvanced || null;
                          const ip = adv ? adv.network?.ip || adv.n?.ip : null;
                          const fp = adv
                            ? adv.software?.canvasSample ||
                              adv.s?.canvasSample ||
                              adv.s?.c
                            : null;
                          return (
                            <div key={msg.id} className="relative pl-6 pb-2">

                              {/* Timeline line */}
                              {idx !==
                                viewingMacroStats.messages.length - 1 && (
                                <div className="absolute left-2.5 top-8 bottom-[-16px] w-[2px] bg-slate-200 dark:bg-slate-700 rounded"></div>
                              )}
                              {/* Timeline dot */}
                              <div
                                className={`absolute left-[7px] sm:left-[5px] top-[14px] w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white shadow-sm ${hasMessage ? "bg-indigo-500" : "bg-slate-400"}`}
                              ></div>
                              <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm transition-all hover:shadow-md">

                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">

                                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700 flex items-center gap-1">

                                    <Clock className="w-3 h-3" />
                                    {msg.createdAt
                                      ? format(
                                          msg.createdAt.toDate(),
                                          "dd/MM/yyyy HH:mm",
                                        )
                                      : "Data sconosciuta"}
                                  </div>
                                  {parsedUA && (
                                    <>
                                      <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 border ${parsedUA.browser === 'Instagram In-App' ? 'text-pink-600 bg-pink-50 dark:bg-pink-900/40 border-pink-100 dark:border-pink-800' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/40 border-blue-100 dark:border-blue-800'}`}>
                                        {parsedUA.browser === 'Instagram In-App' ? <Instagram className="w-3 h-3" /> : <Monitor className="w-3 h-3" />} {parsedUA.browser} {parsedUA.instagram?.version ? `v${parsedUA.instagram.version}` : ''}
                                      </div>
                                      <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600">
                                        OS: {parsedUA.os}
                                      </div>
                                      <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600">
                                        Device: {parsedUA.device}
                                      </div>
                                      {parsedUA.instagram?.build && (
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                                          Build: {parsedUA.instagram.build}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {msg.deviceInfo?.location && (
                                    <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-1 rounded-md flex items-center gap-1 border border-emerald-100 dark:border-emerald-800 ">

                                      <MapPin className="w-3 h-3" />
                                      {msg.deviceInfo.location.city ||
                                        "Città ignota"}
                                      ,{" "}
                                      {msg.deviceInfo.location.country ||
                                        "Nazione ignota"}
                                    </div>
                                  )}
                                </div>
                                {hasMessage ? (
                                  <div className="bg-indigo-50 dark:bg-indigo-900/40 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-indigo-100 dark:border-indigo-800 ">

                                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 border-l-2 border-indigo-400 pl-2 sm:pl-3 break-words leading-relaxed mb-2 sm:mb-3">

                                      "{msg.lookingFor}"
                                    </div>
                                    {(msg.city || msg.area || msg.where || msg.when) && (
                                      <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-gray-700 dark:text-gray-300 mt-2 pl-2 sm:pl-3">

                                        {msg.city && (
                                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-1">
                                            <Globe className="w-3 h-3 text-blue-500" />
                                            <span className="font-bold">
                                              Città:
                                            </span>
                                            {msg.city}
                                          </span>
                                        )}
                                        {msg.area && (
                                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-indigo-500" />
                                            <span className="font-bold">
                                              Zona:
                                            </span>
                                            {msg.area}
                                          </span>
                                        )}
                                        {msg.where && (
                                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-emerald-500" />
                                            <span className="font-bold">
                                              Dove:
                                            </span>
                                            {msg.where}
                                          </span>
                                        )}
                                        {msg.when && (
                                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-orange-500" />
                                            <span className="font-bold">
                                              Quando:
                                            </span>
                                            {msg.when}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {msg.resolution ? (
                                      <div className="text-[11px] text-sky-800 dark:text-sky-200 bg-sky-100 dark:bg-sky-900/60 px-3 py-2.5 rounded-lg border border-sky-200 dark:border-sky-800 mt-3 font-medium whitespace-pre-wrap flex items-start gap-2 shadow-inner">

                                        <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                        <div>

                                          <span className="font-bold uppercase tracking-wider text-[9px] block mb-1 text-sky-600">
                                            Risoluzione Inserita
                                          </span>
                                          {msg.resolution}
                                        </div>
                                      </div>
                                    ) : msg.instagram ? (
                                      <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/40 px-3 py-2.5 rounded-lg border border-purple-200 dark:border-purple-800 mt-3 font-medium flex items-start gap-2 shadow-inner">

                                        <Instagram className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                        <div>

                                          <span className="font-bold uppercase tracking-wider text-[9px] block mb-1 text-purple-600 dark:text-purple-400">
                                            Tag Instagram Originale
                                          </span>
                                          @{msg.instagram}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="text-sm italic text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

                                    Nessun messaggio inviato (Solo
                                    visita/Tracciamento)
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                {macroModalTab === "log" && (
                  <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" /> Report di Analisi Gruppo
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Analisi sulle metriche hardware ed edges del grafo che ha determinato il raggruppamento di questi dispositivi come singola persona.
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleCopyMacroLog(viewingMacro)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Copy className="w-4 h-4" /> Copia
                        </button>
                        <button
                          onClick={() => handleDownloadMacroLog(viewingMacro)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white border border-transparent rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Download className="w-4 h-4" /> Scarica
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">
                        <h5 className="font-bold text-sm uppercase tracking-wide mb-4 text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Regole di Match Attivate</h5>
                        {Object.entries(viewingMacro.linkReasons || {}).map(([edgeKey, reasons]) => {
                          const [pid1, pid2] = edgeKey.split("|");
                          const prof1 = profiles[pid1]?.name || pid1;
                          const prof2 = profiles[pid2]?.name || pid2;
                          return (
                            <div key={edgeKey} className="mb-4 last:mb-0 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                              <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Relazione Rilevata: <span className="text-indigo-600 dark:text-indigo-400">{prof1}</span> <span className="mx-1 text-gray-400">↔</span> <span className="text-indigo-600 dark:text-indigo-400">{prof2}</span></div>
                              <ul className="space-y-1.5 ml-1">
                                {(reasons as string[]).map((r: string, i: number) => (
                                  <li key={i} className="text-xs flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{r}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                        {Object.keys(viewingMacro.linkReasons || {}).length === 0 && (
                          <div className="text-xs text-gray-500 italic">Nessun match esplicito salvato (profilo singolo o generato in fallback)</div>
                        )}
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">
                        <h5 className="font-bold text-sm uppercase tracking-wide mb-4 text-indigo-600 flex items-center gap-2"><DeviceIcon className="w-4 h-4"/> Dati Hardware Grezzi per Dispositivo</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingMacro.profileIds.map((pid: string) => {
                            const fp = (viewingMacro.compFootprints as any)?.[pid];
                            const pname = profiles[pid]?.name || pid;
                            return (
                              <div key={pid} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2 truncate">{pname}</div>
                                {fp ? (
                                  <div className="space-y-2 text-[10px] font-mono text-gray-600 dark:text-gray-400">
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">clientMark:</span>
                                      <span className="break-all">{fp.clientMark || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">Canvas:</span>
                                      <span className="break-all">{fp.canvas || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">Audio:</span>
                                      <span className="break-all">{fp.audio || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">GPU:</span>
                                      <span className="break-all">{fp.gpu || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">Screen:</span>
                                      <span className="break-all">{fp.screen || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">Cores:</span>
                                      <span className="break-all">{fp.cores || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">Rects:</span>
                                      <span className="break-all">{fp.rects || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">Math:</span>
                                      <span className="break-all">{fp.math || "-"}</span>
                                    </div>
                                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-600">
                                      <span className="w-20 font-bold shrink-0">UserAgent:</span>
                                      <span className="break-all">{fp.userAgent || "-"}</span>
                                    </div>
                                    <div className="mt-2 text-indigo-500 font-bold p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded inline-block w-full break-all">
                                      SEED: {fp.seed}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-gray-500 italic">Impronta non calcolata / vecchi dati.</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {macroModalTab === "identita" && (
                  <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4">

                      <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">

                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Identità
                        Separate
                      </h4>
                      <div className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-100 dark:border-blue-800 tracking-wider text-center">

                        Formato da {viewingMacro.profileIds.length}{" "}
                        dispositivi
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">

                      {viewingMacro.profileIds.map((pid: string) => {
                        const profileMsgs = viewingMacroStats.messages.filter(
                          (m) => getDeviceProfile(m) === pid && m.lookingFor,
                        );
                        return (
                          <div
                            key={pid}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-300 group"
                          >

                            <div className="p-4 sm:p-5 flex flex-col">

                              <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">

                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">

                                  <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-inner"
                                    style={{
                                      backgroundColor: getProfileColor(pid),
                                    }}
                                  >

                                    <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div className="flex flex-col min-w-0">

                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base break-words whitespace-pre-wrap">
                                      {profiles[pid]?.name ||
                                        "Profilo senza nome"}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 break-words whitespace-pre-wrap mt-0.5 bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700 self-start">
                                      {pid}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingProfileId(pid);
                                    setViewingMacroId(null);
                                  }}
                                  className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs transition-colors shadow-sm hidden sm:block shrink-0"
                                >

                                  Modifica Profilo Singolo
                                </button>
                              </div>
                              <div className="w-full">

                                {profileMsgs.length > 0 ? (
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 ">

                                    <h5 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 sm:mb-2.5 px-1">
                                      {profileMsgs.length} Spotted inviati
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">

                                      {profileMsgs.map((msg) => (
                                        <div
                                          key={msg.id}
                                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm"
                                        >

                                          <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2 break-words leading-snug">
                                            "{msg.lookingFor}"
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 dark:text-gray-500 ">

                                            <Clock className="w-3 h-3" />
                                            {msg.createdAt
                                              ? format(
                                                  msg.createdAt.toDate(),
                                                  "dd/MM",
                                                )
                                              : "N/A"}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 border-dashed flex flex-col items-center justify-center text-center">

                                    <Activity className="w-6 h-6 text-gray-300 mb-2" />
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                      Nessuno Spotted Inviato
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 sm:hidden">

                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingProfileId(pid);
                                  setViewingMacroId(null);
                                }}
                                className="w-full bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                              >

                                Modifica Identità
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {macroModalTab === "dettagli" && (
                  <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4">

                      <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">

                        <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                        Informazioni di Rete e Dispositivo
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">

                      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-3 sm:gap-4">

                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800 ">

                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 " />
                        </div>
                        <div>

                          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-widest mb-0.5 sm:mb-1">
                            Primo Avvistamento
                          </div>
                          <div className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-300">
                            {viewingMacroStats.oldest
                              ? format(
                                  viewingMacroStats.oldest,
                                  "dd/MM/yyyy HH:mm",
                                )
                              : "-"}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-3 sm:gap-4">

                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800 ">

                          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 " />
                        </div>
                        <div>

                          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-widest mb-1">
                            Ultimo Avvistamento
                          </div>
                          <div className="text-sm font-black text-indigo-900 dark:text-indigo-300">
                            {viewingMacroStats.newest
                              ? format(
                                  viewingMacroStats.newest,
                                  "dd/MM/yyyy HH:mm",
                                )
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 sm:space-y-6">

                      <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">

                        <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3 sm:mb-4 flex items-center gap-2">
                          <DeviceIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Segnali
                          Hardware e Dispositivi (
                          {viewingMacroStats.hardwareSignals.length})
                        </h4>
                        {viewingMacroStats.hardwareSignals.length > 0 ? (
                          <div className="flex flex-col gap-3">

                            {viewingMacroStats.hardwareSignals.map(
                              (fp) => {
                                let parsed = null;
                                if (fp.startsWith("Browser/Device: ")) {
                                  const raw = fp.replace("Browser/Device: ", "");
                                  parsed = parseUserAgent(raw);
                                  return (
                                    <div key={fp} className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
                                      {parsed ? (
                                        <>
                                          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                            <div className="px-2 py-1 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                              {parsed.browser} {parsed.instagram?.version ? `v${parsed.instagram.version}` : ''}
                                            </div>
                                            <div className="px-2 py-1 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                              OS: {parsed.os}
                                            </div>
                                            <div className="px-2 py-1 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                              Device: {parsed.device}
                                            </div>
                                            {parsed.instagram?.build && (
                                              <div className="px-2 py-1 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                                Build: {parsed.instagram.build}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-[10px] font-mono text-emerald-800 dark:text-emerald-200 bg-white dark:bg-gray-800/50 p-2 rounded border border-emerald-200 dark:border-emerald-800 break-words whitespace-pre-wrap leading-relaxed opacity-80">
                                            {raw}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-[10px] font-mono text-emerald-800 dark:text-emerald-200 break-words whitespace-pre-wrap max-w-full">
                                          {fp}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <span
                                    key={fp}
                                    className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 shadow-sm break-words whitespace-pre-wrap max-w-full inline-block"
                                  >

                                    {fp}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 ">
                            Nessun segnale hardware...
                          </div>
                        )}
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">

                        <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-orange-600 mb-3 sm:mb-4 flex items-center gap-2">
                          <Globe className="w-4 h-4 sm:w-5 sm:h-5" /> Rete & IP (
                          {viewingMacroStats.ipAddresses.length +
                            viewingMacroStats.netHints.length}
                          )
                        </h4>
                        <div className="space-y-4">

                          {viewingMacroStats.ipAddresses.length > 0 && (
                            <div>

                              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">
                                INDIRIZZI DI RETE
                              </div>
                              <div className="flex flex-wrap gap-2.5">

                                {viewingMacroStats.ipAddresses.map((ip) => (
                                  <span
                                    key={ip}
                                    className="bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-800 shadow-sm"
                                  >

                                    {ip}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {viewingMacroStats.netHints.length > 0 && (
                            <div>

                              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">
                                ALTRI SUGGERIMENTI DI RETE
                              </div>
                              <div className="flex flex-wrap gap-2.5">

                                {viewingMacroStats.netHints.map((ip) => (
                                  <span
                                    key={ip}
                                    className="bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-800 shadow-sm"
                                  >

                                    {ip}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">

                        <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 sm:mb-4 flex items-center gap-2">
                          <Cpu className="w-4 h-4 sm:w-5 sm:h-5" /> Configurazione Dispositivo
                        </h4>
                        <div className="flex flex-wrap gap-2.5">

                          {viewingMacroStats.automationSignals.map((bot) => (
                            <span
                              key={bot}
                              className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 shadow-sm"
                            >

                              {bot}
                            </span>
                          ))}
                          {viewingMacroStats.permissionsList.map((p) => (
                            <span
                              key={p}
                              className="bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-teal-100 dark:border-teal-800 shadow-sm"
                            >

                              {p}
                            </span>
                          ))}
                          {viewingMacroStats.storageInfo.map((s) => (
                            <span
                              key={s}
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
                            >

                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {exportingMessage && (
        <Suspense fallback={null}>
          <StoryExportBeta
            message={exportingMessage}
            onClose={() => setExportingMessage(null)}
          />
        </Suspense>
      )}

      {/* Notifiche non bloccanti (sostituiscono gli alert). */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center gap-2 w-[min(92vw,28rem)] pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`pointer-events-auto w-full flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-semibold ${
              t.kind === "ok"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : t.kind === "error"
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-gray-900 dark:bg-gray-700 border-gray-700 text-white"
            }`}
          >
            <span className="flex-1 break-words">{t.text}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo!.run();
                  dismissToast(t.id);
                }}
                className="shrink-0 px-2.5 py-1 -my-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[12px] font-bold transition-colors"
              >
                {t.undo.label}
              </button>
            )}
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Chiudi notifica"
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
