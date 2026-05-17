import React, { useState, useEffect } from "react";
import { loadWhatsappLinksFromDB } from "./AppSettings";
import { motion } from "motion/react";

interface WhatsappWidgetProps {
  city: string;
  area: string;
}

export function WhatsappWidget({ city, area }: WhatsappWidgetProps) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWhatsappLinksFromDB().then((data) => {
      setLinks(data);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  // Risolutore del link in ordine di priorità: area, poi city, poi default.
  let linkToUse = "";
  let matchedName = "";

  if (links[area]) {
    linkToUse = links[area];
    matchedName = area;
  } else if (links[city]) {
    linkToUse = links[city];
    matchedName = city;
  } else if (links["default"]) {
    linkToUse = links["default"];
    matchedName = "";
  }

  if (!linkToUse) return null;

  const titleText = links["_title"] || "Unisciti alla nostra Community";
  let subtitleText = links["_subtitle"] || "Entra nel Gruppo WhatsApp {zona}";
  
  if (subtitleText.includes("{zona}")) {
    if (matchedName) {
      subtitleText = subtitleText.replace("{zona}", `di ${matchedName}`);
    } else {
      subtitleText = subtitleText.replace("{zona}", "").trim();
    }
  }

  return (
    <motion.a
      href={linkToUse}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden shrink-0 bg-gradient-to-r from-[#25D366] to-[#1DA851] text-white my-2 sm:my-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl shadow-lg border border-[#34e275]/50 flex flex-row items-center justify-start gap-3 sm:gap-4 w-[92%] sm:w-full max-w-md mx-auto z-10 group"
      style={{
        boxShadow: "0 8px 32px rgba(37, 211, 102, 0.4)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Background highlight that fades in on hover */}
      <motion.div 
        className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"
      />
      
      {/* Icon with a subtle repeating ping effect behind it */}
      <div className="relative shrink-0">
        <div className="absolute inset-0 bg-white rounded-full opacity-40 animate-ping" style={{ animationDuration: '2.5s' }}></div>
        <div className="relative bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/30 shadow-sm flex items-center justify-center">
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-md"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
          </svg>
        </div>
      </div>
      
      <div className="flex flex-col justify-center text-left relative z-10 min-w-0 flex-1">
        <span className="font-extrabold text-[14px] sm:text-[15px] uppercase tracking-wide drop-shadow-sm leading-tight line-clamp-2">
          {titleText}
        </span>
        <span className="text-[11px] sm:text-[12px] font-medium text-white/95 drop-shadow-sm leading-tight mt-0.5 line-clamp-2">
          {subtitleText}
        </span>
      </div>

      {/* Shine effect that runs continually */}
      <motion.div 
        className="absolute top-0 -left-[100%] h-full w-[50%] z-5 block transform -skew-x-[30deg] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
        animate={{ x: ['-200%', '350%'] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 2 }}
      />
    </motion.a>
  );
}

