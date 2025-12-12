# CLAUDE.md - Facebook Auto Poster

> Script per pubblicare automaticamente annunci nei gruppi Facebook per Villa MareBlu

**Ultimo aggiornamento:** 2025-12-12

---

## PANORAMICA

Script Node.js che utilizza Puppeteer per automatizzare la pubblicazione di annunci con foto nei gruppi Facebook. Si connette a Chrome già loggato su Facebook tramite remote debugging.

---

## FILE PRINCIPALI

```
facebook-poster/
├── index.js                      # Script principale
├── package.json                  # Dipendenze (puppeteer-core)
├── Avvia Facebook Poster.command # Eseguibile macOS (doppio click)
├── chrome-profile/               # Profilo Chrome dedicato (autogenerato)
├── log.txt                       # Log delle operazioni (autogenerato)
└── CLAUDE.md                     # Questo file
```

---

## CONFIGURAZIONE IN index.js

### CONFIG (righe ~74-96)
```javascript
const CONFIG = {
  delayMinMs: 0,           // Delay tra gruppi (ms)
  delayMaxMs: 0,           // Delay tra gruppi (ms)
  delayAfterPostMs: 5000,  // Attesa dopo click Pubblica
  pageLoadDelayMs: 3000,   // Attesa caricamento pagina
  chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  debugPort: 9222,         // Porta debug Chrome
  testMode: false,         // Se true, non clicca Pubblica
  tempoChiusuraTab: 10000, // Chiusura tab dopo pubblicazione (ms)
};
```

### MESSAGGIO (righe ~101-144)
Il testo dell'annuncio. Usa il carattere speciale `⠀` (U+2800 Braille) per le righe vuote, altrimenti Facebook le rimuove.

**NOTA:** Facebook NON supporta grassetto Unicode nei gruppi.

### GRUPPI (righe ~151-237)
Array di 85 gruppi Facebook:
```javascript
const GRUPPI = [
  { nome: "Gruppo 1", url: "https://www.facebook.com/groups/..." },
  // ...
];
```

### FOTO (righe ~240-250)
```javascript
const FOTO_DIR = '/Users/danielelore/Downloads/Post';
const FOTO = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.png"];
```

---

## COME FUNZIONA

1. **Avvia Chrome** con `--remote-debugging-port=9222` e profilo dedicato
2. **Per ogni gruppo:**
   - Apre nuova tab
   - Naviga al gruppo
   - Cerca e clicca "Scrivi qualcosa..."
   - Aspetta apertura modal "Crea post"
   - Trova area testo nel modal (textbox/contenteditable)
   - Digita il messaggio
   - Carica le foto tramite input[type="file"]
   - Clicca "Pubblica"
   - Programma chiusura tab dopo 10 secondi
3. **Gestione tab:** Le tab vengono chiuse automaticamente per non sovraccaricare Chrome

---

## PROBLEMI NOTI E SOLUZIONI

### "Non trovo il pulsante Pubblica"
- Il modal potrebbe non essere completamente caricato
- Lo script ha 5 tentativi con retry
- Verificare che le foto siano caricate prima di pubblicare

### "Non trovo l'area di testo"
- Lo script cerca in ordine: textbox, contenteditable, lexical editor
- Ha 8 tentativi con retry da 1 secondo

### Spazi/righe vuote non rispettati
- Facebook rimuove righe vuote
- Soluzione: usare carattere Braille `⠀` (U+2800) nelle righe "vuote"

### Grassetto non funziona
- Facebook non supporta caratteri Unicode bold nei post dei gruppi
- I caratteri tipo `𝗧𝗲𝘀𝘁𝗼` vengono mostrati come testo normale

### Upload foto fallisce
- Lo script prova prima upload multiplo, poi singolo come fallback
- Verifica che le foto esistano in FOTO_DIR

---

## COMANDI UTILI

```bash
# Avviare lo script
cd /Users/danielelore/Downloads/Villa\ MareBlu/villa-mareblu-manager/scripts/facebook-poster
npm start

# Oppure doppio click su:
# "Avvia Facebook Poster.command"

# Installare dipendenze (se necessario)
npm install
```

---

## TEMPO DI ESECUZIONE

- **Per gruppo:** ~35 secondi
- **85 gruppi:** ~50-60 minuti
- **Delay tra gruppi:** 0 (configurabile)

---

## MODIFICHE FREQUENTI

### Cambiare il testo dell'annuncio
Modifica la variabile `MESSAGGIO` in index.js (riga ~101)

### Aggiungere/rimuovere gruppi
Modifica l'array `GRUPPI` in index.js (riga ~151)

### Cambiare le foto
1. Metti le foto nella cartella specificata in `FOTO_DIR`
2. Aggiorna l'array `FOTO` con i nomi dei file

### Attivare modalità test (non pubblica)
```javascript
testMode: true,  // in CONFIG
```

---

## DIPENDENZE

- Node.js 18+
- puppeteer-core ^22.0.0
- Google Chrome installato
- Essere loggato su Facebook in Chrome

---

## CRONOLOGIA MODIFICHE

| Data | Modifica |
|------|----------|
| 2025-12-12 | Creazione script iniziale |
| 2025-12-12 | Fix ricerca modal e area testo |
| 2025-12-12 | Aggiunta gestione automatica tab |
| 2025-12-12 | Fix spazi con carattere Braille |
| 2025-12-12 | Rimosso grassetto Unicode (non supportato) |
| 2025-12-12 | Aggiunta vista Mar Ionio nel testo |
| 2025-12-12 | Aggiunti 85 gruppi ufficiali |
| 2025-12-12 | Creato eseguibile .command con ASCII art |
