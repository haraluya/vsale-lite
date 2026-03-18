'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { LoadingSpinner } from '@/components/ui/loading'
import { resetAllStock } from '@/lib/actions/products'
import { RefreshCw } from 'lucide-react'

/**
 * 庫存歸零按鈕元件
 * 用於系統設定頁面，將所有商品庫存歸零
 */
export function StockResetButton() {
  const [loading, setLoading] = useState(false)
  const confirm = useConfirm()
  const alert = useAlert()

  const handleResetStock = async () => {
    // 第一次確認
    const firstConfirm = await confirm({
      title: '確認庫存歸零',
      description: '此操作會將所有商品的庫存設為 0，是否繼續？',
      variant: 'warning',
    })

    if (!firstConfirm) return

    // 第二次確認（雙重確認）
    const secondConfirm = await confirm({
      title: '⚠️ 最後確認',
      description: '此操作無法復原！確定要將所有商品庫存歸零嗎？',
      variant: 'danger',
    })

    if (!secondConfirm) return

    setLoading(true)
    try {
      const result = await resetAllStock()

      if (result.success) {
        await alert({
          title: '庫存歸零成功',
          message: result.message || '所有商品庫存已歸零',
          variant: 'success',
        })
      } else {
        await alert({
          title: '庫存歸零失敗',
          message: result.message || '操作失敗',
          variant: 'error',
        })
      }
    } catch (error) {
      await alert({
        title: '庫存歸零失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-theme-sm border-theme border-yellow-500 bg-yellow-50 p-6 shadow-neo-sm">
      <h3 className="text-lg font-black mb-2">⚠️ 危險操作</h3>
      <p className="text-sm text-gray-700 mb-4">
        此功能會將所有商品的庫存歸零，適用於盤點後重新建立庫存數據的情境。
      </p>
      <Button
        variant="danger"
        onClick={handleResetStock}
        disabled={loading}
        className="w-full md:w-auto"
      >
        {loading ? (
          <>
            <LoadingSpinner className="mr-2" />
            處理中...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            庫存歸零
          </>
        )}
      </Button>
    </div>
  )
}
