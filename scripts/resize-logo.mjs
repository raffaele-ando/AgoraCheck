// Ridimensiona il logotipo alla misura in cui viene davvero usato.
//
// L'originale è 1385x512 per 123 kB, mostrato alto 40 px. Un PNG non
// interlacciato viene dipinto dal browser riga per riga man mano che arriva:
// a quel peso l'effetto è il logo che compare "a strisce" orizzontali. Ridotto
// a 3x della misura di visualizzazione il file sta in pochi kB e arriva tutto
// insieme, quindi appare in un colpo solo.
//
// Si esegue a mano quando il logotipo cambia:
//
//     node scripts/resize-logo.mjs
//
// Il risultato è versionato: né la compilazione né la pubblicazione dipendono
// da questo script (e quindi da playwright, che non è fra le dipendenze).
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "public/agora-logo.png";
const OUT = "public/agora-logo.png";
const W = 432; // 3x dei ~144 px di larghezza a cui il logo viene mostrato
const H = 160;

const b64 = readFileSync(SRC).toString("base64");
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
await page.setContent(
  `<style>html,body{margin:0;background:transparent}
   img{display:block;width:${W}px;height:${H}px;object-fit:contain}</style>
   <img src="data:image/png;base64,${b64}">`,
);
// omitBackground conserva il canale alfa: il logotipo deve restare
// trasparente, altrimenti in tema scuro comparirebbe un rettangolo bianco.
const buf = await page.locator("img").screenshot({ omitBackground: true });
writeFileSync(OUT, buf);
await browser.close();
console.log(`${OUT}: ${W}x${H}, ${Math.round(buf.length / 1024)} kB`);
