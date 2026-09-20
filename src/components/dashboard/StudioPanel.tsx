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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../studio/caratteri.css";
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

/** I valori che cambiano a ogni scheda. */
/**
 * Come si chiama una scheda nell'elenco.
 *
 * Il suo contenuto, non il suo numero. Un carosello arriva a venti
 * spotted: una fila di venti bottoni numerati dice dove sei ma non cosa
 * c'e' dentro, e per ritrovare quello da correggere li devi aprire a uno
 * a uno. Il primo campo di testo pieno e' quasi sempre la cosa che lo
 * distingue.
 */
function etichettaScheda(m: Modello, v: Valori): string {
  const testi = m.campi.filter(
    (c) => c.ambito !== "progetto" && (c.tipo === "testo" || c.tipo === "paragrafo"),
  );
  // Il campo piu' lungo scritto e' quello che identifica la scheda: in uno
  // spotted e' il messaggio, non la data.
  let migliore = "";
  for (const c of testi) {
    const s = String(v[c.id] ?? "").trim();
    if (s.length > migliore.length) migliore = s;
  }
  return migliore.replace(/\s+/g, " ");
}

function valoriScheda(m: Modello): Valori {
  const v: Valori = {};
  for (const c of m.campi)
    if (c.ambito !== "progetto" && c.predefinito !== undefined) v[c.id] = c.predefinito;
  return v;
}

/** I valori che valgono per tutto il progetto, scritti una volta sola. */
function valoriProgetto(m: Modello): Valori {
  const v: Valori = {};
  for (const c of m.campi)
    if (c.ambito === "progetto" && c.predefinito !== undefined) v[c.id] = c.predefinito;
  return v;
}

export default function StudioPanel() {
  const [modello, setModello] = useState<Modello>(MODELLI[0]);
  const [variante, setVariante] = useState<string>(MODELLI[0].varianti?.[0]?.id ?? "");
  const [schede, setSchede] = useState<Valori[]>([valoriScheda(MODELLI[0])]);
  const [progetto, setProgetto] = useState<Valori>(valoriProgetto(MODELLI[0]));
  const [attiva, setAttiva] = useState(0);
  const [riquadri, setRiquadri] = useState(false);
  const [lavoro, setLavoro] = useState<string>("");
  /** I campi che non entrano nel loro riquadro, per la scheda aperta. */
  const [stretti, setStretti] = useState<string[]>([]);
  const segnala = useCallback((campo: string, entra: boolean) => {
    setStretti((s) => (entra ? (s.includes(campo) ? s.filter((x) => x !== campo) : s) : s.includes(campo) ? s : [...s, campo]));
  }, []);

  const fmt = FORMATI[modello.formato] ?? FORMATI.storia;
  // La tela riceve un insieme solo: i valori del progetto stanno sotto,
  // quelli della scheda sopra. Cosi' il modello non deve sapere da dove
  // arriva ciascun valore — dichiara l'ambito e basta.
  const valoriDi = (i: number): Valori => ({ ...progetto, ...(schede[i] ?? {}) });
  const valori = valoriDi(attiva);
  const campiProgetto = modello.campi.filter((c) => c.ambito === "progetto");
  const campiScheda = modello.campi.filter((c) => c.ambito !== "progetto");

  // Il nodo a piena risoluzione, uno per scheda, fuori schermo.
  const nodi = useRef<(HTMLDivElement | null)[]>([]);

  const cambiaModello = (id: string) => {
    const m = MODELLI.find((x) => x.id === id);
    if (!m) return;
    setModello(m);
    setVariante(m.varianti?.[0]?.id ?? "");
    setSchede([valoriScheda(m)]);
    setProgetto(valoriProgetto(m));
    setAttiva(0);
  };

  const cambia = (campo: string, v: string | number | boolean) =>
    setSchede((s) => s.map((x, i) => (i === attiva ? { ...x, [campo]: v } : x)));

  const cambiaProgetto = (campo: string, v: string | number | boolean) =>
    setProgetto((p) => ({ ...p, [campo]: v }));

  const aggiungiScheda = () => {
    setSchede((s) => [...s, valoriScheda(modello)]);
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
  // Sul telefono l'anteprima sta appiccicata in alto accanto ai tasti,
  // quindi dev'essere piccola: presa tutta la larghezza mangerebbe meta'
  // schermo e non resterebbe spazio per scrivere.
  const [stretto, setStretto] = useState(() => {
    try { return window.innerWidth < 768; } catch { return false; }
  });
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const f = () => setStretto(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  const largaAnteprima = useMemo(() => {
    const alto = fmt.altezza / fmt.larghezza > 1.5;
    if (stretto) return alto ? 96 : 120;
    return alto ? 260 : 330;
  }, [fmt, stretto]);

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
        </div>

        {/*
          Sul telefono l'anteprima sta SOPRA il modulo e resta in vista
          mentre si scrive (`order` e `sticky`). Prima stava sotto, e
          scrivendo non si vedeva il risultato: in un programma che serve
          a comporre un'immagine e' il difetto piu' grave possibile — si
          scriveva alla cieca e si scorreva in fondo a ogni parola.
          Su schermo largo ci stanno affiancate e l'ordine torna quello
          naturale, il modulo a sinistra.
        */}
        {/*
          Colonna flessibile sul telefono, griglia su schermo largo.
          Non e' un vezzo: dentro una griglia il riquadro appiccicato
          puo' scorrere solo dentro la propria riga, che e' alta quanto
          lui — quindi non si attacca affatto. In una colonna flessibile
          il riferimento e' tutta la colonna, ed e' alta quanto la
          pagina.
        */}
        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] gap-6 md:items-start">
          <div className="min-w-0 space-y-6 order-2 md:order-1">
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

              {campiProgetto.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <Maschera campi={campiProgetto} valori={progetto} onCambia={cambiaProgetto} />
                </div>
              )}
            </div>

                        {/* Cio' che cambia a ogni scheda. */}
            <div className={`${SCHEDA} p-4 md:p-6`}>
              {/*
                L'elenco delle schede, con dentro cio' che contengono.
                In fila verticale e non a bottoni numerati: un carosello
                arriva a venti schede, e una fila di numeri dice dove sei
                ma non cosa c'e' dentro — quella da correggere la ritrovi
                solo aprendole a una a una.
              */}
              {modello.multiplo && (
                <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-700">
                  <h2 className={`${TITOLETTO} mb-3`}>
                    {schede.length === 1 ? "1 scheda" : `${schede.length} schede`}
                  </h2>
                  <ol className="space-y-1">
                    {schede.map((v, i) => {
                      const et = etichettaScheda(modello, { ...progetto, ...v });
                      return (
                        <li key={i} className="flex items-center gap-1">
                          <button
                            onClick={() => setAttiva(i)}
                            aria-current={attiva === i ? "true" : undefined}
                            className={`flex-1 min-w-0 text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-3 transition-colors ${
                              attiva === i
                                ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            <span className="tabular-nums font-bold shrink-0 w-5">{i + 1}</span>
                            <span className={`truncate ${et ? "font-semibold" : "italic text-gray-600 dark:text-gray-400"}`}>
                              {et || "vuota"}
                            </span>
                          </button>
                          {schede.length > 1 && (
                            <button
                              onClick={() => togliScheda(i)}
                              aria-label={`Togli la scheda ${i + 1}`}
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <IcElimina className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <button
                    onClick={aggiungiScheda}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-[13px] font-bold text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors"
                  >
                    <IcAggiungi className="w-4 h-4" />
                    Aggiungi una scheda
                  </button>
                </div>
              )}
              <Maschera campi={campiScheda} valori={valori} onCambia={cambia} stretti={stretti} />
            </div>
          </div>

          <div className="order-1 md:order-2 sticky top-[54px] md:top-[78px] z-20 justify-self-stretch md:justify-self-start -mx-4 md:mx-0 px-4 md:px-0 pt-2 pb-3 md:p-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur md:bg-transparent md:backdrop-blur-none">
            <div className={`${SCHEDA} p-3 md:p-4 flex md:block items-start gap-3`}>
              <Tela modello={modello} valori={valori} variante={variante} larghezza={largaAnteprima} indice={attiva} mostraRiquadri={riquadri} onNonEntra={segnala} />
              {/* Sul telefono il tasto Scarica sta qui, accanto
                  all'anteprima: nella riga del titolo usciva dallo
                  schermo appena si cominciava a scrivere. */}
              <div className="md:hidden flex-1 min-w-0 flex flex-col gap-2">
                <button onClick={() => esporta(false)} disabled={!!lavoro} className={`${BOTTONE_PIENO} w-full flex items-center justify-center gap-2`}>
                  {lavoro ? <IcAttesa className="w-4 h-4 animate-spin" /> : <IcScarica className="w-4 h-4" />}
                  {lavoro || "Scarica"}
                </button>
                {modello.multiplo && schede.length > 1 && (
                  <button onClick={() => esporta(true)} disabled={!!lavoro} className={`${BOTTONE_VUOTO} w-full`}>
                    Tutte ({schede.length})
                  </button>
                )}
                <span className="text-[11px] tabular-nums text-gray-600 dark:text-gray-400">
                  {fmt.nome} · {fmt.larghezza}×{fmt.altezza}
                </span>
              </div>
              {/* I tasti stanno QUI e non nella riga del titolo: il
                  riquadro dell'anteprima e' appiccicato, la riga del
                  titolo no — e scorrendo per scrivere il tasto Scarica
                  usciva dallo schermo proprio mentre serviva. L'azione
                  sta con la cosa su cui agisce. */}
              <div className="hidden md:flex mt-3 gap-2">
                <button onClick={() => esporta(false)} disabled={!!lavoro} className={`${BOTTONE_PIENO} flex-1 flex items-center justify-center gap-2`}>
                  {lavoro ? <IcAttesa className="w-4 h-4 animate-spin" /> : <IcScarica className="w-4 h-4" />}
                  {lavoro || "Scarica"}
                </button>
                {modello.multiplo && schede.length > 1 && (
                  <button onClick={() => esporta(true)} disabled={!!lavoro} className={BOTTONE_VUOTO}>
                    Tutte ({schede.length})
                  </button>
                )}
              </div>
              <div className="hidden md:flex mt-3 items-center justify-between gap-4 text-[11px]">
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
        {schede.map((_, i) => (
          <Tela
            key={i}
            modello={modello}
            valori={valoriDi(i)}
            indice={i}
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
