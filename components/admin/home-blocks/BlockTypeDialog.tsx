'use client'

import { designTokens } from '@/lib/design-tokens'
import { X } from 'lucide-react'
import type { BlockType } from '@/types'

interface BlockTypeDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (type: BlockType) => void
}

/**
 * 區塊類型選擇對話框
 * 使用者點擊「新增區塊」時彈出，選擇要建立的區塊類型
 */
export function BlockTypeDialog({ open, onClose, onSelect }: BlockTypeDialogProps) {
  if (!open) return null

  const handleSelect = (type: BlockType) => {
    onSelect(type)
    onClose()
  }

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 對話框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`
            relative w-full max-w-lg bg-white
            ${designTokens.neoBrutalism.border.full}
            ${designTokens.neoBrutalism.shadow.full}
            border-black
            rounded-none
            p-6
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-none"
            aria-label="關閉對話框"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 標題 */}
          <h2
            id="dialog-title"
            className={`${designTokens.typography.h2} text-foreground mb-2`}
          >
            選擇區塊類型
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            請選擇您要建立的首頁廣告區塊類型，建立後將無法變更類型。
          </p>

          {/* 類型選擇按鈕 */}
          <div className="space-y-3">
            {/* 圖片輪播 */}
            <button
              onClick={() => handleSelect('image_carousel')}
              className={`
                w-full p-4 text-left bg-green-400 text-black
                ${designTokens.neoBrutalism.border.full}
                ${designTokens.neoBrutalism.shadow.full}
                border-black rounded-none
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-150
              `}
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">圖片輪播</h3>
                  <p className="text-sm text-black/80">
                    上傳最多 5 張圖片，支援自動播放與系列連結
                  </p>
                </div>
                <div className="ml-4 text-2xl">🎠</div>
              </div>
            </button>

            {/* 商品展示 */}
            <button
              onClick={() => handleSelect('product_display')}
              className={`
                w-full p-4 text-left bg-blue-400 text-black
                ${designTokens.neoBrutalism.border.full}
                ${designTokens.neoBrutalism.shadow.full}
                border-black rounded-none
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-150
              `}
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">商品展示</h3>
                  <p className="text-sm text-black/80">
                    顯示指定系列或標籤的商品卡片
                  </p>
                </div>
                <div className="ml-4 text-2xl">🛍️</div>
              </div>
            </button>

            {/* 文字區塊 */}
            <button
              onClick={() => handleSelect('text_block')}
              className={`
                w-full p-4 text-left bg-yellow-400 text-black
                ${designTokens.neoBrutalism.border.full}
                ${designTokens.neoBrutalism.shadow.full}
                border-black rounded-none
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-150
              `}
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">文字區塊</h3>
                  <p className="text-sm text-black/80">
                    顯示自訂文字內容，支援字體大小與顏色設定
                  </p>
                </div>
                <div className="ml-4 text-2xl">📝</div>
              </div>
            </button>
          </div>

          {/* 取消按鈕 */}
          <button
            onClick={onClose}
            className={`
              mt-6 w-full p-3 bg-white text-black
              ${designTokens.neoBrutalism.border.full}
              ${designTokens.neoBrutalism.shadow.full}
              border-black rounded-none
              hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              transition-all duration-150
            `}
          >
            取消
          </button>
        </div>
      </div>
    </>
  )
}
