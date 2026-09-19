import { useEffect, useRef } from "react";
import { motion } from "motion/react";

/**
 * Una sola finestra di conferma per tutta la dashboard nuova.
 *
 * Quella di prima era la stessa per ogni caso: titolo "CONFERMA OPERAZIONE",
 * pulsante "CONFERMA". Due etichette che non dicono ne' cosa sta per
 * succedere ne' a quante cose: davanti a un'eliminazione irreversibile di 86
 * messaggi filtrati, l'unico punto in cui ci si puo' accorgere dell'errore
 * era una frase generica.
 *
 * Qui il titolo E' la domanda, il pulsante porta il verbo e il numero, e le
 * prime voci coinvolte si vedono. Il pulsante che distrugge non riceve il
 * fuoco all'apertura: se qualcuno tira Invio per abitudine, non cancella
 * niente.
 */

export type ConfirmKind = "distruttivo" | "attenzione" | "neutro";

interface Props {
  kind: ConfirmKind;
  /** La domanda, non "Conferma operazione". Es. "Eliminare 12 messaggi?" */
  title: string;
  /** Cosa succede davvero, in una frase. */
  consequence: string;
  /** Cosa NON succede, quando serve a togliere la paura (o ad aggiungerla). */
  note?: string;
  /** Anteprima di cio' che si sta per toccare: si vede su cosa si agisce. */
  preview?: string[];
  /** Il verbo dell'azione, col numero. Es. "Elimina 12 messaggi". */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const MAX_PREVIEW = 4;

export default function ConfirmDialog({
  kind,
  title,
  consequence,
  note,
  preview,
  confirmLabel,
  cancelLabel = "Annulla",
  onConfirm,
  onCancel,
  children,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(
    `ac-conferma-${Math.random().toString(36).slice(2, 8)}`,
  ).current;

  // Il fuoco parte da Annulla quando l'azione distrugge: la via di uscita e'
  // il valore predefinito, non la via senza ritorno.
  useEffect(() => {
    if (kind === "distruttivo") cancelRef.current?.focus();
  }, [kind]);

  // Il fuoco non esce dalla finestra finche' e' aperta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const fuocabili = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (fuocabili.length === 0) return;
      const primo = fuocabili[0];
      const ultimo = fuocabili[fuocabili.length - 1];
      if (e.shiftKey && document.activeElement === primo) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primo.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const confermaClasse =
    kind === "distruttivo"
      ? "bg-red-700 hover:bg-red-800 text-white"
      : kind === "attenzione"
        ? "bg-amber-600 hover:bg-amber-700 text-white"
        : "bg-indigo-700 hover:bg-indigo-800 text-white";

  const restanti = preview ? preview.length - MAX_PREVIEW : 0;

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[999]"
      onClick={onCancel}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="p-6 sm:p-6">
          <h2
            id={titleId}
            className="text-[19px] leading-tight font-bold text-gray-900 dark:text-gray-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
            {consequence}
          </p>
          {note && (
            <p className="mt-2 text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">
              {note}
            </p>
          )}

          {preview && preview.length > 0 && (
            <ul className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 text-[12px]">
              {preview.slice(0, MAX_PREVIEW).map((riga, i) => (
                <li
                  key={i}
                  className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate"
                  title={riga}
                >
                  {riga}
                </li>
              ))}
              {restanti > 0 && (
                <li className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  e altri {restanti}
                </li>
              )}
            </ul>
          )}

          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="flex gap-2 px-6 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-10 rounded-lg text-[13px] font-semibold transition-colors ${confermaClasse}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
