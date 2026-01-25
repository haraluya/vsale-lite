'use client'

/**
 * Prefetch Link Component
 * Feature: Performance Optimization - Phase 3.2
 *
 * 智能預載連結組件，優化導航感知延遲
 * - Hover 時預載路由
 * - 預期提升：導航感知 -80% (500ms → 50ms)
 */

import { useRouter } from 'next/navigation'
import Link, { type LinkProps } from 'next/link'
import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface PrefetchLinkProps extends Omit<LinkProps, 'onMouseEnter' | 'onTouchStart'> {
  children: React.ReactNode
  className?: string
  prefetchDelay?: number // Hover 延遲時間（毫秒），預設 200ms
  disabled?: boolean // 禁用預載
}

export function PrefetchLink({
  href,
  children,
  className,
  prefetchDelay = 200,
  disabled = false,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter()
  const [isPrefetching, setIsPrefetching] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Hover 時預載
  const handleMouseEnter = useCallback(() => {
    if (disabled || isPrefetching) return

    // 延遲預載，避免滑鼠快速掠過時觸發
    hoverTimeoutRef.current = setTimeout(() => {
      setIsPrefetching(true)
      router.prefetch(href.toString())
    }, prefetchDelay)
  }, [disabled, isPrefetching, router, href, prefetchDelay])

  // 離開時取消預載計時器
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  // Touch 裝置立即預載（無延遲）
  const handleTouchStart = useCallback(() => {
    if (disabled || isPrefetching) return
    setIsPrefetching(true)
    router.prefetch(href.toString())
  }, [disabled, isPrefetching, router, href])

  return (
    <Link
      href={href}
      className={cn(className, isPrefetching && 'prefetching')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </Link>
  )
}

/**
 * PrefetchButton - 預載按鈕版本（用於按鈕樣式的連結）
 */
interface PrefetchButtonProps extends PrefetchLinkProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'default' | 'lg'
}

export function PrefetchButton({
  variant = 'primary',
  size = 'default',
  className,
  ...props
}: PrefetchButtonProps) {
  // 按鈕樣式類別（基於 Button 組件的樣式）
  const buttonClasses = cn(
    'inline-flex items-center justify-center gap-2 rounded-none font-bold transition-all',
    'border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo',
    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    // Variant 樣式
    variant === 'primary' && 'bg-primary hover:bg-primary-dark text-white',
    variant === 'secondary' && 'bg-gray-200 hover:bg-gray-300 text-black',
    variant === 'danger' && 'bg-red-500 hover:bg-red-600 text-white',
    variant === 'outline' && 'bg-white hover:bg-gray-50 text-black',
    // Size 樣式
    size === 'sm' && 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
    size === 'default' && 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base',
    size === 'lg' && 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg',
    className
  )

  return <PrefetchLink {...props} className={buttonClasses} />
}
