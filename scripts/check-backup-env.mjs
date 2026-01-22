#!/usr/bin/env node

/**
 * 檢查備份系統所需的環境變數
 * 用於診斷 Vercel 部署環境配置
 */

console.log('='.repeat(60))
console.log('備份系統環境變數檢查')
console.log('='.repeat(60))
console.log('')

// 檢查項目
const checks = [
  {
    category: 'Supabase 連線',
    required: true,
    vars: [
      { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase 專案 URL' },
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase 公開金鑰' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase 服務金鑰（Admin 權限）' },
    ],
  },
  {
    category: 'Google Cloud Storage',
    required: true,
    vars: [
      { name: 'GCS_PROJECT_ID', description: 'GCS 專案 ID' },
      { name: 'GCS_BUCKET_NAME', description: 'GCS Bucket 名稱' },
      { name: 'GCS_SERVICE_ACCOUNT_KEY', description: 'GCS 服務帳戶金鑰（JSON 字串）' },
    ],
  },
  {
    category: 'Vercel Cron Job（可選）',
    required: false,
    vars: [{ name: 'CRON_SECRET', description: 'Cron Job 驗證金鑰' }],
  },
  {
    category: 'PostgreSQL 直連（本地開發用，線上不需要）',
    required: false,
    vars: [
      { name: 'DB_HOST', description: '資料庫主機' },
      { name: 'DB_PORT', description: '資料庫埠號' },
      { name: 'DB_NAME', description: '資料庫名稱' },
      { name: 'DB_USER', description: '資料庫使用者' },
      { name: 'DB_PASSWORD', description: '資料庫密碼' },
    ],
  },
]

let totalChecks = 0
let passedChecks = 0
let failedChecks = 0

checks.forEach((check) => {
  console.log(`\n【${check.category}】${check.required ? ' ⚠️ 必須' : ' ℹ️ 可選'}`)
  console.log('-'.repeat(60))

  check.vars.forEach((v) => {
    totalChecks++
    const value = process.env[v.name]
    const exists = !!value

    if (exists) {
      passedChecks++
      // 隱藏敏感資訊
      const displayValue =
        v.name.includes('KEY') ||
        v.name.includes('PASSWORD') ||
        v.name.includes('SECRET')
          ? `${value.substring(0, 20)}...(已設定)`
          : value.substring(0, 50)

      console.log(`✅ ${v.name}`)
      console.log(`   ${v.description}`)
      console.log(`   值: ${displayValue}\n`)
    } else {
      if (check.required) {
        failedChecks++
        console.log(`❌ ${v.name} - 缺少！`)
      } else {
        console.log(`⚪ ${v.name} - 未設定（可選）`)
      }
      console.log(`   ${v.description}\n`)
    }
  })
})

// 總結
console.log('='.repeat(60))
console.log('檢查總結')
console.log('='.repeat(60))
console.log(`總計檢查項目: ${totalChecks}`)
console.log(`✅ 已設定: ${passedChecks}`)
console.log(`❌ 缺少（必須項目）: ${failedChecks}`)
console.log(`⚪ 未設定（可選項目）: ${totalChecks - passedChecks - failedChecks}`)
console.log('')

if (failedChecks > 0) {
  console.log('⚠️  警告：有必須的環境變數未設定！')
  console.log('')
  console.log('請執行以下步驟設定 Vercel 環境變數：')
  console.log('1. 前往 Vercel Dashboard:')
  console.log(
    '   https://vercel.com/haraluyas-projects/vsale/settings/environment-variables'
  )
  console.log('2. 點擊 "Add New" 按鈕')
  console.log('3. 逐一新增缺少的環境變數')
  console.log('4. 勾選所有環境（Production、Preview、Development）')
  console.log('5. 儲存後觸發重新部署')
  console.log('')
  console.log('📖 詳細設定指引: scripts/setup-vercel-env.md')
  process.exit(1)
} else {
  console.log('✅ 所有必須的環境變數已設定！')
  console.log('')
  console.log('備份系統應該可以正常運作。')
  console.log('如果仍有問題，請檢查 Vercel Function Logs。')
  process.exit(0)
}
