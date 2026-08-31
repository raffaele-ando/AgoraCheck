/* Agorà — apertura «Sequenza» (c37e886).
 *
 * Il corpo di questo file è il contenuto di assets/js/intro.js al commit c37e886,
 * riportato senza modifiche: solo racchiuso in una funzione, perché il
 * selettore possa avviarlo dopo aver inserito il markup che gli serve.
 * Il markup sta in index.html, nel <template data-aperture="sequenza">.
 */
window.AgoraAperture.register('sequenza', function () {
  /* Agorà — apertura del sito: le porte del brandmark, una dopo l'altra.
   *
   * Il marchio al centro di "Agorà" è una pila di cinque archi concentrici:
   * cinque porte. All'ingresso le attraversiamo una alla volta. Su fondo crema,
   * ogni porta nasce piccola al centro, si allarga accelerando ed esce dallo
   * schermo; la successiva parte mentre la precedente è ancora in volo, così una
   * porta segue l'altra come in un corridoio.
   *
   * Le porte partono dalla più esterna alla più interna. L'ultima a partire è
   * quella interna, il vano vero del marchio: è la sua apertura a fare da
   * finestra sul sito. Cresce senza mai richiudersi e finisce l'apertura, e il
   * bordo della finestra coincide sempre col suo arco nero, che lo nasconde.
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
    var LAUNCH = [0, 1, 2, 3, 4]; // ordine di partenza: dalla più esterna alla più interna
    var DOOR = LAUNCH[LAUNCH.length - 1];   // l'ultima porta fa da finestra
    var DOOR_DOWN = 91.2;         // quanto scende quel vano sotto il proprio centro

    // --- tempi (ms) ----------------------------------------------------------
    // Il rapporto fra la scala di una porta e quella della successiva è
    // (scalaFinale/scalaIniziale)^(T_STAGGER/T_TRAVEL): con questi valori vale
    // circa 1,6, cioè in scena stanno tutte e cinque le porte annidate, con le
    // proporzioni del marchio.
    var T_STAGGER = 170;          // distanza fra una porta e la successiva
    var T_TRAVEL = 1300;          // volo di ogni porta, dal centro fuori campo
    var T_FADE = 260;             // comparsa di ogni porta
    var START_PX = 44;            // larghezza in pixel con cui una porta nasce
    var TOTAL = T_STAGGER * (LAUNCH.length - 1) + T_TRAVEL + 60;

    var host = document.getElementById('portal');
    var svg  = document.getElementById('portal-svg');
    var veil = document.getElementById('portal-veil');
    var grad = document.getElementById('portal-bg');
    var barEls = host ? [].slice.call(host.querySelectorAll('.portal__bar')) : [];
    if (!host || !svg || !veil || !grad || barEls.length !== LAUNCH.length) return;

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

    function doorPath(a, b) {
      var xL = a.cx - a.ri, xR = a.cx + a.ri;
      return b.M(xL, cutY(xL)) + b.L(xL, a.cy) + b.top(a.cx, a.cy, a.ri, +1) +
             b.L(xR, cutY(xR)) + b.cut(xL, cutY(xL)) + 'Z';
    }

    // Ogni porta è centrata sullo schermo e cresce di scala. La crescita è
    // esponenziale: a velocità relativa costante, come un oggetto che ci viene
    // incontro, e non "parte piano e poi scatta".
    function scaleAt(a, u, halfDiag) {
      var s0 = START_PX / (2 * a.ro);
      var s1 = (halfDiag / a.ri) * 1.15;      // abbastanza per uscire di scena
      return s0 * Math.pow(s1 / s0, clamp01(u / T_TRAVEL));
    }

    // --- ciclo ---------------------------------------------------------------
    var elapsed = 0, last = 0, speed = 1, raf = 0;
    var cleared = false, released = false, vbW = 0, vbH = 0;
    var barGone = [false, false, false, false, false];

    function frame(now) {
      if (!host) return;
      if (!last) last = now;
      elapsed += (now - last) * speed;
      last = now;

      var W = window.innerWidth, H = window.innerHeight;
      if (vbW !== W || vbH !== H) {
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        // Lo stesso sfondo della scena, così il bordo della finestra non si vede
        // come un salto di tono: resta visibile solo il nero delle porte.
        grad.setAttribute('gradientTransform',
          'translate(' + (W / 2) + ' ' + (H / 2) + ') scale(' + (W * 1.2) + ' ' + (H * 0.9) + ')');
        vbW = W; vbH = H;
        barGone = [false, false, false, false, false];
      }
      var halfDiag = Math.sqrt(W * W + H * H) / 2;

      // Le porte: la prima partita è la più grande, quindi va disegnata per
      // ultima, sopra le altre.
      var revealS = 0;
      for (var n = 0; n < LAUNCH.length; n++) {
        var a = ARCHES[LAUNCH[n]];
        var el = barEls[LAUNCH.length - 1 - n];
        var u = elapsed - n * T_STAGGER;
        if (u <= 0) continue;
        var s = scaleAt(a, u, halfDiag);
        if (LAUNCH[n] === DOOR) revealS = s;
        if (barGone[n]) continue;
        if (a.ri * s > halfDiag * 1.12) { el.setAttribute('d', ''); barGone[n] = true; continue; }
        var b = builder(s, W / 2 - a.cx * s, H / 2 - a.cy * s);
        el.setAttribute('d', archPath(a, b));
        el.setAttribute('opacity', clamp01(u / T_FADE).toFixed(3));
      }

      // La finestra: il vano dell'arco più interno. Quando ha superato lo
      // schermo il velo non serve più e la pagina torna interattiva.
      var d = ARCHES[DOOR];
      if (revealS * d.ri > halfDiag && revealS * DOOR_DOWN > H / 2) {
        if (!released) {
          veil.setAttribute('d', '');
          host.style.pointerEvents = 'none';
          document.documentElement.classList.remove('is-opening');
          released = true;
        }
      } else {
        var bd = builder(revealS, W / 2 - d.cx * revealS, H / 2 - d.cy * revealS);
        veil.setAttribute('d', 'M-1 -1H' + (W + 1) + 'V' + (H + 1) + 'H-1Z' + doorPath(d, bd));
      }

      if (!cleared) { host.style.background = 'transparent'; cleared = true; }
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
