import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 診斷前台 Logo 顯示問題\n')
console.log('=' .repeat(60))

// 1. 檢查資料庫中的 logo_url 設定
console.log('\n📊 步驟 1: 檢查資料庫中的 logo_url 設定')
const { data: logoSetting, error } = await supabase
  .from('system_settings')
  .select('*')
  .eq('key', 'logo_url')
  .single()

if (error) {
  console.error('❌ 查詢失敗:', error)
  process.exit(1)
}

console.log('✅ 查詢成功:')
console.log('   Key:', logoSetting.key)
console.log('   Value:', logoSetting.value || '(空字串)')
console.log('   Is Public:', logoSetting.is_public)
console.log('   Value Type:', logoSetting.value_type)

// 2. 檢查是否有上傳的 Logo 檔案
console.log('\n📁 步驟 2: 檢查 Supabase Storage 中的 Logo 檔案')
const possibleFiles = [
  'system/logo.jpg',
  'system/logo.png',
  'system/logo.webp',
  'system/logo.svg',
]

for (const filePath of possibleFiles) {
  const { data, error } = await supabase.storage.from('products').list('system', {
    search: filePath.split('/')[1],
  })

  if (data && data.length > 0) {
    console.log('✅ 找到檔案:', filePath)
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath)
    console.log('   公開 URL:', publicUrlData.publicUrl)
  }
}

// 3. 診斷結果
console.log('\n🔍 診斷結果:')
console.log('=' .repeat(60))

if (!logoSetting.value || logoSetting.value.trim() === '') {
  console.log('⚠️  問題: logo_url 設定為空字串')
  console.log('')
  console.log('💡 解決方法:')
  console.log('   1. 開啟後台系統設定頁面（http://localhost:3000/admin/system/settings）')
  console.log('   2. 在「Logo 管理」區塊上傳 Logo 圖片')
  console.log('   3. 上傳成功後，logo_url 會自動更新為 Supabase Storage URL')
  console.log('   4. 重新載入前台頁面即可看到 Logo')
} else {
  console.log('✅ logo_url 已設定:', logoSetting.value)
  console.log('')
  console.log('💡 如果前台仍然看不到 Logo:')
  console.log('   1. 檢查開發伺服器是否正在執行（pnpm dev）')
  console.log('   2. 清除瀏覽器快取（Ctrl + Shift + R）')
  console.log('   3. 檢查瀏覽器 Console 是否有錯誤訊息')
  console.log('   4. 檢查 Logo 圖片 URL 是否可以正常訪問:', logoSetting.value)
}

console.log('')
console.log('=' .repeat(60))
