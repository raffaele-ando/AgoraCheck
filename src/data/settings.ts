/**
 * Configurazioni salvate su Firestore: link dei gruppi WhatsApp, widget eventi,
 * widget dei collegamenti. Lettura e scrittura, senza interfaccia.
 *
 * Stavano dentro components/AppSettings.tsx, cioe' dentro la SCHERMATA di
 * amministrazione. La bacheca pubblica ha pero' bisogno di leggere i link di
 * WhatsApp e gli eventi, quindi la importava — e con lei si portava dentro
 * l'intero pannello impostazioni, moduli e pulsanti compresi, in ogni pagina.
 * Un modulo di dati non deve dipendere da chi lo mostra.
 */
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { readDocDataSafe } from "../utils/firestoreRead";

export interface LinkWidgetConfig {
  domain: string;
  tagline: string;
}

export const DEFAULT_LINK_CONFIG: LinkWidgetConfig = {
  domain: "agora.theproject.world",
  tagline: "SPOTTED",
};

/*
  Le tre letture di configurazione qui sotto usano readDocDataSafe invece di
  getDoc. Il motivo e' che getDoc NON rifiuta quando Firestore non riesce a
  collegarsi: resta in attesa, anche indefinitamente. Il `catch` non veniva
  quindi mai raggiunto e la promessa non si risolveva, cosi' ogni pezzo di
  interfaccia in attesa restava nel proprio stato di caricamento — il widget
  di WhatsApp semitrasparente e "spento", il logo un rettangolo grigio.

  readDocDataSafe prova prima la cache locale, poi il server, e si arrende
  entro pochi secondi restituendo null. I valori predefiniti qui sotto
  diventano allora un ripiego vero e non un ramo irraggiungibile.
*/
export const loadLinkConfigFromDB = async (): Promise<LinkWidgetConfig> => {
  const data = await readDocDataSafe<LinkWidgetConfig>([
    "settings",
    "link_widget_config",
  ]);
  return data ?? DEFAULT_LINK_CONFIG;
};

export const saveLinkConfigToDB = async (config: LinkWidgetConfig) => {
  try {
    const configDoc = doc(db, "settings", "link_widget_config");
    await setDoc(configDoc, config);
  } catch (error) {
    console.error("Error saving link config to Firestore", error);
    throw error;
  }
};

// ======= WHATSAPP SETTINGS ======= //
export const loadWhatsappLinksFromDB = async (): Promise<Record<string, string>> => {
  const data = await readDocDataSafe<Record<string, string>>([
    "settings",
    "whatsapp_links",
  ]);
  return data ?? {};
};

export const saveWhatsappLinksToDB = async (config: Record<string, string>) => {
  try {
    const configDoc = doc(db, "settings", "whatsapp_links");
    await setDoc(configDoc, config);
  } catch (error) {
    console.error("Error saving whatsapp links to Firestore", error);
    throw error;
  }
};

// ======= EVENT WIDGET SETTINGS ======= //
export interface EventItemConfig {
  id: string;
  enabled: boolean;
  targetLocation: string;
  title: string;
  subtitle: string;
  date: string;
  url: string;
  icon: string;
  backgroundImage: string;
}

export interface EventWidgetConfig {
  events: EventItemConfig[];
  // Legacy
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  date?: string;
  url?: string;
  icon?: string;
  backgroundImage?: string;
}

export const DEFAULT_EVENT_ITEM: EventItemConfig = {
  id: "legacy",
  enabled: true,
  targetLocation: "all",
  title: "Fluo Party @ Magazzini",
  subtitle: "Musica elettronica ✨",
  date: "Mar 17",
  url: "#",
  icon: "🪩",
  backgroundImage: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
};

export const DEFAULT_EVENT_WIDGET_CONFIG: EventWidgetConfig = {
  events: []
};

export const loadEventWidgetConfigFromDB = async (): Promise<EventWidgetConfig> => {
  const data = await readDocDataSafe<EventWidgetConfig>([
    "settings",
    "event_widget_config",
  ]);
  if (!data) return DEFAULT_EVENT_WIDGET_CONFIG;

  const events: EventItemConfig[] = data.events || [];

  // Migrate legacy config
  if (events.length === 0 && data.title) {
    events.push({
      id: "legacy",
      enabled: data.enabled ?? true,
      targetLocation: "all",
      title: data.title,
      subtitle: data.subtitle || "",
      date: data.date || "",
      url: data.url || "",
      icon: data.icon || "",
      backgroundImage: data.backgroundImage || "",
    });
  }
  return { events };
};

export const saveEventWidgetConfigToDB = async (config: EventWidgetConfig) => {
  try {
    const configDoc = doc(db, "settings", "event_widget_config");
    await setDoc(configDoc, config);
  } catch (error) {
    console.error("Error saving event widget config to Firestore", error);
    throw error;
  }
};
