// Genera le icone PNG del manifest a partire dall'SVG, così esiste una sola
// fonte di verità per il marchio: si modifica public/icon-maskable.svg e si
// rigenerano. Chrome su Android ignora le icone SVG del manifest, quindi i
// PNG servono davvero — senza, la scheda di condivisione mostra il
// mappamondo generico.
//
// Si esegue a mano quando il marchio cambia, non a ogni compilazione:
//
//     npx tsx scripts/generate-icons.ts
//
// I PNG prodotti sono versionati, quindi né la compilazione né la
// pubblicazione dipendono da questo script. Per la stessa ragione playwright
// NON è fra le dipendenze del progetto: pesa parecchie centinaia di MB e
// servirebbe a una manciata di persone una volta ogni tanto. Chi deve
// rigenerare le icone lo installa al momento (`npm i -D playwright`); i tipi
// minimi che permettono comunque a `tsc --noEmit` di passare senza quel
// pacchetto stanno in scripts/types/playwright-lite.d.ts.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// Due sorgenti distinte: la favicon si disegna gli angoli tondi (nella
// scheda del browser nessuno la ritaglia), l'icona dell'applicazione è a
// pieno campo perché Android applica la propria maschera.
const svgApp = readFileSync("public/icon-maskable.svg", "utf8");
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

const targets: Array<{ size: number; src: string; out: string }> = [
  { size: 192, src: svgApp, out: "public/icon-192.png" },
  { size: 512, src: svgApp, out: "public/icon-512.png" },
  // Apple non maschera: qui servono gli angoli tondi del marchio, non quelli
  // di sistema. Anzi, iOS mette il proprio raggio SOPRA, quindi si parte
  // dalla versione a pieno campo per non ottenere un doppio arrotondamento.
  { size: 180, src: svgApp, out: "public/apple-touch-icon.png" },
];

for (const { size, src, out } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${src}`,
  );
  await page.locator("svg").screenshot({ path: out, omitBackground: false });
  await page.close();
  console.log(out);
}
await browser.close();
