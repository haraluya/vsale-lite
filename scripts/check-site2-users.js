/**
 * 檢查站點二使用者狀態
 * 用途：檢查 Auth 使用者與 profiles 表的一致性
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SITE_2 = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2
};

async function checkUsers() {
  console.log('🔍 站點二使用者狀態檢查\n');
  console.log(`目標站點: ${SITE_2.url}\n`);
  console.log('='.repeat(60));

  const supabase = createClient(SITE_2.url, SITE_2.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. 檢查 Auth 使用者數量
    console.log('\n步驟 1: 檢查 Auth 使用者...');

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error(`❌ 錯誤: ${authError.message}`);
      process.exit(1);
    }

    console.log(`✅ Auth 使用者總數: ${authUsers.users.length} 個`);

    // 2. 檢查 profiles 表記錄
    console.log('\n步驟 2: 檢查 profiles 表...');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, phone, tier_id');

    if (profilesError) {
      console.error(`❌ 錯誤: ${profilesError.message}`);
      process.exit(1);
    }

    console.log(`✅ profiles 記錄數: ${profiles?.length || 0} 筆`);

    // 3. 檢查 admin_users 表記錄
    console.log('\n步驟 3: 檢查 admin_users 表...');

    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select('id, email, role, status');

    if (adminsError) {
      console.error(`❌ 錯誤: ${adminsError.message}`);
      process.exit(1);
    }

    console.log(`✅ admin_users 記錄數: ${admins?.length || 0} 筆`);

    // 4. 找出孤兒帳號（Auth 有，但 profiles 和 admin_users 都沒有）
    console.log('\n步驟 4: 檢查孤兒帳號...');

    const profileIds = new Set(profiles?.map(p => p.id) || []);
    const adminIds = new Set(admins?.map(a => a.id) || []);

    const orphanUsers = authUsers.users.filter(user =>
      !profileIds.has(user.id) && !adminIds.has(user.id)
    );

    if (orphanUsers.length > 0) {
      console.log(`⚠️  發現 ${orphanUsers.length} 個孤兒帳號（Auth 有，但無對應業務資料）`);
      console.log('\n孤兒帳號列表（前 10 個）:');
      orphanUsers.slice(0, 10).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
      });

      if (orphanUsers.length > 10) {
        console.log(`  ... 還有 ${orphanUsers.length - 10} 個`);
      }
    } else {
      console.log(`✅ 無孤兒帳號`);
    }

    // 5. 總結
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 總結報告:\n');
    console.log(`Auth 使用者: ${authUsers.users.length} 個`);
    console.log(`profiles 記錄: ${profiles?.length || 0} 筆`);
    console.log(`admin_users 記錄: ${admins?.length || 0} 筆`);
    console.log(`孤兒帳號: ${orphanUsers.length} 個`);

    if (orphanUsers.length > 0) {
      console.log('\n⚠️  建議操作:');
      console.log('   執行清理腳本移除孤兒帳號: pnpm site2:clean-orphan-users');
    }

    console.log('\n' + '='.repeat(60));

    return {
      authUsers: authUsers.users.length,
      profiles: profiles?.length || 0,
      admins: admins?.length || 0,
      orphans: orphanUsers.length,
      orphanList: orphanUsers
    };

  } catch (error) {
    console.error('\n❌ 發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行
if (require.main === module) {
  checkUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ 執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { checkUsers };
