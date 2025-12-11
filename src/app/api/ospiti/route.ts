import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getStagioneCorrente,
  getDateStagione,
  getStagioniDisponibili,
  getBadgeStagione,
} from '@/lib/stagione'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const annoRichiesto = searchParams.get('anno')
      ? parseInt(searchParams.get('anno')!)
      : getStagioneCorrente()
    const mostraTutti = searchParams.get('tutti') === 'true'

    const { inizio: inizioStagione, fine: fineStagione } = getDateStagione(annoRichiesto)
    const stagioniDisponibili = getStagioniDisponibili()
    const badgeStagione = getBadgeStagione(annoRichiesto)

    // Se mostra tutti, recupera tutti gli ospiti con le loro prenotazioni
    // Altrimenti filtra per stagione
    let ospiti

    if (mostraTutti) {
      // Tutti gli ospiti con statistiche globali
      ospiti = await prisma.ospite.findMany({
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
        orderBy: { cognome: 'asc' },
      })
    } else {
      // Solo ospiti con prenotazioni nella stagione selezionata
      const prenotazioniStagione = await prisma.prenotazione.findMany({
        where: {
          checkIn: { gte: inizioStagione, lte: fineStagione },
          stato: { notIn: ['cancelled'] },
        },
        include: {
          ospite: true,
          appartamento: true,
        },
      })

      // Raggruppa per ospite
      const ospitiIds = [...new Set(prenotazioniStagione.map(p => p.ospiteId))]

      ospiti = await prisma.ospite.findMany({
        where: {
          id: { in: ospitiIds },
        },
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
        orderBy: { cognome: 'asc' },
      })
    }

    // Formatta i dati ospiti
    const ospitiFormattati = ospiti.map(ospite => {
      // Calcola prenotazioni nella stagione selezionata
      const prenotazioniStagione = ospite.prenotazioni.filter(p => {
        const checkIn = new Date(p.checkIn)
        return checkIn >= inizioStagione && checkIn <= fineStagione
      })

      // Calcola totali globali
      const prenotazioniTotali = ospite.prenotazioni.length
      const totaleSpeso = ospite.prenotazioni.reduce((sum, p) => sum + p.totale, 0)
      const totaleSpessoStagione = prenotazioniStagione.reduce((sum, p) => sum + p.totale, 0)

      // Ultimo soggiorno
      const ultimoSoggiorno = ospite.prenotazioni[0]?.checkIn

      // VIP se ha speso piu di 2000 euro o ha piu di 2 prenotazioni
      const vip = totaleSpeso >= 2000 || prenotazioniTotali >= 3

      return {
        id: ospite.id,
        nome: ospite.nome,
        cognome: ospite.cognome,
        email: ospite.email,
        telefono: ospite.telefono,
        nazione: ospite.nazione || 'Non specificata',
        citta: ospite.citta || '',
        prenotazioni: mostraTutti ? prenotazioniTotali : prenotazioniStagione.length,
        prenotazioniTotali,
        totaleSpeso,
        totaleSpessoStagione,
        ultimoSoggiorno: ultimoSoggiorno?.toISOString().split('T')[0] || null,
        vip,
      }
    })

    // Filtra ospiti che hanno almeno una prenotazione nel contesto selezionato
    const ospitiFiltrati = mostraTutti
      ? ospitiFormattati
      : ospitiFormattati.filter(o => o.prenotazioni > 0)

    return NextResponse.json({
      stagione: {
        anno: annoRichiesto,
        badge: badgeStagione,
      },
      stagioniDisponibili,
      mostraTutti,
      ospiti: ospitiFiltrati,
      totaleOspiti: ospitiFiltrati.length,
      ospitiVip: ospitiFiltrati.filter(o => o.vip).length,
    })
  } catch (error) {
    console.error('Errore API Ospiti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dati ospiti' },
      { status: 500 }
    )
  }
}
