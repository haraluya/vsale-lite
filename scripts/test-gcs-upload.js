/**
 * GCS 上傳測試腳本
 * 用途：驗證 Google Cloud Storage 設定是否正確
 *
 * 執行方式：node scripts/test-gcs-upload.js
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// 載入環境變數
require('dotenv').config({ path: '.env.local' });

// ANSI 顏色碼
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testGCSUpload() {
  log('========================================', 'cyan');
  log('GCS 上傳測試開始', 'cyan');
  log('========================================', 'cyan');
  console.log();

  // 步驟 1: 驗證環境變數
  log('📋 步驟 1: 驗證環境變數', 'blue');
  const projectId = process.env.GCS_PROJECT_ID;
  const bucketName = process.env.GCS_BUCKET_NAME;
  const serviceAccountKey = process.env.GCS_SERVICE_ACCOUNT_KEY;

  if (!projectId) {
    log('❌ 錯誤: GCS_PROJECT_ID 未設定', 'red');
    process.exit(1);
  }
  if (!bucketName) {
    log('❌ 錯誤: GCS_BUCKET_NAME 未設定', 'red');
    process.exit(1);
  }
  if (!serviceAccountKey) {
    log('❌ 錯誤: GCS_SERVICE_ACCOUNT_KEY 未設定', 'red');
    process.exit(1);
  }

  log(`   ✅ GCS_PROJECT_ID: ${projectId}`, 'green');
  log(`   ✅ GCS_BUCKET_NAME: ${bucketName}`, 'green');
  log(`   ✅ GCS_SERVICE_ACCOUNT_KEY: 已設定 (${serviceAccountKey.length} 字元)`, 'green');
  console.log();

  // 步驟 2: 初始化 GCS Client
  log('📦 步驟 2: 初始化 Google Cloud Storage Client', 'blue');
  let storage;
  try {
    const credentials = JSON.parse(serviceAccountKey);
    storage = new Storage({
      projectId: projectId,
      credentials: credentials,
    });
    log('   ✅ Storage Client 初始化成功', 'green');
  } catch (error) {
    log(`   ❌ 初始化失敗: ${error.message}`, 'red');
    process.exit(1);
  }
  console.log();

  // 步驟 3: 驗證 Bucket 存在
  log('🪣 步驟 3: 驗證 Bucket 是否存在', 'blue');
  let bucket;
  try {
    bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    if (!exists) {
      log(`   ❌ Bucket "${bucketName}" 不存在`, 'red');
      log(`   💡 請先在 GCP Console 建立 Bucket`, 'yellow');
      process.exit(1);
    }
    log(`   ✅ Bucket "${bucketName}" 存在`, 'green');
  } catch (error) {
    log(`   ❌ 檢查 Bucket 時發生錯誤: ${error.message}`, 'red');
    process.exit(1);
  }
  console.log();

  // 步驟 4: 建立測試檔案
  log('📝 步驟 4: 建立測試檔案', 'blue');
  const testFileName = `test_upload_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const testFileContent = `GCS 上傳測試檔案
建立時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
專案 ID: ${projectId}
Bucket 名稱: ${bucketName}
測試成功！✅`;

  const testFilePath = path.join(__dirname, testFileName);
  fs.writeFileSync(testFilePath, testFileContent, 'utf8');
  log(`   ✅ 測試檔案已建立: ${testFileName}`, 'green');
  console.log();

  // 步驟 5: 上傳檔案到 GCS
  log('🚀 步驟 5: 上傳檔案到 GCS', 'blue');
  try {
    const destination = `test/${testFileName}`;
    await bucket.upload(testFilePath, {
      destination: destination,
      metadata: {
        contentType: 'text/plain',
        metadata: {
          uploadedBy: 'vsale-test-script',
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    log(`   ✅ 檔案上傳成功！`, 'green');
    log(`   📂 GCS 路徑: gs://${bucketName}/${destination}`, 'cyan');
  } catch (error) {
    log(`   ❌ 上傳失敗: ${error.message}`, 'red');
    // 清理本地測試檔案
    fs.unlinkSync(testFilePath);
    process.exit(1);
  }
  console.log();

  // 步驟 6: 驗證檔案是否存在於 GCS
  log('🔍 步驟 6: 驗證檔案是否存在於 GCS', 'blue');
  try {
    const file = bucket.file(`test/${testFileName}`);
    const [exists] = await file.exists();
    if (exists) {
      log('   ✅ 檔案已成功上傳到 GCS', 'green');

      // 取得檔案元資料
      const [metadata] = await file.getMetadata();
      log(`   📊 檔案大小: ${metadata.size} bytes`, 'cyan');
      log(`   🕒 建立時間: ${new Date(metadata.timeCreated).toLocaleString('zh-TW')}`, 'cyan');
    } else {
      log('   ❌ 檔案未找到於 GCS', 'red');
    }
  } catch (error) {
    log(`   ❌ 驗證時發生錯誤: ${error.message}`, 'red');
  }
  console.log();

  // 步驟 7: 清理本地測試檔案
  log('🧹 步驟 7: 清理本地測試檔案', 'blue');
  try {
    fs.unlinkSync(testFilePath);
    log('   ✅ 本地測試檔案已刪除', 'green');
  } catch (error) {
    log(`   ⚠️  警告: 無法刪除本地測試檔案: ${error.message}`, 'yellow');
  }
  console.log();

  // 完成
  log('========================================', 'cyan');
  log('🎉 GCS 上傳測試完成！', 'green');
  log('========================================', 'cyan');
  console.log();
  log('📝 後續步驟:', 'yellow');
  log('   1. 前往 GCP Console 查看上傳的檔案:', 'yellow');
  log(`      https://console.cloud.google.com/storage/browser/${bucketName}/test`, 'cyan');
  log('   2. 確認檔案內容正確後，可手動刪除測試檔案', 'yellow');
  log('   3. GCS 備份系統已準備就緒，可開始使用！', 'yellow');
  console.log();
}

// 執行測試
testGCSUpload().catch((error) => {
  log(`\n❌ 測試過程發生未預期錯誤: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
