import { useState } from "react";
import { cn } from "../lib/utils";

export function Logo({ className }: { className?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  // If className already provides dimensions, we fill them. Otherwise, default.
  const hasSizing =
    className && (className.includes("w-") || className.includes("h-"));

  return (
    <div
      className={cn("flex items-center justify-center select-none", className)}
    >
      <div
        className={cn(
          "flex items-center justify-center relative",
          hasSizing ? "w-full h-full" : "w-56 h-20 md:w-64 md:h-24",
        )}
      >
        {/* THE REAL PNG LOGO SPACE */}
        {!imgFailed && (
          <img
            src="https://github.com/raffaele-ando/Logo-vari/blob/main/logo.png?raw=true"
            alt="Polimi Agorà Logo"
            className="w-full h-full object-contain z-10 block invert-in-dark"
            onError={() => setImgFailed(true)}
          />
        )}
        {/* FALLBACK LOGO PREVIEW (Hidden by default, shown if image fails) */}
        {imgFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[#000000] leading-none text-center">
              POLIMI
              <br />
              <span className="text-[#DC5F00]">AGORÀ</span>
            </h1>
          </div>
        )}
      </div>
    </div>
  );
}
