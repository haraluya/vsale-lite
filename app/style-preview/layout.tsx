'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const themes = [
  { slug: 'clean-commerce', label: 'Clean Commerce', color: '#2563EB' },
  { slug: 'warm-industrial', label: 'Warm Industrial', color: '#7C3AED' },
  { slug: 'soft-depth', label: 'Soft Depth', color: '#6366F1' },
]

export default function StylePreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* 頂部切換 Tab */}
      <div className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-2 h-14 overflow-x-auto scrollbar-hide">
            <span className="text-sm font-semibold text-muted shrink-0 mr-2">
              風格預覽
            </span>
            {themes.map((theme) => {
              const isActive = pathname?.includes(theme.slug)
              return (
                <Link
                  key={theme.slug}
                  href={`/style-preview/${theme.slug}`}
                  className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    isActive
                      ? 'text-white'
                      : 'text-text-secondary hover:bg-surface-secondary'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: theme.color }
                      : undefined
                  }
                >
                  {theme.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* 用 pathname 作為 key 強制切換時重新掛載 */}
      <div key={pathname}>
        {children}
      </div>
    </div>
  )
}
