import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { generateUUID } from '@/lib/supabase-sync'

/**
 * POST /api/sync-all-reservations
 *
 * Sincronizza TUTTE le prenotazioni dal Pannello a Supabase.
 * Operazioni:
 * 1. ELIMINA tutti i record pannello esistenti su Supabase
 * 2. REINSERISCE tutte le prenotazioni attive dal Pannello
 *
 * Utile dopo migrazioni o per risolvere problemi di sync.
 */
export async function POST(request: NextRequest) {
  try {
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

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Conta i record esistenti dal pannello
    const { count: recordsBeforeCleanup } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .like('device_id', 'pannello-%')

    console.log(`[SYNC-ALL] Record pannello esistenti: ${recordsBeforeCleanup}`)

    // 2. Elimina TUTTI i record del pannello da Supabase
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .like('device_id', 'pannello-%')

    if (deleteError) {
      console.error('[SYNC-ALL] Errore eliminazione:', deleteError)
      return NextResponse.json({
        success: false,
        error: `Errore eliminazione: ${deleteError.message}`
      }, { status: 500 })
    }

    console.log('[SYNC-ALL] ✅ Record pannello eliminati da Supabase')

    // 3. Leggi tutte le prenotazioni attive dal Pannello
    // Include la nuova tabella pivot per multi-appartamento
    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        stato: { notIn: ['cancelled'] }
      },
      include: {
        appartamenti: {
          include: { appartamento: true }
        },
        appartamento: true,
        ospite: true
      }
    })

    console.log(`[SYNC-ALL] Prenotazioni attive da sincronizzare: ${prenotazioni.length}`)

    const results = {
      recordsBeforeCleanup: recordsBeforeCleanup || 0,
      prenotazioniPannello: prenotazioni.length,
      synced: 0,
      failed: 0,
      errors: [] as string[]
    }

    // 4. Inserisci tutte le prenotazioni su Supabase
    for (const prenotazione of prenotazioni) {
      // Costruisci apartment_ids dal nuovo schema (tabella pivot)
      let apartmentIds: string[] = []
      if (prenotazione.appartamenti && prenotazione.appartamenti.length > 0) {
        apartmentIds = prenotazione.appartamenti.map(
          (pa) => `appartamento-${pa.appartamentoId}`
        )
      } else if (prenotazione.appartamentoId) {
        apartmentIds = [`appartamento-${prenotazione.appartamentoId}`]
      }

      const supabaseReservation = {
        id: generateUUID(prenotazione.id),
        apartment_ids: apartmentIds,
        guest_name: `${prenotazione.ospite.nome} ${prenotazione.ospite.cognome}`.trim(),
        guest_phone: prenotazione.ospite.telefono || null,
        start_date: prenotazione.checkIn.toISOString().split('T')[0],
        end_date: prenotazione.checkOut.toISOString().split('T')[0],
        adults: prenotazione.numAdulti || 2,
        children: prenotazione.numBambini || 0,
        cribs: prenotazione.numNeonati || 0,
        has_pets: prenotazione.animali || false,
        linen_option: prenotazione.biancheria ? 'yes' : 'no',
        final_price: prenotazione.totale || null,
        deposit_amount: prenotazione.acconto || null,
        payment_status: prenotazione.saldoPagato ? 'paid' : (prenotazione.accontoPagato ? 'deposit' : 'notPaid'),
        payment_method: null,
        notes: prenotazione.richiesteSpeciali || null,
        device_id: `pannello-${prenotazione.id}`
      }

      const { error: insertError } = await supabase
        .from('reservations')
        .insert(supabaseReservation)

      if (insertError) {
        console.error(`[SYNC-ALL] Errore sync prenotazione ${prenotazione.id}:`, insertError.message)
        results.failed++
        results.errors.push(`ID ${prenotazione.id}: ${insertError.message}`)
      } else {
        results.synced++
      }
    }

    // 5. Verifica finale
    const { count: recordsAfterSync } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .like('device_id', 'pannello-%')

    console.log(`[SYNC-ALL] ✅ Sync completata: ${results.synced} sincronizzate, ${results.failed} errori`)

    return NextResponse.json({
      success: results.failed === 0,
      message: `Sincronizzazione completata: ${results.synced}/${prenotazioni.length} prenotazioni`,
      stats: {
        ...results,
        recordsAfterSync: recordsAfterSync || 0
      }
    })

  } catch (error) {
    console.error('[SYNC-ALL] Errore:', error)
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
 * Verifica lo stato della configurazione sync e conta i record
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      configured: false,
      SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NON CONFIGURATO',
      SUPABASE_SERVICE_KEY: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NON CONFIGURATO'
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Conta record pannello su Supabase
    const { count: recordsPannello } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .like('device_id', 'pannello-%')

    // Conta record totali su Supabase
    const { count: recordsTotali } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })

    // Conta prenotazioni attive nel Pannello
    const prenotazioniPannello = await prisma.prenotazione.count({
      where: { stato: { notIn: ['cancelled'] } }
    })

    return NextResponse.json({
      configured: true,
      SUPABASE_URL: `${supabaseUrl.substring(0, 30)}...`,
      counts: {
        supabaseTotal: recordsTotali || 0,
        supabasePannello: recordsPannello || 0,
        pannelloAttive: prenotazioniPannello,
        differenza: prenotazioniPannello - (recordsPannello || 0)
      }
    })
  } catch (error) {
    return NextResponse.json({
      configured: true,
      error: error instanceof Error ? error.message : 'Errore verifica'
    })
  }
}
