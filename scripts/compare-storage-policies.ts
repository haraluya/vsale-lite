/**
 * 檢查站點二和站點三的 Storage Policies
 * 比對兩者差異，找出為何站點三有 RLS 錯誤
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function checkPolicies(siteName: string, url: string, key: string) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📋 檢查 ${siteName} 的 Storage Policies`)
    console.log('='.repeat(60))
    console.log(`URL: ${url}\n`)

    const supabase = createClient(url, key)

    try {
        // 嘗試列出 storage.objects 的 policies
        // 注意：這需要從資料庫直接查詢
        const { data, error } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'objects')
            .eq('schemaname', 'storage')

        if (error) {
            console.log(`❌ 無法查詢 policies: ${error.message}`)
            console.log('需要使用 SQL 查詢：')
            console.log(`
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%products%';
      `)
        } else {
            console.log(`找到 ${data?.length || 0} 個 policies:`)
            data?.forEach((policy: any) => {
                console.log(`  - ${policy.policyname}`)
            })
        }

        // 檢查 bucket 設定
        const { data: buckets } = await supabase.storage.listBuckets()
        const productsBucket = buckets?.find((b) => b.name === 'products')

        if (productsBucket) {
            console.log(`\n✅ products bucket 存在`)
            console.log(`   Public: ${productsBucket.public}`)
            console.log(`   File size limit: ${productsBucket.file_size_limit ? (productsBucket.file_size_limit / 1024 / 1024).toFixed(0) + 'MB' : 'unlimited'}`)
        } else {
            console.log(`\n❌ products bucket 不存在`)
        }

    } catch (error) {
        console.error(`❌ 檢查失敗:`, error)
    }
}

async function main() {
    console.log('============================================================')
    console.log('🔍 Storage Policies 比對工具')
    console.log('============================================================')

    const site2Url = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2
    const site2Key = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2
    const site3Url = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE3
    const site3Key = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE3

    if (site2Url && site2Key) {
        await checkPolicies('站點二', site2Url, site2Key)
    }

    if (site3Url && site3Key) {
        await checkPolicies('站點三', site3Url, site3Key)
    }

    console.log('\n' + '='.repeat(60))
    console.log('📋 建議')
    console.log('='.repeat(60))
    console.log('\n需要在 Supabase Dashboard 的 SQL Editor 執行以下查詢：')
    console.log(`
-- 查看站點三的 storage policies
SELECT 
  policyname,
  cmd,
  roles::text[],
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;
  `)
    console.log('\n然後與站點二比對，找出差異。')
    console.log('')
}

main()
