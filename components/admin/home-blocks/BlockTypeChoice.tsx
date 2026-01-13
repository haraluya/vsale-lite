/**
 * BlockTypeChoice Component
 * Feature: 016-home-page-blocks
 *
 * 區塊類型選擇介面
 * - 在新增區塊時，先讓管理員選擇區塊類型
 * - 三種類型：圖片輪播、商品展示、文字區塊
 * - Neo-Brutalism 設計風格
 */

'use client'

import { Package, ImageIcon, Type } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import type { BlockType } from '@/types'

interface BlockTypeChoiceProps {
  onSelect: (type: BlockType) => void
  onCancel: () => void
}

interface TypeOption {
  type: BlockType
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  color: string
}

const typeOptions: TypeOption[] = [
  {
    type: 'image_carousel',
    icon: ImageIcon,
    label: '圖片輪播',
    description: '首頁上的圖片輪播廣告，可設定多張圖片與連結',
    color: 'bg-purple-400',
  },
  {
    type: 'product_display',
    icon: Package,
    label: '商品展示',
    description: '依系列或標籤篩選商品，顯示在首頁上',
    color: 'bg-blue-400',
  },
  {
    type: 'text_block',
    icon: Type,
    label: '文字區塊',
    description: '自訂文字內容，可調整字體大小與顏色',
    color: 'bg-green-400',
  },
]

export function BlockTypeChoice({ onSelect, onCancel }: BlockTypeChoiceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">選擇區塊類型</h2>
        <p className="mt-2 text-gray-600">請選擇要建立的首頁區塊類型</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {typeOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.type}
              onClick={() => onSelect(option.type)}
              className={`
                flex flex-col items-center gap-4 p-6 rounded-none
                ${option.color} text-black
                ${designTokens.neoBrutalism.border.full}
                ${designTokens.neoBrutalism.shadow.full}
                border-black
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                transition-all
                text-left
              `}
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white border-3 border-black">
                <Icon className="w-8 h-8" />
              </div>
              <div className="w-full text-center">
                <h3 className="text-xl font-bold mb-2">{option.label}</h3>
                <p className="text-sm">{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onCancel}
          className={`
            px-6 py-3 rounded-none font-medium
            bg-gray-300 text-black
            ${designTokens.neoBrutalism.border.full}
            ${designTokens.neoBrutalism.shadow.full}
            border-black
            hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
            transition-all
          `}
        >
          取消
        </button>
      </div>
    </div>
  )
}
