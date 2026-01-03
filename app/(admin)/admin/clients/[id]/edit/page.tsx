import { getTiers } from '@/lib/actions/tiers'
import { getClients } from '@/lib/actions/clients'
import { ClientFormV2 } from '@/components/admin/client-form-v2'
import { notFound } from 'next/navigation'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ clients }, tiers] = await Promise.all([
    getClients(),
    getTiers(),
  ])

  const client = clients.find((c) => c.id === id)

  if (!client) {
    notFound()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">編輯客戶</h1>
        <p className="mt-2 text-sm text-gray-600">
          {client.phone} ({client.tier_name})
        </p>
      </div>

      <div className="card-neo bg-white">
        <ClientFormV2 client={client} tiers={tiers} />
      </div>
    </div>
  )
}
