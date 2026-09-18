import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";

/*
 * Selettore fra i due disegni della dashboard.
 *
 * Il precedente vive intatto in DashboardClassic.tsx; il nuovo in
 * DashboardNext.tsx. Entrambi leggono e scrivono gli stessi dati: cambia
 * solo come sono presentati, così si possono confrontare sugli stessi
 * messaggi senza migrare nulla.
 *
 * La scelta si fa con ?ui=classic o ?ui=next nell'indirizzo, e resta
 * memorizzata nel browser. In caso di problemi col nuovo disegno,
 * aggiungere ?ui=classic all'URL riporta indietro subito: non serve un
 * nuovo rilascio né aspettare la compilazione.
 */

const DashboardClassic = lazy(() => import("./DashboardClassic"));
const DashboardNext = lazy(() => import("./DashboardNext"));

export type DashboardSkin = "classic" | "next";

const STORAGE_KEY = "ac_dashboard_skin";
const DEFAULT_SKIN: DashboardSkin = "next";

const isSkin = (value: unknown): value is DashboardSkin =>
  value === "classic" || value === "next";

/** L'indirizzo vince sempre sulla preferenza salvata, ed è anche ciò che la aggiorna. */
export const readSkin = (): DashboardSkin => {
  if (typeof window === "undefined") return DEFAULT_SKIN;

  const fromUrl = new URLSearchParams(window.location.search).get("ui");
  if (isSkin(fromUrl)) {
    // Il ricordo è un di più: se il browser lo nega (navigazione privata,
    // dati del sito bloccati) la scelta scritta nell'indirizzo vale
    // comunque. Con il try attorno a tutto, un setItem che falliva
    // faceva perdere anche ?ui=classic, cioè proprio la via di ritorno.
    try {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
    } catch {
      /* si prosegue senza ricordare */
    }
    return fromUrl;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isSkin(saved)) return saved;
  } catch {
    /* memoria negata: si usa il predefinito */
  }
  return DEFAULT_SKIN;
};

export const useDashboardSkin = (): [DashboardSkin, (next: DashboardSkin) => void] => {
  const [skin, setSkin] = useState<DashboardSkin>(readSkin);

  // Un ritorno indietro del browser può cambiare ?ui= senza rimontare la pagina.
  useEffect(() => {
    const sync = () => setSkin(readSkin());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const choose = useCallback((next: DashboardSkin) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* se la memoria è negata resta comunque il parametro nell'indirizzo */
    }
    const url = new URL(window.location.href);
    url.searchParams.set("ui", next);
    // Ricarico invece di scambiare il componente: i due disegni hanno
    // sottoscrizioni a Firestore proprie, e uno scambio a caldo le
    // lascerebbe entrambe aperte.
    window.location.assign(url.toString());
  }, []);

  return [skin, choose];
};

/**
 * Se il disegno scelto si rompe, questa è la via d'uscita.
 *
 * Senza, un errore in DashboardNext porterebbe via con sé anche
 * l'interruttore, e l'unico modo di tornare indietro sarebbe conoscere a
 * memoria il parametro ?ui=classic.
 */
class SkinBoundary extends React.Component<
  { skin: DashboardSkin; onRecover: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { skin: DashboardSkin }) {
    if (prev.skin !== this.props.skin && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error) {
    console.error("La dashboard si è interrotta:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isNext = this.props.skin === "next";
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
            {isNext
              ? "Il disegno nuovo si è interrotto"
              : "La dashboard si è interrotta"}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {isNext
              ? "I tuoi dati non sono stati toccati. Puoi tornare al disegno precedente e continuare a lavorare."
              : this.state.error.message}
          </p>
          <div className="flex items-center gap-2">
            {isNext && (
              <button
                onClick={this.props.onRecover}
                className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold"
              >
                Torna al disegno precedente
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Ricarica
            </button>
          </div>
          {isNext && (
            <p className="mt-4 text-xs text-gray-400 font-mono break-words">
              {this.state.error.message}
            </p>
          )}
        </div>
      </div>
    );
  }
}

/**
 * L'interruttore fra i due disegni.
 *
 * Sta qui e non dentro le due pagine: così DashboardClassic resta una copia
 * fedele dell'originale, senza una riga aggiunta, e il comando è identico
 * da qualunque dei due si parta.
 */
function SkinSwitch({
  skin,
  onChoose,
}: {
  skin: DashboardSkin;
  onChoose: (next: DashboardSkin) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[60] w-9 h-9 rounded-full bg-gray-900/85 dark:bg-gray-700/90 text-white text-[11px] font-bold backdrop-blur shadow-lg hover:bg-gray-900 transition-colors"
        title="Cambia disegno della dashboard"
        aria-label="Cambia disegno della dashboard"
      >
        {skin === "classic" ? "1" : "2"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-1 p-1 rounded-full bg-gray-900/90 dark:bg-gray-700/95 backdrop-blur shadow-lg">
      {(
        [
          ["classic", "Precedente"],
          ["next", "Nuovo"],
        ] as [DashboardSkin, string][]
      ).map(([value, label]) => (
        <button
          key={value}
          onClick={() => (value === skin ? setOpen(false) : onChoose(value))}
          aria-pressed={value === skin}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${
            value === skin
              ? "bg-white text-gray-900"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => setOpen(false)}
        className="w-6 h-6 rounded-full text-white/50 hover:text-white text-[13px] leading-none"
        aria-label="Chiudi"
      >
        &times;
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [skin, choose] = useDashboardSkin();
  return (
    <>
      <SkinBoundary skin={skin} onRecover={() => choose("classic")}>
        <Suspense fallback={null}>
          {skin === "classic" ? <DashboardClassic /> : <DashboardNext />}
        </Suspense>
      </SkinBoundary>
      <SkinSwitch skin={skin} onChoose={choose} />
    </>
  );
}
