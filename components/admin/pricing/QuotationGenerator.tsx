/**
 * QuotationGenerator Component
 * Feature: 價格管理優化 - 報價產生器
 *
 * 報價產生器
 * - 選擇等級下拉選單
 * - 系列多選（checkbox 網格）
 * - 商品列表預覽（依系列分欄）
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

    let text = '【報價單】\n'
    text += `等級: ${tierName}\n\n`

    quotationData.forEach((series) => {
      text += `=== ${series.series_name} ===\n`
      series.products.forEach((product: any) => {
        const priceText = product.price ? `$${Math.round(product.price)}` : '價格未設定'
        text += `${product.code} ${product.name} - ${priceText}\n`
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

  return (
    <div className="space-y-6">
      {/* 等級選擇 */}
      <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
        <label className="mb-3 block font-bold">選擇等級</label>
        <select
          value={selectedTierId}
          onChange={(e) => setSelectedTierId(e.target.value)}
          className="w-full rounded-none border-2 border-black px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">請選擇等級...</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
      </div>

      {/* 系列多選 */}
      <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
        <label className="mb-3 block font-bold">選擇系列 (可複選)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {seriesList.map((series) => (
            <label
              key={series.id}
              className={`flex items-center gap-2 rounded-none border-2 border-black p-3 cursor-pointer transition-all ${
                selectedSeriesIds.has(series.id)
                  ? 'bg-purple-400 shadow-neo-sm'
                  : 'bg-white hover:bg-gray-50'
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

      {/* 商品列表預覽 */}
      {isLoading && (
        <div className="rounded-none border-2 md:border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">載入中...</p>
        </div>
      )}

      {!isLoading && quotationData.length > 0 && (
        <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
          <h3 className="mb-4 text-lg font-bold">商品列表預覽</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotationData.map((series) => (
              <div
                key={series.series_id}
                className="rounded-none border-2 border-black p-4 bg-gray-50"
              >
                <h4 className="font-bold text-purple-700 mb-2">{series.series_name}</h4>
                <ul className="space-y-1 text-sm">
                  {series.products.map((product: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span className="text-gray-700">
                        {product.code} {product.name}
                      </span>
                      <span className="font-medium">
                        {product.price ? `$${Math.round(product.price)}` : 'N/A'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 報價按鈕與文字框 */}
      {!isLoading && quotationData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 文字框 */}
          <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
            <label className="mb-3 block font-bold">報價文字</label>
            <textarea
              value={quotationText}
              readOnly
              placeholder="點擊「產生報價」按鈕生成報價文字..."
              className="w-full h-96 rounded-none border-2 border-gray-300 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* 按鈕 */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleGenerateQuotation}
              disabled={!selectedTierId || selectedSeriesIds.size === 0}
              className="rounded-none border-2 md:border-3 border-black bg-purple-400 px-8 py-6 font-bold shadow-neo-sm md:shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="mx-auto mb-2 h-8 w-8" />
              產生報價
            </button>

            <button
              onClick={handleCopyToClipboard}
              disabled={!quotationText}
              className="rounded-none border-2 md:border-3 border-black bg-green-400 px-8 py-6 font-bold shadow-neo-sm md:shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="mx-auto mb-2 h-8 w-8" />
              複製到剪貼簿
            </button>

            <div className="rounded-none border-2 border-black bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-700">💡 使用提示</p>
              <ul className="mt-2 text-xs text-gray-700 space-y-1">
                <li>1. 選擇等級</li>
                <li>2. 勾選要報價的系列</li>
                <li>3. 點擊「產生報價」</li>
                <li>4. 點擊「複製」發送給客戶</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 提示訊息 */}
      {!selectedTierId && (
        <div className="rounded-none border-2 md:border-3 border-black bg-purple-50 p-8 text-center shadow-neo">
          <p className="text-lg font-bold">請選擇等級</p>
          <p className="mt-4 text-sm text-gray-600">選擇等級與系列後,可快速產生文字報價單</p>
        </div>
      )}
    </div>
  )
}
