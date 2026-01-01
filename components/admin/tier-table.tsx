'use client'

import { Tier } from '@/types'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { deleteTier } from '@/lib/actions/tiers'
import { useState } from 'react'

export function TierTable({ tiers }: { tiers: Tier[] }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」等級嗎?`)) {
      return
    }

    setLoading(id)
    const result = await deleteTier(id)
    setLoading(null)

    if (result.success) {
      alert(result.message)
    } else {
      alert(result.message)
    }
  }

  if (tiers.length === 0) {
    return (
      <div className="card-neo text-center py-12">
        <p className="text-gray-600">尚無會員等級資料</p>
      </div>
    )
  }

  return (
    <div className="card-neo overflow-hidden p-0">
      <table className="w-full">
        <thead className="border-b-3 border-black bg-gray-100">
          <tr>
            <th className="px-6 py-4 text-left font-bold">排序</th>
            <th className="px-6 py-4 text-left font-bold">等級名稱</th>
            <th className="px-6 py-4 text-left font-bold">建立時間</th>
            <th className="px-6 py-4 text-right font-bold">操作</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={tier.id} className="border-b-3 border-black last:border-b-0">
              <td className="px-6 py-4">{tier.rank}</td>
              <td className="px-6 py-4 font-bold">{tier.name}</td>
              <td className="px-6 py-4 text-gray-600">
                {new Date(tier.created_at).toLocaleDateString('zh-TW')}
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/tiers/${tier.id}/edit`}
                    className="inline-flex items-center gap-2 border-3 border-black bg-white px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
                  >
                    <Edit className="h-4 w-4" />
                    編輯
                  </Link>
                  <button
                    onClick={() => handleDelete(tier.id, tier.name)}
                    disabled={loading === tier.id}
                    className="inline-flex items-center gap-2 border-3 border-black bg-red-500 px-4 py-2 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {loading === tier.id ? '刪除中...' : '刪除'}
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
