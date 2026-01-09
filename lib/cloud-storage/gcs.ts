/**
 * Google Cloud Storage 客戶端
 * 負責備份檔案的上傳、列表、刪除、下載操作
 */

import { Storage } from '@google-cloud/storage'
import type { BackupJob } from '@/types'

// GCS 配置
const GCS_CONFIG = {
  projectId: process.env.GCS_PROJECT_ID!,
  bucketName: process.env.GCS_BUCKET_NAME!,
  keyFilePath: process.env.GCS_KEY_FILE_PATH, // 可選（開發時使用）
  credentials: process.env.GCS_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY)
    : (process.env.GCS_CREDENTIALS ? JSON.parse(process.env.GCS_CREDENTIALS) : undefined), // 向後相容
}

// 初始化 GCS Client
let storageClient: Storage | null = null

function getStorageClient(): Storage {
  if (!storageClient) {
    const options: ConstructorParameters<typeof Storage>[0] = {
      projectId: GCS_CONFIG.projectId,
    }

    // 優先使用 credentials JSON（生產環境）
    if (GCS_CONFIG.credentials) {
      options.credentials = GCS_CONFIG.credentials
    }
    // 開發時使用 keyFilePath
    else if (GCS_CONFIG.keyFilePath) {
      options.keyFilename = GCS_CONFIG.keyFilePath
    }

    storageClient = new Storage(options)
  }

  return storageClient
}

/**
 * 上傳備份檔案到 GCS
 * @param localFilePath 本地檔案路徑
 * @param filename 儲存的檔案名稱（例如：vsale-backup-20260109-020000.sql.gz）
 * @returns GCS 儲存 URL（gs://bucket/filename）
 */
export async function uploadBackup(
  localFilePath: string,
  filename: string
): Promise<string> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_CONFIG.bucketName)
  const file = bucket.file(filename)

  try {
    // 上傳檔案（使用串流）
    await bucket.upload(localFilePath, {
      destination: filename,
      metadata: {
        contentType: 'application/gzip',
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'vsale-auto-backup',
        },
      },
    })

    // 回傳 GCS URL
    return `gs://${GCS_CONFIG.bucketName}/${filename}`
  } catch (error) {
    console.error('GCS upload failed:', error)
    throw new Error(`Failed to upload backup to GCS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 上傳備份檔案到 GCS（從 Buffer）
 * @param filename 儲存的檔案名稱（例如：vsale-backup-20260109-020000.sql.gz）
 * @param buffer 檔案 Buffer
 * @returns GCS 儲存 URL（gs://bucket/filename）
 */
export async function uploadBackupFromBuffer(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_CONFIG.bucketName)
  const file = bucket.file(filename)

  try {
    // 上傳 Buffer 到 GCS
    await file.save(buffer, {
      metadata: {
        contentType: 'application/gzip',
        metadata: {
          uploadedAt: new Date().toISOString(),
        },
      },
    })

    console.log(`GCS upload successful: gs://${GCS_CONFIG.bucketName}/${filename}`)
    return `gs://${GCS_CONFIG.bucketName}/${filename}`
  } catch (error) {
    console.error('GCS upload from buffer failed:', error)
    throw new Error(`Failed to upload backup to GCS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 列出所有備份檔案
 * @returns 備份檔案列表（檔名、大小、建立時間）
 */
export async function listBackups(): Promise<
  Array<{
    filename: string
    size: number
    created: Date
    storageUrl: string
  }>
> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_CONFIG.bucketName)

  try {
    const [files] = await bucket.getFiles({
      prefix: 'vsale-backup-', // 僅列出備份檔案
    })

    return files.map((file) => ({
      filename: file.name,
      size: parseInt(String(file.metadata.size || '0'), 10),
      created: new Date(file.metadata.timeCreated || Date.now()),
      storageUrl: `gs://${GCS_CONFIG.bucketName}/${file.name}`,
    }))
  } catch (error) {
    console.error('GCS list failed:', error)
    throw new Error(`Failed to list backups from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 刪除指定備份檔案
 * @param filename 檔案名稱
 */
export async function deleteBackup(filename: string): Promise<void> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_CONFIG.bucketName)
  const file = bucket.file(filename)

  try {
    await file.delete()
  } catch (error) {
    console.error('GCS delete failed:', error)
    throw new Error(`Failed to delete backup from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 下載備份檔案（回傳 Buffer）
 * @param filename 檔案名稱
 * @returns 檔案內容（Buffer）
 */
export async function downloadBackup(filename: string): Promise<Buffer> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_CONFIG.bucketName)
  const file = bucket.file(filename)

  try {
    const [buffer] = await file.download()
    return buffer
  } catch (error) {
    console.error('GCS download failed:', error)
    throw new Error(`Failed to download backup from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 產生臨時簽名下載 URL
 * @param filename 檔案名稱
 * @param expiresIn 有效期（秒），預設 3600（1 小時）
 * @returns 臨時簽名 URL
 */
export async function getDownloadUrl(filename: string, expiresIn = 3600): Promise<string> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_CONFIG.bucketName)
  const file = bucket.file(filename)

  try {
    // 產生臨時簽名 URL
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    })

    return url
  } catch (error) {
    console.error('GCS getDownloadUrl failed:', error)
    throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 檢查 GCS 連線狀態
 * @returns 連線是否正常
 */
export async function checkGCSConnection(): Promise<boolean> {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_CONFIG.bucketName)
    await bucket.exists()
    return true
  } catch (error) {
    console.error('GCS connection check failed:', error)
    return false
  }
}
