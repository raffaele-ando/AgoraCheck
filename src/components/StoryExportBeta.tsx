import React, { useState, useRef, useEffect } from "react";
import { X, Download, Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import {
  TemplateConfig,
  DEFAULT_CONFIG,
  loadImageFromDB,
  AutoScalingText,
} from "./StoryTemplateConfig";

interface StoryExportBetaProps {
  message: {
    lookingFor: string;
    when?: string;
    where?: string;
  };
  onClose: () => void;
}

export default function StoryExportBeta({ message, onClose }: StoryExportBetaProps) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [isExporting, setIsExporting] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [isDBReady, setIsDBReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadImageFromDB()
      .then((img) => {
        if (img) setBackgroundImage(img);
        setIsDBReady(true);
      })
      .catch((err) => {
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
        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Esporta Storia
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-100 dark:bg-black/50 p-6 flex flex-col items-center justify-center relative overflow-hidden flex-1">
          <div className="w-full mx-auto flex flex-col items-center justify-center">
             <div className="relative w-full aspect-[9/16] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" ref={containerRef}>
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
                    backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <AutoScalingText text={message.lookingFor} config={config.chi} />
                  <AutoScalingText text={message.when || ""} config={config.quando} />
                  <AutoScalingText text={message.where || ""} config={config.dove} />
                </div>
                {!backgroundImage && isDBReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center bg-gray-50">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                    <span className="text-sm font-medium mb-2">Nessun template configurato</span>
                    <span className="text-xs">Vai nella sezione "Template Storie" della Dashboard per impostarlo!</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
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
