import React, { useState } from "react";
import { CheckCircle2, Clock, MapPin, Instagram, Search } from "lucide-react";
import { useSubmitSpotted } from "../pages/Home";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { Link } from "react-router-dom";

// THEME 11: CORKBOARD (Old Theme 4 adapted to brand colors)
// ==========================================
export function ThemeCorkboard() {
  const { submit, isSubmitting, isSuccess, error, cooldown } =
    useSubmitSpotted();
  const [form, setForm] = useState({
    lookingFor: "",
    when: "",
    where: "",
    instagram: "",
  });
  const [lastSubmit, setLastSubmit] = useState(0);
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lookingFor) return;

    // Client-side rate limiting
    if (cooldown > 0) {
      setLocalError(
        `Aspetta ${cooldown} secondi prima di inviare un altro form!`,
      );
      return;
    }

    setLocalError("");
    setLastSubmit(Date.now());

    submit(form)
      .then((ok) => {
        if (ok) setForm({ lookingFor: "", when: "", where: "", instagram: "" });
      })
      .catch((err) => setLocalError(err.message || "Errore sconosciuto"));
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-10 bg-[#111111] bg-[radial-gradient(rgba(243,236,224,0.1)_2px,transparent_2px)] [background-size:20px_20px] overflow-hidden">
      <motion.div
        initial={{ rotate: -2, scale: 0.9 }}
        animate={{ rotate: 1, scale: 0.95 }}
        className="relative w-full max-w-[340px] sm:max-w-md bg-gradient-to-br from-[#F3ECE0] to-[#E8DEC8] dark:from-gray-800 dark:to-gray-900 p-4 sm:p-8 pb-6 shadow-[8px_16px_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(243,236,224,0.5)] dark:shadow-[8px_16px_40px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.05)] border border-[#000000]/20 dark:border-white/10 mx-auto mt-2 transition-colors"
      >
        {/* Fix per il pezzo di scotch in alto: metto un bello z-index e levo il mix blend che bugga con il backdrop-blur su mobile e safari */}
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-[#F4F1EA]/80 dark:bg-gray-700/80 shadow-md rotate-[-3deg] border border-[#000000]/10 dark:border-white/10 z-50 overflow-visible transition-colors"
          style={{ clipPath: "polygon(5% 0%, 95% 4%, 100% 100%, 0% 96%)" }}
        ></div>

        <div className="mb-2 sm:mb-6 text-center space-y-2 pt-2">
          <Logo className="w-32 h-10 mx-auto mb-2" />

          <div>
            <h2
              className="text-2xl sm:text-4xl font-black text-[#000000] dark:text-white uppercase tracking-tighter leading-none transition-colors"
              style={{ fontFamily: "Impact, sans-serif" }}
            >
              WANTED!
            </h2>
            <h3
              className="text-sm sm:text-lg font-black text-[#000000] dark:text-gray-300 uppercase tracking-wider leading-none mt-1 transition-colors"
              style={{ fontFamily: "Impact, sans-serif" }}
            >
              SPOTTED AL POLIMI
            </h3>
          </div>
        </div>

        {displayError && (
          <div className="mx-2 p-2 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded mb-4">
            ⚠️ {displayError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-5 font-mono text-[#000000] dark:text-gray-200 transition-colors"
        >
          <div className="px-2">
            <label className="flex items-center text-[10px] sm:text-xs font-bold text-[#000000] dark:text-gray-300 mb-0.5 uppercase transition-colors">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> 1. Quando?
              (Opz.)
            </label>
            <input
              type="text"
              value={form.when}
              onChange={(e) => setForm({ ...form, when: e.target.value })}
              className="w-full bg-transparent border-b-2 border-[#000000]/20 dark:border-white/20 focus:border-[#DC5F00] dark:focus:border-orange-500 outline-none text-sm sm:text-base placeholder:text-[#000000]/40 dark:placeholder:text-gray-500 font-bold transition-colors"
              placeholder="Es. Ieri alle 14:00"
            />
          </div>

          <div className="px-2">
            <label className="flex items-center text-[10px] sm:text-xs font-bold text-[#000000] dark:text-gray-300 mb-0.5 uppercase transition-colors">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> 2. Dove?
              (Opz.)
            </label>
            <input
              type="text"
              value={form.where}
              onChange={(e) => setForm({ ...form, where: e.target.value })}
              className="w-full bg-transparent border-b-2 border-[#000000]/20 dark:border-white/20 focus:border-[#DC5F00] dark:focus:border-orange-500 outline-none text-sm sm:text-base placeholder:text-[#000000]/40 dark:placeholder:text-gray-500 font-bold transition-colors"
              placeholder="Es. Edificio 13"
            />
          </div>

          <div className="p-2 bg-[#DC5F00]/5 dark:bg-orange-900/10 rounded border border-[#DC5F00]/20 dark:border-orange-500/20 mx-1 transition-colors">
            <div className="flex items-center justify-between mb-0.5">
              <label className="flex items-center text-[10px] sm:text-xs font-bold text-[#000000] dark:text-gray-300 uppercase transition-colors">
                <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> 3. Il
                tuo Instagram
              </label>
              <span className="text-[8px] font-bold bg-[#DC5F00]/20 dark:bg-orange-900/40 text-[#DC5F00] dark:text-orange-400 px-1 py-0.5 rounded transition-colors">
                OPZ.
              </span>
            </div>
            <p className="text-[9px] leading-tight text-[#000000]/60 dark:text-gray-400 mb-1 font-medium transition-colors">
              Non sarà pubblico. Verrai avvisato in privato se qualcuno
              risponde, utilissimo per non perderti gli aggiornamenti!
            </p>
            <div className="relative flex items-center border-b-2 border-[#000000]/20 dark:border-white/20 focus-within:border-[#DC5F00] dark:focus-within:border-orange-500 transition-colors pb-0.5">
              <span className="text-sm font-bold text-[#000000]/40 dark:text-gray-500 pointer-events-none mr-1.5 transition-colors">
                @
              </span>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) =>
                  setForm({
                    ...form,
                    instagram: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9._]/g, ""),
                  })
                }
                className="w-full bg-transparent outline-none text-sm sm:text-base font-bold placeholder:text-[#000000]/40 dark:placeholder:text-gray-500 transition-colors"
                placeholder="tuo.tag"
              />
            </div>
          </div>

          <div className="px-2 relative">
            <label className="flex items-center text-[10px] sm:text-xs font-bold text-[#000000] dark:text-gray-300 mb-0.5 uppercase transition-colors">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> 4. Chi
              cerchi? *
            </label>
            <textarea
              required
              value={form.lookingFor}
              onChange={(e) => setForm({ ...form, lookingFor: e.target.value })}
              className="w-full bg-transparent border-b-2 border-[#000000]/20 dark:border-white/20 focus:border-[#DC5F00] dark:focus:border-orange-500 outline-none resize-none h-12 sm:h-16 text-sm sm:text-base placeholder:text-[#000000]/40 dark:placeholder:text-gray-500 font-bold transition-colors"
              placeholder="Il tipo con lo zaino giallo..."
            />
          </div>

          <div className="flex flex-col mt-2 sm:mt-6">
            <div className="flex justify-center">
              <button
                disabled={
                  !form.lookingFor || isSubmitting || isSuccess || cooldown > 0
                }
                className="w-full max-w-[180px] sm:max-w-[200px] mt-1 py-2 sm:py-3 border-[3px] sm:border-4 border-[#000000] dark:border-white text-[#000000] dark:text-white font-black uppercase text-base sm:text-xl hover:bg-[#DC5F00] dark:hover:bg-orange-600 hover:border-[#DC5F00] dark:hover:border-orange-600 hover:text-[#F3ECE0] dark:hover:text-white transition-colors disabled:opacity-50 relative z-10 bg-transparent"
              >
                {isSubmitting
                  ? "Inviando..."
                  : isSuccess
                    ? "Inviato!"
                    : cooldown > 0
                      ? `Attendi ${cooldown}s`
                      : "Invia"}
              </button>
            </div>
            <div className="w-full text-right mt-3 pl-2">
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
