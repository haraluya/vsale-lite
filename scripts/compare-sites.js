/**
 * 站點資料比較工具
 * 用途：比較主站點與站點二的資料一致性，無需載入大型 SQL 檔案
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 站點配置
const MAIN_SITE = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  name: '主站點'
};

const SITE_2 = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2,
  name: '站點二'
};

// 需要比較的資料表（按依賴順序排列）
const TABLES = [
  'tiers',
  'categories',
  'series',
  'products',
  'tier_prices',
  'coupons',
  'coupon_tier_restrictions',
  'coupon_series_restrictions',
  'system_settings'
];

async function compareTable(mainClient, site2Client, tableName) {
  console.log(`\n📊 比較資料表: ${tableName}`);

  try {
    // 獲取兩邊的資料數量
    const [mainResult, site2Result] = await Promise.all([
      mainClient.from(tableName).select('*', { count: 'exact', head: true }),
      site2Client.from(tableName).select('*', { count: 'exact', head: true })
    ]);

    const mainCount = mainResult.count || 0;
    const site2Count = site2Result.count || 0;

    console.log(`  主站點: ${mainCount} 筆`);
    console.log(`  站點二: ${site2Count} 筆`);

    if (mainCount === site2Count) {
      console.log(`  ✅ 數量一致`);
    } else {
      console.log(`  ❌ 數量不一致 (差異: ${Math.abs(mainCount - site2Count)} 筆)`);
    }

    // 詳細比較（採樣前 10 筆檢查結構）
    if (mainCount > 0) {
      const [mainSample, site2Sample] = await Promise.all([
        mainClient.from(tableName).select('*').limit(10),
        site2Client.from(tableName).select('*').limit(10)
      ]);

      const mainColumns = mainSample.data?.[0] ? Object.keys(mainSample.data[0]).sort() : [];
      const site2Columns = site2Sample.data?.[0] ? Object.keys(site2Sample.data[0]).sort() : [];

      const columnMatch = JSON.stringify(mainColumns) === JSON.stringify(site2Columns);

      if (columnMatch) {
        console.log(`  ✅ 欄位結構一致`);
      } else {
        console.log(`  ❌ 欄位結構不一致`);
        const onlyInMain = mainColumns.filter(c => !site2Columns.includes(c));
        const onlyInSite2 = site2Columns.filter(c => !mainColumns.includes(c));
        if (onlyInMain.length > 0) console.log(`    僅主站點有: ${onlyInMain.join(', ')}`);
        if (onlyInSite2.length > 0) console.log(`    僅站點二有: ${onlyInSite2.join(', ')}`);
      }
    }

    return {
      table: tableName,
      mainCount,
      site2Count,
      match: mainCount === site2Count
    };

  } catch (error) {
    console.error(`  ❌ 比較失敗: ${error.message}`);
    return {
      table: tableName,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 站點資料比較工具\n');
  console.log(`主站點: ${MAIN_SITE.url}`);
  console.log(`站點二: ${SITE_2.url}\n`);
  console.log('='.repeat(60));

  // 建立連線
  const mainClient = createClient(MAIN_SITE.url, MAIN_SITE.key);
  const site2Client = createClient(SITE_2.url, SITE_2.key);

  // 逐表比較
  const results = [];
  for (const table of TABLES) {
    const result = await compareTable(mainClient, site2Client, table);
    results.push(result);
  }

  // 總結報告
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 比較總結:\n');

  const matchedTables = results.filter(r => r.match && !r.error);
  const mismatchedTables = results.filter(r => !r.match && !r.error);
  const errorTables = results.filter(r => r.error);

  console.log(`✅ 一致: ${matchedTables.length} 個資料表`);
  console.log(`❌ 不一致: ${mismatchedTables.length} 個資料表`);
  console.log(`⚠️  錯誤: ${errorTables.length} 個資料表`);

  if (mismatchedTables.length > 0) {
    console.log('\n不一致的資料表:');
    mismatchedTables.forEach(r => {
      console.log(`  - ${r.table}: 主站 ${r.mainCount} 筆 vs 站點二 ${r.site2Count} 筆`);
    });
  }

  if (errorTables.length > 0) {
    console.log('\n發生錯誤的資料表:');
    errorTables.forEach(r => {
      console.log(`  - ${r.table}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // 回傳結果供其他腳本使用
  return {
    summary: {
      total: results.length,
      matched: matchedTables.length,
      mismatched: mismatchedTables.length,
      errors: errorTables.length
    },
    details: results
  };
}

// 執行
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ 執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { main };
