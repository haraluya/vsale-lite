# Supabase 雲端設定指南

**最後更新**: 2026-01-09
**狀態**: ✅ 已完成

---

## 當前設定狀態

### 雲端 Supabase（生產環境）- 當前使用 ✅

- **專案名稱**: vasle-lite
- **專案 ID**: qwovavytryvgchcowjof
- **組織 ID**: mnxmdtstgtxfnowmxjxi
- **區域**: South Asia (Mumbai)
- **URL**: https://qwovavytryvgchcowjof.supabase.co
- **建立時間**: 2026-01-01 15:32:54 UTC

### 本地 Supabase（Docker）- 測試用

- **用途**: 離線開發、測試 Migration、實驗性功能
- **URL**: http://127.0.0.1:54321
- **啟動指令**: `supabase start`
- **停止指令**: `supabase stop`

---

## 環境變數設定

### 當前使用（雲端生產環境）

在 `.env.local` 中設定：

```bash
# 雲端 Supabase（當前使用）
NEXT_PUBLIC_SUPABASE_URL=https://qwovavytryvgchcowjof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyODE1NzQsImV4cCI6MjA4Mjg1NzU3NH0.YEwJNjDv5HJgj-GMN_IdisI6dU13aHA6ruaZCXUpZLA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI4MTU3NCwiZXhwIjoyMDgyODU3NTc0fQ.zcyKpbeqPJ-RxM4mkkU5zPdzv0YrD0s0iOOcXqGIEdA
```

### 切換回本地開發

如需切換回本地 Docker Supabase：

1. 在 `.env.local` 中註解掉雲端設定
2. 取消註解本地設定：

```bash
# 本地 Supabase（Docker）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

3. 啟動本地 Supabase: `supabase start`
4. 重啟開發伺服器: `pnpm dev`

---

## Migration 管理

### 當前狀態

雲端資料庫已套用所有 Migrations（8 個模組化檔案）：

| 模組 | 檔案名稱 | 狀態 |
|------|---------|------|
| M1 | `20260107100000_core_auth_and_tiers.sql` | ✅ |
| M2 | `20260107110000_product_catalog_system.sql` | ✅ |
| M3 | `20260107120000_orders_and_workflow.sql` | ✅ |
| M4 | `20260107130000_shipping_and_custom_fees.sql` | ✅ |
| M5 | `20260107140000_coupon_system.sql` | ✅ |
| M6 | `20260107150000_system_admin_and_audit.sql` | ✅ |
| M7 | `20260107160000_indexes_and_performance.sql` | ✅ |
| M8 | `20260107170000_rls_policies.sql` | ✅ |

### 推送新的 Migration

```bash
# 1. 建立新 Migration
supabase migration new add_feature_name

# 2. 編輯 Migration 檔案
# 位置: supabase/migrations/YYYYMMDD_add_feature_name.sql

# 3. 本地測試（建議）
supabase db reset  # 本地 Docker 環境

# 4. 推送到雲端
supabase db push --linked
```

⚠️ **重要提醒**: 推送到雲端前務必先在本地測試！

---

## 測試連線

### 使用 curl 測試

```bash
# 測試會員等級表
curl -H "apikey: YOUR_ANON_KEY" \
  "https://qwovavytryvgchcowjof.supabase.co/rest/v1/tiers?select=id,name&limit=5"

# 測試商品表
curl -H "apikey: YOUR_ANON_KEY" \
  "https://qwovavytryvgchcowjof.supabase.co/rest/v1/products?select=count&limit=1"
```

### 使用測試腳本

```bash
# PowerShell 腳本
powershell -ExecutionPolicy Bypass -File scripts/test-cloud-connection.ps1

# Node.js 腳本
node scripts/test-cloud-connection.mjs
```

---

## 常用指令

### Supabase CLI

```bash
# 查看專案列表
supabase projects list

# 查看當前連結的專案
supabase link --project-ref qwovavytryvgchcowjof

# 取得 API Keys
supabase projects api-keys --project-ref qwovavytryvgchcowjof

# 推送 Migration
supabase db push --linked

# 從雲端拉取 Schema
supabase db pull --linked

# 查看本地狀態
supabase status
```

### 開發伺服器

```bash
# 啟動開發伺服器（會自動讀取 .env.local）
pnpm dev

# 建置生產環境
pnpm build

# TypeScript 型別檢查
pnpm type-check
```

---

## 初始化資料

### 建立第一個管理員帳號

1. 方法 1: 使用 API 端點（推薦）

```bash
curl -X POST http://localhost:3000/api/create-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

2. 方法 2: 直接在 Supabase Dashboard

   - 登入 https://supabase.com/dashboard
   - 選擇專案 vasle-lite
   - SQL Editor → New Query
   - 執行建立管理員的 SQL

### 建立初始會員等級

使用 Supabase Dashboard 的 SQL Editor 或後台管理介面建立。

---

## 部署到 Firebase

切換到雲端 Supabase 後，Firebase 部署不需要額外設定，因為環境變數已在 `.env.local` 中設定。

```bash
# 建置
pnpm build

# 部署到 Firebase
firebase deploy --only hosting
```

---

## 疑難排解

### 連線錯誤: "Invalid API key"

1. 檢查 `.env.local` 中的 API Key 是否正確
2. 使用 `supabase projects api-keys --project-ref qwovavytryvgchcowjof` 取得最新金鑰
3. 重啟開發伺服器

### 找不到表: "Could not find the table"

1. 檢查 Migration 是否已推送: `supabase db push --linked`
2. 確認表名稱正確（使用小寫、底線分隔）
3. 檢查 RLS Policy 是否正確設定

### 本地 Docker 無法啟動

1. 檢查 Docker Desktop 是否執行中
2. 停止並重啟: `supabase stop` → `supabase start`
3. 檢查 port 是否被佔用（54321, 54322, 54323, 54324）

---

## 相關文件

- [Migration 工作流程指南](MIGRATION_WORKFLOW.md)
- [安全 Migration 指南](SAFE_MIGRATION_GUIDE.md)
- [備份與還原快速參考](BACKUP_RESTORE_CHEATSHEET.md)
- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md)

---

**最後檢查時間**: 2026-01-09
**檢查項目**:
- ✅ 雲端連線正常
- ✅ API Keys 正確
- ✅ Migration 已同步
- ✅ 建置測試通過
