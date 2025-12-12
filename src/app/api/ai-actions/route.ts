import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type {
  AzioneAI,
  AzioneCreaPrenotazione,
  AzioneModificaPrezzo,
  AzioneBloccoDate,
  AzioneModificaPrenotazione,
  AzioneAnnullaPrenotazione
} from '@/lib/ai-actions'

// API per eseguire le azioni proposte dall'AI dopo conferma dell'utente
export async function POST(request: NextRequest) {
  try {
    const { azione } = await request.json() as { azione: AzioneAI }

    if (!azione || !azione.tipo || !azione.dati) {
      return NextResponse.json(
        { success: false, error: 'Azione non valida' },
        { status: 400 }
      )
    }

    let risultato: { success: boolean; messaggio: string; id?: number }

    switch (azione.tipo) {
      case 'crea_prenotazione':
        risultato = await creaPrenotazione((azione as AzioneCreaPrenotazione).dati)
        break

      case 'modifica_prezzo':
        risultato = await modificaPrezzo((azione as AzioneModificaPrezzo).dati)
        break

      case 'blocco_date':
        risultato = await bloccoDate((azione as AzioneBloccoDate).dati)
        break

      case 'modifica_prenotazione':
        risultato = await modificaPrenotazione((azione as AzioneModificaPrenotazione).dati)
        break

      case 'annulla_prenotazione':
        risultato = await annullaPrenotazione((azione as AzioneAnnullaPrenotazione).dati)
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo azione non supportato' },
          { status: 400 }
        )
    }

    return NextResponse.json(risultato)
  } catch (error) {
    console.error('Errore esecuzione azione AI:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Crea una nuova prenotazione
async function creaPrenotazione(dati: AzioneCreaPrenotazione['dati']) {
  try {
    // Crea o trova l'ospite
    let ospite = await prisma.ospite.findFirst({
      where: {
        telefono: dati.ospiteTelefono,
      },
    })

    if (!ospite) {
      ospite = await prisma.ospite.create({
        data: {
          nome: dati.ospiteNome,
          cognome: dati.ospiteCognome,
          email: dati.ospiteEmail || null,
          telefono: dati.ospiteTelefono,
          nazione: dati.ospiteNazione || 'Italia',
        },
      })
    }

    // Crea le prenotazioni per ogni appartamento
    const prenotazioniCreate = []

    for (const appId of dati.appartamentiIds) {
      const prenotazione = await prisma.prenotazione.create({
        data: {
          appartamentoId: appId,
          ospiteId: ospite.id,
          checkIn: new Date(dati.checkIn),
          checkOut: new Date(dati.checkOut),
          numAdulti: dati.numAdulti,
          numBambini: dati.numBambini,
          numNeonati: dati.numNeonati,
          animali: dati.animali,
          animaliDettaglio: dati.animaliDettaglio || null,
          biancheria: dati.biancheria,
          fonte: dati.fonte,
          fonteRiferimento: dati.fonteRiferimento || null,
          prezzoSoggiorno: dati.prezzoSoggiorno / dati.appartamentiIds.length, // Dividi per numero appartamenti
          biancheriaCosto: dati.biancheriaCosto / dati.appartamentiIds.length,
          tassaSoggiorno: dati.tassaSoggiorno / dati.appartamentiIds.length,
          prezzoExtra: dati.extra / dati.appartamentiIds.length,
          totale: dati.totale / dati.appartamentiIds.length,
          acconto: dati.acconto / dati.appartamentiIds.length,
          saldo: (dati.totale - dati.acconto) / dati.appartamentiIds.length,
          stato: 'confermata',
          richiesteSpeciali: dati.richiesteSpeciali || null,
          noteInterne: dati.noteInterne || null,
        },
      })
      prenotazioniCreate.push(prenotazione)
    }

    return {
      success: true,
      messaggio: `Prenotazione creata con successo per ${dati.ospiteNome} ${dati.ospiteCognome}`,
      id: prenotazioniCreate[0]?.id,
    }
  } catch (error) {
    console.error('Errore creazione prenotazione:', error)
    return {
      success: false,
      messaggio: 'Errore nella creazione della prenotazione',
    }
  }
}

// Modifica il prezzo di una settimana
async function modificaPrezzo(dati: AzioneModificaPrezzo['dati']) {
  try {
    // Trova il periodo corrispondente alla settimana nel database
    const prezziAnno = await prisma.periodoPrezzo.findMany({
      where: {
        appartamentoId: dati.appartamentoId,
        dataInizio: { gte: new Date(`${dati.anno}-01-01`) },
        dataFine: { lte: new Date(`${dati.anno}-12-31`) },
      },
      orderBy: { dataInizio: 'asc' },
    })

    if (prezziAnno.length === 0) {
      // Se non ci sono prezzi nel DB, dobbiamo prima importarli dal config
      return {
        success: false,
        messaggio: `Nessun prezzo trovato nel database per l'anno ${dati.anno}. Vai alla pagina Prezzi e salva prima i prezzi nel database.`,
      }
    }

    // Trova la settimana corretta (indice 0-based, settimana è 1-based)
    const settimanaIndex = dati.settimana - 1
    if (settimanaIndex < 0 || settimanaIndex >= prezziAnno.length) {
      return {
        success: false,
        messaggio: `Settimana ${dati.settimana} non trovata per l'anno ${dati.anno}`,
      }
    }

    const periodoId = prezziAnno[settimanaIndex].id

    // Aggiorna il prezzo nella tabella PeriodoPrezzo
    await prisma.periodoPrezzo.update({
      where: { id: periodoId },
      data: {
        prezzoSettimana: dati.nuovoPrezzo,
        prezzoNotte: Math.round(dati.nuovoPrezzo / 7),
      },
    })

    const periodo = prezziAnno[settimanaIndex]
    const dataInizio = periodo.dataInizio.toISOString().split('T')[0]
    const dataFine = periodo.dataFine.toISOString().split('T')[0]

    return {
      success: true,
      messaggio: `Prezzo aggiornato: App ${dati.appartamentoId}, ${dataInizio} - ${dataFine} → €${dati.nuovoPrezzo}/settimana`,
    }
  } catch (error) {
    console.error('Errore modifica prezzo:', error)
    return {
      success: false,
      messaggio: 'Errore nella modifica del prezzo',
    }
  }
}

// Crea un blocco date
async function bloccoDate(dati: AzioneBloccoDate['dati']) {
  try {
    const blocco = await prisma.bloccoCalendario.create({
      data: {
        appartamentoId: dati.appartamentoId,
        dataInizio: new Date(dati.dataInizio),
        dataFine: new Date(dati.dataFine),
        motivo: dati.motivo,
      },
    })

    return {
      success: true,
      messaggio: `Date bloccate: App ${dati.appartamentoId} dal ${dati.dataInizio} al ${dati.dataFine}`,
      id: blocco.id,
    }
  } catch (error) {
    console.error('Errore blocco date:', error)
    return {
      success: false,
      messaggio: 'Errore nel blocco delle date',
    }
  }
}

// Modifica una prenotazione esistente
async function modificaPrenotazione(dati: AzioneModificaPrenotazione['dati']) {
  try {
    const updateData: Record<string, unknown> = {}

    if (dati.modifiche.checkIn) updateData.checkIn = new Date(dati.modifiche.checkIn)
    if (dati.modifiche.checkOut) updateData.checkOut = new Date(dati.modifiche.checkOut)
    if (dati.modifiche.numAdulti !== undefined) updateData.numAdulti = dati.modifiche.numAdulti
    if (dati.modifiche.numBambini !== undefined) updateData.numBambini = dati.modifiche.numBambini
    if (dati.modifiche.numNeonati !== undefined) updateData.numNeonati = dati.modifiche.numNeonati
    if (dati.modifiche.prezzoSoggiorno !== undefined) updateData.prezzoSoggiorno = dati.modifiche.prezzoSoggiorno
    if (dati.modifiche.totale !== undefined) updateData.totale = dati.modifiche.totale
    if (dati.modifiche.acconto !== undefined) updateData.acconto = dati.modifiche.acconto
    if (dati.modifiche.stato) updateData.stato = dati.modifiche.stato
    if (dati.modifiche.accontoPagato !== undefined) updateData.accontoPagato = dati.modifiche.accontoPagato
    if (dati.modifiche.saldoPagato !== undefined) updateData.saldoPagato = dati.modifiche.saldoPagato
    if (dati.modifiche.noteInterne) updateData.noteInterne = dati.modifiche.noteInterne

    await prisma.prenotazione.update({
      where: { id: dati.prenotazioneId },
      data: updateData,
    })

    return {
      success: true,
      messaggio: `Prenotazione #${dati.prenotazioneId} aggiornata con successo`,
      id: dati.prenotazioneId,
    }
  } catch (error) {
    console.error('Errore modifica prenotazione:', error)
    return {
      success: false,
      messaggio: 'Errore nella modifica della prenotazione',
    }
  }
}

// Annulla una prenotazione
async function annullaPrenotazione(dati: AzioneAnnullaPrenotazione['dati']) {
  try {
    await prisma.prenotazione.update({
      where: { id: dati.prenotazioneId },
      data: {
        stato: 'cancellata',
        noteInterne: `Cancellata: ${dati.motivo}`,
      },
    })

    return {
      success: true,
      messaggio: `Prenotazione #${dati.prenotazioneId} annullata`,
      id: dati.prenotazioneId,
    }
  } catch (error) {
    console.error('Errore annullamento prenotazione:', error)
    return {
      success: false,
      messaggio: 'Errore nell\'annullamento della prenotazione',
    }
  }
}
