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
}

export interface TemplateConfig {
  chi: BoxConfig;
  quando: BoxConfig;
  dove: BoxConfig;
}

export const DEFAULT_CONFIG: TemplateConfig = {
  chi: { top: 20, left: 10, width: 80, height: 25, fontSize: 60, color: "#000000", enabled: true },
  quando: { top: 50, left: 10, width: 80, height: 15, fontSize: 40, color: "#000000", enabled: true },
  dove: { top: 70, left: 10, width: 80, height: 15, fontSize: 40, color: "#000000", enabled: true },
};

export const initDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("StoryExportDB", 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as any).result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images");
      }
    };
    request.onsuccess = (e) => resolve((e.target as any).result);
    request.onerror = (e) => reject((e.target as any).error);
  });
};

export const saveImageToDB = async (dataUrl: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");
    store.put(dataUrl, "bgImage");
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject((e.target as any).error);
  });
};

export const loadImageFromDB = async () => {
  const db = await initDB();
  return new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");
    const request = store.get("bgImage");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject((e.target as any).error);
  });
};

export const clearImageFromDB = async () => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");
    store.delete("bgImage");
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject((e.target as any).error);
  });
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
        alignItems: "center",
        justifyContent: "flex-start", // Force Left Align
        overflow: "visible", // let it temporarily overflow during calculation
        border: showBorders ? (isActive ? "2px dashed #4f46e5" : "1px dashed rgba(0,0,0,0.3)") : "none",
        backgroundColor: showBorders ? (isActive ? "rgba(79, 70, 229, 0.1)" : "rgba(0,0,0,0.05)") : "transparent",
        boxSizing: showBorders ? "border-box" : "content-box",
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
          textAlign: "left", // Force Left Align
          fontWeight: "bold", // Force Bold
          fontFamily: "Inter, sans-serif",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: "1.2",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default function StoryTemplateConfig() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [activeTab, setActiveTab] = useState<keyof TemplateConfig>("chi");
  const [isDBReady, setIsDBReady] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadImageFromDB().then(img => {
      if (img) setBackgroundImage(img);
      setIsDBReady(true);
    }).catch(err => {
      console.warn("Could not load image from IndexedDB", err);
      setIsDBReady(true);
    });

    const savedConfig = localStorage.getItem("story_export_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.chi && parsed.quando && parsed.dove) {
           setConfig(parsed);
        } else {
           setConfig(DEFAULT_CONFIG);
        }
      } catch (e) {
        setConfig(DEFAULT_CONFIG);
      }
    }
  }, []);

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
    const newConfig = { 
      ...config, 
      [activeTab]: { ...config[activeTab], [key]: value } 
    };
    setConfig(newConfig);
    localStorage.setItem("story_export_config", JSON.stringify(newConfig));
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setBackgroundImage(dataUrl);
        try {
          await saveImageToDB(dataUrl);
          setSavedStatus(true);
          setTimeout(() => setSavedStatus(false), 2000);
        } catch (err) {
          console.warn("Could not save image to IndexedDB", err);
          alert("Immagine troppo grande per essere salvata definitivamente.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearTemplate = async () => {
    setBackgroundImage(null);
    await clearImageFromDB();
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const activeBox = config[activeTab];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Preview */}
        <div className="flex-1 bg-gray-100 dark:bg-black/50 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="w-full max-w-[320px] mx-auto flex items-center justify-center mb-4">
             <div className="relative w-full aspect-[9/16] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" ref={containerRef}>
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
                    backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <AutoScalingText text="Nuova posizione rilevata (Es: Roma, Italia). L'utente cerca questo." config={config.chi} showBorders={true} isActive={activeTab === 'chi'} label="Cosa/Chi" />
                  <AutoScalingText text="Oggi, 14:30" config={config.quando} showBorders={true} isActive={activeTab === 'quando'} label="Quando" />
                  <AutoScalingText text="Roma, Italia" config={config.dove} showBorders={true} isActive={activeTab === 'dove'} label="Dove" />
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
              <p className="text-sm text-gray-500">Configura la posizione e lo stile dei box di testo per le storie.</p>
            </div>
            {savedStatus && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                <CheckCircle2 className="w-4 h-4" /> Salvato 
              </span>
            )}
          </div>

          <div className="p-6 space-y-6 flex-1">
            {/* Background Template */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Sfondo (1080x1920 raccomandato)
              </label>
              
              <div className="flex items-center gap-3">
                <label className="flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium px-4 py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  <span>Carica Template (PNG/JPG)</span>
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
                <Type className="w-4 h-4" /> Selezione Riquadro
              </label>

              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {(['chi', 'quando', 'dove'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-sm font-bold capitalize py-2 px-3 rounded-lg transition-colors ${
                      activeTab === tab
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab === 'chi' ? 'Cosa/Chi' : tab}
                  </button>
                ))}
              </div>

              {/* Box Settings */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">Box: {activeTab === 'chi' ? 'Cosa/Chi' : activeTab}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={activeBox.enabled}
                      onChange={(e) => handleConfigChange("enabled", e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Attivo</span>
                  </label>
                </div>

                <div className={`space-y-4 transition-opacity ${activeBox.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Dall'alto (Y %)</label>
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Da sinistra (X %)</label>
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Larghezza Box (%)</label>
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Altezza Box (%)</label>
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Grandezza Testo (px)</label>
                      <input
                        type="number"
                        min="16" max="250"
                        value={activeBox.fontSize}
                        onChange={(e) => handleConfigChange("fontSize", Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Colore Testo</label>
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
                          className="flex-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Queste impostazioni vengono salvate automaticamente per essere utilizzate all'esportazione di un messaggio specifico.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
