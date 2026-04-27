import { cn } from "../lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center select-none", className)}>
       <div className="w-56 h-20 md:w-64 md:h-24 flex items-center justify-center relative">
          {/* THE REAL PNG LOGO SPACE */}
          <img 
             src="/logo.png" 
             alt="Polimi Agorà Logo" 
             className="max-w-full max-h-full object-contain z-10 block" 
             onError={(e) => {
               // Fallback if logo.png is not uploaded yet
               e.currentTarget.style.display = 'none';
               e.currentTarget.nextElementSibling?.classList.remove('hidden');
               e.currentTarget.nextElementSibling?.classList.add('flex');
             }} 
          />
          {/* FALLBACK LOGO PREVIEW (Hidden by default, shown if logo.png fails) */}
          <div className="hidden absolute inset-0 flex-col items-center justify-center">
             <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#000000] leading-none text-center">
                POLIMI<br /><span className="text-[#DC5F00]">AGORÀ</span>
             </h1>
          </div>
       </div>
    </div>
  );
}
