'use client'

import { Category } from '@/types'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { deleteCategory } from '@/lib/actions/categories'
import { useState } from 'react'
import { toast } from 'sonner'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

function CategoryRow({ category, onDelete, loading }: { category: Category; onDelete: (id: string, name: string) => void; loading: string | null }) {
  return (
    <tr className="border-b-3 border-black last:border-b-0 bg-white">
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
      {/* 桌面版: 完整表格 */}
      <div className="hidden lg:block card-neo overflow-hidden p-0">
        <table className="w-full">
          <thead className="border-b-3 border-black bg-gray-100">
            <tr>
              <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>分類名稱</th>
              <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>描述</th>
              <th className={cn("px-4 py-3 text-left font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>建立時間</th>
              <th className={cn("px-4 py-3 text-right font-bold md:px-6 md:py-4", designTokens.typography.body.base)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onDelete={handleDelete}
                loading={loading}
              />
            ))}
          </tbody>
        </table>
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

    </div>
  )
}
