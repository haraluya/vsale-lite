# Vercel 環境變數完整清單

**最後更新**: 2026-01-23
**專案**: vsale (主站)

---

## ✅ 已設定的環境變數（Production）

### 1️⃣ 核心 Supabase 變數（必需）

| 變數名稱 | 用途 | 範例值 |
|---------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | `https://qwovavytryvgchcowjof.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開金鑰 | `eyJhbGci...` (約 300 字元) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務金鑰（Server 端） | `eyJhbGci...` (約 300 字元) |

**重要性**: ⭐⭐⭐⭐⭐（沒有這 3 個變數，網站無法運作）

---

### 2️⃣ 雲端備份變數（GCS）（強烈推薦）

| 變數名稱 | 用途 | 範例值 |
|---------|------|--------|
| `GCS_PROJECT_ID` | Google Cloud 專案 ID | `vsale-backup` |
| `GCS_BUCKET_NAME` | GCS 儲存桶名稱 | `vsale-backups-haraluya` |
| `GCS_SERVICE_ACCOUNT_KEY` | GCS 服務帳號金鑰（JSON） | `{"type":"service_account",...}` |
| `CRON_SECRET` | Cron Job 安全驗證金鑰 | `l0lliBYg...` (Base64 編碼) |

**重要性**: ⭐⭐⭐⭐（自動化每日備份，保護資料安全）

**用途**:
- 自動執行每日凌晨 2:00 資料庫備份
- 將備份上傳到 Google Cloud Storage
- Cron Job API (`/api/backup/cron`) 驗證用

---

### 3️⃣ 資料庫直連變數（選用）

| 變數名稱 | 用途 | 範例值 |
|---------|------|--------|
| `DB_HOST` | 資料庫主機位址 | `db.qwovavytryvgchcowjof.supabase.co` |
| `DB_PORT` | 資料庫埠號 | `5432` |
| `DB_NAME` | 資料庫名稱 | `postgres` |
| `DB_USER` | 資料庫使用者 | `postgres` |
| `DB_PASSWORD` | 資料庫密碼 | `4Og37Vy1GzQJFq6K` |

**重要性**: ⭐⭐（主要用於本地備份，Vercel 可選）

**用途**:
- 本地執行 `pnpm db:backup`（pg_dump）
- 本地執行還原腳本
- Vercel 上如需執行 pg_dump API（目前已使用 GCS，可選）

**建議**:
- ✅ 本地開發必須設定到 `.env.local`
- ⚠️ Vercel 可選（目前備份使用 GCS API，不需要 pg_dump）

---

## 📋 環境變數檢查清單

### Production 環境（已完成 ✅）

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `GCS_PROJECT_ID`
- [x] `GCS_BUCKET_NAME`
- [x] `GCS_SERVICE_ACCOUNT_KEY`
- [x] `CRON_SECRET`
- [x] `DB_HOST`
- [x] `DB_PORT`
- [x] `DB_NAME`
- [x] `DB_USER`
- [x] `DB_PASSWORD`

**總計**: 12 個環境變數

---

## 🔄 如何更新環境變數

### 方法 1: Vercel Dashboard（推薦）

1. 前往 [Vercel 環境變數設定](https://vercel.com/haraluyas-projects/vsale/settings/environment-variables)
2. 找到要更新的變數
3. 點擊右側「⋯」→「Edit」
4. 輸入新值並儲存
5. 觸發重新部署：`vercel --prod`

### 方法 2: Vercel CLI

```bash
# 更新單一變數
vercel env rm <變數名稱> production
echo "新值" | vercel env add <變數名稱> production

# 重新部署
vercel --prod
```

---

## ❓ 常見問題

### Q1: Preview 和 Development 環境需要設定嗎？

**A**: 看需求

- ✅ **Production**: 必須設定（線上環境）
- ⚠️ **Preview**: 建議設定（PR 預覽時使用）
- 💡 **Development**: 可選（本地開發使用 `.env.local`）

**建議設定方式**:
```bash
# 一次設定所有環境（如果需要）
echo "值" | vercel env add <變數名稱> production preview development
```

### Q2: 為什麼 Dashboard 顯示 Empty？

**可能原因**:
1. 只設定了 Production，但 Dashboard 顯示 "All Environments"
2. Dashboard 快取未更新（重新整理頁面）
3. 變數確實為空（需要補上）

**解決方法**:
- 重新整理 Vercel Dashboard
- 使用 `vercel env ls` 確認實際狀態
- 如確實為空，使用上方指令補上

### Q3: 哪些變數可以刪除？

**可刪除的變數**（如果 Vercel 上有但不需要）:
- ❌ `SITE_IDENTIFIER`（程式碼未使用）
- ⚠️ `DB_*` 相關變數（如果只使用 GCS 備份，不需要 pg_dump）

**絕對不可刪除**:
- ✅ 3 個核心 Supabase 變數
- ✅ 4 個 GCS 備份變數（如果需要自動備份）

---

## 🚀 部署後驗證

設定完環境變數後，執行以下驗證：

```bash
# 1. 重新部署
vercel --prod

# 2. 測試主站是否正常
# 訪問 https://sale.devape.me/login

# 3. 測試 API 健康檢查
curl https://sale.devape.me/api/health

# 4. 測試備份 API（可選）
curl https://sale.devape.me/api/backup/cron \
  -H "Authorization: Bearer l0lliBYgESFNf2fZmPEG/lEOgnlyN/x9AJ19TrKOYTM="
```

---

## 📚 相關文件

- [環境變數檢查清單](ENV_VARIABLES_CHECKLIST.md) - 所有變數的詳細說明
- [部署指南](../DEPLOYMENT.md) - 完整部署流程
- [備份系統文件](BACKUP_RESTORE_CHEATSHEET.md) - GCS 備份設定

---

**最後更新**: 2026-01-23
**狀態**: ✅ 所有核心變數已設定完成
