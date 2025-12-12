import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Aggiornamento prezzi Agosto 2026...\n')

  // Date di riferimento
  const inizioPrimaSettimana = new Date('2026-08-01')
  const finePrimaSettimana = new Date('2026-08-08')
  const inizioSecondaSettimana = new Date('2026-08-08')
  const fineSecondaSettimana = new Date('2026-08-15')

  // 1. Leggi i prezzi attuali per tutti gli appartamenti
  const prezziPrimaSettimana = await prisma.periodoPrezzo.findMany({
    where: {
      dataInizio: { lte: inizioPrimaSettimana },
      dataFine: { gte: finePrimaSettimana },
    },
    include: { appartamento: true },
  })

  const prezziSecondaSettimana = await prisma.periodoPrezzo.findMany({
    where: {
      dataInizio: { lte: inizioSecondaSettimana },
      dataFine: { gte: fineSecondaSettimana },
    },
    include: { appartamento: true },
  })

  console.log('📋 Prezzi attuali 01-08 Agosto 2026:')
  if (prezziPrimaSettimana.length === 0) {
    console.log('   Nessun periodo prezzo trovato per 01-08 Agosto')
  } else {
    prezziPrimaSettimana.forEach(p => {
      console.log(`   ${p.appartamento.nome}: €${p.prezzoSettimana}/sett (€${p.prezzoNotte}/notte)`)
    })
  }

  console.log('\n📋 Prezzi attuali 08-15 Agosto 2026:')
  if (prezziSecondaSettimana.length === 0) {
    console.log('   Nessun periodo prezzo trovato per 08-15 Agosto')
  } else {
    prezziSecondaSettimana.forEach(p => {
      console.log(`   ${p.appartamento.nome}: €${p.prezzoSettimana}/sett (€${p.prezzoNotte}/notte)`)
    })
  }

  // 2. Aggiorna i prezzi della prima settimana con quelli della seconda
  if (prezziPrimaSettimana.length > 0 && prezziSecondaSettimana.length > 0) {
    console.log('\n🔄 Aggiornamento in corso...')

    for (const p1 of prezziPrimaSettimana) {
      const p2 = prezziSecondaSettimana.find(p => p.appartamentoId === p1.appartamentoId)
      if (p2) {
        await prisma.periodoPrezzo.update({
          where: { id: p1.id },
          data: {
            prezzoSettimana: p2.prezzoSettimana,
            prezzoNotte: p2.prezzoNotte,
          },
        })
        console.log(`   ✓ ${p1.appartamento.nome}: €${p1.prezzoSettimana} → €${p2.prezzoSettimana}`)
      }
    }

    console.log('\n✅ Prezzi aggiornati con successo!')
  } else {
    console.log('\n⚠️ Non è stato possibile aggiornare: periodi mancanti')
    console.log('   Potrebbero non esistere ancora i periodi per il 2026.')
    console.log('   Verifica i periodi nel database con: npx prisma studio')
  }

  // 3. Mostra tutti i periodi prezzo del 2026
  console.log('\n📅 Tutti i periodi prezzo 2026:')
  const tuttiPrezzi2026 = await prisma.periodoPrezzo.findMany({
    where: {
      dataInizio: { gte: new Date('2026-01-01') },
      dataFine: { lte: new Date('2026-12-31') },
    },
    include: { appartamento: true },
    orderBy: [{ appartamentoId: 'asc' }, { dataInizio: 'asc' }],
  })

  if (tuttiPrezzi2026.length === 0) {
    console.log('   Nessun periodo prezzo trovato per il 2026')
  } else {
    let currentApp = 0
    tuttiPrezzi2026.forEach(p => {
      if (p.appartamentoId !== currentApp) {
        currentApp = p.appartamentoId
        console.log(`\n   ${p.appartamento.nome}:`)
      }
      const inizio = p.dataInizio.toISOString().split('T')[0]
      const fine = p.dataFine.toISOString().split('T')[0]
      console.log(`     ${p.nome}: ${inizio} - ${fine} → €${p.prezzoSettimana}/sett`)
    })
  }
}

main()
  .catch((e) => {
    console.error('Errore:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
