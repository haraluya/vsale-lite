/**
 * System Cleanup Page (系統清理頁面)
 *
 * 管理員系統資料清理工具
 * - 一鍵清理未使用的系列代碼
 */

'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cleanupUnusedSeries, type CleanupResult } from '@/lib/actions/cleanup'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'

export default function CleanupPage() {
  const confirm = useConfirm()
  const alert = useAlert()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CleanupResult | null>(null)

  const handleCleanup = async () => {
    const confirmed = await confirm({
      title: '確認清理未使用的系列',
      description:
        '此操作將自動掃描所有系列，並刪除沒有任何商品使用的系列代碼。\n\n此操作無法復原，確定要繼續嗎？',
      variant: 'warning',
      confirmText: '開始清理',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const cleanupResult = await cleanupUnusedSeries()

      if (cleanupResult.success && cleanupResult.data) {
        setResult(cleanupResult.data)

        // 顯示結果摘要
        await alert({
          title: '清理完成',
          message: cleanupResult.message || '清理作業已完成',
          variant: cleanupResult.data.failed_count > 0 ? 'warning' : 'success',
        })
      } else {
        await alert({
          title: '清理失敗',
          message: cleanupResult.message || '清理作業失敗',
          variant: 'error',
        })
      }
    } catch (error) {
      await alert({
        title: '清理失敗',
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
          一鍵清理未使用的系列代碼
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
              <li>• 系統將自動掃描所有系列代碼</li>
              <li>• 刪除沒有任何商品使用的系列</li>
              <li>• 有商品使用的系列會被保留</li>
              <li>• 此操作無法復原，請謹慎執行</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 執行按鈕 */}
      <div className="flex justify-center">
        <Button
          onClick={handleCleanup}
          disabled={loading}
          className="bg-red-500 hover:bg-red-600"
        >
          <Trash2 className="mr-2 h-5 w-5" />
          {loading ? '清理中...' : '開始清理未使用的系列'}
        </Button>
      </div>

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

          {/* 無需清理 */}
          {result.deleted_series.length === 0 && result.failed_series.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-3" />
              <p className={cn(designTokens.typography.body.large, 'text-gray-600')}>
                沒有需要清理的系列，所有系列都有商品使用
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
