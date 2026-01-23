/**
 * 測試站點二登入後的查詢權限（自動化版本）
 * 用途：模擬實際登入情況，測試 RLS 策略
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// 站點二配置
const SITE2_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2!
const SITE2_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SITE2!

// 測試帳號（您的管理員帳號）
const TEST_EMAIL = 'haraluya@admin.local'
const TEST_PASSWORD = '597052'

async function main() {
  console.log('========================================')
  console.log('站點二登入後查詢測試（自動化）')
  console.log('========================================')
  console.log()
  console.log(`目標站點：${SITE2_URL}`)
  console.log(`測試帳號：${TEST_EMAIL}`)
  console.log()

  // 1. 建立客戶端
  const supabase = createClient(SITE2_URL, SITE2_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // 2. 登入
    console.log('🔄 登入中...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (authError || !authData.user) {
      console.error('❌ 登入失敗:', authError?.message)
      process.exit(1)
    }

    console.log('✅ 登入成功')
    console.log(`   User ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)
    console.log()

    // 3. 查詢自己的 profile
    console.log('📊 測試 1: 查詢自己的 profile...')
    const { data: myProfile, error: myProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (myProfileError) {
      console.error('❌ 查詢失敗:', myProfileError.message)
    } else {
      console.log('✅ 查詢成功')
      console.log(`   Username: ${myProfile.username}`)
      console.log(`   Role: ${myProfile.role}`)
      console.log(`   Display Name: ${myProfile.display_name}`)
    }

    console.log()

    // 4. 查詢所有管理員（模擬 getAdmins 邏輯）
    console.log('📊 測試 2: 查詢所有管理員 (模擬 getAdmins)...')
    const { data: admins, error: adminsError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (adminsError) {
      console.error('❌ 查詢失敗:', adminsError.message)
      console.error('   Code:', adminsError.code)
      console.error('   Details:', adminsError.details)
      console.error('   Hint:', adminsError.hint)
      console.log()
      console.log('⚠️  這表示即使登入後也無法查詢管理員資料')
      console.log('   RLS 策略可能仍有問題')
    } else {
      console.log('✅ 查詢成功')
      console.log(`   找到 ${count} 筆記錄`)
      console.log(`   回傳 ${admins?.length} 筆資料`)

      if (admins && admins.length > 0) {
        console.log()
        console.log('   管理員列表：')
        admins.forEach((admin, index) => {
          console.log(`     ${index + 1}. ${admin.username} (${admin.display_name || '無暱稱'})`)
        })
      }
    }

    console.log()

    // 5. 查詢所有 profiles（不限角色）
    console.log('📊 測試 3: 查詢所有 profiles...')
    const { data: allProfiles, error: allError, count: allCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    if (allError) {
      console.error('❌ 查詢失敗:', allError.message)
    } else {
      console.log('✅ 查詢成功')
      console.log(`   找到 ${allCount} 筆記錄`)
    }

    console.log()
    console.log('========================================')
    console.log('測試結果分析')
    console.log('========================================')
    console.log()

    if (admins && admins.length > 0) {
      console.log('✅ RLS 策略正常運作！')
      console.log()
      console.log('登入後可以查詢管理員資料，這表示：')
      console.log('- RLS 策略已正確配置')
      console.log('- 已認證用戶可以讀取 profiles 資料')
      console.log()
      console.log('⚠️  如果網站仍然顯示「系統錯誤」，可能的原因：')
      console.log()
      console.log('1. 瀏覽器快取問題')
      console.log('   解決方式：清除瀏覽器快取並強制重新整理 (Ctrl+Shift+R)')
      console.log()
      console.log('2. Vercel 部署快取問題')
      console.log('   解決方式：在 Vercel Dashboard 觸發重新部署')
      console.log('   或在本地執行 git commit --allow-empty && git push')
      console.log()
      console.log('3. Server Component 快取問題')
      console.log('   解決方式：在頁面 URL 加上時間戳參數強制刷新')
      console.log('   例如：https://vsale-site2.vercel.app/admin/system/members?t=123456')
      console.log()
      console.log('4. Session Cookie 問題')
      console.log('   解決方式：登出後重新登入')
      console.log()
    } else {
      console.log('❌ RLS 策略仍有問題')
      console.log()
      console.log('即使登入後也無法查詢管理員資料，這表示：')
      console.log('- RLS 策略可能配置錯誤')
      console.log('- 需要檢查 Supabase Dashboard 的策略設定')
      console.log()
      console.log('建議檢查：')
      console.log('1. Supabase Dashboard → Authentication → Policies')
      console.log('2. 確認 "Allow admin to read all profiles" 策略存在')
      console.log('3. 確認策略的 USING 條件是 true（不是其他複雜條件）')
    }

    console.log()

    // 6. 登出
    await supabase.auth.signOut()
  } catch (error) {
    console.error('❌ 發生錯誤:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
