/**
 * Script per aggiornare i prezzi 2026 nel database
 * Basato sull'analisi di mercato del 14/01/2026
 *
 * Esegui con: npx tsx scripts/update-prices-2026.ts
 */

import { PrismaClient } from '@prisma/client'
import { getSettimanePerAnno } from '../src/config/appartamenti'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Aggiornamento prezzi 2026 basato su analisi di mercato...\n')

  const anno = 2026
  const settimane = getSettimanePerAnno(anno)

  console.log(`📊 Totale settimane da aggiornare: ${settimane.length}\n`)

  // Elimina prezzi esistenti per il 2026
  const deleted = await prisma.periodoPrezzo.deleteMany({
    where: {
      dataInizio: {
        gte: new Date(`${anno}-01-01`),
        lt: new Date(`${anno + 1}-01-01`)
      }
    }
  })
  console.log(`🗑️  Eliminati ${deleted.count} prezzi vecchi\n`)

  // Inserisci nuovi prezzi
  let inserted = 0

  for (const settimana of settimane) {
    for (const [appartamentoId, prezzo] of Object.entries(settimana.prezzi)) {
      await prisma.periodoPrezzo.create({
        data: {
          appartamentoId: parseInt(appartamentoId),
          nome: `Settimana ${settimana.num} - ${settimana.periodo}`,
          dataInizio: new Date(settimana.inizio),
          dataFine: new Date(settimana.fine),
          prezzoSettimana: prezzo,
          prezzoNotte: Math.round(prezzo / 7),
        }
      })
      inserted++
    }
  }

  console.log(`✅ Inseriti ${inserted} nuovi prezzi nel database\n`)

  // Mostra riepilogo per periodo
  console.log('📋 RIEPILOGO PREZZI AGGIORNATI:\n')

  const periodi = ['Bassa', 'Media', 'Altissima', 'Alta']

  for (const periodo of periodi) {
    const settPeriodo = settimane.find(s => s.periodo === periodo)
    if (settPeriodo) {
      console.log(`${periodo.toUpperCase()}:`)
      console.log(`  App 1: €${settPeriodo.prezzi[1]}`)
      console.log(`  App 2: €${settPeriodo.prezzi[2]}`)
      console.log(`  App 3: €${settPeriodo.prezzi[3]}`)
      console.log(`  App 4: €${settPeriodo.prezzi[4]}`)
      console.log()
    }
  }

  // Calcola incremento revenue teorico
  const vecchiPrezzi = {
    Bassa: { 1: 400, 2: 600, 3: 350, 4: 375 },
    Media: { 1: 500, 2: 700, 3: 450, 4: 475 },
    Altissima: { 1: 850, 2: 1100, 3: 750, 4: 800 },
  }

  const nuoviPrezzi = {
    Bassa: { 1: 400, 2: 650, 3: 350, 4: 375 },
    Media: { 1: 550, 2: 750, 3: 500, 4: 525 },
    Altissima: { 1: 900, 2: 1200, 3: 850, 4: 850 },
  }

  let incrementoTotale = 0

  // Bassa: 14 settimane
  for (let i = 1; i <= 4; i++) {
    incrementoTotale += (nuoviPrezzi.Bassa[i as keyof typeof nuoviPrezzi.Bassa] -
                         vecchiPrezzi.Bassa[i as keyof typeof vecchiPrezzi.Bassa]) * 14
  }

  // Media: 5 settimane
  for (let i = 1; i <= 4; i++) {
    incrementoTotale += (nuoviPrezzi.Media[i as keyof typeof nuoviPrezzi.Media] -
                         vecchiPrezzi.Media[i as keyof typeof vecchiPrezzi.Media]) * 5
  }

  // Altissima: 3 settimane
  for (let i = 1; i <= 4; i++) {
    incrementoTotale += (nuoviPrezzi.Altissima[i as keyof typeof nuoviPrezzi.Altissima] -
                         vecchiPrezzi.Altissima[i as keyof typeof vecchiPrezzi.Altissima]) * 3
  }

  console.log('💰 IMPATTO ECONOMICO (con 100% occupancy):')
  console.log(`   Incremento annuale stimato: +€${incrementoTotale.toLocaleString()}`)
  console.log(`   Incremento per settimana: +€${Math.round(incrementoTotale / 23)}\n`)

  console.log('✅ Aggiornamento completato con successo!')
  console.log('🔍 Verifica i prezzi su: https://pannello-vmb-x9m3.vercel.app/prezzi\n')
}

main()
  .catch((e) => {
    console.error('❌ Errore durante l\'aggiornamento:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
