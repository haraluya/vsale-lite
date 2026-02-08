/**
 * Supabase Storage Bucket 驗證工具
 * 用途：檢查站點二和站點三的 products bucket 是否存在
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// 載入 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

interface BucketCheckResult {
    site: string
    url: string
    bucketExists: boolean
    buckets: string[]
    error?: string
}

async function checkBucket(
    siteName: string,
    supabaseUrl: string,
    supabaseKey: string
): Promise<BucketCheckResult> {
    console.log(`\n🔍 檢查 ${siteName}...`)
    console.log(`   URL: ${supabaseUrl}`)

    try {
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 列出所有 buckets
        const { data: buckets, error } = await supabase.storage.listBuckets()

        if (error) {
            return {
                site: siteName,
                url: supabaseUrl,
                bucketExists: false,
                buckets: [],
                error: error.message,
            }
        }

        const bucketNames = buckets?.map((b) => b.name) || []
        const hasProductsBucket = bucketNames.includes('products')

        return {
            site: siteName,
            url: supabaseUrl,
            bucketExists: hasProductsBucket,
            buckets: bucketNames,
        }
    } catch (error) {
        return {
            site: siteName,
            url: supabaseUrl,
            bucketExists: false,
            buckets: [],
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

async function main() {
    console.log('='.repeat(60))
    console.log('📦 Supabase Storage Bucket 驗證工具')
    console.log('='.repeat(60))

    // 從環境變數讀取配置
    const site2Url = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2
    const site2Key = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2
    const site3Url = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE3
    const site3Key = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE3

    if (!site2Url || !site2Key) {
        console.error('❌ 站點二環境變數未設定')
        console.error('   需要: NEXT_PUBLIC_SUPABASE_URL_SITE2, SUPABASE_SERVICE_ROLE_KEY_SITE2')
    }

    if (!site3Url || !site3Key) {
        console.error('❌ 站點三環境變數未設定')
        console.error('   需要: NEXT_PUBLIC_SUPABASE_URL_SITE3, SUPABASE_SERVICE_ROLE_KEY_SITE3')
    }

    const results: BucketCheckResult[] = []

    // 檢查站點二
    if (site2Url && site2Key) {
        const result = await checkBucket('站點二', site2Url, site2Key)
        results.push(result)
    }

    // 檢查站點三
    if (site3Url && site3Key) {
        const result = await checkBucket('站點三', site3Url, site3Key)
        results.push(result)
    }

    // 顯示結果
    console.log('\n' + '='.repeat(60))
    console.log('📊 檢查結果')
    console.log('='.repeat(60))

    for (const result of results) {
        console.log(`\n${result.site}:`)
        console.log(`  URL: ${result.url}`)

        if (result.error) {
            console.log(`  ❌ 錯誤: ${result.error}`)
        } else {
            console.log(`  找到的 buckets: [${result.buckets.join(', ')}]`)
            if (result.bucketExists) {
                console.log(`  ✅ products bucket 存在`)
            } else {
                console.log(`  ❌ products bucket 不存在 - 需要手動創建`)
            }
        }
    }

    // 總結
    console.log('\n' + '='.repeat(60))
    console.log('📋 總結')
    console.log('='.repeat(60))

    const missingBuckets = results.filter((r) => !r.bucketExists && !r.error)

    if (missingBuckets.length === 0) {
        console.log('✅ 所有站點都有 products bucket')
    } else {
        console.log(`❌ 以下站點缺少 products bucket:`)
        for (const result of missingBuckets) {
            console.log(`   - ${result.site}`)
        }
        console.log('\n請參考 implementation_plan.md 中的步驟手動創建 bucket')
    }

    console.log('\n')
}

main().catch(console.error)
