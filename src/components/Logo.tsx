import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const logoCache: Record<string, string | null> = {};
const pendingPromises: Record<string, Promise<string | null>> = {};
const listeners: Record<string, Set<(url: string | null) => void>> = {};

let scalesCache: { zoneScale: number, agoraScale: number, customLogoScale: number, spacing: number } | null = null;
const scalesListeners = new Set<(scales: any) => void>();

export const fetchLogoScales = async () => {
  if (scalesCache) return scalesCache;
  try {
    const snap = await getDoc(doc(db, "settings", "logo_scales"));
    if (snap.exists()) {
      scalesCache = {
        zoneScale: snap.data().zoneScale ?? 1,
        agoraScale: snap.data().agoraScale ?? 1,
        customLogoScale: snap.data().customLogoScale ?? 1,
        spacing: snap.data().spacing ?? 8
      };
    } else {
      scalesCache = { zoneScale: 1, agoraScale: 1, customLogoScale: 1, spacing: 8 };
    }
  } catch (e) {
    scalesCache = { zoneScale: 1, agoraScale: 1, customLogoScale: 1, spacing: 8 };
  }
  scalesListeners.forEach(cb => cb(scalesCache));
  return scalesCache;
};

export const updateLogoScalesCache = (newScales: any) => {
  scalesCache = newScales;
  scalesListeners.forEach(cb => cb(scalesCache));
};


export const clearLogoCache = () => {
  for (const key in logoCache) {
    logoCache[key] = null;
    if (listeners[key]) {
      listeners[key].forEach(cb => cb(null));
    }
    delete logoCache[key];
  }
  for (const key in pendingPromises) {
    delete pendingPromises[key];
  }
};

const fetchLogo = async (name: string): Promise<string | null> => {
  if (name in logoCache) return logoCache[name];
  if (pendingPromises[name]) return pendingPromises[name];

  const promise = (async () => {
    try {
      const snap = await getDoc(doc(db, "logos", name));
      const url = snap.exists() && snap.data()?.dataUrl ? snap.data().dataUrl : null;
      logoCache[name] = url;
      if (listeners[name]) {
        listeners[name].forEach(cb => cb(url));
      }
      return url;
    } catch {
      delete pendingPromises[name];
      if (listeners[name]) {
        listeners[name].forEach(cb => cb(null));
      }
      return null;
    }
  })();
  
  pendingPromises[name] = promise;
  return promise;
};

export function Logo({ className, logoName = "default", fallbackText, forceTextFallback = false }: { className?: string; logoName?: string; fallbackText?: string, forceTextFallback?: boolean }) {
  const [url, setUrl] = useState<string | null>(logoCache[logoName] || null);
  const [defaultUrl, setDefaultUrl] = useState<string | null>(logoCache["default"] || null);
  const [agoraUrl, setAgoraUrl] = useState<string | null>(logoCache["agora_soltanto"] || null);
  
  const isImmediate = (logoName in logoCache);
  const [loading, setLoading] = useState(!isImmediate);
  const [failed, setFailed] = useState(isImmediate && !logoCache[logoName]);
  const [timeoutText, setTimeoutText] = useState(false);
  const [scales, setScales] = useState<{ zoneScale: number, agoraScale: number, customLogoScale: number, spacing: number }>(scalesCache || { zoneScale: 1, agoraScale: 1, customLogoScale: 1, spacing: 8 });

  useEffect(() => {
    let mounted = true;
    const updateScales = (newScales: any) => { if (mounted) setScales(newScales); };
    scalesListeners.add(updateScales);
    fetchLogoScales();
    return () => {
      mounted = false;
      scalesListeners.delete(updateScales);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // reset state
    setUrl(logoCache[logoName] || null);
    setFailed(false);
    setTimeoutText(false);

    if (!(logoName in logoCache)) {
      setLoading(true);
      
      const t = setTimeout(() => {
         if (mounted && !(logoName in logoCache)) setTimeoutText(true);
      }, 1000); // 1s fast text fallback if slow network
      
      const cb = (newUrl: string | null) => {
        if (!mounted) return;
        setUrl(newUrl);
        setLoading(false);
        if (!newUrl) setFailed(true);
        else { setFailed(false); setTimeoutText(false); }
      };
      
      if (!listeners[logoName]) listeners[logoName] = new Set();
      listeners[logoName].add(cb);
      
      fetchLogo(logoName);
      
      return () => {
        mounted = false;
        clearTimeout(t);
        listeners[logoName]?.delete(cb);
      };
    } else {
       setLoading(false);
       if (!logoCache[logoName]) setFailed(true);
    }
  }, [logoName]);

  useEffect(() => {
    let mounted = true;
    const cbDef = (u: string|null) => { if (mounted) setDefaultUrl(u); };
    const cbAgo = (u: string|null) => { if (mounted) setAgoraUrl(u); };
    
    if (!listeners["default"]) listeners["default"] = new Set();
    if (!listeners["agora_soltanto"]) listeners["agora_soltanto"] = new Set();
    listeners["default"].add(cbDef);
    listeners["agora_soltanto"].add(cbAgo);

    fetchLogo("default");
    fetchLogo("agora_soltanto");

    return () => {
      mounted = false;
      listeners["default"]?.delete(cbDef);
      listeners["agora_soltanto"]?.delete(cbAgo);
    }
  }, []);

  const hasSizing = className && (className.includes("w-") || className.includes("h-"));
  
  const showTextFallback = forceTextFallback || (!url && fallbackText && (failed || timeoutText));
  
  let finalSrc = url;
  if (!url && failed && !fallbackText) {
      finalSrc = defaultUrl;
  }
  
  const isActuallyFailing = !finalSrc && !showTextFallback;

  if (loading && !finalSrc && !showTextFallback) {
    return <div className={cn("flex items-center justify-center animate-pulse bg-gray-200/50 dark:bg-gray-800/50 rounded-lg", className, hasSizing ? "" : "w-56 h-20 md:w-64 md:h-24")} />
  }

  return (
    <div className={cn("flex items-center justify-center select-none", className)}>
      <div className={cn("relative flex items-center justify-center", hasSizing ? "w-full h-full" : "w-56 h-20 md:w-64 md:h-24")}>
         {(!showTextFallback || (!forceTextFallback && (url || finalSrc))) && finalSrc && !forceTextFallback && (
            <img 
               src={finalSrc}
               alt="Logo"
               className={cn("w-full h-full object-contain z-10 dark:invert", showTextFallback ? "hidden" : "block")}
               style={{ transform: `scale(${scales.customLogoScale})`, transformOrigin: "center" }}
               onError={() => setFailed(true)}
            />
         )}
         
         {isActuallyFailing && !forceTextFallback && (
            <img 
               src="https://github.com/raffaele-ando/Logo-vari/blob/main/logo.png?raw=true"
               alt="Fallback Logo"
               className="w-full h-full object-contain z-10 dark:invert opacity-70"
               style={{ transform: `scale(${scales.customLogoScale})`, transformOrigin: "center" }}
            />
         )}
         
         {(showTextFallback && (!url || forceTextFallback)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: `${scales.spacing ?? 8}px` }}>
              <h1 style={{ fontFamily: 'var(--font-spartan)', transform: `scale(${scales.zoneScale})`, transformOrigin: "center bottom" }} className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-black dark:text-white leading-none text-center z-10 m-0">
                {fallbackText}
               </h1>
               <div style={{ transform: `scale(${scales.agoraScale})`, transformOrigin: "center top", display: "flex", justifyContent: "center" }}>
                 {agoraUrl || defaultUrl ? (
                    <img src={agoraUrl || defaultUrl!} alt="Agorà" className="h-2 sm:h-2.5 md:h-3 object-contain dark:invert opacity-80" />
                 ) : (
                    <h1 className="text-[9px] sm:text-[10px] md:text-[11px] font-black tracking-widest text-[#DC5F00] leading-none text-center m-0 p-0">
                      AGORÀ
                    </h1>
                 )}
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
