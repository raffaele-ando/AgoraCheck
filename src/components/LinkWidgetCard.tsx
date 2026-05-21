import React, { useState, useEffect } from "react";
import { Copy, Check, Link } from "lucide-react";
import { LinkWidgetConfig, loadLinkConfigFromDB, DEFAULT_LINK_CONFIG } from "./AppSettings";
import { LOCATIONS, CITIES } from "./HeaderVariations";

export const LinkWidgetCard = ({ latestMessage }: { latestMessage?: any }) => {
  const [config, setConfig] = useState<LinkWidgetConfig>(DEFAULT_LINK_CONFIG);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  const [selectedCity, setSelectedCity] = useState(CITIES[0] || "MILANO");
  const [selectedArea, setSelectedArea] = useState(LOCATIONS[CITIES[0]]?.[0] || "MILANO");
  const [selectedMode, setSelectedMode] = useState("spotted");

  useEffect(() => {
    loadLinkConfigFromDB().then((data) => {
      if (data) setConfig(data);
    });
  }, []);

  useEffect(() => {
    if (latestMessage) {
      if (latestMessage.type) setSelectedMode(latestMessage.type);
      if (latestMessage.city) {
         setSelectedCity(latestMessage.city);
         if (latestMessage.area) {
             setSelectedArea(latestMessage.area);
         } else {
             setSelectedArea(LOCATIONS[latestMessage.city]?.[0] || latestMessage.city);
         }
      } else if (latestMessage.area) {
         // Fallback if city is missing in db but area is present
         for (const [city, areas] of Object.entries(LOCATIONS)) {
           if (areas.includes(latestMessage.area.toUpperCase())) {
             setSelectedCity(city);
             setSelectedArea(latestMessage.area.toUpperCase());
             break;
           }
         }
      }
    }
  }, [latestMessage?.id, latestMessage?.type, latestMessage?.city, latestMessage?.area]);

  const copyToClipboard = (text: string, type: 'domain' | 'label' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'domain') {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } else if (type === 'label') {
      setCopiedLabel(true);
      setTimeout(() => setCopiedLabel(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const currentUrl = new URL("https://agora.theproject.world");
  const areaSlug = selectedArea.toLowerCase().replace(/\s+/g, '-');
  const citySlug = selectedCity.toLowerCase().replace(/\s+/g, '-');
  currentUrl.pathname = `/${citySlug}/${areaSlug}${selectedMode === "sondaggio" ? "/sondaggio" : ""}`;
  
  const generatedLink = currentUrl.toString();

  return (
    <div className="flex-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-3">
         <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
           <Link className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
         </div>
         <div className="flex flex-col">
           <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Widget Link Automatico</h3>
           <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold mt-0.5">
             Invia link precompilato
           </p>
         </div>
      </div>
      </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-auto">
           <select 
              value={selectedMode} 
              onChange={e => setSelectedMode(e.target.value)}
              className="px-2 py-1.5 text-[10px] sm:text-xs uppercase font-bold bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg outline-none flex-1 sm:flex-none text-gray-700 dark:text-gray-300 min-w-[80px] transition-colors"
           >
             <option value="spotted">Spotted</option>
             <option value="sondaggio">Sondaggio</option>
           </select>
           
           <select 
              value={selectedCity} 
              onChange={e => {
                const newCity = e.target.value;
                setSelectedCity(newCity);
                if (LOCATIONS[newCity] && !LOCATIONS[newCity].includes(selectedArea)) {
                   setSelectedArea(LOCATIONS[newCity][0]);
                }
              }}
              className="px-2 py-1.5 text-[10px] sm:text-xs uppercase font-bold bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg outline-none flex-1 sm:flex-none text-gray-700 dark:text-gray-300 min-w-[80px] transition-colors"
           >
             {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           
           <select 
              value={selectedArea} 
              onChange={e => setSelectedArea(e.target.value)}
              className="px-2 py-1.5 text-[10px] sm:text-xs uppercase font-bold bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg outline-none flex-1 sm:flex-none text-gray-700 dark:text-gray-300 min-w-[80px] transition-colors"
           >
             {(LOCATIONS[selectedCity] || []).map(a => <option key={a} value={a}>{a}</option>)}
           </select>
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={() => copyToClipboard(generatedLink, 'url')}
                className={`flex items-center justify-center gap-2 px-3 py-2 flex-grow sm:flex-grow-0 rounded-xl transition-all text-xs font-bold border ${copiedUrl ? "bg-green-500 border-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 border-transparent text-white"}`}
                title={generatedLink}
            >
                <span className="truncate max-w-[150px]">{generatedLink}</span>
                {copiedUrl ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0 text-indigo-200" />}
            </button>
            
            <button
              onClick={() => copyToClipboard(config.tagline, 'label')}
              className={`flex items-center justify-center gap-2 px-3 py-2 flex-grow sm:flex-grow-0 rounded-xl transition-all text-xs font-bold border ${copiedLabel ? "bg-green-500 border-green-500 text-white" : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"}`}
              title="Copia Sticker Label"
            >
              <span className="truncate max-w-[120px]">"{config.tagline || 'Label'}"</span>
              {copiedLabel ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0 text-gray-400" />}
            </button>
        </div>
    </div>
  );
};
