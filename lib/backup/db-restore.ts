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
 * 執行 SQL 還原（使用 Node.js pg Driver）
 *
 * 流程：
 * 1. 連線到 Supabase 資料庫（Session Pooler）
 * 2. 開啟 Transaction（確保原子性）
 * 3. 停用觸發器（SET session_replication_role = replica）
 * 4. 清空資料庫（DROP SCHEMA CASCADE + CREATE SCHEMA）
 * 5. 執行備份 SQL
 * 6. 提交 Transaction（成功）或回滾（失敗）
 *
 * ⚠️ 注意：此操作會完全清空並覆蓋當前資料庫
 *
 * @param sqlPath SQL 檔案路徑
 * @param onProgress 進度回調函數
 */
async function executeSQLRestore(
  sqlPath: string,
  onProgress?: RestoreProgressCallback
): Promise<void> {
  validateDBConfig()

  onProgress?.({
    stage: 'restoring',
    message: '正在連線到資料庫...',
    percentage: 65,
  })

  // 建立 PostgreSQL 客戶端
  const client = new Client({
    host: DB_CONFIG.host,
    port: Number(DB_CONFIG.port),
    database: DB_CONFIG.database,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    ssl: {
      rejectUnauthorized: false, // Supabase 需要 SSL 但使用自簽證書
    },
  })

  try {
    // 連線到資料庫
    await client.connect()
    console.log('Connected to database successfully')

    onProgress?.({
      stage: 'restoring',
      message: '正在準備還原環境...',
      percentage: 70,
    })

    // 開始 Transaction
    await client.query('BEGIN')
    console.log('Transaction started')

    // 停用觸發器（防止雙重加密）
    await client.query('SET session_replication_role = replica')
    console.log('Triggers disabled (session_replication_role = replica)')

    onProgress?.({
      stage: 'restoring',
      message: '正在清空現有資料...',
      percentage: 75,
    })

    // 清空資料庫
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
    await client.query('GRANT ALL ON SCHEMA public TO postgres')
    await client.query('GRANT ALL ON SCHEMA public TO public')
    console.log('Database schema cleared')

    onProgress?.({
      stage: 'restoring',
      message: '正在還原備份資料...',
      percentage: 80,
    })

    // 讀取並執行備份 SQL
    const sql = readFileSync(sqlPath, 'utf-8')
    await client.query(sql)
    console.log('Backup SQL executed successfully')

    // 提交 Transaction
    await client.query('COMMIT')
    console.log('Transaction committed')

    onProgress?.({
      stage: 'restoring',
      message: '資料庫還原完成',
      percentage: 90,
    })
  } catch (error) {
    // 回滾 Transaction（確保資料一致性）
    try {
      await client.query('ROLLBACK')
      console.log('Transaction rolled back due to error')
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError)
    }

    console.error('SQL 還原失敗:', error)

    // 提供更詳細的錯誤訊息
    let errorMessage = '未知錯誤'
    if (error instanceof Error) {
      errorMessage = error.message

      // 特殊錯誤處理
      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = '無法連線到資料庫，請檢查網路連線或資料庫設定'
      } else if (errorMessage.includes('authentication failed')) {
        errorMessage = '資料庫認證失敗，請檢查 DB_USER 和 DB_PASSWORD 設定'
      } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
        errorMessage = '資料庫不存在，請檢查 DB_NAME 設定'
      }
    }

    throw new Error(`執行 SQL 還原失敗: ${errorMessage}`)
  } finally {
    // 關閉資料庫連線
    try {
      await client.end()
      console.log('Database connection closed')
    } catch (closeError) {
      console.warn('Failed to close database connection:', closeError)
    }

    // 清理 SQL 檔案
    if (existsSync(sqlPath)) {
      unlinkSync(sqlPath)
      console.log('SQL file cleaned up')
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
