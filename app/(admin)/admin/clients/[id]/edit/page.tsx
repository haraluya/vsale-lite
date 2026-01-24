import { getTiers } from '@/lib/actions/tiers'
import { getAdminClientProfile } from '@/lib/actions/clients'
import { ClientFormV2 } from '@/components/admin/client-form-v2'
import { notFound } from 'next/navigation'
import type { Client } from '@/types'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getAdminClientProfile(id)

  if (!result.success || !result.data) {
    return generatePageMetadata('編輯客戶', '修改客戶資訊')
  }

  const client = result.data
  const clientName = client.display_name || client.phone || '未知客戶'

  return generatePageMetadata(
    `編輯客戶：${clientName}`,
    `修改客戶 ${clientName} 的資訊`
  )
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [profileResult, tiersResult] = await Promise.all([
    getAdminClientProfile(id),
    getTiers(),
  ])

  if (!profileResult.success || !profileResult.data) {
    notFound()
  }

  // 處理 getTiers() 的 ActionResult (確保不為 undefined)
  const tiers = tiersResult.success && tiersResult.data ? tiersResult.data : []

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
