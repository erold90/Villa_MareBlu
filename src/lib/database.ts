import { prisma } from './prisma'

// Ottieni tutte le prenotazioni con dettagli
export async function getPrenotazioni() {
  return prisma.prenotazione.findMany({
    include: {
      appartamento: true,
      ospite: true,
    },
    orderBy: { checkIn: 'desc' },
  })
}

// Ottieni prenotazioni per periodo
export async function getPrenotazioniPeriodo(dataInizio: Date, dataFine: Date) {
  return prisma.prenotazione.findMany({
    where: {
      OR: [
        {
          checkIn: { gte: dataInizio, lte: dataFine },
        },
        {
          checkOut: { gte: dataInizio, lte: dataFine },
        },
        {
          AND: [
            { checkIn: { lte: dataInizio } },
            { checkOut: { gte: dataFine } },
          ],
        },
      ],
    },
    include: {
      appartamento: true,
      ospite: true,
    },
    orderBy: { checkIn: 'asc' },
  })
}

// Ottieni appartamenti con disponibilità
export async function getAppartamenti() {
  return prisma.appartamento.findMany({
    where: { attivo: true },
    include: {
      prenotazioni: {
        where: {
          stato: { notIn: ['cancelled'] },
          checkOut: { gte: new Date() },
        },
      },
      blocchi: {
        where: {
          dataFine: { gte: new Date() },
        },
      },
    },
    orderBy: { id: 'asc' },
  })
}

// Verifica disponibilità per date specifiche
export async function verificaDisponibilita(checkIn: Date, checkOut: Date) {
  const appartamenti = await prisma.appartamento.findMany({
    where: { attivo: true },
    include: {
      prenotazioni: {
        where: {
          stato: { notIn: ['cancelled'] },
          OR: [
            {
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            },
          ],
        },
      },
      blocchi: {
        where: {
          OR: [
            {
              dataInizio: { lt: checkOut },
              dataFine: { gt: checkIn },
            },
          ],
        },
      },
    },
  })

  return appartamenti.map((app) => ({
    ...app,
    disponibile: app.prenotazioni.length === 0 && app.blocchi.length === 0,
  }))
}

// Statistiche prenotazioni
export async function getStatistichePrenotazioni() {
  const oggi = new Date()
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  const fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)
  const inizioAnno = new Date(oggi.getFullYear(), 0, 1)

  const [
    totalePrenotazioni,
    prenotazioniMese,
    prenotazioniAnno,
    prenotazioniAttive,
    totaleIncassoAnno,
  ] = await Promise.all([
    prisma.prenotazione.count(),
    prisma.prenotazione.count({
      where: {
        checkIn: { gte: inizioMese, lte: fineMese },
      },
    }),
    prisma.prenotazione.count({
      where: {
        checkIn: { gte: inizioAnno },
      },
    }),
    prisma.prenotazione.count({
      where: {
        stato: { in: ['confirmed', 'checkedin'] },
        checkIn: { lte: oggi },
        checkOut: { gte: oggi },
      },
    }),
    prisma.prenotazione.aggregate({
      _sum: { totale: true },
      where: {
        checkIn: { gte: inizioAnno },
        stato: { notIn: ['cancelled'] },
      },
    }),
  ])

  return {
    totalePrenotazioni,
    prenotazioniMese,
    prenotazioniAnno,
    prenotazioniAttive,
    totaleIncassoAnno: totaleIncassoAnno._sum.totale || 0,
  }
}

// Ottieni ospiti
export async function getOspiti() {
  return prisma.ospite.findMany({
    include: {
      _count: { select: { prenotazioni: true } },
    },
    orderBy: { cognome: 'asc' },
  })
}

// Ottieni prossimi check-in/check-out
export async function getProssimiMovimenti(giorni: number = 7) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const limite = new Date(oggi)
  limite.setDate(limite.getDate() + giorni)

  const [checkIns, checkOuts] = await Promise.all([
    prisma.prenotazione.findMany({
      where: {
        checkIn: { gte: oggi, lte: limite },
        stato: { in: ['confirmed', 'pending'] },
      },
      include: {
        appartamento: true,
        ospite: true,
      },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.prenotazione.findMany({
      where: {
        checkOut: { gte: oggi, lte: limite },
        stato: { in: ['confirmed', 'checkedin'] },
      },
      include: {
        appartamento: true,
        ospite: true,
      },
      orderBy: { checkOut: 'asc' },
    }),
  ])

  return { checkIns, checkOuts }
}

// Ottieni task pendenti
export async function getTaskPendenti() {
  return prisma.task.findMany({
    where: {
      stato: { in: ['pending', 'in_progress'] },
    },
    orderBy: [{ priorita: 'desc' }, { scadenza: 'asc' }],
  })
}

// Formatta i dati per il contesto dell'assistente
export async function getContestoAssistente() {
  const [
    prenotazioni,
    appartamenti,
    statistiche,
    prossimiMovimenti,
    taskPendenti,
  ] = await Promise.all([
    getPrenotazioni(),
    getAppartamenti(),
    getStatistichePrenotazioni(),
    getProssimiMovimenti(14),
    getTaskPendenti(),
  ])

  const oggi = new Date()

  // Formatta prenotazioni
  const prenotazioniFormattate = prenotazioni.map((p) => ({
    id: p.id,
    appartamento: p.appartamento.nome,
    ospite: `${p.ospite.nome} ${p.ospite.cognome}`,
    checkIn: p.checkIn.toISOString().split('T')[0],
    checkOut: p.checkOut.toISOString().split('T')[0],
    adulti: p.numAdulti,
    bambini: p.numBambini,
    totale: p.totale,
    stato: p.stato,
    fonte: p.fonte,
    acconto: p.acconto,
    accontoPagato: p.accontoPagato,
    saldo: p.saldo,
    saldoPagato: p.saldoPagato,
  }))

  // Formatta appartamenti con disponibilità
  const appartamentiFormattati = appartamenti.map((a) => {
    const prenotazioniFuture = a.prenotazioni.filter(
      (p) => new Date(p.checkOut) >= oggi
    )
    return {
      id: a.id,
      nome: a.nome,
      postiLetto: a.postiLetto,
      camere: a.camere,
      prenotazioniAttive: prenotazioniFuture.length,
      blocchiAttivi: a.blocchi.length,
    }
  })

  // Formatta check-in/out
  const checkInsFormattati = prossimiMovimenti.checkIns.map((p) => ({
    data: p.checkIn.toISOString().split('T')[0],
    appartamento: p.appartamento.nome,
    ospite: `${p.ospite.nome} ${p.ospite.cognome}`,
    ospiti: p.numAdulti + p.numBambini,
  }))

  const checkOutsFormattati = prossimiMovimenti.checkOuts.map((p) => ({
    data: p.checkOut.toISOString().split('T')[0],
    appartamento: p.appartamento.nome,
    ospite: `${p.ospite.nome} ${p.ospite.cognome}`,
  }))

  return {
    dataOggi: oggi.toISOString().split('T')[0],
    statistiche,
    appartamenti: appartamentiFormattati,
    prenotazioni: prenotazioniFormattate,
    prossimiCheckIn: checkInsFormattati,
    prossimiCheckOut: checkOutsFormattati,
    taskPendenti: taskPendenti.map((t) => ({
      titolo: t.titolo,
      priorita: t.priorita,
      scadenza: t.scadenza?.toISOString().split('T')[0],
    })),
  }
}

// ============== ANALYTICS ==============

// Ottieni storico di una stagione
export async function getStagioneStorico(anno: number) {
  const storico = await prisma.stagioneStorico.findUnique({
    where: { anno },
  })

  if (!storico) return null

  return {
    ...storico,
    ricaviPerMese: JSON.parse(storico.ricaviPerMese),
    prenotazioniPerMese: JSON.parse(storico.prenotazioniPerMese),
    datiPerAppartamento: JSON.parse(storico.datiPerAppartamento),
    ricaviPerFonte: storico.ricaviPerFonte ? JSON.parse(storico.ricaviPerFonte) : null,
    ricaviPerNazionalita: storico.ricaviPerNazionalita ? JSON.parse(storico.ricaviPerNazionalita) : null,
  }
}

// Ottieni tutti gli storici disponibili
export async function getTuttiStorici() {
  const storici = await prisma.stagioneStorico.findMany({
    orderBy: { anno: 'desc' },
  })

  return storici.map(s => ({
    ...s,
    ricaviPerMese: JSON.parse(s.ricaviPerMese),
    prenotazioniPerMese: JSON.parse(s.prenotazioniPerMese),
    datiPerAppartamento: JSON.parse(s.datiPerAppartamento),
    ricaviPerFonte: s.ricaviPerFonte ? JSON.parse(s.ricaviPerFonte) : null,
    ricaviPerNazionalita: s.ricaviPerNazionalita ? JSON.parse(s.ricaviPerNazionalita) : null,
  }))
}

// Calcola analytics per stagione corrente (dai dati delle prenotazioni)
export async function getAnalyticsStagioneCorrente(anno: number) {
  const inizioStagione = new Date(anno, 5, 1) // 1 Giugno
  const fineStagione = new Date(anno, 8, 30) // 30 Settembre

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      checkIn: { gte: inizioStagione, lte: fineStagione },
      stato: { notIn: ['cancelled'] },
    },
    include: {
      appartamento: true,
      ospite: true,
    },
  })

  // Calcola totali
  const ricaviTotali = prenotazioni.reduce((sum, p) => sum + p.totale, 0)
  const prenotazioniTotali = prenotazioni.length
  const ricavoMedio = prenotazioniTotali > 0 ? ricaviTotali / prenotazioniTotali : 0

  // Calcola per mese
  const mesi = ['giugno', 'luglio', 'agosto', 'settembre']
  const ricaviPerMese: Record<string, number> = {}
  const prenotazioniPerMese: Record<string, number> = {}

  mesi.forEach((mese, index) => {
    const meseNum = index + 5 // Giugno = 5, Luglio = 6, etc
    const prenotazioniMese = prenotazioni.filter(p => {
      const checkInMonth = p.checkIn.getMonth()
      return checkInMonth === meseNum
    })
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
      ricavoMedio: prenotazioniApp.length > 0 ? ricaviApp / prenotazioniApp.length : 0,
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

  return {
    anno,
    ricaviTotali,
    prenotazioniTotali,
    ricavoMedio: Math.round(ricavoMedio),
    ricaviPerMese,
    prenotazioniPerMese,
    datiPerAppartamento,
    ricaviPerFonte,
    ricaviPerNazionalita,
  }
}

// Ottieni dati per la pagina Analytics
export async function getAnalyticsData(annoCorrente: number = new Date().getFullYear()) {
  const [stagionePrecedente, stagioneCorrente, appartamenti] = await Promise.all([
    getStagioneStorico(annoCorrente - 1),
    getAnalyticsStagioneCorrente(annoCorrente),
    prisma.appartamento.findMany({ where: { attivo: true }, orderBy: { id: 'asc' } }),
  ])

  return {
    annoCorrente,
    annoPrecedente: annoCorrente - 1,
    stagioneCorrente,
    stagionePrecedente,
    appartamenti,
  }
}
