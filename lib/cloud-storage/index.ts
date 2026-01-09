/**
 * 雲端儲存統一介面
 * 實作自動切換邏輯（GCS 失敗時自動切換到 Vercel Blob）
 */

import { uploadBackupFromBuffer as uploadToGCS, deleteBackup as deleteGCSBackup, downloadBackupFile as downloadGCS } from './gcs'
import { uploadToVercelBlob, deleteFromVercelBlob, downloadFromVercelBlob } from './vercel-blob'

export interface UploadResult {
  storage_provider: 'gcs' | 'vercel_blob'
  storage_url: string
  error_message?: string
}

/**
 * 上傳備份到雲端（自動切換邏輯）
 * 優先嘗試 GCS，失敗時自動切換到 Vercel Blob
 *
 * @param filename 檔案名稱（例: vsale-backup-20260109-020000.sql.gz）
 * @param buffer 檔案 Buffer
 * @returns UploadResult 包含 storage_provider 與 storage_url
 */
export async function uploadBackup(
  filename: string,
  buffer: Buffer
): Promise<UploadResult> {
  // 優先嘗試 GCS
  try {
    console.log('[Cloud Storage] Attempting GCS upload...')
    const gcsUrl = await uploadToGCS(filename, buffer) // uploadToGCS 現在接受 (filename, buffer)

    return {
      storage_provider: 'gcs',
      storage_url: gcsUrl,
    }
  } catch (gcsError) {
    console.warn('[Cloud Storage] GCS upload failed, switching to Vercel Blob...', gcsError)

    // GCS 失敗，自動切換到 Vercel Blob
    try {
      const vercelUrl = await uploadToVercelBlob(filename, buffer)

      return {
        storage_provider: 'vercel_blob',
        storage_url: vercelUrl,
        error_message: `GCS 上傳失敗（已切換到 Vercel Blob）: ${gcsError instanceof Error ? gcsError.message : 'Unknown error'}`,
      }
    } catch (vercelError) {
      // 兩個儲存都失敗
      throw new Error(
        `所有雲端儲存均失敗 - GCS: ${gcsError instanceof Error ? gcsError.message : 'Unknown'}, Vercel Blob: ${vercelError instanceof Error ? vercelError.message : 'Unknown'}`
      )
    }
  }
}

/**
 * 刪除備份檔案（根據 storage_provider 選擇刪除方式）
 *
 * @param filename 檔案名稱（GCS 使用）
 * @param storageProvider 儲存位置（'gcs' | 'vercel_blob'）
 * @param storageUrl 完整 URL（Vercel Blob 使用）
 */
export async function deleteBackup(
  filename: string,
  storageProvider: 'gcs' | 'vercel_blob',
  storageUrl: string
): Promise<void> {
  if (storageProvider === 'gcs') {
    await deleteGCSBackup(filename)
  } else if (storageProvider === 'vercel_blob') {
    await deleteFromVercelBlob(storageUrl)
  } else {
    throw new Error(`Unknown storage provider: ${storageProvider}`)
  }
}

/**
 * 下載備份檔案（根據 storage_provider 選擇下載方式）
 *
 * @param filename 檔案名稱（GCS 使用）
 * @param storageProvider 儲存位置（'gcs' | 'vercel_blob'）
 * @param storageUrl 完整 URL（Vercel Blob 使用）
 * @returns 檔案 Buffer
 */
export async function downloadBackup(
  filename: string,
  storageProvider: 'gcs' | 'vercel_blob',
  storageUrl: string
): Promise<Buffer> {
  if (storageProvider === 'gcs') {
    return await downloadGCS(filename)
  } else if (storageProvider === 'vercel_blob') {
    return await downloadFromVercelBlob(storageUrl)
  } else {
    throw new Error(`Unknown storage provider: ${storageProvider}`)
  }
}
