# 故障排除指南

**用途**: 協助開發者快速診斷與解決常見問題
**最後更新**: 2026-01-23

---

## 目錄

- [概述](#概述)
- [診斷工具](#診斷工具)
- [常見問題](#常見問題)
  - [問題 1：環境變數遺漏](#問題-1環境變數遺漏)
  - [問題 2：Migration 失敗](#問題-2migration-失敗)
  - [問題 3：連線錯誤](#問題-3連線錯誤)
  - [問題 4：部署失敗](#問題-4部署失敗)
  - [問題 5：備份 Cron Job 失敗](#問題-5備份-cron-job-失敗)
- [進階疑難排解](#進階疑難排解)
- [取得協助](#取得協助)

---

## 概述

本指南涵蓋 Vsale-lite 開發與部署過程中最常見的問題。每個問題都包含：

- **症狀**：如何識別問題
- **原因**：問題的根本原因
- **解決步驟**：具體的修復方法

**診斷流程建議**：
1. 閱讀完整的錯誤訊息（不要僅看前幾行）
2. 使用自動化診斷工具（`pnpm check-env`、`pnpm verify-deploy`）
3. 檢查 Log（本機終端、Vercel Build Logs、Supabase Logs）
4. 參考本指南的對應問題章節
5. 如無法解決，請收集錯誤訊息並尋求協助

---

## 診斷工具

在開始疑難排解前，請先使用以下自動化工具：

### 環境變數檢查

```bash
# 檢查本機環境變數是否正確設定
pnpm check-env
```

**輸出範例**（成功）：
```
✅ 環境變數檢查通過
✅ NEXT_PUBLIC_SUPABASE_URL: https://abcdefghijklmnopqrst.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: 已設定
✅ SUPABASE_SERVICE_ROLE_KEY: 已設定
```

**輸出範例**（失敗）：
```
❌ 環境變數檢查失敗
❌ 缺少必要變數: NEXT_PUBLIC_SUPABASE_URL
⚠️  Supabase URL 格式錯誤
```

---

### 部署驗證

```bash
# 驗證本機環境
pnpm verify-deploy http://localhost:3000

# 驗證線上環境
pnpm verify-deploy https://your-app.vercel.app
```

**輸出範例**（成功）：
```
🚀 開始驗證部署：http://localhost:3000

測試 1/4: 前台登入頁面 (/login)
✅ 通過 (200 OK)

測試 2/4: 後台登入頁面 (/admin/login)
✅ 通過 (200 OK)

測試 3/4: 環境變數 API (/api/env-test)
✅ 通過 (200 OK)

測試 4/4: 資料庫連線 API (/api/check-connection)
✅ 通過 (200 OK)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
測試總結：4/4 通過 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 型別與程式碼檢查

```bash
# TypeScript 型別檢查
pnpm type-check

# ESLint 檢查
pnpm lint

# 建置測試
pnpm build
```

---

## 常見問題

### 問題 1：環境變數遺漏

#### 症狀

**本機開發**：
- 執行 `pnpm dev` 時應用無法啟動
- 主控台顯示錯誤：`Error: supabaseUrl is required`
- 頁面顯示 500 Internal Server Error
- 瀏覽器主控台錯誤：`Failed to initialize Supabase client`

**Vercel 部署**：
- 部署成功但應用無法運作
- 訪問任何頁面都顯示 500 錯誤
- Function Logs 顯示 `Missing environment variables`

#### 原因

**常見原因**：
1. `.env.local` 檔案未建立或未填寫必要變數
2. 環境變數名稱拼寫錯誤
   - 錯誤：`SUPABASE_URL`（缺少前綴）
   - 正確：`NEXT_PUBLIC_SUPABASE_URL`
3. Vercel 環境變數未設定或僅設定於單一環境（Production）
4. 變數值包含多餘的空格、換行或引號

#### 解決步驟

**步驟 1：本機環境**

```bash
# 檢查檔案是否存在
ls -la .env.local

# 如果不存在，複製範本
cp .env.local.example .env.local
```

**步驟 2：驗證變數設定**

```bash
# 執行環境檢查工具
pnpm check-env
```

如果顯示錯誤，請編輯 `.env.local` 並填入正確值：

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**取得環境變數**：
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. Settings → API
4. 複製 Project URL、anon public、service_role secret

**步驟 3：Vercel 環境**

1. 前往 Vercel Dashboard → Settings → Environment Variables
2. 確認 3 個必要變數已設定
3. 確認**所有環境**（Production、Preview、Development）都已勾選
4. 點擊 Save 儲存變數

**步驟 4：重新部署**

```bash
# 本機：重新啟動開發伺服器
# Ctrl+C 停止，然後重新執行
pnpm dev

# Vercel：觸發重新部署
# 前往 Vercel Dashboard → Deployments → Redeploy
```

**步驟 5：驗證修復**

```bash
# 本機測試
pnpm verify-deploy http://localhost:3000

# 線上測試
pnpm verify-deploy https://your-app.vercel.app
```

#### 檢查清單

- [ ] `.env.local` 檔案已建立
- [ ] 變數名稱拼寫正確（包含 `NEXT_PUBLIC_` 前綴）
- [ ] 變數值無多餘空格或換行
- [ ] Vercel 環境變數已設定於所有環境
- [ ] 已重新部署（Vercel）或重新啟動開發伺服器（本機）
- [ ] `pnpm check-env` 顯示成功
- [ ] `pnpm verify-deploy` 顯示 4/4 通過

#### 相關文件

- [環境變數檢查清單](./ENV_VARIABLES_CHECKLIST.md)
- [新用戶部署指南 - 步驟 3](./NEW_DEPLOYMENT_GUIDE.md#步驟-3環境變數設定)

---

### 問題 2：Migration 失敗

#### 症狀

**執行 `supabase db push` 時**：
- 錯誤訊息包含 `foreign key constraint` 或 `violates foreign key`
- 錯誤訊息包含 `syntax error` 或 `relation does not exist`
- Migration 部分套用後中斷
- 某些資料表建立成功，某些失敗

**執行 `pnpm db:migrate` 時**：
- 指令失敗並顯示 SQL 錯誤
- Supabase 儀表板顯示 Migration 狀態為 Failed

#### 原因

**常見原因**：

1. **外鍵約束錯誤**：
   - 資料庫已存在舊資料，與新的外鍵約束衝突
   - 例如：categories 表已有 ID=1 的記錄，但 products 表引用不存在的 category_id=999

2. **Migration 順序錯誤**：
   - 嘗試建立依賴尚未建立的資料表的外鍵
   - 例如：先建立 products（依賴 categories），後建立 categories

3. **語法錯誤**：
   - SQL 語法錯誤（拼寫錯誤、缺少分號）
   - PostgreSQL 版本不相容的語法

4. **重複執行問題**：
   - Migration 檔案沒有冪等性（缺少 `IF NOT EXISTS`）
   - 重複執行導致 `already exists` 錯誤

#### 解決步驟

**步驟 1：檢查 Migration 狀態**

```bash
# 查看已套用的 Migration
supabase migration list
```

**輸出範例**：
```
Local          Remote         Status
20260107100000 20260107100000 Applied
20260107110000 20260107110000 Applied
20260107120000 -              Pending
20260107130000 -              Pending
```

**步驟 2：檢視錯誤訊息**

仔細閱讀完整的錯誤訊息，找出：
- 錯誤發生在哪個 Migration 檔案
- 錯誤發生在哪一行
- 具體的錯誤原因（外鍵約束、語法錯誤等）

**範例錯誤訊息**：
```
Error: relation "products" does not exist
  at supabase/migrations/20260107120000_orders.sql:15
```

解讀：第 20260107120000_orders.sql Migration 的第 15 行嘗試引用 `products` 資料表，但該表尚未建立。

**步驟 3：修正 Migration 檔案**

根據錯誤類型修正：

**外鍵約束錯誤**：
```sql
-- 修正前（會失敗）
ALTER TABLE products ADD CONSTRAINT fk_category
FOREIGN KEY (category_id) REFERENCES categories(id);

-- 修正後（先清理衝突資料）
DELETE FROM products WHERE category_id NOT IN (SELECT id FROM categories);

ALTER TABLE products ADD CONSTRAINT fk_category
FOREIGN KEY (category_id) REFERENCES categories(id);
```

**語法錯誤**：
```sql
-- 修正前（語法錯誤）
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
    -- 缺少逗號
    price DECIMAL(10, 2)
);

-- 修正後
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10, 2)
);
```

**缺少冪等性**：
```sql
-- 修正前（重複執行會失敗）
CREATE TABLE products (...);

-- 修正後（支援重複執行）
CREATE TABLE IF NOT EXISTS products (...);
```

**步驟 4：重新執行 Migration**

**選項 A：重設資料庫（⚠️ 僅適用於開發環境，會清空所有資料）**

```bash
# 重設資料庫到初始狀態
supabase db reset

# 重新推送 Migration
supabase db push
```

**選項 B：修正後繼續（適用於有重要資料的環境）**

```bash
# 修正 Migration 檔案後
supabase db push
```

**步驟 5：驗證資料庫結構**

```bash
# 查看資料庫差異
supabase db diff

# 應該顯示無差異或僅有預期的差異
```

**步驟 6：測試應用**

```bash
# 啟動開發伺服器
pnpm dev

# 測試功能是否正常
```

#### 預防措施

1. **Migration 檔案設計原則**：
   - 優先使用 `CREATE TABLE IF NOT EXISTS`
   - 使用 `ALTER TABLE ... IF NOT EXISTS` 新增欄位
   - 外鍵約束使用 `ON DELETE RESTRICT` 或 `ON DELETE CASCADE`

2. **測試流程**：
   ```bash
   # 在測試分支測試 Migration
   git checkout -b test-migration
   supabase db reset
   supabase db push
   # 測試所有功能
   git checkout main
   ```

3. **備份先行**：
   - 在生產環境執行 Migration 前，先備份資料庫
   - 使用 Supabase Dashboard → Database → Backups

#### 檢查清單

- [ ] 已查看完整的錯誤訊息
- [ ] 已檢查 Migration 順序是否正確
- [ ] Migration 檔案語法無錯誤
- [ ] Migration 支援重複執行（冪等性）
- [ ] 已備份資料庫（生產環境）
- [ ] `supabase migration list` 顯示所有 Migration 已套用
- [ ] `supabase db diff` 顯示無差異
- [ ] 應用功能測試通過

#### 相關文件

- [安全 Migration 指南](./SAFE_MIGRATION_GUIDE.md)
- [Migration 模組化架構](../supabase/migrations/README.md)

---

### 問題 3：連線錯誤

#### 症狀

**本機開發**：
- API 端點回應 `500 Internal Server Error`
- 主控台顯示 `fetch failed` 或 `ECONNREFUSED`
- 瀏覽器主控台錯誤：`Failed to fetch` 或 `Network request failed`
- 資料庫操作失敗，顯示 `Connection timeout`

**Vercel 部署**：
- 所有頁面顯示 500 錯誤
- Function Logs 顯示 `Unable to connect to Supabase`
- API 端點無回應

#### 原因

**常見原因**：

1. **URL 格式錯誤**：
   - 缺少 `https://` 前綴
   - 使用錯誤的 URL（如舊專案或測試環境的 URL）
   - URL 包含多餘的空格或換行

2. **專案未啟動或已暫停**：
   - Supabase 免費方案專案在閒置 1 週後會自動暫停
   - 專案正在初始化（剛建立的專案需要 2-3 分鐘）

3. **網路問題**：
   - 防火牆封鎖 Supabase URL
   - 網路不穩定或斷線
   - DNS 解析失敗

4. **金鑰錯誤**：
   - 使用錯誤的 `anon` 或 `service_role` 金鑰
   - 金鑰已過期或被重設

#### 解決步驟

**步驟 1：驗證 URL 格式**

```bash
# 執行環境檢查
pnpm check-env
```

**正確格式**：
```
https://abcdefghijklmnopqrst.supabase.co
```

**常見錯誤**：
```
❌ abcdefghijklmnopqrst.supabase.co        # 缺少 https://
❌ https://abcdefghijklmnopqrst.supabase.co/  # 多餘的尾部斜線
❌ https://qwovavytryvgchcowjof.supabase.co   # 使用其他專案的 URL
```

**步驟 2：確認專案狀態**

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 查看專案狀態：

   - ✅ **Active** - 專案正常運行
   - ⏸️ **Paused** - 專案已暫停，點擊 **Restore** 恢復
   - 🔄 **Initializing** - 專案正在初始化，等待 2-3 分鐘

**步驟 3：測試連線**

```bash
# 測試本機 API 端點
curl http://localhost:3000/api/check-connection

# 測試線上 API 端點
curl https://your-app.vercel.app/api/check-connection
```

**成功回應**：
```json
{
  "success": true,
  "message": "Database connection successful"
}
```

**失敗回應**：
```json
{
  "success": false,
  "error": "Unable to connect to database"
}
```

**步驟 4：重新取得 API 金鑰**

如果 URL 正確但仍無法連線，可能是金鑰錯誤：

1. 前往 Supabase Dashboard → Settings → API
2. 重新複製以下金鑰：
   - **Project URL**
   - **anon public**
   - **service_role secret**（點擊 Reveal 才能看到完整金鑰）
3. 更新 `.env.local` 或 Vercel 環境變數
4. 重新啟動開發伺服器或重新部署

**步驟 5：檢查網路與 DNS**

```bash
# 測試 DNS 解析
nslookup abcdefghijklmnopqrst.supabase.co

# 測試網路連線
ping abcdefghijklmnopqrst.supabase.co

# 測試 HTTPS 連線
curl -I https://abcdefghijklmnopqrst.supabase.co
```

如果 DNS 或網路連線失敗，請檢查：
- 網路連線是否正常
- 防火牆是否封鎖 Supabase URL
- VPN 或代理伺服器設定

**步驟 6：驗證修復**

```bash
# 執行部署驗證
pnpm verify-deploy http://localhost:3000

# 應該顯示 4/4 通過
```

#### 檢查清單

- [ ] Supabase URL 格式正確（https:// 開頭，.supabase.co 結尾）
- [ ] Supabase 專案狀態為 Active
- [ ] `anon` 和 `service_role` 金鑰正確
- [ ] 網路連線正常
- [ ] DNS 解析成功
- [ ] `curl` 測試 API 端點成功
- [ ] `pnpm verify-deploy` 顯示 4/4 通過

#### 相關文件

- [環境變數檢查清單](./ENV_VARIABLES_CHECKLIST.md)
- [新用戶部署指南 - 步驟 2](./NEW_DEPLOYMENT_GUIDE.md#步驟-2建立-supabase-專案)

---

### 問題 4：部署失敗

#### 症狀

**Vercel 部署**：
- 部署狀態顯示 **Error** 或 **Failed**
- Build Logs 顯示錯誤訊息
- 部署成功但應用無法運作（白畫面或 500 錯誤）

**常見錯誤訊息**：
```
Error: Missing environment variables: NEXT_PUBLIC_SUPABASE_URL
Build failed with exit code 1
Type error: Cannot find module 'xxx'
```

#### 原因

**常見原因**：

1. **環境變數未設定**：
   - Vercel 環境變數未設定
   - 環境變數僅設定於 Production，Preview/Development 未設定
   - 變數值包含特殊字元未正確轉義

2. **建置錯誤**：
   - TypeScript 型別錯誤
   - ESLint 檢查失敗
   - 相依套件版本衝突

3. **Node.js 版本不相容**：
   - Vercel 使用舊版 Node.js（如 18.x）
   - 專案需要 Node.js 22.x

4. **Build Command 錯誤**：
   - Build Command 設定錯誤（如使用 `npm` 而非 `pnpm`）
   - Output Directory 設定錯誤

#### 解決步驟

**步驟 1：查看 Build Logs**

1. 前往 Vercel Dashboard → Deployments
2. 點擊失敗的部署
3. 展開 **Build Logs**
4. 找到第一個錯誤訊息（通常在最後幾行）

**範例錯誤訊息與解決方法**：

**錯誤 1：環境變數遺漏**
```
Error: Missing environment variables: NEXT_PUBLIC_SUPABASE_URL
```

**解決**：
- 前往 Settings → Environment Variables
- 新增 3 個必要變數（Production、Preview、Development 都勾選）
- 重新部署

**錯誤 2：型別錯誤**
```
Type error: Property 'xxx' does not exist on type 'yyy'
```

**解決**：
```bash
# 本機修正型別錯誤
pnpm type-check

# 修正後 commit 並推送
git add .
git commit -m "fix: 修正型別錯誤"
git push
```

**錯誤 3：ESLint 錯誤**
```
Error: ESLint: 'xxx' is not defined (no-undef)
```

**解決**：
```bash
# 本機修正 Lint 錯誤
pnpm lint --fix

# 手動修正無法自動修正的錯誤
# 修正後 commit 並推送
```

**步驟 2：驗證專案設定**

前往 Vercel Dashboard → Settings → General，確認：

| 設定項目 | 正確值 |
|---------|--------|
| **Framework Preset** | Next.js |
| **Build Command** | `pnpm build` |
| **Output Directory** | `.next` |
| **Install Command** | `pnpm install` |
| **Node.js Version** | `22.x` |

**步驟 3：本機測試建置**

```bash
# 執行完整建置流程
pnpm type-check
pnpm lint
pnpm build

# 如果建置失敗，修正錯誤
# 如果建置成功，測試啟動
pnpm start
```

**步驟 4：檢查環境變數**

```bash
# 確認 Vercel 環境變數已設定
# Settings → Environment Variables

# 必要變數清單
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# 確認所有環境都已勾選
✅ Production
✅ Preview
✅ Development
```

**步驟 5：重新部署**

修正後重新部署：

**方式 1：自動部署**
```bash
git add .
git commit -m "fix: 修正部署錯誤"
git push origin main
```

**方式 2：手動部署**
- 前往 Vercel Dashboard → Deployments
- 點擊 **Redeploy**

**步驟 6：驗證部署**

```bash
# 等待部署完成（2-3 分鐘）
# 取得部署 URL 後執行驗證
pnpm verify-deploy https://your-app.vercel.app

# 應該顯示 4/4 通過
```

#### 特殊案例處理

**案例 1：部署成功但應用無法運作**

**症狀**：
- Vercel 顯示 ✅ Ready
- 訪問 URL 顯示白畫面或 500 錯誤

**解決**：
1. 檢查 Function Logs（Deployments → Function）
2. 確認環境變數已設定且正確
3. 測試 API 端點：`https://your-app.vercel.app/api/check-connection`

**案例 2：Preview 部署失敗但 Production 正常**

**症狀**：
- Production 部署成功
- Pull Request 的 Preview 部署失敗

**解決**：
- 確認環境變數在 **Preview** 環境也已設定
- Settings → Environment Variables → 勾選 Preview

**案例 3：Build Command 執行過慢或超時**

**症狀**：
- 建置時間 > 10 分鐘
- Build Logs 顯示 `Command timed out`

**解決**：
```bash
# 清理 node_modules 並重新安裝
rm -rf node_modules
pnpm install

# 檢查是否有不必要的大型套件
pnpm list --depth=0
```

#### 檢查清單

- [ ] Build Logs 已檢視，錯誤訊息已理解
- [ ] Vercel 專案設定正確（Framework, Build Command, Node.js Version）
- [ ] 環境變數已設定於所有環境（Production、Preview、Development）
- [ ] 本機 `pnpm build` 成功
- [ ] 本機 `pnpm type-check` 無錯誤
- [ ] 本機 `pnpm lint` 無錯誤
- [ ] 已重新部署
- [ ] `pnpm verify-deploy` 顯示 4/4 通過

#### 相關文件

- [新用戶部署指南 - 步驟 6](./NEW_DEPLOYMENT_GUIDE.md#步驟-6部署到-vercel)
- [環境變數檢查清單](./ENV_VARIABLES_CHECKLIST.md)

---

### 問題 5：備份 Cron Job 失敗

#### 症狀

**後台系統設定頁面**：
- 點擊「立即備份」按鈕後顯示錯誤
- 備份狀態顯示「失敗」
- 備份檔案大小顯示 0 KB

**Vercel Cron Logs**：
- Cron Job 執行失敗
- Logs 顯示 `GCS upload failed` 或 `Authentication error`

**常見錯誤訊息**：
```
Error: Unable to authenticate with Google Cloud Storage
Error: Bucket does not exist or access denied
Error: Service account key file not found
```

#### 原因

**常見原因**：

1. **GCS 憑證問題**：
   - `GCS_SERVICE_ACCOUNT_KEY` 未設定或格式錯誤
   - Service Account 金鑰過期或被撤銷
   - 金鑰 JSON 格式錯誤（缺少引號、逗號）

2. **權限問題**：
   - Service Account 沒有 Storage Object Admin 權限
   - Bucket 不存在或名稱錯誤
   - Bucket 權限設定錯誤

3. **環境變數問題**：
   - `GCS_BUCKET_NAME` 未設定或名稱錯誤
   - `GCS_PROJECT_ID` 與實際專案 ID 不符
   - 環境變數僅設定於 Production，Cron 在 Development 執行

4. **網路問題**：
   - Vercel 無法連線到 Google Cloud Storage
   - 防火牆封鎖 GCS API

#### 解決步驟

**步驟 1：檢查 GCS 環境變數**

前往 Vercel Dashboard → Settings → Environment Variables，確認以下變數已設定：

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `GCS_BUCKET_NAME` | GCS 儲存桶名稱 | `vsale-backups` |
| `GCS_SERVICE_ACCOUNT_KEY` | Service Account JSON 金鑰 | `{"type": "service_account", ...}` |

**步驟 2：驗證 Service Account 金鑰格式**

Service Account 金鑰必須是完整的 JSON 格式：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account-name@your-project-id.iam.gserviceaccount.com",
  "client_id": "xxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "xxx"
}
```

**常見錯誤**：
- ❌ 缺少外層的 `{}`
- ❌ `private_key` 中的 `\n` 被移除
- ❌ 包含多餘的空格或換行

**步驟 3：檢查 GCS Bucket 權限**

1. 前往 [Google Cloud Storage](https://console.cloud.google.com/storage)
2. 找到您的儲存桶（例如：`vsale-backups`）
3. 點擊儲存桶 → **Permissions**
4. 確認 Service Account 已被授予以下權限：
   - **Storage Object Admin**（推薦）
   - 或至少：**Storage Object Creator** + **Storage Object Viewer**

**新增權限**：
1. 點擊 **Grant Access**
2. New principals: 填入 Service Account Email（例如：`backup@your-project.iam.gserviceaccount.com`）
3. Role: 選擇 **Storage Object Admin**
4. 點擊 **Save**

**步驟 4：測試備份功能**

**本機測試**（需要設定本機環境變數）：

```bash
# 編輯 .env.local
# 新增 GCS 環境變數
GCS_BUCKET_NAME=vsale-backups
GCS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# 啟動開發伺服器
pnpm dev

# 前往後台系統設定頁面
# http://localhost:3000/admin/settings

# 點擊「立即備份」按鈕
```

**線上測試**：

```bash
# 觸發 Cron Job 手動執行（需要 Vercel CLI）
vercel cron invoke backup

# 或前往後台系統設定頁面點擊「立即備份」
```

**步驟 5：查看 Log**

**Vercel Function Logs**：
1. Vercel Dashboard → Deployments → 最新部署
2. 點擊 **Functions** 頁籤
3. 找到 `/api/cron/backup` 的執行記錄
4. 查看詳細錯誤訊息

**Google Cloud Logs**：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/logs)
2. 篩選 `resource.type="gcs_bucket"`
3. 查看 Storage API 存取記錄

**步驟 6：驗證備份檔案**

如果備份成功，應該可以在 GCS Bucket 中看到備份檔案：

1. 前往 Google Cloud Storage → 選擇 Bucket
2. 查看 `backups/` 資料夾
3. 確認備份檔案存在：
   - 檔案名稱格式：`backup-YYYYMMDD-HHMMSS.sql.gz`
   - 檔案大小：> 0 KB（通常 10-50 KB）

#### 預防措施

1. **定期檢查 Service Account 權限**：
   - 每月檢查一次 Service Account 是否仍有權限
   - 檢查金鑰是否過期

2. **設定 Vercel Cron Job 通知**：
   - 前往 Vercel Dashboard → Settings → Notifications
   - 啟用「Cron Job Failed」通知

3. **監控備份檔案**：
   - 定期檢查 GCS Bucket 中的備份檔案
   - 確認自動備份（每日凌晨 2:00）正常執行

4. **備份 Service Account 金鑰**：
   - 將 Service Account JSON 金鑰安全儲存
   - 如果金鑰遺失，需要重新建立並更新 Vercel 環境變數

#### 檢查清單

- [ ] `GCS_BUCKET_NAME` 已設定且正確
- [ ] `GCS_SERVICE_ACCOUNT_KEY` 已設定且格式正確（完整 JSON）
- [ ] GCS Bucket 已建立且名稱正確
- [ ] Service Account 已被授予 Storage Object Admin 權限
- [ ] 環境變數已設定於所有環境（Production、Preview、Development）
- [ ] 本機測試備份成功
- [ ] 線上測試備份成功
- [ ] GCS Bucket 中可以看到備份檔案
- [ ] 備份檔案大小 > 0 KB

#### 相關文件

- [Cloud Backup 設定指南](../specs/015-cloud-backup/quickstart.md)
- [環境變數檢查清單](./ENV_VARIABLES_CHECKLIST.md)

---

## 進階疑難排解

### 完整診斷流程

如果上述常見問題都無法解決您的問題，請依照以下完整診斷流程：

#### 1. 收集錯誤資訊

```bash
# 本機環境
pnpm check-env > env-check.log
pnpm type-check > type-check.log 2>&1
pnpm lint > lint.log 2>&1
pnpm build > build.log 2>&1

# 執行驗證
pnpm verify-deploy http://localhost:3000 > verify.log
```

#### 2. 檢查系統環境

```bash
# Node.js 版本
node --version

# pnpm 版本
pnpm --version

# Git 版本
git --version

# 作業系統
uname -a  # Linux/macOS
ver       # Windows
```

#### 3. 清理與重建

```bash
# 清理快取
rm -rf node_modules
rm -rf .next
rm pnpm-lock.yaml

# 重新安裝
pnpm install

# 重新建置
pnpm build
```

#### 4. 檢查 Git 狀態

```bash
# 確認當前分支
git branch --show-current

# 檢查是否有未提交的變更
git status

# 查看最近的 commit
git log --oneline -5
```

---

### 重新初始化專案

如果所有方法都無法解決問題，可以嘗試重新初始化：

```bash
# ⚠️  警告：此操作會清除本機資料，請先備份重要檔案

# 1. 備份重要檔案
cp .env.local .env.local.backup

# 2. 清理專案
rm -rf node_modules
rm -rf .next
rm -rf .vercel
rm pnpm-lock.yaml

# 3. 重新複製專案（可選）
cd ..
rm -rf vsale
git clone https://github.com/YOUR_USERNAME/vsale.git
cd vsale

# 4. 重新設定環境變數
cp .env.local.backup .env.local
# 或
cp .env.local.example .env.local
# 然後填入實際值

# 5. 重新安裝與建置
pnpm install
pnpm type-check
pnpm lint
pnpm build

# 6. 驗證
pnpm dev
```

---

## 取得協助

如果本指南無法解決您的問題，請透過以下方式尋求協助：

### 1. 檢查現有 Issues

前往 GitHub Issues 搜尋類似問題：
- 搜尋關鍵字：錯誤訊息的主要部分
- 篩選標籤：`bug`、`deployment`、`migration`

### 2. 建立新 Issue

如果沒有找到相關問題，請建立新 Issue：

**Issue 範本**：

```markdown
## 問題描述

簡短描述遇到的問題（1-2 句話）。

## 環境資訊

- **作業系統**: Windows 11 / macOS 14 / Ubuntu 22.04
- **Node.js 版本**: `node --version` 的輸出
- **pnpm 版本**: `pnpm --version` 的輸出
- **部署環境**: 本機 / Vercel
- **專案分支**: master / 其他

## 重現步驟

1. 執行 `pnpm install`
2. 執行 `pnpm dev`
3. 訪問 http://localhost:3000
4. 觀察到錯誤：...

## 預期行為

描述您預期應該發生的行為。

## 實際行為

描述實際發生的行為，包括完整的錯誤訊息。

## 錯誤訊息

```bash
# 貼上完整的錯誤訊息（包含 Stack Trace）
```

## 已嘗試的解決方法

- [x] 已執行 `pnpm check-env`
- [x] 已檢查環境變數設定
- [ ] 已執行 `pnpm type-check`
- [ ] 其他...

## 其他資訊

任何其他相關資訊（截圖、Log 檔案等）。
```

### 3. 聯絡維護者

如果問題緊急，可以：
- GitHub Discussions：提問與討論
- Email：（如有提供）

---

## 相關文件

- [新用戶部署指南](./NEW_DEPLOYMENT_GUIDE.md) - 完整部署流程
- [環境變數檢查清單](./ENV_VARIABLES_CHECKLIST.md) - 環境變數設定說明
- [安全 Migration 指南](./SAFE_MIGRATION_GUIDE.md) - 資料庫 Migration 最佳實踐
- [專案憲章](../CLAUDE.md) - 專案核心原則與規範

---

**最後更新**: 2026-01-23
**版本**: 1.0.0
**作者**: Claude Sonnet 4.5
