/**
 * 資料庫還原核心邏輯
 * 負責下載備份檔案、解壓縮、執行 SQL
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, createReadStream, unlinkSync, existsSync } from 'fs'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import path from 'path'
import os from 'os'
import { createClient } from '@/lib/supabase/server'
import { downloadBackup } from '@/lib/cloud-storage'

const execAsync = promisify(exec)

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
 * 執行 SQL 還原
 * @param sqlPath SQL 檔案路徑
 * @param onProgress 進度回調函數
 */
async function executeSQLRestore(
  sqlPath: string,
  onProgress?: RestoreProgressCallback
): Promise<void> {
  validateDBConfig()

  try {
    onProgress?.({
      stage: 'restoring',
      message: '正在還原資料庫...',
      percentage: 70,
    })

    // Windows 平台使用不同的密碼設定方式
    const isWindows = process.platform === 'win32'

    let command: string
    if (isWindows) {
      // Windows: 使用 PowerShell 設定環境變數
      command = `powershell -Command "$env:PGPASSWORD='${DB_CONFIG.password}'; & psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f '${sqlPath}'"`
    } else {
      // Linux/macOS: 使用 PGPASSWORD 環境變數
      command = `PGPASSWORD="${DB_CONFIG.password}" psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${sqlPath}"`
    }

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 600000, // 10 分鐘 timeout
    })

    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('psql stderr:', stderr)
    }

    onProgress?.({
      stage: 'restoring',
      message: '資料庫還原完成',
      percentage: 90,
    })
  } catch (error) {
    throw new Error(`執行 SQL 還原失敗: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    // 清理 SQL 檔案
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
