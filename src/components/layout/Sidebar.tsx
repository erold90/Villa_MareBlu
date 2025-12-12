'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Wallet,
  BarChart3,
  CheckSquare,
  Settings,
  Home,
  LogOut,
  Bot,
  Sparkles,
  BadgeEuro,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendario', href: '/calendario', icon: Calendar },
  { name: 'Prenotazioni', href: '/prenotazioni', icon: BookOpen },
  { name: 'Pulizie', href: '/pulizie', icon: Sparkles },
  { name: 'Ospiti', href: '/ospiti', icon: Users },
  { name: 'Finanze', href: '/finanze', icon: Wallet },
  { name: 'Prezzi', href: '/prezzi', icon: BadgeEuro },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Assistente AI', href: '/assistente', icon: Bot },
]

const bottomNavigation = [
  { name: 'Impostazioni', href: '/impostazioni', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Home className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Villa MareBlu</h1>
          <p className="text-xs text-slate-400">Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-slate-700 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
