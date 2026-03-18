'use client'

/**
 * 備份狀態顯示元件
 * 顯示上次成功備份時間、上次失敗錯誤、自動備份停用警告
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { getBackupSettings } from '@/lib/actions/backup'
import type { BackupSettings } from '@/types'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function BackupStatus() {
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const result = await getBackupSettings()
    if (result.success && result.data) {
      setSettings(result.data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="rounded-theme-sm border bg-gray-50 p-4 shadow-neo-sm md:border md:shadow-neo">
        <p className="text-sm text-gray-600">載入備份狀態中...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="rounded-theme-sm border bg-red-50 p-4 shadow-neo-sm md:border md:shadow-neo">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-900">無法載入備份狀態</p>
            <p className="mt-1 text-sm text-red-700">請重新整理頁面或聯絡系統管理員</p>
          </div>
        </div>
      </div>
    )
  }

  // 判斷是否有上次成功備份
  const hasLastSuccess = settings.backup_last_success && settings.backup_last_success.trim() !== ''
  const hasLastError = settings.backup_last_error && settings.backup_last_error.trim() !== ''

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 自動備份停用警告 */}
      {!settings.backup_enabled && (
        <div className="rounded-theme-sm border bg-yellow-50 p-4 shadow-neo-sm md:border md:col-span-2 md:shadow-neo">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
            <div>
              <p className="font-bold text-yellow-900">自動備份已停用</p>
              <p className="mt-1 text-sm text-yellow-700">
                系統不會執行定時備份，請在系統設定中重新啟用
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 上次成功備份 */}
      {hasLastSuccess ? (
        <div className="rounded-theme-sm border bg-green-50 p-4 shadow-neo-sm md:border md:shadow-neo">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-green-900">上次備份成功</p>
              <p className="mt-1 text-sm text-green-700">
                {formatBackupTime(settings.backup_last_success)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-theme-sm border bg-gray-50 p-4 shadow-neo-sm md:border md:shadow-neo">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-gray-600" />
            <div>
              <p className="font-bold text-gray-900">尚未執行過備份</p>
              <p className="mt-1 text-sm text-gray-700">請手動執行第一次備份</p>
            </div>
          </div>
        </div>
      )}

      {/* 上次失敗錯誤 */}
      {hasLastError && (
        <div className="rounded-theme-sm border bg-red-50 p-4 shadow-neo-sm md:border md:shadow-neo">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-red-900">上次備份失敗</p>
              <p className="mt-1 text-sm text-red-700 break-words">
                {settings.backup_last_error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 格式化備份時間顯示
 */
function formatBackupTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return format(date, 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })
  } catch {
    return isoString
  }
}
