#!/usr/bin/env node

/**
 * 檢查管理員 Profile 是否正確設定
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminEmail = 'admin@test.com'

async function checkProfile() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('正在檢查管理員資料...\n')

    // 1. 查詢 auth.users
    console.log('1. 查詢 auth.users:')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email === adminEmail)
    if (!user) {
      console.log(`❌ 找不到用戶: ${adminEmail}`)
      return
    }

    console.log(`✓ 找到用戶`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Email Confirmed: ${user.email_confirmed_at ? '是' : '否'}`)
    console.log('')

    // 2. 查詢 profiles
    console.log('2. 查詢 profiles:')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log(`❌ Profile 查詢錯誤: ${profileError.message}`)
      console.log(`  Code: ${profileError.code}`)
      console.log(`  Details: ${profileError.details}`)
      return
    }

    if (!profile) {
      console.log(`❌ 找不到 Profile (User ID: ${user.id})`)
      return
    }

    console.log(`✓ 找到 Profile`)
    console.log(`  ID: ${profile.id}`)
    console.log(`  Email: ${profile.email}`)
    console.log(`  Phone: ${profile.phone || '(無)'}`)
    console.log(`  Role: ${profile.role}`)
    console.log(`  Tier ID: ${profile.tier_id || '(無)'}`)
    console.log('')

    // 3. 驗證設定
    console.log('3. 驗證設定:')
    if (profile.role === 'admin') {
      console.log('✓ 角色設定正確 (admin)')
    } else {
      console.log(`❌ 角色設定錯誤: ${profile.role}`)
    }

    if (profile.email === adminEmail) {
      console.log('✓ Email 設定正確')
    } else {
      console.log(`❌ Email 設定錯誤: ${profile.email}`)
    }

    console.log('')
    console.log('========================================')
    if (profile.role === 'admin' && profile.email === adminEmail) {
      console.log('✅ 管理員設定正確，可以登入')
    } else {
      console.log('⚠️  管理員設定有問題，需要修正')
    }
    console.log('========================================')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
  }
}

checkProfile()
