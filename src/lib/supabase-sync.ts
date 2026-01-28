/**
 * Utility per sincronizzazione diretta con Supabase (villamareblu.it)
 *
 * ARCHITETTURA:
 * - Pannello (Neon PostgreSQL) = MASTER
 * - villamareblu.it (Supabase) = SLAVE
 * - Sync UNIDIREZIONALE: Pannello → Supabase
 *
 * Questa utility evita il problema di fetch() interno con VERCEL_URL
 * chiamando Supabase direttamente.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Configurazione Supabase
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Cache del client Supabase
let supabaseClient: SupabaseClient | null = null

/**
 * Ottiene il client Supabase (singleton)
 */
function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[SYNC] Mancano credenziali Supabase (SUPABASE_URL o SUPABASE_SERVICE_KEY)')
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  }

  return supabaseClient
}

/**
 * Genera un UUID v4 deterministico dall'ID numerico del pannello
 * Formato: 00000000-0000-4000-8000-{hex12}
 * Esempio: pannelloId=25 → 00000000-0000-4000-8000-000000000019
 */
export function generateUUID(pannelloId: number): string {
  const hex = pannelloId.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

/**
 * Mappa lo stato pagamento del Pannello allo stato Supabase
 * Supabase accetta: 'paid', 'deposit', 'notPaid'
 */
function mapPaymentStatus(prenotazione: any): string {
  if (prenotazione.saldoPagato) return 'paid'
  if (prenotazione.accontoPagato) return 'deposit'
  return 'notPaid'
}

/**
 * Interfaccia prenotazione Supabase
 */
interface SupabaseReservation {
  id: string
  apartment_ids: string[]
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
  device_id: string
}

/**
 * Converte una prenotazione dal formato Pannello al formato Supabase
 * Supporta sia il vecchio schema (appartamentoId) sia il nuovo (tabella pivot appartamenti)
 */
function convertToSupabaseReservation(
  prenotazione: any,
  ospite: any
): SupabaseReservation {
  // NUOVO: usa l'array dalla tabella pivot se disponibile
  let apartmentIds: string[] = []

  if (prenotazione.appartamenti && prenotazione.appartamenti.length > 0) {
    // Nuovo schema: leggi dalla tabella pivot
    apartmentIds = prenotazione.appartamenti.map(
      (pa: any) => `appartamento-${pa.appartamentoId}`
    )
  } else if (prenotazione.appartamentoId) {
    // LEGACY: fallback al vecchio campo singolo
    apartmentIds = [`appartamento-${prenotazione.appartamentoId}`]
  }

  return {
    id: generateUUID(prenotazione.id),
    apartment_ids: apartmentIds,
    guest_name: `${ospite.nome} ${ospite.cognome}`.trim(),
    guest_phone: ospite.telefono || null,
    start_date: new Date(prenotazione.checkIn).toISOString().split('T')[0],
    end_date: new Date(prenotazione.checkOut).toISOString().split('T')[0],
    adults: prenotazione.numAdulti || 2,
    children: prenotazione.numBambini || 0,
    cribs: prenotazione.numNeonati || 0,
    has_pets: prenotazione.animali || false,
    linen_option: prenotazione.biancheria ? 'yes' : 'no',
    final_price: prenotazione.totale || null,
    deposit_amount: prenotazione.acconto || null,
    payment_status: mapPaymentStatus(prenotazione),
    // NOTA: Il constraint Supabase accetta solo 'cash' o null.
    // 'bank_transfer' e 'card' non sono permessi dal constraint esistente.
    // Per compatibilità usiamo sempre null per le prenotazioni dal pannello.
    payment_method: null,
    notes: prenotazione.richiesteSpeciali || prenotazione.noteOspite || null,
    device_id: `pannello-${prenotazione.id}`
  }
}

/**
 * Risultato operazione sync
 */
export interface SyncResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Sincronizza una prenotazione su Supabase (upsert)
 * Chiamare dopo CREATE o UPDATE di una prenotazione
 */
export async function syncReservationToSupabase(
  prenotazione: any,
  ospite: any
): Promise<SyncResult> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase non configurato',
        error: 'Credenziali Supabase mancanti'
      }
    }

    // Non sincronizzare prenotazioni cancellate
    if (prenotazione.stato === 'cancelled') {
      return deleteReservationFromSupabase(prenotazione.id)
    }

    const supabaseReservation = convertToSupabaseReservation(prenotazione, ospite)

    // Upsert: elimina se esiste e reinserisce
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', supabaseReservation.id)

    if (deleteError && !deleteError.message.includes('No rows')) {
      console.warn(`[SYNC] Warning delete esistente: ${deleteError.message}`)
    }

    const { error: insertError } = await supabase
      .from('reservations')
      .insert(supabaseReservation)

    if (insertError) {
      console.error(`[SYNC] Errore inserimento:`, insertError)
      return {
        success: false,
        message: `Errore sync prenotazione ${prenotazione.id}`,
        error: insertError.message
      }
    }

    console.log(`[SYNC] ✅ Prenotazione ${prenotazione.id} sincronizzata con villamareblu.it`)
    return {
      success: true,
      message: `Prenotazione ${prenotazione.id} sincronizzata`
    }

  } catch (error) {
    console.error(`[SYNC] Errore sync:`, error)
    return {
      success: false,
      message: `Errore sync prenotazione`,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }
  }
}

/**
 * Elimina una prenotazione da Supabase
 * Chiamare dopo DELETE di una prenotazione
 *
 * Cerca per UUID deterministico E per device_id come fallback
 * (utile per record creati prima della migrazione multi-appartamento)
 */
export async function deleteReservationFromSupabase(
  prenotazioneId: number
): Promise<SyncResult> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase non configurato',
        error: 'Credenziali Supabase mancanti'
      }
    }

    const uuid = generateUUID(prenotazioneId)
    const deviceId = `pannello-${prenotazioneId}`

    // Prima prova con UUID deterministico
    const { error: error1 } = await supabase
      .from('reservations')
      .delete()
      .eq('id', uuid)

    // Poi prova anche con device_id come fallback
    // (per record creati con UUID diversi prima della migrazione)
    const { error: error2 } = await supabase
      .from('reservations')
      .delete()
      .eq('device_id', deviceId)

    if (error1 && error2) {
      console.error(`[SYNC] Errore eliminazione:`, error1, error2)
      return {
        success: false,
        message: `Errore eliminazione prenotazione ${prenotazioneId}`,
        error: error1.message
      }
    }

    console.log(`[SYNC] ✅ Prenotazione ${prenotazioneId} rimossa da villamareblu.it`)
    return {
      success: true,
      message: `Prenotazione ${prenotazioneId} eliminata da Supabase`
    }

  } catch (error) {
    console.error(`[SYNC] Errore delete:`, error)
    return {
      success: false,
      message: `Errore eliminazione prenotazione`,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }
  }
}
