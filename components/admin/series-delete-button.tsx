/**
 * SeriesDeleteButton Component
 * Feature: 003-series-and-pricing
 *
 * 系列刪除按鈕元件 (管理員用)
 * - 刪除系列
 * - 確認對話框
 * - 檢查是否有商品使用
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSeries } from '@/lib/actions/series'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SeriesDeleteButtonProps {
  seriesId: string
  seriesName: string
}

export function SeriesDeleteButton({ seriesId, seriesName }: SeriesDeleteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`確定要刪除系列「${seriesName}」嗎?\n\n注意:若此系列下有商品,則無法刪除。`)) {
      return
    }

    setLoading(true)

    try {
      const result = await deleteSeries(seriesId)

      if (result.success) {
        alert(result.message || '系列刪除成功')
        router.refresh()
      } else {
        alert(result.message || '系列刪除失敗')
      }
    } catch (error) {
      alert('刪除失敗:' + (error instanceof Error ? error.message : '未知錯誤'))
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
