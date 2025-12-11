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
    // Salviamo le modifiche prezzi nella tabella Impostazione
    await prisma.impostazione.upsert({
      where: {
        chiave: `prezzo_${dati.anno}_${dati.settimana}_${dati.appartamentoId}`,
      },
      update: {
        valore: dati.nuovoPrezzo.toString(),
      },
      create: {
        chiave: `prezzo_${dati.anno}_${dati.settimana}_${dati.appartamentoId}`,
        valore: dati.nuovoPrezzo.toString(),
      },
    })

    return {
      success: true,
      messaggio: `Prezzo aggiornato: Settimana ${dati.settimana} App ${dati.appartamentoId} → €${dati.nuovoPrezzo}`,
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
