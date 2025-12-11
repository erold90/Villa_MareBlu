'use client'

import { useState, useEffect, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import Header from '@/components/layout/Header'
import {
  Sparkles,
  Calendar,
  Check,
  FileText,
  Loader2,
  Clock,
  CalendarDays,
  AlertTriangle,
  ChevronRight,
  Users,
  Home,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Pulizia {
  id: number | string
  appartamentoId: number
  data: string
  dataOriginale?: string
  tipo: string
  stato: string
  note: string | null
  obbligatoria: boolean
  spostata?: boolean
  isAutomatic?: boolean
}

interface GiornataPulizie {
  data: string
  settimana: string
  giorno: string
  pulizie: Pulizia[]
  totaleAppartamenti: number
  appartamentiObbligatori: number
  appartamentiSpostati: number
  piuVisite: boolean
}

interface PulizieData {
  anno: number
  giornatePulizie: GiornataPulizie[]
  stats: {
    totaleGiornate: number
    giornateFatte: number
    giornateDaFare: number
    prossimaGiornata: {
      data: string
      giorno: string
      appartamenti: number
    } | null
    settimaneConPiuVisite: number
  }
  appartamenti: { id: number; nome: string }[]
}

const tipoLabels: Record<string, string> = {
  cambio_ospiti: 'Cambio ospiti',
  fine_soggiorno: 'Fine soggiorno',
  pre_checkin: 'Pre check-in',
  apertura_stagione: 'Apertura',
  chiusura_stagione: 'Chiusura',
  manuale: 'Manuale',
}

const coloriAppartamenti: Record<number, string> = {
  1: '#3B82F6',
  2: '#10B981',
  3: '#F59E0B',
  4: '#8B5CF6',
}

function getStagioneCorrente(): number {
  const oggi = new Date()
  const anno = oggi.getFullYear()
  const mese = oggi.getMonth()
  if (mese >= 5 && mese <= 8) return anno
  if (mese > 8) return anno + 1
  return anno
}

export default function PuliziePage() {
  const [data, setData] = useState<PulizieData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stagioneSelezionata, setStagioneSelezionata] = useState(() => getStagioneCorrente())
  const [filtro, setFiltro] = useState<'tutte' | 'future' | 'passate'>('future')
  const [giornataPDFSelezionata, setGiornataPDFSelezionata] = useState<GiornataPulizie | null>(null)

  async function fetchPulizie() {
    try {
      setLoading(true)
      const response = await fetch(`/api/pulizie?anno=${stagioneSelezionata}`)
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
  }, [stagioneSelezionata])

  const togglePuliziaStato = async (pulizia: Pulizia) => {
    if (typeof pulizia.id === 'string' && pulizia.isAutomatic) {
      // È una pulizia automatica, prima la creo nel DB
      try {
        const response = await fetch('/api/pulizie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appartamentoId: pulizia.appartamentoId,
            data: pulizia.data,
            tipo: pulizia.tipo,
            note: pulizia.note,
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

  const generaPDF = useCallback((giornata: GiornataPulizie) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = 25

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('PULIZIE - Villa MareBlu', pageWidth / 2, y, { align: 'center' })

    y += 12
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${giornata.giorno} ${formatDate(giornata.data)}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    )

    y += 8
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `${giornata.totaleAppartamenti} appartament${giornata.totaleAppartamenti === 1 ? 'o' : 'i'} da pulire`,
      pageWidth / 2,
      y,
      { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)

    y += 15

    // Lista appartamenti
    giornata.pulizie.forEach((p, index) => {
      // Box appartamento
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(margin, y - 2, pageWidth - margin * 2, 22, 3, 3, 'F')

      // Checkbox
      doc.setDrawColor(150, 150, 150)
      doc.rect(margin + 5, y + 5, 6, 6)

      // Numero appartamento con colore
      const colore = coloriAppartamenti[p.appartamentoId] || '#6B7280'
      const rgb = hexToRgb(colore)
      doc.setFillColor(rgb.r, rgb.g, rgb.b)
      doc.roundedRect(margin + 18, y + 2, 18, 12, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`${p.appartamentoId}`, margin + 27, y + 10, { align: 'center' })

      // Testo
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Appartamento ${p.appartamentoId}`, margin + 42, y + 7)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)

      let dettaglio = tipoLabels[p.tipo] || p.tipo
      if (p.note) dettaglio += ` - ${p.note}`
      doc.text(dettaglio, margin + 42, y + 14)

      doc.setTextColor(0, 0, 0)

      y += 28
    })

    // Note a piè di pagina
    y += 10
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    if (giornata.appartamentiSpostati > 0) {
      doc.text(
        `* ${giornata.appartamentiSpostati} pulizia/e raggruppata/e per ottimizzare`,
        margin,
        y
      )
    }

    // Footer
    doc.setFontSize(8)
    doc.text(
      `Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
      pageWidth / 2,
      285,
      { align: 'center' }
    )

    // Salva
    const dataFormattata = giornata.data.split('T')[0]
    doc.save(`pulizie_${dataFormattata}.pdf`)
  }, [])

  // Helper per convertire hex in rgb
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 107, g: 114, b: 128 }
  }

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

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  // Filtra giornate
  const giornateFiltrate = data.giornatePulizie.filter(g => {
    const dataGiornata = new Date(g.data)
    dataGiornata.setHours(0, 0, 0, 0)

    if (filtro === 'future') return dataGiornata >= oggi
    if (filtro === 'passate') return dataGiornata < oggi
    return true
  })

  // Raggruppa per mese
  const giornatePerMese = new Map<string, GiornataPulizie[]>()
  giornateFiltrate.forEach(g => {
    const data = new Date(g.data)
    const mese = data.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    if (!giornatePerMese.has(mese)) {
      giornatePerMese.set(mese, [])
    }
    giornatePerMese.get(mese)!.push(g)
  })

  return (
    <>
      <Header
        title="Pulizie"
        subtitle={data.stats.prossimaGiornata
          ? `Prossima: ${data.stats.prossimaGiornata.giorno}`
          : 'Stagione ' + stagioneSelezionata
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Header con stagione e filtri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <select
                value={stagioneSelezionata}
                onChange={(e) => setStagioneSelezionata(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {[2025, 2026, 2027].map(anno => (
                  <option key={anno} value={anno}>
                    Estate {anno}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtri */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['future', 'tutte', 'passate'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  filtro === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {f === 'future' ? 'Da fare' : f === 'passate' ? 'Fatte' : 'Tutte'}
              </button>
            ))}
          </div>
        </div>

        {/* Card prossima giornata */}
        {data.stats.prossimaGiornata && filtro !== 'passate' && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Prossima giornata pulizie</p>
                <p className="text-2xl font-bold">
                  {data.stats.prossimaGiornata.giorno} {formatDate(data.stats.prossimaGiornata.data)}
                </p>
                <p className="text-blue-100 mt-1">
                  {data.stats.prossimaGiornata.appartamenti} appartament{data.stats.prossimaGiornata.appartamenti === 1 ? 'o' : 'i'} da pulire
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Sparkles className="w-12 h-12 text-blue-200" />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{data.stats.totaleGiornate}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Giornate totali</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{data.stats.giornateDaFare}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Da fare</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{data.stats.giornateFatte}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completate</p>
          </div>
        </div>

        {/* Alert settimane con più visite */}
        {data.stats.settimaneConPiuVisite > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {Math.round(data.stats.settimaneConPiuVisite)} settiman{data.stats.settimaneConPiuVisite === 1 ? 'a' : 'e'} con più visite necessarie
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                A causa di cambi ospiti in giorni diversi, alcune settimane richiedono più di una visita.
              </p>
            </div>
          </div>
        )}

        {/* Lista giornate per mese */}
        {giornateFiltrate.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">
              {filtro === 'future'
                ? 'Nessuna pulizia programmata'
                : filtro === 'passate'
                ? 'Nessuna pulizia passata'
                : 'Nessuna pulizia nella stagione'
              }
            </p>
          </div>
        ) : (
          Array.from(giornatePerMese.entries()).map(([mese, giornate]) => (
            <div key={mese} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
                {mese}
              </h3>

              <div className="space-y-3">
                {giornate.map(giornata => {
                  const dataGiornata = new Date(giornata.data)
                  dataGiornata.setHours(0, 0, 0, 0)
                  const isPassata = dataGiornata < oggi
                  const isOggi = dataGiornata.getTime() === oggi.getTime()
                  const tutteCompletate = giornata.pulizie.every(p => p.stato === 'completata')

                  return (
                    <div
                      key={giornata.data}
                      className={cn(
                        'bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden',
                        isOggi && 'ring-2 ring-blue-500',
                        isPassata && tutteCompletate && 'opacity-60'
                      )}
                    >
                      {/* Header giornata */}
                      <div className={cn(
                        'p-4 flex items-center justify-between',
                        isOggi ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-700/50'
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-12 h-12 rounded-lg flex flex-col items-center justify-center',
                            isOggi
                              ? 'bg-blue-500 text-white'
                              : isPassata
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          )}>
                            <span className="text-xs font-medium leading-none">
                              {giornata.giorno.slice(0, 3)}
                            </span>
                            <span className="text-lg font-bold leading-none mt-0.5">
                              {new Date(giornata.data).getDate()}
                            </span>
                          </div>
                          <div>
                            <p className={cn(
                              'font-semibold',
                              isOggi ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                            )}>
                              {isOggi ? 'Oggi' : giornata.giorno}
                              {giornata.piuVisite && (
                                <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                  Più visite
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {giornata.totaleAppartamenti} appartament{giornata.totaleAppartamenti === 1 ? 'o' : 'i'}
                              {giornata.appartamentiSpostati > 0 && (
                                <span className="ml-1 text-gray-400">
                                  ({giornata.appartamentiSpostati} raggrupat{giornata.appartamentiSpostati === 1 ? 'o' : 'i'})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => generaPDF(giornata)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                      </div>

                      {/* Lista appartamenti */}
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {giornata.pulizie.map((pulizia, idx) => (
                          <div
                            key={`${pulizia.id}-${idx}`}
                            className={cn(
                              'p-4 flex items-center gap-4 transition-colors',
                              pulizia.stato === 'completata' && 'bg-green-50/50 dark:bg-green-900/10'
                            )}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => togglePuliziaStato(pulizia)}
                              className={cn(
                                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                pulizia.stato === 'completata'
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 dark:border-gray-500 hover:border-green-500'
                              )}
                            >
                              {pulizia.stato === 'completata' && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </button>

                            {/* Numero appartamento */}
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                              style={{ backgroundColor: coloriAppartamenti[pulizia.appartamentoId] || '#6B7280' }}
                            >
                              {pulizia.appartamentoId}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'font-medium',
                                pulizia.stato === 'completata'
                                  ? 'line-through text-gray-400 dark:text-gray-500'
                                  : 'text-gray-900 dark:text-white'
                              )}>
                                Appartamento {pulizia.appartamentoId}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  pulizia.obbligatoria
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                )}>
                                  {tipoLabels[pulizia.tipo] || pulizia.tipo}
                                </span>
                                {pulizia.note && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {pulizia.note}
                                  </span>
                                )}
                                {pulizia.spostata && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400">
                                    (raggruppata)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stato */}
                            {pulizia.stato === 'completata' && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                Fatto
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
