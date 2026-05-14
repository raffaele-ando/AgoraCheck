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
  currentUrl.searchParams.set("mode", selectedMode);
  currentUrl.searchParams.set("city", selectedCity);
  currentUrl.searchParams.set("area", selectedArea);
  
  const generatedLink = currentUrl.toString();

  return (
    <div className="w-full flex md:flex-row flex-col gap-4 mb-6">
      <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
           <Link className="h-4 w-4 text-indigo-500" />
           <div>
             <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Link Generato Automaticamente</h3>
             <p className="text-xs text-indigo-700 dark:text-indigo-400">
               Si aggiorna da solo in base all'ultimo messaggio in arrivo non archiviato
             </p>
           </div>
        </div>
        <div className="flex flex-wrap gap-2">
           <select 
              value={selectedMode} 
              onChange={e => setSelectedMode(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg outline-none font-medium flex-1 sm:flex-none min-w-[100px]"
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
              className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg outline-none font-medium flex-1 sm:flex-none min-w-[100px]"
           >
             {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           
           <select 
              value={selectedArea} 
              onChange={e => setSelectedArea(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg outline-none font-medium flex-1 sm:flex-none min-w-[100px]"
           >
             {(LOCATIONS[selectedCity] || []).map(a => <option key={a} value={a}>{a}</option>)}
           </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button
                onClick={() => copyToClipboard(generatedLink, 'url')}
                className="flex items-center justify-between sm:justify-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-xs font-bold text-white flex-1"
            >
                <span className="truncate max-w-[200px]">{generatedLink}</span>
                {copiedUrl ? <Check className="w-4 h-4 text-green-300 shrink-0" /> : <Copy className="w-4 h-4 text-indigo-200 shrink-0" />}
            </button>
            <button
              onClick={() => copyToClipboard(config.tagline, 'label')}
              className="flex items-center justify-between sm:justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-bold text-gray-800 dark:text-gray-200 flex-1"
              title="Testo da incollare come Sticker Link"
            >
              <span className="truncate max-w-[150px]">{config.tagline || 'Label'}</span>
              {copiedLabel ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <Copy className="w-4 h-4 text-gray-400 shrink-0" />}
            </button>
        </div>
      </div>
    </div>
  );
};
