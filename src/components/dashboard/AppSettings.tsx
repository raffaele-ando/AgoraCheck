import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { readDocDataSafe } from "../../utils/firestoreRead";
import { Save, Link as LinkIcon, Users, Trash2, Plus, ShieldAlert, MessageCircle } from "lucide-react";
import { LogoSettings } from "./LogoSettings";
import { LOCATIONS, formatArea } from "../../data/locations";
import {
  LinkWidgetConfig,
  DEFAULT_LINK_CONFIG,
  loadLinkConfigFromDB,
  saveLinkConfigToDB,
  loadWhatsappLinksFromDB,
  saveWhatsappLinksToDB,
  EventItemConfig,
  EventWidgetConfig,
  DEFAULT_EVENT_ITEM,
  DEFAULT_EVENT_WIDGET_CONFIG,
  loadEventWidgetConfigFromDB,
  saveEventWidgetConfigToDB,
} from "../../data/settings";

/**
 * Avvisa prima di abbandonare la pagina con modifiche non salvate.
 *
 * In questa scheda convivono riquadri che salvano automaticamente (template)
 * e riquadri che richiedono un click su "Salva" (link WhatsApp, eventi, link
 * widget). Nulla segnalava la differenza: si potevano modificare dieci link e
 * perderli cambiando scheda.
 */
function useUnsavedGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

/** Indicatore riutilizzabile di stato di salvataggio. */
function DirtyBadge({ isDirty, isSaved }: { isDirty: boolean; isSaved: boolean }) {
  if (isSaved) {
    return (
      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
        Salvato
      </span>
    );
  }
  if (!isDirty) return null;
  return (
    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Modifiche non salvate
    </span>
  );
}

function WhatsappSettings() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [savedLinks, setSavedLinks] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newZone, setNewZone] = useState("");

  useEffect(() => {
    loadWhatsappLinksFromDB().then((data) => {
      setLinks(data);
      setSavedLinks(data);
    });
  }, []);

  const isDirty = JSON.stringify(links) !== JSON.stringify(savedLinks);
  useUnsavedGuard(isDirty);

  const handleSave = async () => {
    setSaveError("");
    try {
      // Puliamo i link vuoti (tranne _title e _subtitle)
      const cleaned = Object.fromEntries(Object.entries(links).filter(([k, v]) => (k.startsWith("_") ? true : v && v.trim() !== "")));
      await saveWhatsappLinksToDB(cleaned);
      setLinks(cleaned);
      setSavedLinks(cleaned);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e: any) {
      setSaveError("Salvataggio non riuscito: " + (e?.message || "errore sconosciuto"));
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <h3 className="text-[19px] font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <MessageCircle className="w-5 h-5 text-emerald-500" />
          I gruppi WhatsApp di ogni zona
        </h3>
        <div className="flex items-center gap-3">
        <DirtyBadge isDirty={isDirty} isSaved={isSaved} />
        <button
          onClick={handleSave}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${ isSaved ? "bg-emerald-700 hover:bg-emerald-800 text-white" : "bg-indigo-700 hover:bg-indigo-800 text-white" }`}
        >
          <Save className="w-4 h-4" />
          {isSaved ? "Salvato" : "Salva i gruppi"}
        </button>
        </div>
      </div>
      {saveError && (
        <div className="mb-4 text-[12px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-800">
          {saveError}
        </div>
      )}
      <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed dark:text-gray-400">
        Il riquadro verde in cima alla bacheca porta al gruppo della zona che
        lo studente ha scelto. «Tutte le altre» vale dove non hai messo un
        gruppo suo.
      </p>

      <div className="mb-6 space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
           <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">Il titolo del riquadro</label>
           <input type="text" value={links["_title"] || ""} placeholder="Unisciti alla nostra Community di {zona}" onChange={e => setLinks({...links, _title: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors" />
        </div>
        <div>
           <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">La riga sotto</label>
           <input type="text" value={links["_subtitle"] || ""} placeholder="Entra nel Gruppo WhatsApp di {zona}" onChange={e => setLinks({...links, _subtitle: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors" />
           <p className="text-[11px] text-gray-400 mt-1">Usa <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">{'{zona}'}</code> in titolo o sottotitolo per inserire dinamicamente il nome della zona o toglilo per lasciarlo fisso.</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {allLocations.map((loc) => {
          const val = links[loc] || "";
          return (
            <div key={loc} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300 w-36 shrink-0">
                {loc === "default" ? "Tutte le altre" : formatArea(loc, "")}
              </span>
              <input
                type="text"
                placeholder="https://chat.whatsapp.com/..."
                value={val}
                onChange={(e) => setLinks({ ...links, [loc]: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {customLocations.includes(loc) && (
                 <button onClick={() => {
                   const newLinks = {...links};
                   delete newLinks[loc];
                   setLinks(newLinks);
                 }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
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
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button onClick={handleAddZone} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-[13px] rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
}

function EventWidgetSettings() {
  const [config, setConfig] = useState<EventWidgetConfig>(DEFAULT_EVENT_WIDGET_CONFIG);
  const [savedConfig, setSavedConfig] = useState<EventWidgetConfig>(DEFAULT_EVENT_WIDGET_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    loadEventWidgetConfigFromDB().then(data => {
      const next = data && data.events ? data : { events: [] };
      setConfig(next);
      setSavedConfig(next);
    });
  }, []);

  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  useUnsavedGuard(isDirty);

  const handleSave = async () => {
    setSaveError("");
    try {
      await saveEventWidgetConfigToDB(config);
      setSavedConfig(config);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e: any) {
      setSaveError("Salvataggio non riuscito: " + (e?.message || "errore sconosciuto"));
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <h3 className="text-[19px] font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <span className="text-[19px]">🪩</span>
          I riquadri evento sul sito
        </h3>
        <div className="flex items-center gap-3">
        <DirtyBadge isDirty={isDirty} isSaved={isSaved} />
        <button
          onClick={handleSave}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${ isSaved ? "bg-emerald-700 hover:bg-emerald-800 text-white" : "bg-indigo-700 hover:bg-indigo-800 text-white" }`}
        >
          <Save className="w-4 h-4" />
          {isSaved ? "Salvato" : "Salva gli eventi"}
        </button>
        </div>
      </div>
      {saveError && (
        <div className="mb-4 text-[12px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-800">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {config.events.map((ev, index) => (
          <div key={ev.id} className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ev.enabled} onChange={e => handleUpdateEvent(ev.id, { enabled: e.target.checked })} className="w-4 h-4 text-[#DC5F00] rounded focus:ring-[#DC5F00] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300">Mostralo sul sito</span>
              </label>
              <button onClick={() => handleRemoveEvent(ev.id)} className="text-red-500 hover:text-red-700 text-[12px] font-semibold transition-colors">
                Togli questo evento
              </button>
            </div>
            
            <div>
               <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-300 mb-2">A chi lo mostri</label>
               <select value={ev.targetLocation} onChange={e => handleUpdateEvent(ev.id, { targetLocation: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors">
                 <option value="all">Tutti</option>
                 {Object.entries(LOCATIONS).flatMap(([city, areas]) => [city, ...areas.filter(a => a !== city)]).map((zona) => (
                   <option key={zona} value={zona}>{zona}</option>
                 ))}
               </select>
               <span className="block mt-2 text-[12px] text-gray-500 dark:text-gray-400">
                 Prima era un campo libero: un refuso nel nome della zona
                 faceva sparire il riquadro dal sito senza dirlo a nessuno.
               </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">Titolo</label>
                  <input type="text" value={ev.title} onChange={e => handleUpdateEvent(ev.id, { title: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
               </div>
               <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">Sottotitolo</label>
                  <input type="text" value={ev.subtitle} onChange={e => handleUpdateEvent(ev.id, { subtitle: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
               </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                   <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">Data (es. Mar 17)</label>
                   <input type="text" value={ev.date} onChange={e => handleUpdateEvent(ev.id, { date: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
                </div>
                <div className="flex-1">
                   <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-300 mb-2">Icona (una emoji, es. 🎧)</label>
                   <input type="text" value={ev.icon} onChange={e => handleUpdateEvent(ev.id, { icon: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
                </div>
            </div>
            <div>
               <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">Link Navigazione</label>
               <input type="url" value={ev.url} onChange={e => handleUpdateEvent(ev.id, { url: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
            </div>
            <div>
               <label className="block text-[12px] font-semibold text-gray-600 mb-2 dark:text-gray-300">URL Immagine di Sfondo</label>
               <input type="url" value={ev.backgroundImage} onChange={e => handleUpdateEvent(ev.id, { backgroundImage: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#DC5F00] transition-colors" />
            </div>
          </div>
        ))}
        
        <button onClick={handleAddEvent} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-[#DC5F00]/50 hover:text-[#DC5F00] transition-all flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Aggiungi un evento
        </button>
      </div>
    </div>
  );
}

export default function AppSettings({ isSuperAdmin, mockMode = false }: { isSuperAdmin?: boolean; mockMode?: boolean }) {
  const [linkConfig, setLinkConfig] = useState<LinkWidgetConfig>(DEFAULT_LINK_CONFIG);
  const [savedLinkConfig, setSavedLinkConfig] = useState<LinkWidgetConfig>(DEFAULT_LINK_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  const [linkSaveError, setLinkSaveError] = useState("");
  
  // Admins state
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    loadSettings();
  }, [isSuperAdmin, mockMode]);

  const loadSettings = async () => {
    if (mockMode) {
      setAdmins(["admin@example.com", "moderator@example.com"]);
      return;
    }
    
    try {
      const config = await loadLinkConfigFromDB();
      setLinkConfig(config);
      setSavedLinkConfig(config);
      
      if (isSuperAdmin) {
        try {
          const adminsSnapshot = await getDocs(collection(db, "admins"));
          const adminList = adminsSnapshot.docs.map((d: any) => d.id);
          setAdmins(adminList);
        } catch (adminErr) {
          console.warn("Could not load admins", adminErr);
        }
      }
    } catch (e) {
      console.warn("Could not load settings", e);
    }
  };

  const isLinkDirty =
    JSON.stringify(linkConfig) !== JSON.stringify(savedLinkConfig);
  useUnsavedGuard(isLinkDirty);

  const handleSaveLink = async () => {
    setLinkSaveError("");
    try {
      await saveLinkConfigToDB(linkConfig);
      setSavedLinkConfig(linkConfig);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e: any) {
      setLinkSaveError(
        "Salvataggio non riuscito: " + (e?.message || "errore sconosciuto"),
      );
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    const email = newAdmin.trim().toLowerCase();
    
    // La verifica precedente si limitava a includes("@"), quindi accettava
    // stringhe come "a@b" o "@" che non possono corrispondere ad alcun account.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setAdminError("Inserisci un indirizzo email valido.");
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

  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const handleRemoveAdmin = async (emailToRemove: string) => {
    // Conferma a due tempi nella riga stessa, invece di un confirm() bloccante.
    if (pendingRemoval !== emailToRemove) {
      setPendingRemoval(emailToRemove);
      setTimeout(
        () => setPendingRemoval((cur) => (cur === emailToRemove ? null : cur)),
        4000,
      );
      return;
    }
    setPendingRemoval(null);
    setAdminError("");
    try {
      await deleteDoc(doc(db, "admins", emailToRemove));
      setAdmins(admins.filter(a => a !== emailToRemove));
    } catch (e: any) {
      setAdminError(
        "Rimozione non riuscita: " + (e?.message || "errore sconosciuto"),
      );
    }
  };

  /*
   * Misurato: il contenuto stava in una colonna larga 768 pixel al centro di
   * 1440, con 336 pixel vuoti PER PARTE — il 47% della larghezza buttato — e
   * la pagina era alta 2598 pixel, cioe' due schermate e mezza di
   * scorrimento per riquadri che non hanno niente a che vedere l'uno con
   * l'altro. Sono blocchi indipendenti: vanno affiancati.
   */
  return (
    <div className="w-full max-w-[1200px] mx-auto py-8 text-left">
      <h1 className="text-[26px] font-black tracking-tight text-gray-900 dark:text-gray-100">
        Configurazione
      </h1>
      <p className="mt-1 mb-6 text-[13px] text-gray-600 dark:text-gray-300 max-w-2xl">
        Cose che si toccano una volta ogni tanto e poi restano così. Ogni
        riquadro si salva per conto suo: finché il pallino accanto al
        pulsante è acceso, quella modifica non è ancora sul sito.
      </p>
      
      <div className="columns-1 lg:columns-2 gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
        {/* Link config */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-[19px] font-bold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
            <LinkIcon className="w-5 h-5 text-indigo-500" />
            Il link da mettere in bio
          </h3>
          <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed dark:text-gray-400">
            E' la scritta che accompagna il link quando lo copi dalla schermata
            Messaggi per incollarlo su Instagram. Cambiarla qui la cambia
            ovunque.
          </p>

          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Cosa c'è scritto accanto al link
              </label>
              <input
                type="text"
                value={linkConfig.tagline}
                onChange={(e) => setLinkConfig({ ...linkConfig, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-[13px] font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            {linkSaveError && (
              <div className="text-[12px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-800">
                {linkSaveError}
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <DirtyBadge isDirty={isLinkDirty} isSaved={isSaved} />
              <button
                onClick={handleSaveLink}
                className={`flex items-center justify-center flex-1 gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${ isSaved ? "bg-emerald-700 hover:bg-emerald-800 text-white" : "bg-indigo-700 hover:bg-indigo-800 text-white" }`}
              >
                <Save className="w-4 h-4" />
                {isSaved ? "Salvato" : "Salva la scritta"}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-bl-[100px] pointer-events-none"></div>
            
            <h3 className="text-[19px] font-bold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
              <Users className="w-5 h-5 text-amber-500" />
              Chi altro può entrare
            </h3>
            <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed max-w-lg dark:text-gray-400">
              Le persone che aggiungi qui vedono i messaggi e possono
              archiviarli, ma <b>non</b> vedono indirizzi IP e telemetria e
              <b> non</b> possono aggiungere altre persone. Serve un indirizzo
              Gmail, perché l'accesso passa da lì.
            </p>

            {adminError && (
              <div className="mb-4 text-[12px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-800 inline-block">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-2 mb-6">
              <input
                type="email"
                placeholder="email@gmail.com"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                className="flex-1 max-w-sm px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-[13px] font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 shadow-md shadow-amber-500/20 text-white text-[13px] font-bold rounded-xl transition-all w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Dai accesso
              </button>
            </form>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                Chi ha accesso adesso
              </div>
              
              {admins.length === 0 ? (
                <div className="text-[13px] font-medium text-gray-400 dark:text-gray-500 italic py-2">
                  Per ora nessuno, oltre a te.
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {admins.map(adminEmail => (
                    <div key={adminEmail} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 group">
                      <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate pr-2">
                        {adminEmail}
                      </span>
                      <button
                        onClick={() => handleRemoveAdmin(adminEmail)}
                        className={`shrink-0 transition-colors text-[12px] font-semibold flex items-center gap-1 ${
                          pendingRemoval === adminEmail
                            ? "text-red-600"
                            : "text-gray-400 hover:text-red-500"
                        }`}
                        title="Rimuovi accesso"
                        aria-label={`Rimuovi accesso a ${adminEmail}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        {pendingRemoval === adminEmail && <span>Conferma</span>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 p-6 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-10 h-10 text-amber-400 mb-3" />
            <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">Accesso Limitato</h3>
            <p className="text-[13px] text-gray-500 max-w-sm dark:text-gray-400">
              Non hai i permessi di Super Admin. Solo il Super Admin può aggiungere o rimuovere altri amministratori.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

