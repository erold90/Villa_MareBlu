'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Search, Eye, Edit, Mail, Phone, MapPin, Loader2, AlertCircle, Calendar, Users, X, Save } from 'lucide-react'
import { cn, formatDate, formatPrice } from '@/lib/utils'

interface Prenotazione {
  id: number
  checkIn: string
  checkOut: string
  appartamento: string
  totale: number
  stato: string
}

interface OspiteDettaglio {
  id: number
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  nazione: string | null
  citta: string | null
  prenotazioni: Prenotazione[]
}

interface Ospite {
  id: number
  nome: string
  cognome: string
  email: string
  telefono: string
  nazione: string
  citta: string
  prenotazioni: number
  prenotazioniTotali: number
  totaleSpeso: number
  totaleSpessoStagione: number
  ultimoSoggiorno: string | null
}

interface OspitiData {
  stagione: {
    anno: number
    badge: { testo: string; colore: string }
  }
  stagioniDisponibili: number[]
  mostraTutti: boolean
  ospiti: Ospite[]
  totaleOspiti: number
}

export default function OspitiPage() {
  const [data, setData] = useState<OspitiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(null)
  const [mostraTutti, setMostraTutti] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Stati modali
  const [ospiteSelezionato, setOspiteSelezionato] = useState<OspiteDettaglio | null>(null)
  const [modalVisualizza, setModalVisualizza] = useState(false)
  const [modalModifica, setModalModifica] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    nazione: '',
    citta: ''
  })
  const [saving, setSaving] = useState(false)

  const fetchOspiti = async () => {
    try {
      setLoading(true)
      let url = '/api/ospiti'
      const params = new URLSearchParams()

      if (annoSelezionato) {
        params.append('anno', annoSelezionato.toString())
      }
      if (mostraTutti) {
        params.append('tutti', 'true')
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Errore nel caricamento')
      const ospitiData = await response.json()
      setData(ospitiData)
      if (!annoSelezionato) {
        setAnnoSelezionato(ospitiData.stagione.anno)
      }
    } catch (err) {
      setError('Errore nel caricamento degli ospiti')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOspiti()
  }, [annoSelezionato, mostraTutti])

  // Carica dettagli ospite
  const caricaDettagliOspite = async (id: number) => {
    try {
      const response = await fetch(`/api/ospiti/${id}`)
      if (!response.ok) throw new Error('Errore')
      const ospite = await response.json()
      setOspiteSelezionato(ospite)
      return ospite
    } catch (err) {
      console.error('Errore caricamento dettagli:', err)
      return null
    }
  }

  // Apri modale visualizza
  const handleVisualizza = async (id: number) => {
    const ospite = await caricaDettagliOspite(id)
    if (ospite) {
      setModalVisualizza(true)
    }
  }

  // Apri modale modifica
  const handleModifica = async (id: number) => {
    const ospite = await caricaDettagliOspite(id)
    if (ospite) {
      setFormData({
        nome: ospite.nome || '',
        cognome: ospite.cognome || '',
        email: ospite.email || '',
        telefono: ospite.telefono || '',
        nazione: ospite.nazione || '',
        citta: ospite.citta || ''
      })
      setModalModifica(true)
    }
  }

  // Salva modifiche
  const handleSalva = async () => {
    if (!ospiteSelezionato) return

    setSaving(true)
    try {
      const response = await fetch(`/api/ospiti/${ospiteSelezionato.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Errore nel salvataggio')

      // Ricarica la lista
      await fetchOspiti()
      setModalModifica(false)
      setOspiteSelezionato(null)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      alert('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Ospiti" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Ospiti" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Errore sconosciuto'}</div>
        </div>
      </>
    )
  }

  const { stagione, stagioniDisponibili, ospiti, totaleOspiti } = data

  const filteredOspiti = ospiti.filter((ospite) => {
    return `${ospite.nome} ${ospite.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ospite.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ospite.citta?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <>
      <Header
        title="Ospiti"
        subtitle={mostraTutti ? `${totaleOspiti} ospiti totali` : `${totaleOspiti} ospiti stagione ${stagione.anno}`}
      />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Filtri Stagione */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <select
                value={mostraTutti ? 'tutti' : (annoSelezionato || '')}
                onChange={(e) => {
                  if (e.target.value === 'tutti') {
                    setMostraTutti(true)
                  } else {
                    setMostraTutti(false)
                    setAnnoSelezionato(parseInt(e.target.value))
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {stagioniDisponibili.map((anno) => (
                  <option key={anno} value={anno}>
                    Stagione {anno}
                  </option>
                ))}
                <option value="tutti">Tutti gli ospiti (storico)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{totaleOspiti} ospiti</span>
            </div>
          </div>
        </div>

        {/* Messaggio se non ci sono ospiti */}
        {ospiti.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Nessun ospite per la stagione {stagione.anno}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Gli ospiti verranno mostrati quando ci saranno prenotazioni per questa stagione.
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        {ospiti.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome, email o citta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Grid Ospiti */}
        {filteredOspiti.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOspiti.map((ospite) => (
              <div key={ospite.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {ospite.nome[0]}{ospite.cognome[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {ospite.nome} {ospite.cognome}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {ospite.citta ? `${ospite.citta}, ` : ''}{ospite.nazione}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleVisualizza(ospite.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Visualizza"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleModifica(ospite.id)}
                      className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {ospite.email && (
                    <a
                      href={`mailto:${ospite.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4" />
                      {ospite.email}
                    </a>
                  )}
                  {ospite.telefono && (
                    <a
                      href={`tel:${ospite.telefono}`}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"
                    >
                      <Phone className="h-4 w-4" />
                      {ospite.telefono}
                    </a>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {mostraTutti ? ospite.prenotazioniTotali : ospite.prenotazioni}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {mostraTutti ? 'Soggiorni' : `Sogg. ${stagione.anno}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatPrice(mostraTutti ? ospite.totaleSpeso : ospite.totaleSpessoStagione)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {mostraTutti ? 'Totale' : `Speso ${stagione.anno}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {ospite.ultimoSoggiorno ? formatDate(ospite.ultimoSoggiorno) : '-'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ultimo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOspiti.length === 0 && ospiti.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
            Nessun ospite trovato con i filtri selezionati
          </div>
        )}
      </div>

      {/* Modale Visualizza */}
      {modalVisualizza && ospiteSelezionato && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {ospiteSelezionato.nome} {ospiteSelezionato.cognome}
              </h2>
              <button
                onClick={() => { setModalVisualizza(false); setOspiteSelezionato(null); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">{ospiteSelezionato.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Telefono</p>
                  <p className="text-gray-900 dark:text-white">{ospiteSelezionato.telefono || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nazione</p>
                  <p className="text-gray-900 dark:text-white">{ospiteSelezionato.nazione || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Citta</p>
                  <p className="text-gray-900 dark:text-white">{ospiteSelezionato.citta || '-'}</p>
                </div>
              </div>

              {ospiteSelezionato.prenotazioni.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Storico prenotazioni</p>
                  <div className="space-y-2">
                    {ospiteSelezionato.prenotazioni.map((p) => (
                      <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{p.appartamento}</span>
                          <span className="text-gray-600 dark:text-gray-300">{formatPrice(p.totale)}</span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {formatDate(p.checkIn)} - {formatDate(p.checkOut)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Modifica */}
      {modalModifica && ospiteSelezionato && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Modifica Ospite</h2>
              <button
                onClick={() => { setModalModifica(false); setOspiteSelezionato(null); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cognome</label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazione</label>
                  <input
                    type="text"
                    value={formData.nazione}
                    onChange={(e) => setFormData({ ...formData, nazione: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Citta</label>
                  <input
                    type="text"
                    value={formData.citta}
                    onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setModalModifica(false); setOspiteSelezionato(null); }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleSalva}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
