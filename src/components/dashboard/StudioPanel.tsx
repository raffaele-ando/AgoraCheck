/*
 * Lo Studio: si scrive a sinistra, si guarda a destra, si scarica.
 *
 * E' una scheda della dashboard come le altre, non una pagina a se':
 * l'intestazione, il fondo e i margini li mette il guscio che la
 * contiene, e qui dentro c'e' solo il contenuto. Averla fuori voleva
 * dire tenere in piedi una seconda intestazione che doveva restare
 * uguale alla prima a mano.
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
 *
 * L'aspetto non e' inventato qui: sono i mattoni gia' in uso altrove —
 * l'intestazione alta 54, il titolo da 26 nero, le schede bianche con
 * bordo e ombra leggera, le taglie 11/12/13. La prima versione l'avevo
 * scritta con classi decise sul momento, e si vedeva: una pagina con le
 * sue regole in mezzo a otto che ne seguivano un'altra.
 */
import { useMemo, useRef, useState } from "react";
import Tela from "../../studio/Tela";
import Maschera from "../../studio/Maschera";
import { MODELLI } from "../../studio/modelli";
import { FORMATI, type Modello, type Valori } from "../../studio/tipi";
import { catturaSicura, nomeFile, scarica } from "../../studio/esporta";
import { IcAggiungi, IcAttesa, IcElimina, IcScarica, IcSelezione } from "../ui/AcIcons";

/* I mattoni del sistema, scritti una volta sola invece che a ogni riga. */
const SCHEDA =
  "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm";
const TITOLETTO =
  "text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest";
const BOTTONE_PIENO =
  "px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const BOTTONE_VUOTO =
  "px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50";

function valoriIniziali(m: Modello): Valori {
  const v: Valori = {};
  for (const c of m.campi) if (c.predefinito !== undefined) v[c.id] = c.predefinito;
  return v;
}

export default function StudioPanel() {
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

  // Una storia e un quadrato non possono avere la stessa larghezza, o la
  // storia esce dallo schermo in altezza.
  const largaAnteprima = useMemo(() => (fmt.altezza / fmt.larghezza > 1.5 ? 260 : 330), [fmt]);

  return (
    <div className="w-full max-w-[1200px] mx-auto py-8 text-left">
      {/* L'intestazione e' quella della dashboard: stessa altezza, stesso
          fondo velato, stesso bordo. Cambiando pagina non deve sembrare
          di aver cambiato programma. */}

      <div>
        {/* Titolo di pagina come in Carosello e in Impostazioni: 26 nero,
            una riga sotto che dice cosa fa senza ripetere il titolo. */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] font-black tracking-tight text-gray-900 dark:text-gray-100">Studio</h1>
            <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-300">{modello.descrizione}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {modello.multiplo && schede.length > 1 && (
              <button onClick={() => esporta(true)} disabled={!!lavoro} className={BOTTONE_VUOTO}>
                Scarica tutte ({schede.length})
              </button>
            )}
            <button onClick={() => esporta(false)} disabled={!!lavoro} className={`${BOTTONE_PIENO} flex items-center gap-2`}>
              {lavoro ? <IcAttesa className="w-4 h-4 animate-spin" /> : <IcScarica className="w-4 h-4" />}
              {lavoro || "Scarica"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 items-start">
          <div className="min-w-0 space-y-6">
            {/* Il modello: una scheda sua, perche' e' la scelta che
                determina tutte le altre. Bottoni e non un menu a tendina —
                sono tre o quattro, e si vedono tutti in una volta. */}
            <div className={`${SCHEDA} p-4 md:p-6`}>
              <h2 className={`${TITOLETTO} mb-3`}>Modello</h2>
              <div className="flex flex-wrap gap-2">
                {MODELLI.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => cambiaModello(m.id)}
                    aria-pressed={modello.id === m.id}
                    className={`px-3 py-2 rounded-lg text-[13px] font-bold border transition-colors ${
                      modello.id === m.id
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>

              {modello.varianti && modello.varianti.length > 1 && (
                <>
                  <h2 className={`${TITOLETTO} mt-6 mb-3`}>Variante</h2>
                  <div className="flex flex-wrap gap-2">
                    {modello.varianti.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVariante(v.id)}
                        aria-pressed={variante === v.id}
                        className={`px-3 py-2 rounded-lg text-[13px] font-bold border transition-colors ${
                          variante === v.id
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {v.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {modello.multiplo && (
                <>
                  <h2 className={`${TITOLETTO} mt-6 mb-3`}>Schede</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {schede.map((_, i) => (
                      <span key={i} className="relative group">
                        <button
                          onClick={() => setAttiva(i)}
                          aria-current={attiva === i ? "true" : undefined}
                          className={`w-10 h-10 rounded-lg text-[13px] font-bold border tabular-nums transition-colors ${
                            attiva === i
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {i + 1}
                        </button>
                        {schede.length > 1 && (
                          <button
                            onClick={() => togliScheda(i)}
                            aria-label={`Togli la scheda ${i + 1}`}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <IcElimina className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    <button
                      onClick={aggiungiScheda}
                      aria-label="Aggiungi una scheda"
                      className="w-10 h-10 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center transition-colors"
                    >
                      <IcAggiungi className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Il contenuto: la scheda dove si scrive davvero. */}
            <div className={`${SCHEDA} p-4 md:p-6`}>
              <Maschera campi={modello.campi} valori={valori} onCambia={cambia} />
            </div>
          </div>

          <div className="lg:sticky lg:top-[78px] justify-self-center lg:justify-self-start">
            <div className={`${SCHEDA} p-4`}>
              <Tela modello={modello} valori={valori} variante={variante} larghezza={largaAnteprima} mostraRiquadri={riquadri} />
              <div className="mt-3 flex items-center justify-between gap-4 text-[11px]">
                <span className="tabular-nums text-gray-600 dark:text-gray-400">
                  {fmt.nome} · {fmt.larghezza}×{fmt.altezza}
                </span>
                <button
                  onClick={() => setRiquadri((r) => !r)}
                  className="flex items-center gap-1.5 font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <IcSelezione className="w-3.5 h-3.5" />
                  {riquadri ? "Nascondi i riquadri" : "Mostra i riquadri"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
