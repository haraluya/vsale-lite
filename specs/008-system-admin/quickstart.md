# Quickstart Guide: 後台系統管理功能

**Feature**: 後台系統管理功能
**Date**: 2026-01-04
**Status**: Phase 1 Design

## Overview

本指南提供後台系統管理功能的快速上手步驟，包含資料庫 Migration 執行、測試資料建立、本地開發環境設定與功能測試流程。

---

## Prerequisites

在開始前，請確認：

- ✅ 已完成 001-007 功能（會員等級、商品管理、訂單系統、系統增強）
- ✅ 本地 Supabase 已啟動 (`supabase start`)
- ✅ 開發伺服器可運行 (`pnpm dev`)
- ✅ 已安裝所有依賴 (`pnpm install`)

---

## Step 1: 執行資料庫 Migration

### 1.1 建立 Migration 檔案

Migration 檔案位於：
```
supabase/migrations/20260113_system_admin.sql
```

### 1.2 執行 Migration

**方法 1: 使用 Supabase CLI（推薦）**

```bash
# 重置資料庫並執行所有 Migrations
supabase db reset
```

**方法 2: 手動執行（Supabase Studio）**

1. 開啟 http://127.0.0.1:54323
2. 左側 → SQL Editor → New Query
3. 複製 `supabase/migrations/20260113_system_admin.sql` 內容
4. 執行

### 1.3 驗證 Migration

```sql
-- 檢查 profiles 表新增欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('username', 'display_name');

-- 檢查新表是否已建立
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('system_settings', 'audit_logs');

-- 檢查預設設定是否已插入
SELECT key, value, category, is_public
FROM system_settings
ORDER BY category, key;
```

預期結果：
- `profiles` 表新增 2 個欄位：`username`, `display_name`
- 2 個新表：`system_settings`, `audit_logs`
- `system_settings` 表包含 9 筆預設設定

---

## Step 2: 建立測試資料

### 2.1 建立測試管理員帳號

**SQL 腳本**（直接在 Supabase Studio 執行）：

```sql
-- 方法 1: 使用 Supabase Auth Admin API（推薦，透過 Server Action 執行）
-- 前往 /admin/system/admins/new 頁面手動建立

-- 方法 2: 手動建立（僅用於測試）
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 使用 Supabase Auth Admin API 建立使用者（需在應用層執行）
  -- 此處僅為示例，實際應透過 Server Action

  -- 假設 Auth 使用者已建立，更新 profiles
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'testadmin@vsale.local' LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET
      username = 'testadmin',
      display_name = '測試管理員',
      role = 'admin'
    WHERE id = v_user_id;

    RAISE NOTICE '測試管理員帳號已建立: testadmin';
  ELSE
    RAISE NOTICE '請先使用 Server Action 建立 Auth 使用者';
  END IF;
END $$;
```

**建議方式**：使用前端介面建立測試管理員
1. 以現有管理員身分登入
2. 訪問 `/admin/system/admins/new`
3. 填寫資料：
   - 帳號：`testadmin`
   - 密碼：`Test@123456`
   - 暱稱：`測試管理員`
   - Email：`testadmin@company.com`（選填）

### 2.2 現有管理員帳號遷移測試

檢查現有管理員帳號是否自動遷移：

```sql
-- 查看所有管理員的 username
SELECT id, email, username, display_name, role
FROM profiles
WHERE role = 'admin';

-- 若 username 為空，執行遷移（Migration 應已自動執行）
UPDATE profiles
SET username = SPLIT_PART(email, '@', 1)
WHERE role = 'admin' AND username IS NULL;
```

### 2.3 建立測試操作日誌

```sql
-- 模擬商品庫存調整操作
INSERT INTO audit_logs (
  target_type,
  target_id,
  action_type,
  actor_id,
  actor_role,
  actor_display_name,
  old_values,
  new_values,
  notes
)
SELECT
  'product',
  p.id,
  'stock_adjusted',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  'admin',
  '測試管理員',
  jsonb_build_object('stock', p.stock),
  jsonb_build_object('stock', p.stock + 10),
  '測試庫存調整'
FROM products p
LIMIT 5;

-- 模擬客戶等級變更操作
INSERT INTO audit_logs (
  target_type,
  target_id,
  action_type,
  actor_id,
  actor_role,
  actor_display_name,
  old_values,
  new_values,
  notes
)
SELECT
  'client',
  p.id,
  'updated',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  'admin',
  '測試管理員',
  jsonb_build_object('tier_name', t1.name),
  jsonb_build_object('tier_name', t2.name),
  '升級為 VIP 客戶'
FROM profiles p
CROSS JOIN tiers t1
CROSS JOIN tiers t2
WHERE p.role = 'client'
AND t1.id = p.tier_id
AND t2.id != p.tier_id
LIMIT 3;

-- 驗證測試資料
SELECT
  target_type,
  action_type,
  actor_display_name,
  old_values,
  new_values,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 3: 本地開發環境設定

### 3.1 啟動開發伺服器

```bash
# 啟動 Supabase（若未啟動）
supabase start

# 啟動 Next.js 開發伺服器
pnpm dev
```

### 3.2 開啟 Supabase Studio

URL: http://127.0.0.1:54323

**常用功能**:
- Table Editor: 直接查看與編輯資料
- SQL Editor: 執行測試 SQL
- Database → Roles: 檢查 RLS 規則
- Authentication → Users: 查看 Auth 使用者

---

## Step 4: 功能測試流程

### 4.1 管理員登入（帳號模式）

**測試步驟**:

1. **訪問後台登入頁面**
   - URL: http://localhost:3000/admin/login

2. **使用帳號登入**
   - 帳號：`testadmin`
   - 密碼：`Test@123456`
   - 驗證：成功登入並導向 `/admin/dashboard`

3. **驗證舊 Email 登入已禁用**
   - 嘗試使用 Email 登入
   - 預期：顯示「請使用帳號登入」錯誤訊息

---

### 4.2 管理員帳號管理

**測試步驟**:

1. **查看管理員列表**
   - URL: http://localhost:3000/admin/system/admins
   - 驗證：顯示所有管理員帳號（帳號、暱稱、Email、建立時間）

2. **建立新管理員**
   - 點擊「新增管理員」
   - URL: http://localhost:3000/admin/system/admins/new
   - 填寫資料：
     - 帳號：`alice`
     - 密碼：`Alice@2026`
     - 暱稱：`小愛`
     - Email：`alice@company.com`
   - 送出
   - 驗證：
     - 成功建立並返回列表
     - 新管理員顯示於列表中
     - `audit_logs` 表記錄建立操作

3. **編輯管理員資料**
   - 點擊某管理員
   - 編輯暱稱為「新暱稱」
   - 編輯 Email
   - 儲存
   - 驗證：
     - 資料更新成功
     - `audit_logs` 表記錄變更前後資料

4. **重設管理員密碼**
   - 點擊「重設密碼」
   - 輸入新密碼：`NewPass@123`
   - 確認
   - 驗證：
     - 密碼重設成功
     - 登出後使用新密碼可登入

5. **刪除管理員**
   - 點擊「刪除」
   - 確認刪除
   - 驗證：
     - 管理員帳號已刪除
     - 無法再使用該帳號登入
     - `audit_logs` 表記錄刪除操作（含刪除的資料快照）

6. **防止刪除自己**
   - 嘗試刪除當前登入的管理員帳號
   - 驗證：顯示「無法刪除自己的帳號」錯誤訊息

---

### 4.3 系統設定管理

**測試步驟**:

1. **查看系統設定**
   - URL: http://localhost:3000/admin/system/settings
   - 驗證：顯示所有設定，依類別分組（基本資訊、Logo 與品牌、廣告輪播）

2. **更新文字設定**
   - 編輯「網站標題」為「新的網站標題」
   - 儲存
   - 驗證：
     - 設定更新成功
     - 重新載入前台頁面，標題已變更
     - `audit_logs` 表記錄設定變更

3. **更新數字設定**
   - 編輯「廣告輪播間隔」為 `3000`
   - 儲存
   - 驗證：
     - 設定更新成功
     - 前台廣告輪播間隔改為 3 秒

4. **更新布林值設定**
   - 切換「廣告輪播自動播放」為關閉
   - 儲存
   - 驗證：
     - 設定更新成功
     - 前台廣告輪播停止自動播放

5. **上傳完整版 Logo**
   - 點擊「上傳完整版 Logo」
   - 選擇圖片檔案（PNG, 800KB）
   - 上傳
   - 驗證：
     - 上傳成功並顯示預覽
     - 重新載入前台，Navbar 與 Sidebar 顯示新 Logo
     - `system_settings` 表的 `logo_url` 已更新

6. **Logo 檔案驗證**
   - 嘗試上傳 PDF 檔案
   - 預期：顯示「僅支援 JPG、PNG、WebP、SVG 格式」錯誤
   - 嘗試上傳 3MB 圖片
   - 預期：顯示「檔案大小不得超過 2MB」錯誤

7. **刪除 Logo**
   - 點擊「刪除 Logo」
   - 確認
   - 驗證：Logo 已刪除，前台顯示預設 Logo

---

### 4.4 操作日誌查詢

**測試步驟**:

1. **查看所有操作日誌**
   - URL: http://localhost:3000/admin/system/audit-logs
   - 驗證：顯示所有操作記錄，按時間排序（最新在前）

2. **操作類型顏色編碼**
   - 驗證各操作類型顯示正確顏色：
     - 🟢 綠色：建立操作
     - 🔵 藍色：更新操作
     - 🔴 紅色：刪除操作
     - 🟠 橙色：庫存操作
     - 🟡 黃色：留言操作

3. **篩選操作類型**
   - 選擇「僅顯示庫存操作」
   - 驗證：僅顯示 `action_type = 'stock_adjusted'` 的記錄

4. **篩選日期範圍**
   - 選擇「今日」
   - 驗證：僅顯示今日的操作記錄

5. **搜尋操作者**
   - 輸入「小愛」
   - 驗證：僅顯示操作者暱稱包含「小愛」的記錄

6. **查看操作詳情**
   - 點擊某操作記錄
   - 驗證：顯示完整資訊（操作者、時間、變更前後資料）

7. **查看特定實體的操作歷史**
   - 訪問商品編輯頁面
   - 點擊「操作紀錄」標籤
   - 驗證：顯示該商品的所有操作歷史（時間軸形式）

8. **分頁載入**
   - 捲動至底部
   - 驗證：自動載入下一頁（每頁 20 筆）

---

### 4.5 操作日誌自動記錄

**測試步驟**:

1. **商品建立**
   - 建立新商品「測試商品」
   - 訪問操作日誌頁面
   - 驗證：記錄「建立商品」操作（綠色），`new_values` 包含商品名稱、代碼、庫存等

2. **商品庫存調整**
   - 編輯商品庫存從 100 改為 80
   - 訪問操作日誌頁面
   - 驗證：記錄「庫存調整」操作（橙色），`old_values = { stock: 100 }`, `new_values = { stock: 80 }`

3. **客戶等級變更**
   - 修改客戶等級從「批發」改為「VIP」
   - 訪問操作日誌頁面
   - 驗證：記錄「更新客戶」操作（藍色），`old_values` 與 `new_values` 包含等級名稱

4. **商品刪除**
   - 刪除某商品
   - 訪問操作日誌頁面
   - 驗證：記錄「刪除商品」操作（紅色），`old_values` 包含刪除的商品完整資訊

5. **訂單留言**
   - 在訂單詳情頁新增留言
   - 訪問操作日誌頁面
   - 驗證：記錄「留言」操作（黃色），`new_values` 包含留言內容

---

### 4.6 RLS 權限驗證

**測試步驟**:

1. **客戶無法查看操作日誌**
   - 登入客戶帳號
   - 嘗試訪問 `/admin/system/audit-logs`
   - 預期：重定向至登入頁或顯示「權限不足」

2. **客戶無法查看管理員列表**
   - 嘗試訪問 `/admin/system/admins`
   - 預期：重定向至登入頁或顯示「權限不足」

3. **客戶可查看公開設定**
   - 前台頁面正確顯示網站標題、Logo（透過 `getPublicSettings`）

4. **管理員可查看所有操作日誌**
   - 登入管理員帳號
   - 訪問操作日誌頁面
   - 驗證：可查看所有操作記錄（含客戶的操作）

---

## Step 5: 整合測試

### 5.1 完整工作流程測試

**測試場景**：管理員 Alice 管理商品與客戶

1. **Alice 登入**
   - 使用帳號 `alice` 登入

2. **Alice 建立新管理員 Bob**
   - 訪問管理員列表
   - 建立帳號 `bob`，暱稱「小寶」

3. **Alice 調整商品庫存**
   - 編輯商品「白米」庫存從 100 改為 50

4. **Bob 登入**
   - 使用帳號 `bob` 登入

5. **Bob 確認訂單**
   - 訪問訂單列表
   - 確認某待處理訂單

6. **Alice 查看操作日誌**
   - 訪問操作日誌頁面
   - 驗證：可看到自己與 Bob 的所有操作
   - 篩選「操作者：小寶」，驗證僅顯示 Bob 的操作

7. **Alice 刪除 Bob 的帳號**
   - 訪問管理員列表
   - 刪除 Bob 的帳號

8. **驗證操作日誌保留 Bob 的暱稱**
   - 訪問操作日誌頁面
   - 驗證：Bob 之前的操作仍顯示「小寶」（暱稱快照）

---

### 5.2 JSONB 查詢測試

**測試場景**：查詢所有庫存從 100 調整的操作

在 Supabase Studio 執行：

```sql
-- 查詢所有庫存從 100 調整的操作
SELECT
  target_type,
  target_id,
  action_type,
  actor_display_name,
  old_values->>'stock' AS old_stock,
  new_values->>'stock' AS new_stock,
  created_at
FROM audit_logs
WHERE action_type = 'stock_adjusted'
AND old_values @> '{"stock": 100}';  -- JSONB @> 運算子

-- 查詢所有價格調整操作
SELECT
  target_type,
  target_id,
  old_values->>'price' AS old_price,
  new_values->>'price' AS new_price,
  created_at
FROM audit_logs
WHERE target_type = 'tier_price'
AND action_type = 'updated'
AND (old_values->>'price')::DECIMAL != (new_values->>'price')::DECIMAL;
```

---

## Step 6: 效能測試

### 6.1 操作日誌大量資料測試

**測試場景**：產生 10,000 筆操作日誌，驗證查詢效能

```sql
-- 產生測試資料
DO $$
DECLARE
  i INTEGER;
  v_admin_id UUID;
  v_product_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO v_product_id FROM products LIMIT 1;

  FOR i IN 1..10000 LOOP
    INSERT INTO audit_logs (
      target_type,
      target_id,
      action_type,
      actor_id,
      actor_role,
      actor_display_name,
      old_values,
      new_values
    ) VALUES (
      'product',
      v_product_id,
      'stock_adjusted',
      v_admin_id,
      'admin',
      '測試管理員',
      jsonb_build_object('stock', i),
      jsonb_build_object('stock', i + 1)
    );
  END LOOP;

  RAISE NOTICE '已產生 10,000 筆測試操作日誌';
END $$;

-- 測試查詢效能（應 < 2 秒）
EXPLAIN ANALYZE
SELECT *
FROM audit_logs
WHERE action_type = 'stock_adjusted'
ORDER BY created_at DESC
LIMIT 20;

-- 測試 JSONB 查詢效能（GIN 索引應生效）
EXPLAIN ANALYZE
SELECT *
FROM audit_logs
WHERE old_values @> '{"stock": 5000}';
```

**預期結果**:
- 查詢最新 20 筆記錄：< 100ms
- JSONB 查詢（GIN 索引）：< 500ms

---

## Troubleshooting

### 問題 1: Migration 執行失敗

**錯誤**: `column "username" already exists`

**解決方案**:
```bash
# 重置資料庫
supabase db reset

# 或手動刪除欄位
ALTER TABLE profiles DROP COLUMN IF EXISTS username CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS display_name CASCADE;
```

---

### 問題 2: 管理員無法使用帳號登入

**錯誤**: `帳號或密碼錯誤`

**檢查步驟**:
1. 驗證 `profiles` 表中該管理員的 `username` 欄位不為空
2. 驗證 `profiles` 表中該管理員的 `email` 欄位正確
3. 檢查 `loginWithUsername` Server Action 的查詢邏輯

```sql
-- 檢查管理員資料
SELECT id, email, username, role
FROM profiles
WHERE username = 'testadmin';
```

---

### 問題 3: 操作日誌未自動記錄

**錯誤**: 執行操作後 `audit_logs` 表沒有新記錄

**檢查步驟**:
1. 確認 Server Action 中有呼叫 `logAudit()` 函式
2. 檢查 `logAudit()` 函式是否拋出錯誤（查看控制台）
3. 驗證 RLS 規則是否阻止 INSERT 操作

```sql
-- 檢查 RLS 規則
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'audit_logs';

-- 手動測試插入（使用 Service Role）
-- 應該成功
```

---

### 問題 4: Logo 上傳後前台未顯示

**錯誤**: 上傳 Logo 成功但前台仍顯示舊 Logo

**解決方案**:
1. 檢查 `system_settings` 表的 `logo_url` 是否已更新
2. 清除瀏覽器快取（Ctrl + Shift + R）
3. 驗證 `revalidatePath('/', 'layout')` 是否執行
4. 檢查前台 Layout 是否正確呼叫 `getPublicSettings()`

```sql
-- 檢查 Logo URL
SELECT key, value
FROM system_settings
WHERE key IN ('logo_url', 'logo_icon_url', 'favicon_url');
```

---

### 問題 5: RLS 權限錯誤

**錯誤**: `new row violates row-level security policy`

**解決方案**:
```sql
-- 檢查 RLS 規則
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'system_settings', 'audit_logs');

-- 確認 profiles 表的 RLS 規則允許管理員更新
-- 確認 audit_logs 表沒有 INSERT 權限（應由 Service Role 寫入）
```

---

## Next Steps

Phase 1 完成後，可進行：

1. **Phase 2**: 使用 `/speckit.tasks` 產生實作任務清單
2. **開始實作**: 根據 data-model.md 與 contracts/ 建立程式碼
3. **整合測試**: 執行完整的端到端測試流程
4. **Phase 3-5**: 實作 UI 元件與前端頁面
5. **Phase 6**: 進階功能（權限細分、操作日誌匯出、統計圖表）

---

## Useful Commands

```bash
# 啟動 Supabase
supabase start

# 重置資料庫
supabase db reset

# 查看 Supabase 狀態
supabase status

# 啟動開發伺服器
pnpm dev

# 型別檢查
pnpm type-check

# 建置
pnpm build
```

---

## Useful SQL Queries

```sql
-- 查看所有管理員
SELECT id, email, username, display_name, created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 查看所有系統設定
SELECT key, value, value_type, category, is_public
FROM system_settings
ORDER BY category, key;

-- 查看最新 20 筆操作日誌
SELECT
  target_type,
  action_type,
  actor_display_name,
  old_values,
  new_values,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- 查看特定實體的操作歷史
SELECT *
FROM audit_logs
WHERE target_type = 'product'
AND target_id = '<product-uuid>'
ORDER BY created_at ASC;

-- 統計各操作類型數量
SELECT
  action_type,
  COUNT(*) AS count
FROM audit_logs
GROUP BY action_type
ORDER BY count DESC;
```

---

**Status**: ✅ Completed
**Date**: 2026-01-04
**Related**: data-model.md, contracts/
