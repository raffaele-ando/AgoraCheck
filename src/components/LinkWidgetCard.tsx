import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { LinkWidgetConfig, loadLinkConfigFromDB, DEFAULT_LINK_CONFIG } from "./AppSettings";

export const LinkWidgetCard = () => {
  const [config, setConfig] = useState<LinkWidgetConfig>(DEFAULT_LINK_CONFIG);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(false);

  useEffect(() => {
    loadLinkConfigFromDB().then((data) => {
      if (data) setConfig(data);
    });
  }, []);

  const copyToClipboard = (text: string, type: 'domain' | 'label') => {
    navigator.clipboard.writeText(text);
    if (type === 'domain') {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } else {
      setCopiedLabel(true);
      setTimeout(() => setCopiedLabel(false), 2000);
    }
  };

  return (
    <div className="w-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
      <div className="flex-1">
        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">Link Widget Instagram</h3>
        <p className="text-xs text-indigo-700 dark:text-indigo-400">
          Usa questi valori per il widget LINK delle storie. Clicca per copiare.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <button
          onClick={() => copyToClipboard(config.domain, 'domain')}
          className="flex items-center justify-between sm:justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold text-gray-800 dark:text-gray-200"
        >
          <span className="truncate max-w-[150px]">{config.domain}</span>
          {copiedDomain ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <Copy className="w-4 h-4 text-gray-400 shrink-0" />}
        </button>
        <button
          onClick={() => copyToClipboard(config.tagline, 'label')}
          className="flex items-center justify-between sm:justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold text-gray-800 dark:text-gray-200"
        >
          <span className="truncate max-w-[150px]">{config.tagline}</span>
          {copiedLabel ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <Copy className="w-4 h-4 text-gray-400 shrink-0" />}
        </button>
      </div>
    </div>
  );
};
