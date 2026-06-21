import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  ChevronDown,
  Send,
  Instagram,
  ChevronRight,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Squircle } from "../components/Squircle";
import { Logo } from "../components/Logo";
import confetti from "canvas-confetti";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];
const smoothSpring = { type: "spring", bounce: 0.15, duration: 0.5 };

function TypewriterSim({
  word,
  active,
  className = "text-black font-semibold text-[14px]",
  baseDelay = 5,
  randomDelay = 10,
}: {
  word: string;
  active: boolean;
  className?: string;
  baseDelay?: number;
  randomDelay?: number;
}) {
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    setCharIdx(0);
  }, [word]);

  useEffect(() => {
    if (!active) return;

    if (charIdx < word.length) {
      const delay = baseDelay + Math.random() * randomDelay;
      const timeout = setTimeout(() => setCharIdx((c) => c + 1), delay);
      return () => clearTimeout(timeout);
    }
  }, [charIdx, word, active, baseDelay, randomDelay]);

  const showCursor = active && charIdx < word.length;

  return (
    <span className={className}>
      {word.slice(0, charIdx)}
      {showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-gray-400 ml-[2px] animate-pulse relative align-middle" />
      )}
    </span>
  );
}

export default function Video() {
  const [step, setStep] = useState(-30);
  const [playKey, setPlayKey] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const navigate = useNavigate();

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("La registrazione dello schermo non è supportata qui. Apri l'app in una nuova scheda o usa un browser desktop compatibile.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: { ideal: 60 } },
        audio: false,
        preferCurrentTab: true,
      } as any);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "agora_video.webm";
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStep(-60);
      setPlayKey((k) => k + 1);

      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach((track) => track.stop());
      }, 30100 * 0.8 + 2000);
    } catch (err) {
      console.error("Recording failed", err);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const timeline = [
      { t: 0, val: -60 }, // Agorà (Logo)
      { t: 400, val: -40 }, // Nuovo
      { t: 800, val: -20 }, // Sito
      { t: 1400, val: -10 }, // Transizione arancione
      { t: 1900, val: 0 }, // Intro ends
      { t: 2400, val: 1 }, // Mode Selector (starts on Sondaggio) (Scegli la modalità.)
      { t: 3200, val: 2 }, // Switch to Spotted (Scegli la modalità.)
      { t: 4300, val: 4 }, // Focus Location Box (Seleziona la tua città.)
      { t: 5200, val: 5 }, // Open City dropdown
      { t: 5900, val: 5.5 }, // Hover on Milano
      { t: 6600, val: 6 }, // Close City dropdown (Select Milano)
      { t: 7400, val: 7 }, // Open Ateneo dropdown (Scegli la tua università.)
      { t: 8200, val: 7.5 }, // Hover on Polimi
      { t: 9000, val: 8 }, // Select Polimi
      { t: 10000, val: 9 }, // Expand WhatsApp (Entra nel gruppo WhatsApp locale.)
      { t: 11600, val: 10 }, // Show Bento Form (Spotted) (Indica il luogo esatto.)
      { t: 13100, val: 11 }, // Typewriter Dove
      { t: 14800, val: 12 }, // Typewriter Quando (Indica quando è successo.)
      { t: 16400, val: 13 }, // Typewriter Chi (Descrivi chi cerchi.)
      { t: 18400, val: 13.5 }, // Mount IG Input + Change Text
      { t: 19100, val: 14 }, // Type username (Lascia il tuo Instagram per i DM.)
      { t: 20600, val: 15 }, // Submit (Richiesta inviata al canale.)
      { t: 23100, val: 16 }, // Swap Mode to Sondaggio -> Show Sondaggio Form (Passa ai sondaggi anonimi.)
      { t: 24600, val: 17 }, // Sondaggio typewriter (Scopri l'opinione degli studenti.)
      { t: 26600, val: 18 }, // Add 3rd option
      { t: 28100, val: 19 }, // Show 4th option button
      { t: 30100, val: 20 }, // CTA
    ];

    const timers = timeline.map(({ t, val }) =>
      setTimeout(() => setStep(val), t * 0.8),
    );

    return () => timers.forEach(clearTimeout);
  }, [playKey]);

  useEffect(() => {
    if (step === 15) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#DC5F00", "#F3ECE0", "#000000"],
        disableForReducedMotion: true,
        gravity: 1.5,
        ticks: 100,
        scalar: 0.8
      });
    }
  }, [step]);

  const getFocusStyle = (active: boolean) => ({
    scale: active ? 1.05 : 0.85,
    opacity: active ? 1 : 0.35,
    filter: active ? "blur(0px)" : "blur(2px)",
    zIndex: active ? 40 : 10,
  });

  // Determine current "mode" style based on step
  const mode = step >= 16 || step === 1 ? "sondaggio" : "spotted";

  const getText = (step: number) => {
    if (step >= 1 && step < 4) return "Scegli la modalità.";
    if (step >= 4 && step < 7) return "Seleziona la tua città.";
    if (step >= 7 && step < 9) return "Scegli la tua università.";
    if (step >= 9 && step < 10) return "Entra nel gruppo WhatsApp locale.";
    if (step >= 10 && step < 12) return "Indica il luogo esatto.";
    if (step >= 12 && step < 13) return "Indica quando è successo.";
    if (step >= 13 && step < 13.5) return "Descrivi chi (o cosa) cerchi.";
    if (step >= 13.5 && step < 15) return "I risultati nei tuoi DM.";
    if (step >= 15 && step < 16) return "Messaggio inviato!";
    if (step >= 16 && step < 17) return "Passa ai sondaggi anonimi.";
    if (step >= 17) return "Scopri l'opinione degli studenti.";
    return "";
  };

  const sceneId = (() => {
    if (step >= 1 && step < 4) return "mode";
    if (step >= 4 && step < 10) return "location";
    if (step >= 10 && step < 16) return "spotted";
    if (step === 16) return "sondaggio-switch";
    if (step >= 17 && step < 20) return "sondaggio-form";
    return "none";
  })();

  return (
    <div className="relative w-full h-[100dvh] bg-[#F3ECE0] overflow-hidden flex flex-col items-center justify-center font-sans text-black p-6">
      {!isRecording && (
        <button
          onClick={startRecording}
          className="absolute top-4 right-4 z-[9999] bg-black text-white text-xs px-3 py-1.5 rounded-full font-medium"
        >
          Esporta Video
        </button>
      )}
      {/* INTRO SEQUENCE OVERLAY */}
      <AnimatePresence>
        {step < 0 && (
          <motion.div
            key="intro-overlay"
            className="absolute inset-0 z-[100] bg-[#F3ECE0] flex items-center justify-center overflow-hidden"
            initial={{ y: "0%", borderBottomLeftRadius: "0% 0%", borderBottomRightRadius: "0% 0%" }}
            exit={{ y: "-100%", borderBottomLeftRadius: "50% 10%", borderBottomRightRadius: "50% 10%" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          >
            {/* Background ambient grid (Intro) */}
            <div
              className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
            {/* Text Sequence */}
            <div className="flex flex-col items-center justify-center gap-1 font-[Anton] text-6xl md:text-8xl text-black uppercase tracking-normal leading-[0.95] z-10 pt-4">
              <AnimatePresence>
                {step >= -60 && step < 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="mb-4">
                    <img
                      src="https://raw.githubusercontent.com/raffaele-ando/Logo-vari/refs/heads/main/logo%205.png"
                      alt="Agorà Logo"
                      className="h-16 md:h-20 object-contain drop-shadow-md"
                    />
                  </motion.div>
                )}
                {step >= -40 && step < 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="drop-shadow-sm">
                    NUOVO
                  </motion.div>
                )}
                {step >= -20 && step < 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="drop-shadow-sm">
                    SITO
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Orange Slide Transition */}
            <AnimatePresence>
              {step >= -10 && (
                <motion.div
                  key="orange-wipe"
                  initial={{ y: "100%", borderTopLeftRadius: "50% 10%", borderTopRightRadius: "50% 10%" }}
                  animate={{ y: "0%", borderTopLeftRadius: "0% 0%", borderTopRightRadius: "0% 0%" }}
                  transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                  className="absolute inset-0 z-20 bg-[#DC5F00] pointer-events-none flex items-center justify-center shadow-[0_-20px_50px_rgba(220,95,0,0.5)]"
                >
                  <Logo className="w-[120px] h-[30px] opacity-20 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background ambient grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="w-full max-w-[440px] mx-auto flex flex-col items-center justify-center z-40 gap-8 h-[480px]">
        <div className="w-full shrink-0 flex flex-col items-center justify-end px-4 relative z-40 h-[100px]">
          <AnimatePresence mode="wait">
            {step >= 1 && step < 18 && (
              <motion.div
                key={getText(step)}
                initial={{ opacity: 0, y: 15, filter: "blur(8px)", scale: 0.95 }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, y: -15, filter: "blur(8px)", scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="text-center w-full flex flex-col items-center justify-center"
              >
                <h2 className="font-extrabold text-[#DC5F00] tracking-tight leading-[1.1] text-3xl md:text-[2.5rem] lg:text-5xl drop-shadow-sm relative flex items-center justify-center text-center">
                  <TypewriterSim word={getText(step)} active={true} className="text-[#DC5F00] text-center" />
                  <span className="absolute -inset-1 bg-[#111111]/5 blur-xl -z-10 rounded-full" />
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-10 w-full shrink-0 flex flex-col mx-auto items-center justify-start h-[348px]">
        <AnimatePresence mode="popLayout">
          {sceneId === "mode" && (
            <motion.div
              layout
              key="scene-mode"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: -30,
                scale: 0.95,
                transition: { duration: 0.2 },
              }}
              transition={smoothSpring}
              className="w-full px-4"
            >
              <div className="shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] rounded-[24px]">
                <Squircle
                cornerRadius={24}
                className="flex bg-[#EAE0D0] p-1.5 h-14 w-full relative group"
              >
                <motion.div
                  className="absolute top-1.5 bottom-1.5 shadow-sm z-0 bg-[#DC5F00] rounded-[18px]"
                  initial={{ left: "calc(50% + 0px)", width: "calc(50% - 6px)" }}
                  animate={{
                    left: mode === "sondaggio" ? "calc(50% + 0px)" : "6px",
                    width: "calc(50% - 6px)",
                  }}
                  transition={smoothSpring}
                />
                <div
                  className={`flex-1 flex items-center justify-center font-bold z-10 gap-2 text-[15px] ${mode === "sondaggio" ? "text-gray-500" : "text-white"}`}
                >
                  <span
                    className={`text-[22px] transition-all duration-500 ${mode === "sondaggio" ? "grayscale scale-100 opacity-60" : "drop-shadow-sm scale-110"}`}
                  >
                    📍
                  </span>{" "}
                  Spotted
                </div>
                <div
                  className={`flex-1 flex items-center justify-center font-bold z-10 gap-2 text-[15px] ${mode === "sondaggio" ? "text-white" : "text-gray-500"}`}
                >
                  <span
                    className={`text-[22px] transition-all duration-500 ${mode === "sondaggio" ? "drop-shadow-sm scale-110" : "grayscale opacity-60 scale-100"}`}
                  >
                    📊
                  </span>{" "}
                  Sondaggio
                </div>
              </Squircle>
              </div>
            </motion.div>
          )}

          {sceneId === "location" && (
            <motion.div
              layout
              key="scene-location"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: -30,
                scale: 0.95,
                transition: { duration: 0.2 },
              }}
              transition={smoothSpring}
              className="w-full px-4"
            >
              <div className="bg-[#EAE0D0] rounded-[32px] flex flex-col p-3 gap-2.5 w-full relative z-20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02),0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] pt-[10px]">
                <div className="flex w-full min-w-0 h-[3.25rem] gap-2.5">
                  {/* City Button */}
                  <div className="flex-1 min-w-0 relative">
                    <div className="relative w-full h-full rounded-[20px] bg-[#F3ECE0] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="relative flex items-center h-full pl-2 pr-1 z-10">
                        <MapPin className="w-5 h-5 text-[#DC5F00] shrink-0" />
                        <span className="pl-1.5 pr-2 text-[14px] font-bold text-black truncate capitalize flex-1">
                          {step < 6 ? "Torino" : "Milano"}
                        </span>
                        <motion.div
                          animate={{ rotate: step >= 5 && step < 6 ? 180 : 0 }}
                          className="shrink-0 text-[#DC5F00] pr-1"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {step >= 5 && step < 6 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 8, scale: 1 }}
                          exit={{
                            opacity: 0,
                            scale: 0.95,
                            transition: { duration: 0.15 },
                          }}
                          className="absolute top-full left-0 w-full min-w-[200px] bg-[#EAE0D0] p-1.5 rounded-[24px] shadow-2xl z-50 border-2 border-white/40 max-h-[160px] overflow-y-auto"
                        >
                          {[
                            "Torino",
                            "Milano",
                            "Genova",
                          ].map((opt) => (
                            <div
                              key={opt}
                              className={`px-4 py-3 rounded-[16px] text-[14px] font-bold cursor-pointer transition-colors ${(opt === "Milano" && step >= 5.5) || (opt === "Torino" && step < 5.5) ? "bg-[#DC5F00] text-white" : "text-black/70 hover:bg-[#F3ECE0]"}`}
                            >
                              {opt}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Ateneo Button */}
                  <AnimatePresence>
                    {step >= 1 && (
                      <motion.div
                        key="ateneo"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "100%", opacity: 1 }}
                        className="flex-1 relative h-full shrink-0 min-w-0"
                        transition={smoothSpring}
                      >
                        <div className="relative w-full h-full rounded-[20px] bg-[#F3ECE0] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                          <div className="relative flex items-center h-full pl-3 pr-2 z-10">
                            <span className="text-[14px] font-bold text-[#DC5F00] truncate flex-1 pr-1">
                              {step < 8 ? "Tutta la città" : "PoliMi"}
                            </span>
                            <motion.div
                              animate={{ rotate: step >= 7 && step < 8 ? 180 : 0 }}
                              className="shrink-0 text-[#DC5F00]"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </motion.div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {step >= 7 && step < 8 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 8, scale: 1 }}
                              exit={{
                                opacity: 0,
                                scale: 0.95,
                                transition: { duration: 0.15 },
                              }}
                              className="absolute top-full right-0 w-full min-w-[220px] bg-[#EAE0D0] p-1.5 rounded-[24px] shadow-2xl z-50 border-2 border-white/40 max-h-[220px] overflow-y-auto"
                            >
                              {[
                                "Tutta la città",
                                "PoliMi",
                                "Bocconi",
                                "Unimi",
                                "Cattolica",
                              ].map((opt) => (
                                <div
                                  key={opt}
                                  className={`px-4 py-3 rounded-[16px] text-[14px] font-bold cursor-pointer transition-colors ${(opt === "PoliMi" && step >= 7.5) || (opt === "Tutta la città" && step < 7.5) ? "bg-[#DC5F00]/20 text-[#DC5F00]" : "text-black/70 hover:bg-[#F3ECE0]"}`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* WhatsApp Group */}
                <AnimatePresence>
                  {step === 9 && (
                    <motion.div
                      layout
                      key="whatsapp"
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        marginTop: 10,
                        scale: 1.02,
                      }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={smoothSpring}
                      className="w-full drop-shadow-[0_4px_12px_rgba(37,211,102,0.3)] origin-top"
                    >
                      <Squircle
                        cornerRadius={20}
                        className="w-full bg-[#25D366] flex flex-row items-center justify-between px-3 py-2.5 text-white overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] relative"
                      >
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                        />
                        <div className="flex items-center z-10 pl-1 gap-3">
                          <Squircle
                            cornerRadius="full"
                            className="bg-white text-[#25D366] flex items-center justify-center w-8 h-8"
                          >
                            <FaWhatsapp className="w-5 h-5" />
                          </Squircle>
                          <div className="flex flex-col">
                            <span className="font-extrabold leading-tight text-[13px] drop-shadow-sm">
                              Gruppo POLIMI
                            </span>
                            <span className="font-semibold text-[#E0F8E6] text-[11px] flex items-center leading-tight">
                              <span className="w-1.5 h-1.5 bg-white rounded-full inline-block mr-1.5 animate-pulse" />
                              Entra nel Gruppo 📣
                            </span>
                          </div>
                        </div>
                      </Squircle>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* SCENE: SPOTTED FORM */}
          {sceneId === "spotted" && (
            <motion.div
              layout
              key="scene-spotted"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: -30,
                transition: { duration: 0.2 },
              }}
              transition={smoothSpring}
              className="w-full flex flex-col gap-4 px-4"
            >
              <AnimatePresence mode="popLayout">
                {step < 13.5 && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={smoothSpring}
                    className="w-full shadow-2xl rounded-[32px] mx-auto relative shrink-0 min-h-[260px]"
                  >
                    <Squircle
                      cornerRadius={32}
                      className="bg-[#EAE0D0] p-3 flex flex-col gap-3 h-full min-h-[260px]"
                    >
                  <motion.div
                    className="shrink-0"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{
                      opacity: step === 11 ? 1 : 0.6,
                      scale: step === 11 ? 1.02 : 1,
                      y: 0,
                    }}
                    transition={smoothSpring}
                  >
                    <Squircle
                      cornerRadius={20}
                      className="bg-[#F3ECE0] flex items-center overflow-hidden w-full min-h-[3.25rem] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] py-2"
                    >
                      <div className="pl-4 pr-1 text-xl self-start pt-1 drop-shadow-sm">
                        📍
                      </div>
                      <div className="text-[13px] font-bold px-2 flex-1 min-w-0 pr-3">
                        <TypewriterSim
                          word="Davanti all'aula 4.0.1"
                          active={step >= 11}
                          className="whitespace-normal leading-tight h-full font-bold pt-[0.45rem]"
                        />
                      </div>
                    </Squircle>
                  </motion.div>

                  <motion.div
                    className="shrink-0"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{
                      opacity: step === 12 ? 1 : step >= 11 ? 0.6 : 1,
                      scale: step === 12 ? 1.02 : 1,
                      y: 0,
                    }}
                    transition={{ ...smoothSpring, delay: 0.1 }}
                  >
                    <Squircle
                      cornerRadius={20}
                      className="bg-[#F3ECE0] flex items-center overflow-hidden w-full min-h-[3.25rem] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] py-2"
                    >
                      <div className="pl-4 pr-1 text-xl self-start pt-1 drop-shadow-sm">
                        🗓️
                      </div>
                      <div className="text-[13px] font-bold px-2 flex-1 min-w-0 pr-3">
                        <TypewriterSim
                          word="Oggi alle 9:35"
                          active={step >= 12}
                          className="whitespace-normal leading-tight h-full font-bold pt-[0.45rem]"
                        />
                      </div>
                    </Squircle>
                  </motion.div>

                  <motion.div
                    className="flex-1 min-h-[4.5rem] min-w-0 flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: step === 13 || step === 10 ? 1 : 0.6,
                      scale: step === 13 ? 1.02 : 1,
                      y: 0,
                    }}
                    transition={{ ...smoothSpring, delay: 0.2 }}
                  >
                    <Squircle
                      cornerRadius={24}
                      className="bg-[#F3ECE0] flex pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] flex-1 overflow-hidden min-h-0 relative"
                    >
                      <div className="pl-4 pr-1 text-xl self-start drop-shadow-sm">
                        🔍
                      </div>
                      <div className="text-[14px] px-2 leading-relaxed flex-1 min-w-0 pr-3 pb-3 break-words relative w-full h-full">
                        <TypewriterSim
                          word="Il ragazzo con la felpa blu, ci siamo incrociati..."
                          active={step >= 13}
                          className="text-black font-semibold text-[14px] whitespace-normal"
                        />
                      </div>
                    </Squircle>
                  </motion.div>
                    </Squircle>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 13.5+ Footer IG embedded in spotted scene for mode 'wait' */}
              <AnimatePresence>
                {step >= 13.5 && (
                  <motion.div
                    layout
                    key="footer-ig"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={smoothSpring}
                    className="flex gap-2.5 shrink-0 h-[3.5rem] relative w-full"
                  >
                    <div className="flex-1 min-w-0 shadow-xl rounded-[24px]">
                      <Squircle
                        cornerRadius={24}
                        className="bg-[#EAE0D0] flex items-center pl-1.5 pr-2 h-full w-full"
                      >
                        <div className="w-[2.75rem] h-[2.75rem] shrink-0 relative drop-shadow-sm">
                          <Squircle
                            cornerRadius={20}
                            className="w-full h-full bg-[#F3ECE0] flex items-center justify-center"
                          >
                            <Instagram className="w-[18px] h-[18px] text-pink-600" />
                          </Squircle>
                        </div>
                        <div className="flex items-center flex-1 min-w-0 h-full pl-2">
                          <span className="text-[15px] font-bold text-gray-400 shrink-0">
                            @
                          </span>
                          <div className="flex-1 min-w-0 flex items-center relative overflow-hidden text-clip whitespace-nowrap">
                            {step >= 14 ? (
                              <TypewriterSim
                                word="mariorossi"
                                active={step >= 14}
                                className="text-[14px] font-bold text-gray-700 pl-0.5 inline-block flex-1"
                                baseDelay={30}
                                randomDelay={20}
                              />
                            ) : (
                              <>
                                <span className="text-[13px] font-medium text-gray-400 pl-0.5 inline-block flex-1">
                                  Il tuo username IG
                                </span>
                                {(step >= 13.5 && step < 14) && (
                                  <motion.div
                                    className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[2px] h-[16px] bg-[#DC5F00] rounded-sm"
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </Squircle>
                    </div>

                    <div className="shrink-0 min-w-[5rem] shadow-[0_4px_14px_rgba(220,95,0,0.35)] rounded-[24px]">
                      <Squircle
                        cornerRadius={24}
                        className={`text-white px-4 font-bold flex items-center justify-center h-full w-full duration-300 ${step >= 15 ? "bg-[#c95300] scale-[0.98]" : "bg-[#DC5F00] hover:scale-105"}`}
                      >
                        {step >= 15 ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1.5"
                          >
                            <Send className="w-[18px] h-[18px] opacity-70" />{" "}
                            Inviato!
                          </motion.span>
                        ) : (
                          <>
                            Invia <Send className="w-[18px] h-[18px] ml-2" />
                          </>
                        )}
                      </Squircle>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* SCENE: SONDAGGIO SWITCHER */}
          {sceneId === "sondaggio-switch" && (
            <motion.div
              layout
              key="scene-mode-switch"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: -30,
                scale: 0.95,
                transition: { duration: 0.2 },
              }}
              transition={smoothSpring}
              className="w-full px-4"
            >
              <div className="shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] rounded-[24px]">
                <Squircle
                cornerRadius={24}
                className="flex bg-[#EAE0D0] p-1.5 h-14 w-full relative group"
              >
                <motion.div
                  className="absolute top-1.5 bottom-1.5 shadow-sm z-0 bg-[#DC5F00] rounded-[18px]"
                  initial={{ left: "6px", width: "calc(50% - 6px)" }}
                  animate={{
                    left: mode === "sondaggio" ? "calc(50% + 0px)" : "6px",
                    width: "calc(50% - 6px)",
                  }}
                  transition={smoothSpring}
                />
                <div
                  className={`flex-1 flex items-center justify-center font-bold z-10 gap-2 text-[15px] ${mode === "sondaggio" ? "text-gray-500" : "text-white"}`}
                >
                  <span
                    className={`text-[22px] transition-all duration-500 ${mode === "sondaggio" ? "grayscale scale-100 opacity-60" : "drop-shadow-sm scale-110"}`}
                  >
                    📍
                  </span>{" "}
                  Spotted
                </div>
                <div
                  className={`flex-1 flex items-center justify-center font-bold z-10 gap-2 text-[15px] ${mode === "sondaggio" ? "text-white" : "text-gray-500"}`}
                >
                  <span
                    className={`text-[22px] transition-all duration-500 ${mode === "sondaggio" ? "drop-shadow-sm scale-110" : "grayscale opacity-60 scale-100"}`}
                  >
                    📊
                  </span>{" "}
                  Sondaggio
                </div>
              </Squircle>
              </div>
            </motion.div>
          )}

          {/* SCENE: SONDAGGIO FORM */}
          {sceneId === "sondaggio-form" && (
            <motion.div
              layout
              key="scene-sondaggio"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: -30,
                transition: { duration: 0.2 },
              }}
              transition={smoothSpring}
              className="w-full px-4"
            >
              <div className="w-full shadow-2xl rounded-[32px] relative shrink-0 min-h-[160px] md:min-h-[220px]">
                <Squircle
                cornerRadius={32}
                className="bg-[#EAE0D0] p-3 flex flex-col gap-3 h-full overflow-hidden relative"
              >
                <div className="flex-1 w-full relative z-10 flex flex-col justify-start">
                  <Squircle
                    cornerRadius={24}
                    className="bg-[#F3ECE0] flex overflow-hidden min-h-[4.5rem] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] pt-[14px] mb-3"
                  >
                    <div className="pl-3 pr-1 text-xl self-start drop-shadow-sm mt-[-2px]">
                      📊
                    </div>
                    <div className="text-[14px] font-bold px-2 leading-relaxed pt-0.5 break-words pr-2">
                      <TypewriterSim
                        word="Che ne pensate della nuova aula studio? Fa troppo caldo?"
                        active={step >= 17}
                        className="text-black font-bold text-[14px] whitespace-normal"
                      />
                    </div>
                  </Squircle>

                  <motion.div
                    className="flex-1 shrink-0 h-[2.5rem] mb-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: step >= 17 ? 1 : 0, x: step >= 17 ? 0 : -20 }}
                    transition={{ ...smoothSpring, delay: 0.2 }}
                  >
                    <Squircle
                      cornerRadius={16}
                      className="bg-[#F3ECE0] flex items-center h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative group text-[13px] font-bold text-black border border-[#EAE0D0]/50 overflow-hidden"
                    >
                      <div className="w-[3rem] shrink-0 text-center font-bold text-gray-400 text-[10px] flex flex-col justify-center items-center h-full border-r border-[#EAE0D0] bg-white/20">
                        OPZ
                        <br />1
                      </div>
                      <div className="px-3 truncate text-gray-800 font-medium">
                        Fa caldissimo 🥵
                      </div>
                    </Squircle>
                  </motion.div>
                  <motion.div
                    className="flex-1 shrink-0 h-[2.5rem] mb-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: step >= 17 ? 1 : 0, x: step >= 17 ? 0 : -20 }}
                    transition={{ ...smoothSpring, delay: 0.3 }}
                  >
                    <Squircle
                      cornerRadius={16}
                      className="bg-[#F3ECE0] flex items-center h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative group text-[13px] font-bold text-black border border-[#EAE0D0]/50 overflow-hidden"
                    >
                      <div className="w-[3rem] shrink-0 text-center font-bold text-gray-400 text-[10px] flex flex-col justify-center items-center h-full border-r border-[#EAE0D0] bg-white/20">
                        OPZ
                        <br />2
                      </div>
                      <div className="px-3 truncate text-gray-800 font-medium">
                        Si sta da dio ❄️
                      </div>
                    </Squircle>
                  </motion.div>
                  <motion.div
                    className="shrink-0 overflow-hidden"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ 
                      opacity: step >= 18 ? 1 : 0, 
                      height: step >= 18 ? "2.5rem" : 0, 
                      marginBottom: step >= 18 ? "0.5rem" : 0 
                    }}
                    transition={{ ...smoothSpring }}
                  >
                    <Squircle
                      cornerRadius={16}
                      className="bg-[#F3ECE0] flex items-center h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative group text-[13px] font-bold text-black border border-[#EAE0D0]/50"
                    >
                      <div className="w-[3rem] shrink-0 text-center font-bold text-gray-400 text-[10px] flex flex-col justify-center items-center h-full border-r border-[#EAE0D0] bg-white/20">
                        OPZ
                        <br />3
                      </div>
                      <div className="px-3 truncate text-gray-800 font-medium">
                        <TypewriterSim word="Fuggire all'aperto" active={step >= 18} className="text-gray-800 font-medium text-[13px]" />
                      </div>
                    </Squircle>
                  </motion.div>
                  
                  <motion.div
                    className="shrink-0 overflow-hidden relative"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: step >= 17 ? 1 : 0, height: step >= 17 ? "2.5rem" : 0 }}
                    transition={{ ...smoothSpring, delay: 0.4 }}
                  >
                    <AnimatePresence mode="wait">
                      {step >= 19 ? (
                        <motion.div key="opz4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="h-[2.5rem]">
                          <Squircle
                            cornerRadius={16}
                            className="bg-[#F3ECE0] flex items-center h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative group text-[13px] font-bold text-black border border-[#EAE0D0]/50"
                          >
                            <div className="w-[3rem] shrink-0 text-center font-bold text-gray-400 text-[10px] flex flex-col justify-center items-center h-full border-r border-[#EAE0D0] bg-white/20">
                              OPZ
                              <br />4
                            </div>
                            <div className="px-3 truncate text-gray-800 font-medium">
                              <TypewriterSim word="È perfetto" active={step >= 19} className="text-gray-800 font-medium text-[13px]" />
                            </div>
                          </Squircle>
                        </motion.div>
                      ) : (
                        <motion.div key="add-btn" exit={{ opacity: 0, scale: 0.95 }} className="h-[2.5rem] flex items-center justify-center">
                          <Squircle
                            cornerRadius="full"
                            className="text-[#DC5F00] text-[13px] font-bold py-1 px-3 self-center bg-transparent flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <span className="text-[16px] leading-none pb-[1px]">+</span> Aggiungi opzione
                          </Squircle>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </Squircle>
              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </div>
      </div>

      {/* LOGO IN ALTO (Z-INDEX RIDOTTO) */}
      <div className="absolute top-4 left-0 right-0 h-20 shrink-0 w-full flex items-start justify-center z-0 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: step >= 0 && step < 20 ? 0.3 : 0, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="flex items-center justify-center gap-2 drop-shadow-sm rounded-full px-4 py-2"
        >
          <Logo className="w-[100px] h-[24px]" />
        </motion.div>
      </div>

      {/* FINAL FULL SCREEN CTA */}
      <AnimatePresence>
        {step >= 20 && (
          <motion.div
            key="final-cta"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-50 bg-[#F3ECE0]/90 flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 1, ease: easeOutExpo, delay: 0.2 }} 
              className="mb-8"
            >
              <img src="https://raw.githubusercontent.com/raffaele-ando/Logo-vari/refs/heads/main/logo%205.png" alt="Agorà Logo" className="h-24 md:h-32 object-contain drop-shadow-md" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-[#111] font-bold tracking-[0.2em] text-lg md:text-xl text-center"
            >
              agora.theproject.world
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
