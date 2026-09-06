import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import { readDocDataSafe } from "../../utils/firestoreRead";

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
/**
 * Il ripiego ora è un file NOSTRO, servito dallo stesso indirizzo del sito.
 *
 * Prima puntava a raw.githubusercontent.com. Un ripiego che dipende da un
 * host di terze parti non è un ripiego: interviene proprio quando la rete va
 * male, cioè quando quell'host ha le stesse probabilità di non rispondere.
 * Inoltre GitHub applica limiti di frequenza e alcune estensioni per la
 * privacy bloccano il dominio: in quei casi il logo semplicemente non
 * compariva, come si vede nelle segnalazioni.
 *
 * Il file è già nel repository (è lo stesso marchio usato da Agorà Orbite),
 * quindi viene servito dal medesimo dominio, entra nella cache del browser
 * con il resto del sito e non ha alcun punto di rottura esterno.
 */
export const FALLBACK_LOGO_URL = `${import.meta.env.BASE_URL}agora-logo.png`;

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
  // Anche questa lettura passa dalla versione con scadenza: era l'ultima che
  // poteva restare appesa e bloccare le proporzioni dell'intestazione.
  const d = await readDocDataSafe<{
    zoneScale?: number;
    agoraScale?: number;
    customLogoScale?: number;
    spacing?: number;
  }>(["settings", "logo_scales"]);
  scalesCache = {
    zoneScale: d?.zoneScale ?? 1,
    agoraScale: d?.agoraScale ?? 1,
    customLogoScale: d?.customLogoScale ?? 1,
    spacing: d?.spacing ?? 8,
  };
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
      // readDocDataSafe si arrende dopo qualche secondo invece di restare
      // appesa: getDoc NON rifiuta quando Firestore non riesce a collegarsi,
      // e quell'attesa senza fine è ciò che lasciava il logo come rettangolo
      // grigio pulsante finché non si ricaricava la pagina.
      const data = await readDocDataSafe<{ dataUrl?: string }>(["logos", name]);
      const url = normalizeLogoUrl(data?.dataUrl ?? null);
      revalidated.add(name);
      logoCache[name] = url;
      writeStoredLogo(name, url);
      // Gli ascoltatori vanno avvisati SEMPRE, anche quando il valore non è
      // cambiato: il messaggio non è solo "ecco il logo", è anche "ho finito
      // di cercarlo". Senza, chi era in attesa restava sul segnaposto per
      // sempre nel caso — comunissimo — in cui il valore coincide con quello
      // già ricordato.
      if (listeners[name]) {
        listeners[name].forEach((cb) => cb(url));
      }
      return url;
    } catch {
      // Firestore irraggiungibile: si tiene quanto ricordato invece di
      // cancellarlo, così un problema di rete non fa sparire il logo.
      if (listeners[name]) {
        listeners[name].forEach((cb) => cb(cached ?? null));
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
  /** Attesa esaurita: si smette di mostrare il segnaposto grigio. */
  const [gaveUp, setGaveUp] = useState(false);
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
    setGaveUp(false);

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

    // Resa breve. Oltre questa soglia si smette di mostrare il segnaposto e si
    // disegna il ripiego: un rettangolo grigio pulsante non dice nulla a chi
    // guarda, mentre il marchio — anche se non è quello personalizzato — è
    // esatto nove volte su dieci ed è comunque meglio di un buco.
    const t = known
      ? null
      : setTimeout(() => {
          if (!mounted || logoName in logoCache) return;
          setTimeoutText(true);   // usato quando c'è un testo di ripiego
          setGaveUp(true);        // ...e negli altri casi: mostra il marchio
        }, 1200);

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

  // Il segnaposto dura al massimo il tempo della resa (gaveUp). Prima la
  // condizione era il solo `loading`, che veniva azzerato unicamente dalla
  // risposta di Firestore: se quella non arrivava mai — e con getDoc succede,
  // perché non rifiuta — il rettangolo grigio restava lì per sempre. È il
  // riquadro vuoto al posto del logo nella schermata d'accesso.
  if (loading && !gaveUp && !finalSrc && !showTextFallback) {
    return <div className={cn("flex items-center justify-center animate-pulse bg-[var(--ag-surface-2)] rounded-lg", className, hasSizing ? "" : "w-56 h-20 md:w-64 md:h-24")} />
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
