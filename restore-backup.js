/**
 * 自動還原備份腳本
 * 步驟：
 * 1. 清空所有資料（保留表結構）
 * 2. 執行備份 SQL 還原資料
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 請確認 .env.local 檔案存在並包含 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreBackup() {
  console.log('🔄 開始還原備份...\n');

  // 步驟 1: 清空資料
  console.log('📋 步驟 1: 清空所有資料（保留表結構）');
  const clearSql = fs.readFileSync('./clear-data-before-restore.sql', 'utf8');

  const { error: clearError } = await supabase.rpc('exec_sql', { sql: clearSql });

  if (clearError) {
    console.error('❌ 清空資料失敗:', clearError.message);
    console.log('\n💡 請手動在 Supabase SQL Editor 執行：');
    console.log('   1. 前往: https://supabase.com/dashboard/project/qwovavytryvgchcowjof/sql');
    console.log('   2. 執行 clear-data-before-restore.sql');
    console.log('   3. 執行 vsale-backup-20260109-080442.sql');
    process.exit(1);
  }

  console.log('✅ 資料已清空\n');

  // 步驟 2: 還原資料
  console.log('📋 步驟 2: 還原備份資料');
  const backupSql = fs.readFileSync('./vsale-backup-20260109-080442.sql', 'utf8');

  const { error: restoreError } = await supabase.rpc('exec_sql', { sql: backupSql });

  if (restoreError) {
    console.error('❌ 還原資料失敗:', restoreError.message);
    console.log('\n💡 請手動在 Supabase SQL Editor 執行：');
    console.log('   vsale-backup-20260109-080442.sql');
    process.exit(1);
  }

  console.log('✅ 備份已成功還原\n');

  // 步驟 3: 驗證結果
  console.log('📋 步驟 3: 驗證還原結果');

  const tables = ['tiers', 'profiles', 'categories', 'series', 'products', 'orders'];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ⚠️  ${table}: 無法查詢`);
    } else {
      console.log(`   ✅ ${table}: ${count} 筆記錄`);
    }
  }

  console.log('\n🎉 備份還原完成！');
}

restoreBackup().catch((error) => {
  console.error('❌ 執行失敗:', error);
  process.exit(1);
});
