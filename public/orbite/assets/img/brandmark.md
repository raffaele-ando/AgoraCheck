# Brandmark Agorà — geometria misurata

La "o" di Agorà è una pila di cinque archi concentrici: una porta. Questi
numeri non sono ricavati a occhio: sono misurati da `agora-logo.png`
(1385×512 px) decodificando il PNG e localizzando i bordi con precisione
subpixel, poi rifiniti minimizzando l'errore di rasterizzazione rispetto
all'originale.

**Sistema di riferimento** — origine nel punto in cui il cerchio che taglia le
gambe degli archi tocca la linea di base del logotipo, cioè (703, 415.948) in
pixel del PNG. x verso destra, y negativa verso l'alto. Una unità = un pixel
del PNG.

**Cerchio di taglio** delle gambe: centro (0, −164.319), raggio 164.319.
È tangente alla linea di base; il suo arco inferiore taglia le gambe di
tutti gli archi, ed è la ragione per cui le gambe sono via via più lunghe
verso il centro.

**I cinque archi** — ognuno è la corona circolare fra `Ri` e `Re` sopra il
proprio centro, e due gambe verticali sotto, il tutto intersecato col cerchio
di taglio:

| arco | centro x | centro y |     Re |     Ri | spessore |
|-----:|---------:|---------:|-------:|-------:|---------:|
|    1 |   −0.004 |  −97.725 |144.008 |136.116 |    7.892 |
|    2 |   −0.108 |  −96.286 |117.483 |109.534 |    7.949 |
|    3 |    0.187 |  −96.716 | 90.429 | 82.566 |    7.863 |
|    4 |    0.185 |  −96.026 | 65.143 | 57.311 |    7.832 |
|    5 |   −0.339 |  −94.476 | 40.294 | 32.453 |    7.841 |

Il vano dell'arco 5 è la "porta" usata dall'animazione d'ingresso
(`assets/js/intro.js`).

**Fedeltà** — rasterizzando questi tracciati e confrontandoli col PNG
originale pixel per pixel: errore medio sul canale alpha **0,9 %**, area
d'inchiostro entro **0,3 %**, 95 % dei pixel entro il 2 %. Gli scarti residui
sono linee di un pixel sui bordi, dovute alle imprecisioni del raster di
partenza (i cinque archi nell'originale non sono perfettamente concentrici né
di spessore identico: quelle differenze sono riprodotte, non corrette).

`brandmark.svg` contiene gli stessi tracciati come file autonomo; usa
`currentColor`, quindi eredita il colore del testo.
