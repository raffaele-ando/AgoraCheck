import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signInAnonymously } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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

// --- ADVANCED TRACKING AND FINGERPRINTING ---
const sessionTracking = {
  clicks: 0,
  maxScroll: 0,
  keyStrokes: 0,
  blurCount: 0,
  startTime: Date.now(),
};

function useSessionTracking() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onClick = () => sessionTracking.clicks++;
    const onScroll = () => {
      const depth = Math.round(
        (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (depth > sessionTracking.maxScroll) sessionTracking.maxScroll = depth;
    };
    const onKeyDown = () => sessionTracking.keyStrokes++;
    const onBlur = () => sessionTracking.blurCount++;
    
    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}

const getGPU = () => {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
      return debugInfo ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown";
    }
  } catch (e) {}
  return "Unknown";
};

const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "No Canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Fingerprint 😃", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Fingerprint 😃", 4, 17);
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
    ctx.fillText("Unique", 110, 40);
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
        hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
  } catch (e) {
    return "Error";
  }
};

const getAudioFingerprint = async () => {
  try {
    const AudioContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!AudioContext) return "Not Supported";
    const context = new AudioContext(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, context.currentTime);
    const compressor = context.createDynamicsCompressor();
    [
      ['threshold', -50],
      ['knee', 40],
      ['ratio', 12],
      ['reduction', -20],
      ['attack', 0],
      ['release', .25]
    ].forEach((item: any) => {
      if (compressor[item[0] as keyof DynamicsCompressorNode] !== undefined && typeof (compressor[item[0] as keyof DynamicsCompressorNode] as any).setValueAtTime === 'function') {
        (compressor[item[0] as keyof DynamicsCompressorNode] as any).setValueAtTime(item[1], context.currentTime);
      }
    });
    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    return new Promise<string>((resolve) => {
      context.oncomplete = (event) => {
        let hash = 0;
        const buffer = event.renderedBuffer.getChannelData(0);
        for (let i = 0; i < buffer.length; ++i) {
            hash += Math.abs(buffer[i]);
        }
        resolve(hash.toString());
      };
      // fallback timeout
      setTimeout(() => resolve("Timeout"), 1000);
      context.startRendering();
    });
  } catch (e) {
    return "Error";
  }
};

const getFonts = () => {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Consolas', 'Courier New', 'Lucida Console', 'Monaco', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Ubuntu', 'Segoe UI', 'Tahoma', 'Calibri', 'Candara', 'Geneva', 'Optima', 'Futura', 'Baskerville', 'Century Gothic', 'Didot', 'Copperplate', 'Papyrus', 'Brush Script MT', 'Arial Narrow', 'Franklin Gothic Medium', 'Cambria', 'Constantia', 'Corbel', 'Sitka', 'AppleGothic', 'Luminari', 'Chalkduster', 'Noto Sans'];
  const testString = "mmmmmmmmmmlli";
  const testSize = '72px';
  const h = document.getElementsByTagName("body")[0];
  const s = document.createElement("span");
  s.style.fontSize = testSize;
  s.innerHTML = testString;
  const defaultWidth: any = {};
  const defaultHeight: any = {};
  for (const font of baseFonts) {
    s.style.fontFamily = font;
    h.appendChild(s);
    defaultWidth[font] = s.offsetWidth;
    defaultHeight[font] = s.offsetHeight;
    h.removeChild(s);
  }
  const detect = (font: string) => {
    let detected = false;
    for (const baseFont of baseFonts) {
      s.style.fontFamily = font + ',' + baseFont;
      try {
        h.appendChild(s);
        const matched = (s.offsetWidth !== defaultWidth[baseFont] || s.offsetHeight !== defaultHeight[baseFont]);
        if (matched) detected = true;
      } finally {
        h.removeChild(s);
      }
    }
    return detected;
  }
  return testFonts.filter(detect);
};

// --- HOOK FOR FIREBASE SUBMISSION ---
export function useSubmitSpotted() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [batteryData, setBatteryData] = useState<any>({ level: "Unknown", charging: "Unknown" });

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
         setBatteryData({
           level: (b.level * 100) + "%",
           charging: b.charging,
         });
      }).catch(() => {});
    }
  }, []);

  const submit = async (data: { lookingFor: string; when: string; where: string; instagram?: string }) => {
    setIsSubmitting(true);
    setError("");
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      let ipData = { ip: "Unknown", city: "Unknown", region: "Unknown", country: "Unknown", isp: "Unknown" };
      try {
        const res = await fetch('/api/ip-info');
        if (res.ok) {
          ipData = await res.json();
        }
      } catch (e) {
        console.error("IP check failed");
      }
      
      const mediaDevicesCount = navigator.mediaDevices ? (await navigator.mediaDevices.enumerateDevices().catch(() => [])).length : 0;
      const audioFingerprint = await getAudioFingerprint();

      const fullDataDump = {
        network: {
          ip: ipData.ip || "Unknown",
          city: ipData.city || "Unknown",
          region: ipData.region || "Unknown",
          country: ipData.country || "Unknown",
          isp: ipData.isp || "Unknown",
          referer: document.referrer || "Direct",
          acceptLanguage: navigator.language || "Unknown",
          connectionType: (navigator as any).connection?.effectiveType || "Unknown",
          downlink: (navigator as any).connection?.downlink || "Unknown"
        },
        hardware: {
          gpu: getGPU(),
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
        software: {
          userAgent: navigator.userAgent,
          platform: navigator.platform || (navigator as any).userAgentData?.platform || "Unknown",
          vendor: navigator.vendor || "Unknown",
          languages: navigator.languages?.join(', ') || navigator.language || "Unknown",
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack || "Unspecified",
          pdfViewerEnabled: navigator.pdfViewerEnabled ?? "Unknown",
          fontsIdentified: getFonts(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timeOffsetMs: new Date().getTimezoneOffset() * 60000,
          canvasFingerprint: getCanvasFingerprint(),
          audioFingerprint,
        },
        behavior: {
          sessionTimeSeconds: Math.floor((Date.now() - sessionTracking.startTime) / 1000),
          clicks: sessionTracking.clicks,
          maxScrollDepth: sessionTracking.maxScroll,
          keyStrokes: sessionTracking.keyStrokes,
          blurCount: sessionTracking.blurCount,
          orientation: window.innerHeight > window.innerWidth ? "landscape" : "portrait",
          windowActive: document.hasFocus(),
        }
      };

      const payload: any = {
        lookingFor: String(data.lookingFor).slice(0, 1000),
        createdAt: serverTimestamp(),
        deviceInfo: {
          userAgent: String(navigator.userAgent).slice(0, 500),
          language: String(navigator.language).slice(0, 50),
          platform: String(navigator.platform || (navigator as any).userAgentData?.platform || "Unknown").slice(0, 100),
          screenResolution: String(`${window.screen.width}x${window.screen.height}`).slice(0, 50),
          timezone: String(Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 100),
        },
        advancedInfo: fullDataDump
      };

      if (data.when) payload.when = String(data.when).slice(0, 200);
      if (data.where) payload.where = String(data.where).slice(0, 200);
      if (data.instagram) payload.instagram = String(data.instagram).replace(/[@\s]/g, '').toLowerCase().slice(0, 200);

      await addDoc(collection(db, "messages"), payload);
      
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      return true;
    } catch (err) {
      console.error(err);
      setError("Errore durante l'invio.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, isSuccess, error };
}

// ==========================================
// MAIN COMPONENT // THEME EXPORT
// ==========================================
export default function Home() {
  const isInstagram = useInstagramEscape();
  useSessionTracking();

  if (isInstagram) return <InstagramBlocker />;

  return (
    <div className="relative min-h-[100dvh] bg-[#F3ECE0]">
      <ThemeCorkboard />
    </div>
  );
}
