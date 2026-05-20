import React, { useState, useRef, useEffect } from "react";
import { X, Download, Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import {
  TemplateConfig,
  DEFAULT_CONFIG,
  loadImageFromDB,
  loadConfigFromDB,
  AutoScalingText,
} from "./StoryTemplateConfig";

interface StoryExportBetaProps {
  message: {
    lookingFor: string;
    when?: string;
    where?: string;
    type?: string;
    area?: string;
    city?: string;
    pollOptions?: string[];
  };
  onClose: () => void;
}

export default function StoryExportBeta({ message, onClose }: StoryExportBetaProps) {
  const defaultTarget = message.area || message.city || "DEFAULT";
  const defaultMode = (message.type === "sondaggio" ? "sondaggio" : message.type === "ricerca" ? "ricerca" : (!message.when && !message.where && message.type !== "sondaggio" ? "ricerca" : "spotted"));
  
  const [selectedMode, setSelectedMode] = useState<"spotted" | "sondaggio" | "risultati" | "risultati_sondaggio" | "ricerca">(defaultMode as any);
  const [selectedTarget, setSelectedTarget] = useState<string>(defaultTarget);
  
  // Add manual override text for additional boxes
  const [chiText, setChiText] = useState(message.lookingFor || "");
  const [quandoText, setQuandoText] = useState(message.when || "");
  const [doveText, setDoveText] = useState(message.where || "");
  const [box4Text, setBox4Text] = useState((message.pollOptions && message.pollOptions.length > 0) ? message.pollOptions[0] : "");
  const [box5Text, setBox5Text] = useState((message.pollOptions && message.pollOptions.length > 1) ? message.pollOptions[1] : "");

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [isExporting, setIsExporting] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [isDBReady, setIsDBReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDBReady(false);
    setBackgroundImage(null);
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

  const handleExport = async () => {
    if (!captureRef.current || !backgroundImage) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left"
        }
      });
      const link = document.createElement("a");
      link.download = `ngls-story-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exporting image", err);
      alert("Errore durante l'esportazione. Riprova.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Esporta Storia
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col">
          <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 dark:text-gray-400">Stile Esportazione</label>
                <select 
                  value={selectedMode} 
                  onChange={e => setSelectedMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm font-bold text-gray-900 dark:text-white"
                >
                  <option value="spotted">Spotted</option>
                  <option value="ricerca">Ricerca</option>
                  <option value="sondaggio">Sondaggio</option>
                  <option value="risultati">Risultati Spotted</option>
                  <option value="risultati_sondaggio">Risultati Sondaggio</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1 dark:text-gray-400">{selectedMode === "spotted" ? "Cosa/Chi" : selectedMode === "ricerca" ? "Testo Ricerca" : selectedMode === "risultati" ? "Testo Spotted" : "Domanda"}</label>
                  <textarea 
                    value={chiText} 
                    onChange={e => setChiText(e.target.value)} 
                    rows={2}
                    className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm resize-none text-gray-900 dark:text-white"
                  />
                </div>
                {selectedMode !== "ricerca" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 dark:text-gray-400">{selectedMode === "spotted" ? "Quando" : selectedMode === "risultati" ? "Esito (Trovato/a)" : selectedMode === "risultati_sondaggio" ? "Esito Opzione 1" : "Opzione 1"}</label>
                      <input type="text" value={quandoText} onChange={e => setQuandoText(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-white"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 dark:text-gray-400">{selectedMode === "spotted" ? "Dove" : selectedMode === "risultati" ? "Extra / Dettagli" : selectedMode === "risultati_sondaggio" ? "Esito Opzione 2" : "Opzione 2"}</label>
                      <input type="text" value={doveText} onChange={e => setDoveText(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-white"/>
                    </div>
                  </>
                )}
              </div>
              
              {(selectedMode === "sondaggio" || selectedMode === "risultati_sondaggio") && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 dark:text-gray-400">{selectedMode === "risultati_sondaggio" ? "Esito Opz 3" : "Opzione 3"}</label>
                    <input type="text" value={box4Text} onChange={e => setBox4Text(e.target.value)} placeholder="Opz 3..." className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-white"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 dark:text-gray-400">{selectedMode === "risultati_sondaggio" ? "Esito Opz 4" : "Opzione 4"}</label>
                    <input type="text" value={box5Text} onChange={e => setBox5Text(e.target.value)} placeholder="Opz 4..." className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-white"/>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-black/50 p-4 flex flex-col items-center justify-center relative flex-1 min-h-[300px]">
            <div className="w-full max-w-[220px] mx-auto flex items-center justify-center">
               <div className="relative w-full aspect-[9/16] bg-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden dark:bg-gray-900" ref={containerRef}>
                  <div
                  ref={captureRef}
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
                    {config.chi && <AutoScalingText text={chiText} config={config.chi} />}
                    {selectedMode !== "ricerca" && config.quando && <AutoScalingText text={quandoText} config={config.quando} />}
                    {selectedMode !== "ricerca" && config.dove && <AutoScalingText text={doveText} config={config.dove} />}
                    {(selectedMode === "sondaggio" || selectedMode === "risultati_sondaggio") && config.box4 && <AutoScalingText text={box4Text} config={config.box4} />}
                    {(selectedMode === "sondaggio" || selectedMode === "risultati_sondaggio") && config.box5 && <AutoScalingText text={box5Text} config={config.box5} />}
                  </div>
                </div>
                {!backgroundImage && isDBReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center bg-gray-50 dark:bg-gray-800/50">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                    <span className="text-sm font-medium mb-2">Nessun template configurato</span>
                    <span className="text-xs">Vai nella sezione "Template Storie" della Dashboard per impostarlo!</span>
                  </div>
                )}
             </div>
          </div>
        </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <button
            onClick={handleExport}
            disabled={isExporting || !backgroundImage}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>Esportazione in corso... <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
            ) : (
              <><Download className="w-5 h-5" /> Scarica Immagine Pronta</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
