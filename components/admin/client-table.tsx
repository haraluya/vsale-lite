'use client'

import { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Edit, Trash2, Key, Copy, Check } from 'lucide-react'
import { deleteClient } from '@/lib/actions/clients'
import { useHighlightKeyword } from './client-filter'

type ClientTableProps = {
  clients: Client[]
  total: number
  page: number
  searchKeyword?: string  // 搜尋關鍵字 (用於高亮)
}

export function ClientTable({
  clients,
  total,
  page,
  searchKeyword = '',
}: ClientTableProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)

  // 高亮關鍵字 Hook
  const highlightKeyword = useHighlightKeyword(searchKeyword)

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', newPage.toString())
    router.push(`/admin/clients?${params.toString()}`)
  }

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteClient(clientToDelete.id)

      if (result.success) {
        alert(result.message)
        router.refresh()
      } else {
        alert(result.message)
      }
    } catch (error) {
      alert('刪除失敗，請稍後再試')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  const handleCopyLoginInfo = (client: Client) => {
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
    const phone = client.phone

    // 與快速開戶相同的格式，但密碼顯示為「請向管理員索取」
    const fullGuide = `【Vsale 訂貨系統 - 登入資訊】

前台網址: ${loginUrl}
登入電話: ${phone}
登入密碼: (請向管理員索取)

請使用以上資訊登入系統進行下單。`

    navigator.clipboard.writeText(fullGuide)
    setCopiedClientId(client.id)
    setTimeout(() => setCopiedClientId(null), 2000)
  }

  return (
    <div className="space-y-4">

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
                  地址
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold">
                  備註
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {searchKeyword || total === 0
                      ? '查無符合條件的客戶'
                      : '尚無客戶資料,點擊「快速開戶」建立第一位客戶'}
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  // 地址與備註摘要 (最多 30 字)
                  const addressPreview = client.address
                    ? client.address.length > 30
                      ? client.address.substring(0, 30) + '...'
                      : client.address
                    : '-'
                  const notesPreview = client.admin_notes
                    ? client.admin_notes.length > 30
                      ? client.admin_notes.substring(0, 30) + '...'
                      : client.admin_notes
                    : '-'

                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono">
                        {highlightKeyword(client.phone)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {client.display_name ? highlightKeyword(client.display_name) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600" title={client.address || ''}>
                        {addressPreview}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600" title={client.admin_notes || ''}>
                        <span className="text-yellow-700">{notesPreview}</span>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopyLoginInfo(client)}
                            className="border-3 border-black bg-green-100 hover:bg-green-200"
                            title="複製登入資訊（不含密碼）"
                          >
                            {copiedClientId === client.id ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                已複製
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                複製帳密
                              </>
                            )}
                          </Button>
                          <Link href={`/admin/clients/${client.id}/edit`}>
                            <Button size="sm" variant="secondary">
                              <Edit className="h-3 w-3 mr-1" />
                              編輯
                            </Button>
                          </Link>
                          <Link href={`/admin/clients/${client.id}/password`}>
                            <Button size="sm" variant="secondary">
                              <Key className="h-3 w-3 mr-1" />
                              改密碼
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeleteClick(client)}
                            disabled={isDeleting}
                            className="border-3 border-black bg-red-500 text-white hover:bg-red-600"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            刪除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
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
              disabled={page === 1}
            >
              上一頁
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}

      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setClientToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="刪除客戶"
        description={`確定要刪除客戶「${clientToDelete?.display_name || clientToDelete?.phone}」嗎？此操作無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  )
}
