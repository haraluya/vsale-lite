'use client'

/**
 * Product Tags Editor Component
 * 商品標籤編輯器 - 可在列表中快速添加/刪除標籤
 */

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { updateProductTags } from '@/lib/actions/tags'
import { getAvailableTags } from '@/lib/actions/tags'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import { useAlert } from '@/lib/contexts/dialog-context'

interface ProductTagsEditorProps {
  productId: string
  currentTags: string[]
  onUpdateSuccess?: () => void
}

export function ProductTagsEditor({
  productId,
  currentTags,
  onUpdateSuccess
}: ProductTagsEditorProps) {
  const [tags, setTags] = useState<string[]>(currentTags)
  const [showAddForm, setShowAddForm] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [newTagInput, setNewTagInput] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const alert = useAlert()

  // 載入可用標籤列表
  useEffect(() => {
    async function loadAvailableTags() {
      const result = await getAvailableTags()
      if (result.success && result.data) {
        // 過濾掉當前商品已有的標籤
        const filteredTags = result.data.filter(tag => !tags.includes(tag))
        setAvailableTags(filteredTags)
      }
    }
    if (showAddForm) {
      loadAvailableTags()
    }
  }, [showAddForm, tags])

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    await updateTags(newTags)
  }

  const handleAddTag = async () => {
    const tagToAdd = selectedTag || newTagInput.trim()

    if (!tagToAdd) {
      await alert({
        title: '請輸入標籤',
        message: '請選擇現有標籤或輸入新標籤名稱',
        variant: 'warning'
      })
      return
    }

    // 檢查標籤是否已存在
    if (tags.includes(tagToAdd)) {
      await alert({
        title: '標籤已存在',
        message: `商品已有標籤「${tagToAdd}」`,
        variant: 'warning'
      })
      return
    }

    // 檢查標籤數量上限
    if (tags.length >= 5) {
      await alert({
        title: '標籤數量已達上限',
        message: '每個商品最多只能有 5 個標籤',
        variant: 'warning'
      })
      return
    }

    const newTags = [...tags, tagToAdd]
    await updateTags(newTags)
    setShowAddForm(false)
    setSelectedTag('')
    setNewTagInput('')
  }

  const updateTags = async (newTags: string[]) => {
    setIsUpdating(true)

    try {
      const result = await updateProductTags({
        product_id: productId,
        tags: newTags
      })

      if (result.success) {
        setTags(newTags)
        await alert({
          title: '標籤更新成功',
          message: result.message || '標籤已成功更新',
          variant: 'success'
        })

        // 發送標籤更新事件，通知篩選器重新載入標籤列表
        window.dispatchEvent(new Event('product-tags-updated'))

        onUpdateSuccess?.()
      } else {
        await alert({
          title: '標籤更新失敗',
          message: result.message || '標籤更新失敗',
          variant: 'error'
        })
      }
    } catch (error) {
      await alert({
        title: '標籤更新失敗',
        message: '標籤更新時發生錯誤',
        variant: 'error'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* 當前標籤列表 */}
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => handleRemoveTag(tag)}
          disabled={isUpdating}
          className={cn(
            "group inline-flex items-center gap-1 rounded-none border-2 border-black px-2 py-0.5 font-bold",
            "transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
            "hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            designTokens.typography.caption,
            tag.toLowerCase().includes('熱銷') || tag.toLowerCase().includes('hot')
              ? 'bg-red-100 text-red-800'
              : tag.toLowerCase().includes('新品') || tag.toLowerCase().includes('new')
                ? 'bg-green-100 text-green-800'
                : tag.toLowerCase().includes('限量') || tag.toLowerCase().includes('limited')
                  ? 'bg-purple-100 text-purple-800'
                  : tag.toLowerCase().includes('促銷') || tag.toLowerCase().includes('sale')
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
          )}
          title={`點擊移除標籤「${tag}」`}
        >
          <span>{tag}</span>
          <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}

      {/* 添加標籤按鈕 */}
      {!showAddForm && tags.length < 5 && (
        <button
          onClick={() => setShowAddForm(true)}
          disabled={isUpdating}
          className={cn(
            "inline-flex items-center gap-1 rounded-none border-2 border-dashed border-gray-400 bg-white px-2 py-0.5 font-bold",
            "transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]",
            "hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none hover:border-black",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            designTokens.typography.caption,
            "text-gray-600"
          )}
          title="添加標籤"
        >
          <Plus className="h-3 w-3" />
          <span>添加</span>
        </button>
      )}

      {/* 添加標籤表單（內嵌顯示） */}
      {showAddForm && (
        <div className="flex items-center gap-1.5 ml-1">
          {/* 選擇現有標籤 */}
          {availableTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value)
                setNewTagInput('') // 清空新標籤輸入
              }}
              disabled={isUpdating}
              className={cn(
                "rounded-none border-2 border-black px-2 py-0.5 font-bold",
                designTokens.typography.caption,
                "disabled:opacity-50"
              )}
            >
              <option value="">選擇現有標籤</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          {/* 或輸入新標籤 */}
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => {
              setNewTagInput(e.target.value)
              setSelectedTag('') // 清空下拉選單
            }}
            disabled={isUpdating}
            placeholder="新標籤"
            className={cn(
              "w-24 rounded-none border-2 border-black px-2 py-0.5",
              designTokens.typography.caption,
              "disabled:opacity-50"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              } else if (e.key === 'Escape') {
                setShowAddForm(false)
                setSelectedTag('')
                setNewTagInput('')
              }
            }}
          />

          {/* 確認/取消按鈕 */}
          <button
            onClick={handleAddTag}
            disabled={isUpdating}
            className={cn(
              "rounded-none border-2 border-black bg-green-400 px-2 py-0.5 font-bold",
              "shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
              "hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              designTokens.typography.caption
            )}
            title="確認添加"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setShowAddForm(false)
              setSelectedTag('')
              setNewTagInput('')
            }}
            disabled={isUpdating}
            className={cn(
              "rounded-none border-2 border-black bg-gray-200 px-2 py-0.5 font-bold",
              "shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
              "hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              designTokens.typography.caption
            )}
            title="取消"
          >
            ✕
          </button>
        </div>
      )}

      {/* 無標籤提示 */}
      {tags.length === 0 && !showAddForm && (
        <span className={cn("text-gray-400 italic", designTokens.typography.caption)}>
          無標籤
        </span>
      )}
    </div>
  )
}
