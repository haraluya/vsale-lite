'use client'

/**
 * 備份管理元件
 * Feature: 015-cloud-backup (Phase 4 - US2)
 * 功能：手動觸發備份、查看備份記錄列表、下載備份、刪除備份
 */

import { useState, useEffect, useCallback } from 'react'
import { Download, Trash2, HardDrive, Loader2 } from 'lucide-react'
import { triggerBackup, getBackupJobs, deleteBackupJob } from '@/lib/actions/backup'
import { useAlert, useConfirm } from '@/lib/contexts/dialog-context'
import type { BackupJob } from '@/types'

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 格式化日期時間
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * 備份類型徽章
 */
function BackupTypeBadge({ type }: { type: 'auto' | 'manual' }) {
  if (type === 'auto') {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-blue-100 px-2 py-1 text-xs font-bold">
        自動
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-purple-100 px-2 py-1 text-xs font-bold">
      手動
    </span>
  )
}

/**
 * 備份狀態徽章
 */
function BackupStatusBadge({ status }: { status: BackupJob['status'] }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
        成功
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
        失敗
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
      <Loader2 className="h-3 w-3 animate-spin" />
      進行中
    </span>
  )
}

export function BackupManager() {
  const [jobs, setJobs] = useState<BackupJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const alert = useAlert()
  const confirm = useConfirm()

  /**
   * 載入備份列表
   */
  const loadBackupJobs = useCallback(async () => {
    setIsLoading(true)
    const result = await getBackupJobs(20, 0)
    if (result.success && result.data) {
      setJobs(result.data.jobs)
    } else {
      await alert({
        title: '載入失敗',
        message: result.message || '無法載入備份列表',
        variant: 'error',
      })
    }
    setIsLoading(false)
  }, [alert])

  /**
   * 初始載入 + 每 10 秒自動重新整理
   */
  useEffect(() => {
    loadBackupJobs()
    const interval = setInterval(loadBackupJobs, 10000)
    return () => clearInterval(interval)
  }, [loadBackupJobs])

  /**
   * 手動觸發備份
   */
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      const result = await triggerBackup()
      if (result.success) {
        await alert({
          title: '備份已開始',
          message: '系統正在執行備份，請稍後查看備份列表',
          variant: 'success',
        })
        // 立即重新載入列表
        await loadBackupJobs()
      } else {
        await alert({
          title: '備份失敗',
          message: result.message || '執行備份時發生錯誤',
          variant: 'error',
        })
      }
    } catch (error) {
      await alert({
        title: '備份失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        variant: 'error',
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  /**
   * 刪除備份
   */
  const handleDeleteBackup = async (jobId: string, filename: string) => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除備份「${filename}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) return

    const result = await deleteBackupJob(jobId)
    if (result.success) {
      await alert({
        title: '刪除成功',
        message: '備份已刪除',
        variant: 'success',
      })
      // 重新載入列表
      await loadBackupJobs()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message || '無法刪除備份',
        variant: 'error',
      })
    }
  }

  /**
   * 下載備份（暫時使用 storage_url 直接下載）
   */
  const handleDownloadBackup = (storageUrl: string, filename: string) => {
    // TODO: Phase 7 實作 getBackupDownloadUrl() 產生臨時簽名 URL
    // 目前直接使用 storage_url
    window.open(storageUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* 立即備份按鈕 */}
      <div>
        <button
          onClick={handleCreateBackup}
          disabled={isCreatingBackup}
          className="inline-flex items-center gap-2 rounded-none border-3 border-black bg-green-400 px-6 py-3 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreatingBackup ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              執行中...
            </>
          ) : (
            <>
              <HardDrive className="h-5 w-5" />
              立即備份
            </>
          )}
        </button>
        <p className="mt-2 text-sm text-gray-600">
          手動執行完整資料庫備份（包含所有資料表）
        </p>
      </div>

      {/* 備份列表 */}
      <div className="rounded-none border-3 border-black bg-white shadow-neo">
        <div className="border-b-3 border-black bg-gray-50 px-4 py-3">
          <h3 className="font-black">備份記錄</h3>
          <p className="mt-1 text-xs text-gray-600">
            最近 20 筆備份記錄 · 每 10 秒自動更新
          </p>
        </div>

        <div className="p-4">
          {isLoading ? (
            // 載入中骨架屏
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-none border-2 border-gray-300 bg-gray-100"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            // 無備份記錄
            <div className="py-12 text-center text-gray-500">
              <HardDrive className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 font-bold">尚無備份記錄</p>
              <p className="mt-1 text-sm">點擊「立即備份」開始第一次備份</p>
            </div>
          ) : (
            // 備份列表表格（桌面版）
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="px-4 py-2 text-left text-sm font-black">檔案名稱</th>
                    <th className="px-4 py-2 text-left text-sm font-black">大小</th>
                    <th className="px-4 py-2 text-left text-sm font-black">類型</th>
                    <th className="px-4 py-2 text-left text-sm font-black">狀態</th>
                    <th className="px-4 py-2 text-left text-sm font-black">時間</th>
                    <th className="px-4 py-2 text-right text-sm font-black">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{job.filename}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatFileSize(job.file_size)}
                      </td>
                      <td className="px-4 py-3">
                        <BackupTypeBadge type={job.backup_type} />
                      </td>
                      <td className="px-4 py-3">
                        <BackupStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDateTime(job.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          {/* 下載按鈕（僅成功備份） */}
                          {job.status === 'success' && (
                            <button
                              onClick={() =>
                                handleDownloadBackup(job.storage_url, job.filename)
                              }
                              className="rounded-none border-2 border-black bg-blue-400 p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                              title="下載備份"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {/* 刪除按鈕 */}
                          <button
                            onClick={() => handleDeleteBackup(job.id, job.filename)}
                            className="rounded-none border-2 border-black bg-red-400 p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                            title="刪除備份"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 備份列表卡片（手機版） */}
          {!isLoading && jobs.length > 0 && (
            <div className="space-y-3 md:hidden">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-none border-2 border-black bg-white p-4 shadow-neo-sm"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-mono text-sm font-bold">{job.filename}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {formatFileSize(job.file_size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <BackupTypeBadge type={job.backup_type} />
                      <BackupStatusBadge status={job.status} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{formatDateTime(job.created_at)}</p>
                  <div className="mt-3 flex gap-2">
                    {job.status === 'success' && (
                      <button
                        onClick={() => handleDownloadBackup(job.storage_url, job.filename)}
                        className="flex-1 rounded-none border-2 border-black bg-blue-400 px-3 py-2 text-sm font-bold shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      >
                        <Download className="inline-block h-4 w-4 mr-1" />
                        下載
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBackup(job.id, job.filename)}
                      className="flex-1 rounded-none border-2 border-black bg-red-400 px-3 py-2 text-sm font-bold shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      <Trash2 className="inline-block h-4 w-4 mr-1" />
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
