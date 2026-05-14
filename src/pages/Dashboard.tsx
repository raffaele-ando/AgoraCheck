import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { parseUserAgent } from "../utils/uaParser";
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
  deleteField,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Logo } from "../components/Logo";
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
  Fingerprint,
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { Analytics } from "../components/Analytics";
import StoryExportBeta from "../components/StoryExportBeta";
import StoryTemplateConfig from "../components/StoryTemplateConfig";
import AppSettings, { loadLinkConfigFromDB, LinkWidgetConfig, DEFAULT_LINK_CONFIG } from "../components/AppSettings";
import { LinkWidgetCard } from "../components/LinkWidgetCard";
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
  suspects?: string[];
  instagram?: string;
  /* deprecated */ customInstagrams?: string[];
  removedInstagrams?: string[];
  isolateFromAutoGrouping?: boolean;
  manualMergeProfileId?: string;
  ignoredFromAnalytics?: boolean;
}
const computeDeviceProfileColor = (profileId: string) => {
  let hash = 0;
  for (let i = 0; i < profileId.length; i++) {
    hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const cColor = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - cColor.length) + cColor;
};
const computeDeviceProfileId = (
  parsedAdv: any,
  deviceInfo: any,
  vTokenMap?: Map<string, string>,
): string => {
  if (!parsedAdv) return "UNKNOWN";
  try {
    const canvas =
      parsedAdv.software?.canvasFingerprint ||
      parsedAdv.s?.canvasFingerprint ||
      parsedAdv.s?.c ||
      "";
    const audio =
      parsedAdv.software?.audioFingerprint ||
      parsedAdv.s?.audioFingerprint ||
      parsedAdv.s?.a ||
      "";
    const gpu =
      parsedAdv.hardware?.gpu || parsedAdv.h?.gpu || parsedAdv.h?.g || "";
    const screen =
      parsedAdv.hardware?.screen || parsedAdv.h?.screen || parsedAdv.h?.s || "";
    const cores =
      parsedAdv.hardware?.cores || parsedAdv.h?.cores || parsedAdv.h?.c || "";
    let seed = `${canvas}-${audio}-${gpu}-${screen}-${cores}`;
    const vToken =
      parsedAdv.behavior?.ttv || parsedAdv.b?.ttv || parsedAdv.b?.vToken || "";
    if (vTokenMap && vToken && vTokenMap.has(vToken)) {
      seed = vTokenMap.get(vToken)!;
    } else if (seed === "----" && deviceInfo) {
      const ip = deviceInfo.userAgent || "";
      seed = ip;
    }
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0, ch; i < seed.length; i++) {
      ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return `AUTO-${hash.toString(16).toUpperCase().padStart(12, "0").slice(0, 8)}`;
  } catch {
    return "UNKNOWN";
  }
};
export default function Dashboard() {
  const [isAdminTrackingIgnored, setIsAdminTrackingIgnored] = useState(
    localStorage.getItem("IGNORE_ANALYTICS") !== "false" // default true
  );

  useEffect(() => {
    if (isAdminTrackingIgnored) {
      localStorage.setItem("IGNORE_ANALYTICS", "true");
    } else {
      localStorage.setItem("IGNORE_ANALYTICS", "false");
    }
  }, [isAdminTrackingIgnored]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const [loading, setLoading] = useState(true);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
  const [profileSuspectsInput, setProfileSuspectsInput] = useState("");
  const [profileCustomInstagramsInput, setProfileCustomInstagramsInput] =
    useState("");
  const [viewFilter, setViewFilter] = useState<"new" | "archived">("new");
  const [activeTab, setActiveTab] = useState<
    "messages" | "profiles" | "analytics" | "story_template" | "settings"
  >("messages");
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
  const [resolutionInput, setResolutionInput] = useState("");
  const [macroModalTab, setMacroModalTab] = useState<
    "timeline" | "dettagli" | "identita"
  >("timeline");
  const editingProfileInitializedRef = useRef<string | null>(null);
  const saveMessageResolution = async (msgId: string) => {
    try {
      await updateDoc(doc(db, "messages", msgId), {
        resolution: resolutionInput.trim() || null,
      });
      setEditingMessageId(null);
    } catch (e: any) {
      console.error(e);
      alert("Errore salvataggio risoluzione: " + e.message);
    }
  };
  useEffect(() => {
    if (editingProfileId) {
      if (
        editingProfileInitializedRef.current !== editingProfileId &&
        profiles[editingProfileId]
      ) {
        setProfileNameInput(profiles[editingProfileId]?.name || "");
        setProfileSuspectsInput(
          profiles[editingProfileId]?.suspects?.join(", ") || "",
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
          suspects: profileSuspectsInput
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
              auth.currentUser?.providerData?.map((provider) => ({
                providerId: provider.providerId,
                email: provider.email,
              })) || [],
          },
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
        alert("Errore salvataggio profilo");
      } else {
        console.error(err);
        alert("Errore salvataggio profilo");
      }
    }
  };
  const handleScollega = async (pid: string) => {
    try {
      await setDoc(
        doc(db, "profiles", pid),
        { isolateFromAutoGrouping: true, manualMergeProfileId: deleteField() },
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
        { isolateFromAutoGrouping: false },
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
            { manualMergeProfileId: sourcePid, isolateFromAutoGrouping: false },
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
  const vTokenMap = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg.advancedInfo) continue;
      const adv = parseAdvancedInfo(msg);
      if (!adv) continue;
      const vToken = adv.behavior?.ttv || adv.b?.ttv || adv.b?.vToken || "";
      if (vToken) {
        const canvas =
          adv.software?.canvasFingerprint ||
          adv.s?.canvasFingerprint ||
          adv.s?.c ||
          "";
        const audio =
          adv.software?.audioFingerprint ||
          adv.s?.audioFingerprint ||
          adv.s?.a ||
          "";
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
  const getDeviceProfileCacheRef = useRef(
    new Map<
      string,
      {
        resolvedSeed: string | undefined;
        groupId: string | undefined;
        result: string;
      }
    >(),
  );
  const getDeviceProfile = useCallback(
    (msg: Message) => {
      if (msg.profileGroupId) return msg.profileGroupId;
      const cacheKey = msg.id;
      const cache = getDeviceProfileCacheRef.current.get(cacheKey);
      const adv = msg.parsedAdvanced;
      const vToken = adv
        ? adv.behavior?.ttv || adv.b?.ttv || adv.b?.vToken || ""
        : "";
      const currentResolvedSeed = vToken ? vTokenMap.get(vToken) : undefined;
      if (
        cache &&
        cache.resolvedSeed === currentResolvedSeed &&
        cache.groupId === msg.profileGroupId
      ) {
        return cache.result;
      }
      const result = computeDeviceProfileId(
        msg.parsedAdvanced,
        msg.deviceInfo,
        vTokenMap,
      );
      getDeviceProfileCacheRef.current.set(cacheKey, {
        resolvedSeed: currentResolvedSeed,
        groupId: msg.profileGroupId,
        result,
      });
      return result;
    },
    [vTokenMap],
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
    return Array.from(profileInstagramsMap.keys());
  }, [profileInstagramsMap]);
  const macroProfiles = useMemo(() => {
    const nodes = allProfileIds;
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n, new Set());
    const tagGroups = new Map<string, string[]>();
    for (const n of nodes) {
      const prof = profiles[n];
      if (prof?.isolateFromAutoGrouping) continue;
      const { tags } = getProfileInstagrams(n);
      for (const tag of tags) {
        if (!tagGroups.has(tag)) tagGroups.set(tag, []);
        tagGroups.get(tag)!.push(n);
      }
    }
    for (const pids of tagGroups.values()) {
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) {
          adj.get(pids[i])!.add(pids[j]);
          adj.get(pids[j])!.add(pids[i]);
        }
      }
    }
    for (const n of nodes) {
      const prof = profiles[n];
      if (prof?.manualMergeProfileId && adj.has(prof.manualMergeProfileId)) {
        adj.get(n)!.add(prof.manualMergeProfileId);
        adj.get(prof.manualMergeProfileId)!.add(n);
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
    return components
      .map((comp) => {
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
        const suspects = new Set<string>();
        comp.forEach((p) => {
          (profiles[p]?.suspects || []).forEach((s) => suspects.add(s));
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
        return {
          id,
          profileIds: comp,
          name,
          suspects: Array.from(suspects),
          instagrams: Array.from(instagrams),
          msgCount: compMsgs.length,
          totalTime,
          lastIp,
          mostRecentMsg,
        };
      })
      .sort((a, b) => b.msgCount - a.msgCount);
  }, [
    allProfileIds,
    profiles,
    getProfileInstagrams,
    messages,
    getDeviceProfile,
  ]);
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
    const hardwareFingerprints = new Set<string>();
    const vTokens = new Set<string>();
    let totalSessionTime = 0;
    const ipAddresses = new Set<string>();
    const botStatuses = new Set<string>();
    const localIps = new Set<string>();
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
          "";
        const canvas =
          adv.software?.canvasFingerprint ||
          adv.s?.canvasFingerprint ||
          adv.s?.c ||
          "";
        const audio =
          adv.software?.audioFingerprint ||
          adv.s?.audioFingerprint ||
          adv.s?.a ||
          "";
        const mathFp = adv.software?.mathFingerprint?.pi ? "Supportato" : "";
        const advancedSensors =
          adv.hardware?.advancedSensors || adv.h?.advancedSensors || "";
        if (gpu) hardwareFingerprints.add(`GPU: ${gpu}`);
        if (screen) hardwareFingerprints.add(`Schermo: ${screen}`);
        if (cpu) hardwareFingerprints.add(`CPU: ${cpu} core`);
        if (mem) hardwareFingerprints.add(`RAM: ${mem}GB`);
        if (canvas) hardwareFingerprints.add(`Canvas ID: ${canvas}`);
        if (audio) hardwareFingerprints.add(`Audio ID: ${audio}`);
        if (mathFp) hardwareFingerprints.add(`Math Fp: ${mathFp}`);
        if (advancedSensors)
          hardwareFingerprints.add(`Sensori: ${advancedSensors}`);
        const sessionTime = adv.behavior?.sessionTimeSeconds;
        if (typeof sessionTime === "number") totalSessionTime += sessionTime;
        const ip = adv.network?.ip || adv.n?.ip;
        if (ip) ipAddresses.add(ip);
        const localIp = adv.network?.localIp || adv.n?.localIp;
        if (localIp) localIps.add(localIp);
        const botStatus = adv.software?.botStatus || adv.s?.botStatus;
        if (botStatus) botStatuses.add(botStatus);
        const incognito = adv.software?.incognito || adv.s?.incognito;
        if (incognito) botStatuses.add(`Incognito: ${incognito}`);
        const perms = adv.software?.permissions || adv.s?.permissions;
        if (perms)
          permissionsList.add(
            `Geo: ${perms.geolocation}, Camera: ${perms.camera}, Mic: ${perms.microphone}`,
          );
        const storage = adv.software?.storage || adv.s?.storage;
        if (storage) storageInfo.add(`Storage: ${storage}`);
        const tt = adv.behavior?.ttv || adv.b?.ttv || adv.b?.vToken;
        if (tt) vTokens.add(tt);
      }
      if (m.deviceInfo?.userAgent) {
        hardwareFingerprints.add(
          `Browser/Device: ${m.deviceInfo.userAgent}`
        );
      }
    });
    return {
      messages: sortedMsgs,
      oldest,
      newest,
      hardwareFingerprints: Array.from(hardwareFingerprints),
      vTokens: Array.from(vTokens),
      totalSessionTime,
      ipAddresses: Array.from(ipAddresses),
      localIps: Array.from(localIps),
      botStatuses: Array.from(botStatuses),
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
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(2000),
    );
    setLoading(true);
    const unsubscribeMsgs = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => {
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
            profileId = computeDeviceProfileId(parsedAdv, data.deviceInfo);
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
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      },
    );
    const unsubscribeProfiles = onSnapshot(
      collection(db, "profiles"),
      (snapshot) => {
        const pmap: Record<string, ProfileRecord> = {};
        snapshot.docs.forEach((doc) => {
          pmap[doc.id] = { id: doc.id, ...doc.data() } as ProfileRecord;
        });
        setProfiles(pmap);
        setProfilesLoaded(true);
      },
      (error) => {
        setProfilesLoaded(true);
      },
    );
    const unsubscribeVisits = onSnapshot(
      collection(db, "analytics_visits"),
      (snapshot) => {
        const v: any[] = [];
        snapshot.docs.forEach((doc) => {
          v.push({ id: doc.id, ...doc.data() });
        });
        setVisits(v);
      },
      (error) => {
        console.error(error);
      }
    );
    return () => {
      unsubscribeMsgs();
      unsubscribeProfiles();
      unsubscribeVisits();
    };
  }, []);
  /* Reset pagination when view filter or active tab changes */ useEffect(() => {
    setCurrentPage(1);
  }, [viewFilter, pageSize, activeTab]);
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
    const syncInstagrams = async () => {
      const updatesByPid = new Map<string, Set<string>>();
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
            batchOp.set(
              doc(db, "profiles", pid),
              { customInstagrams: arrayUnion(...Array.from(tags)) },
              { merge: true },
            );
          }
          await batchOp.commit();
        } catch (e: any) {
          console.error("Batch auto-sync error:", e);
        }
      }
    };
    const timeoutId = setTimeout(syncInstagrams, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages]);
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
      } else if (confirmModalState.type === "ungroup") {
        await updateDoc(doc(db, "messages", confirmModalState.messageId), {
          profileGroupId: deleteField(),
        });
      } else if (confirmModalState.type === "delete-bulk") {
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
      } else if (confirmModalState.type === "delete-profile-bulk") {
        const batchSize = 500;
        for (let i = 0; i < selectedProfiles.length; i += batchSize) {
          const chunk = selectedProfiles.slice(i, i + batchSize);
          const batchOp = writeBatch(db);
          const pidsToDelete = new Set<string>();
          for (const macroId of chunk) {
            const macro = macroProfiles.find((m) => m.id === macroId);
            if (macro) {
              for (const pid of macro.profileIds) {
                batchOp.delete(doc(db, "profiles", pid));
                pidsToDelete.add(pid);
              }
            }
          }
          Object.entries(profiles).forEach(([childPid, childProf]) => {
            if (
              childProf.manualMergeProfileId &&
              pidsToDelete.has(childProf.manualMergeProfileId) &&
              !pidsToDelete.has(childPid)
            ) {
              batchOp.update(doc(db, "profiles", childPid), {
                manualMergeProfileId: deleteField(),
              });
            }
          });
          try {
            await batchOp.commit();
          } catch (e) {
            console.error("Batch delete profile error:", e);
          }
        }
        setSelectedProfiles([]);
        setIsProfileSelectMode(false);
      }
    } catch (error) {
      console.error(error);
      alert("Errore durante l'operazione.");
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
    } catch (e) {
      console.error(e);
      alert("Errore durante l'operazione.");
    }
  };
  const handleBulkArchive = async () => {
    if (selectedMessages.length === 0) return;
    try {
      /* Determiniamo in quale tab ci troviamo (new o archived) e invertirne lo stato per la selezione */ const targetStatus =
        viewFilter === "new" ? true : false;
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
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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
    const newProfileGroupId =
      groupNameInput.trim() ||
      `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try {
      const batchSize = 500;
      for (let i = 0; i < selectedMessages.length; i += batchSize) {
        const chunk = selectedMessages.slice(i, i + batchSize);
        const batchOp = writeBatch(db);
        for (const id of chunk) {
          batchOp.update(doc(db, "messages", id), {
            profileGroupId: newProfileGroupId,
          });
        }
        await batchOp.commit();
      }
      setSelectedMessages([]);
      setIsSelectMode(false);
      setShowGroupPrompt(
        false,
      ); /* alert(`Messaggi raggruppati con successo nel profilo: ${newProfileGroupId}`); */
    } catch (e) {
      console.error(e);
      alert("Errore durante il raggruppamento.");
    }
  };
  const handleUngroupDevice = (messageId: string) => {
    setConfirmModalState({ isOpen: true, messageId, type: "ungroup" });
  };
  const filteredMessages = messages.filter((m) =>
    viewFilter === "archived" ? !!m.isArchived : !m.isArchived,
  );
  const totalPagesMsg = Math.ceil(filteredMessages.length / pageSize) || 1;
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const totalPagesProf = Math.ceil(macroProfiles.length / pageSize) || 1;
  const paginatedProfiles = macroProfiles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const isAnySelectMode =
    (activeTab === "messages" && isSelectMode) ||
    (activeTab === "profiles" && isProfileSelectMode);

  useEffect(() => {
    const isAnyModalOpen =
      confirmModalState.isOpen ||
      showGroupPrompt ||
      showMergeModal.isOpen ||
      !!editingProfileId ||
      !!viewingMacroId;

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
  ]);

  return (
    <div
      className={`min-h-[100dvh] overflow-x-hidden p-4 md:p-8 transition-colors duration-500 ${isAnySelectMode ? "bg-slate-100/60" : "bg-gray-50 dark:bg-gray-800/50 "}`}
    >

      <div className="max-w-7xl mx-auto">

        <header
          className={`sticky top-2 sm:top-4 z-40 mb-4 sm:mb-6 p-3 sm:p-4 rounded-3xl border shadow-sm transition-all duration-500 ${isAnySelectMode ? "bg-indigo-900/95 backdrop-blur-xl border-indigo-800 shadow-indigo-900/20 text-white shadow-lg scale-[1.01]" : "bg-white dark:bg-gray-800 backdrop-blur-xl border-gray-200 dark:border-gray-600 shadow-sm"}`}
        >

          {/* NOT SELECT MODE */}
          {!isAnySelectMode && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 w-full">

              {/* Top Row on Mobile, Left Side on Desktop */}
              <div className="flex items-center justify-between w-full md:w-auto">

                <div className="flex items-center gap-3">

                  <Link to="/" className="shrink-0 flex items-center">

                    <Logo className="h-8 w-[100px] sm:h-10 sm:w-[130px] hover:opacity-80 transition-all duration-300" />
                  </Link>
                  <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 shrink-0 hidden md:block"></div>
                  <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-gray-100 uppercase hidden xl:block shrink-0">
                    Dashboard
                  </h1>
                </div>
                {/* Mobile Icons */}
                <div className="flex items-center gap-1 md:hidden">

                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                    title="Toggle Theme"
                  >

                    {isDarkMode ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                    title="Disconnetti"
                  >

                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Bottom Row on Mobile, Right Side on Desktop */}
              <div className="flex items-center gap-2 w-full md:w-auto">

                {activeTab !== "analytics" && (
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
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold uppercase tracking-wide rounded-xl hover:shadow-md hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all active:scale-95 shrink-0"
                  >

                    <CheckCircle2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="hidden sm:inline-block whitespace-nowrap">
                      Selezione
                    </span>
                  </button>
                )}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 backdrop-blur-sm p-1 rounded-xl border border-gray-200 dark:border-gray-600 flex-1 md:flex-none overflow-x-auto hide-scrollbar">

                  <button
                    onClick={() => setActiveTab("messages")}
                    className={`flex-1 md:flex-none px-3 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === "messages" ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-600 " : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                  >

                    Messaggi
                  </button>
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => setActiveTab("profiles")}
                        className={`flex-1 md:flex-none px-3 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === "profiles" ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-600 " : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                      >

                        Profili
                      </button>
                      <button
                        onClick={() => setActiveTab("analytics")}
                        className={`flex-1 md:flex-none px-3 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === "analytics" ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-600 " : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                      >

                        Analytics
                      </button>
                      <button
                        onClick={() => setActiveTab("story_template")}
                        className={`flex-1 md:flex-none px-3 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === "story_template" ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-600 " : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                      >

                        Template Storie
                      </button>
                      <button
                        onClick={() => setActiveTab("settings")}
                        className={`flex-1 md:flex-none px-3 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === "settings" ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-600 " : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 "}`}
                      >

                        Impostazioni
                      </button>
                    </>
                  )}
                </div>
                {/* Desktop Icons */}
                <div className="hidden md:flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-2 ml-1">

                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                    title="Toggle Theme"
                  >

                    {isDarkMode ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                  </button>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700 break-words whitespace-pre-wrap max-w-[150px] xl:max-w-[200px] shrink-0 hidden lg:block">

                    {auth.currentUser?.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                    title="Disconnetti"
                  >

                    <LogOut className="w-5 h-5" />
                  </button>
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
                    className="p-2 sm:p-2 bg-white dark:bg-gray-800 hover:bg-red-500/80 rounded-full transition-colors flex items-center justify-center shrink-0 border border-white/10"
                    title="Annulla Selezione"
                  >

                    <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                  </button>
                  <span className="text-sm font-black text-indigo-50 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-white/10">

                    {activeTab === "messages"
                      ? selectedMessages.length
                      : selectedProfiles.length}
                    <span className="opacity-80 font-semibold hidden sm:inline-block">
                      selezionati
                    </span>
                  </span>
                </div>
                {/* Tutti / Nessuno on Mobile Top Right */}
                <div className="flex md:hidden items-center gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-white/10 shadow-inner">

                  <button
                    onClick={() => {
                      if (activeTab === "messages")
                        setSelectedMessages(filteredMessages.map((m) => m.id));
                      else
                        setSelectedProfiles(paginatedProfiles.map((p) => p.id));
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-white dark:hover:bg-gray-800 text-indigo-50 hover:text-white rounded-lg transition-all active:scale-95"
                  >

                    Tutti
                  </button>
                  <div className="w-px h-4 bg-white dark:bg-gray-800 mx-0.5"></div>
                  <button
                    onClick={() => {
                      if (activeTab === "messages") setSelectedMessages([]);
                      else setSelectedProfiles([]);
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-white dark:hover:bg-gray-800 text-indigo-50 hover:text-white rounded-lg transition-all active:scale-95"
                  >

                    Nessuno
                  </button>
                </div>
              </div>
              {/* Bottom Row on mobile, Right side on Desktop */}
              <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">

                {/* Tutti / Nessuno on Desktop */}
                <div className="hidden md:flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-white/10 shadow-inner mr-2">

                  <button
                    onClick={() => {
                      if (activeTab === "messages")
                        setSelectedMessages(filteredMessages.map((m) => m.id));
                      else
                        setSelectedProfiles(paginatedProfiles.map((p) => p.id));
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase hover:bg-white dark:hover:bg-gray-800 text-indigo-50 hover:text-white rounded-lg transition-all active:scale-95"
                  >

                    Tutti
                  </button>
                  <div className="w-px h-4 bg-white dark:bg-gray-800 mx-0.5"></div>
                  <button
                    onClick={() => {
                      if (activeTab === "messages") setSelectedMessages([]);
                      else setSelectedProfiles([]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase hover:bg-white dark:hover:bg-gray-800 text-indigo-50 hover:text-white rounded-lg transition-all active:scale-95"
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
          <Analytics
            messages={messages.filter((m) => {
              const pid = getDeviceProfile(m);
              if (profiles[pid]?.ignoredFromAnalytics) return false;
              const macro = macroProfiles.find((mac) => mac.profileIds.includes(pid));
              if (macro && macro.profileIds.some((id) => profiles[id]?.ignoredFromAnalytics)) return false;
              return true;
            })}
            profiles={Object.fromEntries(
              Object.entries(profiles).filter(([pid, _]) => {
                if (profiles[pid]?.ignoredFromAnalytics) return false;
                const macro = macroProfiles.find((mac) => mac.profileIds.includes(pid));
                if (macro && macro.profileIds.some((id) => profiles[id]?.ignoredFromAnalytics)) return false;
                return true;
              })
            )}
            macroProfiles={macroProfiles.filter((m) => !m.profileIds.some((pid) => profiles[pid]?.ignoredFromAnalytics))}
            visits={visits}
          />
        )}
        {activeTab === "story_template" && (
          <StoryTemplateConfig />
        )}
        {activeTab === "settings" && (
          <AppSettings isSuperAdmin={isSuperAdmin} />
        )}
        {activeTab === "messages" && (
          <>
            <LinkWidgetCard latestMessage={messages.find(m => !m.isArchived)} />

            {!isSelectMode && (
              <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8 pb-2 sm:pb-0">

                <button
                  onClick={() => {
                    setViewFilter("new");
                    setSelectedMessages([]);
                  }}
                  className={`flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${viewFilter === "new" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"}`}
                >

                  <InboxIcon className="w-4 h-4 shrink-0" /> Spotted Nuovi
                </button>
                <button
                  onClick={() => {
                    setViewFilter("archived");
                    setSelectedMessages([]);
                  }}
                  className={`flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${viewFilter === "archived" ? "bg-gray-800 dark:bg-gray-700 text-white shadow-md shadow-gray-300 dark:shadow-none" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"}`}
                >

                  <Archive className="w-4 h-4 shrink-0" /> Letti /
                  Archiviati
                </button>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>
                <div className="flex flex-1 sm:flex-none justify-end items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">

                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Per Pagina:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white dark:bg-gray-800 border text-xs sm:text-sm border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  >

                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
            )}
            {loading || !profilesLoaded ? (
              <div className="flex justify-center py-20">

                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-white/20">

                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ">
                  Nessun messaggio
                </h3>
                <p className="text-gray-500 dark:text-gray-400 ">
                  I messaggi in questa sezione appariranno qui.
                </p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-6">

                {paginatedMessages.map((msg) => {
                  const profileId = getDeviceProfile(msg);
                  const profileColor = getProfileColor(profileId);
                  const isSelected = selectedMessages.includes(msg.id);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-5 md:p-6 shadow-sm border break-inside-avoid inline-block w-full mb-6 ${isSelected ? "border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-100" : isSelectMode ? "border-gray-300 dark:border-gray-500 hover:border-indigo-400 opacity-80 hover:opacity-100" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 "} transition-colors duration-300 relative group cursor-default z-0 hover:z-10`}
                      onClick={() =>
                        isSelectMode ? toggleSelection(msg.id) : undefined
                      }
                      style={{ cursor: isSelectMode ? "pointer" : "default" }}
                    >

                      <div className="flex justify-between items-start mb-5">

                        <div className="flex items-center gap-3">

                          {isSelectMode && (
                            <div
                              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-indigo-500 border-indigo-500 scale-110 shadow-md" : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 group-hover:border-indigo-400"}`}
                            >

                              {isSelected && (
                                <div className="w-2 h-2 bg-white dark:bg-gray-800 rounded-full" />
                              )}
                            </div>
                          )}
                          {isSuperAdmin ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSelectMode) {
                                    const target = macroProfiles.find((m) =>
                                      m.profileIds.includes(profileId),
                                    );
                                    if (target) setViewingMacroId(target.id);
                                    else setEditingProfileId(profileId);
                                  }
                                }}
                                className={`flex items-center gap-2 text-left group/profile ${isSelectMode ? "pointer-events-none" : "cursor-pointer hover:opacity-80 transition-opacity"}`}
                                title="Gestisci Profilo"
                              >

                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0"
                                  style={{ backgroundColor: profileColor }}
                                >

                                  <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">

                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">

                                    {profiles[profileId]?.name ||
                                      (profileId.startsWith("AUTO-")
                                        ? "Anonimo Auto"
                                        : "Anonimo Manuale")}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1 mt-0.5">

                                    <Clock className="w-3 h-3" />
                                    {msg.createdAt
                                      ? format(
                                          msg.createdAt.toDate(),
                                          "d MMM HH:mm",
                                          { locale: it },
                                        )
                                      : "N/A"}
                                  </span>
                                </div>
                              </button>
                              {msg.profileGroupId && !isSelectMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUngroupDevice(msg.id);
                                  }}
                                  className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 hover:underline mt-1 ml-1 self-start"
                                >

                                  (Rimuovi Gruppo)
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-left">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0 bg-gray-400">
                                <UserIcon className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Anonimo</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {msg.createdAt
                                    ? format(
                                        msg.createdAt.toDate(),
                                        "d MMM HH:mm",
                                        { locale: it },
                                      )
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        {!isSelectMode && (
                          <div className="flex items-center gap-1 shrink-0">

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArchiveStatus(msg.id, !!msg.isArchived);
                              }}
                              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${msg.isArchived ? "text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 " : "text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 "}`}
                              title={
                                msg.isArchived
                                  ? "Sposta in Nuovi"
                                  : "Segna come Letto/Archivia"
                              }
                            >

                              {msg.isArchived ? (
                                <ArchiveRestore className="w-4 h-4" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(msg.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-full transition-colors"
                              title="Elimina Messaggio"
                            >

                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Core Content */}
                      <div className="mb-4">
                        {msg.type === "sondaggio" && (
                          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                            <BarChart3 className="w-3.5 h-3.5" />
                            Sondaggio
                          </div>
                        )}
                        <p className="text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap break-words text-lg sm:text-xl leading-relaxed">

                          <span className="text-gray-300 font-serif text-3xl leading-none italic mr-1 align-bottom">
                            "
                          </span>
                          {msg.lookingFor}
                          <span className="text-gray-300 font-serif text-3xl leading-none italic ml-1 align-top">
                            "
                          </span>
                        </p>
                        {msg.type === "sondaggio" && msg.pollOptions && msg.pollOptions.length > 0 && (
                          <div className="mt-4 space-y-2">
                             {msg.pollOptions.map((opt, i) => (
                               <div key={i} className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-sm md:text-base text-gray-700 dark:text-gray-200 flex items-center gap-3 shadow-sm">
                                  <div className="w-6 h-6 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center font-bold text-xs shrink-0">{i + 1}</div>
                                  <span className="break-words min-w-0">{opt}</span>
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExportingMessage(msg);
                          }}
                          className="text-xs bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-xl transition-colors border border-indigo-100 dark:border-indigo-800 flex items-center gap-1.5 w-fit shadow-sm"
                        >
                           <ImageIcon className="w-3.5 h-3.5" /> Esporta Storia (Beta)
                        </button>
                      </div>

                      <div className="space-y-4 mb-5">

                        {(msg.city || msg.area || msg.when || msg.where) && (
                          <div className="flex flex-wrap gap-2">

                            {msg.city && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-800 text-xs font-bold shadow-sm">
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                <div className="max-w-full">
                                  <span className="opacity-60 font-semibold mr-1">
                                    Città:
                                  </span>
                                  {msg.city}
                                </div>
                              </div>
                            )}
                            {msg.area && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 rounded-xl text-indigo-800 text-xs font-bold shadow-sm">

                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <div className="max-w-full">
                                  <span className="opacity-60 font-semibold mr-1">
                                    Zona:
                                  </span>
                                  {msg.area}
                                </div>
                              </div>
                            )}
                            {msg.when && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/40 border border-orange-100 dark:border-orange-800 rounded-xl text-orange-800 text-xs font-bold shadow-sm">

                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <div className="max-w-full">

                                  <span className="opacity-60 font-semibold mr-1">
                                    Quando:
                                  </span>
                                  {msg.when}
                                </div>
                              </div>
                            )}
                            {msg.where && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800 rounded-xl text-emerald-800 text-xs font-bold shadow-sm">

                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <div className="max-w-full">

                                  <span className="opacity-60 font-semibold mr-1">
                                    Dove:
                                  </span>
                                  {msg.where}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {isSuperAdmin ? (() => {
                          const { tags, hasMultiple } =
                            getProfileInstagrams(profileId);
                          if (tags.length === 0) return null;
                          return (
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/40 dark:to-pink-900/40 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-800 relative overflow-hidden shadow-sm flex flex-col gap-2">


                              <div
                                className={`flex items-center gap-2 text-purple-600 ${!msg.instagram ? "pr-16" : ""}`}
                              >

                                <Instagram className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">
                                  Instagram associati
                                </span>
                                {hasMultiple && (
                                  <span className="text-[9px] font-black bg-purple-200/80 dark:bg-purple-900/60 px-1.5 py-0.5 rounded text-purple-800 dark:text-purple-300 shadow-sm shrink-0">
                                    MULTIPLE
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">

                                {tags.map((tag) => (
                                  <a
                                    key={tag}
                                    href={`https://instagram.com/${tag}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:scale-105 transition-transform text-white text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-500 dark:to-pink-400 shadow-indigo-200/50 dark:shadow-none shadow-md px-3 py-1.5 rounded-xl block max-w-full break-words whitespace-pre-wrap"
                                  >

                                    @{tag}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })() : (
                          msg.instagram ? (
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/40 dark:to-pink-900/40 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-800 relative overflow-hidden shadow-sm flex flex-col gap-2">
                              <div className={`flex items-center gap-2 text-purple-600`}>
                                <Instagram className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">
                                  Instagram Utente
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <a
                                  href={`https://instagram.com/${msg.instagram}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:scale-105 transition-transform text-white text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-500 dark:to-pink-400 shadow-indigo-200/50 dark:shadow-none shadow-md px-3 py-1.5 rounded-xl block max-w-full break-words whitespace-pre-wrap"
                                >
                                  @{msg.instagram}
                                </a>
                              </div>
                            </div>
                          ) : null
                        )}
                        {isSuperAdmin && profiles[profileId]?.suspects &&
                          profiles[profileId].suspects!.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/40 p-3.5 rounded-2xl border border-red-100 dark:border-red-800 flex flex-col gap-2">

                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 ">

                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">
                                  Sospetti (
                                  {profiles[profileId].suspects!.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">

                                {profiles[profileId].suspects!.map((s) => (
                                  <div
                                    key={s}
                                    className="px-2.5 py-1 bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800 shadow-sm"
                                  >

                                    {s}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        {/* Resolution Section */}
                        <div
                          className={`p-3.5 rounded-2xl border ${msg.resolution ? "bg-sky-50 dark:bg-sky-900/40 border-sky-100 dark:border-sky-800 text-sky-900 shadow-sm" : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 border-dashed"}`}
                        >

                          <div className="flex items-center justify-between mb-2">

                            <div
                              className={`flex items-center gap-2 ${msg.resolution ? "text-sky-600" : "text-gray-500 dark:text-gray-400 "}`}
                            >

                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span className="text-xs font-black uppercase tracking-wider">

                                {msg.resolution
                                  ? "Risoluzione"
                                  : "Aggiungi Risoluzione (IG)"}
                              </span>
                            </div>
                            {!isSelectMode && editingMessageId !== msg.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMessageId(msg.id);
                                  setResolutionInput(msg.resolution || "");
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${msg.resolution ? "bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 hover:bg-sky-200 shadow-sm" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300"}`}
                              >

                                {msg.resolution ? "Modifica" : "Inserisci"}
                              </button>
                            )}
                          </div>
                          {editingMessageId === msg.id ? (
                            <div
                              className="mt-2"
                              onClick={(e) => e.stopPropagation()}
                            >

                              <textarea
                                autoFocus
                                value={resolutionInput}
                                onChange={(e) =>
                                  setResolutionInput(e.target.value)
                                }
                                placeholder="Tag IG, nome, o info su come si è conclusa..."
                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-xl outline-none focus:border-indigo-500 text-sm focus:ring-2 focus:ring-indigo-100 transition-all resize-none text-gray-800 dark:text-gray-200 shadow-inner"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2 mt-2">

                                <button
                                  onClick={() => setEditingMessageId(null)}
                                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-gray-300 transition-colors"
                                >

                                  Annulla
                                </button>
                                <button
                                  onClick={() => saveMessageResolution(msg.id)}
                                  className="px-3 py-1.5 bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
                                >

                                  Salva
                                </button>
                              </div>
                            </div>
                          ) : (
                            msg.resolution && (
                              <div className="font-semibold text-sm break-words whitespace-pre-wrap mt-2">
                                {msg.resolution}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      {/* Telemetry Details */}
                      {isSuperAdmin && (
                        <details className="group border-t border-gray-100 dark:border-gray-700 pt-4 cursor-pointer outline-none">

                          <summary className="flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider outline-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors list-none [&::-webkit-details-marker]:hidden">

                            <div className="flex items-center gap-2">

                              <Fingerprint className="w-4 h-4 text-indigo-400" />
                              Fingerprint & Telemetria
                            </div>
                            <div className="flex items-center gap-2">

                              <span className="text-gray-300 font-mono lowercase">
                                id: {msg.id.slice(0, 8)}
                              </span>
                              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                            </div>
                          </summary>
                          <div className="pt-4 pb-1 space-y-4 opacity-0 group-open:opacity-100 transition-opacity duration-300">

                            <div className="grid grid-cols-2 gap-3">

                              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700 ">

                                <Monitor className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">

                                  <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 ">
                                    Piattaforma
                                  </div>
                                  <div
                                    className="text-xs font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap"
                                    title={msg.deviceInfo?.platform}
                                  >

                                    {msg.deviceInfo?.platform ||
                                      "Sconosciuta"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700 ">

                                <Smartphone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">

                                  <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 ">
                                    Risoluzione
                                  </div>
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">

                                    {msg.deviceInfo?.screenResolution ||
                                      "Sconosciuta"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700 col-span-2 sm:col-span-1">

                                <Globe className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">

                                  <div className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 ">
                                    Lingua & Fuso
                                  </div>
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">

                                    {msg.deviceInfo?.language || "N/A"} •
                                    {msg.deviceInfo?.timezone
                                      ?.split("/")[1]
                                      ?.replace("_", " ") || "N/A"}
                                  </div>
                                </div>
                              </div>
                          </div>
                          <div className="text-[9px] text-gray-400 dark:text-gray-500 font-mono break-all leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 ">

                            {msg.deviceInfo?.userAgent}
                          </div>
                          {msg.advancedInfo &&
                            (() => {
                              try {
                                const p = parseAdvancedInfo(msg);
                                if (!p) return null;
                                const adv = {
                                  network: p.network || p.n || {},
                                  hardware: p.hardware || p.h || {},
                                  software: p.software || p.s || {},
                                  behavior: p.behavior || p.b || {},
                                };
                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[10px] font-mono text-gray-600 dark:text-gray-400 ">

                                    <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

                                      <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider">
                                        <Globe className="w-3 h-3 text-blue-500" />
                                        Rete & Posizione
                                      </strong>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          IP PUB:
                                        </span>
                                        {adv.network?.ip || "N/A"}
                                      </div>
                                      <div className="break-words whitespace-pre-wrap">
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          IP LOC:
                                        </span>
                                        {adv.network?.localIp || "N/A"}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          GEO:
                                        </span>
                                        {adv.network?.city},
                                        {adv.network?.region}
                                      </div>
                                      <div className="break-words whitespace-pre-wrap">
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          ISP:
                                        </span>
                                        {adv.network?.isp}
                                      </div>
                                      <div className="break-words whitespace-pre-wrap">
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          REF:
                                        </span>
                                        {adv.network?.referer || "N/A"}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          NET:
                                        </span>
                                        {adv.network?.connectionType ===
                                          "Nascosto/Non Supportato" ||
                                        adv.network?.connectionType ===
                                          "Unknown"
                                          ? "Nascosto"
                                          : `${adv.network?.connectionType} (${adv.network?.downlink}M, RTT: ${adv.network?.rtt || "?"}ms)(DS: ${adv.network?.saveData ? "On" : "Off"})`}
                                      </div>
                                    </div>
                                    <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

                                      <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider">
                                        <Cpu className="w-3 h-3 text-purple-500" />
                                        Hardware
                                      </strong>
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={
                                          adv.hardware?.detailedWebGL
                                            ? `Vend: ${adv.hardware.detailedWebGL.vendor}, Rndr: ${adv.hardware.detailedWebGL.renderer}, MaxTex: ${adv.hardware.detailedWebGL.maxTextureSize}, Exts: ${adv.hardware.detailedWebGL.extensionsCount}`
                                            : ""
                                        }
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          GPU:
                                        </span>
                                        {adv.hardware?.detailedWebGL
                                          ?.renderer || adv.hardware?.gpu}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          CPU/RAM:
                                        </span>
                                        {adv.hardware?.cores}C /
                                        {adv.hardware?.ram}GB
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          RES:
                                        </span>
                                        {adv.hardware?.screen} (
                                        {adv.hardware?.pixelRatio}x)
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          TCH/MEDIA:
                                        </span>
                                        {adv.hardware?.maxTouchPoints} pt /
                                        {adv.hardware?.mediaDevicesCount || 0}
                                        dev
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          BAT:
                                        </span>
                                        {adv.hardware?.battery?.level ===
                                          "Unknown" ||
                                        adv.hardware?.battery?.level ===
                                          "Sconosciuta"
                                          ? "Nascosta"
                                          : `${adv.hardware?.battery?.level} (${adv.hardware?.battery?.charging === true ? "In Carica" : adv.hardware?.battery?.charging === false ? "A Batteria" : "ND"})`}
                                      </div>
                                      {adv.hardware?.gamepadsCount > 0 && (
                                        <div className="break-words whitespace-pre-wrap">
                                          <span className="text-gray-400 dark:text-gray-500 ">
                                            GPAD:
                                          </span>
                                          {adv.hardware.gamepadsCount} (
                                          {adv.hardware.gamepadsIds?.join(
                                            ", ",
                                          ) || ""}
                                          )
                                        </div>
                                      )}
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={adv.hardware?.advancedSensors}
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          SENS:
                                        </span>
                                        {adv.hardware?.advancedSensors || "N/A"}
                                      </div>
                                    </div>
                                    <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

                                      <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider">
                                        <Activity className="w-3 h-3 text-orange-500" />
                                        Comportamento
                                      </strong>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          TIME/SCL:
                                        </span>
                                        {adv.behavior?.sessionTimeSeconds}s /
                                        {adv.behavior?.maxScrollDepth}% MAX
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          CLK/RAGE:
                                        </span>
                                        {adv.behavior?.clicks} /
                                        {adv.behavior?.rageClicks || 0}
                                      </div>
                                      <div className="break-words whitespace-pre-wrap">
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          DIST:
                                        </span>
                                        {adv.behavior?.mouseDistance
                                          ? `${adv.behavior.mouseDistance}px`
                                          : "0px"}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          KEY/BACK:
                                        </span>
                                        {adv.behavior?.keyStrokes}
                                        {adv.behavior?.typingCadenceMs
                                          ? `(~${adv.behavior.typingCadenceMs}ms)`
                                          : ""}
                                        / {adv.behavior?.backspaces || 0} bs
                                      </div>
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={
                                          adv.behavior?.fieldFocusTimes &&
                                          Object.keys(
                                            adv.behavior.fieldFocusTimes,
                                          ).length > 0
                                            ? Object.entries(
                                                adv.behavior.fieldFocusTimes,
                                              )
                                                .map(
                                                  ([k, v]) =>
                                                    `${k}:${Number(v) / 1000}s`,
                                                )
                                                .join(", ")
                                            : "N/A"
                                        }
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          FOC/BLR/PST/CP/CT:
                                        </span>
                                        {adv.behavior?.fieldFocusTimes &&
                                        Object.keys(
                                          adv.behavior.fieldFocusTimes,
                                        ).length > 0
                                          ? Object.keys(
                                              adv.behavior.fieldFocusTimes,
                                            ).length
                                          : 0}
                                        flds / {adv.behavior?.blurCount} /
                                        {adv.behavior?.pastes || 0} /
                                        {adv.behavior?.copies || 0} /
                                        {adv.behavior?.cuts || 0}
                                      </div>
                                      {adv.behavior?.autofillUsed && (
                                        <div>
                                          <span className="text-gray-400 dark:text-gray-500 text-orange-500 font-bold">
                                            AUTOFILL RILEVATO
                                          </span>
                                        </div>
                                      )}
                                      {adv.behavior?.deviceOrientation && (
                                        <div>
                                          <span className="text-gray-400 dark:text-gray-500 ">
                                            GYRO:
                                          </span>
                                          &alpha;:
                                          {adv.behavior.deviceOrientation.alpha}
                                          &deg;, &beta;:
                                          {adv.behavior.deviceOrientation.beta}
                                          &deg;, &gamma;:
                                          {adv.behavior.deviceOrientation.gamma}
                                          &deg;
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">

                                      <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2 font-sans text-[10px] uppercase tracking-wider">
                                        <Monitor className="w-3 h-3 text-emerald-500" />
                                        Software / Hash
                                      </strong>
                                      <div className="break-words whitespace-pre-wrap">
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          PR:
                                        </span>
                                        {adv.software?.platform}
                                        {adv.software?.historyLength
                                          ? `(Hist: ${adv.software.historyLength})`
                                          : ""}
                                      </div>
                                      <div className="break-words whitespace-pre-wrap">
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          CSS:
                                        </span>
                                        {adv.software?.advancedMedia
                                          ? `Dark:${adv.software.advancedMedia.darkMode ? "S" : "N"}, Ctrst:${adv.software.advancedMedia.highContrast ? "+" : "N"}, Mot:${adv.software.advancedMedia.reducedMotion ? "-" : "N"}, ${adv.software.advancedMedia.colorGamut}`
                                          : "N/A"}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          BOT/INC:
                                        </span>
                                        {adv.software?.botStatus || "N/A"} /
                                        {adv.software?.incognito || "N/A"}
                                      </div>
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={
                                          adv.software?.performanceMemory
                                            ? `L:${adv.software.performanceMemory.jsHeapSizeLimit} T:${adv.software.performanceMemory.totalJSHeapSize} U:${adv.software.performanceMemory.usedJSHeapSize}`
                                            : ""
                                        }
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          MEM:
                                        </span>
                                        {adv.software?.performanceMemory
                                          ? `${adv.software.performanceMemory.usedJSHeapSize} / ${adv.software.performanceMemory.totalJSHeapSize}`
                                          : "N/A"}
                                      </div>
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={
                                          adv.software?.permissions
                                            ? `Geo: ${adv.software.permissions.geolocation}, Notif: ${adv.software.permissions.notifications}, Cam: ${adv.software.permissions.camera}, Mic: ${adv.software.permissions.microphone}, ClipR: ${adv.software.permissions["clipboard-read"]}, ClipW: ${adv.software.permissions["clipboard-write"]}`
                                            : ""
                                        }
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          PERMESSI:
                                        </span>
                                        {adv.software?.permissions
                                          ? `Geo: ${adv.software.permissions.geolocation?.slice(0, 3)}, Notif: ${adv.software.permissions.notifications?.slice(0, 3)}, Cam: ${adv.software.permissions.camera?.slice(0, 3)}`
                                          : "N/A"}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          CANVAS_ID:
                                        </span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 ">
                                          {adv.software?.canvasFingerprint?.slice(
                                            0,
                                            10,
                                          )}
                                          ...
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          AUDIO_ID:
                                        </span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 ">
                                          {adv.software?.audioFingerprint?.slice(
                                            0,
                                            10,
                                          ) || "N/A"}
                                          ...
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          MATH_ID:
                                        </span>
                                        <span
                                          className="font-bold text-gray-800 dark:text-gray-200 "
                                          title={
                                            adv.software?.mathFingerprint
                                              ? JSON.stringify(
                                                  adv.software.mathFingerprint,
                                                )
                                              : ""
                                          }
                                        >
                                          {adv.software?.mathFingerprint?.pi
                                            ? "Presente"
                                            : "N/A"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          RECTS_ID:
                                        </span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 ">
                                          {adv.software?.clientRectsFingerprint?.slice(
                                            0,
                                            10,
                                          ) || "N/A"}
                                          ...
                                        </span>
                                      </div>
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={adv.software?.fontsIdentified?.join(
                                          ", ",
                                        )}
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          FONTS:
                                        </span>
                                        {adv.software?.fontsIdentified?.length}
                                        Identificati
                                      </div>
                                      <div
                                        className="break-words whitespace-pre-wrap"
                                        title={adv.software?.plugins}
                                      >
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          PLUGS:
                                        </span>
                                        {adv.software?.plugins
                                          ?.split(",")
                                          .slice(0, 3)
                                          .join(", ")}
                                        ...
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          STORAGE:
                                        </span>
                                        {adv.software?.storage || "N/A"}
                                      </div>
                                      <div>
                                        <span className="text-gray-400 dark:text-gray-500 ">
                                          PDF/DNT:
                                        </span>
                                        {adv.software?.pdfViewerEnabled
                                          ? "Si"
                                          : "No"}
                                        /
                                        {adv.software?.doNotTrack ? "Si" : "No"}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } catch (err: any) {
                                return (
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 break-all bg-gray-100 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 ">
                                    Error: {err.message} | Raw:
                                    {typeof msg.advancedInfo === "string"
                                      ? msg.advancedInfo
                                      : JSON.stringify(msg.advancedInfo)}
                                  </div>
                                );
                              }
                            })()}
                        </div>
                      </details>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {activeTab === "profiles" && (
          <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">

            {loading || !profilesLoaded ? (
              <div className="flex justify-center py-20">

                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : Object.keys(profiles).length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-white/20">

                <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ">
                  Nessun profilo identificato
                </h3>
                <p className="text-gray-500 dark:text-gray-400 ">
                  I profili analizzati dal tracker appariranno qui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max items-start">

                {paginatedProfiles.map((macro) => {
                  const profileColor = getProfileColor(macro.profileIds[0]);
                  const isProfileSelected = selectedProfiles.includes(macro.id);
                  return (
                    <div
                      key={macro.id}
                      className={`bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl border shadow-sm relative overflow-hidden flex flex-col group transition-colors duration-300 ${isProfileSelected ? "border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-100" : isProfileSelectMode ? "border-gray-300 dark:border-gray-500 hover:border-indigo-400 opacity-80 hover:opacity-100 cursor-pointer" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md"}`}
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
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-inner font-bold"
                          style={{ backgroundColor: profileColor }}
                        >

                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">

                          <h3
                            className="font-bold text-gray-900 dark:text-gray-100 text-lg sm:text-xl break-words whitespace-pre-wrap relative z-20"
                            title={macro.name}
                          >

                            {macro.name}
                          </h3>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">

                            {macro.msgCount}
                            {macro.msgCount === 1
                              ? "Spotted Creato"
                              : "Spotted Creati"}
                          </div>
                        </div>
                      </div>

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

                        {/* Suspects */}
                        <div>

                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> Sospetti
                          </div>
                          <div className="flex flex-wrap gap-1.5">

                            {macro.suspects.length > 0 ? (
                              macro.suspects.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-md text-[10px] font-semibold"
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
                                  Unisci
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
                                  profiles[pid]?.isolateFromAutoGrouping;
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
                                            ?.manualMergeProfileId ? (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleRiabilitaAutoGroup(pid);
                                            }}
                                            className="bg-green-50 hover:bg-green-100 text-green-600 font-bold px-2 py-1 rounded text-[10px] transition-colors"
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
        )}
        {/* Global Pagination */}
        {!loading &&
          activeTab !== "analytics" &&
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

                Pagina {currentPage} di
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
              Unisci Profili
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">

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
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-black transition-colors"
                />
              </div>
              <div>

                <label className="block text-sm font-semibold mb-1">
                  Potenziali Sospetti (Separati da virgola)
                </label>
                <input
                  type="text"
                  value={profileSuspectsInput}
                  onChange={(e) => setProfileSuspectsInput(e.target.value)}
                  placeholder="Es. Mario Rossi, Luigi Bianchi"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-black transition-colors"
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
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-black transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden"
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

                    {viewingMacro.profileIds.length}
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
                            ? adv.software?.canvasFingerprint ||
                              adv.s?.canvasFingerprint ||
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
                                      ,
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
                {macroModalTab === "identita" && (
                  <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4">

                      <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">

                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Identità
                        Separate
                      </h4>
                      <div className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-100 dark:border-blue-800 tracking-wider text-center">

                        Formato da {viewingMacro.profileIds.length}
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
                          <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" /> Hardware
                          Fingerprints e Dispositivi (
                          {viewingMacroStats.hardwareFingerprints.length})
                        </h4>
                        {viewingMacroStats.hardwareFingerprints.length > 0 ? (
                          <div className="flex flex-col gap-3">

                            {viewingMacroStats.hardwareFingerprints.map(
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
                            Nessun dato fingerprint...
                          </div>
                        )}
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">

                        <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-orange-600 mb-3 sm:mb-4 flex items-center gap-2">
                          <Globe className="w-4 h-4 sm:w-5 sm:h-5" /> Rete & IP (
                          {viewingMacroStats.ipAddresses.length +
                            viewingMacroStats.localIps.length}
                          )
                        </h4>
                        <div className="space-y-4">

                          {viewingMacroStats.ipAddresses.length > 0 && (
                            <div>

                              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">
                                IP PUBBLICI
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
                          {viewingMacroStats.localIps.length > 0 && (
                            <div>

                              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">
                                IP LOCALI (WEBRTC)
                              </div>
                              <div className="flex flex-wrap gap-2.5">

                                {viewingMacroStats.localIps.map((ip) => (
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
                          <Cpu className="w-4 h-4 sm:w-5 sm:h-5" /> Sicurezza & Configurazione
                        </h4>
                        <div className="flex flex-wrap gap-2.5">

                          {viewingMacroStats.botStatuses.map((bot) => (
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
        <StoryExportBeta
          message={exportingMessage}
          onClose={() => setExportingMessage(null)}
        />
      )}
    </div>
  );
}
