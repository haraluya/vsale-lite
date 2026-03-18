import { getTiers } from '@/lib/actions/tiers'
import { TierTable } from '@/components/admin/tier-table'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getThemeClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('會員等級管理', '管理客戶的會員等級分類')
}

export default async function TiersPage() {
  const tiersResult = await getTiers()
  const tiers = tiersResult.success && tiersResult.data ? tiersResult.data : []

  return (
    <div className={getPageContainerClasses('default')}>
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>會員等級管理</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-text-secondary")}>管理客戶的會員等級分類</p>
        </div>
        <Link
          href="/admin/tiers/new"
          className={cn(
            "inline-flex items-center gap-2 rounded-theme-sm bg-primary font-bold text-white transition-all",
            getThemeClasses({ hover: true }),
            designTokens.button.md
          )}
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
          新增等級
        </Link>
      </div>

      <TierTable tiers={tiers} />
    </div>
  )
}
