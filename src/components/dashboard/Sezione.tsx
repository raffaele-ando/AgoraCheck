/*
 * Una sezione delle Impostazioni: aperta su schermo largo, richiudibile
 * sul telefono.
 *
 * Misurate, le Impostazioni sono lunghe 4,2 schermate: cinque blocchi che
 * non hanno niente a che vedere l'uno con l'altro, impilati. Per arrivare
 * ai loghi si scorre attraverso i gruppi WhatsApp, gli eventi e gli
 * accessi — roba che non si stava cercando. E siccome i titoli passano
 * mentre si scorre, non si sa nemmeno quante sezioni ci siano.
 *
 * Chiuse, le cinque intestazioni stanno in una schermata: si vede cosa
 * c'e' e si apre quella che serve. Su schermo largo restano aperte,
 * perche' li' stanno affiancate su due colonne e il problema non c'e'.
 *
 * Quale sia aperta resta in memoria del browser: chi ci torna il giorno
 * dopo la ritrova com'era, invece di doverla riaprire ogni volta.
 */
import { useEffect, useState } from "react";
import { IcApri } from "../ui/AcIcons";

export interface SezioneProps {
  /** La chiave con cui si ricorda se era aperta. */
  id: string;
  titolo: React.ReactNode;
  /** Aperta al primo accesso, quando non c'e' niente in memoria. */
  apertaAllInizio?: boolean;
  /** Il filo del riquadro: l'ambra segnala la sezione che da' accessi. */
  bordo?: string;
  /**
   * I comandi della sezione (salva, aggiorna).
   *
   * Su schermo largo stanno accanto al titolo, com'erano. Sul telefono il
   * titolo e' l'intestazione richiudibile e un tasto dentro un tasto non
   * si puo' fare, quindi i comandi vanno in cima al contenuto.
   */
  azioni?: React.ReactNode;
  children: React.ReactNode;
}

const MEMORIA = "ac-impostazioni-aperte";

function leggiMemoria(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(MEMORIA) || "{}");
  } catch {
    // Archiviazione bloccata (finestra anonima, cookie negati): si
    // riparte dai valori iniziali, che e' un peggioramento accettabile.
    return {};
  }
}

export default function Sezione({ id, titolo, apertaAllInizio = false, bordo = "border-gray-100 dark:border-gray-700", azioni, children }: SezioneProps) {
  const [stretto, setStretto] = useState(() => {
    try {
      return window.matchMedia("(max-width: 1023px)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const m = window.matchMedia("(max-width: 1023px)");
    const f = () => setStretto(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  const [aperta, setAperta] = useState(() => {
    const m = leggiMemoria();
    return id in m ? m[id] : apertaAllInizio;
  });

  const cambia = () => {
    setAperta((v) => {
      const nuovo = !v;
      try {
        localStorage.setItem(MEMORIA, JSON.stringify({ ...leggiMemoria(), [id]: nuovo }));
      } catch {
        /* niente memoria: funziona lo stesso, solo non se lo ricorda */
      }
      return nuovo;
    });
  };

  // Su schermo largo non c'e' niente da richiudere.
  if (!stretto) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${bordo} p-6`}>
        {/* Titolo e comandi sulla stessa riga, e un po' d'aria sotto:
            prima del passaggio a Sezione il margine stava sul titolo, e
            senza non si staccava piu' dalla descrizione. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 mb-3">
          {titolo}
          {azioni}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${bordo} overflow-hidden`}>
      <button
        onClick={cambia}
        aria-expanded={aperta}
        className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0 flex-1">{titolo}</span>
        <IcApri
          className={`w-5 h-5 shrink-0 text-gray-600 dark:text-gray-400 transition-transform ${aperta ? "rotate-180" : ""}`}
        />
      </button>
      {aperta && (
        <div className="px-4 pb-5">
          {azioni && <div className="flex justify-end mb-4">{azioni}</div>}
          {children}
        </div>
      )}
    </div>
  );
}
