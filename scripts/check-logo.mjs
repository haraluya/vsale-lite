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
  console.error('Missing env variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 檢查 logo_url 設定
const { data, error } = await supabase
  .from('system_settings')
  .select('*')
  .eq('key', 'logo_url')
  .single()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Logo URL 設定:', JSON.stringify(data, null, 2))
}

// 測試公開 API
try {
  const response = await fetch(`${supabaseUrl.replace('qwovavytryvgchcowjof.supabase.co', 'localhost:3000')}/api/public-settings`)
  const result = await response.json()
  console.log('\nPublic Settings API 回應:', JSON.stringify(result, null, 2))
} catch (err) {
  console.error('\nPublic Settings API 錯誤:', err.message)
}
