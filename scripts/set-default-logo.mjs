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

/**
 * 設定預設 Logo URL（使用現有的 /logo.svg）
 * 或者清空 Logo URL 讓前台使用預設值
 */
async function setDefaultLogo() {
  console.log('🔧 設定預設 Logo URL...\n')

  // 選項 1: 設定為 /logo.svg（如果你有這個檔案）
  // 選項 2: 設定為空字串（讓前台使用預設值）
  const defaultLogoUrl = '' // 空字串會讓前台使用 /logo.svg

  const { data, error } = await supabase
    .from('system_settings')
    .update({
      value: defaultLogoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'logo_url')
    .select()

  if (error) {
    console.error('❌ 更新失敗:', error)
    process.exit(1)
  }

  console.log('✅ Logo URL 已更新:')
  console.log(JSON.stringify(data, null, 2))

  console.log('\n📝 說明:')
  if (defaultLogoUrl === '') {
    console.log('   已清空 Logo URL')
    console.log('   前台將使用預設 Logo（/logo.svg）')
    console.log('   請在後台系統設定頁面上傳自訂 Logo')
  } else {
    console.log('   已設定 Logo URL:', defaultLogoUrl)
  }
}

setDefaultLogo()
