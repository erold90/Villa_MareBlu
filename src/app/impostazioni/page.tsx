'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  Save,
  Home,
  Euro,
  Bell,
  Palette,
  Database,
  Shield,
  Globe,
  Smartphone,
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { costiExtra } from '@/config/appartamenti'

export default function ImpostazioniPage() {
  const [settings, setSettings] = useState({
    // Costi
    biancheria: costiExtra.biancheria,
    tassaSoggiorno: costiExtra.tassaSoggiorno,
    cauzioneDefault: costiExtra.cauzioneDefault,
    accontoPercentuale: costiExtra.accontoPercentuale,

    // Notifiche
    notificheEmail: true,
    notifichePush: true,
    promemoriCheckIn: true,
    promemoriPagamenti: true,

    // Preferenze
    lingua: 'it',
    valuta: 'EUR',
    formatoData: 'dd/mm/yyyy',
  })

  const handleChange = (key: string, value: number | boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    console.log('Saving settings:', settings)
    // In production: save to database
  }

  return (
    <>
      <Header title="Impostazioni" />

      <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Costi e Tariffe */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Euro className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Costi e Tariffe</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Biancheria</p>
                <p className="text-sm text-gray-500">Costo per persona</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">EUR</span>
                <input
                  type="number"
                  value={settings.biancheria}
                  onChange={(e) => handleChange('biancheria', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Tassa di Soggiorno</p>
                <p className="text-sm text-gray-500">Per adulto per notte</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">EUR</span>
                <input
                  type="number"
                  value={settings.tassaSoggiorno}
                  onChange={(e) => handleChange('tassaSoggiorno', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Cauzione Default</p>
                <p className="text-sm text-gray-500">Importo rimborsabile</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">EUR</span>
                <input
                  type="number"
                  value={settings.cauzioneDefault}
                  onChange={(e) => handleChange('cauzioneDefault', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Acconto</p>
                <p className="text-sm text-gray-500">Percentuale alla prenotazione</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.accontoPercentuale}
                  onChange={(e) => handleChange('accontoPercentuale', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifiche */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Notifiche</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Notifiche Email</p>
                <p className="text-sm text-gray-500">Ricevi aggiornamenti via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificheEmail}
                  onChange={(e) => handleChange('notificheEmail', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Notifiche Push</p>
                <p className="text-sm text-gray-500">Notifiche sul dispositivo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifichePush}
                  onChange={(e) => handleChange('notifichePush', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Promemoria Check-in</p>
                <p className="text-sm text-gray-500">Notifica giorno prima del check-in</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promemoriCheckIn}
                  onChange={(e) => handleChange('promemoriCheckIn', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Promemoria Pagamenti</p>
                <p className="text-sm text-gray-500">Notifica pagamenti in scadenza</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promemoriPagamenti}
                  onChange={(e) => handleChange('promemoriPagamenti', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Preferenze */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Preferenze</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Lingua</p>
              </div>
              <select
                value={settings.lingua}
                onChange={(e) => handleChange('lingua', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Valuta</p>
              </div>
              <select
                value={settings.valuta}
                onChange={(e) => handleChange('valuta', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollaro</option>
                <option value="GBP">GBP - Sterlina</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Formato Data</p>
              </div>
              <select
                value={settings.formatoData}
                onChange={(e) => handleChange('formatoData', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Informazioni App</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Versione</span>
              <span className="font-medium text-gray-900">1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Database</span>
              <span className="font-medium text-gray-900">SQLite</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Ultimo backup</span>
              <span className="font-medium text-gray-900">Mai</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Save className="w-5 h-5" />
          Salva Impostazioni
        </button>
      </div>
    </>
  )
}
