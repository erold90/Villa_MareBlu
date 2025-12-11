import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateStagione, getStagioneCorrente } from '@/lib/stagione'

// Costanti configurazione
const GIORNI_FERMO_SUGGERIMENTO = 7 // Suggerisci pulizia se appartamento fermo 7+ giorni
const GIORNI_PRIMA_CHECKIN = 1 // Pulire 1 giorno prima del check-in (per appartamenti fermi)

/**
 * Calcola le pulizie programmate e i suggerimenti
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dataInizio = searchParams.get('da')
      ? new Date(searchParams.get('da')!)
      : new Date()
    const dataFine = searchParams.get('a')
      ? new Date(searchParams.get('a')!)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: prossimi 30 giorni

    // Normalizza le date
    dataInizio.setHours(0, 0, 0, 0)
    dataFine.setHours(23, 59, 59, 999)

    const stagioneCorrente = getStagioneCorrente()
    const { inizio: inizioStagione, fine: fineStagione } = getDateStagione(stagioneCorrente)

    // Recupera tutti gli appartamenti attivi
    const appartamenti = await prisma.appartamento.findMany({
      where: { attivo: true },
      orderBy: { id: 'asc' },
    })

    // Recupera le prenotazioni nel periodo (e anche prima per capire lo stato)
    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        stato: { notIn: ['cancelled'] },
        OR: [
          { checkOut: { gte: dataInizio, lte: dataFine } },
          { checkIn: { gte: dataInizio, lte: dataFine } },
          // Includi anche prenotazioni che coprono il periodo
          { AND: [{ checkIn: { lte: dataInizio } }, { checkOut: { gte: dataFine } }] },
        ],
      },
      orderBy: { checkIn: 'asc' },
    })

    // Recupera le pulizie già salvate nel periodo
    const pulizieEsistenti = await prisma.pulizia.findMany({
      where: {
        data: { gte: dataInizio, lte: dataFine },
        stato: { not: 'annullata' },
      },
      orderBy: { data: 'asc' },
    })

    // Mappa pulizie esistenti per chiave univoca (appartamentoId + data)
    const pulizieMap = new Map<string, typeof pulizieEsistenti[0]>()
    pulizieEsistenti.forEach(p => {
      const key = `${p.appartamentoId}-${p.data.toISOString().split('T')[0]}`
      pulizieMap.set(key, p)
    })

    // Genera pulizie automatiche dai check-out
    const pulizieAutomatiche: any[] = []
    const suggerimenti: any[] = []

    for (const app of appartamenti) {
      const prenotazioniApp = prenotazioni.filter(p => p.appartamentoId === app.id)

      // Trova primo check-in e ultimo check-out della stagione per questo appartamento
      // Considera anche prenotazioni che iniziano fino a 2 settimane prima dell'inizio stagione
      const inizioStagioneEsteso = new Date(inizioStagione)
      inizioStagioneEsteso.setDate(inizioStagioneEsteso.getDate() - 14) // 14 giorni prima del 1 giugno

      const prenotazioniStagione = await prisma.prenotazione.findMany({
        where: {
          appartamentoId: app.id,
          stato: { notIn: ['cancelled'] },
          checkIn: { gte: inizioStagioneEsteso, lte: fineStagione },
        },
        orderBy: { checkIn: 'asc' },
      })

      const primoCheckIn = prenotazioniStagione[0]?.checkIn
      const ultimoCheckOut = prenotazioniStagione[prenotazioniStagione.length - 1]?.checkOut

      // 1. Pulizia APERTURA STAGIONE (1 giorno prima del primo check-in)
      if (primoCheckIn) {
        const dataApertura = new Date(primoCheckIn)
        dataApertura.setDate(dataApertura.getDate() - 1)
        dataApertura.setHours(0, 0, 0, 0)

        if (dataApertura >= dataInizio && dataApertura <= dataFine) {
          const key = `${app.id}-${dataApertura.toISOString().split('T')[0]}`
          const puliziaEsistente = pulizieMap.get(key)

          if (!puliziaEsistente) {
            pulizieAutomatiche.push({
              id: `auto-apertura-${app.id}`,
              appartamentoId: app.id,
              data: dataApertura.toISOString(),
              tipo: 'apertura_stagione',
              stato: 'da_fare',
              orarioCheckout: null,
              isAutomatic: true,
            })
          }
        }
      }

      // 2. Pulizie CHECK-OUT
      for (const pren of prenotazioniApp) {
        const dataCheckout = new Date(pren.checkOut)
        dataCheckout.setHours(0, 0, 0, 0)

        if (dataCheckout >= dataInizio && dataCheckout <= dataFine) {
          const key = `${app.id}-${dataCheckout.toISOString().split('T')[0]}`
          const puliziaEsistente = pulizieMap.get(key)

          // Verifica se è l'ultimo check-out della stagione
          const isChiusuraStagione = ultimoCheckOut &&
            dataCheckout.toISOString().split('T')[0] === new Date(ultimoCheckOut).toISOString().split('T')[0]

          if (!puliziaEsistente) {
            pulizieAutomatiche.push({
              id: `auto-checkout-${pren.id}`,
              appartamentoId: app.id,
              data: dataCheckout.toISOString(),
              tipo: isChiusuraStagione ? 'chiusura_stagione' : 'checkout',
              stato: 'da_fare',
              orarioCheckout: '10:00', // Default, può essere personalizzato
              prenotazioneId: pren.id,
              isAutomatic: true,
            })
          }
        }
      }

      // 3. SUGGERIMENTI per appartamenti fermi
      // Trova periodi vuoti tra le prenotazioni
      const prenotazioniOrdinate = prenotazioniApp.sort(
        (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
      )

      for (let i = 0; i < prenotazioniOrdinate.length; i++) {
        const pren = prenotazioniOrdinate[i]
        const prenPrecedente = i > 0 ? prenotazioniOrdinate[i - 1] : null

        if (prenPrecedente) {
          const checkOutPrec = new Date(prenPrecedente.checkOut)
          const checkInCorrente = new Date(pren.checkIn)
          const giorniFermo = Math.floor(
            (checkInCorrente.getTime() - checkOutPrec.getTime()) / (1000 * 60 * 60 * 24)
          )

          // Se fermo per più di 7 giorni, suggerisci pulizia 1 giorno prima del check-in
          if (giorniFermo > GIORNI_FERMO_SUGGERIMENTO) {
            const dataSuggerita = new Date(checkInCorrente)
            dataSuggerita.setDate(dataSuggerita.getDate() - GIORNI_PRIMA_CHECKIN)
            dataSuggerita.setHours(0, 0, 0, 0)

            if (dataSuggerita >= dataInizio && dataSuggerita <= dataFine) {
              const key = `${app.id}-${dataSuggerita.toISOString().split('T')[0]}`
              const puliziaEsistente = pulizieMap.get(key)

              // Non suggerire se c'è già una pulizia quel giorno
              if (!puliziaEsistente && !pulizieAutomatiche.find(p =>
                p.appartamentoId === app.id &&
                p.data.split('T')[0] === dataSuggerita.toISOString().split('T')[0]
              )) {
                suggerimenti.push({
                  appartamentoId: app.id,
                  data: dataSuggerita.toISOString(),
                  giorniFermo,
                  checkInData: checkInCorrente.toISOString(),
                  motivo: `App ${app.id} fermo da ${giorniFermo} giorni`,
                })
              }
            }
          }
        }
      }
    }

    // Combina pulizie esistenti e automatiche
    const tuttePulizie = [
      ...pulizieEsistenti.map(p => ({
        ...p,
        data: p.data.toISOString(),
        completataIl: p.completataIl?.toISOString() || null,
        isAutomatic: false,
      })),
      ...pulizieAutomatiche,
    ]

    // Ordina per data
    tuttePulizie.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    // Raggruppa per data
    const puliziePerData: Record<string, any[]> = {}
    tuttePulizie.forEach(p => {
      const dataKey = new Date(p.data).toISOString().split('T')[0]
      if (!puliziePerData[dataKey]) {
        puliziePerData[dataKey] = []
      }
      puliziePerData[dataKey].push(p)
    })

    // Calcola statistiche
    const stats = {
      totale: tuttePulizie.length,
      daFare: tuttePulizie.filter(p => p.stato === 'da_fare').length,
      completate: tuttePulizie.filter(p => p.stato === 'completata').length,
      suggerimenti: suggerimenti.length,
    }

    return NextResponse.json({
      pulizie: tuttePulizie,
      puliziePerData,
      suggerimenti,
      stats,
      appartamenti: appartamenti.map(a => ({ id: a.id, nome: a.nome })),
      periodo: {
        da: dataInizio.toISOString(),
        a: dataFine.toISOString(),
      },
    })
  } catch (error) {
    console.error('Errore API Pulizie:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle pulizie' },
      { status: 500 }
    )
  }
}

/**
 * Crea una nuova pulizia (manuale o da suggerimento accettato)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appartamentoId, data, tipo, orarioCheckout, note } = body

    if (!appartamentoId || !data) {
      return NextResponse.json(
        { error: 'appartamentoId e data sono richiesti' },
        { status: 400 }
      )
    }

    const pulizia = await prisma.pulizia.create({
      data: {
        appartamentoId,
        data: new Date(data),
        tipo: tipo || 'manuale',
        orarioCheckout: orarioCheckout || null,
        note: note || null,
        stato: 'da_fare',
      },
    })

    return NextResponse.json(pulizia)
  } catch (error) {
    console.error('Errore creazione pulizia:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della pulizia' },
      { status: 500 }
    )
  }
}

/**
 * Aggiorna stato pulizia (completa, annulla, modifica orario)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, stato, orarioCheckout, note } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID pulizia richiesto' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (stato) {
      updateData.stato = stato
      if (stato === 'completata') {
        updateData.completataIl = new Date()
      } else {
        updateData.completataIl = null
      }
    }

    if (orarioCheckout !== undefined) {
      updateData.orarioCheckout = orarioCheckout
    }

    if (note !== undefined) {
      updateData.note = note
    }

    const pulizia = await prisma.pulizia.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(pulizia)
  } catch (error) {
    console.error('Errore aggiornamento pulizia:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della pulizia' },
      { status: 500 }
    )
  }
}

/**
 * Elimina una pulizia
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID pulizia richiesto' },
        { status: 400 }
      )
    }

    await prisma.pulizia.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore eliminazione pulizia:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione della pulizia' },
      { status: 500 }
    )
  }
}
