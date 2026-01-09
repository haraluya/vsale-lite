// 從備份檔案還原資料到雲端 Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://qwovavytryvgchcowjof.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI4MTU3NCwiZXhwIjoyMDgyODU3NTc0fQ.zcyKpbeqPJ-RxM4mkkU5zPdzv0YrD0s0iOOcXqGIEdA'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function restoreFromBackup() {
  const backupFile = path.join(__dirname, 'cloud_backup_20260109_080944.sql')

  console.log('='.repeat(60))
  console.log('開始從備份檔案還原資料')
  console.log('='.repeat(60))
  console.log(`備份檔案: ${backupFile}`)
  console.log('')

  // 讀取備份檔案
  const sql = fs.readFileSync(backupFile, 'utf8')

  // 提取所有 INSERT 語句（僅 public schema）
  const publicInserts = []
  const lines = sql.split('\n')
  let currentStatement = ''
  let inPublicSchema = false

  for (const line of lines) {
    if (line.includes('Schema: public')) {
      inPublicSchema = true
    }

    if (inPublicSchema && line.startsWith('INSERT INTO "public".')) {
      currentStatement = line
    } else if (currentStatement && line.trim()) {
      currentStatement += '\n' + line

      // 檢查語句是否結束（以分號結尾）
      if (line.trim().endsWith(';')) {
        publicInserts.push(currentStatement)
        currentStatement = ''
      }
    }
  }

  console.log(`找到 ${publicInserts.length} 個 INSERT 語句`)
  console.log('')

  if (publicInserts.length === 0) {
    console.log('❌ 錯誤：備份檔案中沒有找到 public schema 的資料')
    return
  }

  // 手動提取並執行每個表的 INSERT（使用 Supabase client）
  const tables = ['profiles', 'tiers', 'categories', 'series', 'products', 'tier_prices', 'coupons', 'user_coupons', 'orders', 'order_items', 'order_timelines', 'audit_logs', 'system_settings']

  let totalRestored = 0
  let errors = []

  for (const insert of publicInserts) {
    const match = insert.match(/INSERT INTO "public"\."(\w+)"/)
    if (match) {
      const tableName = match[1]
      console.log(`正在還原表: ${tableName}...`)

      try {
        // 使用 RPC 執行原始 SQL
        const { error } = await supabase.rpc('exec_sql', { sql_query: insert })

        if (error) {
          // 如果 RPC 不存在，記錄錯誤但繼續
          console.log(`  ⚠️  無法使用 RPC，嘗試解析並插入...`)
          errors.push({ table: tableName, error: error.message })
        } else {
          console.log(`  ✅ 成功`)
          totalRestored++
        }
      } catch (err) {
        console.log(`  ❌ 失敗: ${err.message}`)
        errors.push({ table: tableName, error: err.message })
      }
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('還原結果')
  console.log('='.repeat(60))
  console.log(`成功還原: ${totalRestored} 個表`)
  console.log(`失敗: ${errors.length} 個表`)

  if (errors.length > 0) {
    console.log('')
    console.log('錯誤詳情:')
    errors.forEach(({ table, error }) => {
      console.log(`  - ${table}: ${error}`)
    })
  }

  console.log('')
  console.log('注意: Supabase JS Client 無法直接執行原始 INSERT 語句')
  console.log('建議改用 pg_dump 格式或透過 Supabase Dashboard 手動匯入')
}

restoreFromBackup().catch(console.error)
