#!/usr/bin/env node

/**
 * 驗證預設 Logo 是否成功設定
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function verifyLogo() {
  try {
    console.log('🔍 查詢 Logo 設定...\n')

    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value, value_type, updated_at')
      .eq('key', 'logo_url')
      .single()

    if (error) {
      throw new Error(`查詢失敗: ${error.message}`)
    }

    console.log('📋 系統設定:')
    console.log(`   Key: ${data.key}`)
    console.log(`   Value: ${data.value}`)
    console.log(`   Type: ${data.value_type}`)
    console.log(`   Updated At: ${data.updated_at}`)
    console.log('')

    if (data.value && data.value.includes('logo.png')) {
      console.log('✅ Logo 設定成功！')
      console.log('🌐 請訪問以下 URL 查看頁面:')
      console.log('   - 前台: http://localhost:3000')
      console.log('   - 後台: http://localhost:3000/admin/dashboard')
      console.log('   - 系統設定: http://localhost:3000/admin/system/settings')
    } else {
      console.log('⚠️  Logo URL 可能未正確設定')
    }

  } catch (error) {
    console.error('❌ 錯誤:', error)
    process.exit(1)
  }
}

verifyLogo()
