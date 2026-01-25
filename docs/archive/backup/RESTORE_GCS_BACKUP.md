# GCS 備份功能恢復指南

**建立時間**: 2026-01-23
**用途**: 檢查與恢復主站的 GCS 雲端備份功能

---

## ⚠️ 發現問題

執行 `vercel env ls` 時發現**主站沒有環境變數**或環境變數被清空。

這會導致以下嚴重問題：
- ❌ 應用程式無法連接 Supabase
- ❌ 所有功能停止運作
- ❌ 備份功能無法執行

---

## 🔍 步驟 1：確認主站專案與環境變數狀態

### 方法 A：使用 Vercel Dashboard（推薦）

1. 前往 [Vercel Dashboard](https://vercel.com/haraluyas-projects)

2. 找到主站專案（應該是以下之一）：
   - `vsale-lite` (https://sale.devape.me)
   - `vsale`

3. 點擊進入專案 → Settings → Environment Variables

4. 檢查是否有環境變數：

**情況 A：有環境變數**
```
✅ 變數存在，但 CLI 顯示錯誤
→ CLI 連結問題，忽略 CLI 結果
→ 跳到「步驟 2：確認 GCS 備份變數」
```

**情況 B：沒有環境變數**
```
❌ 環境變數被清空或遺失
→ 需要重新設定所有環境變數
→ 跳到「步驟 3：緊急恢復所有環境變數」
```

### 方法 B：測試線上應用程式

訪問主站 URL 並檢查：

```bash
# 測試主站連線
curl https://sale.devape.me/api/check-connection

# 預期結果（正常）：
# {"connected": true, "supabaseUrl": "https://..."}

# 異常結果（環境變數遺失）：
# {"error": "Environment variables not configured"}
```

---

## 📋 步驟 2：確認 GCS 備份變數（環境變數存在的情況）

### 必需的 GCS 備份變數（4 個）

前往 Vercel Dashboard → Settings → Environment Variables，確認以下變數存在：

| 變數名稱 | 用途 | 必要性 |
|---------|------|--------|
| `GCS_SERVICE_ACCOUNT_KEY` | Google Cloud 服務帳號金鑰 | ✅ 必要 |
| `GCS_BUCKET_NAME` | GCS 儲存桶名稱 | ✅ 必要 |
| `GCS_PROJECT_ID` | Google Cloud 專案 ID | ✅ 必要 |
| `CRON_SECRET` | Cron Job 安全驗證 | ✅ 必要 |

### 檢查結果

**✅ 所有 4 個變數都存在**
- 備份功能正常
- 跳到「步驟 4：測試備份功能」

**❌ 缺少部分或全部變數**
- 需要新增缺少的變數
- 繼續閱讀「步驟 3：新增 GCS 備份變數」

---

## 🔧 步驟 3：緊急恢復所有環境變數

### 情境 A：環境變數完全遺失

**優先恢復核心變數（3 個）**：

1. 前往 [Vercel Dashboard](https://vercel.com/haraluyas-projects/vsale-lite/settings/environment-variables)
2. 點擊「Add New」
3. 依序新增以下變數（**勾選所有環境**）：

```env
# 1. Supabase URL
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://YOUR_PROJECT_REF.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development

# 2. Supabase Anon Key
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ✅ Production ✅ Preview ✅ Development

# 3. Supabase Service Role Key
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ✅ Production ✅ Preview ✅ Development
```

**取得 Supabase 金鑰**：
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. Settings → API
4. 複製對應的金鑰

**新增 GCS 備份變數（4 個）**：

```env
# 4. GCS Service Account Key
Name: GCS_SERVICE_ACCOUNT_KEY
Value: {"type":"service_account","project_id":"..."}
Environments: ✅ Production ✅ Preview ✅ Development

# 5. GCS Bucket Name
Name: GCS_BUCKET_NAME
Value: vsale-backups
Environments: ✅ Production ✅ Preview ✅ Development

# 6. GCS Project ID
Name: GCS_PROJECT_ID
Value: your-gcp-project-id
Environments: ✅ Production ✅ Preview ✅ Development

# 7. Cron Secret
Name: CRON_SECRET
Value: your-random-secret-here
Environments: ✅ Production ✅ Preview ✅ Development
```

**產生 CRON_SECRET**：
```bash
# 使用 Node.js 產生隨機密鑰
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 情境 B：僅缺少 GCS 備份變數

**如果核心變數存在，僅新增 GCS 變數**：

按照上方「新增 GCS 備份變數」的步驟操作。

---

## 🔑 步驟 3A：取得 GCS 服務帳號金鑰（如果遺失）

### 情況 1：有現有的服務帳號

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 選擇您的專案
3. 導航到 **IAM & Admin → Service Accounts**
4. 找到用於備份的服務帳號（例如：`vsale-backup`）
5. 點擊「⋯」→「Manage keys」
6. 點擊「Add Key」→「Create new key」
7. 選擇「JSON」格式
8. 下載金鑰檔案
9. 開啟 JSON 檔案，複製完整內容到 `GCS_SERVICE_ACCOUNT_KEY`

### 情況 2：需要建立新的服務帳號

```bash
# 登入 Google Cloud
gcloud auth login

# 設定專案
gcloud config set project YOUR_PROJECT_ID

# 建立服務帳號
gcloud iam service-accounts create vsale-backup \
  --display-name="Vsale Backup Service Account"

# 授予權限（Storage Object Admin）
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 建立金鑰
gcloud iam service-accounts keys create vsale-backup-key.json \
  --iam-account=vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 查看金鑰內容
cat vsale-backup-key.json
```

**或透過 Console**：

1. 前往 [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. 點擊「CREATE SERVICE ACCOUNT」
3. 填寫：
   - Name: `vsale-backup`
   - Description: `Vsale database backup service account`
4. 點擊「CREATE AND CONTINUE」
5. 授予角色：「Storage Object Admin」
6. 點擊「CONTINUE」→「DONE」
7. 點擊新建的服務帳號
8. 切換到「KEYS」分頁
9. 點擊「ADD KEY」→「Create new key」
10. 選擇「JSON」→「CREATE」
11. 下載金鑰檔案

---

## 🪣 步驟 3B：確認或建立 GCS 儲存桶

### 檢查現有儲存桶

```bash
# 列出所有儲存桶
gcloud storage ls

# 檢查特定儲存桶
gcloud storage ls gs://vsale-backups
```

### 建立新儲存桶（如果不存在）

```bash
# 建立儲存桶（亞洲東區）
gcloud storage buckets create gs://vsale-backups \
  --location=asia-east1 \
  --uniform-bucket-level-access

# 授予服務帳號權限
gcloud storage buckets add-iam-policy-binding gs://vsale-backups \
  --member="serviceAccount:vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

**或透過 Console**：

1. 前往 [Google Cloud Storage](https://console.cloud.google.com/storage)
2. 點擊「CREATE BUCKET」
3. 填寫：
   - Name: `vsale-backups`（必須全域唯一）
   - Location type: Region
   - Location: asia-east1 (Taiwan)
4. 點擊「CREATE」

---

## ✅ 步驟 4：測試備份功能

### 方法 A：手動觸發備份（推薦）

```bash
# 測試備份 API（需要 CRON_SECRET）
curl -X POST https://sale.devape.me/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# 預期結果（成功）：
# {
#   "success": true,
#   "data": {
#     "jobId": "backup_20260123_123456",
#     "deletedCount": 0
#   },
#   "message": "Automatic backup completed"
# }

# 異常結果（環境變數缺失）：
# {
#   "success": false,
#   "error": "Server configuration error"
# }
```

### 方法 B：檢查 GCS 儲存桶

```bash
# 列出備份檔案
gcloud storage ls gs://vsale-backups

# 預期結果（有備份檔案）：
# gs://vsale-backups/vsale-backup-20260123-020000.sql.gz
# gs://vsale-backups/vsale-backup-20260122-020000.sql.gz
```

### 方法 C：檢查系統設定

1. 登入主站後台：https://sale.devape.me/admin/login
2. 前往系統設定
3. 檢查「備份已啟用」是否開啟
4. 查看最後備份時間

---

## 🔄 步驟 5：設定 Vercel Cron（定時備份）

確認 `vercel.json` 包含 Cron 設定：

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**如果缺少此設定**：

<function_calls>
<invoke name="Read">
<parameter name="file_path">d:\APP\vsale\vercel.json
## 🔄 步驟 5：設定 Vercel Cron（定時備份）

### ✅ Cron 設定已存在

專案的 `vercel.json` 已包含 Cron 設定：
