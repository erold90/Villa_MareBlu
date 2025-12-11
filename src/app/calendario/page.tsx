'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { ChevronLeft, ChevronRight, Plus, Filter, Loader2 } from 'lucide-react'
import { cn, getMonthName, getDayName, isToday } from '@/lib/utils'
import { appartamentiConfig } from '@/config/appartamenti'

interface Prenotazione {
  id: number
  appartamentoId: number
  ospite: string
  checkIn: string
  checkOut: string
  stato: string
  numOspiti: number
}

const statoColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-green-500',
  checkedin: 'bg-blue-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-400',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Start from Monday
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'timeline'>('timeline')
  const [selectedAppartamenti, setSelectedAppartamenti] = useState<number[]>(
    appartamentiConfig.map((a) => a.id)
  )
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([])
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Carica le prenotazioni quando cambia il mese
  useEffect(() => {
    async function fetchPrenotazioni() {
      setLoading(true)
      try {
        const response = await fetch(`/api/calendario?anno=${year}&mese=${month}`)
        if (!response.ok) throw new Error('Errore nel caricamento')
        const data = await response.json()
        setPrenotazioni(data)
      } catch (err) {
        console.error('Errore caricamento calendario:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrenotazioni()
  }, [year, month])

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const toggleAppartamento = (id: number) => {
    setSelectedAppartamenti((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const getPrenotazioniForDay = (day: number, appartamentoId: number) => {
    const date = new Date(year, month, day)
    return prenotazioni.filter((p) => {
      if (p.appartamentoId !== appartamentoId) return false
      const checkIn = new Date(p.checkIn)
      const checkOut = new Date(p.checkOut)
      return date >= checkIn && date < checkOut
    })
  }

  const isCheckIn = (day: number, prenotazione: Prenotazione) => {
    const checkIn = new Date(prenotazione.checkIn)
    return checkIn.getDate() === day &&
      checkIn.getMonth() === month &&
      checkIn.getFullYear() === year
  }

  const isCheckOut = (day: number, prenotazione: Prenotazione) => {
    const checkOut = new Date(prenotazione.checkOut)
    return checkOut.getDate() === day &&
      checkOut.getMonth() === month &&
      checkOut.getFullYear() === year
  }

  // Generate array of days for timeline
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <>
      <Header
        title="Calendario"
        subtitle={`${getMonthName(month)} ${year}`}
        showAddButton
        addButtonHref="/prenotazioni/nuova"
        addButtonLabel="Nuova"
      />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Oggi
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="ml-2 font-semibold text-gray-900">
                {getMonthName(month)} {year}
              </span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Mese
              </button>
            </div>

            {/* Apartment Filters */}
            <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              {appartamentiConfig.map((app) => (
                <button
                  key={app.id}
                  onClick={() => toggleAppartamento(app.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    selectedAppartamenti.includes(app.id)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-500'
                  )}
                  style={{
                    backgroundColor: selectedAppartamenti.includes(app.id)
                      ? app.colore
                      : undefined,
                  }}
                >
                  App {app.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Timeline View */}
        {!loading && viewMode === 'timeline' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Header with days */}
                <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="w-32 lg:w-40 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 font-semibold text-gray-700">
                    Appartamento
                  </div>
                  <div className="flex flex-1">
                    {days.map((day) => {
                      const date = new Date(year, month, day)
                      const isTodayDate = isToday(date)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      return (
                        <div
                          key={day}
                          className={cn(
                            'flex-1 min-w-[40px] p-2 text-center border-r border-gray-100 last:border-r-0',
                            isWeekend && 'bg-gray-50',
                            isTodayDate && 'bg-blue-50'
                          )}
                        >
                          <p className="text-xs text-gray-500">{getDayName(date.getDay())}</p>
                          <p className={cn(
                            'text-sm font-semibold',
                            isTodayDate ? 'text-blue-600' : 'text-gray-900'
                          )}>
                            {day}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rows for each apartment */}
                {appartamentiConfig
                  .filter((app) => selectedAppartamenti.includes(app.id))
                  .map((app) => (
                    <div key={app.id} className="flex border-b border-gray-100 last:border-b-0">
                      <div className="w-32 lg:w-40 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: app.colore }}
                          >
                            {app.id}
                          </div>
                          <div className="hidden lg:block">
                            <p className="font-medium text-gray-900 text-sm">{app.nome}</p>
                            <p className="text-xs text-gray-500">{app.postiLetto} posti</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-1 relative min-h-[60px]">
                        {days.map((day) => {
                          const date = new Date(year, month, day)
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6
                          const prenotazioniGiorno = getPrenotazioniForDay(day, app.id)
                          return (
                            <div
                              key={day}
                              className={cn(
                                'flex-1 min-w-[40px] border-r border-gray-100 last:border-r-0 relative',
                                isWeekend && 'bg-gray-50/50',
                                isToday(date) && 'bg-blue-50/50'
                              )}
                            >
                              {prenotazioniGiorno.map((pren) => (
                                <div
                                  key={pren.id}
                                  className={cn(
                                    'absolute top-2 bottom-2 flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity',
                                    statoColors[pren.stato] || 'bg-green-500',
                                    isCheckIn(day, pren) ? 'left-0 rounded-l-lg' : 'left-0',
                                    isCheckOut(day, pren) ? 'right-0 rounded-r-lg' : 'right-0'
                                  )}
                                  title={`${pren.ospite} - ${pren.numOspiti} ospiti`}
                                >
                                  {isCheckIn(day, pren) && (
                                    <span className="px-2 truncate">{pren.ospite.split(' ')[0]}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Month View */}
        {!loading && viewMode === 'month' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Days Header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-gray-50/50 border-b border-r border-gray-100" />
              ))}

              {/* Days of the month */}
              {days.map((day) => {
                const date = new Date(year, month, day)
                const isTodayDate = isToday(date)
                const allPrenotazioni = appartamentiConfig
                  .filter((app) => selectedAppartamenti.includes(app.id))
                  .flatMap((app) =>
                    getPrenotazioniForDay(day, app.id).map((p) => ({
                      ...p,
                      colore: app.colore,
                    }))
                  )

                return (
                  <div
                    key={day}
                    className={cn(
                      'min-h-[100px] p-2 border-b border-r border-gray-100',
                      isTodayDate && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold',
                        isTodayDate ? 'bg-blue-600 text-white' : 'text-gray-900'
                      )}>
                        {day}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {allPrenotazioni.slice(0, 3).map((pren) => (
                        <div
                          key={pren.id}
                          className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: pren.colore }}
                        >
                          {isCheckIn(day, pren) && '> '}
                          {pren.ospite.split(' ')[0]}
                          {isCheckOut(day, pren) && ' <'}
                        </div>
                      ))}
                      {allPrenotazioni.length > 3 && (
                        <div className="text-xs text-gray-500 pl-2">
                          +{allPrenotazioni.length - 3} altri
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Legenda</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-yellow-400" />
              <span className="text-sm text-gray-600">In attesa</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-gray-600">Confermata</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm text-gray-600">Check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gray-400" />
              <span className="text-sm text-gray-600">Completata</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-red-400" />
              <span className="text-sm text-gray-600">Cancellata</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
