import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

// Use service role to bypass RLS for checking
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAdmin() {
  console.log('🔍 檢查管理員帳號...\n')

  // 1. 檢查 profiles 表 (使用 service role 繞過 RLS)
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, email, role, display_name, created_at')
    .eq('role', 'admin')

  if (profileError) {
    console.error('❌ 查詢 profiles 失敗:', profileError.message)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ 未找到管理員帳號')
    return
  }

  console.log(`✅ 找到 ${profiles.length} 個管理員:`)
  profiles.forEach((profile, index) => {
    console.log(`\n管理員 ${index + 1}:`)
    console.log('   ID:', profile.id)
    console.log('   Username:', profile.username)
    console.log('   Email:', profile.email)
    console.log('   Display Name:', profile.display_name)
    console.log('   Created:', profile.created_at)
  })
  console.log()

  const profile = profiles[0]

  // 2. 嘗試登入測試
  console.log('🔐 測試登入流程...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: 'password123',
  })

  if (signInError) {
    console.error('❌ 登入失敗:', signInError.message)
  } else {
    console.log('✅ 登入成功!')
    console.log('   User ID:', signInData.user.id)
    console.log('   Email:', signInData.user.email)
  }
}

checkAdmin()
