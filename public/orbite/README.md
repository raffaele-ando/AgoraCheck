# Agorà

Sito statico: il marchio **Agorà** al centro e, in orbita attorno, i loghi degli
atenei italiani e le bandiere di regioni e capoluoghi. Nessun framework, nessuna
dipendenza da CDN.

```
index.html
assets/css/style.css
assets/js/orbits.js       motore delle orbite (vanilla JS, ~9 KB)
assets/js/intro.js        apertura: la porta del brandmark scopre il sito
assets/img/agora-logo.png
assets/img/brandmark.svg  la "o" di Agorà come vettore autonomo
assets/img/brandmark.md   geometria misurata del brandmark, con i numeri
assets/loghi/             loghi degli atenei (originali + versioni corrette)
assets/loghi/fonti/       marchi scaricati, sorgente delle versioni corrette
strumenti/                rigenera le versioni corrette dei loghi
project/                  bundle originale di Claude Design (sorgente del design)
chats/                    trascrizioni della progettazione
```

Per vederlo basta un server statico qualsiasi dalla radice del progetto:

```
python3 -m http.server 8000     # poi apri http://localhost:8000
```

## Come funziona la scena

Ogni token (chip con logo o bandiera) percorre un'ellisse inclinata di −12°. Le
ellissi sono concentriche, hanno la stessa inclinazione e "respirano" in fase:
i raggi si allontanano e si avvicinano insieme, quindi i tracciati non si
incrociano mai e le distanze relative restano costanti.

Il numero di anelli, i raggi, la dimensione dei chip e quanti token stanno su
ciascun anello vengono **ricalcolati a ogni resize** partendo dal viewport: la
stessa scena regge il desktop orizzontale e il telefono verticale senza rimpicciolire
tutto. Su desktop 1440×900 vengono fuori 3 orbite e 20 posizioni; su un telefono
390×844 due orbite (atenei fuori, bandiere dentro) e 14 posizioni.

Le sovrapposizioni non sono stimate a occhio. `fitsOnRing` e `ringsCompatible`
in `assets/js/orbits.js` verificano numericamente che due riquadri non si
incontrino mai, campionando tutte le posizioni relative possibili; il layout
scarta i raggi che non superano la verifica. Un'orbita che reggerebbe meno di
tre token viene eliminata.

Dove non c'è spazio per tutti — tipicamente su telefono — ogni posizione ospita
**più token a turno**: lo scambio avviene nel punto più lontano dell'orbita,
dove opacità e scala sono al minimo, con una breve dissolvenza. Così tutti e 13
gli atenei compaiono anche su uno schermo da 320 px.

Il velo dietro al marchio riprende esattamente lo stesso sfondo della scena e lo
sfuma con una maschera: i token che passano dietro spariscono prima di toccare
la scritta, e il velo stesso resta invisibile.

## L'apertura

All'ingresso il marchio al centro di "Agorà" — una pila di cinque archi
concentrici — si apre come una porta. Gli archi compaiono piccoli al centro su
fondo scuro, uno dopo l'altro dall'interno verso l'esterno, crescono fino alla
dimensione del marchio, poi si allargano accelerando finché superano lo
schermo: il sito si vede solo attraverso il vano dell'arco più interno, che
diventa la finestra.

La geometria non è ridisegnata a occhio: è **misurata** dal logotipo originale
con precisione subpixel e riprodotta con archi di cerchio esatti — i numeri e il
metodo sono in `assets/img/brandmark.md`, il vettore in
`assets/img/brandmark.svg`.

Il velo sta già nel markup di `index.html`, non lo scrive JavaScript: copre lo
schermo dal primo disegno, quindi non c'è nessun fotogramma in cui la scena
sotto è scoperta.

Durata 2,1 s; un tocco, un tasto o uno scroll la accorciano, e la pagina torna
interattiva appena la finestra ha coperto lo schermo, senza aspettare la fine.

Senza JavaScript, o con `prefers-reduced-motion: reduce`, l'apertura non esiste
affatto: la pagina si presenta già aperta.

## Loghi

I file caricati dall'utente (`project/uploads/loghi_universita/`) sono il punto
di partenza e restano nel repo intatti. Cinque però non andavano bene, e per
tre di loro il chip era stato fatto nero per rimediare. Ora **i chip sono tutti
bianchi** e i cinque file sono stati sostituiti o corretti. Le versioni nuove
stanno accanto agli originali, non al loro posto, e `strumenti/loghi-positivi.js`
le rigenera: rilanciandolo si riottengono gli stessi byte.

### Cosa non andava, e cosa c'è ora

| logo | il problema | come è stato risolto |
| --- | --- | --- |
| **UniTo** | era il **marchio vecchio**: sigillo nero e nome in nero. Dal giugno 2022 UniTo ha un marchio nuovo — sigillo rosso, nome in grigio con «UNI» e «TO» in rosso | `Unito-nuovo.svg`, dal marchio nuovo (export Illustrator, id `LOGO_UNITO_VERTICALE`, classi dichiarate `.st0{fill:#EA0029}` e `.st1{fill:#54565A}`). Nel file d'origine metà marchio non si vedeva: il `viewBox` era largo quanto il solo sigillo e un `clipPath` tagliava allo stesso riquadro. Misurato con `getBBox`, il disegno intero è 1334,6 × 543,2 |
| **LUISS** | era **bianco** (la versione per l'header scuro del sito) e con la cornice sbagliata: `width`/`height` dicevano 176×72 mentre il `viewBox` è 348×64, così nel chip risultava piccolo | `LUISS-ufficiale.svg`: colore **blu #003A70**, quello del file ufficiale `Luiss_ML_POS_COL_RGB.png` (POS COL = positivo colore); non il nero. Il disegno è lo stesso: rese alla stessa altezza, le due sagome si sovrappongono al **90,5 %** |
| **UniGe** | uno **scudo nero pieno**: il file usa le classi `st0`/`st1`/`st2` senza dichiararle, quindi tutto cadeva sul nero di default | `Unige-colore.svg`: il logotipo resta il vettore del file, al posto del disegno monocromatico va lo **stemma a colori** nella stessa casella (x −0,1 y 3,1 · 94,7 × 117, misurata con `getBBox`). I colori sono quelli del manuale: blu UniGe **#002677**, giallo **#F4DA40**, rosso **#C8102E**, grigio **#333333** |
| **La Statale** | negativo bianco, più le ombre di un mockup Sketch che su bianco si vedevano come un alone grigio | `Unimi-positivo.svg`: 31 riempimenti da `#FFF` a `#1D1D1B`, via i due `<use fill="#000">` con filtro e il filtro esterno. Che il positivo sia scuro lo conferma il sigillo ufficiale trovato su GitHub, nero su trasparente |
| **IULM** | disco bianco con «IULM» viola dentro e «università iulm» in bianco fuori: su bianco restava solo «IULM» | `IULM-positivo.png`: la scritta fuori dal disco passa al **viola del marchio stesso** (`#312783`, letto dal file); il disco diventa trasparente e l'immagine si ritaglia sul contenuto (1488×228 invece di 1600×836), altrimenti il chip dimensionava il logo su un disco invisibile |

### Gli altri otto

Polimi, Bocconi, Cattolica, Polito, Bicocca, Sapienza, UniSR e Humanitas
**restano i file originali, senza un pixel toccato**. Portano già i propri colori
dichiarati — #102C53, #0046AD, #00325C, #822433, #008FC4 + #C72635 + #F9C940,
#007953 — e vengono dagli header dei siti degli atenei, quindi sono la versione
in uso. Due verifiche fatte su tutti e tredici:

- **cornici coerenti**: `width`/`height` contro `viewBox`, perché il difetto di
  LUISS non fosse anche altrove. Nessun altro caso.
- **classi orfane**: `Polito.svg` (`cls-1`) e `Unito.svg` (`st0`, `st1`) usano
  classi non dichiarate come UniGe. Verificato disegnando le varianti: lì il
  nero di default è **giusto** — nel logo Polito il marchio è nero, e nel vecchio
  UniTo mettere `st1` bianco spezzava il logotipo in «UNI / TO». Il difetto
  visibile era solo quello di UniGe.

Su Bicocca resta un limite: il file è un raster in scala di grigi con
ventidue tonalità di grigio da compressione, non un vettore. Non ne ho trovato
uno migliore autentico (vedi sotto).

### Perché non i file scaricati dai siti ufficiali

L'uscita di rete di questo ambiente passa da un proxy che consente **solo GitHub
e il registro npm**. `upload.wikimedia.org`, `commons.wikimedia.org`, Brandfetch
e i siti degli atenei rispondono `403`, e lo stesso vale per il recupero di
pagine tramite gli strumenti dell'assistente: la ricerca sul web funziona (ed è
da lì che vengono i colori del manuale UniGe e la notizia del marchio UniTo
nuovo), ma i file no. Quello che si è potuto scaricare viene da repository
GitHub, ed è tenuto in `assets/loghi/fonti/`:

| file | da dove | cosa è |
| --- | --- | --- |
| `fonti/unito-marchio.svg` | `eduardz1/UniTO-typst-template` | il marchio UniTo nuovo, vettoriale, con i colori dichiarati |
| `fonti/unige-stemma.png` | `barbaLab/master-thesis-template` | lo stemma UniGe a colori, 786×968, palette identica a quella del manuale |

Serviti anche come riscontro, senza finire nel sito: `Luiss_ML_POS_COL_RGB.png`
(in `gianmarchioni/Luiss_thesis_template`) per il blu LUISS, e il sigillo della
Statale a 1200 px (in `GiacomoBotti/UniMI_template_pack`) per il nero della
Statale. Di IULM, Bicocca e Cattolica non esiste nulla di autentico raggiungibile.

I tredici file in pagina pesano 433 KB, 186 KB con gzip.

## Bandiere

In scena ci sono **solo i luoghi di questi atenei**, non un campionario d'Italia:

| | |
| --- | --- |
| Milano · Lombardia | Politecnico, Bocconi, La Statale, Cattolica, Bicocca, IULM, San Raffaele, Humanitas |
| Roma · Lazio | LUISS, Sapienza |
| Torino · Piemonte | Politecnico di Torino, Università di Torino |
| Liguria | Università di Genova |

Sarebbero otto bandiere, ma sono sette: **Genova non c'è perché è la stessa
bandiera di Milano** — la croce di San Giorgio, rossa in campo bianco — e di due
copie identiche se ne tiene una. Fra le due il posto va a Milano, dove stanno
otto dei tredici atenei; per invertire la scelta basta cambiare l'`src` di quel
token. La Liguria invece resta, perché la sua bandiera non è la croce: è a bande
verticali verde, rossa e azzurra con la caravella dello stemma regionale.

Via, per lo stesso criterio, Veneto, Toscana, Emilia-Romagna, Campania, Puglia e
Sicilia con Napoli, Firenze, Bologna, Palermo, Bari e Cagliari: nessuno dei
tredici atenei sta lì.

I file restano su URL di Wikimedia Commons: non esistono raccolte locali (né su
npm né su GitHub) delle bandiere regionali e comunali italiane, e da qui non si
possono scaricare — il proxy di rete blocca Wikimedia. Se una non carica, il
token viene rimosso dal giro e le posizioni si ridistribuiscono, senza icone
rotte. Per averle in locale: mettile in `assets/bandiere/` e sostituisci gli
`src` in `index.html`.

## Accessibilità e prestazioni

- 60 fps stabili anche con CPU rallentata 6×, sia durante l'apertura sia in
  regime (mediana a 16,7 ms; 95° percentile a 16,8 ms passati i primi 300 ms).
  Un solo ciclo `requestAnimationFrame` che scrive esclusivamente `transform` e
  `opacity`, senza letture del layout.
- Resta **un fotogramma lungo** al primo disegno, speso in parsing e decodifica:
  su un telefono con CPU rallentata 6× sta fra 33 e 233 ms.
- I quattro tracciati delle orbite stanno in **un solo SVG**, senza
  `will-change`. Come quattro elementi con bordo ellittico e `will-change`
  erano quattro texture GPU grandi come lo schermo: bastava un velo sopra per
  far scendere il frame rate a 20 fps.
- L'animazione si ferma quando la scheda non è visibile.
- `prefers-reduced-motion: reduce` → scena statica, tutti i token al loro posto,
  nessuna apertura.
- Senza JavaScript la pagina resta leggibile: marchio in alto e loghi incolonnati sotto.
- Al primo caricamento arrivano **47 KB** fino al momento in cui parte
  l'apertura, sia su telefono sia su desktop: i token non ancora in scena sono
  `lazy`. Quando tutti e 20 sono passati davanti all'occhio si arriva a circa
  640 KB, di cui 558 KB di immagini — sono i loghi, non le bandiere.

I 13 file dei loghi in pagina pesano 433 KB, che con gzip diventano 186 KB: se
il server sa comprimere, vale la pena attivarlo. Gli SVG sono la parte che ci
guadagna — i due PNG (Bicocca e IULM) sono già compressi.

---

# Bundle originale (Claude Design)

`project/` e `chats/` sono l'export di Claude Design da cui è nata questa
implementazione e restano invariati come riferimento. `project/Agorà Orbite.dc.html`
è il prototipo: caricava React e ReactDOM da CDN più 69 KB di runtime, ed è la
ragione dei rallentamenti segnalati durante la progettazione.
