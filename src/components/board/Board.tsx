import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown, Send, Instagram, ChevronRight, Moon, Sun } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Squircle } from '../ui/Squircle';
import { Portal } from '../ui/Portal';

import { useSubmitSpotted } from '../../pages/Home';
import { useVisitAnalytics } from '../../hooks/useVisitAnalytics';
import { loadWhatsappLinksFromDB, loadEventWidgetConfigFromDB, EventWidgetConfig, DEFAULT_EVENT_WIDGET_CONFIG } from '../../data/settings';

/** Agorà Orbite, servito dallo stesso dominio sotto /orbite/. */
const ORBITE_URL = `${import.meta.env.BASE_URL}orbite/`;
/** L'indirizzo esatto verso cui si naviga: il contrassegno fa parte della chiave. */
const ORBITE_NEXT = `${ORBITE_URL}?p=1`;

/**
 * Prepara Orbite prima che serva.
 *
 * Si dichiara al browser che quella pagina verrà aperta: se sa farlo la
 * costruisce per intero in un secondo piano invisibile — scarica, interpreta,
 * dispone la scena, carica le immagini — e al momento della navigazione la
 * mostra e basta, senza rete di mezzo. È il motivo per cui certi passaggi
 * sembrano istantanei sui siti fatti bene: la pagina era già pronta.
 *
 * Chi non conosce le regole di speculazione (Firefox, Safari) le ignora e
 * ricade sul semplice prefetch del documento, che è comunque un vantaggio.
 * Si esegue una volta sola per pagina.
 */
let warmed = false;
function warmOrbite() {
  if (warmed || typeof document === "undefined") return;
  warmed = true;
  // Il prefetch si fa SEMPRE, anche dove esiste il prerender.
  //
  // Il prerender è la cosa migliore ma non è garantita: il browser può
  // rifiutarlo — risparmio dati attivo, memoria scarsa, troppe pagine già in
  // preparazione — e quando lo rifiuta non lo dice. Dipendere solo da quello
  // significherebbe che su quei telefoni il vantaggio non c'è e il difetto
  // torna identico.
  //
  // Sono pochi kB e sono il minimo per DISEGNARE Orbite: il documento (che si
  // porta dentro stile e apertura) e il motore che dispone la scena, senza il
  // quale la porta si aprirebbe su un elenco incolonnato di loghi. Le immagini
  // restano fuori: pesano, e per quelle c'è già l'attesa breve dentro
  // l'animazione. Dove il prerender funziona questi arrivano dalla cache e non
  // costano una seconda volta.
  try {
    for (const href of [
      ORBITE_NEXT,
      // Solo il documento e il motore della scena. Stile e apertura NON sono
      // in questo elenco perché stanno DENTRO il documento: arrivano col primo
      // file, e chiederli a parte sarebbe una richiesta sprecata.
      `${ORBITE_URL}assets/js/orbits.js`,
    ]) {
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = href;
      document.head.appendChild(l);
    }
  } catch {
    /* niente prefetch: si naviga come sempre, senza vantaggio */
  }

  // In più, dove il browser lo sa fare, si chiede di preparare la pagina per
  // intero in un secondo piano invisibile: al momento della navigazione non
  // resta nulla da scaricare né da interpretare, si mostra e basta.
  try {
    if (
      HTMLScriptElement.supports &&
      HTMLScriptElement.supports("speculationrules")
    ) {
      const s = document.createElement("script");
      s.type = "speculationrules";
      s.textContent = JSON.stringify({
        prerender: [{ source: "list", urls: [ORBITE_NEXT] }],
      });
      document.head.appendChild(s);
    }
  } catch {
    /* niente regole di speculazione: resta il prefetch qui sopra */
  }
}

/**
 * Testo che si scrive e si cancella da solo, usato per i suggerimenti nei campi.
 *
 * La versione precedente era una sorgente costante di scatti su telefono, e la
 * causa non era l'animazione in sé ma come era costruita: l'effetto aveva
 * `text` fra le dipendenze, quindi veniva SMONTATO E RIMONTATO a ogni singolo
 * carattere — sedici volte al secondo — e a ogni giro rifaceva anche un
 * JSON.parse dell'elenco delle parole. Moltiplicato per i tre campi della
 * bacheca, era lavoro continuo sul filo principale, proprio mentre si scrive.
 *
 * Ora l'effetto parte una volta sola e si ripianifica da sé; le parole si
 * interpretano una volta. E soprattutto può essere messo in pausa: mentre si
 * digita, o quando la scheda è in secondo piano, non ha alcun senso continuare
 * a riscrivere un suggerimento che nessuno sta leggendo.
 */
function useTypewriter(
  words: string[],
  { paused = false, speed = 60, waitTime = 2000 } = {},
) {
  const [text, setText] = useState("");

  // Confronto per contenuto: l'array arriva nuovo a ogni render, quindi
  // usarlo direttamente come dipendenza rifarebbe partire tutto ogni volta.
  const wordsJson = JSON.stringify(words);

  useEffect(() => {
    if (paused) return;
    const list = JSON.parse(wordsJson) as string[];
    if (!list.length) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    let len = 0;
    let deleting = false;

    const step = () => {
      if (!alive) return;
      const full = list[i % list.length];
      let delay = speed;

      if (!deleting) {
        len = Math.min(len + 1, full.length);
        if (len === full.length) {
          deleting = true;
          delay = waitTime; // pausa a parola completa, per poterla leggere
        }
      } else {
        len = Math.max(len - 1, 0);
        delay = speed / 2; // si cancella più in fretta di quanto si scriva
        if (len === 0) {
          deleting = false;
          i += 1;
        }
      }

      setText(full.slice(0, len));
      timer = setTimeout(step, delay);
    };

    timer = setTimeout(step, speed);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [wordsJson, paused, speed, waitTime]);

  return text;
}

/**
 * I suggerimenti animati si fermano per SEMPRE al primo tocco sul modulo.
 *
 * Servono a chi arriva e non sa cosa scrivere. Da quando ha toccato il primo
 * campo, quella spiegazione l'ha avuta: continuare a riscriverli significa
 * ridisegnare i campi sedici volte al secondo per tutto il tempo in cui sta
 * compilando. E siccome mettere in pausa e riprendere fa RIPARTIRE il testo da
 * zero, passando da un campo all'altro si vedeva ogni segnaposto azzerarsi:
 * sono i lampeggi segnalati.
 *
 * È un modulo condiviso e non uno stato di React di proposito: i campi sono
 * fratelli, e questo deve fermarli tutti insieme senza farli ridisegnare.
 */
let formTouched = false;
const touchListeners = new Set<() => void>();
function markFormTouched() {
  if (formTouched) return;
  formTouched = true;
  touchListeners.forEach((cb) => cb());
}
function useFormTouched() {
  const [touched, setTouched] = useState(formTouched);
  useEffect(() => {
    if (touched) return;
    const cb = () => setTouched(true);
    touchListeners.add(cb);
    return () => {
      touchListeners.delete(cb);
    };
  }, [touched]);
  return touched;
}

/**
 * True finché l'apertura del marchio è ancora sullo schermo.
 *
 * Serve a tenere ferma la bacheca mentre la porta si apre. Misurando i
 * fotogrammi dell'animazione d'ingresso, i blocchi non venivano dal portale ma
 * da quello che la bacheca faceva DIETRO di esso: i suggerimenti che si
 * riscrivono sedici volte al secondo sono lavoro continuo speso per un testo
 * che in quel momento nessuno può vedere, perché è coperto dall'inchiostro.
 *
 * Il segnale è la classe che App mette su <html> quando l'apertura è finita.
 */
function useIntroOver() {
  const [over, setOver] = useState(
    () => typeof document === "undefined" ||
      document.documentElement.classList.contains("ag-booted"),
  );
  useEffect(() => {
    if (over) return;
    const obs = new MutationObserver(() => {
      if (document.documentElement.classList.contains("ag-booted")) {
        setOver(true);
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [over]);
  return over;
}

/** True quando la scheda non è in primo piano. */
function usePageVisible() {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

const MODES = [
  { id: 'spotted', label: 'Spotted', icon: '📍', active: true },
  { id: 'sondaggio', label: 'Sondaggio', icon: '📊', active: true },
  { id: 'eventi', label: 'Eventi', icon: '🎉', active: false },
  { id: 'appunti', label: 'Appunti', icon: '📖', active: false },
  { id: 'mercatino', label: 'Mercatino', icon: '📦', active: false },
  { id: 'gruppi', label: 'Persone', icon: '🤝', active: false }
];

import { LOCATIONS, CITIES, formatCity, formatArea } from '../../data/locations';

const locations: Record<string, string[]> = {};
for (const city of CITIES) {
  locations[formatCity(city)] = LOCATIONS[city].map(a => formatArea(a, city));
}

function TypewriterTextarea({ words, prefix = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { words: string[], prefix?: string }) {
  const [focused, setFocused] = useState(false);
  const visible = usePageVisible();

  // Il suggerimento si ferma quando non serve più: se il campo è in uso — a
  // fuoco o già scritto — il segnaposto non si vede nemmeno, e continuare a
  // riscriverlo significa ridisegnare il campo sedici volte al secondo
  // esattamente mentre qualcuno ci sta digitando dentro.
  const touched = useFormTouched();
  const introOver = useIntroOver();
  const inUse = focused || !!props.value;
  // Fermo: mentre l'apertura del marchio copre lo schermo, per sempre dopo il
  // primo tocco sul modulo, e mentre la scheda è in secondo piano.
  const placeholderText = useTypewriter(words, {
    paused: !introOver || touched || inUse || !visible,
  });

  return (
    <textarea
      placeholder={inUse ? prefix.trim() : `${prefix}${placeholderText}`}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        markFormTouched();
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

/**
 * La bacheca pubblica: la schermata che vedono tutti, con il modulo per
 * pubblicare uno spotted o un sondaggio.
 *
 * Il file si chiamava NewTheme.tsx e il componente ThemeCorkboard: nomi
 * rimasti da un rifacimento grafico di anni fa, che dicevano da dove venivano
 * invece di che cosa sono. Non c'e' nessun altro "tema" con cui confondersi.
 */
export function Board() {
  const { handleFocus, handleBlur, markSubmitted } = useVisitAnalytics();
  const { submit, isSubmitting, isSuccess, error, cooldown } = useSubmitSpotted();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<string>('spotted');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains("dark-theme");
    } catch {
      return false;
    }
  });
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      // Solo lo scambio della classe: nient'altro.
      //
      // Prima qui si accendeva e spegneva anche una classe che disattivava le
      // transizioni per la durata del cambio. Era proprio quella a far sembrare
      // che la pagina si ricaricasse: aggiungere e poi togliere una regola che
      // seleziona ogni elemento invalida gli stili dell'intera pagina due volte
      // di fila. Ora la regola che toglie i colori dalle transizioni e' statica
      // e sta in index.css: il browser la risolve una volta al caricamento e
      // qui non resta nulla da orchestrare.
      document.documentElement.classList.toggle("dark-theme", next);
      localStorage.setItem("agora_theme", next ? "dark" : "light");
    } catch {}
  };

  /** In viaggio verso Orbite: il portale è in scena e sta aprendo la porta. */
  const [leaving, setLeaving] = useState(false);

  // Ritorno col tasto "indietro".
  //
  // Il browser tiene la pagina congelata in memoria e la ripresenta com'era:
  // React ritrova `leaving` a true, quindi il portale è ancora in scena, ma il
  // suo ciclo di animazione era già finito con la navigazione. Risultato: si
  // torna indietro e si resta davanti al marchio, senza modo di proseguire —
  // è il blocco segnalato. L'evento pageshow con persisted è l'unico segnale
  // di questo ritorno; qui si rimette la bacheca allo stato normale.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  const defaultCity = Object.keys(locations)[0] || "Milano";
  const [city, setCity] = useState(defaultCity);
  const [zone, setZone] = useState(locations[defaultCity]?.[0] || "");
  const [waLinks, setWaLinks] = useState<Record<string, string>>({});
  const [eventWidget, setEventWidget] = useState<EventWidgetConfig>(DEFAULT_EVENT_WIDGET_CONFIG);
  const [eventWidgetLoaded, setEventWidgetLoaded] = useState(false);

  useEffect(() => {
    loadWhatsappLinksFromDB().then(setWaLinks);
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
  /*
    Quattro risposte sempre presenti: le prime due obbligatorie, le altre due
    facoltative. È il progetto originale, ed è anche quello che risolve il
    vuoto in fondo al pannello — le righe occupano lo spazio invece di
    lasciarlo, e non serve più un pulsante per aggiungerle una alla volta.
    Le risposte lasciate in bianco vengono scartate all'invio (Home.tsx le
    filtra sia in convalida sia nel payload), quindi un sondaggio con due sole
    opzioni resta perfettamente possibile.
  */
  const emptyOptions = () =>
    [0, 1, 2, 3].map(() => ({ id: generateId(), value: '' }));
  const [options, setOptions] = useState(emptyOptions);
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
      // Se il fuoco è finito su un ALTRO campo del modulo, la barra non si
      // riapre: si sta ancora compilando.
      //
      // È il "refresh" segnalato passando fra le opzioni del sondaggio e il
      // campo Instagram. La barra in alto ha due forme, estesa e compatta, che
      // sono rami diversi del JSX: passare dall'una all'altra smonta e rimonta
      // una quindicina di riquadri, ognuno dei quali rigenera la propria
      // maschera. Toccando un secondo campo, il tempo fra il rilascio del primo
      // e la presa del secondo poteva superare questa attesa — su un telefono
      // succede spesso — e la barra faceva chiudi-e-riapri per niente:
      // l'interfaccia si ricomponeva identica a com'era.
      const a = document.activeElement;
      const stillInForm =
        a instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName);
      if (stillInForm) return;
      setIsFormFocused(false);
    }, 250);
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
    if (newMode === 'sondaggio' && options.length < 4) setOptions(emptyOptions());
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setCity(newCity);
    setZone(locations[newCity][0]);
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
        if (mode === 'sondaggio') setOptions(emptyOptions());
      }
    });
  };

  return (
    <div className="h-[100dvh] w-full bg-[var(--ag-bg)] text-[var(--ag-text-strong)] flex justify-center items-center font-sans selection:bg-[#DC5F00] selection:text-white pb-safe overflow-y-auto">
      {/*
        La porta si compone, si apre e SOLO ALLORA si cambia pagina: navigare
        prima taglierebbe l'animazione a metà, che è il difetto che si voleva
        togliere. Orbite riprende con la stessa porta, così il movimento
        continua invece di ricominciare.
      */}
      {leaving && (
        <Portal
          open={false}
          // Il velo entra in dissolvenza sopra la bacheca invece di
          // sostituirla di colpo: senza, il primo fotogramma era già nero
          // pieno e il movimento sembrava cominciare da un'altra parte
          // anziché da qui.
          fadeIn
          onComposed={() => {
            window.location.href = ORBITE_NEXT;
          }}
        />
      )}
      <div className={`flex flex-col p-2.5 gap-2.5 relative w-full h-full max-w-md mx-auto ${isFormFocused ? "ag-typing" : ""}`}>

        {/* HEADER LOGO + THEME TOGGLE */}
        <div className="ag-brandbar relative flex justify-center items-center shrink-0 pt-1 pb-1">
          {/* Clicking the logo opens Agorà Orbite while staying on this domain
              (served same-origin from /orbite/).

              Il passaggio non è più un salto secco: al clic si apre la porta
              del marchio — la stessa animazione con cui Orbite si presenta —
              e solo quando ha finito si naviga. Chi guarda vede un unico
              movimento continuo fra i due siti invece di due pagine slegate.

              Resta un vero <a>: tasto centrale, "apri in nuova scheda" e i
              motori di ricerca continuano a vedere un collegamento normale.
              L'animazione parte solo sul clic semplice. */}
          <a
            href={ORBITE_URL}
            aria-label="Agorà"
            className="inline-flex active:scale-95 transition-transform"
            // Orbite si scalda appena il dito tocca il logo.
            //
            // Il passaggio non scattava per come è disegnato, ma per quello
            // che succede DOPO: la porta finisce di comporsi in 920 ms, si
            // cambia pagina, e solo allora il browser comincia a scaricare
            // Orbite — HTML, CSS, due script e ventisette immagini. Su rete
            // mobile quel momento è un'attesa a schermo coperto, e quando
            // finisce l'animazione riparte invece di continuare.
            //
            // Toccando il logo si dichiara al browser che quella pagina
            // servirà: la prepara in un secondo piano invisibile, e quando si
            // naviga davvero è già pronta. Fra il tocco e il cambio di pagina
            // passa circa un secondo — la composizione della porta — che
            // adesso è tempo di lavoro utile invece che tempo perso.
            onPointerDown={warmOrbite}
            onPointerEnter={warmOrbite}
            onClick={(e) => {
              // Clic con modificatori o diverso dal primario: è la richiesta
              // di aprire altrove, va lasciata al browser.
              if (
                e.defaultPrevented ||
                e.button !== 0 ||
                e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
              ) {
                return;
              }
              e.preventDefault();
              // La bacheca smette di lavorare: da qui in poi è coperta.
              //
              // I suggerimenti animati si riscrivono sedici volte al secondo, e
              // se nessuno ha ancora toccato il modulo stanno girando proprio
              // adesso — cioè durante la dissolvenza del velo e la crescita
              // degli archi, che sono i 620 ms in cui l'animazione deve essere
              // impeccabile. Ridisegnare tre campi di testo sotto una copertura
              // opaca è lavoro speso per qualcosa che nessuno può vedere, ed è
              // una delle sorgenti di scatto nel passaggio.
              markFormTouched();
              setLeaving(true);
            }}
          >
            {/*
              Il logo era un indirizzo raw.githubusercontent fisso, senza
              alcun ripiego: se GitHub non rispondeva — limiti di frequenza,
              rete lenta, estensioni per la privacy che bloccano il dominio —
              al centro dell'intestazione restava l'icona di immagine rotta.
              Ora è un file nostro, servito dallo stesso dominio del sito.
            */}
            <img
              src={`${import.meta.env.BASE_URL}agora-logo.png`}
              alt="Agorà"
              width={160}
              height={40}
              className="h-[2.5rem] w-auto object-contain drop-shadow-md dark:invert"
            />
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambia tema"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--ag-surface)] text-[var(--ag-accent)] shadow-sm active:scale-95 transition-all"
          >
            {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </div>

        {/* TOP DYNAMIC SECTION */}
        <div className="relative w-full shrink-0">
          {isFormFocused ? (
            /* COMPACT STATE */
            <div className="ag-swap-in flex gap-2 h-[3.25rem] pb-2 w-full">
              
              {/* COMPACT MODE */}
              <div className="flex flex-1 h-full min-w-0" style={{ borderRadius: 18 }}>
                 <Squircle cornerRadius={18} className="bg-[#DC5F00] text-white flex flex-1 items-center justify-center h-full px-3 shadow-sm min-w-0 w-full overflow-hidden">
                    <span className="text-[18px] drop-shadow-sm mr-1 shrink-0">{activeModes.find(m => m.id === mode)?.icon}</span>
                    <span className="text-[12px] font-bold tracking-tight truncate">{activeModes.find(m => m.id === mode)?.label}</span>
                 </Squircle>
              </div>

              {/* COMPACT LOCATION */}
              <div className="flex flex-[1.5] h-full min-w-0" style={{ borderRadius: 18 }}>
                 <Squircle cornerRadius={18} className="ag-edge bg-[var(--ag-surface)] flex flex-1 items-center px-3 h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] min-w-0 w-full overflow-hidden">
                    <MapPin className="w-3.5 h-3.5 text-[#DC5F00] shrink-0 mr-1.5" />
                    <span className="text-[11px] font-extrabold text-[var(--ag-text)] truncate leading-tight mt-[1px]">{city} • {zone}</span>
                 </Squircle>
              </div>

              {/* COMPACT ACTIONS */}
              <div className="flex gap-2 h-full shrink-0">
                 {/* Compact WA Button */}
                 {/* Stessa correzione della versione estesa: il collegamento
                     esiste da subito, quindi niente stato "spento". */}
                 {waLinkToUse && (
                 <div className="h-full aspect-square shrink-0">
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
            <div className="ag-swap-in flex flex-col gap-2.5 pb-2 w-full">
               
               {/* EXPANDED MODE */}
               <div className="w-full h-14 shrink-0 drop-shadow-sm z-10" style={{ borderRadius: 24 }}>
                  <Squircle cornerRadius={24} className="flex bg-[var(--ag-surface)] p-1.5 relative w-full h-full">
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
                        className={`flex-1 flex items-center justify-center h-full font-bold z-10 transition-colors duration-300 gap-2 text-[15px] ${mode === m.id ? 'text-white' : 'text-[var(--ag-muted)] hover:text-[var(--ag-text-strong)]'}`}
                      >
                        <span className="text-[22px]" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}>{m.icon}</span> {m.label}
                      </button>
                      ))}
                  </Squircle>
               </div>

               {/* EXPANDED LOCATION */}
               <div className="w-full shrink-0 drop-shadow-sm z-10" style={{ borderRadius: 32 }}>
                  <Squircle cornerRadius={32} className="ag-edge bg-[var(--ag-surface)] flex flex-col p-3 gap-2.5 w-full relative z-10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                     {/* Top Row: Location Selectors */}
                     <div className="flex w-full min-w-0 h-[3.25rem] gap-2.5">
                        <Squircle cornerRadius={20} className="ag-edge relative flex-1 bg-[var(--ag-inset)] flex items-center h-full min-w-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-all duration-300">
                         <MapPin className="w-4 h-4 text-[#DC5F00] absolute left-3 pointer-events-none" />
                         <select 
                           value={city} onChange={handleCityChange} 
                           className="w-full h-full bg-transparent pl-9 pr-8 text-[13px] font-bold appearance-none outline-none truncate cursor-pointer focus:outline-none"
                         >
                            {Object.keys(locations).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <ChevronDown className="w-4 h-4 text-[var(--ag-muted)] absolute right-2.5 pointer-events-none" />
                      </Squircle>
                      <Squircle cornerRadius={20} className="ag-edge relative flex-[1.2] bg-[var(--ag-inset)] flex items-center h-full min-w-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-all duration-300">
                         <select 
                           value={zone} onChange={(e)=>setZone(e.target.value)} 
                           className="w-full h-full bg-transparent pl-4 pr-8 text-[13px] font-bold appearance-none outline-none truncate cursor-pointer text-[#DC5F00] focus:outline-none"
                         >
                            {(locations[city] || []).map(z => <option key={z} value={z}>{z}</option>)}
                         </select>
                         <ChevronDown className="w-4 h-4 text-[var(--ag-muted)] absolute right-2.5 pointer-events-none" />
                      </Squircle>
                     </div>
                     
                     {/* Bottom Row: WhatsApp Smart Banner */}
                     {/*
                       Il pulsante restava al 50% di opacità e pulsante finché
                       la lettura da Firestore non tornava: sembrava
                       disattivato, ed è la segnalazione ricevuta. Peggio, la
                       lettura poteva non tornare MAI (getDoc non rifiuta se
                       non riesce a collegarsi), quindi restava spento.

                       Ma il collegamento c'è comunque: waLinkToUse ha sempre
                       un valore, al peggio un link wa.me generico. Non c'era
                       quindi nulla da attendere — il pulsante è funzionante
                       fin dal primo istante e ora si mostra come tale. Quando
                       il gruppo giusto arriva, cambia solo la destinazione.
                     */}
                     {waLinkToUse && (
                     <div className="w-full drop-shadow-[0_4px_12px_rgba(37,211,102,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 relative group h-14">
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
          <Squircle cornerRadius={32} className="ag-panel ag-edge bg-[var(--ag-surface)] p-4 flex flex-col gap-3 h-full">
             {mode === 'spotted' && (
                <div key="spotted" className="flex flex-col gap-3 h-full animate-in zoom-in-95 fade-in duration-300 relative z-10">
                   <Squircle cornerRadius={20} className="bg-[var(--ag-inset)] flex items-center overflow-hidden shrink-0 min-h-[3.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] py-2">
                      <div className="pl-4 pr-1 text-xl self-start pt-1" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>📍</div>
                      <TypewriterTextarea words={whereWords} prefix="Es: " className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-[var(--ag-muted)] placeholder:font-normal px-2 resize-none pt-[0.45rem]" rows={1} value={where} onChange={(e) => setWhere(e.target.value)} onFocus={() => handleInputFocus("where")} onBlur={() => handleInputBlur("where")} />
                   </Squircle>
                   <Squircle cornerRadius={20} className="bg-[var(--ag-inset)] flex items-center overflow-hidden shrink-0 min-h-[3.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] py-2">
                      <div className="pl-4 pr-1 text-xl self-start pt-1" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>🗓️</div>
                      <TypewriterTextarea words={whenWords} prefix="Es: " className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-[var(--ag-muted)] placeholder:font-normal px-2 resize-none pt-[0.45rem]" rows={1} value={when} onChange={(e) => setWhen(e.target.value)} onFocus={() => handleInputFocus("when")} onBlur={() => handleInputBlur("when")}/>
                   </Squircle>
                   <Squircle cornerRadius={24} className="bg-[var(--ag-inset)] flex overflow-hidden flex-1 focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] min-h-[4rem]">
                      <div className="pl-4 pr-1 text-xl self-start" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>🔍</div>
                      <TypewriterTextarea words={lookingForWordsSpotted} prefix="Es: " className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-[var(--ag-muted)] placeholder:font-normal resize-none px-2 pb-3 h-full" required value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} onFocus={() => handleInputFocus("lookingFor")} onBlur={() => handleInputBlur("lookingFor")} />
                   </Squircle>
                </div>
             )}
  
             {mode === 'sondaggio' && (
                /*
                  Lo spazio in eccesso va DENTRO il campo della domanda, non
                  lasciato vuoto.

                  Prima le opzioni erano ancorate in alto e sotto restava una
                  fascia di pannello vuota. Rimpicciolire il pannello ha solo
                  spostato il vuoto sullo sfondo, che è peggio. La soluzione
                  giusta è che il riquadro della domanda cresca fino a occupare
                  quello che avanza: è anche il posto dove serve davvero, perché
                  una domanda può essere lunga, mentre le risposte sono corte e
                  di altezza fissa.
                */
                /*
                  Niente barra di scorrimento: il pannello si COMPRIME.

                  È la segnalazione "succede qualcosa quando passo da un punto
                  all'altro". Con la tastiera aperta il pannello diventa più
                  corto di quanto serva alle cinque righe, quindi si apriva un
                  contenitore scorrevole; e ogni volta che il fuoco andava su
                  un campo, il browser lo portava in vista scorrendo quel
                  contenitore. Toccando OPZ 3 il pannello scivolava in su,
                  toccando il campo Instagram tornava giù: il contenuto si
                  spostava da solo a ogni tocco, e da fuori sembrava che la
                  pagina si rimettesse a posto ogni volta.

                  Ora non c'è niente da scorrere e quindi niente da riportare
                  in vista: quando lo spazio manca si accorcia prima il campo
                  della domanda, che è l'unico elastico, e poi di qualche
                  pixel le risposte, che hanno comunque un minimo sotto cui non
                  scendono. La composizione resta ferma.
                */
                <div key="sondaggio" className="ag-poll flex flex-col gap-3 h-full min-h-0 animate-in fade-in duration-200 relative z-10">
                   {/*
                     Il campo della domanda cresce, ma entro un limite: senza
                     tetto si prendeva tutto lo spazio avanzato e diventava un
                     riquadro enorme per una riga di testo. Fra il minimo e il
                     massimo sta un campo da tre o quattro righe, che è quanto
                     serve davvero a una domanda.
                   */}
                   <Squircle cornerRadius={24} className="ag-poll-q ag-edge bg-[var(--ag-inset)] flex overflow-hidden flex-1 min-h-[2.75rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow pt-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="pl-4 pr-1 text-xl self-start" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))" }}>📊</div>
                      <textarea className="bg-transparent w-full outline-none text-[14px] font-bold placeholder:text-[var(--ag-muted)] placeholder:font-normal resize-none px-2 pr-4 pb-2 h-full" placeholder={isIt ? "Fai una domanda alla community... *" : "Ask a question to the community... *"} required value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} onFocus={() => handleInputFocus("lookingFor")} onBlur={() => handleInputBlur("lookingFor")} />
                   </Squircle>
                   {/*
                     Le quattro risposte hanno altezza fissa e NON si
                     comprimono. Farle crescere in proporzione sembrava una
                     buona idea, ma su uno schermo piu' corto del mio banco di
                     prova la loro altezza minima non entrava piu' e compariva
                     una barra di scorrimento dentro il pannello: sulla pagina
                     normale non ci deve essere nulla da scorrere.

                     E' la colonna intera a scorrere, e solo quando serve
                     davvero: con la tastiera aperta lo spazio si dimezza e
                     allora scorrere e' l'unico modo per raggiungere l'ultima
                     risposta. Quello che avanza lo assorbe il campo della
                     domanda, che e' l'unico elemento elastico.
                   */}
                   <div className="ag-poll-opts flex flex-col gap-2.5 min-h-0 justify-start">
                      {options.map((opt, i) => (
                        /*
                          Altezza 3rem, ma comprimibile fino a 2.5rem.
                          Il blocco delle risposte non cresce mai — lo spazio
                          in più va alla domanda, come prima — ma quando ne
                          manca cede qualche pixel invece di far comparire una
                          barra di scorrimento.
                        */
                        <Squircle key={opt.id} cornerRadius={18} className="ag-poll-opt ag-edge bg-[var(--ag-inset)] flex items-center overflow-hidden grow-0 h-[3rem] min-h-[2.25rem] focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-shadow shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] group">
                         {/*
                           La targhetta era bg-[var(--ag-surface-2)]: nel tema
                           chiaro è #e8dec8 contro il pannello #eae0d0, cioè
                           due colori praticamente uguali — le opzioni si
                           impastavano l'una nell'altra.

                           Ora il colore distingue anche il RUOLO: le prime due
                           risposte sono obbligatorie e portano l'arancio del
                           marchio, le altre sono facoltative e restano neutre.
                           Così si capisce a colpo d'occhio quali servono, cosa
                           che prima era scritta solo nel testo segnaposto.
                         */}
                         <div
                           className={`w-[3rem] text-center font-bold text-[10px] flex flex-col justify-center items-center h-full border-r border-[var(--ag-border)] transition-colors ${
                             i < 2
                               ? "bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]"
                               : "bg-[var(--ag-surface)] text-[var(--ag-muted)]"
                           } group-focus-within:bg-[var(--ag-accent)]/30 group-focus-within:text-[var(--ag-accent)]`}
                         >
                           OPZ<br/>{i+1}
                         </div>
                         <input 
                           className="bg-transparent h-full w-full outline-none text-[14px] font-medium placeholder:text-[var(--ag-muted)] placeholder:font-normal px-3" 
                           placeholder={i < 2 ? "Risposta obbligatoria *" : "Risposta opzionale"} value={opt.value} onChange={(e) => { const newOpts = [...options]; newOpts[i] = {...newOpts[i], value: e.target.value}; setOptions(newOpts); }}
                           onFocus={() => handleInputFocus(`option_${opt.id}`)} onBlur={() => handleInputBlur(`option_${opt.id}`)}
                         />
                      </Squircle>
                    ))}
                 </div>
              </div>
           )}
        </Squircle>
        </div>

        {/* FOOTER ACTION AREA */}
        <div className="flex gap-2.5 shrink-0 h-[3.5rem] relative z-10 w-full mb-1">
          <motion.div animate={{ x: igShake ? [-5, 5, -5, 5, 0] : 0 }} transition={{ duration: 0.4 }} className="flex-1 drop-shadow-sm min-w-0">
            <Squircle cornerRadius={24} className="ag-edge bg-[var(--ag-surface)] flex items-center pl-1.5 pr-2 h-full w-full overflow-hidden focus-within:squircle-ring-2 focus-within:squircle-ring-[#DC5F00] transition-all group/ig relative">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#DC5F00]/0 to-[#DC5F00]/0 group-focus-within/ig:from-transparent group-focus-within/ig:via-[#DC5F00]/5 group-focus-within/ig:to-[#DC5F00]/10 transition-colors duration-500 pointer-events-none" />
               <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] w-[2.75rem] h-[2.75rem] shrink-0 relative z-10 transition-transform duration-300 group-focus-within/ig:scale-[1.02]">
                 <Squircle cornerRadius={20} className="w-full h-full bg-[var(--ag-inset)] flex items-center justify-center group-focus-within/ig:bg-[var(--ag-surface-2)] transition-colors duration-300">
                    <Instagram className="w-[18px] h-[18px] text-pink-600 group-focus-within/ig:scale-110 group-focus-within/ig:text-pink-500 transition-all duration-300" />
                 </Squircle>
               </div>
               <div className="flex items-center flex-1 h-full pl-2.5 relative z-10 min-w-0">
                 <span className={`text-[15px] font-bold transition-all duration-300 shrink-0 ${instagram ? 'text-[#DC5F00]' : 'text-[var(--ag-muted)] group-focus-within/ig:text-[var(--ag-accent)]/60'}`}>@</span>
                 <input 
                   className="bg-transparent flex-1 h-full pl-0.5 pr-2 text-[14px] font-bold outline-none placeholder:text-[var(--ag-muted)] placeholder:font-normal min-w-0 text-[var(--ag-text)] selection:bg-[#DC5F00]/20" 
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
