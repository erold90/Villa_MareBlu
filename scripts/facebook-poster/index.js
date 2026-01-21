import puppeteer from 'puppeteer-core';
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// FUNZIONE PER AVVIARE CHROME AUTOMATICAMENTE
// ============================================
async function startChrome(config) {
  const profilePath = join(__dirname, 'chrome-profile');

  console.log('🔄 Chiusura processi Chrome esistenti...');

  // Chiudi Chrome in modo più aggressivo
  try {
    execSync('pkill -9 -f "Google Chrome"', { stdio: 'ignore' });
  } catch (e) {}

  try {
    execSync('killall "Google Chrome"', { stdio: 'ignore' });
  } catch (e) {}

  // Aspetta che i processi si chiudano completamente
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🚀 Avvio Chrome con debug port e profilo dedicato...');

  // Avvia Chrome con un profilo dedicato - questo forza una nuova istanza
  const chromeProcess = spawn(config.chromePath, [
    `--remote-debugging-port=${config.debugPort}`,
    `--user-data-dir=${profilePath}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--disable-backgrounding-occluded-windows',
  ], {
    detached: true,
    stdio: 'ignore',
    shell: false
  });

  chromeProcess.unref();

  // Aspetta che Chrome si avvii
  console.log('⏳ Attendo avvio Chrome...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verifica che la porta sia attiva
  let attempts = 0;
  while (attempts < 20) {
    try {
      const response = await fetch(`http://127.0.0.1:${config.debugPort}/json/version`);
      if (response.ok) {
        console.log('✅ Chrome avviato correttamente con debug port!\n');
        return true;
      }
    } catch (e) {
      // Riprova
    }
    attempts++;
    console.log(`   Tentativo ${attempts}/20...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Impossibile avviare Chrome con debug port. Prova a chiudere Chrome manualmente e riavviare lo script.');
}

// ============================================
// CONFIGURAZIONE
// ============================================
const CONFIG = {
  // Delay tra un gruppo e l'altro (millisecondi)
  delayMinMs: 0,  // Nessuna attesa
  delayMaxMs: 0,  // Nessuna attesa

  // Delay dopo aver cliccato pubblica
  delayAfterPostMs: 5000,

  // Delay per caricamento pagina
  pageLoadDelayMs: 3000,

  // Path Chrome su macOS
  chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

  // Porta debug Chrome
  debugPort: 9222,

  // TEST MODE: se true, non clicca "Pubblica" (mostra solo anteprima)
  testMode: false,  // DISATTIVATO - pubblica realmente

  // LIMITE GRUPPI: 0 = tutti, altrimenti limita a N gruppi (per test)
  maxGruppi: 0,  // Tutti i gruppi

  // Tempo da aspettare prima di chiudere la tab (millisecondi)
  tempoChiusuraTab: 30000,  // 30 secondi per verificare il post
};

// ============================================
// VARIANTI DEL MESSAGGIO
// ============================================
const VARIANTI = [
  {
    nome: "Estate 2026 - Completo",
    testo: `🔑 CIN: IT075060C200036553
🔑 CIN: IT075060C200072190
─
🏡 VILLA MAREBLU - Salento ☀️
Case Vacanza - Estate 2026
─
🌅 Terrazza con Vista Mare sul Mar Ionio
🏊 Mare a 150 metri - ciottoli/scoglio piano
🏖️ Sabbia a soli 3 km (Pescoluse)
─
📍 Posizione: maps.app.goo.gl/McgSNN9uzTwRan2H7
─
🏘️ 4 APPARTAMENTI INDIPENDENTI:
🛏️ 23 posti letto totali
─
🏠 Appartamento 1 | 6 posti letto
Piano terra con zona esterna privata e tettoia.
Cucina e bagno appena ristrutturati.
─
🏠 Appartamento 2 | 8 posti letto
Primo piano con terrazza vista panoramica sul mare.
─
🏠 Appartamento 3 | 4 posti letto
Primo piano con terrazza vista panoramica sul mare.
─
🏠 Appartamento 4 | 5 posti letto
Piano terra con zona esterna privata e tettoia.
Accessibile per persone disabili.
─
🌐 Preventivo: www.villamareblu.it/preventivo
─
SERVIZI INCLUSI IN TUTTI GLI APPARTAMENTI:
✅ TV + Wi-Fi gratuito
✅ Aria condizionata (Apt 2, 3, 4)
✅ Cucina attrezzata di tutto
✅ Parcheggio privato
✅ Docce esterne
✅ Lavatrice in comune
✅ Culla su richiesta
🐕 Animali ammessi (piccola taglia)
─
📍 Posizione: maps.app.goo.gl/McgSNN9uzTwRan2H7
🌐 Preventivo: www.villamareblu.it/preventivo
📱 WhatsApp: wa.me/393780038730
📞 Telefono: 378 0038730`
  },
];

// File per tracciare l'ultimo uso delle varianti
const VARIANTI_USAGE_FILE = join(__dirname, 'varianti-usage.json');

function getVariantiUsage() {
  try {
    if (existsSync(VARIANTI_USAGE_FILE)) {
      return JSON.parse(readFileSync(VARIANTI_USAGE_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveVarianteUsage(varianteIndex) {
  const usage = getVariantiUsage();
  usage[varianteIndex + 1] = new Date().toISOString();
  writeFileSync(VARIANTI_USAGE_FILE, JSON.stringify(usage, null, 2));
}

// ============================================
// FUNZIONE PER INPUT UTENTE
// ============================================
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// ============================================
// LISTA GRUPPI FACEBOOK
// Aggiungi qui i tuoi gruppi (URL completo o ID)
// ============================================
const GRUPPI = [
  { nome: "Gruppo 1", url: "https://www.facebook.com/groups/2062114480473830" },
  { nome: "Gruppo 2", url: "https://www.facebook.com/groups/131052158344505" },
  { nome: "Gruppo 3", url: "https://www.facebook.com/groups/969325366925634" },
  { nome: "Gruppo 4", url: "https://www.facebook.com/groups/560460538256511" },
  { nome: "Gruppo 5", url: "https://www.facebook.com/groups/434253113617268" },
  { nome: "Gruppo 6", url: "https://www.facebook.com/groups/169876229547705" },
  { nome: "Gruppo 7", url: "https://www.facebook.com/groups/179495865522155" },
  { nome: "Gruppo 8", url: "https://www.facebook.com/groups/842577685822268" },
  { nome: "Gruppo 9", url: "https://www.facebook.com/groups/1566825483630341" },
  { nome: "Gruppo 10", url: "https://www.facebook.com/groups/442374373460439" },
  { nome: "Gruppo 11", url: "https://www.facebook.com/groups/899267787933399" },
  { nome: "Gruppo 12", url: "https://www.facebook.com/groups/491158605641643" },
  { nome: "Gruppo 13", url: "https://www.facebook.com/groups/3522111034724961" },
  { nome: "Gruppo 14", url: "https://www.facebook.com/groups/295512240872919" },
  { nome: "Gruppo 15", url: "https://www.facebook.com/groups/casavacanzame" },
  { nome: "Gruppo 16", url: "https://www.facebook.com/groups/1887481038052452" },
  { nome: "Gruppo 17", url: "https://www.facebook.com/groups/399672800478309" },
  { nome: "Gruppo 18", url: "https://www.facebook.com/groups/112304368891767" },
  { nome: "Gruppo 19", url: "https://www.facebook.com/groups/293745481555308" },
  { nome: "Gruppo 20", url: "https://www.facebook.com/groups/affittoalmare" },
  { nome: "Gruppo 21", url: "https://www.facebook.com/groups/395610530808144" },
  { nome: "Gruppo 22", url: "https://www.facebook.com/groups/1670200513202712" },
  { nome: "Gruppo 23", url: "https://www.facebook.com/groups/1299764134280181" },
  { nome: "Gruppo 24", url: "https://www.facebook.com/groups/1152093915263140" },
  { nome: "Gruppo 25", url: "https://www.facebook.com/groups/826108152278109" },
  { nome: "Gruppo 26", url: "https://www.facebook.com/groups/985968975442042" },
  { nome: "Gruppo 27", url: "https://www.facebook.com/groups/192680504270061" },
  { nome: "Gruppo 28", url: "https://www.facebook.com/groups/1103191646527252" },
  { nome: "Gruppo 29", url: "https://www.facebook.com/groups/339991329535447" },
  { nome: "Gruppo 30", url: "https://www.facebook.com/groups/114780242355206" },
  { nome: "Gruppo 31", url: "https://www.facebook.com/groups/1554830158129382" },
  { nome: "Gruppo 32", url: "https://www.facebook.com/groups/AFFITTI.LECCE" },
  { nome: "Gruppo 33", url: "https://www.facebook.com/groups/2134862926793705" },
  { nome: "Gruppo 34", url: "https://www.facebook.com/groups/easyholidayhouse" },
  { nome: "Gruppo 35", url: "https://www.facebook.com/groups/2577418012423043" },
  { nome: "Gruppo 36", url: "https://www.facebook.com/groups/1664251847138533" },
  { nome: "Gruppo 37", url: "https://www.facebook.com/groups/674463232621101" },
  { nome: "Gruppo 38", url: "https://www.facebook.com/groups/casavacanzasalento" },
  { nome: "Gruppo 39", url: "https://www.facebook.com/groups/667232433345306" },
  { nome: "Gruppo 40", url: "https://www.facebook.com/groups/annuncicasevacanzaitalia" },
  { nome: "Gruppo 41", url: "https://www.facebook.com/groups/1409365089316547" },
  { nome: "Gruppo 42", url: "https://www.facebook.com/groups/167630883998520" },
  { nome: "Gruppo 43", url: "https://www.facebook.com/groups/1394306620893914" },
  { nome: "Gruppo 44", url: "https://www.facebook.com/groups/186819665245652" },
  { nome: "Gruppo 45", url: "https://www.facebook.com/groups/6988060047956917" },
  { nome: "Gruppo 46", url: "https://www.facebook.com/groups/ABCSALENTO" },
  { nome: "Gruppo 47", url: "https://www.facebook.com/groups/359777817859002" },
  { nome: "Gruppo 48", url: "https://www.facebook.com/groups/AffittoSalentoPuglia" },
  { nome: "Gruppo 49", url: "https://www.facebook.com/groups/1403218370105496" },
  { nome: "Gruppo 50", url: "https://www.facebook.com/groups/1445996675456499" },
  { nome: "Gruppo 51", url: "https://www.facebook.com/groups/299708490397021" },
  { nome: "Gruppo 52", url: "https://www.facebook.com/groups/202715190207146" },
  { nome: "Gruppo 53", url: "https://www.facebook.com/groups/405200543189548" },
  { nome: "Gruppo 54", url: "https://www.facebook.com/groups/1560189090920185" },
  { nome: "Gruppo 55", url: "https://www.facebook.com/groups/895799983832398" },
  { nome: "Gruppo 56", url: "https://www.facebook.com/groups/1077101336017877" },
  { nome: "Gruppo 57", url: "https://www.facebook.com/groups/993161614851969" },
  { nome: "Gruppo 58", url: "https://www.facebook.com/groups/829900607943180" },
  { nome: "Gruppo 59", url: "https://www.facebook.com/groups/1336138199828922" },
  { nome: "Gruppo 60", url: "https://www.facebook.com/groups/867148166655944" },
  { nome: "Gruppo 61", url: "https://www.facebook.com/groups/314769586101107" },
  { nome: "Gruppo 62", url: "https://www.facebook.com/groups/3236894713193499" },
  { nome: "Gruppo 63", url: "https://www.facebook.com/groups/1209326752413633" },
  { nome: "Gruppo 64", url: "https://www.facebook.com/groups/135265310450" },
  { nome: "Gruppo 65", url: "https://www.facebook.com/groups/961025239030451" },
  { nome: "Gruppo 66", url: "https://www.facebook.com/groups/bookingcasa" },
  { nome: "Gruppo 67", url: "https://www.facebook.com/groups/2447884872014509" },
  { nome: "Gruppo 68", url: "https://www.facebook.com/groups/casevacanzeintuttiregioniitaliani" },
  { nome: "Gruppo 69", url: "https://www.facebook.com/groups/casevacanze" },
  { nome: "Gruppo 70", url: "https://www.facebook.com/groups/131067240335638" },
  { nome: "Gruppo 71", url: "https://www.facebook.com/groups/gestoribeb" },
  { nome: "Gruppo 72", url: "https://www.facebook.com/groups/408049916061753" },
  { nome: "Gruppo 73", url: "https://www.facebook.com/groups/292672852732564" },
  { nome: "Gruppo 74", url: "https://www.facebook.com/groups/825302132946772" },
  { nome: "Gruppo 75", url: "https://www.facebook.com/groups/casevacanzeinsalento" },
  { nome: "Gruppo 76", url: "https://www.facebook.com/groups/167047700717510" },
  { nome: "Gruppo 77", url: "https://www.facebook.com/groups/1633979760685359" },
  { nome: "Gruppo 78", url: "https://www.facebook.com/groups/307979033087253" },
  { nome: "Gruppo 79", url: "https://www.facebook.com/groups/1278694446369710" },
  { nome: "Gruppo 80", url: "https://www.facebook.com/groups/754861388027524" },
  { nome: "Gruppo 81", url: "https://www.facebook.com/groups/2137274089830437" },
  { nome: "Gruppo 82", url: "https://www.facebook.com/groups/297026308010908" },
  { nome: "Gruppo 83", url: "https://www.facebook.com/groups/1700953606812443" },
  { nome: "Gruppo 84", url: "https://www.facebook.com/groups/6475846312504864" },
  { nome: "Gruppo 85", url: "https://www.facebook.com/groups/332425377175534" },
];

// ============================================
// FOTO DA ALLEGARE
// ============================================
const FOTO_DIR = '/Users/danielelore/Downloads/Post';
const FOTO = [
  "1.jpg",
  "2.jpg",
  "3.jpg",
  "4.jpg",
  "5.jpg",
  "6.jpg",
  "7.jpg",
  "8.png",
];

// ============================================
// FUNZIONI UTILITY
// ============================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(message) {
  const timestamp = new Date().toLocaleTimeString('it-IT');
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  // Salva anche su file
  const logFile = join(__dirname, 'log.txt');
  appendFileSync(logFile, logMessage + '\n');
}

function getPhotosPaths() {
  return FOTO.map(f => join(FOTO_DIR, f)).filter(f => existsSync(f));
}

// ============================================
// FUNZIONE PRINCIPALE
// ============================================
async function postToGroup(page, gruppo, messaggio, fotoPaths) {
  const tempoInizio = Date.now();

  try {
    log(`📂 Apertura gruppo: ${gruppo.nome}`);

    // Vai al gruppo
    await page.goto(gruppo.url, { waitUntil: 'networkidle2', timeout: 30000 });

    // STEP 1: Aspetta che la pagina sia caricata e cerca "Scrivi qualcosa..."
    log(`   ⏳ Attendo caricamento pagina...`);

    // Aspetta fino a 15 secondi che appaia "Scrivi qualcosa..."
    let trovato = false;
    let tentativi = 0;
    const maxTentativi = 15;

    while (!trovato && tentativi < maxTentativi) {
      trovato = await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent && (
            span.textContent.includes('Scrivi qualcosa') ||
            span.textContent.includes('Write something') ||
            span.textContent.includes('A cosa stai pensando')
          )) {
            return true;
          }
        }
        return false;
      });

      if (!trovato) {
        await sleep(1000);
        tentativi++;
      }
    }

    if (!trovato) {
      throw new Error('Pagina non caricata o non posso postare in questo gruppo');
    }

    log(`   ✅ Pagina caricata (${tentativi + 1}s)`);
    log(`   🔍 Cerco "Scrivi qualcosa..."...`);

    const clicked = await page.evaluate(() => {
      // Cerca tutti gli span che contengono "Scrivi qualcosa"
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent && (
          span.textContent.includes('Scrivi qualcosa') ||
          span.textContent.includes('Write something') ||
          span.textContent.includes('A cosa stai pensando')
        )) {
          // Trova il parent cliccabile
          const clickable = span.closest('div[role="button"]') || span;
          clickable.click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      throw new Error('Non trovo "Scrivi qualcosa..."');
    }

    // Aspetta che si apra il modal "Crea post"
    log(`   ⏳ Attendo apertura modal...`);
    await sleep(3000);

    // Verifica che il modal sia aperto, se no riprova
    let modalOpen = await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      return modal !== null;
    });

    if (!modalOpen) {
      log(`   ⚠️  Modal non aperto, riprovo click...`);
      // Riprova il click
      await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent && span.textContent.includes('Scrivi qualcosa')) {
            const clickable = span.closest('div[role="button"]') || span;
            clickable.click();
            return true;
          }
        }
        // Prova anche con "A cosa stai pensando" o "Write something"
        for (const span of spans) {
          if (span.textContent && (
            span.textContent.includes('A cosa stai pensando') ||
            span.textContent.includes('Write something')
          )) {
            const clickable = span.closest('div[role="button"]') || span;
            clickable.click();
            return true;
          }
        }
        return false;
      });
      await sleep(3000);

      modalOpen = await page.evaluate(() => {
        const modal = document.querySelector('div[role="dialog"]');
        return modal !== null;
      });
    }

    if (!modalOpen) {
      throw new Error('Il modal non si è aperto');
    }

    log(`   ✅ Modal aperto`);

    // Aspetta che il contenuto del modal si carichi
    await sleep(2000);

    // STEP 2: Trova l'area di testo DENTRO IL MODAL e scrivi
    log(`   ✍️  Inserimento testo...`);

    // Cerca l'area di testo con retry (il contenuto del modal potrebbe caricarsi lentamente)
    let textAreaInfo = { found: false };
    let tentativiTextArea = 0;
    const maxTentativiTextArea = 8;

    while (!textAreaInfo.found && tentativiTextArea < maxTentativiTextArea) {
      textAreaInfo = await page.evaluate(() => {
        // Cerca TUTTI i dialog e prendi quello con "Crea post" o il più grande
        const dialogs = document.querySelectorAll('div[role="dialog"]');
        let modal = null;

        for (const dialog of dialogs) {
          // Cerca il dialog che contiene "Crea post" o "Crea un post"
          if (dialog.textContent && (
            dialog.textContent.includes('Crea post') ||
            dialog.textContent.includes('Create post') ||
            dialog.textContent.includes('Pubblica')
          )) {
            modal = dialog;
            break;
          }
        }

        // Se non trovato, usa il primo dialog visibile
        if (!modal && dialogs.length > 0) {
          for (const dialog of dialogs) {
            const rect = dialog.getBoundingClientRect();
            if (rect.width > 300 && rect.height > 200) {
              modal = dialog;
              break;
            }
          }
        }

        if (!modal) return { found: false, error: 'Modal non trovato' };

        // Debug: conta elementi nel modal
        const editables = modal.querySelectorAll('div[contenteditable="true"]');
        const textboxes = modal.querySelectorAll('[role="textbox"]');
        const allInputs = modal.querySelectorAll('input, textarea');
        const paragraphs = modal.querySelectorAll('p[data-lexical-text]');

        // Prova prima con role="textbox"
        for (const el of textboxes) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el.focus();
            el.click();
            return { found: true, method: 'textbox' };
          }
        }

        // Prova con contenteditable
        for (const el of editables) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el.focus();
            el.click();
            return { found: true, method: 'contenteditable' };
          }
        }

        // Prova con data-lexical (editor moderno di Facebook)
        const lexicalEditor = modal.querySelector('[data-lexical-editor="true"]');
        if (lexicalEditor) {
          lexicalEditor.focus();
          lexicalEditor.click();
          return { found: true, method: 'lexical' };
        }

        // Prova a cliccare su qualsiasi elemento cliccabile nell'area centrale del modal
        const clickableAreas = modal.querySelectorAll('div[style*="cursor: text"], div[tabindex="0"]');
        for (const el of clickableAreas) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 30) {
            el.focus();
            el.click();
            return { found: true, method: 'clickable-area' };
          }
        }

        // Ultimo tentativo: clicca dove c'è il placeholder
        const allSpans = modal.querySelectorAll('span');
        for (const span of allSpans) {
          if (span.textContent && (
            span.textContent.includes('Crea un post') ||
            span.textContent.includes('A cosa stai pensando') ||
            span.textContent.includes('Write something')
          )) {
            span.click();
            return { found: true, method: 'placeholder-click' };
          }
        }

        return {
          found: false,
          debug: {
            dialogs: dialogs.length,
            editables: editables.length,
            textboxes: textboxes.length,
            inputs: allInputs.length
          }
        };
      });

      if (!textAreaInfo.found) {
        tentativiTextArea++;
        await sleep(1000); // Aspetta 1 secondo e riprova
      }
    }

    if (!textAreaInfo.found) {
      log(`   Debug: ${JSON.stringify(textAreaInfo.debug || {})}`);
      throw new Error('Non trovo l\'area di testo nel modal');
    }

    log(`   ✅ Area testo trovata (${textAreaInfo.method})`);
    await sleep(500);

    // Scrivi il messaggio riga per riga (unico metodo affidabile con Puppeteer)
    // Usa Shift+Enter per line break compatti, Enter normale per le righe con link (più spazio per cliccare)
    const righe = messaggio.split('\n');
    const linkPrefixes = ['📍', '🌐', '📱', '📞'];

    for (let i = 0; i < righe.length; i++) {
      if (righe[i].length > 0) {
        await page.keyboard.type(righe[i], { delay: 0 });
      }
      if (i < righe.length - 1) {
        // Usa Enter normale se la riga SUCCESSIVA inizia con emoji link (per dare spazio ai link cliccabili)
        const nextLine = righe[i + 1] || '';
        const useNormalEnter = linkPrefixes.some(prefix => nextLine.startsWith(prefix));

        if (useNormalEnter) {
          await page.keyboard.press('Enter');
        } else {
          await page.keyboard.down('Shift');
          await page.keyboard.press('Enter');
          await page.keyboard.up('Shift');
        }
      }
    }
    log(`   ✅ Testo inserito (${righe.length} righe)`);
    await sleep(1500);

    // STEP 3: Allega foto se presenti
    if (fotoPaths.length > 0) {
      log(`   📸 Caricamento ${fotoPaths.length} foto...`);

      // Cerca l'input file PRIMA di cliccare (evita apertura file dialog)
      // Facebook ha input file nascosti nella pagina
      let fileInput = await page.$('input[type="file"][multiple][accept*="image"]');

      if (!fileInput) {
        fileInput = await page.$('input[type="file"][multiple]');
      }

      if (!fileInput) {
        fileInput = await page.$('input[type="file"][accept*="image"]');
      }

      if (!fileInput) {
        fileInput = await page.$('input[type="file"]');
      }

      if (fileInput) {
        // Upload diretto senza aprire dialog
        try {
          await fileInput.uploadFile(...fotoPaths);
          log(`   ⏳ Attendo caricamento foto...`);
          await sleep(6000); // Aspetta upload
          log(`   ✅ ${fotoPaths.length} foto caricate`);
        } catch (uploadError) {
          // Se fallisce l'upload multiplo, prova una alla volta
          log(`   ℹ️  Provo upload singolo...`);
          for (let i = 0; i < fotoPaths.length; i++) {
            try {
              // Ritrova l'input
              const input = await page.$('input[type="file"]');
              if (input) {
                await input.uploadFile(fotoPaths[i]);
                log(`   📷 Foto ${i + 1}/${fotoPaths.length}`);
                await sleep(2500);
              }
            } catch (e) {
              log(`   ⚠️  Errore foto ${i + 1}: ${e.message}`);
            }
          }
        }
      } else {
        log(`   ⚠️  Non trovo input per foto`);
      }
    }

    // STEP 4: Clicca sul pulsante "Pubblica" DENTRO IL MODAL
    if (CONFIG.testMode) {
      log(`   🧪 TEST MODE: Non pubblico. Controlla il modal su Chrome!`);
      log(`   ⏳ Attendo 15 secondi per verifica manuale...`);
      await sleep(15000);
      log(`   ✅ Test completato per: ${gruppo.nome}`);
      return { success: true, tempo: '0', page };
    }

    log(`   🚀 Pubblicazione...`);
    await sleep(2000); // Aspetta che le foto siano processate

    // Cerca il pulsante Pubblica con retry
    let published = false;
    let tentativiPubblica = 0;
    const maxTentativiPubblica = 5;

    while (!published && tentativiPubblica < maxTentativiPubblica) {
      published = await page.evaluate(() => {
        // Cerca TUTTI i dialog
        const dialogs = document.querySelectorAll('div[role="dialog"]');
        let modal = null;

        for (const dialog of dialogs) {
          if (dialog.textContent && (
            dialog.textContent.includes('Crea post') ||
            dialog.textContent.includes('Pubblica')
          )) {
            modal = dialog;
            break;
          }
        }

        if (!modal && dialogs.length > 0) {
          modal = dialogs[dialogs.length - 1]; // Prendi l'ultimo
        }

        if (!modal) return false;

        // Metodo 1: Cerca div[role="button"] con testo Pubblica
        const buttons = modal.querySelectorAll('div[role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent;
          if (text === 'Pubblica' || text === 'Post') {
            const ariaDisabled = btn.getAttribute('aria-disabled');
            if (ariaDisabled !== 'true') {
              btn.click();
              return true;
            }
          }
        }

        // Metodo 2: Cerca span con testo esatto e clicca il parent
        const spans = modal.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent === 'Pubblica' || span.textContent === 'Post') {
            const btn = span.closest('div[role="button"]');
            if (btn) {
              const ariaDisabled = btn.getAttribute('aria-disabled');
              if (ariaDisabled !== 'true') {
                btn.click();
                return true;
              }
            }
          }
        }

        // Metodo 3: Cerca per aria-label
        const ariaButtons = modal.querySelectorAll('[aria-label="Pubblica"], [aria-label="Post"]');
        for (const btn of ariaButtons) {
          btn.click();
          return true;
        }

        // Metodo 4: Cerca l'ultimo bottone grande nel modal (di solito è Pubblica)
        const allButtons = Array.from(modal.querySelectorAll('div[role="button"]'));
        const bigButtons = allButtons.filter(btn => {
          const rect = btn.getBoundingClientRect();
          return rect.width > 200 && rect.height > 30;
        });

        if (bigButtons.length > 0) {
          const lastBigButton = bigButtons[bigButtons.length - 1];
          const ariaDisabled = lastBigButton.getAttribute('aria-disabled');
          if (ariaDisabled !== 'true') {
            lastBigButton.click();
            return true;
          }
        }

        return false;
      });

      if (!published) {
        tentativiPubblica++;
        await sleep(1000);
      }
    }

    if (!published) {
      throw new Error('Non trovo il pulsante Pubblica nel modal');
    }

    // Aspetta che il post venga pubblicato
    log(`   ⏳ Attendo conferma pubblicazione...`);
    await sleep(CONFIG.delayAfterPostMs);

    // Verifica che il modal si sia chiuso (indica successo)
    const modalClosed = await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      return modal === null;
    });

    const tempoTotale = ((Date.now() - tempoInizio) / 1000).toFixed(1);

    log(`   ✅ Pubblicato con successo in: ${gruppo.nome}`);
    log(`   ⏱️  Tempo totale: ${tempoTotale} secondi`);

    return { success: true, tempo: tempoTotale, page };

  } catch (error) {
    const tempoTotale = ((Date.now() - tempoInizio) / 1000).toFixed(1);
    log(`   ❌ Errore in ${gruppo.nome}: ${error.message} (dopo ${tempoTotale}s)`);
    return { success: false, tempo: tempoTotale, page };
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         FACEBOOK GROUP POSTER - Villa MareBlu             ║
╠═══════════════════════════════════════════════════════════╣
║  Questo script pubblica automaticamente nei gruppi FB     ║
║  usando il tuo profilo Chrome già loggato.                ║
╚═══════════════════════════════════════════════════════════╝
`);

  // Verifica configurazione
  if (GRUPPI.length === 0) {
    console.log('⚠️  ATTENZIONE: Nessun gruppo configurato!');
    console.log('   Modifica il file index.js e aggiungi i gruppi nella variabile GRUPPI');
    console.log('   Esempio:');
    console.log('   { nome: "Case Vacanze Salento", url: "https://www.facebook.com/groups/123456" }');
    process.exit(1);
  }

  const fotoPaths = getPhotosPaths();
  const variantiUsage = getVariantiUsage();

  // ============================================
  // MENU INTERATTIVO
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('                    📝 SCEGLI VARIANTE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  VARIANTI.forEach((v, i) => {
    const lastUsed = variantiUsage[i + 1];
    const lastUsedStr = lastUsed ? ` (ultimo uso: ${new Date(lastUsed).toLocaleDateString('it-IT')})` : ' (mai usata)';
    console.log(`  ${i + 1}. ${v.nome}${lastUsedStr}`);
  });
  console.log('');

  let varianteIndex = 0;
  if (VARIANTI.length > 1) {
    const varianteInput = await askQuestion(`Quale variante vuoi usare? [1-${VARIANTI.length}] (default: 1): `);
    varianteIndex = parseInt(varianteInput) - 1 || 0;
    if (varianteIndex < 0 || varianteIndex >= VARIANTI.length) varianteIndex = 0;
  }

  const varianteSelezionata = VARIANTI[varianteIndex];
  console.log(`\n✅ Variante selezionata: ${varianteSelezionata.nome}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('                 📍 GRUPPO DI PARTENZA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Totale gruppi disponibili: ${GRUPPI.length}`);
  console.log('');

  const gruppoInput = await askQuestion(`Da quale gruppo vuoi partire? [1-${GRUPPI.length}] (default: 1): `);
  let gruppoPartenza = parseInt(gruppoInput) - 1 || 0;
  if (gruppoPartenza < 0 || gruppoPartenza >= GRUPPI.length) gruppoPartenza = 0;

  let gruppiDaPostare = GRUPPI.slice(gruppoPartenza);

  // Applica limite gruppi se configurato (per test)
  if (CONFIG.maxGruppi > 0) {
    gruppiDaPostare = gruppiDaPostare.slice(0, CONFIG.maxGruppi);
  }
  console.log(`\n✅ Partenza dal gruppo ${gruppoPartenza + 1} (${GRUPPI[gruppoPartenza].nome})`);
  console.log(`   Gruppi da elaborare: ${gruppiDaPostare.length}\n`);

  // Salva uso variante
  saveVarianteUsage(varianteIndex);

  // ============================================
  // RIEPILOGO PRE-AVVIO
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('                      📊 RIEPILOGO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📝 Variante: ${varianteSelezionata.nome}`);
  console.log(`  📋 Gruppi da postare: ${gruppiDaPostare.length} (dal ${gruppoPartenza + 1} all'${GRUPPI.length})`);
  console.log(`  📸 Foto da allegare: ${fotoPaths.length}`);
  console.log(`  ⏱️  Delay tra gruppi: ${CONFIG.delayMinMs/1000}-${CONFIG.delayMaxMs/1000} secondi`);
  if (CONFIG.testMode) {
    console.log(`  🧪 TEST MODE ATTIVO: Non verrà pubblicato nulla!`);
  }
  console.log('');

  const conferma = await askQuestion('Premi INVIO per iniziare o CTRL+C per annullare...');

  // Avvia Chrome automaticamente
  try {
    await startChrome(CONFIG);
  } catch (error) {
    console.log('❌ Errore avvio Chrome:', error.message);
    process.exit(1);
  }

  log('🚀 Avvio pubblicazione...');
  log(`📝 Variante: ${varianteSelezionata.nome}`);

  let browser;
  try {
    // Connetti a Chrome esistente
    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${CONFIG.debugPort}`,
      defaultViewport: null,
    });

    log('✅ Connesso a Chrome');

    let successi = 0;
    let errori = 0;
    const tabDaChiudere = []; // Array di {page, tempoChiusura}

    for (let i = 0; i < gruppiDaPostare.length; i++) {
      const gruppo = gruppiDaPostare[i];
      const numeroGruppoOriginale = gruppoPartenza + i + 1;

      log(`\n[${i + 1}/${gruppiDaPostare.length}] (Gruppo ${numeroGruppoOriginale}/${GRUPPI.length}) Elaborazione...`);

      // Crea una NUOVA tab per ogni gruppo
      const page = await browser.newPage();

      const risultato = await postToGroup(page, gruppo, varianteSelezionata.testo, fotoPaths);

      if (risultato.success) {
        successi++;
        // Programma chiusura tab dopo il tempo configurato
        const tempoChiusura = Date.now() + CONFIG.tempoChiusuraTab;
        tabDaChiudere.push({ page, tempoChiusura, nome: gruppo.nome });
        log(`   🕐 Tab verrà chiusa tra ${CONFIG.tempoChiusuraTab/1000}s`);
      } else {
        errori++;
        // Chiudi subito le tab con errore
        await page.close().catch(() => {});
      }

      // Controlla e chiudi le tab scadute
      const ora = Date.now();
      for (let j = tabDaChiudere.length - 1; j >= 0; j--) {
        if (ora >= tabDaChiudere[j].tempoChiusura) {
          try {
            await tabDaChiudere[j].page.close();
            log(`   🗑️  Tab chiusa: ${tabDaChiudere[j].nome}`);
          } catch (e) {
            // Tab già chiusa
          }
          tabDaChiudere.splice(j, 1);
        }
      }

      // Delay prima del prossimo gruppo (tranne l'ultimo)
      if (i < gruppiDaPostare.length - 1 && CONFIG.delayMinMs > 0) {
        const delay = randomDelay(CONFIG.delayMinMs, CONFIG.delayMaxMs);
        log(`⏳ Attesa ${Math.round(delay/1000)} secondi prima del prossimo gruppo...`);
        await sleep(delay);
      }
    }

    // Aspetta che tutte le tab rimanenti vengano chiuse
    if (tabDaChiudere.length > 0) {
      log(`\n⏳ Attendo chiusura delle ${tabDaChiudere.length} tab rimanenti...`);
      for (const tab of tabDaChiudere) {
        const tempoRimanente = tab.tempoChiusura - Date.now();
        if (tempoRimanente > 0) {
          await sleep(tempoRimanente);
        }
        try {
          await tab.page.close();
          log(`   🗑️  Tab chiusa: ${tab.nome}`);
        } catch (e) {
          // Tab già chiusa
        }
      }
    }

    // Riepilogo
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      RIEPILOGO                            ║
╠═══════════════════════════════════════════════════════════╣
║  📝 Variante: ${varianteSelezionata.nome.padEnd(41)}║
║  ✅ Pubblicati con successo: ${String(successi).padStart(3)}                         ║
║  ❌ Errori: ${String(errori).padStart(3)}                                        ║
║  📊 Gruppi elaborati: ${String(gruppiDaPostare.length).padStart(3)} (su ${String(GRUPPI.length).padStart(3)} totali)                ║
╚═══════════════════════════════════════════════════════════╝
`);

    log('🏁 Script completato!');

  } catch (error) {
    log(`❌ Errore fatale: ${error.message}`);
    console.log('');
    console.log('Assicurati che Chrome sia avviato con --remote-debugging-port=9222');
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}

// Avvia
main().catch(console.error);
