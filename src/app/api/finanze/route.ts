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

    const { inizio: inizioStagione, fine: fineStagione } = getDateStagione(annoRichiesto)
    const stagioniDisponibili = getStagioniDisponibili()
    const badgeStagione = getBadgeStagione(annoRichiesto)

    // Recupera tutte le prenotazioni della stagione
    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        checkIn: { gte: inizioStagione, lte: fineStagione },
        stato: { notIn: ['cancelled'] },
      },
      include: {
        appartamento: true,
        ospite: true,
      },
      orderBy: { checkIn: 'desc' },
    })

    // Calcola totali
    const entrateTotali = prenotazioni.reduce((sum, p) => sum + p.totale, 0)
    const prenotazioniTotali = prenotazioni.length

    // Calcola per mese
    const mesiNomi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    const entratePerMese: { mese: string; entrate: number; uscite: number }[] = []

    // Solo mesi della stagione (Giugno-Settembre)
    for (let m = 5; m <= 8; m++) {
      const prenotazioniMese = prenotazioni.filter(p => new Date(p.checkIn).getMonth() === m)
      const entrateMese = prenotazioniMese.reduce((sum, p) => sum + p.totale, 0)
      entratePerMese.push({
        mese: mesiNomi[m].substring(0, 3),
        entrate: entrateMese,
        uscite: 0, // Le uscite non sono tracciate nel sistema attuale
      })
    }

    // Calcola per fonte
    const entratePerFonte: { nome: string; valore: number; colore: string }[] = []
    const fontiColori: Record<string, string> = {
      'airbnb': '#FF5A5F',
      'booking': '#003580',
      'direct': '#10B981',
      'other': '#8B5CF6',
    }

    const fontiTotali: Record<string, number> = {}
    prenotazioni.forEach(p => {
      fontiTotali[p.fonte] = (fontiTotali[p.fonte] || 0) + p.totale
    })

    Object.entries(fontiTotali).forEach(([fonte, totale]) => {
      entratePerFonte.push({
        nome: fonte.charAt(0).toUpperCase() + fonte.slice(1),
        valore: totale,
        colore: fontiColori[fonte] || '#6B7280',
      })
    })

    // Ultimi movimenti (prenotazioni recenti)
    const movimentiRecenti = prenotazioni.slice(0, 10).map(p => ({
      id: p.id,
      tipo: 'entrata' as const,
      descrizione: `Prenotazione ${p.ospite.cognome} ${p.ospite.nome} - ${p.appartamento.nome}`,
      importo: p.totale,
      data: p.checkIn.toISOString().split('T')[0],
      metodo: p.fonte,
      categoria: 'prenotazione',
    }))

    // Pagamenti in attesa (prenotazioni future non ancora completate)
    const oggi = new Date()
    const pagamentiInAttesa = prenotazioni
      .filter(p => new Date(p.checkIn) > oggi && p.stato === 'confirmed')
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        ospite: `${p.ospite.cognome} ${p.ospite.nome}`,
        tipo: 'totale',
        importo: p.totale,
        scadenza: p.checkIn.toISOString().split('T')[0],
        appartamento: p.appartamentoId,
      }))

    // Confronto con stagione precedente
    const annoPrecedente = annoRichiesto - 1
    const { inizio: inizioPrecedente, fine: finePrecedente } = getDateStagione(annoPrecedente)

    const prenotazioniPrecedenti = await prisma.prenotazione.findMany({
      where: {
        checkIn: { gte: inizioPrecedente, lte: finePrecedente },
        stato: { notIn: ['cancelled'] },
      },
    })

    const entratePrecedenti = prenotazioniPrecedenti.reduce((sum, p) => sum + p.totale, 0)
    const variazioneEntrate = entratePrecedenti > 0
      ? Math.round(((entrateTotali - entratePrecedenti) / entratePrecedenti) * 100)
      : null

    return NextResponse.json({
      stagione: {
        anno: annoRichiesto,
        badge: badgeStagione,
      },
      stagioniDisponibili,
      riepilogo: {
        entrate: entrateTotali,
        uscite: 0, // Non tracciato
        netto: entrateTotali,
        prenotazioni: prenotazioniTotali,
        variazioneEntrate,
      },
      andamentoData: entratePerMese,
      categorieEntrate: entratePerFonte,
      movimentiRecenti,
      pagamentiInAttesa,
    })
  } catch (error) {
    console.error('Errore API Finanze:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dati finanze' },
      { status: 500 }
    )
  }
}
