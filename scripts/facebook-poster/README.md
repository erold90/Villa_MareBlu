# Facebook Group Poster - Villa MareBlu

Script per pubblicare automaticamente annunci nei gruppi Facebook.

## Requisiti

- Node.js 18+
- Google Chrome installato
- Essere già loggato su Facebook in Chrome

## Installazione

```bash
cd villa-mareblu-manager/scripts/facebook-poster
npm install
```

## Configurazione

### 1. Aggiungi i gruppi Facebook

Modifica `index.js` e aggiungi i tuoi gruppi nella variabile `GRUPPI`:

```javascript
const GRUPPI = [
  { nome: "Case Vacanze Salento", url: "https://www.facebook.com/groups/123456789" },
  { nome: "Affitti Puglia Estate", url: "https://www.facebook.com/groups/987654321" },
  // ... altri gruppi
];
```

### 2. Aggiungi le foto

1. Metti le foto nella cartella `foto/`
2. Modifica `index.js` e aggiungi i nomi file nella variabile `FOTO`:

```javascript
const FOTO = [
  "vista-mare.jpg",
  "appartamento1.jpg",
  "terrazzo.jpg",
];
```

### 3. Personalizza il messaggio (opzionale)

Modifica la variabile `MESSAGGIO` in `index.js` se vuoi cambiare il testo.

## Utilizzo

### Passo 1: Avvia Chrome in modalità debug

Chiudi tutte le finestre Chrome, poi apri Terminale e esegui:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222
```

### Passo 2: Verifica login Facebook

Nella finestra Chrome che si apre, vai su facebook.com e assicurati di essere loggato.

### Passo 3: Avvia lo script

In un nuovo terminale:

```bash
cd villa-mareblu-manager/scripts/facebook-poster
npm start
```

Lo script:
1. Si connette al tuo Chrome
2. Apre ogni gruppo nella lista
3. Incolla il messaggio
4. Allega le foto
5. Pubblica
6. Aspetta 30-60 secondi
7. Passa al gruppo successivo

## Configurazione avanzata

Nel file `index.js` puoi modificare:

```javascript
const CONFIG = {
  delayMinMs: 30000,  // Minimo 30 secondi tra gruppi
  delayMaxMs: 60000,  // Massimo 60 secondi tra gruppi
  // ...
};
```

## Log

Lo script salva un log di tutte le operazioni in `log.txt`.

## Risoluzione problemi

### "Non riesco a connettermi a Chrome"
- Assicurati che Chrome sia avviato col comando corretto
- Verifica che nessun altro Chrome sia aperto

### "Non trovo il box per scrivere"
- Alcuni gruppi potrebbero avere restrizioni
- Prova manualmente per verificare se puoi postare

### "Errore upload foto"
- Verifica che le foto esistano nella cartella `foto/`
- Usa formati supportati (jpg, png)

## Note importanti

- Non abusare dello script: Facebook potrebbe limitare il tuo account
- Rispetta le regole dei gruppi
- Varia i tempi se posti frequentemente

## Sicurezza

**IMPORTANTE:** La cartella `chrome-profile/` viene creata automaticamente dallo script e contiene:
- Cookie di sessione Facebook
- Password salvate
- Cronologia di navigazione

**NON committare mai questa cartella su GitHub!** È già esclusa nel `.gitignore`.

Se hai precedentemente committato questa cartella, devi:
1. Eliminare tutti i cookie/password dal browser
2. Cambiare la password di Facebook
3. Ricreare il profilo localmente
