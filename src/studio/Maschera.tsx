/*
 * La maschera: si costruisce da sola leggendo i campi del modello.
 *
 * E' l'altra meta' del motivo per cui un modello nuovo non richiede
 * codice nuovo. Un campo dichiarato `paragrafo` diventa un'area di
 * scrittura, uno dichiarato `immagine` diventa un riquadro dove trascinare
 * un file: la pagina non sa, e non deve sapere, cosa sia "occhiello".
 *
 * I campi si raggruppano come dice il modello. Senza gruppi verrebbe un
 * elenco lungo e indistinto, che e' esattamente cio' che rende faticoso
 * riempire un modulo.
 */
import { useRef } from "react";
import type { Campo, Valori } from "./tipi";
import { IcCarica, IcChiudi } from "../components/ui/AcIcons";

const ETICHETTA = "block text-[12px] font-bold text-gray-700 dark:text-gray-300 mb-1.5";
const CASELLA =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/40 text-[13px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

function CampoImmagine({
  campo,
  valore,
  onCambia,
}: {
  campo: Campo;
  valore: string;
  onCambia: (v: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const leggi = (file?: File | null) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => onCambia(String(fr.result || ""));
    fr.readAsDataURL(file);
  };

  return (
    <div>
      <span className={ETICHETTA}>{campo.nome}</span>
      {valore ? (
        <div className="relative">
          <img src={valore} alt="" className="w-full h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" />
          <button
            type="button"
            onClick={() => onCambia("")}
            aria-label={`Togli ${campo.nome.toLowerCase()}`}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200"
          >
            <IcChiudi className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            leggi(e.dataTransfer.files?.[0]);
          }}
          className="w-full h-28 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <IcCarica className="w-5 h-5" />
          <span className="text-[12px] font-bold">Scegli un file o trascinalo qui</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => leggi(e.target.files?.[0])} />
    </div>
  );
}

export function CampoSingolo({
  campo,
  valori,
  onCambia,
}: {
  campo: Campo;
  valori: Valori;
  onCambia: (id: string, v: string | number | boolean) => void;
}) {
  const v = valori[campo.id];

  switch (campo.tipo) {
    case "paragrafo":
      return (
        <label className="block">
          <span className={ETICHETTA}>{campo.nome}</span>
          <textarea
            value={String(v ?? "")}
            placeholder={campo.esempio}
            onChange={(e) => onCambia(campo.id, e.target.value)}
            rows={3}
            className={`${CASELLA} resize-y leading-relaxed`}
          />
        </label>
      );

    case "immagine":
      return <CampoImmagine campo={campo} valore={String(v ?? "")} onCambia={(x) => onCambia(campo.id, x)} />;

    case "colore":
      return (
        <label className="block">
          <span className={ETICHETTA}>{campo.nome}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(v ?? "#000000")}
              onChange={(e) => onCambia(campo.id, e.target.value)}
              className="w-10 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent cursor-pointer"
            />
            <input value={String(v ?? "")} onChange={(e) => onCambia(campo.id, e.target.value)} className={`${CASELLA} font-mono`} />
          </div>
        </label>
      );

    case "scelta":
      return (
        <label className="block">
          <span className={ETICHETTA}>{campo.nome}</span>
          <select value={String(v ?? "")} onChange={(e) => onCambia(campo.id, e.target.value)} className={CASELLA}>
            {campo.opzioni?.map((o) => (
              <option key={o.valore} value={o.valore}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
      );

    case "numero":
      return (
        <label className="block">
          {/* Il valore sta nell'etichetta e non sotto al cursore: sotto,
              l'occhio deve fare avanti e indietro per sapere dove si e'. */}
          <span className={`${ETICHETTA} flex items-center justify-between`}>
            <span>{campo.nome}</span>
            <span className="tabular-nums text-indigo-600 dark:text-indigo-400">{String(v ?? campo.predefinito ?? 0)}</span>
          </span>
          <input
            type="range"
            min={campo.min ?? 0}
            max={campo.max ?? 100}
            step={campo.passo ?? 1}
            value={Number(v ?? campo.predefinito ?? 0)}
            onChange={(e) => onCambia(campo.id, Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </label>
      );

    case "interruttore":
      return (
        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
          <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300">{campo.nome}</span>
          <input
            type="checkbox"
            checked={Boolean(v)}
            onChange={(e) => onCambia(campo.id, e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
        </label>
      );

    default:
      return (
        <label className="block">
          <span className={ETICHETTA}>{campo.nome}</span>
          <input
            value={String(v ?? "")}
            placeholder={campo.esempio}
            onChange={(e) => onCambia(campo.id, e.target.value)}
            className={CASELLA}
          />
        </label>
      );
  }
}

export default function Maschera({
  campi,
  valori,
  onCambia,
}: {
  campi: Campo[];
  valori: Valori;
  onCambia: (id: string, v: string | number | boolean) => void;
}) {
  const gruppi: { nome: string; campi: Campo[] }[] = [];
  for (const c of campi) {
    const nome = c.gruppo || "Contenuto";
    const g = gruppi.find((x) => x.nome === nome);
    if (g) g.campi.push(c);
    else gruppi.push({ nome, campi: [c] });
  }

  return (
    <div className="space-y-6">
      {gruppi.map((g, i) => (
        <div key={g.nome} className={i > 0 ? "pt-6 border-t border-gray-100 dark:border-gray-700" : undefined}>
          <h3 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-3">{g.nome}</h3>
          <div className="space-y-4">
            {g.campi.map((c) => (
              <CampoSingolo key={c.id} campo={c} valori={valori} onCambia={onCambia} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
