/**
 * Le citta' e gli atenei serviti da Agora, con i nomi come vanno mostrati.
 *
 * Stava dentro components/HeaderVariations.tsx insieme a un componente che
 * nessuno importa piu'. Erano due cose diverse nello stesso file, e siccome
 * l'elenco serve quasi ovunque — bacheca, Dashboard, impostazioni, template —
 * quel componente inutilizzato finiva nel pacchetto di ogni pagina che aveva
 * bisogno soltanto di sapere come si chiama un ateneo.
 *
 * Qui ci sono solo i dati: nessun import, nessuna dipendenza da React.
 */
export const LOCATIONS: Record<string, string[]> = {
  "MILANO": ["MILANO", "POLIMI", "HUNIMED", "BOCCONI", "UNIMI", "BICOCCA", "IULM", "UNISR", "CATTOLICA"],
  "TORINO": ["TORINO", "UNITO", "POLITO"],
  "GENOVA": ["GENOVA", "UNIGE"]
};

export const CITIES = Object.keys(LOCATIONS);

export const formatCity = (city: string) => city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

export const formatArea = (area: string, city: string) => {
  if (area === city) return "Tutta la città";
  if (area === "POLIMI") return "PoliMi";
  if (area === "UNIMI") return "UniMi";
  if (area === "POLITO") return "PoliTo";
  if (area === "UNITO") return "UniTo";
  if (area === "UNIGE") return "UniGe";
  if (area === "BICOCCA") return "Bicocca";
  if (area === "BOCCONI") return "Bocconi";
  if (area === "CATTOLICA") return "Cattolica";
  if (area === "HUNIMED") return "Hunimed";
  if (area === "UNISR") return "UniSR";
  return area;
};
