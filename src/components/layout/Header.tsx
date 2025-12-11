'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  subtitle?: string
  showAddButton?: boolean
  addButtonHref?: string
  addButtonLabel?: string
}

export default function Header({
  title,
  subtitle,
  showAddButton = false,
  addButtonHref = '/prenotazioni/nuova',
  addButtonLabel = 'Nuova',
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title - Desktop */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">VM</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">{title}</h1>
            </div>
          </div>

          {/* Actions */}
          {showAddButton && (
            <Link
              href={addButtonHref}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{addButtonLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
