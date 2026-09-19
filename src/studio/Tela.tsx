/*
 * La tela: disegna un modello qualunque, a qualunque dimensione.
 *
 * Un solo componente per l'anteprima e per l'esportazione. Nei due
 * pannelli esistenti invece il disegno e' scritto due volte — una per lo
 * schermo e una per il nodo da catturare — ed e' il motivo per cui
 * l'anteprima e il file scaricato non sempre coincidono: sono due codici
 * che devono restare uguali a mano.
 *
 * Qui c'e' un solo codice e un solo numero da cambiare, `larghezza`.
 * Tutto il resto e' in percentuale, quindi l'anteprima da 270 pixel e il
 * file da 1080 sono la stessa immagine a due ingrandimenti diversi.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { Elemento, ElementoForma, ElementoImmagine, ElementoTesto, Modello, Valori } from "./tipi";
import { FORMATI } from "./tipi";

/**
 * Testo che si rimpicciolisce finche' non entra.
 *
 * Chi scrive un post non deve contare i caratteri per far tornare una
 * riga: scrive, e il corpo si adatta. La ricerca e' dicotomica — al piu'
 * una dozzina di passaggi invece di scendere di un pixel alla volta,
 * perche' ogni tentativo costa una rilettura della disposizione e a 20
 * riquadri per scheda la differenza si vede.
 */
function TestoAdattivo({
  testo,
  corpoPx,
  adatta,
  stile,
}: {
  testo: string;
  corpoPx: number;
  adatta: boolean;
  stile: React.CSSProperties;
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const misura = useRef<HTMLDivElement>(null);
  const [corpo, setCorpo] = useState(corpoPx);

  useLayoutEffect(() => {
    if (!adatta) {
      setCorpo(corpoPx);
      return;
    }
    const c = contenitore.current;
    const m = misura.current;
    if (!c || !m) return;

    const entra = (px: number) => {
      m.style.fontSize = `${px}px`;
      return m.scrollHeight <= c.clientHeight + 1 && m.scrollWidth <= c.clientWidth + 1;
    };

    if (entra(corpoPx)) {
      setCorpo(corpoPx);
      return;
    }
    let basso = corpoPx * 0.22;
    let alto = corpoPx;
    for (let i = 0; i < 12; i++) {
      const mezzo = (basso + alto) / 2;
      if (entra(mezzo)) basso = mezzo;
      else alto = mezzo;
    }
    m.style.fontSize = "";
    setCorpo(basso);
  }, [testo, corpoPx, adatta, stile.fontWeight, stile.letterSpacing, stile.lineHeight]);

  return (
    <div ref={contenitore} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: stile.justifyContent, overflow: "hidden" }}>
      {/* Il gemello invisibile su cui si misura: cambiare il corpo del
          testo vero a ogni tentativo farebbe lampeggiare la pagina. */}
      <div
        ref={misura}
        aria-hidden
        style={{ ...stile, position: "absolute", visibility: "hidden", pointerEvents: "none", width: "100%", height: "auto", justifyContent: undefined, whiteSpace: "pre-wrap" }}
      >
        {testo}
      </div>
      <div style={{ ...stile, fontSize: `${corpo}px`, justifyContent: undefined, whiteSpace: "pre-wrap", width: "100%" }}>{testo}</div>
    </div>
  );
}

function valore(valori: Valori, chiave?: string): string {
  if (!chiave) return "";
  const v = valori[chiave];
  return v === undefined || v === null ? "" : String(v);
}

/** Un elemento si nasconde se il campo che lo governa e' vuoto o spento. */
function visibile(el: Elemento, valori: Valori): boolean {
  if (!el.seCampo) return true;
  const v = valori[el.seCampo];
  if (typeof v === "boolean") return v;
  return v !== undefined && v !== null && String(v).trim() !== "";
}

/** L'opacita' dichiarata, o quella scelta nel campo indicato. */
function opacita(el: Elemento, valori: Valori, fissa?: number): number | undefined {
  if (!el.campoOpacita) return fissa;
  const v = Number(valori[el.campoOpacita]);
  return Number.isFinite(v) ? v / 100 : fissa;
}

function posizione(el: Elemento): React.CSSProperties {
  return {
    position: "absolute",
    left: `${el.riquadro.x}%`,
    top: `${el.riquadro.y}%`,
    width: `${el.riquadro.larghezza}%`,
    height: `${el.riquadro.altezza}%`,
    transform: el.rotazione ? `rotate(${el.rotazione}deg)` : undefined,
    zIndex: el.piano,
  };
}

function Testo({ el, valori, larghezza, altezza }: { el: ElementoTesto; valori: Valori; larghezza: number; altezza: number }) {
  const testo = el.fisso ?? valore(valori, el.campo);
  if (!testo) return null;
  const colore = el.campoColore ? valore(valori, el.campoColore) || el.colore : el.colore;
  // Il corpo e' in percentuale dell'altezza del formato: cosi' lo stesso
  // modello portato da 1920 a 1350 resta proporzionato invece di
  // diventare gigantesco.
  const corpoPx = (el.corpo / 100) * altezza;
  const stile: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: el.verticale ?? "flex-start",
    color: colore,
    fontWeight: el.peso ?? 700,
    textAlign: el.allineamento ?? "left",
    lineHeight: el.interlinea ?? 1.1,
    letterSpacing: el.spaziatura ? `${el.spaziatura}em` : undefined,
    textTransform: el.maiuscolo ? "uppercase" : undefined,
    fontFamily: el.famiglia,
    fontSize: `${corpoPx}px`,
  };
  return (
    <div style={{ ...posizione(el), display: "flex" }}>
      <TestoAdattivo testo={testo} corpoPx={corpoPx} adatta={el.adatta !== false} stile={stile} />
    </div>
  );
}

function Immagine({ el, valori }: { el: ElementoImmagine; valori: Valori }) {
  const src = el.fonte ?? valore(valori, el.campo);
  if (!src) return null;
  return (
    <div style={{ ...posizione(el), overflow: "hidden", borderRadius: el.raggio ? `${el.raggio}%` : undefined, opacity: opacita(el, valori, el.opacita) }}>
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{ width: "100%", height: "100%", objectFit: el.riempimento ?? "cover", display: "block" }}
      />
    </div>
  );
}

function Forma({ el, valori }: { el: ElementoForma; valori: Valori }) {
  const colore = el.campoColore ? valore(valori, el.campoColore) || el.colore : el.colore;
  return (
    <div
      style={{
        ...posizione(el),
        background: el.sfumaA ? `linear-gradient(${el.angolo ?? 180}deg, ${colore}, ${el.sfumaA})` : colore,
        borderRadius: el.forma === "ellisse" ? "50%" : el.raggio ? `${el.raggio}%` : undefined,
        opacity: opacita(el, valori, el.opacita),
      }}
    />
  );
}

export interface TelaProps {
  modello: Modello;
  valori: Valori;
  /** L'id della variante scelta; senza, vale il modello nudo. */
  variante?: string;
  /** La larghezza in pixel a cui disegnare. L'altezza segue il formato. */
  larghezza: number;
  /** Mostra i bordi dei riquadri: serve solo mentre si mette a punto. */
  mostraRiquadri?: boolean;
  tela?: React.Ref<HTMLDivElement>;
}

export default function Tela({ modello, valori, variante, larghezza, mostraRiquadri, tela }: TelaProps) {
  const fmt = FORMATI[modello.formato] ?? FORMATI.storia;
  const altezza = (larghezza / fmt.larghezza) * fmt.altezza;

  const v = modello.varianti?.find((x) => x.id === variante);
  const elementi: Elemento[] = modello.elementi.map((el) => {
    const r = v?.ritocchi?.[el.id];
    // Il ritocco non puo' cambiare il TIPO dell'elemento: sovrascrive
    // soltanto le proprieta' dichiarate, quindi l'unione resta valida.
    return r ? ({ ...(el as object), ...(r as object) } as Elemento) : el;
  });

  return (
    <div
      ref={tela}
      style={{
        position: "relative",
        width: `${larghezza}px`,
        height: `${altezza}px`,
        background: v?.fondo ?? modello.fondo ?? "#ffffff",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {elementi.map((el) => {
        if (!visibile(el, valori)) return null;
        const bordo = mostraRiquadri ? (
          <div key={`${el.id}-b`} style={{ ...posizione(el), outline: "1px dashed rgba(99,102,241,.8)", pointerEvents: "none", zIndex: 999 }} />
        ) : null;
        const disegno =
          el.tipo === "testo" ? (
            <Testo key={el.id} el={el} valori={valori} larghezza={larghezza} altezza={altezza} />
          ) : el.tipo === "immagine" ? (
            <Immagine key={el.id} el={el} valori={valori} />
          ) : (
            <Forma key={el.id} el={el} valori={valori} />
          );
        return bordo ? [disegno, bordo] : disegno;
      })}
    </div>
  );
}
