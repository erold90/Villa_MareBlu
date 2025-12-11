'use client'

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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {mobileNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && item.href !== '/menu' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <item.icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
