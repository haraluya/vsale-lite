'use client'

import { Tier } from '@/types'
import { Edit, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { deleteTier } from '@/lib/actions/tiers'
import { reorderTiers } from '@/lib/actions/reorder'
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

function SortableRow({ tier, onDelete, loading }: { tier: Tier; onDelete: (id: string, name: string) => void; loading: string | null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id })

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
      <td className={cn("px-4 py-3 font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>{tier.name}</td>
      <td className={cn("px-4 py-3 text-gray-600 md:px-6 md:py-4", designTokens.typography.caption)}>
        {new Date(tier.created_at).toLocaleDateString('zh-TW')}
      </td>
      <td className={cn("px-4 py-3 md:px-6 md:py-4")}>
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/tiers/${tier.id}/edit`}
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
            onClick={() => onDelete(tier.id, tier.name)}
            disabled={loading === tier.id}
            className={cn(
              "inline-flex items-center gap-2 bg-red-500 font-bold text-white transition-all disabled:opacity-50",
              designTokens.neoBrutalism.border.full,
              designTokens.neoBrutalism.shadow.mobile,
              designTokens.neoBrutalism.hover,
              designTokens.button.sm
            )}
          >
            <Trash2 className="h-4 w-4" />
            {loading === tier.id ? '刪除中...' : '刪除'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export function TierTable({ tiers: initialTiers }: { tiers: Tier[] }) {
  const [tiers, setTiers] = useState(initialTiers)
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

    const oldIndex = tiers.findIndex((tier) => tier.id === active.id)
    const newIndex = tiers.findIndex((tier) => tier.id === over.id)

    const newTiers = arrayMove(tiers, oldIndex, newIndex)
    setTiers(newTiers)

    // 更新排序到資料庫
    setIsSaving(true)
    const items = newTiers.map((tier, index) => ({
      id: tier.id,
      rank: index + 1,
    }))

    const result = await reorderTiers(items)
    setIsSaving(false)

    if (result.success) {
      toast.success('排序已更新')
    } else {
      toast.error(result.message || '更新排序失敗')
      // 恢復原始順序
      setTiers(initialTiers)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」等級嗎?`)) {
      return
    }

    setLoading(id)
    const result = await deleteTier(id)
    setLoading(null)

    if (result.success) {
      toast.success(result.message || '刪除成功')
      setTiers(tiers.filter(t => t.id !== id))
    } else {
      toast.error(result.message || '刪除失敗')
    }
  }

  if (tiers.length === 0) {
    return (
      <div className={cn("card-neo text-center", designTokens.spacing.card.padding)}>
        <p className={cn("text-gray-600", designTokens.typography.body.base)}>尚無會員等級資料</p>
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
      <div className="card-neo overflow-hidden p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead className="border-b-3 border-black bg-gray-100">
              <tr>
                <th className={cn("px-3 py-3 text-left font-bold w-16 md:px-4 md:py-4", designTokens.typography.body.base)}>拖曳</th>
                <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>等級名稱</th>
                <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>建立時間</th>
                <th className={cn("px-4 py-3 text-right font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>操作</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={tiers.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tiers.map((tier) => (
                  <SortableRow
                    key={tier.id}
                    tier={tier}
                    onDelete={handleDelete}
                    loading={loading}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
      <div className={cn(
        "card-neo bg-blue-50 border-blue-500",
        designTokens.spacing.card.padding
      )}>
        <p className={cn("text-gray-700", designTokens.typography.caption)}>
          <strong>提示：</strong>拖曳左側的 <GripVertical className="inline h-4 w-4" /> 圖示來調整等級排序
        </p>
      </div>
    </div>
  )
}
