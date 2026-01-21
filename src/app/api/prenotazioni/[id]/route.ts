import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Sincronizza una prenotazione con Supabase (villamareblu.it)
 * Chiamata in background, non blocca la risposta
 */
async function syncToSupabase(prenotazioneId: number, action: 'sync' | 'delete' = 'sync') {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/sync-reservations-to-supabase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenotazioneId, action }),
    })

    const result = await response.json()
    if (result.success) {
      console.log(`[SYNC] ✅ Prenotazione ${prenotazioneId} ${action === 'delete' ? 'rimossa da' : 'sincronizzata con'} villamareblu.it`)
    } else {
      console.error(`[SYNC] ❌ Errore sync prenotazione ${prenotazioneId}:`, result.error)
    }
  } catch (error) {
    console.error(`[SYNC] ❌ Errore chiamata sync:`, error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prenotazione = await prisma.prenotazione.findUnique({
      where: { id: parseInt(id) },
      include: {
        appartamento: true,
        ospite: true,
      },
    })

    if (!prenotazione) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json(prenotazione)
  } catch (error) {
    console.error('Errore GET prenotazione:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero della prenotazione' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Aggiorna i dati dell'ospite se forniti
    if (body.ospiteId && (body.ospiteNome || body.ospiteCognome || body.ospiteEmail || body.ospiteTelefono)) {
      await prisma.ospite.update({
        where: { id: body.ospiteId },
        data: {
          nome: body.ospiteNome,
          cognome: body.ospiteCognome,
          email: body.ospiteEmail || null,
          telefono: body.ospiteTelefono || null,
          nazione: body.ospiteNazione || 'Italia',
        },
      })
    }

    const prenotazione = await prisma.prenotazione.update({
      where: { id: parseInt(id) },
      data: {
        checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
        numAdulti: body.numAdulti,
        numBambini: body.numBambini,
        numNeonati: body.numNeonati,
        animali: body.animali,
        animaliDettaglio: body.animaliDettaglio || null,
        biancheria: body.biancheria,
        bianchieriaSets: body.bianchieriaSets,
        biancheriaCosto: body.biancheriaCosto,
        prezzoSoggiorno: body.prezzoSoggiorno,
        prezzoExtra: body.prezzoExtra,
        tassaSoggiorno: body.tassaSoggiorno,
        totale: body.totale,
        acconto: body.acconto,
        saldo: body.saldo,
        accontoPagato: body.accontoPagato,
        saldoPagato: body.saldoPagato,
        stato: body.stato,
        fonte: body.fonte,
        fonteRiferimento: body.fonteRiferimento || null,
        richiesteSpeciali: body.richiesteSpeciali || null,
        noteInterne: body.noteInterne || null,
      },
      include: {
        appartamento: true,
        ospite: true,
      },
    })

    // Sincronizza con Supabase (villamareblu.it) in background
    syncToSupabase(prenotazione.id, 'sync').catch(console.error)

    return NextResponse.json(prenotazione)
  } catch (error) {
    console.error('Errore PUT prenotazione:', error)
    return NextResponse.json(
      { error: 'Errore nella modifica della prenotazione' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prenotazioneId = parseInt(id)

    await prisma.prenotazione.delete({
      where: { id: prenotazioneId },
    })

    // Rimuovi da Supabase (villamareblu.it) in background
    syncToSupabase(prenotazioneId, 'delete').catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE prenotazione:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della prenotazione' },
      { status: 500 }
    )
  }
}
