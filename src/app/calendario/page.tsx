'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ChevronLeft, ChevronRight, Plus, Filter, Loader2, X, Phone, Mail, MapPin, Calendar, Users, CreditCard, Dog, Bed, Edit } from 'lucide-react'
import { cn, getMonthName, getDayName, isToday, formatPrice, formatDate } from '@/lib/utils'
import { appartamentiConfig } from '@/config/appartamenti'

interface Prenotazione {
  id: number
  appartamentoId: number
  ospite: string
  ospiteCognome: string
  ospiteNome: string
  ospiteEmail: string | null
  ospiteTelefono: string | null
  ospiteNazione: string | null
  checkIn: string
  checkOut: string
  stato: string
  numAdulti: number
  numBambini: number
  numOspiti: number
  animali: boolean
  animaliDettaglio: string | null
  biancheria: boolean
  biancheriaCosto: number
  totale: number
  acconto: number
  saldo: number
  accontoPagato: boolean
  saldoPagato: boolean
  fonte: string
  appartamentoNome: string
  appartamentoColore: string | null
}

const statoColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-green-500',
  checkedin: 'bg-blue-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-400',
}

const statoConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'In attesa', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confermata', className: 'bg-green-100 text-green-800' },
  checkedin: { label: 'Check-in', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completata', className: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancellata', className: 'bg-red-100 text-red-800' },
}

const fonteConfig: Record<string, { label: string; className: string }> = {
  direct: { label: 'Diretto', className: 'bg-purple-100 text-purple-700' },
  airbnb: { label: 'Airbnb', className: 'bg-rose-100 text-rose-700' },
  booking: { label: 'Booking', className: 'bg-blue-100 text-blue-700' },
  altro: { label: 'Altro', className: 'bg-gray-100 text-gray-700' },
}

// Tronca il cognome se troppo lungo
function truncateCognome(cognome: string, maxLength: number = 8): string {
  if (cognome.length <= maxLength) return cognome
  return cognome.substring(0, maxLength - 1) + '…'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Start from Monday
}

export default function CalendarioPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'timeline'>('timeline')
  const [selectedAppartamenti, setSelectedAppartamenti] = useState<number[]>(
    appartamentiConfig.map((a) => a.id)
  )
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [selectedPrenotazione, setSelectedPrenotazione] = useState<Prenotazione | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Funzione per aprire il modal con i dettagli
  const handlePrenotazioneClick = (pren: Prenotazione) => {
    setSelectedPrenotazione(pren)
    setShowModal(true)
  }

  // Funzione per andare alla modifica
  const handleEdit = (pren: Prenotazione) => {
    router.push(`/prenotazioni/${pren.id}/modifica`)
  }

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
                                  onClick={() => handlePrenotazioneClick(pren)}
                                  className={cn(
                                    'absolute top-2 bottom-2 flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-all',
                                    statoColors[pren.stato] || 'bg-green-500',
                                    isCheckIn(day, pren) ? 'left-0 rounded-l-lg' : 'left-0',
                                    isCheckOut(day, pren) ? 'right-0 rounded-r-lg' : 'right-0'
                                  )}
                                  title={`${pren.ospite} - ${pren.numOspiti} ospiti`}
                                >
                                  {isCheckIn(day, pren) && (
                                    <span className="px-2 truncate">{truncateCognome(pren.ospiteCognome)}</span>
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
                          onClick={() => handlePrenotazioneClick(pren)}
                          className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-all"
                          style={{ backgroundColor: pren.colore }}
                        >
                          {isCheckIn(day, pren) && '→ '}
                          {truncateCognome(pren.ospiteCognome)}
                          {isCheckOut(day, pren) && ' ←'}
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

      {/* Modal Dettaglio Prenotazione */}
      {showModal && selectedPrenotazione && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dettaglio Prenotazione</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenuto Modal */}
            <div className="p-6 space-y-5">
              {/* Appartamento */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: selectedPrenotazione.appartamentoColore || '#3B82F6' }}
                >
                  {selectedPrenotazione.appartamentoId}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedPrenotazione.appartamentoNome}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statoConfig[selectedPrenotazione.stato]?.className)}>
                      {statoConfig[selectedPrenotazione.stato]?.label}
                    </span>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', fonteConfig[selectedPrenotazione.fonte]?.className)}>
                      {fonteConfig[selectedPrenotazione.fonte]?.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ospite */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Ospite
                </h4>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedPrenotazione.ospiteCognome} {selectedPrenotazione.ospiteNome}
                </p>
                {selectedPrenotazione.ospiteEmail && (
                  <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${selectedPrenotazione.ospiteEmail}`} className="hover:underline">
                      {selectedPrenotazione.ospiteEmail}
                    </a>
                  </p>
                )}
                {selectedPrenotazione.ospiteTelefono && (
                  <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${selectedPrenotazione.ospiteTelefono}`} className="hover:underline">
                      {selectedPrenotazione.ospiteTelefono}
                    </a>
                  </p>
                )}
                {selectedPrenotazione.ospiteNazione && (
                  <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {selectedPrenotazione.ospiteNazione}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Check-in
                  </h4>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatDate(selectedPrenotazione.checkIn)}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Check-out
                  </h4>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {formatDate(selectedPrenotazione.checkOut)}
                  </p>
                </div>
              </div>

              {/* Composizione */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Ospiti</h4>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Adulti:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">{selectedPrenotazione.numAdulti}</span>
                  </div>
                  {selectedPrenotazione.numBambini > 0 && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Bambini:</span>
                      <span className="ml-2 font-semibold text-gray-900 dark:text-white">{selectedPrenotazione.numBambini}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra */}
              {(selectedPrenotazione.animali || selectedPrenotazione.biancheria) && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Extra</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedPrenotazione.animali && (
                      <span className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-lg">
                        <Dog className="w-4 h-4" />
                        Animali{selectedPrenotazione.animaliDettaglio && `: ${selectedPrenotazione.animaliDettaglio}`}
                      </span>
                    )}
                    {selectedPrenotazione.biancheria && (
                      <span className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg">
                        <Bed className="w-4 h-4" />
                        Biancheria ({formatPrice(selectedPrenotazione.biancheriaCosto)})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Pagamento */}
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pagamento
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Totale:</span>
                    <span className="text-xl font-bold text-green-700 dark:text-green-300">{formatPrice(selectedPrenotazione.totale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Acconto:</span>
                    <span className={cn('font-semibold', selectedPrenotazione.accontoPagato ? 'text-green-600' : 'text-amber-600')}>
                      {formatPrice(selectedPrenotazione.acconto)} {selectedPrenotazione.accontoPagato ? '(Pagato)' : '(Da pagare)'}
                    </span>
                  </div>
                  {selectedPrenotazione.saldo > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Saldo:</span>
                      <span className={cn('font-semibold', selectedPrenotazione.saldoPagato ? 'text-green-600' : 'text-red-600')}>
                        {formatPrice(selectedPrenotazione.saldo)} {selectedPrenotazione.saldoPagato ? '(Pagato)' : '(Da pagare)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Chiudi
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  handleEdit(selectedPrenotazione)
                }}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifica
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
