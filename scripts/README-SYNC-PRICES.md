# 🔄 Script Sincronizzazione Prezzi

Script per sincronizzare automaticamente i prezzi dal **Pannello VMB** (Neon) a **villamareblu.it** (Supabase).

## 📋 Prerequisiti

1. **Installare le dipendenze**:
   ```bash
   cd /Users/danielelore/Downloads/Villa\ MareBlu/villa-mareblu-manager
   npm install
   ```

2. **Configurare le variabili d'ambiente**:

   Il file `.env` è già configurato con le credenziali Supabase. Verifica che contenga:

   ```env
   SUPABASE_URL="https://fgeeeivbmfrwrieyzhel.supabase.co"
   SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

## 🚀 Utilizzo

### Sincronizzare anno corrente
```bash
npm run sync-prices
```

### Sincronizzare un anno specifico
```bash
npm run sync-prices 2025
```

### Sincronizzare più anni
```bash
npm run sync-prices 2025 2026
```

## 🔄 Cosa fa lo script

1. **Legge** i prezzi dal database Neon (tabella `PeriodoPrezzo`)
2. **Converte** i dati nel formato Supabase:
   - `appartamentoId` (numerico) → `apartment_id` (stringa "appartamento-X")
   - `dataInizio/dataFine` → `week_start/week_end`
   - `prezzoSettimana` → `price`
3. **Elimina** i prezzi esistenti per l'anno su Supabase
4. **Inserisce** i nuovi prezzi convertiti
5. **Verifica** che tutto sia stato sincronizzato correttamente

## 📊 Output Esempio

```
🔄 SINCRONIZZAZIONE PREZZI: Neon → Supabase
============================================================

📅 Anni da sincronizzare: 2025

📅 Sincronizzazione prezzi per anno 2025...
  🔍 Lettura prezzi da database Neon...
  ✅ Trovati 104 periodi di prezzo
  🔄 Conversione formato...
  ✅ Convertiti 104 prezzi settimanali
  🗑️  Eliminazione prezzi esistenti anno 2025 da Supabase...
  ✅ Prezzi esistenti eliminati
  📤 Inserimento nuovi prezzi su Supabase...
  ✅ Inseriti 104 prezzi su Supabase
  🔍 Verifica dati inseriti...
  📊 Riepilogo per appartamento:
     appartamento-1: 26 settimane, €400-€850
     appartamento-2: 26 settimane, €600-€1100
     appartamento-3: 26 settimane, €350-€750
     appartamento-4: 26 settimane, €375-€800

✅ Sincronizzazione anno 2025 completata con successo!

============================================================
✅ SINCRONIZZAZIONE COMPLETATA CON SUCCESSO!
============================================================

💡 I prezzi sono ora sincronizzati tra:
   • Pannello VMB (Neon): https://pannello-vmb-x9m3.vercel.app/prezzi
   • villamareblu.it (Supabase): preventivo pubblico
```

## ⚠️ Note Importanti

### Quando sincronizzare
Esegui lo script ogni volta che:
- Modifichi i prezzi nel pannello VMB
- Aggiungi nuove settimane di prezzo
- Cambi i prezzi per una stagione

### Automazione (opzionale)
Puoi automatizzare la sincronizzazione con un cron job:

```bash
# Esegui ogni giorno alle 3:00 AM
0 3 * * * cd /path/to/villa-mareblu-manager && npm run sync-prices >> logs/sync-prices.log 2>&1
```

## 🔍 Troubleshooting

### Errore: "Mancano le variabili d'ambiente"
- Verifica che il file `.env` esista nella root del progetto
- Controlla che `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` siano configurate

### Errore: "Nessun prezzo trovato per anno X"
- Verifica che i prezzi siano presenti nel pannello VMB per quell'anno
- Controlla su https://pannello-vmb-x9m3.vercel.app/prezzi

### Errore: "Errore inserimento"
- Verifica che la chiave Supabase sia corretta (deve essere `service_role`, non `anon`)
- Controlla i permessi RLS su Supabase

### I prezzi non si aggiornano nel preventivo
- Invalida la cache del browser (Ctrl+Shift+R o Cmd+Shift+R)
- La cache di `PricingService` si aggiorna automaticamente dopo 5 minuti

## 📁 File Correlati

| File | Descrizione |
|------|-------------|
| `scripts/sync-prices-to-supabase.ts` | Script di sincronizzazione |
| `.env` | Variabili d'ambiente (non committato) |
| `.env.example` | Template variabili d'ambiente |
| `prisma/schema.prisma` | Schema database Neon |

## 🔗 Link Utili

- **Pannello VMB**: https://pannello-vmb-x9m3.vercel.app/prezzi
- **villamareblu.it**: https://villamareblu.it/richiedi-preventivo
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Pannello**: https://github.com/erold90/Villa_MareBlu
- **GitHub villamareblu.it**: https://github.com/erold90/blu-mare-lingua-analisi

## 💡 Workflow Consigliato

1. Modifica i prezzi su https://pannello-vmb-x9m3.vercel.app/prezzi
2. Verifica che le modifiche siano salvate nel database
3. Esegui lo script di sincronizzazione: `npm run sync-prices 2025`
4. Verifica su villamareblu.it che i prezzi siano aggiornati
