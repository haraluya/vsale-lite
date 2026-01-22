#!/usr/bin/env node

/**
 * Vsale-lite 部署驗證工具
 *
 * 功能：
 * - 測試關鍵端點是否正常
 * - 驗證回應狀態碼和內容
 * - 顯示測試總結
 * - 提供除錯建議
 *
 * 使用方式：pnpm verify-deploy <URL>
 * 範例：pnpm verify-deploy https://vsale.vercel.app
 */

import { URL } from 'url';
import https from 'https';
import http from 'http';

// 測試端點配置
const ENDPOINTS = [
  {
    path: '/login',
    name: '前台登入頁',
    description: '客戶登入介面',
    expectedStatus: 200,
    expectedContent: ['手機號碼', '登入'],
    type: 'page'
  },
  {
    path: '/admin/login',
    name: '後台登入頁',
    description: '管理員登入介面',
    expectedStatus: 200,
    expectedContent: ['帳號', '登入'],
    type: 'page'
  },
  {
    path: '/api/env-test',
    name: '環境變數測試',
    description: '驗證環境變數配置',
    expectedStatus: 200,
    expectedContent: ['"projectRef"', '"hasMainSiteConfig"'],
    type: 'api'
  },
  {
    path: '/api/check-connection',
    name: '資料庫連線測試',
    description: '驗證 Supabase 連線',
    expectedStatus: 200,
    expectedContent: ['"success"', 'true'],
    type: 'api'
  }
];

// HTTP/HTTPS 請求封裝
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeoutMs = 15000; // 15 秒逾時

    const options = {
      headers: {
        'User-Agent': 'Vsale-Verify-Tool/1.0'
      }
    };

    const req = protocol.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('請求逾時（超過 15 秒）'));
    });
  });
}

// 驗證 URL 格式
function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (!url.protocol.match(/^https?:$/)) {
      return { valid: false, message: 'URL 必須使用 http 或 https 協議' };
    }
    if (!url.hostname) {
      return { valid: false, message: 'URL 格式不正確' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, message: 'URL 格式不正確' };
  }
}

// 執行單一端點測試
async function testEndpoint(baseUrl, endpoint) {
  const fullUrl = baseUrl.replace(/\/$/, '') + endpoint.path;
  const result = {
    name: endpoint.name,
    path: endpoint.path,
    passed: false,
    statusCode: null,
    message: '',
    details: []
  };

  try {
    // 發送請求
    const response = await makeRequest(fullUrl);
    result.statusCode = response.statusCode;

    // 檢查狀態碼
    if (response.statusCode !== endpoint.expectedStatus) {
      result.message = `狀態碼錯誤：預期 ${endpoint.expectedStatus}，實際 ${response.statusCode}`;
      result.details.push(`HTTP ${response.statusCode} 回應`);
      return result;
    }

    // 檢查內容
    const missingContent = [];
    for (const expected of endpoint.expectedContent) {
      if (!response.body.includes(expected)) {
        missingContent.push(expected);
      }
    }

    if (missingContent.length > 0) {
      result.message = `回應內容不符合預期`;
      result.details.push(`缺少：${missingContent.join(', ')}`);
      return result;
    }

    // 測試通過
    result.passed = true;
    result.message = '測試通過';
    result.details.push(`HTTP ${response.statusCode}`);
    result.details.push(`內容驗證通過`);

  } catch (error) {
    result.message = `請求失敗：${error.message}`;
    result.details.push(`錯誤：${error.code || '未知錯誤'}`);
  }

  return result;
}

// 顯示測試結果
function displayResult(result) {
  const icon = result.passed ? '✅' : '❌';
  const status = result.passed ? '[通過]' : '[失敗]';

  console.log(`${icon} ${result.name} ${status}`);
  console.log(`   路徑：${result.path}`);
  if (result.statusCode) {
    console.log(`   狀態：HTTP ${result.statusCode}`);
  }
  console.log(`   結果：${result.message}`);

  if (result.details.length > 0 && !result.passed) {
    console.log(`   細節：`);
    result.details.forEach(detail => {
      console.log(`      - ${detail}`);
    });
  }

  console.log('');
}

// 提供除錯建議
function provideTroubleshooting(results) {
  const failures = results.filter(r => !r.passed);

  if (failures.length === 0) {
    return;
  }

  console.log('🔧 除錯建議\n');

  // 分析失敗類型
  const hasConnectionError = failures.some(r => r.message.includes('請求失敗'));
  const has404Error = failures.some(r => r.statusCode === 404);
  const has500Error = failures.some(r => r.statusCode === 500);
  const hasContentError = failures.some(r => r.message.includes('內容不符合預期'));

  if (hasConnectionError) {
    console.log('⚠️  連線錯誤');
    console.log('   可能原因：');
    console.log('   1. 部署 URL 不正確');
    console.log('   2. 網路連線問題');
    console.log('   3. 部署環境尚未啟動');
    console.log('');
    console.log('   解決方式：');
    console.log('   - 確認 URL 是否正確');
    console.log('   - 檢查網路連線');
    console.log('   - 等待部署完成後重試\n');
  }

  if (has404Error) {
    console.log('⚠️  404 錯誤');
    console.log('   可能原因：');
    console.log('   1. 路由配置錯誤');
    console.log('   2. 建置時遺漏頁面');
    console.log('');
    console.log('   解決方式：');
    console.log('   - 檢查 app 目錄結構');
    console.log('   - 確認 pnpm build 成功');
    console.log('   - 查看 Vercel 部署日誌\n');
  }

  if (has500Error) {
    console.log('⚠️  500 伺服器錯誤');
    console.log('   可能原因：');
    console.log('   1. 環境變數缺失');
    console.log('   2. 資料庫連線失敗');
    console.log('   3. 程式碼執行錯誤');
    console.log('');
    console.log('   解決方式：');
    console.log('   - 檢查 Vercel 環境變數設定');
    console.log('   - 執行 pnpm check-env（本機）');
    console.log('   - 查看 Vercel Function Logs\n');
  }

  if (hasContentError) {
    console.log('⚠️  內容驗證失敗');
    console.log('   可能原因：');
    console.log('   1. UI 元件未正確渲染');
    console.log('   2. API 回應格式變更');
    console.log('   3. 環境變數影響顯示內容');
    console.log('');
    console.log('   解決方式：');
    console.log('   - 手動訪問失敗的端點檢查內容');
    console.log('   - 確認前端建置成功');
    console.log('   - 檢查 API 回應格式\n');
  }

  console.log('📖 更多資訊：docs/TROUBLESHOOTING.md\n');
}

// 主流程
async function main() {
  console.log('🔍 Vsale-lite 部署驗證工具\n');
  console.log('================================================\n');

  // 檢查參數
  const deployUrl = process.argv[2];

  if (!deployUrl) {
    console.error('❌ 錯誤：請提供部署 URL\n');
    console.log('使用方式：pnpm verify-deploy <URL>');
    console.log('範例：pnpm verify-deploy https://vsale.vercel.app\n');
    process.exit(1);
  }

  // 驗證 URL
  const urlValidation = validateUrl(deployUrl);
  if (!urlValidation.valid) {
    console.error(`❌ URL 驗證失敗：${urlValidation.message}\n`);
    process.exit(1);
  }

  console.log(`測試目標：${deployUrl}\n`);
  console.log(`開始測試 ${ENDPOINTS.length} 個端點...\n`);
  console.log('================================================\n');

  // 執行測試
  const results = [];
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(deployUrl, endpoint);
    results.push(result);
    displayResult(result);
  }

  // 顯示總結
  console.log('================================================\n');
  console.log('📊 測試總結\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`總測試數：${total}`);
  console.log(`✅ 通過：${passed}`);
  console.log(`❌ 失敗：${failed}\n`);

  if (failed === 0) {
    console.log('🎉 所有測試通過！部署驗證成功。\n');
    console.log('💡 下一步：');
    console.log('   - 測試前台功能（瀏覽商品、加入購物車）');
    console.log('   - 測試後台功能（管理商品、查看訂單）');
    console.log('   - 監控應用程式效能與錯誤\n');
    process.exit(0);
  } else {
    console.log('❌ 部署驗證失敗，請檢查以下端點：\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name} (${r.path})`);
    });
    console.log('\n');

    provideTroubleshooting(results);
    process.exit(1);
  }
}

// 執行主流程
main().catch((error) => {
  console.error('❌ 未預期的錯誤：', error.message);
  process.exit(1);
});
