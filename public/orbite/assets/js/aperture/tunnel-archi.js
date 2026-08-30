/* Agorà — apertura «Tunnel · cinque archi» (77bcd1d).
 *
 * Il corpo di questo file è il contenuto di assets/js/intro.js al commit 77bcd1d,
 * riportato senza modifiche: solo racchiuso in una funzione, perché il
 * selettore possa avviarlo dopo aver inserito il markup che gli serve.
 * Il markup sta in index.html, nel <template data-aperture="tunnel-archi">.
 */
window.AgoraAperture.register('tunnel-archi', function () {
  /* Agorà — apertura del sito: un tunnel fatto dai cinque archi del marchio.
   *
   * Il marchio al centro di "Agorà" è una pila di cinque archi concentrici.
   * All'ingresso quei cinque archi diventano le porte di un tunnel: ognuna arriva
   * addosso — nasce piccola al centro, si allarga accelerando ed esce dallo
   * schermo — e le altre sono già in arrivo dietro di lei. Poi si è fuori: il
   * sito.
   *
   * L'ordine di profondità non è arbitrario. Nel marchio il tratto è sempre
   * spesso circa 7,9 unità, quindi l'arco interno lo ha spesso rispetto al
   * proprio raggio (7,9 su 36) e quello esterno sottile (7,9 su 140). Poiché un
   * tratto spesso si legge come "vicino", la porta più vicina deve essere l'arco
   * più interno e la più lontana l'arco più esterno: così raggio e spessore
   * calano insieme con la distanza. Con l'ordine opposto la prospettiva risulta
   * rovesciata, e la porta grande sembra la più lontana.
   *
   * Tutte le porte nascono con lo stesso raggio in pixel e crescono alla stessa
   * velocità relativa: è la scala di ciascun arco a essere ricavata dal proprio
   * raggio, non il contrario. Così l'annidamento resta uniforme come in
   * prospettiva, e ogni porta conserva le proporzioni che ha nel logo.
   *
   * Il sito si vede in fondo al tunnel: la finestra segue il vano della porta più
   * lontana, quindi i contenuti compaiono al centro, inquadrati dalle porte più
   * vicine. Il bordo è sfumato invece che netto: il vano dell'arco più esterno è
   * una fessura bassa e larga, e un ritaglio secco su quella forma lascerebbe un
   * bordo visibile dove i chip vengono tagliati.
   *
   * La geometria non è ridisegnata a occhio: è misurata da assets/img/agora-logo.png
   * e riprodotta con archi di cerchio esatti (vedi assets/img/brandmark.md).
   * Riferimento: origine nel punto in cui il cerchio che taglia le gambe degli
   * archi tocca la linea di base del logotipo; una unità = un pixel del PNG.
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
    // Ordine di profondità: la prima è la più vicina. Dall'arco più interno al
    // più esterno, perché il tratto cali insieme al raggio.
    var DEPTH = [4, 3, 2, 1, 0];
    var RINGS = DEPTH.length;

    // --- tempi (ms) e misure -------------------------------------------------
    // Il rapporto di annidamento fra una porta e quella dietro di lei è
    // (RHO_END/RHO_START)^(T_STAGGER/T_TRAVEL): con questi valori vale circa 1,6.
    var T_STAGGER = 154;          // distanza fra una porta e la successiva
    var T_TRAVEL = 1350;          // volo di ogni porta, dal centro fuori campo
    var T_FADE = 260;             // comparsa di ogni porta
    var RHO_START = 15;           // raggio del vano, in px, alla nascita
    var TOTAL = T_STAGGER * (RINGS - 1) + T_TRAVEL + 60;

    var HOLE_CORE = 0.74;         // frazione del raggio in cui la finestra è piena
    var HOLE_LEAD = 1.30;         // quanto la finestra precede la porta più lontana
    // Il velo usa un gradiente circolare centrato come il tunnel. Il raggio è
    // scelto perché il colore combaci con lo sfondo della scena sull'angolo dello
    // schermo: là la sfumatura ellittica della pagina è all'offset
    // sqrt((1/2.4)² + (1/1.8)²) = 0,694 della propria estensione.
    var VEIL_R = 1 / Math.sqrt(1 / (2.4 * 2.4) + 1 / (1.8 * 1.8));
    var C_IN = [244, 241, 234], C_OUT = [234, 224, 208];

    var host = document.getElementById('portal');
    var svg  = document.getElementById('portal-svg');
    var grad = document.getElementById('portal-bg');
    var stops = host ? [].slice.call(host.querySelectorAll('#portal-bg stop')) : [];
    var barEls = host ? [].slice.call(host.querySelectorAll('.portal__bar')) : [];
    if (!host || !svg || !grad || stops.length !== 4 || barEls.length !== RINGS) return;

    function finish() {
      if (!host) return;
      if (host.parentNode) host.parentNode.removeChild(host);
      host = null;
      document.documentElement.classList.remove('is-opening');
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }

    // --- costruzione dei tracciati -------------------------------------------
    function cutY(dx) { return CUT_CY + Math.sqrt(Math.max(0, CUT_R * CUT_R - dx * dx)); }
    function n2(v) { return Math.round(v * 100) / 100; }
    function clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); }

    function colAt(t) {
      t = clamp01(t);
      return 'rgb(' + Math.round(C_IN[0] + (C_OUT[0] - C_IN[0]) * t) + ',' +
                      Math.round(C_IN[1] + (C_OUT[1] - C_IN[1]) * t) + ',' +
                      Math.round(C_IN[2] + (C_OUT[2] - C_IN[2]) * t) + ')';
    }
    var lastO1 = -1;
    function setWindow(o1, o2) {
      if (Math.abs(o1 - lastO1) < 0.0015) return;
      lastO1 = o1;
      stops[1].setAttribute('offset', o1.toFixed(4));
      stops[1].setAttribute('stop-color', colAt(o1));
      stops[2].setAttribute('offset', o2.toFixed(4));
      stops[2].setAttribute('stop-color', colAt(o2));
    }

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


    // --- ciclo ---------------------------------------------------------------
    var elapsed = 0, last = 0, speed = 1, raf = 0;
    var released = false, cleared = false, vbW = 0, vbH = 0;
    var barGone = [false, false, false, false, false];

    function frame(now) {
      if (!host) return;
      if (!last) last = now;
      elapsed += (now - last) * speed;
      last = now;

      var W = window.innerWidth, H = window.innerHeight;
      var halfDiag = Math.sqrt(W * W + H * H) / 2;
      var veilR = halfDiag * VEIL_R;
      if (vbW !== W || vbH !== H) {
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        grad.setAttribute('gradientTransform',
          'translate(' + (W / 2) + ' ' + (H / 2) + ') scale(' + veilR.toFixed(1) + ')');
        vbW = W; vbH = H;
        lastO1 = -1;
        barGone = [false, false, false, false, false];
      }
      var rhoEnd = halfDiag * 1.15;

      // Le porte. La più vicina è la prima partita, quindi va disegnata per
      // ultima, sopra le altre.
      for (var n = 0; n < RINGS; n++) {
        if (barGone[n]) continue;
        var el = barEls[RINGS - 1 - n];
        var u = elapsed - n * T_STAGGER;
        if (u <= 0) continue;
        // Ogni porta nasce con lo stesso raggio del vano in pixel e cresce alla
        // stessa velocità relativa: la scala esce dal raggio del proprio arco.
        var rho = RHO_START * Math.pow(rhoEnd / RHO_START, clamp01(u / T_TRAVEL));
        if (rho > halfDiag * 1.12) { el.setAttribute('d', ''); barGone[n] = true; continue; }
        var a = ARCHES[DEPTH[n]];
        var s = rho / a.ri;
        var b = builder(s, W / 2 - a.cx * s, H / 2 - a.cy * s);
        el.setAttribute('d', archPath(a, b));
        el.setAttribute('opacity', clamp01(u / T_FADE).toFixed(3));
      }

      // La finestra sul sito è il fondo del tunnel: segue il vano della porta più
      // lontana, quindi i contenuti compaiono al centro, inquadrati dalle altre.
      var uFar = elapsed - (RINGS - 1) * T_STAGGER;
      var rhoFar = uFar <= 0 ? 0
        : RHO_START * Math.pow(rhoEnd / RHO_START, clamp01(uFar / T_TRAVEL));
      var reveal = rhoFar * HOLE_LEAD;
      var o1 = clamp01(reveal / veilR);
      setWindow(o1, clamp01(reveal / (HOLE_CORE * veilR)));
      var p = reveal >= halfDiag ? 1 : 0;
      // Il fondo sul contenitore serve solo al primo disegno, prima che lo
      // script riempia il velo: da qui in poi deve lasciar passare la pagina.
      if (!cleared) { host.style.background = 'transparent'; cleared = true; }
      if (p >= 1 && !released) {
        host.style.pointerEvents = 'none';
        document.documentElement.classList.remove('is-opening');
        released = true;
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
});
