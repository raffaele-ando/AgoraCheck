/*
 * L'intestazione della dashboard.
 *
 * Prima erano due piani per circa 130 pixel: logo, la scritta "DASHBOARD"
 * (che diceva dove sei a chi lo sapeva gia'), un contatore su cui non si
 * agisce, il bottone Selezione, tema, indirizzo di posta, esci — e sotto,
 * sei schede tutte dello stesso peso, benche' "Messaggi" si apra cento
 * volte al giorno e "Impostazioni" tre volte l'anno.
 *
 * Qui e' una riga sola: tre sezioni di lavoro e un menu per il resto.
 */
import { useState } from "react";
import {
  IcAltro,
  IcConfigurazione,
  IcMessaggi,
  IcProfilo,
  IcStatistiche,
} from "../ui/AcIcons";

export type NextTab =
  | "messages"
  | "profiles"
  | "analytics"
  | "story_template"
  | "carousel"
  | "settings";

export interface NextHeaderProps {
  activeTab: NextTab;
  onTab: (t: NextTab) => void;
  unreadCount: number;
  isSuperAdmin: boolean;
  /** Cosa stai guardando adesso: va nel vuoto al centro della barra. */
  stato?: React.ReactNode;
  email?: string | null;
  totalMessages: number | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  logo?: React.ReactNode;
}

const SEZIONI = [
  { tab: "messages" as const, label: "Messaggi", Icon: IcMessaggi },
  { tab: "profiles" as const, label: "Profili", Icon: IcProfilo },
  { tab: "analytics" as const, label: "Statistiche", Icon: IcStatistiche },
];

const CONFIG = [
  { tab: "story_template" as const, label: "Template storia" },
  { tab: "carousel" as const, label: "Carosello Instagram" },
  { tab: "settings" as const, label: "Impostazioni" },
];

export default function NextHeader({
  activeTab,
  onTab,
  unreadCount,
  isSuperAdmin,
  stato,
  email,
  totalMessages,
  isDarkMode,
  onToggleTheme,
  onLogout,
  logo,
}: NextHeaderProps) {
  const [menu, setMenu] = useState<null | "config" | "account">(null);
  const inConfig =
    activeTab === "story_template" || activeTab === "carousel" || activeTab === "settings";

  return (
    <header className="sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 mb-6 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
      <div className="h-[54px] flex items-center gap-3 sm:gap-6">
        <div className="shrink-0">
          {logo ?? (
            <span className="font-bold tracking-[0.18em] text-[13px]">AGORÀ</span>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {SEZIONI.filter((s) => isSuperAdmin || s.tab === "messages").map(
            ({ tab, label, Icon }) => (
              <button
                key={tab}
                onClick={() => onTab(tab)}
                aria-current={activeTab === tab ? "page" : undefined}
                className={`px-3 py-2 text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab
                    ? "bg-gray-200/70 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                {tab === "messages" && unreadCount > 0 && (
                  <span
                    className={`tabular-nums text-[11px] font-semibold px-2 py-1 rounded-lg ${
                      activeTab === tab
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ),
          )}
        </nav>

        {/* Il centro dell'intestazione: misurato, erano 739 pixel vuoti su
            1440, cioe' meta' della barra — la fascia piu' vista della
            pagina, in alto, sempre a schermo, e non portava niente. Ci va
            cio' che si guarda in continuazione mentre si smaltisce: quanti
            ne restano e con che filtro. Prima stavano in fondo alla colonna
            di destra, dove l'occhio non passa. */}
        {stato && (
          <div className="hidden lg:flex items-center gap-2 mx-6 min-w-0 text-[12px]">
            {stato}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isSuperAdmin && (
            <div className="relative">
              <button
                onClick={() => setMenu(menu === "config" ? null : "config")}
                aria-expanded={menu === "config"}
                aria-haspopup="menu"
                className={`px-3 py-2 text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                  inConfig
                    ? "bg-gray-200/70 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <IcConfigurazione className="w-4 h-4" />
                <span className="hidden md:inline">Configurazione</span>
              </button>
              {menu === "config" && (
                <>
                  <div className="fixed inset-0 z-[70]" onClick={() => setMenu(null)} />
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 z-[80] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2"
                  >
                    {CONFIG.map(({ tab, label }) => (
                      <button
                        key={tab}
                        role="menuitem"
                        onClick={() => {
                          onTab(tab);
                          setMenu(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                          activeTab === tab
                            ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    {/* Lo Studio e' una pagina a se', non una scheda della
                        dashboard: quindi un collegamento e non un bottone,
                        cosi' si apre anche in una scheda nuova col tasto
                        centrale. Sta in fondo, staccato: e' un posto dove si
                        va a lavorare, non un'impostazione da cambiare. */}
                    <a
                      role="menuitem"
                      // Non "/studio": il sito puo' essere servito da una
                      // sottocartella, e li' un percorso assoluto uscirebbe fuori.
                      href={`${import.meta.env.BASE_URL}studio`}
                      className="w-full block text-left px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 mt-2 pt-2"
                    >
                      Studio — post e storie
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setMenu(menu === "account" ? null : "account")}
              aria-expanded={menu === "account"}
              aria-haspopup="menu"
              aria-label="Il tuo account"
              className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-semibold flex items-center justify-center"
            >
              {(email || "?").slice(0, 2).toUpperCase()}
            </button>
            {menu === "account" && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setMenu(null)} />
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 z-[80] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                    <div className="text-[12px] text-gray-600 dark:text-gray-400 truncate">
                      {email}
                    </div>
                    {isSuperAdmin && (
           <span className="mt-1 inline-block text-[11px] font-semibold tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded">
                        Super admin
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                      Tema
                    </span>
                    <button
                      onClick={onToggleTheme}
                      className="ml-auto px-3 py-1 rounded-lg text-[12px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    >
                      {isDarkMode ? "Scuro" : "Chiaro"}
                    </button>
                  </div>
                  <a
                    href="/"
                    className="w-full block text-left px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Vai alla bacheca pubblica
                  </a>
                  {totalMessages !== null && (
                    <div className="px-3 py-2 text-[12px] tabular-nums text-gray-600 dark:text-gray-400">
                      {totalMessages.toLocaleString("it-IT")} messaggi in totale
                    </div>
                  )}
                  <button
                    role="menuitem"
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border-t border-gray-100 dark:border-gray-700 mt-2 pt-2"
                  >
                    Esci
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
