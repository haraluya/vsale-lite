'use client'

import { Category } from '@/types'
import { Edit, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { deleteCategory } from '@/lib/actions/categories'
import { reorderCategories } from '@/lib/actions/reorder'
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
import { toast } from 'sonner'

function SortableRow({ category, onDelete, loading }: { category: Category; onDelete: (id: string, name: string) => void; loading: string | null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b-3 border-black last:border-b-0 bg-white">
      <td className="px-4 py-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>
      </td>
      <td className="px-6 py-4 font-bold">{category.name}</td>
      <td className="px-6 py-4 text-gray-600">
        {category.description || <span className="text-gray-400 italic">無描述</span>}
      </td>
      <td className="px-6 py-4 text-gray-600">
        {new Date(category.created_at).toLocaleDateString('zh-TW')}
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/categories/${category.id}/edit`}
            className="inline-flex items-center gap-2 border-3 border-black bg-white px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
          >
            <Edit className="h-4 w-4" />
            編輯
          </Link>
          <button
            onClick={() => onDelete(category.id, category.name)}
            disabled={loading === category.id}
            className="inline-flex items-center gap-2 border-3 border-black bg-red-500 px-4 py-2 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {loading === category.id ? '刪除中...' : '刪除'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export function CategoryTable({ categories: initialCategories }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [loading, setLoading] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id)
    const newIndex = categories.findIndex((cat) => cat.id === over.id)

    const newCategories = arrayMove(categories, oldIndex, newIndex)
    setCategories(newCategories)

    // 更新排序到資料庫
    setIsSaving(true)
    const items = newCategories.map((cat, index) => ({
      id: cat.id,
      sort_order: index + 1,
    }))

    const result = await reorderCategories(items)
    setIsSaving(false)

    if (result.success) {
      toast.success('排序已更新')
    } else {
      toast.error(result.message || '更新排序失敗')
      // 恢復原始順序
      setCategories(initialCategories)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」分類嗎?\n\n注意:若此分類已有商品使用,將無法刪除。`)) {
      return
    }

    setLoading(id)
    const result = await deleteCategory(id)
    setLoading(null)

    if (result.success) {
      toast.success(result.message || '刪除成功')
      setCategories(categories.filter(c => c.id !== id))
    } else {
      toast.error(result.message || '刪除失敗')
    }
  }

  if (categories.length === 0) {
    return (
      <div className="card-neo text-center py-12">
        <p className="text-gray-600">尚無商品分類資料</p>
        <p className="text-sm text-gray-500 mt-2">點擊右上角「新增分類」開始建立</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isSaving && (
        <div className="card-neo bg-yellow-50 border-yellow-500 p-4">
          <p className="text-sm font-bold">正在儲存排序...</p>
        </div>
      )}
      <div className="card-neo overflow-hidden p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead className="border-b-3 border-black bg-gray-100">
              <tr>
                <th className="px-4 py-4 text-left font-bold w-16">拖曳</th>
                <th className="px-6 py-4 text-left font-bold">分類名稱</th>
                <th className="px-6 py-4 text-left font-bold">描述</th>
                <th className="px-6 py-4 text-left font-bold">建立時間</th>
                <th className="px-6 py-4 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.map((category) => (
                  <SortableRow
                    key={category.id}
                    category={category}
                    onDelete={handleDelete}
                    loading={loading}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
      <div className="card-neo bg-blue-50 border-blue-500 p-4">
        <p className="text-sm text-gray-700">
          <strong>提示：</strong>拖曳左側的 <GripVertical className="inline h-4 w-4" /> 圖示來調整分類排序
        </p>
      </div>
    </div>
  )
}
