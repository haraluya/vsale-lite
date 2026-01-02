# 本地 Supabase 設定完成 ✅

## 🎉 遷移成功

專案已成功從雲端 Supabase 遷移到**本地 Docker Supabase**。

---

## 📋 當前狀態

### ✅ 已完成項目

1. **本地 Supabase 已啟動並運行**
   - API URL: http://127.0.0.1:54321
   - Supabase Studio: http://127.0.0.1:54323
   - Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres

2. **所有 Migrations 已成功執行**
   - ✅ 20260101_initial_schema.sql
   - ✅ 20260102_products_and_categories.sql
   - ✅ 20260103_series_and_tier_prices.sql

3. **基礎測試資料已建立**
   - ✅ 3 個分類（飲料、零食、日用品）
   - ✅ 3 個會員等級（批發、零售、經銷商）
   - ✅ 3 個系列（美粒果系列、茶飲系列、洋芋片系列）

4. **環境變數已更新**
   - ✅ `.env.local` 使用本地 Supabase 設定
   - ✅ 保留雲端設定（註解狀態，部署時啟用）

5. **開發伺服器運行中**
   - ✅ Next.js: http://localhost:3000
   - ✅ 已載入本地環境變數

---

## 🚀 接下來的步驟

### 1. 建立測試帳號（必須）

使用後台快速開戶功能：

1. 開啟後台: http://localhost:3000/admin/login
2. 使用管理員帳號登入（需先建立）
3. 進入「客戶管理」→「新增客戶」
4. 建立測試帳號：
   - 批發客戶: 手機 `0912345678`，等級「批發」
   - 零售客戶: 手機 `0987654321`，等級「零售」

### 2. 測試後台功能

- **系列管理** (`/admin/series`) - 建立與管理商品系列
- **商品管理** (`/admin/products`) - 建立商品（編號自動產生）
- **價格管理** (`/admin/pricing`) - 設定各等級價格

### 3. 測試前台功能

1. 登入前台: http://localhost:3000/login
2. 使用測試帳號登入
3. 瀏覽系列與商品
4. 驗證不同等級看到不同價格

---

## 🔧 常用指令

### 本地開發

```bash
# 啟動本地 Supabase（開機後或首次使用）
supabase start

# 重置資料庫並執行所有 Migrations + Seed
supabase db reset

# 停止本地 Supabase
supabase stop

# 查看服務狀態
supabase status

# 啟動 Next.js 開發伺服器
pnpm dev
```

### 查看資料庫

```bash
# 開啟 Supabase Studio（瀏覽器）
http://127.0.0.1:54323

# 使用 psql 連接
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
# 密碼: postgres
```

### 新增測試資料

在 Supabase Studio SQL Editor 執行：
```
http://127.0.0.1:54323 → SQL Editor → New Query
```

複製並執行: `specs/003-series-and-pricing/seed-test-data.sql`

---

## 📝 重要提醒

### 開發流程

1. **每次重啟電腦後**
   ```bash
   supabase start    # 啟動本地 Supabase
   pnpm dev          # 啟動 Next.js
   ```

2. **修改 Migration 後**
   ```bash
   supabase db reset  # 重置並重新執行所有 Migrations
   ```

3. **切換分支後**
   ```bash
   supabase db reset  # 確保 Migrations 同步
   ```

### 部署到生產環境

當功能完成，準備部署時：

1. **更新環境變數** (`.env.local`)
   - 註解掉本地設定
   - 取消註解雲端設定

2. **推送 Migrations 到雲端**
   ```bash
   supabase link --project-ref qwovavytryvgchcowjof
   supabase db push
   ```

3. **驗證雲端資料庫**
   - 開啟 https://app.supabase.com
   - 確認 Migrations 成功執行

4. **部署應用程式**
   ```bash
   pnpm build
   firebase deploy
   ```

---

## 🎯 測試檢查清單

開始測試前，確認以下項目：

- [ ] 本地 Supabase 正在運行 (`supabase status`)
- [ ] Next.js 開發伺服器運行在 3000 端口
- [ ] 可以訪問 Supabase Studio (http://127.0.0.1:54323)
- [ ] 分類、等級、系列資料已存在（檢查 Studio）
- [ ] 測試帳號已建立（批發、零售）

完成後，參考測試指南：
- `specs/003-series-and-pricing/README_TESTING.md`
- `specs/003-series-and-pricing/TEST_CHECKLIST.md`

---

## 🆘 故障排除

### 問題: "Connection refused" 錯誤

**解決**:
```bash
supabase stop
supabase start
```

### 問題: Migration 執行失敗

**解決**:
```bash
supabase db reset --debug
```

### 問題: 資料表不存在

**原因**: Migration 未執行完成

**解決**:
```bash
supabase db reset
```

### 問題: 環境變數未載入

**解決**:
1. 確認 `.env.local` 使用本地設定
2. 重啟 Next.js: `Ctrl+C` 然後 `pnpm dev`

---

**本地開發環境設定完成！開始開發與測試吧！** 🎉

詳細文件請參考: `CLAUDE.md` → Supabase CLI 管理章節
