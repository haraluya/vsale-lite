#!/usr/bin/env node

/**
 * Vsale-lite 環境變數檢查工具
 *
 * 功能：
 * - 檢查必要環境變數是否存在
 * - 驗證 Supabase URL 格式
 * - 列出可選環境變數狀態
 * - 提供設定建議
 *
 * 使用方式：pnpm check-env
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數
const envPath = join(__dirname, '..', '.env.local');
const envExists = existsSync(envPath);

if (envExists) {
  config({ path: envPath });
} else {
  console.error('❌ 錯誤：找不到 .env.local 檔案');
  console.log('\n💡 建議：');
  console.log('   1. 複製 .env.local.example 為 .env.local');
  console.log('   2. 填入您的 Supabase 專案資訊');
  console.log('   3. 重新執行 pnpm check-env\n');
  process.exit(1);
}

// 定義必要環境變數
const REQUIRED_VARS = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase 專案 URL',
    example: 'https://abcdefghijklmnopqrst.supabase.co'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase 公開金鑰',
    example: 'eyJhbG...'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase 服務金鑰（敏感）',
    example: 'eyJhbG...'
  }
];

// 定義可選環境變數
const OPTIONAL_VARS = [
  {
    name: 'DB_HOST',
    description: '資料庫主機（用於備份）',
    group: '資料庫直連'
  },
  {
    name: 'DB_PASSWORD',
    description: '資料庫密碼（用於備份）',
    group: '資料庫直連'
  },
  {
    name: 'DB_USER',
    description: '資料庫使用者（通常為 postgres）',
    group: '資料庫直連'
  },
  {
    name: 'DB_PORT',
    description: '資料庫連接埠（通常為 5432）',
    group: '資料庫直連'
  },
  {
    name: 'GCS_BUCKET_NAME',
    description: 'Google Cloud Storage 儲存桶',
    group: '雲端備份'
  },
  {
    name: 'GCS_SERVICE_ACCOUNT_KEY',
    description: 'GCS 服務帳號金鑰路徑',
    group: '雲端備份'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL_SITE2',
    description: '站點二 Supabase URL',
    group: '多站點管理'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY_SITE2',
    description: '站點二服務金鑰',
    group: '多站點管理'
  },
  {
    name: 'DB_PASSWORD_SITE2',
    description: '站點二資料庫密碼',
    group: '多站點管理'
  }
];

// Supabase URL 格式驗證
const SUPABASE_URL_REGEX = /^https:\/\/[a-z]{20}\.supabase\.co$/;

// 檢查結果
const results = {
  required: {
    passed: [],
    failed: []
  },
  optional: {
    configured: [],
    missing: []
  },
  warnings: []
};

console.log('🔍 Vsale-lite 環境變數檢查\n');
console.log('================================================\n');

// 檢查必要環境變數
console.log('📋 必要環境變數（3 個）\n');

REQUIRED_VARS.forEach(({ name, description, example }) => {
  const value = process.env[name];

  if (!value || value.includes('YOUR_') || value.includes('your_')) {
    console.log(`❌ ${name}`);
    console.log(`   說明：${description}`);
    console.log(`   狀態：未設定或使用範本值`);
    console.log(`   範例：${example}\n`);
    results.required.failed.push(name);
  } else {
    // 驗證 Supabase URL 格式
    if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
      if (!SUPABASE_URL_REGEX.test(value)) {
        console.log(`⚠️  ${name}`);
        console.log(`   說明：${description}`);
        console.log(`   狀態：格式可能不正確`);
        console.log(`   當前值：${value}`);
        console.log(`   預期格式：https://[20 個小寫字母].supabase.co\n`);
        results.warnings.push({
          name,
          message: 'URL 格式可能不正確'
        });
      } else {
        console.log(`✅ ${name}`);
        console.log(`   說明：${description}`);
        console.log(`   狀態：已設定\n`);
        results.required.passed.push(name);
      }
    } else {
      console.log(`✅ ${name}`);
      console.log(`   說明：${description}`);
      console.log(`   狀態：已設定\n`);
      results.required.passed.push(name);
    }
  }
});

// 檢查可選環境變數
console.log('================================================\n');
console.log('📦 可選環境變數（9 個）\n');

// 按群組組織
const groupedVars = OPTIONAL_VARS.reduce((acc, varInfo) => {
  const group = varInfo.group;
  if (!acc[group]) acc[group] = [];
  acc[group].push(varInfo);
  return acc;
}, {});

Object.entries(groupedVars).forEach(([groupName, vars]) => {
  console.log(`\n🔸 ${groupName}\n`);

  vars.forEach(({ name, description }) => {
    const value = process.env[name];

    if (value && !value.includes('YOUR_') && !value.includes('your_')) {
      console.log(`✅ ${name}`);
      console.log(`   說明：${description}`);
      console.log(`   狀態：已設定\n`);
      results.optional.configured.push(name);
    } else {
      console.log(`⚪ ${name}`);
      console.log(`   說明：${description}`);
      console.log(`   狀態：未設定（可選）\n`);
      results.optional.missing.push(name);
    }
  });
});

// 顯示總結
console.log('================================================\n');
console.log('📊 檢查總結\n');

console.log(`必要變數：${results.required.passed.length}/${REQUIRED_VARS.length} 已設定`);
console.log(`可選變數：${results.optional.configured.length}/${OPTIONAL_VARS.length} 已設定`);

if (results.warnings.length > 0) {
  console.log(`警告數量：${results.warnings.length}`);
}

console.log('\n');

// 判斷是否通過檢查
const allRequiredPassed = results.required.failed.length === 0 && results.warnings.length === 0;

if (allRequiredPassed) {
  console.log('✅ 環境變數檢查通過！');
  console.log('\n💡 下一步：');
  console.log('   1. 執行 Migration：supabase db push');
  console.log('   2. 初始化資料庫：pnpm init-db');
  console.log('   3. 啟動開發伺服器：pnpm dev\n');
  process.exit(0);
} else {
  console.log('❌ 環境變數檢查失敗\n');

  if (results.required.failed.length > 0) {
    console.log('🔴 缺少以下必要變數：');
    results.required.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  以下變數需要檢查：');
    results.warnings.forEach(({ name, message }) => {
      console.log(`   - ${name}: ${message}`);
    });
    console.log('');
  }

  console.log('💡 解決方式：');
  console.log('   1. 開啟 .env.local 檔案');
  console.log('   2. 參考 .env.local.example 填入正確的值');
  console.log('   3. 重新執行 pnpm check-env');
  console.log('\n📖 詳細說明：docs/ENV_VARIABLES_CHECKLIST.md\n');

  process.exit(1);
}
