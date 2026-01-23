/**
 * 站點二管理員建立工具
 * 用途：在站點二快速建立管理員帳號
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// 站點二配置
const SITE_2 = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2
};

// 建立 readline 介面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 詢問問題的輔助函數
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin(emailArg = null, passwordArg = null) {
  console.log('🔧 站點二管理員建立工具\n');
  console.log(`目標站點: ${SITE_2.url}\n`);

  // 確認環境變數
  if (!SITE_2.url || !SITE_2.key) {
    console.error('❌ 錯誤: 請在 .env.local 設定站點二的環境變數');
    console.error('   需要: NEXT_PUBLIC_SUPABASE_URL_SITE2');
    console.error('        SUPABASE_SERVICE_ROLE_KEY_SITE2');
    process.exit(1);
  }

  // 建立 Supabase 客戶端（使用 service_role key）
  const supabase = createClient(SITE_2.url, SITE_2.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    let email, password;

    // 從命令列參數或互動式輸入取得資訊
    if (emailArg && passwordArg) {
      email = emailArg;
      password = passwordArg;
      console.log(`使用命令列參數建立管理員: ${email}\n`);
    } else {
      // 1. 詢問管理員資訊
      console.log('請輸入管理員資訊：\n');

      email = await question('Email: ');
      if (!email || !email.includes('@')) {
        console.error('❌ 錯誤: Email 格式不正確');
        rl.close();
        process.exit(1);
      }

      password = await question('密碼（至少 6 碼）: ');
      if (!password || password.length < 6) {
        console.error('❌ 錯誤: 密碼至少需要 6 碼');
        rl.close();
        process.exit(1);
      }
    }

    // 驗證 email 和 password
    if (!email || !email.includes('@')) {
      console.error('❌ 錯誤: Email 格式不正確');
      rl.close();
      process.exit(1);
    }

    if (!password || password.length < 6) {
      console.error('❌ 錯誤: 密碼至少需要 6 碼');
      rl.close();
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n建立管理員帳號...\n');

    // 2. 使用 Admin API 建立 Auth 使用者
    console.log('步驟 1/3: 建立 Auth 使用者...');

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // 自動確認 Email
      user_metadata: {
        role: 'admin'
      }
    });

    if (authError) {
      console.error(`❌ 建立 Auth 使用者失敗: ${authError.message}`);
      rl.close();
      process.exit(1);
    }

    console.log(`✅ Auth 使用者已建立`);
    console.log(`   User ID: ${authUser.user.id}`);
    console.log(`   Email: ${authUser.user.email}`);

    // 3. 詢問 username 和 display_name
    let username, displayName;

    if (emailArg && passwordArg) {
      // 從 email 自動產生 username（去掉 @domain）
      username = email.split('@')[0];
      displayName = null;
    } else {
      username = await question('帳號 (username): ');
      if (!username || username.trim() === '') {
        console.error('❌ 錯誤: 帳號不可為空');
        rl.close();
        process.exit(1);
      }

      displayName = await question('暱稱 (display_name，可選): ');
    }

    // 4. 在 profiles 表建立管理員記錄
    console.log('\n步驟 2/3: 建立使用者資料 (profiles)...');

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        username: username,
        display_name: displayName || null,
        role: 'admin'
      });

    if (profileError) {
      console.error(`❌ 建立使用者資料失敗: ${profileError.message}`);
      console.log('\n⚠️  Auth 使用者已建立，但使用者資料建立失敗');
      console.log('正在回滾 Auth 使用者...');

      // 回滾：刪除已建立的 Auth User
      await supabase.auth.admin.deleteUser(authUser.user.id);
      console.log('✅ 已回滾');

      rl.close();
      process.exit(1);
    }

    console.log(`✅ 使用者資料已建立`);

    // 5. 驗證建立結果
    console.log('\n步驟 3/3: 驗證建立結果...');

    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (verifyError || !verifyProfile) {
      console.error(`❌ 驗證失敗`);
      rl.close();
      process.exit(1);
    }

    console.log(`✅ 驗證成功`);

    // 5. 顯示成功訊息
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 管理員帳號建立成功！\n');
    console.log('帳號資訊：');
    console.log(`  Email: ${email}`);
    console.log(`  密碼: ${password}`);
    console.log(`  User ID: ${authUser.user.id}`);
    console.log(`  角色: ${verifyAdmin.role}`);
    console.log(`  狀態: ${verifyAdmin.status}`);
    console.log('\n登入網址：');

    // 從站點二 URL 推測 Vercel URL
    const vercelUrl = SITE_2.url.includes('rdyvmgomjdglflrcfijs')
      ? 'https://vsale-site2.vercel.app'
      : '請查看 Vercel Dashboard';

    console.log(`  ${vercelUrl}/admin/login`);
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ 發生錯誤:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 執行
if (require.main === module) {
  // 從命令列參數取得 email 和 password
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];

  createAdmin(email, password)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ 執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { createAdmin };
