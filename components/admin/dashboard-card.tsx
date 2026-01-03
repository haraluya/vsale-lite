'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 儀表板指標卡片元件 (T075)
 * Feature: 006-ux-enhancement / US10
 */

interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor: string // Tailwind 色彩類別 (如 'bg-primary')
  href?: string // T083 - 點擊跳轉詳細頁面
  className?: string
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  href,
  className,
}: DashboardCardProps) {
  const content = (
    <div className={cn('card-neo p-6', href && 'cursor-pointer transition-all hover:shadow-neo-hover', className)}>
      <div className="flex items-center gap-4">
        {/* 圖示區塊 */}
        <div className={cn('rounded-none border-3 border-black p-4', iconColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>

        {/* 數據區塊 */}
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
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
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
