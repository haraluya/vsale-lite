#!/usr/bin/env node

/**
 * 重置管理員密碼
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminEmail = 'admin@test.com'
const newPassword = 'Admin@123456'

async function resetPassword() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('正在重置管理員密碼...\n')

    // 查找用戶
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email === adminEmail)
    if (!user) throw new Error(`找不到用戶: ${adminEmail}`)

    console.log(`找到用戶 ID: ${user.id}`)
    console.log(`正在更新密碼...\n`)

    // 重置密碼
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (error) throw error

    console.log('========================================')
    console.log('✅ 密碼重置成功')
    console.log('========================================')
    console.log(`Email: ${adminEmail}`)
    console.log(`新密碼: ${newPassword}`)
    console.log('')
    console.log('請使用新密碼登入: http://localhost:3000/admin/login')
    console.log('========================================')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
    process.exit(1)
  }
}

resetPassword()
