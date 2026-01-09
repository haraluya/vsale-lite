/**
 * Vercel Blob Storage 整合
 * 用作 GCS 的備援儲存（當 GCS 上傳失敗時自動切換）
 */

import { put, del } from '@vercel/blob'

/**
 * 上傳備份到 Vercel Blob
 * @param filename 檔案名稱（例: vsale-backup-20260109-020000.sql.gz）
 * @param buffer 檔案 Buffer
 * @returns Vercel Blob URL
 */
export async function uploadToVercelBlob(
  filename: string,
  buffer: Buffer
): Promise<string> {
  try {
    // 上傳到 Vercel Blob（路徑: backups/filename）
    const blob = await put(`backups/${filename}`, buffer, {
      access: 'public', // 公開存取（使用簽名 URL 保護）
      addRandomSuffix: false, // 不自動加隨機後綴
    })

    console.log(`[Vercel Blob] Upload successful: ${filename}`)
    return blob.url
  } catch (error) {
    console.error(`[Vercel Blob] Upload failed: ${filename}`, error)
    throw new Error(
      `Vercel Blob upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * 從 Vercel Blob 刪除備份
 * @param url Vercel Blob URL（完整 URL）
 */
export async function deleteFromVercelBlob(url: string): Promise<void> {
  try {
    await del(url)
    console.log(`[Vercel Blob] Delete successful: ${url}`)
  } catch (error) {
    console.error(`[Vercel Blob] Delete failed: ${url}`, error)
    throw new Error(
      `Vercel Blob delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * 從 Vercel Blob 下載備份
 * @param url Vercel Blob URL（完整 URL）
 * @returns 檔案 Buffer
 */
export async function downloadFromVercelBlob(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`[Vercel Blob] Download successful: ${url}`)
    return buffer
  } catch (error) {
    console.error(`[Vercel Blob] Download failed: ${url}`, error)
    throw new Error(
      `Vercel Blob download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
