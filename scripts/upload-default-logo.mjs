#!/usr/bin/env node

/**
 * 上傳預設 Logo 到系統設定
 * 用途：將 vsale_default.png 設定為系統預設 Logo
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase 配置（本地開發環境）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function uploadDefaultLogo() {
  try {
    console.log('🚀 開始上傳預設 Logo...')

    // 1. 讀取圖片檔案
    const logoPath = join(__dirname, '..', 'vsale_default.png')
    const fileBuffer = readFileSync(logoPath)
    const blob = new Blob([fileBuffer], { type: 'image/png' })

    console.log(`📁 讀取圖片: ${logoPath}`)
    console.log(`📊 檔案大小: ${(fileBuffer.length / 1024).toFixed(2)} KB`)

    // 2. 刪除舊的 Logo 檔案（如果存在）
    const { data: existingFiles } = await supabase.storage
      .from('products')
      .list('system', {
        search: 'logo',
      })

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .filter((file) => file.name.startsWith('logo.'))
        .map((file) => `system/${file.name}`)

      if (filesToDelete.length > 0) {
        console.log(`🗑️  刪除舊檔案: ${filesToDelete.join(', ')}`)
        await supabase.storage.from('products').remove(filesToDelete)
      }
    }

    // 3. 上傳新 Logo
    const filePath = 'system/logo.png'
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`上傳失敗: ${uploadError.message}`)
    }

    console.log(`✅ 上傳成功: ${filePath}`)

    // 4. 取得公開 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(filePath)

    console.log(`🔗 公開 URL: ${publicUrl}`)

    // 5. 更新 system_settings 表
    const { error: updateError } = await supabase
      .from('system_settings')
      .update({
        value: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'logo_url')

    if (updateError) {
      throw new Error(`更新設定失敗: ${updateError.message}`)
    }

    console.log('✅ 更新系統設定成功')
    console.log('\n🎉 預設 Logo 設定完成！')
    console.log('📝 請重新整理頁面查看新 Logo')

  } catch (error) {
    console.error('❌ 錯誤:', error)
    process.exit(1)
  }
}

// 執行腳本
uploadDefaultLogo()
