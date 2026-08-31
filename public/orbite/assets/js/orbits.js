/* Agorà — motore delle orbite.
 *
 * Ogni token (logo o bandiera) percorre un'ellisse inclinata. Le ellissi sono
 * concentriche, hanno la stessa inclinazione e "respirano" in fase: i loro
 * raggi si allontanano e si avvicinano insieme, quindi i tracciati non si
 * incrociano mai e le distanze relative restano costanti.
 *
 * Numero di anelli, raggi e quanti token stanno su ciascuno vengono
 * ricalcolati a ogni resize a partire dal viewport: la stessa scena funziona
 * in orizzontale su desktop e in verticale su mobile. Le sovrapposizioni non
 * sono stimate a occhio — `fitsOnRing` e `ringsCompatible` verificano
 * numericamente che due riquadri non si incontrino mai.
 *
 * Dove non c'è spazio per tutti (tipicamente su telefono) ogni posizione
 * ospita più token a turno: lo scambio avviene nel punto più lontano
 * dell'orbita, con una breve dissolvenza.
 */
(function () {
  'use strict';

  var TILT = -12;                       // inclinazione delle orbite, in gradi
  var COS_T = Math.cos(TILT * Math.PI / 180);
  var SIN_T = Math.sin(TILT * Math.PI / 180);

  var BREATHE = 0.035;                  // ampiezza del "respiro" (±3,5%)
  var BREATHE_PERIOD = 16;              // secondi
  var DEPTH_MIN = 0.87;                 // scala del token nel punto più lontano
  var OPACITY_MIN = 0.62;
  var MAX_RINGS = 4;
  var MARGIN = 8;                       // aria minima fra due riquadri, in px
  var LOGO_AR = 1385 / 512;             // proporzioni di agora-logo.png
  var FAR = -Math.PI / 2;               // angolo del punto più lontano (sin = -1)
  var FADE = 0.7;                       // durata della dissolvenza al cambio, in secondi

  var scene = document.getElementById('scene');
  var field = document.getElementById('field');
  var orbitsBox = document.getElementById('orbits');
  var orbitG = document.getElementById('orbits-g');
  if (!scene || !field || !orbitsBox || !orbitG) return;

  var orbitEls = Array.prototype.slice.call(orbitsBox.querySelectorAll('.orbit'));
  var all = Array.prototype.slice.call(field.querySelectorAll('.token'));
  var logos = all.filter(function (el) { return el.dataset.kind === 'logo'; });
  var flags = all.filter(function (el) { return el.dataset.kind === 'flag'; });

  // Altezza del marchio dentro al chip, come frazione dell'altezza del chip.
  logos.forEach(function (el) {
    el.style.setProperty('--logo-scale', el.dataset.h || '0.5');
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var slots = [];         // posizioni in orbita, ognuna con la sua coda di token
  var rings = [];
  var raf = 0;
  var startedAt = 0;
  var elapsed = 0;                      // secondi di animazione già trascorsi

  // ------------------------------------------------------------ geometria

  function clamp(lo, v, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function hyp(a, b) { return Math.sqrt(a * a + b * b); }

  // Ruota un vettore secondo l'inclinazione delle orbite.
  function rotX(x, y) { return x * COS_T - y * SIN_T; }
  function rotY(x, y) { return x * SIN_T + y * COS_T; }

  // Due riquadri centrati in (0,0) e (dx,dy) sono separati?
  function apart(dx, dy, sumW, sumH) {
    return Math.abs(dx) >= sumW || Math.abs(dy) >= sumH;
  }

  // n token equidistanti sullo stesso anello non si toccano mai?
  // Bastano le coppie adiacenti: allontanandosi nell'indice entrambe le
  // componenti della distanza crescono, quindi il caso peggiore è quello.
  function fitsOnRing(rx, ry, n, w, h) {
    if (n < 2) return true;
    var d = 2 * Math.PI / n;
    var steps = 180;
    for (var i = 0; i < steps; i++) {
      var t = i * Math.PI / steps;
      var dx = rx * (Math.cos(t + d) - Math.cos(t));
      var dy = ry * (Math.sin(t + d) - Math.sin(t));
      if (!apart(rotX(dx, dy), rotY(dx, dy), w + MARGIN, h + MARGIN)) return false;
    }
    return true;
  }

  function capacity(rx, ry, w, h, limit) {
    var n = 1;
    while (n < limit && fitsOnRing(rx, ry, n + 1, w, h)) n++;
    return n;
  }

  // Due anelli girano a velocità diverse: prima o poi ogni combinazione di
  // angoli si presenta, quindi vanno esclusi tutti gli accoppiamenti.
  function ringsCompatible(a, b, sumW, sumH) {
    var steps = 128;
    for (var i = 0; i < steps; i++) {
      var u = 2 * Math.PI * i / steps;
      var ax = Math.cos(u) * a.rx, ay = Math.sin(u) * a.ry;
      for (var j = 0; j < steps; j++) {
        var v = 2 * Math.PI * j / steps;
        var dx = ax - Math.cos(v) * b.rx;
        var dy = ay - Math.sin(v) * b.ry;
        if (!apart(rotX(dx, dy), rotY(dx, dy), sumW, sumH)) return false;
      }
    }
    return true;
  }

  function measure() {
    var W = scene.clientWidth;
    var H = scene.clientHeight;
    var portrait = H > W;

    var chipW = Math.round(clamp(72, Math.min(W * 0.21, H * 0.28, 152), 152));
    var chipH = Math.round(chipW * 0.43);
    var flagW = Math.round(chipH * 0.62);
    var flagH = Math.round(flagW / 1.5);

    var logoW = Math.round(portrait ? clamp(150, W * 0.52, 330) : clamp(190, W * 0.24, 420));
    var logoH = logoW / LOGO_AR;
    var veilW = Math.round(logoW * 1.45);
    var veilH = Math.round(logoH * 1.60);

    var pad = Math.max(8, Math.min(W, H) * 0.02);
    var grow = 1 + BREATHE;

    // Spazio disponibile per il centro di un token, misurato dal centro scena.
    var availX = Math.max(1, W / 2 - chipW / 2 - pad);
    var availY = Math.max(1, H / 2 - chipH / 2 - pad);

    // Le ellissi sono inclinate: il loro ingombro non è (rx, ry) ma la
    // diagonale della rotazione. Il raggio va ricavato da lì, altrimenti i
    // token escono dai bordi.
    var k = availY / availX;
    var maxRx = Math.min(availX / hyp(COS_T, k * SIN_T),
                         availY / hyp(SIN_T, k * COS_T)) / grow;

    return {
      W: W, H: H, portrait: portrait, k: k,
      chipW: chipW, chipH: chipH, flagW: flagW, flagH: flagH,
      logoW: logoW, logoH: logoH, veilW: veilW, veilH: veilH,
      shrink: 1 - BREATHE,
      maxRx: maxRx,
      // Nessun anello deve entrare nel velo, o i token in cima e in fondo
      // all'orbita risulterebbero sbiaditi.
      minRy: veilH / 2 + chipH / 2 + 4
    };
  }

  // Costruisce gli anelli dall'esterno verso l'interno.
  function buildRings(g) {
    var out = [];
    if (g.maxRx <= 0) return out;

    var k = g.k;
    var minRx = Math.max(g.chipW * 0.45, g.minRy / k);
    var rx = g.maxRx;

    while (out.length < MAX_RINGS && rx >= minRx) {
      // Un'orbita che regge uno o due chip sembra un errore: meglio fermarsi
      // e lasciare lo spazio all'anello di sole bandiere, che è più piccolo.
      var cap = capacity(rx * g.shrink, rx * k * g.shrink, g.chipW, g.chipH, 40);
      if (cap < 3) break;
      out.push({ rx: rx, ry: rx * k, tw: g.chipW, th: g.chipH, mixed: true, cap: cap });

      var prev = { rx: rx * g.shrink, ry: rx * k * g.shrink };
      var next = rx - (g.chipW * 1.04 + MARGIN);
      while (next >= minRx &&
             !ringsCompatible(prev, { rx: next * g.shrink, ry: next * k * g.shrink },
                              g.chipW + MARGIN, g.chipH + MARGIN)) {
        next -= 4;
      }
      rx = next;
    }

    // Se resta spazio verso il centro, un ultimo anello di sole bandiere:
    // sono piccole, quindi entrano dove un chip non entrerebbe.
    if (out.length && out.length < MAX_RINGS && flags.length) {
      var last = out[out.length - 1];
      var minRxFlag = Math.max(g.flagW * 0.6, (g.veilH / 2 + g.flagH / 2 + 4) / k);
      var sumW = (g.chipW + g.flagW) / 2 + MARGIN;
      var sumH = (g.chipH + g.flagH) / 2 + MARGIN;
      var guard = { rx: last.rx * g.shrink, ry: last.ry * g.shrink };
      var fx = last.rx - sumW;
      while (fx >= minRxFlag &&
             !ringsCompatible(guard, { rx: fx * g.shrink, ry: fx * k * g.shrink }, sumW, sumH)) {
        fx -= 4;
      }
      if (fx >= minRxFlag) {
        var fcap = capacity(fx * g.shrink, fx * k * g.shrink, g.flagW, g.flagH, 40);
        if (fcap >= 3) {
          out.push({ rx: fx, ry: fx * k, tw: g.flagW, th: g.flagH, mixed: false, cap: fcap });
        }
      }
    }

    // Più l'orbita è esterna, più è lenta; i versi si alternano.
    out.forEach(function (r, i) {
      r.speed = (2 * Math.PI / (38 + i * 20)) * (i % 2 ? -1 : 1);
      r.offset = i * 0.9;
      r.take = [];
    });

    return out;
  }

  // Distribuisce i token sugli anelli: prima i loghi, spalmati su tutti gli
  // anelli che li accettano, poi le bandiere negli spazi rimasti. Ciò che
  // avanza finisce in coda alle posizioni già occupate e comparirà a turno.
  function buildSlots(list) {
    var mixed = list.filter(function (r) { return r.mixed; });
    var flagRings = list.filter(function (r) { return !r.mixed; });
    var i, r;

    function free(r) { return r.cap - r.take.length; }
    function spread(queue, targets) {
      var moved = true;
      while (queue.length && moved) {
        moved = false;
        for (i = 0; i < targets.length && queue.length; i++) {
          r = targets[i];
          if (free(r) > 0) { r.take.push(queue.shift()); moved = true; }
        }
      }
    }

    var restLogos = logos.slice();
    spread(restLogos, mixed);

    var restFlags = flags.slice();
    var taken = list.map(function (r) { return r.take.length; });
    spread(restFlags, flagRings.concat(mixed));

    // Loghi e bandiere arrivano in blocchi: distribuendoli uniformemente
    // lungo l'anello si evita che finiscano tutti dallo stesso lato.
    list.forEach(function (r, i) {
      var a = r.take.slice(0, taken[i]);
      var b = r.take.slice(taken[i]);
      if (!a.length || !b.length) return;
      var merged = [], ai = 0, bi = 0;
      while (merged.length < r.take.length) {
        if (ai < a.length && (bi >= b.length || (ai + 0.5) / a.length <= (bi + 0.5) / b.length)) {
          merged.push(a[ai++]);
        } else {
          merged.push(b[bi++]);
        }
      }
      r.take = merged;
    });

    // Una posizione ogni n, in modo che i token restino equidistanti.
    var out = [];
    list.forEach(function (r) {
      var n = r.take.length;
      r.take.forEach(function (el, idx) {
        out.push({
          rx: r.rx, ry: r.ry, speed: r.speed,
          phase: r.offset + (idx / n) * Math.PI * 2,
          queue: [el], index: 0,
          fading: null, fadeFrom: 0, cycle: null,
          kind: el.dataset.kind
        });
      });
    });

    // Turnazione: i token rimasti fuori si accodano alle posizioni compatibili.
    function enqueue(rest, kind) {
      if (!rest.length) return;
      var host = out.filter(function (s) { return s.kind === kind; });
      // Un logo sta solo dove c'è spazio per un chip; una bandiera sta ovunque.
      if (!host.length && kind === 'flag') host = out;
      if (!host.length) return;
      var j = 0;
      while (rest.length) {
        host[j % host.length].queue.push(rest.shift());
        j++;
      }
    }
    enqueue(restLogos, 'logo');
    enqueue(restFlags, 'flag');

    return out;
  }

  // ------------------------------------------------------------- disegno

  function applyLayout() {
    var g = measure();
    var style = scene.style;

    style.setProperty('--chip-w', g.chipW + 'px');
    style.setProperty('--chip-h', g.chipH + 'px');
    style.setProperty('--flag-w', g.flagW + 'px');
    style.setProperty('--flag-h', g.flagH + 'px');
    style.setProperty('--logo-w', g.logoW + 'px');
    style.setProperty('--veil-w', g.veilW + 'px');
    style.setProperty('--veil-h', g.veilH + 'px');
    style.setProperty('--scene-w', g.W + 'px');
    style.setProperty('--scene-h', g.H + 'px');

    rings = buildRings(g);
    slots = buildSlots(rings);

    all.forEach(function (el) { el.hidden = true; });
    slots.forEach(function (s) { s.queue[s.index].hidden = false; });

    // Il viewBox ha l'origine al centro della scena: le ellissi stanno in (0,0)
    // e basta trasformare il gruppo. Si aggiorna solo quando la scena cambia
    // dimensione, non a ogni fotogramma.
    orbitsBox.setAttribute('viewBox', (-g.W / 2) + ' ' + (-g.H / 2) + ' ' + g.W + ' ' + g.H);
    orbitEls.forEach(function (el, i) {
      var r = rings[i];
      if (!r) { el.setAttribute('rx', 0); el.setAttribute('ry', 0); el.setAttribute('opacity', 0); return; }
      el.setAttribute('rx', r.rx.toFixed(1));
      el.setAttribute('ry', r.ry.toFixed(1));
      el.setAttribute('opacity', (0.13 - i * 0.018).toFixed(3));
    });

    render(elapsed);
  }

  function place(el, x, y, sc, op) {
    el.style.transform = 'translate(-50%,-50%) translate3d(' +
      x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
    el.style.opacity = op.toFixed(3);
  }

  function render(t) {
    var breathe = 1 + BREATHE * Math.sin(t * 2 * Math.PI / BREATHE_PERIOD);
    var i, s;

    orbitG.setAttribute('transform', 'rotate(' + TILT + ') scale(' + breathe.toFixed(4) + ')');

    for (i = 0; i < slots.length; i++) {
      s = slots[i];
      var a = s.phase + t * s.speed;

      // Cambio del token: avviene esattamente nel punto più lontano
      // dell'orbita, dove opacità e scala sono al minimo.
      if (s.queue.length > 1) {
        var cycle = Math.floor((a - FAR) / (2 * Math.PI));
        if (s.cycle === null) {
          s.cycle = cycle;
        } else if (cycle !== s.cycle) {
          s.fading = s.queue[s.index];
          s.index = (s.index + (cycle > s.cycle ? 1 : -1) + s.queue.length) % s.queue.length;
          s.fadeFrom = t;
          s.cycle = cycle;
          s.queue[s.index].hidden = false;
        }
      }

      var ca = Math.cos(a), sa = Math.sin(a);
      var x0 = ca * s.rx * breathe;
      var y0 = sa * s.ry * breathe;
      var x = x0 * COS_T - y0 * SIN_T;
      var y = x0 * SIN_T + y0 * COS_T;
      var depth = (sa + 1) / 2;               // 0 = lontano (in alto), 1 = vicino
      var sc = DEPTH_MIN + (1 - DEPTH_MIN) * depth;
      var op = OPACITY_MIN + (1 - OPACITY_MIN) * depth;

      var p = s.fading ? Math.min(1, Math.abs(t - s.fadeFrom) / FADE) : 1;
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

  // ------------------------------------------------------------ ciclo vita

  function frame(now) {
    raf = requestAnimationFrame(frame);
    render(elapsed + (now - startedAt) / 1000);
  }

  function start() {
    if (raf || reduceMotion.matches) return;
    startedAt = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // Fermando il ciclo si memorizza il tempo trascorso: al riavvio (resize,
  // ritorno sulla scheda) il movimento riprende da dov'era, senza scatti.
  function stop() {
    if (raf) {
      elapsed += (performance.now() - startedAt) / 1000;
      cancelAnimationFrame(raf);
    }
    raf = 0;
  }

  var pending = 0;
  function relayout() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      var wasRunning = !!raf;
      stop();
      applyLayout();
      if (wasRunning) start();
    });
  }

  // Una bandiera che non arriva (Wikimedia irraggiungibile) esce dal giro
  // invece di lasciare l'icona di immagine rotta.
  flags.forEach(function (el) {
    el.firstElementChild.addEventListener('error', function () {
      var at = flags.indexOf(el);
      if (at >= 0) flags.splice(at, 1);
      var pos = all.indexOf(el);
      if (pos >= 0) all.splice(pos, 1);
      el.hidden = true;
      el.remove();
      relayout();
    });
  });

  scene.classList.add('is-orbiting');
  applyLayout();
  start();

  if (window.ResizeObserver) new ResizeObserver(relayout).observe(scene);
  else window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  reduceMotion.addEventListener('change', function () {
    if (reduceMotion.matches) { stop(); render(elapsed); } else start();
  });

  window.__agora = {
    measure: measure,
    render: render,
    get rings() { return rings; },
    get slots() { return slots; }
  };
})();
