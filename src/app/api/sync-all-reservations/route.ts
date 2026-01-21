import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncReservationToSupabase, deleteReservationFromSupabase } from '@/lib/supabase-sync'

/**
 * POST /api/sync-all-reservations
 *
 * Sincronizza TUTTE le prenotazioni dal Pannello a Supabase.
 * Utile per:
 * - Recuperare dati dopo problemi di sync
 * - Verificare che la sync funzioni
 * - Debug
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica env vars
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Credenziali Supabase non configurate',
        details: {
          SUPABASE_URL: supabaseUrl ? 'presente' : 'MANCANTE',
          SUPABASE_SERVICE_KEY: supabaseKey ? 'presente' : 'MANCANTE'
        }
      }, { status: 500 })
    }

    // Ottieni tutte le prenotazioni
    const prenotazioni = await prisma.prenotazione.findMany({
      include: {
        ospite: true,
        appartamento: true
      }
    })

    const results = {
      total: prenotazioni.length,
      synced: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Sincronizza ogni prenotazione
    for (const pren of prenotazioni) {
      try {
        // Se cancellata, elimina da Supabase
        if (pren.stato === 'cancelled') {
          const result = await deleteReservationFromSupabase(pren.id)
          if (result.success) {
            results.synced++
          } else {
            results.failed++
            results.errors.push(`ID ${pren.id}: ${result.error}`)
          }
        } else {
          // Altrimenti sincronizza
          const result = await syncReservationToSupabase(pren, pren.ospite)
          if (result.success) {
            results.synced++
          } else {
            results.failed++
            results.errors.push(`ID ${pren.id}: ${result.error}`)
          }
        }
      } catch (error) {
        results.failed++
        results.errors.push(`ID ${pren.id}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      message: `Sincronizzate ${results.synced}/${results.total} prenotazioni`,
      results
    })

  } catch (error) {
    console.error('Errore sync-all:', error)
    return NextResponse.json({
      success: false,
      error: 'Errore durante la sincronizzazione',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 })
  }
}

/**
 * GET /api/sync-all-reservations
 *
 * Verifica lo stato della configurazione sync
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  return NextResponse.json({
    configured: !!(supabaseUrl && supabaseKey),
    SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NON CONFIGURATO',
    SUPABASE_SERVICE_KEY: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NON CONFIGURATO'
  })
}
