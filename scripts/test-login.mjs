import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  console.log('🔐 測試管理員登入流程...\n')

  const username = 'admin'
  const password = 'password123'

  // Step 1: 查詢 username 對應的 email
  console.log('Step 1: 查詢 username...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('username', username)
    .eq('role', 'admin')
    .single()

  console.log('Profile 查詢結果:', { profile, error: profileError })

  if (profileError || !profile) {
    console.error('❌ 查詢失敗或找不到帳號')
    return
  }

  console.log(`✅ 找到帳號: ${profile.email}\n`)

  // Step 2: 使用 email 登入
  console.log('Step 2: 使用 email 登入...')
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: password,
  })

  console.log('登入結果:', { user: authData?.user?.id, error: signInError })

  if (signInError) {
    console.error('❌ 登入失敗:', signInError.message)
    return
  }

  console.log('✅ 登入成功!')
  console.log('User ID:', authData.user.id)
  console.log('Email:', authData.user.email)

  // Step 3: 檢查 session
  const { data: sessionData } = await supabase.auth.getSession()
  console.log('\nSession:', sessionData.session ? '✅ 存在' : '❌ 不存在')
}

testLogin()
