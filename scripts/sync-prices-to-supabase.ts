#!/usr/bin/env tsx
/**
 * Script di Sincronizzazione Prezzi
 *
 * Sincronizza i prezzi dal database Neon (pannello-vmb)
 * al database Supabase (villamareblu.it)
 *
 * USO:
 *   npm run sync-prices [anno]
 *
 * ESEMPI:
 *   npm run sync-prices           # Sincronizza anno corrente
 *   npm run sync-prices 2025      # Sincronizza anno 2025
 *   npm run sync-prices 2025 2026 # Sincronizza più anni
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// Configurazione
const prisma = new PrismaClient()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERRORE: Mancano le variabili d\'ambiente SUPABASE_URL o SUPABASE_SERVICE_KEY')
  console.error('Aggiungi al file .env:')
  console.error('SUPABASE_URL=https://xxx.supabase.co')
  console.error('SUPABASE_SERVICE_KEY=eyJhbG...')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Mapping ID appartamento: numerico → stringa
const APARTMENT_ID_MAP: Record<number, string> = {
  1: 'appartamento-1',
  2: 'appartamento-2',
  3: 'appartamento-3',
  4: 'appartamento-4'
}

interface WeeklyPrice {
  apartment_id: string
  year: number
  week_start: string
  week_end: string
  week_number: number
  price: number
}

/**
 * Converte i dati da PeriodoPrezzo (Neon) a weekly_prices (Supabase)
 */
function convertToWeeklyPrices(
  periodoPrezzi: any[]
): WeeklyPrice[] {
  const weeklyPrices: WeeklyPrice[] = []

  for (const periodo of periodoPrezzi) {
    const apartmentId = APARTMENT_ID_MAP[periodo.appartamentoId]
    if (!apartmentId) {
      console.warn(`⚠️  Appartamento ID ${periodo.appartamentoId} non riconosciuto, skip`)
      continue
    }

    const dataInizio = new Date(periodo.dataInizio)
    const dataFine = new Date(periodo.dataFine)
    const year = dataInizio.getFullYear()

    // Calcola il numero della settimana dall'inizio dell'anno
    const startOfYear = new Date(year, 0, 1)
    const daysSinceStartOfYear = Math.floor(
      (dataInizio.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    )
    const weekNumber = Math.ceil(daysSinceStartOfYear / 7) + 1

    weeklyPrices.push({
      apartment_id: apartmentId,
      year: year,
      week_start: dataInizio.toISOString().split('T')[0],
      week_end: dataFine.toISOString().split('T')[0],
      week_number: weekNumber,
      price: periodo.prezzoSettimana
    })
  }

  return weeklyPrices
}

/**
 * Sincronizza i prezzi per un anno specifico
 */
async function syncPricesForYear(year: number): Promise<void> {
  console.log(`\n📅 Sincronizzazione prezzi per anno ${year}...`)

  try {
    // 1. Leggi i prezzi da Neon
    console.log(`  🔍 Lettura prezzi da database Neon...`)
    const periodoPrezzi = await prisma.periodoPrezzo.findMany({
      where: {
        dataInizio: {
          gte: new Date(`${year}-01-01`),
        },
        dataFine: {
          lte: new Date(`${year}-12-31`),
        },
      },
      orderBy: [
        { appartamentoId: 'asc' },
        { dataInizio: 'asc' }
      ]
    })

    if (periodoPrezzi.length === 0) {
      console.log(`  ⚠️  Nessun prezzo trovato per anno ${year} nel database Neon`)
      return
    }

    console.log(`  ✅ Trovati ${periodoPrezzi.length} periodi di prezzo`)

    // 2. Converti nel formato Supabase
    console.log(`  🔄 Conversione formato...`)
    const weeklyPrices = convertToWeeklyPrices(periodoPrezzi)
    console.log(`  ✅ Convertiti ${weeklyPrices.length} prezzi settimanali`)

    // 3. Elimina i prezzi esistenti su Supabase per questo anno
    console.log(`  🗑️  Eliminazione prezzi esistenti anno ${year} da Supabase...`)
    const { error: deleteError } = await supabase
      .from('weekly_prices')
      .delete()
      .eq('year', year)

    if (deleteError) {
      throw new Error(`Errore eliminazione: ${deleteError.message}`)
    }
    console.log(`  ✅ Prezzi esistenti eliminati`)

    // 4. Inserisci i nuovi prezzi su Supabase
    console.log(`  📤 Inserimento nuovi prezzi su Supabase...`)
    const { data, error: insertError } = await supabase
      .from('weekly_prices')
      .insert(weeklyPrices)
      .select()

    if (insertError) {
      throw new Error(`Errore inserimento: ${insertError.message}`)
    }

    console.log(`  ✅ Inseriti ${data?.length || 0} prezzi su Supabase`)

    // 5. Verifica
    console.log(`  🔍 Verifica dati inseriti...`)
    const { data: verifyData, error: verifyError } = await supabase
      .from('weekly_prices')
      .select('apartment_id, year, price')
      .eq('year', year)
      .order('apartment_id', { ascending: true })
      .order('week_start', { ascending: true })

    if (!verifyError && verifyData) {
      const byApartment = verifyData.reduce((acc, item) => {
        if (!acc[item.apartment_id]) {
          acc[item.apartment_id] = { count: 0, minPrice: Infinity, maxPrice: -Infinity }
        }
        acc[item.apartment_id].count++
        acc[item.apartment_id].minPrice = Math.min(acc[item.apartment_id].minPrice, item.price)
        acc[item.apartment_id].maxPrice = Math.max(acc[item.apartment_id].maxPrice, item.price)
        return acc
      }, {} as Record<string, { count: number, minPrice: number, maxPrice: number }>)

      console.log(`  📊 Riepilogo per appartamento:`)
      for (const [aptId, stats] of Object.entries(byApartment)) {
        console.log(`     ${aptId}: ${stats.count} settimane, €${stats.minPrice}-€${stats.maxPrice}`)
      }
    }

    console.log(`\n✅ Sincronizzazione anno ${year} completata con successo!`)

  } catch (error) {
    console.error(`\n❌ ERRORE durante la sincronizzazione anno ${year}:`)
    console.error(error)
    throw error
  }
}

/**
 * Main
 */
async function main() {
  console.log('🔄 SINCRONIZZAZIONE PREZZI: Neon → Supabase')
  console.log('=' .repeat(60))

  // Leggi gli anni da sincronizzare dagli argomenti
  const args = process.argv.slice(2)
  const years = args.length > 0
    ? args.map(arg => parseInt(arg)).filter(y => !isNaN(y))
    : [new Date().getFullYear()]

  if (years.length === 0) {
    console.error('❌ Nessun anno valido specificato')
    console.log('\nUso: npm run sync-prices [anno1] [anno2] ...')
    process.exit(1)
  }

  console.log(`\n📅 Anni da sincronizzare: ${years.join(', ')}`)

  try {
    // Sincronizza ogni anno
    for (const year of years) {
      await syncPricesForYear(year)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ SINCRONIZZAZIONE COMPLETATA CON SUCCESSO!')
    console.log('=' .repeat(60))
    console.log('\n💡 I prezzi sono ora sincronizzati tra:')
    console.log('   • Pannello VMB (Neon): https://pannello-vmb-x9m3.vercel.app/prezzi')
    console.log('   • villamareblu.it (Supabase): preventivo pubblico')

  } catch (error) {
    console.error('\n❌ SINCRONIZZAZIONE FALLITA')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Esegui
main()
