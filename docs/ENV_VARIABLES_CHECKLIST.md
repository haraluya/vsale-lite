# 環境變數檢查清單

**用途**: 協助開發者快速檢查與設定環境變數
**最後更新**: 2026-01-23

---

## 目錄

- [概述](#概述)
- [必填環境變數](#必填環境變數)
- [可選環境變數](#可選環境變數)
- [環境差異對照表](#環境差異對照表)
- [快速設定指南](#快速設定指南)
- [驗證與疑難排解](#驗證與疑難排解)

---

## 概述

Vsale-lite 使用環境變數來管理敏感資訊與配置，確保專案可在不同環境中運行。

**設定位置**：
- **本機開發**: `.env.local` 檔案（根目錄）
- **Vercel 部署**: Vercel Dashboard → Settings → Environment Variables

**範本檔案**：
- `.env.local.example` - 包含所有變數的說明與範例

---

## 必填環境變數

這 3 個變數是應用正常運作的**最低需求**，缺少任何一個都會導致應用無法啟動。

### 1. NEXT_PUBLIC_SUPABASE_URL

**用途**: Supabase 專案的 API 端點 URL

**格式**:
```
https://YOUR_PROJECT_REF.supabase.co
```

**取得方式**:
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **Settings → API**
4. 複製 **Project URL**

**範例**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
```

**驗證**:
- ✅ URL 必須以 `https://` 開頭
- ✅ 必須以 `.supabase.co` 結尾
- ✅ 專案 ID 長度為 20 個字元

**常見錯誤**:
- ❌ 缺少 `https://` 前綴
- ❌ 使用錯誤的專案 URL
- ❌ 包含多餘的空格或換行

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

**用途**: Supabase 公開金鑰，用於前端認證與 RLS（Row Level Security）

**格式**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長字串）
```

**取得方式**:
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **Settings → API**
4. 複製 **Project API keys → anon public**

**範例**:
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3ZhdnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzk2MTYzOSwiZXhwIjoxOTM5NTM3NjM5fQ.xxxxx
```

**驗證**:
- ✅ 以 `eyJ` 開頭（JWT 格式）
- ✅ 長度約 200-300 字元
- ✅ 包含兩個 `.` 分隔符（JWT 結構）

**安全性說明**:
- ✅ 此金鑰可以在前端使用（公開）
- ✅ RLS 策略會限制資料存取權限
- ❌ 不應用於後端 Server Actions（使用 service_role 代替）

**常見錯誤**:
- ❌ 複製時截斷或包含多餘字元
- ❌ 使用 `service_role` 金鑰（安全風險）

---

### 3. SUPABASE_SERVICE_ROLE_KEY

**用途**: Supabase 服務金鑰，擁有完整資料庫權限，用於 Server Actions 與 Migration

**格式**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長字串，比 anon 更長）
```

**取得方式**:
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **Settings → API**
4. 複製 **Project API keys → service_role secret**
5. ⚠️ **注意**: 點擊 **Reveal** 才能看到完整金鑰

**範例**:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3ZhdnkiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjIzOTYxNjM5LCJleHAiOjE5Mzk1Mzc2Mzl9.xxxxx
```

**驗證**:
- ✅ 以 `eyJ` 開頭（JWT 格式）
- ✅ 長度約 250-350 字元（比 anon 更長）
- ✅ JWT payload 包含 `"role":"service_role"`

**安全性說明**:
- ⚠️ **極敏感**：此金鑰可繞過所有 RLS 策略
- ⚠️ **切勿公開**：不可在前端使用，不可 commit 到 Git
- ✅ **僅在後端使用**：Server Actions、Migration 腳本、Cron Jobs
- ✅ **環境隔離**：確保在 `.gitignore` 中排除 `.env.local`

**常見錯誤**:
- ❌ 在前端 Client Component 中使用（安全風險）
- ❌ Commit 到 Git（洩露金鑰）
- ❌ 與 `anon` 金鑰混淆

---

## 可選環境變數

這 8 個變數是**進階功能**所需，不設定不影響核心功能。

### 4. DB_HOST（可選）

**用途**: 資料庫主機位址，用於直接連線資料庫（備份腳本）

**格式**:
```
db.YOUR_PROJECT_REF.supabase.co
```

**取得方式**:
1. Supabase Dashboard → Settings → Database
2. 複製 **Connection string → Host**

**範例**:
```bash
DB_HOST=db.abcdefghijklmnopqrst.supabase.co
```

**使用場景**:
- 執行資料庫備份腳本
- 使用 `pg_dump` 或 `psql` 工具

---

### 5. DB_PASSWORD（可選）

**用途**: 資料庫密碼，用於直接連線資料庫

**格式**:
```
隨機字串（建立專案時設定）
```

**取得方式**:
1. Supabase Dashboard → Settings → Database
2. 查看 **Database password**
3. ⚠️ 如果忘記，需要**重設密碼**

**範例**:
```bash
DB_PASSWORD=your_database_password_here
```

**安全性說明**:
- ⚠️ 極敏感資訊，切勿 commit 到 Git
- ✅ 僅在本機備份腳本中使用

---

### 6. DB_USER（可選）

**用途**: 資料庫使用者名稱（通常為 `postgres`）

**格式**:
```
postgres
```

**範例**:
```bash
DB_USER=postgres
```

---

### 7. DB_PORT（可選）

**用途**: 資料庫連接埠（通常為 `5432`）

**格式**:
```
5432
```

**範例**:
```bash
DB_PORT=5432
```

---

### 8. GCS_BUCKET_NAME（可選）

**用途**: Google Cloud Storage 儲存桶名稱，用於雲端備份

**格式**:
```
your-bucket-name
```

**取得方式**:
1. 前往 [Google Cloud Storage](https://console.cloud.google.com/storage)
2. 建立或選擇現有儲存桶
3. 複製儲存桶名稱

**範例**:
```bash
GCS_BUCKET_NAME=vsale-backups
```

**使用場景**:
- 自動化資料庫備份
- Vercel Cron Job 定期備份

**相關文件**:
- [Cloud Backup 設定指南](../specs/015-cloud-backup/quickstart.md)

---

### 9. GCS_SERVICE_ACCOUNT_KEY（可選）

**用途**: Google Cloud 服務帳號金鑰檔案路徑

**格式**:
```
./service-account-key.json
```

**取得方式**:
1. 前往 [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. 建立服務帳號
3. 下載 JSON 金鑰檔案
4. 將檔案放在專案根目錄

**範例**:
```bash
GCS_SERVICE_ACCOUNT_KEY=./service-account-key.json
```

**安全性說明**:
- ⚠️ 金鑰檔案已在 `.gitignore` 中排除
- ✅ 確保檔案權限設定為僅所有者可讀

---

### 10. NEXT_PUBLIC_SUPABASE_URL_SITE2（可選）

**用途**: 站點二 Supabase URL，用於多站點資料遷移

**格式**:
```
https://YOUR_SITE2_PROJECT_REF.supabase.co
```

**範例**:
```bash
NEXT_PUBLIC_SUPABASE_URL_SITE2=https://xyzabcdefghijklmnop.supabase.co
```

**使用場景**:
- 執行 `pnpm site2:migrate` 資料遷移
- 多站點部署管理

**相關文件**:
- [站點二遷移指南](./SITE2_MIGRATION_GUIDE.md)

---

### 11. SUPABASE_SERVICE_ROLE_KEY_SITE2（可選）

**用途**: 站點二服務金鑰

**格式**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長字串）
```

**範例**:
```bash
SUPABASE_SERVICE_ROLE_KEY_SITE2=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

**安全性說明**:
- ⚠️ 極敏感，切勿公開

---

## 環境差異對照表

### 本機開發 vs Vercel 部署

| 變數名稱 | 本機開發 (.env.local) | Vercel 部署 | 說明 |
|---------|---------------------|------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 必須 | ✅ 必須 | 前端與後端都需要 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 必須 | ✅ 必須 | 前端與後端都需要 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ 必須 | ✅ 必須 | 僅後端使用 |
| `DB_HOST` | ⚪ 可選 | ❌ 不需要 | 本機備份腳本專用 |
| `DB_PASSWORD` | ⚪ 可選 | ❌ 不需要 | 本機備份腳本專用 |
| `DB_USER` | ⚪ 可選 | ❌ 不需要 | 本機備份腳本專用 |
| `DB_PORT` | ⚪ 可選 | ❌ 不需要 | 本機備份腳本專用 |
| `GCS_BUCKET_NAME` | ⚪ 可選 | ✅ 必須（如使用備份） | Cron Job 備份需要 |
| `GCS_SERVICE_ACCOUNT_KEY` | ⚪ 可選 | ✅ 必須（如使用備份） | Cron Job 備份需要 |
| `NEXT_PUBLIC_SUPABASE_URL_SITE2` | ⚪ 可選 | ❌ 不需要 | 僅多站點遷移使用 |
| `SUPABASE_SERVICE_ROLE_KEY_SITE2` | ⚪ 可選 | ❌ 不需要 | 僅多站點遷移使用 |

**圖示說明**:
- ✅ 必須：必須設定才能正常運作
- ⚪ 可選：進階功能所需，不設定不影響核心功能
- ❌ 不需要：該環境不需要此變數

---

### Vercel 環境變數設定範圍

在 Vercel 設定環境變數時，需要選擇適用的環境：

| 環境類型 | 說明 | 建議設定 |
|---------|------|---------|
| **Production** | 正式環境（主分支部署） | ✅ 勾選 |
| **Preview** | 預覽環境（Pull Request 部署） | ✅ 勾選 |
| **Development** | 開發環境（本機 `vercel dev`） | ✅ 勾選 |

**建議**：3 個必填變數在**所有環境**都勾選，確保任何部署都能正常運作。

---

## 快速設定指南

### 新專案設定（從零開始）

```bash
# 步驟 1: 複製範本檔案
cp .env.local.example .env.local

# 步驟 2: 編輯 .env.local
# 使用您偏好的編輯器（例如 VS Code）
code .env.local

# 步驟 3: 填入 3 個必填變數
# NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 步驟 4: 驗證環境變數
pnpm check-env

# 步驟 5: 啟動開發伺服器
pnpm dev
```

---

### 現有專案新增變數

如果您需要新增可選變數（例如設定雲端備份）：

```bash
# 編輯 .env.local
code .env.local

# 新增可選變數（取消註解並填入值）
# GCS_BUCKET_NAME=vsale-backups
# GCS_SERVICE_ACCOUNT_KEY=./service-account-key.json

# 重新驗證環境變數
pnpm check-env

# 重新啟動開發伺服器
pnpm dev
```

---

### Vercel 環境變數設定

```bash
# 方式一：透過 Vercel Dashboard（推薦）
# 1. 前往 https://vercel.com/dashboard
# 2. 選擇專案 → Settings → Environment Variables
# 3. 逐一新增變數：
#    - Name: NEXT_PUBLIC_SUPABASE_URL
#    - Value: https://YOUR_PROJECT_REF.supabase.co
#    - Environment: Production, Preview, Development（全勾選）
# 4. 點擊 Save

# 方式二：透過 Vercel CLI（進階）
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 輸入值後按 Enter
```

**重要**：新增或修改環境變數後，必須**重新部署**才會生效。

---

## 驗證與疑難排解

### 自動化驗證工具

```bash
# 執行環境檢查工具
pnpm check-env
```

**成功輸出範例**：
```
✅ 環境變數檢查通過
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

必要變數:
✅ NEXT_PUBLIC_SUPABASE_URL: https://abcdefghijklmnopqrst.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: 已設定 (eyJ...)
✅ SUPABASE_SERVICE_ROLE_KEY: 已設定 (eyJ...)

可選變數:
⚪ DB_HOST: 未設定
⚪ DB_PASSWORD: 未設定
⚪ GCS_BUCKET_NAME: 未設定

所有必要環境變數已正確設定 🎉
```

**失敗輸出範例**：
```
❌ 環境變數檢查失敗
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

缺少必要變數:
❌ NEXT_PUBLIC_SUPABASE_URL: 未設定
❌ SUPABASE_SERVICE_ROLE_KEY: 未設定

警告:
⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY 格式錯誤（應為 JWT 格式）

請參考 .env.local.example 設定正確的環境變數
```

---

### 手動驗證步驟

如果自動化工具失敗，可手動檢查：

#### 1. 檢查檔案是否存在

```bash
# 本機開發
ls -la .env.local

# 如果不存在
cp .env.local.example .env.local
```

#### 2. 檢查變數格式

```bash
# 顯示環境變數（隱藏敏感值）
cat .env.local | grep -v "^#" | grep "="
```

**檢查項目**：
- ✅ 無多餘空格（`VAR=value` 而非 `VAR = value`）
- ✅ 無引號（`VAR=value` 而非 `VAR="value"`）
- ✅ 無換行（單行）

#### 3. 測試 API 端點

```bash
# 本機環境
curl http://localhost:3000/api/env-test

# 線上環境（替換為您的 URL）
curl https://your-app.vercel.app/api/env-test
```

**成功回應範例**：
```json
{
  "status": "ok",
  "projectRef": "abcdefghijklmnopqrst",
  "hasMainSiteConfig": true,
  "hasSite2Config": false
}
```

---

### 常見問題與解決方案

#### Q: 為什麼變數設定後還是顯示未設定？

**原因**：
- 變數名稱拼寫錯誤
- 檔案儲存後未重新啟動開發伺服器
- Vercel 環境變數更新後未重新部署

**解決**：
```bash
# 1. 檢查變數名稱
cat .env.local | grep "SUPABASE"

# 2. 重新啟動開發伺服器
# Ctrl+C 停止，然後重新執行
pnpm dev

# 3. Vercel 重新部署
# 前往 Vercel Dashboard → Deployments → Redeploy
```

---

#### Q: 如何確認變數已載入到 Next.js？

**本機開發**：
```javascript
// 在任何 Server Component 或 Server Action 中
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
```

**Vercel 部署**：
- 前往 Vercel Dashboard → Deployments
- 點擊最新的部署 → **Function Logs**
- 查看 Log 輸出

---

#### Q: service_role 金鑰可以在前端使用嗎？

**答案**：❌ **絕對不可以**

**原因**：
- `service_role` 金鑰可繞過所有 RLS 策略
- 在前端使用會洩露完整資料庫存取權限
- 惡意使用者可以刪除或竄改所有資料

**正確做法**：
- ✅ 僅在 Server Actions（`'use server'`）中使用
- ✅ 使用 `lib/supabase/server.ts` 的 `createClient()`
- ❌ 不可在 Client Components 中使用

---

#### Q: 環境變數可以 commit 到 Git 嗎？

**答案**：❌ **絕對不可以**（`.env.local`）

**原因**：
- 包含敏感金鑰與密碼
- 洩露後可能導致資料庫被入侵

**正確做法**：
- ✅ 將 `.env.local` 加入 `.gitignore`（專案已設定）
- ✅ Commit `.env.local.example`（範本檔案）
- ✅ 使用 Vercel Environment Variables 管理線上環境變數

**檢查是否誤 commit**：
```bash
# 檢查 Git 歷史
git log -- .env.local .env.vercel .env

# 應該無輸出（代表從未被 commit）
```

---

## 相關文件

- [新用戶部署指南](./NEW_DEPLOYMENT_GUIDE.md) - 完整部署流程
- [故障排除指南](./TROUBLESHOOTING.md) - 常見問題與解決方案
- [Cloud Backup 設定](../specs/015-cloud-backup/quickstart.md) - GCS 備份設定
- [站點二遷移指南](./SITE2_MIGRATION_GUIDE.md) - 多站點資料遷移

---

**最後更新**: 2026-01-23
**版本**: 1.0.0
**作者**: Claude Sonnet 4.5
