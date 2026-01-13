import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

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
function convertToWeeklyPrices(periodoPrezzi: any[]): WeeklyPrice[] {
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
 * API Route per sincronizzazione automatica prezzi
 * POST /api/sync-prices-to-supabase
 * Body: { year: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica configurazione Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[SYNC] Mancano credenziali Supabase')
      return NextResponse.json(
        {
          success: false,
          error: 'Configurazione Supabase mancante. Sincronizzazione non disponibile.'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Leggi anno dal body
    const body = await request.json()
    const year = body.year || new Date().getFullYear()

    console.log(`[SYNC] Inizio sincronizzazione anno ${year}...`)

    // 1. Leggi i prezzi da Neon
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
      console.log(`[SYNC] Nessun prezzo trovato per anno ${year}`)
      return NextResponse.json({
        success: true,
        message: `Nessun prezzo da sincronizzare per anno ${year}`,
        synced: 0
      })
    }

    console.log(`[SYNC] Trovati ${periodoPrezzi.length} periodi di prezzo`)

    // 2. Converti nel formato Supabase
    const weeklyPrices = convertToWeeklyPrices(periodoPrezzi)
    console.log(`[SYNC] Convertiti ${weeklyPrices.length} prezzi settimanali`)

    // 3. Elimina i prezzi esistenti su Supabase per questo anno
    const { error: deleteError } = await supabase
      .from('weekly_prices')
      .delete()
      .eq('year', year)

    if (deleteError) {
      throw new Error(`Errore eliminazione: ${deleteError.message}`)
    }

    // 4. Inserisci i nuovi prezzi su Supabase
    const { data, error: insertError } = await supabase
      .from('weekly_prices')
      .insert(weeklyPrices)
      .select()

    if (insertError) {
      throw new Error(`Errore inserimento: ${insertError.message}`)
    }

    const syncedCount = data?.length || 0
    console.log(`[SYNC] ✅ Sincronizzati ${syncedCount} prezzi su Supabase per anno ${year}`)

    // 5. Verifica per statistiche
    const { data: verifyData } = await supabase
      .from('weekly_prices')
      .select('apartment_id, price')
      .eq('year', year)

    const stats = verifyData?.reduce((acc, item) => {
      if (!acc[item.apartment_id]) {
        acc[item.apartment_id] = { count: 0, minPrice: Infinity, maxPrice: -Infinity }
      }
      acc[item.apartment_id].count++
      acc[item.apartment_id].minPrice = Math.min(acc[item.apartment_id].minPrice, item.price)
      acc[item.apartment_id].maxPrice = Math.max(acc[item.apartment_id].maxPrice, item.price)
      return acc
    }, {} as Record<string, { count: number, minPrice: number, maxPrice: number }>)

    return NextResponse.json({
      success: true,
      message: `Sincronizzati ${syncedCount} prezzi per anno ${year}`,
      year,
      synced: syncedCount,
      stats
    })

  } catch (error) {
    console.error('[SYNC] Errore sincronizzazione:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
