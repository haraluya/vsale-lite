import { getAuditLogs } from '@/lib/actions/audit'
import { AuditLogList } from '@/components/admin/AuditLogList'
import { AuditLogFilters } from '@/components/admin/AuditLogFilters'
import { checkAuth } from '@/lib/actions/helpers'

import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('操作日誌', '查看所有後台操作記錄')
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    action_type?: string | string[] // 接收可能的陣列
    date_from?: string
    date_to?: string
    page?: string
  }>
}) {
  // 權限檢查
  await checkAuth('admin')

  const params = await searchParams

  // 處理可能的陣列值（取第一個元素）
  const action_type = Array.isArray(params.action_type) ? params.action_type[0] : params.action_type

  // 查詢操作日誌
  const result = await getAuditLogs({
    action_type, // 傳遞清理後的值
    date_from: params.date_from,
    date_to: params.date_to,
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  })

  if (!result.success || !result.data) {
    return (
      <div className="rounded-theme-sm border-theme border-red-500 bg-error-bg p-6 shadow-neo">
        <p className="text-sm font-bold text-foreground">
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
        <p className="mt-2 text-sm text-text-secondary">
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
