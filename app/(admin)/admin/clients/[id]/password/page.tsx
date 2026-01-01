import { getClients } from '@/lib/actions/clients'
import { UpdatePasswordForm } from '@/components/admin/update-password-form'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function UpdateClientPasswordPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { clients } = await getClients()
  const client = clients.find((c) => c.id === id)

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回客戶列表
      </Link>

      <div>
        <h1 className="text-3xl font-bold">修改客戶密碼</h1>
        <p className="mt-2 text-gray-600">
          客戶: {client.display_name || client.phone} ({client.phone})
        </p>
      </div>

      <div className="card-neo max-w-2xl p-8">
        <UpdatePasswordForm
          clientId={client.id}
          clientName={client.display_name || client.phone}
        />
      </div>
    </div>
  )
}
