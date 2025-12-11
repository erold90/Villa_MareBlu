import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Calcola i dati di una stagione dalle prenotazioni
async function calcolaDatiStagione(anno: number) {
  const inizioStagione = new Date(anno, 5, 1) // 1 Giugno
  const fineStagione = new Date(anno, 9, 1) // 1 Ottobre

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      checkIn: { gte: inizioStagione, lt: fineStagione },
      stato: { notIn: ['cancelled'] },
    },
    include: {
      appartamento: true,
      ospite: true,
    },
  })

  if (prenotazioni.length === 0) {
    return null
  }

  // Calcola totali
  const ricaviTotali = prenotazioni.reduce((sum, p) => sum + p.totale, 0)
  const prenotazioniTotali = prenotazioni.length
  const ricavoMedio = prenotazioniTotali > 0 ? Math.round(ricaviTotali / prenotazioniTotali) : 0

  // Calcola per mese
  const mesi = ['giugno', 'luglio', 'agosto', 'settembre']
  const ricaviPerMese: Record<string, number> = {}
  const prenotazioniPerMese: Record<string, number> = {}

  mesi.forEach((mese, index) => {
    const meseNum = index + 5 // Giugno = 5, Luglio = 6, etc
    const prenotazioniMese = prenotazioni.filter(p => p.checkIn.getMonth() === meseNum)
    ricaviPerMese[mese] = prenotazioniMese.reduce((sum, p) => sum + p.totale, 0)
    prenotazioniPerMese[mese] = prenotazioniMese.length
  })

  // Calcola per appartamento
  const appartamenti = await prisma.appartamento.findMany({ where: { attivo: true } })
  const datiPerAppartamento: Record<number, { ricavi: number; prenotazioni: number; ricavoMedio: number }> = {}

  appartamenti.forEach(app => {
    const prenotazioniApp = prenotazioni.filter(p => p.appartamentoId === app.id)
    const ricaviApp = prenotazioniApp.reduce((sum, p) => sum + p.totale, 0)
    datiPerAppartamento[app.id] = {
      ricavi: ricaviApp,
      prenotazioni: prenotazioniApp.length,
      ricavoMedio: prenotazioniApp.length > 0 ? Math.round(ricaviApp / prenotazioniApp.length) : 0,
    }
  })

  // Calcola per fonte
  const ricaviPerFonte: Record<string, number> = {}
  prenotazioni.forEach(p => {
    ricaviPerFonte[p.fonte] = (ricaviPerFonte[p.fonte] || 0) + p.totale
  })

  // Calcola per nazionalità
  const ricaviPerNazionalita: Record<string, number> = {}
  prenotazioni.forEach(p => {
    const nazione = p.ospite.nazione || 'Sconosciuta'
    ricaviPerNazionalita[nazione] = (ricaviPerNazionalita[nazione] || 0) + p.totale
  })

  // Calcola durata media soggiorno
  let totaleNotti = 0
  prenotazioni.forEach(p => {
    const notti = Math.ceil((p.checkOut.getTime() - p.checkIn.getTime()) / (1000 * 60 * 60 * 24))
    totaleNotti += notti
  })
  const durataMediaSoggiorno = prenotazioniTotali > 0 ? Math.round((totaleNotti / prenotazioniTotali) * 10) / 10 : 0

  return {
    anno,
    ricaviTotali,
    prenotazioniTotali,
    ricavoMedio,
    ricaviPerMese,
    prenotazioniPerMese,
    datiPerAppartamento,
    ricaviPerFonte,
    ricaviPerNazionalita,
    durataMediaSoggiorno,
  }
}

// Ottieni storico salvato nel database
async function getStoricoSalvato(anno: number) {
  const storico = await prisma.stagioneStorico.findUnique({
    where: { anno },
  })

  if (!storico) return null

  return {
    anno: storico.anno,
    ricaviTotali: storico.ricaviTotali,
    prenotazioniTotali: storico.prenotazioniTotali,
    ricavoMedio: storico.ricavoMedio,
    ricaviPerMese: JSON.parse(storico.ricaviPerMese),
    prenotazioniPerMese: JSON.parse(storico.prenotazioniPerMese),
    datiPerAppartamento: JSON.parse(storico.datiPerAppartamento),
    ricaviPerFonte: storico.ricaviPerFonte ? JSON.parse(storico.ricaviPerFonte) : null,
    ricaviPerNazionalita: storico.ricaviPerNazionalita ? JSON.parse(storico.ricaviPerNazionalita) : null,
    durataMediaSoggiorno: storico.durataMediaSoggiorno,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const annoRichiesto = searchParams.get('anno')
      ? parseInt(searchParams.get('anno')!)
      : new Date().getFullYear()
    const annoConfronto = searchParams.get('confronto')
      ? parseInt(searchParams.get('confronto')!)
      : null

    // Trova tutte le stagioni disponibili
    const annoCorrente = new Date().getFullYear()
    const primaSttagione = 2025 // Anno di inizio attività

    // Lista delle stagioni disponibili
    const stagioniDisponibili: number[] = []
    for (let anno = primaSttagione; anno <= annoCorrente + 1; anno++) {
      stagioniDisponibili.push(anno)
    }

    // Ottieni dati della stagione richiesta
    // Prima prova a calcolare dalle prenotazioni, poi usa lo storico salvato
    let stagionePrincipale: any = await calcolaDatiStagione(annoRichiesto)
    if (!stagionePrincipale) {
      stagionePrincipale = await getStoricoSalvato(annoRichiesto)
    }

    // Ottieni dati della stagione di confronto (se specificata)
    const stagioniConfronto: any[] = []
    if (annoConfronto && annoConfronto !== annoRichiesto) {
      let datiConfronto: any = await calcolaDatiStagione(annoConfronto)
      if (!datiConfronto) {
        datiConfronto = await getStoricoSalvato(annoConfronto)
      }
      if (datiConfronto) {
        stagioniConfronto.push(datiConfronto)
      }
    }

    // Ottieni appartamenti
    const appartamenti = await prisma.appartamento.findMany({
      where: { attivo: true },
      orderBy: { id: 'asc' },
    })

    // Prepara dati per il grafico confronto mensile
    const mesi = ['giugno', 'luglio', 'agosto', 'settembre']
    const confrontoMensile = mesi.map(mese => {
      const dato: any = { mese: mese.charAt(0).toUpperCase() + mese.slice(1) }

      if (stagionePrincipale?.ricaviPerMese) {
        dato[`${annoRichiesto}`] = stagionePrincipale.ricaviPerMese[mese] || 0
      }

      stagioniConfronto.forEach(stagione => {
        if (stagione?.ricaviPerMese) {
          dato[`${stagione.anno}`] = stagione.ricaviPerMese[mese] || 0
        }
      })

      return dato
    })

    // Calcola variazione rispetto all'anno precedente
    let variazioneRicavi = null
    let variazionePrenotazioni = null
    if (stagionePrincipale && stagioniConfronto.length > 0) {
      const annoPrecedente = stagioniConfronto[0]
      if (annoPrecedente.ricaviTotali > 0) {
        variazioneRicavi = Math.round(((stagionePrincipale.ricaviTotali - annoPrecedente.ricaviTotali) / annoPrecedente.ricaviTotali) * 100)
      }
      if (annoPrecedente.prenotazioniTotali > 0) {
        variazionePrenotazioni = Math.round(((stagionePrincipale.prenotazioniTotali - annoPrecedente.prenotazioniTotali) / annoPrecedente.prenotazioniTotali) * 100)
      }
    }

    return NextResponse.json({
      annoSelezionato: annoRichiesto,
      stagioniDisponibili,
      stagionePrincipale,
      stagioniConfronto,
      confrontoMensile,
      variazioneRicavi,
      variazionePrenotazioni,
      appartamenti,
    })
  } catch (error) {
    console.error('Errore API Analytics:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dati analytics' },
      { status: 500 }
    )
  }
}
