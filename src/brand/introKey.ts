/**
 * Chiave di sessione: "l'apertura del marchio è già stata vista in questa scheda".
 *
 * Un'UNICA sorgente, di proposito. Era scritta a mano in due punti — qui e
 * nello script iniettato in index.html — identica per caso, senza nulla che lo
 * garantisse: la stessa classe di difetto già vista con i tempi della porta
 * (T_GROW e soci, duplicati fra la bacheca e Orbite prima che diventassero
 * brand/portal.ts). Un refuso in una delle due copie avrebbe fatto ripartire
 * l'apertura a ogni visita, o non fermarla mai, senza che nulla lo segnalasse.
 *
 * Letta in due posti: da App.tsx (che decide se montare il portale) e da
 * src/bootstrap/inkCover.ts (che copre lo schermo prima ancora che React
 * esista, e per questo è compilato a parte e iniettato in index.html — vedi
 * il plugin in vite.config.ts).
 */
export const INTRO_KEY = "agora_intro";
