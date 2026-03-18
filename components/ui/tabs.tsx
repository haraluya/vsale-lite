'use client'

import { ReactElement, useState } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type Tab = {
  id: string
  label: string
  icon?: LucideIcon
}

type TabsProps = {
  tabs: Tab[]
  defaultTab?: string
  children: (activeTab: string) => ReactElement | null
  className?: string
}

export function Tabs({ tabs, defaultTab, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  return (
    <div className={className}>
      {/* Tab 按鈕列 */}
      <div className="flex flex-wrap gap-2 border-b pb-4 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 font-medium rounded-theme-sm border-theme transition-all duration-200 flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-primary text-text-inverse shadow-neo-sm'
                  : 'bg-surface text-text-secondary hover:bg-surface-secondary hover:-translate-y-0.5'
              )}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="text-sm md:text-base">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 內容區 */}
      <div>{children(activeTab)}</div>
    </div>
  )
}
