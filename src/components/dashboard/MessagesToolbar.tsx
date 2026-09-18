/*
 * La fascia sopra la lista messaggi.
 *
 * Prima erano tre blocchi impilati per circa 240 pixel: due schede grandi
 * (link automatico e carosello), poi la coppia Nuovi/Archiviati con
 * "mostra per pagina" isolato all'altro capo dello schermo, poi una terza
 * riga con ricerca e filtri. Il primo messaggio nuovo non era mai la prima
 * cosa che si vedeva.
 *
 * Qui diventano due righe: una di comandi e una di riepilogo. Sta in un
 * file suo perche' cosi' la si puo' renderizzare e fotografare insieme
 * alle righe, senza Firebase e senza login.
 */
import { useState } from "react";
import { IcCarosello, IcCerca, IcFiltro, IcSelezione } from "../ui/AcIcons";

export interface MessagesToolbarProps {
  viewFilter: "new" | "archived";
  onViewFilter: (v: "new" | "archived") => void;
  unreadCount: number;
  searchQuery: string;
  onSearch: (v: string) => void;
  onlyPostsFilter: boolean;
  onOnlyPosts: () => void;
  zoneOptions: string[];
  selectedZoneFilter: string;
  onZone: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  resultCount: number;
  pageSize: number;
  onPageSize: (n: number) => void;
  onStartSelect: () => void;
  isSuperAdmin: boolean;
  carouselCount: number;
  onOpenCarousel: () => void;
  linkWidget: React.ReactNode;
  carouselMax?: number;
}

export default function MessagesToolbar({
  viewFilter,
  onViewFilter,
  unreadCount,
  searchQuery,
  onSearch,
  onlyPostsFilter,
  onOnlyPosts,
  zoneOptions,
  selectedZoneFilter,
  onZone,
  hasActiveFilters,
  onClearFilters,
  resultCount,
  pageSize,
  onPageSize,
  onStartSelect,
  isSuperAdmin,
  carouselCount,
  onOpenCarousel,
  linkWidget,
  carouselMax = 20,
}: MessagesToolbarProps) {
  const [linkAperto, setLinkAperto] = useState(false);
  const oltreIlLimite = carouselCount > carouselMax;
  const segmento = (valore: "new" | "archived", testo: string, badge?: number) => (
    <button
      onClick={() => onViewFilter(valore)}
      aria-pressed={viewFilter === valore}
      className={`px-3 py-1.5 rounded-md text-[12.5px] font-bold transition-colors flex items-center gap-1.5 ${
        viewFilter === valore
          ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      }`}
    >
      {testo}
      {badge ? (
        <span className="tabular-nums text-indigo-600 dark:text-indigo-400">{badge}</span>
      ) : null}
    </button>
  );

  return (
    <div className="mb-5">
      {/* Riga dei comandi: tutto cio' che restringe la lista sta qui, su
          una riga sola, perche' fa tutto lo stesso mestiere. */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex p-[3px] rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
          {segmento("new", "Nuovi", unreadCount)}
          {segmento("archived", "Archiviati")}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <IcCerca className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cerca testo, @instagram, zona…"
            aria-label="Cerca fra i messaggi"
            className="w-full pl-8 pr-3 py-[7px] rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        <button
          onClick={onOnlyPosts}
          aria-pressed={onlyPostsFilter}
          className={`px-2.5 py-[7px] rounded-lg text-[12.5px] font-semibold border transition-colors ${
            onlyPostsFilter
              ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          Solo spotted
        </button>

        <select
          value={selectedZoneFilter}
          onChange={(e) => onZone(e.target.value)}
          aria-label="Filtra per zona"
          className={`px-2.5 py-[7px] rounded-lg text-[12.5px] font-semibold border transition-colors outline-none ${
            selectedZoneFilter
              ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          <option value="">Tutte le zone</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-2.5 py-[7px] rounded-lg text-[12.5px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5"
          >
            <IcFiltro className="w-3.5 h-3.5" />
            Rimuovi filtri
          </button>
        )}

        <button
          onClick={onStartSelect}
          className="px-2.5 py-[7px] rounded-lg text-[12.5px] font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center gap-1.5"
        >
          <IcSelezione className="w-3.5 h-3.5" />
          Seleziona
        </button>

        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          aria-label="Quanti messaggi per pagina"
          className="hidden sm:block px-2 py-[7px] rounded-lg text-[12.5px] font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 outline-none"
        >
          {[20, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              {n} per pagina
            </option>
          ))}
        </select>

        <span className="tabular-nums text-[12.5px] font-semibold text-gray-400 dark:text-gray-500">
          {resultCount} risultati
        </span>
      </div>

      {/* Riga di riepilogo: i numeri su cui si agisce, al posto delle due
          schede grandi che li contenevano prima. */}
      <div className="lg:hidden flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-7 py-3">
        <div className="shrink-0 flex items-baseline gap-1.5">
          <span className="text-[19px] font-black tabular-nums text-gray-900 dark:text-gray-100">
            {unreadCount}
          </span>
          <span className="text-[12.5px] text-gray-500 dark:text-gray-400">da leggere</span>
        </div>

        {isSuperAdmin && (
          <button
            onClick={onOpenCarousel}
            className="shrink-0 flex items-center gap-2 group"
            title={
              oltreIlLimite
                ? `Hai ${carouselCount} messaggi validati ma il post ne porta ${carouselMax}: apri l'editor per scegliere quali`
                : "Apri l'editor del carosello"
            }
          >
            <IcCarosello
              className={`w-4 h-4 ${oltreIlLimite ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}
            />
            <span
              className={`text-[13px] font-bold tabular-nums ${
                oltreIlLimite
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-gray-800 dark:text-gray-200"
              }`}
            >
              {Math.min(carouselCount, carouselMax)}
              <span className="text-gray-400">/{carouselMax}</span>
            </span>
            <span className="text-[12.5px] text-gray-500 dark:text-gray-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
              carosello
            </span>
            {oltreIlLimite && (
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md">
                +{carouselCount - carouselMax} da scegliere
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setLinkAperto((v) => !v)}
          aria-expanded={linkAperto}
          className="shrink-0 text-[12.5px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
        >
          Link in bio {linkAperto ? "▴" : "▾"}
        </button>
      </div>

      {linkAperto && <div className="lg:hidden pb-4">{linkWidget}</div>}
    </div>
  );
}
