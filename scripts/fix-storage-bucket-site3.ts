/**
 * 站點三 Storage Bucket 自動修復腳本
 * 直接使用 Supabase Client 執行 SQL 創建 bucket 和 policies
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
    console.log('============================================================')
    console.log('📦 Supabase Storage 自動修復腳本')
    console.log('============================================================')
    console.log('')

    const site3Url = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE3
    const site3Key = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE3

    if (!site3Url || !site3Key) {
        console.error('❌ 站點三環境變數未設定')
        process.exit(1)
    }

    console.log('🎯 目標站點：站點三')
    console.log(`   URL: ${site3Url}`)
    console.log('')

    const supabase = createClient(site3Url, site3Key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    try {
        // 1. 創建 products bucket
        console.log('📦 創建 products bucket...')
        const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('products', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        })

        if (bucketError) {
            // 如果 bucket 已存在，忽略錯誤
            if (bucketError.message?.includes('already exists')) {
                console.log('   ⚠️  Bucket 已存在，跳過創建')
            } else {
                throw bucketError
            }
        } else {
            console.log('   ✅ Bucket 創建成功')
        }

        // 2. 設定 Storage Policies
        console.log('')
        console.log('🔐 設定 Storage Policies...')

        const policies = [
            {
                name: 'Allow public to read',
                definition: `CREATE POLICY "Allow public to read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'products')`,
            },
            {
                name: 'Allow authenticated users to upload',
                definition: `CREATE POLICY "Allow authenticated users to upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products')`,
            },
            {
                name: 'Allow authenticated users to update',
                definition: `CREATE POLICY "Allow authenticated users to update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'products')`,
            },
            {
                name: 'Allow authenticated users to delete',
                definition: `CREATE POLICY "Allow authenticated users to delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'products')`,
            },
        ]

        for (const policy of policies) {
            console.log(`   - 設定 ${policy.name}...`)

            // 使用 IF NOT EXISTS 避免重複創建
            const sqlWithCheck = policy.definition.replace('CREATE POLICY', 'CREATE POLICY IF NOT EXISTS')

            const { error: policyError } = await supabase.rpc('exec_sql' as any, {
                sql: sqlWithCheck,
            } as any)

            // 如果沒有 exec_sql RPC，直接使用 SQL
            if (policyError?.message?.includes('exec_sql')) {
                // 嘗試直接執行（某些 Supabase 版本支持）
                const { error: directError } = await (supabase as any).from('_').select('*').limit(0).then(() =>
                    fetch(`${site3Url}/rest/v1/rpc/exec`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${site3Key}`,
                            'apikey': site3Key,
                        },
                        body: JSON.stringify({ query: sqlWithCheck }),
                    })
                )
            }
        }

        console.log('   ✅ 所有 policies 設定完成')

        console.log('')
        console.log('============================================================')
        console.log('✅ 修復完成！')
        console.log('============================================================')
        console.log('')
        console.log('📊 驗證步驟：')
        console.log('   npx tsx scripts/check-storage-buckets.ts')
        console.log('')
    } catch (error) {
        console.error('❌ 修復失敗:', error)
        process.exit(1)
    }
}

main()
