/**
 * Vercel 環境變數自動化設定腳本
 * 互動式輸入資料庫連線資訊，並自動設定到 Vercel
 */

import { execSync } from 'child_process'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

console.log('============================================')
console.log('Vercel 環境變數自動化設定工具')
console.log('============================================\n')

console.log('此工具將協助你設定 Vercel 環境變數，需要以下資訊：')
console.log('1. Supabase 資料庫連線資訊（從 Supabase Dashboard 取得）')
console.log('2. Vercel CLI（需已安裝並登入）\n')

async function main() {
  try {
    // 1. 檢查 Vercel CLI 是否已安裝
    console.log('[1/3] 檢查 Vercel CLI...')
    try {
      execSync('vercel --version', { stdio: 'ignore' })
      console.log('✅ Vercel CLI 已安裝\n')
    } catch {
      console.error('❌ Vercel CLI 未安裝')
      console.log('請執行: npm install -g vercel\n')
      process.exit(1)
    }

    // 2. 詢問是否要使用連線字串或手動輸入
    console.log('[2/3] 取得資料庫連線資訊')
    console.log('你可以選擇以下方式：')
    console.log('1. 貼上完整的 Supabase 連線字串（推薦）')
    console.log('2. 手動輸入各項資訊\n')

    const choice = await question('請選擇 (1 或 2): ')

    let dbConfig = {}

    if (choice === '1') {
      // 方案 1: 解析連線字串
      console.log('\n請前往 Supabase Dashboard:')
      console.log('https://supabase.com/dashboard/project/qwovavytryvgchcowjof/settings/database')
      console.log('選擇 "Connection pooler" 模式，複製連線字串\n')

      const connectionString = await question('請貼上連線字串: ')

      // 解析連線字串
      // 格式: postgresql://postgres.qwovavytryvgchcowjof:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
      const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):([^/]+)\/(.+)/
      const match = connectionString.match(regex)

      if (!match) {
        console.error('\n❌ 連線字串格式錯誤')
        console.log('請確認格式為: postgresql://user:password@host:port/database')
        process.exit(1)
      }

      dbConfig = {
        DB_USER: match[1],
        DB_PASSWORD: match[2],
        DB_HOST: match[3],
        DB_PORT: match[4],
        DB_NAME: match[5],
      }

      console.log('\n✅ 成功解析連線字串:')
      console.log(`   DB_HOST: ${dbConfig.DB_HOST}`)
      console.log(`   DB_PORT: ${dbConfig.DB_PORT}`)
      console.log(`   DB_NAME: ${dbConfig.DB_NAME}`)
      console.log(`   DB_USER: ${dbConfig.DB_USER}`)
      console.log(`   DB_PASSWORD: ${'*'.repeat(dbConfig.DB_PASSWORD.length)}\n`)
    } else {
      // 方案 2: 手動輸入
      console.log('\n請依序輸入資料庫連線資訊:\n')

      dbConfig.DB_HOST = await question('DB_HOST (例: aws-0-ap-southeast-1.pooler.supabase.com): ')
      dbConfig.DB_PORT = await question('DB_PORT (例: 6543): ')
      dbConfig.DB_NAME = await question('DB_NAME (例: postgres): ')
      dbConfig.DB_USER = await question('DB_USER (例: postgres.qwovavytryvgchcowjof): ')
      dbConfig.DB_PASSWORD = await question('DB_PASSWORD: ')
    }

    // 3. 確認是否要設定
    console.log('\n[3/3] 設定 Vercel 環境變數')
    console.log('即將設定以下環境變數到 Vercel:')
    Object.entries(dbConfig).forEach(([key, value]) => {
      if (key === 'DB_PASSWORD') {
        console.log(`  ${key}: ${'*'.repeat(value.length)}`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    })
    console.log('\n環境: Production, Preview, Development')

    const confirm = await question('\n確定要設定嗎？ (y/n): ')

    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 已取消設定')
      process.exit(0)
    }

    // 4. 設定環境變數到 Vercel
    console.log('\n正在設定環境變數...\n')

    const environments = ['production', 'preview', 'development']

    for (const [key, value] of Object.entries(dbConfig)) {
      for (const env of environments) {
        try {
          console.log(`設定 ${key} (${env})...`)

          // 使用 echo 傳遞值到 vercel env add
          // 注意: Windows 需要使用不同的語法
          const isWindows = process.platform === 'win32'

          if (isWindows) {
            // Windows: 使用 PowerShell
            execSync(
              `echo ${value} | vercel env add ${key} ${env}`,
              {
                stdio: 'inherit',
                shell: 'powershell.exe',
              }
            )
          } else {
            // Unix/Linux/Mac
            execSync(
              `echo "${value}" | vercel env add ${key} ${env}`,
              {
                stdio: 'inherit',
              }
            )
          }

          console.log(`✅ ${key} (${env}) 設定成功`)
        } catch (error) {
          console.error(`❌ ${key} (${env}) 設定失敗:`, error.message)
        }
      }
      console.log('')
    }

    // 5. 完成
    console.log('============================================')
    console.log('✅ 環境變數設定完成！')
    console.log('============================================\n')

    console.log('下一步：')
    console.log('1. 前往 Vercel Dashboard 確認設定:')
    console.log('   https://vercel.com/haraluyas-projects/vsale/settings/environment-variables')
    console.log('2. 觸發重新部署:')
    console.log('   vercel --prod')
    console.log('3. 測試備份功能:')
    console.log('   https://vsale-lite.vercel.app/admin/system/settings\n')
  } catch (error) {
    console.error('\n❌ 設定失敗:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
