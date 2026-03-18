'use client'

import { ColorPalette } from './ColorPalette'
import { DemoButtons } from './DemoButtons'
import { DemoProductCard } from './DemoProductCard'
import { DemoForm } from './DemoForm'
import { DemoTable } from './DemoTable'
import { DemoNav } from './DemoNav'
import { ShadowShowcase } from './ShadowShowcase'
import { DemoDialog } from './DemoDialog'
import { DemoSkeleton } from './DemoSkeleton'
import { DemoBadges } from './DemoBadges'

interface StyleShowcaseProps {
  theme: string
  title: string
  description: string
}

export function StyleShowcase({ theme, title, description }: StyleShowcaseProps) {
  return (
    <div data-theme={theme}>
      <div
        className="min-h-screen pb-8"
        style={{ backgroundColor: 'var(--color-surface-secondary)' }}
      >
        {/* 標題區 */}
        <div
          className="px-4 py-6 mb-6"
          style={{ backgroundColor: 'var(--color-surface)', borderBottom: `var(--theme-border-width, 2px) solid var(--color-border)` }}
        >
          <h1
            className="text-2xl"
            style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
          >
            {title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        </div>

        {/* 展示區塊 */}
        <div className="px-4 space-y-8 max-w-4xl mx-auto">
          <ColorPalette />
          <DemoButtons />
          <DemoProductCard />
          <DemoBadges />
          <DemoForm />
          <DemoTable />
          <DemoDialog />
          <DemoSkeleton />
          <ShadowShowcase />
          <DemoNav />
        </div>
      </div>
    </div>
  )
}
