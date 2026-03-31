'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { searchCustomersForOrder } from '@/lib/actions/clients'
import type { AdminOrderDraftReturn, SelectedCustomer } from '@/hooks/use-admin-order-draft'

interface StepCustomerSelectProps {
  draft: AdminOrderDraftReturn
}

export function StepCustomerSelect({ draft }: StepCustomerSelectProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{
    id: string; phone: string; display_name: string | null;
    tier_id: string | null; tier_name: string | null;
  }>>([])
  const [loading, setLoading] = useState(false)
  const [noTierCustomerId, setNoTierCustomerId] = useState<string | null>(null)
  const confirm = useConfirm()

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (trimmed: string) => {
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await searchCustomersForOrder(trimmed)
      if (result.success && result.data) {
        setResults(result.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    searchTimerRef.current = setTimeout(() => doSearch(trimmed), 500)
  }, [doSearch])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const handleSelect = useCallback(async (customer: typeof results[number]) => {
    if (draft.selectedCustomer && draft.hasItems && draft.selectedCustomer.id !== customer.id) {
      const confirmed = await confirm({
        title: '切換客戶？',
        description: '切換客戶後，已選擇的商品和優惠券將會清除。',
        confirmText: '確認切換',
        cancelText: '取消',
      })
      if (!confirmed) return
      draft.resetItemsAndCoupon()
    }
    if (!customer.tier_id) {
      setNoTierCustomerId(customer.id)
      return
    }
    setNoTierCustomerId(null)

    const selected: SelectedCustomer = {
      id: customer.id,
      phone: customer.phone,
      displayName: customer.display_name,
      tierId: customer.tier_id,
      tierName: customer.tier_name,
    }
    draft.setSelectedCustomer(selected)
    draft.setCurrentStep(2)
  }, [draft, confirm])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="輸入手機號碼或名稱搜尋（至少 2 字元）..."
          className="w-full pl-10 pr-4 py-3 border rounded-theme-sm bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {loading && <div className="text-center text-text-secondary py-8">搜尋中...</div>}

      {!loading && results.length > 0 && (
        <div className="border rounded-theme-sm overflow-hidden divide-y">
          {results.map((customer) => (
            <div key={customer.id}>
              <button
                onClick={() => handleSelect(customer)}
                className={cn(
                  'w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left',
                  draft.selectedCustomer?.id === customer.id && 'bg-blue-50'
                )}
              >
                <div>
                  <div className="font-medium">{customer.display_name || customer.phone}</div>
                  <div className="text-sm text-text-secondary">{customer.phone}</div>
                </div>
                {customer.tier_name ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{customer.tier_name}</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">未設定等級</span>
                )}
              </button>
              {noTierCustomerId === customer.id && (
                <div className="px-4 py-2 text-xs text-red-500 bg-red-50 border-t">
                  此客戶未設定等級，無法代客下單
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-center text-text-secondary py-8">找不到符合的客戶</div>
      )}

      {draft.selectedCustomer && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-theme-sm text-sm text-green-700">
          已選擇：{draft.selectedCustomer.displayName || draft.selectedCustomer.phone}
          （{draft.selectedCustomer.tierName}）
        </div>
      )}
    </div>
  )
}
