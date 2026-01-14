'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportProducts } from '@/lib/actions/products'
import { toast } from 'sonner'

interface ExcelExportProps {
  filters?: {
    series_id?: string
    search?: string
    status?: 'active' | 'inactive'
  }
  buttonText?: string
  className?: string
}

/**
 * 商品 Excel 匯出元件
 */
export function ExcelExport({ filters, buttonText = '匯出 Excel', className = '' }: ExcelExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      toast.loading('正在產生 Excel 檔案...')

      const result = await exportProducts(filters)

      if (!result.success || !result.data) {
        toast.dismiss()
        toast.error(result.message || '匯出失敗')
        return
      }

      // 將 Buffer 轉換為 Blob
      const buffer = new Uint8Array(result.data.file_buffer)
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      // 建立下載連結
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.data.file_name
      link.click()

      // 清理
      URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success(result.message || '成功匯出商品資料')
    } catch (error) {
      console.error('Export error:', error)
      toast.dismiss()
      toast.error('匯出失敗，請稍後再試')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`
        inline-flex items-center gap-2 px-4 py-2
        rounded-none border-2 md:border-3 border-black
        bg-white hover:bg-gray-50
        shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <Download className="h-4 w-4" />
      {isExporting ? '匯出中...' : buttonText}
    </button>
  )
}
