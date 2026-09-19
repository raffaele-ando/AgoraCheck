/*
 * La barra che compare quando ci sono elementi selezionati.
 *
 * Prima la selezione trasformava l'INTESTAZIONE in un pannello indaco e,
 * nel farlo, nascondeva le barre dei filtri. Ma "Tutti (86)" continua ad
 * agire sui messaggi FILTRATI, e a valle c'e' l'eliminazione, che e'
 * irreversibile: sapere quale filtro e' attivo mentre si sceglie "tutti"
 * fa parte della difesa. Qui la barra sta in basso, i filtri restano
 * visibili, e il filtro attivo e' ripetuto accanto al conteggio.
 */
export interface SelectionBarProps {
  count: number;
  totalFiltered: number;
  filterSummary?: string | null;
  isArchivedView: boolean;
  onSelectPage: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onCancel: () => void;
  onArchive: () => void;
  onGroup?: () => void;
  onDelete: () => void;
}

export default function SelectionBar({
  count,
  totalFiltered,
  filterSummary,
  isArchivedView,
  onSelectPage,
  onSelectAll,
  onClear,
  onCancel,
  onArchive,
  onGroup,
  onDelete,
}: SelectionBarProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-[15px] font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {count}
        </span>
        <span className="text-[13px] font-semibold text-gray-600 dark:text-gray-300">
          selezionati
        </span>

        <span className="text-[12px] text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 pl-3">
          di {totalFiltered} filtrati
          {filterSummary ? (
            <>
              {" · "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {filterSummary}
              </span>
            </>
          ) : null}
        </span>

        <button onClick={onSelectPage} className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline">
          Pagina
        </button>
        <button onClick={onSelectAll} className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline">
          Tutti e {totalFiltered}
        </button>
        <button onClick={onClear} className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:underline">
          Nessuno
        </button>
        <button onClick={onCancel} className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:underline">
          Annulla
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onArchive}
            disabled={count === 0}
            className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-bold disabled:opacity-40"
          >
            {isArchivedView ? "Ripristina" : "Archivia"} {count || ""}
          </button>
          {onGroup && (
            <button
              onClick={onGroup}
              disabled={count < 2}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[13px] font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40"
            >
              Raggruppa…
            </button>
          )}
          <div className="w-px h-7 bg-gray-200 dark:bg-gray-600 mx-1" />
          <button
            onClick={onDelete}
            disabled={count === 0}
            className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 text-[13px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40"
          >
            Elimina {count || ""}…
          </button>
        </div>
      </div>
    </div>
  );
}
