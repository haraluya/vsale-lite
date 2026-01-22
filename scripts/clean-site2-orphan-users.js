/**
 * 清理站點二孤兒帳號
 * 用途：移除 Auth 有但 profiles/admin_users 都沒有的帳號
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SITE_2 = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2
};

async function cleanOrphanUsers() {
  console.log('🗑️  站點二孤兒帳號清理工具\n');
  console.log(`目標站點: ${SITE_2.url}\n`);
  console.log('='.repeat(60));

  if (!SITE_2.url || !SITE_2.key) {
    console.error('❌ 錯誤: 請在 .env.local 設定站點二的環境變數');
    process.exit(1);
  }

  const supabase = createClient(SITE_2.url, SITE_2.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. 獲取所有 Auth 使用者
    console.log('\n步驟 1/5: 獲取所有 Auth 使用者...');

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error(`❌ 錯誤: ${authError.message}`);
      process.exit(1);
    }

    console.log(`✅ Auth 使用者總數: ${authUsers.users.length} 個`);

    // 2. 獲取所有 profiles
    console.log('\n步驟 2/5: 獲取所有 profiles...');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) {
      console.error(`⚠️  警告: ${profilesError.message}`);
      console.log('  profiles 表可能不存在或為空，繼續執行...');
    }

    console.log(`✅ profiles 記錄數: ${profiles?.length || 0} 筆`);

    // 3. 獲取所有 admin_users
    console.log('\n步驟 3/5: 獲取所有 admin_users...');

    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select('id');

    if (adminsError) {
      console.error(`⚠️  警告: ${adminsError.message}`);
      console.log('  admin_users 表可能不存在或為空，繼續執行...');
    }

    console.log(`✅ admin_users 記錄數: ${admins?.length || 0} 筆`);

    // 4. 找出孤兒帳號
    console.log('\n步驟 4/5: 找出孤兒帳號...');

    const profileIds = new Set(profiles?.map(p => p.id) || []);
    const adminIds = new Set(admins?.map(a => a.id) || []);

    const orphanUsers = authUsers.users.filter(user =>
      !profileIds.has(user.id) && !adminIds.has(user.id)
    );

    console.log(`\n發現 ${orphanUsers.length} 個孤兒帳號`);

    if (orphanUsers.length === 0) {
      console.log('\n✅ 沒有孤兒帳號需要清理！');
      console.log('='.repeat(60));
      return;
    }

    // 顯示孤兒帳號列表
    console.log('\n孤兒帳號列表（前 20 個）:');
    orphanUsers.slice(0, 20).forEach((user, index) => {
      const email = user.email || '(無 Email)';
      const createdAt = new Date(user.created_at).toLocaleDateString('zh-TW');
      console.log(`  ${index + 1}. ${email} (建立於 ${createdAt})`);
    });

    if (orphanUsers.length > 20) {
      console.log(`  ... 還有 ${orphanUsers.length - 20} 個`);
    }

    // 5. 確認是否刪除
    console.log('\n步驟 5/5: 執行清理...');
    console.log(`\n⚠️  警告: 即將刪除 ${orphanUsers.length} 個孤兒帳號！`);
    console.log('此操作無法復原。\n');
    console.log('5 秒後開始刪除... (Ctrl+C 取消)');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n開始刪除...\n');

    // 批次刪除（每次 10 個）
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < orphanUsers.length; i++) {
      const user = orphanUsers[i];

      process.stdout.write(`  刪除 ${i + 1}/${orphanUsers.length}: ${user.email || user.id.substring(0, 8)}... `);

      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        console.log(`❌ 失敗: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅`);
        deletedCount++;
      }

      // 每 10 個暫停一下，避免 API 限制
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 清理總結:\n');
    console.log(`✅ 成功刪除: ${deletedCount} 個`);
    console.log(`❌ 刪除失敗: ${errorCount} 個`);
    console.log(`📊 清理前總數: ${authUsers.users.length} 個`);
    console.log(`📊 清理後總數: ${authUsers.users.length - deletedCount} 個`);
    console.log('\n='.repeat(60));

  } catch (error) {
    console.error('\n❌ 發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行
if (require.main === module) {
  cleanOrphanUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ 執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { cleanOrphanUsers };
