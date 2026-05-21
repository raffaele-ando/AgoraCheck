import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Settings, 
  Type, 
  Image as ImageIcon, 
  CheckCircle2, 
  Trash2, 
  Download, 
  Sparkles, 
  ChevronRight,
  Info,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  Minus,
  LayoutTemplate,
  MessageSquare,
  MonitorSmartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  updateDoc 
} from "firebase/firestore";
import { db } from "../firebase";

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

export interface CarouselConfig {
  cerco: BoxConfig;
  quando: BoxConfig;
  dove: BoxConfig;
}

export const DEFAULT_CAROUSEL_CONFIG: CarouselConfig = {
  cerco: { top: 25, left: 10, width: 80, height: 35, fontSize: 50, color: "#000000", enabled: true, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
  quando: { top: 65, left: 10, width: 80, height: 12, fontSize: 35, color: "#1e1b4b", enabled: true, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
  dove: { top: 78, left: 10, width: 80, height: 12, fontSize: 35, color: "#1e1b4b", enabled: true, alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left" },
};

// Auto Scaling Text component optimized for Carousel templates
const CarouselAutoScalingText = ({ 
  text, 
  config, 
  showBorders, 
  isActive, 
  label 
}: { 
  text: string; 
  config: BoxConfig; 
  showBorders?: boolean; 
  isActive?: boolean; 
  label?: string; 
}) => {
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
        overflow: "visible",
        border: showBorders ? (isActive ? "1px solid #6366f1" : "1px dashed rgba(99, 102, 241, 0.4)") : "none",
        backgroundColor: showBorders ? (isActive ? "rgba(99, 102, 241, 0.05)" : "rgba(99, 102, 241, 0.02)") : "transparent",
        boxSizing: "border-box",
        zIndex: isActive ? 20 : 10,
        borderRadius: "4px",
        transition: "all 0.2s ease",
      }}
    >
      {showBorders && isActive && label && (
        <div style={{ position: 'absolute', top: -20, left: -1, fontSize: 10, fontWeight: 'bold', color: '#fff', backgroundColor: '#6366f1', padding: '2px 8px', borderRadius: '4px 4px 4px 0', whiteSpace: 'nowrap' }}>
          {label}
        </div>
      )}
      <div
        ref={textRef}
        style={{
          color: config.color,
          fontSize: `${currentSize}px`,
          textAlign: config.textAlign || "left",
          fontWeight: "bold",
          fontFamily: "Inter, sans-serif",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: "1.25",
          width: "100%",
        }}
      >
        {text}
      </div>
    </div>
  );
};

interface CarouselTemplateConfigProps {
  validatedMessages: any[];
  onUnvalidateMessage: (msgId: string) => Promise<void>;
}

export default function CarouselTemplateConfig({ 
  validatedMessages, 
  onUnvalidateMessage 
}: CarouselTemplateConfigProps) {
  const [carouselBgs, setCarouselBgs] = useState<(string | null)[]>(Array(20).fill(null));
  const [config, setConfig] = useState<CarouselConfig>(DEFAULT_CAROUSEL_CONFIG);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [activeTab, setActiveTab] = useState<keyof CarouselConfig>("cerco");
  const [isDBReady, setIsDBReady] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // States for Batch Export
  const [exportProgress, setExportProgress] = useState<{
    isOpen: boolean;
    currentStep: number;
    totalSteps: number;
    statusText: string;
  }>({
    isOpen: false,
    currentStep: 0,
    totalSteps: 20,
    statusText: ""
  });

  // State for rendering hidden content during export
  const [activeExportMessage, setActiveExportMessage] = useState<any>(null);
  const [activeExportBg, setActiveExportBg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const captureBatchRef = useRef<HTMLDivElement>(null);

  // Load configuration and backgrounds
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "settings"));
        
        // Populate backgrounds
        const bgs = Array(20).fill(null);
        snap.docs.forEach(doc => {
          if (doc.id.startsWith("carousel_bg_")) {
            const idx = parseInt(doc.id.replace("carousel_bg_", ""), 10);
            if (idx >= 0 && idx < 20) {
              bgs[idx] = doc.data().bgImage;
            }
          }
        });
        setCarouselBgs(bgs);

        // Populate text config
        const configDoc = snap.docs.find(d => d.id === "carousel_config");
        if (configDoc && configDoc.data().config) {
          setConfig(configDoc.data().config);
        } else {
          setConfig(DEFAULT_CAROUSEL_CONFIG);
        }
      } catch (err) {
        console.error("Could not load carousel settings from DB", err);
      } finally {
        setIsLoading(false);
        setIsDBReady(true);
      }
    };
    loadAllData();
  }, []);

  // Resize listener to scale preview correctly
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

  // Save Config changes
  const handleConfigChange = async (key: keyof BoxConfig, value: any) => {
    const activeBoxConfig = config[activeTab] || DEFAULT_CAROUSEL_CONFIG[activeTab];
    const newConfig = { 
      ...config, 
      [activeTab]: { ...activeBoxConfig, [key]: value } 
    };
    setConfig(newConfig);
    try {
      const configDoc = doc(db, "settings", "carousel_config");
      await setDoc(configDoc, { config: newConfig });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 1500);
    } catch (e) {
      console.error("Error saving carousel config", e);
    }
  };

  // Set message as the first / cover slide of the carousel
  const handleSetFirstSlide = async (msgId: string) => {
    try {
      for (const m of validatedMessages) {
        const isFirst = m.id === msgId;
        if (m.isFirstSlideOfCarousel !== isFirst) {
          await updateDoc(doc(db, "messages", m.id), { isFirstSlideOfCarousel: isFirst });
        }
      }
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 1500);
    } catch (e) {
      console.error("Error setting first slide:", e);
      alert("Errore nell'impostare la prima slide.");
    }
  };

  // Upload background slide image
  const handleImageUpload = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const dataUrl = readerEvent.target?.result as string;
        
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
            
            // Save local state
            const targetBgs = [...carouselBgs];
            targetBgs[index] = compressedUrl;
            setCarouselBgs(targetBgs);

            try {
              const bgDoc = doc(db, "settings", `carousel_bg_${index}`);
              await setDoc(bgDoc, { bgImage: compressedUrl });
              setSavedStatus(true);
              setTimeout(() => setSavedStatus(false), 1500);
            } catch (err) {
              console.error("Could not save image to Firestore", err);
              alert("Errore durante il salvataggio. L'immagine è troppo grande.");
            }
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove background slide image
  const handleRemoveImage = async (index: number) => {
    if (!window.confirm(`Sei sicuro di voler rimuovere lo sfondo per il post ${index + 1}?`)) return;
    try {
      const targetBgs = [...carouselBgs];
      targetBgs[index] = null;
      setCarouselBgs(targetBgs);

      const bgDoc = doc(db, "settings", `carousel_bg_${index}`);
      await deleteDoc(bgDoc);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 1500);
    } catch (err) {
      console.error("Error deleting document", err);
    }
  };

  // Sequential batch exporter
  const handleBatchExport = async () => {
    if (validatedMessages.length === 0) return;
    
    // Warn user about browser settings if downloading up to 20 files
    const countToExport = Math.min(20, validatedMessages.length);
    if (!window.confirm(`Inizierai lo scaricamento sequenziale di ${countToExport} immagini per il carosello. Se richiesto dal browser, acconsenti al download di file multipli.`)) return;

    setExportProgress({
      isOpen: true,
      currentStep: 0,
      totalSteps: countToExport,
      statusText: "Inizializzazione esportatore carosello..."
    });

    try {
      // Loop with delay to let layout redraw
      for (let i = 0; i < countToExport; i++) {
        const msg = validatedMessages[i];
        const bg = carouselBgs[i]; // Corresponding slide background template
        
        setExportProgress(prev => ({
          ...prev,
          currentStep: i + 1,
          statusText: `Generazione Post ${i + 1} di ${countToExport}...`
        }));

        // Render this combination in our hidden capture zone
        setActiveExportMessage(msg);
        setActiveExportBg(bg);

        // Wait a small frame for styling/scaling computation to settle
        await new Promise(resolve => setTimeout(resolve, 350));

        if (captureBatchRef.current) {
          const dataUrl = await toPng(captureBatchRef.current, {
            cacheBust: true,
            pixelRatio: 1, // High resolution
            style: {
              transform: "scale(1)",
              transformOrigin: "top left"
            }
          });

          // Trigger download
          const link = document.createElement("a");
          link.download = `carosello-post-${i + 1}_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        }
      }

      setExportProgress(prev => ({
        ...prev,
        statusText: "Tutte le immagini sono state generate con successo!"
      }));
      setTimeout(() => {
        setExportProgress(prev => ({ ...prev, isOpen: false }));
      }, 2500);

    } catch (err) {
      console.error("Batch Export failed", err);
      alert("Esportazione interrotta per un errore. Riprova.");
      setExportProgress(prev => ({ ...prev, isOpen: false }));
    } finally {
      setActiveExportMessage(null);
      setActiveExportBg(null);
    }
  };

  const activeBox = config[activeTab] || DEFAULT_CAROUSEL_CONFIG[activeTab];
  const activeSlideImage = carouselBgs[selectedSlideIndex];

  // Dummy preview text that corresponds to the active tab or defaults
  const previewTextForField = (field: keyof CarouselConfig) => {
    if (validatedMessages.length > 0) {
      const firstMsg = validatedMessages[0];
      if (field === "cerco") return firstMsg.lookingFor || "Cerco esempio...";
      if (field === "quando") return firstMsg.when || "Oggi pomeriggio alle 16";
      if (field === "dove") return firstMsg.where || "In biblioteca centrale";
    }
    if (field === "cerco") return "Cerco la ragazza con la camicia rosa che leggeva un romanzo sulle panchine del chiostro alle 14:00.";
    if (field === "quando") return "Oggi, Mercoledì ore 14:00";
    if (field === "dove") return "Chiostro di Giurisprudenza";
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto pb-12">
      
      {/* EXPORT OVERLAY LOADER (Same as before, minimal tweaks) */}
      <AnimatePresence>
        {exportProgress.isOpen && (
          <div className="fixed inset-0 z-[3000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5"
            >
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-950 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Generatore Carosello</h3>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  Post {exportProgress.currentStep} di {exportProgress.totalSteps}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{exportProgress.statusText}</p>
              </div>

              {/* Mini progress bar */}
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full" 
                  style={{ width: `${(exportProgress.currentStep / exportProgress.totalSteps) * 100}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500">
                Non chiudere la finestra e consenti i download multipli se richiesto.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIDDEN CAPTURE WORKSPACE REQUIRED FOR BATCH TO PNG */}
      {activeExportMessage && (
        <div style={{ position: "absolute", top: -9999, left: -9999, overflow: "hidden" }}>
          <div
            ref={captureBatchRef}
            style={{
              width: 1080,
              height: 1440,
              position: "relative",
              backgroundColor: "#ffffff",
              overflow: "hidden"
            }}
          >
            {activeExportBg && (
              <img 
                src={activeExportBg} 
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 0
                }}
                alt=""
              />
            )}
            <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
              <CarouselAutoScalingText 
                text={activeExportMessage.lookingFor || ""} 
                config={config.cerco} 
              />
              <CarouselAutoScalingText 
                text={activeExportMessage.when || ""} 
                config={config.quando} 
              />
              <CarouselAutoScalingText 
                text={activeExportMessage.where || ""} 
                config={config.dove} 
              />
            </div>
          </div>
        </div>
      )}

      {/* HERO HEADER */}
      <div className="relative overflow-hidden bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-[2rem] p-8 sm:p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8 group">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-4 border border-indigo-100 dark:border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Editor Multimessaggio</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
            Carosello Instagram
          </h2>
          <p className="text-sm sm:text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            Personalizza il layout, carica gli sfondi e genera il carosello pronto per i social con un clic.
          </p>
        </div>
        
        <div className="relative z-10 flex flex-col items-center sm:items-end gap-4 shrink-0">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-3xl flex items-center justify-between gap-6 shadow-sm min-w-[240px]">
            <div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">Post Pronti</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Max. 20 post</div>
            </div>
            <div className="w-14 h-14 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center font-black text-2xl text-indigo-600 dark:text-indigo-400 shadow-sm">
              {validatedMessages.length}
            </div>
          </div>

          <button
            onClick={handleBatchExport}
            disabled={validatedMessages.length === 0}
            className="w-full px-8 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed font-black rounded-3xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
          >
            <Download className="w-5 h-5" />
            <span>Esporta Tutto ({Math.min(20, validatedMessages.length)})</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 shrink-0 mb-4" />
          <span className="text-sm font-semibold tracking-wide uppercase">Inizializzazione Workspace...</span>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row items-start gap-8">
          
          {/* LEFT: STICKY LIVE EDITOR & CONTROLS */}
          <div className="w-full xl:w-[480px] shrink-0 xl:sticky xl:top-[6rem] flex flex-col gap-6">
            
            {/* Editor Canvas */}
            <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
              <div className="px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Layout Preview {selectedSlideIndex + 1}</span>
                </div>
                <AnimatePresence>
                  {savedStatus && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] bg-green-100 dark:bg-green-500/20 font-bold text-green-700 dark:text-green-400 px-2.5 py-1 rounded-md"
                    >
                      Salvato
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Scaleable Phone frame preview */}
              <div className="p-8 flex items-center justify-center bg-gray-100/50 dark:bg-[#09090b] min-h-[500px]">
                <div className="w-full max-w-[280px] mx-auto flex items-center justify-center relative">
                   {/* Device Frame decoration */}
                   <div className="absolute -inset-4 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-200/80 dark:border-gray-800 z-0"></div>
                   
                   <div className="relative w-full aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 z-10 dark:bg-black" ref={containerRef}>
                      <div
                        style={{
                          width: 1080,
                          height: 1440,
                          transform: `scale(${previewScale})`,
                          transformOrigin: "top left",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          backgroundColor: "#fff",
                          overflow: "hidden",
                        }}
                      >
                        {activeSlideImage && (
                          <img 
                            src={activeSlideImage} 
                            alt="Background" 
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
                          <CarouselAutoScalingText 
                            text={previewTextForField("cerco") || ""} 
                            config={config.cerco} 
                            showBorders={true} 
                            isActive={activeTab === "cerco"}
                            label="Cerco"
                          />
                          <CarouselAutoScalingText 
                            text={previewTextForField("quando") || ""} 
                            config={config.quando} 
                            showBorders={true} 
                            isActive={activeTab === "quando"}
                            label="Quando"
                          />
                          <CarouselAutoScalingText 
                            text={previewTextForField("dove") || ""} 
                            config={config.dove} 
                            showBorders={true} 
                            isActive={activeTab === "dove"}
                            label="Dove"
                          />
                        </div>
                      </div>
                      {!activeSlideImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-sm">
                          <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Sfondo Assente</span>
                          <span className="text-[10px] mt-1 text-gray-400 font-medium">Seleziona uno sfondo dalla griglia a destra.</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Editing Controls */}
              <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-6 space-y-6">
                
                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl">
                  {(["cerco", "quando", "dove"] as (keyof CarouselConfig)[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 text-xs font-bold py-3 rounded-xl transition-all capitalize tracking-wide ${ activeTab === tab ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200' }`}
                    >
                      {tab === "cerco" ? "Cerco (Testo)" : tab}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {/* Position Sliders */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white capitalize">
                      <span>Posizione</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asse X</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeBox.left}%</span>
                        </div>
                        <input
                          type="range"
                          min="0" max="100"
                          value={activeBox.left}
                          onChange={(e) => handleConfigChange("left", Number(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asse Y</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeBox.top}%</span>
                        </div>
                        <input
                          type="range"
                          min="0" max="100"
                          value={activeBox.top}
                          onChange={(e) => handleConfigChange("top", Number(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Size Sliders */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white capitalize">
                      <span>Dimensioni</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                         <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Larghezza</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeBox.width}%</span>
                        </div>
                        <input
                          type="range"
                          min="10" max="100"
                          value={activeBox.width}
                          onChange={(e) => handleConfigChange("width", Number(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Altezza</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeBox.height}%</span>
                        </div>
                        <input
                          type="range"
                          min="5" max="100"
                          value={activeBox.height}
                          onChange={(e) => handleConfigChange("height", Number(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

                  {/* Typography & Color */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dimensione Base Font (px)</label>
                      <input
                        type="number"
                        min="16" max="250"
                        value={activeBox.fontSize}
                        onChange={(e) => handleConfigChange("fontSize", Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Colore Testo</label>
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 pl-3">
                        <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 flex-1">{activeBox.color.toUpperCase()}</span>
                        <input
                          type="color"
                          value={activeBox.color}
                          onChange={(e) => handleConfigChange("color", e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer shrink-0 border-0 p-0"
                          style={{ backgroundColor: 'transparent' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alignments (Buttons instead of selects for better UX) */}
                  <div className="grid grid-cols-2 gap-6">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Allineamento Testo</label>
                        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl">
                          <button 
                            onClick={() => {
                              handleConfigChange("textAlign", "left");
                              handleConfigChange("justifyContent", "flex-start");
                            }}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${activeBox.textAlign === "left" || !activeBox.textAlign ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}
                          >
                            <AlignLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              handleConfigChange("textAlign", "center");
                              handleConfigChange("justifyContent", "center");
                            }}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${activeBox.textAlign === "center" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}
                          >
                            <AlignCenter className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              handleConfigChange("textAlign", "right");
                              handleConfigChange("justifyContent", "flex-end");
                            }}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${activeBox.textAlign === "right" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}
                          >
                            <AlignRight className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Posizione Verticale</label>
                        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl">
                          <button 
                            onClick={() => handleConfigChange("alignItems", "flex-start")}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${activeBox.alignItems === "flex-start" || !activeBox.alignItems ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}
                          >
                            <ArrowUpToLine className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleConfigChange("alignItems", "center")}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${activeBox.alignItems === "center" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleConfigChange("alignItems", "flex-end")}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${activeBox.alignItems === "flex-end" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: SCROLLABLE LISTS (TEMPLATES & MESSAGES) */}
          <div className="flex-1 w-full space-y-8 min-w-0">
            
            {/* INSTRUCTIONS */}
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/40 p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center gap-5 relative overflow-hidden">
              <div className="w-12 h-12 bg-white dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100 dark:border-indigo-800">
                <LayoutTemplate className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">Layout Carosello:</span> Carica fino a 20 sfondi numerati qui sotto. L'ordine degli sfondi corrisponderà all'ordine dei messaggi convalidati. Ogni testo verrà sovrapposto automaticamente.
              </div>
            </div>

            {/* BACKGROUNDS GRID */}
            <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Galleria Sfondi</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Fomato verticale (3:4) raccomandato.</p>
                </div>
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400">
                  {carouselBgs.filter(Boolean).length}/20 Inseriti
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {Array(20).fill(null).map((_, index) => {
                  const image = carouselBgs[index];
                  const isSelected = selectedSlideIndex === index;
                  
                  return (
                    <motion.div 
                      key={index}
                      layout
                      onClick={() => setSelectedSlideIndex(index)}
                      className={`relative w-full aspect-[3/4] rounded-[1.5rem] bg-gray-50 dark:bg-gray-900 border-2 overflow-hidden cursor-pointer group flex flex-col justify-between p-2.5 transition-all ${
                        isSelected 
                          ? "border-indigo-500 shadow-lg shadow-indigo-500/20" 
                          : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700/50"
                      }`}
                    >
                      {/* Preview Render */}
                      {image ? (
                        <>
                          <img src={image} className="absolute inset-0 w-full h-full object-cover z-0" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-80 transition-opacity" />
                          
                          {/* Badge Number */}
                          <div className="relative z-20 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                            {index + 1}
                          </div>
                          
                          {/* Actions */}
                          <div className="relative z-20 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index);
                              }}
                              className="p-1.5 bg-red-500/90 text-white hover:bg-red-600 backdrop-blur-md rounded-xl transition-all shadow-sm"
                              title="Rimuovi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="z-10 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>

                          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-3">
                            <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                            <span className="text-[10px] font-black uppercase text-center tracking-widest text-gray-400">Vuoto</span>
                          </div>

                          <label className="relative z-20 bg-white dark:bg-gray-800 font-bold text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-[10px] uppercase tracking-widest text-center py-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                            <span>Carica</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg"
                              className="hidden"
                              onChange={handleImageUpload(index)}
                            />
                          </label>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* MESSAGES LIST */}
            <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-gray-400" />
                    Messaggi Assegnati
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Ordinati per data di approvazione.</p>
                </div>
              </div>

              {validatedMessages.length === 0 ? (
                <div className="py-16 border-2 border-dashed border-gray-200 dark:border-gray-800/80 rounded-[2rem] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-900/30">
                  <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-4" />
                  <span className="text-base font-bold text-gray-900 dark:text-white">Nessun post convalidato</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">Per popolare il carosello, vai nella scheda "Messaggi" e clicca su "Includi nel Carosello".</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {validatedMessages.slice(0, 20).map((msg, idx) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 gap-4 hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-start sm:items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate lg:max-w-md group-hover:whitespace-normal group-hover:line-clamp-2 transition-all">
                              "{msg.lookingFor}"
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1.5">
                              {msg.when && <span className="bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded-lg">🗓️ {msg.when}</span>}
                              {msg.where && <span className="bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded-lg">📍 {msg.where}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                          {msg.isFirstSlideOfCarousel ? (
                            <span className="flex-1 sm:flex-none justify-center text-xs font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5" /> Cover
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetFirstSlide(msg.id)}
                              className="flex-1 sm:flex-none justify-center text-xs font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white px-4 py-2 rounded-xl transition-all shadow-sm"
                            >
                              Imposta Cover
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              await onUnvalidateMessage(msg.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800/50"
                            title="Rimuovi dal Carosello"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {validatedMessages.length > 20 && (
                    <div className="p-4 mt-6 text-center text-sm font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700/50">
                      I primi 20 messaggi verranno esportati. Attualmente ne hai convalidati <span className="font-black text-gray-900 dark:text-white">{validatedMessages.length}</span>.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
