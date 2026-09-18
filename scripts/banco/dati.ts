/*
 * I dati finti del banco di prova. Somigliano ai veri: messaggi lunghi e
 * corti, profili con e senza nome, alias incerti, zone diverse, qualcuno
 * archiviato, qualcuno gia' nel carosello.
 */
const ora = new Date("2026-09-18T21:00:00");
const fa = (ore: number) => {
  const d = new Date(ora.getTime() - ore * 3600_000);
  return { toDate: () => d, toMillis: () => d.getTime(), seconds: Math.floor(d.getTime() / 1000) };
};

const UA_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Instagram 320.0.0.0";
const UA_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

const dispositivo = (ua: string, risoluzione: string, citta: string) => ({
  userAgent: ua,
  language: "it-IT",
  platform: ua.includes("iPhone") ? "iPhone" : "MacIntel",
  screenResolution: risoluzione,
  timezone: "Europe/Rome",
  location: { city: citta, country: "IT" },
});

export const MESSAGGI = [
  {
    id: "m1", lookingFor: "Ragazza con la felpa gialla che studiava in Biblioteca Centrale giovedì pomeriggio, ci siamo guardati per mezz'ora e non ho avuto il coraggio di dirti niente",
    where: "Biblioteca Centrale", when: "giovedì pomeriggio", city: "MILANO", area: "CITTÀ STUDI",
    instagram: "marco.bnc", resolution: "Trovata, si sono scritti", createdAt: fa(2),
    isValidatedForCarousel: true, isArchived: false,
    deviceInfo: dispositivo(UA_IPHONE, "390x844", "Milano"),
    advancedInfo: JSON.stringify({ ip: "93.44.21.7", isp: "Vodafone Italia", city: "Milano", batteryLevel: 0.42, deviceMemory: 4, hardwareConcurrency: 6 }),
  },
  {
    id: "m2", type: "ricerca", lookingFor: "Qualcuno sa se la mensa di via Golgi è aperta sabato?",
    createdAt: fa(5), isValidatedForCarousel: false, isArchived: false,
    deviceInfo: dispositivo(UA_MAC, "1512x982", "Milano"),
    advancedInfo: JSON.stringify({ ip: "151.29.8.114", isp: "TIM", city: "Milano" }),
  },
  {
    id: "m3", lookingFor: "Tipo alto con lo zaino Eastpak rosso alla fermata del 90, scendevi a Lambrate",
    area: "LAMBRATE", city: "MILANO", when: "martedì", instagram: "luchi.p",
    createdAt: fa(26), isValidatedForCarousel: true, isArchived: false,
    deviceInfo: dispositivo(UA_IPHONE, "393x852", "Milano"),
    advancedInfo: JSON.stringify({ ip: "93.44.21.7", isp: "Vodafone Italia", city: "Milano" }),
  },
  {
    id: "m4", lookingFor: "Chi era che suonava il piano in aula magna venerdì?",
    where: "Aula magna", city: "MILANO", area: "MILANO", instagram: "sara.mrt",
    resolution: "Trovata", createdAt: fa(34), isValidatedForCarousel: true, isArchived: false,
    deviceInfo: dispositivo(UA_MAC, "1728x1117", "Milano"),
    advancedInfo: JSON.stringify({ ip: "5.90.140.2", isp: "Wind Tre", city: "Sesto San Giovanni" }),
  },
  {
    id: "m5", type: "sondaggio", lookingFor: "Meglio studiare in Bovisa o in Città Studi?",
    pollOptions: ["Bovisa", "Città Studi", "Da casa"], city: "MILANO",
    createdAt: fa(50), isValidatedForCarousel: false, isArchived: false,
    deviceInfo: dispositivo(UA_IPHONE, "390x844", "Milano"),
  },
  {
    id: "m6", lookingFor: "Ci siamo incrociati in coda al bar di Architettura, tu avevi un quaderno pieno di schizzi",
    where: "Bar Architettura", city: "MILANO", area: "BOVISA", when: "lunedì mattina",
    createdAt: fa(72), isValidatedForCarousel: false, isArchived: true,
    deviceInfo: dispositivo(UA_IPHONE, "414x896", "Milano"),
  },
];

export const PROFILI: Record<string, any> = {
  "dev-a1b2c3": { name: "Marco B.", possibleAliases: ["Marco Bianchi", "M.B."], customInstagrams: ["marco.bnc", "mrcb_99"] },
  "dev-d4e5f6": { name: "Luca P.", customInstagrams: ["luchi.p"] },
  "dev-g7h8i9": { name: "Sara M.", customInstagrams: ["sara.mrt"] },
};

export const VISITE = Array.from({ length: 180 }, (_, i) => ({
  id: `v${i}`,
  createdAt: fa(i * 2),
  deviceInfo: dispositivo(i % 3 === 0 ? UA_MAC : UA_IPHONE, "390x844", "Milano"),
  advancedInfo: JSON.stringify({ ip: `93.44.21.${i % 200}`, isp: i % 2 ? "TIM" : "Vodafone Italia", city: "Milano" }),
}));
