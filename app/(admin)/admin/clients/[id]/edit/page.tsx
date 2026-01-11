import { getTiers } from '@/lib/actions/tiers'
import { getAdminClientProfile } from '@/lib/actions/clients'
import { ClientFormV2 } from '@/components/admin/client-form-v2'
import { notFound } from 'next/navigation'
import type { Client } from '@/types'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [profileResult, tiers] = await Promise.all([
    getAdminClientProfile(id),
    getTiers(),
  ])

  if (!profileResult.success || !profileResult.data) {
    notFound()
  }

  const profile = profileResult.data

  // 查詢會員等級名稱
  const tier = tiers.find((t) => t.id === profile.tier_id)

  // 轉換為 Client 型別
  const client: Client = {
    id: profile.id,
    phone: profile.phone || '',
    display_name: profile.display_name,
    role: profile.role,
    tier_id: profile.tier_id,
    tier_name: tier?.name || null,
    notes: profile.notes,
    address: profile.address,
    admin_notes: profile.admin_notes,
    created_at: profile.created_at,
    updated_at: profile.created_at, // Profile 沒有 updated_at，使用 created_at
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
