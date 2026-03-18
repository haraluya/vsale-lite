/**
 * TextBlock Component
 * Feature: 016-home-page-blocks (US4)
 *
 * 文字區塊元件
 * - 顯示自訂文字內容
 * - 動態字體大小（12-48px，7 種尺寸）
 * - 自訂顏色（Hex 格式）
 * - 響應式寬度
 * - Neo-Brutalism 設計風格
 */

'use client'

import type { TextBlockConfig } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface TextBlockProps {
  config: TextBlockConfig
}

// 字體大小對應表
const fontSizeMap = {
  '12': 'text-xs',
  '16': 'text-base',
  '20': 'text-lg',
  '24': 'text-xl',
  '32': 'text-2xl',
  '40': 'text-3xl',
  '48': 'text-4xl',
} as const

export function TextBlock({ config }: TextBlockProps) {
  const { content, font_size, color } = config

  // 取得對應的 Tailwind 字體大小 class
  const fontSizeClass = fontSizeMap[font_size] || 'text-base'

  return (
    <div
      className={cn(
        'w-full rounded-theme-sm bg-surface',
        designTokens.cleanCommerce.border.full,
        'border-border',
        designTokens.cleanCommerce.shadow.full,
        'p-4 md:p-6'
      )}
    >
      <p
        className={cn(
          fontSizeClass,
          'whitespace-pre-wrap break-words text-center'
        )}
        style={{ color }}
      >
        {content}
      </p>
    </div>
  )
}
