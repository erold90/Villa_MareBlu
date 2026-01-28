/**
 * Script di Migrazione: Prenotazioni Multi-Appartamento
 *
 * Questo script migra le prenotazioni esistenti dal vecchio schema (1 riga per appartamento)
 * al nuovo schema con tabella pivot (1 prenotazione = N appartamenti).
 *
 * LOGICA:
 * 1. Trova prenotazioni "duplicate" (stesso ospite, stesse date check-in/out)
 * 2. Le raggruppa in una singola prenotazione "master"
 * 3. Crea record nella tabella pivot PrenotazioneAppartamento
 * 4. Somma i prezzi dei singoli appartamenti
 * 5. Elimina le prenotazioni duplicate
 *
 * ESECUZIONE:
 * npx tsx scripts/migrate-to-multi-apartment.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface GruppoPrenotazioni {
  ospiteId: number
  checkIn: Date
  checkOut: Date
  ids: number[]
}

async function main() {
  console.log('🚀 Inizio migrazione prenotazioni multi-appartamento...\n')

  // 1. Trova tutte le prenotazioni raggruppate per ospite e date
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      appartamentoId: { not: null }, // Solo quelle con appartamentoId (vecchio schema)
    },
    include: {
      ospite: true,
      appartamento: true,
    },
    orderBy: { checkIn: 'asc' },
  })

  console.log(`📋 Trovate ${prenotazioni.length} prenotazioni totali\n`)

  // Raggruppa per ospiteId + checkIn + checkOut
  const gruppi = new Map<string, typeof prenotazioni>()

  for (const pren of prenotazioni) {
    const key = `${pren.ospiteId}-${pren.checkIn.toISOString()}-${pren.checkOut.toISOString()}`
    if (!gruppi.has(key)) {
      gruppi.set(key, [])
    }
    gruppi.get(key)!.push(pren)
  }

  console.log(`📦 Trovati ${gruppi.size} gruppi unici (ospite + date)\n`)

  // Statistiche
  let migrati = 0
  let duplicateEliminate = 0
  let pivotCreati = 0
  let errori = 0

  // 2. Processa ogni gruppo
  for (const [key, gruppoPren] of gruppi) {
    const isDuplicato = gruppoPren.length > 1
    const master = gruppoPren[0] // Prima prenotazione = master

    try {
      if (isDuplicato) {
        console.log(`\n🔄 Gruppo duplicato: ${gruppoPren.length} prenotazioni`)
        console.log(`   Ospite: ${master.ospite.cognome} ${master.ospite.nome}`)
        console.log(`   Date: ${master.checkIn.toISOString().split('T')[0]} → ${master.checkOut.toISOString().split('T')[0]}`)
        console.log(`   Appartamenti: ${gruppoPren.map(p => p.appartamento?.nome).join(', ')}`)

        // Calcola prezzo totale sommando tutti gli appartamenti
        const prezzoSoggiornoTotale = gruppoPren.reduce((sum, p) => sum + p.prezzoSoggiorno, 0)
        const totale = gruppoPren.reduce((sum, p) => sum + p.totale, 0)
        const acconto = gruppoPren.reduce((sum, p) => sum + p.acconto, 0)
        const saldo = gruppoPren.reduce((sum, p) => sum + p.saldo, 0)

        // Aggiorna la prenotazione master con i totali
        await prisma.prenotazione.update({
          where: { id: master.id },
          data: {
            prezzoSoggiorno: prezzoSoggiornoTotale,
            totale: totale,
            acconto: acconto,
            saldo: saldo,
          },
        })

        // Crea record pivot per ogni appartamento del gruppo
        for (const pren of gruppoPren) {
          await prisma.prenotazioneAppartamento.upsert({
            where: {
              prenotazioneId_appartamentoId: {
                prenotazioneId: master.id,
                appartamentoId: pren.appartamentoId!,
              },
            },
            update: {
              prezzoSoggiorno: pren.prezzoSoggiorno,
            },
            create: {
              prenotazioneId: master.id,
              appartamentoId: pren.appartamentoId!,
              prezzoSoggiorno: pren.prezzoSoggiorno,
            },
          })
          pivotCreati++
        }

        // Elimina le prenotazioni duplicate (tutte tranne la master)
        for (const pren of gruppoPren.slice(1)) {
          await prisma.prenotazione.delete({
            where: { id: pren.id },
          })
          duplicateEliminate++
          console.log(`   ❌ Eliminata prenotazione duplicata #${pren.id}`)
        }

        migrati++
        console.log(`   ✅ Migrato: prenotazione #${master.id} con ${gruppoPren.length} appartamenti`)

      } else {
        // Prenotazione singola: crea solo il record pivot
        await prisma.prenotazioneAppartamento.upsert({
          where: {
            prenotazioneId_appartamentoId: {
              prenotazioneId: master.id,
              appartamentoId: master.appartamentoId!,
            },
          },
          update: {
            prezzoSoggiorno: master.prezzoSoggiorno,
          },
          create: {
            prenotazioneId: master.id,
            appartamentoId: master.appartamentoId!,
            prezzoSoggiorno: master.prezzoSoggiorno,
          },
        })
        pivotCreati++
        migrati++
      }
    } catch (error) {
      console.error(`❌ Errore nel gruppo ${key}:`, error)
      errori++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RIEPILOGO MIGRAZIONE')
  console.log('='.repeat(60))
  console.log(`✅ Prenotazioni migrate: ${migrati}`)
  console.log(`🔗 Record pivot creati: ${pivotCreati}`)
  console.log(`🗑️  Duplicate eliminate: ${duplicateEliminate}`)
  console.log(`❌ Errori: ${errori}`)
  console.log('='.repeat(60))

  // Verifica finale
  const countPivot = await prisma.prenotazioneAppartamento.count()
  const countPrenotazioni = await prisma.prenotazione.count()
  console.log(`\n📈 Stato finale:`)
  console.log(`   Prenotazioni totali: ${countPrenotazioni}`)
  console.log(`   Record pivot totali: ${countPivot}`)
}

main()
  .catch((e) => {
    console.error('Errore fatale:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
