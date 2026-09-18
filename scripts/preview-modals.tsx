/*
 * Fotografa le finestre di conferma. Sono l'ultima cosa che si vede prima
 * di un'azione irreversibile, quindi vanno guardate una per una invece che
 * immaginate.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, writeFileSync } from "node:fs";
import ConfirmDialog from "../src/components/dashboard/ConfirmDialog";

const nulla = () => {};

const casi = [
  {
    nome: "elimina-molti",
    el: (
      <ConfirmDialog
        kind="distruttivo"
        title="Eliminare 12 messaggi?"
        consequence="Spariscono dalla dashboard e dalla bacheca pubblica. Non si recuperano."
        note="Sono i 12 che hai selezionato mentre era attivo il filtro: Zona: Città Studi · Solo spotted."
        preview={[
          "Ragazza con la felpa gialla che studiava in Biblioteca Centrale giovedì pomeriggio",
          "Qualcuno sa se la mensa di via Golgi è aperta sabato?",
          "Tipo alto con lo zaino Eastpak rosso alla fermata del 90",
          "Chi era che suonava il piano in aula magna venerdì?",
          "quinto",
          "sesto",
        ]}
        confirmLabel="Elimina 12 messaggi"
        onConfirm={nulla}
        onCancel={nulla}
      />
    ),
  },
  {
    nome: "togli-dal-gruppo",
    el: (
      <ConfirmDialog
        kind="attenzione"
        title="Togliere il messaggio dal gruppo?"
        consequence="Torna a essere tracciato per conto suo. Il gruppo resta in piedi per gli altri messaggi."
        note="Si può rifare: è un'operazione reversibile."
        confirmLabel="Togli dal gruppo"
        onConfirm={nulla}
        onCancel={nulla}
      />
    ),
  },
  {
    nome: "unisci-profilo",
    el: (
      <ConfirmDialog
        kind="neutro"
        title="Attribuire 3 messaggi alla stessa persona?"
        consequence="Da qui in poi compaiono sotto un profilo solo, anche se arrivano da dispositivi diversi. Serve quando la stessa persona scrive dal telefono e dal portatile."
        note="Reversibile: da ogni messaggio si può togliere il gruppo."
        preview={[
          "Ragazza con la felpa gialla che studiava in Biblioteca Centrale",
          "Tipo alto con lo zaino Eastpak rosso alla fermata del 90",
          "Chi era che suonava il piano in aula magna venerdì?",
        ]}
        confirmLabel="Unisci nel profilo"
        onConfirm={nulla}
        onCancel={nulla}
      >
        <label className="block">
          <span className="block text-[12px] font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            Nome del profilo
          </span>
          <input
            type="text"
            placeholder="Es. Sconosciuta del treno"
            className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 outline-none px-3 rounded-lg text-[13.5px] text-gray-900 dark:text-gray-100"
          />
          <span className="block mt-1.5 text-[12px] text-gray-500 dark:text-gray-400">
            Se lo lasci vuoto ne viene generato uno automatico, del tipo
            MANUAL-4F7B2C: funziona, ma poi non lo riconosci nell'elenco.
          </span>
        </label>
      </ConfirmDialog>
    ),
  },
];

const css = readdirSync("dist/assets").find((f) => f.endsWith(".css"))!;

for (const caso of casi) {
  writeFileSync(
    `/tmp/modale-${caso.nome}.html`,
    `<!doctype html><html lang="it"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${process.cwd()}/dist/assets/${css}">
<style>body{margin:0;background:#e5e7eb;min-height:100vh}[role=dialog]{opacity:1!important;transform:none!important}</style></head>
<body><div class="ac-next">${renderToStaticMarkup(caso.el)}</div></body></html>`,
  );
  console.log(`scritto /tmp/modale-${caso.nome}.html`);
}
