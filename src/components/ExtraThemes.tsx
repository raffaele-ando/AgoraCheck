import React, { useState, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { CheckCircle2, Clock, MapPin, Instagram, Search, List } from "lucide-react";
import { useSubmitSpotted } from "../pages/Home";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { Link, useParams, useLocation } from "react-router-dom";
import { useVisitAnalytics } from "../hooks/useVisitAnalytics";
import { HeaderVariations, LOCATIONS } from "./HeaderVariations";
import { WhatsappWidget } from "./WhatsappWidget";

// TYPEWRITER HOOK
function useTypewriter(words: string[], speed = 60, waitTime = 2000) {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(() => Math.floor(Math.random() * words.length));

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const i = loopNum % words.length;
      const fullText = words[i];

      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1)
      );

      let typeSpeed = speed;
      if (isDeleting) typeSpeed /= 2;

      if (!isDeleting && text === fullText) {
        timer = setTimeout(() => setIsDeleting(true), waitTime);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        let nextIndex = Math.floor(Math.random() * words.length);
        if (words.length > 1 && nextIndex === loopNum) {
          nextIndex = (nextIndex + 1) % words.length;
        }
        setLoopNum(nextIndex);
      } else {
        timer = setTimeout(handleTyping, typeSpeed);
      }
    };

    timer = setTimeout(handleTyping, 30);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, words, speed, waitTime]);

  return text;
}

// THEME 11: CORKBOARD (Old Theme 4 adapted to brand colors)
// ==========================================
export function ThemeCorkboard() {
  const { handleFocus, handleBlur, markSubmitted } = useVisitAnalytics();
  const { submit, isSubmitting, isSuccess, error, cooldown } =
    useSubmitSpotted();
  const [form, setForm] = useState<{
    lookingFor: string;
    when: string;
    where: string;
    instagram: string;
    city: string;
    area: string;
    type: "spotted" | "sondaggio" | "ricerca";
    pollOptions: string[];
  }>(() => {
    let initCity = "MILANO";
    let initArea = "";
    let initMode: "spotted" | "sondaggio" | "ricerca" = "spotted";

    const pathSegments = window.location.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s).toUpperCase().replace(/-/g, ' '));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check parameters in path
    for (const seg of pathSegments) {
      if (seg === "SPOTTED" || seg === "SONDAGGIO" || seg === "RICERCA") {
         initMode = seg.toLowerCase() as "spotted" | "sondaggio" | "ricerca";
      } else if (Object.keys(LOCATIONS).includes(seg)) {
         initCity = seg;
      } else {
         // check if it's an area
         for (const [city, areas] of Object.entries(LOCATIONS)) {
           if (areas.includes(seg)) {
              initCity = city;
              initArea = seg;
              break;
           }
         }
      }
    }

    // Fallbacks from search parameters (for backwards compatibility)
    const paramCity = searchParams.get('city')?.toUpperCase();
    const paramArea = searchParams.get('area')?.toUpperCase();
    const paramType = searchParams.get('type') || searchParams.get('mode');

    if (paramCity && Object.keys(LOCATIONS).includes(paramCity)) initCity = paramCity;
    if (paramArea && Object.entries(LOCATIONS).some(([_, areas]) => areas.includes(paramArea))) {
      initArea = paramArea;
      for (const [city, areas] of Object.entries(LOCATIONS)) {
        if (areas.includes(paramArea)) { initCity = city; break; }
      }
    }
    if (paramType === "sondaggio" || paramType === "spotted" || paramType === "ricerca") initMode = paramType as any;

    if (!initArea || !LOCATIONS[initCity]?.includes(initArea)) {
       initArea = LOCATIONS[initCity]?.[0] || initCity;
    }

    return {
      lookingFor: "",
      when: "",
      where: "",
      instagram: "",
      city: initCity,
      area: initArea,
      type: initMode,
      pollOptions: ["", ""],
    };
  });
  const [lastSubmit, setLastSubmit] = useState(0);
  const [localError, setLocalError] = useState("");

  const isIt = (() => {
    if (typeof navigator !== "undefined" && navigator.language) {
      return navigator.language.toLowerCase().startsWith('it');
    }
    return true;
  })();

  const whenPlaceholderIt = [
    "9 Maggio alle 9:35",
    "12 Ottobre alle 14:15",
    "Lunedì 3 Aprile alle 11:30",
    "Giovedì 15 Novembre alle 18:20",
    "22 Dicembre verso le 16:45",
  ];
  const whenPlaceholderEn = [
    "May 9th at 9:35 AM",
    "October 12th at 2:15 PM",
    "Monday, April 3rd at 11:30 AM",
    "Thursday, Nov 15th at 6:20 PM",
    "December 22nd around 4:45 PM",
  ];

  const wherePlaceholderIt = [
    "Davanti all'aula 4.0.1",
    "Alla fila per la spritzeria",
    "Sulle scale di piazza Leo",
    "Dalla panchina gigante",
    "In biblioteca",
  ];
  const wherePlaceholderEn = [
    "In front of room 4.0.1",
    "In line for drinks",
    "On the stairs at the piazza",
    "By the giant bench",
    "At the library",
  ];

  const lookingForPlaceholderIt = [
    "Il ragazzo in piedi con il maglione rosso con i capelli biondi e un tatuaggio sul braccio",
    "La ragazza con la borsa a tracolla",
  ];
  const lookingForPlaceholderEn = [
    "The guy standing in the red sweater with blonde hair and an arm tattoo",
    "The girl with the shoulder bag",
  ];

  const whenPlaceholder = useTypewriter(isIt ? whenPlaceholderIt : whenPlaceholderEn);
  const wherePlaceholder = useTypewriter(isIt ? wherePlaceholderIt : wherePlaceholderEn);
  const lookingForPlaceholder = useTypewriter(isIt ? lookingForPlaceholderIt : lookingForPlaceholderEn);

  useEffect(() => {
    const url = new URL(window.location.href);
    const areaSlug = form.area.toLowerCase().replace(/\s+/g, '-');
    const citySlug = form.city.toLowerCase().replace(/\s+/g, '-');
    url.pathname = `/${citySlug}/${areaSlug}${form.type === "sondaggio" ? "/sondaggio" : (form.type === "ricerca" ? "/ricerca" : "")}`;
    url.searchParams.delete("mode");
    url.searchParams.delete("city");
    url.searchParams.delete("area");
    window.history.replaceState({}, "", url.toString());
  }, [form.type, form.city, form.area]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lookingFor) return;

    if (form.type === "sondaggio") {
      const validOpts = form.pollOptions.filter((o) => o.trim());
      if (validOpts.length < 2) {
        setLocalError(isIt ? "Devi inserire almeno 2 opzioni per il sondaggio." : "You must provide at least 2 options for the poll.");
        return;
      }
    }

    // Client-side rate limiting
    if (cooldown > 0) {
      setLocalError(
        isIt ? `Aspetta ${cooldown} secondi prima di inviare un altro form!` : `Wait ${cooldown} seconds before submitting again!`
      );
      return;
    }

    setLocalError("");
    setLastSubmit(Date.now());

    submit({ ...form, area: form.area })
      .then((ok) => {
        if (ok) {
          markSubmitted();
          setForm({ lookingFor: "", when: "", where: "", instagram: "", city: form.city, area: form.area, type: form.type, pollOptions: ["", ""] });
        }
      })
      .catch((err) => setLocalError(err.message || (isIt ? "Errore sconosciuto" : "Unknown error")));
  };

  const displayError = localError || error;
  
  const [headerInteracting, setHeaderInteracting] = useState(false);
  const [safeArea, setSafeArea] = useState(form.area);
  const [safeCity, setSafeCity] = useState(form.city);

  // Sync safeArea/safeCity only when NOT interacting
  useEffect(() => {
    if (!headerInteracting) {
      setSafeArea(form.area);
      setSafeCity(form.city);
    }
  }, [headerInteracting, form.area, form.city]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center p-2 sm:p-10 bg-[#111111] bg-[radial-gradient(rgba(243,236,224,0.1)_2px,transparent_2px)] [background-size:20px_20px] pt-4 sm:pt-8 overflow-x-hidden overflow-y-auto z-0">
      
      {/* Header Variations Configurator */}
      <HeaderVariations 
        city={form.city}
        setCity={(city) => setForm(prev => ({ ...prev, city }))}
        area={form.area} 
        setArea={(area) => setForm(prev => ({ ...prev, area }))}
        type={form.type}
        setType={(type) => setForm(prev => ({ ...prev, type }))}
        hasInteracted={form.lookingFor.length > 0 || form.when.length > 0 || form.where.length > 0 || form.instagram.length > 0 || form.pollOptions.some(opt => opt.length > 0)}
        onInteractionStateChange={setHeaderInteracting}
      />

      <WhatsappWidget city={safeCity} area={safeArea} />

      <motion.div
        initial={{ rotate: -2, scale: 0.95 }}
        animate={{ rotate: 1, scale: 1 }}
        className={`relative w-[92%] sm:w-full mx-auto max-w-md shrink-0 flex flex-col bg-gradient-to-br from-[#F3ECE0] to-[#E8DEC8] p-5 sm:p-8 shadow-[8px_16px_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(243,236,224,0.5)] border border-[#000000]/20 mt-2 sm:mt-4 mb-16 sm:mb-20 transition-all duration-300`}
      >
        {/* Fix per il pezzo di scotch in alto: metto un bello z-index e levo il mix blend che bugga con il backdrop-blur su mobile e safari */}
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 w-28 h-10 sm:w-32 sm:h-12 bg-[#F4F1EA]/80 shadow-md rotate-[-3deg] border border-[#000000]/10 z-50 overflow-visible transition-colors"
          style={{ clipPath: "polygon(5% 0%, 95% 4%, 100% 100%, 0% 96%)" }}
        ></div>

        <div className="shrink-0 mb-4 sm:mb-8 text-center space-y-2 sm:space-y-3 pt-1 sm:pt-2">
          <Logo 
            logoName={`logo_${form.area}`} 
            fallbackText={form.area} 
            className="w-48 h-14 sm:w-64 sm:h-20 mx-auto mb-1 sm:mb-2" 
          />

          <div>
            <h2
              className="text-2xl sm:text-4xl font-black text-[#000000] uppercase tracking-tighter leading-none transition-colors"
              style={{ fontFamily: "Impact, sans-serif" }}
            >
              {form.type === "spotted" ? "WANTED!" : form.type === "ricerca" ? (isIt ? "RICERCA" : "SEARCH") : (isIt ? "SONDAGGIO" : "POLL")}
            </h2>
          </div>
        </div>

        {displayError && (
          <div className="shrink-0 mx-2 p-1.5 sm:p-2 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded mb-2 sm:mb-4">
            ⚠️ {displayError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-6 font-mono text-[#000000] transition-colors flex flex-col px-2 sm:px-4 pb-2"
        >
          {form.type === "spotted" && (
            <>
              <div className="px-2">
                <label className="flex items-center text-xs sm:text-sm font-bold text-[#000000] mb-0.5 uppercase transition-colors">
                  <Clock className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5" /> {isIt ? "1. Quando? (Opz.)" : "1. When? (Opt.)"}
                </label>
                <TextareaAutosize
                  minRows={1}
                  maxRows={2}
                  value={form.when}
                  onChange={(e) => setForm({ ...form, when: e.target.value })}
                  onFocus={() => handleFocus("when")}
                  onBlur={() => handleBlur("when")}
                  className="w-full bg-transparent border-b border-[#000000]/20 focus:border-[#DC5F00] outline-none text-base font-bold placeholder:text-[#000000]/40 transition-colors resize-none overflow-y-auto"
                  placeholder={isIt ? `Es. ${whenPlaceholder}` : `E.g. ${whenPlaceholder}`}
                />
              </div>

              <div className="px-2">
                <label className="flex items-center text-xs sm:text-sm font-bold text-[#000000] mb-0.5 uppercase transition-colors">
                  <MapPin className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5" /> {isIt ? "2. Dove? (Opz.)" : "2. Where? (Opt.)"}
                </label>
                <TextareaAutosize
                  minRows={1}
                  maxRows={2}
                  value={form.where}
                  onChange={(e) => setForm({ ...form, where: e.target.value })}
                  onFocus={() => handleFocus("where")}
                  onBlur={() => handleBlur("where")}
                  className="w-full bg-transparent border-b border-[#000000]/20 focus:border-[#DC5F00] outline-none text-base font-bold placeholder:text-[#000000]/40 transition-colors resize-none overflow-y-auto"
                  placeholder={isIt ? `Es. ${wherePlaceholder}` : `E.g. ${wherePlaceholder}`}
                />
              </div>
            </>
          )}

          <div className="p-3 bg-[#DC5F00]/5 rounded border border-[#DC5F00]/20 mx-1 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center text-xs sm:text-sm font-bold text-[#000000] uppercase transition-colors">
                <Instagram className="w-4 h-4 mr-1.5" /> {form.type === "spotted" ? "3" : "1"}. {isIt ? "Il tuo Instagram" : "Your Instagram"}
              </label>
              <span className="text-[10px] font-bold bg-[#DC5F00]/20 text-[#DC5F00] px-1.5 py-0.5 rounded transition-colors tracking-wider">
                {isIt ? "OPZ." : "OPT."}
              </span>
            </div>
            <p className="text-[11px] leading-tight text-[#000000]/60 mb-2 font-medium transition-colors">
              {isIt ? "Non sarà pubblico. Verrai avvisato in privato se qualcuno risponde, utilissimo per non perderti gli aggiornamenti!" : "It won't be public. You will be notified in private if someone replies, very useful to not miss updates!"}
            </p>
            <div className="relative flex items-center border-b border-[#000000]/20 focus-within:border-[#DC5F00] transition-colors pb-1">
              <span className="text-base font-bold text-[#000000]/40 pointer-events-none mr-1.5 transition-colors">
                @
              </span>
              <input
                type="text"
                value={form.instagram}
                onFocus={() => handleFocus("instagram")}
                onBlur={() => handleBlur("instagram")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    instagram: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9._]/g, ""),
                  })
                }
                className="w-full bg-transparent outline-none text-base font-bold placeholder:text-[#000000]/40 transition-colors"
                placeholder={isIt ? "tuo.tag" : "your.tag"}
              />
            </div>
          </div>

          <div className="px-2 relative mt-0">
            <label className="flex items-center text-xs sm:text-sm font-bold text-[#000000] mb-0.5 uppercase transition-colors">
              <Search className="w-4 h-4 mr-1.5" /> {form.type === "spotted" ? (isIt ? "4. Chi cerchi? *" : "4. Who are you looking for? *") : form.type === "ricerca" ? (isIt ? "2. Chi/Cosa cerchi? *" : "2. Who/What are you looking for? *") : (isIt ? "2. Fai una domanda *" : "2. Ask a question *")}
            </label>
            <TextareaAutosize
              required
              minRows={form.type === "spotted" ? 2 : form.type === "ricerca" ? 3 : 1}
              maxRows={4}
              value={form.lookingFor}
              onChange={(e) => setForm({ ...form, lookingFor: e.target.value })}
              onFocus={() => handleFocus("lookingFor")}
              onBlur={() => handleBlur("lookingFor")}
              className="w-full bg-transparent border-b border-[#000000]/20 focus:border-[#DC5F00] outline-none resize-none text-base font-bold placeholder:text-[#000000]/40 transition-colors py-1 overflow-y-auto"
              placeholder={form.type === "spotted" || form.type === "ricerca" ? (isIt ? `Es. ${lookingForPlaceholder}` : `E.g. ${lookingForPlaceholder}`) : (isIt ? "Es. Dove si mangia meglio in Bovisa?" : "E.g. What's the best food near campus?")}
            />
          </div>

          {form.type === "sondaggio" && (
            <div className="px-2">
              <label className="flex items-center text-xs sm:text-sm font-bold text-[#000000] mb-2 uppercase transition-colors">
                <List className="w-4 h-4 mr-1.5" /> {isIt ? "3. Opzioni (Min 2, Max 4)" : "3. Options (Min 2, Max 4)"}
              </label>
              <div className="space-y-2">
                {form.pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...form.pollOptions];
                        newOpts[i] = e.target.value;
                        setForm({ ...form, pollOptions: newOpts });
                      }}
                      className="w-full bg-[#111111]/5 border-b border-[#000000]/20 focus:border-[#DC5F00] outline-none text-sm font-bold placeholder:text-[#000000]/40 transition-colors px-2 py-1.5"
                      placeholder={isIt ? `Opzione ${i + 1}` : `Option ${i + 1}`}
                    />
                    {i >= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = form.pollOptions.filter((_, index) => index !== i);
                          setForm({ ...form, pollOptions: newOpts });
                        }}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {form.pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, pollOptions: [...form.pollOptions, ""] })}
                    className="text-xs font-bold text-[#DC5F00] uppercase mt-2 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {isIt ? "+ Aggiungi opzione" : "+ Add option"}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col mt-auto pt-6">
            <div className="flex justify-center">
              <button
                disabled={
                  !form.lookingFor || isSubmitting || isSuccess || cooldown > 0
                }
                className="w-full max-w-[220px] mt-1 py-3 border-4 border-[#000000] text-[#000000] font-black uppercase text-xl hover:bg-[#DC5F00]:bg-orange-600 hover:border-[#DC5F00]:border-orange-600 hover:text-[#F3ECE0]:text-white transition-colors disabled:opacity-50 relative z-10 bg-transparent"
              >
                {isSubmitting
                  ? (isIt ? "Inviando..." : "Sending...")
                  : isSuccess
                    ? (isIt ? "Inviato!" : "Sent!")
                    : cooldown > 0
                      ? (isIt ? `Attendi ${cooldown}s` : `Wait ${cooldown}s`)
                      : (isIt ? "Invia" : "Submit")}
              </button>
            </div>
            <div className="w-full text-left mt-3 pl-2">
              <p className="text-[10px] uppercase font-black text-[#DC5F00]/80 tracking-widest font-mono inline-block">
                Agorà Aby Project
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
