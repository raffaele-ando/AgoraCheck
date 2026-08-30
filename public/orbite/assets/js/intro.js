/* Agorà — selettore dei design d'apertura.
 *
 * Le aperture provate finora sono conservate tutte, ognuna nel proprio file in
 * assets/js/aperture/. Il corpo di quei file è il codice del commit in cui il
 * design era in produzione, riportato senza modifiche; il markup del velo che
 * ciascuno si aspetta sta nei <template data-aperture="..."> di index.html,
 * anch'esso identico all'originale. Questo file non anima nulla: sceglie un
 * design, gli mette in pagina il suo markup, lo avvia, e costruisce la barra
 * per passare da uno all'altro.
 *
 * Il cambio ricarica la pagina. È il modo più pulito di rivedere un'apertura —
 * è esattamente quello che vede chi entra nel sito — ed evita che il ciclo di
 * animazione del design precedente resti in giro a girare a vuoto.
 */
(function () {
  'use strict';

  var registry = window.AgoraAperture;
  if (!registry || !registry.items) return;

  // L'unica differenza di stile fra i design è il fondo del contenitore: scuro
  // nel primo, uguale a quello della scena negli altri tre.
  var DESIGNS = [
    { id: 'marchio',      label: 'Marchio',          ground: 'scuro',
      hint: 'Fondo scuro, archi crema: il marchio cresce fino alla sua misura, resta un istante, poi la sua porta si allarga e scopre il sito.' },
    { id: 'sequenza',     label: 'Sequenza',         ground: 'crema',
      hint: 'Fondo crema, porte nere: le cinque porte partono una dopo l’altra, dalla più esterna alla più interna. L’ultima scopre il sito.' },
    { id: 'tunnel-unico', label: 'Tunnel · 1 porta',  ground: 'crema',
      hint: 'Tunnel di porte tutte della stessa forma: il vano del marchio ripetuto a distanze diverse.' },
    { id: 'tunnel-archi', label: 'Tunnel · 5 archi',  ground: 'crema',
      hint: 'Tunnel fatto da tutti e cinque gli archi del marchio, con la profondità ordinata perché la prospettiva funzioni.' }
  ];
  var FALLBACK = 'tunnel-archi';
  var STORE = 'agora:apertura';

  function byId(id) {
    for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].id === id) return DESIGNS[i];
    return null;
  }
  function remember(id) { try { localStorage.setItem(STORE, id); } catch (e) {} }
  function recall() {
    var v = null;
    try { v = localStorage.getItem(STORE); } catch (e) {}
    return byId(v) || byId(FALLBACK) || DESIGNS[0];
  }

  var current = recall();

  // --- avvio del design scelto --------------------------------------------
  // Con movimento ridotto non c'è nessuna apertura da mostrare, e nemmeno da
  // scegliere: la pagina si presenta già aperta.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var tpl = document.querySelector('template[data-aperture="' + current.id + '"]');
    var run = registry.items[current.id];
    if (tpl && run) {
      var frag = tpl.content.cloneNode(true);
      var portal = frag.querySelector('.portal');
      if (portal) portal.classList.add('portal--' + current.ground);
      document.body.insertBefore(frag, document.body.firstChild);
      run();
      // Il fondo d'attesa se ne va nello stesso fotogramma in cui il velo
      // disegna per la prima volta: run() ha già chiesto il suo
      // requestAnimationFrame, quindi questo arriva subito dopo il suo, prima
      // che il fotogramma sia dipinto. Un istante prima e si vedrebbe il
      // fallback, un istante dopo e il velo sarebbe già aperto su un fondo
      // pieno invece che sul sito.
      requestAnimationFrame(clearGround);
    } else {
      clearGround();
    }
    buildPicker();
  } else {
    clearGround();
  }

  function clearGround() {
    var g = document.querySelector('.ground');
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }

  // --- la barra di scelta --------------------------------------------------
  function buildPicker() {
    var bar = document.createElement('div');
    bar.className = 'picker';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Design dell’apertura');

    var name = document.createElement('span');
    name.className = 'picker__title';
    name.textContent = 'Apertura';
    bar.appendChild(name);

    DESIGNS.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker__opt';
      b.textContent = d.label;
      b.title = d.hint;
      b.setAttribute('aria-pressed', d.id === current.id ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (d.id === current.id) { location.reload(); return; }
        remember(d.id);
        location.reload();
      });
      bar.appendChild(b);
    });

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'picker__again';
    again.textContent = 'Rivedi';
    again.title = 'Ricarica la pagina e rimette in scena l’apertura scelta';
    again.addEventListener('click', function () { location.reload(); });
    bar.appendChild(again);

    document.body.appendChild(bar);
  }
})();
