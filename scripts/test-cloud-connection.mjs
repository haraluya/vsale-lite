/**
 * 測試雲端 Supabase 連線
 * 用途：驗證環境變數設定是否正確，以及是否能成功連接到雲端資料庫
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 載入 .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('\n🔍 測試雲端 Supabase 連線...\n')
console.log('📌 環境變數檢查:')
console.log(`   SUPABASE_URL: ${SUPABASE_URL}`)
console.log(`   ANON_KEY: ${SUPABASE_ANON_KEY?.substring(0, 20)}...`)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ 錯誤：環境變數未設定')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 測試 1: 基本連線
console.log('\n✅ 測試 1: 基本連線')
try {
  const { data, error } = await supabase.from('tiers').select('count', { count: 'exact', head: true })
  if (error) throw error
  console.log('   ✓ 連線成功！')
} catch (error) {
  console.error('   ✗ 連線失敗:', error.message)
  process.exit(1)
}

// 測試 2: 查詢會員等級
console.log('\n✅ 測試 2: 查詢會員等級')
try {
  const { data, error } = await supabase.from('tiers').select('id, name').limit(5)
  if (error) throw error
  console.log(`   ✓ 查詢成功！找到 ${data.length} 個等級`)
  data.forEach(tier => console.log(`      - ${tier.name}`))
} catch (error) {
  console.error('   ✗ 查詢失敗:', error.message)
  process.exit(1)
}

// 測試 3: 查詢管理員數量
console.log('\n✅ 測試 3: 查詢管理員數量')
try {
  const { count, error } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  console.log(`   ✓ 查詢成功！管理員數量: ${count}`)
} catch (error) {
  console.error('   ✗ 查詢失敗:', error.message)
  process.exit(1)
}

// 測試 4: 查詢商品數量
console.log('\n✅ 測試 4: 查詢商品數量')
try {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  console.log(`   ✓ 查詢成功！商品數量: ${count}`)
} catch (error) {
  console.error('   ✗ 查詢失敗:', error.message)
  process.exit(1)
}

console.log('\n🎉 所有測試通過！雲端 Supabase 連線正常\n')
