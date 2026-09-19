/*
 * Configurazione del banco di prova: la dashboard vera, con Firebase
 * sostituito da finzioni locali. Serve a fotografare ogni schermata
 * senza rete, senza accesso e senza sfiorare i dati veri.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

const qui = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^firebase\/firestore$/, replacement: qui("scripts/banco/firestore.ts") },
      { find: /^firebase\/auth$/, replacement: qui("scripts/banco/auth.ts") },
      { find: /^firebase\/app$/, replacement: qui("scripts/banco/firebase.ts") },
      { find: /^\.\.\/firebase$/, replacement: qui("scripts/banco/firebase.ts") },
      { find: /^\.\.\/\.\.\/firebase$/, replacement: qui("scripts/banco/firebase.ts") },
    ],
  },
  build: {
    outDir: qui("dist-banco"),
    emptyOutDir: true,
    rollupOptions: { input: { app: qui("scripts/banco/index.html"), bacheca: qui("scripts/banco/bacheca.html") } },
  },
});
