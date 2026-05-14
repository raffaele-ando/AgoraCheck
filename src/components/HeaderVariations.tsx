import React, { useState, useRef, useEffect } from "react";

export const LOCATIONS: Record<string, string[]> = {
  "MILANO": ["MILANO", "POLIMI", "HUNIMED", "BOCCONI", "UNIMI", "BICOCCA", "IULM", "UNISR", "CATTOLICA"],
  "TORINO": ["TORINO", "UNITO", "POLITO"],
  "GENOVA": ["GENOVA", "UNIGE"]
};

export const CITIES = Object.keys(LOCATIONS);

interface Props {
  city: string;
  setCity: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  type: "spotted" | "sondaggio";
  setType: (v: "spotted" | "sondaggio") => void;
  hasInteracted?: boolean;
}

function WheelPicker({ 
  options, 
  value, 
  onChange,
  itemHeight = 36,
  visibleItems = 3,
  className = "",
  itemClassName = "",
  loop = false,
  renderItem
}: {
  options: string[],
  value: string,
  onChange: (val: string) => void,
  itemHeight?: number,
  visibleItems?: number,
  className?: string,
  itemClassName?: string,
  loop?: boolean,
  renderItem?: (opt: string, isActive: boolean) => React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const displayOptions = React.useMemo(() => loop ? Array(100).fill(options).flat() : options, [loop, options]);

  const getInitIndex = () => {
    const baseIdx = options.indexOf(value);
    if (baseIdx === -1) return 0;
    if (loop) {
      return Math.floor(100 / 2) * options.length + baseIdx;
    }
    return baseIdx;
  };

  const [activeIndex, setActiveIndex] = useState(getInitIndex);

  // Initial scroll position alignment
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = activeIndex * itemHeight;
    }
  }, []); // Run only once on mount to set initial position without smooth scroll

  // Sync external value changes (only if we aren't currently scrolling)
  useEffect(() => {
    const baseIdx = options.indexOf(value);
    if (!isScrollingRef.current && baseIdx !== -1) {
      let nextIdx;
      if (loop) {
         const rem = activeIndex % options.length;
         let diff = baseIdx - rem;
         // Find shortest path in a circular array
         if (diff > options.length / 2) diff -= options.length;
         else if (diff < -options.length / 2) diff += options.length;
         nextIdx = activeIndex + diff;
      } else {
         nextIdx = baseIdx;
      }
      
      if (nextIdx !== activeIndex) {
        setActiveIndex(nextIdx);
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: nextIdx * itemHeight, behavior: 'smooth' });
        }
      }
    }
  }, [value, options, itemHeight, activeIndex, loop]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrollingRef.current = true;
    const scrollY = e.currentTarget.scrollTop;
    const index = Math.round(scrollY / itemHeight);
    
    if (index !== activeIndex && displayOptions[index]) {
      setActiveIndex(index);
      if (displayOptions[index] !== value) {
        onChange(displayOptions[index]);
      }
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (displayOptions[index] && displayOptions[index] !== value) {
        // Redundant but safe
        onChange(displayOptions[index]);
      }
    }, 50);
  };

  const height = itemHeight * visibleItems;

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      style={{ 
        height,
        maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        perspective: '800px'
      }}
    >
      {/* iOS Style Selection Lines */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 border-y-[1.5px] border-current opacity-20 pointer-events-none z-20" style={{ height: itemHeight }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md pointer-events-none z-0 bg-current opacity-[0.03] w-[95%]" style={{ height: itemHeight }} />

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={() => { isScrollingRef.current = true; }}
        className="h-full w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory flex flex-col items-center relative z-10"
        style={{ overscrollBehaviorY: 'none', overscrollBehaviorX: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none', transformStyle: 'preserve-3d', touchAction: 'pan-y' }}
      >
        <style dangerouslySetInnerHTML={{__html: `div::-webkit-scrollbar { display: none; }`}} />
        <div className="shrink-0 w-full pointer-events-none" style={{ height: itemHeight * Math.floor(visibleItems / 2) }} />
        {displayOptions.map((opt, idx) => {
          const isActive = idx === activeIndex;
          const distance = idx - activeIndex;
          
          // Render only nearby items for better performance, ignore others
          if (Math.abs(distance) > visibleItems) return <div key={idx} className="shrink-0 w-full snap-center pointer-events-none" style={{ height: itemHeight }} />;

          const rotateX = distance * -25;
          const translateZ = Math.abs(distance) * -15;
          const scale = isActive ? 1.05 : 0.95 - (Math.abs(distance) * 0.05);

          return (
            <div 
              // Changed key from opt to idx to support duplicate options in loop
              key={idx}
              className={`shrink-0 flex items-center justify-center snap-center snap-always w-full transition-all duration-150 cursor-pointer px-2 ${itemClassName} ${isActive ? 'opacity-100 font-bold' : 'opacity-30'}`}
              style={{ 
                height: itemHeight,
                transform: `rotateX(${rotateX}deg) translateZ(${translateZ}px) scale(${scale})`,
                transformOrigin: '50% 50% -20px'
              }}
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
                }
              }}
            >
              {renderItem ? renderItem(opt, isActive) : <span className="truncate w-full text-center">{opt}</span>}
            </div>
          );
        })}
        <div className="shrink-0 w-full pointer-events-none" style={{ height: itemHeight * Math.floor(visibleItems / 2) }} />
      </div>
    </div>
  );
}

export function HeaderVariations({ city, setCity, area, setArea, type, setType, hasInteracted = false }: Props) {
  const [isHovered10, setIsHovered10] = useState(false);
  const [forceRetract, setForceRetract] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsHovered10(false);
        setForceRetract(true);
      }
    };
    const handleScroll = () => {
      setIsHovered10(false);
      setForceRetract(true);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const shouldRetract = (hasInteracted || forceRetract) && !isHovered10;

  const currentAreas = LOCATIONS[city] || LOCATIONS[CITIES[0]];

   return (
    <div 
       ref={containerRef}
       className={`fixed bottom-safe mb-4 sm:mb-0 sm:absolute sm:top-1/4 sm:bottom-auto right-0 z-[60] flex flex-col items-end gap-3 sm:gap-4 pointer-events-none scale-[0.85] sm:scale-100 origin-bottom-right sm:origin-right`}
       onMouseEnter={() => { setIsHovered10(true); setForceRetract(false); }}
       onMouseLeave={() => setIsHovered10(false)}
       onTouchStart={() => { setIsHovered10(true); setForceRetract(false); }}
    >
           {/* Right hung tabs */}
           <div className={`w-[140px] sm:w-[150px] bg-[#E8DEC8] text-black pr-4 pl-3 py-4 rounded-l-2xl shadow-xl border border-r-0 border-black/20 origin-right transform transition-all duration-500 ease-out pointer-events-auto flex flex-col relative ${shouldRetract ? 'translate-x-[60%] rotate-3 cursor-pointer shadow-md' : 'translate-x-0 rotate-2 hover:rotate-0'}`}>
              <div className={`transition-opacity duration-300 w-full flex flex-col items-end ${shouldRetract ? 'opacity-40' : 'opacity-100'}`}>
                 <div className="font-mono text-[10px] uppercase opacity-60 mb-2 border-b border-black/10 pb-1 font-bold tracking-wider w-full text-right overflow-hidden text-ellipsis whitespace-nowrap">Mode</div>
                 <WheelPicker 
                   className="w-full"
                   options={["spotted", "sondaggio"]}
                   value={type}
                   onChange={(v) => setType(v as any)}
                   itemHeight={26}
                   visibleItems={3}
                   itemClassName="text-[10px] sm:text-[11px] tracking-tight uppercase font-bold"
                 />
              </div>
           </div>
           
           <div className={`w-[140px] sm:w-[150px] bg-[#111111] text-[#E8DEC8] pr-4 pl-3 py-4 rounded-l-2xl shadow-xl border border-r-0 border-black/20 origin-right transform transition-all duration-500 ease-out pointer-events-auto flex flex-col relative ${shouldRetract ? 'translate-x-[60%] rotate-0 cursor-pointer shadow-md' : 'translate-x-0 rotate-1 hover:rotate-0'}`}>
              <div className={`transition-opacity duration-300 w-full flex flex-col items-end ${shouldRetract ? 'opacity-40' : 'opacity-100'}`}>
                 <div className="font-mono text-[10px] uppercase opacity-80 mb-2 border-b border-white/10 pb-1 font-bold tracking-wider w-full text-right text-[#DC5F00] overflow-hidden text-ellipsis whitespace-nowrap">Città</div>
                 <WheelPicker 
                   className="w-full"
                   options={CITIES}
                   value={city}
                   onChange={(v) => { 
                     setCity(v); 
                     if (LOCATIONS[v] && !LOCATIONS[v].includes(area)) {
                       setArea(LOCATIONS[v][0]);
                     }
                   }}
                   itemHeight={26}
                   visibleItems={3}
                   itemClassName="text-[10px] sm:text-[11px] uppercase font-bold"
                   loop={true}
                 />
              </div>
           </div>

           <div className={`w-[140px] sm:w-[150px] bg-[#DC5F00] text-white pr-4 pl-3 py-4 rounded-l-2xl shadow-xl border border-r-0 border-black/20 origin-right transform transition-all duration-500 ease-out pointer-events-auto flex flex-col relative ${shouldRetract ? 'translate-x-[60%] -rotate-3 cursor-pointer shadow-md' : 'translate-x-0 -rotate-1 hover:rotate-0'}`}>
              <div className={`transition-opacity duration-300 w-full flex flex-col items-end ${shouldRetract ? 'opacity-40' : 'opacity-100'}`}>
                 <div className="font-mono text-[10px] uppercase opacity-80 mb-2 border-b border-white/10 pb-1 font-bold tracking-wider w-full text-right text-black overflow-hidden text-ellipsis whitespace-nowrap">Ateneo / Zona</div>
                 <WheelPicker 
                   key={city}
                   className="w-full w-full"
                   options={currentAreas}
                   value={currentAreas.includes(area) ? area : currentAreas[0]}
                   onChange={(v) => setArea(v)}
                   itemHeight={26}
                   visibleItems={3}
                   itemClassName="text-[9px] sm:text-[10px] tracking-tight uppercase font-bold"
                   renderItem={(opt, isActive) => {
                     const isCity = CITIES.includes(opt);
                     return (
                       <span className={`flex items-center justify-center w-full truncate ${isCity ? 'bg-black/90 text-[#DC5F00] px-2 py-1 rounded-lg border-2 border-[#DC5F00] shadow-[0_0_8px_rgba(220,95,0,0.5)] tracking-widest text-[8px] sm:text-[9px]' : ''}`}>
                         {isCity ? `🔸 ${opt} (TUTTA) 🔸` : opt}
                       </span>
                     );
                   }}
                 />
              </div>
           </div>
        </div>
  );
}
