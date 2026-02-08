/**
 * 檢查並修復站點三的 Storage Policies
 * 使用正確的 SQL 方式重新創建 policies
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
    console.log('============================================================')
    console.log('🔐 Storage Policies 修復腳本')
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

    // 使用 REST API 直接執行 SQL
    const executeSQL = async (sql: string, description: string) => {
        console.log(`   - ${description}...`)
        try {
            const response = await fetch(`${site3Url}/rest/v1/rpc/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${site3Key}`,
                    'apikey': site3Key,
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({ query: sql }),
            })

            if (!response.ok) {
                // 嘗試使用 Supabase 管理 API
                const supabase = createClient(site3Url, site3Key)

                // 直接使用 pg 執行
                const { error } = await supabase.rpc('exec' as any, { sql } as any)

                if (error && !error.message?.includes('does not exist')) {
                    console.log(`     ⚠️  ${error.message}`)
                }
            }
            console.log(`     ✅ 完成`)
        } catch (error) {
            console.log(`     ⚠️  ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    console.log('🗑️  清除舊的 policies...')

    // 刪除可能存在的舊 policies
    const oldPolicies = [
        'Allow public to read',
        'Allow authenticated users to upload',
        'Allow authenticated users to update',
        'Allow authenticated users to delete',
    ]

    for (const policyName of oldPolicies) {
        await executeSQL(
            `DROP POLICY IF EXISTS "${policyName}" ON storage.objects;`,
            `刪除舊 policy: ${policyName}`
        )
    }

    console.log('')
    console.log('🔐 創建新的 Storage Policies...')

    // 創建新的 policies
    const policies = [
        {
            name: 'Allow public to read',
            sql: `
        CREATE POLICY "Allow public to read"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'products');
      `,
        },
        {
            name: 'Allow authenticated users to upload',
            sql: `
        CREATE POLICY "Allow authenticated users to upload"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'products');
      `,
        },
        {
            name: 'Allow authenticated users to update',
            sql: `
        CREATE POLICY "Allow authenticated users to update"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'products');
      `,
        },
        {
            name: 'Allow authenticated users to delete',
            sql: `
        CREATE POLICY "Allow authenticated users to delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'products');
      `,
        },
    ]

    // 先嘗試通過 Supabase SQL Editor API
    console.log('   使用 Supabase SQL Editor API...')

    const allSQL = policies.map(p => p.sql).join('\n')

    try {
        const response = await fetch(`${site3Url.replace('https://', 'https://api.')}/v1/projects/${site3Url.split('//')[1].split('.')[0]}/sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${site3Key}`,
            },
            body: JSON.stringify({
                query: allSQL,
            }),
        })

        if (response.ok) {
            console.log('   ✅ Policies 創建成功')
        } else {
            console.log('   ⚠️  API 方法失敗，請手動執行 SQL')
            console.log('')
            console.log('請在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL:')
            console.log('='.repeat(60))
            console.log(allSQL)
            console.log('='.repeat(60))
        }
    } catch (error) {
        console.log('   ⚠️  自動執行失敗')
        console.log('')
        console.log('請在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL:')
        console.log('='.repeat(60))
        console.log(allSQL)
        console.log('='.repeat(60))
    }

    console.log('')
    console.log('============================================================')
    console.log('📋 後續步驟')
    console.log('============================================================')
    console.log('')
    console.log('1. 前往 Supabase Dashboard')
    console.log('2. 選擇站點三專案 (dewhcpfzrzewgknaqzwy)')
    console.log('3. SQL Editor → 執行上方的 SQL')
    console.log('4. 重新測試廣告上傳')
    console.log('')
}

main()
