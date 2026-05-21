import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  X,
  Clock,
  Monitor,
  MapPin,
  Instagram,
  Cpu,
  User as UserIcon,
  ArrowRight,
  ChevronRight,
  Activity,
  Globe,
  Settings,
  Smartphone,
} from "lucide-react";
interface AnalyticsProps {
  messages: any[];
  profiles: Record<string, any>;
  macroProfiles: any[];
  visits: any[];
}
const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
];
const getPlatform = (m: any) => {
  const ua = m.deviceInfo?.userAgent || "";
  const platform = m.deviceInfo?.platform || "Sconosciuto";
  const adv = (m as any).parsedAdvanced;
  const platformLower = platform.toLowerCase();
  const uaLower = ua.toLowerCase();
  const maxTouches =
    adv?.hardware?.maxTouchPoints || adv?.h?.maxTouchPoints || 0;
  const isTouch =
    adv?.hardware?.touchSupport || adv?.h?.touchSupport || maxTouches > 0;
  /* Rilevamento iPad: esplicito o tramite Mac con touch support */ const isExplicitIpad =
    platformLower.includes("ipad") || uaLower.includes("ipad");
  const isIpadMaskedAsMac = platformLower.includes("mac") && isTouch;
  if (isExplicitIpad || isIpadMaskedAsMac) return "iPadOS";
  if (platformLower.includes("iphone") || uaLower.includes("iphone"))
    return "iOS";
  if (platformLower.includes("mac") || uaLower.includes("mac")) return "macOS";
  if (platformLower.includes("win") || uaLower.includes("windows"))
    return "Windows";
  if (platformLower.includes("android") || uaLower.includes("android"))
    return "Android";
  return "Altro";
};
const getBrowser = (m: any) => {
  const ua = m.deviceInfo?.userAgent || "";
  const isIg = ua.includes("Instagram");
  return isIg
    ? "Instagram In-App"
    : ua.includes("Chrome")
      ? "Chrome"
      : ua.includes("Safari") && !ua.includes("Chrome")
        ? "Safari"
        : ua.includes("Firefox")
          ? "Firefox"
          : "Altro";
};
type DetailView = {
  title: string;
  type: "messages" | "profiles" | "macro" | "visits";
  data: any[];
} | null;
export const Analytics: React.FC<AnalyticsProps> = ({
  messages,
  profiles,
  macroProfiles,
  visits,
}) => {
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [isReady, setIsReady] = useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);
  React.useEffect(() => {
    if (detailView) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailView]);

  const [trackAllBrowsers, setTrackAllBrowsers] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "settings", "analytics")).then(snap => {
      if (snap.exists()) {
        setTrackAllBrowsers(!!snap.data().trackAllBrowsers);
      }
      setLoadingSettings(false);
    }).catch((e) => {
      console.error(e);
      setLoadingSettings(false);
    });
  }, []);

  const toggleTrackAllBrowsers = async () => {
    const newVal = !trackAllBrowsers;
    setTrackAllBrowsers(newVal);
    try {
      await setDoc(doc(db, "settings", "analytics"), { trackAllBrowsers: newVal }, { merge: true });
    } catch (e) {
      console.error("Failed to update settings:", e);
      setTrackAllBrowsers(!newVal);
    }
  };

  const [isAdminTrackingIgnored, setIsAdminTrackingIgnored] = useState(
    localStorage.getItem("IGNORE_ANALYTICS") !== "false"
  );

  const toggleAdminTracking = () => {
    const newVal = !isAdminTrackingIgnored;
    setIsAdminTrackingIgnored(newVal);
    localStorage.setItem("IGNORE_ANALYTICS", newVal ? "true" : "false");
  };

  const stats = useMemo(() => {
    const totalViews = messages.length;
    const uniqueDevices = Object.keys(profiles).length;
    const identifiedUsers = macroProfiles.length;
    const spottedMessages = messages.filter((m) => (!m.type || m.type === "spotted") && (m.when || m.where)).length;
    const sondaggioMessages = messages.filter((m) => m.type === "sondaggio").length;
    const ricercaMessages = messages.filter((m) => m.type === "ricerca" || ((!m.type || m.type === "spotted") && !m.when && !m.where)).length;
    const safeVisits = Array.isArray(visits) ? visits : [];
    const totalVisits = safeVisits.length;
    const submittedVisits = safeVisits.filter((v: any) => v.hasSubmitted).length;
    const conversionRate = totalVisits > 0 ? ((submittedVisits / totalVisits) * 100).toFixed(1) : "0.0";
    
    // Visit field tracking
    let totalTimeWhen = 0, totalTimeWhere = 0, totalTimeLookingFor = 0;
    let countWhen = 0, countWhere = 0, countLookingFor = 0;
    const abandoned: Record<string, number> = { when: 0, where: 0, lookingFor: 0, instagram: 0, none: 0 };
    
    /* Traffic by Date */ 
    const last14Days = Array.from(
      { length: 14 },
      (_, i) => {
        const d = startOfDay(subDays(new Date(), 13 - i));
        return { _date: d, date: format(d, "dd/MM"), views: 0, actions: 0 };
      },
    );

    safeVisits.forEach((v: any) => {
      if (v.createdAt) {
        let vDate = v.createdAt;
        if (vDate.toDate) {
          vDate = vDate.toDate();
        } else if (typeof vDate === 'number') {
           vDate = new Date(vDate);
        } else if (typeof vDate === 'string') {
           vDate = new Date(vDate);
        }
        
        if (vDate instanceof Date) {
          const d = startOfDay(vDate).getTime();
          const dayStat = last14Days.find((day) => day._date.getTime() === d);
          if (dayStat) {
            dayStat.views += 1;
          }
        }
      }

      if (v.timeSpentWhen > 0) { totalTimeWhen += v.timeSpentWhen; countWhen++; }
      if (v.timeSpentWhere > 0) { totalTimeWhere += v.timeSpentWhere; countWhere++; }
      if (v.timeSpentLookingFor > 0) { totalTimeLookingFor += v.timeSpentLookingFor; countLookingFor++; }
      
      if (!v.hasSubmitted && v.abandonedAfter && v.abandonedAfter !== 'none') {
        let field = v.abandonedAfter.replace('timeSpent', ''); // strip 'timeSpent'
        field = field.charAt(0).toLowerCase() + field.slice(1);
        if (abandoned[field] !== undefined) abandoned[field]++;
      } else if (!v.hasSubmitted) {
        abandoned.none++;
      }
    });
    
    const avgTimeWhen = countWhen > 0 ? (totalTimeWhen / countWhen).toFixed(1) : "0";
    const avgTimeWhere = countWhere > 0 ? (totalTimeWhere / countWhere).toFixed(1) : "0";
    const avgTimeLookingFor = countLookingFor > 0 ? (totalTimeLookingFor / countLookingFor).toFixed(1) : "0";

    /* Browser/Platform */ const platforms: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    messages.forEach((m) => {
      if (m.createdAt) {
        const d = startOfDay(m.createdAt.toDate()).getTime();
        const dayStat = last14Days.find((day) => day._date.getTime() === d);
        if (dayStat) {
          if (m.lookingFor || m.type === 'sondaggio') dayStat.actions += 1;
        }
      }
      const pKey = getPlatform(m);
      platforms[pKey] = (platforms[pKey] || 0) + 1;
      const bKey = getBrowser(m);
      browsers[bKey] = (browsers[bKey] || 0) + 1;
    });
    const platformData = Object.entries(platforms)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const browserData = Object.entries(browsers)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return {
      totalViews,
      uniqueDevices,
      identifiedUsers,
      spottedMessages,
      sondaggioMessages,
      ricercaMessages,
      totalVisits,
      conversionRate,
      abandoned,
      avgTimeWhen,
      avgTimeWhere,
      avgTimeLookingFor,
      trafficData: last14Days,
      platformData,
      browserData,
    };
  }, [messages, profiles, macroProfiles, visits]);
  const kpis = [
    {
      label: "Totale Avvistamenti",
      value: stats.totalViews,
      bg: "bg-indigo-50 dark:bg-indigo-900/40 ",
      text: "text-indigo-600 dark:text-indigo-400 ",
      border:
        "group-hover:border-indigo-200 dark:group-hover:border-indigo-800 ",
      onClick: () =>
        setDetailView({
          title: "Totale Avvistamenti",
          type: "messages",
          data: messages,
        }),
    },
    {
      label: "Spotted Effettuati",
      value: stats.spottedMessages,
      bg: "bg-emerald-50 dark:bg-emerald-900/40 ",
      text: "text-emerald-600",
      border: "group-hover:border-emerald-200",
      onClick: () =>
        setDetailView({
          title: "Spotted Effettuati",
          type: "messages",
          data: messages.filter((m) => (!m.type || m.type === "spotted") && (m.when || m.where)),
        }),
    },
    {
      label: "Sondaggi Creati",
      value: stats.sondaggioMessages,
      bg: "bg-fuchsia-50 dark:bg-fuchsia-900/40 ",
      text: "text-fuchsia-600",
      border: "group-hover:border-fuchsia-200",
      onClick: () =>
        setDetailView({
          title: "Sondaggi Creati",
          type: "messages",
          data: messages.filter((m) => m.type === "sondaggio"),
        }),
    },
    {
      label: "Ricerche Create",
      value: stats.ricercaMessages,
      bg: "bg-blue-50 dark:bg-blue-900/40 ",
      text: "text-blue-600",
      border: "group-hover:border-blue-200",
      onClick: () =>
        setDetailView({
          title: "Ricerche Create",
          type: "messages",
          data: messages.filter((m) => m.type === "ricerca" || ((!m.type || m.type === "spotted") && !m.when && !m.where)),
        }),
    },
    {
      label: "Dispositivi Unici",
      value: stats.uniqueDevices,
      bg: "bg-orange-50 dark:bg-orange-900/40 ",
      text: "text-orange-600",
      border: "group-hover:border-orange-200",
      onClick: () =>
        setDetailView({
          title: "Dispositivi Unici",
          type: "profiles",
          data: Object.entries(profiles).map(([id, doc]) => ({ id, ...doc })),
        }),
    },
    {
      label: "Identità Unificate",
      value: stats.identifiedUsers,
      bg: "bg-purple-50 dark:bg-purple-900/40 ",
      text: "text-purple-600",
      border: "group-hover:border-purple-200",
      onClick: () =>
        setDetailView({
          title: "Identità Unificate",
          type: "macro",
          data: macroProfiles,
        }),
    },
    {
      label: "Totale Utenti (Entrati)",
      value: stats.totalVisits,
      bg: "bg-blue-50 dark:bg-blue-900/40 ",
      text: "text-blue-600 dark:text-blue-400 ",
      border: "group-hover:border-blue-200 dark:group-hover:border-blue-800 ",
      onClick: () =>
        setDetailView({
          title: "Totale Utenti (Entrati)",
          type: "visits",
          data: Array.isArray(visits) ? visits : [],
        }),
    },
    {
      label: "Conversione spotted",
      value: `${stats.conversionRate}%`,
      bg: "bg-pink-50 dark:bg-pink-900/40 ",
      text: "text-pink-600 dark:text-pink-400 ",
      border: "group-hover:border-pink-200 dark:group-hover:border-pink-800 ",
      onClick: () =>
        setDetailView({
          title: "Conversione spotted",
          type: "visits",
          data: (Array.isArray(visits) ? visits : []).filter((v: any) => v.hasSubmitted),
        }),
    },
  ];
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Settings Panel */}
      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">Tracciamento Accessi</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Modalità per raccogliere analytics degli utenti.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Solo Instagram</span>
            <button 
              type="button" 
              role="switch" 
              aria-checked={trackAllBrowsers}
              disabled={loadingSettings}
              onClick={toggleTrackAllBrowsers}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${trackAllBrowsers ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="sr-only">Raccogli da tutti i browser</span>
              <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${trackAllBrowsers ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </button>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Tutti i browser</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/40 border border-orange-100 dark:border-orange-800 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">Modalità Admin (Il tuo dispositivo)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Se attiva, il tuo dispositivo viene escluso dalle statistiche.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Traccia</span>
            <button 
              type="button" 
              role="switch" 
              aria-checked={isAdminTrackingIgnored}
              onClick={toggleAdminTracking}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 ${isAdminTrackingIgnored ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="sr-only">Ignora Admin</span>
              <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${isAdminTrackingIgnored ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </button>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Ignora Statistiche</span>
          </div>
        </div>
      </div>

      {/* Analytics Sections */}
      <div className="space-y-12">
        {/* SECTION 1: SPOTTED & MESSAGES */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-200">Avvistamenti & Spotted</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Statistiche relative ai messaggi ricevuti e traffico generato.</p>
              <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-1">Dati da {messages.length} log non ignorati</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {kpis.filter(k => ["Totale Avvistamenti", "Spotted Effettuati", "Sondaggi Creati", "Ricerche Create"].includes(k.label)).map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={kpi.onClick}
                className={`group bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden relative cursor-pointer hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="relative z-10 flex flex-col items-start">
                  <div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${kpi.text} mb-3 inline-flex items-center justify-center px-3 py-1.5 rounded-xl ${kpi.bg}`}>
                    {kpi.label}
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight group-hover:scale-[1.02] transition-transform transform origin-left">
                    {kpi.value.toLocaleString()}
                  </div>
                </div>
                <div className={`relative z-10 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-gray-400 dark:text-gray-500 ${kpi.text} transition-colors`}>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Vedi dettagli</span>
                  <ArrowRight className={`w-4 h-4 transform group-hover:translate-x-1 border border-transparent ${kpi.border} rounded-full transition-all`} />
                </div>
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${kpi.bg} opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`}></div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-3">
                  Andamento Traffico
                </h3>
                <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-500 px-3 py-1.5 rounded-xl">
                  Ultimi 14 Giorni
                </span>
              </div>
              <div className="relative h-[250px] sm:h-[350px] w-full mt-auto">
                {isReady && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} dy={15} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} dx={-10} />
                        <RechartsTooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }} cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }} />
                        <Area type="monotone" dataKey="views" name="Accessi Totali" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                        <Area type="monotone" dataKey="actions" name="Spotted Effettuati" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActions)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6 md:gap-8">
              <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col flex-1 relative group overflow-hidden">
                <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 mb-6 sticky z-10 flex items-center gap-2.5">
                  Sistemi Operativi
                </h3>
                <div className="h-[180px] sm:h-[200px] w-full relative z-10">
                  {isReady && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" className="cursor-pointer focus:outline-none transition-transform hover:scale-105 duration-300" onClick={(data) => setDetailView({ title: `Piattaforma: ${data.name}`, type: "messages", data: messages.filter((m) => getPlatform(m) === data.name) })}>
                            {stats.platformData.map((entry, index) => <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-6 relative z-10 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  {stats.platformData.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-bold tracking-wide bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      {p.name} <span className="text-gray-400 dark:text-gray-500 font-medium">({p.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col flex-1">
                <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2.5">
                  Sorgente Accessi (Browser)
                </h3>
                <div className="relative h-[200px] sm:h-[220px] w-full mt-2">
                  {isReady && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.browserData} layout="vertical" margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 600 }} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#4b5563", fontWeight: "bold" }} width={100} />
                          <RechartsTooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }} />
                          <Bar dataKey="value" name="Visite" fill="#8b5cf6" radius={[0, 6, 6, 0]} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={(data) => setDetailView({ title: `Sorgente: ${data.name}`, type: "messages", data: messages.filter((m) => getBrowser(m) === data.name) })}>
                            {stats.browserData.map((entry) => <Cell key={`cell-${entry.name}`} fill={COLORS[stats.browserData.indexOf(entry) % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: USERS & IDENTITIES */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/40 border border-orange-100 dark:border-orange-800 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-200">Dispositivi & Identità</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Analisi avanzata sulle identità univoche e i macro profili.</p>
              <p className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest mt-1">Dati da {Object.keys(profiles).length} profili / {macroProfiles.length} identità (non n.)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {kpis.filter(k => ["Dispositivi Unici", "Identità Unificate"].includes(k.label)).map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={kpi.onClick}
                className={`group bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden relative cursor-pointer hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="relative z-10 flex flex-col items-start">
                  <div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${kpi.text} mb-3 inline-flex items-center justify-center px-3 py-1.5 rounded-xl ${kpi.bg}`}>
                    {kpi.label}
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight group-hover:scale-[1.02] transition-transform transform origin-left">
                    {kpi.value.toLocaleString()}
                  </div>
                </div>
                <div className={`relative z-10 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-gray-400 dark:text-gray-500 ${kpi.text} transition-colors`}>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Vedi dettagli</span>
                  <ArrowRight className={`w-4 h-4 transform group-hover:translate-x-1 border border-transparent ${kpi.border} rounded-full transition-all`} />
                </div>
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${kpi.bg} opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`}></div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SECTION 3: VISITS & FORMS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-900/40 border border-pink-100 dark:border-pink-800 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-200">Visite & Form</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Comportamento degli utenti durante la compilazione del form.</p>
              <p className="text-[10px] font-bold text-pink-500 dark:text-pink-400 uppercase tracking-widest mt-1">Dati da {Array.isArray(visits) ? visits.length : 0} sessioni anonime / accessi completi monitorati.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {kpis.filter(k => ["Totale Utenti (Entrati)", "Conversione spotted"].includes(k.label)).map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={kpi.onClick}
                className={`group bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden relative border-pink-100 cursor-pointer hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="relative z-10 flex flex-col items-start">
                  <div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${kpi.text} mb-3 inline-flex items-center justify-center px-3 py-1.5 rounded-xl ${kpi.bg}`}>
                    {kpi.label}
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight transition-transform transform origin-left">
                    {kpi.value.toLocaleString()}
                  </div>
                </div>
                <div className={`relative z-10 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-gray-400 dark:text-gray-500 ${kpi.text} transition-colors`}>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Vedi dettagli</span>
                  <ArrowRight className={`w-4 h-4 transform group-hover:translate-x-1 border border-transparent ${kpi.border} rounded-full transition-all`} />
                </div>
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${kpi.bg} opacity-50 blur-2xl transition-transform duration-500 pointer-events-none`}></div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6 md:mt-8">
            {/* Abandonment Rate UI */}
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col flex-1">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2.5">
                Abbandoni per Campo
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">1. Quando?</span>
                  <span className="font-black text-red-500 text-lg">{stats.abandoned.when}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">2. Dove?</span>
                  <span className="font-black text-red-500 text-lg">{stats.abandoned.where}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">3. Chi cerchi?</span>
                  <span className="font-black text-red-500 text-lg">{stats.abandoned.lookingFor}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">Interrotto prima di scrivere</span>
                  <span className="font-black text-red-500 text-lg">{stats.abandoned.none}</span>
                </div>
              </div>
            </div>

            {/* Time spent UI */}
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col flex-1">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2.5">
                Tempo medio di compilazione
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">1. Quando?</span>
                  <span className="font-black text-indigo-500 text-lg">{stats.avgTimeWhen}s</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">2. Dove?</span>
                  <span className="font-black text-indigo-500 text-lg">{stats.avgTimeWhere}s</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="font-bold text-gray-600 dark:text-gray-400">3. Chi cerchi?</span>
                  <span className="font-black text-indigo-500 text-lg">{stats.avgTimeLookingFor}s</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {createPortal(
        <AnimatePresence>
          {detailView && (
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex justify-center items-end md:items-center p-0 md:p-6">
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 1 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden relative"
              >

              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-8 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 z-20 shrink-0">

                <div className="flex flex-col gap-1">

                  <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-3">

                    {detailView.title}
                    <span className="text-xs md:text-sm font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800 ">
                      {detailView.data.length}
                    </span>
                  </h2>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold tracking-wide uppercase">
                    Dettaglio statistica per la voce selezionata
                  </p>
                </div>
                <button
                  onClick={() => setDetailView(null)}
                  className="w-10 h-10 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-500 rounded-full text-gray-500 dark:text-gray-400 dark:text-gray-500 transition-all active:scale-95 shrink-0 ml-4"
                >

                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Content Body */}
              <div className="p-0 flex-1 overflow-auto bg-gray-50 dark:bg-gray-800/50 relative pb-10 md:pb-0">

                {/* MESSAGES VIEW */}
                {detailView.type === "messages" && (
                  <div className="flex flex-col w-full">

                    {/* Desktop Table View */}
                    <div className="hidden md:block p-8">

                      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">

                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 border-collapse">

                          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs tracking-widest border-b border-gray-200 dark:border-gray-600 ">

                            <tr>

                              <th className="px-6 py-4">Data</th>
                              <th className="px-6 py-4 w-1/3">Spotted</th>
                              <th className="px-6 py-4">
                                Informazioni Tecniche
                              </th>
                              <th className="px-6 py-4 text-center">
                                Sistema
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">

                            {detailView.data.map((m) => (
                              <tr
                                key={m.id}
                                className="hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
                              >

                                <td className="px-6 py-5 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">

                                  {m.createdAt
                                    ? format(
                                        m.createdAt.toDate(),
                                        "dd/MM/yy HH:mm",
                                      )
                                    : "-"}
                                </td>
                                <td className="px-6 py-5">

                                  {m.lookingFor ? (
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">

                                      <div className="font-black text-gray-800 dark:text-gray-200 mb-1 leading-relaxed">
                                        "{m.lookingFor}"
                                      </div>
                                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 flex gap-3">

                                        {m.where && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500 " />
                                            {m.where}
                                          </span>
                                        )}
                                        {m.when && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500 " />
                                            {m.when}
                                          </span>
                                        )}
                                      </div>
                                      {m.instagram && (
                                        <div className="text-xs text-pink-600 font-bold mt-2 pt-2 border-t border-gray-50 dark:border-gray-800 flex items-center gap-1.5">
                                          <Instagram className="w-3 h-3" /> @
                                          {m.instagram}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500 italic font-medium">
                                      ✨ Solo visualizzazione (Nessun messaggio)
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-5 min-w-[200px]">

                                  <div className="flex flex-col gap-2">

                                    {m.deviceInfo?.location && (
                                      <div className="text-[11px] bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 w-max font-bold">

                                        <MapPin className="w-3.5 h-3.5" />
                                        {m.deviceInfo.location.city},
                                        {m.deviceInfo.location.country}
                                      </div>
                                    )}
                                    {(() => {
                                      const adv = m.parsedAdvanced;
                                      const ip = adv?.network?.ip || adv?.n?.ip;
                                      if (!ip) return null;
                                      return (
                                        <div className="text-[11px] font-mono bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800 px-2.5 py-1.5 rounded-lg w-max font-bold flex items-center gap-1.5">
                                          <Monitor className="w-3.5 h-3.5" />
                                          IP: {ip}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-6 py-5">

                                  <div className="flex flex-col items-center gap-2">

                                    <span className="text-[11px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-xl font-black w-24 text-center">
                                      {getPlatform(m)}
                                    </span>
                                    <span className="text-[11px] bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-3 py-1.5 rounded-xl font-black w-24 text-center">
                                      {getBrowser(m)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Mobile Cards View */}
                    <div className="md:hidden flex flex-col p-4 gap-4">

                      {detailView.data.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col p-5 bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-200 dark:border-gray-600 shadow-sm gap-4"
                        >

                          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">

                            <span className="text-xs font-black text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">

                              <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 dark:text-gray-500 " />
                              {m.createdAt
                                ? format(
                                    m.createdAt.toDate(),
                                    "dd/MM/yyyy HH:mm",
                                  )
                                : "-"}
                            </span>
                            <div className="flex gap-1.5">

                              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">
                                {getPlatform(m)}
                              </span>
                              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">
                                {getBrowser(m)}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 ">

                            {m.lookingFor ? (
                              <div className="flex flex-col">

                                <div className="font-black text-gray-900 dark:text-gray-100 text-sm leading-relaxed mb-3">
                                  "{m.lookingFor}"
                                </div>
                                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 flex flex-wrap gap-x-4 gap-y-2">

                                  {m.where && (
                                    <span className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {m.where}
                                    </span>
                                  )}
                                  {m.when && (
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" /> {m.when}
                                    </span>
                                  )}
                                </div>
                                {m.instagram && (
                                  <div className="text-[11px] bg-pink-50 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-100 dark:border-pink-800 px-2.5 py-1.5 rounded-xl font-black mt-4 self-start flex items-center gap-1.5">
                                    <Instagram className="w-3.5 h-3.5" /> @
                                    {m.instagram}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 dark:text-gray-500 italic font-semibold text-center py-2">
                                ✨ Visita senza account o messaggio
                              </div>
                            )}
                          </div>
                          {(m.deviceInfo?.location ||
                            (() => {
                              const adv = m.parsedAdvanced;
                              return adv?.network?.ip || adv?.n?.ip;
                            })()) && (
                            <div className="flex flex-wrap gap-2">

                              {m.deviceInfo?.location && (
                                <div className="text-[10px] bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">

                                  <MapPin className="w-3 h-3" />
                                  {m.deviceInfo.location.city},
                                  {m.deviceInfo.location.country}
                                </div>
                              )}
                              {(() => {
                                const adv = m.parsedAdvanced;
                                const ip = adv?.network?.ip || adv?.n?.ip;
                                if (!ip) return null;
                                return (
                                  <div className="text-[10px] font-mono bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
                                    <Monitor className="w-3 h-3" /> IP: {ip}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* PROFILES VIEW */}
                {detailView.type === "profiles" && (
                  <div className="flex flex-col w-full">

                    <div className="hidden md:block p-8">

                      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">

                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 border-collapse">

                          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs tracking-widest border-b border-gray-200 dark:border-gray-600 ">

                            <tr>

                              <th className="px-6 py-4">
                                Identità Profilo
                              </th>
                              <th className="px-6 py-4 text-center">
                                Frequenza
                              </th>
                              <th className="px-6 py-4 w-1/2">
                                Cronologia Spotted Recenti
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">

                            {detailView.data.map((p) => {
                              const userMessages = messages.filter(
                                (m) => m.computedProfileId === p.id,
                              );
                              const searchMessages = userMessages.filter(
                                (m) => m.lookingFor,
                              );
                              return (
                                <tr
                                  key={p.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >

                                  <td className="px-6 py-5">

                                    <div className="flex items-center gap-4">

                                      <div
                                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-inner shrink-0"
                                        style={{
                                          backgroundColor: p.color || "#9ca3af",
                                        }}
                                      >

                                        <UserIcon className="w-6 h-6" />
                                      </div>
                                      <div>

                                        <div className="font-black text-gray-900 dark:text-gray-100 text-base">
                                          {p.name || "Senza Nome"}
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded mt-1.5 inline-block">
                                          {p.id}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-center">

                                    <span className="text-sm font-black px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl">

                                      {userMessages.length} accessi
                                      registrati
                                    </span>
                                  </td>
                                  <td className="px-6 py-5">

                                    {searchMessages.length > 0 ? (
                                      <div className="space-y-2.5 w-full">

                                        {searchMessages
                                          .slice(0, 3)
                                          .map((sm) => (
                                            <div
                                              key={sm.id}
                                              className="text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-xl border border-gray-200 dark:border-gray-600 font-bold shadow-sm"
                                            >
                                              "{sm.lookingFor}"
                                            </div>
                                          ))}
                                        {searchMessages.length > 3 && (
                                          <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 pt-2 text-center w-full block">
                                            +{searchMessages.length - 3} spotted
                                            nascosti
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 block w-max">
                                        Nessuno spotted pubblicato
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="md:hidden flex flex-col p-4 gap-4">

                      {detailView.data.map((p) => {
                        const userMessages = messages.filter(
                          (m) => m.computedProfileId === p.id,
                        );
                        const searchMessages = userMessages.filter(
                          (m) => m.lookingFor,
                        );
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col p-5 bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-200 dark:border-gray-600 shadow-sm gap-4"
                          >

                            <div className="flex items-center gap-4 pb-4 border-b border-gray-50 dark:border-gray-800">

                              <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-inner"
                                style={{
                                  backgroundColor: p.color || "#9ca3af",
                                }}
                              >

                                <UserIcon className="w-7 h-7" />
                              </div>
                              <div className="min-w-0 flex-1">

                                <div className="font-black text-gray-900 dark:text-gray-100 text-base truncate">
                                  {p.name || "Senza Nome"}
                                </div>
                                <div className="text-[10px] font-bold font-mono bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 dark:text-gray-500 rounded px-2.5 py-1 mt-1.5 truncate inline-block">
                                  {p.id}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 gap-3 text-center">

                              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Accessi Registrati
                              </span>
                              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block">
                                {userMessages.length}
                              </span>
                            </div>
                            <div className="flex flex-col gap-3 pt-2">

                              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg w-max border border-indigo-100 dark:border-indigo-800 ">
                                Ultimi Spotted
                              </span>
                              {searchMessages.length > 0 ? (
                                <div className="space-y-2 mt-1">

                                  {searchMessages.slice(0, 3).map((sm) => (
                                    <div
                                      key={sm.id}
                                      className="text-[11px] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm font-bold leading-relaxed"
                                    >
                                      "{sm.lookingFor}"
                                    </div>
                                  ))}
                                  {searchMessages.length > 3 && (
                                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold text-center py-2 tracking-widest uppercase">
                                      +{searchMessages.length - 3} spotted
                                      nascosti
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center block">
                                  Nessun messaggio spot
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* MACRO PROFILES VIEW */}
                {detailView.type === "macro" && (
                  <div className="flex flex-col w-full">

                    <div className="hidden md:block p-8">

                      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">

                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 border-collapse">

                          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs tracking-widest border-b border-gray-200 dark:border-gray-600 ">

                            <tr>

                              <th className="px-6 py-4">
                                Macro Profilo Condiviso
                              </th>
                              <th className="px-6 py-4 w-1/2">
                                Sub-Identità e IP Tracciati
                              </th>
                              <th className="px-6 py-4 text-right">
                                Ultima Acquisizione
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">

                            {detailView.data.map((m) => {
                              const relatedMsgs = messages.filter(
                                (msg) =>
                                  m.profileIds?.includes(
                                    msg.computedProfileId || msg.profileId,
                                  ) || msg.profileGroupId === m.id,
                              );
                              let mostRecentMsg: any = null;
                              const ips = new Set<string>();
                              relatedMsgs.forEach((msg) => {
                                if (
                                  msg.createdAt &&
                                  (!mostRecentMsg?.createdAt ||
                                    msg.createdAt.toMillis() >
                                      mostRecentMsg.createdAt.toMillis())
                                ) {
                                  mostRecentMsg = msg;
                                }
                                const adv = msg.parsedAdvanced || null;
                                const ip = adv
                                  ? adv.network?.ip || adv.n?.ip
                                  : null;
                                if (ip) ips.add(ip);
                              });
                              const uniqueIPs = Array.from(ips);
                              return (
                                <tr
                                  key={m.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >

                                  <td className="px-6 py-5">

                                    <div className="font-black text-gray-900 dark:text-gray-100 text-base mb-2 flex items-center gap-2">

                                      {m.name || "Identità Nascosta"}
                                    </div>
                                    {m.profileIds.length > 1 && (
                                      <div className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1 rounded-lg inline-block uppercase tracking-wider border border-purple-100 dark:border-purple-800 ">
                                        Unione di {m.profileIds.length} Modelli
                                        Padrone
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-5">

                                    <div className="flex flex-col gap-3">

                                      <div className="flex flex-wrap gap-2">

                                        {m.profileIds.map((pid: string) => (
                                          <span
                                            key={pid}
                                            className="text-[11px] font-bold font-mono bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 flex items-center gap-1.5"
                                          >

                                            <Monitor className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 " />
                                            {pid.substring(0, 12)}...
                                          </span>
                                        ))}
                                      </div>
                                      {uniqueIPs.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">

                                          {uniqueIPs.map((ip) => (
                                            <span
                                              key={ip}
                                              className="text-[11px] font-bold font-mono bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2.5 py-1 sm:py-1.5 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm flex items-center gap-1.5"
                                            >

                                              <Globe className="w-3.5 h-3.5 text-orange-500" />
                                              {ip}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-right">

                                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-xl whitespace-nowrap">
                                      {mostRecentMsg?.createdAt
                                        ? format(
                                            mostRecentMsg.createdAt.toDate(),
                                            "dd/MM/yyyy HH:mm",
                                          )
                                        : "Sconosciuto"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="md:hidden flex flex-col p-4 gap-4">

                      {detailView.data.map((m) => {
                        const relatedMsgs = messages.filter(
                          (msg) =>
                            m.profileIds?.includes(
                              msg.computedProfileId || msg.profileId,
                            ) || msg.profileGroupId === m.id,
                        );
                        let mostRecentMsg: any = null;
                        const ips = new Set<string>();
                        relatedMsgs.forEach((msg) => {
                          if (
                            msg.createdAt &&
                            (!mostRecentMsg?.createdAt ||
                              msg.createdAt.toMillis() >
                                mostRecentMsg.createdAt.toMillis())
                          ) {
                            mostRecentMsg = msg;
                          }
                          const adv = msg.parsedAdvanced || null;
                          const ip = adv ? adv.network?.ip || adv.n?.ip : null;
                          if (ip) ips.add(ip);
                        });
                        const uniqueIPs = Array.from(ips);
                        return (
                          <div
                            key={m.id}
                            className="flex flex-col p-5 bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-200 dark:border-gray-600 shadow-sm gap-4"
                          >

                            <div className="flex flex-col border-b border-gray-50 dark:border-gray-800 pb-4">

                              <div className="font-black text-gray-900 dark:text-gray-100 text-xl">
                                {m.name || "Identità Nascosta"}
                              </div>
                              {m.profileIds.length > 1 && (
                                <div className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1.5 rounded-lg inline-block w-max border border-purple-100 dark:border-purple-800 mt-2.5 uppercase tracking-widest">
                                  Condivide {m.profileIds.length} Identità
                                </div>
                              )}
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-col gap-3 rounded-2xl border border-gray-100 dark:border-gray-700 ">

                              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5" /> Dispositivi
                                Collegati
                              </span>
                              <div className="flex flex-wrap gap-2">

                                {m.profileIds.map((pid: string) => (
                                  <span
                                    key={pid}
                                    className="text-[10px] font-bold font-mono bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1"
                                  >

                                    {pid.substring(0, 10)}...
                                  </span>
                                ))}
                              </div>
                              {uniqueIPs.length > 0 && (
                                <>

                                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                                    <Globe className="w-3.5 h-3.5" /> IP
                                    Tracciati
                                  </span>
                                  <div className="flex flex-wrap gap-2">

                                    {uniqueIPs.map((ip) => (
                                      <span
                                        key={ip}
                                        className="text-[10px] font-bold font-mono bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm flex items-center gap-1"
                                      >

                                        {ip}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-2">

                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Ultima acquisizione
                              </span>
                              <span className="text-xs font-black text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5">

                                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 " />
                                {mostRecentMsg?.createdAt
                                  ? format(
                                      mostRecentMsg.createdAt.toDate(),
                                      "dd/MM/yyyy HH:mm",
                                    )
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VISITS VIEW */}
                {detailView.type === "visits" && (
                  <div className="flex flex-col w-full">
                    <div className="hidden md:block p-8">
                      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
                        <table className="min-w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest dark:text-gray-400">
                                Date / Time
                              </th>
                              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest dark:text-gray-400">
                                Status
                              </th>
                              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest dark:text-gray-400">
                                Timings
                              </th>
                              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest dark:text-gray-400">
                                Platform / Browser
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {detailView.data.map((v) => (
                              <tr key={v.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                      {v.createdAt ? format(v.createdAt.toDate ? v.createdAt.toDate() : new Date(v.createdAt), "dd/MM/yyyy HH:mm") : "-"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {v.hasSubmitted ? (
                                    <span className="px-2 py-1 text-xs font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">Completato</span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <span className="px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg inline-block w-fit">Abbandonato</span>
                                      {v.abandonedAfter && v.abandonedAfter !== 'none' && <span className="text-xs text-gray-500 dark:text-gray-400">dopo {v.abandonedAfter.replace('timeSpent', '')}</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">W: {v.timeSpentWhen || 0}s</span>
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">D: {v.timeSpentWhere || 0}s</span>
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">C: {v.timeSpentLookingFor || 0}s</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 space-x-1 flex items-center">
                                      {v.platform === "iOS" && <Smartphone className="inline w-4 h-4 text-gray-400"/>}
                                      {v.platform === "Android" && <Smartphone className="inline w-4 h-4 text-green-500"/>}
                                      {(v.platform === "Mac OS" || v.platform === "Windows") && <Monitor className="inline w-4 h-4 text-blue-500"/>}
                                      <span>{v.platform || "-"}</span>
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{v.browser || "-"}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="md:hidden flex flex-col p-4 gap-4">
                      {detailView.data.map((v) => (
                        <div key={v.id} className="flex flex-col p-5 bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-200 dark:border-gray-600 shadow-sm gap-4">
                          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="text-xs font-bold text-gray-500 flex items-center gap-2 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              {v.createdAt ? format(v.createdAt.toDate ? v.createdAt.toDate() : new Date(v.createdAt), "dd/MM/yyyy HH:mm") : "-"}
                            </span>
                            {v.hasSubmitted ? (
                              <span className="px-2 py-1 text-xs font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">Completato</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">Abbandonato</span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-500 mb-1 block dark:text-gray-400">Timings (s)</span>
                            <div className="flex gap-2">
                              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">When: {v.timeSpentWhen || 0}</span>
                              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Where: {v.timeSpentWhere || 0}</span>
                              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Who: {v.timeSpentLookingFor || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
};
