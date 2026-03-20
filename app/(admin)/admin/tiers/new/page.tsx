import { TierForm } from '@/components/admin/tier-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('新增會員等級', '建立新的會員等級分類')
}

export default function NewTierPage() {
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
        <h1 className="text-3xl font-bold">新增會員等級</h1>
        <p className="mt-2 text-text-secondary">建立新的會員等級分類</p>
      </div>

      <div className="card-neo max-w-2xl">
        <TierForm mode="create" />
      </div>
    </div>
  )
}
