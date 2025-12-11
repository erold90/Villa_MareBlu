'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Search, Eye, Edit, Mail, Phone, MapPin, Star, Loader2, AlertCircle, Calendar, Users } from 'lucide-react'
import { cn, formatDate, formatPrice } from '@/lib/utils'

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
  vip: boolean
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
  ospitiVip: number
}

export default function OspitiPage() {
  const [data, setData] = useState<OspitiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(null)
  const [mostraTutti, setMostraTutti] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVip, setFilterVip] = useState(false)

  useEffect(() => {
    async function fetchOspiti() {
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

    fetchOspiti()
  }, [annoSelezionato, mostraTutti])

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

  const { stagione, stagioniDisponibili, ospiti, totaleOspiti, ospitiVip } = data

  const filteredOspiti = ospiti.filter((ospite) => {
    const matchSearch =
      `${ospite.nome} ${ospite.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ospite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ospite.citta?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchVip = !filterVip || ospite.vip
    return matchSearch && matchVip
  })

  return (
    <>
      <Header
        title="Ospiti"
        subtitle={mostraTutti ? `${totaleOspiti} ospiti totali` : `${totaleOspiti} ospiti stagione ${stagione.anno}`}
      />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Filtri Stagione */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500" />
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {stagioniDisponibili.map((anno) => (
                  <option key={anno} value={anno}>
                    Stagione {anno}
                  </option>
                ))}
                <option value="tutti">Tutti gli ospiti (storico)</option>
              </select>
              {!mostraTutti && (
                <span className={cn('text-xs px-2 py-1 rounded-full', stagione.badge.colore)}>
                  {stagione.badge.testo}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{totaleOspiti} ospiti</span>
              {ospitiVip > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{ospitiVip} VIP</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messaggio se non ci sono ospiti */}
        {ospiti.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Nessun ospite per la stagione {stagione.anno}</p>
              <p className="text-sm text-blue-700 mt-1">
                Gli ospiti verranno mostrati quando ci saranno prenotazioni per questa stagione.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        {ospiti.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca per nome, email o citta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setFilterVip(!filterVip)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors',
                  filterVip
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                )}
              >
                <Star className={cn('w-4 h-4', filterVip && 'fill-amber-400')} />
                Solo VIP
              </button>
            </div>
          </div>
        )}

        {/* Grid Ospiti */}
        {filteredOspiti.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOspiti.map((ospite) => (
              <div key={ospite.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {ospite.nome[0]}{ospite.cognome[0]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {ospite.nome} {ospite.cognome}
                        </h3>
                        {ospite.vip && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {ospite.citta ? `${ospite.citta}, ` : ''}{ospite.nazione}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <a
                    href={`mailto:${ospite.email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <Mail className="h-4 w-4" />
                    {ospite.email}
                  </a>
                  <a
                    href={`tel:${ospite.telefono}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <Phone className="h-4 w-4" />
                    {ospite.telefono}
                  </a>
                </div>

                <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {mostraTutti ? ospite.prenotazioniTotali : ospite.prenotazioni}
                    </p>
                    <p className="text-xs text-gray-500">
                      {mostraTutti ? 'Soggiorni' : `Sogg. ${stagione.anno}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(mostraTutti ? ospite.totaleSpeso : ospite.totaleSpessoStagione)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {mostraTutti ? 'Totale' : `Speso ${stagione.anno}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {ospite.ultimoSoggiorno ? formatDate(ospite.ultimoSoggiorno) : '-'}
                    </p>
                    <p className="text-xs text-gray-500">Ultimo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOspiti.length === 0 && ospiti.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            Nessun ospite trovato con i filtri selezionati
          </div>
        )}
      </div>
    </>
  )
}
