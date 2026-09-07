/**
 * Agorà Orbite — apertura del sito attraverso il marchio.
 *
 * Gli archi compaiono piccoli al centro su fondo scuro, uno dopo l'altro
 * dall'interno verso l'esterno, crescono fino alla dimensione del marchio, poi
 * si allargano accelerando finché superano lo schermo: il sito si vede solo
 * attraverso il vano dell'arco più interno, che diventa la finestra.
 *
 * Geometria, tempi e matematica NON stanno qui: stanno in ./portal.ts, da dove
 * li prende anche la porta della bacheca (components/ui/Portal.tsx). Le due
 * metà della transizione fra i siti sono la stessa animazione tagliata in due,
 * e questo è l'unico modo per essere certi che restino tali.
 *
 * Il file viene compilato e scritto DENTRO l'HTML di Orbite (vedi il plugin in
 * vite.config.ts): quando il documento arriva, il marchio è già disegnabile
 * senza un solo giro di rete in più.
 */
import {
  ARCHES,
  T_GROW,
  T_HOLD,
  T_OPEN,
  T_TOTAL,
  anchorAt,
  archOpacity,
  archPath,
  builder,
  clamp01,
  doorPath,
  easeIn,
  easeOut,
  endScale,
  logoScale,
  SCENE_READY,
  startScale,
} from "./portal";

declare global {
  interface Document {
    /**
     * Vero mentre la pagina viene preparata in un secondo piano invisibile,
     * su richiesta della pagina precedente. Non è ancora nelle definizioni
     * standard del DOM, ma è la proprietà che il browser espone.
     */
    readonly prerendering?: boolean;
  }
}

(function () {
  let host = document.getElementById("portal");
  const svg = document.getElementById("portal-svg");
  const veil = document.getElementById("portal-veil");
  const plug = document.getElementById("portal-plug");
  const barEls: Element[] = host
    ? Array.from(host.querySelectorAll(".portal__bar"))
    : [];
  if (!host || !svg || !veil || !plug || barEls.length !== ARCHES.length) return;

  function finish() {
    if (!host) return;
    host.remove();
    host = null;
    document.documentElement.classList.remove("is-opening");
  }

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }

  /**
   * Arrivo dalla bacheca: la porta si è già composta di là.
   *
   * Senza questo, chi tocca il logo su Agorà vedrebbe DUE animazioni in fila —
   * gli archi si compongono e si aprono sulla bacheca, poi qui si
   * ricomporrebbero da capo. Con ?p=1 si salta la crescita e la posa e si parte
   * dall'apertura: le due metà diventano un movimento solo, col cambio di
   * pagina nascosto sotto la copertura d'inchiostro.
   */
  const continuing = /(?:^|[?&])p=1(?:&|$)/.test(location.search);

  let elapsed = continuing ? T_GROW + T_HOLD : 0;
  let last = 0;
  let speed = 1;
  let cleared = false;
  let plugGone = false;
  const barDone = ARCHES.map(() => false);

  /* --- la porta non si apre su una scena non pronta ----------------------- */

  // Due attese diverse, con due tetti diversi, perché costano diversamente.
  //
  // La DISPOSIZIONE è calcolo locale: arriva appena orbits.js è stato eseguito,
  // e senza di lei la porta si aprirebbe sull'elenco incolonnato dei loghi, che
  // è come stanno finché nessuno li mette in orbita. Vale la pena aspettarla.
  //
  // Le IMMAGINI sono rete: su una connessione lenta possono metterci parecchio,
  // e aspettarle sempre trasformerebbe l'apertura in una schermata nera che non
  // finisce. Mezzo secondo e poi si va: al peggio un logo si accende dentro una
  // scena già disposta, che è un dettaglio, non una pagina grezza.
  const LAYOUT_CAP = 2000;
  const IMG_CAP = 500;
  let heldLayout = 0;
  let heldImg = 0;
  let layoutDone = false;
  let imgsDone = false;

  function laidOut(): boolean {
    if (layoutDone) return true;
    layoutDone = document.documentElement.classList.contains(SCENE_READY);
    return layoutDone;
  }

  /**
   * Si aspetta SOLO il logotipo al centro, non i venti loghi in orbita.
   *
   * Quelli stanno su ellissi in movimento e vederne comparire uno mentre gira
   * non è un difetto, è una scena che si popola. Il logotipo AGORÀ invece è
   * fermo esattamente dietro la porta: se manca lui, il vano si apre sul vuoto.
   */
  function imagesIn(): boolean {
    if (imgsDone) return true;
    const brand = document.querySelector<HTMLImageElement>(".brand img");
    if (brand && !brand.complete) return false;
    imgsDone = true;
    return true;
  }

  /** Si può aprire? Oppure si è già aspettato abbastanza. */
  function mayOpen(dt: number): boolean {
    if (!laidOut()) {
      heldLayout += dt;
      return heldLayout >= LAYOUT_CAP;
    }
    if (!imagesIn()) {
      heldImg += dt;
      return heldImg >= IMG_CAP;
    }
    return true;
  }

  /* --- animazione --------------------------------------------------------- */

  /** Frazione di apertura già percorsa (0 durante crescita e posa). */
  const openProgress = (t: number) => clamp01((t - T_GROW - T_HOLD) / T_OPEN);

  function scaleFor(t: number, W: number, H: number): number {
    const sLogo = logoScale(W, H);
    if (t < T_GROW) {
      const sStart = startScale(W, H);
      return sStart + (sLogo - sStart) * easeOut(t / T_GROW);
    }
    return sLogo + (endScale(W, H) - sLogo) * easeIn(openProgress(t));
  }

  function frame(now: number) {
    if (!host) return;
    if (!last) last = now;
    const dt = (now - last) * speed;
    last = now;

    // Fine della posa: si aspetta la scena, e l'attesa non consuma
    // l'animazione — il marchio resta composto invece di aprirsi a vuoto.
    if (elapsed + dt > T_GROW + T_HOLD && !mayOpen(dt)) {
      elapsed = Math.min(elapsed + dt, T_GROW + T_HOLD);
    } else {
      elapsed += dt;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;
    svg!.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const s = scaleFor(elapsed, W, H);
    const a = anchorAt(openProgress(elapsed));
    const px = W / 2 - a.x * s;
    const py = H / 2 - a.y * s;
    const b = builder(s, px, py);

    // Velo scuro col vano ritagliato: un solo tracciato, fill-rule evenodd. Il
    // rettangolo copre esattamente lo schermo e nulla di più: ridisegnarne uno
    // più grande a ogni fotogramma costa, e non servirebbe.
    veil!.setAttribute("d", `M-1 -1H${W + 1}V${H + 1}H-1Z` + doorPath(b));

    // Il tappo si toglie quando la porta è già in movimento, con una dissolvenza
    // breve: a mezza opacità sul crema risulterebbe grigiastro. Finito il suo
    // compito esce dal disegno, per non pesare sui fotogrammi.
    const plugOp = 1 - clamp01((openProgress(elapsed) - 0.05) / 0.09);
    if (plugOp > 0) {
      plug!.setAttribute("d", doorPath(b));
      plug!.setAttribute("opacity", plugOp.toFixed(3));
    } else if (!plugGone) {
      plug!.setAttribute("d", "");
      plugGone = true;
    }

    // Quando il raggio interno di un arco ha superato lo schermo, l'arco non è
    // più visibile: si smette di ridisegnarlo.
    const reach = Math.sqrt(W * W + H * H) / 2 + 4;
    for (let i = 0; i < ARCHES.length; i++) {
      if (barDone[i]) continue;
      if (ARCHES[i].ri * s > reach) {
        barEls[i].setAttribute("d", "");
        barDone[i] = true;
        continue;
      }
      barEls[i].setAttribute("d", archPath(ARCHES[i], b));
      barEls[i].setAttribute("opacity", archOpacity(i, elapsed).toFixed(3));
    }

    if (!cleared) {
      (host as HTMLElement).style.background = "transparent";
      cleared = true;
    }

    // Ultimo tratto: dissolvenza di sicurezza, se restasse un angolo scoperto.
    if (elapsed > T_TOTAL - 200) {
      veil!.setAttribute("opacity", clamp01((T_TOTAL - elapsed) / 200).toFixed(3));
    }

    if (elapsed >= T_TOTAL) {
      finish();
      return;
    }
    requestAnimationFrame(frame);
  }

  // Un tocco, un tasto o uno scroll accelerano l'apertura.
  const hurry = () => {
    speed = 6;
  };
  (["pointerdown", "keydown", "wheel", "touchstart"] as const).forEach((ev) => {
    window.addEventListener(ev, hurry, { once: true, passive: true });
  });

  function begin() {
    // Il contrassegno ?p=1 ha fatto il suo lavoro: si toglie dall'indirizzo,
    // così un ricaricamento o un link condiviso rivedono l'apertura per intero.
    if (continuing && history.replaceState) {
      try {
        const u = new URL(location.href);
        u.searchParams.delete("p");
        history.replaceState(null, "", u.pathname + u.search + u.hash);
      } catch {
        /* indirizzo non manipolabile: nessun danno */
      }
    }
    document.documentElement.classList.add("is-opening");
    requestAnimationFrame(frame);
  }

  // Se la bacheca ha chiesto di preparare questa pagina in anticipo, qui si sta
  // girando in un secondo piano invisibile: nessuno sta guardando, e far
  // partire adesso l'apertura significherebbe consumarla prima di mostrarla —
  // all'arrivo si vedrebbe la porta già aperta, o mezza. Si aspetta il momento
  // in cui la pagina viene davvero mostrata; nel frattempo disposizione e
  // immagini sono già arrivate, quindi l'apertura parte su una pagina completa.
  if (document.prerendering) {
    document.addEventListener("prerenderingchange", begin, { once: true });
  } else {
    begin();
  }
})();
