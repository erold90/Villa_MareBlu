'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import Header from '@/components/layout/Header'
import {
  Sparkles,
  Calendar,
  Plus,
  Check,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Pulizia {
  id: number | string
  appartamentoId: number
  data: string
  tipo: string
  stato: string
  orarioCheckout: string | null
  note: string | null
  isAutomatic?: boolean
}

interface PulizieData {
  pulizie: Pulizia[]
  puliziePerData: Record<string, Pulizia[]>
  stats: {
    totale: number
    daFare: number
    completate: number
  }
  appartamenti: { id: number; nome: string }[]
  periodo: { da: string; a: string }
}

const tipoLabels: Record<string, string> = {
  checkout: 'Cambio ospiti',
  pre_checkin: 'Pre check-in',
  apertura_stagione: 'Apertura stagione',
  chiusura_stagione: 'Chiusura stagione',
  manuale: 'Manuale',
  suggerita: 'Suggerita',
}

const coloriAppartamenti: Record<number, string> = {
  1: '#3B82F6',
  2: '#10B981',
  3: '#F59E0B',
  4: '#8B5CF6',
}

// Calcola la stagione corrente
function getStagioneCorrente(): number {
  const oggi = new Date()
  const anno = oggi.getFullYear()
  const mese = oggi.getMonth()
  const giorno = oggi.getDate()

  // Giugno-Settembre = anno corrente, Ottobre-Maggio = anno successivo
  if (mese >= 5 && mese <= 8) {
    if (mese === 8 && giorno > 30) return anno + 1
    return anno
  }
  if (mese > 8) return anno + 1
  return anno
}

// Calcola la prima settimana della stagione (ultima settimana di maggio)
function getSettimanaInizioStagione(anno: number): Date {
  const inizioGiugno = new Date(anno, 4, 25) // 25 Maggio
  const giorno = inizioGiugno.getDay()
  // Trova il lunedì della settimana
  const lunedi = new Date(inizioGiugno)
  lunedi.setDate(inizioGiugno.getDate() - (giorno === 0 ? 6 : giorno - 1))
  return lunedi
}

export default function PuliziePage() {
  const [data, setData] = useState<PulizieData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settimanaOffset, setSettimanaOffset] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [stagioneSelezionata, setStagioneSelezionata] = useState(() => getStagioneCorrente())
  const [nuovaPulizia, setNuovaPulizia] = useState({
    appartamentoId: '',
    data: '',
    orarioCheckout: '10:00',
    note: '',
  })

  // Calcola date settimana corrente basata sulla stagione selezionata
  const oggi = new Date()

  // Se siamo nella stagione corrente e siamo nel periodo giusto, usa oggi come base
  // Altrimenti, vai alla prima settimana della stagione selezionata
  const baseDate = useMemo(() => {
    const stagioneCorrente = getStagioneCorrente()
    const mese = oggi.getMonth()

    // Se la stagione selezionata è la corrente E siamo tra maggio e settembre
    if (stagioneSelezionata === stagioneCorrente && mese >= 4 && mese <= 8) {
      return oggi
    }
    // Altrimenti vai alla prima settimana della stagione selezionata
    return getSettimanaInizioStagione(stagioneSelezionata)
  }, [stagioneSelezionata])

  const inizioSettimana = new Date(baseDate)
  inizioSettimana.setDate(baseDate.getDate() - baseDate.getDay() + 1 + settimanaOffset * 7) // Lunedì
  const fineSettimana = new Date(inizioSettimana)
  fineSettimana.setDate(inizioSettimana.getDate() + 6) // Domenica

  async function fetchPulizie() {
    try {
      setLoading(true)
      const da = inizioSettimana.toISOString().split('T')[0]
      const a = fineSettimana.toISOString().split('T')[0]

      const response = await fetch(`/api/pulizie?da=${da}&a=${a}`)
      if (!response.ok) throw new Error('Errore nel caricamento')
      const pulizieData = await response.json()
      setData(pulizieData)
    } catch (err) {
      setError('Errore nel caricamento delle pulizie')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPulizie()
  }, [settimanaOffset, stagioneSelezionata])

  // Reset offset quando cambia stagione
  useEffect(() => {
    setSettimanaOffset(0)
  }, [stagioneSelezionata])

  const togglePuliziaStato = async (pulizia: Pulizia) => {
    if (typeof pulizia.id === 'string' && pulizia.isAutomatic) {
      // È una pulizia automatica, prima devo crearla nel DB
      try {
        const response = await fetch('/api/pulizie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appartamentoId: pulizia.appartamentoId,
            data: pulizia.data,
            tipo: pulizia.tipo,
            orarioCheckout: pulizia.orarioCheckout,
          }),
        })
        if (!response.ok) throw new Error('Errore')

        const newPulizia = await response.json()

        // Ora la segno come completata
        await fetch('/api/pulizie', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newPulizia.id, stato: 'completata' }),
        })

        fetchPulizie()
      } catch (err) {
        console.error('Errore:', err)
      }
    } else {
      // Pulizia esistente, toggle stato
      try {
        const nuovoStato = pulizia.stato === 'completata' ? 'da_fare' : 'completata'
        await fetch('/api/pulizie', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pulizia.id, stato: nuovoStato }),
        })
        fetchPulizie()
      } catch (err) {
        console.error('Errore:', err)
      }
    }
  }

  const aggiungiPulizia = async () => {
    if (!nuovaPulizia.appartamentoId || !nuovaPulizia.data) return

    try {
      await fetch('/api/pulizie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appartamentoId: parseInt(nuovaPulizia.appartamentoId),
          data: nuovaPulizia.data,
          tipo: 'manuale',
          orarioCheckout: nuovaPulizia.orarioCheckout || null,
          note: nuovaPulizia.note || null,
        }),
      })
      setShowAddModal(false)
      setNuovaPulizia({ appartamentoId: '', data: '', orarioCheckout: '10:00', note: '' })
      fetchPulizie()
    } catch (err) {
      console.error('Errore:', err)
    }
  }

  const generaPDF = useCallback(() => {
    if (!data) return

    const giorniSettimana = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

    // Crea documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = 20

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('PULIZIE - Villa MareBlu', pageWidth / 2, y, { align: 'center' })

    y += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Settimana: ${formatDate(inizioSettimana.toISOString())} - ${formatDate(fineSettimana.toISOString())}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    )

    y += 15

    // Per ogni giorno della settimana
    for (let i = 0; i < 7; i++) {
      const giorno = new Date(inizioSettimana)
      giorno.setDate(inizioSettimana.getDate() + i)
      const giornoKey = giorno.toISOString().split('T')[0]
      const pulizieGiorno = data.puliziePerData[giornoKey] || []

      // Controlla se serve nuova pagina
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      // Giorno header
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `${giorniSettimana[i]} ${giorno.getDate()}/${giorno.getMonth() + 1}`,
        margin + 2,
        y
      )
      y += 8

      if (pulizieGiorno.length === 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('Nessuna pulizia programmata', margin + 5, y)
        doc.setTextColor(0, 0, 0)
        y += 8
      } else {
        pulizieGiorno.forEach(p => {
          // Checkbox vuoto
          doc.setDrawColor(100, 100, 100)
          doc.rect(margin + 3, y - 3, 4, 4)

          // Testo pulizia
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')

          let testo = `App ${p.appartamentoId}`
          if (p.orarioCheckout) {
            testo += ` - ore ${p.orarioCheckout}`
          }

          // Tipo pulizia
          const tipoLabel = tipoLabels[p.tipo] || p.tipo
          testo += ` (${tipoLabel})`

          doc.text(testo, margin + 10, y)

          // Note se presenti
          if (p.note) {
            y += 5
            doc.setFontSize(9)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(100, 100, 100)
            doc.text(`→ ${p.note}`, margin + 10, y)
            doc.setTextColor(0, 0, 0)
          }

          y += 7
        })
      }

      y += 5
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
      pageWidth / 2,
      285,
      { align: 'center' }
    )

    // Salva il PDF
    doc.save(`pulizie_${inizioSettimana.toISOString().split('T')[0]}.pdf`)
  }, [data, inizioSettimana, fineSettimana])

  if (loading) {
    return (
      <>
        <Header title="Pulizie" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Pulizie" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Errore sconosciuto'}</div>
        </div>
      </>
    )
  }

  const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  return (
    <>
      <Header title="Pulizie" subtitle={`${data.stats.daFare} da fare`} />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Selettore stagione */}
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">Stagione:</span>
          <select
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            {[2025, 2026, 2027].map(anno => (
              <option key={anno} value={anno}>
                {anno} {anno === getStagioneCorrente() && '(corrente)'}
              </option>
            ))}
          </select>
        </div>

        {/* Navigazione settimana + azioni */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSettimanaOffset(s => s - 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatDate(inizioSettimana.toISOString())} - {formatDate(fineSettimana.toISOString())}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stagione {stagioneSelezionata}
                {settimanaOffset !== 0 && (
                  <span className="ml-2">
                    ({settimanaOffset > 0 ? `+${settimanaOffset}` : settimanaOffset} sett.)
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={() => setSettimanaOffset(s => s + 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {settimanaOffset !== 0 && (
              <button
                onClick={() => setSettimanaOffset(0)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Inizio
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={generaPDF}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <FileText className="w-4 h-4" />
              Genera PDF
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{data.stats.totale}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Totale</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{data.stats.daFare}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Da fare</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{data.stats.completate}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completate</p>
          </div>
        </div>


        {/* Calendario settimana */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {giorniSettimana.map((giorno, i) => {
              const data = new Date(inizioSettimana)
              data.setDate(inizioSettimana.getDate() + i)
              const isOggi = data.toDateString() === oggi.toDateString()
              const isSabato = i === 5

              return (
                <div
                  key={giorno}
                  className={cn(
                    'p-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                    isOggi && 'bg-blue-50 dark:bg-blue-900/30',
                    isSabato && 'bg-amber-50 dark:bg-amber-900/20'
                  )}
                >
                  <p className={cn(
                    'text-sm font-medium',
                    isOggi ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
                  )}>
                    {giorno}
                  </p>
                  <p className={cn(
                    'text-lg font-bold',
                    isOggi ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  )}>
                    {data.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-7 min-h-[200px]">
            {[0, 1, 2, 3, 4, 5, 6].map(i => {
              const giorno = new Date(inizioSettimana)
              giorno.setDate(inizioSettimana.getDate() + i)
              const giornoKey = giorno.toISOString().split('T')[0]
              const pulizieGiorno = data.puliziePerData[giornoKey] || []
              const isOggi = giorno.toDateString() === oggi.toDateString()
              const isSabato = i === 5

              return (
                <div
                  key={i}
                  className={cn(
                    'p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-h-[200px]',
                    isOggi && 'bg-blue-50/50 dark:bg-blue-900/20',
                    isSabato && 'bg-amber-50/50 dark:bg-amber-900/10'
                  )}
                >
                  {pulizieGiorno.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">-</p>
                  ) : (
                    <div className="space-y-2">
                      {pulizieGiorno.map((pulizia, idx) => (
                        <div
                          key={`${pulizia.id}-${idx}`}
                          className={cn(
                            'rounded-lg p-2 text-sm cursor-pointer transition-opacity',
                            pulizia.stato === 'completata'
                              ? 'bg-green-100 dark:bg-green-900/40 opacity-60'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          )}
                          onClick={() => togglePuliziaStato(pulizia)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: coloriAppartamenti[pulizia.appartamentoId] || '#6B7280' }}
                            >
                              {pulizia.appartamentoId}
                            </div>
                            <div className="flex-1 min-w-0">
                              {pulizia.orarioCheckout && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  ore {pulizia.orarioCheckout}
                                </p>
                              )}
                              {(pulizia.tipo === 'apertura_stagione' || pulizia.tipo === 'chiusura_stagione') && (
                                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                  {pulizia.tipo === 'apertura_stagione' ? 'APERTURA' : 'CHIUSURA'}
                                </p>
                              )}
                            </div>
                            {pulizia.stato === 'completata' && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista dettagliata */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Dettaglio pulizie settimana</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {Object.entries(data.puliziePerData).length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Nessuna pulizia programmata per questa settimana</p>
              </div>
            ) : (
              Object.entries(data.puliziePerData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dataKey, pulizie]) => (
                  <div key={dataKey} className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white mb-3">
                      {formatDate(dataKey)}
                      {pulizie.length > 1 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          ({pulizie.length} appartamenti)
                        </span>
                      )}
                    </p>
                    <div className="space-y-2">
                      {pulizie.map((pulizia, idx) => (
                        <div
                          key={`${pulizia.id}-${idx}`}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg',
                            pulizia.stato === 'completata' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-gray-50 dark:bg-gray-700'
                          )}
                        >
                          <button
                            onClick={() => togglePuliziaStato(pulizia)}
                            className={cn(
                              'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                              pulizia.stato === 'completata'
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 dark:border-gray-500 hover:border-blue-500'
                            )}
                          >
                            {pulizia.stato === 'completata' && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </button>

                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: coloriAppartamenti[pulizia.appartamentoId] || '#6B7280' }}
                          >
                            {pulizia.appartamentoId}
                          </div>

                          <div className="flex-1">
                            <p className={cn(
                              'font-medium',
                              pulizia.stato === 'completata' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                            )}>
                              App {pulizia.appartamentoId}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              {pulizia.orarioCheckout && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  ore {pulizia.orarioCheckout}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-xs">
                                {tipoLabels[pulizia.tipo] || pulizia.tipo}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Aggiungi Pulizia */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aggiungi Pulizia</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Appartamento
                </label>
                <select
                  value={nuovaPulizia.appartamentoId}
                  onChange={(e) => setNuovaPulizia({ ...nuovaPulizia, appartamentoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Seleziona...</option>
                  {data.appartamenti.map(app => (
                    <option key={app.id} value={app.id}>App {app.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={nuovaPulizia.data}
                  onChange={(e) => setNuovaPulizia({ ...nuovaPulizia, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Orario check-out (opzionale)
                </label>
                <select
                  value={nuovaPulizia.orarioCheckout}
                  onChange={(e) => setNuovaPulizia({ ...nuovaPulizia, orarioCheckout: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Nessuno</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  value={nuovaPulizia.note}
                  onChange={(e) => setNuovaPulizia({ ...nuovaPulizia, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Es: Pulizia straordinaria"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={aggiungiPulizia}
                disabled={!nuovaPulizia.appartamentoId || !nuovaPulizia.data}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
