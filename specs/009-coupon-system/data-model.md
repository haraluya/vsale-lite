# Data Model: 優惠券系統

**Feature**: 優惠券系統 (Coupon System)
**Date**: 2026-01-06
**Status**: Phase 1 Design

## Overview

本文件定義優惠券系統所需的資料庫表結構、關聯規則、索引策略與 RLS 權限設計。所有設計基於 [research.md](research.md) 的技術決策。

---

## Entity Relationship Diagram

```
coupons (優惠券主表)
    ↓ (1:N)
coupon_tier_restrictions (等級限制)
    ↓ (N:1)
tiers (existing)

coupons
    ↓ (1:N)
coupon_series_restrictions (系列限制)
    ↓ (N:1)
series (existing)

coupons
    ↓ (1:N)
user_coupons (客戶領取記錄)
    ↓ (N:1)
auth.users (existing)

orders (existing)
    ↓ (1:1)
order_coupons (訂單優惠券快照)
```

**關聯說明**:
- 一個 `coupons` (優惠券) 可以有多個 `coupon_tier_restrictions` (等級限制)
- 一個 `coupons` (優惠券) 可以有多個 `coupon_series_restrictions` (系列限制)
- 一個 `coupons` (優惠券) 可以被多個客戶領取 (`user_coupons`)
- 一個 `orders` (訂單) 最多關聯一個 `order_coupons` (優惠券快照)
- `order_coupons` 不使用 FK 關聯 `coupons`，以保留歷史記錄

---

## Table Schemas

### 1. coupons (優惠券主表)

**用途**: 儲存優惠券主要資訊（代碼、折扣方式、使用限制、生效時間）

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL CHECK (code ~ '^[A-Z0-9]+$'),  -- 原始代碼（管理員輸入，自動轉大寫）
  code_normalized VARCHAR(20) GENERATED ALWAYS AS (UPPER(code)) STORED,  -- 自動轉大寫的代碼
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (
    (discount_type = 'fixed' AND discount_value > 0) OR
    (discount_type = 'percentage' AND discount_value >= 1 AND discount_value <= 100)
  ),
  min_order_amount DECIMAL(10, 2) CHECK (min_order_amount >= 0),  -- 最低訂單金額限制（選填）
  valid_from TIMESTAMPTZ NOT NULL,  -- 生效開始時間
  valid_until TIMESTAMPTZ NOT NULL,  -- 生效結束時間
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  deleted_at TIMESTAMPTZ,  -- 軟刪除時間
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (valid_until > valid_from),
  CONSTRAINT code_length CHECK (LENGTH(code) BETWEEN 4 AND 20)
);

-- 唯一性約束（基於大寫版本）
CREATE UNIQUE INDEX idx_coupons_code_normalized ON coupons(code_normalized) WHERE status != 'deleted';

-- 查詢索引
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_valid_time ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupons_discount_type ON coupons(discount_type);

-- 自動更新 updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE coupons IS '優惠券主表';
COMMENT ON COLUMN coupons.code IS '優惠券代碼（管理員輸入，4-20 字元，僅允許英數字）';
COMMENT ON COLUMN coupons.code_normalized IS '自動轉大寫的優惠券代碼（用於唯一性檢查與查詢）';
COMMENT ON COLUMN coupons.discount_type IS '折扣方式：fixed (現金折扣) 或 percentage (百分比折扣)';
COMMENT ON COLUMN coupons.discount_value IS '折扣值（現金折扣：固定金額；百分比折扣：1-100 代表折扣百分比）';
COMMENT ON COLUMN coupons.min_order_amount IS '最低訂單金額限制（選填，NULL 表示無限制）';
COMMENT ON COLUMN coupons.status IS '優惠券狀態：active (啟用), inactive (停用), deleted (已刪除)';
```

**欄位說明**:
- `code`: 管理員輸入的原始代碼（可能包含小寫）
- `code_normalized`: **關鍵欄位**，Generated Column 自動將 `code` 轉為大寫，用於唯一性檢查與查詢
- `discount_type`: 折扣方式，限定為 `fixed` (現金折扣) 或 `percentage` (百分比折扣)
- `discount_value`: 折扣值，現金折扣必須 > 0，百分比折扣範圍 1-100
- `valid_from` / `valid_until`: 生效時間範圍，確保 `valid_until > valid_from`
- `status`: 優惠券狀態，使用軟刪除模式（`deleted` 狀態保留歷史記錄）

---

### 2. coupon_tier_restrictions (優惠券等級限制)

**用途**: 定義優惠券的會員等級限制（多對多關聯）

```sql
CREATE TABLE coupon_tier_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, tier_id)  -- 避免重複限制
);

-- 索引
CREATE INDEX idx_coupon_tier_restrictions_coupon_id ON coupon_tier_restrictions(coupon_id);
CREATE INDEX idx_coupon_tier_restrictions_tier_id ON coupon_tier_restrictions(tier_id);

-- 註解
COMMENT ON TABLE coupon_tier_restrictions IS '優惠券等級限制表（多對多關聯）';
COMMENT ON COLUMN coupon_tier_restrictions.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN coupon_tier_restrictions.tier_id IS '會員等級 ID';
```

**欄位說明**:
- `coupon_id`: 關聯優惠券，使用 `ON DELETE CASCADE`（優惠券刪除時自動清理）
- `tier_id`: 關聯會員等級，使用 `ON DELETE CASCADE`（等級刪除時自動清理）
- `UNIQUE (coupon_id, tier_id)`: 避免同一優惠券重複限制同一等級

**業務邏輯**:
- 若 `coupon_tier_restrictions` 表中**無記錄**，表示該優惠券**無等級限制**（所有等級可用）
- 若有記錄，則僅限定記錄中的等級可使用該優惠券

---

### 3. coupon_series_restrictions (優惠券系列限制)

**用途**: 定義優惠券的商品系列限制（多對多關聯）

```sql
CREATE TABLE coupon_series_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, series_id)  -- 避免重複限制
);

-- 索引
CREATE INDEX idx_coupon_series_restrictions_coupon_id ON coupon_series_restrictions(coupon_id);
CREATE INDEX idx_coupon_series_restrictions_series_id ON coupon_series_restrictions(series_id);

-- 註解
COMMENT ON TABLE coupon_series_restrictions IS '優惠券系列限制表（多對多關聯）';
COMMENT ON COLUMN coupon_series_restrictions.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN coupon_series_restrictions.series_id IS '商品系列 ID';
```

**欄位說明**:
- `coupon_id`: 關聯優惠券，使用 `ON DELETE CASCADE`
- `series_id`: 關聯商品系列，使用 `ON DELETE CASCADE`
- `UNIQUE (coupon_id, series_id)`: 避免同一優惠券重複限制同一系列

**業務邏輯**:
- 若 `coupon_series_restrictions` 表中**無記錄**，表示該優惠券**無系列限制**（所有商品可計入）
- 若有記錄，則僅限定系列的商品可計入優惠券條件（最低金額計算）

---

### 4. user_coupons (客戶優惠券領取記錄)

**用途**: 記錄客戶已領取的優惠券（領取時間、使用狀態）

```sql
CREATE TABLE user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,  -- 使用時間（NULL 表示未使用）
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,  -- 使用於哪個訂單（選填）

  UNIQUE (user_id, coupon_id)  -- 每個客戶每張優惠券僅能領取一次
);

-- 索引
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at);

-- 註解
COMMENT ON TABLE user_coupons IS '客戶優惠券領取記錄表';
COMMENT ON COLUMN user_coupons.user_id IS '客戶 ID';
COMMENT ON COLUMN user_coupons.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN user_coupons.claimed_at IS '領取時間';
COMMENT ON COLUMN user_coupons.used_at IS '使用時間（NULL 表示未使用）';
COMMENT ON COLUMN user_coupons.order_id IS '使用於哪個訂單（選填）';
```

**欄位說明**:
- `user_id`: 關聯客戶，使用 `ON DELETE CASCADE`（客戶刪除時自動清理）
- `coupon_id`: 關聯優惠券，使用 `ON DELETE CASCADE`（優惠券刪除時自動清理）
- `used_at`: 使用時間，`NULL` 表示未使用，非 `NULL` 表示已使用
- `order_id`: 使用於哪個訂單，使用 `ON DELETE SET NULL`（訂單刪除時保留記錄但清空訂單 ID）
- `UNIQUE (user_id, coupon_id)`: 確保每個客戶每張優惠券僅能領取一次

---

### 5. order_coupons (訂單優惠券快照)

**用途**: 記錄訂單中使用的優惠券快照（代碼、折扣方式、折扣金額）

```sql
CREATE TABLE order_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) NOT NULL,  -- 快照：優惠券代碼（不使用 FK）
  discount_type VARCHAR(20) NOT NULL,  -- 快照：折扣方式
  discount_value DECIMAL(10, 2) NOT NULL,  -- 快照：折扣值
  discount_amount DECIMAL(10, 2) NOT NULL,  -- 快照：實際折扣金額
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (order_id)  -- 每個訂單最多使用一張優惠券
);

-- 索引
CREATE INDEX idx_order_coupons_order_id ON order_coupons(order_id);
CREATE INDEX idx_order_coupons_coupon_code ON order_coupons(coupon_code);

-- 註解
COMMENT ON TABLE order_coupons IS '訂單優惠券快照表（不使用 FK，保留歷史記錄）';
COMMENT ON COLUMN order_coupons.order_id IS '訂單 ID';
COMMENT ON COLUMN order_coupons.coupon_code IS '優惠券代碼快照（大寫）';
COMMENT ON COLUMN order_coupons.discount_type IS '折扣方式快照：fixed 或 percentage';
COMMENT ON COLUMN order_coupons.discount_value IS '折扣值快照';
COMMENT ON COLUMN order_coupons.discount_amount IS '實際折扣金額（訂單總額 - 折扣後金額）';
```

**欄位說明**:
- `order_id`: 關聯訂單，使用 `ON DELETE CASCADE`
- `coupon_code`: **關鍵欄位**，快照優惠券代碼，**不使用 FK**（優惠券刪除後訂單記錄仍保留）
- `discount_type` / `discount_value`: 快照折扣方式與折扣值
- `discount_amount`: **關鍵欄位**，實際折扣金額（伺服器端計算並儲存）
- `UNIQUE (order_id)`: 確保每個訂單最多使用一張優惠券

---

## PostgreSQL Views

### 1. active_coupons (有效優惠券 View)

**用途**: 自動過濾過期與已刪除的優惠券

```sql
CREATE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND NOW() BETWEEN valid_from AND valid_until;

COMMENT ON VIEW active_coupons IS '有效優惠券 View（自動過濾過期與已刪除）';
```

**使用場景**:
- 前台客戶查詢可領取的優惠券列表
- 客戶輸入優惠券代碼時驗證有效性
- RLS Policy 確保客戶僅能查看有效優惠券

---

## Row Level Security (RLS) Policies

### coupons 表

```sql
-- 啟用 RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 客戶查看有效優惠券（透過 View）
CREATE POLICY "Clients can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    NOW() BETWEEN valid_from AND valid_until
  );

-- 管理員查看所有優惠券
CREATE POLICY "Admins can view all coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員管理優惠券（INSERT, UPDATE, DELETE）
CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### coupon_tier_restrictions 表

```sql
-- 啟用 RLS
ALTER TABLE coupon_tier_restrictions ENABLE ROW LEVEL SECURITY;

-- 所有已認證用戶可讀取（用於驗證優惠券條件）
CREATE POLICY "Authenticated users can view tier restrictions"
  ON coupon_tier_restrictions FOR SELECT
  TO authenticated
  USING (true);

-- 管理員管理等級限制
CREATE POLICY "Admins can manage tier restrictions"
  ON coupon_tier_restrictions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### coupon_series_restrictions 表

```sql
-- 啟用 RLS
ALTER TABLE coupon_series_restrictions ENABLE ROW LEVEL SECURITY;

-- 所有已認證用戶可讀取（用於驗證優惠券條件）
CREATE POLICY "Authenticated users can view series restrictions"
  ON coupon_series_restrictions FOR SELECT
  TO authenticated
  USING (true);

-- 管理員管理系列限制
CREATE POLICY "Admins can manage series restrictions"
  ON coupon_series_restrictions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### user_coupons 表

```sql
-- 啟用 RLS
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- 客戶查看自己已領取的優惠券
CREATE POLICY "Clients can view their own coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 客戶領取優惠券（由 Server Action 處理，不直接開放 INSERT 權限）

-- 管理員查看所有客戶優惠券記錄
CREATE POLICY "Admins can view all user coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### order_coupons 表

```sql
-- 啟用 RLS
ALTER TABLE order_coupons ENABLE ROW LEVEL SECURITY;

-- 客戶查看自己訂單的優惠券快照
CREATE POLICY "Clients can view their order coupons"
  ON order_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_coupons.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員查看所有訂單優惠券快照
CREATE POLICY "Admins can view all order coupons"
  ON order_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 注意：訂單優惠券快照由 Server Action 自動建立，不開放直接 INSERT 權限
```

---

## Data Validation Rules

### 優惠券建立驗證

1. **代碼格式驗證**:
   - 僅允許英數字（A-Z, 0-9）
   - 長度限制 4-20 字元
   - 自動轉換為大寫（Generated Column）

2. **折扣值驗證**:
   - 現金折扣：`discount_value > 0`
   - 百分比折扣：`1 <= discount_value <= 100`

3. **生效時間驗證**:
   - `valid_until > valid_from`
   - 允許建立未來生效的優惠券

4. **唯一性驗證**:
   - 基於 `code_normalized` 欄位（大寫版本）
   - 僅檢查 `status != 'deleted'` 的優惠券（軟刪除後可重建同代碼優惠券）

### 優惠券領取驗證

1. **有效性驗證**:
   - 優惠券存在且狀態為 `active`
   - 當前時間在 `valid_from` 與 `valid_until` 之間
   - 客戶未曾領取過該優惠券（`UNIQUE (user_id, coupon_id)`）

2. **重複領取檢查**:
   - 資料庫唯一性約束自動阻止重複領取

### 優惠券使用驗證

1. **等級限制驗證**:
   - 若 `coupon_tier_restrictions` 有記錄，檢查客戶等級是否在限制列表中
   - 無記錄則無限制

2. **最低金額驗證**:
   - 計算購物車總額（若有系列限制，僅計算限定系列商品）
   - 檢查是否 >= `min_order_amount`

3. **系列限制驗證**:
   - 若 `coupon_series_restrictions` 有記錄，僅計算限定系列商品金額
   - 無記錄則計算全部商品金額

4. **折扣計算規則**:
   - 現金折扣：`discount_amount = MIN(discount_value, eligible_amount)`
   - 百分比折扣：`discount_amount = eligible_amount * (discount_value / 100)`
   - 折扣後金額不可為負數（`final_amount >= 0`）

---

## Performance Considerations

### 索引策略

1. **查詢優化**:
   - `idx_coupons_code_normalized`: 客戶輸入代碼時快速查詢（< 10ms）
   - `idx_coupons_valid_time`: 過濾有效期內的優惠券
   - `idx_user_coupons_user_id`: 客戶查詢自己的優惠券列表

2. **避免全表掃描**:
   - `code_normalized` 使用 UNIQUE 索引，查詢特定優惠券時效能佳
   - `user_id` 索引，客戶查詢自己的優惠券不需掃描全表

### Generated Column 效能

- `code_normalized` 使用 `STORED` 模式，查詢時不需即時計算
- 索引建立在 `code_normalized` 上，查詢效能與普通欄位相同

### 資料量估算

假設優惠券系統使用情況：
- 同時有效優惠券：50-100 張
- 累積歷史優惠券：1,000 張
- 客戶領取記錄（1 年）：10,000 筆
- 訂單優惠券快照（1 年）：5,000 筆

當前索引策略可支援 10 萬筆領取記錄，查詢效能仍可維持 < 1s。

---

## Migration File

完整的 Migration 檔案位於：
- `supabase/migrations/20260107_create_coupons.sql`

包含：
1. 建立 `coupons`, `coupon_tier_restrictions`, `coupon_series_restrictions`, `user_coupons`, `order_coupons` 表
2. 建立所有索引
3. 建立 `active_coupons` View
4. 建立 RLS Policies
5. 建立觸發器 (update_updated_at_column)

---

**Status**: ✅ Completed
**Next**: API Contracts (contracts/coupons.ts)
**Date**: 2026-01-06
