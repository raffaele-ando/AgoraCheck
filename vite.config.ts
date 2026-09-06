import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Base path. Root ('/') for the Cloud Run / custom-domain build; set
    // VITE_BASE=/AgoraCheck/ for the GitHub Pages project-site build.
    base: process.env.VITE_BASE || env.VITE_BASE || '/',
    plugins: [react(), tailwindcss()],
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
