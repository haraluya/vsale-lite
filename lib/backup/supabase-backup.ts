/**
 * Supabase 原生備份方案
 * 使用 Supabase API 直接查詢資料，無需 pg_dump
 * 適用於 Vercel Serverless 環境
 */

import { createClient } from '@/lib/supabase/server'
import { uploadBackup } from '@/lib/cloud-storage'
import { cleanupOldBackups } from './cleanup'
import type { BackupMetadata } from '@/types'
import { createGzip } from 'zlib'
import { Readable } from 'stream'

/**
 * 需要備份的資料表清單
 */
const BACKUP_TABLES = [
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

/**
 * 產生備份檔案名稱
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
 * 將資料表轉換為 SQL INSERT 語句
 */
function generateInsertStatements(tableName: string, rows: any[]): string {
  if (rows.length === 0) return ''

  const lines: string[] = []

  // 產生 INSERT 語句（使用 ON CONFLICT DO NOTHING 避免重複插入）
  for (const row of rows) {
    const columns = Object.keys(row)
    const values = columns.map(col => {
      const value = row[col]

      if (value === null) return 'NULL'
      if (typeof value === 'string') {
        // 處理字串中的單引號
        return `'${value.replace(/'/g, "''")}'`
      }
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      if (typeof value === 'object') {
        // JSON 物件
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`
      }
      return String(value)
    })

    lines.push(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`
    )
  }

  return lines.join('\n')
}

/**
 * 備份單一資料表
 */
async function backupTable(supabase: any, tableName: string): Promise<string> {
  console.log(`Backing up table: ${tableName}`)

  // 查詢所有資料
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`Failed to backup table ${tableName}:`, error)
    throw new Error(`Failed to backup table ${tableName}: ${error.message}`)
  }

  if (!data || data.length === 0) {
    console.log(`Table ${tableName} is empty, skipping`)
    return `-- Table ${tableName} is empty\n`
  }

  console.log(`Table ${tableName}: ${data.length} rows`)

  // 產生 SQL
  const sql = generateInsertStatements(tableName, data)

  return `-- Table: ${tableName} (${data.length} rows)\n${sql}\n\n`
}

/**
 * 壓縮字串為 gzip
 */
async function compressString(content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = []
    const readable = Readable.from([content])
    const gzip = createGzip({ level: 9 })

    gzip.on('data', (chunk) => buffers.push(chunk))
    gzip.on('end', () => resolve(Buffer.concat(buffers)))
    gzip.on('error', reject)

    readable.pipe(gzip)
  })
}

/**
 * 執行完整備份流程（使用 Supabase API）
 * @param backupType 備份類型（'auto' | 'manual'）
 * @param userId 執行者 ID（手動備份時提供）
 * @returns 備份任務 ID
 */
export async function performSupabaseBackup(
  backupType: 'auto' | 'manual',
  userId?: string
): Promise<string> {
  const supabase = await createClient()
  const startTime = Date.now()

  // 產生備份檔案名稱
  const filename = generateBackupFilename()

  let backupJobId: string | undefined = undefined

  try {
    // 1. 建立備份任務記錄（status = 'in_progress'）
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

    // 2. 備份所有資料表
    console.log('Starting database backup...')

    let sqlContent = `-- Vsale Database Backup
-- Generated at: ${new Date().toISOString()}
-- Backup type: ${backupType}
-- Tables: ${BACKUP_TABLES.length}

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`

    const tableStats: Record<string, { rows: number; size_bytes: number }> = {}
    let totalRows = 0

    for (const tableName of BACKUP_TABLES) {
      try {
        // 查詢記錄數
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        const rowCount = count || 0
        tableStats[tableName] = { rows: rowCount, size_bytes: 0 }
        totalRows += rowCount

        // 備份資料
        const tableSQL = await backupTable(supabase, tableName)
        sqlContent += tableSQL
      } catch (error) {
        console.error(`Failed to backup table ${tableName}:`, error)
        // 繼續備份其他資料表
      }
    }

    sqlContent += `-- Backup completed: ${BACKUP_TABLES.length} tables, ${totalRows} rows\n`

    // 3. 壓縮備份檔案
    console.log('Compressing backup...')
    const compressedBuffer = await compressString(sqlContent)
    const compressedSize = compressedBuffer.length
    const originalSize = Buffer.byteLength(sqlContent, 'utf8')

    console.log(`Compression: ${originalSize} -> ${compressedSize} (${((compressedSize / originalSize) * 100).toFixed(2)}%)`)

    // 4. 上傳到雲端
    console.log('Uploading to cloud storage...')
    const uploadResult = await uploadBackup(filename, compressedBuffer)

    // 5. 計算備份元數據
    const durationMs = Date.now() - startTime
    const metadata: BackupMetadata = {
      tables: BACKUP_TABLES.length,
      rows: totalRows,
      compression_ratio: parseFloat((compressedSize / originalSize).toFixed(2)),
      original_size: originalSize,
      compressed_size: compressedSize,
      duration_ms: durationMs,
      table_stats: tableStats,
    }

    // 6. 更新備份任務記錄（status = 'success'）
    const { error: updateError } = await supabase
      .from('backup_jobs')
      .update({
        file_size: compressedSize,
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

    throw error
  }
}

/**
 * 備份進度資訊
 */
export type BackupProgress = {
  stage: 'starting' | 'dumping' | 'compressing' | 'uploading' | 'calculating' | 'updating' | 'completed' | 'error'
  message: string
  percentage: number
}

/**
 * 執行完整備份流程（使用 Supabase API）並回報進度
 * @param backupType 備份類型（'auto' | 'manual'）
 * @param userId 執行者 ID（手動備份時提供）
 * @param onProgress 進度回調函數
 * @returns 備份任務 ID
 */
export async function performSupabaseBackupWithProgress(
  backupType: 'auto' | 'manual',
  userId: string | undefined,
  onProgress: (progress: BackupProgress) => void
): Promise<string> {
  const supabase = await createClient()
  const startTime = Date.now()

  // 產生備份檔案名稱
  const filename = generateBackupFilename()

  let backupJobId: string | undefined = undefined

  try {
    // 1. 建立備份任務記錄（status = 'in_progress'）
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

    // 2. 備份所有資料表
    onProgress({ stage: 'dumping', message: '正在匯出資料庫...', percentage: 10 })
    console.log('Starting database backup...')

    let sqlContent = `-- Vsale Database Backup
-- Generated at: ${new Date().toISOString()}
-- Backup type: ${backupType}
-- Tables: ${BACKUP_TABLES.length}

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`

    const tableStats: Record<string, { rows: number; size_bytes: number }> = {}
    let totalRows = 0

    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const tableName = BACKUP_TABLES[i]
      const progress = 10 + Math.floor((i / BACKUP_TABLES.length) * 40)
      onProgress({
        stage: 'dumping',
        message: `正在備份資料表: ${tableName} (${i + 1}/${BACKUP_TABLES.length})`,
        percentage: progress,
      })

      try {
        // 查詢記錄數
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        const rowCount = count || 0
        tableStats[tableName] = { rows: rowCount, size_bytes: 0 }
        totalRows += rowCount

        // 備份資料
        const tableSQL = await backupTable(supabase, tableName)
        sqlContent += tableSQL
      } catch (error) {
        console.error(`Failed to backup table ${tableName}:`, error)
        // 繼續備份其他資料表
      }
    }

    sqlContent += `-- Backup completed: ${BACKUP_TABLES.length} tables, ${totalRows} rows\n`

    // 3. 壓縮備份檔案
    onProgress({ stage: 'compressing', message: '正在壓縮備份檔案...', percentage: 50 })
    console.log('Compressing backup...')
    const compressedBuffer = await compressString(sqlContent)
    const compressedSize = compressedBuffer.length
    const originalSize = Buffer.byteLength(sqlContent, 'utf8')

    console.log(`Compression: ${originalSize} -> ${compressedSize} (${((compressedSize / originalSize) * 100).toFixed(2)}%)`)

    // 4. 上傳到雲端
    onProgress({ stage: 'uploading', message: '正在上傳到雲端儲存...', percentage: 70 })
    console.log('Uploading to cloud storage...')
    const uploadResult = await uploadBackup(filename, compressedBuffer)

    // 5. 計算備份元數據
    onProgress({ stage: 'calculating', message: '正在計算備份統計資訊...', percentage: 85 })
    const durationMs = Date.now() - startTime
    const metadata: BackupMetadata = {
      tables: BACKUP_TABLES.length,
      rows: totalRows,
      compression_ratio: parseFloat((compressedSize / originalSize).toFixed(2)),
      original_size: originalSize,
      compressed_size: compressedSize,
      duration_ms: durationMs,
      table_stats: tableStats,
    }

    // 6. 更新備份任務記錄（status = 'success'）
    onProgress({ stage: 'updating', message: '正在更新備份記錄...', percentage: 95 })
    const { error: updateError } = await supabase
      .from('backup_jobs')
      .update({
        file_size: compressedSize,
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

    // 9. 完成
    onProgress({ stage: 'completed', message: '備份完成！', percentage: 100 })
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

    // 回報錯誤
    onProgress({ stage: 'error', message: errorMessage, percentage: 0 })

    throw error
  }
}
