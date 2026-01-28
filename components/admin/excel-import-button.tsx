'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExcelImportDialog } from './excel-import-dialog'

/**
 * Excel 匯入按鈕元件
 * 點擊後彈出匯入對話框
 */
export function ExcelImportButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        variant="secondary"
        className="border-2 md:border-3 border-black bg-yellow-300 hover:bg-yellow-400"
      >
        <Upload className="mr-2 h-4 w-4" />
        批次匯入
      </Button>

      <ExcelImportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  )
}
