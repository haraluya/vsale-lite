'use client'

import { Category } from '@/types'
import { Edit, Trash2, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { deleteCategory } from '@/lib/actions/categories'
import { useState } from 'react'

export function CategoryTable({ categories }: { categories: Category[] }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」分類嗎?\n\n注意:若此分類已有商品使用,將無法刪除。`)) {
      return
    }

    setLoading(id)
    const result = await deleteCategory(id)
    setLoading(null)

    if (result.success) {
      alert(result.message)
      // 重新載入頁面以更新列表
      window.location.reload()
    } else {
      alert(result.message)
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
    <div className="card-neo overflow-hidden p-0">
      <table className="w-full">
        <thead className="border-b-3 border-black bg-gray-100">
          <tr>
            <th className="px-6 py-4 text-left font-bold">
              <div className="flex items-center gap-2">
                排序
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </th>
            <th className="px-6 py-4 text-left font-bold">分類名稱</th>
            <th className="px-6 py-4 text-left font-bold">描述</th>
            <th className="px-6 py-4 text-left font-bold">建立時間</th>
            <th className="px-6 py-4 text-right font-bold">操作</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b-3 border-black last:border-b-0">
              <td className="px-6 py-4">
                <span className="inline-flex items-center justify-center rounded-none border-2 border-black bg-yellow-300 px-3 py-1 font-bold">
                  {category.sort_order}
                </span>
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
                    onClick={() => handleDelete(category.id, category.name)}
                    disabled={loading === category.id}
                    className="inline-flex items-center gap-2 border-3 border-black bg-red-500 px-4 py-2 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {loading === category.id ? '刪除中...' : '刪除'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
