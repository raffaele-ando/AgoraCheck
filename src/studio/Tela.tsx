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
import type { Elemento, ElementoForma, ElementoImmagine, ElementoSerie, ElementoTesto, Modello, Valori } from "./tipi";
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
/**
 * Quanto il testo puo' rimpicciolirsi prima di smettere di essere un
 * post e diventare una macchia grigia.
 *
 * Senza un limite la ricerca scendeva fino al 22% del corpo dichiarato:
 * provato con un messaggio da 600 caratteri, «30 maggio» finiva in una
 * riga alta due pixel — illeggibile, ed esportata cosi' senza che
 * nessuno se ne accorgesse. Sotto il 62% si smette di rimpicciolire: il
 * testo strabordera' un poco, e chi scrive lo vede nell'anteprima invece
 * di scoprirlo dopo aver pubblicato.
 */
const MINIMO = 0.62;

function TestoAdattivo({
  testo,
  corpoPx,
  adatta,
  stile,
  onNonEntra,
}: {
  testo: string;
  corpoPx: number;
  adatta: boolean;
  stile: React.CSSProperties;
  onNonEntra?: (entra: boolean) => void;
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
      onNonEntra?.(true);
      return;
    }
    const minimo = corpoPx * MINIMO;
    if (!entra(minimo)) {
      // Non ci sta nemmeno al minimo: si resta al minimo e si segnala.
      m.style.fontSize = "";
      setCorpo(minimo);
      onNonEntra?.(false);
      return;
    }
    let basso = minimo;
    let alto = corpoPx;
    for (let i = 0; i < 12; i++) {
      const mezzo = (basso + alto) / 2;
      if (entra(mezzo)) basso = mezzo;
      else alto = mezzo;
    }
    m.style.fontSize = "";
    setCorpo(basso);
    onNonEntra?.(true);
  }, [testo, corpoPx, adatta, stile.fontWeight, stile.letterSpacing, stile.lineHeight, onNonEntra]);

  return (
    <div ref={contenitore} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: stile.justifyContent, overflow: "hidden" }}>
      {/* Il gemello invisibile su cui si misura: cambiare il corpo del
          testo vero a ogni tentativo farebbe lampeggiare la pagina. */}
      <div
        ref={misura}
        aria-hidden
        style={{ ...stile, position: "absolute", visibility: "hidden", pointerEvents: "none", width: "100%", height: "auto", justifyContent: undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
      >
        {testo}
      </div>
      {/* `anywhere`: una parola piu' larga del riquadro va a capo invece
          di costringere tutto il testo a rimpicciolirsi per starci. */}
      <div style={{ ...stile, fontSize: `${corpo}px`, justifyContent: undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere", width: "100%" }}>{testo}</div>
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

/**
 * Da riquadro a posizione sullo schermo.
 *
 * Le misure verticali sono in unita' di larghezza (vedi `Riquadro`),
 * quindi si convertono in pixel e non in percentuali: una percentuale
 * verticale in CSS si misura sull'altezza del genitore, che e' proprio
 * cio' che qui non deve contare.
 */
function posizione(el: Elemento, larghezza: number, altezza: number): React.CSSProperties {
  const px = (v: number) => (v / 100) * larghezza;
  const alto = px(el.riquadro.altezza);
  return {
    position: "absolute",
    left: `${el.riquadro.x}%`,
    top: el.riquadro.dalBasso
      ? `${altezza - px(el.riquadro.y) - alto}px`
      : `${px(el.riquadro.y)}px`,
    width: `${el.riquadro.larghezza}%`,
    height: `${alto}px`,
    transform: el.rotazione ? `rotate(${el.rotazione}deg)` : undefined,
    zIndex: el.piano,
  };
}

function Testo({
  el, valori, larghezza, altezza, onNonEntra,
}: {
  el: ElementoTesto; valori: Valori; larghezza: number; altezza: number;
  onNonEntra?: (campo: string, entra: boolean) => void;
}) {
  const testo = el.fisso ?? valore(valori, el.campo);
  if (!testo) return null;
  const colore = el.campoColore ? valore(valori, el.campoColore) || el.colore : el.colore;
  // Il corpo si misura sulla LARGHEZZA: su Instagram e' sempre 1080 e a
  // cambiare e' solo l'altezza, quindi la stessa scritta resta la stessa
  // in tutti i formati.
  const corpoPx = (el.corpo / 100) * larghezza;
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
    fontStyle: el.corsivo ? "italic" : undefined,
    fontFamily: el.famiglia,
    fontSize: `${corpoPx}px`,
  };
  return (
    <div style={{ ...posizione(el, larghezza, altezza), display: "flex" }}>
      <TestoAdattivo
        testo={testo}
        corpoPx={corpoPx}
        adatta={el.adatta !== false}
        stile={stile}
        onNonEntra={el.campo ? (entra) => onNonEntra?.(el.campo!, entra) : undefined}
      />
    </div>
  );
}

function Immagine({ el, valori, larghezza, altezza }: { el: ElementoImmagine; valori: Valori; larghezza: number; altezza: number }) {
  const src = el.fonte ?? valore(valori, el.campo);
  if (!src) return null;
  return (
    <div style={{ ...posizione(el, larghezza, altezza), overflow: "hidden", borderRadius: el.raggio ? `${(el.raggio / 100) * larghezza}px` : undefined, opacity: opacita(el, valori, el.opacita) }}>
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{ width: "100%", height: "100%", objectFit: el.riempimento ?? "cover", display: "block" }}
      />
    </div>
  );
}

function Forma({ el, valori, larghezza, altezza }: { el: ElementoForma; valori: Valori; larghezza: number; altezza: number }) {
  const colore = el.campoColore ? valore(valori, el.campoColore) || el.colore : el.colore;
  return (
    <div
      style={{
        ...posizione(el, larghezza, altezza),
        background: el.sfumaA ? `linear-gradient(${el.angolo ?? 180}deg, ${colore}, ${el.sfumaA})` : colore,
        borderRadius: el.forma === "ellisse" ? "50%" : el.raggio ? `${(el.raggio / 100) * larghezza}px` : undefined,
        border: el.bordo
          ? `${(el.bordo / 100) * larghezza}px ${el.tratteggiato ? "dashed" : "solid"} ${el.coloreBordo ?? colore}`
          : undefined,
        boxSizing: "border-box",
        opacity: opacita(el, valori, el.opacita),
      }}
    />
  );
}

/**
 * La barra dei pallini. I segni si allineano sul CENTRO del riquadro, non
 * sul bordo alto: acceso e spento hanno altezze diverse, e allineandoli
 * in alto la barra sembrerebbe scendere man mano che si avanza.
 */
function Serie({ el, valori, indice, larghezza, altezza }: { el: ElementoSerie; valori: Valori; indice: number; larghezza: number; altezza: number }) {
  const accesi =
    el.accesiDa === "indice"
      ? indice + 1
      : el.campoAccesi !== undefined
        ? Number(valori[el.campoAccesi] ?? el.accesi ?? 0)
        : (el.accesi ?? 0);
  const segni = [];
  for (let i = 0; i < el.quanti; i++) {
    const s = i < accesi ? el.acceso : el.spento;
    segni.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${el.inizio + i * el.passo}%`,
          top: "50%",
          transform: "translateY(-50%)",
          width: `${s.larghezza}%`,
          height: `${(s.altezza / 100) * ((el.riquadro.altezza / 100) * larghezza)}px`,
          background: s.colore,
          borderRadius: s.raggio === undefined ? "999px" : `${s.raggio}%`,
        }}
      />,
    );
  }
  // Il riquadro della serie e' sempre largo quanto il formato: cosi' le
  // percentuali dei segni sono le stesse del resto del modello.
  return (
    <div style={{ ...posizione(el, larghezza, altezza), left: 0, width: "100%" }}>{segni}</div>
  );
}

export interface TelaProps {
  modello: Modello;
  valori: Valori;
  /** L'id della variante scelta; senza, vale il modello nudo. */
  variante?: string;
  /** La larghezza in pixel a cui disegnare. L'altezza segue il formato. */
  larghezza: number;
  /** Quale scheda e' questa, contando da zero: la barra ci si basa. */
  indice?: number;
  /**
   * Avvisa quando un campo non entra nel suo riquadro nemmeno al corpo
   * minimo. Serve a dirlo a chi scrive mentre scrive, invece di lasciare
   * che lo scopra dal post pubblicato.
   */
  onNonEntra?: (campo: string, entra: boolean) => void;
  /** Mostra i bordi dei riquadri: serve solo mentre si mette a punto. */
  mostraRiquadri?: boolean;
  tela?: React.Ref<HTMLDivElement>;
}

export default function Tela({ modello, valori, variante, larghezza, indice = 0, mostraRiquadri, tela, onNonEntra }: TelaProps) {
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
      data-tela=""
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
          <div key={`${el.id}-b`} style={{ ...posizione(el, larghezza, altezza), outline: "1px dashed rgba(99,102,241,.8)", pointerEvents: "none", zIndex: 999 }} />
        ) : null;
        const disegno =
          el.tipo === "testo" ? (
            <Testo key={el.id} el={el} valori={valori} larghezza={larghezza} altezza={altezza} onNonEntra={onNonEntra} />
          ) : el.tipo === "immagine" ? (
            <Immagine key={el.id} el={el} valori={valori} larghezza={larghezza} altezza={altezza} />
          ) : el.tipo === "serie" ? (
            <Serie key={el.id} el={el} valori={valori} indice={indice} larghezza={larghezza} altezza={altezza} />
          ) : (
            <Forma key={el.id} el={el} valori={valori} larghezza={larghezza} altezza={altezza} />
          );
        return bordo ? [disegno, bordo] : disegno;
      })}
    </div>
  );
}
