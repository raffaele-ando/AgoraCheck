/*
 * La colonna di riepilogo, a destra della lista.
 *
 * Risolve un dilemma che non ha una via di mezzo: se la lista resta
 * stretta, su un monitor largo restano centinaia di pixel di nulla; se la
 * si allarga, le righe diventano illeggibili (il testo supera la misura
 * comoda) e la data finisce lontanissima dal nome a cui si riferisce.
 *
 * La risposta non e' scegliere fra i due mali: e' dare un COMPITO allo
 * spazio in piu'. La lista tiene la sua misura di lettura, e la larghezza
 * che avanza ospita i numeri e i filtri attivi — che prima stavano sopra
 * la lista e spingevano il primo messaggio sotto la piega.
 *
 * Sotto i 1024 pixel questa colonna non esiste: gli stessi dati tornano in
 * una riga compatta sopra la lista (vedi MessagesToolbar).
 */
import { IcCarosello, IcFiltro } from "../ui/AcIcons";

export interface MessagesRailProps {
  unreadCount: number;
  carouselCount: number;
  carouselMax?: number;
  onOpenCarousel: () => void;
  activeFilters: string[];
  onClearFilters: () => void;
  resultCount: number;
  totalLoaded: number;
  children?: React.ReactNode;
}

export default function MessagesRail({
  unreadCount,
  carouselCount,
  carouselMax = 20,
  onOpenCarousel,
  activeFilters,
  onClearFilters,
  resultCount,
  totalLoaded,
  children,
}: MessagesRailProps) {
  const oltre = carouselCount > carouselMax;
  const quota = Math.min(carouselCount / carouselMax, 1) * 100;

  return (
    <aside className="hidden lg:block w-full space-y-6 sticky top-[70px] self-start">
      <div>
        <div className="text-[44px] font-black leading-none tabular-nums text-gray-900 dark:text-gray-100">
          {unreadCount}
        </div>
        <div className="text-[12.5px] font-semibold text-gray-500 dark:text-gray-400 mt-1">
          {unreadCount === 1 ? "messaggio da leggere" : "messaggi da leggere"}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button onClick={onOpenCarousel} className="w-full text-left group">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <IcCarosello className="w-3.5 h-3.5" />
              Carosello
            </span>
            <span
              className={`text-[12px] font-bold tabular-nums ${
                oltre ? "text-amber-700 dark:text-amber-300" : "text-gray-800 dark:text-gray-200"
              }`}
            >
              {Math.min(carouselCount, carouselMax)}
              <span className="text-gray-400">/{carouselMax}</span>
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full ${oltre ? "bg-amber-500" : "bg-indigo-600"}`}
              style={{ width: `${quota}%` }}
            />
          </div>
          {oltre && (
            <div className="mt-2 text-[11.5px] text-amber-700 dark:text-amber-300">
              {carouselCount - carouselMax} in più del limite: scegli quali pubblicare
            </div>
          )}
        </button>
      </div>

      {children && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">{children}</div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-2">
          Stai guardando
        </div>
        {activeFilters.length > 0 ? (
          <>
            <ul className="space-y-1 mb-2">
              {activeFilters.map((f) => (
                <li
                  key={f}
                  className="text-[12.5px] text-gray-700 dark:text-gray-300 flex items-start gap-1.5"
                >
                  <IcFiltro className="w-3 h-3 mt-1 shrink-0 text-gray-400" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums mb-2">
              {resultCount} di {totalLoaded} caricati
            </div>
            <button
              onClick={onClearFilters}
              className="text-[12.5px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              Rimuovi i filtri
            </button>
          </>
        ) : (
          <div className="text-[12.5px] text-gray-500 dark:text-gray-400 tabular-nums">
            Tutti i {resultCount} messaggi, nessun filtro
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-2">
          Da tastiera
        </div>
        <dl className="text-[12px] text-gray-500 dark:text-gray-400 space-y-1.5">
          {[
            ["J K", "scorri i messaggi"],
            ["E", "archivia"],
            ["C", "metti nel carosello"],
            ["S", "seleziona"],
            ["Invio", "apri i dettagli tecnici"],
            ["Esc", "chiude e annulla la selezione"],
          ].map(([tasto, cosa]) => (
            <div key={tasto} className="flex items-baseline gap-2">
              <dt className="shrink-0">
                {tasto.split(" ").map((t) => (
                  <kbd
                    key={t}
                    className="font-mono text-[11px] bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 mr-1"
                  >
                    {t}
                  </kbd>
                ))}
              </dt>
              <dd className="min-w-0">{cosa}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
