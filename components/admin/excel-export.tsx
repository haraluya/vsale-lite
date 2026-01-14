'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportClients } from '@/lib/actions/clients'
import { toast } from 'sonner'

interface ExcelExportProps {
  filters?: {
    tier_id?: string
    search?: string
    created_after?: string
  }
  buttonText?: string
  className?: string
}

/**
 * Excel 匯出元件
 * Feature 006 - User Story 7
 */
export function ExcelExport({ filters, buttonText = '匯出 Excel', className = '' }: ExcelExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      toast.loading('正在產生 Excel 檔案...')

      const result = await exportClients(filters)

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
      toast.success(result.message || `成功匯出 ${result.data.row_count} 筆客戶資料`)
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
