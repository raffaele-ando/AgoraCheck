import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Logo di ripiego, mostrato quando Firestore non ha (ancora) restituito nulla.
 *
 * Deve puntare al FILE, non alla pagina che lo contiene. La forma
 * `github.com/<owner>/<repo>/blob/<ramo>/<file>?raw=true` è l'indirizzo di una
 * pagina HTML che risponde con un redirect: come `src` di un'immagine costa un
 * salto in più, viene servita da github.com (più lenta e soggetta a limiti di
 * frequenza) e viene bloccata da alcune estensioni per la privacy. Il risultato
 * è che proprio nel momento in cui il logo serve — quando il caricamento da
 * Firestore è lento — il ripiego non compariva.
 *
 * Il resto del progetto usa già `raw.githubusercontent.com`, che serve il file
 * direttamente.
 */
export const FALLBACK_LOGO_URL =
  "https://raw.githubusercontent.com/raffaele-ando/Logo-vari/main/logo.png";

/**
 * Riscrive gli indirizzi GitHub salvati nella forma "pagina" verso quella
 * "file". I documenti già presenti in `logos` possono contenere la vecchia
 * forma: normalizzandola qui si correggono senza dover toccare il database.
 */
export const normalizeLogoUrl = (url: string | null): string | null => {
  if (!url) return url;
  const m = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^?]+)/i,
  );
  if (!m) return url;
  return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
};

const LS_LOGO_PREFIX = "agora_logo_";
const LS_SCALES_KEY = "agora_logo_scales";

/**
 * Cache persistente degli indirizzi dei loghi.
 *
 * Il logo attendeva una lettura Firestore a OGNI caricamento di pagina: finché
 * quella non tornava, l'intestazione restava vuota — ed è la prima cosa che si
 * guarda. Ricordando l'indirizzo si disegna subito, mentre la lettura prosegue
 * in sottofondo e corregge il valore se nel frattempo è cambiato
 * (stale-while-revalidate). Si memorizza solo un URL, non l'immagine.
 */
const readStoredLogo = (name: string): string | null | undefined => {
  try {
    const raw = localStorage.getItem(LS_LOGO_PREFIX + name);
    if (raw === null) return undefined;   // mai memorizzato
    return raw === "" ? null : raw;       // memorizzato come "assente"
  } catch {
    return undefined;
  }
};

const writeStoredLogo = (name: string, url: string | null) => {
  try {
    localStorage.setItem(LS_LOGO_PREFIX + name, url ?? "");
  } catch {}
};

const logoCache: Record<string, string | null> = {};
const pendingPromises: Record<string, Promise<string | null>> = {};
const listeners: Record<string, Set<(url: string | null) => void>> = {};
/** Nomi già riletti da Firestore in questa sessione. */
const revalidated = new Set<string>();

// Idratazione all'avvio del modulo: deve avvenire PRIMA del primo render,
// altrimenti il componente troverebbe la cache vuota, mostrerebbe il segnaposto
// e il valore ricordato non servirebbe a nulla.
try {
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(LS_LOGO_PREFIX)) continue;
    const name = k.slice(LS_LOGO_PREFIX.length);
    const v = localStorage.getItem(k);
    logoCache[name] = v ? v : null;
  }
} catch {}

let scalesCache: { zoneScale: number, agoraScale: number, customLogoScale: number, spacing: number } | null = null;
const scalesListeners = new Set<(scales: any) => void>();

export const fetchLogoScales = async () => {
  if (scalesCache) return scalesCache;
  // Valore ricordato: evita che l'intestazione salti di dimensione al primo
  // disegno mentre la lettura da Firestore è ancora in corso.
  try {
    const stored = localStorage.getItem(LS_SCALES_KEY);
    if (stored) {
      scalesCache = JSON.parse(stored);
      scalesListeners.forEach(cb => cb(scalesCache));
    }
  } catch {}
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
  try {
    localStorage.setItem(LS_SCALES_KEY, JSON.stringify(scalesCache));
  } catch {}
  scalesListeners.forEach(cb => cb(scalesCache));
  return scalesCache;
};

export const updateLogoScalesCache = (newScales: any) => {
  scalesCache = newScales;
  scalesListeners.forEach(cb => cb(scalesCache));
};


export const clearLogoCache = () => {
  revalidated.clear();
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(LS_LOGO_PREFIX)) localStorage.removeItem(k);
    }
  } catch {}
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
  // Valore ricordato dalla visita precedente: disponibile subito.
  if (!(name in logoCache)) {
    const stored = readStoredLogo(name);
    if (stored !== undefined) logoCache[name] = stored;
  }

  const cached = name in logoCache ? logoCache[name] : undefined;

  // Già riletto in questa sessione: nessuna richiesta ulteriore.
  if (cached !== undefined && revalidated.has(name)) return cached;
  if (name in pendingPromises) return cached !== undefined ? cached : pendingPromises[name];

  const promise = (async () => {
    try {
      const snap = await getDoc(doc(db, "logos", name));
      const raw = snap.exists() && snap.data()?.dataUrl ? snap.data().dataUrl : null;
      const url = normalizeLogoUrl(raw);
      revalidated.add(name);
      const changed = logoCache[name] !== url;
      logoCache[name] = url;
      writeStoredLogo(name, url);
      // Si avvisano gli ascoltatori solo se il valore è DIVERSO da quello già
      // mostrato, per non far lampeggiare un logo già corretto.
      if (changed && listeners[name]) {
        listeners[name].forEach(cb => cb(url));
      }
      return url;
    } catch {
      // Firestore irraggiungibile: si tiene quanto ricordato invece di
      // cancellarlo, così un problema di rete non fa sparire il logo.
      if (cached === undefined && listeners[name]) {
        listeners[name].forEach(cb => cb(null));
      }
      return cached ?? null;
    } finally {
      delete pendingPromises[name];
    }
  })();

  pendingPromises[name] = promise;
  // Se abbiamo già un valore ricordato lo restituiamo subito, senza attendere.
  return cached !== undefined ? cached : promise;
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

    const known = logoName in logoCache;

    // Con un valore già noto si disegna subito: niente segnaposto, niente
    // attesa. La rilettura parte comunque, così un logo cambiato arriva.
    if (known) {
      setUrl(logoCache[logoName]);
      setLoading(false);
      if (!logoCache[logoName]) setFailed(true);
    } else {
      setLoading(true);
    }

    const t = known
      ? null
      : setTimeout(() => {
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
      if (t) clearTimeout(t);
      listeners[logoName]?.delete(cb);
    };
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
               src={FALLBACK_LOGO_URL}
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
