#!/usr/bin/env node

/**
 * Vsale-lite 資料庫初始化工具
 *
 * 功能：
 * - 互動式建立管理員帳號
 * - 驗證輸入格式
 * - 避免重複建立帳號（冪等性）
 * - 顯示登入資訊
 *
 * 使用方式：pnpm init-db
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數
const envPath = join(__dirname, '..', '.env.local');
if (!existsSync(envPath)) {
  console.error('❌ 錯誤：找不到 .env.local 檔案');
  console.log('\n💡 建議：先執行 pnpm check-env 檢查環境變數\n');
  process.exit(1);
}

config({ path: envPath });

// 驗證必要環境變數
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 錯誤：缺少必要的環境變數');
  console.log('\n💡 請確認以下變數已設定：');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

// 建立 Supabase 客戶端（使用 Service Role Key）
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 建立互動式輸入介面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise 封裝 readline.question
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// 驗證 email 格式
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 驗證 username 格式（3-20 個小寫字母、數字或底線）
function validateUsername(username) {
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// 驗證密碼長度
function validatePassword(password) {
  return password.length >= 8;
}

// 主流程
async function main() {
  console.log('🔧 Vsale-lite 資料庫初始化工具\n');
  console.log('================================================\n');
  console.log('此工具將建立一個管理員帳號，用於登入後台。\n');

  try {
    // 檢查是否已存在管理員帳號
    const { data: existingAdmins, error: checkError } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('role', 'admin')
      .limit(5);

    if (checkError) {
      console.error('❌ 資料庫連線失敗：', checkError.message);
      console.log('\n💡 請確認：');
      console.log('   1. Supabase 專案是否已啟動');
      console.log('   2. 環境變數是否正確');
      console.log('   3. Migration 是否已執行（pnpm db:migrate）\n');
      process.exit(1);
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('ℹ️  系統中已存在以下管理員帳號：\n');
      existingAdmins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.display_name || '（無名稱）'}`);
        console.log(`      Email: ${admin.email}`);
        console.log(`      帳號: ${admin.username}\n`);
      });

      const shouldContinue = await question('是否要建立新的管理員帳號？(y/n): ');
      if (shouldContinue.toLowerCase() !== 'y') {
        console.log('\n✅ 操作已取消\n');
        rl.close();
        process.exit(0);
      }
      console.log('');
    }

    // 步驟 1: 輸入 Email
    let email = '';
    while (true) {
      email = await question('請輸入管理員 Email: ');
      if (!email.trim()) {
        console.log('❌ Email 不能為空\n');
        continue;
      }
      if (!validateEmail(email)) {
        console.log('❌ Email 格式不正確\n');
        continue;
      }

      // 檢查 Email 是否已存在
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        console.log('❌ 此 Email 已被使用\n');
        continue;
      }

      break;
    }

    // 步驟 2: 輸入帳號（username）
    let username = '';
    while (true) {
      username = await question('請輸入管理員帳號（3-20 個小寫字母、數字或底線）: ');
      if (!username.trim()) {
        console.log('❌ 帳號不能為空\n');
        continue;
      }
      if (!validateUsername(username)) {
        console.log('❌ 帳號格式不正確（僅允許 3-20 個小寫字母、數字或底線）\n');
        continue;
      }

      // 檢查 username 是否已存在
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUsername) {
        console.log('❌ 此帳號已被使用\n');
        continue;
      }

      break;
    }

    // 步驟 3: 輸入密碼
    let password = '';
    while (true) {
      password = await question('請輸入密碼（最少 8 字元）: ');
      if (!password) {
        console.log('❌ 密碼不能為空\n');
        continue;
      }
      if (!validatePassword(password)) {
        console.log('❌ 密碼至少需要 8 個字元\n');
        continue;
      }
      break;
    }

    // 步驟 4: 輸入顯示名稱（可選）
    const displayName = await question('請輸入顯示名稱（可選，預設「系統管理員」，按 Enter 跳過）: ');
    const finalDisplayName = displayName.trim() || '系統管理員';

    console.log('\n正在建立管理員帳號...\n');

    // 使用 Supabase Admin API 建立使用者
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: finalDisplayName
      }
    });

    if (authError) {
      console.error('❌ 建立使用者失敗：', authError.message);
      console.log('\n💡 可能原因：');
      console.log('   - Email 已在 auth.users 中存在');
      console.log('   - 密碼不符合 Supabase 政策要求\n');
      rl.close();
      process.exit(1);
    }

    // 插入到 profiles 表
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        username,
        role: 'admin',
        display_name: finalDisplayName
      });

    if (profileError) {
      console.error('❌ 建立 Profile 失敗：', profileError.message);

      // 嘗試刪除已建立的 auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      console.log('已回滾：刪除 auth.users 中的使用者\n');

      rl.close();
      process.exit(1);
    }

    console.log('✅ 管理員帳號建立成功！\n');
    console.log('================================================\n');
    console.log('📋 登入資訊\n');
    console.log(`   Email: ${email}`);
    console.log(`   帳號: ${username}`);
    console.log(`   密碼: ${password}`);
    console.log(`   名稱: ${finalDisplayName}\n`);
    console.log('================================================\n');
    console.log('💡 下一步：\n');
    console.log('   1. 啟動開發伺服器：pnpm dev');
    console.log('   2. 訪問後台登入頁：http://localhost:4000/admin/login');
    console.log('   3. 使用上述帳號登入\n');
    console.log('⚠️  請妥善保管登入資訊！\n');

  } catch (error) {
    console.error('❌ 發生錯誤：', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 執行主流程
main().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});
