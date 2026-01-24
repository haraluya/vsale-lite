import { getTiers } from '@/lib/actions/tiers'
import { ClientForm } from '@/components/admin/client-form'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('快速開戶', '建立新客戶帳號')
}

export default async function NewClientPage() {
  const tiersResult = await getTiers()
  const tiers = tiersResult.success && tiersResult.data ? tiersResult.data : []

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">快速開戶</h1>
        <p className="mt-2 text-sm text-gray-600">
          建立新客戶帳號,系統會自動產生預設密碼
        </p>
      </div>

      <div className="card-neo bg-white">
        <ClientForm tiers={tiers} mode="create" />
      </div>
    </div>
  )
}
