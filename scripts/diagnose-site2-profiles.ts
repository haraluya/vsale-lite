/**
 * 站點二 Profiles 資料診斷工具
 * 用途：檢查站點二的 profiles 表資料
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// 站點二配置
const SITE2_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2
const SITE2_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2

if (!SITE2_URL || !SITE2_SERVICE_KEY) {
  console.error('❌ 錯誤：缺少站點二環境變數')
  process.exit(1)
}

const supabase = createClient(SITE2_URL, SITE2_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('========================================')
  console.log('站點二 Profiles 資料診斷')
  console.log('========================================')
  console.log(`目標站點：${SITE2_URL}`)
  console.log()

  try {
    // 1. 檢查所有 profiles
    console.log('📊 查詢所有 profiles 記錄...')
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('*')

    if (allError) {
      console.error('❌ 查詢失敗:', allError.message)
      console.error('   Code:', allError.code)
      console.error('   Details:', allError.details)
      console.error('   Hint:', allError.hint)
      process.exit(1)
    }

    console.log(`✅ 找到 ${allProfiles?.length || 0} 筆 profiles 記錄`)
    console.log()

    if (allProfiles && allProfiles.length > 0) {
      console.log('Profiles 列表：')
      allProfiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ID: ${profile.id}`)
        console.log(`     Email: ${profile.email}`)
        console.log(`     Username: ${profile.username || '(無)'}`)
        console.log(`     Display Name: ${profile.display_name || '(無)'}`)
        console.log(`     Role: ${profile.role}`)
        console.log(`     Tier ID: ${profile.tier_id || '(無)'}`)
        console.log(`     Created: ${profile.created_at}`)
        console.log()
      })
    }

    // 2. 檢查管理員 profiles
    console.log('👤 查詢管理員 profiles (role = admin)...')
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')

    if (adminError) {
      console.error('❌ 查詢失敗:', adminError.message)
    } else {
      console.log(`✅ 找到 ${adminProfiles?.length || 0} 筆管理員記錄`)
      console.log()

      if (adminProfiles && adminProfiles.length > 0) {
        console.log('管理員列表：')
        adminProfiles.forEach((admin, index) => {
          console.log(`  ${index + 1}. Username: ${admin.username}`)
          console.log(`     Email: ${admin.email}`)
          console.log(`     Display Name: ${admin.display_name || '(無)'}`)
          console.log()
        })
      }
    }

    // 3. 檢查特定帳號 haraluya
    console.log('🔍 查詢帳號 haraluya...')
    const { data: haraluyaProfile, error: haraluyaError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'haraluya')
      .single()

    if (haraluyaError) {
      console.error('❌ 查詢失敗:', haraluyaError.message)
      console.error('   帳號 haraluya 不存在或查詢錯誤')
    } else if (haraluyaProfile) {
      console.log('✅ 找到帳號 haraluya')
      console.log('   詳細資訊：')
      console.log(`   ID: ${haraluyaProfile.id}`)
      console.log(`   Email: ${haraluyaProfile.email}`)
      console.log(`   Username: ${haraluyaProfile.username}`)
      console.log(`   Display Name: ${haraluyaProfile.display_name || '(無)'}`)
      console.log(`   Role: ${haraluyaProfile.role}`)
      console.log(`   Tier ID: ${haraluyaProfile.tier_id || '(無)'}`)
      console.log(`   Created: ${haraluyaProfile.created_at}`)
    }

    console.log()
    console.log('========================================')
    console.log('診斷完成')
    console.log('========================================')
  } catch (error) {
    console.error('❌ 發生錯誤:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
