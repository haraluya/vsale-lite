#!/usr/bin/env node

/**
 * Vercel 環境變數自動設定腳本（Node.js 版本）
 * 從 .env.local 讀取並設定到 Vercel
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('============================================')
console.log('Vercel 環境變數自動設定工具（Node.js 版本）')
console.log('============================================')
console.log('')

// 檢查 .env.local 是否存在
const envFilePath = join(__dirname, '..', '.env.local')
if (!existsSync(envFilePath)) {
  console.error('❌ 錯誤：找不到 .env.local 檔案')
  console.error(`   路徑: ${envFilePath}`)
  process.exit(1)
}

console.log('✅ 找到 .env.local 檔案')
console.log('')

// 讀取 .env.local 內容
const envContent = readFileSync(envFilePath, 'utf-8')

// 解析環境變數
function parseEnvFile(content) {
  const vars = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳過註解和空行
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }

    // 解析 key=value
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // 移除引號
      value = value.replace(/^["']|["']$/g, '')

      vars[key] = value
    }
  }

  return vars
}

const envVars = parseEnvFile(envContent)

// 定義需要設定到 Vercel 的環境變數
const varsToSet = {
  // Supabase 連線
  NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY,

  // Google Cloud Storage
  GCS_PROJECT_ID: envVars.GCS_PROJECT_ID,
  GCS_BUCKET_NAME: envVars.GCS_BUCKET_NAME,
  GCS_SERVICE_ACCOUNT_KEY: envVars.GCS_SERVICE_ACCOUNT_KEY,

  // Vercel Cron Job
  CRON_SECRET: envVars.CRON_SECRET,
}

console.log('📋 將設定以下環境變數到 Vercel:')
console.log('')

let missingVars = []
for (const [key, value] of Object.entries(varsToSet)) {
  if (!value || value === '') {
    console.log(`  ❌ ${key} - 缺少！`)
    missingVars.push(key)
  } else {
    // 隱藏敏感資訊
    const displayValue =
      key.includes('KEY') || key.includes('PASSWORD') || key.includes('SECRET')
        ? `${value.substring(0, 20)}...(已讀取)`
        : value.substring(0, 50)

    console.log(`  ✅ ${key}`)
    console.log(`     值: ${displayValue}`)
  }
}

console.log('')

if (missingVars.length > 0) {
  console.error('⚠️  警告：以下必須的環境變數在 .env.local 中缺少：')
  missingVars.forEach((key) => console.error(`  - ${key}`))
  console.log('')
  console.log('請先在 .env.local 中設定這些變數，然後重新執行此腳本。')
  process.exit(1)
}

console.log('目標環境: production, preview, development')
console.log(`總計: ${Object.keys(varsToSet).length} 個環境變數`)
console.log('')

// 設定環境變數
const environments = ['production', 'preview', 'development']
let successCount = 0
let failCount = 0

console.log('正在設定環境變數到 Vercel...')
console.log('')

for (const [key, value] of Object.entries(varsToSet)) {
  console.log(`設定 ${key}...`)

  for (const env of environments) {
    try {
      // 將值寫入暫存檔案
      const tempFile = join(tmpdir(), `vercel-env-${Date.now()}.txt`)
      writeFileSync(tempFile, value, 'utf-8')

      // 使用檔案重導執行 vercel env add
      const isWindows = process.platform === 'win32'

      let command
      if (isWindows) {
        // Windows: 使用 type
        command = `type "${tempFile}" | vercel env add ${key} ${env}`
      } else {
        // Unix/Linux/Mac: 使用 cat
        command = `cat "${tempFile}" | vercel env add ${key} ${env}`
      }

      execSync(command, {
        stdio: 'ignore',
        shell: isWindows ? 'cmd.exe' : true,
      })

      // 清除暫存檔案
      unlinkSync(tempFile)

      console.log(`  ✅ ${env} 環境設定成功`)
      successCount++
    } catch (error) {
      console.error(`  ❌ ${env} 環境設定失敗: ${error.message}`)
      failCount++
    }
  }

  console.log('')
}

console.log('============================================')
console.log('設定完成！')
console.log('============================================')
console.log(`✅ 成功: ${successCount} 個`)
console.log(`❌ 失敗: ${failCount} 個`)
console.log('')

if (failCount === 0) {
  console.log('🎉 所有環境變數已成功設定到 Vercel！')
  console.log('')
  console.log('下一步：')
  console.log('1. 前往 Vercel Dashboard 確認設定:')
  console.log('   https://vercel.com/haraluyas-projects/vsale/settings/environment-variables')
  console.log('2. 觸發重新部署:')
  console.log('   vercel --prod')
  console.log('3. 測試備份功能:')
  console.log('   https://vsale-lite.vercel.app/admin/system/settings')
} else {
  console.log('⚠️  部分環境變數設定失敗，請手動檢查 Vercel Dashboard。')
}

console.log('')
