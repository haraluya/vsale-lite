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
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

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
      <td className={cn("px-3 py-3 md:px-4 md:py-4")}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>
      </td>
      <td className={cn("px-4 py-3 font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>{category.name}</td>
      <td className={cn("px-4 py-3 text-gray-600 md:px-6 md:py-4", designTokens.typography.caption)}>
        {category.description || <span className="text-gray-400 italic">無描述</span>}
      </td>
      <td className={cn("px-4 py-3 text-gray-600 md:px-6 md:py-4", designTokens.typography.caption)}>
        {new Date(category.created_at).toLocaleDateString('zh-TW')}
      </td>
      <td className={cn("px-4 py-3 md:px-6 md:py-4")}>
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/categories/${category.id}/edit`}
            className={cn(
              "inline-flex items-center gap-2 bg-white font-bold transition-all",
              designTokens.neoBrutalism.border.full,
              designTokens.neoBrutalism.shadow.mobile,
              designTokens.neoBrutalism.hover,
              designTokens.button.sm
            )}
          >
            <Edit className="h-4 w-4" />
            編輯
          </Link>
          <button
            onClick={() => onDelete(category.id, category.name)}
            disabled={loading === category.id}
            className={cn(
              "inline-flex items-center gap-2 bg-red-500 font-bold text-white transition-all disabled:opacity-50",
              designTokens.neoBrutalism.border.full,
              designTokens.neoBrutalism.shadow.mobile,
              designTokens.neoBrutalism.hover,
              designTokens.button.sm
            )}
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
      <div className={cn("card-neo text-center", designTokens.spacing.card.padding)}>
        <p className={cn("text-gray-600", designTokens.typography.body.base)}>尚無商品分類資料</p>
        <p className={cn("text-gray-500 mt-2", designTokens.typography.caption)}>點擊右上角「新增分類」開始建立</p>
      </div>
    )
  }

  return (
    <div className={designTokens.spacing.page.gap}>
      {isSaving && (
        <div className={cn(
          "card-neo bg-yellow-50 border-yellow-500",
          designTokens.spacing.card.padding
        )}>
          <p className={cn("font-bold", designTokens.typography.body.base)}>正在儲存排序...</p>
        </div>
      )}

      {/* 桌面版: 完整表格 */}
      <div className="hidden lg:block card-neo overflow-hidden p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead className="border-b-3 border-black bg-gray-100">
              <tr>
                <th className={cn("px-3 py-3 text-left font-bold w-16 md:px-4 md:py-4", designTokens.typography.body.base)}>拖曳</th>
                <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>分類名稱</th>
                <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>描述</th>
                <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>建立時間</th>
                <th className={cn("px-4 py-3 text-right font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>操作</th>
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

      {/* 手機版: 卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className={cn(
              "rounded-none bg-white",
              getNeoBrutalismClasses(),
              designTokens.spacing.card.padding
            )}
          >
            {/* 分類名稱 */}
            <div className="mb-3">
              <h3 className={cn(designTokens.typography.h3, "mb-1")}>{category.name}</h3>
              {category.description ? (
                <p className={cn(designTokens.typography.caption, "text-gray-600")}>
                  {category.description}
                </p>
              ) : (
                <p className={cn(designTokens.typography.caption, "text-gray-400 italic")}>無描述</p>
              )}
            </div>

            {/* 建立時間 */}
            <div className="mb-3 pb-3 border-b border-gray-200">
              <span className={cn(designTokens.typography.caption, "text-gray-500")}>
                建立於 {new Date(category.created_at).toLocaleDateString('zh-TW')}
              </span>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2">
              <Link
                href={`/admin/categories/${category.id}/edit`}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 bg-white font-bold transition-all",
                  getNeoBrutalismClasses({ active: true }),
                  designTokens.button.md
                )}
              >
                <Edit className="h-4 w-4" />
                編輯
              </Link>
              <button
                onClick={() => handleDelete(category.id, category.name)}
                disabled={loading === category.id}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 bg-red-500 font-bold text-white transition-all disabled:opacity-50",
                  getNeoBrutalismClasses({ active: true }),
                  designTokens.button.md
                )}
              >
                <Trash2 className="h-4 w-4" />
                {loading === category.id ? '刪除中...' : '刪除'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={cn(
        "card-neo bg-blue-50 border-blue-500",
        designTokens.spacing.card.padding
      )}>
        <p className={cn("text-gray-700", designTokens.typography.caption)}>
          <strong className="hidden lg:inline">提示：</strong>
          <strong className="lg:hidden">提示：</strong>
          <span className="hidden lg:inline">拖曳左側的 <GripVertical className="inline h-4 w-4" /> 圖示來調整分類排序</span>
          <span className="lg:hidden">請使用桌面版調整分類排序</span>
        </p>
      </div>
    </div>
  )
}
