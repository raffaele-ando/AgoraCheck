import React, { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, Trash2, Plus, RefreshCw } from "lucide-react";
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface CustomLogo {
  id: string;
  name: string;
  dataUrl: string;
}

import { LOCATIONS } from "./HeaderVariations";
import { Logo, clearLogoCache, updateLogoScalesCache } from "./Logo";

const getBaseLogos = () => {
  const locations = ["default", ...Object.entries(LOCATIONS).flatMap(([city, areas]) => [city, ...areas.filter(a => a !== city)])];
  return [
    { id: "default", label: "Logo Principale (Piattaforma Base)" },
    { id: "favicon", label: "Favicon (Icona scheda browser)" },
    { id: "brandmark_agora", label: "Brandmark Agorà (Quadrato)" },
    ...locations.filter(l => l !== "default").map(l => ({ id: `logo_${l}`, label: `Logo ${l}` }))
  ];
};

export function LogoSettings() {
  const [predefinedLogos, setPredefinedLogos] = useState(getBaseLogos());
  const [logos, setLogos] = useState<CustomLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(getBaseLogos()[0].id);
  const [saving, setSaving] = useState(false);
  
  const [scales, setScales] = useState({ zoneScale: 1, agoraScale: 1, customLogoScale: 1, spacing: 8 });
  const [savingScales, setSavingScales] = useState(false);

  const loadLogos = async () => {
    setLoading(true);
    try {
      // Carica configurazioni whatsapp per scoprire zone custom
      const waDoc = await getDoc(doc(db, "settings", "whatsapp_links"));
      if (waDoc.exists()) {
         const data = waDoc.data();
         const defaultZones = ["default", ...Object.entries(LOCATIONS).flatMap(([city, areas]) => [city, ...areas.filter(a => a !== city)])];
         const customZones = Object.keys(data).filter(k => !k.startsWith("_") && !defaultZones.includes(k));
         
         if (customZones.length > 0) {
            setPredefinedLogos([
              ...getBaseLogos(),
              ...customZones.map(z => ({ id: `logo_${z}`, label: `Logo [CUSTOM] ${z}` }))
            ]);
         }
      }

      const snap = await getDocs(collection(db, "logos"));
      const loaded: CustomLogo[] = [];
      snap.forEach(d => {
        loaded.push({ id: d.id, name: d.data().name, dataUrl: d.data().dataUrl });
      });
      setLogos(loaded);
      
      const scalesSnap = await getDoc(doc(db, "settings", "logo_scales"));
      if (scalesSnap.exists()) {
        const sc = scalesSnap.data();
        setScales({
           zoneScale: sc.zoneScale ?? 1,
           agoraScale: sc.agoraScale ?? 1,
           customLogoScale: sc.customLogoScale ?? 1,
           spacing: sc.spacing ?? 8
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogos();
  }, []);

  const saveScales = async () => {
    setSavingScales(true);
    try {
      await setDoc(doc(db, "settings", "logo_scales"), scales);
      updateLogoScalesCache(scales);
      setSavingScales(false);
    } catch(err) {
      console.error(err);
      setSavingScales(false);
      alert("Errore nel salvataggio delle grandezze");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedSlot) {
      alert("Seleziona prima il tipo di logo da caricare.");
      return;
    }

    setSaving(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const id = selectedSlot;
      const logoOption = predefinedLogos.find(l => l.id === id);
      const name = logoOption ? logoOption.label : id;
      
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const githubFilename = `${id}.${fileExt}`;
        
        const response = await fetch('/api/upload-github', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ filename: githubFilename, content: dataUrl })
        });
        
        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.error || "Errore durante l'upload su GitHub");
        }
        
        const { url: githubUrl } = await response.json();

        await setDoc(doc(db, "logos", id), { name, dataUrl: githubUrl });
        clearLogoCache();
        loadLogos();
      } catch (err: any) {
        console.error(err);
        alert("Errore durante il salvataggio: " + err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo logo?")) return;
    try {
      await deleteDoc(doc(db, "logos", id));
      clearLogoCache();
      loadLogos();
    } catch (e) {
      console.error(e);
      alert("Errore durante l'eliminazione.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <ImageIcon className="w-5 h-5 text-indigo-500" />
          Gestione Loghi
        </h3>
        <button onClick={loadLogos} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="Aggiorna">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-[13px] text-gray-500 mb-5 font-medium leading-relaxed">
        Seleziona quale logo o icona vuoi caricare. Le modifiche verranno applicate automaticamente su tutta la piattaforma (es. aggiornamento favicon).
      </p>

      {/* Impostazioni scala loghi */}
      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Grandezze Loghi/Scritte (Bacheca)</h4>
            <button onClick={saveScales} disabled={savingScales} className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors">
               {savingScales ? "Salvataggio..." : "Salva Grandezze"}
            </button>
        </div>
        
        {/* Anteprima in tempo reale */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center justify-center my-4 overflow-hidden relative" style={{ minHeight: "140px" }}>
           <div className="absolute top-2 left-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Anteprima</div>
           <Logo forceTextFallback={true} fallbackText="ANTEPRIMA" className="w-56 h-20" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Scritta Automatica Zona</label>
              <input type="range" min="0.5" max="2" step="0.05" value={scales.zoneScale} onChange={(e) => {
                  const newScales = {...scales, zoneScale: parseFloat(e.target.value)};
                  setScales(newScales);
                  updateLogoScalesCache(newScales);
              }} className="w-full accent-orange-500" />
              <div className="text-[10px] text-right font-mono text-gray-400 mt-1">{Math.round(scales.zoneScale * 100)}%</div>
           </div>
           <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Scritta/Logo Agorà (Sotto)</label>
              <input type="range" min="0.5" max="2" step="0.05" value={scales.agoraScale} onChange={(e) => {
                  const newScales = {...scales, agoraScale: parseFloat(e.target.value)};
                  setScales(newScales);
                  updateLogoScalesCache(newScales);
              }} className="w-full accent-orange-500" />
              <div className="text-[10px] text-right font-mono text-gray-400 mt-1">{Math.round(scales.agoraScale * 100)}%</div>
           </div>
           <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Distanza Verticale</label>
              <input type="range" min="-20" max="40" step="1" value={scales.spacing} onChange={(e) => {
                  const newScales = {...scales, spacing: parseFloat(e.target.value)};
                  setScales(newScales);
                  updateLogoScalesCache(newScales);
              }} className="w-full accent-orange-500" />
              <div className="text-[10px] text-right font-mono text-gray-400 mt-1">{scales.spacing}px</div>
           </div>
           <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Immagine Logo Personalizzato</label>
              <input type="range" min="0.5" max="2" step="0.05" value={scales.customLogoScale} onChange={(e) => {
                  const newScales = {...scales, customLogoScale: parseFloat(e.target.value)};
                  setScales(newScales);
                  updateLogoScalesCache(newScales);
              }} className="w-full accent-orange-500" />
              <div className="text-[10px] text-right font-mono text-gray-400 mt-1">{Math.round(scales.customLogoScale * 100)}%</div>
           </div>
        </div>
      </div>

      {/* Upload nuovo logo */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Tipo Logo</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {predefinedLogos.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:w-auto self-end w-full">
           <label className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 ${saving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white shadow-md shadow-indigo-600/20 text-sm font-bold rounded-lg transition-all cursor-pointer`}>
              <Upload className="w-4 h-4" />
              {saving ? "Caricamento..." : "Carica Logo"}
              <input type="file" accept="image/png, image/jpeg, image/svg+xml, image/webp" className="hidden" onChange={handleUpload} disabled={saving || !selectedSlot} />
           </label>
        </div>
      </div>

      {/* Lista loghi */}
      {loading ? (
        <div className="text-sm font-medium text-gray-400 dark:text-gray-500 italic py-4 text-center">
          Caricamento loghi...
        </div>
      ) : logos.length === 0 ? (
        <div className="text-sm font-medium text-gray-400 dark:text-gray-500 italic py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Nessun logo caricato. Aggiungine uno usando il modulo qui sopra.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {logos.map(logo => (
            <div key={logo.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col group">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 aspect-video flex-1 flex items-center justify-center relative">
                <img src={logo.dataUrl} alt={logo.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate pr-2" title={logo.name}>{logo.name}</span>
                <button
                  onClick={() => handleDelete(logo.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Elimina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
