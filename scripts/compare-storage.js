/**
 * 站點 Storage 比較工具
 * 用途：比較主站點與站點二的 Supabase Storage 檔案
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

// Storage buckets 列表
const BUCKETS = ['products', 'public', 'announcements'];

async function listFiles(client, bucketName) {
  try {
    const { data, error } = await client.storage.from(bucketName).list();

    if (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return null; // Bucket 不存在
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`  ❌ 列出檔案時發生錯誤: ${error.message}`);
    return null;
  }
}

async function compareBucket(mainClient, site2Client, bucketName) {
  console.log(`\n📦 比較 Storage Bucket: ${bucketName}`);

  try {
    // 列出兩邊的檔案
    const [mainFiles, site2Files] = await Promise.all([
      listFiles(mainClient, bucketName),
      listFiles(site2Client, bucketName)
    ]);

    // 檢查 bucket 是否存在
    if (mainFiles === null && site2Files === null) {
      console.log(`  ⚠️  兩邊都沒有此 bucket`);
      return { bucket: bucketName, status: 'both_missing', mainCount: 0, site2Count: 0 };
    }

    if (mainFiles === null) {
      console.log(`  ⚠️  主站點沒有此 bucket`);
      console.log(`  站點二: ${site2Files.length} 個檔案`);
      return { bucket: bucketName, status: 'main_missing', mainCount: 0, site2Count: site2Files.length };
    }

    if (site2Files === null) {
      console.log(`  ⚠️  站點二沒有此 bucket`);
      console.log(`  主站點: ${mainFiles.length} 個檔案`);
      return { bucket: bucketName, status: 'site2_missing', mainCount: mainFiles.length, site2Count: 0 };
    }

    // 比較檔案數量
    const mainCount = mainFiles.length;
    const site2Count = site2Files.length;

    console.log(`  主站點: ${mainCount} 個檔案`);
    console.log(`  站點二: ${site2Count} 個檔案`);

    if (mainCount === site2Count) {
      console.log(`  ✅ 數量一致`);
    } else {
      console.log(`  ❌ 數量不一致 (差異: ${Math.abs(mainCount - site2Count)} 個)`);
    }

    // 比較檔案列表
    const mainFileNames = new Set(mainFiles.map(f => f.name));
    const site2FileNames = new Set(site2Files.map(f => f.name));

    const onlyInMain = [...mainFileNames].filter(name => !site2FileNames.has(name));
    const onlyInSite2 = [...site2FileNames].filter(name => !mainFileNames.has(name));

    if (onlyInMain.length > 0) {
      console.log(`\n  ⚠️  僅主站點有的檔案 (${onlyInMain.length} 個):`);
      onlyInMain.slice(0, 10).forEach(name => {
        console.log(`    - ${name}`);
      });
      if (onlyInMain.length > 10) {
        console.log(`    ... 還有 ${onlyInMain.length - 10} 個`);
      }
    }

    if (onlyInSite2.length > 0) {
      console.log(`\n  ⚠️  僅站點二有的檔案 (${onlyInSite2.length} 個):`);
      onlyInSite2.slice(0, 10).forEach(name => {
        console.log(`    - ${name}`);
      });
      if (onlyInSite2.length > 10) {
        console.log(`    ... 還有 ${onlyInSite2.length - 10} 個`);
      }
    }

    const match = mainCount === site2Count && onlyInMain.length === 0 && onlyInSite2.length === 0;

    return {
      bucket: bucketName,
      status: match ? 'match' : 'mismatch',
      mainCount,
      site2Count,
      onlyInMain: onlyInMain.length,
      onlyInSite2: onlyInSite2.length,
      match
    };

  } catch (error) {
    console.error(`  ❌ 比較失敗: ${error.message}`);
    return {
      bucket: bucketName,
      status: 'error',
      error: error.message
    };
  }
}

async function main() {
  console.log('🖼️  站點 Storage 比較工具\n');
  console.log(`主站點: ${MAIN_SITE.url}`);
  console.log(`站點二: ${SITE_2.url}\n`);
  console.log('='.repeat(60));

  // 建立連線
  const mainClient = createClient(MAIN_SITE.url, MAIN_SITE.key);
  const site2Client = createClient(SITE_2.url, SITE_2.key);

  // 逐個 bucket 比較
  const results = [];
  for (const bucket of BUCKETS) {
    const result = await compareBucket(mainClient, site2Client, bucket);
    results.push(result);
  }

  // 總結報告
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 比較總結:\n');

  const matched = results.filter(r => r.status === 'match');
  const mismatched = results.filter(r => r.status === 'mismatch');
  const mainMissing = results.filter(r => r.status === 'main_missing');
  const site2Missing = results.filter(r => r.status === 'site2_missing');
  const bothMissing = results.filter(r => r.status === 'both_missing');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ 完全一致: ${matched.length} 個 bucket`);
  console.log(`❌ 不一致: ${mismatched.length} 個 bucket`);
  console.log(`⚠️  站點二缺少: ${site2Missing.length} 個 bucket`);
  console.log(`⚠️  主站點缺少: ${mainMissing.length} 個 bucket`);
  console.log(`ℹ️  兩邊都無: ${bothMissing.length} 個 bucket`);
  console.log(`❌ 錯誤: ${errors.length} 個 bucket`);

  if (site2Missing.length > 0) {
    console.log('\n需要遷移的 bucket:');
    site2Missing.forEach(r => {
      console.log(`  - ${r.bucket}: 主站 ${r.mainCount} 個檔案 → 站點二需要建立`);
    });
  }

  if (mismatched.length > 0) {
    console.log('\n不一致的 bucket:');
    mismatched.forEach(r => {
      console.log(`  - ${r.bucket}:`);
      console.log(`    主站: ${r.mainCount} 個檔案`);
      console.log(`    站點二: ${r.site2Count} 個檔案`);
      if (r.onlyInMain > 0) console.log(`    僅主站有: ${r.onlyInMain} 個`);
      if (r.onlyInSite2 > 0) console.log(`    僅站點二有: ${r.onlyInSite2} 個`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // 提供遷移建議
  if (site2Missing.length > 0 || mismatched.length > 0) {
    console.log('\n💡 建議操作:\n');
    console.log('1. 手動遷移 Storage 檔案（從 Supabase Dashboard）');
    console.log('   - 主站 Dashboard: https://supabase.com/dashboard/project/qwovavytryvgchcowjof/storage');
    console.log('   - 站點二 Dashboard: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/storage');
    console.log('\n2. 或使用 Storage 遷移腳本（待建立）');
    console.log('   - pnpm site2:migrate-storage');
  }

  return results;
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
