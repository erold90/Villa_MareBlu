'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Save, ArrowLeft, Dog, Calculator, Plus, X, Users, Bed, CreditCard, Copy, Check } from 'lucide-react'
import { cn, formatPrice, calculateNights } from '@/lib/utils'
import { appartamentiConfig, costiExtra, calcolaPrezzoSoggiorno } from '@/config/appartamenti'

export default function NuovaPrenotazionePage() {
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    // Appartamenti (array per supportare multi-appartamento)
    appartamentiIds: [] as number[],
    // Legacy single apartment (per retrocompatibilità)
    appartamentoId: '',

    // Date
    checkIn: '',
    checkOut: '',

    // Ospite
    ospiteNome: '',
    ospiteCognome: '',
    ospiteEmail: '',
    ospiteTelefono: '',
    telefonoDaChiedere: false,
    ospiteNazione: 'Italia',

    // Ospiti
    numAdulti: 2,
    numBambini: 0,
    numNeonati: 0,

    // Animali
    animali: false,
    animaliDettaglio: '',

    // Biancheria
    biancheria: false,

    // Fonte
    fonte: 'direct',
    fonteRiferimento: '',

    // Note
    richiesteSpeciali: '',
    noteInterne: '',

    // Dettagli acconto
    accontoPagato: false,
    accontoCausale: '',
    accontoDataBonifico: '',
    accontoNomePagante: '',
    accontoRiferimento: '',
  })

  // Calculated values (suggeriti dal sistema)
  const [calcolati, setCalcolati] = useState({
    notti: 0,
    nottiEffettive: 0, // Settimane intere (per calcolo prezzo)
    isSettimanaIncompleta: false, // Se il soggiorno è < 7 notti ma viene addebitata settimana intera
    prezzoSoggiorno: 0,
    biancheriaCosto: 0,
    tassaSoggiorno: 0,
    scontoArrotondamento: 0, // Sconto automatico per arrotondare a multipli di €50
    totale: 0,
    acconto: 0,
    saldo: 0,
  })

  // Prezzi manuali (modificabili dall'utente)
  const [prezziManuali, setPrezziManuali] = useState({
    prezzoSoggiorno: 0,
    biancheriaCosto: 0,
    tassaSoggiorno: 0,
    sconto: 0, // Sconto (valore positivo = sottratto dal totale)
    acconto: 0,
  })

  // Arrotondamento a multipli di €50 (per difetto, come villamareblu.it)
  const roundToMultipleOf50 = (value: number): number => Math.floor(value / 50) * 50

  // Totale finale calcolato dai prezzi manuali (senza tassa soggiorno, già inclusa)
  // Lo sconto è già preimpostato con l'arrotondamento, quindi il totale = raw - sconto
  const rawTotaleFinale = prezziManuali.prezzoSoggiorno + prezziManuali.biancheriaCosto
  const totaleFinale = rawTotaleFinale - prezziManuali.sconto

  // Calculate costs when relevant fields change
  useEffect(() => {
    if (!formData.checkIn || !formData.checkOut || formData.appartamentiIds.length === 0) {
      setCalcolati({
        notti: 0,
        nottiEffettive: 0,
        isSettimanaIncompleta: false,
        prezzoSoggiorno: 0,
        biancheriaCosto: 0,
        tassaSoggiorno: 0,
        scontoArrotondamento: 0,
        totale: 0,
        acconto: 0,
        saldo: 0,
      })
      return
    }

    const notti = calculateNights(formData.checkIn, formData.checkOut)
    // Persone che occupano un posto letto (bambini senza letto NON contano)
    const numPersoneInLetto = formData.numAdulti + formData.numBambini - formData.numNeonati

    // Calcola il numero di settimane (arrotondato per eccesso)
    // Se prenoti 6 notti (dom-sab) paghi comunque la settimana intera
    // perché quel giorno mancante non può essere affittato
    const settimane = Math.ceil(notti / 7)
    const nottiEffettive = settimane * 7 // Per il calcolo del prezzo
    const isSettimanaIncompleta = notti < nottiEffettive

    // Calcola prezzo per ogni appartamento selezionato usando il nuovo sistema settimane sabato-sabato
    const anno = new Date(formData.checkIn).getFullYear()
    let prezzoSoggiorno = 0
    formData.appartamentiIds.forEach(appId => {
      const risultato = calcolaPrezzoSoggiorno(anno, formData.checkIn, formData.checkOut, appId)
      prezzoSoggiorno += risultato.prezzoTotale
    })

    // Biancheria solo per persone che occupano un letto
    const biancheriaCosto = formData.biancheria ? numPersoneInLetto * costiExtra.biancheria : 0

    // Tassa soggiorno: INCLUSA nel prezzo base (come villamareblu.it)
    const tassaSoggiorno = 0

    // Arrotondamento a multipli di €50 (per difetto, come villamareblu.it)
    const roundToMultipleOf50 = (value: number): number => Math.floor(value / 50) * 50
    const rawTotal = prezzoSoggiorno + biancheriaCosto
    const totale = roundToMultipleOf50(rawTotal)

    // Sconto arrotondamento (differenza tra raw e arrotondato)
    const scontoArrotondamento = rawTotal - totale

    // Acconto (30%) arrotondato a multipli di €50 per difetto
    const accontoRaw = totale * (costiExtra.accontoPercentuale / 100)
    const acconto = roundToMultipleOf50(accontoRaw)
    const saldo = totale - acconto

    setCalcolati({
      notti,
      nottiEffettive,
      isSettimanaIncompleta,
      prezzoSoggiorno,
      biancheriaCosto,
      tassaSoggiorno,
      scontoArrotondamento,
      totale,
      acconto,
      saldo,
    })
  }, [formData.checkIn, formData.checkOut, formData.appartamentiIds, formData.numAdulti, formData.numBambini, formData.numNeonati, formData.biancheria])

  // Sincronizza prezzi manuali con i calcolati quando cambiano (solo se non modificati manualmente)
  useEffect(() => {
    setPrezziManuali(prev => ({
      prezzoSoggiorno: prev.prezzoSoggiorno === 0 || prev.prezzoSoggiorno === calcolati.prezzoSoggiorno ? calcolati.prezzoSoggiorno : prev.prezzoSoggiorno,
      biancheriaCosto: calcolati.biancheriaCosto, // Sempre sincronizzato con la checkbox biancheria
      tassaSoggiorno: calcolati.tassaSoggiorno, // Sempre sincronizzato con adulti * notti
      sconto: calcolati.scontoArrotondamento, // Preimpostato con arrotondamento (aggiornabile manualmente)
      acconto: prev.acconto === 0 || prev.acconto === calcolati.acconto ? calcolati.acconto : prev.acconto,
    }))
  }, [calcolati])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const isCheckbox = type === 'checkbox'
    const newValue = isCheckbox ? (e.target as HTMLInputElement).checked : value

    // Se si spunta "Da chiedere", svuota il campo telefono
    if (name === 'telefonoDaChiedere' && newValue === true) {
      setFormData((prev) => ({
        ...prev,
        telefonoDaChiedere: true,
        ospiteTelefono: '', // Svuota il telefono
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
  }

  const handleNumberChange = (name: string, delta: number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: Math.max(0, (prev[name as keyof typeof prev] as number) + delta),
    }))
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ibanCopied, setIbanCopied] = useState(false)
  const [causaleCopied, setCausaleCopied] = useState(false)
  const [messaggioCopied, setMessaggioCopied] = useState(false)

  // Dati bancari fissi
  const IBAN = 'IT65V3677222300OEM002615062'
  const INTESTATARIO = 'Lo Re Daniele'
  const BANCA = 'HYPE - Banca Sella'
  const BIC = 'HYEEIT22XXX'

  // Genera causale automatica: VMB-APP{n}-{DDMMMYYYY}-{COGNOME}
  // Genera causale: ACCVMBAPP{n}{DDin}{MMin}{DDout}{MMout}
  // Esempio: ACCVMBAPP209081608 = App2, dal 09/08 al 16/08
  const generateCausale = () => {
    if (!formData.checkIn || !formData.checkOut || formData.appartamentiIds.length === 0) {
      return ''
    }
    const appIds = formData.appartamentiIds.sort().join('')
    const checkInDate = new Date(formData.checkIn)
    const checkOutDate = new Date(formData.checkOut)
    const ddIn = checkInDate.getDate().toString().padStart(2, '0')
    const mmIn = (checkInDate.getMonth() + 1).toString().padStart(2, '0')
    const ddOut = checkOutDate.getDate().toString().padStart(2, '0')
    const mmOut = (checkOutDate.getMonth() + 1).toString().padStart(2, '0')
    return `ACCVMBAPP${appIds}${ddIn}${mmIn}${ddOut}${mmOut}`
  }

  // Causale attuale (auto-generata o manuale)
  const causaleAttuale = formData.accontoCausale || generateCausale()

  // Genera messaggio completo per il cliente (tutti i dati bonifico)
  const generateMessaggioCompleto = () => {
    if (!causaleAttuale) return ''
    return `Per confermare la prenotazione, effettua un bonifico di €${prezziManuali.acconto.toLocaleString('it-IT')} con questi dati:

Intestatario: ${INTESTATARIO}
IBAN: ${IBAN}
Banca: ${BANCA}
Causale: ${causaleAttuale}
BIC/SWIFT: ${BIC}`
  }

  // Funzioni copia
  const copyIBAN = () => {
    navigator.clipboard.writeText(IBAN)
    setIbanCopied(true)
    setTimeout(() => setIbanCopied(false), 2000)
  }

  const copyCausale = () => {
    if (causaleAttuale) {
      navigator.clipboard.writeText(causaleAttuale)
      setCausaleCopied(true)
      setTimeout(() => setCausaleCopied(false), 2000)
    }
  }

  const copyMessaggioCompleto = () => {
    const messaggio = generateMessaggioCompleto()
    if (messaggio) {
      navigator.clipboard.writeText(messaggio)
      setMessaggioCopied(true)
      setTimeout(() => setMessaggioCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const response = await fetch('/api/prenotazioni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          accontoCausale: causaleAttuale, // Usa causale generata se non modificata
          prezzi: {
            prezzoSoggiorno: prezziManuali.prezzoSoggiorno,
            biancheriaCosto: prezziManuali.biancheriaCosto,
            tassaSoggiorno: prezziManuali.tassaSoggiorno,
            prezzoExtra: -prezziManuali.sconto, // Sconto come valore negativo
            acconto: prezziManuali.acconto,
            totale: totaleFinale,
            saldo: totaleFinale - prezziManuali.acconto,
          },
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

  return (
    <>
      <Header title="Nuova Prenotazione" />

      <div className="p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna indietro
          </button>

          {/* Appartamento e Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appartamenti e Date</h2>

            {/* Date prima */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {calcolati.notti > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm text-blue-600 font-medium">
                  {calcolati.notti} notti selezionate
                </p>
                {calcolati.isSettimanaIncompleta && (
                  <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
                    ⚠️ <strong>Settimana incompleta:</strong> Il soggiorno è di {calcolati.notti} notti ma il prezzo sarà calcolato su {calcolati.nottiEffettive} notti (settimana intera) perché i giorni mancanti non possono essere affittati separatamente.
                  </p>
                )}
              </div>
            )}

            {/* Selezione appartamenti (multi-select) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Appartamenti * <span className="text-gray-400 font-normal">(seleziona uno o più)</span>
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                {appartamentiConfig.map((app) => {
                  const isSelected = formData.appartamentiIds.includes(app.id)
                  return (
                    <div
                      key={app.id}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          appartamentiIds: isSelected
                            ? prev.appartamentiIds.filter(id => id !== app.id)
                            : [...prev.appartamentiIds, app.id],
                          appartamentoId: '' // Clear legacy field
                        }))
                      }}
                      className={cn(
                        'p-4 border-2 rounded-xl cursor-pointer transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{app.nome}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{app.piano}</p>
                        </div>
                        <div className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        )}>
                          {isSelected && <span className="text-white text-sm">✓</span>}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Bed className="w-4 h-4" />
                          {app.postiLetto} posti
                        </span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          {app.camere} {app.camere === 1 ? 'camera' : 'camere'}
                        </span>
                        {app.vistaMare && (
                          <span className="text-blue-600 text-xs font-medium">Vista mare</span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{app.lettiDescrizione}</p>
                    </div>
                  )
                })}
              </div>

              {formData.appartamentiIds.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Selezionati:</strong> {formData.appartamentiIds.length} appartament{formData.appartamentiIds.length === 1 ? 'o' : 'i'} -
                    <strong> Totale posti letto:</strong> {formData.appartamentiIds.reduce((sum, id) => {
                      const app = appartamentiConfig.find(a => a.id === id)
                      return sum + (app?.postiLetto || 0)
                    }, 0)}
                  </p>
                </div>
              )}
            </div>
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefono {!formData.telefonoDaChiedere && '*'}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      name="telefonoDaChiedere"
                      checked={formData.telefonoDaChiedere}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                    Da chiedere
                  </label>
                </div>
                {formData.telefonoDaChiedere ? (
                  <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
                    📞 Telefono da richiedere al cliente
                  </div>
                ) : (
                  <input
                    type="tel"
                    name="ospiteTelefono"
                    value={formData.ospiteTelefono}
                    onChange={handleChange}
                    required={!formData.telefonoDaChiedere}
                    placeholder="+39 333 1234567"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                )}
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Numero Ospiti */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Numero Ospiti</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adulti</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numAdulti', -1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium text-gray-900 dark:text-white"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xl font-semibold text-gray-900 dark:text-white">{formData.numAdulti}</span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numAdulti', 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium text-gray-900 dark:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bambini</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleNumberChange('numBambini', -1)
                      // Se riduci i bambini e numNeonati supera numBambini, riducilo
                      if (formData.numBambini - 1 < formData.numNeonati) {
                        setFormData(prev => ({ ...prev, numNeonati: Math.max(0, prev.numBambini - 1) }))
                      }
                    }}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium text-gray-900 dark:text-white"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xl font-semibold text-gray-900 dark:text-white">{formData.numBambini}</span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numBambini', 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-medium text-gray-900 dark:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Campo "Di cui senza letto" - visibile solo se ci sono bambini */}
            {formData.numBambini > 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Di cui senza letto <span className="text-blue-500 font-normal">(dormono in culla o con genitori)</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange('numNeonati', -1)}
                    className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 flex items-center justify-center text-lg font-medium text-blue-900 dark:text-white"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xl font-semibold text-blue-900 dark:text-white">{formData.numNeonati}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Non può superare il numero di bambini
                      if (formData.numNeonati < formData.numBambini) {
                        handleNumberChange('numNeonati', 1)
                      }
                    }}
                    disabled={formData.numNeonati >= formData.numBambini}
                    className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 flex items-center justify-center text-lg font-medium text-blue-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                  <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                    (max {formData.numBambini})
                  </span>
                </div>
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  Questi bambini non occupano posti letto. Culla disponibile su richiesta gratuita.
                </p>
              </div>
            )}

            {/* Riepilogo posti letto */}
            {(formData.numAdulti > 0 || formData.numBambini > 0) && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Posti letto necessari:</strong> {formData.numAdulti + formData.numBambini - formData.numNeonati}
                  <span className="text-gray-500 ml-1">
                    ({formData.numAdulti} adulti + {formData.numBambini - formData.numNeonati} bambini con letto)
                  </span>
                </p>
              </div>
            )}
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
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formData.animali && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dettagli animali (tipo, numero, taglia)
                    </label>
                    <input
                      type="text"
                      name="animaliDettaglio"
                      value={formData.animaliDettaglio}
                      onChange={handleChange}
                      placeholder="Es: 1 cane di taglia media"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Biancheria */}
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Biancheria</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPrice(costiExtra.biancheria)} per persona = {formatPrice(calcolati.biancheriaCosto)}
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
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Fonte prenotazione */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fonte Prenotazione</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Canale
                </label>
                <select
                  name="fonte"
                  value={formData.fonte}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="direct">Diretto</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                  <option value="altro">Altro</option>
                </select>
              </div>

              {formData.fonte !== 'direct' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID Prenotazione OTA
                  </label>
                  <input
                    type="text"
                    name="fonteRiferimento"
                    value={formData.fonteRiferimento}
                    onChange={handleChange}
                    placeholder="Es: HM12345678"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Note</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Richieste speciali dell ospite
                </label>
                <textarea
                  name="richiesteSpeciali"
                  value={formData.richiesteSpeciali}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Riepilogo Costi - MODIFICABILE */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Riepilogo Costi</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Modificabile</span>
            </div>

            {/* Breakdown prezzi per appartamento (solo se più di 1 appartamento) */}
            {formData.appartamentiIds.length > 1 && formData.checkIn && formData.checkOut && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Dettaglio per appartamento:
                </p>
                <div className="space-y-2">
                  {formData.appartamentiIds.map(appId => {
                    const app = appartamentiConfig.find(a => a.id === appId)
                    const anno = new Date(formData.checkIn).getFullYear()
                    const risultato = calcolaPrezzoSoggiorno(anno, formData.checkIn, formData.checkOut, appId)
                    return (
                      <div key={appId} className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: app?.colore || '#6B7280' }}
                          >
                            {appId}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">{app?.nome || `App ${appId}`}</span>
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatPrice(risultato.prezzoTotale)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between font-medium text-gray-900 dark:text-white">
                    <span>Totale appartamenti:</span>
                    <span>{formatPrice(calcolati.prezzoSoggiorno)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggerimento automatico */}
            {calcolati.prezzoSoggiorno > 0 && prezziManuali.prezzoSoggiorno !== calcolati.prezzoSoggiorno && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  💡 <strong>Prezzo suggerito:</strong> {formatPrice(calcolati.prezzoSoggiorno)} ({calcolati.notti} notti)
                  <button
                    type="button"
                    onClick={() => setPrezziManuali(prev => ({ ...prev, prezzoSoggiorno: calcolati.prezzoSoggiorno }))}
                    className="ml-2 underline hover:no-underline"
                  >
                    Usa questo
                  </button>
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Prezzo Soggiorno - Modificabile */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Soggiorno ({calcolati.notti} notti{calcolati.isSettimanaIncompleta && ` → prezzo ${calcolati.nottiEffettive} notti`})
                  </span>
                  {prezziManuali.prezzoSoggiorno !== calcolati.prezzoSoggiorno && prezziManuali.prezzoSoggiorno > 0 && (
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                      Modificato
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number"
                    value={prezziManuali.prezzoSoggiorno}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, prezzoSoggiorno: parseFloat(e.target.value) || 0 }))}
                    className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Biancheria - Modificabile */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Biancheria</span>
                  {formData.biancheria && (
                    <span className="text-xs text-gray-400 ml-1">
                      (suggerito: {formatPrice((formData.numAdulti + formData.numBambini) * costiExtra.biancheria)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number"
                    value={prezziManuali.biancheriaCosto}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, biancheriaCosto: parseFloat(e.target.value) || 0 }))}
                    className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Tassa soggiorno - Inclusa nel prezzo */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-300">Tassa soggiorno</span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-full">
                  Inclusa
                </span>
              </div>

              {/* Sconto - Preimpostato con arrotondamento, modificabile */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Sconto</span>
                  {calcolati.scontoArrotondamento > 0 && prezziManuali.sconto === calcolati.scontoArrotondamento && (
                    <span className="text-xs text-green-500 ml-1">(arrotondamento)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">- €</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={prezziManuali.sconto}
                    onChange={(e) => setPrezziManuali(prev => ({ ...prev, sconto: Math.abs(parseFloat(e.target.value)) || 0 }))}
                    placeholder="0"
                    className={cn(
                      "w-28 px-3 py-1.5 border rounded-lg text-right font-medium focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900",
                      prezziManuali.sconto > 0 ? "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    )}
                  />
                </div>
              </div>

              {/* TOTALE */}
              <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-200 dark:border-gray-600 mt-2 text-gray-900 dark:text-white">
                <span>TOTALE</span>
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
                      className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-medium text-green-600 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Saldo al check-in</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPrice(totaleFinale - prezziManuali.acconto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Cauzione (rimborsabile)</span>
                  <span className="font-medium text-gray-500 dark:text-gray-400">{formatPrice(costiExtra.cauzioneDefault)}</span>
                </div>
              </div>

              {/* Dettagli Acconto */}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Dettagli Acconto</h3>
                </div>

                {/* Stato acconto */}
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Acconto già ricevuto?</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formData.accontoPagato ? 'Il cliente ha già pagato l\'acconto' : 'In attesa del bonifico'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="accontoPagato"
                        checked={formData.accontoPagato}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>

                {/* Dati bonifico per il cliente */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dati bonifico per il cliente
                  </label>

                  <div className="space-y-3">
                    {/* IBAN con pulsante copia */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">IBAN</span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{IBAN}</span>
                      </div>
                      <button
                        type="button"
                        onClick={copyIBAN}
                        className={cn(
                          "p-2.5 rounded-lg transition-colors",
                          ibanCopied
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                            : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                        )}
                        title="Copia IBAN"
                      >
                        {ibanCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Causale con pulsante copia */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Causale</span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          {causaleAttuale || 'Seleziona appartamento e date'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={copyCausale}
                        disabled={!causaleAttuale}
                        className={cn(
                          "p-2.5 rounded-lg transition-colors disabled:opacity-50",
                          causaleCopied
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                            : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                        )}
                        title="Copia Causale"
                      >
                        {causaleCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Info aggiuntive (non copiabili separatamente) */}
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                      <div><span className="text-gray-500">Intestatario:</span> {INTESTATARIO}</div>
                      <div><span className="text-gray-500">Banca:</span> {BANCA}</div>
                      <div><span className="text-gray-500">BIC/SWIFT:</span> {BIC}</div>
                    </div>

                    {/* Bottone copia messaggio completo */}
                    <button
                      type="button"
                      onClick={copyMessaggioCompleto}
                      disabled={!causaleAttuale}
                      className={cn(
                        "w-full py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium",
                        messaggioCopied
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                      )}
                    >
                      {messaggioCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {messaggioCopied ? 'Copiato!' : 'Copia messaggio completo'}
                    </button>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      💡 Su WhatsApp/Messenger invia IBAN e Causale come messaggi separati
                    </p>
                  </div>
                </div>

                {/* Campi aggiuntivi se acconto ricevuto */}
                {formData.accontoPagato && (
                  <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      ✓ Inserisci i dettagli del bonifico ricevuto
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Data bonifico
                        </label>
                        <input
                          type="date"
                          name="accontoDataBonifico"
                          value={formData.accontoDataBonifico}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nome pagante
                        </label>
                        <input
                          type="text"
                          name="accontoNomePagante"
                          value={formData.accontoNomePagante}
                          onChange={handleChange}
                          placeholder="Nome e cognome"
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Riferimento/CRO bonifico
                      </label>
                      <input
                        type="text"
                        name="accontoRiferimento"
                        value={formData.accontoRiferimento}
                        onChange={handleChange}
                        placeholder="Es: CRO 123456789"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Messaggio se in attesa */}
                {!formData.accontoPagato && prezziManuali.acconto > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      ⏳ <strong>In attesa di pagamento:</strong> Comunica al cliente la causale e l&apos;importo di {formatPrice(prezziManuali.acconto)} da versare tramite bonifico.
                    </p>
                  </div>
                )}
              </div>

              {/* Pulsante reset prezzi */}
              <button
                type="button"
                onClick={() => {
                  setPrezziManuali({
                    prezzoSoggiorno: calcolati.prezzoSoggiorno,
                    biancheriaCosto: calcolati.biancheriaCosto,
                    tassaSoggiorno: calcolati.tassaSoggiorno,
                    sconto: calcolati.scontoArrotondamento,
                    acconto: calcolati.acconto,
                  })
                }}
                className="w-full mt-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ↻ Ripristina prezzi suggeriti
              </button>
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
              disabled={saving || formData.appartamentiIds.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salva Prenotazione
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
