'use client'

import { useState, useEffect } from 'react'
import { Gift, ChevronDown, Loader2 } from 'lucide-react'
import { getActiveComboDealsByTierId } from '@/lib/actions/combo-deals'
import { formatDiscountLabel } from '@/lib/pricing/combo-deals'
import { ComboDealSelector } from './combo-deal-selector'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'
import type { ComboDealCartItem } from '@/stores/cart'

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
  const [error, setError] = useState<string | null>(null)
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null)

  useEffect(() => {
    async function loadDeals() {
      setLoading(true)
      setError(null)
      const result = await getActiveComboDealsByTierId(tierId)
      if (result.success && result.data) {
        setDeals(result.data)
      } else {
        setError(result.message || '載入組合優惠失敗')
      }
      setLoading(false)
    }
    loadDeals()
  }, [tierId])

  const handleAddComboDeal = (item: ComboDealCartItem) => {
    draft.addComboDeal(item)
    setExpandedDealId(null)
  }

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-text-secondary">
        <Loader2 className="h-5 w-5 mx-auto mb-1.5 animate-spin" />
        載入組合優惠中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm">
        <p className="text-red-600 mb-2">{error}</p>
        <button
          className="text-xs text-primary underline hover:no-underline"
          onClick={() => {
            setError(null)
            setLoading(true)
            getActiveComboDealsByTierId(tierId).then(result => {
              if (result.success && result.data) {
                setDeals(result.data)
              } else {
                setError(result.message || '載入組合優惠失敗')
              }
              setLoading(false)
            })
          }}
        >
          重試
        </button>
      </div>
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
      {deals.map((deal) => {
        const isExpanded = expandedDealId === deal.id
        return (
          <div
            key={deal.id}
            className="rounded-theme-sm border-theme bg-surface overflow-hidden"
          >
            {/* 優惠卡片 */}
            <div className="flex items-center gap-3 p-3 hover:bg-surface-secondary transition-colors">
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
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium rounded-theme-sm border transition-colors ${
                  isExpanded
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-surface-secondary text-foreground border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => setExpandedDealId(isExpanded ? null : deal.id)}
              >
                {isExpanded ? (
                  '收合'
                ) : (
                  <span className="flex items-center gap-1">
                    選購
                    <ChevronDown className="h-3 w-3" />
                  </span>
                )}
              </button>
            </div>

            {/* 展開選購區 */}
            {isExpanded && (
              <ComboDealSelector
                dealId={deal.id}
                dealName={deal.name}
                comboMode={deal.combo_mode}
                discountType={deal.discount_type}
                discountValue={deal.discount_value}
                tierId={tierId}
                mixMatchTotalQuantity={deal.mix_match_total_quantity}
                onAdd={handleAddComboDeal}
                onClose={() => setExpandedDealId(null)}
              />
            )}
          </div>
        )
      })}

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
              <button
                type="button"
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                onClick={() => draft.removeComboDeal(deal.id)}
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
