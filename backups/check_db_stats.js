// 查詢雲端資料庫統計資訊
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qwovavytryvgchcowjof.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI4MTU3NCwiZXhwIjoyMDgyODU3NTc0fQ.zcyKpbeqPJ-RxM4mkkU5zPdzv0YrD0s0iOOcXqGIEdA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getTableCounts() {
  const tables = [
    'profiles',
    'tiers',
    'categories',
    'series',
    'products',
    'tier_prices',
    'coupons',
    'user_coupons',
    'coupon_tier_restrictions',
    'coupon_series_restrictions',
    'orders',
    'order_items',
    'order_timelines',
    'order_custom_fees',
    'announcements',
    'audit_logs',
    'system_settings'
  ]

  const results = {}

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        results[table] = `ERROR: ${error.message}`
      } else {
        results[table] = count
      }
    } catch (err) {
      results[table] = `ERROR: ${err.message}`
    }
  }

  return results
}

getTableCounts().then(results => {
  console.log('='.repeat(60))
  console.log('雲端資料庫統計（備份前）')
  console.log('='.repeat(60))

  let totalRecords = 0
  let tableCount = 0

  for (const [table, count] of Object.entries(results)) {
    if (typeof count === 'number') {
      console.log(`${table.padEnd(30)} ${count} 筆`)
      totalRecords += count
      tableCount++
    } else {
      console.log(`${table.padEnd(30)} ${count}`)
    }
  }

  console.log('='.repeat(60))
  console.log(`總計: ${tableCount} 個表，${totalRecords} 筆資料`)
  console.log('='.repeat(60))
})
