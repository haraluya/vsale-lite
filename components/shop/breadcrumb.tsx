'use client'

/**
 * 麵包屑導航元件
 * Feature: 006-ux-enhancement (US3)
 */

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BreadcrumbItem = {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="麵包屑導航" className={cn('flex items-center gap-2', className)}>
      {/* 首頁圖示 */}
      <Link
        href="/store"
        className="flex items-center gap-1 text-sm font-bold text-text-secondary hover:text-foreground transition-colors"
        aria-label="返回首頁"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">首頁</span>
      </Link>

      {/* 麵包屑項目 */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={item.href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden="true" />

            {isLast ? (
              <span
                className="text-sm font-bold text-foreground truncate max-w-[150px] sm:max-w-none"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm font-bold text-text-secondary hover:text-foreground transition-colors truncate max-w-[150px] sm:max-w-none"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/**
 * 簡化版麵包屑（僅顯示當前頁面）
 * 用於手機版
 */
interface SimpleBreadcrumbProps {
  currentPage: string
  backHref?: string
  className?: string
}

export function SimpleBreadcrumb({ currentPage, backHref = '/store', className = '' }: SimpleBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Link
        href={backHref}
        className="text-sm font-bold text-text-secondary hover:text-foreground transition-colors"
        aria-label="返回上一頁"
      >
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden="true" />
      <span className="text-sm font-bold text-foreground truncate" aria-current="page">
        {currentPage}
      </span>
    </div>
  )
}
