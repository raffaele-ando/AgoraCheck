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
