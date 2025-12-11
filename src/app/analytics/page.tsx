'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  Users,
  Home,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })

interface StagioneData {
  anno: number
  ricaviTotali: number
  prenotazioniTotali: number
  ricavoMedio: number
  ricaviPerMese: Record<string, number>
  prenotazioniPerMese: Record<string, number>
  datiPerAppartamento: Record<number, { ricavi: number; prenotazioni: number; ricavoMedio: number }>
  ricaviPerFonte: Record<string, number> | null
  ricaviPerNazionalita: Record<string, number> | null
  durataMediaSoggiorno: number | null
}

interface AnalyticsData {
  annoSelezionato: number
  stagioniDisponibili: number[]
  stagionePrincipale: StagioneData | null
  stagioniConfronto: StagioneData[]
  confrontoMensile: any[]
  variazioneRicavi: number | null
  variazionePrenotazioni: number | null
  appartamenti: { id: number; nome: string }[]
}

const COLORI_ANNI = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
const COLORI_FONTE: Record<string, string> = {
  direct: '#8B5CF6',
  airbnb: '#F43F5E',
  booking: '#3B82F6',
  altro: '#6B7280',
}
const COLORI_PIE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E', '#6B7280']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annoSelezionato, setAnnoSelezionato] = useState<number>(new Date().getFullYear())
  const [annoConfronto, setAnnoConfronto] = useState<number | null>(null)
  const [confrontoAttivo, setConfrontoAttivo] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        const url = annoConfronto && confrontoAttivo
          ? `/api/analytics?anno=${annoSelezionato}&confronto=${annoConfronto}`
          : `/api/analytics?anno=${annoSelezionato}`
        const response = await fetch(url)
        if (!response.ok) throw new Error('Errore nel caricamento')
        const analyticsData = await response.json()
        setData(analyticsData)

        // Imposta anno confronto default se non settato
        if (annoConfronto === null && analyticsData.stagioniDisponibili.length > 1) {
          const anniDisponibili = analyticsData.stagioniDisponibili.filter((a: number) => a !== annoSelezionato)
          if (anniDisponibili.length > 0) {
            setAnnoConfronto(anniDisponibili[0])
          }
        }
      } catch (err) {
        setError('Errore nel caricamento dei dati analytics')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [annoSelezionato, annoConfronto, confrontoAttivo])

  if (loading) {
    return (
      <>
        <Header title="Analytics" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Analytics" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Errore sconosciuto'}</div>
        </div>
      </>
    )
  }

  const { stagionePrincipale, stagioniConfronto, confrontoMensile, variazioneRicavi, variazionePrenotazioni, appartamenti, stagioniDisponibili } = data

  // Prepara dati per grafici
  const fonteData = stagionePrincipale?.ricaviPerFonte
    ? Object.entries(stagionePrincipale.ricaviPerFonte).map(([fonte, valore]) => ({
        name: fonte === 'direct' ? 'Diretto' : fonte.charAt(0).toUpperCase() + fonte.slice(1),
        value: valore,
        color: COLORI_FONTE[fonte] || '#6B7280',
      }))
    : []

  const nazionalitaData = stagionePrincipale?.ricaviPerNazionalita
    ? Object.entries(stagionePrincipale.ricaviPerNazionalita)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([nazione, valore], index) => ({
          name: nazione,
          value: valore,
          color: COLORI_PIE[index % COLORI_PIE.length],
        }))
    : []

  // Prepara dati per confronto appartamenti
  const appartamentiData = appartamenti.map(app => {
    const datiCorrente = stagionePrincipale?.datiPerAppartamento?.[app.id]
    const datiPrecedente = stagioniConfronto[0]?.datiPerAppartamento?.[app.id]
    return {
      nome: app.nome.replace('Appartamento ', 'App '),
      [`${annoSelezionato}`]: datiCorrente?.ricavi || 0,
      ...(stagioniConfronto[0] ? { [`${stagioniConfronto[0].anno}`]: datiPrecedente?.ricavi || 0 } : {}),
    }
  })

  return (
    <>
      <Header title="Analytics" subtitle={`Stagione ${annoSelezionato}`} />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Selettore Stagione e Confronto */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            {/* Stagione principale */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Stagione:</span>
              <select
                value={annoSelezionato}
                onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {stagioniDisponibili.map(anno => (
                  <option key={anno} value={anno}>
                    Estate {anno}
                  </option>
                ))}
              </select>
            </div>

            {/* Separatore */}
            <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700" />

            {/* Confronto */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confrontoAttivo}
                  onChange={(e) => setConfrontoAttivo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Confronta con:</span>
              </label>
              <select
                value={annoConfronto || ''}
                onChange={(e) => setAnnoConfronto(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!confrontoAttivo}
                className={cn(
                  "px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                  !confrontoAttivo && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">Nessuno</option>
                {stagioniDisponibili
                  .filter(anno => anno !== annoSelezionato)
                  .map(anno => (
                    <option key={anno} value={anno}>
                      {anno}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messaggio se non ci sono dati */}
        {!stagionePrincipale && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-6 text-center">
            <Calendar className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Nessun dato per la stagione {annoSelezionato}
            </h3>
            <p className="text-amber-600 dark:text-amber-300">
              Non ci sono ancora prenotazioni registrate per questa stagione.
              I dati appariranno automaticamente quando verranno inserite le prenotazioni.
            </p>
          </div>
        )}

        {stagionePrincipale && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ricavi Totali */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 lg:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Euro className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                  </div>
                  {confrontoAttivo && variazioneRicavi !== null && (
                    <span className={cn(
                      'flex items-center gap-1 text-xs lg:text-sm font-medium',
                      variazioneRicavi >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {variazioneRicavi >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {variazioneRicavi > 0 ? '+' : ''}{variazioneRicavi}%
                    </span>
                  )}
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(stagionePrincipale.ricaviTotali)}
                </p>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Ricavi totali</p>
              </div>

              {/* Prenotazioni */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                  {confrontoAttivo && variazionePrenotazioni !== null && (
                    <span className={cn(
                      'flex items-center gap-1 text-xs lg:text-sm font-medium',
                      variazionePrenotazioni >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {variazionePrenotazioni >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {variazionePrenotazioni > 0 ? '+' : ''}{variazionePrenotazioni}%
                    </span>
                  )}
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {stagionePrincipale.prenotazioniTotali}
                </p>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Prenotazioni</p>
              </div>

              {/* Ricavo Medio */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 lg:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(stagionePrincipale.ricavoMedio)}
                </p>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Ricavo medio</p>
              </div>

              {/* Durata Media */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 lg:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {stagionePrincipale.durataMediaSoggiorno || '-'} <span className="text-lg font-normal">notti</span>
                </p>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Durata media soggiorno</p>
              </div>
            </div>

            {/* Grafico Confronto Mensile */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Ricavi per Mese {confrontoAttivo && stagioniConfronto.length > 0 ? '- Confronto Stagioni' : ''}
              </h3>
              <div className="h-80" style={{ minWidth: 0, minHeight: 320 }}>
                {isClient && confrontoMensile.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confrontoMensile}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="mese" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [formatPrice(Number(value)), '']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Legend />
                      <Bar dataKey={`${annoSelezionato}`} fill={COLORI_ANNI[0]} name={`${annoSelezionato}`} radius={[4, 4, 0, 0]} />
                      {confrontoAttivo && stagioniConfronto.map((stagione, index) => (
                        <Bar
                          key={stagione.anno}
                          dataKey={`${stagione.anno}`}
                          fill={COLORI_ANNI[(index + 1) % COLORI_ANNI.length]}
                          name={`${stagione.anno}`}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Grafici Fonte e Nazionalità */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Per Fonte */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ricavi per Fonte</h3>
                {fonteData.length > 0 ? (
                  <div className="h-64">
                    {isClient && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fonteData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {fonteData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatPrice(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Nessun dato disponibile
                  </div>
                )}
              </div>

              {/* Per Nazionalità */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ricavi per Nazionalità</h3>
                {nazionalitaData.length > 0 ? (
                  <div className="space-y-3">
                    {nazionalitaData.map((item, index) => {
                      const maxValue = nazionalitaData[0]?.value || 1
                      const percentage = (item.value / maxValue) * 100
                      return (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                            <span className="text-gray-600 dark:text-gray-400">{formatPrice(item.value)}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all"
                              style={{ width: `${percentage}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Nessun dato disponibile
                  </div>
                )}
              </div>
            </div>

            {/* Confronto Appartamenti */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Performance per Appartamento</h3>
              <div className="h-64" style={{ minWidth: 0, minHeight: 256 }}>
                {isClient && appartamentiData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={appartamentiData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="nome" type="category" stroke="#6B7280" fontSize={12} width={60} />
                      <Tooltip
                        formatter={(value) => formatPrice(Number(value))}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Legend />
                      <Bar dataKey={`${annoSelezionato}`} fill={COLORI_ANNI[0]} name={`${annoSelezionato}`} radius={[0, 4, 4, 0]} />
                      {confrontoAttivo && stagioniConfronto[0] && (
                        <Bar dataKey={`${stagioniConfronto[0].anno}`} fill={COLORI_ANNI[1]} name={`${stagioniConfronto[0].anno}`} radius={[0, 4, 4, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabella Dettaglio Appartamenti */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Dettaglio per Appartamento - Stagione {annoSelezionato}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Appartamento</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Ricavi</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Prenotazioni</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Media</th>
                      {confrontoAttivo && stagioniConfronto[0] && (
                        <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">vs {stagioniConfronto[0].anno}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {appartamenti.map(app => {
                      const dati = stagionePrincipale.datiPerAppartamento?.[app.id]
                      const datiPrecedente = stagioniConfronto[0]?.datiPerAppartamento?.[app.id]
                      const variazione = dati && datiPrecedente && datiPrecedente.ricavi > 0
                        ? Math.round(((dati.ricavi - datiPrecedente.ricavi) / datiPrecedente.ricavi) * 100)
                        : null

                      return (
                        <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-4 font-medium text-gray-900 dark:text-white">{app.nome}</td>
                          <td className="p-4 text-right text-gray-700 dark:text-gray-300">{formatPrice(dati?.ricavi || 0)}</td>
                          <td className="p-4 text-right text-gray-700 dark:text-gray-300">{dati?.prenotazioni || 0}</td>
                          <td className="p-4 text-right text-gray-700 dark:text-gray-300">{formatPrice(dati?.ricavoMedio || 0)}</td>
                          {confrontoAttivo && stagioniConfronto[0] && (
                            <td className="p-4 text-right">
                              {variazione !== null ? (
                                <span className={cn(
                                  'font-medium',
                                  variazione >= 0 ? 'text-green-600' : 'text-red-600'
                                )}>
                                  {variazione > 0 ? '+' : ''}{variazione}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
