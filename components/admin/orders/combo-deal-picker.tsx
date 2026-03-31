'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Gift } from 'lucide-react'
import { getActiveComboDealsByTierId } from '@/lib/actions/combo-deals'
import { formatDiscountLabel } from '@/lib/pricing/combo-deals'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'

interface ComboDealPickerProps {
  draft: AdminOrderDraftReturn
  tierId: string
}

type ComboDealItem = {
  id: string
  name: string
  poster_url: string | null
  combo_mode: 'each' | 'mix_match'
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  start_date: string
  end_date: string
  series_count: number
  mix_match_total_quantity?: number
}

export function ComboDealPicker({ draft, tierId }: ComboDealPickerProps) {
  const [deals, setDeals] = useState<ComboDealItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadDeals() {
      setLoading(true)
      const result = await getActiveComboDealsByTierId(tierId)
      if (result.success && result.data) {
        setDeals(result.data)
      }
      setLoading(false)
    }
    loadDeals()
  }, [tierId])

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-text-secondary">載入組合優惠中...</div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-text-secondary">
        <Gift className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
        此等級目前無可用的組合優惠
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {deals.map((deal) => (
        <div
          key={deal.id}
          className="flex items-center gap-3 p-3 rounded-theme-sm border-theme bg-surface hover:bg-surface-secondary transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{deal.name}</div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                {formatDiscountLabel(deal.discount_type, deal.discount_value)}
              </span>
              <span>
                {deal.combo_mode === 'each'
                  ? `${deal.series_count} 個系列各選`
                  : `任選 ${deal.mix_match_total_quantity ?? '?'} 件`}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled
            title="組合優惠選購功能即將推出"
          >
            即將推出
          </Button>
        </div>
      ))}

      {/* 已加入的組合優惠 */}
      {draft.comboDeals.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <div className="text-xs font-medium text-text-secondary">已加入的組合優惠</div>
          {draft.comboDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center justify-between p-2 rounded-theme-sm bg-green-50 border border-green-200"
            >
              <div className="text-sm">
                <span className="font-medium">{deal.combo_deal_name}</span>
                <span className="ml-2 text-green-700 text-xs">
                  ${Math.round(deal.discounted_price).toLocaleString()}
                </span>
              </div>
              <Button
                size="sm"
                variant="danger"
                className="h-6 px-2 text-xs"
                onClick={() => draft.removeComboDeal(deal.id)}
              >
                移除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
