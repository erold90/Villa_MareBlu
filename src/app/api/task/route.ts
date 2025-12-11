import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mostraCompletati = searchParams.get('completati') === 'true'
    const mostraTutti = searchParams.get('tutti') === 'true'

    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    // Costruisci il filtro
    let whereClause: any = {}

    if (mostraTutti) {
      // Mostra tutti i task
      whereClause = {}
    } else if (mostraCompletati) {
      // Mostra anche completati ma solo degli ultimi 30 giorni
      const trentaGiorniFa = new Date(oggi)
      trentaGiorniFa.setDate(trentaGiorniFa.getDate() - 30)
      whereClause = {
        OR: [
          { stato: { in: ['pending', 'in_progress'] } },
          {
            stato: 'completed',
            completatoIl: { gte: trentaGiorniFa },
          },
        ],
      }
    } else {
      // Default: solo task attivi (non completati)
      whereClause = {
        stato: { in: ['pending', 'in_progress'] },
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [
        { stato: 'asc' }, // pending/in_progress prima di completed
        { priorita: 'desc' },
        { scadenza: 'asc' },
      ],
    })

    // Recupera gli appartamenti per i task che ne hanno uno
    const appartamentiIds = [...new Set(tasks.filter(t => t.appartamentoId).map(t => t.appartamentoId!))]
    const appartamenti = appartamentiIds.length > 0
      ? await prisma.appartamento.findMany({
          where: { id: { in: appartamentiIds } },
        })
      : []
    const appartamentiMap = Object.fromEntries(appartamenti.map(a => [a.id, a]))

    // Formatta i task
    const tasksFormattati = tasks.map(task => {
      const isOverdue = task.stato !== 'completed' && task.scadenza && new Date(task.scadenza) < oggi
      const appartamento = task.appartamentoId ? appartamentiMap[task.appartamentoId] : null

      return {
        id: task.id,
        titolo: task.titolo,
        descrizione: task.descrizione,
        priorita: task.priorita,
        stato: task.stato,
        categoria: task.categoria,
        appartamentoId: task.appartamentoId,
        appartamento: appartamento ? { id: appartamento.id, nome: appartamento.nome } : null,
        scadenza: task.scadenza?.toISOString().split('T')[0] || null,
        completatoIl: task.completatoIl?.toISOString().split('T')[0] || null,
        createdAt: task.createdAt.toISOString().split('T')[0],
        isOverdue,
      }
    })

    // Conteggi
    const pendingCount = tasks.filter(t => t.stato === 'pending').length
    const inProgressCount = tasks.filter(t => t.stato === 'in_progress').length
    const completedCount = tasks.filter(t => t.stato === 'completed').length
    const overdueCount = tasksFormattati.filter(t => t.isOverdue).length

    return NextResponse.json({
      tasks: tasksFormattati,
      counts: {
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        overdue: overdueCount,
        total: tasks.length,
      },
    })
  } catch (error) {
    console.error('Errore API Task:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei task' },
      { status: 500 }
    )
  }
}

// PATCH per aggiornare lo stato di un task
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, stato } = body

    if (!id || !stato) {
      return NextResponse.json(
        { error: 'ID e stato sono richiesti' },
        { status: 400 }
      )
    }

    const updateData: any = { stato }

    // Se completato, aggiungi la data
    if (stato === 'completed') {
      updateData.completatoIl = new Date()
    } else {
      updateData.completatoIl = null
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Errore aggiornamento Task:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del task' },
      { status: 500 }
    )
  }
}
