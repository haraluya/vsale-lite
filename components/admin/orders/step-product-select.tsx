'use client'

import { RegularProductPicker } from './regular-product-picker'
import { ComboDealPicker } from './combo-deal-picker'
import { DraftItemsSummary } from './draft-items-summary'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'

interface StepProductSelectProps {
  draft: AdminOrderDraftReturn
  onNext: () => void
}

export function StepProductSelect({ draft, onNext }: StepProductSelectProps) {
  const tierId = draft.selectedCustomer?.tierId

  if (!tierId) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-20">
        {/* 普通商品 */}
        <section>
          <h3 className="text-sm font-semibold mb-2">商品選擇</h3>
          <RegularProductPicker draft={draft} tierId={tierId} />
        </section>

        {/* 組合優惠 */}
        <section>
          <h3 className="text-sm font-semibold mb-2">組合優惠</h3>
          <ComboDealPicker draft={draft} tierId={tierId} />
        </section>
      </div>

      {/* 底部摘要條 */}
      <DraftItemsSummary draft={draft} onNext={onNext} />
    </div>
  )
}
