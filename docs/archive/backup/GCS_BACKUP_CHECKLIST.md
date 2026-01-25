# GCS 備份功能快速檢查清單

**建立時間**: 2026-01-23
**用途**: 快速檢查 GCS 備份功能是否正常運作

---

## ✅ 檢查清單

### 第 1 步：檢查 Vercel 環境變數

前往 [Vercel Dashboard](https://vercel.com/haraluyas-projects/vsale-lite/settings/environment-variables)

確認以下 7 個變數存在（**所有環境都勾選**）：

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GCS_SERVICE_ACCOUNT_KEY`
- [ ] `GCS_BUCKET_NAME`
- [ ] `GCS_PROJECT_ID`
- [ ] `CRON_SECRET`

**如果缺少任何變數**：參考 [GCS 備份恢復指南](RESTORE_GCS_BACKUP.md)

---

### 第 2 步：檢查 GCS 儲存桶

```bash
# 列出備份檔案
gcloud storage ls gs://vsale-backups

# 或透過 Console
# https://console.cloud.google.com/storage/browser/vsale-backups
```

**預期結果**：
- [ ] 儲存桶存在
- [ ] 有備份檔案（例如：vsale-backup-20260123-020000.sql.gz）
- [ ] 備份檔案為最近的日期

**如果儲存桶不存在**：參考 [GCS 備份恢復指南 - 步驟 3B](RESTORE_GCS_BACKUP.md#-步驟-3b確認或建立-gcs-儲存桶)

---

### 第 3 步：測試備份 API

```bash
# 手動觸發備份
curl -X POST https://sale.devape.me/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 預期結果：
# {"success":true,"data":{"jobId":"backup_20260123_123456"}}
```

**結果判斷**：

- [ ] **成功** - 備份功能正常
- [ ] **401 Unauthorized** - CRON_SECRET 錯誤
- [ ] **500 Server Error** - 環境變數缺失或 GCS 金鑰錯誤

**如果失敗**：參考 [GCS 備份恢復指南 - 步驟 4](RESTORE_GCS_BACKUP.md#-步驟-4測試備份功能)

---

### 第 4 步：檢查 Vercel Cron 設定

確認 `vercel.json` 包含 Cron 設定：

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**說明**：
- `0 18 * * *` = 每天 18:00 UTC = 台灣時間凌晨 2:00
- Vercel Cron 會自動呼叫 `/api/cron/backup` 端點

**檢查方法**：
```bash
# 查看 vercel.json
cat vercel.json

# 或透過 Vercel Dashboard
# Project → Settings → Cron Jobs
```

- [ ] Cron 設定存在
- [ ] 排程時間正確

---

### 第 5 步：檢查後台系統設定

1. 登入後台：https://sale.devape.me/admin/login
2. 前往「系統設定」
3. 確認：

- [ ] 「備份已啟用」開關為「開啟」
- [ ] 「最後備份時間」為最近的時間（< 24 小時）
- [ ] 「備份保留數量」設定正確（預設 10）

---

## 🚨 常見問題與解決方案

### 問題 1：`vercel env ls` 顯示「No Environment Variables found」

**原因**：CLI 連結錯誤或專案名稱錯誤

**解決方案**：
1. 使用 Vercel Dashboard 檢查（更可靠）
2. 重新連結專案：
   ```bash
   rm -rf .vercel
   vercel link
   ```

---

### 問題 2：備份 API 回傳 500 錯誤

**可能原因**：

**A. 缺少環境變數**
```json
{"success":false,"error":"Server configuration error"}
```
→ 檢查 `GCS_SERVICE_ACCOUNT_KEY`、`GCS_BUCKET_NAME`、`GCS_PROJECT_ID` 是否都存在

**B. GCS 金鑰錯誤**
```json
{"success":false,"error":"Failed to upload backup to GCS"}
```
→ 檢查 `GCS_SERVICE_ACCOUNT_KEY` 格式是否正確（必須是完整的 JSON）

**C. GCS 儲存桶不存在**
```json
{"success":false,"error":"Bucket not found"}
```
→ 建立儲存桶或檢查 `GCS_BUCKET_NAME` 是否正確

---

### 問題 3：CRON_SECRET 遺失或不知道

**解決方案**：產生新的密鑰並更新

```bash
# 產生新的隨機密鑰
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 輸出範例：
# 3kF9mN2pQ8vR1wX5yZ7aB4cD6eG8hJ0kL2mN4oP6qR8s

# 更新到 Vercel 環境變數
# 前往 Vercel Dashboard → Settings → Environment Variables
# 找到 CRON_SECRET 並更新值
```

---

### 問題 4：GCS_SERVICE_ACCOUNT_KEY 遺失

**解決方案**：下載新的金鑰

```bash
# 列出服務帳號
gcloud iam service-accounts list

# 建立新金鑰
gcloud iam service-accounts keys create vsale-backup-key.json \
  --iam-account=vsale-backup@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 查看金鑰內容
cat vsale-backup-key.json

# 複製完整 JSON 內容到 Vercel 環境變數
```

**或透過 Console**：
1. 前往 [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. 點擊服務帳號 → KEYS 分頁
3. ADD KEY → Create new key → JSON
4. 下載並複製內容

---

## 📊 快速診斷流程圖

```
開始
 │
 ├─ vercel env ls 有變數？
 │   ├─ 是 → 確認 GCS 相關變數 (4個)
 │   │        ├─ 都有 → 測試備份 API
 │   │        │          ├─ 成功 → ✅ 備份功能正常
 │   │        │          └─ 失敗 → 檢查 GCS 金鑰與儲存桶
 │   │        └─ 缺少 → 新增缺少的變數
 │   │
 │   └─ 否 → 使用 Vercel Dashboard 檢查
 │            ├─ Dashboard 有變數 → CLI 問題（忽略）
 │            └─ Dashboard 也沒有 → 緊急恢復所有環境變數
 │
 └─ 恢復完成 → 重新測試
```

---

## 📋 完整環境變數參考

### 核心變數（3 個）- 必要

| 變數名稱 | 範例值 | 說明 |
|---------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abc123.supabase.co` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | 前端認證金鑰 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | 後端完整權限金鑰 |

### GCS 備份變數（4 個）- 備份功能必要

| 變數名稱 | 範例值 | 說明 |
|---------|--------|------|
| `GCS_SERVICE_ACCOUNT_KEY` | `{"type":"service_account",...}` | GCS 服務帳號金鑰 (JSON) |
| `GCS_BUCKET_NAME` | `vsale-backups` | GCS 儲存桶名稱 |
| `GCS_PROJECT_ID` | `my-project-123` | Google Cloud 專案 ID |
| `CRON_SECRET` | `3kF9mN2pQ8vR1wX5...` | Cron Job 安全驗證金鑰 |

---

## 🔗 相關文件

- [GCS 備份恢復指南](RESTORE_GCS_BACKUP.md) - 完整的恢復步驟
- [Supabase 備份指南](SUPABASE_BACKUP_GUIDE.md) - 備份方案比較
- [環境變數檢查清單](ENV_VARIABLES_CHECKLIST.md) - 所有變數說明

---

## 📞 需要協助？

如果以上步驟無法解決問題，請提供以下資訊：

1. Vercel Dashboard 環境變數截圖
2. 備份 API 錯誤訊息
3. GCS 儲存桶狀態
4. `vercel.json` 內容

---

**最後更新**: 2026-01-23
**下一步**: 確認所有檢查項目都打勾 ✅
