/**
 * QuotationGenerator Component
 * Feature: 價格管理優化 - 報價產生器
 *
 * 報價產生器
 * - 選擇等級下拉選單
 * - 系列多選（依分類分組）
 * - 文字框 + 報價/複製按鈕
 */

'use client'

import { useState, useEffect } from 'react'
import { Copy, FileText } from 'lucide-react'
import { getSeriesForQuotation, getQuotationData } from '@/lib/actions/quotation'
import { useAlert } from '@/lib/contexts/dialog-context'

interface Tier {
  id: string
  name: string
}

interface Series {
  id: string
  name: string
  code: string
  category_id: string
  categories: {
    id: string
    name: string
    sort_order: number
  }
}

interface QuotationGeneratorProps {
  tiers: Tier[]
}

export function QuotationGenerator({ tiers }: QuotationGeneratorProps) {
  const alert = useAlert()
  const [selectedTierId, setSelectedTierId] = useState<string>('')
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<Set<string>>(new Set())
  const [quotationText, setQuotationText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [quotationData, setQuotationData] = useState<any[]>([])

  // 載入系列列表
  useEffect(() => {
    const loadSeries = async () => {
      const result = await getSeriesForQuotation()
      if (result.success && result.data) {
        setSeriesList(result.data)
      }
    }
    loadSeries()
  }, [])

  // 系列選擇變更時載入商品資料
  useEffect(() => {
    if (selectedTierId && selectedSeriesIds.size > 0) {
      loadQuotationData()
    } else {
      setQuotationData([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTierId, selectedSeriesIds])

  const loadQuotationData = async () => {
    if (!selectedTierId || selectedSeriesIds.size === 0) return

    setIsLoading(true)
    const result = await getQuotationData(selectedTierId, Array.from(selectedSeriesIds))

    if (result.success && result.data) {
      setQuotationData(result.data)
    } else {
      await alert({
        title: '查詢失敗',
        message: result.message || '無法載入商品資料',
        variant: 'error',
      })
    }
    setIsLoading(false)
  }

  const handleSeriesToggle = (seriesId: string) => {
    const newSet = new Set(selectedSeriesIds)
    if (newSet.has(seriesId)) {
      newSet.delete(seriesId)
    } else {
      newSet.add(seriesId)
    }
    setSelectedSeriesIds(newSet)
  }

  const handleGenerateQuotation = () => {
    if (!selectedTierId || quotationData.length === 0) {
      return
    }

    const tierName = tiers.find((t) => t.id === selectedTierId)?.name || '未知等級'
    let totalProducts = 0

    let text = '【 報價單 】\n'
    text += `等級: ${tierName}\n\n`

    quotationData.forEach((series) => {
      text += `=== ${series.series_name} ===\n`
      series.products.forEach((product: any) => {
        const priceText = product.price ? `$${Math.round(product.price)}` : '價格未設定'
        text += `${product.name} - ${priceText}\n`
        totalProducts++
      })
      text += '\n'
    })

    text += `---\n總計: ${totalProducts} 項商品`

    setQuotationText(text)
  }

  const handleGenerateQuotationWithRetail = () => {
    if (!selectedTierId || quotationData.length === 0) {
      return
    }

    const tierName = tiers.find((t) => t.id === selectedTierId)?.name || '未知等級'
    let totalProducts = 0

    let text = '【 報價單(含售價) 】\n'
    text += `等級: ${tierName}\n\n`

    quotationData.forEach((series) => {
      text += `=== ${series.series_name} ===\n`
      series.products.forEach((product: any) => {
        const tierPrice = product.tier_price
          ? `$${Math.round(product.tier_price)}`
          : product.price
            ? `$${Math.round(product.price)}`
            : '價格未設定'
        const retailPrice = product.retail_price ? `$${Math.round(product.retail_price)}` : 'N/A'
        text += `${product.name} - ${tierPrice}/${retailPrice}\n`
        totalProducts++
      })
      text += '\n'
    })

    text += `---\n總計: ${totalProducts} 項商品`

    setQuotationText(text)
  }

  const handleCopyToClipboard = async () => {
    if (!quotationText) return

    try {
      await navigator.clipboard.writeText(quotationText)
      await alert({
        title: '複製成功',
        message: '報價單已複製到剪貼簿',
        variant: 'success',
      })
    } catch (err) {
      await alert({
        title: '複製失敗',
        message: '無法複製到剪貼簿',
        variant: 'error',
      })
    }
  }

  // 依分類分組系列
  const groupedSeries = seriesList.reduce(
    (acc, series) => {
      const categoryName = series.categories?.name || '未分類'
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(series)
      return acc
    },
    {} as Record<string, Series[]>
  )

  // 依分類排序
  const sortedCategories = Object.keys(groupedSeries).sort((a, b) => {
    const categoryA = seriesList.find((s) => s.categories?.name === a)?.categories
    const categoryB = seriesList.find((s) => s.categories?.name === b)?.categories
    return (categoryA?.sort_order || 999) - (categoryB?.sort_order || 999)
  })

  return (
    <div className="space-y-6">
      {/* 等級選擇 */}
      <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
        <label className="mb-3 block font-bold">選擇等級</label>
        <select
          value={selectedTierId}
          onChange={(e) => setSelectedTierId(e.target.value)}
          className="w-full rounded-theme-sm border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">請選擇等級...</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
      </div>

      {/* 系列多選（依分類分組） */}
      <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
        <label className="mb-3 block font-bold">選擇系列 (可複選)</label>
        <div className="space-y-4">
          {sortedCategories.map((categoryName) => (
            <div key={categoryName}>
              <h3 className="mb-2 font-bold text-sm text-purple-700">{categoryName}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {groupedSeries[categoryName].map((series) => (
                  <label
                    key={series.id}
                    className={`flex items-center gap-2 rounded-theme-sm border p-3 cursor-pointer transition-all ${
                      selectedSeriesIds.has(series.id)
                        ? 'bg-purple-400 shadow-neo-sm'
                        : 'bg-surface hover:bg-surface-secondary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeriesIds.has(series.id)}
                      onChange={() => handleSeriesToggle(series.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium text-sm">
                      {series.name} ({series.code})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 報價文字框與按鈕 */}
      {!isLoading && quotationData.length > 0 && (
        <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
          <div className="flex items-center justify-between mb-3">
            <label className="font-bold">報價文字</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerateQuotation}
                disabled={!selectedTierId || selectedSeriesIds.size === 0}
                className="rounded-theme-sm border bg-purple-400 px-4 py-2 text-sm font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                產生報價
              </button>
              <button
                onClick={handleGenerateQuotationWithRetail}
                disabled={!selectedTierId || selectedSeriesIds.size === 0}
                className="rounded-theme-sm border bg-blue-400 px-4 py-2 text-sm font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                產生報價(含售價)
              </button>
              <button
                onClick={handleCopyToClipboard}
                disabled={!quotationText}
                className="rounded-theme-sm border bg-green-400 px-4 py-2 text-sm font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                複製
              </button>
            </div>
          </div>
          <textarea
            value={quotationText}
            readOnly
            placeholder="點擊「產生報價」按鈕生成報價文字..."
            className="w-full h-96 rounded-theme-sm border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
          <div className="mt-4 rounded-theme-sm border bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-700">💡 使用提示</p>
            <ul className="mt-2 text-xs text-text-secondary space-y-1">
              <li>1. 選擇等級</li>
              <li>2. 勾選要報價的系列</li>
              <li>3. 點擊「產生報價」</li>
              <li>4. 點擊「複製」發送給客戶</li>
            </ul>
          </div>
        </div>
      )}

      {/* 載入中 */}
      {isLoading && (
        <div className="rounded-theme-sm border-theme bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-muted">載入中...</p>
        </div>
      )}

      {/* 提示訊息 */}
      {!selectedTierId && (
        <div className="rounded-theme-sm border-theme bg-purple-50 p-8 text-center shadow-neo">
          <p className="text-lg font-bold">請選擇等級</p>
          <p className="mt-4 text-sm text-text-secondary">選擇等級與系列後,可快速產生文字報價單</p>
        </div>
      )}
    </div>
  )
}
