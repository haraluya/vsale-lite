#!/usr/bin/env node

/**
 * 建立本地 Supabase 測試管理員
 * 執行: node scripts/create-admin.mjs
 */

import { createClient } from '@supabase/supabase-js'

// 本地 Supabase 設定
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// 測試管理員資訊
const adminEmail = 'admin@test.com'
const adminPassword = 'Admin@123456'

async function createAdmin() {
  console.log('正在建立測試管理員帳號...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 1. 建立 Auth 用戶
    console.log('步驟 1: 建立 Auth 用戶...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {}
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠ 用戶已存在，跳過建立步驟')

        // 取得現有用戶
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) throw listError

        const existingUser = users.find(u => u.email === adminEmail)
        if (!existingUser) throw new Error('找不到現有用戶')

        authData.user = existingUser
      } else {
        throw authError
      }
    } else {
      console.log('✓ Auth 用戶建立成功')
    }

    const userId = authData.user.id
    console.log(`  User ID: ${userId}\n`)

    // 2. 建立 Profile（設定為管理員）
    console.log('步驟 2: 建立 Profile 並設定為管理員...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: adminEmail,  // 管理員必須有 email
        phone: null,
        role: 'admin',
        tier_id: null
      })

    if (profileError) throw profileError

    console.log('✓ Profile 建立成功\n')

    // 完成
    console.log('========================================')
    console.log('✅ 測試管理員帳號已建立')
    console.log('========================================')
    console.log(`Email: ${adminEmail}`)
    console.log(`Password: ${adminPassword}`)
    console.log(`User ID: ${userId}`)
    console.log('')
    console.log('登入後台: http://localhost:3000/admin/login')
    console.log('========================================\n')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
    console.error('\n請確認:')
    console.error('1. 本地 Supabase 正在運行 (supabase start)')
    console.error('2. 資料庫 Migrations 已執行 (supabase db reset)')
    process.exit(1)
  }
}

createAdmin()
