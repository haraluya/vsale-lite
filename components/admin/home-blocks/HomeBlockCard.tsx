'use client'

import Image from 'next/image'
import { Pencil, Trash2, Image as ImageIcon, Package, FileText, ArrowUp, ArrowDown } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { useConfirm } from '@/lib/contexts/dialog-context'
import type { HomePageBlock, ImageCarouselConfig } from '@/types'

interface HomeBlockCardProps {
  block: HomePageBlock
  isFirst: boolean
  isLast: boolean
  onEdit: (blockId: string) => void
  onDelete: (blockId: string) => void
  onMoveUp: (blockId: string) => void
  onMoveDown: (blockId: string) => void
}

/**
 * 首頁廣告區塊卡片元件
 * 顯示區塊縮圖、名稱、類型、狀態，並提供編輯與刪除按鈕
 */
export function HomeBlockCard({ block, isFirst, isLast, onEdit, onDelete, onMoveUp, onMoveDown }: HomeBlockCardProps) {
  const confirm = useConfirm()

  // 取得區塊類型顯示名稱
  const getBlockTypeLabel = () => {
    switch (block.block_type) {
      case 'image_carousel':
        return '圖片輪播'
      case 'product_display':
        return '商品展示'
      case 'text_block':
        return '文字區塊'
      default:
        return '未知'
    }
  }

  // 取得區塊類型顏色
  const getBlockTypeColor = () => {
    switch (block.block_type) {
      case 'image_carousel':
        return 'bg-blue-100 text-blue-800'
      case 'product_display':
        return 'bg-green-100 text-green-800'
      case 'text_block':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 取得縮圖內容
  const renderThumbnail = () => {
    if (block.block_type === 'image_carousel') {
      const config = block.config as ImageCarouselConfig
      const firstImage = config.images?.[0]?.url

      if (firstImage) {
        return (
          <Image
            src={firstImage}
            alt={block.name}
            fill
            className="object-cover"
          />
        )
      } else {
        return (
          <div className="flex items-center justify-center w-full h-full bg-gray-200">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )
      }
    } else if (block.block_type === 'product_display') {
      return (
        <div className="flex items-center justify-center w-full h-full bg-green-100">
          <Package className="w-12 h-12 text-green-600" />
        </div>
      )
    } else {
      // text_block
      return (
        <div className="flex items-center justify-center w-full h-full bg-purple-100">
          <FileText className="w-12 h-12 text-purple-600" />
        </div>
      )
    }
  }

  // 處理刪除
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除「${block.name}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (confirmed) {
      onDelete(block.id)
    }
  }

  return (
    <div
      className={`
        flex flex-col rounded-none bg-white
        ${designTokens.neoBrutalism.border.full}
        ${designTokens.neoBrutalism.shadow.full}
        border-black
        overflow-hidden
      `}
    >
      {/* 縮圖 */}
      <div className="relative w-full h-48 border-b-2 border-black">
        {renderThumbnail()}
      </div>

      {/* 內容 */}
      <div className="p-4 space-y-3">
        {/* 區塊名稱 */}
        <h3 className="font-bold text-lg truncate" title={block.name}>
          {block.name}
        </h3>

        {/* 區塊類型與狀態 */}
        <div className="flex items-center gap-2">
          <span
            className={`
              px-2 py-1 text-xs font-medium rounded
              ${getBlockTypeColor()}
            `}
          >
            {getBlockTypeLabel()}
          </span>

          <span
            className={`
              px-2 py-1 text-xs font-medium rounded
              ${
                block.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }
            `}
          >
            {block.is_active ? '啟用' : '停用'}
          </span>
        </div>

        {/* 排序按鈕 */}
        <div className="flex gap-2">
          <button
            onClick={() => onMoveUp(block.id)}
            disabled={isFirst}
            className={`
              flex-1 flex items-center justify-center gap-1 py-2 rounded-none
              font-medium
              ${designTokens.neoBrutalism.border.mobile}
              border-black
              transition-all
              ${
                isFirst
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-400 text-white hover:translate-x-[1px] hover:translate-y-[1px]'
              }
            `}
          >
            <ArrowUp className="w-4 h-4" />
            <span className="text-sm">上移</span>
          </button>

          <button
            onClick={() => onMoveDown(block.id)}
            disabled={isLast}
            className={`
              flex-1 flex items-center justify-center gap-1 py-2 rounded-none
              font-medium
              ${designTokens.neoBrutalism.border.mobile}
              border-black
              transition-all
              ${
                isLast
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-400 text-white hover:translate-x-[1px] hover:translate-y-[1px]'
              }
            `}
          >
            <ArrowDown className="w-4 h-4" />
            <span className="text-sm">下移</span>
          </button>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(block.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 rounded-none
              bg-blue-500 text-white font-medium
              ${designTokens.neoBrutalism.border.mobile}
              border-black
              hover:translate-x-[1px] hover:translate-y-[1px]
              transition-all
            `}
          >
            <Pencil className="w-4 h-4" />
            <span>編輯</span>
          </button>

          <button
            onClick={handleDelete}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 rounded-none
              bg-red-600 text-white font-medium
              ${designTokens.neoBrutalism.border.mobile}
              border-black
              hover:translate-x-[1px] hover:translate-y-[1px]
              transition-all
            `}
          >
            <Trash2 className="w-4 h-4" />
            <span>刪除</span>
          </button>
        </div>
      </div>
    </div>
  )
}
