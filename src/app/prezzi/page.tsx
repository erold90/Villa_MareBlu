'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Loader2,
  Save,
  Edit2,
  X,
  Check,
  AlertCircle,
  BadgeEuro,
  Calendar,
  Info,
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { getStagioneCorrente } from '@/lib/stagione'

interface Appartamento {
  id: number
  nome: string
  colore: string
}

interface Settimana {
  numero: number
  inizio: string
  fine: string
  periodo: string
  prezzi: Record<number, number>
}

interface PrezziData {
  anno: number
  stagioniDisponibili: number[]
  fonte: 'database' | 'config'
  settimane: Settimana[]
  appartamenti: Appartamento[]
}

export default function PrezziPage() {
  const [data, setData] = useState<PrezziData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [annoSelezionato, setAnnoSelezionato] = useState<number>(getStagioneCorrente())
  const [editingSettimana, setEditingSettimana] = useState<number | null>(null)
  const [editedPrezzi, setEditedPrezzi] = useState<Record<number, number>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [modifiedSettimane, setModifiedSettimane] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchPrezzi()
  }, [annoSelezionato])

  async function fetchPrezzi() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/prezzi?anno=${annoSelezionato}`)
      if (!response.ok) throw new Error('Errore nel caricamento')
      const prezziData = await response.json()
      setData(prezziData)
      setHasChanges(false)
      setModifiedSettimane(new Set())
    } catch (err) {
      setError('Errore nel caricamento dei prezzi')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function startEditing(settimana: Settimana) {
    setEditingSettimana(settimana.numero)
    setEditedPrezzi({ ...settimana.prezzi })
  }

  function cancelEditing() {
    setEditingSettimana(null)
    setEditedPrezzi({})
  }

  function saveSettimanaEdit() {
    if (!data || editingSettimana === null) return

    const newSettimane = data.settimane.map(s =>
      s.numero === editingSettimana ? { ...s, prezzi: { ...editedPrezzi } } : s
    )
    setData({ ...data, settimane: newSettimane })
    setModifiedSettimane(prev => new Set(prev).add(editingSettimana))
    setHasChanges(true)
    setEditingSettimana(null)
    setEditedPrezzi({})
  }

  async function saveAllPrezzi() {
    if (!data || !hasChanges) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      setSyncStatus(null)

      const response = await fetch('/api/prezzi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anno: annoSelezionato,
          settimane: data.settimane,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Errore nel salvataggio')
      }

      setSuccess('Prezzi salvati con successo!')
      setHasChanges(false)
      setModifiedSettimane(new Set())

      // Ricarica i dati
      await fetchPrezzi()

      // SINCRONIZZAZIONE AUTOMATICA A SUPABASE
      setSyncing(true)
      setSyncStatus('Sincronizzazione con villamareblu.it in corso...')

      try {
        const syncResponse = await fetch('/api/sync-prices-to-supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: annoSelezionato }),
        })

        if (syncResponse.ok) {
          const syncData = await syncResponse.json()
          setSyncStatus(`✅ Sincronizzati ${syncData.synced || 0} prezzi su villamareblu.it`)
        } else {
          const syncError = await syncResponse.json()
          // Se Supabase non è configurato, mostra un messaggio informativo senza errore
          if (syncError.error?.includes('Configurazione Supabase mancante')) {
            setSyncStatus('ℹ️ Sincronizzazione Supabase non configurata (opzionale)')
          } else {
            setSyncStatus(`⚠️ Errore sync: ${syncError.error || 'Errore sconosciuto'}`)
          }
        }
      } catch (syncErr) {
        setSyncStatus('⚠️ Errore di rete durante la sincronizzazione')
        console.error('Sync error:', syncErr)
      } finally {
        setSyncing(false)
      }

      // Nascondi messaggi dopo 5 secondi
      setTimeout(() => {
        setSuccess(null)
        setSyncStatus(null)
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  function formatDateRange(inizio: string, fine: string) {
    const d1 = new Date(inizio)
    const d2 = new Date(fine)
    const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    return `${d1.getDate()} ${mesi[d1.getMonth()]} - ${d2.getDate()} ${mesi[d2.getMonth()]}`
  }

  function getPeriodoColor(periodo: string) {
    switch (periodo.toLowerCase()) {
      case 'bassa':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'media':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'media-alta':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'alta':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'altissima':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Gestione Prezzi" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error && !data) {
    return (
      <>
        <Header title="Gestione Prezzi" subtitle="Errore" />
        <div className="p-4 lg:p-6">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        </div>
      </>
    )
  }

  if (!data) return null

  return (
    <>
      <Header
        title="Gestione Prezzi"
        subtitle={`Stagione ${annoSelezionato}`}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Controlli */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Selettore stagione */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={annoSelezionato}
                onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {data.stagioniDisponibili.map((anno) => (
                  <option key={anno} value={anno}>
                    Stagione {anno}
                  </option>
                ))}
              </select>
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                data.fonte === 'database'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}>
                {data.fonte === 'database' ? 'Da Database' : 'Da Config'}
              </span>
            </div>

            {/* Bottone salva */}
            <button
              onClick={saveAllPrezzi}
              disabled={!hasChanges || saving || syncing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                hasChanges && !saving && !syncing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
              )}
            >
              {(saving || syncing) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Salvataggio...' : syncing ? 'Sincronizzazione...' : 'Salva nel Database'}
            </button>
          </div>
        </div>

        {/* Messaggi */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {syncStatus && (
          <div className={cn(
            'p-4 rounded-lg flex items-center gap-3',
            syncing ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
            syncStatus.includes('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
            syncStatus.includes('ℹ️') ? 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400' :
            'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
          )}>
            {syncing ? (
              <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
            ) : syncStatus.includes('✅') ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : syncStatus.includes('ℹ️') ? (
              <Info className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {syncStatus}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-4 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Come funziona</p>
            <p className="mt-1 text-blue-600 dark:text-blue-300">
              Clicca su una riga per modificare i prezzi. Le modifiche vengono salvate nel database quando clicchi &quot;Salva nel Database&quot;.
            </p>
            <p className="mt-1 text-blue-600 dark:text-blue-300 font-medium">
              ✨ I prezzi vengono sincronizzati automaticamente con villamareblu.it dopo il salvataggio!
            </p>
          </div>
        </div>

        {/* Legenda periodi */}
        <div className="flex flex-wrap gap-2">
          {['Bassa', 'Media', 'Media-Alta', 'Alta', 'Altissima'].map(periodo => (
            <span key={periodo} className={cn('px-2 py-1 rounded text-xs font-medium', getPeriodoColor(periodo))}>
              {periodo}
            </span>
          ))}
        </div>

        {/* MOBILE: Cards */}
        <div className="lg:hidden space-y-3">
          {data.settimane.map((settimana) => {
            const isEditing = editingSettimana === settimana.numero
            const isModified = modifiedSettimane.has(settimana.numero)

            return (
              <div
                key={settimana.numero}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden',
                  isModified && 'ring-2 ring-blue-500'
                )}
              >
                {/* Header card */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Sett. {settimana.numero}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getPeriodoColor(settimana.periodo))}>
                        {settimana.periodo}
                      </span>
                      {isModified && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Modificato
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatDateRange(settimana.inizio, settimana.fine)}
                    </p>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEditing(settimana)}
                      className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Prezzi */}
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      {data.appartamenti.map(app => (
                        <div key={app.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: app.colore }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{app.nome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">€</span>
                            <input
                              type="number"
                              value={editedPrezzi[app.id] || 0}
                              onChange={(e) => setEditedPrezzi({
                                ...editedPrezzi,
                                [app.id]: parseInt(e.target.value) || 0
                              })}
                              className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={cancelEditing}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <X className="w-4 h-4" />
                          Annulla
                        </button>
                        <button
                          onClick={saveSettimanaEdit}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4" />
                          Conferma
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {data.appartamenti.map(app => (
                        <div key={app.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: app.colore }}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">App {app.id}</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            €{settimana.prezzi[app.id]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* DESKTOP: Tabella */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Settimana</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Periodo</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  {data.appartamenti.map(app => (
                    <th key={app.id} className="text-center p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: app.colore }}
                        />
                        {app.nome.replace('Appartamento ', 'App ')}
                      </div>
                    </th>
                  ))}
                  <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.settimane.map((settimana) => {
                  const isEditing = editingSettimana === settimana.numero
                  const isModified = modifiedSettimane.has(settimana.numero)

                  return (
                    <tr
                      key={settimana.numero}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        isModified && 'bg-blue-50 dark:bg-blue-900/10'
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Sett. {settimana.numero}
                          </span>
                          {isModified && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Mod
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', getPeriodoColor(settimana.periodo))}>
                          {settimana.periodo}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateRange(settimana.inizio, settimana.fine)}
                      </td>
                      {data.appartamenti.map(app => (
                        <td key={app.id} className="p-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-400">€</span>
                              <input
                                type="number"
                                value={editedPrezzi[app.id] || 0}
                                onChange={(e) => setEditedPrezzi({
                                  ...editedPrezzi,
                                  [app.id]: parseInt(e.target.value) || 0
                                })}
                                className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-900 dark:text-white">
                              €{settimana.prezzi[app.id]}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={cancelEditing}
                              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={saveSettimanaEdit}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(settimana)}
                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Riepilogo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <BadgeEuro className="w-5 h-5 text-blue-600" />
            Riepilogo Stagione {annoSelezionato}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.appartamenti.map(app => {
              const prezziApp = data.settimane.map(s => s.prezzi[app.id])
              const min = Math.min(...prezziApp)
              const max = Math.max(...prezziApp)
              return (
                <div key={app.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: app.colore }}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {app.nome.replace('Appartamento ', 'App ')}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    €{min} - €{max}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Range settimanale
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
