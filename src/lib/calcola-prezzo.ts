/**
 * Calcolo prezzi soggiorno da database
 *
 * Legge i prezzi dalla tabella PeriodoPrezzo invece del config statico.
 * Questo permette di modificare i prezzi dal pannello senza dover modificare il codice.
 */

import { prisma } from '@/lib/prisma'

export interface PeriodBreakdown {
  periodoNome: string
  dataInizio: Date
  dataFine: Date
  giorni: number
  prezzoSettimana: number
  prezzoNotte: number
  importo: number
}

export interface CalcoloPrezzoResult {
  prezzoTotale: number
  notti: number
  settimane: number
  breakdown: PeriodBreakdown[]
}

/**
 * Calcola il prezzo soggiorno per un appartamento leggendo i prezzi dal database
 *
 * @param appartamentoId - ID dell'appartamento
 * @param checkIn - Data di check-in
 * @param checkOut - Data di check-out
 * @returns Prezzo totale e breakdown per periodo
 */
export async function calcolaPrezzoFromDB(
  appartamentoId: number,
  checkIn: Date,
  checkOut: Date
): Promise<CalcoloPrezzoResult> {
  // Normalizza le date a mezzanotte
  const dataInizio = new Date(checkIn)
  dataInizio.setHours(0, 0, 0, 0)

  const dataFine = new Date(checkOut)
  dataFine.setHours(0, 0, 0, 0)

  // Calcola numero di notti
  const notti = Math.ceil((dataFine.getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24))
  const settimane = Math.ceil(notti / 7)

  // Leggi i periodi prezzo per questo appartamento
  const periodi = await prisma.periodoPrezzo.findMany({
    where: {
      appartamentoId: appartamentoId,
    },
    orderBy: { dataInizio: 'asc' },
  })

  if (periodi.length === 0) {
    // Nessun periodo definito, usa prezzo default (bassa stagione)
    const prezzoDefault = getPrezzoDefault(appartamentoId)
    return {
      prezzoTotale: prezzoDefault * settimane,
      notti,
      settimane,
      breakdown: [{
        periodoNome: 'Prezzo standard',
        dataInizio,
        dataFine,
        giorni: notti,
        prezzoSettimana: prezzoDefault,
        prezzoNotte: Math.round(prezzoDefault / 7),
        importo: prezzoDefault * settimane,
      }],
    }
  }

  // Calcola il prezzo per ogni settimana del soggiorno
  const breakdown: PeriodBreakdown[] = []
  let prezzoTotale = 0
  const dataCorrente = new Date(dataInizio)

  for (let i = 0; i < settimane; i++) {
    // Trova il periodo che copre questa data
    const periodoTrovato = periodi.find(p => {
      const pInizio = new Date(p.dataInizio)
      const pFine = new Date(p.dataFine)
      pInizio.setHours(0, 0, 0, 0)
      pFine.setHours(0, 0, 0, 0)
      return dataCorrente >= pInizio && dataCorrente < pFine
    })

    if (periodoTrovato) {
      const importo = periodoTrovato.prezzoSettimana

      // Cerca se esiste già un breakdown per questo periodo
      const esistente = breakdown.find(b => b.periodoNome === periodoTrovato.nome)
      if (esistente) {
        esistente.giorni += 7
        esistente.importo += importo
      } else {
        breakdown.push({
          periodoNome: periodoTrovato.nome,
          dataInizio: new Date(dataCorrente),
          dataFine: new Date(dataCorrente.getTime() + 7 * 24 * 60 * 60 * 1000),
          giorni: 7,
          prezzoSettimana: periodoTrovato.prezzoSettimana,
          prezzoNotte: periodoTrovato.prezzoNotte,
          importo,
        })
      }

      prezzoTotale += importo
    } else {
      // Nessun periodo trovato, usa prezzo default
      const prezzoDefault = getPrezzoDefault(appartamentoId)
      const esistente = breakdown.find(b => b.periodoNome === 'Fuori stagione')
      if (esistente) {
        esistente.giorni += 7
        esistente.importo += prezzoDefault
      } else {
        breakdown.push({
          periodoNome: 'Fuori stagione',
          dataInizio: new Date(dataCorrente),
          dataFine: new Date(dataCorrente.getTime() + 7 * 24 * 60 * 60 * 1000),
          giorni: 7,
          prezzoSettimana: prezzoDefault,
          prezzoNotte: Math.round(prezzoDefault / 7),
          importo: prezzoDefault,
        })
      }

      prezzoTotale += prezzoDefault
    }

    // Avanza di 7 giorni
    dataCorrente.setDate(dataCorrente.getDate() + 7)
  }

  return {
    prezzoTotale,
    notti,
    settimane,
    breakdown,
  }
}

/**
 * Calcola il prezzo per più appartamenti
 *
 * @param appartamentiIds - Array di ID appartamenti
 * @param checkIn - Data di check-in
 * @param checkOut - Data di check-out
 * @returns Prezzo totale e breakdown per ogni appartamento
 */
export async function calcolaPrezzoMultiAppartamenti(
  appartamentiIds: number[],
  checkIn: Date,
  checkOut: Date
): Promise<{
  prezzoTotale: number
  notti: number
  settimane: number
  perAppartamento: Record<number, CalcoloPrezzoResult>
}> {
  const perAppartamento: Record<number, CalcoloPrezzoResult> = {}
  let prezzoTotale = 0
  let notti = 0
  let settimane = 0

  for (const appartamentoId of appartamentiIds) {
    const risultato = await calcolaPrezzoFromDB(appartamentoId, checkIn, checkOut)
    perAppartamento[appartamentoId] = risultato
    prezzoTotale += risultato.prezzoTotale
    notti = risultato.notti // Stesso per tutti
    settimane = risultato.settimane // Stesso per tutti
  }

  return {
    prezzoTotale,
    notti,
    settimane,
    perAppartamento,
  }
}

/**
 * Prezzo default per appartamento (bassa stagione)
 */
function getPrezzoDefault(appartamentoId: number): number {
  const prezziDefault: Record<number, number> = {
    1: 400,
    2: 650,
    3: 350,
    4: 375,
  }
  return prezziDefault[appartamentoId] || 400
}

/**
 * API endpoint per calcolare il prezzo (da usare nel frontend)
 * Restituisce il calcolo senza salvare nulla
 */
export async function calcolaPrezzoPreventivoAPI(
  appartamentiIds: number[],
  checkIn: string,
  checkOut: string
): Promise<{
  prezzoSoggiorno: number
  notti: number
  settimane: number
  perAppartamento: Record<number, { prezzo: number; breakdown: PeriodBreakdown[] }>
}> {
  const dataCheckIn = new Date(checkIn)
  const dataCheckOut = new Date(checkOut)

  const risultato = await calcolaPrezzoMultiAppartamenti(
    appartamentiIds,
    dataCheckIn,
    dataCheckOut
  )

  const perAppartamento: Record<number, { prezzo: number; breakdown: PeriodBreakdown[] }> = {}
  for (const [id, calc] of Object.entries(risultato.perAppartamento)) {
    perAppartamento[parseInt(id)] = {
      prezzo: calc.prezzoTotale,
      breakdown: calc.breakdown,
    }
  }

  return {
    prezzoSoggiorno: risultato.prezzoTotale,
    notti: risultato.notti,
    settimane: risultato.settimane,
    perAppartamento,
  }
}
