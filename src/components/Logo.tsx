import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const logoCache: Record<string, string | null> = {};
const pendingPromises: Record<string, Promise<string | null>> = {};

export const clearLogoCache = () => {
  for (const key in logoCache) delete logoCache[key];
  for (const key in pendingPromises) delete pendingPromises[key];
};

const fetchLogoCached = async (name: string): Promise<string | null> => {
  if (name in logoCache) return logoCache[name];
  if (pendingPromises[name]) return pendingPromises[name];

  const promise = getDoc(doc(db, "logos", name)).then(docSnap => {
    const url = docSnap.exists() && docSnap.data()?.dataUrl ? docSnap.data().dataUrl : null;
    logoCache[name] = url;
    return url;
  }).catch(() => {
    logoCache[name] = null;
    return null;
  });
  
  pendingPromises[name] = promise;
  return promise;
};

export function Logo({ className, logoName = "default", fallbackText, forceTextFallback = false }: { className?: string; logoName?: string; fallbackText?: string, forceTextFallback?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(logoCache[logoName] || null);
  const [agoraOnlyUrl, setAgoraOnlyUrl] = useState<string | null>(logoCache["agora_soltanto"] || null);
  
  // If we already have it in cache, we don't need to show loading
  const isImmediatelyAvailable = (logoName in logoCache) && (fallbackText ? ("agora_soltanto" in logoCache) : true);
  const [loading, setLoading] = useState(!isImmediatelyAvailable);
  
  useEffect(() => {
    let isMounted = true;
    const fetchLogo = async () => {
      setLoading(true);
      try {
        const logoUrl = await fetchLogoCached(logoName);
        let mainLogoExists = false;
        
        if (logoUrl) {
          if (isMounted) {
            setCustomLogoUrl(logoUrl);
            setImgFailed(false);
            mainLogoExists = true;
          }
        } 
        
        if (!mainLogoExists) {
          if (logoName !== "default" && !forceTextFallback && !fallbackText) {
            const defaultUrl = await fetchLogoCached("default");
            if (defaultUrl && isMounted) {
               setCustomLogoUrl(defaultUrl);
               setImgFailed(false);
            } else if (isMounted) {
               setImgFailed(true);
            }
          } else if (isMounted) {
            setImgFailed(true);
          }
        }

        if (fallbackText || forceTextFallback) {
           const agoraUrl = await fetchLogoCached("agora_soltanto");
           if (agoraUrl && isMounted) {
              setAgoraOnlyUrl(agoraUrl);
           } else {
              const defUrl = await fetchLogoCached("default");
              if (defUrl && isMounted) {
                 setAgoraOnlyUrl(defUrl);
              }
           }
        }
      } catch (err) {
        console.error("Error fetching custom logo", err);
        if (isMounted) setImgFailed(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    // Always call fetchLogo to ensure promises are handled, but if cached it will be fast
    fetchLogo();
    
    return () => { isMounted = false; };
  }, [logoName, forceTextFallback, fallbackText]);

  const hasSizing = className && (className.includes("w-") || className.includes("h-"));

  if (loading && !customLogoUrl && !imgFailed) {
    return (
      <div className={cn("flex items-center justify-center select-none animate-pulse bg-gray-200/50 dark:bg-gray-800/50 rounded-lg", className, hasSizing ? "" : "w-56 h-20 md:w-64 md:h-24")} />
    );
  }

  const shouldShowText = imgFailed && fallbackText;

  return (
    <div
      className={cn("flex items-center justify-center select-none", className)}
    >
      <div
        className={cn(
          "flex items-center justify-center relative",
          hasSizing ? "w-full h-full" : "w-56 h-20 md:w-64 md:h-24",
        )}
      >
        {(!imgFailed || !shouldShowText) && (
          <img
            src={customLogoUrl || "https://github.com/raffaele-ando/Logo-vari/blob/main/logo.png?raw=true"}
            alt="Agorà Logo"
            className={cn("w-full h-full object-contain z-10 block dark:invert", shouldShowText ? "hidden" : "")}
            onError={() => setImgFailed(true)}
          />
        )}
        
        {(imgFailed || forceTextFallback) && fallbackText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 style={{ fontFamily: 'var(--font-spartan)' }} className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter text-black dark:text-white leading-none text-center z-10 mb-0">
              {fallbackText}
            </h1>
            {agoraOnlyUrl ? (
               <img src={agoraOnlyUrl} alt="Agorà" className="w-1/4 object-contain -mt-1 sm:-mt-2 dark:invert" />
            ) : (
               <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tighter text-black dark:text-white leading-none text-center -mt-1 sm:-mt-2">
                 <span className="text-[#DC5F00]">AGORÀ</span>
               </h1>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
