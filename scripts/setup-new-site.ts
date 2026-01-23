/**
 * 新站點完整設置腳本
 * 用途：一鍵完成新站點的所有設置（Migration + RLS + 管理員 + 驗證）
 *
 * 使用方式：
 *   pnpm tsx scripts/setup-new-site.ts <site-name>
 *
 * 範例：
 *   pnpm tsx scripts/setup-new-site.ts site3
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import * as readline from 'readline'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// 建立 readline 介面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

interface SiteConfig {
  name: string
  url: string
  anonKey: string
  serviceKey: string
}

async function getSiteConfig(siteName: string): Promise<SiteConfig> {
  const envPrefix = siteName.toUpperCase().replace('-', '_')

  const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${envPrefix}`]
  const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${envPrefix}`]
  const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${envPrefix}`]

  if (!url || !anonKey || !serviceKey) {
    throw new Error(`缺少站點環境變數！請在 .env.local 設定：
    NEXT_PUBLIC_SUPABASE_URL_${envPrefix}
    NEXT_PUBLIC_SUPABASE_ANON_KEY_${envPrefix}
    SUPABASE_SERVICE_ROLE_KEY_${envPrefix}`)
  }

  return { name: siteName, url, anonKey, serviceKey }
}

async function checkMigrations(config: SiteConfig) {
  console.log('========================================')
  console.log('步驟 1/5: 檢查 Migration 狀態')
  console.log('========================================')
  console.log()

  console.log('⚠️  重要提醒：')
  console.log('在執行此腳本之前，請先確保已推送 Migration：')
  console.log()
  console.log('  supabase link --project-ref <project-id>')
  console.log('  supabase db push')
  console.log()

  const answer = await question('是否已完成 Migration 推送？(y/N): ')

  if (answer.toLowerCase() !== 'y') {
    console.log()
    console.log('請先完成 Migration 推送，然後重新執行此腳本')
    return false
  }

  console.log('✅ Migration 已確認')
  return true
}

async function fixRLSPolicies(config: SiteConfig) {
  console.log()
  console.log('========================================')
  console.log('步驟 2/5: 修復 RLS 策略（防止無限遞迴）')
  console.log('========================================')
  console.log()

  const supabase = createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    console.log('🔄 刪除可能有問題的策略...')

    // 刪除所有 profiles 策略
    const policiesToDrop = [
      'Admins can view all profiles',
      'Allow admin to manage profiles',
      'Allow admin to read all profiles',
      'Allow admins to manage profiles',
      'Allow users to read own profile',
      'Profiles are viewable by authenticated users',
      'Users can update own profile',
      'Allow authenticated to read profiles',
    ]

    for (const policyName of policiesToDrop) {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `DROP POLICY IF EXISTS "${policyName}" ON public.profiles`,
      })
      // 忽略錯誤（策略可能不存在）
    }

    console.log('✅ 已清理舊策略')
    console.log()

    console.log('🔄 建立正確的 RLS 策略...')

    // 策略 1: 允許所有已認證用戶讀取 profiles（不查詢 profiles 表，避免遞迴）
    const { error: policy1Error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY "Allow authenticated to read profiles"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (true)
      `,
    })

    if (policy1Error) {
      console.error('❌ 建立策略 1 失敗:', policy1Error.message)
      return false
    }

    // 策略 2: 允許修改自己的資料
    const { error: policy2Error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY "Allow users to update own profile"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid())
      `,
    })

    if (policy2Error) {
      console.error('❌ 建立策略 2 失敗:', policy2Error.message)
      return false
    }

    console.log('✅ RLS 策略已建立')
    return true
  } catch (error) {
    console.error('❌ 修復 RLS 策略失敗:', error instanceof Error ? error.message : String(error))
    return false
  }
}

async function createAdminUser(config: SiteConfig) {
  console.log()
  console.log('========================================')
  console.log('步驟 3/5: 建立管理員帳號')
  console.log('========================================')
  console.log()

  const supabase = createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 輸入管理員資訊
    const username = await question('管理員帳號 (username): ')
    if (!username || username.trim() === '') {
      console.error('❌ 帳號不可為空')
      return null
    }

    const displayName = await question('暱稱 (display_name，可選): ')
    const password = await question('密碼（至少 6 字元）: ')
    if (!password || password.length < 6) {
      console.error('❌ 密碼至少需要 6 字元')
      return null
    }

    console.log()
    console.log('🔄 建立管理員帳號...')

    // 產生虛擬 Email
    const virtualEmail = `${username}@admin.local`

    // 建立 Auth User
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: virtualEmail,
      password: password,
      email_confirm: true,
    })

    if (authError || !authUser.user) {
      console.error('❌ 建立認證用戶失敗:', authError?.message)
      return null
    }

    console.log('✅ 認證用戶已建立')

    // 建立 Profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.user.id,
      email: virtualEmail,
      username: username,
      display_name: displayName || null,
      role: 'admin',
    })

    if (profileError) {
      console.error('❌ 建立使用者資料失敗:', profileError.message)
      // 回滾
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return null
    }

    console.log('✅ 管理員帳號建立成功')

    return { username, password, email: virtualEmail, userId: authUser.user.id }
  } catch (error) {
    console.error('❌ 建立管理員失敗:', error instanceof Error ? error.message : String(error))
    return null
  }
}

async function verifySetup(config: SiteConfig, adminInfo: any) {
  console.log()
  console.log('========================================')
  console.log('步驟 4/5: 驗證設置')
  console.log('========================================')
  console.log()

  const supabase = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 測試登入
    console.log('🔄 測試 1: 登入功能...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: adminInfo.email,
      password: adminInfo.password,
    })

    if (authError || !authData.user) {
      console.error('❌ 登入失敗:', authError?.message)
      return false
    }

    console.log('✅ 登入成功')

    // 測試查詢自己的 profile
    console.log('🔄 測試 2: 查詢自己的資料...')
    const { data: myProfile, error: myProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (myProfileError) {
      console.error('❌ 查詢失敗:', myProfileError.message)
      return false
    }

    console.log('✅ 查詢成功')

    // 測試查詢所有管理員（檢查 RLS 策略）
    console.log('🔄 測試 3: 查詢管理員列表（檢查 RLS）...')
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')

    if (adminsError) {
      console.error('❌ 查詢失敗:', adminsError.message)
      console.error('   這表示 RLS 策略有問題（可能是無限遞迴）')
      return false
    }

    console.log('✅ 查詢成功，找到', admins?.length, '筆管理員資料')

    // 登出
    await supabase.auth.signOut()

    return true
  } catch (error) {
    console.error('❌ 驗證失敗:', error instanceof Error ? error.message : String(error))
    return false
  }
}

async function showSummary(config: SiteConfig, adminInfo: any) {
  console.log()
  console.log('========================================')
  console.log('步驟 5/5: 設置完成！')
  console.log('========================================')
  console.log()
  console.log('✅ 站點設置成功！')
  console.log()
  console.log('站點資訊：')
  console.log(`  名稱: ${config.name}`)
  console.log(`  URL: ${config.url}`)
  console.log()
  console.log('管理員帳號：')
  console.log(`  帳號: ${adminInfo.username}`)
  console.log(`  密碼: ${adminInfo.password}`)
  console.log(`  Email: ${adminInfo.email}`)
  console.log()
  console.log('下一步：')
  console.log('1. 執行資料遷移（如需要）')
  console.log('2. 前往站點登入測試')
  console.log('3. 更新 Vercel 環境變數')
  console.log()
}

async function main() {
  console.log('========================================')
  console.log('新站點完整設置工具')
  console.log('========================================')
  console.log()

  try {
    // 取得站點名稱
    const args = process.argv.slice(2)
    const siteName = args[0] || (await question('請輸入站點名稱 (例如: site3): '))

    if (!siteName) {
      console.error('❌ 站點名稱不可為空')
      rl.close()
      process.exit(1)
    }

    // 載入站點配置
    console.log(`載入站點配置: ${siteName}`)
    const config = await getSiteConfig(siteName)
    console.log(`目標站點: ${config.url}`)
    console.log()

    // 步驟 1: 檢查 Migration
    const migrationOk = await checkMigrations(config)
    if (!migrationOk) {
      rl.close()
      process.exit(1)
    }

    // 步驟 2: 修復 RLS 策略
    const rlsOk = await fixRLSPolicies(config)
    if (!rlsOk) {
      console.error('❌ RLS 策略修復失敗')
      rl.close()
      process.exit(1)
    }

    // 步驟 3: 建立管理員
    const adminInfo = await createAdminUser(config)
    if (!adminInfo) {
      console.error('❌ 管理員建立失敗')
      rl.close()
      process.exit(1)
    }

    // 步驟 4: 驗證設置
    const verifyOk = await verifySetup(config, adminInfo)
    if (!verifyOk) {
      console.error('❌ 設置驗證失敗')
      rl.close()
      process.exit(1)
    }

    // 步驟 5: 顯示摘要
    await showSummary(config, adminInfo)
  } catch (error) {
    console.error('❌ 設置失敗:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
