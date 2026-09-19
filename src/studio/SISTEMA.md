# Il sistema di Agorà

Questo documento non propone niente: **descrive** cio' che i post gia'
pubblicati fanno. Ogni numero e' misurato sul file di Canva
(`strumenti/stacca-elementi.py` lo rifa'), e dove il sistema e' incoerente
lo dice invece di nasconderlo.

Serve a due cose: fare un modello nuovo senza inventare, e accorgersi
quando un modello si allontana.

---

## 0. I formati

| | | |
|---|---|---|
| **post** | 1080×1440 | 3:4 — il formato dei post |
| **storia** | 1080×1920 | 9:16 |
| quadrato | 1080×1080 | 1:1 |

I file vecchi di Canva sono 1080×1350 (4:5). Il 3:4 e' il formato alto
che Instagram ha aperto nel 2025: stessa larghezza, **90 pixel in piu'**
di contenuto. Nel carosello quei 90 pixel vanno al riquadro del
messaggio, che e' il campo che piu' spesso non ci sta.

## 1. La griglia

**Tutte** le misure sono percentuali della **larghezza** — anche quelle
verticali. Su Instagram la larghezza e' sempre 1080 e a cambiare e' solo
l'altezza: cosi' `y: 20` vuol dire 216 pixel dal bordo in ogni formato, e
una testata scritta una volta resta identica nella storia e nel post.

E' la correzione di un errore fatto tre volte — sui pallini della barra,
sul raggio degli angoli, sul corpo del testo: ogni volta una misura era
legata alla cosa sbagliata, e ogni volta se n'e' accorto il confronto coi
post veri. Ora la regola e' una sola.

Cio' che sta appoggiato al bordo inferiore — la firma — si misura **dal
basso**: il marchio e' alto 41 pixel in tutti i formati, ma sta a 29
pixel dal fondo nel post e a 91 nella storia.

| | |
|---|---|
| margine esterno | **10%** a sinistra e a destra |
| colonna delle icone | **10% → 19%**, icona larga **~9%** |
| ritmo verticale | riquadro **172px**, spazio **60px**, quindi passo **232px** |

I riquadri di contenuto hanno **quattro larghezze**, e ognuna vuol dire
una cosa:

| larghezza | dove comincia | quando si usa |
|---|---|---|
| **67.1%** | 22.95% | il caso normale: c'e' un'icona nella colonna |
| **80%** | 10% | non c'e' un'icona: il riquadro occupa anche la colonna |
| **36.7%** ×2 | 9.9% e 53.3% | due informazioni affiancate |
| centrata | varie | un riquadro isolato, tipo il link |

E **due tipi**: pieno di `#e9dfd0` per il contenuto, oppure crema come il
foglio con un **filo arancione tratteggiato** per un esito. Il secondo
dice «questo e' com'e' finita», non «questo e' il contenuto».

Il margine destro e' 10% (i riquadri finiscono a 90), ma i riquadri
cominciano a 22.9 e non a 10: la fascia fra 10 e 22.9 e' la colonna delle
icone, e resta vuota quando un'icona non c'e'. E' questa asimmetria a far
riconoscere un post di Agorà a colpo d'occhio.

## 2. I colori

| ruolo | colore | dove |
|---|---|---|
| fondo | `#f2ecdf` | il foglio |
| riquadro | `#e9dfd0` | i contenitori del contenuto |
| accento | `#db5e00` | «Spotted», le etichette, la barra |
| inchiostro | `#000000` | i testi e il marchio |
| marchio | blu notte | i tre pallini in basso a sinistra |

Sono gli stessi tre colori del sito: `--ag-bg`, `--ag-surface`,
`--ag-accent`. Non c'e' una seconda tavolozza.

## 3. I caratteri

| ruolo | carattere | corpo (% della larghezza) |
|---|---|---|
| nome dell'ateneo | League Spartan Bold | **9.74** (spaziatura −0.04 em) |
| «Spotted» | Abril Fatface, inclinato | **4.31** |
| etichetta di sezione | Archivo Black, maiuscolo | **4.80** |
| testo corrente | Open Sans Bold | **4.32** |
| testo minore | Open Sans Bold | **3.76** |

Sono cinque corpi, non di piu'. Tutti liberi (SIL OFL / Apache), quindi
ospitati nel sito.

**Attenzione al League Spartan**: quello di Canva e' il taglio del 2014,
quello di Google Fonts il ridisegno del 2020, piu' largo del 27% a parita'
di altezza. La spaziatura −0.04 em rimette le proporzioni. Vedi
`marchio.ts`.

## 4. Le due testate

E' la distinzione che regge tutto il resto, ed e' facile non vederla:

- **`ATENEO` + «Spotted»** — per i messaggi degli studenti. Lo Spotted e'
  arancione, in Abril inclinato.
- **`ATENEO` + marchio AGORÀ** — per tutto il resto: divulgazione,
  avvisi, eventi. E' la forma dei fogli da 3000x3750.

Il primo dice «questo l'ha mandato qualcuno», il secondo «questo lo
diciamo noi». Usare il primo per un post divulgativo lo fa sembrare uno
spotted, ed e' la differenza fra le due voci della pagina.

Proporzioni della seconda, misurate: il marchio e' alto **0.619** volte le
maiuscole del nome, e sta **0.051** volte piu' sotto.

## 5. La grammatica delle icone

E' l'idea migliore del sistema: **ogni informazione porta un'icona che ne
dice il genere**, sempre la stessa, nella colonna di sinistra.

| | |
|---|---|
| 🗓 | quando |
| 📍 | dove |
| 🔎 | cosa si cerca |
| 🔗 | il collegamento |
| 🎯 | com'e' finita |

Un'icona, un significato. Chi legge impara la colonna di sinistra una
volta e poi non legge piu' le etichette. E' la stessa regola delle icone
della dashboard, arrivata qui prima.

**Dove sta l'icona** dipende dalla larghezza del riquadro: a sinistra
quando il riquadro e' da 67.1%, **sopra** quando sono due da 36.7%
affiancati. A meta' larghezza una colonna di icone mangerebbe un terzo
del riquadro.

## 6. Le etichette di sezione

Quando una parte del post cambia genere — i «RISULTATI» dopo lo spotted —
l'etichetta sta **nella colonna di sinistra**, in Archivo Black maiuscolo
arancione, con la parola in alto e **l'icona sotto**. Non e' un titolo
sopra al contenuto: e' un segnale a margine.

## 7. La struttura di un post

1. testata in alto
2. (carosello) la barra dei venti segni, accesa fino alla scheda corrente
3. le righe: icona a sinistra, riquadro a destra
4. eventuali sezioni, con la loro etichetta
5. la firma in fondo: il marchio al centro, i tre pallini blu a sinistra

La firma sta sempre a **94.8%** dell'altezza, misurata sull'inchiostro —
ma non e' sempre la stessa: nella storia dei risultati il marchio non c'e'
e i pallini stanno a **destra**. Vedi le incoerenze, punto 5.

Sopra la testata puo' esserci l'**arco** del marchio (c'e' nei risultati,
non negli altri).

---

## Le incoerenze, dette

Non sono errori da correggere di nascosto: sono cose da decidere.

1. **Le emoji vengono da due insiemi diversi.** Nei PNG sono quelle di
   Apple (calendario azzurro, lente azzurra); nel file di Canva sono
   quelle di un altro insieme (calendario bianco e rosso, lente grigia).
   Lo stesso significato ha due disegni. Nello Studio sono quelle del
   file di Canva, perche' sono quelle del documento sorgente.
2. **I riquadri hanno sei altezze diverse** (12.8, 15.3, 16.2, 27.0, 38.3,
   8.7% dell'altezza) e non si riconducono a un passo unico. Le prime due
   righe sono sempre 12.8; il riquadro del messaggio cambia con lo
   spazio che resta.
3. **«RISULTATI» usa Archivo Black**, che non compare in nessun altro
   punto. O diventa il carattere di tutte le etichette di sezione — ed e'
   la strada presa qui — oppure e' un carattere in piu' per una parola
   sola.
4. **Cinque larghezze centrate diverse** (40.9%, 46.2%, 69.6%) per i
   riquadri isolati: sono tre misure per lo stesso ruolo. Una sola
   basterebbe.
5. **La firma cambia senza una regola.** Nel carosello e nelle storie
   spotted: marchio al centro, pallini a sinistra. Nella storia dei
   risultati: niente marchio, pallini a destra. Non sembra voluto, ma
   l'ho tenuto com'e' invece di uniformarlo: e' una cosa da decidere,
   non da correggere di nascosto.
6. **L'arco sopra la testata** c'e' solo nei risultati. O e' un segno che
   distingue un genere di post, e allora va usato in modo regolare, o e'
   rimasto li' da una versione precedente.
