import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Save, Link as LinkIcon, Users, Trash2, Plus, ShieldAlert, MessageCircle } from "lucide-react";
import { LogoSettings } from "./LogoSettings";
import { LOCATIONS } from "./HeaderVariations";

export interface LinkWidgetConfig {
  domain: string;
  tagline: string;
}

export const DEFAULT_LINK_CONFIG: LinkWidgetConfig = {
  domain: "agora.theproject.world",
  tagline: "SPOTTED",
};

export const loadLinkConfigFromDB = async (): Promise<LinkWidgetConfig> => {
  try {
    const configDoc = doc(db, "settings", "link_widget_config");
    const snapshot = await getDoc(configDoc);
    
    if (snapshot && snapshot.exists()) {
      return snapshot.data() as LinkWidgetConfig;
    }
  } catch (error) {
    console.error("Error loading link config from Firestore", error);
  }
  return DEFAULT_LINK_CONFIG;
};

export const saveLinkConfigToDB = async (config: LinkWidgetConfig) => {
  try {
    const configDoc = doc(db, "settings", "link_widget_config");
    await setDoc(configDoc, config);
  } catch (error) {
    console.error("Error saving link config to Firestore", error);
    throw error;
  }
};

// ======= WHATSAPP SETTINGS ======= //
export const loadWhatsappLinksFromDB = async (): Promise<Record<string, string>> => {
  try {
    const configDoc = doc(db, "settings", "whatsapp_links");
    const snapshot = await getDoc(configDoc);
    
    if (snapshot && snapshot.exists()) {
      return snapshot.data() || {};
    }
  } catch (error) {
    console.error("Error loading whatsapp links from Firestore", error);
  }
  return {};
};

export const saveWhatsappLinksToDB = async (config: Record<string, string>) => {
  try {
    const configDoc = doc(db, "settings", "whatsapp_links");
    await setDoc(configDoc, config);
  } catch (error) {
    console.error("Error saving whatsapp links to Firestore", error);
    throw error;
  }
};

// ======= EVENT WIDGET SETTINGS ======= //
export interface EventItemConfig {
  id: string;
  enabled: boolean;
  targetLocation: string;
  title: string;
  subtitle: string;
  date: string;
  url: string;
  icon: string;
  backgroundImage: string;
}

export interface EventWidgetConfig {
  events: EventItemConfig[];
  // Legacy
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  date?: string;
  url?: string;
  icon?: string;
  backgroundImage?: string;
}

export const DEFAULT_EVENT_ITEM: EventItemConfig = {
  id: "legacy",
  enabled: true,
  targetLocation: "all",
  title: "Fluo Party @ Magazzini",
  subtitle: "Musica elettronica ✨",
  date: "Mar 17",
  url: "#",
  icon: "🪩",
  backgroundImage: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
};

export const DEFAULT_EVENT_WIDGET_CONFIG: EventWidgetConfig = {
  events: []
};

export const loadEventWidgetConfigFromDB = async (): Promise<EventWidgetConfig> => {
  try {
    const configDoc = doc(db, "settings", "event_widget_config");
    const snapshot = await getDoc(configDoc);
    
    if (snapshot && snapshot.exists()) {
      const data = snapshot.data();
      let events: EventItemConfig[] = data.events || [];
      
      // Migrate legacy config
      if (events.length === 0 && data.title) {
        events.push({
          id: "legacy",
          enabled: data.enabled ?? true,
          targetLocation: "all",
          title: data.title,
          subtitle: data.subtitle || "",
          date: data.date || "",
          url: data.url || "",
          icon: data.icon || "",
          backgroundImage: data.backgroundImage || ""
        });
      }
      return { events };
    }
  } catch (error) {
    console.error("Error loading event widget config from Firestore", error);
  }
  return DEFAULT_EVENT_WIDGET_CONFIG;
};

export const saveEventWidgetConfigToDB = async (config: EventWidgetConfig) => {
  try {
    const configDoc = doc(db, "settings", "event_widget_config");
    await setDoc(configDoc, config);
  } catch (error) {
    console.error("Error saving event widget config to Firestore", error);
    throw error;
  }
};

function WhatsappSettings() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [newZone, setNewZone] = useState("");

  useEffect(() => {
    loadWhatsappLinksFromDB().then(setLinks);
  }, []);

  const handleSave = async () => {
    try {
      // Puliamo i link vuoti (tranne _title e _subtitle)
      const cleaned = Object.fromEntries(Object.entries(links).filter(([k, v]) => (k.startsWith("_") ? true : v && v.trim() !== "")));
      await saveWhatsappLinksToDB(cleaned);
      setLinks(cleaned);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert("Errore durante il salvataggio.");
    }
  };

  const handleAddZone = () => {
     if (newZone.trim() && !links[newZone.trim().toUpperCase()]) {
        setLinks({ ...links, [newZone.trim().toUpperCase()]: "" });
        setNewZone("");
     }
  };

  const predefinedLocations = ["default", ...Object.entries(LOCATIONS).flatMap(([city, areas]) => [city, ...areas.filter(a => a !== city)])];
  // Aggiungiamo anche le zone custom che sono state salvate in precedenza (che non sono predefinite e non iniziano per _)
  const customLocations = Object.keys(links).filter(k => !k.startsWith("_") && !predefinedLocations.includes(k));
  const allLocations = [...predefinedLocations, ...customLocations];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <MessageCircle className="w-5 h-5 text-green-500" />
          Gruppi WhatsApp per Zona
        </h3>
        <button
          onClick={handleSave}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${ isSaved ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20" }`}
        >
          <Save className="w-4 h-4" />
          {isSaved ? "Salvato!" : "Salva Link"}
        </button>
      </div>
      <p className="text-[13px] text-gray-500 mb-5 font-medium leading-relaxed dark:text-gray-400">
        Associa il link di un gruppo WhatsApp a ciascuna zona (città o sotto-zona).
        Puoi usare "default" se non c'è una zona specifica.
      </p>

      <div className="mb-6 space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
           <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Titolo Widget</label>
           <input type="text" value={links["_title"] || ""} placeholder="Unisciti alla nostra Community" onChange={e => setLinks({...links, _title: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 transition-colors" />
        </div>
        <div>
           <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Sottotitolo Widget</label>
           <input type="text" value={links["_subtitle"] || ""} placeholder="Entra nel Gruppo WhatsApp {zona}" onChange={e => setLinks({...links, _subtitle: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 transition-colors" />
           <p className="text-[10px] text-gray-400 mt-1">Usa <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">{'{zona}'}</code> per inserire dinamicamente il nome della zona o toglilo per lasciarlo fisso.</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {allLocations.map((loc) => {
          const val = links[loc] || "";
          return (
            <div key={loc} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-32 shrink-0">
                {loc}
              </span>
              <input
                type="text"
                placeholder="https://chat.whatsapp.com/..."
                value={val}
                onChange={(e) => setLinks({ ...links, [loc]: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 transition-colors"
              />
              {customLocations.includes(loc) && (
                 <button onClick={() => {
                   const newLinks = {...links};
                   delete newLinks[loc];
                   setLinks(newLinks);
                 }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                   <Trash2 className="w-4 h-4" />
                 </button>
              )}
            </div>
          );
        })}
        
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <input 
              type="text" 
              placeholder="Aggiungi nome Nuova Zona (es. NAPOLI CENTRO)" 
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 transition-colors"
            />
            <button onClick={handleAddZone} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
}

function EventWidgetSettings() {
  const [config, setConfig] = useState<EventWidgetConfig>(DEFAULT_EVENT_WIDGET_CONFIG);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadEventWidgetConfigFromDB().then(data => {
      if (data && data.events) {
        setConfig(data);
      } else {
        setConfig({ events: [] });
      }
    });
  }, []);

  const handleSave = async () => {
    try {
      await saveEventWidgetConfigToDB(config);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert("Errore durante il salvataggio.");
    }
  };

  const handleAddEvent = () => {
    setConfig({
      ...config,
      events: [
        ...config.events,
        {
          id: Math.random().toString(36).substring(7),
          enabled: true,
          targetLocation: "all",
          title: "Nuovo Evento",
          subtitle: "",
          date: "",
          url: "",
          icon: "🪩",
          backgroundImage: ""
        }
      ]
    });
  };

  const handleUpdateEvent = (id: string, updates: Partial<EventItemConfig>) => {
    setConfig({
      ...config,
      events: config.events.map(ev => ev.id === id ? { ...ev, ...updates } : ev)
    });
  };

  const handleRemoveEvent = (id: string) => {
    setConfig({
      ...config,
      events: config.events.filter(ev => ev.id !== id)
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <span className="text-xl">🪩</span>
          Widget Eventi Multisala
        </h3>
        <button
          onClick={handleSave}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${ isSaved ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-[#DC5F00] hover:bg-[#c95300] text-white shadow-md shadow-[#DC5F00]/20" }`}
        >
          <Save className="w-4 h-4" />
          {isSaved ? "Salvato!" : "Salva Eventi"}
        </button>
      </div>

      <div className="space-y-6">
        {config.events.map((ev, index) => (
          <div key={ev.id} className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ev.enabled} onChange={e => handleUpdateEvent(ev.id, { enabled: e.target.checked })} className="w-4 h-4 text-[#DC5F00] rounded focus:ring-[#DC5F00] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Abilita questo evento</span>
              </label>
              <button onClick={() => handleRemoveEvent(ev.id)} className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors">
                Rimuovi Evento
              </button>
            </div>
            
            <div>
               <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Città o Zona Destinazione</label>
               <input type="text" placeholder="'all' per tutti, oppure 'Milano', 'Politecnico Bovisa'..." value={ev.targetLocation} onChange={e => handleUpdateEvent(ev.id, { targetLocation: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Titolo</label>
                  <input type="text" value={ev.title} onChange={e => handleUpdateEvent(ev.id, { title: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
               </div>
               <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Sottotitolo</label>
                  <input type="text" value={ev.subtitle} onChange={e => handleUpdateEvent(ev.id, { subtitle: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
               </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                   <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Data (es. Mar 17)</label>
                   <input type="text" value={ev.date} onChange={e => handleUpdateEvent(ev.id, { date: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
                </div>
                <div className="flex-1">
                   <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Icona</label>
                   <input type="text" value={ev.icon} onChange={e => handleUpdateEvent(ev.id, { icon: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
                </div>
            </div>
            <div>
               <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">Link Navigazione</label>
               <input type="url" value={ev.url} onChange={e => handleUpdateEvent(ev.id, { url: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
            </div>
            <div>
               <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">URL Immagine di Sfondo</label>
               <input type="url" value={ev.backgroundImage} onChange={e => handleUpdateEvent(ev.id, { backgroundImage: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
            </div>
          </div>
        ))}
        
        <button onClick={handleAddEvent} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-[#DC5F00]/50 hover:text-[#DC5F00] transition-all flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Aggiungi Evento
        </button>
      </div>
    </div>
  );
}

export default function AppSettings({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const [linkConfig, setLinkConfig] = useState<LinkWidgetConfig>(DEFAULT_LINK_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  
  // Admins state
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    loadSettings();
  }, [isSuperAdmin]);

  const loadSettings = async () => {
    try {
      const config = await loadLinkConfigFromDB();
      setLinkConfig(config);
      
      if (isSuperAdmin) {
        try {
          const adminsSnapshot = await getDocs(collection(db, "admins"));
          const adminList = adminsSnapshot.docs.map((d: any) => d.id);
          setAdmins(adminList);
        } catch (adminErr) {
          console.error("Error loading admins", adminErr);
        }
      }
    } catch (e) {
      console.error("Error loading settings", e);
    }
  };

  const handleSaveLink = async () => {
    try {
      await saveLinkConfigToDB(linkConfig);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert("Errore durante il salvataggio.");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    const email = newAdmin.trim().toLowerCase();
    
    if (!email || !email.includes("@")) {
      setAdminError("Inserisci un'email valida.");
      return;
    }
    
    if (admins.includes(email)) {
      setAdminError("L'email è già un amministratore.");
      return;
    }

    try {
      await setDoc(doc(db, "admins", email), { addedAt: new Date().toISOString() });
      setAdmins([...admins, email]);
      setNewAdmin("");
    } catch (e: any) {
      setAdminError("Errore durante l'aggiunta. Assicurati di avere i permessi.");
    }
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere l'accesso a ${emailToRemove}?`)) return;
    try {
      await deleteDoc(doc(db, "admins", emailToRemove));
      setAdmins(admins.filter(a => a !== emailToRemove));
    } catch (e) {
      alert("Errore durante la rimozione dell'amministratore.");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 text-left">
      <h2 className="text-2xl font-black mb-6 text-gray-900 dark:text-white uppercase tracking-tight">Impostazioni Dashboard</h2>
      
      <div className="grid gap-6">
        {/* Link config */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
            <LinkIcon className="w-5 h-5 text-indigo-500" />
            Widget Link di Instagram
          </h3>
          <p className="text-[13px] text-gray-500 mb-5 font-medium leading-relaxed dark:text-gray-400">
            Personalizza l'etichetta del link (sticker link) che verrà usata all'interno della dashboard quando copierai il link automatico per i post.
          </p>

          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                Testo Sticker (Label)
              </label>
              <input
                type="text"
                value={linkConfig.tagline}
                onChange={(e) => setLinkConfig({ ...linkConfig, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="pt-2">
              <button
                onClick={handleSaveLink}
                className={`flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${ isSaved ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20" }`}
              >
                <Save className="w-4 h-4" />
                {isSaved ? "Salvato!" : "Salva Testo"}
              </button>
            </div>
          </div>
        </div>

        {/* Logo Config */}
        <LogoSettings />

        {/* WhatsApp Config */}
        <WhatsappSettings />

        {/* Event Widget Config */}
        <EventWidgetSettings />

        {/* Admins Config */}
        {isSuperAdmin ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 dark:bg-orange-500/10 rounded-bl-[100px] pointer-events-none"></div>
            
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
              <Users className="w-5 h-5 text-orange-500" />
              Gestione Dashboard Limitata
            </h3>
            <p className="text-[13px] text-gray-500 mb-5 font-medium leading-relaxed max-w-lg dark:text-gray-400">
              Come <b>Super Admin</b>, puoi concedere ad altri l'accesso alla dashboard (visione dei messaggi base, nessuna visibilità di IP e telemetria, nessuna gestione degli admin). Aggiungi qui la loro email Gmail.
            </p>

            {adminError && (
              <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-800 inline-block">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-2 mb-6">
              <input
                type="email"
                placeholder="email@gmail.com"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                className="flex-1 max-w-sm px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 text-white text-sm font-bold rounded-xl transition-all w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Aggiungi Admin
              </button>
            </form>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                Amministratori con Dashboard Limitata
              </div>
              
              {admins.length === 0 ? (
                <div className="text-sm font-medium text-gray-400 dark:text-gray-500 italic py-2">
                  Nessun admin aggiunto.
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {admins.map(adminEmail => (
                    <div key={adminEmail} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 group">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate pr-2">
                        {adminEmail}
                      </span>
                      <button
                        onClick={() => handleRemoveAdmin(adminEmail)}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        title="Rimuovi Accesso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/50 p-6 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-10 h-10 text-orange-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Accesso Limitato</h3>
            <p className="text-[13px] text-gray-500 max-w-sm dark:text-gray-400">
              Non hai i permessi di Super Admin. Solo il Super Admin può aggiungere o rimuovere altri amministratori.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
