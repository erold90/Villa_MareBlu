import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncReservationToSupabase } from '@/lib/supabase-sync'
import { calcolaPrezzoMultiAppartamenti } from '@/lib/calcola-prezzo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const checkInDate = new Date(body.checkIn)
    const checkOutDate = new Date(body.checkOut)

    // Verifica sovrapposizione per ogni appartamento selezionato
    // IMPORTANTE: check-out può coincidere con check-in (stesso giorno turnover)
    // Controlla sia la vecchia relazione (appartamentoId) sia la nuova (pivot)
    const conflitti = []

    for (const appartamentoId of body.appartamentiIds) {
      // Controlla prenotazioni con vecchio schema (appartamentoId diretto)
      const prenotazioniDirette = await prisma.prenotazione.findMany({
        where: {
          appartamentoId: appartamentoId,
          stato: { notIn: ['cancelled'] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
        include: {
          ospite: true,
          appartamento: true,
        },
      })

      // Controlla prenotazioni con nuovo schema (tabella pivot)
      const prenotazioniPivot = await prisma.prenotazione.findMany({
        where: {
          stato: { notIn: ['cancelled'] },
          appartamenti: {
            some: { appartamentoId: appartamentoId }
          },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
        include: {
          ospite: true,
          appartamenti: {
            include: { appartamento: true }
          },
        },
      })

      // Combina i risultati evitando duplicati
      const prenotazioniEsistenti = [...prenotazioniDirette]
      for (const pren of prenotazioniPivot) {
        if (!prenotazioniEsistenti.find(p => p.id === pren.id)) {
          prenotazioniEsistenti.push({
            ...pren,
            appartamento: pren.appartamenti.find(a => a.appartamentoId === appartamentoId)?.appartamento || null,
          } as any)
        }
      }

      if (prenotazioniEsistenti.length > 0) {
        for (const pren of prenotazioniEsistenti) {
          const nomeAppartamento = pren.appartamento?.nome ||
            (pren as any).appartamenti?.find((a: any) => a.appartamentoId === appartamentoId)?.appartamento?.nome ||
            `Appartamento ${appartamentoId}`
          conflitti.push({
            appartamento: nomeAppartamento,
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
          telefono: (body.ospiteTelefono && body.ospiteTelefono.toLowerCase() !== 'da chiedere') ? body.ospiteTelefono : null,
          nazione: body.ospiteNazione || 'Italia',
        },
      })
    }

    // NUOVO: Crea UNA sola prenotazione con N appartamenti tramite tabella pivot
    // Estrai i prezzi per appartamento dal body (se forniti)
    let prezziPerAppartamento = body.prezzi?.perAppartamento || {}

    // Se non ci sono prezzi per appartamento, calcola dal database
    if (Object.keys(prezziPerAppartamento).length === 0 || Object.keys(prezziPerAppartamento).length !== body.appartamentiIds.length) {
      console.log('[API] Calcolo prezzi automatico dal database...')
      const calcoloPrezzi = await calcolaPrezzoMultiAppartamenti(
        body.appartamentiIds,
        checkInDate,
        checkOutDate
      )
      // Costruisci prezziPerAppartamento dal calcolo
      prezziPerAppartamento = {}
      for (const [id, calc] of Object.entries(calcoloPrezzi.perAppartamento)) {
        prezziPerAppartamento[parseInt(id)] = calc.prezzoTotale
      }
      console.log('[API] Prezzi calcolati:', prezziPerAppartamento, 'Totale:', calcoloPrezzi.prezzoTotale)
    }

    // Calcola prezzoSoggiorno totale (somma dei singoli appartamenti)
    let prezzoSoggiornoTotale = Object.values(prezziPerAppartamento).reduce(
      (sum: number, prezzo: any) => sum + (prezzo || 0), 0
    )

    // Se ancora zero, usa il valore dal frontend come fallback
    if (prezzoSoggiornoTotale === 0 && body.prezzi?.prezzoSoggiorno) {
      prezzoSoggiornoTotale = body.prezzi.prezzoSoggiorno
    }

    // Crea la prenotazione principale
    const prenotazione = await prisma.prenotazione.create({
      data: {
        // LEGACY: primo appartamento per retrocompatibilità
        appartamentoId: body.appartamentiIds[0],
        ospiteId: ospite.id,
        checkIn: new Date(body.checkIn),
        checkOut: new Date(body.checkOut),
        numAdulti: body.numAdulti || 2,
        numBambini: body.numBambini || 0,
        numNeonati: body.numNeonati || 0,
        animali: body.animali || false,
        animaliDettaglio: body.animaliDettaglio || null,
        biancheria: body.biancheria || false,
        bianchieriaSets: body.biancheria ? ((body.numAdulti || 0) + (body.numBambini || 0) - (body.numNeonati || 0)) : 0,
        biancheriaCosto: body.prezzi?.biancheriaCosto || 0,
        prezzoSoggiorno: prezzoSoggiornoTotale,
        prezzoExtra: body.prezzi?.extra || 0,
        tassaSoggiorno: body.prezzi?.tassaSoggiorno || 0,
        totale: body.prezzi?.totale || 0,
        acconto: body.prezzi?.acconto || 0,
        accontoPagato: body.accontoPagato || false,
        accontoCausale: body.accontoCausale || null,
        accontoDataBonifico: body.accontoDataBonifico ? new Date(body.accontoDataBonifico) : null,
        accontoNomePagante: body.accontoNomePagante || null,
        accontoRiferimento: body.accontoRiferimento || null,
        accontoData: body.accontoPagato ? new Date() : null,
        saldo: body.prezzi?.saldo || 0,
        stato: 'confirmed',
        fonte: body.fonte || 'direct',
        fonteRiferimento: body.fonteRiferimento || null,
        richiesteSpeciali: body.richiesteSpeciali || null,
        noteInterne: body.noteInterne || null,
        // NUOVO: crea i record pivot per ogni appartamento
        appartamenti: {
          create: body.appartamentiIds.map((appartamentoId: number) => ({
            appartamentoId: appartamentoId,
            // Usa il prezzo specifico se fornito, altrimenti dividi equamente
            prezzoSoggiorno: prezziPerAppartamento[appartamentoId] ||
              (prezzoSoggiornoTotale / body.appartamentiIds.length)
          }))
        }
      },
      include: {
        appartamento: true,
        appartamenti: {
          include: { appartamento: true }
        },
        ospite: true,
      },
    })

    // Sincronizza con Supabase (villamareblu.it) in background
    // La sync userà l'array di appartamenti dalla tabella pivot
    syncReservationToSupabase(prenotazione, prenotazione.ospite).catch(console.error)

    return NextResponse.json(prenotazione, { status: 201 })
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
        // LEGACY: singolo appartamento per retrocompatibilità
        appartamento: true,
        // NUOVO: tutti gli appartamenti dalla tabella pivot
        appartamenti: {
          include: { appartamento: true }
        },
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
