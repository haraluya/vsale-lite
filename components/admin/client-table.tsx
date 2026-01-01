'use client'

import { Client, Tier } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Edit, Search } from 'lucide-react'

type ClientTableProps = {
  clients: Client[]
  tiers: Tier[]
  total: number
  page: number
  search: string
  selectedTierId: string
}

export function ClientTable({
  clients,
  tiers,
  total,
  page,
  search: initialSearch,
  selectedTierId,
}: ClientTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch)

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.delete('page') // 重置到第一頁
    startTransition(() => {
      router.push(`/admin/clients?${params.toString()}`)
    })
  }

  const handleTierFilter = (tier_id: string) => {
    const params = new URLSearchParams(searchParams)
    if (tier_id) {
      params.set('tier_id', tier_id)
    } else {
      params.delete('tier_id')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/admin/clients?${params.toString()}`)
    })
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`/admin/clients?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-4">
      {/* 搜尋與篩選 */}
      <div className="card-neo bg-white p-4">
        <div className="flex gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              type="search"
              placeholder="搜尋手機號碼或顯示名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isPending}>
              <Search className="h-4 w-4 mr-2" />
              搜尋
            </Button>
          </form>

          <select
            value={selectedTierId}
            onChange={(e) => handleTierFilter(e.target.value)}
            className="input-neo"
            disabled={isPending}
          >
            <option value="">全部等級</option>
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 客戶列表 */}
      <div className="card-neo bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-3 border-black bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold">
                  手機號碼
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold">
                  顯示名稱
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold">
                  會員等級
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold">
                  建立時間
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {search || selectedTierId
                      ? '查無符合條件的客戶'
                      : '尚無客戶資料,點擊「快速開戶」建立第一位客戶'}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">
                      {client.phone}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {client.display_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block rounded-none border-2 border-black bg-blue-100 px-3 py-1 text-xs font-bold">
                        {client.tier_name || '未設定'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(client.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/clients/${client.id}/edit`}>
                        <Button size="sm" variant="secondary">
                          <Edit className="h-3 w-3 mr-1" />
                          編輯
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            第 {page} / {totalPages} 頁,共 {total} 筆
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || isPending}
            >
              上一頁
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || isPending}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
