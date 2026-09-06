import { useEffect, useRef } from "react";

/**
 * Il portale del marchio: gli archi concentrici di "Agorà" si aprono come una
 * porta e scoprono ciò che c'è dietro.
 *
 * È la stessa animazione che apre Agorà Orbite (public/orbite/assets/js/intro.js),
 * portata qui perché il passaggio fra i due siti non sembri uno stacco: la
 * porta comincia ad aprirsi su questa pagina e si finisce di attraversarla
 * sull'altra.
 *
 * La geometria non è ridisegnata a occhio: è misurata dal marchio e riprodotta
 * con archi di cerchio esatti. Una unità = un pixel del PNG originale;
 * l'origine è dove il cerchio che taglia le gambe degli archi tocca la linea
 * di base del logotipo. I numeri arrivano tali e quali da intro.js, così le
 * due animazioni combaciano davvero invece di somigliarsi.
 */

const CUT_R = 164.319;
const CUT_CY = -164.319;

const ARCHES = [
  { cx: -0.004, cy: -97.725, ro: 144.008, ri: 136.116 },
  { cx: -0.108, cy: -96.286, ro: 117.483, ri: 109.534 },
  { cx: 0.187, cy: -96.716, ro: 90.429, ri: 82.566 },
  { cx: 0.185, cy: -96.026, ro: 65.143, ri: 57.311 },
  { cx: -0.339, cy: -94.476, ro: 40.294, ri: 32.453 },
];

const MARK_W = 288.02;
const MARK_CX = -0.004;
const MARK_CY = -122.451;
const DOOR = ARCHES[4];
const DOOR_DOWN = 91.2;

const T_GROW = 620; // comparsa e crescita fino alla misura del marchio
const T_OPEN = 900; // apertura accelerata oltre i bordi
const STAGGER = 80; // ritardo fra un arco e il successivo

const cutY = (dx: number) =>
  CUT_CY + Math.sqrt(Math.max(0, CUT_R * CUT_R - dx * dx));
const n2 = (v: number) => Math.round(v * 100) / 100;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => Math.pow(t, 2.4);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

function builder(s: number, px: number, py: number) {
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
type B = ReturnType<typeof builder>;

function archPath(a: (typeof ARCHES)[number], b: B) {
  const xoL = a.cx - a.ro,
    xoR = a.cx + a.ro,
    xiL = a.cx - a.ri,
    xiR = a.cx + a.ri;
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

function doorPath(b: B) {
  const xL = DOOR.cx - DOOR.ri,
    xR = DOOR.cx + DOOR.ri;
  return (
    b.M(xL, cutY(xL)) +
    b.L(xL, DOOR.cy) +
    b.top(DOOR.cx, DOOR.cy, DOOR.ri, +1) +
    b.L(xR, cutY(xR)) +
    b.cut(xL, cutY(xL)) +
    "Z"
  );
}

export interface PortalProps {
  /**
   * Quando diventa true la porta si apre. Finché è false gli archi restano
   * composti e "respirano": è lo stato di attesa. Chi non ha nulla da
   * attendere passa direttamente true.
   */
  open: boolean;
  /** Chiamata a animazione conclusa: qui si naviga, o si smonta il portale. */
  onDone?: () => void;
  /** Colore del velo. Per difetto l'inchiostro di Orbite: vedi sotto. */
  veil?: string;
}

/*
  I colori NON seguono il tema chiaro/scuro, ed è voluto: sono quelli con cui
  Orbite si apre (inchiostro #111111, archi crema #F4F1EA). Il senso di questa
  animazione è che il passaggio fra i due siti sembri un solo movimento; se
  qui la porta fosse arancione su crema e di là crema su nero, lo stacco che
  si voleva togliere ricomparirebbe proprio nel momento del salto.
*/
const VEIL_INK = "#111111";
const ARCH_CREAM = "#F4F1EA";

export function Portal({ open, onDone, veil }: PortalProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const veilRef = useRef<SVGPathElement>(null);
  const plugRef = useRef<SVGPathElement>(null);
  const barsRef = useRef<(SVGPathElement | null)[]>([]);
  const openRef = useRef(open);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  openRef.current = open;
  onDoneRef.current = onDone;

  useEffect(() => {
    // Chi ha chiesto meno animazioni non deve attraversare nessuna porta.
    if (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onDoneRef.current?.();
      return;
    }

    let raf = 0;
    let last = 0;
    let elapsed = 0;
    // Istante in cui è stato dato il via libera all'apertura: prima di allora
    // il tempo scorre solo per la fase di crescita.
    let openedAt: number | null = null;
    const barDone = [false, false, false, false, false];

    const frame = (now: number) => {
      const svg = svgRef.current;
      const veilEl = veilRef.current;
      const plugEl = plugRef.current;
      if (!svg || !veilEl || !plugEl) return;

      if (!last) last = now;
      elapsed += now - last;
      last = now;

      if (openRef.current && openedAt === null) {
        // Non si apre prima di essersi composta: aprirsi a metà crescita
        // darebbe uno scatto invece di un movimento.
        openedAt = Math.max(elapsed, T_GROW);
      }

      const W = window.innerWidth;
      const H = window.innerHeight;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

      const openProgress =
        openedAt === null ? 0 : clamp01((elapsed - openedAt) / T_OPEN);

      // Il punto che resta al centro dello schermo: a riposo il centro ottico
      // del marchio, aprendosi il centro del vano, così la finestra cresce
      // simmetrica.
      const k = easeOut(clamp01(openProgress / 0.28));
      const ax = MARK_CX + (DOOR.cx - MARK_CX) * k;
      const ay = MARK_CY + (DOOR.cy - MARK_CY) * k;

      const target = Math.max(150, Math.min(Math.min(W, H) * 0.3, 340));
      const sLogo = target / MARK_W;
      const sStart = sLogo * 0.05;
      const need = Math.max(
        Math.sqrt(W * W + H * H) / 2 / DOOR.ri,
        H / 2 / DOOR_DOWN,
      );
      const sEnd = need * 1.35;

      let s: number;
      if (elapsed < T_GROW) {
        s = sStart + (sLogo - sStart) * easeOut(elapsed / T_GROW);
      } else if (openedAt === null) {
        // Attesa: un respiro appena percettibile, così si capisce che il sito
        // sta lavorando e non che si è bloccato.
        const pulse = 1 + 0.02 * Math.sin((elapsed - T_GROW) / 260);
        s = sLogo * pulse;
      } else {
        s = sLogo + (sEnd - sLogo) * easeIn(openProgress);
      }

      const b = builder(s, W / 2 - ax * s, H / 2 - ay * s);

      // Velo col vano ritagliato: un solo tracciato, regola di riempimento
      // evenodd. Il rettangolo copre esattamente il viewport e nulla di più.
      veilEl.setAttribute(
        "d",
        `M-1 -1H${W + 1}V${H + 1}H-1Z` + doorPath(b),
      );

      // Il tappo tiene chiuso il vano finché la porta non parte, così durante
      // la composizione il marchio si legge come nel logo.
      const plugOp = 1 - clamp01((openProgress - 0.05) / 0.09);
      if (plugOp > 0) {
        plugEl.setAttribute("d", doorPath(b));
        plugEl.setAttribute("opacity", plugOp.toFixed(3));
      } else {
        plugEl.setAttribute("d", "");
      }

      // Gli archi compaiono dall'interno verso l'esterno. Quando il raggio
      // interno di un arco supera lo schermo smette di essere disegnato: non
      // è più visibile e ridisegnarlo costa soltanto.
      const reach = Math.sqrt(W * W + H * H) / 2 + 4;
      for (let i = 0; i < ARCHES.length; i++) {
        const el = barsRef.current[i];
        if (!el || barDone[i]) continue;
        if (ARCHES[i].ri * s > reach) {
          el.setAttribute("d", "");
          barDone[i] = true;
          continue;
        }
        el.setAttribute("d", archPath(ARCHES[i], b));
        const appear = clamp01(
          (elapsed - (ARCHES.length - 1 - i) * STAGGER) / 300,
        );
        el.setAttribute("opacity", easeOut(appear).toFixed(3));
      }

      // Ultimo tratto: dissolvenza di sicurezza, se restasse un angolo scoperto.
      if (openedAt !== null && openProgress > 0.82) {
        veilEl.setAttribute(
          "opacity",
          clamp01((1 - openProgress) / 0.18).toFixed(3),
        );
      }

      if (openedAt !== null && openProgress >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      aria-hidden="true"
      style={{ background: "transparent" }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path ref={veilRef} fill={veil ?? VEIL_INK} fillRule="evenodd" />
        {/* Il contorno dello stesso colore copre la cucitura col bordo del velo. */}
        <path
          ref={plugRef}
          fill={veil ?? VEIL_INK}
          stroke={veil ?? VEIL_INK}
          strokeWidth="2"
        />
        <g fill={ARCH_CREAM}>
          {ARCHES.map((_, i) => (
            <path
              key={i}
              ref={(el) => {
                barsRef.current[i] = el;
              }}
              opacity="0"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
