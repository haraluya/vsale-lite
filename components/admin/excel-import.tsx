'use client'

import { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import { importClients } from '@/lib/actions/clients'
import { toast } from 'sonner'

interface ImportError {
  row_number: number
  field: string
  value: any
  message: string
}

interface ImportResult {
  total_rows: number
  success_count: number
  error_count: number
  errors: ImportError[]
  dry_run: boolean
}

interface ExcelImportProps {
  className?: string
}

/**
 * Excel 匯入元件
 * Feature 006 - User Story 7
 * Updated: 006-ux-enhancement - 可收合功能
 */
export function ExcelImport({ className = '' }: ExcelImportProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
      setShowResults(false)
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setImportResult(null)
    setShowResults(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImport = async (isDryRun: boolean) => {
    if (!selectedFile) {
      toast.error('請選擇要匯入的檔案')
      return
    }

    try {
      setIsImporting(true)
      toast.loading(isDryRun ? '正在驗證資料...' : '正在匯入資料...')

      const result = await importClients(selectedFile, {
        dry_run: isDryRun,
        skip_errors: false,
      })

      toast.dismiss()

      if (!result.success || !result.data) {
        toast.error(result.message || '匯入失敗')
        return
      }

      setImportResult(result.data)
      setShowResults(true)

      if (result.data.error_count === 0) {
        if (isDryRun) {
          toast.success(`驗證通過！共 ${result.data.success_count} 筆資料可匯入`)
        } else {
          toast.success(result.message || `成功匯入 ${result.data.success_count} 筆客戶資料`)
          handleClearFile()
          // 匯入成功後重新載入頁面
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        if (isDryRun) {
          toast.warning(`驗證完成：${result.data.success_count} 筆有效，${result.data.error_count} 筆錯誤`)
        } else {
          toast.warning(result.message || `匯入完成，${result.data.error_count} 筆失敗`)
          // 即使有部分失敗，也重新載入頁面以顯示已匯入的資料
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.dismiss()
      toast.error('匯入失敗，請稍後再試')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 展開/收合按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-theme-sm border-theme bg-yellow-300 px-6 py-3 font-bold shadow-neo-sm hover:-translate-y-0.5 hover:shadow-theme-hover transition-all"
      >
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5" />
          <span>批次匯入客戶資料</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {/* 匯入區塊（可收合） */}
      {isExpanded && (
        <div className="space-y-4">
          {/* 檔案選擇區 */}
          <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">選擇要匯入的 Excel 檔案</h3>
              {selectedFile && (
                <button
                  onClick={handleClearFile}
                  className="text-sm text-text-secondary hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  清除
                </button>
              )}
            </div>

        {/* 檔案上傳 */}
        {!selectedFile ? (
          <label className="block cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="border-theme border-dashed border-border rounded-theme-sm p-8 text-center hover:transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p className="text-sm font-medium mb-2">點擊上傳 Excel 檔案</p>
              <p className="text-xs text-text-secondary">僅支援 .xlsx 格式，最大 5MB</p>
            </div>
          </label>
        ) : (
          <div className="flex items-center gap-3 p-4 border-theme bg-surface-secondary">
            <FileSpreadsheet className="h-8 w-8 text-success" />
            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-xs text-text-secondary">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        {selectedFile && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleImport(true)}
              disabled={isImporting}
              className="flex-1 px-4 py-2 rounded-theme-sm border-theme bg-yellow-300 hover:bg-yellow-400 shadow-neo-sm hover:-translate-y-0.5 hover:shadow-theme-hover transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting && dryRun ? '驗證中...' : '試算驗證'}
            </button>
            <button
              onClick={() => handleImport(false)}
              disabled={isImporting}
              className="flex-1 px-4 py-2 rounded-theme-sm border-theme bg-green-300 hover:bg-green-400 shadow-neo-sm hover:-translate-y-0.5 hover:shadow-theme-hover transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting && !dryRun ? '匯入中...' : '正式匯入'}
            </button>
          </div>
        )}

            <p className="text-xs text-text-secondary mt-4">
              提示：建議先執行「試算驗證」檢查資料格式，確認無誤後再執行「正式匯入」
            </p>
          </div>

          {/* 匯入結果顯示 */}
          {showResults && importResult && (
            <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
              <div className="flex items-center gap-2 mb-4">
                {importResult.error_count === 0 ? (
                  <CheckCircle className="h-6 w-6 text-success" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                )}
                <h3 className="text-lg font-bold">
                  {importResult.dry_run ? '驗證結果' : '匯入結果'}
                </h3>
              </div>

              {/* 統計資訊 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border-theme p-4 bg-surface-secondary">
                  <p className="text-sm text-text-secondary mb-1">總筆數</p>
                  <p className="text-2xl font-bold">{importResult.total_rows}</p>
                </div>
                <div className="border-theme p-4 bg-success-bg">
                  <p className="text-sm text-text-secondary mb-1">成功筆數</p>
                  <p className="text-2xl font-bold text-success">{importResult.success_count}</p>
                </div>
                <div className="border-theme p-4 bg-error-bg">
                  <p className="text-sm text-text-secondary mb-1">錯誤筆數</p>
                  <p className="text-2xl font-bold text-error">{importResult.error_count}</p>
                </div>
              </div>

              {/* 錯誤明細 */}
              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-bold mb-3 text-error">錯誤明細</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="border border-red-300 bg-error-bg p-3 text-sm">
                        <p className="font-medium">
                          {error.row_number > 0 ? `第 ${error.row_number} 列` : '資料庫寫入'}：
                          {error.field}
                        </p>
                        <p className="text-text-secondary mt-1">{error.message}</p>
                        {error.value && (
                          <p className="text-xs text-text-secondary mt-1">值：{error.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 下一步提示 */}
              {importResult.dry_run && importResult.error_count === 0 && (
                <div className="mt-4 p-4 border-theme border-green-600 bg-success-bg">
                  <p className="text-sm text-green-800">
                    資料驗證通過！請點擊「正式匯入」按鈕完成匯入。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
