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
import { uploadBackup } from '@/lib/cloud-storage/gcs'
import { cleanupOldBackups } from '@/lib/backup/cleanup'
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
 * 執行 pg_dump 匯出資料庫
 * @param outputPath 輸出檔案路徑（.sql）
 */
async function createDatabaseDump(outputPath: string): Promise<void> {
  // 驗證資料庫連線資訊
  validateDBConfig()

  // 建立 pg_dump 指令（支援 SSL 連線到 Supabase）
  const pgDumpCommand = `PGPASSWORD="${DB_CONFIG.password}" pg_dump -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -F p --no-owner --no-acl -f "${outputPath}"`

  try {
    const { stdout, stderr } = await execAsync(pgDumpCommand, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      env: {
        ...process.env,
        PGPASSWORD: DB_CONFIG.password,
      },
    })

    if (stderr && !stderr.includes('WARNING')) {
      console.warn('pg_dump stderr:', stderr)
    }
  } catch (error) {
    console.error('pg_dump failed:', error)
    throw new Error(`Database dump failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

    // 4. 上傳到 GCS
    const storageUrl = await uploadBackup(gzFilePath, filename)

    // 5. 計算備份元數據
    const durationMs = Date.now() - startTime
    const metadata = await calculateBackupMetadata(sqlFilePath, gzFilePath, durationMs)

    // 6. 更新備份任務記錄（status = 'success'）
    const { error: updateError } = await supabase
      .from('backup_jobs')
      .update({
        file_size: metadata.compressed_size,
        storage_url: storageUrl,
        status: 'success',
        metadata,
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
