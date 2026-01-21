import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

interface SupabaseReservation {
  id: string
  apartment_ids: number[]
  guest_name: string
  guest_phone: string | null
  start_date: string
  end_date: string
  adults: number
  children: number | null
  cribs: number | null
  has_pets: boolean
  linen_option: string | null
  final_price: number | null
  deposit_amount: number | null
  payment_status: string | null
  payment_method: string | null
  notes: string | null
  device_id: string // Usiamo questo per collegare con l'ID del pannello
}

/**
 * Genera un UUID v4 deterministico dall'ID numerico del pannello
 */
function generateUUID(pannelloId: number): string {
  // Formato: pnl-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  const hex = pannelloId.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

/**
 * Mappa lo stato del pannello allo stato Supabase
 */
function mapStatus(stato: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'in_attesa',
    'confirmed': 'confermato',
    'completed': 'completato',
    'cancelled': 'cancellato'
  }
  return statusMap[stato] || 'in_attesa'
}

/**
 * Converte una prenotazione dal formato Pannello al formato Supabase
 */
function convertToSupabaseReservation(
  prenotazione: any,
  ospite: any
): SupabaseReservation {
  return {
    id: generateUUID(prenotazione.id),
    apartment_ids: [prenotazione.appartamentoId],
    guest_name: `${ospite.nome} ${ospite.cognome}`.trim(),
    guest_phone: ospite.telefono || null,
    start_date: new Date(prenotazione.checkIn).toISOString().split('T')[0],
    end_date: new Date(prenotazione.checkOut).toISOString().split('T')[0],
    adults: prenotazione.numAdulti || 2,
    children: prenotazione.numBambini || 0,
    cribs: prenotazione.numNeonati || 0,
    has_pets: prenotazione.animali || false,
    linen_option: prenotazione.biancheria ? 'inclusa' : null,
    final_price: prenotazione.totale || null,
    deposit_amount: prenotazione.acconto || null,
    payment_status: mapStatus(prenotazione.stato),
    payment_method: prenotazione.accontoPagato ? 'bonifico' : null,
    notes: prenotazione.richiesteSpeciali || prenotazione.noteOspite || null,
    device_id: `pannello-${prenotazione.id}` // Collegamento con ID pannello
  }
}

/**
 * API Route per sincronizzazione prenotazioni
 *
 * POST /api/sync-reservations-to-supabase
 * Body opzionale: { prenotazioneId?: number, action?: 'sync' | 'delete' | 'sync-all' }
 *
 * - Se prenotazioneId è specificato: sincronizza solo quella prenotazione
 * - Se action è 'delete': elimina la prenotazione da Supabase
 * - Se action è 'sync-all' o nessun parametro: sincronizza tutte le prenotazioni attive
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica configurazione Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[SYNC-RES] Mancano credenziali Supabase')
      return NextResponse.json(
        {
          success: false,
          error: 'Configurazione Supabase mancante. Sincronizzazione non disponibile.'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Leggi parametri dal body
    let body: { prenotazioneId?: number; action?: string } = {}
    try {
      body = await request.json()
    } catch {
      // Body vuoto, sync-all
    }

    const { prenotazioneId, action = 'sync' } = body

    console.log(`[SYNC-RES] Azione: ${action}, prenotazioneId: ${prenotazioneId || 'tutte'}`)

    // CASO 1: Elimina una singola prenotazione
    if (action === 'delete' && prenotazioneId) {
      const uuid = generateUUID(prenotazioneId)

      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', uuid)

      if (deleteError) {
        throw new Error(`Errore eliminazione: ${deleteError.message}`)
      }

      console.log(`[SYNC-RES] ✅ Eliminata prenotazione ${prenotazioneId} da Supabase`)

      return NextResponse.json({
        success: true,
        message: `Prenotazione ${prenotazioneId} eliminata da Supabase`,
        deleted: 1
      })
    }

    // CASO 2: Sincronizza una singola prenotazione
    if (prenotazioneId && action === 'sync') {
      const prenotazione = await prisma.prenotazione.findUnique({
        where: { id: prenotazioneId },
        include: { ospite: true }
      })

      if (!prenotazione) {
        return NextResponse.json(
          { success: false, error: `Prenotazione ${prenotazioneId} non trovata` },
          { status: 404 }
        )
      }

      // Non sincronizzare prenotazioni cancellate
      if (prenotazione.stato === 'cancelled') {
        // Elimina da Supabase se esiste
        const uuid = generateUUID(prenotazioneId)
        await supabase.from('reservations').delete().eq('id', uuid)

        return NextResponse.json({
          success: true,
          message: `Prenotazione ${prenotazioneId} cancellata, rimossa da Supabase`,
          synced: 0,
          deleted: 1
        })
      }

      const supabaseReservation = convertToSupabaseReservation(
        prenotazione,
        prenotazione.ospite
      )

      // Upsert: elimina se esiste e reinserisce
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', supabaseReservation.id)

      if (deleteError && !deleteError.message.includes('No rows')) {
        console.warn(`[SYNC-RES] Warning delete: ${deleteError.message}`)
      }

      const { error: insertError } = await supabase
        .from('reservations')
        .insert(supabaseReservation)

      if (insertError) {
        throw new Error(`Errore inserimento: ${insertError.message}`)
      }

      console.log(`[SYNC-RES] ✅ Sincronizzata prenotazione ${prenotazioneId}`)

      return NextResponse.json({
        success: true,
        message: `Prenotazione ${prenotazioneId} sincronizzata su Supabase`,
        synced: 1,
        reservation: {
          id: prenotazioneId,
          guest_name: supabaseReservation.guest_name,
          dates: `${supabaseReservation.start_date} - ${supabaseReservation.end_date}`
        }
      })
    }

    // CASO 3: Sincronizza tutte le prenotazioni attive
    console.log('[SYNC-RES] Inizio sincronizzazione completa...')

    // Leggi tutte le prenotazioni non cancellate
    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        stato: { notIn: ['cancelled'] },
        // Solo prenotazioni future o in corso
        checkOut: { gte: new Date() }
      },
      include: { ospite: true },
      orderBy: { checkIn: 'asc' }
    })

    if (prenotazioni.length === 0) {
      console.log('[SYNC-RES] Nessuna prenotazione attiva da sincronizzare')
      return NextResponse.json({
        success: true,
        message: 'Nessuna prenotazione attiva da sincronizzare',
        synced: 0
      })
    }

    console.log(`[SYNC-RES] Trovate ${prenotazioni.length} prenotazioni da sincronizzare`)

    // Converti tutte le prenotazioni
    const supabaseReservations = prenotazioni.map(p =>
      convertToSupabaseReservation(p, p.ospite)
    )

    // Ottieni gli ID delle prenotazioni da sincronizzare
    const idsToSync = supabaseReservations.map(r => r.id)

    // Elimina le prenotazioni esistenti con questi ID
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .in('id', idsToSync)

    if (deleteError) {
      console.warn(`[SYNC-RES] Warning bulk delete: ${deleteError.message}`)
    }

    // Inserisci tutte le prenotazioni
    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert(supabaseReservations)
      .select()

    if (insertError) {
      throw new Error(`Errore inserimento bulk: ${insertError.message}`)
    }

    const syncedCount = data?.length || supabaseReservations.length
    console.log(`[SYNC-RES] ✅ Sincronizzate ${syncedCount} prenotazioni su Supabase`)

    // Statistiche per appartamento
    const statsByApartment = supabaseReservations.reduce((acc, r) => {
      const aptId = r.apartment_ids[0]
      if (!acc[aptId]) acc[aptId] = 0
      acc[aptId]++
      return acc
    }, {} as Record<number, number>)

    return NextResponse.json({
      success: true,
      message: `Sincronizzate ${syncedCount} prenotazioni su Supabase`,
      synced: syncedCount,
      byApartment: statsByApartment,
      reservations: supabaseReservations.map(r => ({
        guest_name: r.guest_name,
        dates: `${r.start_date} - ${r.end_date}`,
        apartment: r.apartment_ids[0]
      }))
    })

  } catch (error) {
    console.error('[SYNC-RES] Errore sincronizzazione:', error)
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
