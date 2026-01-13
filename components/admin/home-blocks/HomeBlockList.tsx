'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { getAllHomeBlocks, getHomeBlockById, deleteHomeBlock, moveBlockUp, moveBlockDown } from '@/lib/actions/home-blocks'
import { useAlert } from '@/lib/contexts/dialog-context'
import { HomeBlockCard } from './HomeBlockCard'
import { HomeBlockForm } from './HomeBlockForm'
import { BlockTypeChoice } from './BlockTypeChoice'
import type { HomePageBlock, BlockType } from '@/types'

/**
 * 首頁廣告區塊列表元件
 * 顯示所有區塊（含停用），並提供新增、編輯、刪除功能
 */
export function HomeBlockList() {
  const alert = useAlert()
  const [blocks, setBlocks] = useState<HomePageBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showTypeChoice, setShowTypeChoice] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<BlockType | null>(null)
  const [editingBlock, setEditingBlock] = useState<HomePageBlock | null>(null)

  // 載入區塊列表
  const fetchBlocks = async () => {
    setLoading(true)
    const result = await getAllHomeBlocks()
    setLoading(false)

    if (result.success && result.data) {
      setBlocks(result.data)
    } else {
      await alert({
        title: '載入失敗',
        message: result.message || '載入失敗',
        variant: 'error',
      })
    }
  }

  useEffect(() => {
    fetchBlocks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 處理新增 - 先顯示類型選擇
  const handleAdd = () => {
    setEditingBlock(null)
    setSelectedType(null)
    setShowTypeChoice(true)
  }

  // 處理類型選擇
  const handleTypeSelect = (type: BlockType) => {
    setSelectedType(type)
    setShowTypeChoice(false)
    setShowForm(true)
  }

  // 處理取消類型選擇
  const handleTypeCancelChoice = () => {
    setShowTypeChoice(false)
  }

  // 處理編輯
  const handleEdit = async (blockId: string) => {
    // 從資料庫重新取得最新資料，避免使用舊快照
    const result = await getHomeBlockById(blockId)

    if (!result.success || !result.data) {
      await alert({
        title: '載入失敗',
        message: result.message || '無法載入區塊資料',
        variant: 'error',
      })
      return
    }

    setEditingBlock(result.data)
    setShowForm(true)
  }

  // 處理刪除
  const handleDelete = async (blockId: string) => {
    const result = await deleteHomeBlock(blockId)

    if (!result.success) {
      await alert({
        title: '刪除失敗',
        message: result.message || '刪除失敗',
        variant: 'error',
      })
      return
    }

    await alert({
      title: '刪除成功',
      message: result.message || '刪除成功',
      variant: 'success',
    })

    // 重新載入列表
    fetchBlocks()
  }

  // 處理表單成功
  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingBlock(null)
    setSelectedType(null)
    // 重新載入列表
    fetchBlocks()
  }

  // 處理取消
  const handleCancel = () => {
    setShowForm(false)
    setEditingBlock(null)
    setSelectedType(null)
  }

  // 處理向上移動
  const handleMoveUp = async (blockId: string) => {
    const result = await moveBlockUp(blockId)

    if (!result.success) {
      await alert({
        title: '移動失敗',
        message: result.message || '向上移動失敗',
        variant: 'error',
      })
      return
    }

    // 重新載入列表
    fetchBlocks()
  }

  // 處理向下移動
  const handleMoveDown = async (blockId: string) => {
    const result = await moveBlockDown(blockId)

    if (!result.success) {
      await alert({
        title: '移動失敗',
        message: result.message || '向下移動失敗',
        variant: 'error',
      })
      return
    }

    // 重新載入列表
    fetchBlocks()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">載入中...</span>
      </div>
    )
  }

  // 顯示類型選擇
  if (showTypeChoice) {
    return (
      <BlockTypeChoice
        onSelect={handleTypeSelect}
        onCancel={handleTypeCancelChoice}
      />
    )
  }

  // 顯示表單
  if (showForm) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">
          {editingBlock ? '編輯區塊' : '新增區塊'}
        </h2>
        <HomeBlockForm
          blockId={editingBlock?.id}
          initialData={editingBlock || (selectedType ? { block_type: selectedType } as any : undefined)}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 新增按鈕 */}
      <button
        onClick={handleAdd}
        className={`
          flex items-center justify-center gap-2 w-full py-3 rounded-none
          bg-green-500 text-white font-medium
          ${designTokens.neoBrutalism.border.full}
          ${designTokens.neoBrutalism.shadow.full}
          border-black
          hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
          transition-all
        `}
      >
        <Plus className="w-5 h-5" />
        <span>新增區塊</span>
      </button>

      {/* 區塊列表 */}
      {blocks.length === 0 ? (
        <div
          className={`
            flex flex-col items-center justify-center py-12 rounded-none bg-gray-50
            ${designTokens.neoBrutalism.border.full}
            border-black border-dashed
          `}
        >
          <p className="text-gray-600 mb-4">
            尚無首頁廣告區塊，點擊「新增區塊」開始建立
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blocks.map((block, index) => (
            <HomeBlockCard
              key={block.id}
              block={block}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
      )}
    </div>
  )
}
