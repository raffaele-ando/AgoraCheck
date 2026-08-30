# Guida alla Personalizzazione di Polimi Agorà

Questa guida ti aiuta a trovare e modificare facilmente i testi principali, il logo e altre impostazioni del tuo sito.

## 🖼️ Come Cambiare il Logo (E perché non si vedeva)

Mi hai detto di aver aggiunto il logo nella cartella `src`. In React/Vite, se un'immagine viene richiamata direttamente tramite percorso (`<img src="/logo.png" />`), deve essere inserita obbligatoriamente nella cartella `public`, non in `src`.

Puoi procedere in due modi:

**Metodo 1: Spostare il file in public (Consigliato)**
1. Crea una cartella chiamata `public` nella cartella principale del progetto (se non esiste).
2. Carica o sposta lì il tuo logo e assicurati che si chiami **esattamente** `logo.png` (`public/logo.png`).
3. In questo modo sarà visibile d'appertutto senza toccare il codice, incluso il logo dell'anteprima e la scheda del browser!

**Metodo 2: Modificare il codice se vuoi tenerlo in src**
Se preferisci tenerlo in `src` (es. `src/logo.png`), devi dire a Vite di importarlo. Per farlo, vai nel file `src/components/Logo.tsx` e modificalo così:
```typescript
import logoSrc from '../logo.png'; // Aggiungi questo import in cima

// ...

<img src={logoSrc} alt="Polimi Agorà Logo" ... />
```

### Posizioni del logo nel sito:
* **Sito Web (Navbar & Homepage)**: Gestito dal componente `src/components/Logo.tsx`.
* **Icona Scheda Browser (Favicon)**: Gestita nel file `/index.html` alla voce `<link rel="icon" type="image/png" href="/logo.png" />`
* **Anteprima Condivisione (WhatsApp, Telegram, ecc)**: Gestita nel file `/index.html` tramite `<meta property="og:image" content="/logo.png" />` e la sua variante di Twitter.

---

## 🔤 Come Cambiare il Testo nella Scheda del Browser ("Polimi Agorà")

Il nome del sito che compare nella scheda del browser (il "Title") e nella pagina delle ricerche Google, lo trovi in:
👉 **`/index.html`**

Cerca queste righe e cambia il testo contenuto:
```html
<title>Polimi Agorà</title>
<meta property="og:title" content="Polimi Agorà" />
<meta name="twitter:title" content="Polimi Agorà" />
<meta property="og:description" content="La bacheca del Politecnico di Milano." />
```

---

## 📝 Come Cambiare i Testi della Homepage (Es. "WANTED!", "invia", "Quando?", ecc...)

Tutta la veste grafica principale del foglio "Corkboard" e il modulo (form) in cui l'utente inserisce i messaggi o naviga sono racchiusi nel tema.

Li trovi qui:
👉 **`/src/components/ExtraThemes.tsx`**

Verso la fine del file, partendo da _"export function ThemeCorkboard()"_ troverai tutti i testi del modulo:

* **Titolo Principale**: Cerca la scritta `WANTED!` nel blocco HTML.
* **Campi e Placeholder**:
    * `1. Quando? (Opz.)` e il testo d'esempio in grigio chiaro `Es. Ieri alle 14:00` (è l'attributo `placeholder="..."`).
    * `2. Dove? (Opz.)` e il suo placeholder `Es. Edificio 13`.
    * `3. Chi cerchi? *` (il campo principale).
* **Pulsante Invio**: Scorri alla fine del blocco HTML dove trovi il componente `<button>`. Lì dentro vedrai i testi: `"Inviando..."`, `"Inviato!"` e `"Invia"`. 

Modificali semplicemente sovrascrivendo le stringhe tra le virgolette o tra i tag.

Esempio:
Se vuoi cambiare l'hint per il luogo e anziché "Es. Edificio 13" preferisci "Es. Bovisa, Aula B6.1", ti basterà modificare l'attributo `placeholder="Es. Bovisa, Aula B6.1"`.
