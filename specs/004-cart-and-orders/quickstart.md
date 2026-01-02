# Quickstart Guide: 購物車與訂單管理系統

**Feature**: 購物車與訂單管理系統
**Date**: 2026-01-03
**Status**: Phase 1 Design

## Overview

本指南提供購物車與訂單系統的快速上手步驟，包含資料庫 Migration 執行、測試資料建立、本地開發環境設定與功能測試流程。

---

## Prerequisites

在開始前，請確認：

- ✅ 已完成 001, 002, 003 功能（會員等級、商品管理、系列價格）
- ✅ 本地 Supabase 已啟動 (`supabase start`)
- ✅ 已安裝 Zustand (`pnpm install zustand`)
- ✅ 開發伺服器可運行 (`pnpm dev`)

---

## Step 1: 執行資料庫 Migration

### 1.1 建立 Migration 檔案

Migration 檔案位於：
```
supabase/migrations/20260104_create_orders.sql
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
3. 複製 `supabase/migrations/20260104_create_orders.sql` 內容
4. 執行

### 1.3 驗證 Migration

```sql
-- 檢查表是否已建立
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('orders', 'order_items', 'order_timelines');

-- 檢查 Function 是否已建立
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'generate_order_number',
  'confirm_order_and_deduct_stock',
  'cancel_order_and_restore_stock',
  'update_order_status'
);
```

預期結果：
- 3 個表：`orders`, `order_items`, `order_timelines`
- 4 個 Functions

---

## Step 2: 建立測試資料

### 2.1 測試訂單資料

**SQL 腳本**（直接在 Supabase Studio 執行）：

```sql
-- 1. 取得測試用戶與等級
DO $$
DECLARE
  v_client_id UUID;
  v_tier_id UUID;
  v_product_1 UUID;
  v_product_2 UUID;
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  -- 取得第一個客戶
  SELECT id INTO v_client_id
  FROM profiles
  WHERE role = 'client'
  LIMIT 1;

  -- 取得該客戶的等級
  SELECT tier_id INTO v_tier_id
  FROM profiles
  WHERE id = v_client_id;

  -- 取得有設定價格的商品
  SELECT DISTINCT product_id INTO v_product_1
  FROM tier_prices
  WHERE tier_id = v_tier_id
  LIMIT 1;

  SELECT DISTINCT product_id INTO v_product_2
  FROM tier_prices
  WHERE tier_id = v_tier_id
  OFFSET 1
  LIMIT 1;

  -- 產生訂單編號
  v_order_number := generate_order_number();

  -- 建立測試訂單
  INSERT INTO orders (id, order_number, user_id, total_amount, status, notes)
  VALUES (
    gen_random_uuid(),
    v_order_number,
    v_client_id,
    0,  -- 暫時為 0，後續計算
    'pending',
    '測試訂單'
  )
  RETURNING id INTO v_order_id;

  -- 建立訂單明細
  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  SELECT
    v_order_id,
    tp.product_id,
    p.name,
    tp.price,
    10,
    tp.price * 10
  FROM tier_prices tp
  INNER JOIN products p ON tp.product_id = p.id
  WHERE tp.tier_id = v_tier_id
  AND tp.product_id IN (v_product_1, v_product_2);

  -- 更新訂單總金額
  UPDATE orders
  SET total_amount = (
    SELECT SUM(subtotal)
    FROM order_items
    WHERE order_id = v_order_id
  )
  WHERE id = v_order_id;

  -- 建立訂單歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
  VALUES (v_order_id, 'created', v_client_id, 'client', 'pending');

  RAISE NOTICE '測試訂單已建立: %', v_order_number;
END $$;
```

### 2.2 驗證測試資料

```sql
-- 查看訂單
SELECT
  o.order_number,
  o.total_amount,
  o.status,
  p.full_name AS customer_name,
  t.name AS tier_name
FROM orders o
INNER JOIN profiles p ON o.user_id = p.id
INNER JOIN tiers t ON p.tier_id = t.id;

-- 查看訂單明細
SELECT
  oi.product_name_snapshot,
  oi.deal_price,
  oi.quantity,
  oi.subtotal
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.order_number LIKE 'ORD-%';

-- 查看訂單歷史
SELECT
  ot.action_type,
  ot.old_status,
  ot.new_status,
  ot.created_at,
  p.full_name AS actor_name
FROM order_timelines ot
LEFT JOIN profiles p ON ot.actor_id = p.id
ORDER BY ot.created_at;
```

---

## Step 3: 安裝前端依賴

```bash
# 安裝 Zustand（若尚未安裝）
pnpm install zustand

# 驗證安裝
pnpm list zustand
```

預期輸出：
```
zustand 5.0.x
```

---

## Step 4: 本地開發環境設定

### 4.1 啟動開發伺服器

```bash
# 啟動 Supabase（若未啟動）
supabase start

# 啟動 Next.js 開發伺服器
pnpm dev
```

### 4.2 開啟 Supabase Studio

URL: http://127.0.0.1:54323

**常用功能**:
- Table Editor: 直接查看與編輯訂單資料
- SQL Editor: 執行測試 SQL
- Database → Roles: 檢查 RLS 規則

---

## Step 5: 功能測試流程

### 5.1 客戶端購物車功能

**測試步驟**:

1. **登入客戶帳號**
   - URL: http://localhost:3000/login
   - 使用手機號碼登入

2. **瀏覽商品並加入購物車**
   - URL: http://localhost:3000/store
   - 點擊商品 → 查看詳情 → 加入購物車
   - 驗證：購物車圖示顯示數量徽章

3. **查看購物車**
   - URL: http://localhost:3000/store/cart
   - 驗證：商品列表、價格、數量、小計、總價
   - 調整數量 → 驗證小計與總價更新
   - 移除商品 → 驗證購物車更新

4. **重新整理頁面**
   - 驗證：購物車內容仍然存在（Zustand persist）

5. **結帳**
   - 點擊「結帳」按鈕
   - URL: http://localhost:3000/store/checkout
   - 填寫備註（選填）
   - 確認訂單資訊
   - 送出訂單
   - 驗證：顯示訂單編號、購物車已清空

### 5.2 客戶端訂單查詢

**測試步驟**:

1. **查看訂單列表**
   - URL: http://localhost:3000/store/orders
   - 驗證：顯示自己的所有訂單
   - 篩選狀態 → 驗證列表更新

2. **查看訂單詳情**
   - 點擊某訂單
   - URL: http://localhost:3000/store/orders/[id]
   - 驗證：訂單編號、商品明細、總金額、狀態、備註

### 5.3 管理員訂單管理

**測試步驟**:

1. **登入管理員帳號**
   - URL: http://localhost:3000/admin/login
   - 使用 Email 登入

2. **查看所有訂單**
   - URL: http://localhost:3000/admin/orders
   - 驗證：顯示所有客戶的訂單
   - 篩選狀態 → 驗證列表更新
   - 搜尋訂單編號或客戶名稱 → 驗證結果

3. **訂單詳情與狀態更新**
   - 點擊某訂單
   - URL: http://localhost:3000/admin/orders/[id]
   - 驗證：完整資訊（含操作歷史）

4. **確認訂單（扣減庫存）**
   - 點擊「確認訂單」
   - 驗證：
     - 訂單狀態改為「已確認」
     - 商品庫存已扣減（查看 Supabase Studio）
     - 操作歷史新增記錄

5. **更新訂單狀態**
   - 點擊「標記為出貨中」
   - 驗證：狀態改為「出貨中」
   - 點擊「標記為已完成」
   - 驗證：狀態改為「已完成」

6. **取消訂單（回補庫存）**
   - 建立新的測試訂單並確認
   - 點擊「取消訂單」
   - 驗證：
     - 訂單狀態改為「已取消」
     - 商品庫存已回補
     - 操作歷史新增記錄

---

## Step 6: RLS 權限驗證

### 6.1 客戶權限測試

**測試方法**：

1. 登入客戶 A
2. 建立訂單 A
3. 登出並登入客戶 B
4. 嘗試訪問訂單 A 的 URL
5. **預期結果**：無法查看訂單 A（RLS 過濾）

**SQL 驗證**：

```sql
-- 以客戶 A 身份查詢（設定 RLS context）
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<client_a_id>"}';

SELECT * FROM orders;
-- 應該只看到客戶 A 的訂單

-- 重置
RESET ROLE;
```

### 6.2 管理員權限測試

1. 登入管理員
2. 訪問 `/admin/orders`
3. **預期結果**：可查看所有客戶的訂單

---

## Step 7: 負庫存測試

### 7.1 建立負庫存訂單

**步驟**:

1. 將某商品庫存設為 10
2. 建立訂單，購買數量 15
3. 確認訂單
4. **預期結果**：
   - 訂單建立成功
   - 庫存變為 -5
   - 無錯誤訊息

**SQL 驗證**：

```sql
-- 查看商品庫存
SELECT id, name, stock FROM products WHERE stock < 0;
```

### 7.2 負庫存回補測試

1. 取消上述訂單
2. **預期結果**：庫存回補至 10

---

## Step 8: 並發訂單測試

### 8.1 訂單編號唯一性

**測試方法**：

開啟兩個瀏覽器視窗，同時送出訂單。

**預期結果**：
- 兩筆訂單都成功建立
- 訂單編號不重複（例如：ORD-20260103-0001, ORD-20260103-0002）

### 8.2 庫存扣減一致性

**測試方法**：

1. 商品庫存設為 100
2. 兩個客戶同時下單，各購買 50
3. 管理員同時確認兩筆訂單

**預期結果**：
- 庫存最終為 0（100 - 50 - 50）
- 無資料不一致

---

## Troubleshooting

### 問題 1: Migration 執行失敗

**錯誤**: `relation "orders" already exists`

**解決方案**:
```bash
# 重置資料庫
supabase db reset

# 或手動刪除表
DROP TABLE IF EXISTS order_timelines CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
```

### 問題 2: 購物車無法持久化

**錯誤**: 重新整理後購物車清空

**解決方案**:
- 檢查瀏覽器是否啟用 localStorage
- 檢查 Zustand persist 設定是否正確

### 問題 3: RLS 權限錯誤

**錯誤**: `new row violates row-level security policy`

**解決方案**:
```sql
-- 檢查 RLS 規則
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_timelines');

-- 重新套用 RLS 規則
-- 執行 Migration 中的 RLS 部分
```

### 問題 4: 訂單編號重複

**錯誤**: `duplicate key value violates unique constraint "orders_order_number_key"`

**解決方案**:
- 檢查 `generate_order_number()` Function 是否正確執行
- 確認 UNIQUE constraint 已建立
- 若仍發生，檢查並發處理邏輯

---

## Next Steps

Phase 1 完成後，可進行：

1. **Phase 2**: 使用 `/speckit.tasks` 產生實作任務清單
2. **開始實作**: 根據 data-model.md 與 contracts/ 建立程式碼
3. **整合測試**: 執行完整的端到端測試流程

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

**Status**: ✅ Completed
**Date**: 2026-01-03
**Related**: data-model.md, contracts/
