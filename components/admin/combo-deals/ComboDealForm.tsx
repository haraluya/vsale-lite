'use client'

/**
 * 組合優惠表單元件
 * Feature: 021-combo-deals (T029, T031-T033)
 *
 * 管理員建立/編輯組合優惠的表單
 * - 基本資訊（名稱、海報、折扣設定、活動期間）
 * - 組合模式（各選/任選）
 * - 系列選擇與順位調整
 * - 等級限制
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createComboDeal, updateComboDeal } from '@/lib/actions/combo-deals'
import { PosterUpload } from './PosterUpload'
import { SeriesSelector } from './SeriesSelector'
import type { ComboDealWithDetails, Series, Tier, Category, ComboMode, DiscountType, ComboDealFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { FormSection } from '@/components/ui/form-section'
import { useAlert } from '@/lib/contexts/dialog-context'
import { designTokens } from '@/lib/design-tokens'

interface ComboDealFormProps {
  comboDeal?: ComboDealWithDetails
  series: Series[]
  tiers: Tier[]
  categories: Category[]
  mode: 'create' | 'edit'
}

interface SelectedSeries {
  series_id: string
  required_quantity?: number
  display_order: number
}

export function ComboDealForm({ comboDeal, series, tiers, categories, mode }: ComboDealFormProps) {
  const router = useRouter()
  const alert = useAlert()

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Basic fields
  const [name, setName] = useState(comboDeal?.name || '')
  const [posterUrl, setPosterUrl] = useState(comboDeal?.poster_url || '')
  const [comboMode, setComboMode] = useState<ComboMode>(comboDeal?.combo_mode || 'each')
  const [discountType, setDiscountType] = useState<DiscountType>(comboDeal?.discount_type || 'fixed')
  const [discountValue, setDiscountValue] = useState(comboDeal?.discount_value?.toString() || '')
  const [startDate, setStartDate] = useState(
    comboDeal?.start_date ? new Date(comboDeal.start_date).toISOString().slice(0, 10) : ''
  )
  const [endDate, setEndDate] = useState(
    comboDeal?.end_date ? new Date(comboDeal.end_date).toISOString().slice(0, 10) : ''
  )

  // Series selection
  const [selectedSeries, setSelectedSeries] = useState<SelectedSeries[]>(
    comboDeal?.series.map((s, index) => ({
      series_id: s.series_id,
      required_quantity: s.required_quantity || undefined,
      display_order: s.display_order || index,
    })) || []
  )

  // Mix match config
  const [mixMatchTotalQuantity, setMixMatchTotalQuantity] = useState(
    comboDeal?.mix_match_total_quantity?.toString() || ''
  )

  // Tier selection
  const [selectedTierIds, setSelectedTierIds] = useState<string[]>(
    comboDeal?.tiers.map((t) => t.tier_id) || []
  )


  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      // Validate poster URL
      if (!posterUrl) {
        setError('請上傳海報圖片')
        setLoading(false)
        return
      }

      // Validate series selection
      if (selectedSeries.length === 0) {
        setError('請至少選擇一個系列')
        setLoading(false)
        return
      }

      // Validate tier selection
      if (selectedTierIds.length === 0) {
        setError('請至少選擇一個等級')
        setLoading(false)
        return
      }

      // Build form data
      const formData: ComboDealFormData = {
        name,
        poster_url: posterUrl,
        combo_mode: comboMode,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        series: selectedSeries.map((s) => ({
          series_id: s.series_id,
          required_quantity: comboMode === 'each' ? s.required_quantity : undefined,
          display_order: s.display_order,
        })),
        tier_ids: selectedTierIds,
        mix_match_total_quantity:
          comboMode === 'mix_match' && mixMatchTotalQuantity
            ? parseInt(mixMatchTotalQuantity)
            : undefined,
      }

      // Call server action
      let result
      if (mode === 'create') {
        result = await createComboDeal(formData)
      } else {
        if (!comboDeal) {
          setError('組合優惠資料不存在')
          return
        }
        result = await updateComboDeal(comboDeal.id, formData)
      }

      if (!result.success) {
        if (result.errors) {
          setFieldErrors(result.errors)
        }
        setError(result.message || '操作失敗')
        return
      }

      // Show success message
      await alert({
        title: mode === 'create' ? '建立成功' : '更新成功',
        message: '組合優惠已儲存',
        variant: 'success',
      })

      // Redirect to list page
      router.push('/admin/combo-deals')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <FormSection variant="danger">
          <p className="font-bold text-red-800">{error}</p>
        </FormSection>
      )}

      {/* 基本資訊 */}
      <FormSection variant="primary" title="基本資訊">
        <div className="space-y-4">
          {/* 優惠名稱 */}
          <div>
            <label htmlFor="name" className={`${designTokens.typography.label} mb-2 block`}>
              優惠名稱 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={designTokens.input.base}
              placeholder="例：夏季搭配組"
              required
              maxLength={100}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* 海報上傳 */}
          <div>
            <PosterUpload
              currentUrl={posterUrl}
              onUploadComplete={(url) => setPosterUrl(url)}
              disabled={loading}
            />
            {fieldErrors.poster_url && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.poster_url[0]}</p>
            )}
          </div>
        </div>
      </FormSection>

      {/* 組合模式 */}
      <FormSection variant="default" title="組合模式">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 各選模式 */}
            <label
              className={`p-4 border-2 md:border-3 border-black rounded-none cursor-pointer transition ${
                comboMode === 'each'
                  ? 'bg-purple-100 shadow-neo'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="combo_mode"
                value="each"
                checked={comboMode === 'each'}
                onChange={() => setComboMode('each')}
                className="mr-2"
              />
              <span className="font-bold">各選模式</span>
              <p className="text-sm text-gray-600 mt-1">
                每個系列需選擇指定數量的商品（例：上衣 1 件 + 褲子 1 件）
              </p>
            </label>

            {/* 任選模式 */}
            <label
              className={`p-4 border-2 md:border-3 border-black rounded-none cursor-pointer transition ${
                comboMode === 'mix_match'
                  ? 'bg-purple-100 shadow-neo'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="combo_mode"
                value="mix_match"
                checked={comboMode === 'mix_match'}
                onChange={() => setComboMode('mix_match')}
                className="mr-2"
              />
              <span className="font-bold">任選模式</span>
              <p className="text-sm text-gray-600 mt-1">
                從所有系列中任選指定總數量的商品（例：任選 3 件）
              </p>
            </label>
          </div>

          {/* T032: 任選模式 UI - 全域數量輸入 */}
          {comboMode === 'mix_match' && (
            <div>
              <label htmlFor="mix_match_total_quantity" className={`${designTokens.typography.label} mb-2 block`}>
                任選總數量 <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="mix_match_total_quantity"
                value={mixMatchTotalQuantity}
                onChange={(e) => setMixMatchTotalQuantity(e.target.value)}
                className={designTokens.input.base}
                placeholder="例：3"
                required={comboMode === 'mix_match'}
                min="1"
              />
              {fieldErrors.mix_match_total_quantity && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.mix_match_total_quantity[0]}</p>
              )}
            </div>
          )}
        </div>
      </FormSection>

      {/* T030: 系列選擇器 */}
      <FormSection variant="info" title="選擇系列">
        <SeriesSelector
          availableSeries={series}
          categories={categories}
          selectedSeries={selectedSeries}
          onChange={setSelectedSeries}
          comboMode={comboMode}
          disabled={loading}
        />
        {fieldErrors.series && (
          <p className="mt-2 text-sm text-red-600">{fieldErrors.series[0]}</p>
        )}
      </FormSection>

      {/* 折扣設定 */}
      <FormSection variant="success" title="折扣設定">
        <div className="space-y-4">
          {/* 折扣方式 */}
          <div>
            <label className={`${designTokens.typography.label} mb-2 block`}>
              折扣方式 <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`p-3 border-2 border-black rounded-none cursor-pointer ${
                  discountType === 'fixed' ? 'bg-green-100' : 'bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="discount_type"
                  value="fixed"
                  checked={discountType === 'fixed'}
                  onChange={() => setDiscountType('fixed')}
                  className="mr-2"
                />
                <span className="font-bold">固定折價</span>
              </label>

              <label
                className={`p-3 border-2 border-black rounded-none cursor-pointer ${
                  discountType === 'percentage' ? 'bg-green-100' : 'bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="discount_type"
                  value="percentage"
                  checked={discountType === 'percentage'}
                  onChange={() => setDiscountType('percentage')}
                  className="mr-2"
                />
                <span className="font-bold">百分比折扣</span>
              </label>
            </div>
          </div>

          {/* 折扣值 */}
          <div>
            <label htmlFor="discount_value" className={`${designTokens.typography.label} mb-2 block`}>
              折扣值 <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="discount_value"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className={`${designTokens.input.base} flex-1`}
                placeholder={discountType === 'fixed' ? '例：200' : '例：85（85 折）'}
                required
                min="0.01"
                step="0.01"
              />
              <span className="font-bold">{discountType === 'fixed' ? '元' : '%'}</span>
            </div>
            {discountType === 'percentage' && (
              <p className="mt-1 text-sm text-gray-600">請輸入 1-99 之間的數字</p>
            )}
            {fieldErrors.discount_value && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.discount_value[0]}</p>
            )}
          </div>
        </div>
      </FormSection>

      {/* 活動期間 */}
      <FormSection variant="warning" title="活動期間">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 開始日期 */}
          <div>
            <label htmlFor="start_date" className={`${designTokens.typography.label} mb-2 block`}>
              開始日期 <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              id="start_date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={designTokens.input.base}
              required
            />
            {fieldErrors.start_date && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.start_date[0]}</p>
            )}
          </div>

          {/* 結束日期 */}
          <div>
            <label htmlFor="end_date" className={`${designTokens.typography.label} mb-2 block`}>
              結束日期 <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              id="end_date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={designTokens.input.base}
              required
            />
            {fieldErrors.end_date && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.end_date[0]}</p>
            )}
          </div>
        </div>
      </FormSection>

      {/* T033: 等級選擇器 */}
      <FormSection variant="info" title="顯示等級">
        <div>
          <p className={`${designTokens.typography.label} mb-3`}>
            選擇可看到此組合優惠的會員等級 <span className="text-red-600">*</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tiers.map((tier) => (
              <label
                key={tier.id}
                className={`p-3 border-2 border-black rounded-none cursor-pointer transition ${
                  selectedTierIds.includes(tier.id)
                    ? 'bg-blue-100 shadow-neo-sm'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTierIds.includes(tier.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTierIds([...selectedTierIds, tier.id])
                    } else {
                      setSelectedTierIds(selectedTierIds.filter((id) => id !== tier.id))
                    }
                  }}
                  className="mr-2"
                />
                <span className="font-bold">{tier.name}</span>
              </label>
            ))}
          </div>
          {fieldErrors.tier_ids && (
            <p className="mt-2 text-sm text-red-600">{fieldErrors.tier_ids[0]}</p>
          )}
        </div>
      </FormSection>

      {/* 操作按鈕 */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '儲存中...' : mode === 'create' ? '建立組合優惠' : '更新組合優惠'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/combo-deals')}
          disabled={loading}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
