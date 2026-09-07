// Riduce i loghi degli atenei alla misura in cui vengono davvero mostrati.
//
// Nella scena di Orbite ogni logo sta dentro una pastiglia larga al massimo
// 152 px (vedi il clamp in assets/js/orbits.js) e alta 65, quindi l'immagine
// non supera mai ~130x57 px. I file però erano gli originali del marchio:
// Polimi.svg da 98 kB su disco e 32 kB compressi, per disegnare un rettangolo
// da 130 px. Sommati, i loghi visibili pesavano quasi 200 kB in rete — ed è la
// segnalazione "ci mette un sacco a caricare tutti i loghi": su rete mobile
// quel peso è il motivo per cui le pastiglie restano bianche.
//
// Qui vengono ridisegnati a 3x della misura massima di visualizzazione e
// salvati in WebP, che tiene la trasparenza e comprime molto meglio. Gli SVG
// originali restano in assets/loghi/: non sono più referenziati, ma sono le
// fonti e non si buttano.
//
// Si esegue a mano quando cambia un logo:
//
//     node scripts/shrink-orbite-logos.mjs
//
// Il risultato è versionato: né la compilazione né la pubblicazione dipendono
// da questo script (e quindi da playwright, che non è fra le dipendenze).
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const HTML = "public/orbite/index.html";
const OUT_DIR = "public/orbite/assets/loghi/min";

// 3x del riquadro massimo in cui l'immagine può essere disegnata.
const MAX_W = 456;
const MAX_H = 171;

// Il logotipo AGORÀ al centro della scena è un caso a parte, e il più pesante
// di tutti: 1385x512 px per 123 kB, cioè il 44% dell'intera pagina, scaricato
// con priorità alta e quindi in concorrenza con gli script da cui dipende
// l'apertura. Viene mostrato larghissimo 330 px (il clamp di logoW in
// orbits.js), quindi 3x sono 990.
const WORDMARK = {
  src: "assets/img/agora-logo.png",
  out: "public/orbite/assets/img/agora-logo.webp",
  ref: "assets/img/agora-logo.webp",
  maxW: 990,
  maxH: 9999,
};

const html = readFileSync(HTML, "utf8");
const srcs = [
  ...new Set(
    [...html.matchAll(/src="(assets\/loghi\/[^"]+)"/g)].map((m) => m[1]),
  ),
];
if (!srcs.length) {
  console.error("nessun logo referenziato in", HTML);
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto("about:blank");

mkdirSync(OUT_DIR, { recursive: true });
let before = 0;
let after = 0;
const done = [];

const jobs = [
  ...srcs.map((rel) => ({ rel, maxW: MAX_W, maxH: MAX_H, out: null })),
  { rel: WORDMARK.src, maxW: WORDMARK.maxW, maxH: WORDMARK.maxH, out: WORDMARK },
];

for (const job of jobs) {
  const rel = job.rel;
  const file = join("public/orbite", rel);
  if (!existsSync(file)) {
    console.warn("manca:", file);
    continue;
  }
  const bytes = readFileSync(file);
  const mime = extname(file).toLowerCase() === ".svg" ? "image/svg+xml" : "image/png";
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

  const out = await page.evaluate(
    async ({ dataUrl, MAX_W, MAX_H }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      // Un SVG senza width/height intrinseci riporta 0: si ripiega sul
      // riquadro massimo, tanto il rapporto lo impone il viewBox.
      const iw = img.naturalWidth || MAX_W;
      const ih = img.naturalHeight || MAX_H;
      const k = Math.min(MAX_W / iw, MAX_H / ih, 1);
      const w = Math.max(1, Math.round(iw * k));
      const h = Math.max(1, Math.round(ih * k));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(img, 0, 0, w, h);
      return { data: c.toDataURL("image/webp", 0.92).split(",")[1], w, h };
    },
    { dataUrl, MAX_W: job.maxW, MAX_H: job.maxH },
  );

  // Si confronta il peso IN RETE, non su disco: gli SVG sono testo e il
  // server li comprime, quindi un vettore semplice puo' benissimo battere
  // l'immagine. In quel caso l'originale resta, ed e' giusto cosi' — sarebbe
  // assurdo perdere la nitidezza per guadagnare zero byte.
  const webp = Buffer.from(out.data, "base64");
  const wire = mime === "image/svg+xml" ? gzipSync(bytes).length : bytes.length;
  before += wire;
  if (webp.length >= wire * 0.8) {
    after += wire;
    console.log(
      `  ${basename(file).padEnd(24)} ${String(wire).padStart(6)} byte in rete -> resta com'e'` +
        ` (l'immagine sarebbe ${webp.length})`,
    );
    continue;
  }
  const name = basename(file, extname(file)) + ".webp";
  const dest = job.out ? job.out.out : join(OUT_DIR, name);
  writeFileSync(dest, webp);
  after += webp.length;
  done.push({
    rel,
    next: job.out ? job.out.ref : `assets/loghi/min/${name}`,
    w: out.w,
    h: out.h,
  });
  console.log(
    `  ${basename(file).padEnd(24)} ${String(wire).padStart(6)} -> ` +
      `${String(webp.length).padStart(6)} byte in rete  (${out.w}x${out.h})`,
  );
}
await browser.close();

// Riscrive i riferimenti e le misure dichiarate nell'HTML.
let next = html;
for (const d of done) {
  // Il logotipo compare anche nel <link rel="preload">, non solo nell'<img>.
  next = next.split(`href="${d.rel}"`).join(`href="${d.next}"`);
  const re = new RegExp(
    `src="${d.rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"([^>]*?)width="\\d+" height="\\d+"`,
  );
  if (re.test(next)) {
    next = next.replace(re, `src="${d.next}"$1width="${d.w}" height="${d.h}"`);
  } else {
    next = next.replace(`src="${d.rel}"`, `src="${d.next}" width="${d.w}" height="${d.h}"`);
  }
}
writeFileSync(HTML, next);

console.log(
  `\n  ${done.length} loghi sostituiti su ${srcs.length}: ${(before / 1024).toFixed(0)} kB -> ${(after / 1024).toFixed(0)} kB in rete`,
);
