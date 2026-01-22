/**
 * 智慧型站點遷移工具
 * 用途：從主站點複製資料到站點二（避免大型 SQL 檔案問題）
 * 策略：直接使用 Supabase API 傳輸資料，批次處理
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

// 資料表遷移順序（按外鍵依賴排序）
const MIGRATION_ORDER = [
  { table: 'tiers', description: '會員等級' },
  { table: 'categories', description: '商品分類' },
  { table: 'series', description: '商品系列' },
  { table: 'products', description: '商品' },
  { table: 'tier_prices', description: '等級價格' },
  { table: 'coupons', description: '優惠券' },
  { table: 'coupon_tier_restrictions', description: '優惠券等級限制' },
  { table: 'coupon_series_restrictions', description: '優惠券系列限制' },
  { table: 'system_settings', description: '系統設定' }
];

const BATCH_SIZE = 100; // 每批次處理數量

// 需要排除的欄位（GENERATED 欄位或其他不應手動插入的欄位）
const EXCLUDED_COLUMNS = {
  coupons: ['code_normalized'] // code_normalized 是 GENERATED ALWAYS AS (UPPER(code)) STORED
};

async function migrateTable(mainClient, site2Client, config) {
  const { table, description } = config;
  console.log(`\n📦 遷移: ${description} (${table})`);

  try {
    // 1. 獲取主站點資料總數
    const { count: totalCount } = await mainClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    console.log(`  總共 ${totalCount} 筆資料`);

    if (totalCount === 0) {
      console.log(`  ⏭️  無資料，跳過`);
      return { table, success: true, count: 0 };
    }

    // 2. 批次複製資料（資料表已在開始前清空）
    let copiedCount = 0;
    const batches = Math.ceil(totalCount / BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
      const from = i * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;

      process.stdout.write(`  📥 批次 ${i + 1}/${batches} (${from + 1}-${Math.min(to + 1, totalCount)})... `);

      // 從主站點取得資料
      const { data: batchData, error: fetchError } = await mainClient
        .from(table)
        .select('*')
        .range(from, to);

      if (fetchError) {
        console.error(`❌ 取得失敗: ${fetchError.message}`);
        continue;
      }

      if (!batchData || batchData.length === 0) {
        console.log(`⏭️  無資料`);
        continue;
      }

      // 移除需要排除的欄位
      let cleanedData = batchData;
      if (EXCLUDED_COLUMNS[table]) {
        cleanedData = batchData.map(row => {
          const newRow = { ...row };
          EXCLUDED_COLUMNS[table].forEach(col => delete newRow[col]);
          return newRow;
        });
      }

      // 插入到站點二
      const { error: insertError } = await site2Client
        .from(table)
        .insert(cleanedData);

      if (insertError) {
        console.error(`❌ 插入失敗: ${insertError.message}`);
        return { table, success: false, error: insertError.message };
      }

      copiedCount += batchData.length;
      console.log(`✅ 完成 (${copiedCount}/${totalCount})`);
    }

    console.log(`  ✅ 遷移完成: ${copiedCount} 筆`);
    return { table, success: true, count: copiedCount };

  } catch (error) {
    console.error(`  ❌ 遷移失敗: ${error.message}`);
    return { table, success: false, error: error.message };
  }
}

async function clearAllTables(site2Client) {
  console.log('\n🗑️  清空站點二所有資料表（反向順序避免外鍵錯誤）...\n');

  // 反向順序清空（從最後依賴的表開始）
  const reversedOrder = [...MIGRATION_ORDER].reverse();

  for (const config of reversedOrder) {
    const { table, description } = config;
    process.stdout.write(`  清空 ${description} (${table})... `);

    const { error } = await site2Client
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.log(`❌ 失敗: ${error.message}`);
      // 繼續清空其他表，忽略錯誤（可能表是空的）
    } else {
      console.log(`✅`);
    }
  }

  console.log('\n✅ 所有資料表已清空\n');
}

async function main() {
  console.log('🚀 智慧型站點遷移工具\n');
  console.log(`來源: ${MAIN_SITE.url}`);
  console.log(`目標: ${SITE_2.url}\n`);

  // 確認環境變數
  if (!SITE_2.url || !SITE_2.key) {
    console.error('❌ 錯誤: 請在 .env.local 設定站點二的環境變數');
    console.error('   需要: NEXT_PUBLIC_SUPABASE_URL_SITE2');
    console.error('        SUPABASE_SERVICE_ROLE_KEY_SITE2');
    process.exit(1);
  }

  console.log('⚠️  警告: 此操作會清空站點二的所有資料！');
  console.log('請確認您已備份重要資料。\n');

  // 等待 5 秒讓使用者有時間取消
  console.log('5 秒後開始遷移... (Ctrl+C 取消)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n' + '='.repeat(60));

  // 建立連線
  const mainClient = createClient(MAIN_SITE.url, MAIN_SITE.key);
  const site2Client = createClient(SITE_2.url, SITE_2.key);

  // 先清空所有表（反向順序）
  await clearAllTables(site2Client);

  console.log('='.repeat(60));

  // 逐表遷移（正向順序）
  const results = [];
  for (const config of MIGRATION_ORDER) {
    const result = await migrateTable(mainClient, site2Client, config);
    results.push(result);

    if (!result.success) {
      console.log('\n❌ 遷移中斷（發生錯誤）');
      break;
    }
  }

  // 總結報告
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 遷移總結:\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ 成功: ${successful.length} 個資料表`);
  console.log(`❌ 失敗: ${failed.length} 個資料表`);

  if (successful.length > 0) {
    console.log('\n成功遷移:');
    successful.forEach(r => {
      console.log(`  - ${r.table}: ${r.count} 筆`);
    });
  }

  if (failed.length > 0) {
    console.log('\n失敗項目:');
    failed.forEach(r => {
      console.log(`  - ${r.table}: ${r.error}`);
    });
  }

  const totalRecords = successful.reduce((sum, r) => sum + r.count, 0);
  console.log(`\n📊 總計遷移: ${totalRecords} 筆資料`);
  console.log('='.repeat(60));

  return {
    success: failed.length === 0,
    totalRecords,
    results
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
