# 新用戶部署指南

**目標時間**: 2 小時
**難度**: 初級
**最後更新**: 2026-01-23

---

## 目錄

- [概述](#概述)
- [前置需求](#前置需求)
- [部署流程](#部署流程)
  - [步驟 1：Fork 專案](#步驟-1fork-專案)
  - [步驟 2：建立 Supabase 專案](#步驟-2建立-supabase-專案)
  - [步驟 3：環境變數設定](#步驟-3環境變數設定)
  - [步驟 4：初始化資料庫](#步驟-4初始化資料庫)
  - [步驟 5：本機測試](#步驟-5本機測試)
  - [步驟 6：部署到 Vercel](#步驟-6部署到-vercel)
  - [步驟 7：驗證線上環境](#步驟-7驗證線上環境)
  - [步驟 8：設定 GitHub Actions（可選）](#步驟-8設定-github-actions可選)
- [常見問題](#常見問題)
- [疑難排解](#疑難排解)
- [下一步](#下一步)

---

## 概述

本指南將協助您在 **2 小時內**完成 Vsale-lite B2B 訂貨系統的完整部署，從複製專案到線上運行。

**您將完成**：
- ✅ Fork 專案並複製到本機
- ✅ 建立 Supabase 資料庫並執行 Migration
- ✅ 設定環境變數並驗證配置
- ✅ 初始化資料庫並建立管理員帳號
- ✅ 本機測試所有功能
- ✅ 部署到 Vercel 並驗證線上環境

**成功標準**：
- ✅ 可以使用管理員帳號登入後台
- ✅ 可以建立商品與分類
- ✅ 客戶可以註冊並下單
- ✅ 線上環境所有功能正常運作

---

## 前置需求

在開始之前，請確保您已安裝以下工具：

### 必備工具

| 工具 | 版本需求 | 安裝方式 | 驗證指令 |
|------|---------|---------|---------|
| **Node.js** | v22.x LTS | [nodejs.org](https://nodejs.org/) | `node --version` |
| **pnpm** | v9.x+ | `npm install -g pnpm` | `pnpm --version` |
| **Git** | v2.x+ | [git-scm.com](https://git-scm.com/) | `git --version` |
| **Supabase CLI** | latest | `npm install -g supabase` | `supabase --version` |

### 必備帳號

- ✅ **GitHub 帳號** - 用於 Fork 專案與版本控制
- ✅ **Supabase 帳號** - 用於資料庫服務（免費方案即可）
- ✅ **Vercel 帳號** - 用於部署應用（免費方案即可）

### 系統需求

- **作業系統**: Windows 11 / macOS / Linux
- **記憶體**: 至少 4GB RAM
- **磁碟空間**: 至少 500MB 可用空間

---

## 部署流程

### 步驟 1：Fork 專案

**預估時間**: 5 分鐘

#### 1.1 Fork 專案到您的 GitHub 帳號

1. 前往專案儲存庫（替換為實際的專案 URL）
2. 點擊右上角的 **Fork** 按鈕
3. 選擇您的 GitHub 帳號作為目標

#### 1.2 複製專案到本機

```bash
# 複製您 Fork 的儲存庫（替換 YOUR_USERNAME 為您的 GitHub 使用者名稱）
git clone https://github.com/YOUR_USERNAME/vsale.git

# 進入專案目錄
cd vsale

# 安裝依賴
pnpm install
```

#### 1.3 建立功能分支（可選）

```bash
# 建立並切換到新分支
git checkout -b my-deployment
```

**成功標準**：
- ✅ `pnpm install` 成功完成，無錯誤訊息
- ✅ `node_modules` 目錄已建立
- ✅ `git status` 顯示乾淨的工作區

---

### 步驟 2：建立 Supabase 專案

**預估時間**: 10 分鐘

#### 2.1 建立新的 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 點擊 **New project**
3. 填寫專案資訊：
   - **Name**: `vsale-production`（或您偏好的名稱）
   - **Database Password**: 設定強密碼並**妥善保存**
   - **Region**: 選擇 `Singapore (Southeast Asia)` 或最接近您的區域
   - **Pricing Plan**: 選擇 `Free` 或 `Pro`（依需求）
4. 點擊 **Create new project**，等待 2-3 分鐘完成初始化

#### 2.2 取得 API 金鑰

專案建立完成後，前往 **Settings → API**：

1. 複製 **Project URL**（格式：`https://abcdefghijklmnopqrst.supabase.co`）
2. 複製 **anon public** 金鑰
3. 複製 **service_role secret** 金鑰（⚠️ 敏感資訊，切勿公開）

#### 2.3 連結本機專案到 Supabase

```bash
# 登入 Supabase CLI
supabase login

# 連結到您的專案（替換 YOUR_PROJECT_REF 為專案 ID）
supabase link --project-ref YOUR_PROJECT_REF

# 驗證連線
supabase projects list
```

**成功標準**：
- ✅ Supabase 專案狀態顯示為 **Active**
- ✅ 已取得 3 個必要的 API 金鑰
- ✅ `supabase link` 成功連結專案

**⚠️ 重要提醒**：
- 資料庫密碼只會顯示一次，請妥善保存
- `service_role` 金鑰擁有完整資料庫權限，切勿洩露

---

### 步驟 3：環境變數設定

**預估時間**: 10 分鐘

#### 3.1 建立環境變數檔案

```bash
# 複製範本檔案
cp .env.local.example .env.local
```

#### 3.2 填寫必要環境變數

使用任何文字編輯器開啟 `.env.local`，填入步驟 2 取得的資訊：

```bash
# 1. 主要 Supabase 配置（必填）
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 2. 資料庫直連設定（可選，用於備份腳本）
# DB_HOST=db.YOUR_PROJECT_REF.supabase.co
# DB_PASSWORD=your_database_password
# DB_USER=postgres
# DB_PORT=5432

# 3. Google Cloud Storage 備份設定（可選）
# GCS_BUCKET_NAME=your-bucket-name
# GCS_SERVICE_ACCOUNT_KEY=./service-account-key.json

# 4. 站點二配置（可選，用於多站點資料遷移）
# NEXT_PUBLIC_SUPABASE_URL_SITE2=https://YOUR_SITE2_PROJECT_REF.supabase.co
# SUPABASE_SERVICE_ROLE_KEY_SITE2=your_site2_service_role_key_here
# DB_PASSWORD_SITE2=your_site2_database_password
```

**必填變數說明**：

| 變數 | 說明 | 取得方式 |
|------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開金鑰 | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | 服務金鑰 | Settings → API → service_role secret |

詳細環境變數說明請參考：[ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md)

#### 3.3 驗證環境變數

```bash
# 執行環境檢查工具
pnpm check-env
```

**預期輸出**（成功）：
```
✅ 環境變數檢查通過
✅ NEXT_PUBLIC_SUPABASE_URL: https://abcdefghijklmnopqrst.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: 已設定
✅ SUPABASE_SERVICE_ROLE_KEY: 已設定
```

**預期輸出**（失敗）：
```
❌ 環境變數檢查失敗
❌ 缺少必要變數: NEXT_PUBLIC_SUPABASE_URL
⚠️  Supabase URL 格式錯誤（應為 https://*.supabase.co）
```

**成功標準**：
- ✅ `.env.local` 檔案已建立
- ✅ 所有必要變數已填入
- ✅ `pnpm check-env` 顯示 ✅ 通過訊息

---

### 步驟 4：初始化資料庫

**預估時間**: 15 分鐘

#### 4.1 執行資料庫 Migration

```bash
# 推送資料表結構到 Supabase
supabase db push
```

**預期輸出**：
```
Applying migration 20260107100000_core_auth_and_tiers.sql...
Applying migration 20260107110000_product_catalog_system.sql...
...
Finished supabase db push.
```

如果遇到錯誤，請參考 [常見問題](#常見問題) 章節。

#### 4.2 建立管理員帳號

```bash
# 執行資料庫初始化工具
pnpm init-db
```

**互動式提示**：
```
🚀 開始初始化資料庫...

請輸入管理員帳號（username，用於登入後台）: admin
請輸入密碼（最少 8 字元）: ********
請輸入顯示名稱（可選，按 Enter 使用預設「系統管理員」）:

✅ 管理員帳號建立成功！

登入資訊：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
帳號: admin
後台網址: http://localhost:3000/admin/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**⚠️ 重要說明**：
- **管理員使用帳號（username）登入**，例如 `admin`
- **前台客戶使用手機號碼登入**，例如 `0912345678`
- 密碼至少需要 8 個字元
- 建議使用強密碼並妥善保存

#### 4.3 驗證資料庫結構

```bash
# 查看已套用的 Migration
supabase migration list

# 檢查資料表是否建立成功
supabase db diff
```

**成功標準**：
- ✅ `supabase db push` 成功完成，無錯誤
- ✅ 管理員帳號建立成功
- ✅ `supabase migration list` 顯示所有 Migration 已套用
- ✅ `supabase db diff` 顯示無差異或僅有預期的差異

---

### 步驟 5：本機測試

**預估時間**: 20 分鐘

#### 5.1 啟動開發伺服器

```bash
# 啟動 Next.js 開發伺服器
pnpm dev
```

**預期輸出**：
```
  ▲ Next.js 15.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

#### 5.2 測試後台功能

1. **登入後台**
   - 開啟瀏覽器前往：`http://localhost:3000/admin/login`
   - 使用步驟 4.2 建立的管理員帳號登入（例如：`admin`）
   - 成功後會導向後台首頁：`http://localhost:3000/admin/dashboard`

2. **測試管理功能**
   - ✅ 前往「會員等級」頁面，建立一個測試等級（例如：「批發」）
   - ✅ 前往「商品分類」頁面，建立一個測試分類（例如：「電子產品」）
   - ✅ 前往「商品管理」頁面，建立一個測試商品
   - ✅ 設定商品的等級價格

3. **測試 API 端點**
   - 環境變數檢查：`http://localhost:3000/api/env-test`
   - 資料庫連線檢查：`http://localhost:3000/api/check-connection`

#### 5.3 測試前台功能

1. **註冊客戶帳號**
   - 前往：`http://localhost:3000/login`
   - 點擊「快速開戶」
   - 填寫客戶資訊（**手機號碼**作為登入帳號）
   - 選擇會員等級（使用步驟 5.2 建立的等級）

2. **測試購物流程**
   - ✅ 前往商品列表：`http://localhost:3000/store`
   - ✅ 將商品加入購物車
   - ✅ 前往購物車結帳
   - ✅ 建立訂單並確認

3. **驗證價格顯示**
   - ✅ 確認商品顯示該會員等級的對應價格
   - ✅ 如有多個等級，切換帳號驗證不同等級看到不同價格

#### 5.4 執行型別檢查與 Lint

```bash
# TypeScript 型別檢查
pnpm type-check

# ESLint 檢查
pnpm lint

# 建置測試
pnpm build
```

**成功標準**：
- ✅ 開發伺服器成功啟動
- ✅ 管理員可以登入後台並建立資料
- ✅ 客戶可以註冊、登入並下單
- ✅ 所有頁面正常顯示，無主控台錯誤
- ✅ 型別檢查與 Lint 通過
- ✅ 建置成功無錯誤

**⚠️ 提醒**：
- 管理員使用**帳號（username）**登入，例如 `admin`
- 客戶使用**手機號碼**登入，例如 `0912345678`

---

### 步驟 6：部署到 Vercel

**預估時間**: 20 分鐘

#### 6.1 推送程式碼到 GitHub

```bash
# 確認所有變更已儲存
git status

# 如有未追蹤的檔案（除了 .env.local），請加入並提交
git add .
git commit -m "feat: 完成本機部署設定"
git push origin main
```

**⚠️ 重要**：確保 `.env.local` **不會**被 commit（已在 `.gitignore` 中）

#### 6.2 連結 Vercel 專案

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 **Add New... → Project**
3. 選擇您的 GitHub 儲存庫（`vsale`）
4. 點擊 **Import**

#### 6.3 設定 Vercel 環境變數

在 Vercel 專案設定頁面：

1. 前往 **Settings → Environment Variables**
2. 新增以下 3 個必要變數（**Production、Preview、Development** 都要勾選）：

| 變數名稱 | 變數值 | 環境 |
|---------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 您的 Supabase URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 您的 anon 金鑰 | All |
| `SUPABASE_SERVICE_ROLE_KEY` | 您的 service_role 金鑰 | All |

3. 點擊 **Save** 儲存每個變數

#### 6.4 觸發部署

方式一：自動部署（推薦）
```bash
# 推送任何變更到 GitHub 會自動觸發部署
git push origin main
```

方式二：手動部署
1. 在 Vercel Dashboard 找到您的專案
2. 點擊 **Deployments** 頁籤
3. 點擊 **Redeploy** 按鈕

#### 6.5 等待部署完成

- 部署通常需要 2-3 分鐘
- 可在 **Deployments** 頁面查看即時 Log
- 成功後會顯示 **✅ Ready** 與部署 URL

**成功標準**：
- ✅ Vercel 部署狀態顯示 **Ready**
- ✅ 取得線上 URL（例如：`https://vsale.vercel.app`）
- ✅ 環境變數已正確設定（3 個必要變數）

---

### 步驟 7：驗證線上環境

**預估時間**: 15 分鐘

#### 7.1 使用自動化驗證工具

```bash
# 執行部署驗證工具（替換為您的 Vercel URL）
pnpm verify-deploy https://vsale.vercel.app
```

**預期輸出**：
```
🚀 開始驗證部署：https://vsale.vercel.app

測試 1/4: 前台登入頁面 (/login)
✅ 通過 (200 OK, 回應時間: 245ms)

測試 2/4: 後台登入頁面 (/admin/login)
✅ 通過 (200 OK, 回應時間: 198ms)

測試 3/4: 環境變數 API (/api/env-test)
✅ 通過 (200 OK, projectRef: abcdefghijklmnopqrst)

測試 4/4: 資料庫連線 API (/api/check-connection)
✅ 通過 (200 OK, 連線成功)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
測試總結：4/4 通過 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 7.2 手動測試線上功能

1. **測試後台登入**
   - 前往：`https://your-app.vercel.app/admin/login`
   - 使用本機建立的管理員帳號登入
   - 驗證可以存取後台功能

2. **測試前台登入**
   - 前往：`https://your-app.vercel.app/login`
   - 使用本機建立的客戶帳號登入（手機號碼）
   - 驗證可以瀏覽商品與下單

3. **測試 API 端點**
   - 環境變數檢查：`https://your-app.vercel.app/api/env-test`
     - 應顯示 `projectRef`（而非硬編碼檢查）
   - 資料庫連線：`https://your-app.vercel.app/api/check-connection`
     - 應顯示 `success: true`

4. **檢查主控台錯誤**
   - 開啟瀏覽器開發者工具（F12）
   - 切換到 Console 頁籤
   - 確認無紅色錯誤訊息

#### 7.3 驗證檢查清單

- ✅ 部署驗證工具 4/4 測試通過
- ✅ 管理員可以登入後台
- ✅ 客戶可以登入前台
- ✅ 商品列表正常顯示
- ✅ 購物車與訂單功能正常
- ✅ 無主控台錯誤
- ✅ 所有 API 端點回應正常

**成功標準**：
- ✅ 自動化驗證工具顯示 **4/4 通過**
- ✅ 手動測試所有核心功能正常
- ✅ 無錯誤或警告訊息

---

### 步驟 8：設定 GitHub Actions（可選）

**預估時間**: 10 分鐘

此步驟為**可選**，可設定自動化工作流程在每次 push 時執行檢查。

#### 8.1 驗證現有 Workflow

專案已包含 `.github/workflows/ci.yml`，會在每次 push 時自動執行：

- TypeScript 型別檢查（`pnpm type-check`）
- ESLint 程式碼檢查（`pnpm lint`）
- 建置測試（`pnpm build`）

#### 8.2 查看 Actions 執行結果

1. 前往您的 GitHub 儲存庫
2. 點擊 **Actions** 頁籤
3. 查看最新的 Workflow 執行狀態
4. 如有失敗，點擊進入查看詳細 Log

#### 8.3 設定 GitHub Secrets（如需在 CI 中執行測試）

如果您想在 CI 中執行測試（需要存取資料庫），請設定 Secrets：

1. 前往 GitHub 儲存庫 **Settings → Secrets and variables → Actions**
2. 點擊 **New repository secret**
3. 新增以下 Secrets：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

**成功標準**：
- ✅ GitHub Actions Workflow 執行成功
- ✅ 所有檢查（型別、Lint、建置）通過

---

## 常見問題

### Q1: 環境變數遺漏（缺少 SUPABASE_URL 或 ANON_KEY）

**症狀**：
- 執行 `pnpm dev` 時應用啟動失敗
- 主控台顯示 `Error: supabaseUrl is required`
- 頁面顯示 500 錯誤

**原因**：
- `.env.local` 檔案未建立或未填寫必要變數
- 變數名稱拼寫錯誤
- Vercel 環境變數未設定

**解決步驟**：

1. **本機環境**：
   ```bash
   # 確認檔案存在
   ls -la .env.local

   # 執行環境檢查
   pnpm check-env
   ```

   如果缺少變數，請參考 `.env.local.example` 填入正確值。

2. **Vercel 環境**：
   - 前往 Vercel Dashboard → Settings → Environment Variables
   - 確認 3 個必要變數已設定
   - 重新部署專案（Deployments → Redeploy）

3. **檢查變數名稱**：
   - 確保使用正確的前綴：`NEXT_PUBLIC_SUPABASE_URL`（非 `SUPABASE_URL`）
   - 確保沒有多餘的空格或換行

---

### Q2: Migration 失敗（外鍵約束錯誤）

**症狀**：
- 執行 `supabase db push` 時失敗
- 錯誤訊息包含 `foreign key constraint` 或 `violates foreign key`
- Migration 部分套用後中斷

**原因**：
- 資料庫已存在舊資料，與新的外鍵約束衝突
- Migration 順序錯誤
- 已手動修改資料庫結構

**解決步驟**：

1. **檢查 Migration 狀態**：
   ```bash
   supabase migration list
   ```

   查看哪些 Migration 已套用、哪些失敗。

2. **如果是全新專案（無重要資料）**：
   ```bash
   # 重設資料庫（⚠️ 會清空所有資料）
   supabase db reset

   # 重新推送 Migration
   supabase db push
   ```

3. **如果有重要資料**：
   - 先備份資料庫
   - 手動修正衝突的資料
   - 再執行 Migration

4. **檢查 Migration 檔案順序**：
   - 確認 `supabase/migrations/` 中的檔案按時間順序命名
   - 確認檔案內容無語法錯誤

---

### Q3: 連線錯誤（Supabase 專案 ID 不正確）

**症狀**：
- API 端點回應 `500 Internal Server Error`
- 主控台顯示 `fetch failed` 或 `ECONNREFUSED`
- 資料庫操作失敗

**原因**：
- `NEXT_PUBLIC_SUPABASE_URL` 格式錯誤
- 使用錯誤的專案 URL
- Supabase 專案未啟動或已暫停

**解決步驟**：

1. **驗證 URL 格式**：
   ```bash
   pnpm check-env
   ```

   正確格式：`https://abcdefghijklmnopqrst.supabase.co`（20 個字元的專案 ID）

2. **確認專案狀態**：
   - 前往 [Supabase Dashboard](https://supabase.com/dashboard)
   - 確認專案狀態為 **Active**
   - 如顯示 **Paused**，點擊 **Restore** 恢復專案

3. **重新取得 URL**：
   - Settings → API → Project URL
   - 複製完整的 URL（包含 `https://`）
   - 更新 `.env.local` 與 Vercel 環境變數

4. **測試連線**：
   ```bash
   # 測試本機連線
   curl http://localhost:3000/api/check-connection

   # 測試線上連線（替換為您的 URL）
   curl https://your-app.vercel.app/api/check-connection
   ```

---

### Q4: 部署失敗（Vercel 環境變數未設定）

**症狀**：
- Vercel 部署狀態顯示 **Error** 或 **Failed**
- Build Log 顯示 `Missing environment variables`
- 部署成功但應用無法運作

**原因**：
- Vercel 環境變數未設定或設定錯誤
- 環境變數僅設定於 Production，Preview/Development 未設定
- 變數值包含特殊字元未正確轉義

**解決步驟**：

1. **檢查環境變數設定**：
   - 前往 Vercel Dashboard → Settings → Environment Variables
   - 確認 3 個必要變數已設定
   - 確認所有環境（Production、Preview、Development）都已勾選

2. **查看 Build Log**：
   - Deployments → 點擊失敗的部署
   - 展開 **Build Logs**
   - 找到具體的錯誤訊息

3. **修正環境變數後重新部署**：
   - 更新環境變數後，Vercel 不會自動重新部署
   - 前往 Deployments → 點擊 **Redeploy**
   - 或推送新的 commit 觸發部署

4. **常見變數設定錯誤**：
   - ❌ 變數值包含額外的引號：`"https://..."`（錯誤）
   - ✅ 正確格式：`https://...`（不需引號）
   - ❌ 變數值包含換行或空格
   - ✅ 複製時避免多餘的空白字元

---

## 疑難排解

如果您在部署過程中遇到問題：

1. **執行診斷工具**：
   ```bash
   # 環境變數檢查
   pnpm check-env

   # 部署驗證（本機）
   pnpm verify-deploy http://localhost:3000

   # 部署驗證（線上）
   pnpm verify-deploy https://your-app.vercel.app
   ```

2. **檢查 Log**：
   - 本機：查看終端輸出
   - Vercel：Deployments → Build Logs
   - Supabase：Dashboard → Logs

3. **參考文件**：
   - [環境變數檢查清單](./ENV_VARIABLES_CHECKLIST.md)
   - [故障排除指南](./TROUBLESHOOTING.md)
   - [專案憲章](../CLAUDE.md)

4. **重新初始化**（最後手段）：
   ```bash
   # 1. 清除本機資料
   rm -rf node_modules
   rm .env.local

   # 2. 重新安裝
   pnpm install

   # 3. 重新設定環境變數
   cp .env.local.example .env.local
   # 填入實際值

   # 4. 重新推送 Migration
   supabase db push

   # 5. 重新初始化資料庫
   pnpm init-db
   ```

---

## 下一步

恭喜！您已成功完成 Vsale-lite 的部署。🎉

### 建議接下來的行動

1. **熟悉系統功能**
   - 探索後台管理介面
   - 建立完整的商品目錄
   - 設定會員等級與價格

2. **自訂您的應用**
   - 修改品牌顏色與 Logo
   - 調整商品展示方式
   - 設定運費規則與優惠券

3. **監控與維護**
   - 定期檢查 Supabase 資料庫使用量
   - 監控 Vercel 部署狀態
   - 設定自動備份（參考 [Cloud Backup](../specs/015-cloud-backup/quickstart.md)）

4. **學習進階功能**
   - 多站點資料遷移（參考 [SITE2_MIGRATION_GUIDE.md](./SITE2_MIGRATION_GUIDE.md)）
   - 效能優化（參考 [Performance Optimization](../specs/018-performance-optimization/quickstart.md)）
   - 健康檢查系統（`pnpm health-check`）

5. **加入社群**
   - GitHub Issues：回報問題或建議
   - Discussions：與其他開發者交流

---

## 回饋與支援

如果本指南對您有幫助，或您有改進建議：

- 📝 **回饋**：請在 GitHub Issues 分享您的經驗
- 🐛 **回報問題**：發現錯誤請建立 Issue
- 💡 **改進建議**：歡迎提交 Pull Request

**預估完成時間追蹤**：
- 實際完成時間：_________
- 遇到的問題：_________
- 建議改進：_________

---

**最後更新**: 2026-01-23
**版本**: 1.0.0
**作者**: Claude Sonnet 4.5
