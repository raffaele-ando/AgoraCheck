import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Save, Link as LinkIcon } from "lucide-react";

export interface LinkWidgetConfig {
  domain: string;
  tagline: string;
}

export const DEFAULT_LINK_CONFIG: LinkWidgetConfig = {
  domain: "agora.theproject.world",
  tagline: "SPOTTED",
};

export const loadLinkConfigFromDB = async (): Promise<LinkWidgetConfig> => {
  try {
    const configDoc = doc(db, "settings", "link_widget_config");
    const snapshot = await getDoc(configDoc);
    if (snapshot.exists()) {
      return snapshot.data() as LinkWidgetConfig;
    }
  } catch (error) {
    console.error("Error loading link config from Firestore", error);
  }
  return DEFAULT_LINK_CONFIG;
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

export default function AppSettings() {
  const [linkConfig, setLinkConfig] = useState<LinkWidgetConfig>(DEFAULT_LINK_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLinkConfigFromDB().then((config) => {
      setLinkConfig(config);
      setIsLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      await saveLinkConfigToDB(linkConfig);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert("Errore durante il salvataggio.");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Caricamento impostazioni...</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Impostazioni Generali</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
          <LinkIcon className="w-5 h-5 text-indigo-500" />
          Testo Widget Link Instagram
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Imposta il testo di default che vuoi copiare per creare il widget link sulle storie di Instagram.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Testo Url (Dominio)
            </label>
            <input
              type="text"
              value={linkConfig.domain}
              onChange={(e) => setLinkConfig({ ...linkConfig, domain: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Testo Sticker (Label)
            </label>
            <input
              type="text"
              value={linkConfig.tagline}
              onChange={(e) => setLinkConfig({ ...linkConfig, tagline: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors ${
                isSaved ? "bg-green-500 hover:bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaved ? "Salvato!" : "Salva Impostazioni"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
