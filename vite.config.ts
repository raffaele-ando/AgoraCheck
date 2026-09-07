import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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
 * I file sorgente restano separati in public/orbite/: si continua a lavorarli
 * come sempre, e in sviluppo la pagina li carica normalmente. L'unione avviene
 * solo nella copia pubblicata.
 */
function inlineOrbiteCriticalPath(): Plugin {
  return {
    name: 'inline-orbite-critical-path',
    apply: 'build',
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

      // Solo intro.js: è quello che disegna il marchio, e deve girare al primo
      // fotogramma. orbits.js dispone la scena e resta un file a parte —
      // pesa di più, non serve per disegnare la copertura, e tenerlo fuori
      // lascia il documento leggero.
      const intro = read('assets/js/intro.js');
      if (intro) {
        html = html.replace(
          '<script src="assets/js/intro.js" defer></script>',
          `<script>${intro}</script>`,
        );
      }

      fs.writeFileSync(htmlPath, html);
    },
  };
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
