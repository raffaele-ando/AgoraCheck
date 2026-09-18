/*
 * Fotografa la fascia dei comandi insieme alle righe: la schermata
 * Messaggi come la vede l'operatore, senza Firebase e senza login.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import MessageRow from "../src/components/dashboard/MessageRow";
import MessagesToolbar from "../src/components/dashboard/MessagesToolbar";
import MessagesRail from "../src/components/dashboard/MessagesRail";
import NextHeader from "../src/components/dashboard/NextHeader";
import SelectionBar from "../src/components/dashboard/SelectionBar";

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
const nulla = () => {};

const messaggi = [
  { id: "m1", lookingFor: "Ragazza con la felpa gialla che studiava in Biblioteca Centrale giovedì pomeriggio, ci siamo guardati per mezz'ora", createdAt: ts(new Date("2026-09-17T22:41:00")), city: "Milano", area: "Città Studi", when: "giovedì pom.", where: "Biblioteca", resolution: "Trovata, si sono scritti", isArchived: false, isValidatedForCarousel: false, nome: "Marco B.", colore: "#1C5CAB", tags: ["marco.bnc", "mrcb_99"], alias: ["@anon_polimi", "@m.b.2003"] },
  { id: "m2", type: "ricerca", lookingFor: "Qualcuno sa se la mensa di via Golgi è aperta sabato?", createdAt: ts(new Date("2026-09-17T20:15:00")), isArchived: false, isValidatedForCarousel: true, nome: "Non identificato", colore: "#A8A29E", tags: [], alias: [] },
  { id: "m3", lookingFor: "Tipo alto con lo zaino Eastpak rosso alla fermata del 90, scendevi a Lambrate", createdAt: ts(new Date("2026-09-16T23:12:00")), area: "Lambrate", when: "martedì", isArchived: false, isValidatedForCarousel: false, nome: "Luca P.", colore: "#047857", tags: ["luchi.p"], alias: [] },
  { id: "m4", lookingFor: "Chi era che suonava il piano in aula magna venerdì?", createdAt: ts(new Date("2026-09-16T15:02:00")), city: "Milano", area: "Milano", where: "Aula magna", resolution: "Trovata", isArchived: false, isValidatedForCarousel: false, nome: "Sara M.", colore: "#B4471A", tags: ["sara.mrt"], alias: [] },
];

const pagina = renderToStaticMarkup(
  <div className="ac-next">
    <NextHeader
      activeTab="messages" onTab={nulla} unreadCount={12} isSuperAdmin
      email="raffaele@polinetwork.org" totalMessages={4128}
      isDarkMode={false} onToggleTheme={nulla} onLogout={nulla}
    />
    <h1 className="text-[26px] font-black tracking-tight mb-4">Messaggi</h1>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_248px] 2xl:grid-cols-[minmax(0,1fr)_300px] gap-x-10 xl:gap-x-14 items-start">
    <div className="min-w-0">
    <MessagesToolbar
      viewFilter="new" onViewFilter={nulla} unreadCount={12}
      searchQuery="" onSearch={nulla}
      onlyPostsFilter={false} onOnlyPosts={nulla}
      zoneOptions={["Città Studi", "Bovisa", "Lambrate"]}
      selectedZoneFilter="" onZone={nulla}
      hasActiveFilters={false} onClearFilters={nulla}
      resultCount={86} pageSize={20} onPageSize={nulla}
      onStartSelect={nulla} isSuperAdmin carouselCount={35}
      onOpenCarousel={nulla}
      linkWidget={<button className="text-[12.5px] font-semibold text-indigo-700">Copia link in bio →</button>}
    />
    <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
      {messaggi.map((m) => (
        <MessageRow
          key={m.id} msg={m} isSelected={false} isSelectMode={false} isSuperAdmin
          displayName={m.nome} profileId={`p-${m.id}`} profileColor={m.colore}
          msgMacro={{ instagrams: m.tags }}
          profiles={{ [`p-${m.id}`]: { possibleAliases: m.alias } }}
          macroProfiles={[]} editingMessageId={null}
          locationInputCity="" locationInputArea="" resolutionInput=""
          toggleSelection={nulla} setViewingMacroId={nulla} setEditingProfileId={nulla}
          setEditingMessageId={nulla} setLocationInputCity={nulla} setLocationInputArea={nulla}
          setResolutionInput={nulla} saveMessageLocation={nulla} saveMessageResolution={nulla}
          handleUngroupDevice={nulla} handleDeleteMessage={nulla} toggleArchiveStatus={nulla}
          setExportingMessage={nulla} toggleCarousel={nulla}
          getProfileInstagrams={() => ({ tags: m.tags })}
          parseAdvancedInfo={() => null}
          getProfileInitials={(n?: string) => (n && n !== "Non identificato" ? n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase() : null)}
        />
      ))}
    </div>
    </div>
    <MessagesRail
      unreadCount={12} carouselCount={35} onOpenCarousel={nulla}
      activeFilters={["Zona: Città Studi"]} onClearFilters={nulla}
      resultCount={86} totalLoaded={120}
    >
      <button className="text-[12.5px] font-semibold text-indigo-700">Copia link in bio →</button>
    </MessagesRail>
    </div>
  </div>,
);

const css = readdirSync("dist/assets").find((f) => f.endsWith(".css"))!;
writeFileSync("/tmp/pagina-vera.html", `<!doctype html><html lang="it"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${process.cwd()}/dist/assets/${css}">
<style>body{margin:0;background:#f9fafb}</style></head>
<body><div class="p-4 md:p-8 w-full max-w-[1600px] mx-auto">${pagina}</div></body></html>`);
console.log("scritto /tmp/pagina-vera.html");
