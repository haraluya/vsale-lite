/**
 * System Cleanup Page (系統清理頁面)
 *
 * 管理員系統資料清理工具
 * - 掃描並顯示未使用的系列代碼
 * - 批次刪除未使用的系列
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, CheckCircle2, XCircle, Search } from 'lucide-react'
import { scanUnusedSeries, batchDeleteSeries, type UnusedSeries, type CleanupResult } from '@/lib/actions/cleanup'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'

export default function CleanupPage() {
  const router = useRouter()
  const confirm = useConfirm()
  const alert = useAlert()
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [unusedSeries, setUnusedSeries] = useState<UnusedSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<CleanupResult | null>(null)

  // 掃描未使用的系列
  const handleScan = async () => {
    setScanning(true)
    setUnusedSeries([])
    setSelectedSeries(new Set())
    setResult(null)

    try {
      const scanResult = await scanUnusedSeries()

      if (scanResult.success && scanResult.data) {
        setUnusedSeries(scanResult.data)

        if (scanResult.data.length === 0) {
          await alert({
            title: '掃描完成',
            message: '沒有找到未使用的系列，所有系列都有商品使用',
            variant: 'success',
          })
        }
      } else {
        await alert({
          title: '掃描失敗',
          message: scanResult.message || '掃描失敗',
          variant: 'error',
        })
      }
    } catch (error) {
      await alert({
        title: '掃描失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        variant: 'error',
      })
    } finally {
      setScanning(false)
    }
  }

  // 切換選取狀態
  const toggleSelect = (seriesId: string) => {
    const newSelected = new Set(selectedSeries)
    if (newSelected.has(seriesId)) {
      newSelected.delete(seriesId)
    } else {
      newSelected.add(seriesId)
    }
    setSelectedSeries(newSelected)
  }

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedSeries.size === unusedSeries.length) {
      setSelectedSeries(new Set())
    } else {
      setSelectedSeries(new Set(unusedSeries.map((s) => s.id)))
    }
  }

  // 批次刪除選取的系列
  const handleDelete = async () => {
    if (selectedSeries.size === 0) {
      await alert({
        title: '請選擇系列',
        message: '請至少選擇一個系列進行刪除',
        variant: 'warning',
      })
      return
    }

    const confirmed = await confirm({
      title: '確認刪除',
      description: `即將刪除 ${selectedSeries.size} 個未使用的系列，此操作無法復原。\n\n確定要繼續嗎？`,
      variant: 'danger',
      confirmText: '確認刪除',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    setLoading(true)

    try {
      const deleteResult = await batchDeleteSeries(Array.from(selectedSeries))

      if (deleteResult.success && deleteResult.data) {
        setResult(deleteResult.data)

        // 移除已刪除的系列
        setUnusedSeries((prev) => prev.filter((s) => !selectedSeries.has(s.id)))
        setSelectedSeries(new Set())

        // 顯示結果摘要
        await alert({
          title: '刪除完成',
          message: deleteResult.message || '刪除作業已完成',
          variant: deleteResult.data.failed_count > 0 ? 'warning' : 'success',
        })

        // 刷新頁面以確保資料是最新的
        router.refresh()
      } else {
        await alert({
          title: '刪除失敗',
          message: deleteResult.message || '刪除作業失敗',
          variant: 'error',
        })
      }
    } catch (error) {
      await alert({
        title: '刪除失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={getPageContainerClasses('default')}>
      {/* Header */}
      <div>
        <h1 className={designTokens.typography.h1}>系統資料清理</h1>
        <p className={cn(designTokens.typography.body.base, 'mt-1 md:mt-2 text-gray-600')}>
          掃描並刪除未使用的系列代碼
        </p>
      </div>

      {/* 警告提示 */}
      <div
        className={cn(
          'rounded-none bg-yellow-50',
          getNeoBrutalismClasses(),
          'border-yellow-600',
          'p-4 md:p-6'
        )}
      >
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <h3 className={cn(designTokens.typography.h3, 'mb-2 text-yellow-800')}>清理說明</h3>
            <ul className={cn(designTokens.typography.body.base, 'space-y-1 text-yellow-700')}>
              <li>• 掃描所有系列，找出沒有任何商品使用的系列</li>
              <li>• 可選擇性刪除指定的系列</li>
              <li>• 有商品使用的系列不會被顯示</li>
              <li>• 刪除操作無法復原，請謹慎執行</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 掃描按鈕 */}
      <div className="flex justify-center">
        <Button onClick={handleScan} disabled={scanning || loading} className="bg-blue-500 hover:bg-blue-600">
          <Search className="mr-2 h-5 w-5" />
          {scanning ? '掃描中...' : '開始掃描未使用的系列'}
        </Button>
      </div>

      {/* 未使用系列列表 */}
      {unusedSeries.length > 0 && (
        <div className={cn('rounded-none bg-white', getNeoBrutalismClasses(), 'p-4 md:p-6 space-y-4')}>
          <div className="flex justify-between items-center">
            <h2 className={designTokens.typography.h2}>
              找到 {unusedSeries.length} 個未使用的系列
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={toggleSelectAll} size="sm">
                {selectedSeries.size === unusedSeries.length ? '取消全選' : '全選'}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading || selectedSeries.size === 0}
                className="bg-red-500 hover:bg-red-600"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除選取的系列 ({selectedSeries.size})
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {unusedSeries.map((series) => (
              <div
                key={series.id}
                className={cn(
                  'rounded-none border-2',
                  'p-3 cursor-pointer transition-colors',
                  selectedSeries.has(series.id)
                    ? 'bg-blue-50 border-blue-600'
                    : 'bg-gray-50 border-black hover:bg-gray-100'
                )}
                onClick={() => toggleSelect(series.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSeries.has(series.id)}
                    onChange={() => toggleSelect(series.id)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <p className={designTokens.typography.body.base}>
                      <span className="font-bold">{series.name}</span>
                      <span className="text-gray-600"> ({series.code})</span>
                    </p>
                    <p className={cn(designTokens.typography.caption, 'text-gray-500')}>
                      建立時間：{new Date(series.created_at).toLocaleDateString('zh-TW')}
                      {' • '}
                      狀態：{series.status === 'active' ? '啟用' : '停用'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 清理結果 */}
      {result && (
        <div
          className={cn(
            'rounded-none bg-white',
            getNeoBrutalismClasses(),
            'p-4 md:p-6 space-y-4'
          )}
        >
          <h2 className={designTokens.typography.h2}>清理結果</h2>

          {/* 統計摘要 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className={cn('rounded-none bg-blue-50', 'border-2 border-black', 'p-3 md:p-4')}>
              <p className={cn(designTokens.typography.caption, 'text-gray-600')}>系列總數</p>
              <p className={cn(designTokens.typography.h2, 'text-blue-600')}>
                {result.total_series}
              </p>
            </div>
            <div
              className={cn('rounded-none bg-yellow-50', 'border-2 border-black', 'p-3 md:p-4')}
            >
              <p className={cn(designTokens.typography.caption, 'text-gray-600')}>未使用數量</p>
              <p className={cn(designTokens.typography.h2, 'text-yellow-600')}>
                {result.unused_series_count}
              </p>
            </div>
            <div className={cn('rounded-none bg-green-50', 'border-2 border-black', 'p-3 md:p-4')}>
              <p className={cn(designTokens.typography.caption, 'text-gray-600')}>成功刪除</p>
              <p className={cn(designTokens.typography.h2, 'text-green-600')}>
                {result.deleted_count}
              </p>
            </div>
            <div className={cn('rounded-none bg-red-50', 'border-2 border-black', 'p-3 md:p-4')}>
              <p className={cn(designTokens.typography.caption, 'text-gray-600')}>刪除失敗</p>
              <p className={cn(designTokens.typography.h2, 'text-red-600')}>
                {result.failed_count}
              </p>
            </div>
          </div>

          {/* 成功刪除的系列 */}
          {result.deleted_series.length > 0 && (
            <div>
              <h3 className={cn(designTokens.typography.h3, 'mb-3 flex items-center gap-2')}>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                成功刪除的系列 ({result.deleted_series.length})
              </h3>
              <div className="space-y-2">
                {result.deleted_series.map((series, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-none bg-green-50',
                      'border-2 border-green-600',
                      'p-3'
                    )}
                  >
                    <p className={designTokens.typography.body.base}>
                      <span className="font-bold">{series.name}</span>
                      <span className="text-gray-600"> ({series.code})</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 刪除失敗的系列 */}
          {result.failed_series.length > 0 && (
            <div>
              <h3 className={cn(designTokens.typography.h3, 'mb-3 flex items-center gap-2')}>
                <XCircle className="h-5 w-5 text-red-600" />
                刪除失敗的系列 ({result.failed_series.length})
              </h3>
              <div className="space-y-2">
                {result.failed_series.map((series, index) => (
                  <div
                    key={index}
                    className={cn('rounded-none bg-red-50', 'border-2 border-red-600', 'p-3')}
                  >
                    <p className={designTokens.typography.body.base}>
                      <span className="font-bold">{series.name}</span>
                      <span className="text-gray-600"> ({series.code})</span>
                    </p>
                    <p className={cn(designTokens.typography.caption, 'mt-1 text-red-700')}>
                      錯誤：{series.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
