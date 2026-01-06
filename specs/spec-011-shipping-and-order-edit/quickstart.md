# Feature 011: 快速上手指南 - 運費設定與訂單修改系統

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**最後更新**: 2026-01-06

---

## 目錄

1. [本地開發環境設定](#本地開發環境設定)
2. [核心功能測試流程](#核心功能測試流程)
3. [常見問題 FAQ](#常見問題-faq)
4. [相關文件連結](#相關文件連結)

---

## 本地開發環境設定

### 1. 啟動 Supabase

```bash
# 啟動本地 Supabase（首次或重啟電腦後執行）
supabase start

# 查看服務資訊
supabase status
```

**服務連結**:
- Supabase Studio: http://127.0.0.1:54323
- API URL: http://127.0.0.1:54321
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### 2. 執行 Migration

```bash
# 重置資料庫並執行所有 Migrations
supabase db reset

# 或僅執行新的 Migration（若已有資料）
supabase migration up
```

**Migration 檔案順序**:
1. `20260106_add_shipping_features.sql` - 運費功能
2. `20260107_remove_confirmed_status.sql` - 移除 confirmed 狀態
3. `20260108_extend_order_timelines.sql` - 修改歷程擴展

### 3. 種子資料設定

#### 方法 1: 使用 Supabase Studio（推薦）

1. 開啟 http://127.0.0.1:54323
2. 左側 → SQL Editor → New Query
3. 執行以下 SQL：

```sql
-- ========================================
-- Feature 011: 種子資料 - 運費設定與訂單修改
-- ========================================

-- 1. 設定會員等級運費
-- 零售客戶：收運費 100 元，滿 1000 免運
UPDATE tiers SET
  shipping_fee = 100.00,
  free_shipping_threshold = 1000.00,
  updated_at = NOW()
WHERE name = '零售';

-- 批發客戶：完全免運
UPDATE tiers SET
  shipping_fee = 0.00,
  free_shipping_threshold = NULL,
  updated_at = NOW()
WHERE name = '批發';

-- 經銷商：完全免運
UPDATE tiers SET
  shipping_fee = 0.00,
  free_shipping_threshold = NULL,
  updated_at = NOW()
WHERE name = '經銷商';

-- 2. 建立測試訂單（pending 狀態，可修改）
INSERT INTO orders (order_number, user_id, total_amount, shipping_fee, status, notes)
SELECT
  'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-TEST1',
  p.id,
  1200.00,
  100.00,
  'pending',
  '測試訂單（待確認）'
FROM profiles p
WHERE p.role = 'client'
LIMIT 1;

-- 取得測試訂單 ID
WITH test_order AS (
  SELECT id FROM orders WHERE order_number LIKE '%TEST1' LIMIT 1
)
-- 3. 新增訂單明細
INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
SELECT
  test_order.id,
  p.id,
  p.name,
  50.00,
  10,
  500.00
FROM test_order, products p
WHERE p.name LIKE '%測試商品%'
LIMIT 1;

-- 4. 新增自訂費用測試資料
INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
SELECT
  o.id,
  '手續費',
  60.00,
  admin.id
FROM orders o, profiles admin
WHERE o.order_number LIKE '%TEST1' AND admin.role = 'admin'
LIMIT 1;

-- 5. 建立測試訂單歷史記錄
INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, content)
SELECT
  o.id,
  'created',
  o.user_id,
  'client',
  '訂單建立'
FROM orders o
WHERE o.order_number LIKE '%TEST1';
```

#### 方法 2: psql 直接執行

```bash
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f specs/011-shipping-and-order-edit/seed-test-data.sql
# 密碼: postgres
```

### 4. 啟動開發伺服器

```bash
# 啟動 Next.js 開發伺服器
pnpm dev

# 開啟瀏覽器
# 前台: http://localhost:3000
# 後台: http://localhost:3000/admin
```

---

## 核心功能測試流程

### 測試 1: 運費設定（管理員）

**目標**: 驗證管理員可設定會員等級運費規則

**步驟**:
1. 登入後台（Email: 管理員帳號）
2. 前往「會員等級管理」頁面 (`/admin/tiers`)
3. 點擊「編輯」零售等級
4. 設定運費：
   - ✅ 勾選「收取運費」
   - 基本運費: `100` 元
   - 滿額免運: `1000` 元
5. 儲存

**預期結果**:
- 設定成功儲存
- 資料庫 `tiers` 表更新正確：
  ```sql
  SELECT name, shipping_fee, free_shipping_threshold FROM tiers WHERE name = '零售';
  -- 結果: 零售 | 100.00 | 1000.00
  ```

---

### 測試 2: 訂單建立與運費計算（客戶）

**目標**: 驗證客戶結帳時自動計算運費

#### 情境 A: 未滿免運門檻（收運費）

**步驟**:
1. 登入前台（手機號碼: 零售客戶帳號）
2. 加入商品至購物車（總額 800 元）
3. 前往購物車頁面 (`/store/cart`)
4. 檢查訂單摘要：
   - 商品金額: NT$800
   - 運費: NT$100
   - 訂單總額: NT$900

**預期結果**:
- 購物車顯示運費 100 元
- 結帳後訂單 `shipping_fee` 欄位為 100
- `total_amount` = 800 + 100 = 900

#### 情境 B: 滿額免運

**步驟**:
1. 加入更多商品（總額 1200 元）
2. 檢查訂單摘要：
   - 商品金額: NT$1200
   - 運費: **免運**（綠色）
   - 訂單總額: NT$1200

**預期結果**:
- 購物車顯示「免運」
- 結帳後訂單 `shipping_fee` 欄位為 0

#### 情境 C: 優惠券 + 免運門檻

**步驟**:
1. 加入商品（總額 1200 元）
2. 使用 500 元優惠券（SAVE500）
3. 檢查訂單摘要：
   - 商品金額: NT$1200
   - 優惠券折扣: -NT$500
   - 運費: **免運**（原始金額 1200 >= 1000）
   - 訂單總額: NT$700

**預期結果**:
- 運費依原始商品金額計算（1200），不看折扣後金額（700）
- 訂單 `shipping_fee` 為 0

---

### 測試 3: 訂單修改（管理員）

**目標**: 驗證管理員可修改待確認訂單

**前置條件**: 使用測試訂單（ORD-YYYYMMDD-TEST1，狀態 pending）

#### 情境 A: 修改商品單價與數量

**步驟**:
1. 登入後台
2. 前往「訂單管理」→ 點擊測試訂單
3. 點擊「編輯訂單」按鈕
4. 修改商品：
   - 單價: `50` → `40` 元
   - 數量: `10` → `8` 個
5. 檢查即時預覽：
   - 小計: 50 × 10 = 500 → 40 × 8 = 320
   - 訂單總額更新
6. 點擊「儲存變更」

**預期結果**:
- 跳出確認視窗，顯示變更摘要
- 儲存成功後重新載入頁面
- 訂單明細顯示新的單價與數量
- 修改歷程顯示於操作歷史（黃色背景）

#### 情境 B: 新增自訂費用

**步驟**:
1. 進入編輯模式
2. 點擊「新增費用」
3. 輸入：
   - 費用名稱: `手續費`
   - 金額: `50`
4. 儲存變更

**預期結果**:
- 自訂費用顯示於訂單明細下方
- 訂單總額 = 商品小計 + 運費 + **手續費 50**
- 修改歷程記錄「新增費用: 手續費 +NT$50」

#### 情境 C: 修改運費

**步驟**:
1. 進入編輯模式
2. 點擊運費旁的「編輯」
3. 輸入新運費: `0`（改為免運）
4. 儲存變更

**預期結果**:
- 訂單總額扣除原運費
- 修改歷程顯示「運費: NT$100 → NT$0 (免運)」

#### 情境 D: 直接修改總金額

**步驟**:
1. 進入編輯模式
2. 點擊「調整總金額」
3. 輸入最終總金額: `800`（原總額 1000）
4. 儲存變更

**預期結果**:
- 系統自動新增「總額調整: -NT$200」費用項目
- 訂單總額變為 800
- 修改歷程記錄總額調整

---

### 測試 4: 修改歷程查看（客戶 + 管理員）

**目標**: 驗證修改歷程正確顯示

**步驟**:
1. 客戶登入前台
2. 前往「我的訂單」→ 點擊訂單
3. 查看「訂單操作歷史」區塊

**預期結果**:
- 修改歷程以黃色背景顯示（與留言區分）
- 顯示修改時間、操作者（系統管理員）
- 列出所有變更項目：
  - 商品 A: 單價 NT$50 → NT$40
  - 商品 A: 數量 10 → 8
  - 新增費用: 手續費 +NT$50
  - 運費: NT$100 → NT$0 (免運)
  - 訂單總額: NT$1000 → NT$800

---

### 測試 5: 訂單狀態流程（管理員）

**目標**: 驗證新的訂單狀態流程（移除 confirmed）

#### 情境 A: 標記出貨並扣減庫存

**步驟**:
1. 登入後台
2. 前往訂單詳情（pending 狀態訂單）
3. 點擊「標記出貨（扣減庫存）」按鈕
4. 確認操作

**預期結果**:
- 訂單狀態變更為 `shipping`
- 商品庫存扣減（支援負庫存）
- 操作歷史記錄「狀態變更: pending → shipping」
- 按鈕變更為「標記為已完成」

#### 情境 B: 標記完成

**步驟**:
1. 點擊「標記為已完成」按鈕
2. 確認操作

**預期結果**:
- 訂單狀態變更為 `completed`
- 操作歷史記錄「狀態變更: shipping → completed」
- 按鈕消失（已完成訂單不可再操作）

#### 情境 C: 取消出貨中訂單（回補庫存）

**步驟**:
1. 前往 `shipping` 狀態訂單
2. 點擊「取消訂單（回補庫存）」按鈕
3. 輸入取消原因: `客戶要求取消`
4. 確認操作

**預期結果**:
- 訂單狀態變更為 `cancelled`
- 商品庫存回補（加回已扣減的數量）
- 操作歷史記錄取消原因

---

### 測試 6: 優惠券與運費互動

**目標**: 驗證優惠券折扣不影響免運門檻判定

#### 情境: 訂單修改後優惠券驗證

**步驟**:
1. 建立訂單（商品 1200 元，使用 SAVE200 優惠券，折扣後 1000 元）
2. 進入編輯模式
3. 移除部分商品（商品金額降至 800 元）
4. 嘗試儲存

**預期結果**:
- 跳出警告：「訂單修改後商品金額 (NT$800) 不符合優惠券條件 (需滿 NT$1000)」
- 提示：「是否移除優惠券並繼續修改？」
- 選擇「確定」→ 移除優惠券並儲存
- 選擇「取消」→ 保留編輯狀態，不儲存

---

## 常見問題 FAQ

### Q1: 如何測試免運門檻？

**A**: 使用不同的商品金額測試：

```sql
-- 查詢用戶等級運費設定
SELECT t.name, t.shipping_fee, t.free_shipping_threshold
FROM profiles p
JOIN tiers t ON t.id = p.tier_id
WHERE p.id = 'your-user-id';

-- 手動呼叫運費計算函數
SELECT calculate_shipping_fee('your-user-id', 800.00);  -- 未滿門檻
SELECT calculate_shipping_fee('your-user-id', 1200.00); -- 滿足免運
```

**測試案例**:
- 商品金額 800 元 → 運費 100 元
- 商品金額 1000 元（邊界值）→ 免運
- 商品金額 1200 元 → 免運

---

### Q2: 如何測試優惠券與運費互動？

**A**: 建立包含優惠券的訂單，驗證免運門檻判定：

**測試案例**:
```
商品金額: 1200 元
優惠券: SAVE500 (500 元折扣)
折扣後金額: 700 元
免運門檻: 1000 元

✅ 預期: 免運（依原始 1200 計算）
❌ 錯誤: 收運費（依折扣後 700 計算）
```

**驗證方式**:
1. 結帳時檢查購物車摘要
2. 訂單建立後檢查 `shipping_fee` 欄位
3. 查看 PostgreSQL Function 邏輯：
   ```sql
   -- lib/actions/orders.ts - createOrder()
   const shippingFee = await calculateShippingFee(userId, subtotal);  -- 使用原始 subtotal
   ```

---

### Q3: 如何測試訂單狀態流程？

**A**: 依序執行以下操作：

```
pending (待確認)
  ↓ [標記出貨] → 扣減庫存
shipping (出貨中)
  ↓ [標記完成]
completed (已完成)
```

**測試取消流程**:
- `pending` 取消 → 不涉及庫存
- `shipping` 取消 → 回補庫存（檢查商品 `stock` 欄位）
- `completed` 取消 → 不允許（顯示錯誤訊息）

**驗證庫存變更**:
```sql
-- 取消前記錄庫存
SELECT id, name, stock FROM products WHERE id = 'product-id';

-- 執行取消操作

-- 取消後檢查庫存（應回補）
SELECT id, name, stock FROM products WHERE id = 'product-id';
```

---

### Q4: 如何手動觸發 PostgreSQL Functions？

**A**: 使用 Supabase Studio SQL Editor 或 psql：

#### 計算運費函數
```sql
SELECT calculate_shipping_fee(
  'user-id'::UUID,
  800.00
);
-- 結果: 100.00 (未滿免運門檻)
```

#### 標記出貨函數
```sql
SELECT * FROM mark_order_as_shipping('order-id'::UUID);
-- 結果: (true, '訂單已標記為出貨中，庫存已扣減')
```

#### 批次修改訂單函數
```sql
SELECT * FROM update_order_with_modifications(
  'order-id'::UUID,
  '{
    "summary": {"old_total": 1000, "new_total": 950, "items_changed": 1, "fees_added": 0},
    "items": [
      {"type": "price_changed", "item_id": "item-id", "product_name": "商品 A", "old_price": 50, "new_price": 40}
    ]
  }'::JSONB,
  'admin-id'::UUID
);
-- 結果: (true, '訂單修改成功', 950.00)
```

---

### Q5: 如何查看訂單修改歷程 JSONB 結構？

**A**: 使用 SQL 查詢 `order_timelines` 表：

```sql
-- 查詢指定訂單的修改歷程
SELECT
  created_at,
  modifications
FROM order_timelines
WHERE order_id = 'order-id' AND action_type = 'order_modified'
ORDER BY created_at DESC;

-- 查詢修改歷程的商品變更
SELECT
  created_at,
  jsonb_pretty(modifications->'items') AS items_changes
FROM order_timelines
WHERE order_id = 'order-id' AND action_type = 'order_modified';

-- 查詢修改歷程的總額變更
SELECT
  created_at,
  (modifications->'summary'->>'old_total')::DECIMAL AS old_total,
  (modifications->'summary'->>'new_total')::DECIMAL AS new_total
FROM order_timelines
WHERE order_id = 'order-id' AND action_type = 'order_modified';
```

---

### Q6: 如何重置測試資料？

**A**: 使用 `supabase db reset` 重置整個資料庫：

```bash
# 重置資料庫（會清除所有資料並重新執行 Migrations）
supabase db reset

# 重新執行種子資料 SQL
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f specs/011-shipping-and-order-edit/seed-test-data.sql
```

**⚠️ 警告**: `supabase db reset` **僅限本地環境**使用，絕不可在生產環境執行！

---

### Q7: 如何除錯訂單修改失敗？

**A**: 檢查以下項目：

1. **訂單狀態檢查**:
   ```sql
   SELECT id, order_number, status FROM orders WHERE id = 'order-id';
   -- 僅 pending 狀態可修改
   ```

2. **PostgreSQL Function 錯誤**:
   - 開啟 Supabase Studio → Logs
   - 查看 PostgreSQL Logs
   - 搜尋 Function 名稱（`update_order_with_modifications`）

3. **前端 Console 錯誤**:
   - 開啟瀏覽器 DevTools → Console
   - 查看 Server Action 回傳的錯誤訊息

4. **Transaction 失敗檢查**:
   ```sql
   -- 檢查訂單是否被鎖定
   SELECT * FROM pg_locks WHERE relation = 'orders'::regclass;
   ```

---

### Q8: 如何測試訂單修改的原子性？

**A**: 故意製造錯誤，驗證 ROLLBACK：

```sql
-- 建立測試：新增一個不存在的商品 ID
SELECT * FROM update_order_with_modifications(
  'order-id'::UUID,
  '{
    "items": [
      {"type": "added", "product_id": "invalid-uuid", "product_name": "不存在商品", "new_price": 100, "new_quantity": 1}
    ]
  }'::JSONB,
  'admin-id'::UUID
);
-- 預期結果: (false, '商品不存在')

-- 驗證訂單未被修改
SELECT * FROM order_items WHERE order_id = 'order-id';
-- 應該看不到「不存在商品」
```

---

## 相關文件連結

### 專案文件
- [Feature 004: 購物車與訂單管理系統](../004-cart-and-orders/spec.md)
- [Feature 009: 優惠券系統](../009-coupon-system/spec.md)
- [專案憲章](../../CLAUDE.md)

### 資料庫管理
- [資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md)
- [安全 Migration 指南](../../docs/SAFE_MIGRATION_GUIDE.md)
- [備份與還原快速參考](../../docs/BACKUP_RESTORE_CHEATSHEET.md)

### Feature 011 文件
- [功能規格](./spec.md)
- [技術研究](./research.md)
- [實作計畫](./plan.md)
- [資料模型](./data-model.md)
- [API 合約](./contracts/)
  - [運費相關](./contracts/shipping.ts)
  - [訂單修改](./contracts/order-modifications.ts)
  - [訂單狀態](./contracts/order-status.ts)
  - [等級運費設定](./contracts/tier-shipping.ts)

### Supabase 官方文件
- [Supabase Functions](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [JSONB Data Type](https://www.postgresql.org/docs/current/datatype-json.html)

---

## 快速參考指令

```bash
# 啟動本地環境
supabase start                    # 啟動 Supabase
pnpm dev                          # 啟動 Next.js

# 資料庫管理
supabase db reset                 # 重置資料庫（本機）
supabase migration list           # 查看 Migration 狀態
supabase db push                  # 推送到雲端（生產環境）

# 測試
pnpm test                         # 執行單元測試
pnpm type-check                   # TypeScript 型別檢查
```

---

**最後更新**: 2026-01-06
**版本**: v1.0.0
**維護者**: Claude Sonnet 4.5
