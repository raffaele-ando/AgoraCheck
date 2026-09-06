import { useState } from "react";
import Video from "./Video";
import { Download, Loader2, RefreshCw } from "lucide-react";

export default function Video2() {
  const [isExporting, setIsExporting] = useState(false);

  const startExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export-video");
      if (!response.ok) throw new Error("Errore durante l'export");
      
      // Blob download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agora-video-remotion.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore durante l'esportazione. Riprova tra poco.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 md:p-8 font-sans w-full">
      <div className="flex flex-col items-center max-w-lg mb-8 text-center text-white">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Esporta Video con Remotion</h1>
        <p className="text-gray-400 text-sm mb-6">
          Il motore di rendering backend <b>(Remotion)</b> elaborerà automaticamente i framework d'animazione frame-by-frame e scaricherà il video Full HD in locale sul tuo PC, senza dover registrare lo schermo. L'elaborazione cloud richiederà circa 40-60 secondi.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-[18px] py-[10px] bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-semibold text-[13px]"
          >
            <RefreshCw className="w-4 h-4" /> Ricomincia Preview
          </button>
          
          <button 
            onClick={startExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-[18px] py-[10px] text-white rounded-xl transition-colors font-semibold text-[13px] shadow-lg ${isExporting ? "bg-gray-500 cursor-not-allowed" : "bg-[#DC5F00] hover:bg-[#DC5F00]/80 shadow-[#DC5F00]/20"}`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Rendering in corso... (1 min)" : "Esporta MP4 Nativo"}
          </button>
        </div>
      </div>

      {/* Rende il video esattamente identico a /video in un box ristretto per preview*/}
      <div className="relative shadow-2xl rounded-[16px] overflow-hidden shadow-orange-500/20 bg-black border-[4px] border-[#DC5F00]/20 pointer-events-none" style={{ width: "360px", height: "640px" }}>
          <div style={{ position: "relative", transform: "scale(0.81818)", transformOrigin: "top left", width: "440px", height: "782.22px" }}>
             <Video />
          </div>
      </div>
    </div>
  );
}
