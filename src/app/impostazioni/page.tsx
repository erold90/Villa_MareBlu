'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Save,
  Euro,
  Bell,
  Globe,
  Smartphone,
  Loader2,
  Check,
  AlertCircle,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Settings {
  biancheria: number
  tassaSoggiorno: number
  cauzioneDefault: number
  accontoPercentuale: number
  notificheEmail: boolean
  notifichePush: boolean
  promemoriCheckIn: boolean
  promemoriPagamenti: boolean
  lingua: string
  valuta: string
  formatoData: string
}

export default function ImpostazioniPage() {
  const [settings, setSettings] = useState<Settings>({
    biancheria: 10,
    tassaSoggiorno: 1,
    cauzioneDefault: 200,
    accontoPercentuale: 30,
    notificheEmail: true,
    notifichePush: true,
    promemoriCheckIn: true,
    promemoriPagamenti: true,
    lingua: 'it',
    valuta: 'EUR',
    formatoData: 'dd/mm/yyyy',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fonte, setFonte] = useState<'database' | 'config'>('config')
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/impostazioni')
      if (!response.ok) throw new Error('Errore nel caricamento')
      const data = await response.json()
      setSettings(data.settings)
      setOriginalSettings(data.settings)
      setFonte(data.fonte)
      setHasChanges(false)
    } catch (err) {
      setError('Errore nel caricamento delle impostazioni')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof Settings, value: number | boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/impostazioni', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Errore nel salvataggio')
      }

      setSuccess('Impostazioni salvate con successo!')
      setFonte('database')
      setHasChanges(false)
      setOriginalSettings(settings)

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Impostazioni" subtitle="Caricamento..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Impostazioni" />

      <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Stato fonte dati */}
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg',
          fonte === 'database'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        )}>
          <Database className="w-5 h-5" />
          <span className="text-sm font-medium">
            {fonte === 'database'
              ? 'Impostazioni caricate dal database'
              : 'Impostazioni di default (non ancora salvate nel database)'}
          </span>
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

        {/* Costi e Tariffe */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <Euro className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Costi e Tariffe</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Biancheria</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Costo per persona</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">EUR</span>
                <input
                  type="number"
                  value={settings.biancheria}
                  onChange={(e) => handleChange('biancheria', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Tassa di Soggiorno</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Per adulto per notte</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">EUR</span>
                <input
                  type="number"
                  value={settings.tassaSoggiorno}
                  onChange={(e) => handleChange('tassaSoggiorno', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Cauzione Default</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Importo rimborsabile</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">EUR</span>
                <input
                  type="number"
                  value={settings.cauzioneDefault}
                  onChange={(e) => handleChange('cauzioneDefault', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Acconto</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Percentuale alla prenotazione</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.accontoPercentuale}
                  onChange={(e) => handleChange('accontoPercentuale', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifiche */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Notifiche</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifiche Email</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ricevi aggiornamenti via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificheEmail}
                  onChange={(e) => handleChange('notificheEmail', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifiche Push</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notifiche sul dispositivo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifichePush}
                  onChange={(e) => handleChange('notifichePush', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Promemoria Check-in</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notifica giorno prima del check-in</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promemoriCheckIn}
                  onChange={(e) => handleChange('promemoriCheckIn', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Promemoria Pagamenti</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notifica pagamenti in scadenza</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promemoriPagamenti}
                  onChange={(e) => handleChange('promemoriPagamenti', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Preferenze */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Preferenze</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Lingua</p>
              </div>
              <select
                value={settings.lingua}
                onChange={(e) => handleChange('lingua', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Valuta</p>
              </div>
              <select
                value={settings.valuta}
                onChange={(e) => handleChange('valuta', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollaro</option>
                <option value="GBP">GBP - Sterlina</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Formato Data</p>
              </div>
              <select
                value={settings.formatoData}
                onChange={(e) => handleChange('formatoData', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Informazioni App</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Versione</span>
              <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Database</span>
              <span className="font-medium text-gray-900 dark:text-white">PostgreSQL (Neon)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Hosting</span>
              <span className="font-medium text-gray-900 dark:text-white">Vercel</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-colors',
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
        </button>

        {hasChanges && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400">
            Hai modifiche non salvate
          </p>
        )}
      </div>
    </>
  )
}
