'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Save, ArrowLeft, Dog, Calculator, Loader2, Bed, Users, CheckCircle, XCircle } from 'lucide-react'
import { cn, formatPrice, calculateNights } from '@/lib/utils'
import { appartamentiConfig, costiExtra, calcolaPrezzoSoggiorno } from '@/config/appartamenti'

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
  numNeonati: number
  animali: boolean
  animaliDettaglio: string | null
  biancheria: boolean
  bianchieriaSets: number
  biancheriaCosto: number
  prezzoSoggiorno: number
  prezzoExtra: number
  tassaSoggiorno: number
  totale: number
  acconto: number
  saldo: number
  accontoPagato: boolean
  saldoPagato: boolean
  stato: string
  fonte: string
  fonteRiferimento: string | null
  richiesteSpeciali: string | null
  noteInterne: string | null
  ospite: Ospite
  appartamento: Appartamento
}

export default function ModificaPrenotazionePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prenotazione, setPrenotazione] = useState<Prenotazione | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    ospiteNome: '',
    ospiteCognome: '',
    ospiteEmail: '',
    ospiteTelefono: '',
    ospiteNazione: 'Italia',
    ospiteId: 0,
    numAdulti: 2,
    numBambini: 0,
    numNeonati: 0,
    animali: false,
    animaliDettaglio: '',
    biancheria: false,
    fonte: 'direct',
    fonteRiferimento: '',
    richiesteSpeciali: '',
    noteInterne: '',
    stato: 'confirmed',
    accontoPagato: false,
    saldoPagato: false,
  })

  // Prezzi manuali
  const [prezziManuali, setPrezziManuali] = useState({
    prezzoSoggiorno: 0,
    biancheriaCosto: 0,
    tassaSoggiorno: 0,
    extra: 0,
    acconto: 0,
  })

  // Carica i dati della prenotazione
  useEffect(() => {
    async function fetchPrenotazione() {
      try {
        const response = await fetch(`/api/prenotazioni/${id}`)
        if (!response.ok) {
          throw new Error('Prenotazione non trovata')
        }
        const data: Prenotazione = await response.json()
        setPrenotazione(data)

        // Popola il form con i dati esistenti
        setFormData({
          checkIn: data.checkIn.split('T')[0],
          checkOut: data.checkOut.split('T')[0],
          ospiteNome: data.ospite.nome,
          ospiteCognome: data.ospite.cognome,
          ospiteEmail: data.ospite.email || '',
          ospiteTelefono: data.ospite.telefono || '',
          ospiteNazione: data.ospite.nazione || 'Italia',
          ospiteId: data.ospiteId,
          numAdulti: data.numAdulti,
          numBambini: data.numBambini,
          numNeonati: data.numNeonati || 0,
          animali: data.animali,
          animaliDettaglio: data.animaliDettaglio || '',
          biancheria: data.biancheria,
          fonte: data.fonte,
          fonteRiferimento: data.fonteRiferimento || '',
          richiesteSpeciali: data.richiesteSpeciali || '',
          noteInterne: data.noteInterne || '',
          stato: data.stato,
          accontoPagato: data.accontoPagato,
          saldoPagato: data.saldoPagato,
        })

        setPrezziManuali({
          prezzoSoggiorno: data.prezzoSoggiorno,
          biancheriaCosto: data.biancheriaCosto,
          tassaSoggiorno: data.tassaSoggiorno,
          extra: data.prezzoExtra || 0,
          acconto: data.acconto,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento')
      } finally {
        setLoading(false)
      }
    }

    fetchPrenotazione()
  }, [id])

  // Calcola notti
  const notti = formData.checkIn && formData.checkOut
    ? calculateNights(formData.checkIn, formData.checkOut)
    : 0

  // Totale finale
  const totaleFinale = prezziManuali.prezzoSoggiorno + prezziManuali.biancheriaCosto + prezziManuali.tassaSoggiorno + prezziManuali.extra

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleNumberChange = (name: string, delta: number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: Math.max(0, (prev[name as keyof typeof prev] as number) + delta),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const response = await fetch(`/api/prenotazioni/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ...prezziManuali,
          bianchieriaSets: formData.biancheria ? (formData.numAdulti + formData.numBambini) : 0,
          totale: totaleFinale,
          saldo: totaleFinale - prezziManuali.acconto,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel salvataggio')
      }

      router.push('/prenotazioni')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Modifica Prenotazione" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error && !prenotazione) {
    return (
      <>
        <Header title="Modifica Prenotazione" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
          <button
            onClick={() => router.back()}
            className="mt-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna indietro
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Modifica Prenotazione" />

      <div className="p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna indietro
          </button>

          {/* Appartamento (non modificabile) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appartamento</h2>
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: prenotazione?.appartamento.colore || '#3B82F6' }}
              >
                {prenotazione?.appartamentoId}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{prenotazione?.appartamento.nome}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Non modificabile</p>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Date</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-in *
                </label>
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-out *
                </label>
                <input
                  type="date"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={handleChange}
                  required
                  min={formData.checkIn}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {notti > 0 && (
              <p className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium">
                {notti} notti selezionate
              </p>
            )}
          </div>

          {/* Dati Ospite */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dati Ospite</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  name="ospiteNome"
                  value={formData.ospiteNome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cognome *
                </label>
                <input
                  type="text"
                  name="ospiteCognome"
                  value={formData.ospiteCognome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="ospiteEmail"
                  value={formData.ospiteEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  name="ospiteTelefono"
                  value={formData.ospiteTelefono}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nazione
                </label>
                <input
                  type="text"
                  name="ospiteNazione"
                  value={formData.ospiteNazione}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Numero Ospiti */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Numero Ospiti</h2>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adulti</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numAdulti', -1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xl font-semibold dark:text-white">{formData.numAdulti}</span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numAdulti', 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bambini (3-12)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numBambini', -1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xl font-semibold dark:text-white">{formData.numBambini}</span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numBambini', 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Neonati (0-2)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numNeonati', -1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xl font-semibold dark:text-white">{formData.numNeonati}</span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numNeonati', 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stato Prenotazione e Pagamenti */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stato e Pagamenti</h2>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stato prenotazione
                </label>
                <select
                  name="stato"
                  value={formData.stato}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="pending">In attesa</option>
                  <option value="confirmed">Confermata</option>
                  <option value="checkedin">Check-in effettuato</option>
                  <option value="completed">Completata</option>
                  <option value="cancelled">Cancellata</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fonte
                </label>
                <select
                  name="fonte"
                  value={formData.fonte}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="direct">Diretto</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
            </div>

            {/* Pagamenti */}
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => setFormData(prev => ({ ...prev, accontoPagato: !prev.accontoPagato }))}
                className={cn(
                  'p-4 border-2 rounded-xl cursor-pointer transition-all',
                  formData.accontoPagato
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formData.accontoPagato ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Acconto</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(prezziManuali.acconto)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    formData.accontoPagato ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  )}>
                    {formData.accontoPagato ? 'Pagato' : 'Da pagare'}
                  </span>
                </div>
              </div>

              <div
                onClick={() => setFormData(prev => ({ ...prev, saldoPagato: !prev.saldoPagato }))}
                className={cn(
                  'p-4 border-2 rounded-xl cursor-pointer transition-all',
                  formData.saldoPagato
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formData.saldoPagato ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Saldo</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(totaleFinale - prezziManuali.acconto)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    formData.saldoPagato ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  )}>
                    {formData.saldoPagato ? 'Pagato' : 'Da pagare'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Extra: Animali e Biancheria */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Extra</h2>

            <div className="space-y-4">
              {/* Animali */}
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Dog className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Animali domestici</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Il cliente porta animali?</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="animali"
                      checked={formData.animali}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formData.animali && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dettagli animali
                    </label>
                    <input
                      type="text"
                      name="animaliDettaglio"
                      value={formData.animaliDettaglio}
                      onChange={handleChange}
                      placeholder="Es: 1 cane di taglia media"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Biancheria */}
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bed className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Biancheria</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPrice(costiExtra.biancheria)} per persona
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="biancheria"
                      checked={formData.biancheria}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Note</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Richieste speciali
                </label>
                <textarea
                  name="richiesteSpeciali"
                  value={formData.richiesteSpeciali}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note interne
                </label>
                <textarea
                  name="noteInterne"
                  value={formData.noteInterne}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Visibili solo a te..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Riepilogo Costi */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Riepilogo Costi</h2>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Modificabile</span>
            </div>

            <div className="space-y-4">
              {/* Prezzo Soggiorno */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-300">Soggiorno ({notti} notti)</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number"
                    value={prezziManuali.prezzoSoggiorno}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, prezzoSoggiorno: parseFloat(e.target.value) || 0 }))}
                    className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Biancheria */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-300">Biancheria</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number"
                    value={prezziManuali.biancheriaCosto}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, biancheriaCosto: parseFloat(e.target.value) || 0 }))}
                    className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Tassa soggiorno */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-300">Tassa soggiorno</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number"
                    value={prezziManuali.tassaSoggiorno}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, tassaSoggiorno: parseFloat(e.target.value) || 0 }))}
                    className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Extra / Sconto */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Extra / Sconto</span>
                  <span className="text-xs text-gray-400 ml-1">(negativo = sconto)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number"
                    value={prezziManuali.extra}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, extra: parseFloat(e.target.value) || 0 }))}
                    className={cn(
                      "w-28 px-3 py-1.5 border rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white",
                      prezziManuali.extra < 0 ? "border-green-300 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "border-gray-300 dark:border-gray-600"
                    )}
                  />
                </div>
              </div>

              {/* TOTALE */}
              <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-200 dark:border-gray-600 mt-2">
                <span className="dark:text-white">TOTALE</span>
                <span className="text-blue-600">{formatPrice(totaleFinale)}</span>
              </div>

              {/* Acconto e Saldo */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Acconto</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">€</span>
                    <input
                      type="number"
                      value={prezziManuali.acconto}
                      onChange={(e) => setPrezziManuali(prev => ({ ...prev, acconto: parseFloat(e.target.value) || 0 }))}
                      className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium text-green-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Saldo</span>
                  <span className="font-medium dark:text-white">{formatPrice(totaleFinale - prezziManuali.acconto)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
