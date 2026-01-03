import { getClients } from '@/lib/actions/clients'
import { getTiers } from '@/lib/actions/tiers'
import { ClientTable } from '@/components/admin/client-table'
import { ClientFilterWrapper } from '@/components/admin/client-filter-wrapper'
import { ExcelExport } from '@/components/admin/excel-export'
import { ExcelImport } from '@/components/admin/excel-import'
import { ExcelTemplateDownload } from '@/components/admin/excel-template-download'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

type SearchParams = {
  search?: string
  tier_ids?: string  // 改為支援多選 (逗號分隔)
  page?: string
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const search = params.search || ''
  const tier_idsStr = params.tier_ids || ''
  const tier_ids = tier_idsStr ? tier_idsStr.split(',') : []
  const page = Number(params.page) || 1

  // 如果有多選等級,使用第一個等級進行查詢 (向後兼容)
  const tier_id = tier_ids[0] || ''

  const [{ clients, total }, tiers] = await Promise.all([
    getClients({ search, tier_id, page, limit: 20 }),
    getTiers(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">客戶管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            共 {total} 位客戶
          </p>
        </div>
        <div className="flex gap-3">
          {/* Feature 006 - US7: Excel 功能按鈕 */}
          <ExcelTemplateDownload />
          <ExcelExport
            filters={{
              tier_id: tier_id || undefined,
              search: search || undefined,
            }}
          />
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              快速開戶
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature 006 - US7: Excel 匯入區塊 */}
      <ExcelImport
        onImportComplete={() => {
          // 匯入完成後重新載入頁面
          window.location.reload()
        }}
      />

      {/* Feature 006 - US6: 客戶篩選元件 */}
      <ClientFilterWrapper
        tiers={tiers}
        initialSearch={search}
        initialTierIds={tier_ids}
        totalCount={total}
      />

      <ClientTable
        clients={clients}
        total={total}
        page={page}
        searchKeyword={search}
      />
    </div>
  )
}
