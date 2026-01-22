/**
 * 診斷 tier_prices 顯示問題的腳本
 * 直接查詢資料庫，檢查資料完整性
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { join } from 'path'

// 載入環境變數
config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數！')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugTierPricesDisplay() {
  console.log('🔍 診斷 tier_prices 顯示問題...\n')

  // 1. 檢查系列
  const { data: series, error: seriesError } = await supabase
    .from('series')
    .select('id, name')
    .order('name')

  if (seriesError) {
    console.error('❌ 系列查詢失敗:', seriesError)
    return
  }

  console.log(`📦 系列列表 (${series?.length ?? 0} 個):`)
  series?.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.id})`)
  })

  // 2. 測試 MONSKR驚艷料 系列
  const monskrSeries = series?.find((s) => s.name.includes('MONSKR'))
  if (!monskrSeries) {
    console.log('\n⚠️ 找不到 MONSKR驚艷料 系列')
    return
  }

  console.log(`\n\n🎯 測試系列: ${monskrSeries.name}`)
  console.log(`   ID: ${monskrSeries.id}\n`)

  // 3. 查詢該系列的商品
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('series_id', monskrSeries.id)
    .order('code')

  if (productsError) {
    console.error('❌ 商品查詢失敗:', productsError)
    return
  }

  console.log(`📊 商品數量: ${products?.length ?? 0}`)

  if (!products || products.length === 0) {
    console.log('⚠️ 該系列沒有商品')
    return
  }

  // 4. 查詢等級
  const { data: tiers, error: tiersError } = await supabase
    .from('tiers')
    .select('*')
    .order('rank')

  if (tiersError) {
    console.error('❌ 等級查詢失敗:', tiersError)
    return
  }

  console.log(`\n🎯 會員等級 (${tiers?.length ?? 0} 個):`)
  tiers?.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name} (rank: ${t.rank}) - ${t.id}`)
  })

  // 5. 查詢價格資料
  const productIds = products.map((p) => p.id)
  const { data: tierPrices, error: tierPricesError, count } = await supabase
    .from('tier_prices')
    .select('*', { count: 'exact' })
    .in('product_id', productIds)

  if (tierPricesError) {
    console.error('\n❌ 價格查詢失敗:', tierPricesError)
    return
  }

  console.log(`\n💰 價格資料:`)
  console.log(`   總數: ${count ?? 0} 筆`)
  console.log(`   預期: ${products.length * (tiers?.length ?? 0)} 筆 (${products.length} 商品 × ${tiers?.length ?? 0} 等級)`)

  if (!tierPrices || tierPrices.length === 0) {
    console.log(`\n⚠️⚠️⚠️ 問題發現：tier_prices 表是空的！`)
    console.log(`   系列: ${monskrSeries.name}`)
    console.log(`   商品數量: ${products.length}`)
    console.log(`   等級數量: ${tiers?.length ?? 0}`)
    console.log(`\n💡 建議：`)
    console.log(`   1. 使用價格管理頁面重新設定價格`)
    console.log(`   2. 或執行 scripts/restore-tier-prices.sql 腳本`)
    return
  }

  // 6. 分析價格分佈
  console.log(`\n📈 價格分佈:`)
  const pricesByTier = new Map<string, number>()
  tierPrices.forEach((tp) => {
    const tier = tiers?.find((t) => t.id === tp.tier_id)
    if (tier) {
      const count = pricesByTier.get(tier.name) || 0
      pricesByTier.set(tier.name, count + 1)
    }
  })

  tiers?.forEach((tier) => {
    const count = pricesByTier.get(tier.name) || 0
    const coverage = ((count / products.length) * 100).toFixed(1)
    console.log(`   ${tier.name}: ${count}/${products.length} (${coverage}%)`)
  })

  // 7. 顯示前 3 個商品的價格
  console.log(`\n📋 前 3 個商品的價格:`)
  for (let i = 0; i < Math.min(3, products.length); i++) {
    const product = products[i]
    console.log(`\n   ${i + 1}. ${product.name} (${product.code})`)
    console.log(`      零售價: $${product.retail_price}`)

    tiers?.forEach((tier) => {
      const price = tierPrices.find(
        (tp) => tp.product_id === product.id && tp.tier_id === tier.id
      )
      if (price) {
        console.log(`      ${tier.name}: $${price.price}`)
      } else {
        console.log(`      ${tier.name}: 未設定`)
      }
    })
  }

  console.log(`\n✅ 診斷完成`)
}

debugTierPricesDisplay().catch((error) => {
  console.error('\n❌ 執行錯誤:', error)
  process.exit(1)
})
