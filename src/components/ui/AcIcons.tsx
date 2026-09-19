/*
 * Il repertorio di segni della dashboard: un'icona, un significato.
 *
 * Non vengono da una libreria di terze parti per una ragione precisa. In
 * `Dashboard.tsx` sei icone di `lucide-react` portavano insieme 22
 * significati: il segnaposto geografico indicava la zona, il luogo
 * dell'incontro E l'indirizzo IP; lo scudo d'allarme segnalava insieme
 * «non riesco a caricare i dati» e «questa identita' e' incerta», cioe' un
 * guasto e un'ipotesi statistica con lo stesso segno.
 *
 * Un'icona funziona solo se significa sempre la stessa cosa. Qui ogni
 * segno ha un compito e uno solo, ed e' scritto accanto.
 *
 * Tutte condividono lo stesso tratto (1.6) e la stessa griglia 24x24, cosi'
 * hanno lo stesso peso ottico quando stanno in riga.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const Svg = ({ children, className = "w-4 h-4", ...rest }: IconProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

/** Archivia — l'unica azione che sposta un messaggio fuori dalla coda */
export const IcArchivia = (p: IconProps) => <Svg {...p}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8" /><path d="M12 11v6m0 0l-2.5-2.5M12 17l2.5-2.5" /></Svg>;

/** Storia — genera l'immagine 9:16 per Instagram */
export const IcStoria = (p: IconProps) => <Svg {...p}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M12 15V8m0 0L9.5 10.5M12 8l2.5 2.5" /></Svg>;

/** Carosello — mette in coda per il post multiplo */
export const IcCarosello = (p: IconProps) => <Svg {...p}><rect x="8" y="4" width="12" height="16" rx="2" /><path d="M5 7v10M2.5 9v6" /></Svg>;

/** Elimina — irreversibile: vive solo nel menu */
export const IcElimina = (p: IconProps) => <Svg {...p}><path d="M4 6.5h16" /><path d="M9.5 6.5V4h5v2.5" /><path d="M6.5 6.5l.9 13.5h9.2l.9-13.5" /></Svg>;

/** Citta — il comune, non il quartiere */
export const IcCitta = (p: IconProps) => <Svg {...p}><path d="M3 21V10h6v11" /><path d="M9 21V3h11v18" /><path d="M12.5 7h1M16 7h1M12.5 11h1M16 11h1M12.5 15h1M16 15h1" /></Svg>;

/** Zona — il quartiere scelto dall'operatore */
export const IcZona = (p: IconProps) => <Svg {...p}><path d="M12 21.5S19 14.8 19 10a7 7 0 10-14 0c0 4.8 7 11.5 7 11.5z" /><circle cx="12" cy="10" r="2.4" /></Svg>;

/** Dove — il luogo dell'incontro, scritto da chi invia */
export const IcDove = (p: IconProps) => <Svg {...p}><path d="M5.5 21V5a2 2 0 012-2h9a2 2 0 012 2v16" /><path d="M3 21h18" /><circle cx="15" cy="12.5" r="1" /></Svg>;

/** Quando — il giorno indicato */
export const IcQuando = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M8 2.5v5M16 2.5v5M3.5 10.5h17" /></Svg>;

/** Ora — quando e' arrivato il messaggio */
export const IcOra = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;

/** Instagram — profilo collegato */
export const IcInstagram = (p: IconProps) => <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="16.8" cy="7.2" r=".9" fill="currentColor" stroke="none" /></Svg>;

/** Alias — ipotesi da verificare */
export const IcAlias = (p: IconProps) => <Svg {...p}><path d="M12 3.5L21.5 20H2.5L12 3.5z" /><path d="M12 10v4" /><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" /></Svg>;

/** Incerta — puo' unire persone diverse */
export const IcIncerta = (p: IconProps) => <Svg {...p}><path d="M12 2.7l8 3.4v5.6c0 4.7-3.2 8.5-8 9.6-4.8-1.1-8-4.9-8-9.6V6.1l8-3.4z" /><path d="M10.2 10a1.9 1.9 0 113.1 1.6c-.7.5-1.3.9-1.3 1.9" /><circle cx="12" cy="16.6" r=".85" fill="currentColor" stroke="none" /></Svg>;

/** Trovata — si sono trovati */
export const IcTrovata = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.6" /><path d="M8.3 12.3l2.6 2.6 4.8-5.4" /></Svg>;

/** Profilo — persona ricostruita */
export const IcProfilo = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8.4" r="3.9" /><path d="M4.6 20.5c.6-3.8 3.7-6 7.4-6s6.8 2.2 7.4 6" /></Svg>;

/** Dispositivo — un telefono o un computer */
export const IcDispositivo = (p: IconProps) => <Svg {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 5.5h3" /></Svg>;

/** Rete — IP, operatore, provenienza */
export const IcRete = (p: IconProps) => <Svg {...p}><circle cx="12" cy="4.6" r="2.1" /><circle cx="4.8" cy="18" r="2.1" /><circle cx="19.2" cy="18" r="2.1" /><path d="M10.6 6.5L6.2 16M13.4 6.5L17.8 16M7 18h10" /></Svg>;

/** Selezione — modalita' a piu' elementi */
export const IcSelezione = (p: IconProps) => <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><path d="M8 12.2l2.8 2.8 5.2-5.8" /></Svg>;

/** Cerca */
export const IcCerca = (p: IconProps) => <Svg {...p}><circle cx="10.5" cy="10.5" r="6.8" /><path d="M15.6 15.6L21 21" /></Svg>;

/** Filtro */
export const IcFiltro = (p: IconProps) => <Svg {...p}><path d="M3 4.8h18l-7 8.2v6.4l-4 2.3v-8.7z" /></Svg>;

/** Unisci */
export const IcUnisci = (p: IconProps) => <Svg {...p}><path d="M4 4.5h3.2c1.3 0 2.4.8 2.9 2l2.2 5.3c.5 1.2 1.6 2 2.9 2H20" /><path d="M4 19.5h3.2c1.3 0 2.4-.8 2.9-2l.6-1.4" /><path d="M17 10.8l3 3-3 3" /></Svg>;

/** Scollega */
export const IcScollega = (p: IconProps) => <Svg {...p}><path d="M9.3 14.7l-2.1 2.1a3.6 3.6 0 01-5.1-5.1l2.1-2.1" /><path d="M14.7 9.3l2.1-2.1a3.6 3.6 0 015.1 5.1l-2.1 2.1" /><path d="M8.5 3.5v2.4M3.5 8.5h2.4M15.5 20.5v-2.4M20.5 15.5h-2.4" /></Svg>;

/** Statistiche */
export const IcStatistiche = (p: IconProps) => <Svg {...p}><path d="M4 20.5V13M10 20.5V4.5M16 20.5V9.5M22 20.5h-20" /></Svg>;

/** Messaggi */
export const IcMessaggi = (p: IconProps) => <Svg {...p}><path d="M4 5.5h16a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 3.5v-3.5H4a1 1 0 01-1-1v-9a1 1 0 011-1z" /></Svg>;

/** Configurazione */
export const IcConfigurazione = (p: IconProps) => <Svg {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2.2" /><circle cx="8" cy="17" r="2.2" /></Svg>;

/** Altro — solo azioni rare */
export const IcAltro = (p: IconProps) => <Svg {...p}><circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" /></Svg>;

/* --- Secondo gruppo: i segni che servivano fuori dalla lista messaggi.
 * Prima li coprivano ancora icone lucide, con gli stessi doppioni di
 * significato: lo scudo d'allarme faceva insieme "accesso negato" e
 * "identita' incerta", il chip faceva insieme "dati tecnici" e "questo
 * dispositivo". --- */

/** Spunta: questa cosa e' scelta, o questa regola e' scattata. */
export const IcSpunta = (p: IconProps) => <Svg {...p}><path d="M4.5 12.5l5 5 10-11" /></Svg>;

/** Copia negli appunti */
export const IcCopia = (p: IconProps) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 5.5a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2" /></Svg>;

/** Scarica un file */
export const IcScarica = (p: IconProps) => <Svg {...p}><path d="M12 3.5v12M7.5 11l4.5 4.5 4.5-4.5M4 20.5h16" /></Svg>;

/** Un documento, un rapporto scritto */
export const IcDocumento = (p: IconProps) => <Svg {...p}><path d="M14 3.5H7a1.5 1.5 0 00-1.5 1.5v14A1.5 1.5 0 007 20.5h10a1.5 1.5 0 001.5-1.5V8L14 3.5z" /><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" /></Svg>;

/** Accesso negato: un guasto o un permesso mancante, non un'incertezza. */
export const IcBloccato = (p: IconProps) => <Svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 017 0v3" /></Svg>;

/** Attivita' nel tempo: quando questa persona si e' fatta viva. */
export const IcAttivita = (p: IconProps) => <Svg {...p}><path d="M3 13h3.5l2.5-7 3.5 14 2.5-7H21" /></Svg>;

/** Dati tecnici grezzi */
export const IcTecnico = (p: IconProps) => <Svg {...p}><path d="M9 8.5L5.5 12 9 15.5M15 8.5l3.5 3.5-3.5 3.5M13.5 5.5l-3 13" /></Svg>;

/** Chiudi questo pannello */
export const IcChiudi = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;

/** Risoluzione dello schermo */
export const IcSchermo = (p: IconProps) => <Svg {...p}><rect x="3" y="4.5" width="18" height="12" rx="1.5" /><path d="M9 20h6M12 16.5V20" /></Svg>;

/** Apri o chiudi un pannello (ruota di 180 gradi da aperto) */
export const IcApri = (p: IconProps) => <Svg {...p}><path d="M6 9.5l6 6 6-6" /></Svg>;

/** Impronta: i dati con cui si riconosce un dispositivo */
export const IcImpronta = (p: IconProps) => <Svg {...p}><path d="M12 4.5a7.5 7.5 0 00-7.5 7.5v2M12 4.5a7.5 7.5 0 017.5 7.5v3.5M8 12a4 4 0 018 0v5M12 12v7" /></Svg>;

/** Porta altrove: un collegamento, un passaggio successivo */
export const IcFreccia = (p: IconProps) => <Svg {...p}><path d="M5 12h13M12.5 6l6 6-6 6" /></Svg>;

/* --- Terzo gruppo: i segni dei pannelli di configurazione.
 * Erano gli ultimi rimasti a `lucide-react`, con lo stesso vizio di
 * prima: il quadrato con la montagna faceva insieme "carica un file",
 * "questa e' un'immagine" e "sfondo", e il cestino conviveva con un
 * secondo cestino di disegno diverso a due centimetri di distanza.
 * Qui i pannelli usano lo stesso tratto e la stessa griglia del resto. --- */

/** Carica un file dal computer */
export const IcCarica = (p: IconProps) => <Svg {...p}><path d="M12 20.5v-12M7.5 13L12 8.5 16.5 13M4 3.5h16" /></Svg>;

/** Questa cosa e' un'immagine */
export const IcImmagine = (p: IconProps) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="8.8" cy="9.8" r="1.5" /><path d="M3.5 16.5l4.8-4.3 4 3.4 3-2.6 5.2 4.2" /></Svg>;

/** Il testo: quello che si scrive dentro il riquadro */
export const IcTesto = (p: IconProps) => <Svg {...p}><path d="M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6" /></Svg>;

/** Salva le modifiche */
export const IcSalva = (p: IconProps) => <Svg {...p}><path d="M5.5 3.5h10L20.5 8v11a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 19V5a1.5 1.5 0 011.5-1.5z" /><path d="M8 3.5v5h6v-5M7.5 20.5v-6h9v6" /></Svg>;

/** Un indirizzo web */
export const IcLink = (p: IconProps) => <Svg {...p}><path d="M10 14a4 4 0 006 .5l2.5-2.5a4 4 0 10-5.7-5.7L11.5 7.5" /><path d="M14 10a4 4 0 00-6-.5L5.5 12a4 4 0 105.7 5.7l1.3-1.3" /></Svg>;

/** Piu' persone: gli amministratori, un gruppo */
export const IcPersone = (p: IconProps) => <Svg {...p}><circle cx="9.5" cy="8.4" r="3.5" /><path d="M3 20c.5-3.4 3.2-5.4 6.5-5.4S15.5 16.6 16 20" /><path d="M16 5.3a3.5 3.5 0 010 6.6M18 14.9c2 .8 3.3 2.6 3.6 5.1" /></Svg>;

/** Aggiungi una riga nuova */
export const IcAggiungi = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;

/** Togli */
export const IcMeno = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>;

/** Rigenera: rifa' la stessa cosa da capo */
export const IcRicarica = (p: IconProps) => <Svg {...p}><path d="M20 11.5A8 8 0 006 6.2L3.8 8.4" /><path d="M4 12.5a8 8 0 0014 5.3l2.2-2.2" /><path d="M3.5 4v4.5H8M20.5 20v-4.5H16" /></Svg>;

/** Sto lavorando: gira finche' non ho finito */
export const IcAttesa = (p: IconProps) => <Svg {...p}><path d="M12 3.5a8.5 8.5 0 018.5 8.5" /><path d="M20.5 12A8.5 8.5 0 1112 3.5" opacity=".28" /></Svg>;

/** Allinea il testo a sinistra */
export const IcAllineaSinistra = (p: IconProps) => <Svg {...p}><path d="M4 6h16M4 10.7h9M4 15.3h16M4 20h9" /></Svg>;

/** Allinea il testo al centro */
export const IcAllineaCentro = (p: IconProps) => <Svg {...p}><path d="M4 6h16M7.5 10.7h9M4 15.3h16M7.5 20h9" /></Svg>;

/** Allinea il testo a destra */
export const IcAllineaDestra = (p: IconProps) => <Svg {...p}><path d="M4 6h16M11 10.7h9M4 15.3h16M11 20h9" /></Svg>;

/** Attacca il riquadro al bordo di sopra */
export const IcSuAlBordo = (p: IconProps) => <Svg {...p}><path d="M4 3.5h16" /><path d="M12 20.5V7.5M7.5 12L12 7.5 16.5 12" /></Svg>;

/** Attacca il riquadro al bordo di sotto */
export const IcGiuAlBordo = (p: IconProps) => <Svg {...p}><path d="M4 20.5h16" /><path d="M12 3.5v13M7.5 12l4.5 4.5L16.5 12" /></Svg>;

/** Fatto in automatico dal programma */
export const IcBrillante = (p: IconProps) => <Svg {...p}><path d="M11 3.5l1.7 4.3 4.3 1.7-4.3 1.7L11 15.5l-1.7-4.3L5 9.5l4.3-1.7z" /><path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></Svg>;

/** Una spiegazione, non un allarme */
export const IcInfo = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.6" /><path d="M12 11.3v5" /><circle cx="12" cy="8.2" r=".9" fill="currentColor" stroke="none" /></Svg>;

/** Il modello: la forma fissa su cui si versa il contenuto */
export const IcModello = (p: IconProps) => <Svg {...p}><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M9.5 9.5V20" /></Svg>;
