/**
 * 資料庫還原核心邏輯
 * 負責下載備份檔案、解壓縮、執行 SQL
 */

import { createWriteStream, createReadStream, unlinkSync, existsSync, readFileSync } from 'fs'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import path from 'path'
import os from 'os'
import { Client } from 'pg'
import { createClient } from '@/lib/supabase/server'
import { downloadBackup } from '@/lib/cloud-storage'

// 資料庫連線資訊（從環境變數讀取）
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}

// 驗證資料庫連線資訊
function validateDBConfig(): void {
  const missingVars: string[] = []
  if (!DB_CONFIG.host) missingVars.push('DB_HOST')
  if (!DB_CONFIG.port) missingVars.push('DB_PORT')
  if (!DB_CONFIG.database) missingVars.push('DB_NAME')
  if (!DB_CONFIG.user) missingVars.push('DB_USER')
  if (!DB_CONFIG.password) missingVars.push('DB_PASSWORD')

  if (missingVars.length > 0) {
    throw new Error(
      `缺少必要的資料庫環境變數: ${missingVars.join(', ')}\n` +
      '請檢查 .env.local 檔案，確保所有 DB_* 變數已正確設定。'
    )
  }
}

/**
 * 進度回調函數型別
 */
export type RestoreProgressCallback = (progress: {
  stage: 'downloading' | 'decompressing' | 'restoring' | 'completed' | 'error'
  message: string
  percentage: number
  error?: string
}) => void

/**
 * 下載並解壓縮備份檔案
 * @param filename 備份檔案名稱
 * @param storageProvider 儲存位置 ('gcs' | 'vercel_blob')
 * @param storageUrl 儲存 URL
 * @param onProgress 進度回調函數
 * @returns 解壓縮後的 SQL 檔案路徑
 */
async function downloadAndDecompress(
  filename: string,
  storageProvider: 'gcs' | 'vercel_blob',
  storageUrl: string,
  onProgress?: RestoreProgressCallback
): Promise<string> {
  const tempDir = os.tmpdir()
  const gzPath = path.join(tempDir, filename)
  const sqlPath = gzPath.replace(/\.gz$/, '')

  try {
    // Step 1: 下載備份檔案
    onProgress?.({
      stage: 'downloading',
      message: '正在下載備份檔案...',
      percentage: 10,
    })

    const backupBuffer = await downloadBackup(filename, storageProvider, storageUrl)
    const writeStream = createWriteStream(gzPath)
    writeStream.write(backupBuffer)
    writeStream.end()

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    onProgress?.({
      stage: 'downloading',
      message: '備份檔案下載完成',
      percentage: 30,
    })

    // Step 2: 解壓縮 gzip
    onProgress?.({
      stage: 'decompressing',
      message: '正在解壓縮備份檔案...',
      percentage: 40,
    })

    const gunzip = createGunzip()
    const readStream = createReadStream(gzPath)
    const sqlWriteStream = createWriteStream(sqlPath)

    await pipeline(readStream, gunzip, sqlWriteStream)

    onProgress?.({
      stage: 'decompressing',
      message: '解壓縮完成',
      percentage: 60,
    })

    // 刪除 .gz 檔案
    if (existsSync(gzPath)) {
      unlinkSync(gzPath)
    }

    return sqlPath
  } catch (error) {
    // 清理臨時檔案
    if (existsSync(gzPath)) {
      unlinkSync(gzPath)
    }
    if (existsSync(sqlPath)) {
      unlinkSync(sqlPath)
    }

    throw new Error(`下載或解壓縮失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 執行 SQL 還原（使用 pg Client 直接執行 SQL）
 * @param sqlPath SQL 檔案路徑
 * @param onProgress 進度回調函數
 */
async function executeSQLRestore(
  sqlPath: string,
  onProgress?: RestoreProgressCallback
): Promise<void> {
  validateDBConfig()

  // 讀取 SQL 檔案內容
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  // 建立 PostgreSQL Client
  const client = new Client({
    host: DB_CONFIG.host!,
    port: parseInt(DB_CONFIG.port!, 10),
    database: DB_CONFIG.database!,
    user: DB_CONFIG.user!,
    password: DB_CONFIG.password!,
    ssl: {
      rejectUnauthorized: false, // Supabase 使用自簽證書
    },
  })

  try {
    onProgress?.({
      stage: 'restoring',
      message: '正在連線到資料庫...',
      percentage: 70,
    })

    // 連線到資料庫
    await client.connect()
    console.log('Connected to database for restore')

    onProgress?.({
      stage: 'restoring',
      message: '正在執行 SQL 還原...',
      percentage: 75,
    })

    // 執行 SQL（pg_dump 產生的 SQL 是單一大檔案，直接執行）
    await client.query(sqlContent)

    console.log('Database restore completed')

    onProgress?.({
      stage: 'restoring',
      message: '資料庫還原完成',
      percentage: 90,
    })
  } catch (error) {
    console.error('SQL 還原失敗:', error)

    // 提供更詳細的錯誤訊息
    let errorMessage = '未知錯誤'
    if (error instanceof Error) {
      errorMessage = error.message

      // 針對常見錯誤提供解決方案
      if (errorMessage.includes('Tenant or user not found')) {
        errorMessage = '資料庫連線失敗（認證錯誤）\n' +
          '請檢查 .env.local 中的 DB_USER 和 DB_PASSWORD 是否正確。\n' +
          '提示：Supabase Pooler 的使用者名稱格式為 postgres.{project_id}'
      } else if (errorMessage.includes('certificate')) {
        errorMessage = 'SSL 憑證驗證失敗\n' +
          '請確認 DB_HOST 指向正確的 Supabase 連線端點。'
      }
    }

    throw new Error(`執行 SQL 還原失敗: ${errorMessage}`)
  } finally {
    // 確保關閉資料庫連線
    try {
      await client.end()
      console.log('Database connection closed')
    } catch (endError) {
      console.warn('Failed to close database connection:', endError)
    }

    // 清理原始 SQL 檔案
    if (existsSync(sqlPath)) {
      unlinkSync(sqlPath)
    }
  }
}

/**
 * 完整還原流程
 * @param jobId 備份任務 ID
 * @param onProgress 進度回調函數
 */
export async function performRestore(
  jobId: string,
  onProgress?: RestoreProgressCallback
): Promise<void> {
  const supabase = await createClient()

  try {
    onProgress?.({
      stage: 'downloading',
      message: '開始還原流程...',
      percentage: 0,
    })

    // Step 1: 查詢備份記錄
    const { data: job, error: jobError } = await supabase
      .from('backup_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('找不到備份記錄')
    }

    if (job.status !== 'success') {
      throw new Error('僅能還原成功的備份')
    }

    // Step 2: 下載並解壓縮備份檔案
    const sqlPath = await downloadAndDecompress(
      job.filename,
      job.storage_provider as 'gcs' | 'vercel_blob',
      job.storage_url,
      onProgress
    )

    // Step 3: 執行 SQL 還原
    await executeSQLRestore(sqlPath, onProgress)

    // Step 4: 完成
    onProgress?.({
      stage: 'completed',
      message: '資料庫還原成功',
      percentage: 100,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Restore failed:', errorMessage)

    onProgress?.({
      stage: 'error',
      message: '還原失敗',
      percentage: 0,
      error: errorMessage,
    })

    throw error
  }
}
