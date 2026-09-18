# Due disegni della dashboard, uno accanto all'altro

La dashboard esiste in due versioni che leggono e scrivono **gli stessi dati**.
Cambia solo come sono presentati, così si possono confrontare sugli stessi
messaggi reali senza migrare niente e senza rischiare niente.

## Come si passa dall'una all'altra

**Il modo semplice.** In basso a sinistra c'è un pallino scuro con dentro `1` o
`2`. Cliccalo e scegli *Precedente* o *Nuovo*. La scelta resta memorizzata nel
browser.

**Il modo a prova di guasto.** Aggiungi `?ui=classic` all'indirizzo:

    https://agora.theproject.world/dashboard?ui=classic

Funziona anche se il disegno nuovo si rompe del tutto, perché la scelta viene
letta *prima* di disegnare qualunque cosa. `?ui=next` riporta al nuovo.

Se il disegno nuovo va in errore, compare comunque una schermata con il
pulsante «Torna al disegno precedente»: non serve ricordarsi il parametro.

## I file

| File | Cosa contiene |
|---|---|
| `src/pages/Dashboard.tsx` | solo il selettore: sceglie quale dei due mostrare |
| `src/pages/DashboardClassic.tsx` | **il disegno precedente, congelato.** Copia fedele del file al commit `b7e4a87`: l'unica differenza è il nome della funzione. Non va modificato |
| `src/pages/DashboardNext.tsx` | il disegno nuovo. Stessa logica dati, presentazione rivista |

Le due pagine sono caricate separatamente: si scarica solo quella che guardi.

## Cosa cambia nel disegno nuovo

1. **Griglia allineata invece del mosaico.** Le colonne CSS scorrono in
   verticale: il secondo messaggio più recente finiva in fondo alla prima
   colonna, non in cima alla seconda. L'ordine di lettura ora è quello
   cronologico, e spariscono i buchi fra colonne di altezza diversa.

2. **Niente animazione d'ingresso sulle schede.** Erano venti dissolvenze a
   ogni cambio di pagina, filtro o ricerca. Non è un riscontro, è una messa in
   scena — e non rispettava `prefers-reduced-motion`, perché era JavaScript e
   non CSS.

3. **Colori dei profili scelti, non generati.** `computeProfileColor` riduceva
   l'identificativo a un numero e usava i 24 bit grezzi come colore, senza
   controllo di luminosità né contrasto; sopra ci vanno le iniziali in bianco.
   Su dieci identificativi reali quattro erano illeggibili (`profile_marco_b`
   dava `#B4EB17`, verde lime, contrasto 1,42:1). Ora otto colori verificati:
   il peggiore è 5,44:1.

4. **I filtri restano visibili in modalità selezione.** Prima sparivano, ma
   «Tutti (86)» continua ad agire sui messaggi filtrati, e a valle c'è
   l'eliminazione irreversibile.

5. **Scheletro di caricamento invece della rotella.** Ha la forma delle schede
   vere, quindi quando i dati arrivano la pagina non salta. Si ferma da solo
   con `prefers-reduced-motion`.

6. **Gli alias passano dal rosso all'ambra.** Un possibile alias è un'ipotesi
   del sistema, non un guasto. Il rosso resta a ciò che distrugge.

## Come tornare indietro del tutto

`DashboardClassic.tsx` è autosufficiente. Per abbandonare il disegno nuovo
basta cambiare `DEFAULT_SKIN` in `src/pages/Dashboard.tsx`, oppure eliminare
`DashboardNext.tsx` e far puntare il selettore solo al precedente.
