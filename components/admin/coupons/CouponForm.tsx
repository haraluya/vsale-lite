/**
 * CouponForm Component
 * Feature: 009-coupon-system (US2)
 *
 * 優惠券表單元件 (管理員用)
 * - 建立/編輯優惠券資訊
 * - 選擇折扣方式 (固定金額/百分比)
 * - 設定等級限制
 * - 設定系列限制
 * - 設定生效時間
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createCoupon, updateCoupon } from '@/lib/actions/coupons'
import { getTiers } from '@/lib/actions/tiers'
import { getSeries } from '@/lib/actions/series'
import type { Coupon } from '@/specs/009-coupon-system/contracts/coupons'
import type { Tier, Series } from '@/types'
import { Button } from '@/components/ui/button'
import { AlertCircle, X } from 'lucide-react'

interface CouponFormProps {
  coupon?: Coupon
  mode: 'create' | 'edit'
}

export function CouponForm({ coupon, mode }: CouponFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // 表單狀態
  const [code, setCode] = useState(coupon?.code_normalized || '')
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(
    coupon?.discount_type || 'fixed'
  )
  const [discountValue, setDiscountValue] = useState<number>(
    coupon?.discount_value || 0
  )
  const [minOrderAmount, setMinOrderAmount] = useState<number | null>(
    coupon?.min_order_amount || null
  )
  const [validFrom, setValidFrom] = useState(
    coupon?.valid_from
      ? new Date(coupon.valid_from).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [validUntil, setValidUntil] = useState(
    coupon?.valid_until
      ? new Date(coupon.valid_until).toISOString().slice(0, 16)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  )
  const [status, setStatus] = useState<'active' | 'inactive'>(
    coupon?.status === 'inactive' ? 'inactive' : 'active'
  )
  const [selectedTiers, setSelectedTiers] = useState<string[]>(
    coupon?.tier_restrictions || []
  )
  const [selectedSeries, setSelectedSeries] = useState<string[]>(
    coupon?.series_restrictions || []
  )
  const [claimLimit, setClaimLimit] = useState<number>(
    coupon?.claim_limit || 1
  )
  const [totalLimit, setTotalLimit] = useState<number | null>(
    coupon?.total_limit !== undefined ? coupon.total_limit : null
  )

  // 載入等級與系列資料
  useEffect(() => {
    async function loadData() {
      try {
        const [tiersData, seriesResult] = await Promise.all([
          getTiers(),
          getSeries(),
        ])

        setTiers(tiersData)
        if (seriesResult.success && seriesResult.data) {
          setSeries(seriesResult.data)
        }
      } catch (err) {
        console.error('載入資料失敗:', err)
        setError('載入等級或系列資料失敗')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  const handleCodeChange = (value: string) => {
    // 自動轉大寫
    setCode(value.toUpperCase())
  }

  const handleTierToggle = (tierId: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId]
    )
  }

  const handleSeriesToggle = (seriesId: string) => {
    setSelectedSeries((prev) =>
      prev.includes(seriesId)
        ? prev.filter((id) => id !== seriesId)
        : [...prev, seriesId]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        code: code.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: minOrderAmount ? Number(minOrderAmount) : null,
        valid_from: new Date(validFrom).toISOString(),
        valid_until: new Date(validUntil).toISOString(),
        claim_limit: Number(claimLimit),
        total_limit: totalLimit ? Number(totalLimit) : null,
        tier_restrictions: selectedTiers,
        series_restrictions: selectedSeries,
      }

      let result
      if (mode === 'create') {
        result = await createCoupon(data)
      } else {
        if (!coupon) throw new Error('優惠券資料不存在')
        result = await updateCoupon(coupon.id, {
          ...data,
          status,
        })
      }

      if (!result.success) {
        throw new Error(result.message || '操作失敗')
      }

      router.push('/admin/coupons')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '操作失敗')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 錯誤訊息 */}
      {error && (
        <div className="border-2 border-red-500 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* 基本資訊 */}
      <div className="border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="mb-4 text-xl font-black">基本資訊</h2>

        {/* 優惠券代碼 */}
        <div className="mb-4">
          <label htmlFor="code" className="mb-2 block font-bold">
            優惠券代碼 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="例如: WELCOME100"
            className="w-full border-2 border-black p-3 font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
            required
            minLength={4}
            maxLength={20}
            pattern="[A-Z0-9]+"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-600">
            4-20 字元,僅允許英數字,自動轉大寫
          </p>
          {code && (
            <p className="mt-2 text-sm font-bold text-green-600">
              ✓ 預覽: {code}
            </p>
          )}
        </div>

        {/* 折扣方式 */}
        <div className="mb-4">
          <label className="mb-2 block font-bold">
            折扣方式 <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="fixed"
                checked={discountType === 'fixed'}
                onChange={(e) => setDiscountType(e.target.value as 'fixed')}
                className="h-4 w-4"
                disabled={loading}
              />
              <span className="font-bold">現金折扣 (固定金額)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="percentage"
                checked={discountType === 'percentage'}
                onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                className="h-4 w-4"
                disabled={loading}
              />
              <span className="font-bold">百分比折扣</span>
            </label>
          </div>
        </div>

        {/* 折扣值 */}
        <div className="mb-4">
          <label htmlFor="discount_value" className="mb-2 block font-bold">
            折扣值 <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-2">
            {discountType === 'fixed' && (
              <span className="text-2xl font-black">$</span>
            )}
            <input
              type="number"
              id="discount_value"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              placeholder={discountType === 'fixed' ? '100' : '20'}
              className="flex-1 border-2 border-black p-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
              required
              min={discountType === 'fixed' ? 1 : 1}
              max={discountType === 'percentage' ? 100 : undefined}
              step={discountType === 'fixed' ? 1 : 1}
              disabled={loading}
            />
            {discountType === 'percentage' && (
              <span className="text-2xl font-black">%</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {discountType === 'fixed'
              ? '固定折扣金額（例如: 100 表示折扣 $100）'
              : '百分比折扣（例如: 20 表示打 8 折）'}
          </p>
        </div>

        {/* 最低訂單金額 */}
        <div className="mb-4">
          <label htmlFor="min_order_amount" className="mb-2 block font-bold">
            最低訂單金額（選填）
          </label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black">$</span>
            <input
              type="number"
              id="min_order_amount"
              value={minOrderAmount || ''}
              onChange={(e) =>
                setMinOrderAmount(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="500"
              className="flex-1 border-2 border-black p-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
              min={0}
              step={1}
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            不填寫表示無最低金額限制
          </p>
        </div>

        {/* 領取張數限制 */}
        <div className="mb-4">
          <label htmlFor="claim_limit" className="mb-2 block font-bold">
            每位客戶可領取張數 <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            id="claim_limit"
            value={claimLimit || ''}
            onChange={(e) => setClaimLimit(Number(e.target.value))}
            placeholder="1"
            className="w-full border-2 border-black p-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
            required
            min={1}
            max={99}
            step={1}
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-600">
            設定客戶可領取此優惠券的張數上限（預設 1 張，輸入一次代碼即可領取所有張數）
          </p>
        </div>

        {/* 總張數上限 */}
        <div className="mb-4">
          <label htmlFor="total_limit" className="mb-2 block font-bold">
            總張數上限
          </label>
          <input
            type="number"
            id="total_limit"
            value={totalLimit || ''}
            onChange={(e) => setTotalLimit(e.target.value ? Number(e.target.value) : null)}
            placeholder="不填寫 = 無限發放"
            className="w-full border-2 border-black p-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
            min={1}
            step={1}
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-600">
            限制所有客戶合計可領取的總張數（不填寫表示無限發放）
          </p>
        </div>
      </div>

      {/* 生效時間 */}
      <div className="border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="mb-4 text-xl font-black">生效時間</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="valid_from" className="mb-2 block font-bold">
              開始時間 <span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              id="valid_from"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-600">
              預設為現在時間
            </p>
          </div>

          <div>
            <label htmlFor="valid_until" className="mb-2 block font-bold">
              結束時間 <span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              id="valid_until"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-600">
              預設為 30 天後（建議設定較長期限避免過期）
            </p>
          </div>
        </div>

        {/* 日期範圍提示 */}
        <div className="mt-4 rounded border-2 border-orange-400 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800">
            ⚠️ 重要提示：優惠券過期後將無法領取！
          </p>
          <p className="mt-1 text-sm text-orange-700">
            • 請確保「結束時間」設定在未來，建議至少 30-90 天
          </p>
          <p className="text-sm text-orange-700">
            • 優惠券過期後，客戶將無法輸入口令領取
          </p>
        </div>
      </div>

      {/* 等級限制 */}
      <div className="border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="mb-4 text-xl font-black">等級限制（選填）</h2>
        <p className="mb-4 text-sm text-gray-600">
          不選擇任何等級表示所有等級均可使用此優惠券
        </p>

        {tiers.length === 0 ? (
          <p className="text-gray-500">無可用等級</p>
        ) : (
          <div className="space-y-2">
            {tiers.map((tier) => (
              <label
                key={tier.id}
                className="flex items-center gap-3 cursor-pointer rounded border-2 border-gray-300 p-3 hover:border-black"
              >
                <input
                  type="checkbox"
                  checked={selectedTiers.includes(tier.id)}
                  onChange={() => handleTierToggle(tier.id)}
                  className="h-5 w-5"
                  disabled={loading}
                />
                <span className="font-bold">{tier.name}</span>
              </label>
            ))}
          </div>
        )}

        {selectedTiers.length > 0 && (
          <div className="mt-4 border-t-2 border-gray-300 pt-4">
            <p className="font-bold text-green-600">
              ✓ 已選擇 {selectedTiers.length} 個等級限制
            </p>
          </div>
        )}
      </div>

      {/* 系列限制 */}
      <div className="border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="mb-4 text-xl font-black">系列限制（選填）</h2>
        <p className="mb-4 text-sm text-gray-600">
          不選擇任何系列表示所有系列商品均可計入優惠券條件
        </p>

        {series.length === 0 ? (
          <p className="text-gray-500">無可用系列</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {series
              .filter((s) => s.status === 'active')
              .map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 cursor-pointer rounded border-2 border-gray-300 p-3 hover:border-black"
                >
                  <input
                    type="checkbox"
                    checked={selectedSeries.includes(s.id)}
                    onChange={() => handleSeriesToggle(s.id)}
                    className="h-5 w-5"
                    disabled={loading}
                  />
                  <span className="font-bold">{s.name}</span>
                </label>
              ))}
          </div>
        )}

        {selectedSeries.length > 0 && (
          <div className="mt-4 border-t-2 border-gray-300 pt-4">
            <p className="font-bold text-green-600">
              ✓ 已選擇 {selectedSeries.length} 個系列限制
            </p>
          </div>
        )}
      </div>

      {/* 狀態設定（僅編輯模式） */}
      {mode === 'edit' && (
        <div className="border-3 border-black bg-white p-6 shadow-neo">
          <h2 className="mb-4 text-xl font-black">狀態設定</h2>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="active"
                checked={status === 'active'}
                onChange={(e) => setStatus(e.target.value as 'active')}
                className="h-4 w-4"
                disabled={loading}
              />
              <span className="font-bold">啟用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="inactive"
                checked={status === 'inactive'}
                onChange={(e) => setStatus(e.target.value as 'inactive')}
                className="h-4 w-4"
                disabled={loading}
              />
              <span className="font-bold">停用</span>
            </label>
          </div>
        </div>
      )}

      {/* 提交按鈕 */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={loading}
          className="border-3 border-black bg-green-400 px-8 py-4 font-black text-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50"
        >
          {loading ? '處理中...' : mode === 'create' ? '建立優惠券' : '更新優惠券'}
        </Button>

        <Button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="border-3 border-black bg-white px-8 py-4 font-black text-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          取消
        </Button>
      </div>
    </form>
  )
}
