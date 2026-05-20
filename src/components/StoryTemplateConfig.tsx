import React, { useState, useRef, useEffect } from "react";
import { Upload, Settings, Type, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export interface BoxConfig {
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  enabled: boolean;
  alignItems?: "flex-start" | "center" | "flex-end";
  justifyContent?: "flex-start" | "center" | "flex-end";
  textAlign?: "left" | "center" | "right";
}

export interface TemplateConfig {
  chi: BoxConfig;
  quando: BoxConfig;
  dove: BoxConfig;
  box4?: BoxConfig;
  box5?: BoxConfig;
}

export const DEFAULT_CONFIG: TemplateConfig = {
  chi: { top: 20, left: 10, width: 80, height: 25, fontSize: 60, color: "#000000", enabled: true, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
  quando: { top: 50, left: 10, width: 80, height: 15, fontSize: 40, color: "#000000", enabled: true, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
  dove: { top: 70, left: 10, width: 80, height: 15, fontSize: 40, color: "#000000", enabled: true, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
  box4: { top: 85, left: 10, width: 80, height: 10, fontSize: 30, color: "#000000", enabled: false, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
  box5: { top: 90, left: 10, width: 80, height: 10, fontSize: 30, color: "#000000", enabled: false, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
};

import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const saveImageToDB = async (dataUrl: string, target: string, mode: string) => {
  try {
    const imgDoc = doc(db, "settings", `story_template_image_${target}_${mode}`);
    await setDoc(imgDoc, { bgImage: dataUrl });
  } catch (error) {
    console.error("Error saving image to Firestore", error);
    throw error;
  }
};

export const loadImageFromDB = async (target: string, mode: string) => {
  try {
    const imgDoc = doc(db, "settings", `story_template_image_${target}_${mode}`);
    const snapshot = await getDoc(imgDoc);
    if (snapshot.exists()) {
      return snapshot.data().bgImage as string;
    }
    
    // Legacy fallback
    if (target === "DEFAULT" && mode === "spotted") {
      const oldDoc = doc(db, "settings", "story_template_image");
      const oldSnap = await getDoc(oldDoc);
      if (oldSnap.exists()) {
        return oldSnap.data().bgImage as string;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error loading image from Firestore", error);
    return null;
  }
};

export const clearImageFromDB = async (target: string, mode: string) => {
  try {
    const imgDoc = doc(db, "settings", `story_template_image_${target}_${mode}`);
    await deleteDoc(imgDoc);
  } catch (error) {
    console.error("Error clearing image from Firestore", error);
    throw error;
  }
};

export const saveConfigToDB = async (config: TemplateConfig, mode: string) => {
  try {
    const configDoc = doc(db, "settings", `story_template_config_${mode}`);
    await setDoc(configDoc, { config });
  } catch (error) {
    console.error("Error saving config to Firestore", error);
    throw error;
  }
};

export const loadConfigFromDB = async (mode: string) => {
  try {
    const configDoc = doc(db, "settings", `story_template_config_${mode}`);
    const snapshot = await getDoc(configDoc);
    if (snapshot.exists() && snapshot.data().config) {
      return snapshot.data().config as TemplateConfig;
    }

    // Legacy fallback
    if (mode === "spotted") {
      const oldDoc = doc(db, "settings", "story_template_config");
      const oldSnap = await getDoc(oldDoc);
      if (oldSnap.exists() && oldSnap.data().config) {
        return oldSnap.data().config as TemplateConfig;
      }
    }
  } catch (error) {
    console.error("Error loading config from Firestore", error);
  }
  return null;
};

export const AutoScalingText = ({ text, config, showBorders, isActive, label }: { text: string; config: BoxConfig; showBorders?: boolean; isActive?: boolean; label?: string; }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [currentSize, setCurrentSize] = useState(config.fontSize);

  useEffect(() => {
    setCurrentSize(config.fontSize);
  }, [text, config.fontSize, config.width, config.height]);

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return;
    const container = containerRef.current;
    const textEl = textRef.current;
    
    // Check if overflowing
    if (textEl.scrollHeight > container.clientHeight || textEl.scrollWidth > container.clientWidth) {
      if (currentSize > 12) {
        // use setTimeout to avoid React loop warnings
        setTimeout(() => {
          setCurrentSize((prev) => Math.max(12, prev - 2));
        }, 0);
      }
    }
  }, [currentSize, text, config.width, config.height]);

  if (!config.enabled || !text) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: `${config.top}%`,
        left: `${config.left}%`,
        width: `${config.width}%`,
        height: `${config.height}%`,
        display: "flex",
        alignItems: config.alignItems || "flex-start",
        justifyContent: config.justifyContent || "flex-start",
        overflow: "visible", // let it temporarily overflow during calculation
        border: showBorders ? (isActive ? "2px dashed #4f46e5" : "1px dashed rgba(0,0,0,0.3)") : "none",
        backgroundColor: showBorders ? (isActive ? "rgba(79, 70, 229, 0.1)" : "rgba(0,0,0,0.05)") : "transparent",
        boxSizing: showBorders ? "border-box" : "content-box",
        zIndex: 10,
      }}
    >
      {showBorders && label && (
        <div style={{ position: 'absolute', top: -20, left: 0, fontSize: 12, fontWeight: 'bold', color: isActive ? '#4f46e5' : 'rgba(0,0,0,0.5)', backgroundColor: 'white', padding: '0 4px', borderRadius: 4, whiteSpace: 'nowrap' }}>
          {label}
        </div>
      )}
      <div
        ref={textRef}
        style={{
          color: config.color,
          fontSize: `${currentSize}px`,
          textAlign: config.textAlign || "left",
          fontWeight: "bold", // Force Bold
          fontFamily: "Inter, sans-serif",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: "1.2",
          width: "100%",
        }}
      >
        {text}
      </div>
    </div>
  );
};

import { LOCATIONS } from "./HeaderVariations";

export default function StoryTemplateConfig() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [activeTab, setActiveTab] = useState<keyof TemplateConfig>("chi");
  const [isDBReady, setIsDBReady] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  
  const [selectedMode, setSelectedMode] = useState<"spotted" | "sondaggio" | "risultati" | "risultati_sondaggio" | "ricerca">("spotted");
  const [selectedTarget, setSelectedTarget] = useState<string>("DEFAULT");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDBReady(false);
    setBackgroundImage(null);
    setConfig(DEFAULT_CONFIG);
    setActiveTab("chi");

    const loadData = async () => {
      try {
        const img = await loadImageFromDB(selectedTarget, selectedMode);
        setBackgroundImage(img || null);
        
        const savedConfig = await loadConfigFromDB(selectedMode);
        if (savedConfig) {
          setConfig(savedConfig);
        } else {
          setConfig(DEFAULT_CONFIG);
        }
      } catch (err) {
        console.warn("Could not load data from DB", err);
      } finally {
        setIsDBReady(true);
      }
    };
    loadData();
  }, [selectedMode, selectedTarget]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        setPreviewScale(width / 1080);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const handleConfigChange = (key: keyof BoxConfig, value: any) => {
    const activeConfig = config[activeTab] || DEFAULT_CONFIG[activeTab];
    const newConfig = { 
      ...config, 
      [activeTab]: { ...activeConfig, [key]: value } 
    };
    setConfig(newConfig);
    saveConfigToDB(newConfig, selectedMode).then(() => {
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // Compress image using canvas before saving
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxWidth = 1080;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL("image/jpeg", 0.7);
            setBackgroundImage(compressedUrl);
            try {
              await saveImageToDB(compressedUrl, selectedTarget, selectedMode);
              setSavedStatus(true);
              setTimeout(() => setSavedStatus(false), 2000);
            } catch (err) {
              console.warn("Could not save image to Firestore", err);
              alert("Errore durante il salvataggio o immagine ancora troppo grande per il database.");
            }
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearTemplate = async () => {
    setBackgroundImage(null);
    await clearImageFromDB(selectedTarget, selectedMode);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const activeBox = (config[activeTab] || DEFAULT_CONFIG[activeTab]) as BoxConfig;

  // Flattiamo le options per il target: DEFAULT + tutte le aree e città
  const targetOptions = ["DEFAULT", ...Object.entries(LOCATIONS).flatMap(([city, areas]) => [city, ...areas.filter(a => a !== city)])];

  const getTabsForMode = () => {
    if (selectedMode === "spotted") return ["chi", "quando", "dove"] as const;
    if (selectedMode === "ricerca") return ["chi"] as const;
    if (selectedMode === "sondaggio" || selectedMode === "risultati_sondaggio") return ["chi", "quando", "dove", "box4", "box5"] as const;
    return ["chi", "quando", "dove"] as const; // risultati
  };
  
  const getLabelForModeAndTab = (tab: keyof TemplateConfig) => {
    if (selectedMode === "ricerca") {
      if (tab === "chi") return "Testo Ricerca";
    }
    if (selectedMode === "spotted") {
      if (tab === "chi") return "Cosa/Chi";
      if (tab === "quando") return "Quando";
      if (tab === "dove") return "Dove";
    }
    if (selectedMode === "sondaggio") {
      if (tab === "chi") return "Domanda";
      if (tab === "quando") return "Opzione 1";
      if (tab === "dove") return "Opzione 2";
      if (tab === "box4") return "Opzione 3";
      if (tab === "box5") return "Opzione 4";
    }
    if (selectedMode === "risultati") {
      if (tab === "chi") return "Testo Spotted";
      if (tab === "quando") return "Esito (Trovato/a)";
      if (tab === "dove") return "Extra / Dettagli";
    }
    if (selectedMode === "risultati_sondaggio") {
      if (tab === "chi") return "Domanda";
      if (tab === "quando") return "Esito Opzione 1";
      if (tab === "dove") return "Esito Opzione 2";
      if (tab === "box4") return "Esito Opzione 3";
      if (tab === "box5") return "Esito Opzione 4";
    }
    return tab;
  };

  const [viewMode, setViewMode] = useState<"editor" | "gallery">("editor");
  const [galleryData, setGalleryData] = useState<{ target: string, mode: string, hasImage: boolean, imgUrl?: string, config?: TemplateConfig }[]>([]);

  const loadGallery = async () => {
    try {
      const snap = await getDocs(collection(db, "settings"));
      const savedDocs = snap.docs.filter(d => d.id.startsWith("story_template_image_"));
      const docMap = new Map(savedDocs.map(d => [d.id, d.data().bgImage]));
      
      const configMap = new Map<string, TemplateConfig>();
      for (const mode of ["spotted", "sondaggio", "risultati", "risultati_sondaggio", "ricerca"]) {
          const configDoc = snap.docs.find(d => d.id === `story_template_config_${mode}`);
          if (configDoc && configDoc.data().config) {
             configMap.set(mode, configDoc.data().config);
          } else if (mode === "spotted") {
             const legacyConfig = snap.docs.find(d => d.id === `story_template_config`);
             if (legacyConfig && legacyConfig.data().config) {
                 configMap.set(mode, legacyConfig.data().config);
             }
          }
      }
      
      const allCombinations: { target: string, mode: string, hasImage: boolean, imgUrl?: string, config?: TemplateConfig }[] = [];
      for (const target of targetOptions) {
        for (const mode of ["spotted", "sondaggio", "risultati", "risultati_sondaggio", "ricerca"]) {
          const docId = `story_template_image_${target}_${mode}`;
          const bgImage = docMap.get(docId) || null;
          
          let hasImage = !!bgImage;
          let imgUrl = bgImage;
          
          if (!hasImage && target === "DEFAULT" && mode === "spotted") {
             const legacyDoc = snap.docs.find(d => d.id === "story_template_image");
             if (legacyDoc) {
                hasImage = true;
                imgUrl = legacyDoc.data().bgImage;
             }
          }
          
          const config = configMap.get(mode) || DEFAULT_CONFIG;
          
          allCombinations.push({ target, mode, hasImage, imgUrl, config });
        }
      }
      setGalleryData(allCombinations);
    } catch (e) {
      console.error(e);
    }
  };
  
  useEffect(() => {
    if (viewMode === "gallery") {
      loadGallery();
    }
  }, [viewMode]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode("editor")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === "editor" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
        >
          Editor Template
        </button>
        <button
          onClick={() => setViewMode("gallery")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === "gallery" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
        >
          Riepilogo Template
        </button>
      </div>

      {viewMode === "gallery" && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
           <h2 className="text-lg font-black mb-4 dark:text-white">Stato Template Salvati</h2>
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
             {galleryData.map(item => (
                <div key={`${item.target}-${item.mode}`} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-800/50 hover:border-indigo-300 hover:shadow-md transition-all">
                   <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                     <div className="flex-1 truncate">
                       <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest truncate dark:text-gray-400">{item.target}</div>
                       <div className="text-[11px] sm:text-sm font-black capitalize truncate">{item.mode}</div>
                     </div>
                     {item.hasImage ? (
                       <CheckCircle2 className="w-4 h-4 text-green-500 ml-1 shrink-0" />
                     ) : (
                       <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 ml-1 shrink-0" />
                     )}
                   </div>
                   <div className="p-3 flex items-center justify-center flex-1" onClick={() => {
                      setSelectedTarget(item.target);
                      setSelectedMode(item.mode as any);
                      setViewMode("editor");
                   }}>
                      {item.hasImage && item.imgUrl ? (
                         <div className="relative w-full aspect-[9/16] bg-black/5 rounded flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer" title="Clicca per modificare">
                            <img src={item.imgUrl} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 pointer-events-none">
                              {item.config && (item.mode === "sondaggio" || item.mode === "risultati_sondaggio" ? ["chi", "quando", "dove", "box4", "box5"] : item.mode === "ricerca" ? ["chi"] : ["chi", "quando", "dove"]).map((key) => {
                                const boxCnf = (item.config as any)[key];
                                if (!boxCnf || !boxCnf.enabled) return null;
                                return (
                                  <div key={key} style={{
                                    position: 'absolute',
                                    top: `${boxCnf.top}%`,
                                    left: `${boxCnf.left}%`,
                                    width: `${boxCnf.width}%`,
                                    height: `${boxCnf.height}%`,
                                    border: '1px dashed rgba(79, 70, 229, 0.4)',
                                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                                  }} />
                                )
                              })}
                            </div>
                         </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center h-full text-gray-400 aspect-[9/16] w-full border border-dashed border-gray-300 dark:border-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                           <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                           <span className="text-[10px] font-bold text-center">Aggiungi</span>
                         </div>
                      )}
                   </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {viewMode === "editor" && (
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Preview */}
        <div className="flex-1 bg-gray-100 dark:bg-black/50 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="w-full max-w-[320px] mx-auto flex items-center justify-center mb-4">
             <div className="relative w-full aspect-[9/16] bg-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden dark:bg-gray-900" ref={containerRef}>
                <div
                  style={{
                    width: 1080,
                    height: 1920,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    backgroundColor: "#fff",
                    overflow: "hidden",
                  }}
                >
                  {backgroundImage && (
                    <img 
                      src={backgroundImage} 
                      alt="background" 
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        zIndex: 0,
                      }} 
                    />
                  )}
                  <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
                    {getTabsForMode().map(tab => {
                      const boxCnf = config[tab] || DEFAULT_CONFIG[tab];
                      return (
                        <AutoScalingText 
                          key={tab}
                          text={getLabelForModeAndTab(tab)} 
                          config={boxCnf as BoxConfig} 
                          showBorders={true} 
                          isActive={activeTab === tab} 
                          label={getLabelForModeAndTab(tab)} 
                        />
                      );
                    })}
                  </div>
                </div>
                {!backgroundImage && isDBReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Nessun template caricato</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className="flex-1 flex flex-col max-h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-500" />
                Impostazioni Template
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sfondi per Target e Configurazioni per Modalità</p>
            </div>
            {savedStatus && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                <CheckCircle2 className="w-4 h-4" /> Salvato 
              </span>
            )}
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
            {/* Mode and Target Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 dark:text-gray-400">Modalità (Stile Testi)</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                  <option value="spotted">Spotted</option>
                  <option value="ricerca">Ricerca (Solo testo)</option>
                  <option value="sondaggio">Sondaggio</option>
                  <option value="risultati">Risultati Spotted</option>
                  <option value="risultati_sondaggio">Risultati Sondaggio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 dark:text-gray-400">Ateneo/Zona (Sfondo)</label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                  {targetOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === "DEFAULT" ? "Generico (Default)" : opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Background Template */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Sfondo ({selectedTarget} - {selectedMode})
              </label>
              
              <div className="flex items-center gap-3">
                <label className="flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium px-4 py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  <span>Carica Sfondo PNG/JPG</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                {backgroundImage && (
                  <button 
                    onClick={clearTemplate}
                    className="p-3 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                    title="Rimuovi sfondo"
                  >
                    <span className="font-bold">Rimuovi</span>
                  </button>
                )}
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Box Selector */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4" /> Selezione Riquadro Testo
              </label>

              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
                {getTabsForMode().map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[80px] text-xs sm:text-sm font-bold capitalize py-2 px-2 sm:px-3 rounded-lg transition-colors whitespace-nowrap ${ activeTab === tab ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300' }`}
                  >
                    {getLabelForModeAndTab(tab)}
                  </button>
                ))}
              </div>

              {/* Box Settings */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">Box: {getLabelForModeAndTab(activeTab)}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={activeBox.enabled}
                      onChange={(e) => handleConfigChange("enabled", e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Attivo</span>
                  </label>
                </div>

                <div className={`space-y-4 transition-opacity ${activeBox.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Dall'alto (Y %)</label>
                      <input
                        type="range"
                        min="0" max="100"
                        value={activeBox.top}
                        onChange={(e) => handleConfigChange("top", Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <div className="text-right text-xs text-gray-400 font-mono mt-1">{activeBox.top}%</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Da sinistra (X %)</label>
                      <input
                        type="range"
                        min="0" max="100"
                        value={activeBox.left}
                        onChange={(e) => handleConfigChange("left", Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <div className="text-right text-xs text-gray-400 font-mono mt-1">{activeBox.left}%</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Larghezza Box (%)</label>
                      <input
                        type="range"
                        min="10" max="100"
                        value={activeBox.width}
                        onChange={(e) => handleConfigChange("width", Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <div className="text-right text-xs text-gray-400 font-mono mt-1">{activeBox.width}%</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Altezza Box (%)</label>
                      <input
                        type="range"
                        min="5" max="100"
                        value={activeBox.height}
                        onChange={(e) => handleConfigChange("height", Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <div className="text-right text-xs text-gray-400 font-mono mt-1">{activeBox.height}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Grandezza Testo (px)</label>
                      <input
                        type="number"
                        min="16" max="250"
                        value={activeBox.fontSize}
                        onChange={(e) => handleConfigChange("fontSize", Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Colore Testo</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeBox.color}
                          onChange={(e) => handleConfigChange("color", e.target.value)}
                          className="w-10 h-10 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={activeBox.color.toUpperCase()}
                          onChange={(e) => handleConfigChange("color", e.target.value)}
                          className="flex-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Allineamento Orizzontale</label>
                        <select
                          value={activeBox.textAlign || "left"}
                          onChange={(e) => {
                            handleConfigChange("textAlign", e.target.value);
                            handleConfigChange("justifyContent", e.target.value === "center" ? "center" : e.target.value === "right" ? "flex-end" : "flex-start");
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                        >
                          <option value="left">Sinistra</option>
                          <option value="center">Centro</option>
                          <option value="right">Destra</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">Allineamento Verticale</label>
                        <select
                          value={activeBox.alignItems || "flex-start"}
                          onChange={(e) => handleConfigChange("alignItems", e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                        >
                          <option value="flex-start">In Alto</option>
                          <option value="center">Al Centro</option>
                          <option value="flex-end">In Basso</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center dark:text-gray-400">
              Queste impostazioni vengono salvate automaticamente per essere utilizzate all'esportazione di un messaggio specifico.
            </p>
          </div>
        </div>
      </motion.div>
      )}
    </div>
  );
}
