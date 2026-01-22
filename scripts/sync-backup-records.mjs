/**
 * 同步 GCS 備份檔案到資料庫
 * 用於還原資料庫後，重新建立 backup_jobs 記錄
 */

import { Storage } from '@google-cloud/storage'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

// Supabase 設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GCS 設定
const gcsProjectId = process.env.GCS_PROJECT_ID
const gcsBucket = process.env.GCS_BUCKET
const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64

if (!gcsProjectId || !gcsBucket || !gcsCredentialsBase64) {
  console.error('❌ 缺少 GCS 環境變數')
  process.exit(1)
}

// 解碼 GCS 憑證
const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf-8'))

// 建立 GCS 客戶端
const storage = new Storage({
  projectId: gcsProjectId,
  credentials: gcsCredentials,
})

const bucket = storage.bucket(gcsBucket)

console.log('🔄 開始同步 GCS 備份檔案到資料庫...\n')

async function syncBackupRecords() {
  try {
    // 1. 列出 GCS 中所有備份檔案
    console.log('📁 正在列出 GCS 備份檔案...')
    const [files] = await bucket.getFiles({ prefix: 'backups/' })

    const sqlGzFiles = files.filter(file => file.name.endsWith('.sql.gz'))
    console.log(`✅ 找到 ${sqlGzFiles.length} 個備份檔案\n`)

    if (sqlGzFiles.length === 0) {
      console.log('⚠️  GCS 中沒有備份檔案')
      return
    }

    // 2. 查詢資料庫中現有的備份記錄
    console.log('🔍 正在查詢資料庫中的備份記錄...')
    const { data: existingJobs, error } = await supabase
      .from('backup_jobs')
      .select('filename')

    if (error) {
      throw new Error(`查詢資料庫失敗: ${error.message}`)
    }

    const existingFilenames = new Set(existingJobs?.map(job => job.filename) || [])
    console.log(`✅ 資料庫中已有 ${existingFilenames.size} 個備份記錄\n`)

    // 3. 同步缺少的備份記錄
    let syncedCount = 0
    let skippedCount = 0

    for (const file of sqlGzFiles) {
      const filename = file.name.replace('backups/', '')

      // 跳過已存在的記錄
      if (existingFilenames.has(filename)) {
        console.log(`⏭️  跳過（已存在）: ${filename}`)
        skippedCount++
        continue
      }

      // 取得檔案元數據
      const [metadata] = await file.getMetadata()
      const fileSize = parseInt(metadata.size, 10)
      const createdAt = metadata.timeCreated

      // 解析檔案名稱以判斷備份類型
      // 格式: vsale-backup-YYYYMMDD-HHMMSS.sql.gz
      const backupType = 'auto' // 預設為自動備份

      // 建立 GCS 公開 URL
      const storageUrl = `gs://${gcsBucket}/${file.name}`

      // 插入備份記錄
      const { error: insertError } = await supabase
        .from('backup_jobs')
        .insert({
          filename,
          file_size: fileSize,
          storage_provider: 'gcs',
          storage_url: storageUrl,
          backup_type: backupType,
          status: 'success',
          created_at: createdAt,
          completed_at: createdAt,
          metadata: null,
          error_message: null,
          created_by: null,
        })

      if (insertError) {
        console.error(`❌ 同步失敗: ${filename}`)
        console.error(`   錯誤: ${insertError.message}`)
      } else {
        console.log(`✅ 同步成功: ${filename} (${(fileSize / 1024).toFixed(2)} KB)`)
        syncedCount++
      }
    }

    // 4. 總結
    console.log('\n' + '='.repeat(60))
    console.log('同步完成！')
    console.log('='.repeat(60))
    console.log(`✅ 同步成功: ${syncedCount} 個`)
    console.log(`⏭️  跳過（已存在）: ${skippedCount} 個`)
    console.log(`📁 GCS 總計: ${sqlGzFiles.length} 個`)
    console.log(`💾 資料庫總計: ${existingFilenames.size + syncedCount} 個`)
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ 同步失敗:', error.message)
    process.exit(1)
  }
}

syncBackupRecords()
