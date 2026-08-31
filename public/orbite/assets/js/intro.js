/* Agorà — apertura del sito attraverso il brandmark.
 *
 * Il marchio al centro di "Agorà" è una pila di cinque archi concentrici: una
 * porta. All'ingresso quella porta si apre. Gli archi compaiono piccoli al
 * centro su fondo scuro, uno dopo l'altro dall'interno verso l'esterno,
 * crescono fino alla dimensione del marchio, poi si allargano accelerando
 * finché superano lo schermo: il sito si vede solo attraverso il vano
 * dell'arco più interno, che diventa la finestra.
 *
 * La geometria non è ridisegnata a occhio: è misurata da assets/img/agora-logo.png
 * e riprodotta con archi di cerchio esatti. Riferimento: origine nel punto in cui
 * il cerchio che taglia le gambe degli archi tocca la linea di base del
 * logotipo; una unità = un pixel del PNG originale.
 */
(function () {
  'use strict';

  // --- geometria misurata del brandmark ------------------------------------
  var CUT_R = 164.319, CUT_CY = -164.319;      // cerchio che taglia le gambe
  var ARCHES = [
    { cx: -0.004, cy: -97.725, ro: 144.008, ri: 136.116 },
    { cx: -0.108, cy: -96.286, ro: 117.483, ri: 109.534 },
    { cx:  0.187, cy: -96.716, ro:  90.429, ri:  82.566 },
    { cx:  0.185, cy: -96.026, ro:  65.143, ri:  57.311 },
    { cx: -0.339, cy: -94.476, ro:  40.294, ri:  32.453 }
  ];
  var MARK_W = 288.02;          // larghezza del marchio, in unità
  var MARK_CX = -0.004;         // centro del riquadro del marchio
  var MARK_CY = -122.451;
  var DOOR = ARCHES[4];         // il vano dell'arco interno è la porta
  var DOOR_DOWN = 91.2;         // quanto scende il vano sotto il proprio centro

  // --- tempi (ms) ----------------------------------------------------------
  var T_GROW = 780;             // comparsa e crescita fino alla dimensione del marchio
  var T_HOLD = 240;             // pausa: il marchio si legge
  var T_OPEN = 1120;            // apertura accelerata oltre i bordi
  var TOTAL = T_GROW + T_HOLD + T_OPEN;
  var STAGGER = 90;             // ritardo fra un arco e il successivo

  var host = document.getElementById('portal');
  var svg  = document.getElementById('portal-svg');
  var veil = document.getElementById('portal-veil');
  var plug = document.getElementById('portal-plug');
  var barEls = host ? [].slice.call(host.querySelectorAll('.portal__bar')) : [];
  if (!host || !svg || !veil || !plug || barEls.length !== ARCHES.length) return;

  function finish() {
    if (!host) return;
    if (host.parentNode) host.parentNode.removeChild(host);
    host = null;
    document.documentElement.classList.remove('is-opening');
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }

  // --- costruzione dei tracciati -------------------------------------------
  // Generati direttamente in coordinate schermo: solo linee e archi di
  // cerchio, nessuna approssimazione con curve.
  function cutY(dx) { return CUT_CY + Math.sqrt(Math.max(0, CUT_R * CUT_R - dx * dx)); }
  function n2(v) { return Math.round(v * 100) / 100; }

  function builder(s, px, py) {
    function X(x) { return n2(px + x * s); }
    function Y(y) { return n2(py + y * s); }
    function R(r) { return n2(r * s); }
    return {
      M: function (x, y) { return 'M' + X(x) + ' ' + Y(y); },
      L: function (x, y) { return 'L' + X(x) + ' ' + Y(y); },
      // semicerchio superiore in due quarti: evita l'ambiguità dei 180°
      top: function (cx, cy, r, dir) {
        var f = dir > 0 ? '1' : '0';
        return 'A' + R(r) + ' ' + R(r) + ' 0 0 ' + f + ' ' + X(cx) + ' ' + Y(cy - r) +
               'A' + R(r) + ' ' + R(r) + ' 0 0 ' + f + ' ' + X(cx + dir * r) + ' ' + Y(cy);
      },
      cut: function (x, y) { return 'A' + R(CUT_R) + ' ' + R(CUT_R) + ' 0 0 0 ' + X(x) + ' ' + Y(y); }
    };
  }

  function archPath(a, b) {
    var xoL = a.cx - a.ro, xoR = a.cx + a.ro, xiL = a.cx - a.ri, xiR = a.cx + a.ri;
    return b.M(xoL, cutY(xoL)) + b.L(xoL, a.cy) + b.top(a.cx, a.cy, a.ro, +1) +
           b.L(xoR, cutY(xoR)) + b.cut(xiR, cutY(xiR)) +
           b.L(xiR, a.cy) + b.top(a.cx, a.cy, a.ri, -1) +
           b.L(xiL, cutY(xiL)) + b.cut(xoL, cutY(xoL)) + 'Z';
  }

  function doorPath(b) {
    var xL = DOOR.cx - DOOR.ri, xR = DOOR.cx + DOOR.ri;
    return b.M(xL, cutY(xL)) + b.L(xL, DOOR.cy) + b.top(DOOR.cx, DOOR.cy, DOOR.ri, +1) +
           b.L(xR, cutY(xR)) + b.cut(xL, cutY(xL)) + 'Z';
  }

  // --- animazione ----------------------------------------------------------
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return Math.pow(t, 2.4); }
  function clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); }

  var elapsed = 0, last = 0, speed = 1, raf = 0, cleared = false, plugGone = false;
  var barDone = [false, false, false, false, false];

  // Frazione di apertura già percorsa (0 durante crescita e posa).
  function openProgress(t) {
    return clamp01((t - T_GROW - T_HOLD) / T_OPEN);
  }

  // Il punto che resta al centro dello schermo. A riposo è il centro ottico del
  // marchio, così si legge come nel logo; aprendosi diventa il centro del vano,
  // perché la finestra cresca simmetrica sullo schermo.
  function anchor(t) {
    var k = easeOut(clamp01(openProgress(t) / 0.28));
    return { x: MARK_CX + (DOOR.cx - MARK_CX) * k, y: MARK_CY + (DOOR.cy - MARK_CY) * k };
  }

  function scaleFor(t, W, H) {
    var target = Math.max(150, Math.min(Math.min(W, H) * 0.30, 340));
    var sLogo = target / MARK_W;                 // il marchio alla sua misura
    var sStart = sLogo * 0.05;                   // piccolo al centro
    // apertura finale: il vano deve contenere tutto il viewport, angoli compresi
    var need = Math.max(Math.sqrt(W * W + H * H) / 2 / DOOR.ri, (H / 2) / DOOR_DOWN);
    var sEnd = need * 1.35;   // margine: la porta esce di scena, non si limita a combaciare

    if (t < T_GROW) return sStart + (sLogo - sStart) * easeOut(t / T_GROW);
    return sLogo + (sEnd - sLogo) * easeIn(openProgress(t));
  }

  function frame(now) {
    if (!host) return;
    if (!last) last = now;
    elapsed += (now - last) * speed;
    last = now;

    var W = window.innerWidth, H = window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var s = scaleFor(elapsed, W, H);
    var a = anchor(elapsed);
    var px = W / 2 - a.x * s;
    var py = H / 2 - a.y * s;
    var b = builder(s, px, py);

    // Velo scuro col vano ritagliato: un solo tracciato, fill-rule evenodd.
    // Il rettangolo copre esattamente il viewport e nulla di più: ridisegnare
    // ogni fotogramma un rettangolo più grande costa, e non servirebbe.
    veil.setAttribute('d', 'M-1 -1H' + (W + 1) + 'V' + (H + 1) + 'H-1Z' + doorPath(b));

    // Il tappo si toglie quando la porta è già in movimento, con una
    // dissolvenza breve: a mezza opacità sul crema risulterebbe grigiastro.
    // Finito il suo compito esce dal disegno, per non pesare sui fotogrammi.
    var plugOp = 1 - clamp01((openProgress(elapsed) - 0.05) / 0.09);
    if (plugOp > 0) {
      plug.setAttribute('d', doorPath(b));
      plug.setAttribute('opacity', plugOp.toFixed(3));
    } else if (!plugGone) {
      plug.setAttribute('d', '');
      plugGone = true;
    }

    // Gli archi compaiono dall'interno verso l'esterno. Quando il raggio
    // interno di un arco ha superato lo schermo, l'arco non è più visibile:
    // si smette di ridisegnarlo.
    var reach = Math.sqrt(W * W + H * H) / 2 + 4;
    for (var i = 0; i < ARCHES.length; i++) {
      if (barDone[i]) continue;
      if (ARCHES[i].ri * s > reach) { barEls[i].setAttribute('d', ''); barDone[i] = true; continue; }
      barEls[i].setAttribute('d', archPath(ARCHES[i], b));
      var appear = clamp01((elapsed - (ARCHES.length - 1 - i) * STAGGER) / 320);
      barEls[i].setAttribute('opacity', easeOut(appear).toFixed(3));
    }

    if (!cleared) { host.style.background = 'transparent'; cleared = true; }

    // ultimo tratto: dissolvenza di sicurezza se restasse un angolo scoperto
    if (elapsed > TOTAL - 200) {
      veil.setAttribute('opacity', clamp01((TOTAL - elapsed) / 200).toFixed(3));
    }

    if (elapsed >= TOTAL) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  // un tocco, un tasto o uno scroll accelerano l'apertura
  function hurry() { speed = 6; }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, hurry, { once: true, passive: true });
  });

  document.documentElement.classList.add('is-opening');
  raf = requestAnimationFrame(frame);
})();
