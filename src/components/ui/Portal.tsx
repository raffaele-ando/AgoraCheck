import { useEffect, useRef } from "react";
import {
  ARCHES,
  ARCH_CREAM,
  T_GROW,
  T_HOLD,
  T_OPEN,
  VEIL_INK,
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
  n2,
  startScale,
} from "../../brand/portal";

/**
 * Il portale del marchio: gli archi concentrici di "Agorà" si aprono come una
 * porta e scoprono ciò che c'è dietro.
 *
 * È la stessa animazione che apre Agorà Orbite, ed è la stessa nel senso
 * letterale: geometria, tempi e matematica arrivano da brand/portal.ts, che è
 * anche la sorgente di brand/orbiteIntro.ts. Prima erano due copie tenute
 * allineate da un commento, e si erano scollate davvero — le due metà della
 * transizione si muovevano a velocità diverse. Ora cambiarne una sola non è
 * possibile.
 *
 * Qui la porta comincia ad aprirsi; di là si finisce di attraversarla.
 */

export interface PortalProps {
  /**
   * Quando diventa true la porta si apre. Finché è false gli archi restano
   * composti e "respirano": è lo stato di attesa. Chi non ha nulla da
   * attendere passa direttamente true.
   */
  open: boolean;
  /** Chiamata a animazione conclusa: qui si naviga, o si smonta il portale. */
  onDone?: () => void;
  /**
   * Chiamata quando gli archi hanno finito di comporsi, cioè quando lo schermo
   * è interamente coperto dall'inchiostro e il marchio si legge.
   *
   * È il momento in cui si può cambiare pagina senza che si veda: la cucitura
   * fra i due siti cade sotto una copertura totale. Serve per la transizione
   * verso Orbite, che riprende da questa stessa posa e fa solo l'apertura —
   * così le due metà sono un movimento solo invece di due animazioni in fila.
   */
  onComposed?: () => void;
  /**
   * Chiamata al primo fotogramma disegnato, quando il velo copre lo schermo.
   *
   * Serve a togliere la copertura statica di index.html: finché quella resta,
   * il vano della porta si apre su ALTRO inchiostro invece che sulla pagina —
   * ed è il motivo per cui la porta "non era trasparente come in Orbite".
   */
  onVeiled?: () => void;
  /**
   * Il velo compare in dissolvenza invece che di colpo.
   *
   * Serve quando il portale si apre su una pagina già visibile — il clic sul
   * logo: senza, la bacheca veniva sostituita dal nero in un fotogramma solo,
   * ed è lo "scatto" che si vedeva. All'avvio invece lo schermo è già
   * inchiostro e non c'è nulla da dissolvere.
   */
  fadeIn?: boolean;
  /** Colore del velo. Per difetto l'inchiostro di Orbite: vedi sotto. */
  veil?: string;
}

/**
 * Durata della comparsa del velo, quando richiesta da `fadeIn`.
 *
 * La progressione è lineare e non "easeOut": quest'ultima parte velocissima e
 * rallenta alla fine, cioè l'esatto contrario di quel che serve qui. Misurata,
 * dava già il 77% di opacità dopo 80 ms — che all'occhio è lo stesso scatto al
 * nero che si voleva togliere. Lineare la bacheca svanisce con regolarità.
 */
const T_VEIL_IN = 320;

/*
  I tracciati si costruiscono UNA VOLTA SOLA, in coordinate unitarie.

  Prima venivano ricomposti a ogni fotogramma: sei stringhe di tracciato, con
  archi di cerchio, concatenate e riassegnate sessanta volte al secondo. Su un
  telefono di fascia media, mentre la bacheca fa già le sue cose, è la causa
  degli scatti dell'animazione d'ingresso.

  Ora si costruiscono al caricamento del modulo e a ogni fotogramma si scrive
  una sola trasformazione sul gruppo che li contiene: scalare un gruppo è
  lavoro che il browser sa comporre da sé, ricostruire un tracciato no.
*/
const UNIT = builder(1, 0, 0);
const ARCH_D = ARCHES.map((a) => archPath(a, UNIT));
const DOOR_D = doorPath(UNIT);

export function Portal({
  open,
  onDone,
  onComposed,
  onVeiled,
  fadeIn,
  veil,
}: PortalProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const veilRef = useRef<SVGPathElement>(null);
  const markRef = useRef<SVGGElement>(null);
  const plugRef = useRef<SVGPathElement>(null);
  const barsRef = useRef<(SVGPathElement | null)[]>([]);
  const openRef = useRef(open);
  const doneRef = useRef(false);
  const composedRef = useRef(false);
  const veiledRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const onComposedRef = useRef(onComposed);
  const onVeiledRef = useRef(onVeiled);
  const fadeInRef = useRef(fadeIn);
  openRef.current = open;
  onDoneRef.current = onDone;
  onComposedRef.current = onComposed;
  onVeiledRef.current = onVeiled;
  fadeInRef.current = fadeIn;

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
    // L'animazione parte sempre dall'inizio: crescita, posa, apertura.
    //
    // Avevo previsto una partenza "a marchio già composto" per il ritorno da
    // Orbite, dove la crescita era già stata vista all'andata. Ma senza la
    // crescita il marchio compare di colpo, a piena dimensione e piena
    // opacità: non è un movimento, è uno scatto, e accanto alle altre due
    // aperture stonava. Al ritorno c'è una sola animazione, quindi si fa
    // quella giusta per intero.
    let elapsed = 0;
    // Istante in cui è stato dato il via libera all'apertura: prima di allora
    // il tempo scorre solo per la fase di crescita.
    let openedAt: number | null = null;
    const barDone = [false, false, false, false, false];

    let barsSettled = false;
    let lastW = -1;
    let lastH = -1;
    let lastVeilW = -1;
    let lastVeilH = -1;

    const frame = (now: number) => {
      const svg = svgRef.current;
      const veilEl = veilRef.current;
      const plugEl = plugRef.current;
      const markEl = markRef.current;
      if (!svg || !veilEl || !plugEl || !markEl) return;

      if (!last) last = now;
      elapsed += now - last;
      last = now;

      if (openRef.current && openedAt === null) {
        // Non si apre prima di essersi composta: aprirsi a metà crescita
        // darebbe uno scatto invece di un movimento.
        openedAt = Math.max(elapsed, T_GROW + T_HOLD);
      }

      const W = window.innerWidth;
      const H = window.innerHeight;
      // Il riquadro di disegno si riscrive solo se lo schermo è cambiato:
      // riassegnarlo a ogni fotogramma obbliga il browser a rivalutare tutto
      // il disegno anche quando non è cambiato nulla.
      if (W !== lastW || H !== lastH) {
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        lastW = W;
        lastH = H;
      }

      const openProgress =
        openedAt === null ? 0 : clamp01((elapsed - openedAt) / T_OPEN);

      // Ancoraggio e scale arrivano dal modulo condiviso: sono esattamente le
      // stesse formule che usa Orbite, quindi il marchio che lascia questa
      // pagina e quello che riparte di là combaciano al pixel.
      const { x: ax, y: ay } = anchorAt(openProgress);
      const sLogo = logoScale(W, H);

      let s: number;
      if (elapsed < T_GROW) {
        const sStart = startScale(W, H);
        s = sStart + (sLogo - sStart) * easeOut(elapsed / T_GROW);
      } else if (openedAt === null) {
        // Composizione conclusa: lo schermo è interamente coperto e il marchio
        // si legge. Chi sta cambiando pagina lo fa adesso, sotto la copertura.
        if (!composedRef.current) {
          composedRef.current = true;
          onComposedRef.current?.();
        }
        // Il marchio composto resta FERMO. Niente respiro.
        //
        // Il respiro era un ±2% di scala, per far capire che il sito stava
        // lavorando. Ma questo è esattamente l'istante in cui si cambia
        // pagina, e il cambio non è istantaneo: la bacheca continua a
        // disegnare mentre il browser scarica Orbite, quindi l'ULTIMO
        // fotogramma di qua aveva una scala qualunque fra 0,98 e 1,02 —
        // mentre Orbite riparte esattamente da 1,00. Il marchio faceva un
        // salto di un paio di punti percentuali proprio sulla cucitura: è lo
        // scatto segnalato nel passaggio.
        //
        // Fermo, i due fotogrammi combaciano al pixel e il cambio di pagina
        // diventa invisibile.
        s = sLogo;
      } else {
        s = sLogo + (endScale(W, H) - sLogo) * easeIn(openProgress);
      }

      const px = W / 2 - ax * s;
      const py = H / 2 - ay * s;

      // Marchio e tappo: una trasformazione CSS su un livello a sé, non un
      // attributo SVG.
      //
      // È la differenza fra scattare e non scattare. Con `transform` sull'SVG
      // il browser deve RIDISEGNARE i cinque archi a ogni fotogramma, perché
      // cambiano di dimensione: misurato, dodici fotogrammi in un secondo e
      // mezzo. Con una trasformazione CSS su un livello promosso, gli archi
      // vengono disegnati una volta e poi soltanto spostati e scalati, che è
      // lavoro che la scheda grafica fa da sola.
      //
      // La scala di riferimento è quella del marchio composto: durante la
      // crescita si rimpicciolisce un disegno più grande (nitido), alla posa si
      // è esattamente 1:1, e solo nell'apertura si ingrandisce — quando gli
      // archi corrono fuori schermo e nessuno li guarda più.
      markEl.setAttribute(
        "transform",
        `translate(${n2(px)} ${n2(py)}) scale(${s})`,
      );

      // Il velo si ridisegna SOLO mentre la porta si apre.
      //
      // Qui stava il costo vero dell'animazione, e non era dove pensavo. Il
      // velo è un rettangolo grande quanto lo schermo col vano ritagliato:
      // riscriverne il tracciato a ogni fotogramma obbliga il browser a
      // ridipingere l'intera superficie della pagina, sessanta volte al
      // secondo, per un buco che durante la crescita è comunque coperto dal
      // tappo e quindi invisibile.
      //
      // Durante crescita e posa il velo è quindi un rettangolo pieno, scritto
      // una volta e mai più toccato: zero ridisegni. Il vano compare solo
      // quando serve, cioè quando comincia ad aprirsi.
      //
      // La condizione guarda l'AVANZAMENTO, non il via libera: tornando
      // indietro da Orbite il via libera c'è già al primo fotogramma, ma
      // finché la posa non è finita il vano non si muove e ridisegnarlo
      // sarebbe un ridipingere l'intero schermo per nulla.
      if (openProgress > 0) {
        veilEl.setAttribute(
          "d",
          `M-1 -1H${W + 1}V${H + 1}H-1Z` + doorPath(builder(s, px, py)),
        );
      } else if (W !== lastVeilW || H !== lastVeilH) {
        veilEl.setAttribute("d", `M-1 -1H${W + 1}V${H + 1}H-1Z`);
        lastVeilW = W;
        lastVeilH = H;
      }

      // Comparsa del velo, quando il portale si apre su una pagina visibile.
      if (fadeInRef.current && elapsed < T_VEIL_IN) {
        veilEl.setAttribute("opacity", (elapsed / T_VEIL_IN).toFixed(3));
      } else if (!veiledRef.current) {
        veilEl.setAttribute("opacity", "1");
      }

      // Lo schermo è coperto: chi teneva una copertura statica può toglierla,
      // altrimenti il vano si aprirebbe su quella invece che sulla pagina.
      if (!veiledRef.current && (!fadeInRef.current || elapsed >= T_VEIL_IN)) {
        veiledRef.current = true;
        onVeiledRef.current?.();
      }

      // Il tappo tiene chiuso il vano finché la porta non parte, così durante
      // la composizione il marchio si legge come nel logo.
      const plugOp = 1 - clamp01((openProgress - 0.05) / 0.09);
      plugEl.setAttribute("opacity", plugOp > 0 ? plugOp.toFixed(3) : "0");

      // Gli archi compaiono dall'interno verso l'esterno. Finita la comparsa
      // non si scrive più nulla: restano opachi da soli.
      if (!barsSettled) {
        let allOpaque = true;
        for (let i = 0; i < ARCHES.length; i++) {
          const el = barsRef.current[i];
          if (!el) continue;
          const op = archOpacity(i, elapsed);
          el.setAttribute("opacity", op.toFixed(3));
          if (op < 1) allOpaque = false;
        }
        barsSettled = allOpaque;
      }

      // Quando un arco è uscito dallo schermo si smette di disegnarlo: resta
      // enorme e invisibile, e rasterizzarlo costa comunque.
      const reach = Math.sqrt(W * W + H * H) / 2 + 4;
      for (let i = 0; i < ARCHES.length; i++) {
        const el = barsRef.current[i];
        if (!el || barDone[i]) continue;
        if (ARCHES[i].ri * s > reach) {
          el.style.display = "none";
          barDone[i] = true;
        }
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
      style={{
        background: "transparent",
        // Il portale sta su un livello proprio e isolato.
        //
        // Senza, ogni ridisegno del velo — che copre tutto lo schermo — può
        // trascinare con sé anche la bacheca che sta sotto, che di suo non è
        // cambiata di un pixel. `contain: paint` dice al browser che nulla di
        // questo elemento esce dai suoi bordi, e `will-change` gli fa
        // preparare il livello prima che l'animazione cominci invece che al
        // primo fotogramma.
        contain: "paint",
        willChange: "opacity",
      }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          ref={veilRef}
          fill={veil ?? VEIL_INK}
          fillRule="evenodd"
          opacity={fadeIn ? 0 : 1}
        />
        {/*
          Marchio e tappo tornano DENTRO l'SVG del velo.

          Li avevo spostati in un livello CSS a parte, convinto che il costo
          fosse la rasterizzazione degli archi. La misura ha detto di no — il
          numero di fotogrammi non cambiava — e quella struttura ha invece
          introdotto un difetto vero: un <svg> di dimensioni 0x0 che lasciava
          traboccare il contenuto funzionava sul browser di prova ma non su
          Android, dove gli archi sparivano del tutto e restava solo il vano
          della porta. È la segnalazione "non si caricano tutte le porte".

          Qui i tracciati sono scritti una volta sola in coordinate unitarie e
          l'animazione è una sola trasformazione sul gruppo: il risparmio che
          contava davvero resta, senza la fragilità.
        */}
        <g ref={markRef}>
          {/* Il tappo tiene chiuso il vano durante la composizione; il
              contorno dello stesso colore copre la cucitura col velo. */}
          <path
            ref={plugRef}
            d={DOOR_D}
            fill={veil ?? VEIL_INK}
            stroke={veil ?? VEIL_INK}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <g fill={ARCH_CREAM}>
            {ARCH_D.map((d, i) => (
              <path
                key={i}
                d={d}
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                opacity="0"
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
