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
      console.log(`[SYNC] ✅ Prenotazione ${prenotazioneId} sincronizzata con villamareblu.it`)
    } else {
      console.error(`[SYNC] ❌ Errore sync prenotazione ${prenotazioneId}:`, result.error)
    }
  } catch (error) {
    console.error(`[SYNC] ❌ Errore chiamata sync:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const checkInDate = new Date(body.checkIn)
    const checkOutDate = new Date(body.checkOut)

    // Verifica sovrapposizione per ogni appartamento selezionato
    // IMPORTANTE: check-out può coincidere con check-in (stesso giorno turnover)
    // Quindi: nuovoCheckIn < esistenteCheckOut AND nuovoCheckOut > esistenteCheckIn
    const conflitti = []

    for (const appartamentoId of body.appartamentiIds) {
      const prenotazioniEsistenti = await prisma.prenotazione.findMany({
        where: {
          appartamentoId: appartamentoId,
          stato: { notIn: ['cancelled'] },
          AND: [
            { checkIn: { lt: checkOutDate } },  // check-in esistente < nuovo check-out
            { checkOut: { gt: checkInDate } },   // check-out esistente > nuovo check-in
          ],
        },
        include: {
          ospite: true,
          appartamento: true,
        },
      })

      if (prenotazioniEsistenti.length > 0) {
        for (const pren of prenotazioniEsistenti) {
          conflitti.push({
            appartamento: pren.appartamento.nome,
            ospite: `${pren.ospite.cognome} ${pren.ospite.nome}`,
            checkIn: pren.checkIn.toISOString().split('T')[0],
            checkOut: pren.checkOut.toISOString().split('T')[0],
          })
        }
      }
    }

    if (conflitti.length > 0) {
      const messaggioConflitti = conflitti.map(c =>
        `${c.appartamento}: ${c.ospite} (${c.checkIn} - ${c.checkOut})`
      ).join(', ')

      return NextResponse.json(
        {
          error: `Date non disponibili! Conflitto con: ${messaggioConflitti}`,
          conflitti
        },
        { status: 409 }
      )
    }

    // Crea o trova l'ospite
    let ospite = await prisma.ospite.findFirst({
      where: {
        nome: body.ospiteNome,
        cognome: body.ospiteCognome,
      },
    })

    if (!ospite) {
      ospite = await prisma.ospite.create({
        data: {
          nome: body.ospiteNome,
          cognome: body.ospiteCognome,
          email: body.ospiteEmail || null,
          telefono: body.ospiteTelefono || null,
          nazione: body.ospiteNazione || 'Italia',
        },
      })
    }

    // Crea le prenotazioni per ogni appartamento selezionato
    const prenotazioniCreate = []

    for (const appartamentoId of body.appartamentiIds) {
      const prenotazione = await prisma.prenotazione.create({
        data: {
          appartamentoId: appartamentoId,
          ospiteId: ospite.id,
          checkIn: new Date(body.checkIn),
          checkOut: new Date(body.checkOut),
          numAdulti: body.numAdulti || 2,
          numBambini: body.numBambini || 0,
          numNeonati: body.numNeonati || 0,
          animali: body.animali || false,
          animaliDettaglio: body.animaliDettaglio || null,
          biancheria: body.biancheria || false,
          bianchieriaSets: body.biancheria ? (body.numAdulti + body.numBambini) : 0,
          biancheriaCosto: body.prezzi?.biancheriaCosto || 0,
          prezzoSoggiorno: body.prezzi?.prezzoSoggiorno || 0,
          prezzoExtra: body.prezzi?.extra || 0,
          tassaSoggiorno: body.prezzi?.tassaSoggiorno || 0,
          totale: body.prezzi?.totale || 0,
          acconto: body.prezzi?.acconto || 0,
          saldo: body.prezzi?.saldo || 0,
          stato: 'confirmed',
          fonte: body.fonte || 'direct',
          fonteRiferimento: body.fonteRiferimento || null,
          richiesteSpeciali: body.richiesteSpeciali || null,
          noteInterne: body.noteInterne || null,
        },
        include: {
          appartamento: true,
          ospite: true,
        },
      })
      prenotazioniCreate.push(prenotazione)

      // Sincronizza con Supabase (villamareblu.it) in background
      syncToSupabase(prenotazione.id, 'sync').catch(console.error)
    }

    return NextResponse.json(prenotazioniCreate, { status: 201 })
  } catch (error) {
    console.error('Errore creazione prenotazione:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della prenotazione' },
      { status: 500 }
    )
  }
}

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
