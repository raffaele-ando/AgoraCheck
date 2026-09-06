/**
 * Sapere quando l'apertura del marchio ha finito di occupare lo schermo.
 *
 * Serve a tenere fermo tutto il resto mentre la porta si apre. Misurando i
 * fotogrammi dell'animazione d'ingresso, il 99% era perfetto (17 ms) ma restava
 * un blocco isolato di quasi 300 ms: non veniva dal portale, veniva da quello
 * che la pagina faceva DIETRO di esso — in particolare la raccolta delle
 * impronte del dispositivo, che disegna su canvas, compila uno shader WebGL,
 * enumera i caratteri installati e misura la risoluzione dei timer, tutto di
 * fila e tutto sincrono.
 *
 * Quel lavoro era programmato con requestIdleCallback, cioè esattamente lo
 * stesso momento che aspetta anche l'animazione per partire: finivano nello
 * stesso istante di quiete e si ostacolavano a vicenda.
 *
 * Il segnale è la classe che App mette su <html> a porta aperta.
 */
const BOOTED = "ag-booted";

export function introIsOver(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains(BOOTED);
}

/** Esegue `cb` quando l'apertura è finita — subito, se è già finita. */
export function whenIntroOver(cb: () => void): () => void {
  if (introIsOver()) {
    cb();
    return () => {};
  }
  const obs = new MutationObserver(() => {
    if (!introIsOver()) return;
    obs.disconnect();
    cb();
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  // Rete di sicurezza: se per qualsiasi ragione la classe non arrivasse, il
  // lavoro non deve restare in sospeso per sempre.
  const t = setTimeout(() => {
    obs.disconnect();
    cb();
  }, 6000);
  return () => {
    obs.disconnect();
    clearTimeout(t);
  };
}

/**
 * Esegue una lista di lavori pesanti UNO PER VOLTA, ciascuno in un momento di
 * quiete diverso.
 *
 * Eseguirli tutti insieme dà un blocco unico lungo quanto la loro somma —
 * quasi 300 ms, misurati — che l'occhio percepisce come uno scatto. Spezzati,
 * ognuno dura poche decine di millisecondi e il browser può disegnare fra
 * l'uno e l'altro. Il risultato raccolto è identico: cambia solo la cadenza.
 */
export function runIdleChain(steps: Array<() => void>): void {
  let i = 0;
  const next = () => {
    if (i >= steps.length) return;
    const step = steps[i++];
    try {
      step();
    } catch (e) {
      console.warn("Raccolta impronte: passo non riuscito", e);
    }
    schedule();
  };
  const schedule = () => {
    if (i >= steps.length) return;
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(next, { timeout: 2000 });
    } else {
      setTimeout(next, 50);
    }
  };
  schedule();
}
