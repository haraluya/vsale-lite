'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { downloadSeriesTemplate } from '@/lib/actions/series'
import { toast } from 'sonner'

interface ExcelTemplateDownloadProps {
  buttonText?: string
  className?: string
}

/**
 * 系列 Excel 範本下載元件
 */
export function ExcelTemplateDownload({
  buttonText = '下載範本',
  className = '',
}: ExcelTemplateDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      toast.loading('正在產生範本檔案...')

      const result = await downloadSeriesTemplate()

      if (!result.success || !result.data) {
        toast.dismiss()
        toast.error(result.message || '下載失敗')
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
      toast.success('範本下載成功')
    } catch (error) {
      console.error('Download template error:', error)
      toast.dismiss()
      toast.error('下載失敗，請稍後再試')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`
        inline-flex items-center gap-2 px-4 py-2
        rounded-none border-3 border-black
        bg-blue-300 hover:bg-blue-400
        shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <FileDown className="h-4 w-4" />
      {isDownloading ? '下載中...' : buttonText}
    </button>
  )
}
