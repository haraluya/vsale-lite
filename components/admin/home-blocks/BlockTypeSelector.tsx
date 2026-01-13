'use client'

import { designTokens } from '@/lib/design-tokens'
import type { BlockType } from '@/types'

interface BlockTypeSelectorProps {
  value: BlockType
  onChange: (value: BlockType) => void
  disabled?: boolean
}

/**
 * 區塊類型選擇器
 * 用於選擇首頁廣告區塊的類型（圖片輪播、商品展示、文字區塊）
 */
export function BlockTypeSelector({ value, onChange, disabled = false }: BlockTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className={`${designTokens.typography.label} text-foreground`}>
        區塊類型 <span className="text-red-600">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BlockType)}
        disabled={disabled}
        className={`
          w-full rounded-none text-foreground
          ${designTokens.neoBrutalism.border.full}
          ${designTokens.neoBrutalism.shadow.full}
          ${designTokens.input.base}
          border-black
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          disabled:opacity-50
        `}
      >
        <option value="image_carousel">圖片輪播</option>
        <option value="product_display">商品展示</option>
        <option value="text_block">文字區塊</option>
      </select>
      <p className="text-xs text-gray-600">
        {disabled
          ? '區塊類型建立後無法變更，避免資料遺失'
          : '選擇要建立的區塊類型，不同類型有不同的設定選項'}
      </p>
    </div>
  )
}
