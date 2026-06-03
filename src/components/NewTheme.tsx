import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown, Send, Instagram, ChevronRight } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Squircle } from './Squircle';
import { useSubmitSpotted } from '../pages/Home';
import { useVisitAnalytics } from '../hooks/useVisitAnalytics';
import { loadWhatsappLinksFromDB, loadEventWidgetConfigFromDB, EventWidgetConfig, DEFAULT_EVENT_WIDGET_CONFIG } from './AppSettings';

function useTypewriter(words: string[], speed = 60, waitTime = 2000) {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  // We stringify words to avoid infinite effect triggers on referential equality check
  const wordsJson = JSON.stringify(words);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const parsedWords = JSON.parse(wordsJson) as string[];
    const i = loopNum % parsedWords.length;
    const fullText = parsedWords[i];

    if (isDeleting) {
      timer = setTimeout(() => setText(fullText.substring(0, text.length - 1)), speed / 2);
    } else {
      timer = setTimeout(() => setText(fullText.substring(0, text.length + 1)), speed);
    }

    if (!isDeleting && text === fullText) {
      timer = setTimeout(() => setIsDeleting(true), waitTime);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, wordsJson, speed, waitTime]);

  return text;
}

const MODES = [
  { id: 'spotted', label: 'Spotted', icon: '📍', active: true },
  { id: 'sondaggio', label: 'Sondaggio', icon: '📊', active: true },
  { id: 'eventi', label: 'Eventi', icon: '🎉', active: false },
  { id: 'appunti', label: 'Appunti', icon: '📖', active: false },
  { id: 'mercatino', label: 'Mercatino', icon: '📦', active: false },
  { id: 'gruppi', label: 'Persone', icon: '🤝', active: false }
];

import { LOCATIONS, CITIES, formatCity, formatArea } from './HeaderVariations';

const locations: Record<string, string[]> = {};
for (const city of CITIES) {
  locations[formatCity(city)] = LOCATIONS[city].map(a => formatArea(a, city));
}

function TypewriterTextarea({ words, prefix = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { words: string[], prefix?: string }) {
  const placeholderText = useTypewriter(words);
  return <textarea placeholder={`${prefix}${placeholderText}`} {...props} />;
}

export function ThemeCorkboard() {
  const { handleFocus, handleBlur, markSubmitted } = useVisitAnalytics();
  const { submit, isSubmitting, isSuccess, error, cooldown } = useSubmitSpotted();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<string>('spotted');
  const defaultCity = Object.keys(locations)[0] || "Milano";
  const [city, setCity] = useState(defaultCity);
  const [zone, setZone] = useState(locations[defaultCity]?.[0] || "");
  const [waLinks, setWaLinks] = useState<Record<string, string>>({});
  const [waLinksLoaded, setWaLinksLoaded] = useState(false);
  const [eventWidget, setEventWidget] = useState<EventWidgetConfig>(DEFAULT_EVENT_WIDGET_CONFIG);
  const [eventWidgetLoaded, setEventWidgetLoaded] = useState(false);

  useEffect(() => {
    loadWhatsappLinksFromDB().then((data) => {
      setWaLinks(data);
      setWaLinksLoaded(true);
    });
    loadEventWidgetConfigFromDB().then(data => {
      if (data) setEventWidget(data);
      setEventWidgetLoaded(true);
    });
  }, []);

  let searchZone = zone.toUpperCase();
  if (zone === "Tutta la città") searchZone = city.toUpperCase();

  let titleZone = zone === "Tutta la città" ? city : zone;

  // Resolve best event for current selection
  const activeEvent = (() => {
    if (!eventWidgetLoaded) return null;
    const events = (eventWidget?.events || []).filter(e => e.enabled);
    if (!events.length) return null;
    
    // Exact zone match
    let match = events.find(e => e.targetLocation.toLowerCase() === titleZone.toLowerCase());
    if (match) return match;
    
    // City match
    match = events.find(e => e.targetLocation.toLowerCase() === city.toLowerCase());
    if (match) return match;
    
    // "all" match
    return events.find(e => e.targetLocation.toLowerCase() === "all" || e.targetLocation.trim() === "");
  })();

  let waLinkToUse = `https://wa.me/?text=Voglio+entrare+nel+gruppo+di+${encodeURIComponent(titleZone)}`;
  if (waLinks[searchZone]) {
    waLinkToUse = waLinks[searchZone];
  } else if (waLinks[zone]) {
    waLinkToUse = waLinks[zone];
  } else if (waLinks[city.toUpperCase()]) {
    waLinkToUse = waLinks[city.toUpperCase()];
  } else if (waLinks[city]) {
    waLinkToUse = waLinks[city];
  } else if (waLinks["default"]) {
    waLinkToUse = waLinks["default"];
  }

  let waTitle = waLinks["_title"] || `Gruppo ${titleZone}`;
  let waSubtitle = waLinks["_subtitle"] || "Entra nel Gruppo WhatsApp {zona}";
  if (waSubtitle.includes("{zona}")) {
    waSubtitle = waSubtitle.replace("{zona}", `di ${titleZone}`);
  }


  useEffect(() => {
    let initCity = Object.keys(locations)[0] || "Milano";
    let initArea = "";
    let initMode = "spotted";

    const pathSegments = window.location.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s).toUpperCase().replace(/-/g, ' '));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check parameters in path
    for (const seg of pathSegments) {
      if (seg === "SPOTTED" || seg === "SONDAGGIO") {
         initMode = seg.toLowerCase();
      } else if (Object.keys(locations).some(l => l.toUpperCase() === seg)) {
         initCity = Object.keys(locations).find(l => l.toUpperCase() === seg) || initCity;
      } else {
         for (const [c, areas] of Object.entries(locations)) {
           if (areas.some(a => a.toUpperCase() === seg)) {
              initCity = c;
              initArea = areas.find(a => a.toUpperCase() === seg) || "";
              break;
           }
         }
      }
    }

    if (!initArea || !locations[initCity]?.includes(initArea)) {
       initArea = locations[initCity]?.[0] || initCity;
    }

    setCity(initCity);
    setZone(initArea);
    setMode(initMode);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const areaSlug = zone.toLowerCase().replace(/\s+/g, '-');
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const isTuttaLaCitta = zone === "Tutta la città";
    const newPath = isTuttaLaCitta ? `/${citySlug}/${mode}` : `/${citySlug}/${areaSlug}/${mode}`;
    
    if (url.pathname !== newPath) {
       url.searchParams.delete("mode");
       url.searchParams.delete("city");
       url.searchParams.delete("area");
       const newSearch = url.searchParams.toString();
       navigate(`${newPath}${newSearch ? '?' + newSearch : ''}`, { replace: true });
    }
  }, [mode, city, zone, navigate]);
  
  const [lookingFor, setLookingFor] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const generateId = () => Math.random().toString(36).substring(2, 9);
  const [options, setOptions] = useState([{id: generateId(), value: ''}, {id: generateId(), value: ''}]);
  const [instagram, setInstagram] = useState('');
  const [igShake, setIgShake] = useState(false);

  const handleIgChange = (val: string) => {
    val = val.replace(/^@/, '');
    
    if (val.length > 30 || /[^a-zA-Z0-9._]/.test(val) || val.includes('..') || val.startsWith('.')) {
      setIgShake(false); // Reset animation if re-triggered quickly
      setTimeout(() => setIgShake(true), 10);
      setTimeout(() => setIgShake(false), 400);
      return;
    }
    
    setInstagram(val);
  };
  
  const [isFormFocused, setIsFormFocused] = useState(false);
  const focusTimeoutRef = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);

  const handleInputFocus = (field: string) => {
    handleFocus(field);
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    setIsFormFocused(true);
  };

  const handleInputBlur = (field: string) => {
    handleBlur(field);
    focusTimeoutRef.current = setTimeout(() => {
      setIsFormFocused(false);
    }, 150);
  };

  const isIt = (() => {
    if (typeof navigator !== "undefined" && navigator.language) {
      return navigator.language.toLowerCase().startsWith('it');
    }
    return true;
  })();

  const whenWords = isIt ? [
    "9 Maggio alle 9:35", "12 Ottobre alle 14:15", "Lunedì 3 Aprile alle 11:30"
  ] : [
    "May 9th at 9:35 AM", "October 12th at 2:15 PM", "Monday, April 3rd at 11:30 AM"
  ];

  const whereWords = isIt ? [
    "Davanti all'aula 4.0.1", "Alla fila per la spritzeria", "Sulle scale di piazza Leo"
  ] : [
    "In front of room 4.0.1", "In line for drinks", "On the stairs at the piazza"
  ];

  const lookingForWordsSpotted = isIt ? [
    "Il ragazzo in piedi con il maglione rosso con i capelli biondi e un tatuaggio sul braccio",
    "La ragazza con la borsa a tracolla"
  ] : [
    "The guy standing in the red sweater with blonde hair and an arm tattoo",
    "The girl with the shoulder bag"
  ];

  const handleModeSwitch = (newMode: string) => {
    setMode(newMode);
    if (newMode === 'sondaggio' && options.length < 2) setOptions([{id: generateId(), value: ''}, {id: generateId(), value: ''}]);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setCity(newCity);
    setZone(locations[newCity][0]);
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, {id: generateId(), value: ''}]);
  };

  const activeModes = MODES.filter(m => m.active);
  const activeModeIndex = activeModes.findIndex(m => m.id === mode);

  const handleSubmit = () => {
    let dashboardCity = city.toUpperCase();
    let dashboardArea = zone === 'Tutta la città' ? dashboardCity : zone.toUpperCase();

    submit({
      type: mode as "spotted" | "sondaggio",
      city: dashboardCity,
      area: dashboardArea,
      lookingFor,
      when,
      where,
      pollOptions: options.map(o => o.value),
      instagram
    }).then(ok => {
      if (ok) {
        markSubmitted();
        setLookingFor('');
        setWhen('');
        setWhere('');
        setInstagram('');
        if (mode === 'sondaggio') setOptions(['', '']);
      }
    });
  };

  return (
    <div className="h-[100dvh] w-full bg-[#F3ECE0] text-[#000000] flex justify-center items-center font-sans selection:bg-[#DC5F00] selection:text-white pb-safe overflow-y-auto">
      <div className="flex flex-col p-2.5 gap-2.5 relative w-full h-full max-w-md mx-auto">
        
        {/* HEADER LOGO */}
        <div className="flex justify-center shrink-0 pt-1 pb-1">
          <img src="https://raw.githubusercontent.com/raffaele-ando/Logo-vari/refs/heads/main/logo%205.png" alt="App Logo" className="h-[2.5rem] object-contain drop-shadow-md" />
        </div>

        {/* TOP DYNAMIC SECTION */}
        <div className="relative w-full shrink-0">
          {isFormFocused ? (
            /* COMPACT STATE */
            <div className="flex gap-2 h-[3.25rem] pb-2 w-full">
              
              {/* COMPACT MODE */}
              <div className="flex flex-1 h-full min-w-0" style={{ borderRadius: 18 }}>
                 <Squircle cornerRadius={18} className="bg-[#DC5F00] text-white flex flex-1 items-center justify-center h-full px-3 shadow-sm min-w-0 w-full overflow-hidden">
                    <span className="text-[18px] drop-shadow-sm mr-1 shrink-0">{activeModes.find(m => m.id === mode)?.icon}</span>
                    <span className="text-[12px] font-bold tracking-tight truncate">{activeModes.find(m => m.id === mode)?.label}</span>
                 </Squircle>
              </div>

              {/* COMPACT LOCATION */}
              <div className="flex flex-[1.5] h-full min-w-0" style={{ borderRadius: 18 }}>
                 <Squircle cornerRadius={18} className="bg-[#EAE0D0] flex flex-1 items-center px-3 h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] min-w-0 w-full overflow-hidden">
                    <MapPin className="w-3.5 h-3.5 text-[#DC5F00] shrink-0 mr-1.5" />
                    <span className="text-[11px] font-extrabold text-[#2C2C2C] truncate leading-tight mt-[1px]">{city} • {zone}</span>
                 </Squircle>
              </div>

              {/* COMPACT ACTIONS */}
              <div className="flex gap-2 h-full shrink-0">
                 {/* Compact WA Button */}
                 {(!waLinksLoaded || waLinkToUse) && (
                 <div className={`h-full aspect-square shrink-0 ${!waLinksLoaded ? 'opacity-50 animate-pulse' : ''}`}>
                   <Squircle as={waLinkToUse ? "a" : "div"} href={waLinkToUse || undefined} target={waLinkToUse ? "_blank" : undefined} rel={waLinkToUse ? "noreferrer" : undefined} cornerRadius={16} className="bg-[#25D366] text-white h-full w-full flex items-center justify-center shadow-[0_2px_8px_rgba(37,211,102,0.3)] active:scale-95 transition-transform hover:bg-[#20bd5a] group/wa relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/wa:translate-y-0 transition-transform duration-300 ease-out" />
                      <FaWhatsapp className="w-5 h-5 relative z-10" />
                   </Squircle>
                 </div>
                 )}
                 {/* Compact Event Button */}
                 {activeEvent && (
                 <div className="h-full aspect-square shrink-0">
                   <Squircle as="a" href={activeEvent.url} target="_blank" rel="noreferrer" cornerRadius={16} className="bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-[#DC5F00] h-full w-full flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(220,95,0,0.3)] active:scale-95 transition-transform border border-white/5 relative overflow-hidden group/ev hover:scale-[1.02]">
                      <div className="absolute inset-0 bg-[#DC5F00] opacity-20 blur-md pointer-events-none group-hover/ev:opacity-40 transition-opacity" />
                      <span className="text-[16px] drop-shadow-md relative z-10 group-hover/ev:scale-110 transition-transform">{activeEvent.icon}</span>
                   </Squircle>
                 </div>
                 )}
              </div>
            </div>
          ) : (
            /* EXPANDED STATE */
            <div className="flex flex-col gap-2.5 pb-2 w-full">
               
               {/* EXPANDED MODE */}
               <div className="w-full h-14 shrink-0 drop-shadow-sm z-10" style={{ borderRadius: 24 }}>
                  <Squircle cornerRadius={24} className="flex bg-[#EAE0D0] p-1.5 relative w-full h-full">
                      <div
                        className="absolute top-1.5 bottom-1.5 drop-shadow-md transition-all duration-300 ease-out"
                        style={{ 
                          width: `calc(${100 / activeModes.length}% - ${12 / activeModes.length}px)`, 
                          left: `calc(6px + ${activeModeIndex * (100 / activeModes.length)}% - ${activeModeIndex * (12 / activeModes.length)}px)` 
                        }}
                      >
                        <Squircle cornerRadius={18} className="w-full h-full bg-[#DC5F00]" />
                      </div>
                      {activeModes.map((m) => (
                      <button 
                        key={m.id}
                        onClick={() => handleModeSwitch(m.id)}
                        className={`flex-1 flex items-center justify-center h-full font-bold z-10 transition-colors duration-300 gap-2 text-[15px] ${mode === m.id ? 'text-white' : 'text-gray-500 hover:text-black'}`}
                      >
                        <span className="text-[22px]" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}>{m.icon}</span> {m.label}
                      </button>
                      ))}
                  </Squircle>
               </div>

               {/* EXPANDED LOCATION */}
               <div className="w-full shrink-0 drop-shadow-sm z-10" style={{ borderRadius: 32 }}>
                  <Squircle cornerRadius={32} className="bg-[#EAE0D0] flex flex-col p-3 gap-2.5 w-full relative z-10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                     {/* Top Row: Location Selectors */}
                     <div className="flex w-full min-w-0 h-[3.25rem] gap-2.5">
                        <Squircle cornerRadius={20} className="relative flex-1 bg-[#F3ECE0] flex items-center h-full min-w-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-all duration-300">
                         <MapPin className="w-4 h-4 text-[#DC5F00] absolute left-3 pointer-events-none" />
                         <select 
                           value={city} onChange={handleCityChange} 
                           className="w-full h-full bg-transparent pl-9 pr-8 text-[13px] font-bold appearance-none outline-none truncate cursor-pointer focus:outline-none"
                         >
                            {Object.keys(locations).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" />
                      </Squircle>
                      <Squircle cornerRadius={20} className="relative flex-[1.2] bg-[#F3ECE0] flex items-center h-full min-w-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-all duration-300">
                         <select 
                           value={zone} onChange={(e)=>setZone(e.target.value)} 
                           className="w-full h-full bg-transparent pl-4 pr-8 text-[13px] font-bold appearance-none outline-none truncate cursor-pointer text-[#DC5F00] focus:outline-none"
                         >
                            {(locations[city] || []).map(z => <option key={z} value={z}>{z}</option>)}
                         </select>
                         <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" />
                      </Squircle>
                     </div>
                     
                     {/* Bottom Row: WhatsApp Smart Banner */}
                     {(!waLinksLoaded || waLinkToUse) && (
                     <div className={`w-full drop-shadow-[0_4px_12px_rgba(37,211,102,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 relative group h-14 ${!waLinksLoaded ? 'opacity-50 animate-pulse' : ''}`}>
                       <Squircle 
                         as={waLinkToUse ? "a" : "div"}
                         cornerRadius={20}
                         href={waLinkToUse || undefined}
                         target={waLinkToUse ? "_blank" : undefined} rel={waLinkToUse ? "noreferrer" : undefined}
                         className="w-full h-full bg-[#25D366] flex flex-row items-center justify-between px-3 text-white overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] transition-all"
                         title={`Entra nel gruppo WhatsApp di ${zone}`}
                       >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 ease-in-out" />
                      
                      <div className="flex items-center z-10 pl-1 gap-3">
                        <Squircle cornerRadius="full" className="bg-white text-[#25D366] flex items-center justify-center transition-all duration-300 w-8 h-8 text-lg">
                          <FaWhatsapp />
                        </Squircle>
                        <div className="flex flex-col">
                          <span className="font-extrabold leading-tight drop-shadow-sm text-[13px]">
                            {waTitle}
                          </span>
                          <span className="font-semibold text-[#E0F8E6] flex items-center overflow-hidden text-[11px] leading-tight opacity-100 h-auto">
                            <span className="w-1.5 h-1.5 bg-white rounded-full inline-block mr-1.5 animate-pulse shrink-0" />
                            {waSubtitle} 
                          </span>
                        </div>
                      </div>
                      
                      <Squircle cornerRadius={12} className="bg-white/20 font-bold backdrop-blur-md shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)] px-3 py-1.5 text-[11px]">
                        Entra
                      </Squircle>
                    </Squircle>
                   </div>
                   )}
                  </Squircle>
               </div>

               {/* EXPANDED ACTIONS */}
               {activeEvent && (
               <div className="w-full shrink-0 drop-shadow-md z-10 relative cursor-pointer" style={{ borderRadius: 24 }}>
                  <Squircle as="a" cornerRadius={24} href={activeEvent.url} target="_blank" rel="noreferrer" className="bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] flex items-center overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] border border-white/5 relative p-2.5 gap-3.5 w-full hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group">
                     {/* Ambient Glow */}
                     <div className="absolute inset-0 bg-gradient-to-br from-[#DC5F00]/[-0.05] to-transparent pointer-events-none" />
                     <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#DC5F00] rounded-full blur-[32px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
                     
                     <Squircle cornerRadius={20} className="shrink-0 bg-[#000000] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 w-[4.25rem] h-[4.25rem] text-[28px] group-hover:scale-105">
                        <div className="absolute inset-0 bg-cover bg-center opacity-70 mix-blend-luminosity brightness-110 group-hover:opacity-90 group-hover:scale-110 group-hover:mix-blend-normal transition-all duration-700 ease-out" style={{ backgroundImage: `url('${activeEvent.backgroundImage}')` }} />
                        <span className="relative z-10 drop-shadow-lg scale-110 transition-transform duration-500 group-hover:scale-125">{activeEvent.icon}</span>
                     </Squircle>
                     
                     <div className="flex flex-col min-w-0 flex-1 justify-center z-10">
                        <div className="flex items-center gap-1.5 mb-[2px]">
                          <Squircle as="span" cornerRadius={6} className="text-[8px] font-black text-[#DC5F00] uppercase tracking-[0.15em] bg-[#DC5F00]/15 px-1.5 py-0.5 border border-[#DC5F00]/20 shadow-[0_0_10px_rgba(220,95,0,0.2)]">Sponsor</Squircle>
                          <div className="flex items-center font-bold text-gray-400 text-[10px]">
                            <span className="text-[#DC5F00] mr-1 animate-pulse">●</span> {activeEvent.date}
                          </div>
                        </div>
                        <span className="font-extrabold text-white truncate leading-tight tracking-tight group-hover:text-[#DC5F00] transition-colors duration-300 text-[15px]">{activeEvent.title}</span>
                        <span className="font-medium text-gray-400 truncate leading-tight mt-0.5 group-hover:text-gray-300 transition-colors text-[12px] opacity-100 h-auto">{activeEvent.subtitle}</span>
                     </div>
                     
                     <div className="shrink-0 flex drop-shadow-[0_2px_8px_rgba(220,95,0,0.4)] group-hover:drop-shadow-[0_4px_16px_rgba(220,95,0,0.6)] transition-all duration-300 z-10">
                        <Squircle as="div" cornerRadius={16} className="bg-[#DC5F00] text-white flex items-center justify-center group-hover:bg-[#ff6e00] relative overflow-hidden group-active:scale-95 duration-200 w-[2.25rem] h-[2.25rem]">
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                          <ChevronRight className="relative z-10 translate-x-[1px] transition-all duration-300 w-5 h-5" />
                        </Squircle>
                     </div>
                  </Squircle>
               </div>
               )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <Squircle cornerRadius={16} className="bg-red-100 text-red-700 text-sm p-2 text-center font-bold relative z-10 w-full">
                ⚠️ {error}
              </Squircle>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN CONTEXT FORM */}
        <div className="flex flex-col flex-1 drop-shadow-sm relative w-full h-full min-h-0">
          <Squircle cornerRadius={32} className="bg-[#EAE0D0] p-4 flex flex-col gap-3 h-full">
             {mode === 'spotted' && (
                <div key="spotted" className="flex flex-col gap-3 h-full animate-in zoom-in-95 fade-in duration-300 relative z-10">
                   <Squircle cornerRadius={20} className="bg-[#F3ECE0] flex items-center overflow-hidden shrink-0 min-h-[3.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] py-2">
                      <div className="pl-4 pr-1 text-xl self-start pt-1" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>📍</div>
                      <TypewriterTextarea words={whereWords} prefix="Es: " className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-gray-500 placeholder:font-normal px-2 resize-none pt-[0.45rem]" rows={1} value={where} onChange={(e) => setWhere(e.target.value)} onFocus={() => handleInputFocus("where")} onBlur={() => handleInputBlur("where")} />
                   </Squircle>
                   <Squircle cornerRadius={20} className="bg-[#F3ECE0] flex items-center overflow-hidden shrink-0 min-h-[3.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] py-2">
                      <div className="pl-4 pr-1 text-xl self-start pt-1" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>🗓️</div>
                      <TypewriterTextarea words={whenWords} prefix="Es: " className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-gray-500 placeholder:font-normal px-2 resize-none pt-[0.45rem]" rows={1} value={when} onChange={(e) => setWhen(e.target.value)} onFocus={() => handleInputFocus("when")} onBlur={() => handleInputBlur("when")}/>
                   </Squircle>
                   <Squircle cornerRadius={24} className="bg-[#F3ECE0] flex overflow-hidden flex-1 focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] min-h-[4rem]">
                      <div className="pl-4 pr-1 text-xl self-start" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>🔍</div>
                      <TypewriterTextarea words={lookingForWordsSpotted} prefix="Es: " className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-gray-500 placeholder:font-normal resize-none px-2 pb-3 h-full" required value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} onFocus={() => handleInputFocus("lookingFor")} onBlur={() => handleInputBlur("lookingFor")} />
                   </Squircle>
                </div>
             )}
  
             {mode === 'sondaggio' && (
                <div key="sondaggio" className="flex flex-col gap-3 h-full animate-in zoom-in-95 fade-in duration-300 relative z-10">
                   <Squircle cornerRadius={24} className="bg-[#F3ECE0] flex overflow-hidden shrink-0 min-h-[4rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="pl-4 pr-1 text-xl self-start" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>📊</div>
                      <textarea className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-gray-500 placeholder:font-normal resize-none px-2 pr-4 pb-2 h-full" placeholder={isIt ? "Fai una domanda alla community... *" : "Ask a question to the community... *"} required value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} onFocus={() => handleInputFocus("lookingFor")} onBlur={() => handleInputBlur("lookingFor")} />
                   </Squircle>
                   <div className="flex flex-col gap-2.5 flex-1 min-h-0 justify-start overflow-y-auto pr-1 pb-1">
                      {options.map((opt, i) => (
                        <Squircle key={opt.id} cornerRadius={18} className="bg-[#F3ECE0] flex items-center overflow-hidden shrink-0 h-[3rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] group">
                         <div className="w-[3rem] text-center font-bold text-gray-400 text-[10px] flex flex-col justify-center items-center h-full border-r border-[#EAE0D0] bg-white/20 group-focus-within:bg-[#DC5F00]/10 group-focus-within:text-[#DC5F00] transition-colors">
                           OPZ<br/>{i+1}
                         </div>
                         <input 
                           className="bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-gray-500 placeholder:font-normal px-3" 
                           placeholder={i < 2 ? "Risposta obbligatoria *" : "Risposta opzionale"} value={opt.value} onChange={(e) => { const newOpts = [...options]; newOpts[i] = {...newOpts[i], value: e.target.value}; setOptions(newOpts); }}
                           onFocus={() => handleInputFocus(`option_${opt.id}`)} onBlur={() => handleInputBlur(`option_${opt.id}`)}
                         />
                      </Squircle>
                    ))}
                    {options.length < 4 && (
                      <Squircle as="button" cornerRadius="full" onClick={addOption} className="text-[#DC5F00] text-[13px] font-bold py-2 px-3 self-center hover:bg-[#F3ECE0] active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 mt-1">
                        <span className="text-[16px] leading-none pb-[1px]">+</span> Aggiungi opzione
                      </Squircle>
                    )}
                 </div>
              </div>
           )}
        </Squircle>
        </div>

        {/* FOOTER ACTION AREA */}
        <div className="flex gap-2.5 shrink-0 h-[3.5rem] relative z-10 w-full mb-1">
          <motion.div animate={{ x: igShake ? [-5, 5, -5, 5, 0] : 0 }} transition={{ duration: 0.4 }} className="flex-1 drop-shadow-sm min-w-0">
            <Squircle cornerRadius={24} className="bg-[#EAE0D0] flex items-center pl-1.5 pr-2 h-full w-full overflow-hidden focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-all group/ig relative">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#DC5F00]/0 to-[#DC5F00]/0 group-focus-within/ig:from-transparent group-focus-within/ig:via-[#DC5F00]/5 group-focus-within/ig:to-[#DC5F00]/10 transition-colors duration-500 pointer-events-none" />
               <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] w-[2.75rem] h-[2.75rem] shrink-0 relative z-10 transition-transform duration-300 group-focus-within/ig:scale-[1.02]">
                 <Squircle cornerRadius={20} className="w-full h-full bg-[#F3ECE0] flex items-center justify-center group-focus-within/ig:bg-white transition-colors duration-300">
                    <Instagram className="w-[18px] h-[18px] text-pink-600 group-focus-within/ig:scale-110 group-focus-within/ig:text-pink-500 transition-all duration-300" />
                 </Squircle>
               </div>
               <div className="flex items-center flex-1 h-full pl-2.5 relative z-10 min-w-0">
                 <span className={`text-[15px] font-bold transition-all duration-300 shrink-0 ${instagram ? 'text-[#DC5F00]' : 'text-gray-400 group-focus-within/ig:text-[#DC5F00]/60'}`}>@</span>
                 <input 
                   className="bg-transparent flex-1 h-full pl-0.5 pr-2 text-[14px] font-bold outline-none placeholder:text-gray-500 placeholder:font-normal min-w-0 text-[#2C2C2C] selection:bg-[#DC5F00]/20" 
                   placeholder={isIt ? "Il tuo username IG" : "Your IG username"}
                   value={instagram} 
                   onChange={e => handleIgChange(e.target.value)} 
                   onFocus={() => handleInputFocus("instagram")}
                   onBlur={() => handleInputBlur("instagram")}
                   spellCheck="false" 
                   autoComplete="off" 
                   autoCorrect="off" 
                   autoCapitalize="off" 
                 />
               </div>
            </Squircle>
          </motion.div>
          <div className="shrink-0 min-w-[7rem] drop-shadow-[0_4px_14px_rgba(220,95,0,0.35)] transition-all group">
            <Squircle 
               as="button"
               disabled={isSubmitting || cooldown > 0}
               cornerRadius={24}
               onClick={handleSubmit}
               className={`text-white px-7 font-bold flex items-center justify-center h-full w-full transition-colors ${
                 isSubmitting || cooldown > 0 ? "bg-[#d09165]" : "bg-[#DC5F00] hover:bg-[#c95300] active:scale-95"
               } ${!lookingFor || (mode === "sondaggio" && options.filter(o => o.value.trim()).length < 2) ? "opacity-70" : ""}`}
            >
              {isSubmitting ? "Invio..." : isSuccess ? "Inviato!" : cooldown > 0 ? `Attendi ${cooldown}s` : <>Invia <Send className="w-[18px] h-[18px] ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>}
            </Squircle>
          </div>
        </div>

      </div>
    </div>
  );
}
