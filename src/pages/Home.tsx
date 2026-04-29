import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signInAnonymously } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Logo } from "../components/Logo";
import { Send, CheckCircle2, Loader2, LayoutDashboard, ArrowRight, ExternalLink, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { ThemeRetro, ThemeReceipt, ThemeDossier, ThemeArcade, ThemeStories, ThemeCorkboard } from "../components/ExtraThemes";

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
        const res = await fetch('/polimi/api/ip-info');
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
          doNotTrack: navigator.doNotTrack || (window as any).doNotTrack || navigator.msDoNotTrack || "Unspecified",
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
// THEME 1: THE CLASSIC (Clean 3 Sections - Refined Glassmorphism)
// ==========================================
function ThemeClassic() {
  const { submit, isSubmitting, isSuccess, error } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "", instagram: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "", instagram: "" }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3ECE0] to-[#E8DEC8] flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md pt-16">
        <div className="mb-8"><Logo /></div>
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#000000] uppercase tracking-wider">🗓️ 1. Quando l'hai visto? <span className="opacity-50">(Opzionale)</span></label>
              <input
                type="text" placeholder="Es. Il 17 aprile alle 24:30" value={form.when} onChange={e => setForm({...form, when: e.target.value})}
                className="w-full p-4 bg-white/80 border-2 border-transparent focus:border-[#DC5F00]/50 focus:ring-4 focus:ring-[#DC5F00]/10 rounded-xl outline-none text-[#000000] transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#000000] uppercase tracking-wider">📍 2. Dove ti trovavi? <span className="opacity-50">(Opzionale)</span></label>
              <input
                type="text" placeholder="Es. Usciva dall'aula 4.0.1" value={form.where} onChange={e => setForm({...form, where: e.target.value})}
                className="w-full p-4 bg-white/80 border-2 border-transparent focus:border-[#DC5F00]/50 focus:ring-4 focus:ring-[#DC5F00]/10 rounded-xl outline-none text-[#000000] transition-all shadow-sm"
              />
            </div>

            <div className="space-y-3 bg-[#DC5F00]/5 p-4 rounded-2xl border border-[#DC5F00]/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#DC5F00] uppercase tracking-wider flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> 3. Il tuo Instagram
                </label>
                <span className="bg-white/60 text-[#000000]/50 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest backdrop-blur-sm">Non Obbligatorio</span>
              </div>
              <div className="text-xs text-[#000000]/60 leading-tight">Lasciaci il tuo tag se vuoi essere contattato in privato qualora qualcuno dovesse rispondere. Nessun altro lo vedrà.</div>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-bold text-[#000000]/40 pointer-events-none">@</span>
                <input
                  type="text" placeholder="tuo.tag" value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value.toLowerCase().replace(/[@\s]/g, '')})}
                  className="w-full p-4 pl-9 bg-white/80 border-2 border-transparent focus:border-[#DC5F00]/50 focus:ring-4 focus:ring-[#DC5F00]/10 rounded-xl outline-none text-[#000000] transition-all shadow-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#000000] uppercase tracking-wider">
                🔎 4. Chi o cosa stai cercando? <span className="text-[#DC5F00] text-lg leading-none">*</span>
              </label>
              <textarea
                placeholder="Descrivi in dettaglio (Es. Ragazzo alto con felpa blu e occhiali...)" required value={form.lookingFor} onChange={e => setForm({...form, lookingFor: e.target.value})}
                className="w-full p-4 bg-white/80 border-2 border-transparent focus:border-[#000000] rounded-xl resize-none outline-none h-28 text-[#000000] transition-all shadow-sm"
              />
            </div>
            
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            
            <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="w-full py-4 bg-[#000000] text-[#F3ECE0] rounded-xl font-bold uppercase tracking-widest flex justify-center items-center gap-2 disabled:opacity-50 hover:bg-[#DC5F00] transition-colors shadow-lg shadow-[#000000]/10">
              {isSubmitting ? <Loader2 className="animate-spin" /> : isSuccess ? <CheckCircle2 /> : <Send className="w-5 h-5" />}
              {isSuccess ? "Inviato!" : "Invia Spotted"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// THEME 2: THE FOCUS
// ==========================================
function ThemeFocus() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "", instagram: "" });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  const handleNext = () => {
    if (step === 3 && !form.lookingFor) return;
    if (step < 3) setStep(step + 1);
    else {
      submit(form).then(ok => {
        if (ok) {
          setStep(4);
          setTimeout(() => { setStep(0); setForm({ lookingFor: "", when: "", where: "", instagram: "" }); }, 3000);
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNext(); }
  };

  const questions = [
    { title: "🗓️ 1. Quando l'hai visto?", desc: "Es. Il 17 aprile alle 24:30 (Opzionale)", key: "when" },
    { title: "📍 2. Dove ti trovavi?", desc: "Es. Usciva dall'aula 4.0.1 (Opzionale)", key: "where" },
    { 
      title: "📸 3. Il tuo Instagram", 
      desc: "Ricevi una notifica in privato se ti rispondono. (Non Obbligatorio)", 
      key: "instagram",
      isOptional: true
    },
    { title: "🔎 4. Chi o cosa stai cercando?", desc: "Descrivi il target nei dettagli (Obbligatorio)", key: "lookingFor" }
  ];

  if (step === 4) {
    return (
      <div className="min-h-screen bg-[#F3ECE0] text-[#000000] flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-[#DC5F00]" />
          <h1 className="text-4xl font-black uppercase">Ricevuto.</h1>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[step];

  return (
    <div className="min-h-screen bg-[#F3ECE0] text-[#000000] flex flex-col justify-center p-8 md:p-20">
      <div className="max-w-3xl w-full mx-auto">
        <div className="text-[#DC5F00] font-black uppercase tracking-widest mb-8 text-sm">Passo {step + 1} di 4</div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.3 }}>
            <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase flex flex-col md:flex-row md:items-center gap-4">
              {currentQ.title} 
              {currentQ.isOptional && <span className="bg-[#DC5F00] text-white text-xs px-3 py-1 rounded-full w-fit tracking-widest font-bold">NON OBBLIGATORIO</span>}
            </h2>
            <p className="text-[#000000]/60 text-lg md:text-xl mb-8 font-medium">{currentQ.desc}</p>
            
            {step === 3 ? (
              <textarea
                ref={inputRef as any} value={form[currentQ.key as keyof typeof form]} onChange={e => setForm({...form, [currentQ.key]: e.target.value})} onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-b-4 border-[#000000]/10 focus:border-[#000000] text-3xl md:text-5xl font-bold outline-none py-4 resize-none h-32"
                placeholder="Scrivi qui..."
              />
            ) : (
              <input
                ref={inputRef as any} type="text" value={form[currentQ.key as keyof typeof form]} onChange={e => setForm({...form, [currentQ.key]: e.target.value})} onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-b-4 border-[#000000]/10 focus:border-[#000000] text-3xl md:text-5xl font-bold outline-none py-4"
                placeholder="Scrivi qui..."
              />
            )}

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleNext} disabled={step === 3 && !form.lookingFor || isSubmitting}
                className="px-8 py-4 bg-[#000000] text-[#F3ECE0] font-black uppercase rounded-full text-lg flex items-center gap-2 disabled:opacity-50 hover:bg-[#DC5F00] transition-colors shadow-xl"
              >
                {step === 3 ? (isSubmitting ? "Invio..." : "Invia Spotted") : "Avanti"} <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-[#000000]/40 font-bold uppercase text-xs hidden md:inline">premi Invio ↵</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==========================================
// THEME 3: THE CHATBOT
// ==========================================
function ThemeChat() {
  const { submit, isSubmitting } = useSubmitSpotted();
  const [history, setHistory] = useState<{sender: 'bot'|'user', text: string}[]>([
    { sender: 'bot', text: "Ciao! 👋 🗓️ 1. Ti ricordi QUANDO l'hai visto? (Opzionale)" }
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "", instagram: "" });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    // We allow skipping step 0, 1 and 2 (optional) if input is empty, but not step 3
    if (!input.trim() && step === 3) return;

    const newHistory = [...history, { sender: 'user' as const, text: input.trim() ? input : "[Saltato]" }];
    setHistory(newHistory);
    setInput("");

    if (step === 0) {
      setForm({ ...form, when: input });
      setTimeout(() => setHistory(h => [...h, { sender: 'bot', text: "Ottimo. 📍 2. DOVE ti trovavi esattamente? (Opzionale)" }]), 500);
      setStep(1);
    } else if (step === 1) {
      setForm({ ...form, where: input });
      setTimeout(() => setHistory(h => [...h, { sender: 'bot', text: "Ok. 📸 3. Qual è il tuo tag INSTAGRAM? Ti avviseremo lì in privato se ti rispondono. (Opzionale. Es @agora)" }]), 500);
      setStep(2);
    } else if (step === 2) {
      setForm({ ...form, instagram: input });
      setTimeout(() => setHistory(h => [...h, { sender: 'bot', text: "Perfetto. Infine, 🔎 4. CHI o cosa stai cercando? (Obbligatorio)" }]), 500);
      setStep(3);
    } else if (step === 3) {
      const finalForm = { ...form, lookingFor: input };
      setForm(finalForm);
      setStep(4);
      
      setTimeout(async () => {
        const ok = await submit(finalForm);
        if (ok) {
          setHistory(h => [...h, { sender: 'bot', text: "Spotted inviato con successo! 🕵️‍♂️" }]);
          setTimeout(() => {
            setHistory([{ sender: 'bot', text: "Inviarne un altro? 🗓️ 1. QUANDO l'hai visto? (Opzionale)" }]);
            setStep(0);
            setForm({ lookingFor: "", when: "", where: "", instagram: "" });
          }, 3000);
        } else {
          setHistory(h => [...h, { sender: 'bot', text: "Ops, errore di rete." }]);
          setStep(3);
        }
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3ECE0] flex flex-col items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl h-[100dvh] sm:h-[80vh] flex flex-col overflow-hidden border-4 border-[#000000]">
        
        <div className="bg-[#000000] text-[#F3ECE0] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#DC5F00] rounded-full flex items-center justify-center font-black">A</div>
          <div>
            <h3 className="font-bold leading-tight">Agorà Bot</h3>
            <p className="text-xs text-[#DC5F00] font-bold">Online</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F3ECE0]/50 flex flex-col">
          {history.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i + '-' + msg.text.substring(0, 10)} 
              className={cn("max-w-[80%] p-3 rounded-2xl font-medium w-fit", msg.sender === 'bot' ? "bg-white text-[#000000] rounded-tl-none self-start shadow-sm border border-[#000000]/10" : "bg-[#000000] text-[#F3ECE0] rounded-tr-none self-end shadow-md")}
            >
              {msg.text}
            </motion.div>
          ))}
          {isSubmitting && (
            <div className="bg-white text-black rounded-2xl rounded-tl-none p-3 max-w-[80%] self-start w-fit border border-[#000000]/10">
              <Loader2 className="w-4 h-4 animate-spin text-[#000000]" />
            </div>
          )}
          <div ref={bottomRef} className="shrink-0" />
        </div>

        <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#000000]/10 flex gap-2">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)} disabled={step === 4 || isSubmitting}
            placeholder={step < 3 ? "Scrivi (o premi Invia per saltare)..." : "Scrivi il target..."}
            className="flex-1 rounded-full px-4 py-3 outline-none border border-[#000000]/20 focus:border-[#000000] bg-[#F3ECE0]"
          />
          <button disabled={(!input.trim() && step === 3) || step === 4 || isSubmitting} className="w-12 h-12 bg-[#DC5F00] hover:bg-[#000000] transition-colors rounded-full flex items-center justify-center text-[#F3ECE0] disabled:opacity-50 shrink-0 shadow-lg">
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// THEME 4: THE NOTICE BOARD (Brutalist Brand-Aligned Poster)
// ==========================================
function ThemeBoard() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "", instagram: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "", instagram: "" }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F3ECE0] relative overflow-hidden">
      {/* Subtle minimalist grid using strictly black */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000000_2px,transparent_2px)] [background-size:24px_24px]"></div>
      
      <motion.div initial={{ rotate: -2, scale: 0.9, y: 20 }} animate={{ rotate: -2, scale: 1, y: 0 }} transition={{ type: "spring", damping: 12, stiffness: 100 }} className="relative w-full max-w-sm bg-white p-6 sm:p-8 border-4 border-[#000000] shadow-[12px_12px_0_#DC5F00]">
        
        {/* Brutalist Orange Tape */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-12 bg-[#DC5F00] rotate-[3deg] border-4 border-[#000000] flex flex-col justify-center gap-1 items-center z-10 shadow-sm">
           <div className="w-full border-t-2 border-[#000000]/30 border-dashed"></div>
           <div className="w-full border-t-2 border-[#000000]/30 border-dashed"></div>
        </div>
        
        {/* Header */}
        <div className="mt-4 mb-6 text-center border-b-4 border-[#000000] pb-4">
          <h2 className="text-5xl font-black text-[#000000] uppercase tracking-tighter leading-none" style={{ fontFamily: 'Impact, sans-serif' }}>
             SPOTTED
          </h2>
          <div className="text-xs font-bold font-mono mt-2 tracking-widest bg-[#000000] text-[#F3ECE0] py-1 px-2 mb-1">
             POLIMI_AGORÀ
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 font-mono text-[#000000]">
          <div className="space-y-1">
            <label className="block text-sm font-black uppercase">🗓️ 1. Quando? (Opz.)</label>
            <input
              type="text" value={form.when} onChange={e => setForm({...form, when: e.target.value})}
              className="w-full bg-[#F3ECE0]/50 border-4 border-[#000000] focus:bg-[#DC5F00]/10 focus:border-[#DC5F00] outline-none text-lg placeholder:text-[#000000]/30 font-bold p-2 transition-colors duration-200"
              placeholder="Ieri alle 14:00"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-black uppercase">📍 2. Dove? (Opz.)</label>
            <input
              type="text" value={form.where} onChange={e => setForm({...form, where: e.target.value})}
              className="w-full bg-[#F3ECE0]/50 border-4 border-[#000000] focus:bg-[#DC5F00]/10 focus:border-[#DC5F00] outline-none text-lg placeholder:text-[#000000]/30 font-bold p-2 transition-colors duration-200"
              placeholder="Edificio 13"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-black uppercase">📸 3. Il tuo Instagram (Opz.)</label>
            <div className="text-[10px] leading-tight mb-1 opacity-70">Verrai avvisato qui in privato se qualcuno risponde. Es. @tuotag</div>
            <input
              type="text" value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})}
              className="w-full bg-[#F3ECE0]/50 border-4 border-[#000000] focus:bg-[#DC5F00]/10 focus:border-[#DC5F00] outline-none text-lg placeholder:text-[#000000]/30 font-bold p-2 transition-colors duration-200"
              placeholder="@tuotag"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-black uppercase">
               🔎 4. Chi cerchi? <span className="text-[#DC5F00]">*</span>
            </label>
            <textarea
              required value={form.lookingFor} onChange={e => setForm({...form, lookingFor: e.target.value})}
              className="w-full bg-[#F3ECE0]/50 border-4 border-[#000000] focus:bg-[#DC5F00]/10 focus:border-[#DC5F00] outline-none resize-none h-24 text-lg p-2 placeholder:text-[#000000]/30 font-bold transition-colors duration-200"
              placeholder="Zaino giallo, seduto in ultima fila..."
            />
          </div>

          <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="w-full mt-2 py-4 bg-[#000000] text-[#F3ECE0] font-black uppercase text-xl hover:bg-[#DC5F00] hover:text-[#000000] hover:-translate-y-1 hover:shadow-[4px_4px_0_#000000] active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none border-4 border-[#000000]">
            {isSubmitting ? "AFFISSIONE..." : isSuccess ? "AFFISSO!" : "AFFIGGI POSTER"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ==========================================
// THEME 5: THE TERMINAL
// ==========================================
function ThemeTerminal() {
  const { submit, isSubmitting } = useSubmitSpotted();
  const [lines, setLines] = useState<string[]>([
    "POLIMI AGOS TERMINAL [Version 2.0.0]",
    "(c) Agorà Corporation. All rights reserved.",
    "",
    "Initialize generic payload input...",
    "----------------------------------------"
  ]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "", instagram: "" });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const prompts = [
    "C:\\PAYLOAD> set time_of_sighting: ",
    "C:\\PAYLOAD> set location_coords: ",
    "C:\\PAYLOAD> set instagram_handle_for_comms: ",
    "C:\\PAYLOAD> set target_description (*REQUIRED): "
  ];

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || step > 3) return;

    const currentInput = input;
    setInput("");
    
    if (step === 3 && !currentInput.trim()) return;

    setLines(prev => [...prev, prompts[step] + currentInput]);

    if (step === 0) {
      setForm({ ...form, when: currentInput }); setStep(1);
    } else if (step === 1) {
      setForm({ ...form, where: currentInput }); setStep(2);
    } else if (step === 2) {
      setForm({ ...form, instagram: currentInput }); setStep(3);
    } else if (step === 3) {
      const finalForm = { ...form, lookingFor: currentInput };
      setForm(finalForm);
      setStep(4);
      setLines(prev => [...prev, "Encrypting payload...", "Transmitting to Agorà servers..."]);
      
      const ok = await submit(finalForm);
      if (ok) {
        setLines(prev => [...prev, "[ OK ] Payload delivered successfully.", "Connection closed.", "", "Press ENTER to restart."]);
      } else {
        setLines(prev => [...prev, "[ ERR ] Transmission failed.", "Press ENTER to restart."]);
      }
    }
  };

  const handleRestart = (e: React.KeyboardEvent) => {
    if (step === 4 && e.key === 'Enter') {
      setStep(0); setForm({ lookingFor: "", when: "", where: "", instagram: "" });
      setLines(["POLIMI AGOS TERMINAL [Version 2.0.0]", "(c) Agorà Corporation. All rights reserved.", "", "Initialize generic payload input...", "----------------------------------------"]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3ECE0] font-mono p-4 sm:p-8 flex flex-col" onClick={() => inputRef.current?.focus()}>
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col bg-[#111111] border-2 border-[#111111] shadow-[10px_10px_0_#DC5F00] p-6 text-[#F3ECE0] rounded-sm">
        <div className="flex-1 whitespace-pre-wrap break-words">
          {lines.map((line, i) => (
            <div key={i + '-' + line.substring(0,10)} className="mb-1">{line}</div>
          ))}
          {step < 4 && (
            <form onSubmit={handleCommand} className="flex flex-col sm:flex-row items-start sm:items-center">
              <span className="mr-2 mt-1 sm:mt-0 text-[#F3ECE0]/70">{prompts[step]}</span>
              <div className="flex-1 flex items-center w-full">
                <input
                  ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleRestart}
                  className="flex-1 bg-transparent outline-none text-[#DC5F00] font-bold caret-[#DC5F00]"
                  autoFocus
                />
              </div>
            </form>
          )}
          {step === 4 && (
            <button
              onClick={() => {
                setStep(0); setForm({ lookingFor: "", when: "", where: "", instagram: "" });
                setLines(["POLIMI AGOS TERMINAL [Version 2.0.0]", "(c) Agorà Corporation. All rights reserved.", "", "Initialize generic payload input...", "----------------------------------------"]);
              }}
              className="mt-4 px-4 py-2 bg-[#DC5F00] text-[#111111] font-bold uppercase rounded-sm hover:bg-[#F3ECE0] transition-colors"
            >
              Ricomincia
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
