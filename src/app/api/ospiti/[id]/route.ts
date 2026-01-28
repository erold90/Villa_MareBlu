import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Ottieni dettagli ospite con prenotazioni
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ospiteId = parseInt(id)

    if (isNaN(ospiteId)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
    }

    const ospite = await prisma.ospite.findUnique({
      where: { id: ospiteId },
      include: {
        prenotazioni: {
          where: {
            stato: { notIn: ['cancelled'] },
          },
          include: {
            appartamento: true,
          },
          orderBy: { checkIn: 'desc' },
        },
      },
    })

    if (!ospite) {
      return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 })
    }

    return NextResponse.json({
      id: ospite.id,
      nome: ospite.nome,
      cognome: ospite.cognome,
      email: ospite.email,
      telefono: ospite.telefono,
      nazione: ospite.nazione,
      citta: ospite.citta,
      prenotazioni: ospite.prenotazioni.map((p) => ({
        id: p.id,
        checkIn: p.checkIn.toISOString().split('T')[0],
        checkOut: p.checkOut.toISOString().split('T')[0],
        appartamento: p.appartamento?.nome || `App ${p.appartamentoId}`,
        totale: p.totale,
        stato: p.stato,
      })),
    })
  } catch (error) {
    console.error('Errore GET ospite:', error)
    return NextResponse.json({ error: 'Errore nel recupero ospite' }, { status: 500 })
  }
}

// PUT - Modifica ospite
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ospiteId = parseInt(id)

    if (isNaN(ospiteId)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
    }

    const body = await request.json()

    // Verifica che l'ospite esista
    const ospiteEsistente = await prisma.ospite.findUnique({
      where: { id: ospiteId },
    })

    if (!ospiteEsistente) {
      return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 })
    }

    // Aggiorna l'ospite
    const ospiteAggiornato = await prisma.ospite.update({
      where: { id: ospiteId },
      data: {
        nome: body.nome || ospiteEsistente.nome,
        cognome: body.cognome || ospiteEsistente.cognome,
        email: body.email || null,
        telefono: body.telefono || null,
        nazione: body.nazione || null,
        citta: body.citta || null,
      },
    })

    return NextResponse.json({
      id: ospiteAggiornato.id,
      nome: ospiteAggiornato.nome,
      cognome: ospiteAggiornato.cognome,
      email: ospiteAggiornato.email,
      telefono: ospiteAggiornato.telefono,
      nazione: ospiteAggiornato.nazione,
      citta: ospiteAggiornato.citta,
    })
  } catch (error) {
    console.error('Errore PUT ospite:', error)
    return NextResponse.json({ error: 'Errore nella modifica ospite' }, { status: 500 })
  }
}
