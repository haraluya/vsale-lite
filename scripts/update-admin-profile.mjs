#!/usr/bin/env node

/**
 * 更新現有用戶為管理員
 * 執行: node scripts/update-admin-profile.mjs
 */

import { createClient } from '@supabase/supabase-js'

// 本地 Supabase 設定
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminEmail = 'admin@test.com'

async function updateAdminProfile() {
  console.log('正在更新管理員 Profile...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 1. 取得用戶 ID
    console.log('步驟 1: 查找用戶...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email === adminEmail)
    if (!user) throw new Error(`找不到用戶: ${adminEmail}`)

    const userId = user.id
    console.log(`✓ 找到用戶 ID: ${userId}\n`)

    // 2. 更新 Profile
    console.log('步驟 2: 更新 Profile 為管理員...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: adminEmail,
        phone: null,
        role: 'admin',
        tier_id: null
      })

    if (profileError) throw profileError

    console.log('✓ Profile 更新成功\n')

    // 完成
    console.log('========================================')
    console.log('✅ 管理員帳號已設定完成')
    console.log('========================================')
    console.log(`Email: ${adminEmail}`)
    console.log(`Password: Admin@123456`)
    console.log(`User ID: ${userId}`)
    console.log('')
    console.log('登入後台: http://localhost:3000/admin/login')
    console.log('========================================\n')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
    process.exit(1)
  }
}

updateAdminProfile()
