'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Package,
  FileText,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
  Save,
} from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { useConfirm } from '@/lib/contexts/dialog-context'
import type { HomePageBlock, ImageCarouselConfig } from '@/types'

interface SortableCardProps {
  block: HomePageBlock
  index: number
  isFirst: boolean
  isLast: boolean
  onEdit: (blockId: string) => void
  onDelete: (blockId: string) => void
  onMoveToTop: (blockId: string) => void
  onMoveToBottom: (blockId: string) => void
  onMoveUp: (blockId: string) => void
  onMoveDown: (blockId: string) => void
}

function SortableCard({
  block,
  index,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveToTop,
  onMoveToBottom,
  onMoveUp,
  onMoveDown,
}: SortableCardProps) {
  const confirm = useConfirm()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 取得區塊類型顯示名稱
  const getBlockTypeLabel = () => {
    switch (block.block_type) {
      case 'image_carousel':
        return '圖片輪播 (橫向)'
      case 'image_carousel_portrait':
        return '海報輪播 (直向)'
      case 'product_display':
        return '商品展示'
      case 'text_block':
        return '文字區塊'
      default:
        return '未知'
    }
  }

  // 取得區塊類型圖示
  const getBlockIcon = () => {
    if (block.block_type === 'image_carousel' || block.block_type === 'image_carousel_portrait') {
      return <ImageIcon className="h-5 w-5" />
    } else if (block.block_type === 'product_display') {
      return <Package className="h-5 w-5" />
    } else {
      return <FileText className="h-5 w-5" />
    }
  }

  // 取得縮圖
  const getThumbnail = () => {
    if (block.block_type === 'image_carousel' || block.block_type === 'image_carousel_portrait') {
      const config = block.config as ImageCarouselConfig
      const firstImage = config.images?.[0]?.url
      return firstImage || null
    }
    return null
  }

  const thumbnail = getThumbnail()

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
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 rounded-none border-2 border-black bg-white p-4 shadow-neo-sm transition-all
        ${isDragging ? 'z-50 rotate-2 opacity-50 shadow-neo' : 'hover:shadow-neo'}
      `}
    >
      {/* 拖曳手把 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical className="h-6 w-6 text-gray-400" />
      </div>

      {/* 順序號碼 */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-none border-2 border-black bg-yellow-300 font-bold">
        {index + 1}
      </div>

      {/* 縮圖或圖示 */}
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-none border-2 border-black bg-gray-100 overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={block.name}
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        ) : (
          getBlockIcon()
        )}
      </div>

      {/* 資訊 */}
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate" title={block.name}>
          {block.name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-600">{getBlockTypeLabel()}</span>
          <span
            className={`
              px-2 py-0.5 text-xs font-medium rounded
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
      </div>

      {/* 快速排序按鈕 */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onMoveToTop(block.id)}
          disabled={isFirst}
          title="移到頂部"
          className={`
            flex items-center justify-center p-2 rounded-none
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
          <ChevronsUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => onMoveUp(block.id)}
          disabled={isFirst}
          title="上移"
          className={`
            flex items-center justify-center p-2 rounded-none
            ${designTokens.neoBrutalism.border.mobile}
            border-black
            transition-all
            ${
              isFirst
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-400 text-white hover:translate-x-[1px] hover:translate-y-[1px]'
            }
          `}
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => onMoveDown(block.id)}
          disabled={isLast}
          title="下移"
          className={`
            flex items-center justify-center p-2 rounded-none
            ${designTokens.neoBrutalism.border.mobile}
            border-black
            transition-all
            ${
              isLast
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-400 text-white hover:translate-x-[1px] hover:translate-y-[1px]'
            }
          `}
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        <button
          onClick={() => onMoveToBottom(block.id)}
          disabled={isLast}
          title="移到底部"
          className={`
            flex items-center justify-center p-2 rounded-none
            ${designTokens.neoBrutalism.border.mobile}
            border-black
            transition-all
            ${
              isLast
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-400 text-white hover:translate-x-[1px] hover:translate-y-[1px]'
            }
          `}
        >
          <ChevronsDown className="w-4 h-4" />
        </button>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(block.id)}
          className={`
            flex items-center justify-center gap-1 px-3 py-2 rounded-none
            bg-blue-500 text-white font-medium text-sm
            ${designTokens.neoBrutalism.border.mobile}
            border-black
            hover:translate-x-[1px] hover:translate-y-[1px]
            transition-all
          `}
        >
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">編輯</span>
        </button>

        <button
          onClick={handleDelete}
          className={`
            flex items-center justify-center gap-1 px-3 py-2 rounded-none
            bg-red-600 text-white font-medium text-sm
            ${designTokens.neoBrutalism.border.mobile}
            border-black
            hover:translate-x-[1px] hover:translate-y-[1px]
            transition-all
          `}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">刪除</span>
        </button>
      </div>
    </div>
  )
}

interface HomeBlockSortableListProps {
  blocks: HomePageBlock[]
  onEdit: (blockId: string) => void
  onDelete: (blockId: string) => void
  onSaveOrder: (blocks: HomePageBlock[]) => Promise<void>
}

export function HomeBlockSortableList({
  blocks: initialBlocks,
  onEdit,
  onDelete,
  onSaveOrder,
}: HomeBlockSortableListProps) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 當外部 blocks 更新時同步
  useEffect(() => {
    setBlocks(initialBlocks)
    setHasChanges(false)
  }, [initialBlocks])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)
        setHasChanges(true)
        return newItems
      })
    }
  }

  function handleMoveToTop(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === 0) return

    const newBlocks = [...blocks]
    const [item] = newBlocks.splice(index, 1)
    newBlocks.unshift(item)
    setBlocks(newBlocks)
    setHasChanges(true)
  }

  function handleMoveUp(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === 0) return

    const newBlocks = [...blocks]
    ;[newBlocks[index - 1], newBlocks[index]] = [
      newBlocks[index],
      newBlocks[index - 1],
    ]
    setBlocks(newBlocks)
    setHasChanges(true)
  }

  function handleMoveDown(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === blocks.length - 1) return

    const newBlocks = [...blocks]
    ;[newBlocks[index], newBlocks[index + 1]] = [
      newBlocks[index + 1],
      newBlocks[index],
    ]
    setBlocks(newBlocks)
    setHasChanges(true)
  }

  function handleMoveToBottom(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === blocks.length - 1) return

    const newBlocks = [...blocks]
    const [item] = newBlocks.splice(index, 1)
    newBlocks.push(item)
    setBlocks(newBlocks)
    setHasChanges(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSaveOrder(blocks)
      setHasChanges(false)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setBlocks(initialBlocks)
    setHasChanges(false)
  }

  return (
    <div className="space-y-4">
      {/* 使用說明 */}
      <div className="rounded-none border-2 border-blue-600 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>操作方式：</strong>按住左側的
          <GripVertical className="mx-1 inline h-4 w-4" />
          圖示，將項目拖曳到想要的位置後放開。或使用右側的快速操作按鈕調整順序。
        </p>
      </div>

      {/* 操作提示 */}
      {hasChanges && (
        <div className="rounded-none border-2 border-orange-600 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800">
            ⚠️ 你有未儲存的順序變更！請點擊「儲存順序」按鈕來保存變更。
          </p>
        </div>
      )}

      {/* 儲存按鈕 */}
      {hasChanges && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              flex items-center gap-2 rounded-none px-6 py-3 font-bold
              ${designTokens.neoBrutalism.border.full}
              border-black
              transition-all
              ${
                saving
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                  : 'bg-green-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }
            `}
          >
            <Save className="h-5 w-5" />
            {saving ? '儲存中...' : '儲存順序'}
          </button>
          <button
            onClick={handleReset}
            disabled={saving}
            className={`
              rounded-none px-6 py-3 font-bold
              ${designTokens.neoBrutalism.border.full}
              border-black
              transition-all
              ${
                saving
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                  : 'bg-gray-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }
            `}
          >
            重置
          </button>
        </div>
      )}

      {/* 拖曳列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <SortableCard
                key={block.id}
                block={block}
                index={index}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveToTop={handleMoveToTop}
                onMoveToBottom={handleMoveToBottom}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
