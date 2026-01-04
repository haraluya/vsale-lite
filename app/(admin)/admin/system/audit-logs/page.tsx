import { getAuditLogs } from '@/lib/actions/audit'
import { AuditLogList } from '@/components/admin/AuditLogList'
import { AuditLogFilters } from '@/components/admin/AuditLogFilters'
import { checkAuth } from '@/lib/actions/helpers'
import { AuditActionType } from '@/types'

export const metadata = {
  title: '操作日誌 | Vsale-lite',
  description: '查看所有後台操作記錄',
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    action_type?: AuditActionType
    date_from?: string
    date_to?: string
    page?: string
  }>
}) {
  // 權限檢查
  await checkAuth('admin')

  const params = await searchParams

  // 查詢操作日誌
  const result = await getAuditLogs({
    action_type: params.action_type,
    date_from: params.date_from,
    date_to: params.date_to,
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  })

  if (!result.success || !result.data) {
    return (
      <div className="rounded-none border-3 border-red-500 bg-red-50 p-6 shadow-neo">
        <p className="text-sm font-bold text-red-800">
          {result.message || '載入操作日誌失敗'}
        </p>
      </div>
    )
  }

  const { logs, total } = result.data

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-black">操作日誌</h1>
        <p className="mt-2 text-sm text-gray-600">
          共 {total} 筆操作記錄
        </p>
      </div>

      {/* 篩選器 */}
      <AuditLogFilters currentFilters={params} />

      {/* 日誌列表 */}
      <AuditLogList logs={logs} />
    </div>
  )
}
