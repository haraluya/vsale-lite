// 測試 Supabase Auth 登入
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)

async function testLogin() {
  console.log('測試登入：admin@example.com / password123')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'password123',
  })

  if (error) {
    console.error('❌ 登入失敗:', error)
    return
  }

  console.log('✅ 登入成功!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)

  // 查詢 profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    console.error('❌ 查詢 profile 失敗:', profileError)
    return
  }

  console.log('✅ Profile 查詢成功!')
  console.log('Role:', profile.role)
  console.log('Display Name:', profile.display_name)
}

testLogin()
