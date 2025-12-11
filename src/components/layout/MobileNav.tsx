'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Bot,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Calendario', href: '/calendario', icon: Calendar },
  { name: 'Pulizie', href: '/pulizie', icon: Sparkles },
  { name: 'Assistente', href: '/assistente', icon: Bot },
  { name: 'Menu', href: '/menu', icon: Menu },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    // Carica il conteggio notifiche
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) {
          const data = await response.json()
          // Conta solo check-in imminenti (prossimi 2 giorni) come notifiche
          const today = new Date()
          const twoDaysFromNow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)

          const urgentCheckIns = data.checkIns?.filter((c: { data: string }) => {
            const checkInDate = new Date(c.data)
            return checkInDate <= twoDaysFromNow
          }).length || 0

          setNotificationCount(urgentCheckIns)
        }
      } catch (error) {
        console.error('Errore caricamento notifiche:', error)
      }
    }

    fetchNotifications()
    // Aggiorna ogni 5 minuti
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {mobileNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && item.href !== '/menu' && pathname.startsWith(item.href))
          const showBadge = item.href === '/' && notificationCount > 0

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] relative',
                isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <div className="relative">
                <item.icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
