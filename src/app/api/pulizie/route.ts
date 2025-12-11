import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateStagione, getStagioneCorrente } from '@/lib/stagione'

// Costanti configurazione
const NOTTI_FERMO_PULIZIA = 6 // Pulizia necessaria se appartamento fermo 6+ notti prima del check-in

/**
 * Helper: Ottieni il lunedì della settimana di una data
 */
function getLunediSettimana(data: Date): Date {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  const giorno = d.getDay()
  const diff = giorno === 0 ? -6 : 1 - giorno // Se domenica, vai indietro di 6 giorni
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Helper: Ottieni la domenica della settimana di una data
 */
function getDomenicaSettimana(data: Date): Date {
  const lunedi = getLunediSettimana(data)
  const domenica = new Date(lunedi)
  domenica.setDate(lunedi.getDate() + 6)
  return domenica
}

/**
 * Interfaccia per una pulizia raggruppata
 */
interface PuliziaRaw {
  appartamentoId: number
  checkOutDate: Date
  hasCheckInSameDay: boolean
  checkInDate?: Date
  tipo: 'cambio_ospiti' | 'fine_soggiorno' | 'pre_checkin' | 'apertura_stagione' | 'chiusura_stagione'
  note: string
  flessibile: boolean // true se può essere spostata, false se obbligatoria quel giorno
}

/**
 * Calcola le pulizie programmate con raggruppamento settimanale intelligente
 *
 * LOGICA PRINCIPALE:
 * - Le signore delle pulizie vengono UNA VOLTA a settimana
 * - Il giorno viene scelto in base all'ULTIMO check-out della settimana
 * - Eccezione: i "cambio ospiti" (check-out + check-in stesso giorno) sono obbligatori quel giorno
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const annoParam = searchParams.get('anno')
    const anno = annoParam ? parseInt(annoParam) : getStagioneCorrente()

    // Ottieni date stagione
    const { inizio: inizioStagione, fine: fineStagione } = getDateStagione(anno)

    // Estendi l'inizio di 2 settimane per catturare prenotazioni anticipate
    const inizioEsteso = new Date(inizioStagione)
    inizioEsteso.setDate(inizioEsteso.getDate() - 14)

    // Recupera tutti gli appartamenti attivi
    const appartamenti = await prisma.appartamento.findMany({
      where: { attivo: true },
      orderBy: { id: 'asc' },
    })

    // Recupera tutte le prenotazioni della stagione
    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        stato: { notIn: ['cancelled'] },
        OR: [
          { checkIn: { gte: inizioEsteso, lte: fineStagione } },
          { checkOut: { gte: inizioEsteso, lte: fineStagione } },
        ],
      },
      orderBy: { checkIn: 'asc' },
    })

    // Recupera le pulizie già salvate nel database
    const pulizieEsistenti = await prisma.pulizia.findMany({
      where: {
        data: { gte: inizioEsteso, lte: fineStagione },
        stato: { not: 'annullata' },
      },
      orderBy: { data: 'asc' },
    })

    // Mappa pulizie esistenti per chiave univoca
    const pulizieMap = new Map<string, typeof pulizieEsistenti[0]>()
    pulizieEsistenti.forEach(p => {
      const key = `${p.appartamentoId}-${p.data.toISOString().split('T')[0]}`
      pulizieMap.set(key, p)
    })

    // STEP 1: Raccogli tutte le pulizie "raw" (non ancora raggruppate)
    const pulizieRaw: PuliziaRaw[] = []

    for (const app of appartamenti) {
      const prenotazioniApp = prenotazioni
        .filter(p => p.appartamentoId === app.id)
        .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())

      if (prenotazioniApp.length === 0) continue

      const primoCheckIn = prenotazioniApp[0].checkIn
      const ultimoCheckOut = prenotazioniApp[prenotazioniApp.length - 1].checkOut

      // Pulizia APERTURA STAGIONE (1 giorno prima del primo check-in)
      const dataApertura = new Date(primoCheckIn)
      dataApertura.setDate(dataApertura.getDate() - 1)
      dataApertura.setHours(0, 0, 0, 0)

      pulizieRaw.push({
        appartamentoId: app.id,
        checkOutDate: dataApertura,
        hasCheckInSameDay: false,
        tipo: 'apertura_stagione',
        note: 'Preparazione inizio stagione',
        flessibile: true, // Può essere raggruppata con altre
      })

      // Analizza ogni prenotazione
      for (let i = 0; i < prenotazioniApp.length; i++) {
        const pren = prenotazioniApp[i]
        const prenSuccessiva = prenotazioniApp[i + 1]
        const prenPrecedente = prenotazioniApp[i - 1]

        const checkOut = new Date(pren.checkOut)
        checkOut.setHours(0, 0, 0, 0)
        const checkIn = new Date(pren.checkIn)
        checkIn.setHours(0, 0, 0, 0)

        // Verifica se c'è check-in lo stesso giorno del check-out
        const hasCheckInSameDay = prenSuccessiva &&
          new Date(prenSuccessiva.checkIn).toISOString().split('T')[0] === checkOut.toISOString().split('T')[0]

        // Verifica se è l'ultimo check-out (chiusura stagione)
        const isChiusura = checkOut.toISOString().split('T')[0] === new Date(ultimoCheckOut).toISOString().split('T')[0]

        if (hasCheckInSameDay) {
          // CAMBIO OSPITI - NON flessibile, deve essere fatto quel giorno
          pulizieRaw.push({
            appartamentoId: app.id,
            checkOutDate: checkOut,
            hasCheckInSameDay: true,
            checkInDate: new Date(prenSuccessiva.checkIn),
            tipo: 'cambio_ospiti',
            note: 'Cambio ospiti stesso giorno',
            flessibile: false,
          })
        } else if (isChiusura) {
          // CHIUSURA STAGIONE - flessibile
          pulizieRaw.push({
            appartamentoId: app.id,
            checkOutDate: checkOut,
            hasCheckInSameDay: false,
            tipo: 'chiusura_stagione',
            note: 'Chiusura fine stagione',
            flessibile: true,
          })
        } else if (prenSuccessiva) {
          // C'è una prenotazione successiva ma NON lo stesso giorno
          const checkInSucc = new Date(prenSuccessiva.checkIn)
          checkInSucc.setHours(0, 0, 0, 0)
          const giorniVuoti = Math.floor((checkInSucc.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24))

          if (giorniVuoti >= NOTTI_FERMO_PULIZIA) {
            // Appartamento fermo a lungo - pulizia il giorno del check-in successivo
            pulizieRaw.push({
              appartamentoId: app.id,
              checkOutDate: checkInSucc, // La pulizia è il giorno del check-in
              hasCheckInSameDay: false,
              checkInDate: checkInSucc,
              tipo: 'pre_checkin',
              note: `Fermo da ${giorniVuoti} notti`,
              flessibile: false, // Deve essere fatto prima del check-in
            })
          } else {
            // Pulizia normale dopo check-out - flessibile
            pulizieRaw.push({
              appartamentoId: app.id,
              checkOutDate: checkOut,
              hasCheckInSameDay: false,
              tipo: 'fine_soggiorno',
              note: `Check-in tra ${giorniVuoti} giorni`,
              flessibile: true,
            })
          }
        }
        // Se non c'è prenotazione successiva e non è chiusura, è già gestito dalla chiusura
      }
    }

    // STEP 2: Raggruppa per settimana e calcola il giorno ottimale
    const settimanePulizie = new Map<string, {
      lunedi: Date
      domenica: Date
      pulizieObbligatorie: Map<string, PuliziaRaw[]> // giorno -> pulizie non spostabili
      pulizieFlessibili: PuliziaRaw[]
      giornoConsigliato: Date | null
      pulizieProgrammate: any[]
    }>()

    // Raggruppa pulizie per settimana
    pulizieRaw.forEach(p => {
      const lunedi = getLunediSettimana(p.checkOutDate)
      const chiaveSettimana = lunedi.toISOString().split('T')[0]

      if (!settimanePulizie.has(chiaveSettimana)) {
        settimanePulizie.set(chiaveSettimana, {
          lunedi,
          domenica: getDomenicaSettimana(lunedi),
          pulizieObbligatorie: new Map(),
          pulizieFlessibili: [],
          giornoConsigliato: null,
          pulizieProgrammate: [],
        })
      }

      const settimana = settimanePulizie.get(chiaveSettimana)!

      if (!p.flessibile) {
        // Pulizia obbligatoria in un giorno specifico
        const giornoKey = p.checkOutDate.toISOString().split('T')[0]
        if (!settimana.pulizieObbligatorie.has(giornoKey)) {
          settimana.pulizieObbligatorie.set(giornoKey, [])
        }
        settimana.pulizieObbligatorie.get(giornoKey)!.push(p)
      } else {
        // Pulizia flessibile
        settimana.pulizieFlessibili.push(p)
      }
    })

    // STEP 3: Per ogni settimana, calcola il giorno ottimale
    settimanePulizie.forEach((settimana, chiaveSettimana) => {
      // Trova tutti i giorni con pulizie obbligatorie
      const giorniObbligatori = Array.from(settimana.pulizieObbligatorie.keys()).sort()

      // Trova l'ultimo giorno della settimana con attività (obbligatorie o flessibili)
      let ultimoGiorno: Date | null = null

      // Considera i giorni obbligatori
      if (giorniObbligatori.length > 0) {
        ultimoGiorno = new Date(giorniObbligatori[giorniObbligatori.length - 1])
      }

      // Considera anche le pulizie flessibili
      settimana.pulizieFlessibili.forEach(p => {
        if (!ultimoGiorno || p.checkOutDate > ultimoGiorno) {
          ultimoGiorno = p.checkOutDate
        }
      })

      settimana.giornoConsigliato = ultimoGiorno

      // Genera le pulizie programmate
      // 1. Pulizie obbligatorie nei loro giorni
      settimana.pulizieObbligatorie.forEach((pulizie, giorno) => {
        pulizie.forEach(p => {
          const key = `${p.appartamentoId}-${giorno}`
          const puliziaDB = pulizieMap.get(key)

          settimana.pulizieProgrammate.push({
            id: puliziaDB?.id || `auto-${p.tipo}-${p.appartamentoId}-${giorno}`,
            appartamentoId: p.appartamentoId,
            data: new Date(giorno).toISOString(),
            tipo: p.tipo,
            stato: puliziaDB?.stato || 'da_fare',
            note: p.note,
            obbligatoria: true,
            isAutomatic: !puliziaDB,
          })
        })
      })

      // 2. Pulizie flessibili spostate al giorno consigliato
      if (ultimoGiorno && settimana.pulizieFlessibili.length > 0) {
        const giornoKey = ultimoGiorno.toISOString().split('T')[0]

        settimana.pulizieFlessibili.forEach(p => {
          const key = `${p.appartamentoId}-${giornoKey}`
          const puliziaDB = pulizieMap.get(key)

          // Evita duplicati se c'è già una pulizia obbligatoria per lo stesso appartamento
          const giaDuplicato = settimana.pulizieProgrammate.find(
            pp => pp.appartamentoId === p.appartamentoId && pp.data.split('T')[0] === giornoKey
          )

          if (!giaDuplicato) {
            settimana.pulizieProgrammate.push({
              id: puliziaDB?.id || `auto-${p.tipo}-${p.appartamentoId}-${giornoKey}`,
              appartamentoId: p.appartamentoId,
              data: ultimoGiorno!.toISOString(),
              dataOriginale: p.checkOutDate.toISOString(),
              tipo: p.tipo,
              stato: puliziaDB?.stato || 'da_fare',
              note: p.note,
              obbligatoria: false,
              spostata: p.checkOutDate.toISOString().split('T')[0] !== giornoKey,
              isAutomatic: !puliziaDB,
            })
          }
        })
      }
    })

    // STEP 4: Formatta risposta come array di "giornate pulizie"
    const giornatePulizie: any[] = []

    settimanePulizie.forEach((settimana, chiaveSettimana) => {
      if (settimana.pulizieProgrammate.length === 0) return

      // Raggruppa per giorno effettivo
      const perGiorno = new Map<string, any[]>()
      settimana.pulizieProgrammate.forEach(p => {
        const giorno = p.data.split('T')[0]
        if (!perGiorno.has(giorno)) {
          perGiorno.set(giorno, [])
        }
        perGiorno.get(giorno)!.push(p)
      })

      perGiorno.forEach((pulizie, giorno) => {
        const data = new Date(giorno)
        const numObbligatorie = pulizie.filter((p: any) => p.obbligatoria).length
        const numSpostate = pulizie.filter((p: any) => p.spostata).length

        giornatePulizie.push({
          data: data.toISOString(),
          settimana: chiaveSettimana,
          giorno: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][data.getDay()],
          pulizie: pulizie.sort((a: any, b: any) => a.appartamentoId - b.appartamentoId),
          totaleAppartamenti: pulizie.length,
          appartamentiObbligatori: numObbligatorie,
          appartamentiSpostati: numSpostate,
          piuVisite: perGiorno.size > 1, // Se ci sono più giorni nella settimana
        })
      })
    })

    // Ordina per data
    giornatePulizie.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    // Statistiche
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    const giornatePassate = giornatePulizie.filter(g => new Date(g.data) < oggi)
    const giornateFuture = giornatePulizie.filter(g => new Date(g.data) >= oggi)
    const prossimaGiornata = giornateFuture[0] || null

    const stats = {
      totaleGiornate: giornatePulizie.length,
      giornateFatte: giornatePassate.length,
      giornateDaFare: giornateFuture.length,
      prossimaGiornata: prossimaGiornata ? {
        data: prossimaGiornata.data,
        giorno: prossimaGiornata.giorno,
        appartamenti: prossimaGiornata.totaleAppartamenti,
      } : null,
      settimaneConPiuVisite: giornatePulizie.filter(g => g.piuVisite).length / 2, // Diviso 2 perché conta ogni giornata
    }

    return NextResponse.json({
      anno,
      giornatePulizie,
      stats,
      appartamenti: appartamenti.map(a => ({ id: a.id, nome: a.nome })),
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
