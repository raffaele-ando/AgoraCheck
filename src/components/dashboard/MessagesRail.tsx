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
        <div className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mt-1">
          {unreadCount === 1 ? "messaggio da leggere" : "messaggi da leggere"}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button onClick={onOpenCarousel} className="w-full text-left group">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <IcCarosello className="w-3.5 h-3.5" />
              Carosello
            </span>
            <span
              className={`text-[12px] font-semibold tabular-nums ${
                oltre ? "text-amber-700 dark:text-amber-300" : "text-gray-800 dark:text-gray-200"
              }`}
            >
              {Math.min(carouselCount, carouselMax)}
              <span className="text-gray-600">/{carouselMax}</span>
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full ${oltre ? "bg-amber-500" : "bg-indigo-600"}`}
              style={{ width: `${quota}%` }}
            />
          </div>
          {oltre && (
            <div className="mt-2 text-[12px] text-amber-700 dark:text-amber-300">
              {carouselCount - carouselMax} in più del limite: scegli quali pubblicare
            </div>
          )}
        </button>
      </div>

      {/* "Stai guardando" resta solo se c'e' davvero un filtro: l'intestazione
          dice gia' quanti ne restano, e "nessun filtro" non e' una notizia. */}
      {activeFilters.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Filtri attivi
          </div>
          <ul className="space-y-1 mb-2">
            {activeFilters.map((f) => (
              <li
                key={f}
                className="text-[12px] text-gray-700 dark:text-gray-300 flex items-start gap-1.5"
              >
                <IcFiltro className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-600" />
                <span className="min-w-0 break-words">{f}</span>
              </li>
            ))}
          </ul>
          <div className="text-[12px] text-gray-600 dark:text-gray-400 tabular-nums mb-2">
            {resultCount} di {totalLoaded} caricati
          </div>
          <button
            onClick={onClearFilters}
            className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
          >
            Rimuovi i filtri
          </button>
        </div>
      )}
      <details className="border-t border-gray-200 dark:border-gray-700 pt-4 group">
        <summary className="cursor-pointer list-none text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-between mb-2">
          Da tastiera
          <span className="text-gray-600 group-open:rotate-180 transition-transform">
            ⌄
          </span>
        </summary>
        <dl className="text-[12px] text-gray-600 dark:text-gray-400 space-y-1.5">
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
      </details>
      {children && (
        <details className="border-t border-gray-200 dark:border-gray-700 pt-4 group">
          <summary className="cursor-pointer list-none text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-between">
            Il link da mettere in bio
            <span className="text-gray-600 group-open:rotate-180 transition-transform">
              ⌄
            </span>
          </summary>
          <div className="mt-3">{children}</div>
        </details>
      )}
    </aside>
  );
}
