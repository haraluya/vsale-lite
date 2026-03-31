'use client'

import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'

interface DraftItemsSummaryProps {
  draft: AdminOrderDraftReturn
  onNext: () => void
}

export function DraftItemsSummary({ draft, onNext }: DraftItemsSummaryProps) {
  if (!draft.hasItems) return null

  const regularTotal = draft.regularItems.reduce(
    (sum, item) => sum + item.tierPrice * item.quantity, 0
  )
  const comboTotal = draft.comboDeals.reduce(
    (sum, deal) => sum + deal.discounted_price, 0
  )
  const total = regularTotal + comboTotal

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-surface border-t px-4 py-3 flex items-center justify-between shadow-neo-sm">
      <div className="flex items-center gap-2 text-sm">
        <ShoppingCart className="h-4 w-4 text-blue-500" />
        <span>已選 <strong>{draft.totalItemCount}</strong> 件</span>
        <span className="text-text-secondary">·</span>
        <span className="font-semibold text-blue-600">${Math.round(total).toLocaleString()}</span>
      </div>
      <Button size="sm" onClick={onNext}>下一步</Button>
    </div>
  )
}
