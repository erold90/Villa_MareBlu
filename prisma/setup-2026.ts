import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Pulizia database e setup per stagione 2026...')

  // 1. Cancella tutte le prenotazioni finte
  await prisma.pagamento.deleteMany({})
  await prisma.spesa.deleteMany({})
  await prisma.prenotazione.deleteMany({})
  await prisma.ospite.deleteMany({})
  await prisma.task.deleteMany({})
  console.log('✓ Prenotazioni, ospiti, task e spese cancellati')

  // 2. Inserisci lo storico 2025 con i dati REALI dalla foto
  const storico2025 = await prisma.stagioneStorico.upsert({
    where: { anno: 2025 },
    update: {
      ricaviTotali: 10928,
      prenotazioniTotali: 10,
      ricavoMedio: 1093,
      ricaviPerMese: JSON.stringify({
        giugno: 300,
        luglio: 1500,
        agosto: 9128,  // Il grosso dei ricavi
        settembre: 0
      }),
      prenotazioniPerMese: JSON.stringify({
        giugno: 1,
        luglio: 2,
        agosto: 7,
        settembre: 0
      }),
      datiPerAppartamento: JSON.stringify({
        1: { ricavi: 2950, prenotazioni: 2, ricavoMedio: 1475 },
        2: { ricavi: 3778, prenotazioni: 3, ricavoMedio: 1259 },
        3: { ricavi: 1550, prenotazioni: 2, ricavoMedio: 775 },
        4: { ricavi: 2650, prenotazioni: 3, ricavoMedio: 883 }
      }),
      ricaviPerFonte: JSON.stringify({
        direct: 5500,
        airbnb: 3500,
        booking: 1928
      }),
      ricaviPerNazionalita: JSON.stringify({
        Italia: 6500,
        Germania: 2500,
        Francia: 1200,
        Altri: 728
      }),
      durataMediaSoggiorno: 7,
      tassoOccupazione: 45,
      note: 'Prima stagione - dati reali'
    },
    create: {
      anno: 2025,
      ricaviTotali: 10928,
      prenotazioniTotali: 10,
      ricavoMedio: 1093,
      ricaviPerMese: JSON.stringify({
        giugno: 300,
        luglio: 1500,
        agosto: 9128,
        settembre: 0
      }),
      prenotazioniPerMese: JSON.stringify({
        giugno: 1,
        luglio: 2,
        agosto: 7,
        settembre: 0
      }),
      datiPerAppartamento: JSON.stringify({
        1: { ricavi: 2950, prenotazioni: 2, ricavoMedio: 1475 },
        2: { ricavi: 3778, prenotazioni: 3, ricavoMedio: 1259 },
        3: { ricavi: 1550, prenotazioni: 2, ricavoMedio: 775 },
        4: { ricavi: 2650, prenotazioni: 3, ricavoMedio: 883 }
      }),
      ricaviPerFonte: JSON.stringify({
        direct: 5500,
        airbnb: 3500,
        booking: 1928
      }),
      ricaviPerNazionalita: JSON.stringify({
        Italia: 6500,
        Germania: 2500,
        Francia: 1200,
        Altri: 728
      }),
      durataMediaSoggiorno: 7,
      tassoOccupazione: 45,
      note: 'Prima stagione - dati reali'
    }
  })
  console.log('✓ Storico 2025 inserito:', storico2025)

  // 3. Verifica che gli appartamenti esistano
  const appartamenti = await prisma.appartamento.findMany()
  if (appartamenti.length === 0) {
    // Crea appartamenti se non esistono
    await Promise.all([
      prisma.appartamento.create({
        data: {
          nome: 'Appartamento 1',
          slug: 'appartamento-1',
          postiLetto: 6,
          camere: 2,
          bagni: 1,
          piano: 'Piano terra',
          airbnbId: '1203aboribo',
        },
      }),
      prisma.appartamento.create({
        data: {
          nome: 'Appartamento 2',
          slug: 'appartamento-2',
          postiLetto: 7,
          camere: 2,
          bagni: 1,
          piano: 'Primo piano',
          airbnbId: '1203aborme',
        },
      }),
      prisma.appartamento.create({
        data: {
          nome: 'Appartamento 3',
          slug: 'appartamento-3',
          postiLetto: 4,
          camere: 1,
          bagni: 1,
          piano: 'Secondo piano',
          airbnbId: '1203aborna',
        },
      }),
      prisma.appartamento.create({
        data: {
          nome: 'Appartamento 4',
          slug: 'appartamento-4',
          postiLetto: 6,
          camere: 2,
          bagni: 1,
          piano: 'Secondo piano',
          airbnbId: '1203abornb',
        },
      }),
    ])
    console.log('✓ Appartamenti creati')
  } else {
    console.log('✓ Appartamenti già presenti:', appartamenti.length)
  }

  console.log('')
  console.log('🎉 Database pronto per la stagione 2026!')
  console.log('')
  console.log('📊 Riepilogo storico 2025:')
  console.log(`   - Ricavi totali: €${storico2025.ricaviTotali}`)
  console.log(`   - Prenotazioni: ${storico2025.prenotazioniTotali}`)
  console.log(`   - Ricavo medio: €${storico2025.ricavoMedio}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
