'use client'

/**
 * 備份管理元件
 * 包含：立即備份按鈕、備份列表表格、下載與刪除操作
 */

import { useEffect, useState } from 'react'
import {
  Download,
  Trash2,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { triggerBackup, getBackupJobs, deleteBackupJob } from '@/lib/actions/backup'
import { useAlert, useConfirm } from '@/lib/contexts/dialog-context'
import type { BackupJob } from '@/types'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function BackupManager() {
  const [jobs, setJobs] = useState<BackupJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [includeStorage, setIncludeStorage] = useState(false)
  const [backupInProgress, setBackupInProgress] = useState(false)
  const [backupProgress, setBackupProgress] = useState<{
    message: string
    percentage: number
  } | null>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState<string | null>(null)
  const alert = useAlert()
  const confirm = useConfirm()

  useEffect(() => {
    loadJobs()

    // 每 10 秒自動重新整理
    const interval = setInterval(loadJobs, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadJobs() {
    setLoading(true)
    const result = await getBackupJobs(20, 0)
    if (result.success && result.data) {
      setJobs(result.data.jobs)
      setTotal(result.data.total)
    }
    setLoading(false)
  }

  async function handleTriggerBackup() {
    setBackupInProgress(true)
    setBackupProgress({ message: '準備開始備份...', percentage: 0 })

    try {
      // 使用 EventSource 監聽備份進度
      const eventSource = new EventSource(
        `/api/backup/trigger?includeStorage=${includeStorage ? 'true' : 'false'}`
      )

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.stage === 'completed') {
          // 備份完成
          setBackupProgress({ message: data.message, percentage: 100 })
          eventSource.close()

          setTimeout(() => {
            alert({
              title: '備份完成',
              message: '資料庫備份已成功完成',
              variant: 'success',
            }).then(() => {
              setBackupInProgress(false)
              setBackupProgress(null)
              loadJobs()
            })
          }, 1000)
        } else if (data.stage === 'error') {
          // 備份失敗
          eventSource.close()
          setBackupProgress(null)
          setBackupInProgress(false)

          alert({
            title: '備份失敗',
            message: data.message || '執行備份時發生錯誤',
            variant: 'error',
          }).then(() => {
            loadJobs()
          })
        } else {
          // 更新進度
          setBackupProgress({
            message: data.message,
            percentage: data.percentage || 0,
          })
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setBackupProgress(null)
        setBackupInProgress(false)

        alert({
          title: '連線錯誤',
          message: '無法連線到伺服器，請重新整理頁面後再試',
          variant: 'error',
        })
      }
    } catch (error) {
      setBackupProgress(null)
      setBackupInProgress(false)

      await alert({
        title: '執行失敗',
        message: error instanceof Error ? error.message : '無法執行備份',
        variant: 'error',
      })
    }
  }

  async function handleDownloadBackup(job: BackupJob, type: 'database' | 'storage' = 'database') {
    try {
      // 直接下載檔案（不使用 Signed URL）
      const downloadUrl = `/api/backup/download/${job.id}?type=${type}`

      // 建立隱藏的 <a> 標籤並觸發下載
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = type === 'database' ? job.filename : job.filename.replace('.sql.gz', '-storage.zip')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 關閉下載選單
      setShowDownloadMenu(null)

      await alert({
        title: '下載已開始',
        message: `備份檔案開始下載：${type === 'database' ? '資料庫' : 'Storage 圖片'}`,
        variant: 'success',
      })
    } catch (error) {
      await alert({
        title: '下載失敗',
        message: error instanceof Error ? error.message : '無法下載備份檔案',
        variant: 'error',
      })
    }
  }

  async function handleDeleteBackup(job: BackupJob) {
    const confirmed = await confirm({
      title: '確認刪除備份',
      description: `確定要刪除備份「${job.filename}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) return

    const result = await deleteBackupJob(job.id)

    if (result.success) {
      await alert({
        title: '刪除成功',
        message: '備份已刪除',
        variant: 'success',
      })
      loadJobs()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message || '無法刪除備份',
        variant: 'error',
      })
    }
  }


  return (
    <div className="space-y-4">
      {/* 操作列 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold">備份記錄（共 {total} 筆）</h3>
        <div className="flex gap-2">
          <button
            onClick={loadJobs}
            disabled={loading}
            className="rounded-theme-sm border bg-surface px-4 py-2 font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo-sm md:border md:shadow-neo"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleTriggerBackup}
            disabled={backupInProgress || loading}
            className="rounded-theme-sm border bg-blue-400 px-4 py-2 font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo-sm md:border md:shadow-neo"
          >
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>立即備份</span>
            </div>
          </button>
        </div>
      </div>

      {/* 備份選項 */}
      <div className="rounded-theme-sm border bg-surface p-4 shadow-neo-sm md:border md:shadow-neo">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={includeStorage}
            onChange={(e) => setIncludeStorage(e.target.checked)}
            disabled={backupInProgress}
            className="h-5 w-5 cursor-pointer border accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div>
            <span className="font-bold">備份包含商品圖片與系統圖片</span>
            <p className="text-sm text-text-secondary">
              包含 Supabase Storage 中的所有圖片檔案（商品圖、系統 Logo、公告圖片等）
            </p>
          </div>
        </label>
      </div>

      {/* 備份進度條 */}
      {backupProgress && (
        <div className="rounded-theme-sm border bg-surface p-4 shadow-neo-sm md:border md:shadow-neo">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold">{backupProgress.message}</span>
            <span className="text-sm font-bold text-text-secondary">
              {backupProgress.percentage}%
            </span>
          </div>
          <div className="h-4 w-full rounded-theme-sm border bg-surface-secondary">
            <div
              className="h-full bg-blue-400 transition-all duration-300"
              style={{ width: `${backupProgress.percentage}%` }}
            />
          </div>
        </div>
      )}


      {/* 備份列表 - 桌面表格視圖 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full rounded-theme-sm border bg-surface shadow-neo md:border">
          <thead className="border-b bg-surface-secondary md:border-b">
            <tr>
              <th className="border-r-2 px-4 py-3 text-left font-bold md:border-r">
                檔案名稱
              </th>
              <th className="border-r-2 px-4 py-3 text-left font-bold md:border-r">
                大小
              </th>
              <th className="border-r-2 px-4 py-3 text-left font-bold md:border-r">
                類型
              </th>
              <th className="border-r-2 px-4 py-3 text-left font-bold md:border-r">
                狀態
              </th>
              <th className="border-r-2 px-4 py-3 text-left font-bold md:border-r">
                包含內容
              </th>
              <th className="border-r-2 px-4 py-3 text-left font-bold md:border-r">
                時間
              </th>
              <th className="px-4 py-3 text-left font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                  載入中...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                  尚無備份記錄
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-t md:border-t">
                  <td className="border-r-2 px-4 py-3 font-mono text-sm md:border-r">
                    {job.filename}
                  </td>
                  <td className="border-r-2 px-4 py-3 md:border-r">
                    {formatFileSize(job.file_size)}
                  </td>
                  <td className="border-r-2 px-4 py-3 md:border-r">
                    <BackupTypeBadge type={job.backup_type} />
                  </td>
                  <td className="border-r-2 px-4 py-3 md:border-r">
                    <BackupStatusBadge status={job.status} />
                  </td>
                  <td className="border-r-2 px-4 py-3 md:border-r">
                    <BackupContentBadge includesStorage={job.includes_storage} />
                  </td>
                  <td className="border-r-2 px-4 py-3 md:border-r">
                    {formatBackupTime(job.started_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {job.status === 'success' && (
                        job.includes_storage ? (
                          // 下拉選單（含圖片備份）
                          <div className="relative">
                            <button
                              onClick={() => setShowDownloadMenu(showDownloadMenu === job.id ? null : job.id)}
                              className="rounded-theme-sm border bg-green-100 p-2 shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                              title="下載備份"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {showDownloadMenu === job.id && (
                              <div className="absolute right-0 top-full mt-2 z-10 rounded-theme-sm border bg-surface shadow-neo-sm">
                                <button
                                  onClick={() => handleDownloadBackup(job, 'database')}
                                  className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm hover:bg-surface-secondary"
                                >
                                  📊 下載資料庫
                                </button>
                                <button
                                  onClick={() => handleDownloadBackup(job, 'storage')}
                                  className="block w-full whitespace-nowrap border-t px-4 py-2 text-left text-sm hover:bg-surface-secondary"
                                >
                                  🖼️ 下載圖片
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          // 單一下載按鈕（僅資料庫）
                          <button
                            onClick={() => handleDownloadBackup(job, 'database')}
                            className="rounded-theme-sm border bg-green-100 p-2 shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                            title="下載備份"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handleDeleteBackup(job)}
                        className="rounded-theme-sm border bg-red-100 p-2 shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                        title="刪除備份"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 備份列表 - 手機卡片視圖 */}
      <div className="space-y-3 md:hidden">
        {loading && jobs.length === 0 ? (
          <div className="rounded-theme-sm border bg-surface p-4 text-center shadow-neo-sm">
            載入中...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-theme-sm border bg-surface p-4 text-center shadow-neo-sm">
            尚無備份記錄
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-theme-sm border bg-surface p-4 shadow-neo-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-mono text-sm font-bold">{job.filename}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {formatFileSize(job.file_size)}
                  </p>
                </div>
                <BackupStatusBadge status={job.status} />
              </div>
              <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
                <BackupTypeBadge type={job.backup_type} />
                <span>•</span>
                <span>{formatBackupTime(job.started_at)}</span>
              </div>
              {job.includes_storage ? (
                // 包含圖片：顯示兩個下載按鈕
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadBackup(job, 'database')}
                      className="flex-1 rounded-theme-sm border bg-green-100 px-3 py-2 text-xs font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                    >
                      📊 資料庫
                    </button>
                    <button
                      onClick={() => handleDownloadBackup(job, 'storage')}
                      className="flex-1 rounded-theme-sm border bg-blue-100 px-3 py-2 text-xs font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                    >
                      🖼️ 圖片
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteBackup(job)}
                    className="w-full rounded-theme-sm border bg-red-100 px-3 py-2 text-sm font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              ) : (
                // 僅資料庫：單一下載按鈕
                <div className="flex gap-2">
                  {job.status === 'success' && (
                    <button
                      onClick={() => handleDownloadBackup(job, 'database')}
                      className="flex-1 rounded-theme-sm border bg-green-100 px-3 py-2 text-sm font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                    >
                      <Download className="mx-auto h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteBackup(job)}
                    className="flex-1 rounded-theme-sm border bg-red-100 px-3 py-2 text-sm font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * 備份類型徽章
 */
function BackupTypeBadge({ type }: { type: 'auto' | 'manual' }) {
  return (
    <span
      className={`inline-flex rounded-theme-sm border px-2 py-1 text-xs font-bold ${
        type === 'auto' ? 'bg-blue-100' : 'bg-purple-100'
      }`}
    >
      {type === 'auto' ? '自動' : '手動'}
    </span>
  )
}

/**
 * 備份狀態徽章
 */
function BackupStatusBadge({
  status,
}: {
  status: 'in_progress' | 'success' | 'failed'
}) {
  const config = {
    in_progress: {
      icon: Clock,
      text: '進行中',
      bg: 'bg-yellow-100',
      color: 'text-yellow-700',
    },
    success: {
      icon: CheckCircle,
      text: '成功',
      bg: 'bg-green-100',
      color: 'text-green-700',
    },
    failed: {
      icon: XCircle,
      text: '失敗',
      bg: 'bg-red-100',
      color: 'text-red-700',
    },
  }

  const { icon: Icon, text, bg, color } = config[status]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-theme-sm border px-2 py-1 text-xs font-bold ${bg} ${color}`}
    >
      <Icon className="h-3 w-3" />
      <span>{text}</span>
    </span>
  )
}

/**
 * 備份內容徽章
 */
function BackupContentBadge({ includesStorage }: { includesStorage: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-theme-sm border px-2 py-1 text-xs font-bold ${
        includesStorage ? 'bg-green-100 text-green-700' : 'bg-surface-secondary text-text-secondary'
      }`}
    >
      {includesStorage ? '✓ 含圖片' : '僅資料庫'}
    </span>
  )
}

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 格式化備份時間
 */
function formatBackupTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return format(date, 'MM/dd HH:mm', { locale: zhTW })
  } catch {
    return isoString
  }
}
