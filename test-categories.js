/**
 * 測試腳本：檢查 categories 表的資料
 * 使用方式：在瀏覽器 Console 執行
 */

// 1. 檢查環境變數
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已設定' : '未設定')

// 2. 直接查詢 categories
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 3. 測試查詢
async function testCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, status, sort_order')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })

  console.log('Categories data:', data)
  console.log('Categories error:', error)
}

testCategories()
