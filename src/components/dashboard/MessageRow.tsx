/*
 * Una riga della lista messaggi.
 *
 * Vive in un file suo per una ragione pratica: cosi' si puo' renderizzare
 * da sola, con dati finti e senza Firebase, e fotografarla per confrontarla
 * col disegno. Finche' stava dentro le 5000 righe della pagina, dietro il
 * controllo d'accesso, l'unico modo di vederla era chiedere a qualcun altro
 * di aprirla — ed e' cosi' che si finisce a "riprodurre a memoria" un
 * disegno che si ha sottomano.
 */
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { LOCATIONS } from "../../data/locations";
import {
  IcAlias,
  IcArchivia,
  IcCarosello,
  IcCitta,
  IcDove,
  IcElimina,
  IcInstagram,
  IcProfilo,
  IcQuando,
  IcStoria,
  IcZona,
  IcApri,
  IcAttivita,
  IcDispositivo,
  IcImpronta,
  IcRete,
  IcSchermo,
  IcTecnico,
} from "../ui/AcIcons";
import { formatArea, formatCity } from "../../data/locations";

export interface MessageRowProps {
  msg: any;
  isSelected: boolean;
  /** La riga che ha il fuoco da tastiera: J e K la spostano. */
  isFocused?: boolean;
  isSelectMode: boolean;
  isSuperAdmin: boolean;
  displayName: string;
  profileId: string;
  profileColor: string;
  msgMacro: any;
  profiles: Record<string, any>;
  macroProfiles: any[];
  editingMessageId: string | null;
  locationInputCity: string;
  locationInputArea: string;
  resolutionInput: string;
  toggleSelection: (id: string) => void;
  setViewingMacroId: (id: string | null) => void;
  setEditingProfileId: (id: string | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setLocationInputCity: (v: string) => void;
  setLocationInputArea: (v: string) => void;
  setResolutionInput: (v: string) => void;
  saveMessageLocation: (id: string) => void;
  saveMessageResolution: (id: string) => void;
  handleUngroupDevice: (id: string) => void;
  handleDeleteMessage: (id: string) => void;
  toggleArchiveStatus: (id: string, current: boolean) => void;
  setExportingMessage: (m: any) => void;
  toggleCarousel: (m: any) => void;
  getProfileInstagrams: (pid: string) => { tags: string[] };
  parseAdvancedInfo: (m: any) => any;
  getProfileInitials: (name?: string) => string | null;
}

export default function MessageRow(props: MessageRowProps) {
  const {
    msg,
    isSelected,
  isFocused = false,
    isSelectMode,
    isSuperAdmin,
    displayName,
    profileId,
    profileColor,
    msgMacro,
    profiles,
    macroProfiles,
    editingMessageId,
    locationInputCity,
    locationInputArea,
    resolutionInput,
    toggleSelection,
    setViewingMacroId,
    setEditingProfileId,
    setEditingMessageId,
    setLocationInputCity,
    setLocationInputArea,
    setResolutionInput,
    saveMessageLocation,
    saveMessageResolution,
    handleUngroupDevice,
    handleDeleteMessage,
    toggleArchiveStatus,
    setExportingMessage,
    toggleCarousel,
    getProfileInstagrams,
    parseAdvancedInfo,
    getProfileInitials,
  } = props;

  /*
   * La riga e' CHIUSA finche' non la si guarda.
   *
   * Misurata sulla dashboard vera, una riga era alta in media 238 pixel
   * (da 174 a 367): su uno schermo da 1080 ne entravano quattro, e una coda
   * di 86 messaggi voleva ventuno schermate. Ma per decidere se un messaggio
   * va archiviato bastano il nome, il testo e la data: zona, alias,
   * risoluzione e dettagli tecnici servono solo su quello che stai
   * guardando davvero.
   *
   * Quindi il resto compare sulla riga sotto il puntatore, su quella che ha
   * il fuoco da tastiera (J/K) e su quelle scelte. Nient'altro: niente stato
   * in React, niente ridisegni, solo group-hover.
   */
  const aperta = isFocused || isSelected || isSelectMode;
  const soloDaAperta = aperta ? "" : "hidden group-hover:block";

  return (
    <article
      key={msg.id}
      id={`ac-msg-${msg.id}`}
      className={`flex gap-3 sm:gap-3 py-6 px-3 -mx-3 transition-colors ${
        isSelected
          ? "bg-indigo-50 dark:bg-indigo-900/30"
          : "hover:bg-white dark:hover:bg-gray-800/60"
      } ${
        isFocused
          ? "ring-2 ring-indigo-600 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900 rounded-lg"
          : ""
      } relative group`}
      onClick={() =>
        isSelectMode ? toggleSelection(msg.id) : undefined
      }
      style={{ cursor: isSelectMode ? "pointer" : "default" }}
    >
      {/* Colonna di sinistra: scelta e stato di lettura.
          La casella compare al passaggio del mouse, cosi' non
          serve piu' entrare in "modalita' selezione" da un
          pulsante lontano dalla lista su cui agisce. */}
      <div className="shrink-0 w-4 sm:w-5 pt-1 flex flex-col items-center gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelection(msg.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleziona il messaggio di ${displayName}`}
          className={`w-[15px] h-[15px] rounded accent-indigo-600 transition-opacity ${
            isSelected || isSelectMode
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        />
      </div>

      {/* Il quadrato del profilo: quadrato e non cerchio,
          perche' il cerchio e' gia' la casella di scelta. */}
      {/* Il quadrato del profilo porta addosso il pallino del non letto:
          prima aveva una colonna tutta sua, larga venti pixel piu' il
          distanziamento, per un cerchietto da sei. */}
      <div className="relative shrink-0">
      {!msg.isArchived && (
        <span
          className="absolute -top-0.5 -right-0.5 z-10 w-[7px] h-[7px] rounded-full bg-indigo-600 ring-2 ring-gray-50 dark:ring-gray-900"
          title="Non letto"
        />
      )}
      {isSuperAdmin ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isSelectMode) return;
            const target = macroProfiles.find((m) =>
              m.profileIds.includes(profileId),
            );
            if (target) setViewingMacroId(target.id);
            else setEditingProfileId(profileId);
          }}
          title="Apri il profilo"
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-semibold hover:opacity-85 transition-opacity"
          style={{ backgroundColor: profileColor }}
        >
          {getProfileInitials(displayName) ?? (
            <IcProfilo className="w-3.5 h-3.5" />
          )}
        </button>
      ) : (
        <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white">
          <IcProfilo className="w-3.5 h-3.5" />
        </div>
      )}
      </div>

      {/* La colonna del contenuto si ferma a 74 caratteri. Prima era
          flex-1 e basta: si stirava fino al bordo (891px), il testo andava
          a capo a un centinaio di caratteri — oltre il limite di
          leggibilita' — e fra l'ultima pastiglia e i comandi restava una
          fascia morta di circa 257 pixel su OGNI riga. */}
      <div className="min-w-0 flex-1 max-w-[74ch]">
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={`text-[13px] font-bold truncate ${
              displayName.startsWith("Non identificato")
                ? "text-gray-600 dark:text-gray-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {isSuperAdmin ? displayName : "Non identificato"}
          </span>
          {msg.profileGroupId && !isSelectMode && isSuperAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUngroupDevice(msg.id);
              }}
              className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:text-red-600 hover:underline shrink-0"
            >
              gruppo manuale · rimuovi
            </button>
          )}
          {(msg.type === "sondaggio" ||
            msg.type === "ricerca" ||
            ((!msg.type || msg.type === "spotted") && !msg.when && !msg.where)) && (
      <span className="text-[11px] font-semibold tracking-wider text-gray-600 dark:text-gray-400 shrink-0">
              {msg.type === "sondaggio" ? "Sondaggio" : "Ricerca"}
            </span>
          )}
          <span className="ml-auto text-[12px] tabular-nums text-gray-600 dark:text-gray-400 shrink-0">
            {msg.createdAt
              ? format(msg.createdAt.toDate(), "d MMM HH:mm", {
                  locale: it,
                })
              : "—"}
          </span>
        </div>
      {/* Core Content */}
      <div className={aperta ? "mb-4" : "mb-0 group-hover:mb-4"}>
        <p
          className={`text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words text-[15px] sm:text-[15px] leading-relaxed max-w-[62ch] ${
            aperta ? "" : "line-clamp-2 group-hover:line-clamp-none"
          }`}
        >

          {msg.lookingFor}
        </p>
        {msg.type === "sondaggio" && msg.pollOptions && msg.pollOptions.length > 0 && (
          <div className={`mt-4 space-y-2 ${soloDaAperta}`}>
             {msg.pollOptions.map((opt: string, i: number) => (
               <div key={i} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] md:text-[15px] text-gray-700 dark:text-gray-200 flex items-center gap-3 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-semibold text-[12px] shrink-0">{i + 1}</div>
                  <span className="break-words min-w-0">{opt}</span>
               </div>
             ))}
          </div>
        )}
      </div>
      
      <div className={`space-y-2 mb-2 ${soloDaAperta}`}>

        {(msg.city || msg.area || msg.when || msg.where) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {msg.city && (
              <div className="flex items-center gap-2">
                <IcCitta className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <div className="text-[12px] text-gray-600 dark:text-gray-400">
                  <span>{formatCity(msg.city)}</span>
                </div>
              </div>
            )}
            {msg.area && msg.area !== msg.city && (
              <div className="flex items-center gap-2">
                <IcZona className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <div className="text-[12px] text-gray-600 dark:text-gray-400">
                  <span>{formatArea(msg.area, msg.city || "")}</span>
                </div>
              </div>
            )}
            {msg.when && (
              <div className="flex items-center gap-2">
                <IcQuando className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <div className="text-[12px] text-gray-600 dark:text-gray-400">
                  <span>{msg.when}</span>
                </div>
              </div>
            )}
            {msg.where && (
              <div className="flex items-center gap-2">
                <IcDove className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <div className="text-[12px] text-gray-600 dark:text-gray-400">
                  <span>{msg.where}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
        {/* Instagram: la pastiglia col gradiente dice gia' da se' di che
            piattaforma si tratta, quindi non serve ne' un'intestazione
            "INSTAGRAM ASSOCIATI" ne' un riquadro attorno. Il segno sta
            dentro la pastiglia, dove porta significato. */}
        {(isSuperAdmin
          ? msgMacro
            ? msgMacro.instagrams
            : getProfileInstagrams(profileId).tags
          : msg.instagram
            ? [msg.instagram]
            : []
        ).map((tag: string) => (
          <a
            key={tag}
            href={`https://instagram.com/${tag}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-white text-[12px] font-semibold bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-500 dark:to-pink-400 px-2 py-[3px] rounded-lg max-w-full break-words hover:opacity-90 transition-opacity"
          >
            <IcInstagram className="w-3 h-3 shrink-0" />@{tag}
          </a>
        ))}
        {isSuperAdmin &&
                          profiles[profileId]?.possibleAliases &&
                          profiles[profileId].possibleAliases!.length > 0 && (
                            <span
                              className="inline-flex items-center gap-2 px-2 py-[3px] rounded-lg text-[12px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title={profiles[profileId].possibleAliases!.join(" · ")}
                            >
                              <IcAlias className="w-3 h-3" />
                              {profiles[profileId].possibleAliases!.length} possibili alias
                            </span>
                          )}
                        {/* Location / Zone Edit Section */}
        <div
          className={
            editingMessageId === `loc-${msg.id}`
              ? "p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/30"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 ${(msg.city || msg.area) ? "text-indigo-600 dark:text-indigo-300" : "text-gray-600 dark:text-gray-400 "}`}
            >
              <span className="sr-only">Zona selezionata</span>
            </div>
            {!isSelectMode && editingMessageId !== `loc-${msg.id}` && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMessageId(`loc-${msg.id}`);
                  setLocationInputCity(msg.city || "");
                  setLocationInputArea(msg.area || "");
                }}
                className="text-[11px] font-semibold px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-dashed border-gray-300 dark:border-gray-600"
              >
                {(msg.city || msg.area) ? "Cambia zona" : "+ Aggiungi zona"}
              </button>
            )}
          </div>
          {editingMessageId === `loc-${msg.id}` ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <select
                  value={locationInputCity}
                  onChange={(e) => {
                    setLocationInputCity(e.target.value);
                    setLocationInputArea("");
                  }}
                  className="w-full text-[12px] p-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Nessuna Città</option>
                  {Object.keys(LOCATIONS).map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {locationInputCity && LOCATIONS[locationInputCity] && (
                  <select
                    value={locationInputArea}
                    onChange={(e) => setLocationInputArea(e.target.value)}
                    className="w-full text-[12px] p-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Nessuna Zona</option>
                    {LOCATIONS[locationInputCity].map((a: string) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setEditingMessageId(null)}
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  onClick={() => saveMessageLocation(msg.id)}
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Salva
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {/* Resolution Section */}
        <div
          className={
            editingMessageId === msg.id
              ? "p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/25"
              : "flex flex-wrap items-center gap-2"
          }
        >

          <div className="flex items-center gap-2">

            <div
              className={`flex items-center gap-2 ${msg.resolution ? "text-indigo-600 dark:text-indigo-300" : "text-gray-600 dark:text-gray-400 "}`}
            >

              <span className="sr-only">
                {msg.resolution ? "Risoluzione" : "Aggiungi risoluzione"}
              </span>
            </div>
            {!isSelectMode && editingMessageId !== msg.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMessageId(msg.id);
                  setResolutionInput(msg.resolution || "");
                }}
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${msg.resolution ? "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:text-emerald-700 hover:border-emerald-300"}`}
              >

                {msg.resolution
                  ? `Risolto: ${msg.resolution.length > 34 ? msg.resolution.slice(0, 34) + "…" : msg.resolution}`
                  : "+ Com'è andata a finire"}
              </button>
            )}
          </div>
          {editingMessageId === msg.id ? (
            <div
              className="mt-2"
              onClick={(e) => e.stopPropagation()}
            >

              <textarea
                autoFocus
                value={resolutionInput}
                onChange={(e) =>
                  setResolutionInput(e.target.value)
                }
                placeholder="Tag IG, nome, o info su come si è conclusa..."
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-xl outline-none focus:border-indigo-500 text-[13px] focus:ring-2 focus:ring-indigo-100 transition-all resize-none text-gray-800 dark:text-gray-200 shadow-inner"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">

                <button
                  onClick={() => setEditingMessageId(null)}
         className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-[11px] font-semibold tracking-wider rounded-lg hover:bg-gray-300 transition-colors"
                >

                  Annulla
                </button>
                <button
                  onClick={() => saveMessageResolution(msg.id)}
         className="px-3 py-2 bg-indigo-600 text-white text-[11px] font-semibold tracking-wider rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >

                  Salva
                </button>
              </div>
            </div>
          ) : (
            false && (
              <div className="font-semibold text-[13px] break-words whitespace-pre-wrap mt-2">
                {msg.resolution}
              </div>
            )
          )}
        </div>
      </div>
      <div className="mt-3 flex lg:hidden items-center gap-2">
        {!isSelectMode && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleArchiveStatus(msg.id, !!msg.isArchived);
              }}
              className="flex-1 sm:flex-none sm:min-w-[180px] h-9 px-3 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
            >
              <IcArchivia className="w-4 h-4" />
              {msg.isArchived ? "Ripristina" : "Archivia"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExportingMessage(msg);
              }}
              aria-label="Esporta storia"
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
            >
              <IcStoria className="w-[17px] h-[17px]" />
            </button>
            {isSuperAdmin && (
              <button
                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCarousel(msg);
                                }}
                aria-label="Carosello"
                className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
                  msg.isValidatedForCarousel
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                <IcCarosello className="w-[17px] h-[17px]" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteMessage(msg.id);
              }}
              aria-label="Elimina messaggio"
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600"
            >
              <IcElimina className="w-[17px] h-[17px]" />
            </button>
          </>
        )}
      </div>
        </div>
      {/* Telemetry Details */}
      {isSuperAdmin && (
        <details className={`group border-t border-gray-100 dark:border-gray-700 pt-4 cursor-pointer outline-none ${soloDaAperta}`}>

          <summary className="flex items-center justify-between text-[12px] font-semibold text-gray-600 dark:text-gray-400 outline-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors list-none [&::-webkit-details-marker]:hidden">

            <div className="flex items-center gap-2">

              <IcImpronta className="w-4 h-4 text-indigo-400" />
              Dettagli tecnici
            </div>
            <div className="flex items-center gap-2">

              <IcApri className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </div>
          </summary>
          <div className="pt-4 pb-1 space-y-4 opacity-0 group-open:opacity-100 transition-opacity duration-150">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(msg.id);
              }}
              className="text-[11px] font-mono text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title="Copia l'identificativo del messaggio"
            >
              id: {msg.id}
            </button>

            <div className="grid grid-cols-2 gap-3">

              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 ">

                <IcDispositivo className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 mt-1 shrink-0" />
                <div className="min-w-0">

         <div className="text-[11px] tracking-wider font-semibold text-gray-600 dark:text-gray-400 ">
                    Piattaforma
                  </div>
                  <div
                    className="text-[12px] font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap"
                    title={msg.deviceInfo?.platform}
                  >

                    {msg.deviceInfo?.platform ||
                      "Sconosciuta"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 ">

                <IcSchermo className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 mt-1 shrink-0" />
                <div className="min-w-0">

         <div className="text-[11px] tracking-wider font-semibold text-gray-600 dark:text-gray-400 ">
                    Risoluzione
                  </div>
                  <div className="text-[12px] font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">

                    {msg.deviceInfo?.screenResolution ||
                      "Sconosciuta"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 col-span-2 sm:col-span-1">

                <IcRete className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 mt-1 shrink-0" />
                <div className="min-w-0">

         <div className="text-[11px] tracking-wider font-semibold text-gray-600 dark:text-gray-400 ">
                    Lingua & Fuso
                  </div>
                  <div className="text-[12px] font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">

                    {msg.deviceInfo?.language || "N/A"} •{" "}
                    {msg.deviceInfo?.timezone
                      ?.split("/")[1]
                      ?.replace("_", " ") || "N/A"}
                  </div>
                </div>
              </div>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono break-all leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

            {msg.deviceInfo?.userAgent}
          </div>
          {msg.advancedInfo &&
            (() => {
              try {
                const p = parseAdvancedInfo(msg);
                if (!p) return null;
                const adv = {
                  network: p.network || p.n || {},
                  hardware: p.hardware || p.h || {},
                  software: p.software || p.s || {},
                  behavior: p.behavior || p.b || {},
                };
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] font-mono text-gray-600 dark:text-gray-400 ">

                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

           <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2 font-sans text-[11px] tracking-wider">
                        <IcRete className="w-3 h-3 text-indigo-500" />
                        Rete & Posizione
                      </strong>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          IP PUB:
                        </span>{" "}
                        {adv.network?.ip || "N/A"}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        <span className="text-gray-600 dark:text-gray-400 ">
                          RETE:
                        </span>{" "}
                        {adv.network?.netHint || "N/A"}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          GEO:
                        </span>{" "}
                        {adv.network?.city},{" "}
                        {adv.network?.region}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        <span className="text-gray-600 dark:text-gray-400 ">
                          PROV:
                        </span>{" "}
                        {adv.network?.netProvider}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        <span className="text-gray-600 dark:text-gray-400 ">
                          REF:
                        </span>{" "}
                        {adv.network?.referer || "N/A"}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          NET:
                        </span>{" "}
                        {adv.network?.connectionType ===
                          "Nascosto/Non Supportato" ||
                        adv.network?.connectionType ===
                          "Unknown"
                          ? "Nascosto"
                          : `${adv.network?.connectionType} (${adv.network?.downlink}M, RTT: ${adv.network?.rtt || "?"}ms)(DS: ${adv.network?.saveData ? "On" : "Off"})`}
                      </div>
                    </div>
                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

           <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2 font-sans text-[11px] tracking-wider">
                        <IcTecnico className="w-3 h-3 text-purple-500" />
                        Hardware
                      </strong>
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={
                          adv.hardware?.detailedWebGL
                            ? `Vend: ${adv.hardware.detailedWebGL.vendor}, Rndr: ${adv.hardware.detailedWebGL.renderer}, MaxTex: ${adv.hardware.detailedWebGL.maxTextureSize}, Exts: ${adv.hardware.detailedWebGL.extensionsCount}`
                            : ""
                        }
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          GPU:
                        </span>{" "}
                        {adv.hardware?.detailedWebGL
                          ?.renderer || adv.hardware?.gpu}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          CPU/RAM:
                        </span>{" "}
                        {adv.hardware?.cores}C /{" "}
                        {adv.hardware?.ram}GB
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          RES:
                        </span>{" "}
                        {adv.hardware?.screen} (
                        {adv.hardware?.pixelRatio}x)
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          TCH/MEDIA:
                        </span>{" "}
                        {adv.hardware?.maxTouchPoints} pt /{" "}
                        {adv.hardware?.mediaDeviceCount || 0}
                        dev
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          BAT:
                        </span>{" "}
                        {adv.hardware?.battery?.level ===
                          "Unknown" ||
                        adv.hardware?.battery?.level ===
                          "Sconosciuta"
                          ? "Nascosta"
                          : `${adv.hardware?.battery?.level} (${adv.hardware?.battery?.charging === true ? "In Carica" : adv.hardware?.battery?.charging === false ? "A Batteria" : "ND"})`}
                      </div>
                      {adv.hardware?.inputDeviceCount > 0 && (
                        <div className="break-words whitespace-pre-wrap">
                          <span className="text-gray-600 dark:text-gray-400 ">
                            GPAD:
                          </span>{" "}
                          {adv.hardware.inputDeviceCount} (
                          {adv.hardware.inputDeviceIds?.join(
                            ", ",
                          ) || ""}
                          )
                        </div>
                      )}
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={adv.hardware?.extraSensors}
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          SENS:
                        </span>{" "}
                        {adv.hardware?.extraSensors || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ">

           <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2 font-sans text-[11px] tracking-wider">
                        <IcAttivita className="w-3 h-3 text-amber-500" />
                        Comportamento
                      </strong>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          TIME/SCL:
                        </span>{" "}
                        {adv.behavior?.sessionTimeSeconds}s /{" "}
                        {adv.behavior?.maxScrollDepth}% MAX
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          CLK/RAGE:
                        </span>{" "}
                        {adv.behavior?.clicks} /{" "}
                        {adv.behavior?.repeatClicks || 0}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        <span className="text-gray-600 dark:text-gray-400 ">
                          DIST:
                        </span>{" "}
                        {adv.behavior?.pointerDistance
                          ? `${adv.behavior.pointerDistance}px`
                          : "0px"}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          KEY/BACK:
                        </span>{" "}
                        {adv.behavior?.keyEvents}
                        {adv.behavior?.keyPaceMs
                          ? `(~${adv.behavior.keyPaceMs}ms)`
                          : ""}
                        / {adv.behavior?.corrections || 0} bs
                      </div>
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={
                          adv.behavior?.fieldDurations &&
                          Object.keys(
                            adv.behavior.fieldDurations,
                          ).length > 0
                            ? Object.entries(
                                adv.behavior.fieldDurations,
                              )
                                .map(
                                  ([k, v]) =>
                                    `${k}:${Number(v) / 1000}s`,
                                )
                                .join(", ")
                            : "N/A"
                        }
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          FOC/BLR/PST/CP/CT:
                        </span>{" "}
                        {adv.behavior?.fieldDurations &&
                        Object.keys(
                          adv.behavior.fieldDurations,
                        ).length > 0
                          ? Object.keys(
                              adv.behavior.fieldDurations,
                            ).length
                          : 0}
                        flds / {adv.behavior?.blurCount} /{" "}
                        {adv.behavior?.pastes || 0} /{" "}
                        {adv.behavior?.copies || 0} /{" "}
                        {adv.behavior?.cuts || 0}
                      </div>
                      {adv.behavior?.fieldAutoFilled && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-amber-500 font-bold">
                            AUTOFILL RILEVATO
                          </span>
                        </div>
                      )}
                      {adv.behavior?.orientationSample && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 ">
                            TILT:
                          </span>
                          &alpha;:
                          {adv.behavior.orientationSample.alpha}
                          &deg;, &beta;:
                          {adv.behavior.orientationSample.beta}
                          &deg;, &gamma;:
                          {adv.behavior.orientationSample.gamma}
                          &deg;
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">

           <strong className="text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2 font-sans text-[11px] tracking-wider">
                        <IcDispositivo className="w-3 h-3 text-emerald-500" />
                        Software / Hash
                      </strong>
                      <div className="break-words whitespace-pre-wrap">
                        <span className="text-gray-600 dark:text-gray-400 ">
                          PR:
                        </span>{" "}
                        {adv.software?.platform}
                        {adv.software?.historyLength
                          ? `(Hist: ${adv.software.historyLength})`
                          : ""}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        <span className="text-gray-600 dark:text-gray-400 ">
                          CSS:
                        </span>{" "}
                        {adv.software?.advancedMedia
                          ? `Dark:${adv.software.advancedMedia.darkMode ? "S" : "N"}, Ctrst:${adv.software.advancedMedia.highContrast ? "+" : "N"}, Mot:${adv.software.advancedMedia.reducedMotion ? "-" : "N"}, ${adv.software.advancedMedia.colorGamut}`
                          : "N/A"}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          BOT/INC:
                        </span>{" "}
                        {adv.software?.automationSignal || "N/A"} /{" "}
                        {adv.software?.incognito || "N/A"}
                      </div>
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={
                          // Fuori da Chromium `performance.memory` non esiste e il
                          // client manda una stringa ("Non supportato"), non le tre
                          // misure: leggerne i campi dava "undefined / undefined".
                          adv.software?.performanceMemory &&
                          typeof adv.software.performanceMemory === "object"
                            ? `L:${adv.software.performanceMemory.jsHeapSizeLimit} T:${adv.software.performanceMemory.totalJSHeapSize} U:${adv.software.performanceMemory.usedJSHeapSize}`
                            : ""
                        }
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          MEM:
                        </span>{" "}
                        {adv.software?.performanceMemory &&
                        typeof adv.software.performanceMemory === "object"
                          ? `${adv.software.performanceMemory.usedJSHeapSize} / ${adv.software.performanceMemory.totalJSHeapSize}`
                          : adv.software?.performanceMemory || "N/A"}
                      </div>
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={
                          adv.software?.permissions
                            ? `Geo: ${adv.software.permissions.geolocation}, Notif: ${adv.software.permissions.notifications}, Cam: ${adv.software.permissions.camera}, Mic: ${adv.software.permissions.microphone}, ClipR: ${adv.software.permissions["clipboard-read"]}, ClipW: ${adv.software.permissions["clipboard-write"]}`
                            : ""
                        }
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          PERMESSI:
                        </span>{" "}
                        {adv.software?.permissions
                          ? `Geo: ${adv.software.permissions.geolocation?.slice(0, 3)}, Notif: ${adv.software.permissions.notifications?.slice(0, 3)}, Cam: ${adv.software.permissions.camera?.slice(0, 3)}`
                          : "N/A"}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          CANVAS_ID:
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 ">
                          {adv.software?.canvasSample?.slice(
                            0,
                            10,
                          )}
                          ...
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          AUDIO_ID:
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 ">
                          {adv.software?.audioSample?.slice(
                            0,
                            10,
                          ) || "N/A"}
                          ...
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          MATH_ID:
                        </span>
                        <span
                          className="font-bold text-gray-800 dark:text-gray-200 truncate inline-block max-w-[150px] align-bottom"
                          title={
                            adv.software?.mathSample
                              ? JSON.stringify(
                                  adv.software.mathSample,
                                )
                              : ""
                          }
                        >
                          {adv.software?.mathSample
                            ? JSON.stringify(adv.software.mathSample)
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          RECTS_ID:
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 ">
                          {adv.software?.layoutRectsSample?.slice(
                            0,
                            10,
                          ) || "N/A"}
                          ...
                        </span>
                      </div>
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={adv.software?.fontsDetected?.join(
                          ", ",
                        )}
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          FONTS:
                        </span>{" "}
                        {adv.software?.fontsDetected?.length}
                        Identificati
                      </div>
                      <div
                        className="break-words whitespace-pre-wrap"
                        title={adv.software?.plugins}
                      >
                        <span className="text-gray-600 dark:text-gray-400 ">
                          PLUGS:
                        </span>{" "}
                        {adv.software?.plugins
                          ?.split(",")
                          .slice(0, 3)
                          .join(", ")}
                        ...
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          STORAGE:
                        </span>{" "}
                        {adv.software?.storage || "N/A"}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 ">
                          PDF/DNT:
                        </span>{" "}
                        {adv.software?.pdfViewerEnabled
                          ? "Si"
                          : "No"}
                        /{" "}
                        {adv.software?.doNotTrack ? "Si" : "No"}
                      </div>
                    </div>
                  </div>
                );
              } catch (err: any) {
                return (
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 break-all bg-gray-100 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 ">
                    Error: {err.message} | Raw:
                    {typeof msg.advancedInfo === "string"
                      ? msg.advancedInfo
                      : JSON.stringify(msg.advancedInfo)}
                  </div>
                );
              }
            })()}
        </div>
      </details>
      )}
      </div>

      {/* I comandi stanno a destra della riga da lg in su, e
          scendono sotto il testo quando lo schermo si
          stringe: "Archivia" a tutta larghezza sotto il
          pollice. Archivia e' pieno perche' e' il gesto che
          ripeti di piu'; eliminare, che e' irreversibile,
          vive dentro il menu. */}
      {/* Un comando sempre, gli altri sulla riga che stai guardando.
          Cinque righe per quattro comandi facevano venti bersagli
          persistenti sullo stesso schermo, tutti dello stesso peso — e fra
          questi Elimina, che e' irreversibile, era un'icona grigia uguale
          alle altre due. Ora Elimina e' staccato da un divisore e compare
          solo a riga aperta. */}
      {!isSelectMode && (
        <div className="hidden lg:flex shrink-0 items-start gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleArchiveStatus(msg.id, !!msg.isArchived);
            }}
            title={msg.isArchived ? "Rimetti fra i nuovi" : "Archivia"}
            className="h-8 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-colors"
          >
            <IcArchivia className="w-4 h-4" />
            <span className="hidden lg:inline">
              {msg.isArchived ? "Ripristina" : "Archivia"}
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExportingMessage(msg);
            }}
            title="Esporta storia"
            aria-label="Esporta storia"
            className={`w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-gray-300 transition-colors ${
              aperta ? "" : "hidden group-hover:flex"
            }`}
          >
            <IcStoria className="w-4 h-4" />
          </button>
          {isSuperAdmin && (
            <button
              onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCarousel(msg);
                                }}
              title={
                msg.isValidatedForCarousel
                  ? "Togli dal carosello"
                  : "Aggiungi al carosello"
              }
              aria-label="Carosello"
              className={`w-8 h-8 rounded-lg border items-center justify-center transition-colors ${
                aperta ? "flex" : "hidden group-hover:flex"
              } ${
                msg.isValidatedForCarousel
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300"
              }`}
            >
              <IcCarosello className="w-4 h-4" />
            </button>
          )}
          <span
            aria-hidden="true"
            className={`w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1 ${
              aperta ? "block" : "hidden group-hover:block"
            }`}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteMessage(msg.id);
            }}
            title="Elimina messaggio"
            aria-label="Elimina messaggio"
            className={`h-8 px-3 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-gray-800 items-center gap-2 text-[12px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ${
              aperta ? "flex" : "hidden group-hover:flex"
            }`}
          >
            <IcElimina className="w-4 h-4" />
            Elimina
          </button>
        </div>
      )}
    </article>
  );
}
