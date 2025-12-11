'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Search, Filter, Eye, Edit, Trash2, MoreVertical, Dog, Bed, Loader2, X, Phone, Mail, MapPin, Calendar, Users, CreditCard, FileText } from 'lucide-react'
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

// Determina lo stato visivo basandosi su stato prenotazione + acconto pagato
function getStatoVisivo(pren: Prenotazione): { label: string; className: string } {
  // Se cancellata o completata, mostra sempre quello stato
  if (pren.stato === 'cancelled') {
    return statoConfig.cancelled
  }
  if (pren.stato === 'completed') {
    return statoConfig.completed
  }
  if (pren.stato === 'checkedin') {
    return statoConfig.checkedin
  }

  // Per stati pending/confirmed, controlla se l'acconto è pagato
  if (!pren.accontoPagato) {
    return { label: 'In attesa', className: 'bg-yellow-100 text-yellow-800' }
  }

  // Acconto pagato = confermata
  return { label: 'Confermata', className: 'bg-green-100 text-green-800' }
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
  const router = useRouter()
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStato, setFilterStato] = useState('all')
  const [filterAppartamento, setFilterAppartamento] = useState('all')
  const [filterStagione, setFilterStagione] = useState<string>('future') // 'future', 'all', o anno specifico

  // Modal states
  const [selectedPrenotazione, setSelectedPrenotazione] = useState<Prenotazione | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const stagioni = getStagioniDisponibili()

  // Funzione per visualizzare dettaglio
  const handleView = (pren: Prenotazione) => {
    setSelectedPrenotazione(pren)
    setShowDetailModal(true)
  }

  // Funzione per andare alla modifica
  const handleEdit = (pren: Prenotazione) => {
    router.push(`/prenotazioni/${pren.id}/modifica`)
  }

  // Funzione per aprire modal eliminazione
  const handleDeleteClick = (pren: Prenotazione) => {
    setSelectedPrenotazione(pren)
    setShowDeleteModal(true)
  }

  // Funzione per confermare eliminazione
  const handleDeleteConfirm = async () => {
    if (!selectedPrenotazione) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/prenotazioni/${selectedPrenotazione.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Errore nella cancellazione')
      }

      // Rimuovi dalla lista locale
      setPrenotazioni(prev => prev.filter(p => p.id !== selectedPrenotazione.id))
      setShowDeleteModal(false)
      setSelectedPrenotazione(null)
    } catch (err) {
      console.error('Errore eliminazione:', err)
      alert('Errore durante la cancellazione della prenotazione')
    } finally {
      setDeleting(false)
    }
  }

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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStagione}
                onChange={(e) => setFilterStagione(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
              <div key={pren.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: getAppartamentoColore(pren) }}
                    >
                      {pren.appartamentoId}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {pren.ospite.cognome} {pren.ospite.nome}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{pren.appartamento.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pren.animali && <Dog className="w-4 h-4 text-amber-500" />}
                    {pren.biancheria && <Bed className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Check-in</p>
                    <p className="font-medium dark:text-white">{formatDate(pren.checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Check-out</p>
                    <p className="font-medium dark:text-white">{formatDate(pren.checkOut)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Ospiti</p>
                    <p className="font-medium dark:text-white">
                      {pren.numAdulti} adulti{pren.numBambini > 0 && `, ${pren.numBambini} bambini`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Totale</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatPrice(pren.totale)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatoVisivo(pren).className)}>
                      {getStatoVisivo(pren).label}
                    </span>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', fonteConfig[pren.fonte]?.className || 'bg-gray-100 text-gray-700')}>
                      {fonteConfig[pren.fonte]?.label || pren.fonte}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(pren)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(pren)}
                      className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(pren)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Prenotazioni Table - Desktop */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Ospite</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Appartamento</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Ospiti</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Extra</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Pagamento</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Stato</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPrenotazioni.map((pren) => {
                  return (
                    <tr key={pren.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {pren.ospite.cognome} {pren.ospite.nome}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{pren.ospite.nazione || ''}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: getAppartamentoColore(pren) }}
                          >
                            {pren.appartamentoId}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{pren.appartamento.nome}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-700 dark:text-gray-300">{formatDate(pren.checkIn)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(pren.checkOut)}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-700 dark:text-gray-300">{pren.numAdulti} adulti</p>
                        {pren.numBambini > 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{pren.numBambini} bambini</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {pren.animali && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                              <Dog className="w-3 h-3" />
                              Si
                            </span>
                          )}
                          {pren.biancheria && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                              <Bed className="w-3 h-3" />
                              {formatPrice(pren.biancheriaCosto)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(pren.totale)}</p>
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
                          <span className={cn('inline-flex text-xs px-2 py-1 rounded-full font-medium', getStatoVisivo(pren).className)}>
                            {getStatoVisivo(pren).label}
                          </span>
                          <span className={cn('inline-flex text-xs px-2 py-1 rounded-full font-medium', fonteConfig[pren.fonte]?.className || 'bg-gray-100 text-gray-700')}>
                            {fonteConfig[pren.fonte]?.label || pren.fonte}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleView(pren)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Visualizza dettaglio"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(pren)}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(pren)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Elimina"
                          >
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
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nessuna prenotazione trovata</div>
          )}
        </div>
      </div>

      {/* Modal Dettaglio Prenotazione */}
      {showDetailModal && selectedPrenotazione && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dettaglio Prenotazione</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenuto Modal */}
            <div className="p-6 space-y-6">
              {/* Appartamento */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: getAppartamentoColore(selectedPrenotazione) }}
                >
                  {selectedPrenotazione.appartamentoId}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedPrenotazione.appartamento.nome}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatoVisivo(selectedPrenotazione).className)}>
                      {getStatoVisivo(selectedPrenotazione).label}
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
                  {selectedPrenotazione.ospite.cognome} {selectedPrenotazione.ospite.nome}
                </p>
                {selectedPrenotazione.ospite.email && (
                  <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {selectedPrenotazione.ospite.email}
                  </p>
                )}
                {selectedPrenotazione.ospite.telefono && (
                  <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    {selectedPrenotazione.ospite.telefono}
                  </p>
                )}
                {selectedPrenotazione.ospite.nazione && (
                  <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {selectedPrenotazione.ospite.nazione}
                  </p>
                )}
              </div>

              {/* Date e Ospiti */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Check-in
                  </h4>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {formatDate(selectedPrenotazione.checkIn)}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Check-out
                  </h4>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    {formatDate(selectedPrenotazione.checkOut)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Composizione</h4>
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
                        Biancheria ({selectedPrenotazione.bianchieriaSets} set - {formatPrice(selectedPrenotazione.biancheriaCosto)})
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
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Chiudi
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false)
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

      {/* Modal Conferma Eliminazione */}
      {showDeleteModal && selectedPrenotazione && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Elimina Prenotazione</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Sei sicuro di voler eliminare la prenotazione di <strong>{selectedPrenotazione.ospite.cognome} {selectedPrenotazione.ospite.nome}</strong> per {selectedPrenotazione.appartamento.nome}?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Questa azione non può essere annullata.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedPrenotazione(null)
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Elimina
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
