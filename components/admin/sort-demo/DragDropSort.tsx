'use client'

import { useState } from 'react'
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
import { GripVertical, Image as ImageIcon, Package, Type, Save } from 'lucide-react'
import { useAlert } from '@/lib/contexts/dialog-context'

interface Block {
  id: string
  name: string
  type: string
  sort_order: number
}

interface SortableItemProps {
  block: Block
  index: number
}

function SortableItem({ block, index }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 根據類型選擇圖示
  const getIcon = () => {
    if (block.type.includes('圖片')) return <ImageIcon className="h-5 w-5" />
    if (block.type.includes('商品')) return <Package className="h-5 w-5" />
    if (block.type.includes('文字')) return <Type className="h-5 w-5" />
    return <Package className="h-5 w-5" />
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-none border-2 border-black bg-white p-4 shadow-neo-sm transition-all ${
        isDragging ? 'z-50 rotate-2 opacity-50 shadow-neo' : 'hover:shadow-neo'
      }`}
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

      {/* 圖示 */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none border-2 border-black bg-gray-100">
        {getIcon()}
      </div>

      {/* 資訊 */}
      <div className="flex-1">
        <div className="font-bold">{block.name}</div>
        <div className="text-sm text-gray-600">{block.type}</div>
      </div>
    </div>
  )
}

interface DragDropSortProps {
  initialBlocks: Block[]
}

export function DragDropSort({ initialBlocks }: DragDropSortProps) {
  const alert = useAlert()
  const [blocks, setBlocks] = useState(initialBlocks)
  const [hasChanges, setHasChanges] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  async function handleSave() {
    // 模擬儲存
    console.log('儲存新順序：', blocks)
    await alert({
      title: '順序已儲存',
      message: blocks.map((b, i) => `${i + 1}. ${b.name}`).join('\n'),
      variant: 'success',
    })
    setHasChanges(false)
  }

  function handleReset() {
    setBlocks(initialBlocks)
    setHasChanges(false)
  }

  return (
    <div>
      {/* 說明 */}
      <div className="mb-4 rounded-none border-2 border-blue-600 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>操作方式：</strong>按住左側的
          <GripVertical className="mx-1 inline h-4 w-4" />
          圖示，將項目拖曳到想要的位置後放開。
        </p>
      </div>

      {/* 拖曳列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <SortableItem key={block.id} block={block} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 操作按鈕 */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex items-center gap-2 rounded-none border-3 border-black px-6 py-3 font-bold transition-all ${
            hasChanges
              ? 'bg-green-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
        >
          <Save className="h-5 w-5" />
          儲存順序
        </button>
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className={`rounded-none border-3 border-black px-6 py-3 font-bold transition-all ${
            hasChanges
              ? 'bg-gray-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
        >
          重置
        </button>
      </div>

      {/* 變更提示 */}
      {hasChanges && (
        <p className="mt-3 text-sm font-bold text-orange-600">
          ⚠️ 你有未儲存的變更！記得點擊「儲存順序」按鈕。
        </p>
      )}
    </div>
  )
}
