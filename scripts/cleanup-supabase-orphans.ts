/**
 * Script per pulire i record orfani su Supabase
 *
 * Questo script:
 * 1. Legge tutte le prenotazioni attive dal Pannello (Neon)
 * 2. Elimina da Supabase tutti i record che NON corrispondono a prenotazioni attive
 * 3. Ri-sincronizza le prenotazioni attive
 *
 * Eseguire con: npx ts-node scripts/cleanup-supabase-orphans.ts
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// Configurazione
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Mancano le variabili SUPABASE_URL e SUPABASE_SERVICE_KEY')
  console.log('Assicurati di averle nel file .env.local')
  process.exit(1)
}

const prisma = new PrismaClient()
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Genera UUID deterministico dall'ID numerico
 */
function generateUUID(pannelloId: number): string {
  const hex = pannelloId.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

async function main() {
  console.log('🔍 Inizio pulizia record orfani Supabase...\n')

  try {
    // 1. Leggi tutte le prenotazioni attive dal Pannello
    const prenotazioniPannello = await prisma.prenotazione.findMany({
      where: {
        stato: { notIn: ['cancelled'] }
      },
      include: {
        appartamenti: {
          include: { appartamento: true }
        },
        ospite: true
      }
    })

    console.log(`📋 Prenotazioni attive nel Pannello: ${prenotazioniPannello.length}`)

    // Genera gli UUID validi
    const validUUIDs = new Set(prenotazioniPannello.map(p => generateUUID(p.id)))
    const validDeviceIds = new Set(prenotazioniPannello.map(p => `pannello-${p.id}`))

    console.log(`✅ UUID validi generati: ${validUUIDs.size}`)

    // 2. Leggi tutti i record da Supabase
    const { data: supabaseRecords, error: readError } = await supabase
      .from('reservations')
      .select('id, device_id, guest_name, start_date')

    if (readError) {
      throw new Error(`Errore lettura Supabase: ${readError.message}`)
    }

    console.log(`📦 Record totali su Supabase: ${supabaseRecords?.length || 0}`)

    // 3. Identifica i record orfani (dal pannello ma non più esistenti)
    const orfani = (supabaseRecords || []).filter(r => {
      // Se è un record del pannello, verifica che esista ancora
      if (r.device_id?.startsWith('pannello-')) {
        return !validUUIDs.has(r.id) && !validDeviceIds.has(r.device_id)
      }
      // I record dal sito web (non pannello) li lasciamo stare
      return false
    })

    console.log(`🗑️  Record orfani da eliminare: ${orfani.length}`)

    if (orfani.length > 0) {
      console.log('\nRecord orfani trovati:')
      orfani.forEach(r => {
        console.log(`  - ${r.id} | ${r.guest_name} | ${r.start_date} | device: ${r.device_id}`)
      })

      // 4. Elimina i record orfani
      const orfaniIds = orfani.map(r => r.id)

      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .in('id', orfaniIds)

      if (deleteError) {
        throw new Error(`Errore eliminazione orfani: ${deleteError.message}`)
      }

      console.log(`\n✅ Eliminati ${orfani.length} record orfani`)
    }

    // 5. Ri-sincronizza le prenotazioni attive
    console.log('\n🔄 Ri-sincronizzazione prenotazioni attive...')

    let sincronizzate = 0
    let errori = 0

    for (const prenotazione of prenotazioniPannello) {
      const uuid = generateUUID(prenotazione.id)

      // Costruisci apartment_ids dal nuovo schema (tabella pivot)
      let apartmentIds: string[] = []
      if (prenotazione.appartamenti && prenotazione.appartamenti.length > 0) {
        apartmentIds = prenotazione.appartamenti.map(
          (pa: any) => `appartamento-${pa.appartamentoId}`
        )
      } else if (prenotazione.appartamentoId) {
        apartmentIds = [`appartamento-${prenotazione.appartamentoId}`]
      }

      const supabaseReservation = {
        id: uuid,
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

      // Upsert: elimina e reinserisci
      await supabase
        .from('reservations')
        .delete()
        .eq('id', uuid)

      const { error: insertError } = await supabase
        .from('reservations')
        .insert(supabaseReservation)

      if (insertError) {
        console.error(`  ❌ Errore sync prenotazione ${prenotazione.id}: ${insertError.message}`)
        errori++
      } else {
        sincronizzate++
      }
    }

    console.log(`\n📊 Risultato finale:`)
    console.log(`  ✅ Sincronizzate: ${sincronizzate}`)
    console.log(`  ❌ Errori: ${errori}`)

    // 6. Verifica finale
    const { data: finalRecords } = await supabase
      .from('reservations')
      .select('id')
      .like('device_id', 'pannello-%')

    console.log(`\n📦 Record pannello su Supabase dopo pulizia: ${finalRecords?.length || 0}`)
    console.log(`\n✅ Pulizia completata!`)

  } catch (error) {
    console.error('❌ Errore:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
