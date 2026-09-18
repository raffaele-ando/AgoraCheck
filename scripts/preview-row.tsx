/*
 * Fotografa la riga vera della lista messaggi.
 *
 * Renderizza MessageRow con dati finti, senza Firebase e senza login, e
 * scrive una pagina HTML con lo stesso foglio di stile dell'applicazione.
 * Serve per confrontare il risultato col disegno invece di supporre che
 * combacino.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import MessageRow from "../src/components/dashboard/MessageRow";

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
const nulla = () => {};

const messaggi = [
  {
    id: "m1",
    lookingFor:
      "Ragazza con la felpa gialla che studiava in Biblioteca Centrale giovedì pomeriggio, ci siamo guardati per mezz'ora",
    createdAt: ts(new Date("2026-09-17T22:41:00")),
    city: "Milano",
    area: "Città Studi",
    when: "giovedì pom.",
    where: "Biblioteca",
    resolution: "Trovata, si sono scritti",
    instagram: "marco.bnc",
    isArchived: false,
    isValidatedForCarousel: false,
    nome: "Marco B.",
    colore: "#1C5CAB",
    tags: ["marco.bnc", "mrcb_99"],
    alias: ["@anon_polimi", "@m.b.2003"],
  },
  {
    id: "m2",
    type: "ricerca",
    lookingFor: "Qualcuno sa se la mensa di via Golgi è aperta sabato?",
    createdAt: ts(new Date("2026-09-17T20:15:00")),
    isArchived: false,
    isValidatedForCarousel: true,
    nome: "Non identificato",
    colore: "#A8A29E",
    tags: [],
    alias: [],
  },
  {
    id: "m3",
    lookingFor: "Tipo alto con lo zaino Eastpak rosso alla fermata del 90, scendevi a Lambrate",
    createdAt: ts(new Date("2026-09-16T23:12:00")),
    area: "Lambrate",
    when: "martedì",
    isArchived: false,
    isValidatedForCarousel: false,
    nome: "Luca P.",
    colore: "#047857",
    tags: ["luchi.p"],
    alias: [],
  },
];

const righe = messaggi.map((m) =>
  renderToStaticMarkup(
    <MessageRow
      key={m.id}
      msg={m}
      isSelected={false}
      isSelectMode={false}
      isSuperAdmin
      displayName={m.nome}
      profileId={`p-${m.id}`}
      profileColor={m.colore}
      msgMacro={{ instagrams: m.tags }}
      profiles={{ [`p-${m.id}`]: { possibleAliases: m.alias } }}
      macroProfiles={[]}
      editingMessageId={null}
      locationInputCity=""
      locationInputArea=""
      resolutionInput=""
      toggleSelection={nulla}
      setViewingMacroId={nulla}
      setEditingProfileId={nulla}
      setEditingMessageId={nulla}
      setLocationInputCity={nulla}
      setLocationInputArea={nulla}
      setResolutionInput={nulla}
      saveMessageLocation={nulla}
      saveMessageResolution={nulla}
      handleUngroupDevice={nulla}
      handleDeleteMessage={nulla}
      toggleArchiveStatus={nulla}
      setExportingMessage={nulla}
      toggleCarousel={nulla}
      getProfileInstagrams={() => ({ tags: m.tags })}
      parseAdvancedInfo={() => null}
      getProfileInitials={(n?: string) =>
        n && n !== "Non identificato"
          ? n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()
          : null
      }
    />,
  ),
);

const css = readdirSync("dist/assets").find((f) => f.endsWith(".css"))!;
writeFileSync(
  "/tmp/riga-vera.html",
  `<!doctype html><html lang="it"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${process.cwd()}/dist/assets/${css}">
<style>body{margin:0;background:#f9fafb}</style></head>
<body><div class="ac-next p-8">
<div class="max-w-3xl divide-y divide-gray-200 border-t border-gray-200">${righe.join("")}</div>
</div></body></html>`,
);
console.log("scritto /tmp/riga-vera.html");
