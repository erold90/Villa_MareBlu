import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Inizio seed database...')

  // Crea appartamenti con ID fissi (1, 2, 3, 4)
  // IMPORTANTE: Gli ID devono corrispondere a quelli in src/config/appartamenti.ts
  const appartamenti = await Promise.all([
    prisma.appartamento.upsert({
      where: { id: 1 },
      update: {
        nome: 'Appartamento 1',
        slug: 'appartamento-1',
        postiLetto: 6,
        camere: 2,
        bagni: 1,
        piano: 'Piano terra',
        airbnbId: '1203aboribo',
      },
      create: {
        id: 1,
        nome: 'Appartamento 1',
        slug: 'appartamento-1',
        postiLetto: 6,
        camere: 2,
        bagni: 1,
        piano: 'Piano terra',
        airbnbId: '1203aboribo',
      },
    }),
    prisma.appartamento.upsert({
      where: { id: 2 },
      update: {
        nome: 'Appartamento 2',
        slug: 'appartamento-2',
        postiLetto: 8,
        camere: 3,
        bagni: 1,
        piano: 'Primo piano',
        airbnbId: '1203aborme',
      },
      create: {
        id: 2,
        nome: 'Appartamento 2',
        slug: 'appartamento-2',
        postiLetto: 8,
        camere: 3,
        bagni: 1,
        piano: 'Primo piano',
        airbnbId: '1203aborme',
      },
    }),
    prisma.appartamento.upsert({
      where: { id: 3 },
      update: {
        nome: 'Appartamento 3',
        slug: 'appartamento-3',
        postiLetto: 4,
        camere: 1,
        bagni: 1,
        piano: 'Secondo piano',
        airbnbId: '1203aborna',
      },
      create: {
        id: 3,
        nome: 'Appartamento 3',
        slug: 'appartamento-3',
        postiLetto: 4,
        camere: 1,
        bagni: 1,
        piano: 'Secondo piano',
        airbnbId: '1203aborna',
      },
    }),
    prisma.appartamento.upsert({
      where: { id: 4 },
      update: {
        nome: 'Appartamento 4',
        slug: 'appartamento-4',
        postiLetto: 5,
        camere: 2,
        bagni: 1,
        piano: 'Secondo piano',
        airbnbId: '1203abornb',
      },
      create: {
        id: 4,
        nome: 'Appartamento 4',
        slug: 'appartamento-4',
        postiLetto: 5,
        camere: 2,
        bagni: 1,
        piano: 'Secondo piano',
        airbnbId: '1203abornb',
      },
    }),
  ])

  console.log('Appartamenti creati:', appartamenti.length)

  // Crea alcuni ospiti
  const ospiti = await Promise.all([
    prisma.ospite.create({
      data: {
        nome: 'Mario',
        cognome: 'Rossi',
        email: 'mario.rossi@email.it',
        telefono: '+39 333 1234567',
        nazione: 'Italia',
        citta: 'Milano',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Laura',
        cognome: 'Bianchi',
        email: 'laura.bianchi@email.it',
        telefono: '+39 339 7654321',
        nazione: 'Italia',
        citta: 'Roma',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Hans',
        cognome: 'Mueller',
        email: 'hans.mueller@email.de',
        telefono: '+49 170 1234567',
        nazione: 'Germania',
        citta: 'Berlin',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Pierre',
        cognome: 'Dupont',
        email: 'pierre.dupont@email.fr',
        telefono: '+33 6 12345678',
        nazione: 'Francia',
        citta: 'Paris',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Giuseppe',
        cognome: 'Verdi',
        email: 'giuseppe.verdi@email.it',
        telefono: '+39 340 9876543',
        nazione: 'Italia',
        citta: 'Napoli',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Anna',
        cognome: 'Neri',
        email: 'anna.neri@email.it',
        telefono: '+39 347 1122334',
        nazione: 'Italia',
        citta: 'Firenze',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Klaus',
        cognome: 'Schmidt',
        email: 'klaus.schmidt@email.de',
        telefono: '+49 171 9876543',
        nazione: 'Germania',
        citta: 'Munich',
      },
    }),
    prisma.ospite.create({
      data: {
        nome: 'Sophie',
        cognome: 'Martin',
        email: 'sophie.martin@email.fr',
        telefono: '+33 6 98765432',
        nazione: 'Francia',
        citta: 'Lyon',
      },
    }),
  ])

  console.log('Ospiti creati:', ospiti.length)

  // Crea prenotazioni per Agosto 2025 (periodo Alta stagione)
  // NOTA: Usa ID fissi (1, 2, 3, 4) per appartamenti
  const prenotazioni = await Promise.all([
    // Prenotazione 1 - Appartamento 1, prima settimana agosto
    prisma.prenotazione.create({
      data: {
        appartamentoId: 1,  // ID fisso
        ospiteId: ospiti[0].id,
        checkIn: new Date('2025-08-02'),
        checkOut: new Date('2025-08-09'),
        numAdulti: 4,
        numBambini: 2,
        biancheria: true,
        bianchieriaSets: 6,
        biancheriaCosto: 60,
        prezzoSoggiorno: 950,
        tassaSoggiorno: 28, // 4 adulti x 7 notti
        totale: 1038,
        acconto: 311.40,
        accontoPagato: true,
        accontoData: new Date('2025-06-15'),
        saldo: 726.60,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'direct',
      },
    }),
    // Prenotazione 2 - Appartamento 2, prima settimana agosto
    prisma.prenotazione.create({
      data: {
        appartamentoId: 2,  // ID fisso
        ospiteId: ospiti[1].id,
        checkIn: new Date('2025-08-02'),
        checkOut: new Date('2025-08-09'),
        numAdulti: 5,
        numBambini: 2,
        biancheria: true,
        bianchieriaSets: 7,
        biancheriaCosto: 70,
        prezzoSoggiorno: 1050,
        tassaSoggiorno: 35, // 5 adulti x 7 notti
        totale: 1155,
        acconto: 346.50,
        accontoPagato: true,
        accontoData: new Date('2025-05-20'),
        saldo: 808.50,
        saldoPagato: true,
        saldoData: new Date('2025-07-25'),
        stato: 'confirmed',
        fonte: 'airbnb',
      },
    }),
    // Prenotazione 3 - Appartamento 3, prima settimana agosto
    prisma.prenotazione.create({
      data: {
        appartamentoId: 3,  // ID fisso
        ospiteId: ospiti[2].id,
        checkIn: new Date('2025-08-02'),
        checkOut: new Date('2025-08-09'),
        numAdulti: 2,
        numBambini: 2,
        biancheria: false,
        prezzoSoggiorno: 650,
        tassaSoggiorno: 14, // 2 adulti x 7 notti
        totale: 664,
        acconto: 199.20,
        accontoPagato: true,
        accontoData: new Date('2025-06-01'),
        saldo: 464.80,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'booking',
      },
    }),
    // Prenotazione 4 - Appartamento 4, prima settimana agosto
    prisma.prenotazione.create({
      data: {
        appartamentoId: 4,  // ID fisso
        ospiteId: ospiti[3].id,
        checkIn: new Date('2025-08-02'),
        checkOut: new Date('2025-08-09'),
        numAdulti: 4,
        numBambini: 1,
        animali: true,
        animaliDettaglio: '1 cane piccolo',
        biancheria: true,
        bianchieriaSets: 5,
        biancheriaCosto: 50,
        prezzoSoggiorno: 950,
        tassaSoggiorno: 28,
        totale: 1028,
        acconto: 308.40,
        accontoPagato: true,
        accontoData: new Date('2025-06-10'),
        saldo: 719.60,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'direct',
      },
    }),
    // Prenotazione 5 - Appartamento 1, seconda settimana agosto
    prisma.prenotazione.create({
      data: {
        appartamentoId: 1,  // ID fisso
        ospiteId: ospiti[4].id,
        checkIn: new Date('2025-08-09'),
        checkOut: new Date('2025-08-16'),
        numAdulti: 3,
        numBambini: 3,
        biancheria: true,
        bianchieriaSets: 6,
        biancheriaCosto: 60,
        prezzoSoggiorno: 950,
        tassaSoggiorno: 21,
        totale: 1031,
        acconto: 309.30,
        accontoPagato: true,
        accontoData: new Date('2025-07-01'),
        saldo: 721.70,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'airbnb',
      },
    }),
    // Prenotazione 6 - Appartamento 2, seconda settimana agosto
    prisma.prenotazione.create({
      data: {
        appartamentoId: 2,  // ID fisso
        ospiteId: ospiti[5].id,
        checkIn: new Date('2025-08-09'),
        checkOut: new Date('2025-08-16'),
        numAdulti: 6,
        numBambini: 1,
        biancheria: true,
        bianchieriaSets: 7,
        biancheriaCosto: 70,
        prezzoSoggiorno: 1050,
        tassaSoggiorno: 42,
        totale: 1162,
        acconto: 348.60,
        accontoPagato: true,
        accontoData: new Date('2025-06-25'),
        saldo: 813.40,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'direct',
      },
    }),
    // Prenotazione 7 - Appartamento 3, settimana Ferragosto (Altissima)
    prisma.prenotazione.create({
      data: {
        appartamentoId: 3,  // ID fisso
        ospiteId: ospiti[6].id,
        checkIn: new Date('2025-08-16'),
        checkOut: new Date('2025-08-23'),
        numAdulti: 2,
        numBambini: 1,
        biancheria: true,
        bianchieriaSets: 3,
        biancheriaCosto: 30,
        prezzoSoggiorno: 750, // Altissima stagione
        tassaSoggiorno: 14,
        totale: 794,
        acconto: 238.20,
        accontoPagato: true,
        accontoData: new Date('2025-07-10'),
        saldo: 555.80,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'booking',
      },
    }),
    // Prenotazione 8 - Appartamento 4, settimana Ferragosto (Altissima)
    prisma.prenotazione.create({
      data: {
        appartamentoId: 4,  // ID fisso
        ospiteId: ospiti[7].id,
        checkIn: new Date('2025-08-16'),
        checkOut: new Date('2025-08-23'),
        numAdulti: 4,
        numBambini: 2,
        biancheria: true,
        bianchieriaSets: 6,
        biancheriaCosto: 60,
        prezzoSoggiorno: 1100, // Altissima stagione
        tassaSoggiorno: 28,
        totale: 1188,
        acconto: 356.40,
        accontoPagato: true,
        accontoData: new Date('2025-07-05'),
        saldo: 831.60,
        saldoPagato: false,
        stato: 'confirmed',
        fonte: 'airbnb',
      },
    }),
  ])

  console.log('Prenotazioni create:', prenotazioni.length)

  // Crea alcuni task con ID appartamento fissi
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        titolo: 'Pulizia Appartamento 1',
        descrizione: 'Pulizia completa post check-out',
        priorita: 'high',
        stato: 'pending',
        categoria: 'pulizie',
        appartamentoId: 1,  // ID fisso
        scadenza: new Date('2025-08-09'),
      },
    }),
    prisma.task.create({
      data: {
        titolo: 'Check-in famiglia Mueller',
        descrizione: 'Accoglienza ospiti tedeschi, App 3',
        priorita: 'medium',
        stato: 'pending',
        categoria: 'check-in',
        appartamentoId: 3,  // ID fisso
        scadenza: new Date('2025-08-02'),
      },
    }),
    prisma.task.create({
      data: {
        titolo: 'Controllo condizionatore App 2',
        descrizione: 'Verificare funzionamento dopo segnalazione',
        priorita: 'medium',
        stato: 'in_progress',
        categoria: 'manutenzione',
        appartamentoId: 2,  // ID fisso
      },
    }),
  ])

  console.log('Task creati:', tasks.length)

  // Crea alcune spese
  const spese = await Promise.all([
    prisma.spesa.create({
      data: {
        categoria: 'pulizie',
        descrizione: 'Pulizia Appartamento 2 - fine luglio',
        importo: 80,
        data: new Date('2025-07-26'),
        fornitore: 'Impresa pulizie Rossi',
        pagato: true,
      },
    }),
    prisma.spesa.create({
      data: {
        categoria: 'utenze',
        descrizione: 'Bolletta elettrica luglio',
        importo: 185,
        data: new Date('2025-08-01'),
        pagato: true,
      },
    }),
    prisma.spesa.create({
      data: {
        categoria: 'manutenzione',
        descrizione: 'Riparazione rubinetto App 3',
        importo: 65,
        data: new Date('2025-07-28'),
        fornitore: 'Idraulico Verdi',
        pagato: true,
      },
    }),
  ])

  console.log('Spese create:', spese.length)

  console.log('Seed completato!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
