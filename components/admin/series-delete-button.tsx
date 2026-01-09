/**
 * SeriesDeleteButton Component
 * Feature: 003-series-and-pricing
 *
 * 系列刪除按鈕元件 (管理員用)
 * - 刪除系列
 * - 確認對話框
 * - 檢查是否有商品使用
 * - 顯示使用該系列的商品清單
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSeries } from '@/lib/actions/series'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

interface SeriesDeleteButtonProps {
  seriesId: string
  seriesName: string
}

export function SeriesDeleteButton({ seriesId, seriesName }: SeriesDeleteButtonProps) {
  const confirm = useConfirm()
  const alert = useAlert()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除系列「${seriesName}」嗎？\n\n注意：若此系列下有商品，則無法刪除。`,
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    setLoading(true)

    try {
      const result = await deleteSeries(seriesId)

      if (result.success) {
        toast.success(result.message || '系列刪除成功')
        router.refresh()
      } else {
        // 使用 alert 對話框顯示詳細錯誤訊息（支援多行訊息）
        await alert({
          title: '無法刪除系列',
          message: result.message || '系列刪除失敗',
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
    <Button
      variant="outline"
      className="w-full border-red-600 text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {loading ? '刪除中...' : '刪除'}
    </Button>
  )
}
