'use client'

import Link from 'next/link'
import {
  Users,
  BarChart3,
  CheckSquare,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Home,
  Bell,
  Moon,
  Download,
} from 'lucide-react'

const menuItems = [
  {
    section: 'Gestione',
    items: [
      { name: 'Ospiti', href: '/ospiti', icon: Users, description: 'Anagrafica ospiti' },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, description: 'Statistiche e report' },
      { name: 'Task', href: '/task', icon: CheckSquare, description: 'Lista attivita' },
    ],
  },
  {
    section: 'App',
    items: [
      { name: 'Impostazioni', href: '/impostazioni', icon: Settings, description: 'Configura app' },
      { name: 'Notifiche', href: '#', icon: Bell, description: 'Gestisci notifiche' },
    ],
  },
]

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {section.section}
            </h2>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Azioni Rapide
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Installa App</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Moon className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Tema Scuro</span>
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-xl shadow-sm">
          <Link
            href="#"
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Aiuto e Supporto</p>
              <p className="text-sm text-gray-500">Guida e FAQ</p>
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
