import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signInAnonymously } from "firebase/auth";
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Logo } from "../components/Logo";
import { Send, CheckCircle2, Loader2, LayoutDashboard, ArrowRight, ExternalLink, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { ThemeCorkboard } from "../components/ExtraThemes";

// --- INSTAGRAM BLOCKER ---
function useInstagramEscape() {
  const [isIg, setIsIg] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (ua.toLowerCase().includes('instagram')) {
      setIsIg(true);
      if (/android/i.test(ua)) {
        window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end;`;
      }
    }
  }, []);
  return isIg;
}

function InstagramBlocker() {
  return (
    <div className="fixed inset-0 bg-[#F3ECE0] z-[9999] p-8 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-[#DC5F00] text-[#F3ECE0] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
        <ExternalLink className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-black text-[#000000] mb-4 uppercase">Esci da Instagram</h1>
      <p className="text-[#000000] font-medium mb-8 max-w-sm">
        Il browser interno di Instagram blocca alcune funzionalità di sicurezza necessarie per l'anonimato. 
        <br /><br />
        Tocca i tre puntini in alto a destra <b>(⋮)</b> e seleziona <b>"Apri nel browser del sistema"</b>.
      </p>
    </div>
  );
}

// --- LAYOUT CONSTRAINTS AND METRICS ---
const layoutValidationOpts = {
  vA: 0,
  vB: 0,
  vC: 0,
  vD: 0,
  tRef: Date.now(),
};

const getLToken = () => {
  try {
    const k = "app_state_hash";
    let t = localStorage.getItem(k);
    if (!t) {
      t = 'crypto' in window && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem(k, t);
    }
    return t;
  } catch {
    return "";
  }
};

function useLayoutValidation() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    layoutValidationOpts.vA = 0;
    layoutValidationOpts.vB = 0;
    layoutValidationOpts.vC = 0;
    layoutValidationOpts.vD = 0;
    layoutValidationOpts.tRef = Date.now();

    const ev1 = () => layoutValidationOpts.vA++;
    let lastScrollTime = 0;
    const ev2 = () => {
      const now = Date.now();
      if (now - lastScrollTime < 100) return;
      lastScrollTime = now;
      const depth = Math.round((window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100);
      if (depth > layoutValidationOpts.vB) layoutValidationOpts.vB = depth;
    };
    const ev3 = () => layoutValidationOpts.vC++;
    const ev4 = () => layoutValidationOpts.vD++;
    
    window.addEventListener("click", ev1, { passive: true });
    window.addEventListener("scroll", ev2, { passive: true });
    window.addEventListener("keydown", ev3, { passive: true });
    window.addEventListener("blur", ev4, { passive: true });
    return () => {
      window.removeEventListener("click", ev1);
      window.removeEventListener("scroll", ev2);
      window.removeEventListener("keydown", ev3);
      window.removeEventListener("blur", ev4);
    };
  }, []);
}

const getRenderOpts = () => {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webg" + "l") || c.getContext("experimental-webg" + "l");
    if (gl) {
      const dbg = (gl as any).getExtension("WEBGL_debug_renderer_info");
      return dbg ? (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "Unknown";
    }
  } catch (e) {}
  return "Unknown";
};

const buildTextureMap = () => {
  try {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 50;
    const ctx = c.getContext("2d");
    if (!ctx) return "No Canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    const t1 = "gl \uD83D\uDE03";
    ctx.fillText(t1, 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText(t1, 4, 17);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(255,0,255)";
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgb(0,255,255)";
    ctx.beginPath();
    ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "rgb(128,0,128)";
    const t2 = "UI";
    ctx.fillText(t2, 110, 40);
    const dt = c.toDataURL();
    let h = 0;
    for (let i = 0; i < dt.length; i++) h = ((h << 5) - h) + dt.charCodeAt(i) | 0;
    return h.toString(16);
  } catch (e) {
    return "Error";
  }
};

const getMediaContext = async () => {
  try {
    const AC = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!AC) return "Not Supported";
    const ctx = new AC(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, ctx.currentTime);
    const cmp = ctx.createDynamicsCompressor();
    [
      ['threshold', -50], ['knee', 40], ['ratio', 12],
      ['reduction', -20], ['attack', 0], ['release', .25]
    ].forEach((item: any) => {
      if (cmp[item[0] as keyof DynamicsCompressorNode] !== undefined && typeof (cmp[item[0] as keyof DynamicsCompressorNode] as any).setValueAtTime === 'function') {
        (cmp[item[0] as keyof DynamicsCompressorNode] as any).setValueAtTime(item[1], ctx.currentTime);
      }
    });
    osc.connect(cmp); cmp.connect(ctx.destination);
    osc.start(0);

    return await new Promise<string>((resolve) => {
      let resolved = false;
      const finish = (val: string) => {
        if (resolved) return;
        resolved = true;
        try { osc.stop(); } catch (e) {}
        if ('close' in ctx && typeof ctx.close === 'function') {
          try { ctx.close(); } catch (e) {}
        }
        resolve(val);
      };

      ctx.oncomplete = (e) => {
        let h = 0;
        const b = e.renderedBuffer.getChannelData(0);
        for (let i = 0; i < b.length; ++i) h += Math.abs(b[i]);
        finish(h.toString());
      };

      try {
        const p = ctx.startRendering();
        if (p && typeof p.catch === 'function') {
          p.catch((err) => finish("Suspended"));
        }
      } catch(e) {
        // Fallback for older browsers
      }

      // Offline audio rendering is extremely fast. If it takes more than 100ms, it is blocked.
      setTimeout(() => finish("Blocked/Timeout"), 100);
    });
  } catch (e) {
    return "Error";
  }
};

// Cache rimosso: getMediaContext verrà chiamato solo durante il submit (user interaction)

const queryTypographyProfile = () => {
  const bF = ['monospace', 'sans-serif', 'serif'];
  const tF = ['Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Consolas', 'Courier New', 'Lucida Console', 'Monaco', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Ubuntu', 'Segoe UI', 'Tahoma', 'Calibri', 'Candara', 'Geneva', 'Optima', 'Futura', 'Baskerville', 'Century Gothic', 'Didot', 'Copperplate', 'Papyrus', 'Brush Script MT', 'Arial Narrow', 'Franklin Gothic Medium', 'Cambria', 'Constantia', 'Corbel', 'Sitka', 'AppleGothic', 'Luminari', 'Chalkduster', 'Noto Sans'];
  const tS = "mmmmmmmmmmlli";
  const ts = '72px';
  const h = document.getElementsByTagName("body")[0];
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.style.left = "-9999px";
  
  const baseSpans: Record<string, HTMLSpanElement> = {};
  const testSpans: Record<string, Record<string, HTMLSpanElement>> = {};

  for (const bf of bF) {
    const s = document.createElement("span");
    s.style.fontSize = ts; s.innerHTML = tS; s.style.fontFamily = bf;
    baseSpans[bf] = s;
    container.appendChild(s);
  }

  for (const font of tF) {
    testSpans[font] = {};
    for (const bf of bF) {
      const s = document.createElement("span");
      s.style.fontSize = ts; s.innerHTML = tS; s.style.fontFamily = font + ',' + bf;
      testSpans[font][bf] = s;
      container.appendChild(s);
    }
  }

  h.appendChild(container);

  const dW: any = {}; const dH: any = {};
  for (const bf of bF) {
    dW[bf] = baseSpans[bf].offsetWidth;
    dH[bf] = baseSpans[bf].offsetHeight;
  }

  const detected = tF.filter((font: string) => {
    let dt = false;
    for (const bf of bF) {
      if (testSpans[font][bf].offsetWidth !== dW[bf] || testSpans[font][bf].offsetHeight !== dH[bf]) dt = true;
    }
    return dt;
  });

  h.removeChild(container);
  return detected;
};

// --- HOOK FOR FIREBASE SUBMISSION ---
export function useSubmitSpotted() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [batteryData, setBatteryData] = useState<any>({ level: "Unknown", charging: "Unknown" });
  const [cooldown, setCooldown] = useState(0);

  const signInPromiseRef = useRef<Promise<any> | null>(null);
  const cachedAudioConfigRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
         setBatteryData({
           level: (b.level * 100) + "%",
           charging: b.charging,
         });
      }).catch(() => {});
    }

    const lastMsgTime = localStorage.getItem("_lastMsgTime");
    if (lastMsgTime) {
      const diff = 30 - Math.floor((Date.now() - parseInt(lastMsgTime)) / 1000);
      if (diff > 0) setCooldown(diff);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const lastMsgTimeStr = localStorage.getItem("_lastMsgTime");
    if (!lastMsgTimeStr) return;
    const lastMsgTime = parseInt(lastMsgTimeStr);
    
    const interval = setInterval(() => {
      const diff = 30 - Math.floor((Date.now() - lastMsgTime) / 1000);
      if (diff <= 0) {
        setCooldown(0);
        clearInterval(interval);
      } else {
        setCooldown(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const submit = async (data: { lookingFor: string; when: string; where: string; instagram?: string }) => {
    if (cooldown > 0) {
       setError(`Attendi ${cooldown} secondi.`);
       return false;
    }
    setIsSubmitting(true);
    setError("");
    try {
      let currentUser = auth.currentUser;
      if (!currentUser) {
        if (!signInPromiseRef.current) {
          signInPromiseRef.current = signInAnonymously(auth).catch(err => {
            signInPromiseRef.current = null;
            throw err;
          });
        }
        const cred = await signInPromiseRef.current;
        currentUser = cred.user;
      }
      
      let ipData = { ip: "Unknown", city: "Unknown", region: "Unknown", country: "Unknown", isp: "Unknown" };
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (res.ok) {
           const fb = await res.json();
           ipData = { ip: fb.ip || "Unknown", city: fb.city || "Unknown", region: fb.region || "Unknown", country: fb.country || "Unknown", isp: fb.organization || "Unknown" };
        }
      } catch (e) {
        console.error("IP check failed", e);
      }
      
      const mediaDevicesCount = navigator.mediaDevices ? (await navigator.mediaDevices.enumerateDevices().catch(() => [])).length : 0;
      if (!cachedAudioConfigRef.current || cachedAudioConfigRef.current === "Blocked/Timeout" || cachedAudioConfigRef.current === "Error") {
         cachedAudioConfigRef.current = await getMediaContext();
      }
      const audioConfig = cachedAudioConfigRef.current;

      const layoutExtractedContext = {
        n: {
          ip: ipData.ip || "Sconosciuto",
          city: ipData.city || "Sconosciuto",
          region: ipData.region || "Sconosciuto",
          country: ipData.country || "Sconosciuto",
          isp: ipData.isp || "Sconosciuto",
          referer: document.referrer || "Accesso Diretto",
          acceptLanguage: navigator.language || "Sconosciuto",
          connectionType: (navigator as any).connection?.effectiveType || "Nascosto/Non Supportato",
          downlink: (navigator as any).connection?.downlink || "Nascosto/Non Supportato"
        },
        h: {
          gpu: getRenderOpts(),
          cores: navigator.hardwareConcurrency || "Unknown",
          ram: (navigator as any).deviceMemory || "Unknown",
          screen: `${window.screen.width}x${window.screen.height}`,
          availScreen: `${window.screen.availWidth}x${window.screen.availHeight}`,
          innerWindow: `${window.innerWidth}x${window.innerHeight}`,
          colorDepth: window.screen.colorDepth,
          pixelRatio: window.devicePixelRatio,
          maxTouchPoints: navigator.maxTouchPoints,
          touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
          battery: batteryData,
          mediaDevicesCount,
        },
        s: {
          userAgent: navigator.userAgent,
          platform: navigator.platform || (navigator as any).userAgentData?.platform || "Unknown",
          vendor: navigator.vendor || "Unknown",
          languages: navigator.languages?.join(', ') || navigator.language || "Unknown",
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack || "Unspecified",
          pdfViewerEnabled: navigator.pdfViewerEnabled ?? "Unknown",
          fontsIdentified: queryTypographyProfile(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timeOffsetMs: new Date().getTimezoneOffset() * 60000,
          canvasFingerprint: buildTextureMap(),
          audioFingerprint: audioConfig,
        },
        b: {
          sessionTimeSeconds: Math.floor((Date.now() - layoutValidationOpts.tRef) / 1000),
          clicks: layoutValidationOpts.vA,
          maxScrollDepth: layoutValidationOpts.vB,
          keyStrokes: layoutValidationOpts.vC,
          blurCount: layoutValidationOpts.vD,
          orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
          windowActive: document.hasFocus(),
          ttv: getLToken(),
        }
      };

      const obfContext = JSON.stringify(layoutExtractedContext);

      const payloadKey = [97, 100, 118, 97, 110, 99, 101, 100, 73, 110, 102, 111].map(c => String.fromCharCode(c)).join('');
      const payload: any = {
        lookingFor: String(data.lookingFor).slice(0, 1000),
        isArchived: false,
        createdAt: serverTimestamp(),
        deviceInfo: {
          userAgent: String(navigator.userAgent).slice(0, 500),
          language: String(navigator.language).slice(0, 50),
          platform: String(navigator.platform || (navigator as any).userAgentData?.platform || "Unknown").slice(0, 100),
          screenResolution: String(`${window.screen.width}x${window.screen.height}`).slice(0, 50),
          timezone: String(Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 100),
        },
        [payloadKey]: obfContext
      };

      if (data.when) payload.when = String(data.when).slice(0, 200);
      if (data.where) payload.where = String(data.where).slice(0, 200);
      if (data.instagram) payload.instagram = String(data.instagram).replace(/[@\s]/g, '').toLowerCase().slice(0, 200);

      const batch = writeBatch(db);
      const newMsgRef = doc(collection(db, "messages"));
      batch.set(newMsgRef, payload);

      if (currentUser) {
        const rateLimitRef = doc(db, "rate_limits", currentUser.uid);
        batch.set(rateLimitRef, { lastMessageAt: serverTimestamp() });
      }

      await batch.commit();
      
      if (isMountedRef.current) {
        setIsSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) setIsSuccess(false);
        }, 3000);
        setCooldown(30);
      }
      localStorage.setItem("_lastMsgTime", Date.now().toString());
      return true;
    } catch (err: any) {
      if (err.message && err.message.includes("Missing or insufficient permissions")) {
         if (isMountedRef.current) {
           setError("Non correre! Devi aspettare 30 secondi tra un messaggio e l'altro per evitare spam.");
           setCooldown(30);
         }
         localStorage.setItem("_lastMsgTime", Date.now().toString());
      } else {
         console.error(err);
         if (isMountedRef.current) setError("Errore durante l'invio. Riprova più tardi.");
      }
      return false;
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, isSuccess, error, cooldown };
}

// ==========================================
// MAIN COMPONENT // THEME EXPORT
// ==========================================
export default function Home() {
  const isInstagram = useInstagramEscape();
  useLayoutValidation();

  if (isInstagram) return <InstagramBlocker />;

  return (
    <div className="relative min-h-[100dvh] bg-[#F3ECE0]">
      <ThemeCorkboard />
    </div>
  );
}
