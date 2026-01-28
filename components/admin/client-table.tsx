'use client'

import { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Edit, Trash2, Key, Copy, Check } from 'lucide-react'
import { deleteClient } from '@/lib/actions/clients'
import { getSetting } from '@/lib/actions/system'
import { removeWwwFromUrl } from '@/lib/utils/template-helpers'
import { useHighlightKeyword } from './client-filter'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { formatDateTW } from '@/lib/date-utils'
import { useAlert } from '@/lib/contexts/dialog-context'
import { useNotificationTemplate } from '@/lib/hooks/use-notification-template'

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
  const alert = useAlert()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('您的公司名稱')
  const [templateMenuOpen, setTemplateMenuOpen] = useState<string | null>(null) // 記錄哪個客戶的選單開啟

  // 高亮關鍵字 Hook
  const highlightKeyword = useHighlightKeyword(searchKeyword)

  // 範本選擇 Hook
  const {
    templates,
    loading: templateLoading,
    copyToClipboard,
  } = useNotificationTemplate()

  // 載入公司名稱
  useEffect(() => {
    const loadSettings = async () => {
      const companyNameResult = await getSetting('company_name')
      if (companyNameResult.success && companyNameResult.data) {
        setCompanyName(companyNameResult.data)
      }
    }
    loadSettings()
  }, [])

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
        await alert({
          title: '刪除成功',
          message: result.message || '客戶已成功刪除',
          variant: 'success'
        })
        router.refresh()
      } else {
        await alert({
          title: '刪除失敗',
          message: result.message || '刪除客戶失敗',
          variant: 'error'
        })
      }
    } catch (error) {
      await alert({
        title: '刪除失敗',
        message: '刪除失敗，請稍後再試',
        variant: 'error'
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  const handleCopyLoginInfo = async (client: Client, templateId: string) => {
    // 產生前台網址並去除 www
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const loginUrl = removeWwwFromUrl(`${baseUrl}/login`)

    const displayName = client.display_name || ''
    const phone = client.phone

    // 找到選中的範本
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // 手動產生通知文字並複製到剪貼簿
    const text = template.template
      .replace(/\{公司名稱\}/g, companyName)
      .replace(/\{客戶名稱\}/g, displayName)
      .replace(/\{前台網址\}/g, loginUrl)
      .replace(/\{登入電話\}/g, phone)
      .replace(/\{登入密碼\}/g, '(請向管理員索取)')

    try {
      await navigator.clipboard.writeText(text)
      await alert({
        title: '複製成功',
        message: `已使用「${template.name}」範本複製登入資訊`,
        variant: 'success',
      })
      setCopiedClientId(client.id)
      setTimeout(() => setCopiedClientId(null), 2000)
      setTemplateMenuOpen(null)
    } catch (error) {
      await alert({
        title: '複製失敗',
        message: '無法存取剪貼簿，請手動複製',
        variant: 'error',
      })
    }
  }

  return (
    <div className={designTokens.spacing.page.gap}>
      {/* 桌面版: 完整表格 */}
      <div className={cn(
        "hidden lg:block card-neo bg-white overflow-hidden"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-2 md:border-b-3 border-black bg-gray-50">
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
                <th className="px-6 py-3 text-right text-sm font-bold w-[400px]">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {/* 複製帳密按鈕與選單 */}
                          <div className="relative">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setTemplateMenuOpen(templateMenuOpen === client.id ? null : client.id)}
                              className="border-2 border-black bg-green-100 hover:bg-green-200 whitespace-nowrap"
                              title="複製登入資訊（不含密碼）"
                            >
                              {copiedClientId === client.id ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  已複製
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  複製帳密
                                </>
                              )}
                            </Button>

                            {/* 範本選單 */}
                            {templateMenuOpen === client.id && templates.length > 0 && (
                              <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-none border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {templates.map((template) => (
                                  <button
                                    key={template.id}
                                    onClick={() => handleCopyLoginInfo(client, template.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-200 last:border-b-0 whitespace-nowrap"
                                  >
                                    {template.name}
                                    {template.is_default && (
                                      <span className="ml-2 text-xs text-gray-500">(預設)</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <Link href={`/admin/clients/${client.id}/edit`}>
                            <Button size="sm" variant="secondary" className="whitespace-nowrap">
                              <Edit className="h-4 w-4 mr-1" />
                              編輯
                            </Button>
                          </Link>
                          <Link href={`/admin/clients/${client.id}/password`}>
                            <Button size="sm" variant="secondary" className="whitespace-nowrap">
                              <Key className="h-4 w-4 mr-1" />
                              改密碼
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeleteClick(client)}
                            disabled={isDeleting}
                            className="border-2 border-black bg-red-500 text-white hover:bg-red-600 whitespace-nowrap"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
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

      {/* 手機版: 卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {clients.length === 0 ? (
          <div className={cn(
            "rounded-none bg-white p-8 text-center text-gray-500",
            designTokens.neoBrutalism.border.full,
            designTokens.neoBrutalism.shadow.full
          )}>
            {searchKeyword || total === 0
              ? '查無符合條件的客戶'
              : '尚無客戶資料,點擊「快速開戶」建立第一位客戶'}
          </div>
        ) : (
          clients.map((client) => {
            const addressPreview = client.address
              ? client.address.length > 20
                ? client.address.substring(0, 20) + '...'
                : client.address
              : '-'

            return (
              <div
                key={client.id}
                className={cn(
                  "rounded-none bg-white",
                  designTokens.neoBrutalism.border.full,
                  designTokens.neoBrutalism.shadow.full,
                  designTokens.spacing.card.padding,
                  designTokens.spacing.card.gap
                )}
              >
                {/* 姓名與會員等級 */}
                <div className="flex items-start justify-between gap-3">
                  <div className={designTokens.spacing.card.gap}>
                    <div className={cn("font-bold", designTokens.typography.body.base)}>
                      {client.display_name || '未設定姓名'}
                    </div>
                    <div className={cn("font-mono text-gray-600", designTokens.typography.caption)}>
                      {highlightKeyword(client.phone)}
                    </div>
                  </div>
                  <span className="inline-block rounded-none border-2 border-black bg-blue-100 px-2 py-1 text-xs font-bold whitespace-nowrap">
                    {client.tier_name || '未設定'}
                  </span>
                </div>

                {/* 地址與註冊時間 */}
                {(client.address || client.admin_notes) && (
                  <div className={cn("text-gray-600", designTokens.typography.caption)}>
                    {client.address && (
                      <div title={client.address}>
                        地址: {addressPreview}
                      </div>
                    )}
                    {client.admin_notes && (
                      <div className="text-yellow-700" title={client.admin_notes}>
                        備註: {client.admin_notes.length > 20 ? client.admin_notes.substring(0, 20) + '...' : client.admin_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                  {/* 複製帳密按鈕與選單 */}
                  <div className="relative col-span-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setTemplateMenuOpen(templateMenuOpen === client.id ? null : client.id)}
                      className="w-full border-2 border-black bg-green-100 hover:bg-green-200"
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

                    {/* 範本選單 */}
                    {templateMenuOpen === client.id && templates.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 z-50 w-full rounded-none border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleCopyLoginInfo(client, template.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                          >
                            {template.name}
                            {template.is_default && (
                              <span className="ml-2 text-xs text-gray-500">(預設)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link href={`/admin/clients/${client.id}/edit`}>
                    <Button size="sm" variant="secondary" className="w-full">
                      <Edit className="h-3 w-3 mr-1" />
                      編輯
                    </Button>
                  </Link>
                  <Link href={`/admin/clients/${client.id}/password`}>
                    <Button size="sm" variant="secondary" className="w-full">
                      <Key className="h-3 w-3 mr-1" />
                      改密碼
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDeleteClick(client)}
                    disabled={isDeleting}
                    className="col-span-2 border-2 border-black bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    刪除
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className={cn("text-gray-600", designTokens.typography.caption)}>
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
