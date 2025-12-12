'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  Home,
  Moon,
  Sun,
  Download,
  Bot,
  BadgeEuro,
} from 'lucide-react'

const menuItems = [
  {
    section: 'Gestione',
    items: [
      { name: 'Assistente AI', href: '/assistente', icon: Bot, description: 'Chat con intelligenza artificiale' },
      { name: 'Ospiti', href: '/ospiti', icon: Users, description: 'Anagrafica ospiti' },
      { name: 'Prezzi', href: '/prezzi', icon: BadgeEuro, description: 'Gestione listino prezzi' },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, description: 'Statistiche e report' },
    ],
  },
  {
    section: 'App',
    items: [
      { name: 'Impostazioni', href: '/impostazioni', icon: Settings, description: 'Configura app' },
    ],
  },
]

export default function MenuPage() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Carica preferenza salvata
    const saved = localStorage.getItem('darkMode')
    if (saved === 'true') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newValue = !darkMode
    setDarkMode(newValue)
    localStorage.setItem('darkMode', String(newValue))
    if (newValue) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center">
            <Home className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Villa MareBlu</h1>
            <p className="text-slate-400 text-sm">Manager Dashboard</p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-4 space-y-6">
        {menuItems.map((section) => (
          <div key={section.section}>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.section}
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
            Azioni Rapide
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Installa App</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100'}`}>
                {darkMode ? (
                  <Sun className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Moon className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {darkMode ? 'Tema Chiaro' : 'Tema Scuro'}
              </span>
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <Link
            href="#"
            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">Aiuto e Supporto</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Guida e FAQ</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-gray-400 py-4">
          Villa MareBlu Manager v1.0.0
        </p>
      </div>
    </div>
  )
}
