'use client'

import { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

type Tab = {
  id: string
  label: string
  icon?: ReactNode
}

type TabsProps = {
  tabs: Tab[]
  defaultTab?: string
  children: (activeTab: string) => ReactNode
  className?: string
}

export function Tabs({ tabs, defaultTab, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  return (
    <div className={className}>
      {/* Tab 按鈕列 */}
      <div className="flex flex-wrap gap-2 border-b-3 border-black pb-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 font-bold rounded-none border-2 md:border-3 transition-all flex items-center gap-2',
              activeTab === tab.id
                ? 'border-black bg-black text-white shadow-neo-sm md:shadow-neo'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span className="text-sm md:text-base">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 內容區 */}
      <div>{children(activeTab)}</div>
    </div>
  )
}
