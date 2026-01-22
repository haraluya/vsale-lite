#!/usr/bin/env node
/**
 * 自動化資料庫遷移腳本
 * 使用 Supabase SQL API 執行備份的 SQL 檔案
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 站點二配置
const SITE2_URL = 'https://rdyvmgomjdglflrcfijs.supabase.co'
const SITE2_SERVICE_KEY = process.env.SITE2_SERVICE_KEY || ''

if (!SITE2_SERVICE_KEY) {
  console.error('❌ 錯誤: 需要站點二的 Service Role Key')
  console.log('\n請執行以下步驟:')
  console.log('1. 前往 https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs')
  console.log('2. Settings → API → 複製 service_role key')
  console.log('3. 設定環境變數:')
  console.log('   $env:SITE2_SERVICE_KEY = "your-service-role-key"')
  console.log('4. 重新執行此腳本')
  process.exit(1)
}

// 建立 Supabase 客戶端
const supabase = createClient(SITE2_URL, SITE2_SERVICE_KEY)

// 備份檔案路徑
const BACKUP_DIR = path.join(__dirname, '../backup/full-migration-20260122-145653')
const SCHEMA_FILE = path.join(BACKUP_DIR, 'main-site-full-backup.sql')
const DATA_FILE = path.join(BACKUP_DIR, 'main-site-data.sql')

/**
 * 執行 SQL 檔案（分段執行）
 */
async function executeSQLFile(filePath, description) {
  console.log(`\n📄 正在執行: ${description}`)
  console.log(`   檔案: ${path.basename(filePath)}`)

  // 讀取 SQL 檔案
  const sql = fs.readFileSync(filePath, 'utf-8')
  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1)
  const lineCount = sql.split('\n').length

  console.log(`   大小: ${fileSize} KB`)
  console.log(`   行數: ${lineCount} 行`)

  // 將 SQL 分割成多個語句（以分號分隔）
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`   語句數: ${statements.length}`)
  console.log(`\n⏳ 開始執行... (這可能需要幾分鐘)\n`)

  let executed = 0
  let errors = 0
  const startTime = Date.now()

  // 逐個執行語句
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'

    // 顯示進度
    if (i % 100 === 0 || i === statements.length - 1) {
      const progress = ((i + 1) / statements.length * 100).toFixed(1)
      process.stdout.write(`\r   進度: [${i + 1}/${statements.length}] ${progress}%`)
    }

    try {
      // 使用 rpc 呼叫執行 SQL
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        // 某些錯誤可以忽略（如 "already exists"）
        const ignorableErrors = [
          'already exists',
          'does not exist',
          'duplicate key',
        ]

        const shouldIgnore = ignorableErrors.some(msg =>
          error.message.toLowerCase().includes(msg)
        )

        if (!shouldIgnore) {
          errors++
          if (errors <= 5) { // 只顯示前 5 個錯誤
            console.log(`\n   ⚠️  錯誤 ${errors}: ${error.message.substring(0, 100)}`)
          }
        }
      } else {
        executed++
      }
    } catch (e) {
      errors++
      if (errors <= 5) {
        console.log(`\n   ⚠️  執行錯誤: ${e.message.substring(0, 100)}`)
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n\n   ✅ 執行完成`)
  console.log(`   - 成功: ${executed} 個語句`)
  console.log(`   - 錯誤: ${errors} 個語句`)
  console.log(`   - 耗時: ${duration} 秒`)

  return { executed, errors }
}

/**
 * 使用直接 SQL 執行（替代方案）
 */
async function executeSQLDirect(filePath, description) {
  console.log(`\n📄 ${description}`)
  console.log(`   ⚠️  Supabase JS SDK 不支援直接執行任意 SQL`)
  console.log(`   ℹ️  請使用以下方式之一:`)
  console.log(`\n   方式 1: Supabase Dashboard (推薦)`)
  console.log(`   1. 前往 https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/sql`)
  console.log(`   2. 點擊 "New Query"`)
  console.log(`   3. 複製貼上檔案內容: ${filePath}`)
  console.log(`   4. 點擊 "Run"`)
  console.log(`\n   方式 2: 使用 psql (需要安裝 PostgreSQL)`)
  console.log(`   PGPASSWORD="Devape-BM69" psql \\`)
  console.log(`     -h db.rdyvmgomjdglflrcfijs.supabase.co \\`)
  console.log(`     -p 5432 \\`)
  console.log(`     -U postgres.rdyvmgomjdglflrcfijs \\`)
  console.log(`     -d postgres \\`)
  console.log(`     -f ${filePath}`)

  return { executed: 0, errors: 0 }
}

/**
 * 主函數
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                                                               ║')
  console.log('║   自動化資料庫遷移工具                                       ║')
  console.log('║   主站 → 站點二                                              ║')
  console.log('║                                                               ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')

  // 檢查備份檔案是否存在
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`\n❌ 找不到 Schema 備份檔案: ${SCHEMA_FILE}`)
    process.exit(1)
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`\n❌ 找不到 Data 備份檔案: ${DATA_FILE}`)
    process.exit(1)
  }

  console.log('\n✅ 備份檔案檢查通過')
  console.log(`   - Schema: ${path.basename(SCHEMA_FILE)}`)
  console.log(`   - Data: ${path.basename(DATA_FILE)}`)

  // 提示使用者
  console.log('\n⚠️  重要提醒:')
  console.log('   - 此操作會覆蓋站點二的所有資料')
  console.log('   - 建議先在 Supabase Dashboard 確認站點二已清空')
  console.log('   - 或者執行清空指令（參考文件）')

  console.log('\n由於 Supabase JS SDK 的限制，無法直接執行大型 SQL 檔案。')
  console.log('建議使用以下兩種方式之一:\n')

  await executeSQLDirect(SCHEMA_FILE, '步驟 1: 匯入 Schema')
  await executeSQLDirect(DATA_FILE, '步驟 2: 匯入 Data')

  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                                                               ║')
  console.log('║   ℹ️  資料庫遷移需要手動操作                                ║')
  console.log('║                                                               ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')

  console.log('\n建議執行順序:')
  console.log('1. 資料庫遷移: 使用 Supabase Dashboard (5 分鐘)')
  console.log('2. Storage 遷移: 執行自動化腳本 (3 分鐘)')
  console.log('\n執行 Storage 遷移:')
  console.log('   node scripts/migrate-storage.mjs')
}

// 執行
main().catch(error => {
  console.error('❌ 執行失敗:', error)
  process.exit(1)
})
