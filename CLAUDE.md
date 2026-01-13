# CLAUDE.md - Villa MareBlu Project

> **IMPORTANTE:** Questo file deve essere aggiornato ad ogni modifica significativa del progetto. Contiene tutte le informazioni necessarie per lo sviluppo e la gestione del sistema.

**Ultimo aggiornamento:** 2025-12-13

---

## 1. PANORAMICA PROGETTO

### Obiettivo
Sistema gestionale **PRIVATO** per la gestione di Villa MareBlu:
- **Pannello Admin** - Calendario prenotazioni, anagrafica ospiti, contabilità, prezzi
- **Assistente AI** - Executive Property Manager per analisi strategiche
- **NON è un sito pubblico** - È un pannello gestionale privato per il proprietario

### Stack Tecnologico
- **Framework:** Next.js 14+ (App Router)
- **Database:** PostgreSQL su Neon (cloud)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (auto-deploy da GitHub)
- **Repository:** GitHub
- **AI Assistant:** Anthropic Claude API (claude-sonnet-4-20250514)

### Deployment & Repository
| Campo | Valore |
|-------|--------|
| **GitHub Repo** | https://github.com/erold90/Villa_MareBlu |
| **Pannello Gestionale** | https://pannello-vmb-x9m3.vercel.app/ |
| **Database** | PostgreSQL su Neon |
| **Account GitHub** | erold90 |

> **NOTA:** Il pannello usa un URL "criptico" ed è bloccato dai motori di ricerca (robots.txt + meta noindex). Non deve essere trovato pubblicamente.

---

## 2. INFORMAZIONI STRUTTURA

### Dati Generali
| Campo | Valore |
|-------|--------|
| **Nome** | Villa MareBlu |
| **Indirizzo** | *(configurare in .env.local)* |
| **Coordinate GPS** | *(configurare in .env.local)* |
| **Telefono** | *(configurare in .env.local)* |
| **Email** | *(configurare in .env.local)* |
| **WhatsApp** | *(configurare in .env.local)* |
| **Sito pubblico** | https://villamareblu.it |
| **CIS** | *(configurare in .env.local)* |
| **CIN** | *(configurare in .env.local)* |
| **Orari contatto** | Lun-Ven 09:00-18:00, Sab 09:00-13:00 |

> **NOTA SICUREZZA:** I dati personali (indirizzo, telefono, email, CIS/CIN) NON devono essere committati su GitHub. Configurarli localmente in `.env.local`.

### Social Media
- **Facebook:** https://www.facebook.com/villamareblu
- **Instagram:** https://www.instagram.com/villamareblu

### Posizione e Caratteristiche
- **Zona:** Torre Vado - Pescoluse (Maldive del Salento)
- **Vista:** Panoramica sul Mar Ionio
- **Accesso mare:** Privato, spiaggia rocciosa (scoglio piano) a 50m
- **Spiaggia sabbia:** Pescoluse a 3km (5 min auto)
- **Totale posti letto:** 23

---

## 3. APPARTAMENTI

### Appartamento 1 (6 posti)
| Campo | Valore |
|-------|--------|
| **Posti letto** | 6 |
| **Camere** | 2 (matrimoniale+castello, matrimoniale) |
| **Bagni** | 1 |
| **Piano** | Terra |
| **Vista mare** | No |
| **Outdoor** | Veranda |

### Appartamento 2 (8 posti) - IL PIÙ GRANDE
| Campo | Valore |
|-------|--------|
| **Posti letto** | 8 |
| **Camere** | 3 (matr+singolo, matr+singolo, castello) |
| **Bagni** | 1 |
| **Piano** | 1° piano |
| **Vista mare** | ✅ Sì |
| **Outdoor** | Terrazza vista mare |

### Appartamento 3 (4 posti)
| Campo | Valore |
|-------|--------|
| **Posti letto** | 4 |
| **Camere** | 1 (matrimoniale+castello) |
| **Bagni** | 1 |
| **Piano** | 2° piano |
| **Vista mare** | ✅ Sì |
| **Outdoor** | Terrazza vista mare |

### Appartamento 4 (5 posti)
| Campo | Valore |
|-------|--------|
| **Posti letto** | 5 |
| **Camere** | 2 (matrimoniale, 3 singoli) |
| **Bagni** | 1 |
| **Piano** | 2° piano |
| **Vista mare** | No |
| **Outdoor** | Veranda |

---

## 4. LISTINO PREZZI 2026 (OTTIMIZZATO - 14/01/2026)

### Prezzi Settimanali (€) - Sabato → Sabato

| Periodo | Date | App.1 | App.2 | App.3 | App.4 |
|---------|------|-------|-------|-------|-------|
| **Bassa** | 30/5 - 11/7 | €400 | €650 | €350 | €375 |
| **Media** | 11/7 - 1/8 | €550 | €750 | €500 | €525 |
| **Altissima** | 1/8 - 22/8 | €900 | €1.200 | €850 | €850 |
| **Alta** | 22/8 - 29/8 | €750 | €900 | €650 | €700 |
| **Media** | 29/8 - 12/9 | €550 | €750 | €500 | €525 |
| **Bassa** | 12/9 - 7/11 | €400 | €650 | €350 | €375 |

### Modifiche Prezzi Applicate:
1. **13/12/2025**: App 2 aumentato di €100 su tutte le stagioni (premium vista mare + 8 posti)
2. **13/12/2025**: Settimana 22-29 agosto ora è "Alta" (non più "Media-Alta")
3. **14/01/2026**: Ottimizzazione prezzi basata su analisi di mercato completa:
   - **Altissima**: App1 +€50, App2 +€100, App3 +€100, App4 +€50
   - **Media**: App1 +€50, App2 +€50, App3 +€50, App4 +€50
   - **Bassa**: App2 +€50 (altri invariati)
   - **Incremento annuale stimato**: +€2.600 (assumendo 60-70% occupancy)

### Costi Aggiuntivi (salvati nel DATABASE)
| Voce | Importo | Note |
|------|---------|------|
| Biancheria | €10/persona | Opzionale |
| Tassa di soggiorno | €1/notte/adulto | 12-70 anni |
| Cauzione | €200 | Restituita al check-out |
| Acconto | 30% | Via bonifico |

### Guadagno Potenziale Stagione 2026 (23 settimane, 4 appartamenti)
- **Revenue totale (100% occupancy)**: €48.275
- **Incremento vs prezzi precedenti**: +€2.600 (+5.7%)

---

## 5. FUNZIONALITÀ IMPLEMENTATE

### Pannello Gestionale (/pannello-vmb-x9m3.vercel.app/)
- [x] **Dashboard** - Statistiche e overview
- [x] **Calendario** - Vista mensile 4 appartamenti
- [x] **Prenotazioni** - Lista, filtri, creazione, modifica
- [x] **Ospiti** - Anagrafica completa
- [x] **Prezzi** - Gestione prezzi con salvataggio DB
- [x] **Impostazioni** - Costi extra salvati nel DB
- [x] **Pulizie** - Programmazione pulizie
- [x] **Task** - Gestione attività
- [x] **Finanze** - Overview finanziario
- [x] **Analytics** - Statistiche avanzate
- [x] **Assistente AI** - Executive Property Manager

### Sistema Prezzi
- [x] **Auto-import**: Se DB vuoto, importa automaticamente da config
- [x] **Una sola fonte**: Il DATABASE è l'unica fonte di verità
- [x] **Modifica da browser**: Pagina /prezzi per modificare e salvare
- [x] **AI legge da DB**: L'assistente legge sempre i prezzi aggiornati

### Assistente AI - Executive Property Manager
L'AI è configurato come consulente strategico INTERNO con queste capacità:

**LETTURA (automatica):**
- Prezzi dal database
- Impostazioni dal database
- Tutte le prenotazioni
- Anagrafica ospiti
- Task e pulizie

**AZIONI (con conferma utente):**
- Creare prenotazioni
- Modificare prenotazioni
- Annullare prenotazioni
- Bloccare date
- Modificare prezzi

**ANALISI STRATEGICA:**
- Verifica ciclo Sabato-Sabato
- Calcolo "giorni bruciati"
- Analisi prezzi (inflessibile in alta stagione)
- Verifica capienza ospiti
- Consiglio: 🟢 Accettare / 🟡 Negoziare / 🔴 Rifiutare
- Bozze risposte per clienti

### Sicurezza
- [x] **URL criptico**: pannello-vmb-x9m3.vercel.app
- [x] **robots.txt**: Blocca tutti i crawler
- [x] **Meta noindex**: Nessuna indicizzazione
- [ ] **Autenticazione**: NON implementata (non richiesta)

---

## 6. ARCHITETTURA TECNICA

### Flusso Prezzi
```
CONFIG FILE ──────► DATABASE ◄────── UTENTE (pagina /prezzi)
(seed iniziale)      (unica
 solo 1 volta        fonte)
                        │
                        ▼
                  ┌─────────┐
                  │   AI    │
                  │ + APIs  │
                  └─────────┘
```

### API Principali
| Endpoint | Metodi | Descrizione |
|----------|--------|-------------|
| `/api/prezzi` | GET, PUT | Gestione prezzi (auto-import se vuoto) |
| `/api/impostazioni` | GET, PUT | Costi extra e settings |
| `/api/prenotazioni` | GET, POST, PUT, DELETE | CRUD prenotazioni |
| `/api/ospiti` | GET, POST, PUT, DELETE | CRUD ospiti |
| `/api/chat` | POST | Assistente AI |
| `/api/ai-actions` | POST | Esecuzione azioni AI |
| `/api/calendario` | GET | Dati calendario |
| `/api/pulizie` | GET, POST, PUT | Gestione pulizie |

### Database (PostgreSQL su Neon)
Tabelle principali:
- `Appartamento` - Configurazione appartamenti
- `Prenotazione` - Prenotazioni con tutti i dettagli
- `Ospite` - Anagrafica ospiti
- `PeriodoPrezzo` - Prezzi per periodo/appartamento
- `Impostazione` - Chiave/valore per settings
- `Pulizia` - Programmazione pulizie
- `Task` - Attività da fare
- `BloccoCalendario` - Date bloccate

---

## 7. COMANDI UTILI

```bash
# Directory progetto
cd /Users/danielelore/Downloads/Villa\ MareBlu/villa-mareblu-manager

# Avviare il server di sviluppo
npm run dev

# Build per produzione
npm run build

# Aprire Prisma Studio (visualizzare database)
npx prisma studio

# Push schema al database
npx prisma db push

# Deploy (automatico via GitHub)
git add -A && git commit -m "messaggio" && git push origin main
```

---

## 8. CRONOLOGIA AGGIORNAMENTI

| Data | Modifica |
|------|----------|
| 2025-12-11 | Creazione progetto Next.js, database, UI base |
| 2025-12-12 | Deploy su Vercel, configurazione Neon PostgreSQL |
| 2025-12-13 | Implementata pagina Gestione Prezzi (/prezzi) |
| 2025-12-13 | Implementato salvataggio impostazioni nel database |
| 2025-12-13 | AI Assistant ora legge prezzi e impostazioni da DB |
| 2025-12-13 | AI Assistant upgrade a "Executive Property Manager" |
| 2025-12-13 | Corretta funzione modifica prezzi AI (ora salva in PeriodoPrezzo) |
| 2025-12-13 | Aumentati prezzi App 2 (+€100 tutte le stagioni) |
| 2025-12-13 | Settimana 22-29 ago ora "Alta" con transizione graduale |
| 2025-12-13 | Implementato auto-import prezzi da config a DB |
| 2025-12-13 | Cambiato dominio a pannello-vmb-x9m3.vercel.app |
| 2025-12-13 | Aggiunto robots.txt + meta noindex (blocco motori ricerca) |
| 2025-12-13 | Aggiornato CLAUDE.md con tutte le modifiche |
| 2026-01-13 | Sincronizzazione automatica prezzi Neon → Supabase |
| 2026-01-13 | Upgrade AI Assistant a Opus 4.5 (da Sonnet 4) |
| 2026-01-14 | **ANALISI DI MERCATO COMPLETA** - Torre Vado/Pescoluse |
| 2026-01-14 | **OTTIMIZZAZIONE PREZZI 2026** basata su analisi competitor |
| 2026-01-14 | Altissima: App1 +€50, App2 +€100, App3 +€100, App4 +€50 |
| 2026-01-14 | Media: tutti +€50/settimana |
| 2026-01-14 | Bassa: App2 +€50 (altri invariati) |
| 2026-01-14 | Incremento revenue annuale stimato: +€2.600 (+5.7%) |

---

## 9. NOTE IMPORTANTI

### Per modificare i prezzi:
1. Vai su https://pannello-vmb-x9m3.vercel.app/prezzi
2. Modifica i valori nelle celle
3. Clicca "Salva nel Database"
4. L'AI leggerà automaticamente i nuovi prezzi

### Per le prenotazioni:
1. Puoi chiedere all'AI di creare/modificare prenotazioni
2. L'AI proporrà l'azione con un pulsante "Conferma"
3. Clicca conferma per eseguire

### Il sito pubblico (villamareblu.it):
- È un sito separato, NON gestito da questo pannello
- I clienti usano quello per vedere la villa
- Questo pannello è SOLO per la gestione interna

---

> **RICORDA:** Questo file deve essere sempre aggiornato quando vengono apportate modifiche significative al progetto.
