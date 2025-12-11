'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Receipt,
  Plus,
  Download,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { cn, formatPrice, formatDate } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Import Recharts dinamicamente per evitare problemi SSR
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

interface FinanzeData {
  stagione: {
    anno: number
    badge: { testo: string; colore: string }
  }
  stagioniDisponibili: number[]
  riepilogo: {
    entrate: number
    uscite: number
    netto: number
    prenotazioni: number
    variazioneEntrate: number | null
  }
  andamentoData: { mese: string; entrate: number; uscite: number }[]
  categorieEntrate: { nome: string; valore: number; colore: string }[]
  movimentiRecenti: {
    id: number
    tipo: 'entrata' | 'uscita'
    descrizione: string
    importo: number
    data: string
    metodo: string
    categoria: string
  }[]
  pagamentiInAttesa: {
    id: number
    ospite: string
    tipo: string
    importo: number
    scadenza: string
    appartamento: number
  }[]
}

export default function FinanzePage() {
  const [data, setData] = useState<FinanzeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(null)
  const [filterTipo, setFilterTipo] = useState<'tutti' | 'entrate' | 'uscite'>('tutti')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchFinanze() {
      try {
        setLoading(true)
        const url = annoSelezionato
          ? `/api/finanze?anno=${annoSelezionato}`
          : '/api/finanze'
        const response = await fetch(url)
        if (!response.ok) throw new Error('Errore nel caricamento')
        const finanzeData = await response.json()
        setData(finanzeData)
        if (!annoSelezionato) {
          setAnnoSelezionato(finanzeData.stagione.anno)
        }
      } catch (err) {
        setError('Errore nel caricamento dei dati finanziari')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchFinanze()
  }, [annoSelezionato])

  if (loading) {
    return (
      <>
        <Header title="Finanze" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Finanze" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Errore sconosciuto'}</div>
        </div>
      </>
    )
  }

  const { stagione, stagioniDisponibili, riepilogo, andamentoData, categorieEntrate, movimentiRecenti, pagamentiInAttesa } = data

  const filteredMovimenti = movimentiRecenti.filter((m) =>
    filterTipo === 'tutti' || m.tipo === (filterTipo === 'entrate' ? 'entrata' : 'uscita')
  )

  const haData = riepilogo.entrate > 0 || riepilogo.prenotazioni > 0

  return (
    <>
      <Header title="Finanze" subtitle={`Stagione ${stagione.anno}`} />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Selettore Stagione */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <select
              value={annoSelezionato || ''}
              onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {stagioniDisponibili.map((anno) => (
                <option key={anno} value={anno}>
                  Stagione {anno}
                </option>
              ))}
            </select>
            <span className={cn('text-xs px-2 py-1 rounded-full', stagione.badge.colore)}>
              {stagione.badge.testo}
            </span>
          </div>
        </div>

        {/* Messaggio se non ci sono dati */}
        {!haData && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Nessun dato finanziario per la stagione {stagione.anno}</p>
              <p className="text-sm text-blue-700 mt-1">
                I dati finanziari verranno mostrati quando ci saranno prenotazioni per questa stagione.
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Entrate */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ArrowUpRight className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
              {riepilogo.variazioneEntrate !== null && (
                <span className={cn(
                  'flex items-center gap-1 text-xs lg:text-sm font-medium',
                  riepilogo.variazioneEntrate >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {riepilogo.variazioneEntrate >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {riepilogo.variazioneEntrate >= 0 ? '+' : ''}{riepilogo.variazioneEntrate}%
                </span>
              )}
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(riepilogo.entrate)}</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Entrate stagione</p>
          </div>

          {/* Netto (uguale alle entrate per ora) */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-green-600">{formatPrice(riepilogo.netto)}</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Netto stagione</p>
          </div>

          {/* Prenotazioni */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Receipt className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{riepilogo.prenotazioni}</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Prenotazioni</p>
          </div>

          {/* Media per prenotazione */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              {riepilogo.prenotazioni > 0
                ? formatPrice(Math.round(riepilogo.entrate / riepilogo.prenotazioni))
                : formatPrice(0)
              }
            </p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Media prenotazione</p>
          </div>
        </div>

        {/* Charts Row - Mostra solo se ci sono dati */}
        {haData && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Andamento */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Andamento Entrate Stagione {stagione.anno}</h3>
              <div className="h-64" style={{ minWidth: 0, minHeight: 256 }}>
                {isClient && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <AreaChart data={andamentoData}>
                      <defs>
                        <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="mese" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip
                        formatter={(value) => [formatPrice(Number(value)), 'Entrate']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Area type="monotone" dataKey="entrate" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntrate)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Fonti Prenotazioni */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Entrate per Fonte</h3>
              {categorieEntrate.length > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="w-40 h-40" style={{ minWidth: 160, minHeight: 160 }}>
                    {isClient && (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={categorieEntrate}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="valore"
                            paddingAngle={2}
                          >
                            {categorieEntrate.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.colore} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatPrice(Number(value))}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    {categorieEntrate.map((cat) => (
                      <div key={cat.nome} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.colore }} />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{cat.nome}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatPrice(cat.valore)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  Nessun dato disponibile
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagamenti in Attesa */}
        {pagamentiInAttesa.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">Pagamenti in Attesa ({pagamentiInAttesa.length})</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pagamentiInAttesa.map((pag) => (
                <div key={pag.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{pag.ospite}</span>
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full capitalize">
                      {pag.tipo}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(pag.importo)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Check-in: {formatDate(pag.scadenza)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movimenti */}
        {movimentiRecenti.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Ultime Prenotazioni</h3>

                <div className="flex items-center gap-3">
                  {/* Filter */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                      onClick={() => setFilterTipo('tutti')}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                        filterTipo === 'tutti' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                      )}
                    >
                      Tutti
                    </button>
                    <button
                      onClick={() => setFilterTipo('entrate')}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                        filterTipo === 'entrate' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                      )}
                    >
                      Entrate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredMovimenti.map((mov) => (
                <div key={mov.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      mov.tipo === 'entrata' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    )}>
                      {mov.tipo === 'entrata' ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{mov.descrizione}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(mov.data)}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full capitalize">
                          {mov.metodo}
                        </span>
                      </div>
                    </div>

                    <span className={cn(
                      'text-lg font-bold',
                      mov.tipo === 'entrata' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {mov.tipo === 'entrata' ? '+' : '-'}{formatPrice(mov.importo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredMovimenti.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nessun movimento trovato
              </div>
            )}

            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                <Download className="w-4 h-4" />
                Esporta movimenti
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
