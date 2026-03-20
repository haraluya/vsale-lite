import { getAdminClientProfile } from '@/lib/actions/clients'
import { UpdatePasswordForm } from '@/components/admin/update-password-form'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getAdminClientProfile(id)

  if (!result.success || !result.data) {
    return generatePageMetadata('修改客戶密碼', '重設客戶密碼')
  }

  const client = result.data
  const clientName = client.display_name || client.phone || '未知客戶'

  return generatePageMetadata(
    `修改密碼：${clientName}`,
    `重設客戶 ${clientName} 的密碼`
  )
}

export default async function UpdateClientPasswordPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const profileResult = await getAdminClientProfile(id)

  if (!profileResult.success || !profileResult.data) {
    notFound()
  }

  const client = profileResult.data

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回客戶列表
      </Link>

      <div>
        <h1 className="text-3xl font-bold">修改客戶密碼</h1>
        <p className="mt-2 text-text-secondary">
          客戶: {client.display_name || client.phone} ({client.phone})
        </p>
      </div>

      <div className="card-neo max-w-2xl p-8">
        <UpdatePasswordForm
          clientId={client.id}
          clientName={client.display_name || client.phone || '未知客戶'}
        />
      </div>
    </div>
  )
}
