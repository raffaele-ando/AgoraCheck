import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useSubmitSpotted } from "../pages/Home";
import { motion } from "motion/react";

export function ThemeRetro() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "" }));
  };

  return (
    <div className="min-h-screen bg-[#F3ECE0] flex items-center justify-center p-4 font-sans select-none" style={{ fontFamily: '"Tahoma", sans-serif' }}>
      <div className="w-full max-w-sm bg-[#F3ECE0] border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-[#000000] shadow-[2px_2px_0px_#000000] p-1">
        
        {/* Title Bar */}
        <div className="bg-[#000000] text-white px-2 py-1 items-center flex justify-between font-bold text-sm">
          <span>Polimi_Agorà.exe</span>
          <div className="bg-[#F3ECE0] w-4 h-4 shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] border border-black flex items-center justify-center text-black text-xs font-bold leading-none cursor-default active:bg-[#DC5F00] active:text-white">×</div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-[#000000]">
          <div className="space-y-1 p-2 border-t-2 border-l-2 border-[#000000] border-r-2 border-b-2 border-r-white border-b-white bg-[#F3ECE0]">
            <label className="text-xs font-bold">1. QUANDO l'hai visto? (Opzionale)</label>
            <input
              type="text"
              placeholder="Es. Il 17 aprile alle 24:30"
              value={form.when}
              onChange={e => setForm({...form, when: e.target.value})}
              className="w-full bg-white border-t-2 border-l-2 border-[#000000] border-r-2 border-b-2 border-b-white border-r-white p-1 text-sm outline-none"
            />
          </div>
          
          <div className="space-y-1 p-2 border-t-2 border-l-2 border-[#000000] border-r-2 border-b-2 border-r-white border-b-white bg-[#F3ECE0]">
            <label className="text-xs font-bold">2. DOVE ti trovavi? (Opzionale)</label>
            <input
              type="text"
              placeholder="Es. Usciva dall'aula 4.0.1"
              value={form.where}
              onChange={e => setForm({...form, where: e.target.value})}
              className="w-full bg-white border-t-2 border-l-2 border-[#000000] border-r-2 border-b-2 border-b-white border-r-white p-1 text-sm outline-none"
            />
          </div>
          
          <div className="space-y-1 p-2 border-t-2 border-l-2 border-[#000000] border-r-2 border-b-2 border-r-white border-b-white bg-[#F3ECE0]">
            <label className="text-xs font-bold text-[#DC5F00]">3. CHI O COSA cerchi? (Obbligatorio) *</label>
            <textarea
              required
              value={form.lookingFor}
              onChange={e => setForm({...form, lookingFor: e.target.value})}
              className="w-full bg-white border-t-2 border-l-2 border-[#000000] border-r-2 border-b-2 border-b-white border-r-white p-1 text-sm outline-none resize-none h-16 focus:bg-[#DC5F00]/5"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="px-6 py-1 bg-[#F3ECE0] border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-[#000000] active:border-r-white active:border-b-white active:border-t-black active:border-l-black text-sm disabled:opacity-60 text-[#000000] font-bold hover:text-[#DC5F00]">
               {isSubmitting ? "Wait..." : isSuccess ? "Done" : "INVIA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ThemeReceipt() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "" }));
  };

  const currentDate = new Date().toLocaleDateString('it-IT');
  const currentTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8DEC8] to-[#D2C4A9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative">
        <div className="w-full bg-[#F9F7F1] shadow-[0_20px_50px_rgba(0,0,0,0.15)] pb-12 rotate-[1deg] font-mono text-[#333333] relative z-10">
          {/* Top zigzag */}
          <div className="absolute top-0 left-0 w-full h-4 overflow-hidden -mt-4">
            <div className="w-full h-8" style={{ background: "radial-gradient(circle at 10px 10px, transparent 10px, #F9F7F1 10.5px)", backgroundSize: "20px 20px" }}></div>
          </div>

          <div className="p-8 pb-4">
            <h1 className="text-3xl font-bold text-center tracking-widest uppercase mb-1 text-[#1A1A1A]">POLIMI</h1>
            <h2 className="text-xl font-medium text-center tracking-widest uppercase mb-4 text-[#1A1A1A]">AGORÀ</h2>
            <div className="text-xs text-center border-b-2 border-dashed border-[#d1d1d1] pb-4 mb-4 text-[#666666]">
              <p>RICEVUTA INVIO MSG.</p>
              <p>DATA: {currentDate} ORA: {currentTime}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-[#666666]">1. QUANDO [OPZIONALE]:</label>
                <input
                  type="text" placeholder="Es. Il 17 aprile alle 24:30" value={form.when} onChange={e => setForm({...form, when: e.target.value})}
                  className="w-full bg-transparent border-b border-[#d1d1d1] focus:border-[#DC5F00] outline-none text-sm text-[#1A1A1A] placeholder:text-[#999999]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-[#666666]">2. DOVE [OPZIONALE]:</label>
                <input
                  type="text" placeholder="Es. Usciva dall'aula 4.0.1" value={form.where} onChange={e => setForm({...form, where: e.target.value})}
                  className="w-full bg-transparent border-b border-[#d1d1d1] focus:border-[#DC5F00] outline-none text-sm text-[#1A1A1A] placeholder:text-[#999999]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-[#666666]">3. *CHI/COSA [OBBLIGATORIO]:</label>
                <textarea
                  required value={form.lookingFor} onChange={e => setForm({...form, lookingFor: e.target.value})}
                  className="w-full bg-transparent border-b border-[#d1d1d1] focus:border-[#DC5F00] outline-none resize-none text-sm font-bold text-[#1A1A1A]"
                  rows={2}
                />
              </div>

              <div className="border-t-2 border-dashed border-[#d1d1d1] mt-6 pt-6">
                <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="w-full py-3 bg-[#DC5F00]/10 text-[#DC5F00] font-bold tracking-widest uppercase text-sm hover:bg-[#DC5F00] hover:text-white disabled:opacity-50 transition-colors">
                  {isSubmitting ? "STAMPA IN CORSO..." : isSuccess ? "INVIATO" : "CONFERMA EDIZIONE"}
                </button>
              </div>
            </form>
            
            <p className="text-[10px] text-center mt-6 uppercase text-[#999999] font-bold tracking-widest">Senza Valore Fiscale</p>
          </div>
          
          {/* Bottom zigzag */}
          <div className="absolute bottom-0 left-0 w-full h-4 overflow-hidden -mb-4 rotate-180">
            <div className="w-full h-8" style={{ background: "radial-gradient(circle at 10px 10px, transparent 10px, #F9F7F1 10.5px)", backgroundSize: "20px 20px" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeDossier() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "" }));
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#E8DEC8] shadow-[10px_10px_30px_rgba(0,0,0,0.5)] border border-[#D2C4A9] p-6 md:p-12 relative overflow-hidden font-mono text-[#333333]">
        
        <header className="border-b-2 border-[#D2C4A9] pb-4 mb-6 flex justify-between items-end">
           <div>
             <h1 className="text-4xl font-black tracking-tighter uppercase mb-1 text-[#1A1A1A]">CLASSIFIED</h1>
             <h2 className="text-sm font-bold tracking-widest border-t-2 border-[#1A1A1A] inline-block pt-1">AGORÀ DEPT.</h2>
           </div>
           <div className="text-right">
             <p className="text-xs font-bold uppercase text-[#DC5F00]">TOP SECRET</p>
           </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 pb-4 border-b border-[#D2C4A9]">
            <label className="text-sm font-bold uppercase block text-[#666666]">1. Sighting Time (Optional)</label>
            <input
              type="text" placeholder="Es. Il 17 aprile alle 24:30" value={form.when} onChange={e => setForm({...form, when: e.target.value})}
              className="w-full bg-transparent border-b-2 border-transparent hover:border-[#1A1A1A]/30 focus:border-[#DC5F00] outline-none font-medium text-lg placeholder-[#1A1A1A]/20"
            />
          </div>

          <div className="space-y-2 pb-4 border-b border-[#D2C4A9]">
            <label className="text-sm font-bold uppercase block text-[#666666]">2. Sighting Location (Optional)</label>
            <input
              type="text" placeholder="Es. Usciva dall'aula 4.0.1" value={form.where} onChange={e => setForm({...form, where: e.target.value})}
              className="w-full bg-transparent border-b-2 border-transparent hover:border-[#1A1A1A]/30 focus:border-[#DC5F00] outline-none font-medium text-lg placeholder-[#1A1A1A]/20"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-bold uppercase block text-[#DC5F00]">3. Target Description (REQUIRED)</label>
            <textarea
              required value={form.lookingFor} onChange={e => setForm({...form, lookingFor: e.target.value})}
              className="w-full bg-[#D2C4A9]/30 border-2 border-[#D2C4A9] focus:bg-transparent outline-none resize-none font-medium h-24 text-lg p-3 text-[#1A1A1A]"
            />
          </div>

          <div className="pt-8 flex items-center justify-between relative">
            <div className={`absolute top-0 right-4 border-[6px] rounded-lg border-[#DC5F00] text-[#DC5F00] font-black text-4xl uppercase p-2 rotate-[-15deg] transition-all duration-300 ${isSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-150'} mix-blend-multiply`}>FILED</div>
            
            <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="px-8 py-3 bg-[#1A1A1A] text-[#E8DEC8] font-bold uppercase hover:bg-[#DC5F00] disabled:opacity-50 transition-colors">
               {isSubmitting ? "FILING..." : "SUBMIT REPORT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ThemeArcade() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "" }));
  };

  return (
    <div className="min-h-screen bg-[#F3ECE0] flex items-center justify-center p-4" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
      <div className="w-full max-w-md border-[12px] border-[#000000] bg-[#000000] p-6 shadow-2xl relative overflow-hidden">
        
        {/* Pixel Scanlines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.15] bg-[linear-gradient(transparent_50%,rgba(243,236,224,1)_50%)] bg-[length:100%_4px]"></div>
        
        <div className="text-center mb-8 border-b-4 border-[#000000] pb-4 relative z-10">
          <h1 className="text-4xl font-black text-[#DC5F00] mb-2" style={{ fontFamily: 'Impact, sans-serif'}}>
            ARCADE AGORÀ
          </h1>
          <p className="text-[#F3ECE0] text-sm animate-pulse tracking-widest font-bold">P1 PRESS START</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10 text-[#F3ECE0]">
          
          <div className="space-y-2 bg-[#111111] p-3 border-l-4 border-transparent hover:border-[#F3ECE0]">
             <label className="block font-bold text-xs uppercase opacity-70">LVL 1: TIME [OPT]</label>
             <input
                type="text" placeholder="Es. Il 17 aprile alle 24:30" value={form.when} onChange={e => setForm({...form, when: e.target.value})}
                className="w-full bg-[#000000] border-2 border-[#333333] focus:border-[#DC5F00] outline-none p-2 text-white font-bold placeholder:text-white/20"
             />
          </div>

          <div className="space-y-2 bg-[#111111] p-3 border-l-4 border-transparent hover:border-[#F3ECE0]">
             <label className="block font-bold text-xs uppercase opacity-70">LVL 2: ZONE [OPT]</label>
             <input
                type="text" placeholder="Es. Usciva dall'aula 4.0.1" value={form.where} onChange={e => setForm({...form, where: e.target.value})}
                className="w-full bg-[#000000] border-2 border-[#333333] focus:border-[#DC5F00] outline-none p-2 text-white font-bold placeholder:text-white/20"
             />
          </div>

          <div className="space-y-2 bg-[#1A1A1A] p-3 border-l-4 border-[#DC5F00]">
             <label className="block font-bold text-xs uppercase text-[#DC5F00]">BOSS FIGHT: TARGET [REQ]</label>
             <textarea
                required value={form.lookingFor} onChange={e => setForm({...form, lookingFor: e.target.value})}
                className="w-full bg-[#000000] border-2 border-[#DC5F00] focus:border-[#F3ECE0] outline-none p-2 resize-none text-white font-bold min-h-[80px]"
             />
          </div>

          <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="w-full mt-4 py-4 bg-[#DC5F00] text-[#000000] font-black text-xl hover:bg-[#F3ECE0] transition-colors uppercase disabled:opacity-50 tracking-widest">
             {isSubmitting ? "LOADING..." : isSuccess ? "YOU WIN!" : "A BUTTON (SEND)"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ThemeStories() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "" });
  const [step, setStep] = useState(0);

  const handleNext = () => { if (step < 2) setStep(step + 1); else submitForm(); };
  const handlePrev = () => { if (step > 0) setStep(step - 1); };

  const submitForm = async () => {
    if (!form.lookingFor) return;
    const ok = await submit(form);
    if (ok) { setStep(3); setTimeout(() => { setStep(0); setForm({ lookingFor: "", when: "", where: "" }); }, 3000); }
  };

  const slides = [
    { bg: "bg-[#000000]", color: "text-[#F3ECE0]", title: "1. QUANDO l'hai visto?", sub: "Opzionale", key: "when", placeholder: "Es. Il 17 aprile alle 24:30" },
    { bg: "bg-[#000000]", color: "text-[#F3ECE0]", title: "2. DOVE eri?", sub: "Opzionale", key: "where", placeholder: "Es. Usciva dall'aula 4.0.1" },
    { bg: "bg-[#F3ECE0]", color: "text-[#000000]", title: "3. CHI stai cercando?", sub: "Obbligatorio", key: "lookingFor", placeholder: "Scrivi qui..." }
  ];

  if (step === 3) {
    return (
      <div className="h-[100dvh] w-full bg-[#F3ECE0] flex items-center justify-center sm:p-4 pb-20 sm:pb-4">
         <div className="w-full max-w-sm h-full sm:h-[85vh] sm:rounded-[3rem] bg-[#000000] flex flex-col items-center justify-center text-[#F3ECE0] p-8 text-center shadow-2xl relative">
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#DC5F00]/20 to-transparent pointer-events-none"></div>
            <CheckCircle2 className="w-20 h-20 mb-4 mx-auto text-[#DC5F00]" />
             <h2 className="text-3xl font-black uppercase">Inviato!</h2>
         </div>
      </div>
    );
  }

  const currentSlide = slides[step];

  return (
    <div className="h-[100dvh] w-full bg-[#000000] sm:bg-[#F3ECE0] flex items-center justify-center sm:p-4 pb-20 sm:pb-4">
      <div className={`w-full max-w-sm h-full sm:h-[85vh] sm:rounded-[3rem] ${currentSlide.bg} ${currentSlide.color} relative overflow-hidden flex flex-col shadow-2xl transition-colors duration-500`}>
         
         {/* Story Progress Bars */}
         <div className="absolute top-0 left-0 w-full p-4 flex gap-1 z-20 pointer-events-none mt-16 sm:mt-0">
           {[0, 1, 2].map(i => (
             <div key={i} className={`h-1 flex-1 ${i <= step ? 'bg-[#DC5F00]' : 'bg-black/20 sm:bg-white/20'} rounded-full overflow-hidden transition-colors`}></div>
           ))}
         </div>

         {/* Navigation Areas */}
         <div className="absolute inset-0 flex z-10">
           <div className="flex-1 cursor-pointer" onClick={handlePrev} />
           <div className="flex-1 cursor-pointer" onClick={() => (step === 2 && !form.lookingFor) ? null : handleNext()} />
         </div>

         <div className="flex-1 flex flex-col justify-center items-center p-8 z-20 pointer-events-none">
           <p className="uppercase tracking-widest text-sm font-bold opacity-70 mb-2">{currentSlide.sub}</p>
           <h2 className="text-3xl font-black text-center mb-8">{currentSlide.title}</h2>
           
           <textarea
             autoFocus
             value={(form as any)[currentSlide.key]}
             onChange={e => setForm({...form, [currentSlide.key]: e.target.value})}
             className="w-full text-center text-2xl font-bold p-4 bg-transparent outline-none pointer-events-auto resize-none"
             placeholder={currentSlide.placeholder}
             rows={3}
           />

           <div className="mt-8 text-sm font-bold animate-pulse uppercase tracking-widest border border-current px-4 py-2 rounded-full">
             Tocca a destra {step === 2 ? "PER INVIARE" : "=>"}
           </div>
         </div>
      </div>
    </div>
  );
}

// THEME 11: CORKBOARD (Old Theme 4 adapted to brand colors)
// ==========================================
export function ThemeCorkboard() {
  const { submit, isSubmitting, isSuccess } = useSubmitSpotted();
  const [form, setForm] = useState({ lookingFor: "", when: "", where: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lookingFor) submit(form).then(ok => ok && setForm({ lookingFor: "", when: "", where: "" }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#111111] bg-[radial-gradient(rgba(243,236,224,0.1)_2px,transparent_2px)] [background-size:20px_20px]">
      <motion.div initial={{ rotate: -2, scale: 0.9 }} animate={{ rotate: 1, scale: 1 }} className="relative w-full max-w-sm bg-gradient-to-br from-[#F3ECE0] to-[#E8DEC8] p-8 pb-10 shadow-[5px_10px_30px_rgba(0,0,0,0.8)] border border-[#000000]/10">
        {/* Tape piece */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/40 backdrop-blur-sm rotate-[-2deg] shadow-sm border border-[#000000]/10"></div>
        
        <div className="mb-6 text-center">
          <h2 className="text-4xl font-black text-[#000000] uppercase tracking-tighter leading-none" style={{ fontFamily: 'Impact, sans-serif' }}>
            WANTED!
          </h2>
          <h3 className="text-lg font-black text-[#000000] uppercase tracking-wider leading-none mt-1" style={{ fontFamily: 'Impact, sans-serif' }}>
            SPOTTED AL POLIMI
          </h3>
          <p className="text-[10px] uppercase font-bold text-[#DC5F00] mt-2 tracking-widest font-mono">Agorà aby Project</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 font-mono text-[#000000]">
          <div className="p-2">
            <label className="block text-xs font-bold text-[#000000] mb-1 uppercase">1. Quando? (Opz.)</label>
            <input
              type="text" value={form.when} onChange={e => setForm({...form, when: e.target.value})}
              className="w-full bg-transparent border-b-2 border-[#000000]/20 focus:border-[#DC5F00] outline-none text-md placeholder:text-[#000000]/40 font-bold transition-colors"
              placeholder="Es. Ieri alle 14:00"
            />
          </div>

          <div className="p-2">
            <label className="block text-xs font-bold text-[#000000] mb-1 uppercase">2. Dove? (Opz.)</label>
            <input
              type="text" value={form.where} onChange={e => setForm({...form, where: e.target.value})}
              className="w-full bg-transparent border-b-2 border-[#000000]/20 focus:border-[#DC5F00] outline-none text-md placeholder:text-[#000000]/40 font-bold transition-colors"
              placeholder="Es. Edificio 13"
            />
          </div>

          <div className="p-2 pt-4 relative">
            <label className="block text-xs font-bold text-[#000000] mb-1 uppercase">3. Chi cerchi? *</label>
            <textarea
              required value={form.lookingFor} onChange={e => setForm({...form, lookingFor: e.target.value})}
              className="w-full bg-transparent border-b-2 border-[#000000]/20 focus:border-[#DC5F00] outline-none resize-none h-20 text-md placeholder:text-[#000000]/40 font-bold transition-colors"
              placeholder="Il tipo con lo zaino giallo..."
            />
          </div>

          <div className="flex justify-center mt-6">
            <button disabled={!form.lookingFor || isSubmitting || isSuccess} className="w-full max-w-[200px] mt-4 py-3 border-4 border-[#000000] text-[#000000] font-black uppercase text-lg hover:bg-[#DC5F00] hover:text-[#F3ECE0] transition-colors disabled:opacity-50">
              {isSubmitting ? "Inviando..." : isSuccess ? "Inviato!" : "Invia"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
