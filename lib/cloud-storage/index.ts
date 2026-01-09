/**
 * 雲端儲存統一介面
 * 僅使用 GCS 儲存備份（避免 Vercel Blob 因大檔案產生費用）
 */

import { uploadBackupFromBuffer as uploadToGCS, deleteBackup as deleteGCSBackup, downloadBackupFile as downloadGCS } from './gcs'
import { deleteFromVercelBlob, downloadFromVercelBlob } from './vercel-blob'

export interface UploadResult {
  storage_provider: 'gcs' | 'vercel_blob'
  storage_url: string
  error_message?: string
}

/**
 * 上傳備份到 GCS（僅使用 GCS，不自動切換到 Vercel Blob）
 *
 * @param filename 檔案名稱（例: vsale-backup-20260109-020000.sql.gz）
 * @param buffer 檔案 Buffer
 * @returns UploadResult 包含 storage_provider 與 storage_url
 */
export async function uploadBackup(
  filename: string,
  buffer: Buffer
): Promise<UploadResult> {
  console.log('[Cloud Storage] Uploading to GCS...')

  try {
    const gcsUrl = await uploadToGCS(filename, buffer)

    console.log('[Cloud Storage] GCS upload successful')
    return {
      storage_provider: 'gcs',
      storage_url: gcsUrl,
    }
  } catch (gcsError) {
    console.error('[Cloud Storage] GCS upload failed:', gcsError)

    // 不再自動切換到 Vercel Blob，直接拋出錯誤
    throw new Error(
      `GCS 上傳失敗: ${gcsError instanceof Error ? gcsError.message : 'Unknown error'}`
    )
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
