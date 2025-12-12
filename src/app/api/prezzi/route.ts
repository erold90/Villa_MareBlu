import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getStagioneCorrente,
  getStagioniDisponibili,
} from '@/lib/stagione'
import { getSettimanePerAnno, appartamentiConfig } from '@/config/appartamenti'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const annoRichiesto = searchParams.get('anno')
      ? parseInt(searchParams.get('anno')!)
      : getStagioneCorrente()

    const stagioniDisponibili = getStagioniDisponibili()

    // Prova a leggere dal database
    const prezziDb = await prisma.periodoPrezzo.findMany({
      where: {
        dataInizio: {
          gte: new Date(`${annoRichiesto}-01-01`),
        },
        dataFine: {
          lte: new Date(`${annoRichiesto}-12-31`),
        },
      },
      orderBy: [{ appartamentoId: 'asc' }, { dataInizio: 'asc' }],
    })

    // Se ci sono prezzi nel DB, li usiamo
    if (prezziDb.length > 0) {
      // Raggruppa per settimana
      const settimaneMap = new Map<string, {
        numero: number
        inizio: string
        fine: string
        periodo: string
        prezzi: Record<number, number>
      }>()

      prezziDb.forEach(p => {
        const key = `${p.dataInizio.toISOString().split('T')[0]}`
        if (!settimaneMap.has(key)) {
          settimaneMap.set(key, {
            numero: 0,
            inizio: p.dataInizio.toISOString().split('T')[0],
            fine: p.dataFine.toISOString().split('T')[0],
            periodo: p.nome,
            prezzi: {},
          })
        }
        const sett = settimaneMap.get(key)!
        sett.prezzi[p.appartamentoId] = p.prezzoSettimana
      })

      // Converti in array e numera
      const settimane = Array.from(settimaneMap.values())
        .sort((a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime())
        .map((s, i) => ({ ...s, numero: i + 1 }))

      return NextResponse.json({
        anno: annoRichiesto,
        stagioniDisponibili,
        fonte: 'database',
        settimane,
        appartamenti: appartamentiConfig.map(a => ({
          id: a.id,
          nome: a.nome,
          colore: a.colore,
        })),
      })
    }

    // Altrimenti leggiamo dal config
    const settimaneConfig = getSettimanePerAnno(annoRichiesto)
    const settimane = settimaneConfig.map(s => ({
      numero: s.num,
      inizio: s.inizio,
      fine: s.fine,
      periodo: s.periodo,
      prezzi: s.prezzi,
    }))

    return NextResponse.json({
      anno: annoRichiesto,
      stagioniDisponibili,
      fonte: 'config',
      settimane,
      appartamenti: appartamentiConfig.map(a => ({
        id: a.id,
        nome: a.nome,
        colore: a.colore,
      })),
    })
  } catch (error) {
    console.error('Errore GET /api/prezzi:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei prezzi' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { anno, settimane } = body

    if (!anno || !settimane || !Array.isArray(settimane)) {
      return NextResponse.json(
        { error: 'Dati mancanti: anno e settimane sono richiesti' },
        { status: 400 }
      )
    }

    // Elimina i prezzi esistenti per l'anno
    await prisma.periodoPrezzo.deleteMany({
      where: {
        dataInizio: {
          gte: new Date(`${anno}-01-01`),
        },
        dataFine: {
          lte: new Date(`${anno}-12-31`),
        },
      },
    })

    // Inserisci i nuovi prezzi
    const prezziDaInserire: Array<{
      appartamentoId: number
      nome: string
      dataInizio: Date
      dataFine: Date
      prezzoSettimana: number
      prezzoNotte: number
      minNotti: number
    }> = []

    for (const settimana of settimane) {
      for (const [appId, prezzo] of Object.entries(settimana.prezzi)) {
        prezziDaInserire.push({
          appartamentoId: parseInt(appId),
          nome: settimana.periodo,
          dataInizio: new Date(settimana.inizio),
          dataFine: new Date(settimana.fine),
          prezzoSettimana: prezzo as number,
          prezzoNotte: Math.round((prezzo as number) / 7),
          minNotti: 7,
        })
      }
    }

    await prisma.periodoPrezzo.createMany({
      data: prezziDaInserire,
    })

    return NextResponse.json({
      success: true,
      message: `Prezzi per la stagione ${anno} salvati con successo`,
      count: prezziDaInserire.length,
    })
  } catch (error) {
    console.error('Errore PUT /api/prezzi:', error)
    return NextResponse.json(
      { error: 'Errore nel salvataggio dei prezzi' },
      { status: 500 }
    )
  }
}
