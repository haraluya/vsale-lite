#!/usr/bin/env node
/**
 * Supabase Storage 自動遷移腳本
 * 從主站複製所有 Storage 檔案到站點二
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 主站配置
const SITE1_URL = 'https://qwovavytryvgchcowjof.supabase.co'
const SITE1_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyODE1NzQsImV4cCI6MjA4Mjg1NzU3NH0.YEwJNjDv5HJgj-GMN_IdisI6dU13aHA6ruaZCXUpZLA'

// 站點二配置 (需要填入)
const SITE2_URL = 'https://rdyvmgomjdglflrcfijs.supabase.co'
const SITE2_SERVICE_KEY = process.env.SITE2_SERVICE_KEY || '' // 從環境變數讀取

if (!SITE2_SERVICE_KEY) {
  console.error('❌ 錯誤: 請設定環境變數 SITE2_SERVICE_KEY')
  console.log('\n取得方式:')
  console.log('1. 前往 https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs')
  console.log('2. Settings → API → service_role key')
  console.log('3. 複製 service_role key')
  console.log('\n執行方式:')
  console.log('$env:SITE2_SERVICE_KEY = "your-service-role-key"')
  console.log('node scripts/migrate-storage.mjs')
  process.exit(1)
}

// 建立 Supabase 客戶端
const site1 = createClient(SITE1_URL, SITE1_ANON_KEY)
const site2 = createClient(SITE2_URL, SITE2_SERVICE_KEY)

// 需要遷移的 Buckets
const BUCKETS = ['products', 'public', 'announcements']

// 臨時目錄
const TEMP_DIR = path.join(__dirname, '../temp-storage')

/**
 * 確保目錄存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 下載檔案
 */
async function downloadFile(bucket, filePath, localPath) {
  try {
    const { data, error } = await site1.storage.from(bucket).download(filePath)

    if (error) {
      console.warn(`  ⚠️  下載失敗: ${bucket}/${filePath} - ${error.message}`)
      return false
    }

    // 確保目錄存在
    const dir = path.dirname(localPath)
    ensureDir(dir)

    // 寫入檔案
    const arrayBuffer = await data.arrayBuffer()
    fs.writeFileSync(localPath, Buffer.from(arrayBuffer))

    return true
  } catch (error) {
    console.warn(`  ⚠️  下載失敗: ${bucket}/${filePath} - ${error.message}`)
    return false
  }
}

/**
 * 上傳檔案
 */
async function uploadFile(bucket, filePath, localPath) {
  try {
    const fileBuffer = fs.readFileSync(localPath)

    const { data, error } = await site2.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        upsert: true, // 覆蓋已存在的檔案
        contentType: getContentType(filePath)
      })

    if (error) {
      console.warn(`  ⚠️  上傳失敗: ${bucket}/${filePath} - ${error.message}`)
      return false
    }

    return true
  } catch (error) {
    console.warn(`  ⚠️  上傳失敗: ${bucket}/${filePath} - ${error.message}`)
    return false
  }
}

/**
 * 取得檔案的 Content Type
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * 列出 Bucket 所有檔案
 */
async function listAllFiles(bucket, prefix = '', allFiles = []) {
  try {
    const { data, error } = await site1.storage
      .from(bucket)
      .list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error(`❌ 列出檔案失敗: ${bucket}/${prefix} - ${error.message}`)
      return allFiles
    }

    if (!data || data.length === 0) {
      return allFiles
    }

    for (const file of data) {
      const fullPath = prefix ? `${prefix}/${file.name}` : file.name

      // 如果是資料夾，遞迴列出
      if (file.id === null) {
        await listAllFiles(bucket, fullPath, allFiles)
      } else {
        allFiles.push(fullPath)
      }
    }

    return allFiles
  } catch (error) {
    console.error(`❌ 列出檔案失敗: ${bucket}/${prefix} - ${error.message}`)
    return allFiles
  }
}

/**
 * 遷移單個 Bucket
 */
async function migrateBucket(bucket) {
  console.log(`\n📦 正在遷移 Bucket: ${bucket}`)

  // 1. 列出所有檔案
  console.log(`  ℹ️  列出檔案...`)
  const files = await listAllFiles(bucket)
  console.log(`  ✅ 找到 ${files.length} 個檔案`)

  if (files.length === 0) {
    console.log(`  ⚠️  Bucket ${bucket} 為空，跳過`)
    return { success: 0, failed: 0, total: 0 }
  }

  // 2. 下載並上傳每個檔案
  let success = 0
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const localPath = path.join(TEMP_DIR, bucket, file)

    console.log(`  [${i + 1}/${files.length}] ${file}`)

    // 下載
    const downloaded = await downloadFile(bucket, file, localPath)
    if (!downloaded) {
      failed++
      continue
    }

    // 上傳
    const uploaded = await uploadFile(bucket, file, localPath)
    if (uploaded) {
      success++
      console.log(`    ✅ 成功`)
    } else {
      failed++
    }

    // 刪除臨時檔案
    try {
      fs.unlinkSync(localPath)
    } catch {}
  }

  return { success, failed, total: files.length }
}

/**
 * 主函數
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                                                               ║')
  console.log('║   Supabase Storage 自動遷移工具                               ║')
  console.log('║   主站 → 站點二                                              ║')
  console.log('║                                                               ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  // 建立臨時目錄
  ensureDir(TEMP_DIR)

  const startTime = Date.now()
  const results = {}

  // 遷移每個 Bucket
  for (const bucket of BUCKETS) {
    results[bucket] = await migrateBucket(bucket)
  }

  // 清理臨時目錄
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true })
  } catch {}

  // 顯示總結
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                                                               ║')
  console.log('║   ✅ 遷移完成！                                              ║')
  console.log('║                                                               ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  console.log('📊 遷移統計:\n')

  let totalSuccess = 0
  let totalFailed = 0
  let totalFiles = 0

  for (const [bucket, result] of Object.entries(results)) {
    console.log(`  ${bucket}:`)
    console.log(`    - 成功: ${result.success} 個`)
    console.log(`    - 失敗: ${result.failed} 個`)
    console.log(`    - 總計: ${result.total} 個`)

    totalSuccess += result.success
    totalFailed += result.failed
    totalFiles += result.total
  }

  console.log(`\n  總計:`)
  console.log(`    - 成功: ${totalSuccess} 個`)
  console.log(`    - 失敗: ${totalFailed} 個`)
  console.log(`    - 總計: ${totalFiles} 個`)
  console.log(`    - 耗時: ${duration} 秒`)

  if (totalFailed > 0) {
    console.log('\n⚠️  部分檔案遷移失敗，請檢查上方錯誤訊息')
  }
}

// 執行
main().catch(error => {
  console.error('❌ 遷移失敗:', error)
  process.exit(1)
})
