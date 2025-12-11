import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mostraPassate = searchParams.get('passate') === 'true'
    const anno = searchParams.get('anno') ? parseInt(searchParams.get('anno')!) : null

    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    // Costruisci il filtro
    let whereClause: any = {}

    if (anno) {
      // Filtra per anno specifico (stagione estiva: giugno-settembre)
      const inizioStagione = new Date(anno, 5, 1) // 1 Giugno
      const fineStagione = new Date(anno, 9, 1) // 1 Ottobre
      whereClause = {
        checkIn: { gte: inizioStagione, lt: fineStagione },
      }
    } else if (!mostraPassate) {
      // Di default mostra solo prenotazioni future o in corso
      whereClause = {
        checkOut: { gte: oggi },
      }
    }

    const prenotazioni = await prisma.prenotazione.findMany({
      where: whereClause,
      include: {
        appartamento: true,
        ospite: true,
      },
      orderBy: { checkIn: 'desc' },
    })

    return NextResponse.json(prenotazioni)
  } catch (error) {
    console.error('Errore API Prenotazioni:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prenotazioni' },
      { status: 500 }
    )
  }
}
