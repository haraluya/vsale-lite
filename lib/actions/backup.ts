'use server'

/**
 * 備份管理 Server Actions
 * 負責手動觸發備份、查詢備份記錄、刪除備份等操作
 */

import { createClient } from '@/lib/supabase/server'
import { performBackup } from '@/lib/backup/db-backup'
import { deleteBackup as deleteGCSBackup } from '@/lib/cloud-storage/gcs'
import type { ActionResult } from '@/types'
import type { BackupJob, BackupSettings } from '@/types'

/**
 * 檢查是否為管理員
 */
async function checkAdminAuth(): Promise<{ userId: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return null
  }

  return { userId: user.id }
}

/**
 * 手動觸發備份
 * @returns 備份任務 ID
 */
export async function triggerBackup(): Promise<ActionResult<{ jobId: string }>> {
  try {
    // 權限檢查
    const auth = await checkAdminAuth()
    if (!auth) {
      return {
        success: false,
        message: '權限不足：僅管理員可執行備份',
      }
    }

    // 執行備份
    const jobId = await performBackup('manual', auth.userId)

    return {
      success: true,
      data: { jobId },
      message: '備份已開始執行',
    }
  } catch (error) {
    console.error('Trigger backup failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '備份執行失敗',
    }
  }
}

/**
 * 查詢備份記錄列表
 * @param limit 回傳筆數（預設 20）
 * @param offset 略過筆數（預設 0）
 * @param status 篩選狀態（可選）
 */
export async function getBackupJobs(
  limit = 20,
  offset = 0,
  status?: 'in_progress' | 'success' | 'failed'
): Promise<ActionResult<{ jobs: BackupJob[]; total: number }>> {
  try {
    // 權限檢查
    const auth = await checkAdminAuth()
    if (!auth) {
      return {
        success: false,
        message: '權限不足：僅管理員可查看備份記錄',
      }
    }

    const supabase = await createClient()

    // 建立查詢
    let query = supabase
      .from('backup_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 狀態篩選
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch backup jobs: ${error.message}`)
    }

    return {
      success: true,
      data: {
        jobs: data as BackupJob[],
        total: count || 0,
      },
    }
  } catch (error) {
    console.error('Get backup jobs failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢備份記錄失敗',
    }
  }
}

/**
 * 查詢單一備份記錄詳情
 * @param jobId 備份任務 ID
 */
export async function getBackupJobById(
  jobId: string
): Promise<ActionResult<BackupJob>> {
  try {
    // 權限檢查
    const auth = await checkAdminAuth()
    if (!auth) {
      return {
        success: false,
        message: '權限不足：僅管理員可查看備份記錄',
      }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('backup_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !data) {
      throw new Error(`Backup job not found: ${jobId}`)
    }

    return {
      success: true,
      data: data as BackupJob,
    }
  } catch (error) {
    console.error('Get backup job failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢備份記錄失敗',
    }
  }
}

/**
 * 刪除備份記錄與檔案
 * @param jobId 備份任務 ID
 */
export async function deleteBackupJob(
  jobId: string
): Promise<ActionResult<void>> {
  try {
    // 權限檢查
    const auth = await checkAdminAuth()
    if (!auth) {
      return {
        success: false,
        message: '權限不足：僅管理員可刪除備份',
      }
    }

    const supabase = await createClient()

    // 1. 查詢備份記錄
    const { data: job, error: fetchError } = await supabase
      .from('backup_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      throw new Error(`Backup job not found: ${jobId}`)
    }

    // 2. 刪除 GCS 檔案（若備份成功）
    if (job.status === 'success' && job.storage_provider === 'gcs') {
      try {
        await deleteGCSBackup(job.filename)
      } catch (error) {
        console.warn(`Failed to delete GCS file: ${job.filename}`, error)
        // 繼續刪除資料庫記錄
      }
    }

    // 3. 刪除資料庫記錄
    const { error: deleteError } = await supabase
      .from('backup_jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      throw new Error(`Failed to delete backup job: ${deleteError.message}`)
    }

    return {
      success: true,
      message: '備份已刪除',
    }
  } catch (error) {
    console.error('Delete backup job failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除備份失敗',
    }
  }
}

/**
 * 取得備份系統設定
 */
export async function getBackupSettings(): Promise<ActionResult<BackupSettings>> {
  try {
    // 權限檢查
    const auth = await checkAdminAuth()
    if (!auth) {
      return {
        success: false,
        message: '權限不足：僅管理員可查看備份設定',
      }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'backup_enabled',
        'backup_max_keep',
        'backup_storage_provider',
        'backup_last_success',
        'backup_last_error',
      ])

    if (error) {
      throw new Error(`Failed to fetch backup settings: ${error.message}`)
    }

    // 轉換為 BackupSettings 格式
    const settings: BackupSettings = {
      backup_enabled: true,
      backup_max_keep: 10,
      backup_storage_provider: 'gcs',
      backup_last_success: '',
      backup_last_error: '',
    }

    data.forEach((item) => {
      const key = item.key as keyof BackupSettings
      if (key === 'backup_enabled') {
        settings[key] = item.value === 'true'
      } else if (key === 'backup_max_keep') {
        settings[key] = parseInt(item.value, 10)
      } else if (key === 'backup_storage_provider') {
        settings[key] = item.value as 'gcs' | 'vercel_blob'
      } else {
        settings[key] = item.value
      }
    })

    return {
      success: true,
      data: settings,
    }
  } catch (error) {
    console.error('Get backup settings failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢備份設定失敗',
    }
  }
}

/**
 * 更新備份系統設定
 * @param settings 部分設定（僅更新提供的欄位）
 */
export async function updateBackupSettings(
  settings: Partial<BackupSettings>
): Promise<ActionResult<void>> {
  try {
    // 權限檢查
    const auth = await checkAdminAuth()
    if (!auth) {
      return {
        success: false,
        message: '權限不足：僅管理員可修改備份設定',
      }
    }

    const supabase = await createClient()

    // 更新每個設定值
    for (const [key, value] of Object.entries(settings)) {
      const stringValue =
        typeof value === 'boolean' ? value.toString() : String(value)

      const { error } = await supabase
        .from('system_settings')
        .update({ value: stringValue })
        .eq('key', key)

      if (error) {
        throw new Error(`Failed to update setting ${key}: ${error.message}`)
      }
    }

    return {
      success: true,
      message: '備份設定已更新',
    }
  } catch (error) {
    console.error('Update backup settings failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新備份設定失敗',
    }
  }
}
