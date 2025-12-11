import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getStagioneCorrente,
  getDateStagione,
  isStagioneChiusa,
  getBadgeStagione,
} from '@/lib/stagione'

export async function GET() {
  try {
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    // Usa la stagione corrente (auto-aggiornante)
    const stagioneCorrente = getStagioneCorrente()
    const { inizio: inizioStagione, fine: fineStagione } = getDateStagione(stagioneCorrente)
    const stagionePrecedente = stagioneCorrente - 1
    const stagioneChiusa = isStagioneChiusa(stagioneCorrente)
    const badgeStagione = getBadgeStagione(stagioneCorrente)

    const fra7giorni = new Date(oggi)
    fra7giorni.setDate(fra7giorni.getDate() + 7)

    // Query parallele per performance
    const [
      prenotazioniAttive,
      prenotazioniStagione,
      totaleIncassoStagione,
      appartamenti,
      prossimiCheckIns,
      prossimiCheckOuts,
      taskPendenti,
      prenotazioniStagioneDettaglio,
    ] = await Promise.all([
      // Prenotazioni attive oggi
      prisma.prenotazione.count({
        where: {
          stato: { in: ['confirmed', 'checkedin'] },
          checkIn: { lte: oggi },
          checkOut: { gte: oggi },
        },
      }),
      // Prenotazioni della stagione corrente
      prisma.prenotazione.count({
        where: {
          checkIn: { gte: inizioStagione, lte: fineStagione },
          stato: { notIn: ['cancelled'] },
        },
      }),
      // Incasso della stagione corrente
      prisma.prenotazione.aggregate({
        _sum: { totale: true },
        where: {
          checkIn: { gte: inizioStagione, lte: fineStagione },
          stato: { notIn: ['cancelled'] },
        },
      }),
      // Appartamenti
      prisma.appartamento.findMany({
        where: { attivo: true },
        include: {
          prenotazioni: {
            where: {
              stato: { in: ['confirmed', 'checkedin'] },
              checkIn: { lte: oggi },
              checkOut: { gte: oggi },
            },
            include: { ospite: true },
          },
        },
        orderBy: { id: 'asc' },
      }),
      // Prossimi check-in (7 giorni)
      prisma.prenotazione.findMany({
        where: {
          checkIn: { gte: oggi, lte: fra7giorni },
          stato: { in: ['confirmed', 'pending'] },
        },
        include: {
          appartamento: true,
          ospite: true,
        },
        orderBy: { checkIn: 'asc' },
        take: 5,
      }),
      // Prossimi check-out (7 giorni)
      prisma.prenotazione.findMany({
        where: {
          checkOut: { gte: oggi, lte: fra7giorni },
          stato: { in: ['confirmed', 'checkedin'] },
        },
        include: {
          appartamento: true,
          ospite: true,
        },
        orderBy: { checkOut: 'asc' },
        take: 5,
      }),
      // Task pendenti
      prisma.task.findMany({
        where: {
          stato: { in: ['pending', 'in_progress'] },
        },
        orderBy: [{ priorita: 'desc' }, { scadenza: 'asc' }],
        take: 5,
      }),
      // Prenotazioni stagione per calcolo incassi per mese
      prisma.prenotazione.findMany({
        where: {
          checkIn: { gte: inizioStagione, lte: fineStagione },
          stato: { notIn: ['cancelled'] },
        },
        select: {
          checkIn: true,
          totale: true,
        },
      }),
    ])

    // Calcola ospiti totali stagione
    const ospitiStagione = await prisma.prenotazione.aggregate({
      _sum: { numAdulti: true, numBambini: true },
      where: {
        checkIn: { gte: inizioStagione, lte: fineStagione },
        stato: { notIn: ['cancelled'] },
      },
    })

    // Calcola incassi per mese della stagione
    const mesiStagione = ['Giu', 'Lug', 'Ago', 'Set']
    const incassiPerMese: Record<number, number> = {}

    prenotazioniStagioneDettaglio.forEach((p) => {
      const mese = new Date(p.checkIn).getMonth()
      incassiPerMese[mese] = (incassiPerMese[mese] || 0) + p.totale
    })

    // Dati per grafico revenue (mesi della stagione)
    const revenueData = [
      { mese: 'Giu', incasso: incassiPerMese[5] || 0 },
      { mese: 'Lug', incasso: incassiPerMese[6] || 0 },
      { mese: 'Ago', incasso: incassiPerMese[7] || 0 },
      { mese: 'Set', incasso: incassiPerMese[8] || 0 },
    ]

    // Calcola occupazione per appartamento (stagione corrente)
    const giorniStagione = Math.ceil((fineStagione.getTime() - inizioStagione.getTime()) / (1000 * 60 * 60 * 24))

    const occupancyData = await Promise.all(
      appartamenti.map(async (app) => {
        const prenotazioniApp = await prisma.prenotazione.findMany({
          where: {
            appartamentoId: app.id,
            stato: { notIn: ['cancelled'] },
            OR: [
              { checkIn: { gte: inizioStagione, lte: fineStagione } },
              { checkOut: { gte: inizioStagione, lte: fineStagione } },
            ],
          },
        })

        let giorniOccupati = 0
        prenotazioniApp.forEach((p) => {
          const inizio = new Date(Math.max(p.checkIn.getTime(), inizioStagione.getTime()))
          const fine = new Date(Math.min(p.checkOut.getTime(), fineStagione.getTime()))
          giorniOccupati += Math.ceil((fine.getTime() - inizio.getTime()) / (1000 * 60 * 60 * 24))
        })

        const occupazione = Math.min(100, Math.round((giorniOccupati / giorniStagione) * 100))

        return {
          appartamento: `App ${app.id}`,
          nome: app.nome,
          occupazione,
        }
      })
    )

    // Formatta appartamenti con stato
    const appartamentiStato = appartamenti.map((app) => ({
      id: app.id,
      nome: app.nome,
      postiLetto: app.postiLetto,
      occupato: app.prenotazioni.length > 0,
      ospiteCorrente: app.prenotazioni[0]?.ospite
        ? `${app.prenotazioni[0].ospite.cognome} ${app.prenotazioni[0].ospite.nome}`
        : null,
    }))

    // Formatta check-ins
    const checkIns = prossimiCheckIns.map((p) => ({
      id: p.id,
      ospite: `${p.ospite.cognome} ${p.ospite.nome}`,
      appartamento: p.appartamentoId,
      appartamentoNome: p.appartamento.nome,
      data: p.checkIn.toISOString(),
      ospiti: p.numAdulti + p.numBambini,
    }))

    // Formatta check-outs
    const checkOuts = prossimiCheckOuts.map((p) => ({
      id: p.id,
      ospite: `${p.ospite.cognome} ${p.ospite.nome}`,
      appartamento: p.appartamentoId,
      appartamentoNome: p.appartamento.nome,
      data: p.checkOut.toISOString(),
      ospiti: p.numAdulti + p.numBambini,
    }))

    // Formatta task
    const tasks = taskPendenti.map((t) => ({
      id: t.id,
      titolo: t.titolo,
      priorita: t.priorita,
      scadenza: t.scadenza?.toISOString() || null,
    }))

    // Calcola tasso occupazione medio
    const tassoOccupazioneMedio = occupancyData.length > 0
      ? Math.round(occupancyData.reduce((sum, o) => sum + o.occupazione, 0) / occupancyData.length)
      : 0

    // Se la stagione è chiusa e non ci sono prenotazioni future, mostra messaggio appropriato
    const haPrenotazioniFuture = prossimiCheckIns.length > 0 || prossimiCheckOuts.length > 0

    return NextResponse.json({
      stagione: {
        anno: stagioneCorrente,
        chiusa: stagioneChiusa,
        badge: badgeStagione,
        haPrenotazioniFuture,
      },
      stats: {
        prenotazioniAttive,
        prenotazioniStagione,
        ospiti: (ospitiStagione._sum.numAdulti || 0) + (ospitiStagione._sum.numBambini || 0),
        incassoStagione: totaleIncassoStagione._sum.totale || 0,
        tassoOccupazione: tassoOccupazioneMedio,
      },
      revenueData,
      occupancyData,
      checkIns,
      checkOuts,
      tasks,
      appartamenti: appartamentiStato,
    })
  } catch (error) {
    console.error('Errore API Dashboard:', error)
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
    const errorStack = error instanceof Error ? error.stack : ''
    return NextResponse.json(
      { error: 'Errore nel recupero dati dashboard', details: errorMessage, stack: errorStack },
      { status: 500 }
    )
  }
}
