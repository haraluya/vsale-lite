'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Tags, Plus, Minus } from 'lucide-react'
import { batchUpdateProductTags, getAvailableTags } from '@/lib/actions/tags'
import { getProductsByIds } from '@/lib/actions/products'
import { TagBadge } from '@/components/ui/tag-badge'

/**
 * 批次標籤管理元件
 * Feature: 006-ux-enhancement / US9 (T071)
 *
 * - 批次新增/移除標籤
 * - 選擇多個商品
 * - 顯示操作結果
 * - Neo-Brutalism 設計風格
 * - 移除模式：顯示所選商品的共同標籤
 */

interface BatchTagManagerProps {
  selectedProductIds: string[]
  onComplete?: () => void
}

export function BatchTagManager({ selectedProductIds, onComplete }: BatchTagManagerProps) {
  const [operation, setOperation] = useState<'add' | 'remove'>('add')
  const [inputValue, setInputValue] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [commonTags, setCommonTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 載入可用標籤
  useEffect(() => {
    const loadAvailableTags = async () => {
      const result = await getAvailableTags()
      if (result.success && result.data) {
        setAvailableTags(result.data)
      }
    }
    loadAvailableTags()
  }, [])

  // 載入所選商品的共同標籤（用於移除模式）
  useEffect(() => {
    if (operation === 'remove' && selectedProductIds.length > 0) {
      const loadCommonTags = async () => {
        const result = await getProductsByIds(selectedProductIds)
        if (result.success && result.data) {
          // 計算共同標籤（所有商品都擁有的標籤）
          const products = result.data
          if (products.length === 0) {
            setCommonTags([])
            return
          }

          // 取第一個商品的標籤作為基礎
          const firstProductTags = products[0].tags || []

          // 篩選出所有商品都擁有的標籤
          const common = firstProductTags.filter(tag =>
            products.every(product => (product.tags || []).includes(tag))
          )

          setCommonTags(common)
        }
      }
      loadCommonTags()
    } else {
      setCommonTags([])
    }
  }, [operation, selectedProductIds])

  // 過濾建議標籤
  const suggestedTags = availableTags
    .filter(tag =>
      !selectedTags.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
    )
    .slice(0, 5)

  // 新增標籤到選擇列表
  const handleAddToSelection = (tag: string) => {
    const trimmedTag = tag.trim()

    if (!trimmedTag) {
      toast.error('標籤不能為空')
      return
    }

    if (trimmedTag.length < 2 || trimmedTag.length > 8) {
      toast.error('標籤長度必須介於 2-8 字元')
      return
    }

    if (selectedTags.includes(trimmedTag)) {
      toast.error('標籤已在列表中')
      return
    }

    setSelectedTags([...selectedTags, trimmedTag])
    setInputValue('')
    setShowSuggestions(false)
  }

  // 從選擇列表移除標籤
  const handleRemoveFromSelection = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  // 執行批次更新
  const handleBatchUpdate = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('請先選擇商品')
      return
    }

    if (selectedTags.length === 0) {
      toast.error('請選擇至少一個標籤')
      return
    }

    setIsLoading(true)

    const result = await batchUpdateProductTags({
      product_ids: selectedProductIds,
      operation,
      tags: selectedTags,
    })

    setIsLoading(false)

    if (result.success) {
      toast.success(result.message || '批次更新成功')
      setSelectedTags([])
      onComplete?.()
    } else {
      toast.error(result.message || '批次更新失敗')
    }
  }

  // 處理輸入
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddToSelection(inputValue)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  if (selectedProductIds.length === 0) {
    return (
      <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-6 text-center">
        <Tags className="mx-auto mb-2 h-12 w-12 text-gray-400" />
        <p className="text-gray-600">請先選擇商品以進行批次標籤設定</p>
      </div>
    )
  }

  return (
    <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
      <h3 className="mb-4 text-lg font-bold">批次標籤設定</h3>

      {/* 選擇操作類型 */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-bold">操作類型</label>
        <div className="flex gap-2">
          <button
            onClick={() => setOperation('add')}
            className={`flex-1 rounded-none border-2 md:border-3 border-black px-4 py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
              operation === 'add' ? 'bg-green-400' : 'bg-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" />
              新增標籤
            </span>
          </button>
          <button
            onClick={() => setOperation('remove')}
            className={`flex-1 rounded-none border-2 md:border-3 border-black px-4 py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
              operation === 'remove' ? 'bg-red-400' : 'bg-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Minus className="h-5 w-5" />
              移除標籤
            </span>
          </button>
        </div>
      </div>

      {/* 移除模式：顯示共同標籤 */}
      {operation === 'remove' && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold">
            共同標籤（所有商品都擁有的標籤）
          </label>
          {commonTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {commonTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      handleRemoveFromSelection(tag)
                    } else {
                      handleAddToSelection(tag)
                    }
                  }}
                  className={`inline-flex items-center gap-1 rounded-none border-2 border-black px-3 py-2 font-medium shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                    selectedTags.includes(tag)
                      ? 'bg-red-100 border-red-600'
                      : 'bg-white hover:bg-red-50'
                  }`}
                >
                  <TagBadge tag={tag} size="sm" className="border-0" />
                  {selectedTags.includes(tag) && (
                    <span className="text-xs text-red-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">
                所選商品沒有共同標籤
              </p>
              <p className="mt-1 text-xs text-gray-500">
                提示：你可以使用下方輸入框手動輸入要移除的標籤
              </p>
            </div>
          )}
        </div>
      )}

      {/* 已選擇的標籤 */}
      {selectedTags.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold">
            {operation === 'add' ? '將新增的標籤' : '將移除的標籤'} ({selectedTags.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleRemoveFromSelection(tag)}
                className={`group inline-flex items-center gap-1 rounded-none border-2 border-black px-3 py-1 shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                  operation === 'add' ? 'bg-white hover:bg-red-50' : 'bg-red-100 hover:bg-red-200'
                }`}
              >
                <TagBadge tag={tag} size="sm" className="border-0" />
                <span className={`text-xs ${operation === 'add' ? 'text-gray-500 group-hover:text-red-600' : 'text-red-600'}`}>×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 標籤輸入（新增模式 or 移除模式備用） */}
      {operation === 'add' && (
        <div className="relative mb-4">
          <label className="mb-2 block text-sm font-bold">選擇或輸入標籤</label>
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            placeholder="輸入標籤名稱 (2-8 字元)..."
            disabled={isLoading}
            className="w-full rounded-none border-2 border-black px-4 py-2 shadow-neo-sm md:shadow-neo focus:outline-none focus:ring-2 focus:ring-black disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={() => handleAddToSelection(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-none border-2 border-black bg-blue-400 p-2 shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* 建議標籤 */}
        {showSuggestions && suggestedTags.length > 0 && (
          <div className="absolute z-10 mt-2 w-full rounded-none border-2 border-black bg-white shadow-neo">
            <div className="p-2">
              <p className="mb-2 text-xs font-bold text-gray-600">常用標籤</p>
              <div className="space-y-1">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleAddToSelection(tag)}
                    className="flex w-full items-center gap-2 rounded-none border-2 border-transparent px-3 py-2 text-left hover:border-black hover:bg-gray-50"
                  >
                    <Tags className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 執行按鈕 */}
      <div className="flex items-center justify-between border-t-2 border-gray-200 pt-4">
        <p className="text-sm text-gray-600">
          將{operation === 'add' ? '新增' : '移除'}標籤到 {selectedProductIds.length} 個商品
        </p>
        <button
          onClick={handleBatchUpdate}
          disabled={isLoading || selectedTags.length === 0}
          className="rounded-none border-2 md:border-3 border-black bg-yellow-400 px-6 py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
        >
          {isLoading ? '處理中...' : '執行批次更新'}
        </button>
      </div>
    </div>
  )
}
