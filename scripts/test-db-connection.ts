/**
 * 測試資料庫連線腳本
 * 用於驗證 Session Pooler 連線與新密碼是否正確
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}

async function testConnection() {
  console.log('=== 資料庫連線測試 ===\n')
  console.log('連線資訊:')
  console.log(`  Host: ${DB_CONFIG.host}`)
  console.log(`  Port: ${DB_CONFIG.port}`)
  console.log(`  Database: ${DB_CONFIG.database}`)
  console.log(`  User: ${DB_CONFIG.user}`)
  console.log(`  Password: ${'*'.repeat(DB_CONFIG.password?.length || 0)}`)
  console.log()

  const client = new Client({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    database: DB_CONFIG.database,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    ssl: {
      rejectUnauthorized: false,
    },
    // 強制使用 IPv4
    options: '-c search_path=public',
  })

  try {
    console.log('正在連線到資料庫...')
    await client.connect()
    console.log('✅ 連線成功！\n')

    // 測試查詢
    console.log('執行測試查詢...')
    const result = await client.query('SELECT version()')
    console.log('✅ 查詢成功！')
    console.log(`PostgreSQL 版本: ${result.rows[0].version}\n`)

    // 測試 Transaction
    console.log('測試 Transaction...')
    await client.query('BEGIN')
    console.log('✅ BEGIN 成功')

    await client.query('SET session_replication_role = replica')
    console.log('✅ 停用觸發器成功')

    await client.query('ROLLBACK')
    console.log('✅ ROLLBACK 成功\n')

    console.log('=== 測試完成 ===')
    console.log('所有測試通過！資料庫連線正常運作。')
  } catch (error) {
    console.error('\n❌ 連線失敗！')
    if (error instanceof Error) {
      console.error(`錯誤訊息: ${error.message}`)

      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n可能原因：無法連線到資料庫伺服器')
        console.error('請檢查：')
        console.error('  1. DB_HOST 是否正確')
        console.error('  2. 網路連線是否正常')
        console.error('  3. 防火牆是否阻擋連線')
      } else if (error.message.includes('authentication failed') || error.message.includes('password')) {
        console.error('\n可能原因：認證失敗')
        console.error('請檢查：')
        console.error('  1. DB_USER 是否正確')
        console.error('  2. DB_PASSWORD 是否正確')
        console.error('  3. Supabase 專案密碼是否已更新')
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('\n可能原因：找不到主機')
        console.error('請檢查：')
        console.error('  1. DB_HOST 拼寫是否正確')
        console.error('  2. DNS 解析是否正常')
      }
    }
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n資料庫連線已關閉。')
  }
}

testConnection()
