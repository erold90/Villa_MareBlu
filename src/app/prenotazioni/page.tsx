'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Search, Filter, Eye, Edit, Trash2, MoreVertical, Dog, Bed, Loader2 } from 'lucide-react'
import { cn, formatPrice, formatDate } from '@/lib/utils'
import { appartamentiConfig } from '@/config/appartamenti'

interface Ospite {
  id: number
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  nazione: string | null
}

interface Appartamento {
  id: number
  nome: string
  slug: string
  colore: string | null
}

interface Prenotazione {
  id: number
  appartamentoId: number
  ospiteId: number
  checkIn: string
  checkOut: string
  numAdulti: number
  numBambini: number
  animali: boolean
  animaliDettaglio: string | null
  biancheria: boolean
  bianchieriaSets: number
  biancheriaCosto: number
  totale: number
  acconto: number
  saldo: number
  accontoPagato: boolean
  saldoPagato: boolean
  stato: string
  fonte: string
  ospite: Ospite
  appartamento: Appartamento
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

// Colori appartamenti di default
const coloriAppartamenti: Record<number, string> = {
  1: '#3B82F6', // blue
  2: '#10B981', // green
  3: '#F59E0B', // amber
  4: '#8B5CF6', // violet
}

// Genera lista delle stagioni disponibili (da 2025 all'anno corrente + 1)
function getStagioniDisponibili(): number[] {
  const annoCorrente = new Date().getFullYear()
  const stagioni: number[] = []
  for (let anno = 2025; anno <= annoCorrente + 1; anno++) {
    stagioni.push(anno)
  }
  return stagioni
}

export default function PrenotazioniPage() {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStato, setFilterStato] = useState('all')
  const [filterAppartamento, setFilterAppartamento] = useState('all')
  const [filterStagione, setFilterStagione] = useState<string>('future') // 'future', 'all', o anno specifico

  const stagioni = getStagioniDisponibili()

  useEffect(() => {
    async function fetchPrenotazioni() {
      setLoading(true)
      try {
        let url = '/api/prenotazioni'
        if (filterStagione === 'all') {
          url += '?passate=true'
        } else if (filterStagione !== 'future') {
          url += `?anno=${filterStagione}`
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Errore nel caricamento')
        }
        const data = await response.json()
        setPrenotazioni(data)
      } catch (err) {
        setError('Errore nel caricamento delle prenotazioni')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrenotazioni()
  }, [filterStagione])

  const filteredPrenotazioni = prenotazioni.filter((pren) => {
    const matchSearch =
      `${pren.ospite.nome} ${pren.ospite.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pren.ospite.email && pren.ospite.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchStato = filterStato === 'all' || pren.stato === filterStato
    const matchApp = filterAppartamento === 'all' || pren.appartamentoId === parseInt(filterAppartamento)
    return matchSearch && matchStato && matchApp
  })

  const getAppartamentoColore = (pren: Prenotazione) => {
    return pren.appartamento.colore || coloriAppartamenti[pren.appartamentoId] || '#6B7280'
  }

  if (loading) {
    return (
      <>
        <Header
          title="Prenotazioni"
          subtitle="Caricamento..."
          showAddButton
          addButtonHref="/prenotazioni/nuova"
          addButtonLabel="Nuova"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header
          title="Prenotazioni"
          subtitle="Errore"
          showAddButton
          addButtonHref="/prenotazioni/nuova"
          addButtonLabel="Nuova"
        />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Prenotazioni"
        subtitle={`${prenotazioni.length} prenotazioni totali`}
        showAddButton
        addButtonHref="/prenotazioni/nuova"
        addButtonLabel="Nuova"
      />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStagione}
                onChange={(e) => setFilterStagione(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              >
                <option value="future">Attuali e future</option>
                {stagioni.map((anno) => (
                  <option key={anno} value={anno}>
                    Stagione {anno}
                  </option>
                ))}
                <option value="all">Tutte (storico)</option>
              </select>

              <select
                value={filterStato}
                onChange={(e) => setFilterStato(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutti gli stati</option>
                <option value="pending">In attesa</option>
                <option value="confirmed">Confermata</option>
                <option value="checkedin">Check-in</option>
                <option value="completed">Completata</option>
                <option value="cancelled">Cancellata</option>
              </select>

              <select
                value={filterAppartamento}
                onChange={(e) => setFilterAppartamento(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutti gli appartamenti</option>
                {appartamentiConfig.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Prenotazioni List - Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {filteredPrenotazioni.map((pren) => {
            return (
              <div key={pren.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: getAppartamentoColore(pren) }}
                    >
                      {pren.appartamentoId}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {pren.ospite.cognome} {pren.ospite.nome}
                      </p>
                      <p className="text-sm text-gray-500">{pren.appartamento.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pren.animali && <Dog className="w-4 h-4 text-amber-500" />}
                    {pren.biancheria && <Bed className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Check-in</p>
                    <p className="font-medium">{formatDate(pren.checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Check-out</p>
                    <p className="font-medium">{formatDate(pren.checkOut)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ospiti</p>
                    <p className="font-medium">
                      {pren.numAdulti} adulti{pren.numBambini > 0 && `, ${pren.numBambini} bambini`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Totale</p>
                    <p className="font-bold text-gray-900">{formatPrice(pren.totale)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statoConfig[pren.stato]?.className || 'bg-gray-100 text-gray-800')}>
                      {statoConfig[pren.stato]?.label || pren.stato}
                    </span>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', fonteConfig[pren.fonte]?.className || 'bg-gray-100 text-gray-700')}>
                      {fonteConfig[pren.fonte]?.label || pren.fonte}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Prenotazioni Table - Desktop */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Ospite</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Appartamento</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Ospiti</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Extra</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Pagamento</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900">Stato</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-900">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPrenotazioni.map((pren) => {
                  return (
                    <tr key={pren.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium text-gray-900">
                          {pren.ospite.cognome} {pren.ospite.nome}
                        </p>
                        <p className="text-sm text-gray-500">{pren.ospite.nazione || ''}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: getAppartamentoColore(pren) }}
                          >
                            {pren.appartamentoId}
                          </div>
                          <span className="text-gray-700">{pren.appartamento.nome}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-700">{formatDate(pren.checkIn)}</p>
                        <p className="text-sm text-gray-500">{formatDate(pren.checkOut)}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-700">{pren.numAdulti} adulti</p>
                        {pren.numBambini > 0 && (
                          <p className="text-sm text-gray-500">{pren.numBambini} bambini</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {pren.animali && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                              <Dog className="w-3 h-3" />
                              Si
                            </span>
                          )}
                          {pren.biancheria && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                              <Bed className="w-3 h-3" />
                              {formatPrice(pren.biancheriaCosto)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-900">{formatPrice(pren.totale)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            'text-xs',
                            pren.accontoPagato ? 'text-green-600' : 'text-amber-600'
                          )}>
                            Acc: {formatPrice(pren.acconto)}
                          </span>
                          {pren.saldo > 0 && (
                            <span className={cn(
                              'text-xs',
                              pren.saldoPagato ? 'text-green-600' : 'text-red-600'
                            )}>
                              Saldo: {formatPrice(pren.saldo)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={cn('inline-flex text-xs px-2 py-1 rounded-full font-medium', statoConfig[pren.stato]?.className || 'bg-gray-100 text-gray-800')}>
                            {statoConfig[pren.stato]?.label || pren.stato}
                          </span>
                          <span className={cn('inline-flex text-xs px-2 py-1 rounded-full font-medium', fonteConfig[pren.fonte]?.className || 'bg-gray-100 text-gray-700')}>
                            {fonteConfig[pren.fonte]?.label || pren.fonte}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredPrenotazioni.length === 0 && (
            <div className="p-8 text-center text-gray-500">Nessuna prenotazione trovata</div>
          )}
        </div>
      </div>
    </>
  )
}
