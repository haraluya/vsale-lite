/**
 * 備份清理邏輯
 * 負責滾動刪除舊備份，保留最近 N 個自動備份
 */

import { createClient } from '@/lib/supabase/server'
import { deleteBackup } from '@/lib/cloud-storage/gcs'

/**
 * 滾動刪除舊的自動備份
 * @param maxKeep 保留的備份數量（預設 10）
 * @returns 刪除統計資訊
 */
export async function cleanupOldBackups(maxKeep: number = 10): Promise<{
  deleted_count: number
  deleted_size_bytes: number
}> {
  const supabase = await createClient()

  try {
    // 1. 查詢所有成功的自動備份，依建立時間降序排列
    const { data: allBackups, error: fetchError } = await supabase
      .from('backup_jobs')
      .select('id, filename, file_size, storage_provider')
      .eq('backup_type', 'auto')
      .eq('status', 'success')
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch backup jobs: ${fetchError.message}`)
    }

    if (!allBackups || allBackups.length === 0) {
      console.log('No auto backups found, skipping cleanup')
      return { deleted_count: 0, deleted_size_bytes: 0 }
    }

    // 2. 計算需要刪除的備份（保留最新的 maxKeep 個）
    const backupsToDelete = allBackups.slice(maxKeep)

    if (backupsToDelete.length === 0) {
      console.log(`Current backup count (${allBackups.length}) is within limit (${maxKeep}), skipping cleanup`)
      return { deleted_count: 0, deleted_size_bytes: 0 }
    }

    console.log(`Cleaning up ${backupsToDelete.length} old backups (keeping ${maxKeep} most recent)`)

    let deletedCount = 0
    let deletedSizeBytes = 0

    // 3. 批次刪除舊備份
    for (const backup of backupsToDelete) {
      try {
        // 3.1 從雲端儲存刪除檔案（僅 GCS）
        if (backup.storage_provider === 'gcs') {
          try {
            await deleteBackup(backup.filename)
            console.log(`Deleted GCS file: ${backup.filename}`)
          } catch (error) {
            console.warn(`Failed to delete GCS file ${backup.filename}:`, error)
            // 繼續刪除資料庫記錄
          }
        }

        // 3.2 從資料庫刪除記錄
        const { error: deleteError } = await supabase
          .from('backup_jobs')
          .delete()
          .eq('id', backup.id)

        if (deleteError) {
          console.error(`Failed to delete backup job ${backup.id}:`, deleteError)
          continue
        }

        deletedCount++
        deletedSizeBytes += backup.file_size

        console.log(`Deleted backup: ${backup.filename} (${(backup.file_size / 1024 / 1024).toFixed(2)} MB)`)
      } catch (error) {
        console.error(`Failed to delete backup ${backup.filename}:`, error)
        // 繼續處理下一個備份
      }
    }

    console.log(
      `Cleanup completed: ${deletedCount} backups deleted, ${(deletedSizeBytes / 1024 / 1024).toFixed(2)} MB freed`
    )

    return {
      deleted_count: deletedCount,
      deleted_size_bytes: deletedSizeBytes,
    }
  } catch (error) {
    console.error('Cleanup failed:', error)
    throw error
  }
}
