import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';

/**
 * Orbite arriva in UNA richiesta: stile e apertura finiscono dentro l'HTML.
 *
 * Sulla prima visita, su rete mobile, la sequenza era questa: il documento
 * arriva, il foglio di stile arriva e dipinge lo schermo di nero — ma il
 * marchio su Orbite lo disegna il JavaScript, e intro.js arrivava quasi un
 * secondo dopo, in coda dietro venti immagini. In mezzo c'era quindi un tratto
 * di nero SENZA marchio, e subito dopo il marchio ricompariva e restava fermo
 * ad aspettare il resto: è la segnalazione "si blocca mostrandomi il logo sul
 * nero e resta fermo lì per un po'".
 *
 * Con stile e apertura scritti dentro il documento non c'è più nulla da
 * attendere per disegnare: appena l'HTML arriva, lo schermo è inchiostro col
 * marchio già composto, che è esattamente il fotogramma che stava sulla
 * bacheca un istante prima. La cucitura fra i due siti scompare, e sono anche
 * due richieste di rete in meno sul percorso critico.
 *
 * Lo stile resta un file a sé in public/orbite/; l'apertura è invece compilata
 * da TypeScript (src/brand/orbiteIntro.ts), perché condivide geometria e tempi
 * con la porta della bacheca e quella copia doppia si era già scollata. In
 * sviluppo la serve il middleware qui sotto, in compilazione finisce inserita
 * nel documento.
 */
function inlineOrbiteCriticalPath(): Plugin {
  return {
    name: 'inline-orbite-critical-path',
    // Nessun `apply: 'build'`: closeBundle gira solo in compilazione di suo,
    // ma configureServer serve in SVILUPPO — ed è l'unico posto da cui, mentre
    // si lavora, arriva l'apertura di Orbite.
    closeBundle() {
      const dir = path.resolve(__dirname, 'dist/orbite');
      const htmlPath = path.join(dir, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      let html = fs.readFileSync(htmlPath, 'utf8');

      const read = (rel: string) => {
        const f = path.join(dir, rel);
        return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
      };

      const css = read('assets/css/style.css');
      if (css) {
        html = html.replace(
          '<link rel="stylesheet" href="assets/css/style.css">',
          `<style>${css}</style>`,
        );
      }

      // Solo l'apertura: è quella che disegna il marchio, e deve girare al
      // primo fotogramma. orbits.js dispone la scena e resta un file a parte —
      // pesa di più, non serve per disegnare la copertura, e tenerlo fuori
      // lascia il documento leggero.
      html = html.replace(
        '<script src="assets/js/intro.js" defer></script>',
        `<script>${buildBundle('src/brand/orbiteIntro.ts')}</script>`,
      );

      // La scena resta un file a sé: pesa più dell'apertura, non serve per
      // disegnare la copertura, e tenerla fuori lascia il documento leggero.
      // Compilata da TypeScript come l'apertura, e minificata: misurato,
      // 2,8 kB compressi contro i 6,0 del file scritto a mano.
      // La cartella non esiste più fra i file statici — i sorgenti sono in
      // TypeScript — quindi va creata prima di scriverci dentro.
      const jsDir = path.join(dir, 'assets/js');
      fs.mkdirSync(jsDir, { recursive: true });
      fs.writeFileSync(
        path.join(jsDir, 'orbits.js'),
        buildBundle('src/brand/orbiteScene.ts'),
      );

      fs.writeFileSync(htmlPath, html);
    },

    // In sviluppo il file non esiste su disco: si compila a ogni richiesta.
    // Senza questo, aprire /orbite/ mentre si lavora darebbe un 404 e la
    // pagina resterebbe coperta d'inchiostro per sempre.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = req.url?.split('?')[0] ?? '';
        const from = p.endsWith('/orbite/assets/js/intro.js')
          ? 'src/brand/orbiteIntro.ts'
          : p.endsWith('/orbite/assets/js/orbits.js')
            ? 'src/brand/orbiteScene.ts'
            : null;
        if (!from) return next();
        res.setHeader('Content-Type', 'text/javascript');
        res.end(buildBundle(from));
      });
    },
  };
}

/**
 * Compila un pezzo di Orbite da TypeScript a un file che il browser esegue.
 *
 * Orbite è una pagina statica servita così com'è, quindi non passa dalla
 * compilazione dell'applicazione: senza questo passaggio l'animazione dovrebbe
 * restare JavaScript scritto a mano, e con essa la copia della geometria che
 * si era già scollata da quella della bacheca.
 *
 * Il risultato è un blocco autonomo e minificato: misurato, 1,9 kB compressi
 * contro i 5,8 del file scritto a mano. Siccome finisce dentro il documento,
 * quei quattro kB risparmiati sono sulla PRIMA richiesta, cioè esattamente
 * dove pesano di più.
 */
function buildBundle(entry: string): string {
  const out = esbuild.buildSync({
    entryPoints: [path.resolve(__dirname, entry)],
    bundle: true,
    format: 'iife',
    target: 'es2018',
    minify: true,
    legalComments: 'none',
    write: false,
  });
  return out.outputFiles[0].text;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Base path. Root ('/') for the Cloud Run / custom-domain build; set
    // VITE_BASE=/AgoraCheck/ for the GitHub Pages project-site build.
    base: process.env.VITE_BASE || env.VITE_BASE || '/',
    plugins: [react(), tailwindcss(), inlineOrbiteCriticalPath()],
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Il bundle iniziale era un unico file da ~970 KB: il browser doveva
      // scaricarlo e interpretarlo INTERAMENTE prima di disegnare qualsiasi
      // cosa. Separando le dipendenze che non cambiano mai dal codice
      // dell'applicazione, i file si scaricano in parallelo e soprattutto
      // restano in cache fra un rilascio e l'altro: dopo la prima visita si
      // ri-scarica solo il nostro codice, non React e Firebase.
      //
      // I gruppi si decidono dal PERCORSO del modulo, non da un elenco di nomi
      // di pacchetto. Con l'elenco il raggruppamento era silenziosamente
      // sbagliato: l'applicazione importa "react-dom/client", che è uno
      // specificatore diverso da "react-dom", quindi non veniva riconosciuto e
      // i ~520 kB di react-dom restavano nel blocco iniziale. Verificato dalla
      // mappa dei sorgenti, non a occhio.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // Il percorso è normalizzato perché su Windows i separatori sono
            // rovesciati e il confronto fallirebbe.
            const p = id.replace(/\\/g, '/');
            const inPkg = (name: string) =>
              p.includes(`/node_modules/${name}/`);

            if (inPkg('react-dom') || inPkg('react') || inPkg('scheduler') || inPkg('react-router') || inPkg('react-router-dom')) {
              return 'vendor-react';
            }
            if (inPkg('firebase') || inPkg('@firebase')) return 'vendor-firebase';
            // La libreria di animazione serve alla bacheca pubblica, non alla
            // schermata d'accesso: tenuta a parte, /dashboard non la scarica.
            if (inPkg('motion') || inPkg('framer-motion') || inPkg('motion-dom') || inPkg('motion-utils')) {
              return 'vendor-motion';
            }
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
