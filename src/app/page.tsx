'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
  Home,
  Loader2,
  AlertCircle,
  Archive,
} from 'lucide-react'
import { cn, formatPrice, formatDate, formatDateShort } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Import Recharts dinamicamente per evitare problemi SSR
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

interface DashboardData {
  stagione: {
    anno: number
    chiusa: boolean
    badge: { testo: string; colore: string }
    haPrenotazioniFuture: boolean
  }
  stats: {
    prenotazioniAttive: number
    prenotazioniStagione: number
    ospiti: number
    incassoStagione: number
    tassoOccupazione: number
  }
  revenueData: { mese: string; incasso: number }[]
  occupancyData: { appartamento: string; nome: string; occupazione: number }[]
  checkIns: { id: number; ospite: string; appartamento: number; appartamentoNome: string; data: string; ospiti: number }[]
  checkOuts: { id: number; ospite: string; appartamento: number; appartamentoNome: string; data: string; ospiti: number }[]
  tasks: { id: number; titolo: string; priorita: string; scadenza: string | null }[]
  appartamenti: { id: number; nome: string; postiLetto: number; occupato: boolean; ospiteCorrente: string | null }[]
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}

const coloriAppartamenti: Record<number, string> = {
  1: '#3B82F6',
  2: '#10B981',
  3: '#F59E0B',
  4: '#8B5CF6',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todayStr, setTodayStr] = useState('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setTodayStr(formatDate(new Date()))
    setIsClient(true)

    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) throw new Error('Errore nel caricamento')
        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        setError('Errore nel caricamento della dashboard')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Dashboard" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Errore sconosciuto'}</div>
        </div>
      </>
    )
  }

  const { stagione, stats, revenueData, occupancyData, checkIns, checkOuts, tasks, appartamenti } = data
  const haDataStagione = stats.prenotazioniStagione > 0 || stats.incassoStagione > 0

  return (
    <>
      <Header title="Dashboard" subtitle={todayStr ? `Benvenuto! Oggi e ${todayStr}` : 'Benvenuto!'} />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Banner Stagione */}
        <div className={cn(
          'rounded-xl p-4 flex items-center justify-between dark:bg-opacity-20',
          stagione.badge.colore
        )}>
          <div className="flex items-center gap-3">
            {stagione.chiusa ? (
              <Archive className="w-5 h-5" />
            ) : (
              <Calendar className="w-5 h-5" />
            )}
            <div>
              <p className="font-semibold">Stagione {stagione.anno}</p>
              <p className="text-sm opacity-80">
                {stagione.chiusa
                  ? 'Stagione chiusa - Preparazione prossima stagione'
                  : haDataStagione
                    ? 'Stagione in corso'
                    : 'In attesa di prenotazioni'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Messaggio se non ci sono dati per la stagione corrente */}
        {!haDataStagione && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Nessuna prenotazione per la stagione {stagione.anno}</p>
              <p className="text-sm text-blue-700 mt-1">
                Inizia ad aggiungere prenotazioni per vedere le statistiche.
                Puoi consultare lo storico delle stagioni precedenti nella sezione Analytics.
              </p>
              <a href="/analytics" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium">
                Vai ad Analytics <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Prenotazioni Stagione */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.prenotazioniStagione}</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Prenotazioni {stagione.anno}</p>
          </div>

          {/* Ospiti */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <Users className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.ospiti}</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Ospiti stagione {stagione.anno}</p>
          </div>

          {/* Incasso Stagione */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.incassoStagione)}</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Incasso stagione {stagione.anno}</p>
          </div>

          {/* Tasso Occupazione */}
          <div className="stat-card bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 lg:p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Home className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.tassoOccupazione}%</p>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Occupazione {stagione.anno}</p>
          </div>
        </div>

        {/* Charts Row - Mostra solo se ci sono dati */}
        {haDataStagione && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Incassi Stagione {stagione.anno}</h3>
              <div className="h-64" style={{ minWidth: 0, minHeight: 256 }}>
                {isClient && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorIncasso" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="mese" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip
                        formatter={(value) => [formatPrice(Number(value)), 'Incasso']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="incasso"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorIncasso)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Occupancy Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Occupazione per Appartamento {stagione.anno}</h3>
              <div className="h-64" style={{ minWidth: 0, minHeight: 256 }}>
                {isClient && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={occupancyData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" domain={[0, 100]} stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="appartamento" type="category" stroke="#6B7280" fontSize={12} width={60} />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Occupazione']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Bar dataKey="occupazione" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Check-ins */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Check-in in arrivo</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {checkIns.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {checkIns.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Nessun check-in nei prossimi 7 giorni</div>
              ) : (
                checkIns.map((checkin) => (
                  <div key={checkin.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: coloriAppartamenti[checkin.appartamento] || '#6B7280' }}
                      >
                        {checkin.appartamento}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{checkin.ospite}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDateShort(checkin.data)} - {checkin.ospiti} ospiti
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <a href="/prenotazioni" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Vedi tutte <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Upcoming Check-outs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Check-out in uscita</h3>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                {checkOuts.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {checkOuts.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Nessun check-out nei prossimi 7 giorni</div>
              ) : (
                checkOuts.map((checkout) => (
                  <div key={checkout.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: coloriAppartamenti[checkout.appartamento] || '#6B7280' }}
                      >
                        {checkout.appartamento}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{checkout.ospite}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDateShort(checkout.data)} - {checkout.ospiti} ospiti
                        </p>
                      </div>
                      <Clock className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <a href="/prenotazioni" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Vedi tutte <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Apartments Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Stato Appartamenti Oggi</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700">
            {appartamenti.map((app) => (
              <div key={app.id} className="bg-white dark:bg-gray-800 p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: coloriAppartamenti[app.id] || '#6B7280' }}
                  >
                    {app.id}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{app.nome}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{app.postiLetto} posti letto</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-3 h-3 rounded-full',
                    app.occupato ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    app.occupato ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  )}>
                    {app.occupato ? 'Occupato' : 'Libero'}
                  </span>
                </div>
                {app.ospiteCorrente && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{app.ospiteCorrente}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
