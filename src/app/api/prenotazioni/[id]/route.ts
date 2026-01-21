import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncReservationToSupabase, deleteReservationFromSupabase } from '@/lib/supabase-sync'

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
    // Nota: ospiteTelefono può essere stringa vuota (da chiedere), quindi controlliamo solo nome/cognome
    if (body.ospiteId && (body.ospiteNome || body.ospiteCognome)) {
      await prisma.ospite.update({
        where: { id: body.ospiteId },
        data: {
          nome: body.ospiteNome,
          cognome: body.ospiteCognome,
          email: body.ospiteEmail || null,
          telefono: body.ospiteTelefono || null, // Può essere vuoto se "Da chiedere"
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
        // Acconto
        accontoPagato: body.accontoPagato,
        accontoCausale: body.accontoCausale || null,
        accontoDataBonifico: body.accontoDataBonifico ? new Date(body.accontoDataBonifico) : null,
        accontoNomePagante: body.accontoNomePagante || null,
        accontoRiferimento: body.accontoRiferimento || null,
        accontoData: body.accontoPagato ? new Date() : null,
        // Saldo
        saldoPagato: body.saldoPagato,
        saldoCausale: body.saldoCausale || null,
        saldoDataBonifico: body.saldoDataBonifico ? new Date(body.saldoDataBonifico) : null,
        saldoNomePagante: body.saldoNomePagante || null,
        saldoRiferimento: body.saldoRiferimento || null,
        saldoData: body.saldoPagato ? new Date() : null,
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
    // Usa utility diretta invece di fetch() per evitare problemi con VERCEL_URL
    syncReservationToSupabase(prenotazione, prenotazione.ospite).catch(console.error)

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
    // Usa utility diretta invece di fetch() per evitare problemi con VERCEL_URL
    deleteReservationFromSupabase(prenotazioneId).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE prenotazione:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della prenotazione' },
      { status: 500 }
    )
  }
}
