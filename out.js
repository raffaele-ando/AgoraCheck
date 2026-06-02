"use strict";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MapPin, ChevronDown, Send, Instagram } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Squircle } from "./Squircle";
import { useSubmitSpotted } from "../pages/Home";
const MODES = [
  { id: "spotted", label: "Spotted", icon: "\u{1F4CD}", active: true },
  { id: "sondaggio", label: "Sondaggio", icon: "\u2728", active: true },
  { id: "eventi", label: "Eventi", icon: "\u{1F389}", active: false },
  { id: "appunti", label: "Appunti", icon: "\u{1F4D6}", active: false },
  { id: "mercatino", label: "Mercatino", icon: "\u{1F4E6}", active: false },
  { id: "gruppi", label: "Persone", icon: "\u{1F91D}", active: false }
];
const locations = {
  "Milano": ["Tutta la citt\xE0", "PoliMi", "UniMi", "Bocconi", "Cattolica", "IULM", "NABA", "Bicocca"],
  "Torino": ["Tutta la citt\xE0", "PoliTo", "UniTo"],
  "Genova": ["Tutta la citt\xE0", "UniGe"]
};
export function ThemeCorkboard() {
  const { submit, isSubmitting, isSuccess, error, cooldown } = useSubmitSpotted();
  const [mode, setMode] = useState("spotted");
  const [city, setCity] = useState("Milano");
  const [zone, setZone] = useState(locations["Milano"][0]);
  const [lookingFor, setLookingFor] = useState("");
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [instagram, setInstagram] = useState("");
  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    if (newMode === "sondaggio" && options.length < 2) setOptions(["", ""]);
  };
  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setCity(newCity);
    setZone(locations[newCity][0]);
  };
  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };
  const activeModes = MODES.filter((m) => m.active);
  const activeModeIndex = activeModes.findIndex((m) => m.id === mode);
  const handleSubmit = () => {
    submit({
      type: mode,
      city,
      area: zone,
      lookingFor,
      when,
      where,
      pollOptions: options,
      instagram
    }).then((ok) => {
      if (ok) {
        setLookingFor("");
        setWhen("");
        setWhere("");
        setInstagram("");
        if (mode === "sondaggio") setOptions(["", ""]);
      }
    });
  };
  return /* @__PURE__ */ jsx("div", { className: "h-[100dvh] w-full bg-[#F3ECE0] text-[#000000] flex justify-center items-center font-sans selection:bg-[#DC5F00] selection:text-white pb-safe overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col p-2.5 gap-2.5 relative w-full h-full max-w-md mx-auto", children: [
    /* @__PURE__ */ jsx("div", { className: "flex justify-center shrink-0 pt-1 pb-1", children: /* @__PURE__ */ jsx("img", { src: "https://raw.githubusercontent.com/raffaele-ando/Logo-vari/refs/heads/main/logo%205.png", alt: "App Logo", className: "h-[2.5rem] object-contain drop-shadow-md" }) }),
    /* @__PURE__ */ jsx("div", { className: "flex shrink-0 drop-shadow-sm relative w-full h-14 z-10", children: /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 24, className: "flex bg-[#EAE0D0] p-1.5 relative w-full h-full", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "absolute top-1.5 bottom-1.5 drop-shadow-md transition-all duration-300 ease-out",
          style: {
            width: `calc(${100 / activeModes.length}% - ${12 / activeModes.length}px)`,
            left: `calc(6px + ${activeModeIndex * (100 / activeModes.length)}% - ${activeModeIndex * (12 / activeModes.length)}px)`
          },
          children: /* @__PURE__ */ jsx(Squircle, { cornerRadius: 18, className: "w-full h-full bg-[#DC5F00]" })
        }
      ),
      activeModes.map((m) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => handleModeSwitch(m.id),
          className: `flex-1 flex items-center justify-center gap-2 h-full text-[15px] font-bold z-10 transition-colors ${mode === m.id ? "text-white" : "text-gray-500 hover:text-black"}`,
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-[22px]", style: { filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }, children: m.icon }),
            " ",
            m.label
          ]
        },
        m.id
      ))
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "shrink-0 drop-shadow-sm relative z-10", children: /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 32, className: "bg-[#EAE0D0] p-3 flex flex-col gap-2.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex w-full gap-2.5 min-w-0 h-[3.25rem]", children: [
        /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 20, className: "relative flex-1 bg-[#F3ECE0] flex items-center h-full min-w-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow", children: [
          /* @__PURE__ */ jsx(MapPin, { className: "w-4 h-4 text-[#DC5F00] absolute left-3 pointer-events-none" }),
          /* @__PURE__ */ jsx(
            "select",
            {
              value: city,
              onChange: handleCityChange,
              className: "w-full h-full bg-transparent pl-9 pr-8 text-[13px] font-bold appearance-none outline-none truncate cursor-pointer focus:outline-none",
              children: Object.keys(locations).map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
            }
          ),
          /* @__PURE__ */ jsx(ChevronDown, { className: "w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" })
        ] }),
        /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 20, className: "relative flex-[1.2] bg-[#F3ECE0] flex items-center h-full min-w-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow", children: [
          /* @__PURE__ */ jsx(
            "select",
            {
              value: zone,
              onChange: (e) => setZone(e.target.value),
              className: "w-full h-full bg-transparent pl-4 pr-8 text-[13px] font-bold appearance-none outline-none truncate cursor-pointer text-[#DC5F00] focus:outline-none",
              children: locations[city].map((z) => /* @__PURE__ */ jsx("option", { value: z, children: z }, z))
            }
          ),
          /* @__PURE__ */ jsx(ChevronDown, { className: "w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "w-full h-14 drop-shadow-[0_4px_12px_rgba(37,211,102,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-transform relative group", children: /* @__PURE__ */ jsxs(
        Squircle,
        {
          as: "a",
          cornerRadius: 20,
          href: `https://wa.me/?text=Voglio+entrare+nel+gruppo+di+${encodeURIComponent(zone)}`,
          target: "_blank",
          rel: "noreferrer",
          className: "w-full h-full bg-[#25D366] flex flex-row items-center justify-between px-3 text-white overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]",
          title: `Entra nel gruppo WhatsApp di ${zone}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 ease-in-out" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 z-10 pl-1", children: [
              /* @__PURE__ */ jsx("div", { className: "w-8 h-8 bg-white text-[#25D366] rounded-full flex items-center justify-center text-lg shadow-sm", children: /* @__PURE__ */ jsx(FaWhatsapp, {}) }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsxs("span", { className: "font-extrabold text-[13px] leading-tight drop-shadow-sm", children: [
                  "Gruppo ",
                  zone
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "font-semibold text-[10px] text-[#E0F8E6] leading-tight flex items-center", children: [
                  /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 bg-white rounded-full inline-block mr-1.5 animate-pulse" }),
                  "+1.2k studenti si scambiano info"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(Squircle, { cornerRadius: 12, className: "bg-white/20 px-3 py-1.5 text-[11px] font-bold backdrop-blur-md shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]", children: "Entra" })
          ]
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "shrink-0 drop-shadow-lg relative group hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer", children: /* @__PURE__ */ jsxs(Squircle, { as: "a", cornerRadius: 24, href: "#", className: "bg-gradient-to-tr from-[#1A1A1A] to-[#2C2C2C] p-2 flex items-center gap-3 overflow-hidden border border-white/5", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -right-8 -top-8 w-24 h-24 bg-[#DC5F00] rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" }),
      /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 20, className: "w-[3.5rem] h-[3.5rem] shrink-0 bg-[#000000] flex items-center justify-center text-[28px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] border border-white/10 relative overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80')] bg-cover bg-center opacity-60 mix-blend-luminosity" }),
        /* @__PURE__ */ jsx("span", { className: "relative z-10 drop-shadow-md", children: "\u{1FAA9}" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col min-w-0 flex-1 justify-center py-0.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mb-0.5", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black text-[#DC5F00] uppercase tracking-wider bg-[#DC5F00]/10 px-1.5 py-0.5 rounded-sm", children: "Sponsor" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-gray-400", children: "Mar 17 Giu" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[15px] font-extrabold text-white truncate leading-tight tracking-tight", children: "Fluo Party @ Magazzini" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "shrink-0 mr-1 shadow-[0_2px_8px_rgba(220,95,0,0.4)] rounded-2xl group-hover:shadow-[0_2px_12px_rgba(220,95,0,0.6)] transition-shadow", children: /* @__PURE__ */ jsx(Squircle, { cornerRadius: 14, className: "bg-[#DC5F00] text-white text-[12px] font-bold px-3.5 py-2 group-hover:bg-[#ff6e00] transition-colors", children: "Scopri" }) })
    ] }) }),
    error && /* @__PURE__ */ jsxs("div", { className: "bg-red-100 text-red-700 text-sm p-2 rounded-xl text-center font-bold relative z-10", children: [
      "\u26A0\uFE0F ",
      error
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col flex-1 drop-shadow-sm relative transition-all duration-300", children: /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 32, className: "bg-[#EAE0D0] p-4 flex flex-col gap-3 h-full", children: [
      mode === "spotted" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 h-full animate-in zoom-in-95 fade-in duration-300 relative z-10", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 mb-1 shrink-0", children: /* @__PURE__ */ jsx("h2", { className: "font-bold text-xl tracking-tight", children: "Nuovo Spotted" }) }),
        /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 20, className: "bg-[#F3ECE0] flex items-center overflow-hidden shrink-0 h-[3.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]", children: [
          /* @__PURE__ */ jsx("div", { className: "pl-4 pr-1 text-xl", style: { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }, children: "\u{1F4CD}" }),
          /* @__PURE__ */ jsx("input", { className: "bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-gray-500 placeholder:font-normal px-2", placeholder: "Dove? (es. Aule Nord) [Opzionale]", value: where, onChange: (e) => setWhere(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 20, className: "bg-[#F3ECE0] flex items-center overflow-hidden shrink-0 h-[3.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]", children: [
          /* @__PURE__ */ jsx("div", { className: "pl-4 pr-1 text-xl", style: { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }, children: "\u{1F552}" }),
          /* @__PURE__ */ jsx("input", { className: "bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-gray-500 placeholder:font-normal px-2", placeholder: "Quando? (es. Ieri alle 14:30) [Opzionale]", value: when, onChange: (e) => setWhen(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 24, className: "bg-[#F3ECE0] flex overflow-hidden flex-1 focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] min-h-[4rem]", children: [
          /* @__PURE__ */ jsx("div", { className: "pl-4 pr-1 text-xl", style: { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }, children: "\u{1F464}" }),
          /* @__PURE__ */ jsx("textarea", { className: "bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-gray-500 placeholder:font-normal resize-none px-2 pb-3", placeholder: "Chi/Cosa cerchi? Descrivi la persona o l'oggetto smarrito... *", required: true, value: lookingFor, onChange: (e) => setLookingFor(e.target.value) })
        ] })
      ] }, "spotted"),
      mode === "sondaggio" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 h-full animate-in zoom-in-95 fade-in duration-300 relative z-10", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 shrink-0", children: /* @__PURE__ */ jsx("h2", { className: "font-bold text-xl tracking-tight", children: "Crea Sondaggio" }) }),
        /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 24, className: "bg-[#F3ECE0] flex overflow-hidden shrink-0 h-20 focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]", children: [
          /* @__PURE__ */ jsx("div", { className: "pl-4 pr-1 text-xl", style: { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }, children: "\u2728" }),
          /* @__PURE__ */ jsx("textarea", { className: "bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-gray-500 placeholder:font-normal resize-none px-2 pr-4 pb-2", placeholder: "Fai una domanda alla community... *", required: true, value: lookingFor, onChange: (e) => setLookingFor(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2.5 flex-1 min-h-0 justify-start overflow-y-auto pr-1 pb-1", children: [
          options.map((opt, i) => /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 18, className: "bg-[#F3ECE0] flex items-center overflow-hidden shrink-0 h-[3rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] group", children: [
            /* @__PURE__ */ jsxs("div", { className: "w-[3rem] text-center font-bold text-gray-400 text-[10px] flex flex-col justify-center items-center h-full border-r border-[#EAE0D0] bg-white/20 group-focus-within:bg-[#DC5F00]/10 group-focus-within:text-[#DC5F00] transition-colors", children: [
              "OPZ",
              /* @__PURE__ */ jsx("br", {}),
              i + 1
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-gray-500 placeholder:font-normal px-3",
                placeholder: i < 2 ? "Risposta obbligatoria *" : "Risposta opzionale",
                value: opt,
                onChange: (e) => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }
              }
            )
          ] }, i)),
          options.length < 4 && /* @__PURE__ */ jsxs("button", { onClick: addOption, className: "text-[#DC5F00] text-[13px] font-bold py-2 px-3 self-center rounded-full hover:bg-[#F3ECE0] active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 mt-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[16px] leading-none pb-[1px]", children: "+" }),
            " Aggiungi opzione"
          ] })
        ] })
      ] }, "sondaggio")
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2.5 shrink-0 h-[3.5rem] relative z-10 w-full mb-1", children: [
      /* @__PURE__ */ jsx("div", { className: "flex-1 drop-shadow-sm min-w-0", children: /* @__PURE__ */ jsxs(Squircle, { cornerRadius: 24, className: "bg-[#EAE0D0] flex items-center pl-1.5 h-full w-full overflow-hidden focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00]", children: [
        /* @__PURE__ */ jsx("div", { className: "drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] w-[2.75rem] h-[2.75rem] shrink-0", children: /* @__PURE__ */ jsx(Squircle, { cornerRadius: 20, className: "w-full h-full bg-[#F3ECE0] flex items-center justify-center", children: /* @__PURE__ */ jsx(Instagram, { className: "w-[20px] h-[20px] text-pink-600" }) }) }),
        /* @__PURE__ */ jsx("input", { className: "bg-transparent flex-1 h-full pl-3 pr-4 text-[14px] font-bold outline-none placeholder:text-gray-500 placeholder:font-normal min-w-0", placeholder: "Il tuo IG (opzionale)", value: instagram, onChange: (e) => setInstagram(e.target.value) })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "shrink-0 min-w-[7rem] drop-shadow-[0_4px_14px_rgba(220,95,0,0.35)] hover:bg-[#c95300] active:scale-95 transition-all group", children: /* @__PURE__ */ jsx(
        Squircle,
        {
          as: "button",
          disabled: !lookingFor || isSubmitting || cooldown > 0,
          cornerRadius: 24,
          onClick: handleSubmit,
          className: "bg-[#DC5F00] disabled:bg-[#d09165] text-white px-7 font-bold flex items-center justify-center h-full w-full",
          children: isSubmitting ? "Invio..." : isSuccess ? "Inviato!" : cooldown > 0 ? `Attendi ${cooldown}s` : /* @__PURE__ */ jsxs(Fragment, { children: [
            "Invia ",
            /* @__PURE__ */ jsx(Send, { className: "w-[18px] h-[18px] ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" })
          ] })
        }
      ) })
    ] })
  ] }) });
}
