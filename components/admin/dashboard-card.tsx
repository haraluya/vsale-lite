'use client'

import Link from 'next/link'
import { ShoppingCart, DollarSign, Package, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 儀表板指標卡片元件 (T075)
 * Feature: 006-ux-enhancement / US10
 */

// 圖示映射
const iconMap = {
  cart: ShoppingCart,
  dollar: DollarSign,
  package: Package,
  clock: Clock,
} as const

type IconName = keyof typeof iconMap

interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
  iconName: IconName // 使用圖示名稱而非元件
  iconColor: string // Tailwind 色彩類別 (如 'bg-primary')
  href?: string // T083 - 點擊跳轉詳細頁面
  className?: string
}

export function DashboardCard({
  title,
  value,
  subtitle,
  iconName,
  iconColor,
  href,
  className,
}: DashboardCardProps) {
  const Icon = iconMap[iconName]

  const content = (
    <div className={cn('card-neo p-6', href && 'cursor-pointer transition-all hover:shadow-neo-hover', className)}>
      <div className="flex items-center gap-4">
        {/* 圖示區塊 */}
        <div className={cn('rounded-theme-sm border-theme p-4', iconColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>

        {/* 數據區塊 */}
        <div className="flex-1">
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  )

  // T083 - 如果有 href 則包裹在 Link 中
  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

/**
 * 儀表板趨勢卡片 (含圖表)
 */
interface DashboardTrendCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function DashboardTrendCard({ title, subtitle, children, className }: DashboardTrendCardProps) {
  return (
    <div className={cn('card-neo p-6', className)}>
      <div className="mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
