import { getClients } from '@/lib/actions/clients'
import { getTiers } from '@/lib/actions/tiers'
import { ClientTable } from '@/components/admin/client-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

type SearchParams = {
  search?: string
  tier_id?: string
  page?: string
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const search = params.search || ''
  const tier_id = params.tier_id || ''
  const page = Number(params.page) || 1

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
        <Link href="/admin/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            快速開戶
          </Button>
        </Link>
      </div>

      <ClientTable
        clients={clients}
        tiers={tiers}
        total={total}
        page={page}
        search={search}
        selectedTierId={tier_id}
      />
    </div>
  )
}
