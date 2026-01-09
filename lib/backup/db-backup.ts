/**
 * 資料庫備份核心邏輯
 * 負責執行 pg_dump、壓縮、上傳、記錄備份任務
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { createReadStream, createWriteStream, statSync, unlinkSync } from 'fs'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import path from 'path'
import os from 'os'
import { createClient } from '@/lib/supabase/server'
import { uploadBackup } from '@/lib/cloud-storage'
import { readFileSync } from 'fs'
import { cleanupOldBackups } from '@/lib/backup/cleanup'
import { backupStorage } from '@/lib/backup/storage-backup'
import type { BackupMetadata, BackupJob } from '@/types'

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
      `Missing required database environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all DB_* variables are set correctly.'
    )
  }
}

/**
 * 產生備份檔案名稱
 * 格式：vsale-backup-YYYYMMDD-HHMMSS.sql.gz
 */
function generateBackupFilename(): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15) // YYYYMMDD-HHMMSS
  return `vsale-backup-${timestamp}.sql.gz`
}

/**
 * 執行資料庫備份（優先使用 Supabase CLI，fallback 到 pg_dump）
 * @param outputPath 輸出檔案路徑（.sql）
 */
async function createDatabaseDump(outputPath: string): Promise<void> {
  // 驗證資料庫連線資訊
  validateDBConfig()

  // 方案 1: 優先使用 Supabase CLI（不需要安裝 PostgreSQL）
  try {
    // ✅ 修正：使用 --data-only 僅備份資料，避免 CREATE TABLE 衝突
    const supabaseCommand = `supabase db dump --linked --data-only -f "${outputPath}"`

    const { stdout, stderr } = await execAsync(supabaseCommand, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    })

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('Connecting to remote database')) {
      console.warn('supabase db dump stderr:', stderr)
    }

    console.log('Database dump completed using Supabase CLI (data-only mode)')
    return
  } catch (supabaseError) {
    console.warn('Supabase CLI dump failed, trying pg_dump...', supabaseError)
  }

  // 方案 2: Fallback 到 pg_dump（需要安裝 PostgreSQL 客戶端工具）
  try {
    // ✅ 修正：新增 --data-only 參數僅備份資料
    const pgDumpCommand = `pg_dump -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -F p --data-only --no-owner --no-acl -f "${outputPath}"`

    const { stdout, stderr } = await execAsync(pgDumpCommand, {
      maxBuffer: 50 * 1024 * 1024,
      env: {
        ...process.env,
        PGPASSWORD: DB_CONFIG.password, // 透過環境變數傳遞密碼（跨平台支援）
      },
    })

    if (stderr && !stderr.includes('WARNING')) {
      console.warn('pg_dump stderr:', stderr)
    }

    console.log('Database dump completed using pg_dump')
  } catch (pgDumpError) {
    console.error('Both Supabase CLI and pg_dump failed')
    throw new Error(
      `資料庫備份失敗。請確保已安裝 PostgreSQL 客戶端工具或 Supabase CLI 設定正確。\n` +
      `錯誤訊息: ${pgDumpError instanceof Error ? pgDumpError.message : '未知錯誤'}\n\n` +
      `解決方案：\n` +
      `1. 安裝 PostgreSQL: https://www.postgresql.org/download/windows/\n` +
      `2. 或確保 Supabase CLI 已正確連線到遠端專案 (supabase link)`
    )
  }
}

/**
 * 壓縮備份檔案（gzip）
 * @param inputPath 輸入檔案路徑（.sql）
 * @param outputPath 輸出檔案路徑（.sql.gz）
 */
async function compressBackup(inputPath: string, outputPath: string): Promise<void> {
  try {
    const source = createReadStream(inputPath)
    const destination = createWriteStream(outputPath)
    const gzip = createGzip({ level: 9 }) // 最大壓縮率

    await pipeline(source, gzip, destination)
  } catch (error) {
    console.error('Compression failed:', error)
    throw new Error(`Backup compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 計算備份元數據（統計資訊）
 * @param sqlFilePath 原始 SQL 檔案路徑
 * @param gzFilePath 壓縮後檔案路徑
 * @param durationMs 備份耗時（毫秒）
 */
async function calculateBackupMetadata(
  sqlFilePath: string,
  gzFilePath: string,
  durationMs: number
): Promise<BackupMetadata> {
  const supabase = await createClient()

  // 取得檔案大小
  const originalSize = statSync(sqlFilePath).size
  const compressedSize = statSync(gzFilePath).size
  const compressionRatio = parseFloat((compressedSize / originalSize).toFixed(2))

  // 查詢資料表統計資訊
  const tables = [
    'profiles',
    'tiers',
    'categories',
    'series',
    'products',
    'tier_prices',
    'orders',
    'order_items',
    'order_timelines',
    'order_custom_fees',
    'coupons',
    'user_coupons',
    'coupon_tier_restrictions',
    'coupon_series_restrictions',
    'order_coupons',
    'admin_users',
    'audit_logs',
    'system_settings',
    'backup_jobs',
  ]

  const tableStats: Record<string, { rows: number; size_bytes: number }> = {}
  let totalRows = 0

  // 查詢每個表的記錄數（批次查詢）
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error && count !== null) {
        tableStats[table] = {
          rows: count,
          size_bytes: 0, // PostgreSQL 需要額外查詢，這裡簅0
        }
        totalRows += count
      }
    } catch (error) {
      console.warn(`Failed to query table ${table}:`, error)
    }
  }

  return {
    tables: tables.length,
    rows: totalRows,
    compression_ratio: compressionRatio,
    original_size: originalSize,
    compressed_size: compressedSize,
    duration_ms: durationMs,
    table_stats: tableStats,
  }
}

/**
 * 執行完整備份流程
 * @param backupType 備份類型（'auto' | 'manual'）
 * @param userId 執行者 ID（手動備份時提供）
 * @returns 備份任務 ID
 */
export async function performBackup(
  backupType: 'auto' | 'manual',
  userId?: string
): Promise<string> {
  const supabase = await createClient()
  const startTime = Date.now()

  // 產生備份檔案名稱
  const filename = generateBackupFilename()
  const tempDir = os.tmpdir()
  const sqlFilePath = path.join(tempDir, filename.replace('.gz', ''))
  const gzFilePath = path.join(tempDir, filename)

  let backupJobId: string | undefined = undefined

  try {
    // 1. 建立備份任務記錄（status = 'in_progress'）
    const { data: backupJob, error: createError } = await supabase
      .from('backup_jobs')
      .insert({
        filename,
        file_size: 0, // 稍後更新
        storage_provider: 'gcs',
        storage_url: '', // 稍後更新
        backup_type: backupType,
        status: 'in_progress',
        created_by: userId || null,
      })
      .select()
      .single()

    if (createError || !backupJob) {
      throw new Error(`Failed to create backup job record: ${createError?.message}`)
    }

    backupJobId = backupJob.id

    if (!backupJobId) {
      throw new Error('Backup job ID is missing')
    }

    // 2. 執行 pg_dump
    await createDatabaseDump(sqlFilePath)

    // 3. 壓縮備份檔案
    await compressBackup(sqlFilePath, gzFilePath)

    // 4. 上傳到雲端（自動切換邏輯：GCS 優先，失敗時切換到 Vercel Blob）
    const buffer = readFileSync(gzFilePath)
    const uploadResult = await uploadBackup(filename, buffer)

    // 5. 計算備份元數據
    const durationMs = Date.now() - startTime
    const metadata = await calculateBackupMetadata(sqlFilePath, gzFilePath, durationMs)

    // 6. 更新備份任務記錄（status = 'success'）
    const { error: updateError } = await supabase
      .from('backup_jobs')
      .update({
        file_size: metadata.compressed_size,
        storage_provider: uploadResult.storage_provider,
        storage_url: uploadResult.storage_url,
        status: 'success',
        metadata,
        error_message: uploadResult.error_message || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', backupJobId)

    if (updateError) {
      throw new Error(`Failed to update backup job: ${updateError.message}`)
    }

    // 7. 更新 system_settings（上次成功時間）
    await supabase
      .from('system_settings')
      .update({ value: new Date().toISOString() })
      .eq('key', 'backup_last_success')

    await supabase
      .from('system_settings')
      .update({ value: '' })
      .eq('key', 'backup_last_error')

    // 8. 滾動刪除舊備份（僅自動備份）
    if (backupType === 'auto') {
      try {
        // 查詢保留數量設定
        const { data: maxKeepSetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'backup_max_keep')
          .single()

        const maxKeep = maxKeepSetting ? parseInt(maxKeepSetting.value, 10) : 10

        console.log(`Executing cleanup: keeping ${maxKeep} most recent auto backups`)
        const cleanupResult = await cleanupOldBackups(maxKeep)

        if (cleanupResult.deleted_count > 0) {
          console.log(
            `Cleanup completed: ${cleanupResult.deleted_count} backups deleted, ` +
            `${(cleanupResult.deleted_size_bytes / 1024 / 1024).toFixed(2)} MB freed`
          )
        }
      } catch (error) {
        console.error('Cleanup failed (non-critical):', error)
        // 清理失敗不影響備份成功
      }
    }

    // 9. 清理臨時檔案
    unlinkSync(sqlFilePath)
    unlinkSync(gzFilePath)

    console.log(`Backup completed successfully: ${filename}`)
    return backupJobId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Backup failed:', errorMessage)

    // 更新備份任務記錄（status = 'failed'）
    if (backupJobId) {
      await supabase
        .from('backup_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupJobId)
    }

    // 更新 system_settings（上次錯誤訊息）
    await supabase
      .from('system_settings')
      .update({ value: errorMessage })
      .eq('key', 'backup_last_error')

    // 清理臨時檔案（如果存在）
    try {
      if (sqlFilePath) unlinkSync(sqlFilePath)
      if (gzFilePath) unlinkSync(gzFilePath)
    } catch {}

    throw error
  }
}

/**
 * 備份進度回報型別
 */
export type BackupProgress = {
  stage:
    | 'starting'
    | 'dumping'
    | 'compressing'
    | 'backing_up_storage'
    | 'uploading'
    | 'calculating'
    | 'updating'
    | 'cleanup'
    | 'completed'
    | 'error'
  message: string
  percentage?: number
}

/**
 * 執行完整備份流程（支援進度回報）
 * @param backupType 備份類型（'auto' | 'manual'）
 * @param userId 執行者 ID（手動備份時提供）
 * @param onProgress 進度回報回調函數
 * @param includeStorage 是否包含 Supabase Storage 圖片備份
 * @returns 備份任務 ID
 */
export async function performBackupWithProgress(
  backupType: 'auto' | 'manual',
  userId: string | undefined,
  onProgress: (progress: BackupProgress) => void,
  includeStorage = false
): Promise<string> {
  const supabase = await createClient()
  const startTime = Date.now()

  // 產生備份檔案名稱
  const filename = generateBackupFilename()
  const tempDir = os.tmpdir()
  const sqlFilePath = path.join(tempDir, filename.replace('.gz', ''))
  const gzFilePath = path.join(tempDir, filename)

  let backupJobId: string | undefined = undefined

  try {
    // 1. 建立備份任務記錄
    onProgress({ stage: 'starting', message: '建立備份任務記錄...', percentage: 0 })

    const { data: backupJob, error: createError } = await supabase
      .from('backup_jobs')
      .insert({
        filename,
        file_size: 0,
        storage_provider: 'gcs',
        storage_url: '',
        backup_type: backupType,
        status: 'in_progress',
        created_by: userId || null,
      })
      .select()
      .single()

    if (createError || !backupJob) {
      throw new Error(`Failed to create backup job record: ${createError?.message}`)
    }

    backupJobId = backupJob.id

    if (!backupJobId) {
      throw new Error('Backup job ID is missing')
    }

    // 2. 執行資料庫備份
    onProgress({ stage: 'dumping', message: '正在匯出資料庫...', percentage: 20 })
    await createDatabaseDump(sqlFilePath)

    // 3. 壓縮備份檔案
    onProgress({ stage: 'compressing', message: '正在壓縮備份檔案...', percentage: 40 })
    await compressBackup(sqlFilePath, gzFilePath)

    // 4. 備份 Storage（如果需要）
    let storageZipPath: string | null = null
    if (includeStorage) {
      onProgress({
        stage: 'backing_up_storage',
        message: '正在備份 Supabase Storage 圖片...',
        percentage: 50,
      })
      storageZipPath = await backupStorage()
    }

    // 5. 上傳到雲端（資料庫備份）
    onProgress({ stage: 'uploading', message: '正在上傳資料庫備份到雲端儲存...', percentage: 60 })
    const buffer = readFileSync(gzFilePath)
    const uploadResult = await uploadBackup(filename, buffer)

    // 6. 上傳 Storage ZIP（如果有）
    if (storageZipPath) {
      onProgress({ stage: 'uploading', message: '正在上傳 Storage 圖片備份...', percentage: 70 })
      const storageFilename = filename.replace('.sql.gz', '-storage.zip')
      const storageBuffer = readFileSync(storageZipPath)
      await uploadBackup(storageFilename, storageBuffer)
    }

    // 5. 計算備份元數據
    onProgress({ stage: 'calculating', message: '正在計算備份統計資訊...', percentage: 80 })
    const durationMs = Date.now() - startTime
    const metadata = await calculateBackupMetadata(sqlFilePath, gzFilePath, durationMs)

    // 7. 更新備份任務記錄
    onProgress({ stage: 'updating', message: '正在更新備份記錄...', percentage: 90 })
    const { error: updateError } = await supabase
      .from('backup_jobs')
      .update({
        file_size: metadata.compressed_size,
        storage_provider: uploadResult.storage_provider,
        storage_url: uploadResult.storage_url,
        status: 'success',
        metadata,
        error_message: uploadResult.error_message || null,
        includes_storage: includeStorage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', backupJobId)

    if (updateError) {
      throw new Error(`Failed to update backup job: ${updateError.message}`)
    }

    // 7. 更新 system_settings
    await supabase
      .from('system_settings')
      .update({ value: new Date().toISOString() })
      .eq('key', 'backup_last_success')

    await supabase.from('system_settings').update({ value: '' }).eq('key', 'backup_last_error')

    // 8. 滾動刪除舊備份（僅自動備份）
    if (backupType === 'auto') {
      onProgress({ stage: 'cleanup', message: '正在清理舊備份...', percentage: 95 })
      try {
        const { data: maxKeepSetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'backup_max_keep')
          .single()

        const maxKeep = maxKeepSetting ? parseInt(maxKeepSetting.value, 10) : 10

        console.log(`Executing cleanup: keeping ${maxKeep} most recent auto backups`)
        const cleanupResult = await cleanupOldBackups(maxKeep)

        if (cleanupResult.deleted_count > 0) {
          console.log(
            `Cleanup completed: ${cleanupResult.deleted_count} backups deleted, ` +
              `${(cleanupResult.deleted_size_bytes / 1024 / 1024).toFixed(2)} MB freed`
          )
        }
      } catch (error) {
        console.error('Cleanup failed (non-critical):', error)
      }
    }

    // 9. 清理臨時檔案
    unlinkSync(sqlFilePath)
    unlinkSync(gzFilePath)
    if (storageZipPath) {
      unlinkSync(storageZipPath)
    }

    // 10. 完成
    onProgress({ stage: 'completed', message: '備份完成！', percentage: 100 })

    console.log(`Backup completed successfully: ${filename}`)
    return backupJobId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Backup failed:', errorMessage)

    // 回報錯誤
    onProgress({ stage: 'error', message: errorMessage })

    // 更新備份任務記錄（status = 'failed'）
    if (backupJobId) {
      await supabase
        .from('backup_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupJobId)
    }

    // 更新 system_settings
    await supabase.from('system_settings').update({ value: errorMessage }).eq('key', 'backup_last_error')

    // 清理臨時檔案
    try {
      if (sqlFilePath) unlinkSync(sqlFilePath)
      if (gzFilePath) unlinkSync(gzFilePath)
    } catch {}

    throw error
  }
}

