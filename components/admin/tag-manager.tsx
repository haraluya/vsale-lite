'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Plus, Tag as TagIcon } from 'lucide-react'
import { TagBadge } from '@/components/ui/tag-badge'
import { updateProductTags, getAvailableTags } from '@/lib/actions/tags'

/**
 * 標籤管理元件
 * Feature: 006-ux-enhancement / US9 (T068)
 *
 * - 新增/移除商品標籤
 * - 標籤自動完成
 * - 常用標籤選擇
 * - 驗證標籤數量與長度
 * - Neo-Brutalism 設計風格
 */

interface TagManagerProps {
  productId: string
  initialTags?: string[]
  onUpdate?: (tags: string[]) => void
}

export function TagManager({ productId, initialTags = [], onUpdate }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [inputValue, setInputValue] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
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

  // 過濾建議標籤
  const suggestedTags = availableTags
    .filter(tag =>
      !tags.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
    )
    .slice(0, 5)

  // 新增標籤
  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim()

    // 驗證標籤
    if (!trimmedTag) {
      toast.error('標籤不能為空')
      return
    }

    if (trimmedTag.length < 2 || trimmedTag.length > 8) {
      toast.error('標籤長度必須介於 2-8 字元')
      return
    }

    if (tags.includes(trimmedTag)) {
      toast.error('標籤已存在')
      return
    }

    if (tags.length >= 5) {
      toast.error('最多只能新增 5 個標籤')
      return
    }

    // 更新標籤
    const newTags = [...tags, trimmedTag]
    setIsLoading(true)

    const result = await updateProductTags({
      product_id: productId,
      tags: newTags,
    })

    setIsLoading(false)

    if (result.success) {
      setTags(newTags)
      setInputValue('')
      setShowSuggestions(false)
      toast.success('標籤新增成功')
      onUpdate?.(newTags)
    } else {
      toast.error(result.message || '標籤新增失敗')
    }
  }

  // 移除標籤
  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    setIsLoading(true)

    const result = await updateProductTags({
      product_id: productId,
      tags: newTags,
    })

    setIsLoading(false)

    if (result.success) {
      setTags(newTags)
      toast.success('標籤移除成功')
      onUpdate?.(newTags)
    } else {
      toast.error(result.message || '標籤移除失敗')
    }
  }

  // 處理輸入
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag(inputValue)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 當前標籤 */}
      <div>
        <label className="mb-2 block text-sm font-bold">商品標籤 ({tags.length}/5)</label>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <div
                key={tag}
                className="group relative inline-flex items-center gap-1 rounded-none border-2 border-black bg-white px-3 py-1 shadow-neo"
              >
                <TagBadge tag={tag} size="sm" className="border-0" />
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isLoading}
                  className="rounded-full p-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`移除標籤 ${tag}`}
                >
                  <X className="h-3 w-3 text-gray-600 hover:text-red-600" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">尚未設定標籤</p>
        )}
      </div>

      {/* 新增標籤輸入 */}
      {tags.length < 5 && (
        <div className="relative">
          <label className="mb-2 block text-sm font-bold">新增標籤</label>
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
              onClick={() => handleAddTag(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-none border-2 border-black bg-green-400 p-2 shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
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
                      onClick={() => handleAddTag(tag)}
                      className="flex w-full items-center gap-2 rounded-none border-2 border-transparent px-3 py-2 text-left hover:border-black hover:bg-gray-50"
                    >
                      <TagIcon className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 提示文字 */}
      <p className="text-xs text-gray-500">
        標籤可用於商品分類與篩選，最多 5 個，每個 2-8 字元。
      </p>
    </div>
  )
}
