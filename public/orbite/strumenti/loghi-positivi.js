/* Rigenera le quattro varianti per fondo bianco dai file originali.
 *
 *   node strumenti/loghi-positivi.js [cartella-di-uscita]
 *
 * Serve perché le modifiche di colore siano verificabili: rilanciandolo si
 * riottengono gli stessi file, byte per byte. Nessuna forma viene ridisegnata o
 * spostata — si tocca solo il colore, e solo dove il file è la versione in
 * negativo, quella pensata per i fondi scuri.
 *
 * Unica eccezione alla riproducibilità: Unito-nuovo.svg viene poi passato da
 * svgo, come tutti gli altri file in assets/loghi/ (30 KB -> 22 KB, disegno
 * identico al 99,9%). Rilanciando questo script si riottiene la versione non
 * ottimizzata, che disegna la stessa cosa.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LOGHI = path.join(__dirname, '..', 'assets', 'loghi');
const USCITA = process.argv[2] || LOGHI;
const INCHIOSTRO = '#1D1D1B';   // il nero dei marchi Illustrator, non #000
const VIOLA = [49, 39, 131];    // il viola IULM, letto dal file stesso
const LUISS_BLU = '#003A70';    // dal file ufficiale Luiss_ML_POS_COL_RGB.png

// ---------------------------------------------------------------- LUISS
// Il file scaricato dal sito è la versione in negativo (bianca, per l'header
// scuro) e ha anche una cornice sbagliata: width/height dicono 176x72 mentre il
// viewBox è 348x64, quindi il marchio veniva disegnato dentro un rettangolo
// alto il doppio del necessario e nel chip risultava piccolo.
//
// Il colore giusto non è il nero: il file ufficiale della versione positiva a
// colori — Luiss_ML_POS_COL_RGB.png, dove POS COL sta per «positivo colore» —
// è blu #003A70. Il disegno è lo stesso: rese alla stessa altezza, le due
// sagome si sovrappongono al 90,5%.
{
  let s = fs.readFileSync(path.join(LOGHI, 'LUISS.svg'), 'utf8');
  s = s.replace(/fill="#fff"/gi, 'fill="' + LUISS_BLU + '"')
       .replace(/\swidth="176"/, '').replace(/\sheight="72"/, '');
  fs.writeFileSync(path.join(USCITA, 'LUISS-ufficiale.svg'), s);
}

// ---------------------------------------------------------------- Unimi
// Negativo bianco più le ombre di un mockup Sketch: un'ombra esterna sul
// gruppo e due interne disegnate da <use fill="#000">. Su bianco si vedevano
// come un alone grigio, e non fanno parte del marchio.
{
  let s = fs.readFileSync(path.join(LOGHI, 'Unimi.svg'), 'utf8');
  s = s.replace(/fill="#FFF"/gi, 'fill="' + INCHIOSTRO + '"')
       .replace(/<use[^>]*fill="#000"[^>]*\/>/g, '')
       .replace(/\sfilter="url\(#filter-\d\)"/g, '')
       .replace(/<filter[\s\S]*?<\/filter>/g, '');
  fs.writeFileSync(path.join(USCITA, 'Unimi-positivo.svg'), s);
}

// ---------------------------------------------------------------- Unige
// Il marchio istituzionale UniGe è lo scudo a colori più il logotipo
// «Università di Genova». Il file caricato ha entrambe le parti, ma lo scudo è
// un disegno monocromatico, e per di più usa le classi st0/st1/st2 senza
// dichiararle: senza definizione tutto cade sul nero di default e lo scudo
// diventa una macchia.
//
// Quindi il logotipo — che nel file è un unico tracciato vettoriale — resta
// dov'è, e al posto del disegno monocromatico dello scudo va lo stemma a
// colori (assets/loghi/fonti/unige-stemma.png), nella stessa casella che
// occupava prima: x -0,1 y 3,1 larga 94,7 alta 117 unità, misurate con
// getBBox sul file originale. Con preserveAspectRatio non si deforma.
//
// I colori dello stemma sono quelli del manuale: blu UniGe #002677, giallo
// #F4DA40, rosso #C8102E, grigio scuro #333333.
{
  const s = fs.readFileSync(path.join(LOGHI, 'Unige.svg'), 'utf8');
  // il logotipo è il tracciato più lungo; tutto il resto è lo scudo
  const tracciati = [...s.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]);
  const logotipo = tracciati.reduce((a, b) => (b.length > a.length ? b : a), '');
  const stemma = decodePng(fs.readFileSync(path.join(LOGHI, 'fonti', 'unige-stemma.png')));
  const piccolo = riduci(stemma, 3);   // 3× basta: nel chip lo scudo sta in ~40 px
  const uri = 'data:image/png;base64,' +
    encodePng(piccolo.w, piccolo.h, piccolo.rgba).toString('base64');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 478.7 121">' +
    '<image x="-.1" y="3.1" width="94.7" height="117" ' +
    'preserveAspectRatio="xMidYMid meet" href="' + uri + '"/>' +
    logotipo.replace(/\sclass="st\d"/, '').replace('<path', '<path fill="' + INCHIOSTRO + '"') +
    '</svg>';
  fs.writeFileSync(path.join(USCITA, 'Unige-colore.svg'), svg);
}

// ---------------------------------------------------------------- Unito
// Il file caricato è il marchio vecchio: sigillo nero e «UNIVERSITÀ DI TORINO»
// in nero. Dal giugno 2022 UniTo ha un marchio nuovo — sigillo rosso, il nome
// in grigio con «UNI» e «TO» in rosso — ed è quello che sta in
// fonti/unito-marchio.svg (export Illustrator, id LOGO_UNITO_VERTICALE, colori
// #EA0029 rosso e #54565A grigio).
//
// Quel file però nasconde metà del marchio: il viewBox è 517x543, larghezza da
// solo sigillo, e un clipPath taglia allo stesso riquadro, così il logotipo
// accanto non si vede. Misurato con getBBox, il disegno intero occupa
// 1334,6 x 543,2: si toglie il ritaglio e si allarga la cornice.
{
  let s = fs.readFileSync(path.join(LOGHI, 'fonti', 'unito-marchio.svg'), 'utf8');
  s = s.replace(/\swidth="[\d.]+"/, '').replace(/\sheight="[\d.]+"/, '')
       .replace(/\sclip-path="url\(#[^"]*\)"/g, '')
       .replace(/viewBox="[^"]*"/, 'viewBox="0 0 1334.6 543.2"')
       // il ritaglio non serve più a nessuno, e con lui vanno via i <defs>
       .replace(/<defs[\s\S]*?<\/defs>/g, '')
       .replace(/<(sodipodi:namedview|metadata)[\s\S]*?<\/\1>/g, '')
       .replace(/<sodipodi:namedview[^>]*\/>/g, '');
  fs.writeFileSync(path.join(USCITA, 'Unito-nuovo.svg'), s);
}

// ---------------------------------------------------------------- IULM
// Disco bianco con «IULM» viola dentro e «università iulm» in bianco fuori.
// Su bianco il disco non si vede — ed è giusto — ma finché resta nel file
// occupa tutta l'altezza dell'immagine e il chip finisce per dimensionare il
// logo sul disco invisibile, rimpicciolendo le lettere. Quindi: la scritta
// fuori dal disco passa al viola del marchio, il disco diventa trasparente e
// l'immagine si ritaglia sul contenuto che si vede.
{
  const A = decodePng(fs.readFileSync(path.join(LOGHI, 'IULM.png')));
  const at = (x, y) => (y * A.w + x) * 4;
  const bianco = (i) => A.rgba[i + 3] > 8 &&
    A.rgba[i] > 150 && A.rgba[i + 1] > 150 && A.rgba[i + 2] > 150;

  // il disco è la componente connessa bianca più grande
  const visto = new Uint8Array(A.w * A.h);
  let disco = [];
  for (let p0 = 0; p0 < A.w * A.h; p0++) {
    if (visto[p0] || !bianco(p0 * 4)) continue;
    const pila = [p0]; visto[p0] = 1; const gruppo = [];
    while (pila.length) {
      const p = pila.pop(); gruppo.push(p);
      const x = p % A.w, y = (p - x) / A.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= A.w || ny >= A.h) continue;
        const q = ny * A.w + nx;
        if (!visto[q] && bianco(q * 4)) { visto[q] = 1; pila.push(q); }
      }
    }
    if (gruppo.length > disco.length) disco = gruppo;
  }
  const nelDisco = new Uint8Array(A.w * A.h);
  let x0 = A.w, y0 = A.h, x1 = -1, y1 = -1;
  for (const p of disco) {
    nelDisco[p] = 1;
    const x = p % A.w, y = (p - x) / A.w;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }

  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const i = at(x, y);
    if (!A.rgba[i + 3] || nelDisco[y * A.w + x]) continue;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
    if ((A.rgba[i] + A.rgba[i + 1] + A.rgba[i + 2]) / 3 < 100) continue;
    A.rgba[i] = VIOLA[0]; A.rgba[i + 1] = VIOLA[1]; A.rgba[i + 2] = VIOLA[2];
  }
  for (const p of disco) A.rgba[p * 4 + 3] = 0;

  let cx0 = A.w, cy0 = A.h, cx1 = -1, cy1 = -1;
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++)
    if (A.rgba[at(x, y) + 3] > 8) {
      if (x < cx0) cx0 = x; if (x > cx1) cx1 = x;
      if (y < cy0) cy0 = y; if (y > cy1) cy1 = y;
    }
  const w = cx1 - cx0 + 1, h = cy1 - cy0 + 1;
  const ritaglio = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    ritaglio.set(A.rgba.subarray(at(cx0, cy0 + y), at(cx0, cy0 + y) + w * 4), y * w * 4);
  fs.writeFileSync(path.join(USCITA, 'IULM-positivo.png'), encodePng(w, h, ritaglio));
}

console.log('scritti in ' + USCITA + ': LUISS-ufficiale.svg, Unimi-positivo.svg, ' +
            'Unige-colore.svg, Unito-nuovo.svg, IULM-positivo.png');

/* Riduzione a media d'area: per rimpicciolire di un fattore intero è esatta e
   non serve altro. La trasparenza va mediata insieme al colore, altrimenti i
   bordi si sporcano. */
function riduci(img, f) {
  const w = Math.floor(img.w / f), h = Math.floor(img.h / f);
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) {
      const i = ((y * f + dy) * img.w + x * f + dx) * 4;
      const al = img.rgba[i + 3];
      r += img.rgba[i] * al; g += img.rgba[i + 1] * al; b += img.rgba[i + 2] * al; a += al;
    }
    const j = (y * w + x) * 4;
    out[j] = a ? Math.round(r / a) : 0;
    out[j + 1] = a ? Math.round(g / a) : 0;
    out[j + 2] = a ? Math.round(b / a) : 0;
    out[j + 3] = Math.round(a / (f * f));
  }
  return { w, h, rgba: out };
}

/* --- PNG: lettura e scrittura, bit depth 8, colortype 2/6 ----------------- */

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('non è un PNG');
  let off = 8, ihdr = null; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const tipo = buf.toString('ascii', off + 4, off + 8);
    const dati = buf.subarray(off + 8, off + 8 + len);
    if (tipo === 'IHDR') ihdr = {
      w: dati.readUInt32BE(0), h: dati.readUInt32BE(4),
      depth: dati[8], color: dati[9],
    };
    else if (tipo === 'IDAT') idat.push(dati);
    else if (tipo === 'IEND') break;
    off += 12 + len;
  }
  if (ihdr.depth !== 8 || (ihdr.color !== 2 && ihdr.color !== 6))
    throw new Error('PNG non gestito: depth ' + ihdr.depth + ' color ' + ihdr.color);
  const canali = ihdr.color === 6 ? 4 : 3;
  const riga = ihdr.w * canali;
  const grezzo = zlib.inflateSync(Buffer.concat(idat));
  const piano = Buffer.alloc(riga * ihdr.h);
  for (let y = 0; y < ihdr.h; y++) {
    const filtro = grezzo[y * (riga + 1)];
    const src = grezzo.subarray(y * (riga + 1) + 1, y * (riga + 1) + 1 + riga);
    const cur = piano.subarray(y * riga, (y + 1) * riga);
    const pre = y ? piano.subarray((y - 1) * riga, y * riga) : null;
    for (let i = 0; i < riga; i++) {
      const a = i >= canali ? cur[i - canali] : 0;
      const b = pre ? pre[i] : 0;
      const c = pre && i >= canali ? pre[i - canali] : 0;
      let v = src[i];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }
  const rgba = new Uint8Array(ihdr.w * ihdr.h * 4);
  for (let i = 0, j = 0; i < ihdr.w * ihdr.h; i++) {
    rgba[i * 4] = piano[j]; rgba[i * 4 + 1] = piano[j + 1]; rgba[i * 4 + 2] = piano[j + 2];
    rgba[i * 4 + 3] = canali === 4 ? piano[j + 3] : 255;
    j += canali;
  }
  return { w: ihdr.w, h: ihdr.h, rgba };
}

function encodePng(w, h, rgba) {
  const grezzo = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++)
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4)
      .copy(grezzo, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pezzo('IHDR', ihdr),
    pezzo('IDAT', zlib.deflateSync(grezzo, { level: 9 })),
    pezzo('IEND', Buffer.alloc(0)),
  ]);
}

function pezzo(tipo, dati) {
  const len = Buffer.alloc(4); len.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo) >>> 0);
  return Buffer.concat([len, corpo, crc]);
}

var TAB = null;   // var, non let: crc32 viene usato prima di questa riga
function crc32(buf) {
  if (!TAB) {
    TAB = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TAB[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}
