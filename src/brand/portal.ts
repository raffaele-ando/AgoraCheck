/**
 * La porta del marchio: geometria, tempi e matematica dell'apertura.
 *
 * Questo file è l'UNICA sorgente di quei numeri. Prima erano scritti due volte
 * — in `components/ui/Portal.tsx` per la bacheca e in un file JavaScript a sé
 * per Orbite — con un commento in cima a entrambi che diceva di tenerli
 * allineati. Un commento non allinea niente: i due si erano scollati davvero
 * (620/300/900 di qua, 780/240/1120 di là) e le due metà della stessa
 * transizione si muovevano a due velocità diverse. Ora una modifica qui vale
 * per tutti e due i siti, e non c'è modo di cambiarne uno solo.
 *
 * La geometria non è ridisegnata a occhio: è misurata dal logotipo e riprodotta
 * con archi di cerchio esatti. Una unità = un pixel del PNG originale;
 * l'origine è dove il cerchio che taglia le gambe degli archi tocca la linea di
 * base del logotipo.
 */

/** Cerchio che taglia le gambe degli archi. */
export const CUT_R = 164.319;
export const CUT_CY = -164.319;

export interface Arch {
  cx: number;
  cy: number;
  /** raggio esterno */
  ro: number;
  /** raggio interno */
  ri: number;
}

/** I cinque archi concentrici, dal più esterno al più interno. */
export const ARCHES: readonly Arch[] = [
  { cx: -0.004, cy: -97.725, ro: 144.008, ri: 136.116 },
  { cx: -0.108, cy: -96.286, ro: 117.483, ri: 109.534 },
  { cx: 0.187, cy: -96.716, ro: 90.429, ri: 82.566 },
  { cx: 0.185, cy: -96.026, ro: 65.143, ri: 57.311 },
  { cx: -0.339, cy: -94.476, ro: 40.294, ri: 32.453 },
];

/** Larghezza del marchio, in unità. */
export const MARK_W = 288.02;
/** Centro ottico del riquadro del marchio. */
export const MARK_CX = -0.004;
export const MARK_CY = -122.451;
/** Il vano dell'arco più interno è la porta. */
export const DOOR = ARCHES[4];
/** Quanto scende il vano sotto il proprio centro. */
export const DOOR_DOWN = 91.2;

/* --- tempi (ms) ---------------------------------------------------------- */

/** Comparsa e crescita fino alla misura del marchio. */
export const T_GROW = 620;
/**
 * Posa: il marchio composto resta fermo prima di aprirsi.
 *
 * Mancava, ed era il motivo della segnalazione "non si caricano tutte le porte
 * del brandmark". Tracciando le opacità fotogramma per fotogramma: l'arco più
 * esterno arrivava a piena opacità a 620 ms, cioè nell'istante esatto in cui
 * cominciava l'apertura. Non esisteva un momento in cui il marchio completo
 * stesse fermo abbastanza da leggersi.
 */
export const T_HOLD = 300;
/** Apertura accelerata oltre i bordi dello schermo. */
export const T_OPEN = 900;
export const T_TOTAL = T_GROW + T_HOLD + T_OPEN;

/**
 * Ritardo fra un arco e il successivo, e durata della loro comparsa.
 *
 * Calcolati perché l'ULTIMO arco sia già pieno prima che la crescita finisca:
 * 4 × 70 + 260 = 540 ms, contro i 620 della crescita. Con i valori precedenti
 * (4 × 80 + 300 = 620) l'ultimo arco finiva di comparire nello stesso istante
 * in cui partiva l'apertura.
 */
export const STAGGER = 70;
export const T_APPEAR = 260;

/*
  I colori NON seguono il tema chiaro/scuro, ed è voluto: sono quelli con cui
  Orbite si apre. Il senso dell'animazione è che il passaggio fra i due siti
  sembri un solo movimento; se sulla bacheca la porta fosse arancione su crema e
  di là crema su nero, lo stacco ricomparirebbe nel momento del salto.
*/
export const VEIL_INK = "#111111";
export const ARCH_CREAM = "#F4F1EA";

/**
 * Il segnale con cui la scena di Orbite dice all'apertura di essere pronta.
 *
 * Sono due file compilati a parte — l'apertura finisce dentro il documento, la
 * scena resta un file a sé — e comunicano solo attraverso questa classe su
 * <html>. Scriverla qui una volta sola è l'unico modo perché una svista nel
 * nome non si traduca in una porta che aspetta un segnale che non arriva mai.
 */
export const SCENE_READY = "scene-ready";

/* --- funzioni ------------------------------------------------------------ */

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => Math.pow(t, 2.4);
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const cutY = (dx: number) =>
  CUT_CY + Math.sqrt(Math.max(0, CUT_R * CUT_R - dx * dx));
/** Due decimali: nei tracciati SVG oltre non si vede e allunga la stringa. */
export const n2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Costruttore di tracciati a una data scala e posizione.
 *
 * Genera solo linee e archi di cerchio: nessuna approssimazione con curve.
 */
export function builder(s: number, px: number, py: number) {
  const X = (x: number) => n2(px + x * s);
  const Y = (y: number) => n2(py + y * s);
  const R = (r: number) => n2(r * s);
  return {
    M: (x: number, y: number) => `M${X(x)} ${Y(y)}`,
    L: (x: number, y: number) => `L${X(x)} ${Y(y)}`,
    // semicerchio superiore in due quarti: evita l'ambiguità dei 180°
    top: (cx: number, cy: number, r: number, dir: number) => {
      const f = dir > 0 ? "1" : "0";
      return (
        `A${R(r)} ${R(r)} 0 0 ${f} ${X(cx)} ${Y(cy - r)}` +
        `A${R(r)} ${R(r)} 0 0 ${f} ${X(cx + dir * r)} ${Y(cy)}`
      );
    },
    cut: (x: number, y: number) =>
      `A${R(CUT_R)} ${R(CUT_R)} 0 0 0 ${X(x)} ${Y(y)}`,
  };
}
export type Builder = ReturnType<typeof builder>;

/** Il contorno di un arco: gamba, semicerchio esterno, gamba, taglio, ritorno. */
export function archPath(a: Arch, b: Builder): string {
  const xoL = a.cx - a.ro;
  const xoR = a.cx + a.ro;
  const xiL = a.cx - a.ri;
  const xiR = a.cx + a.ri;
  return (
    b.M(xoL, cutY(xoL)) +
    b.L(xoL, a.cy) +
    b.top(a.cx, a.cy, a.ro, +1) +
    b.L(xoR, cutY(xoR)) +
    b.cut(xiR, cutY(xiR)) +
    b.L(xiR, a.cy) +
    b.top(a.cx, a.cy, a.ri, -1) +
    b.L(xiL, cutY(xiL)) +
    b.cut(xoL, cutY(xoL)) +
    "Z"
  );
}

/** Il vano della porta: è ciò che diventa la finestra sul sito. */
export function doorPath(b: Builder): string {
  const xL = DOOR.cx - DOOR.ri;
  const xR = DOOR.cx + DOOR.ri;
  return (
    b.M(xL, cutY(xL)) +
    b.L(xL, DOOR.cy) +
    b.top(DOOR.cx, DOOR.cy, DOOR.ri, +1) +
    b.L(xR, cutY(xR)) +
    b.cut(xL, cutY(xL)) +
    "Z"
  );
}

/**
 * La scala del marchio composto, per uno schermo di quella misura.
 *
 * È il numero che DEVE combaciare fra i due siti: la bacheca lascia il marchio
 * a questa scala e Orbite lo riprende dalla stessa, altrimenti sulla cucitura
 * il marchio fa un salto. Verificato: 0,520797 di qua e 0,520797 di là.
 */
export function logoScale(W: number, H: number): number {
  const target = Math.max(150, Math.min(Math.min(W, H) * 0.3, 340));
  return target / MARK_W;
}

/** Da dove parte la crescita: piccolo al centro. */
export function startScale(W: number, H: number): number {
  return logoScale(W, H) * 0.05;
}

/**
 * Dove arriva l'apertura: il vano deve contenere tutto lo schermo, angoli
 * compresi, con un margine perché la porta esca di scena invece di combaciare.
 */
export function endScale(W: number, H: number): number {
  const need = Math.max(
    Math.sqrt(W * W + H * H) / 2 / DOOR.ri,
    H / 2 / DOOR_DOWN,
  );
  return need * 1.35;
}

/**
 * Il punto che resta al centro dello schermo.
 *
 * A riposo è il centro ottico del marchio, così si legge come nel logo;
 * aprendosi diventa il centro del vano, perché la finestra cresca simmetrica.
 */
export function anchorAt(openProgress: number): { x: number; y: number } {
  const k = easeOut(clamp01(openProgress / 0.28));
  return {
    x: MARK_CX + (DOOR.cx - MARK_CX) * k,
    y: MARK_CY + (DOOR.cy - MARK_CY) * k,
  };
}

/** Opacità di un arco a un dato istante: compaiono dall'interno all'esterno. */
export function archOpacity(index: number, elapsed: number): number {
  const appear = clamp01(
    (elapsed - (ARCHES.length - 1 - index) * STAGGER) / T_APPEAR,
  );
  return easeOut(appear);
}
