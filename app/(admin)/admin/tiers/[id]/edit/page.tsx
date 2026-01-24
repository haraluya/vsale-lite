import { createClient } from '@/lib/supabase/server'
import { TierForm } from '@/components/admin/tier-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Tier } from '@/types'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tier } = await supabase
    .from('tiers')
    .select('*')
    .eq('id', id)
    .single()

  if (!tier) {
    return generatePageMetadata('編輯會員等級', '修改會員等級資訊')
  }

  return generatePageMetadata(
    `編輯會員等級：${tier.name}`,
    `修改會員等級 ${tier.name} 的資訊`
  )
}

export default async function EditTierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tier, error } = await supabase
    .from('tiers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tier) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tiers"
        className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        返回會員等級列表
      </Link>

      <div>
        <h1 className="text-3xl font-bold">編輯會員等級</h1>
        <p className="mt-2 text-gray-600">修改「{tier.name}」等級資訊</p>
      </div>

      <div className="card-neo max-w-2xl">
        <TierForm mode="edit" tier={tier as Tier} />
      </div>
    </div>
  )
}
