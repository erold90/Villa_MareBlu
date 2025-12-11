'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Filter,
  Calendar,
  Home,
  Wrench,
  Sparkles,
  FileText,
  MoreVertical,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDateShort } from '@/lib/utils'

interface Task {
  id: number
  titolo: string
  descrizione: string | null
  priorita: string
  stato: string
  categoria: string
  appartamentoId: number | null
  appartamento: { id: number; nome: string } | null
  scadenza: string | null
  completatoIl: string | null
  createdAt: string
  isOverdue: boolean
}

interface TaskData {
  tasks: Task[]
  counts: {
    pending: number
    inProgress: number
    completed: number
    overdue: number
    total: number
  }
}

const priorityConfig: Record<string, { label: string; className: string; icon: typeof Circle }> = {
  low: { label: 'Bassa', className: 'bg-gray-100 text-gray-700', icon: Circle },
  medium: { label: 'Media', className: 'bg-blue-100 text-blue-700', icon: Clock },
  high: { label: 'Alta', className: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

const categoriaConfig: Record<string, { label: string; icon: typeof Home; color: string }> = {
  pulizie: { label: 'Pulizie', icon: Sparkles, color: 'text-blue-500' },
  manutenzione: { label: 'Manutenzione', icon: Wrench, color: 'text-amber-500' },
  'check-in': { label: 'Check-in', icon: Home, color: 'text-green-500' },
  'check-out': { label: 'Check-out', icon: Home, color: 'text-red-500' },
  amministrazione: { label: 'Amministrazione', icon: FileText, color: 'text-purple-500' },
  generale: { label: 'Generale', icon: Circle, color: 'text-gray-500' },
}

const coloriAppartamenti: Record<number, string> = {
  1: '#3B82F6',
  2: '#10B981',
  3: '#F59E0B',
  4: '#8B5CF6',
}

export default function TaskPage() {
  const [data, setData] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStato, setFilterStato] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [mostraCompletati, setMostraCompletati] = useState(false)

  async function fetchTasks() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (mostraCompletati) {
        params.append('completati', 'true')
      }

      const url = params.toString() ? `/api/task?${params.toString()}` : '/api/task'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Errore nel caricamento')
      const taskData = await response.json()
      setData(taskData)
    } catch (err) {
      setError('Errore nel caricamento dei task')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [mostraCompletati])

  const toggleTaskStatus = async (taskId: number, currentStato: string) => {
    try {
      const nuovoStato = currentStato === 'completed' ? 'pending' : 'completed'

      const response = await fetch('/api/task', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, stato: nuovoStato }),
      })

      if (!response.ok) throw new Error('Errore nell\'aggiornamento')

      // Ricarica i task
      fetchTasks()
    } catch (err) {
      console.error('Errore toggle task:', err)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Task" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Task" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Errore sconosciuto'}</div>
        </div>
      </>
    )
  }

  const { tasks, counts } = data

  const filteredTasks = tasks.filter((task) => {
    const matchStato = filterStato === 'all' || task.stato === filterStato
    const matchCategoria = filterCategoria === 'all' || task.categoria === filterCategoria
    return matchStato && matchCategoria
  })

  return (
    <>
      <Header title="Task" subtitle={`${counts.pending} da completare`} />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setFilterStato(filterStato === 'pending' ? 'all' : 'pending')}
            className={cn(
              'p-4 rounded-xl text-center transition-colors',
              filterStato === 'pending' ? 'bg-amber-100 ring-2 ring-amber-500' : 'bg-white shadow-sm hover:bg-gray-50'
            )}
          >
            <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
            <p className="text-sm text-gray-500">Da fare</p>
          </button>
          <button
            onClick={() => setFilterStato(filterStato === 'in_progress' ? 'all' : 'in_progress')}
            className={cn(
              'p-4 rounded-xl text-center transition-colors',
              filterStato === 'in_progress' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white shadow-sm hover:bg-gray-50'
            )}
          >
            <p className="text-2xl font-bold text-blue-600">{counts.inProgress}</p>
            <p className="text-sm text-gray-500">In corso</p>
          </button>
          <button
            onClick={() => {
              setMostraCompletati(true)
              setFilterStato(filterStato === 'completed' ? 'all' : 'completed')
            }}
            className={cn(
              'p-4 rounded-xl text-center transition-colors',
              filterStato === 'completed' ? 'bg-green-100 ring-2 ring-green-500' : 'bg-white shadow-sm hover:bg-gray-50'
            )}
          >
            <p className="text-2xl font-bold text-green-600">{counts.completed}</p>
            <p className="text-sm text-gray-500">Completate</p>
          </button>
        </div>

        {/* Avviso task scaduti */}
        {counts.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">{counts.overdue} task scadut{counts.overdue === 1 ? 'o' : 'i'}</p>
              <p className="text-sm text-red-700 mt-1">
                Ci sono task con scadenza superata che richiedono attenzione.
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <button
                onClick={() => setFilterCategoria('all')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
                  filterCategoria === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Tutte
              </button>
              {Object.entries(categoriaConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilterCategoria(filterCategoria === key ? 'all' : key)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
                    filterCategoria === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>

            {/* Toggle completati */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={mostraCompletati}
                onChange={(e) => setMostraCompletati(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Mostra completati
            </label>

            {/* Add Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Nuovo Task</span>
            </button>
          </div>
        </div>

        {/* All Filter */}
        {filterStato !== 'all' && (
          <button
            onClick={() => setFilterStato('all')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mostra tutte le task
          </button>
        )}

        {/* Messaggio se non ci sono task */}
        {tasks.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Nessun task attivo</h3>
            <p className="text-gray-500">Non ci sono task da completare al momento.</p>
          </div>
        )}

        {/* Task List */}
        {filteredTasks.length > 0 && (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const priority = priorityConfig[task.priorita] || priorityConfig.medium
              const categoria = categoriaConfig[task.categoria] || categoriaConfig.generale
              const CategoriaIcon = categoria.icon
              const isCompleted = task.stato === 'completed'

              return (
                <div
                  key={task.id}
                  className={cn(
                    'bg-white rounded-xl shadow-sm p-4 transition-opacity',
                    isCompleted && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.stato)}
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-blue-500'
                      )}
                    >
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={cn(
                            'font-medium text-gray-900',
                            isCompleted && 'line-through'
                          )}>
                            {task.titolo}
                          </h3>
                          {task.descrizione && (
                            <p className="text-sm text-gray-500 mt-1">{task.descrizione}</p>
                          )}
                        </div>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        {/* Priority */}
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          priority.className
                        )}>
                          {priority.label}
                        </span>

                        {/* Category */}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <CategoriaIcon className={cn('w-3 h-3', categoria.color)} />
                          {categoria.label}
                        </span>

                        {/* Apartment */}
                        {task.appartamento && (
                          <span
                            className="text-xs px-2 py-1 rounded-full text-white font-medium"
                            style={{ backgroundColor: coloriAppartamenti[task.appartamento.id] || '#6B7280' }}
                          >
                            App {task.appartamento.id}
                          </span>
                        )}

                        {/* Due date */}
                        {task.scadenza && (
                          <span className={cn(
                            'flex items-center gap-1 text-xs',
                            task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                          )}>
                            <Calendar className="w-3 h-3" />
                            {task.isOverdue && 'Scaduto: '}
                            {formatDateShort(task.scadenza)}
                          </span>
                        )}

                        {/* Completed date */}
                        {task.completatoIl && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Completato: {formatDateShort(task.completatoIl)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filteredTasks.length === 0 && tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Nessun task</h3>
            <p className="text-gray-500">Non ci sono task che corrispondono ai filtri selezionati</p>
          </div>
        )}
      </div>
    </>
  )
}
