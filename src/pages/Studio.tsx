/*
 * Lo Studio: si scrive a sinistra, si guarda a destra, si scarica.
 *
 * Tre regole che vengono da quello che non funzionava nei pannelli
 * esistenti:
 *
 * 1. L'anteprima e il file sono lo STESSO componente (`Tela`) a due
 *    ingrandimenti. Non c'e' un disegno per lo schermo e uno per la
 *    cattura, quindi non possono divergere.
 * 2. L'anteprima sta ferma mentre si scrive (`sticky`): scendendo nel
 *    modulo, nei pannelli vecchi usciva dallo schermo proprio mentre si
 *    regolava cio' che modificava.
 * 3. Il nodo da esportare vive fuori schermo a 1080, sempre montato. Non
 *    si costruisce al momento del clic: costruirlo li' vuol dire
 *    catturarlo prima che le immagini siano caricate, ed e' la ragione
 *    classica dei PNG con i buchi.
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Tela from "../studio/Tela";
import Maschera from "../studio/Maschera";
import { MODELLI } from "../studio/modelli";
import { FORMATI, type Modello, type Valori } from "../studio/tipi";
import { catturaSicura, nomeFile, scarica } from "../studio/esporta";
import { IcAggiungi, IcAttesa, IcElimina, IcScarica, IcSelezione } from "../components/ui/AcIcons";

function valoriIniziali(m: Modello): Valori {
  const v: Valori = {};
  for (const c of m.campi) if (c.predefinito !== undefined) v[c.id] = c.predefinito;
  return v;
}

export default function Studio() {
  const [modello, setModello] = useState<Modello>(MODELLI[0]);
  const [variante, setVariante] = useState<string>(MODELLI[0].varianti?.[0]?.id ?? "");
  const [schede, setSchede] = useState<Valori[]>([valoriIniziali(MODELLI[0])]);
  const [attiva, setAttiva] = useState(0);
  const [riquadri, setRiquadri] = useState(false);
  const [lavoro, setLavoro] = useState<string>("");

  const fmt = FORMATI[modello.formato] ?? FORMATI.storia;
  const valori = schede[attiva] ?? {};

  // Il nodo a piena risoluzione, uno per scheda, fuori schermo.
  const nodi = useRef<(HTMLDivElement | null)[]>([]);

  const cambiaModello = (id: string) => {
    const m = MODELLI.find((x) => x.id === id);
    if (!m) return;
    setModello(m);
    setVariante(m.varianti?.[0]?.id ?? "");
    setSchede([valoriIniziali(m)]);
    setAttiva(0);
  };

  const cambia = (campo: string, v: string | number | boolean) =>
    setSchede((s) => s.map((x, i) => (i === attiva ? { ...x, [campo]: v } : x)));

  const aggiungiScheda = () => {
    setSchede((s) => [...s, valoriIniziali(modello)]);
    setAttiva(schede.length);
  };

  const togliScheda = (i: number) => {
    if (schede.length === 1) return;
    setSchede((s) => s.filter((_, k) => k !== i));
    setAttiva((a) => (a >= i && a > 0 ? a - 1 : a));
  };

  const esporta = async (tutte: boolean) => {
    const indici = tutte ? schede.map((_, i) => i) : [attiva];
    for (const i of indici) {
      const nodo = nodi.current[i];
      if (!nodo) continue;
      setLavoro(tutte ? `Scheda ${i + 1} di ${indici.length}…` : "Preparo il file…");
      try {
        const png = await catturaSicura(nodo, modello);
        scarica(png, nomeFile(modello, modello.multiplo ? i : undefined));
      } catch (e) {
        console.error("esportazione fallita", e);
        setLavoro("Non sono riuscito a creare il file. Riprova.");
        return;
      }
    }
    setLavoro("");
  };

  // Larghezza dell'anteprima: una storia e un quadrato non possono avere
  // la stessa larghezza, o la storia esce dallo schermo in altezza.
  const largaAnteprima = useMemo(() => (fmt.altezza / fmt.larghezza > 1.5 ? 270 : 340), [fmt]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-40 px-4 md:px-8 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="h-[54px] flex items-center gap-4">
          <span className="font-bold tracking-[0.18em] text-[13px]">STUDIO</span>
          <select
            value={modello.id}
            onChange={(e) => cambiaModello(e.target.value)}
            aria-label="Il modello da usare"
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[13px] font-semibold"
          >
            {MODELLI.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <span className="hidden lg:block text-[12px] text-gray-500 dark:text-gray-400">{modello.descrizione}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/dashboard" className="px-3 py-2 text-[13px] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              Dashboard
            </Link>
            {modello.multiplo && schede.length > 1 && (
              <button
                onClick={() => esporta(true)}
                disabled={!!lavoro}
                className="px-3 py-2 rounded-lg text-[13px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Scarica tutte ({schede.length})
              </button>
            )}
            <button
              onClick={() => esporta(false)}
              disabled={!!lavoro}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
            >
              {lavoro ? <IcAttesa className="w-4 h-4 animate-spin" /> : <IcScarica className="w-4 h-4" />}
              {lavoro || "Scarica"}
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,480px)_auto] gap-12 items-start justify-center">
        <div className="min-w-0">
          {modello.varianti && modello.varianti.length > 1 && (
            <div className="mb-6">
              <h3 className="text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-3">Variante</h3>
              <div className="flex flex-wrap gap-2">
                {modello.varianti.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariante(v.id)}
                    aria-pressed={variante === v.id}
                    className={`px-3 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
                      variante === v.id
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {v.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modello.multiplo && (
            <div className="mb-6">
              <h3 className="text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-3">Schede</h3>
              <div className="flex flex-wrap items-center gap-2">
                {schede.map((_, i) => (
                  <span key={i} className="relative">
                    <button
                      onClick={() => setAttiva(i)}
                      aria-current={attiva === i ? "true" : undefined}
                      className={`w-10 h-10 rounded-lg text-[13px] font-semibold border tabular-nums transition-colors ${
                        attiva === i
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {i + 1}
                    </button>
                    {schede.length > 1 && (
                      <button
                        onClick={() => togliScheda(i)}
                        aria-label={`Togli la scheda ${i + 1}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-red-600 flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100"
                      >
                        <IcElimina className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                <button
                  onClick={aggiungiScheda}
                  className="w-10 h-10 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center"
                  aria-label="Aggiungi una scheda"
                >
                  <IcAggiungi className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <Maschera campi={modello.campi} valori={valori} onCambia={cambia} />
        </div>

        <div className="lg:sticky lg:top-[86px] justify-self-center lg:justify-self-start">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <Tela modello={modello} valori={valori} variante={variante} larghezza={largaAnteprima} mostraRiquadri={riquadri} />
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="tabular-nums">
                {fmt.nome} · {fmt.larghezza}×{fmt.altezza}
              </span>
              <button onClick={() => setRiquadri((r) => !r)} className="flex items-center gap-1.5 font-semibold hover:text-gray-900 dark:hover:text-gray-100">
                <IcSelezione className="w-3.5 h-3.5" />
                {riquadri ? "Nascondi i riquadri" : "Mostra i riquadri"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/*
        I nodi veri da catturare: 1080 di larghezza, fuori dallo schermo.
        Non `display:none` — un nodo senza dimensioni farebbe misurare il
        testo adattivo su un'altezza di zero, e uscirebbe un file con le
        scritte rimpicciolite fino a sparire.
      */}
      <div aria-hidden style={{ position: "fixed", left: "-20000px", top: 0, pointerEvents: "none" }}>
        {schede.map((v, i) => (
          <Tela
            key={i}
            modello={modello}
            valori={v}
            variante={variante}
            larghezza={fmt.larghezza}
            tela={(n: HTMLDivElement | null) => {
              nodi.current[i] = n;
            }}
          />
        ))}
      </div>
    </div>
  );
}
