import { useState } from "react";
import { cn } from "../lib/utils";

export function Logo({ className }: { className?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn("flex flex-col items-center justify-center select-none", className)}>
       <div className="w-56 h-20 md:w-64 md:h-24 flex items-center justify-center relative">
          {/* THE REAL PNG LOGO SPACE */}
          {!imgFailed && (
            <img 
               src="/logo.png" 
               alt="Polimi Agorà Logo" 
               className="max-w-full max-h-full object-contain z-10 block" 
               onError={() => setImgFailed(true)} 
            />
          )}
          {/* FALLBACK LOGO PREVIEW (Hidden by default, shown if logo.png fails) */}
          {imgFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#000000] leading-none text-center">
                  POLIMI<br /><span className="text-[#DC5F00]">AGORÀ</span>
               </h1>
            </div>
          )}
       </div>
    </div>
  );
}
