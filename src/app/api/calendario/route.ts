import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { appartamentiConfig } from '@/config/appartamenti'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const anno = searchParams.get('anno')
      ? parseInt(searchParams.get('anno')!)
      : new Date().getFullYear()
    const mese = searchParams.get('mese')
      ? parseInt(searchParams.get('mese')!)
      : new Date().getMonth()

    // Inizio e fine del mese con un po' di margine per prenotazioni che si sovrappongono
    const inizioMese = new Date(anno, mese, 1)
    const fineMese = new Date(anno, mese + 1, 0, 23, 59, 59)

    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        OR: [
          // Check-in nel mese
          {
            checkIn: { gte: inizioMese, lte: fineMese },
          },
          // Check-out nel mese
          {
            checkOut: { gte: inizioMese, lte: fineMese },
          },
          // Prenotazioni che coprono tutto il mese
          {
            AND: [
              { checkIn: { lte: inizioMese } },
              { checkOut: { gte: fineMese } },
            ],
          },
        ],
        stato: { notIn: ['cancelled'] },
      },
      include: {
        appartamento: true,
        ospite: true,
      },
      orderBy: { checkIn: 'asc' },
    })

    // Formatta le prenotazioni per il calendario
    const prenotazioniFormattate = prenotazioni.map((p) => ({
      id: p.id,
      appartamentoId: p.appartamentoId,
      ospite: `${p.ospite.cognome} ${p.ospite.nome}`,
      ospiteCognome: p.ospite.cognome,
      ospiteNome: p.ospite.nome,
      ospiteEmail: p.ospite.email,
      ospiteTelefono: p.ospite.telefono,
      ospiteNazione: p.ospite.nazione,
      checkIn: p.checkIn.toISOString(),
      checkOut: p.checkOut.toISOString(),
      stato: p.stato,
      numAdulti: p.numAdulti,
      numBambini: p.numBambini,
      numOspiti: p.numAdulti + p.numBambini,
      animali: p.animali,
      animaliDettaglio: p.animaliDettaglio,
      biancheria: p.biancheria,
      biancheriaCosto: p.biancheriaCosto,
      totale: p.totale,
      acconto: p.acconto,
      saldo: p.saldo,
      accontoPagato: p.accontoPagato,
      saldoPagato: p.saldoPagato,
      fonte: p.fonte,
      appartamentoNome: p.appartamento?.nome || `Appartamento ${p.appartamentoId}`,
      appartamentoColore: appartamentiConfig.find(a => a.id === p.appartamentoId)?.colore || '#3B82F6',
    }))

    return NextResponse.json(prenotazioniFormattate)
  } catch (error) {
    console.error('Errore API Calendario:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prenotazioni calendario' },
      { status: 500 }
    )
  }
}
