# Google Cloud Storage 設定指南

**功能**: 雲端備份系統環境設定
**建立日期**: 2026-01-09
**預估時間**: 30-60 分鐘

---

## 概述

此指南將協助您完成 Google Cloud Storage (GCS) 的設定，包括建立 Bucket、設定 Service Account 與權限。完成後，雲端備份系統即可開始運作。

---

## 前置需求

- [ ] Google Cloud Platform (GCP) 帳號（[註冊連結](https://console.cloud.google.com/)）
- [ ] gcloud CLI 已安裝（[安裝指南](https://cloud.google.com/sdk/docs/install)）
- [ ] 專案已建立或選擇現有專案
- [ ] 已啟用計費（免費試用額度即可）

---

## Step 1: 建立 GCS Bucket

### 方法 1: 使用 gcloud CLI（推薦）

```bash
# 1. 登入 GCP（首次使用需執行）
gcloud auth login

# 2. 設定專案 ID（替換為您的專案 ID）
gcloud config set project YOUR_PROJECT_ID

# 3. 建立 Bucket（位於台灣 asia-east1 區域）
gcloud storage buckets create gs://vsale-backups \
  --location=asia-east1 \
  --storage-class=STANDARD \
  --uniform-bucket-level-access

# 4. 驗證 Bucket 已建立
gcloud storage buckets list
```

**預期輸出**:
```
Creating gs://vsale-backups/...
gs://vsale-backups
```

### 方法 2: 使用 GCP Console（圖形化介面）

1. 前往 [Cloud Storage Console](https://console.cloud.google.com/storage/browser)
2. 點擊「建立值區」(Create Bucket)
3. 設定：
   - **名稱**: `vsale-backups`
   - **位置類型**: Region
   - **位置**: `asia-east1` (Taiwan)
   - **儲存類別**: Standard
   - **存取控制**: 統一 (Uniform)
4. 點擊「建立」

---

## Step 2: 建立 Service Account

### 使用 gcloud CLI

```bash
# 1. 建立 Service Account
gcloud iam service-accounts create vsale-backup \
  --display-name="Vsale Backup Service Account" \
  --description="用於自動備份系統的服務帳號"

# 2. 驗證 Service Account 已建立
gcloud iam service-accounts list
```

**預期輸出**:
```
Created service account [vsale-backup].
DISPLAY NAME                    EMAIL                                               DISABLED
Vsale Backup Service Account    vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com False
```

**記下 Email**: `vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com`

---

## Step 3: 授予 Bucket 權限

### 最小權限原則

僅授予必要的權限（Storage Object Creator + Viewer），避免 Object Admin 權限：

```bash
# 1. 授予 Storage Object Creator 權限（允許上傳檔案）
gcloud storage buckets add-iam-policy-binding gs://vsale-backups \
  --member="serviceAccount:vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

# 2. 授予 Storage Object Viewer 權限（允許下載與列表檔案）
gcloud storage buckets add-iam-policy-binding gs://vsale-backups \
  --member="serviceAccount:vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# 3. 驗證權限已設定
gcloud storage buckets get-iam-policy gs://vsale-backups
```

**預期輸出**:
```
Updated IAM policy for bucket [vsale-backups].
bindings:
- members:
  - serviceAccount:vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com
  role: roles/storage.objectCreator
- members:
  - serviceAccount:vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com
  role: roles/storage.objectViewer
```

---

## Step 4: 產生 Service Account 金鑰

### 產生 JSON 金鑰

```bash
# 1. 產生金鑰檔案
gcloud iam service-accounts keys create key.json \
  --iam-account=vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 2. 驗證金鑰已產生
ls -lh key.json
```

**預期輸出**:
```
created key [xxxxx] of type [json] as [key.json] for [vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com]
-rw------- 1 user user 2.3K Jan  9 10:00 key.json
```

**⚠️ 安全提醒**:
- 此金鑰檔案包含私密金鑰，請妥善保管
- 不要提交到 Git（已加入 .gitignore）
- 建議儲存在安全的密碼管理工具

---

## Step 5: 設定環境變數

### 複製金鑰到 .env.local

```bash
# 1. 讀取 key.json 並移除換行符號（轉為單行）
cat key.json | tr -d '\n'
```

**複製輸出的 JSON 字串**，然後編輯 `.env.local`：

```bash
# 開啟編輯器
code .env.local  # 或使用其他編輯器
```

**更新以下環境變數**:

```bash
# 將 YOUR_PROJECT_ID 替換為您的實際專案 ID
GCS_PROJECT_ID=YOUR_PROJECT_ID

# Bucket 名稱（已設定好，無需修改）
GCS_BUCKET_NAME=vsale-backups

# 貼上剛才複製的完整 JSON 字串（單行）
GCS_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"YOUR_PROJECT_ID",...}
```

**範例** (請替換為實際值):
```bash
GCS_PROJECT_ID=vsale-production-2024
GCS_BUCKET_NAME=vsale-backups
GCS_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"vsale-production-2024","private_key_id":"abc123def456","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...\n-----END PRIVATE KEY-----\n","client_email":"vsale-backup@vsale-production-2024.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/vsale-backup%40vsale-production-2024.iam.gserviceaccount.com"}
```

---

## Step 6: 測試連線

### 建立測試腳本

建立 `test-gcs-connection.js`:

```javascript
// test-gcs-connection.js
import { Storage } from '@google-cloud/storage';

async function testGCSConnection() {
  try {
    // 初始化 GCS Client
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY)
    });

    const bucketName = process.env.GCS_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);

    // 測試上傳
    const testFile = bucket.file('test-connection.txt');
    await testFile.save('Test connection successful!');
    console.log('✅ 上傳測試成功');

    // 測試下載
    const [content] = await testFile.download();
    console.log('✅ 下載測試成功:', content.toString());

    // 測試刪除
    await testFile.delete();
    console.log('✅ 刪除測試成功');

    console.log('\n🎉 GCS 連線測試全部通過！');
  } catch (error) {
    console.error('❌ GCS 連線測試失敗:', error.message);
    process.exit(1);
  }
}

testGCSConnection();
```

### 執行測試

```bash
# 1. 載入環境變數並執行測試
node --env-file=.env.local test-gcs-connection.js

# 2. 預期輸出
# ✅ 上傳測試成功
# ✅ 下載測試成功: Test connection successful!
# ✅ 刪除測試成功
#
# 🎉 GCS 連線測試全部通過！
```

**若測試失敗，常見問題排查**:

1. **認證失敗**: 檢查 `GCS_SERVICE_ACCOUNT_KEY` 是否為有效 JSON
2. **Bucket 不存在**: 檢查 `GCS_BUCKET_NAME` 是否正確
3. **權限不足**: 確認 Step 3 的權限設定正確
4. **專案 ID 錯誤**: 確認 `GCS_PROJECT_ID` 與 GCP Console 一致

---

## Step 7: Vercel 環境變數設定（部署時）

### 前往 Vercel Dashboard

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案 → Settings → Environment Variables
3. 新增以下環境變數：

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `CRON_SECRET` | (與 .env.local 相同) | Production, Preview |
| `GCS_PROJECT_ID` | YOUR_PROJECT_ID | Production |
| `GCS_BUCKET_NAME` | vsale-backups | Production |
| `GCS_SERVICE_ACCOUNT_KEY` | (完整 JSON 字串) | Production |

**注意**:
- `CRON_SECRET` 可在 .env.local 中找到
- `GCS_SERVICE_ACCOUNT_KEY` 需貼上完整 JSON 字串（與 .env.local 相同）

---

## Step 8: GCS Bucket 生命週期規則（可選）

### 設定自動清理

建立 `lifecycle.json`:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
```

套用規則:

```bash
gcloud storage buckets update gs://vsale-backups \
  --lifecycle-file=lifecycle.json
```

**說明**: 90 天後自動刪除備份檔案（防止孤兒檔案）

---

## 完成檢查清單

- [ ] GCS Bucket 已建立（`gs://vsale-backups`）
- [ ] Service Account 已建立（`vsale-backup@...`）
- [ ] 權限已授予（Object Creator + Viewer）
- [ ] 金鑰檔案已產生（`key.json`）
- [ ] 環境變數已設定（.env.local）
- [ ] 連線測試通過
- [ ] Vercel 環境變數已設定（部署時）
- [ ] （可選）生命週期規則已設定

---

## 成本估算

### 每月預估費用

| 項目 | 用量 | 單價 (asia-east1) | 月費用 |
|------|------|------------------|--------|
| 儲存空間 | 10GB | $0.023/GB | $0.23 |
| 網路傳輸 | 1GB (下載) | $0.12/GB | $0.12 |
| 操作次數 | 100 次 | $0.005/1000 | $0.0005 |
| **總計** | - | - | **~$0.35/月** |

**備註**:
- 免費試用額度 $300 可使用約 850 個月
- 實際費用依使用量而定

---

## 疑難排解

### Q1: gcloud CLI 找不到指令

**解決方式**:
```bash
# 安裝 gcloud CLI
# Windows: https://cloud.google.com/sdk/docs/install#windows
# macOS: brew install --cask google-cloud-sdk
# Linux: curl https://sdk.cloud.google.com | bash
```

### Q2: 權限錯誤「403 Forbidden」

**解決方式**:
1. 檢查 Service Account Email 是否正確
2. 重新執行 Step 3 授予權限
3. 等待 1-2 分鐘讓權限生效

### Q3: JSON 解析錯誤

**解決方式**:
- 確保 `GCS_SERVICE_ACCOUNT_KEY` 為單行（無換行符號）
- 使用 `cat key.json | tr -d '\n'` 移除換行
- 檢查 JSON 格式是否完整

### Q4: Bucket 名稱已被使用

**解決方式**:
- GCS Bucket 名稱全球唯一
- 嘗試使用 `vsale-backups-{RANDOM}` 格式
- 更新 .env.local 中的 `GCS_BUCKET_NAME`

---

## 下一步

完成此設定後：

1. 返回 Phase 1 任務清單，標記 T002-T004 為完成
2. 開始 Phase 2: Foundational（資料庫設計）
3. 測試手動備份功能（Phase 9）

---

**設定完成！** 🎉

如有問題請參考：
- [GCS 官方文件](https://cloud.google.com/storage/docs)
- [Service Account 管理](https://cloud.google.com/iam/docs/service-accounts)
- [IAM 權限參考](https://cloud.google.com/storage/docs/access-control/iam-permissions)
