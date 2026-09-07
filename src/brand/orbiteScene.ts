/**
 * Agorà Orbite — il motore delle orbite.
 *
 * Ogni token (logo o bandiera) percorre un'ellisse inclinata. Le ellissi sono
 * concentriche, hanno la stessa inclinazione e "respirano" in fase: i loro
 * raggi si allontanano e si avvicinano insieme, quindi i tracciati non si
 * incrociano mai e le distanze relative restano costanti.
 *
 * Numero di anelli, raggi e quanti token stanno su ciascuno vengono
 * ricalcolati a ogni ridimensionamento a partire dallo schermo: la stessa scena
 * funziona in orizzontale su computer e in verticale su telefono. Le
 * sovrapposizioni non sono stimate a occhio — `fitsOnRing` e `ringsCompatible`
 * verificano numericamente che due riquadri non si incontrino mai.
 *
 * Dove non c'è spazio per tutti (tipicamente su telefono) ogni posizione ospita
 * più token a turno: lo scambio avviene nel punto più lontano dell'orbita, con
 * una breve dissolvenza.
 */
import { SCENE_READY } from "./portal";

interface Geometry {
  W: number;
  H: number;
  portrait: boolean;
  /** rapporto fra i semiassi: ry = rx * k */
  k: number;
  chipW: number;
  chipH: number;
  flagW: number;
  flagH: number;
  logoW: number;
  logoH: number;
  veilW: number;
  veilH: number;
  shrink: number;
  maxRx: number;
  minRy: number;
}

interface Ring {
  rx: number;
  ry: number;
  /** larghezza e altezza del riquadro che ci gira sopra */
  tw: number;
  th: number;
  /** true = ci stanno anche i loghi; false = solo bandiere */
  mixed: boolean;
  cap: number;
  speed: number;
  offset: number;
  take: HTMLElement[];
}

interface Slot {
  rx: number;
  ry: number;
  speed: number;
  phase: number;
  /** i token che si alternano in questa posizione */
  queue: HTMLElement[];
  index: number;
  fading: HTMLElement | null;
  fadeFrom: number;
  /** giro in corso, per accorgersi di quando si passa dal punto di scambio */
  cycle: number | null;
  kind: string | undefined;
}

declare global {
  interface Window {
    /** Aggancio per le misure: usato dalle prove, non dal sito. */
    __agora?: {
      measure: () => Geometry;
      render: (t: number) => void;
      readonly rings: Ring[];
      readonly slots: Slot[];
    };
  }
}

(function () {
  const TILT = -12; // inclinazione delle orbite, in gradi
  const COS_T = Math.cos((TILT * Math.PI) / 180);
  const SIN_T = Math.sin((TILT * Math.PI) / 180);

  const BREATHE = 0.035; // ampiezza del "respiro" (±3,5%)
  const BREATHE_PERIOD = 16; // secondi
  const DEPTH_MIN = 0.87; // scala del token nel punto più lontano
  const OPACITY_MIN = 0.62;
  const MAX_RINGS = 4;
  const MARGIN = 8; // aria minima fra due riquadri, in px
  const LOGO_AR = 1385 / 512; // proporzioni del logotipo
  const FAR = -Math.PI / 2; // angolo del punto più lontano (sin = -1)
  const FADE = 0.7; // durata della dissolvenza al cambio, in secondi

  const scene = document.getElementById("scene");
  const field = document.getElementById("field");
  const orbitsBox = document.getElementById("orbits");
  const orbitG = document.getElementById("orbits-g");
  if (!scene || !field || !orbitsBox || !orbitG) return;

  const orbitEls = Array.from(orbitsBox.querySelectorAll<SVGEllipseElement>(".orbit"));
  const all = Array.from(field.querySelectorAll<HTMLElement>(".token"));
  const logos = all.filter((el) => el.dataset.kind === "logo");
  const flags = all.filter((el) => el.dataset.kind === "flag");

  // Altezza del marchio dentro al chip, come frazione dell'altezza del chip.
  logos.forEach((el) => {
    el.style.setProperty("--logo-scale", el.dataset.h || "0.5");
  });

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let slots: Slot[] = []; // posizioni in orbita, ognuna con la sua coda di token
  let rings: Ring[] = [];
  let raf = 0;
  let startedAt = 0;
  let elapsed = 0; // secondi di animazione già trascorsi

  /* ---------------------------------------------------------- geometria --- */

  const clamp = (lo: number, v: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;
  const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);

  // Ruota un vettore secondo l'inclinazione delle orbite.
  const rotX = (x: number, y: number) => x * COS_T - y * SIN_T;
  const rotY = (x: number, y: number) => x * SIN_T + y * COS_T;

  /** Due riquadri centrati in (0,0) e (dx,dy) sono separati? */
  const apart = (dx: number, dy: number, sumW: number, sumH: number) =>
    Math.abs(dx) >= sumW || Math.abs(dy) >= sumH;

  /**
   * n token equidistanti sullo stesso anello non si toccano mai?
   *
   * Bastano le coppie adiacenti: allontanandosi nell'indice entrambe le
   * componenti della distanza crescono, quindi il caso peggiore è quello.
   */
  function fitsOnRing(
    rx: number,
    ry: number,
    n: number,
    w: number,
    h: number,
  ): boolean {
    if (n < 2) return true;
    const d = (2 * Math.PI) / n;
    const steps = 180;
    for (let i = 0; i < steps; i++) {
      const t = (i * Math.PI) / steps;
      const dx = rx * (Math.cos(t + d) - Math.cos(t));
      const dy = ry * (Math.sin(t + d) - Math.sin(t));
      if (!apart(rotX(dx, dy), rotY(dx, dy), w + MARGIN, h + MARGIN)) return false;
    }
    return true;
  }

  function capacity(
    rx: number,
    ry: number,
    w: number,
    h: number,
    limit: number,
  ): number {
    let n = 1;
    while (n < limit && fitsOnRing(rx, ry, n + 1, w, h)) n++;
    return n;
  }

  /**
   * Due anelli girano a velocità diverse: prima o poi ogni combinazione di
   * angoli si presenta, quindi vanno esclusi tutti gli accoppiamenti.
   */
  function ringsCompatible(
    a: { rx: number; ry: number },
    b: { rx: number; ry: number },
    sumW: number,
    sumH: number,
  ): boolean {
    const steps = 128;
    for (let i = 0; i < steps; i++) {
      const u = (2 * Math.PI * i) / steps;
      const ax = Math.cos(u) * a.rx;
      const ay = Math.sin(u) * a.ry;
      for (let j = 0; j < steps; j++) {
        const v = (2 * Math.PI * j) / steps;
        const dx = ax - Math.cos(v) * b.rx;
        const dy = ay - Math.sin(v) * b.ry;
        if (!apart(rotX(dx, dy), rotY(dx, dy), sumW, sumH)) return false;
      }
    }
    return true;
  }

  function measure(): Geometry {
    const W = scene!.clientWidth;
    const H = scene!.clientHeight;
    const portrait = H > W;

    const chipW = Math.round(clamp(72, Math.min(W * 0.21, H * 0.28, 152), 152));
    const chipH = Math.round(chipW * 0.43);
    const flagW = Math.round(chipH * 0.62);
    const flagH = Math.round(flagW / 1.5);

    const logoW = Math.round(
      portrait ? clamp(150, W * 0.52, 330) : clamp(190, W * 0.24, 420),
    );
    const logoH = logoW / LOGO_AR;
    const veilW = Math.round(logoW * 1.45);
    const veilH = Math.round(logoH * 1.6);

    const pad = Math.max(8, Math.min(W, H) * 0.02);
    const grow = 1 + BREATHE;

    // Spazio disponibile per il centro di un token, misurato dal centro scena.
    const availX = Math.max(1, W / 2 - chipW / 2 - pad);
    const availY = Math.max(1, H / 2 - chipH / 2 - pad);

    // Le ellissi sono inclinate: il loro ingombro non è (rx, ry) ma la diagonale
    // della rotazione. Il raggio va ricavato da lì, altrimenti i token escono
    // dai bordi.
    const k = availY / availX;
    const maxRx =
      Math.min(
        availX / hyp(COS_T, k * SIN_T),
        availY / hyp(SIN_T, k * COS_T),
      ) / grow;

    return {
      W,
      H,
      portrait,
      k,
      chipW,
      chipH,
      flagW,
      flagH,
      logoW,
      logoH,
      veilW,
      veilH,
      shrink: 1 - BREATHE,
      maxRx,
      // Nessun anello deve entrare nel velo, o i token in cima e in fondo
      // all'orbita risulterebbero sbiaditi.
      minRy: veilH / 2 + chipH / 2 + 4,
    };
  }

  /** Costruisce gli anelli dall'esterno verso l'interno. */
  function buildRings(g: Geometry): Ring[] {
    const out: Ring[] = [];
    if (g.maxRx <= 0) return out;

    const k = g.k;
    const minRx = Math.max(g.chipW * 0.45, g.minRy / k);
    let rx = g.maxRx;

    while (out.length < MAX_RINGS && rx >= minRx) {
      // Un'orbita che regge uno o due chip sembra un errore: meglio fermarsi e
      // lasciare lo spazio all'anello di sole bandiere, che è più piccolo.
      const cap = capacity(
        rx * g.shrink,
        rx * k * g.shrink,
        g.chipW,
        g.chipH,
        40,
      );
      if (cap < 3) break;
      out.push({
        rx,
        ry: rx * k,
        tw: g.chipW,
        th: g.chipH,
        mixed: true,
        cap,
        speed: 0,
        offset: 0,
        take: [],
      });

      const prev = { rx: rx * g.shrink, ry: rx * k * g.shrink };
      let next = rx - (g.chipW * 1.04 + MARGIN);
      while (
        next >= minRx &&
        !ringsCompatible(
          prev,
          { rx: next * g.shrink, ry: next * k * g.shrink },
          g.chipW + MARGIN,
          g.chipH + MARGIN,
        )
      ) {
        next -= 4;
      }
      rx = next;
    }

    // Se resta spazio verso il centro, un ultimo anello di sole bandiere: sono
    // piccole, quindi entrano dove un chip non entrerebbe.
    if (out.length && out.length < MAX_RINGS && flags.length) {
      const last = out[out.length - 1];
      const minRxFlag = Math.max(
        g.flagW * 0.6,
        (g.veilH / 2 + g.flagH / 2 + 4) / k,
      );
      const sumW = (g.chipW + g.flagW) / 2 + MARGIN;
      const sumH = (g.chipH + g.flagH) / 2 + MARGIN;
      const guard = { rx: last.rx * g.shrink, ry: last.ry * g.shrink };
      let fx = last.rx - sumW;
      while (
        fx >= minRxFlag &&
        !ringsCompatible(
          guard,
          { rx: fx * g.shrink, ry: fx * k * g.shrink },
          sumW,
          sumH,
        )
      ) {
        fx -= 4;
      }
      if (fx >= minRxFlag) {
        const fcap = capacity(
          fx * g.shrink,
          fx * k * g.shrink,
          g.flagW,
          g.flagH,
          40,
        );
        if (fcap >= 3) {
          out.push({
            rx: fx,
            ry: fx * k,
            tw: g.flagW,
            th: g.flagH,
            mixed: false,
            cap: fcap,
            speed: 0,
            offset: 0,
            take: [],
          });
        }
      }
    }

    // Più l'orbita è esterna, più è lenta; i versi si alternano.
    out.forEach((r, i) => {
      r.speed = ((2 * Math.PI) / (38 + i * 20)) * (i % 2 ? -1 : 1);
      r.offset = i * 0.9;
      r.take = [];
    });

    return out;
  }

  /**
   * Distribuisce i token sugli anelli: prima i loghi, spalmati su tutti gli
   * anelli che li accettano, poi le bandiere negli spazi rimasti. Ciò che avanza
   * finisce in coda alle posizioni già occupate e comparirà a turno.
   */
  function buildSlots(list: Ring[]): Slot[] {
    const mixed = list.filter((r) => r.mixed);
    const flagRings = list.filter((r) => !r.mixed);

    const free = (r: Ring) => r.cap - r.take.length;
    function spread(queue: HTMLElement[], targets: Ring[]) {
      let moved = true;
      while (queue.length && moved) {
        moved = false;
        for (let i = 0; i < targets.length && queue.length; i++) {
          const r = targets[i];
          if (free(r) > 0) {
            r.take.push(queue.shift()!);
            moved = true;
          }
        }
      }
    }

    const restLogos = logos.slice();
    spread(restLogos, mixed);

    const restFlags = flags.slice();
    const taken = list.map((r) => r.take.length);
    spread(restFlags, flagRings.concat(mixed));

    // Loghi e bandiere arrivano in blocchi: distribuendoli uniformemente lungo
    // l'anello si evita che finiscano tutti dallo stesso lato.
    list.forEach((r, i) => {
      const a = r.take.slice(0, taken[i]);
      const b = r.take.slice(taken[i]);
      if (!a.length || !b.length) return;
      const merged: HTMLElement[] = [];
      let ai = 0;
      let bi = 0;
      while (merged.length < r.take.length) {
        if (
          ai < a.length &&
          (bi >= b.length || (ai + 0.5) / a.length <= (bi + 0.5) / b.length)
        ) {
          merged.push(a[ai++]);
        } else {
          merged.push(b[bi++]);
        }
      }
      r.take = merged;
    });

    // Una posizione ogni n, in modo che i token restino equidistanti.
    const out: Slot[] = [];
    list.forEach((r) => {
      const n = r.take.length;
      r.take.forEach((el, idx) => {
        out.push({
          rx: r.rx,
          ry: r.ry,
          speed: r.speed,
          phase: r.offset + (idx / n) * Math.PI * 2,
          queue: [el],
          index: 0,
          fading: null,
          fadeFrom: 0,
          cycle: null,
          kind: el.dataset.kind,
        });
      });
    });

    // Turnazione: i token rimasti fuori si accodano alle posizioni compatibili.
    function enqueue(rest: HTMLElement[], kind: string) {
      if (!rest.length) return;
      let host = out.filter((s) => s.kind === kind);
      // Un logo sta solo dove c'è spazio per un chip; una bandiera sta ovunque.
      if (!host.length && kind === "flag") host = out;
      if (!host.length) return;
      let j = 0;
      while (rest.length) {
        host[j % host.length].queue.push(rest.shift()!);
        j++;
      }
    }
    enqueue(restLogos, "logo");
    enqueue(restFlags, "flag");

    return out;
  }

  /* ------------------------------------------------------------ disegno --- */

  function applyLayout() {
    const g = measure();
    const style = scene!.style;

    style.setProperty("--chip-w", g.chipW + "px");
    style.setProperty("--chip-h", g.chipH + "px");
    style.setProperty("--flag-w", g.flagW + "px");
    style.setProperty("--flag-h", g.flagH + "px");
    style.setProperty("--logo-w", g.logoW + "px");
    style.setProperty("--veil-w", g.veilW + "px");
    style.setProperty("--veil-h", g.veilH + "px");
    style.setProperty("--scene-w", g.W + "px");
    style.setProperty("--scene-h", g.H + "px");

    rings = buildRings(g);
    slots = buildSlots(rings);

    all.forEach((el) => {
      el.hidden = true;
    });
    slots.forEach((s) => {
      s.queue[s.index].hidden = false;
    });

    // Il viewBox ha l'origine al centro della scena: le ellissi stanno in (0,0)
    // e basta trasformare il gruppo. Si aggiorna solo quando la scena cambia
    // dimensione, non a ogni fotogramma.
    orbitsBox!.setAttribute(
      "viewBox",
      -g.W / 2 + " " + -g.H / 2 + " " + g.W + " " + g.H,
    );
    orbitEls.forEach((el, i) => {
      const r = rings[i];
      if (!r) {
        el.setAttribute("rx", "0");
        el.setAttribute("ry", "0");
        el.setAttribute("opacity", "0");
        return;
      }
      el.setAttribute("rx", r.rx.toFixed(1));
      el.setAttribute("ry", r.ry.toFixed(1));
      el.setAttribute("opacity", (0.13 - i * 0.018).toFixed(3));
    });

    render(elapsed);
  }

  function place(
    el: HTMLElement,
    x: number,
    y: number,
    sc: number,
    op: number,
  ) {
    el.style.transform =
      "translate(-50%,-50%) translate3d(" +
      x.toFixed(1) +
      "px," +
      y.toFixed(1) +
      "px,0) scale(" +
      sc.toFixed(3) +
      ")";
    el.style.opacity = op.toFixed(3);
  }

  function render(t: number) {
    const breathe = 1 + BREATHE * Math.sin((t * 2 * Math.PI) / BREATHE_PERIOD);

    orbitG!.setAttribute(
      "transform",
      "rotate(" + TILT + ") scale(" + breathe.toFixed(4) + ")",
    );

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const a = s.phase + t * s.speed;

      // Cambio del token: avviene esattamente nel punto più lontano
      // dell'orbita, dove opacità e scala sono al minimo.
      if (s.queue.length > 1) {
        const cycle = Math.floor((a - FAR) / (2 * Math.PI));
        if (s.cycle === null) {
          s.cycle = cycle;
        } else if (cycle !== s.cycle) {
          s.fading = s.queue[s.index];
          s.index =
            (s.index + (cycle > s.cycle ? 1 : -1) + s.queue.length) %
            s.queue.length;
          s.fadeFrom = t;
          s.cycle = cycle;
          s.queue[s.index].hidden = false;
        }
      }

      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const x0 = ca * s.rx * breathe;
      const y0 = sa * s.ry * breathe;
      const x = x0 * COS_T - y0 * SIN_T;
      const y = x0 * SIN_T + y0 * COS_T;
      const depth = (sa + 1) / 2; // 0 = lontano (in alto), 1 = vicino
      const sc = DEPTH_MIN + (1 - DEPTH_MIN) * depth;
      const op = OPACITY_MIN + (1 - OPACITY_MIN) * depth;

      const p = s.fading ? Math.min(1, Math.abs(t - s.fadeFrom) / FADE) : 1;
      place(s.queue[s.index], x, y, sc, op * p);

      if (s.fading) {
        if (p >= 1) {
          s.fading.hidden = true;
          s.fading = null;
        } else {
          place(s.fading, x, y, sc, op * (1 - p));
        }
      }
    }
  }

  /* --------------------------------------------------------- ciclo vita --- */

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    render(elapsed + (now - startedAt) / 1000);
  }

  function start() {
    if (raf || reduceMotion.matches) return;
    startedAt = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // Fermando il ciclo si memorizza il tempo trascorso: al riavvio (cambio di
  // dimensione, ritorno sulla scheda) il movimento riprende da dov'era.
  function stop() {
    if (raf) {
      elapsed += (performance.now() - startedAt) / 1000;
      cancelAnimationFrame(raf);
    }
    raf = 0;
  }

  let pending = 0;
  function relayout() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const wasRunning = !!raf;
      stop();
      applyLayout();
      if (wasRunning) start();
    });
  }

  // Una bandiera che non arriva esce dal giro invece di lasciare l'icona di
  // immagine rotta.
  flags.forEach((el) => {
    el.firstElementChild?.addEventListener("error", () => {
      const at = flags.indexOf(el);
      if (at >= 0) flags.splice(at, 1);
      const pos = all.indexOf(el);
      if (pos >= 0) all.splice(pos, 1);
      el.hidden = true;
      el.remove();
      relayout();
    });
  });

  scene.classList.add("is-orbiting");
  applyLayout();
  start();

  // La scena è disposta: da qui in poi i loghi stanno in orbita e non sono più
  // un elenco incolonnato.
  //
  // Il segnale serve all'apertura, che senza si aprirebbe su quell'elenco: i
  // due file sono due richieste separate e l'apertura può partire per prima —
  // arrivando dalla bacheca la porta si apre SUBITO, quindi la finestra in cui
  // si vedeva il grezzo era garantita, non rara.
  document.documentElement.classList.add(SCENE_READY);

  if (window.ResizeObserver) new ResizeObserver(relayout).observe(scene);
  else window.addEventListener("resize", relayout);
  window.addEventListener("orientationchange", relayout);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) {
      stop();
      render(elapsed);
    } else start();
  });

  window.__agora = {
    measure,
    render,
    get rings() {
      return rings;
    },
    get slots() {
      return slots;
    },
  };
})();
