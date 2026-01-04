# 安全 Migration 指南

## 目錄
1. [Migration 類型分類](#migration-類型分類)
2. [安全操作範例](#安全操作範例)
3. [危險操作與替代方案](#危險操作與替代方案)
4. [生產環境部署流程](#生產環境部署流程)
5. [備份與還原](#備份與還原)

---

## Migration 類型分類

### ✅ 安全的 Migration（不會丟失資料）

這些操作可以直接執行，不會影響現有資料：

#### 1. 新增欄位（ADD COLUMN）
```sql
-- ✅ 安全：新增欄位並設定預設值
ALTER TABLE products
ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0.00;

-- ✅ 安全：新增可為 NULL 的欄位
ALTER TABLE orders
ADD COLUMN shipping_note TEXT;
```

#### 2. 新增資料表（CREATE TABLE）
```sql
-- ✅ 安全：新增新表不影響現有資料
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. 新增索引（CREATE INDEX）
```sql
-- ✅ 安全：建立索引不影響資料
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ✅ 使用 CONCURRENTLY 避免鎖表
CREATE INDEX CONCURRENTLY idx_products_name ON products(name);
```

#### 4. 新增約束（不影響現有資料）
```sql
-- ✅ 安全：新增 CHECK 約束（現有資料符合條件）
ALTER TABLE products
ADD CONSTRAINT check_price_positive
CHECK (price >= 0);
```

#### 5. 修改欄位型別（擴大範圍）
```sql
-- ✅ 安全：VARCHAR(50) → VARCHAR(100)
ALTER TABLE users
ALTER COLUMN username TYPE VARCHAR(100);

-- ✅ 安全：INTEGER → BIGINT
ALTER TABLE products
ALTER COLUMN stock TYPE BIGINT;
```

---

### ⚠️ 危險的 Migration（可能丟失資料）

這些操作需要特別小心處理：

#### 1. 刪除欄位（DROP COLUMN）
```sql
-- ❌ 危險：資料會永久遺失
ALTER TABLE products DROP COLUMN old_price;

-- ✅ 替代方案：先標記為已棄用，等確認沒問題再刪除
-- Step 1: 停止應用程式使用該欄位
-- Step 2: 等待一段時間（如 30 天）
-- Step 3: 確認無問題後再執行刪除
```

#### 2. 刪除資料表（DROP TABLE）
```sql
-- ❌ 危險：整張表資料遺失
DROP TABLE old_products;

-- ✅ 替代方案：重新命名表，保留一段時間
ALTER TABLE old_products RENAME TO deprecated_products_backup;
-- 30 天後確認沒問題再刪除
```

#### 3. 修改欄位型別（縮小範圍）
```sql
-- ❌ 危險：可能導致資料截斷
ALTER TABLE users
ALTER COLUMN username TYPE VARCHAR(20);  -- 原本是 VARCHAR(50)

-- ✅ 替代方案：先檢查資料，確認沒有超過長度的記錄
SELECT id, username, LENGTH(username) as len
FROM users
WHERE LENGTH(username) > 20;
-- 如果沒有記錄才執行修改
```

#### 4. 重新命名欄位（RENAME COLUMN）
```sql
-- ⚠️ 需要應用程式同步更新
ALTER TABLE products
RENAME COLUMN old_name TO new_name;

-- ✅ 替代方案：分階段執行
-- Step 1: 新增新欄位
ALTER TABLE products ADD COLUMN new_name TEXT;

-- Step 2: 資料遷移
UPDATE products SET new_name = old_name;

-- Step 3: 更新應用程式使用新欄位
-- Step 4: 確認無問題後刪除舊欄位
ALTER TABLE products DROP COLUMN old_name;
```

#### 5. 修改 NOT NULL 約束
```sql
-- ❌ 危險：現有 NULL 值會導致失敗
ALTER TABLE products
ALTER COLUMN description SET NOT NULL;

-- ✅ 替代方案：先填充 NULL 值
UPDATE products SET description = '' WHERE description IS NULL;
-- 然後再設定 NOT NULL
ALTER TABLE products ALTER COLUMN description SET NOT NULL;
```

---

## 安全操作範例

### 範例 1：新增優惠券功能

```sql
-- Migration: 20260105_add_coupons.sql

-- Step 1: 建立優惠券表（安全）
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_usage INTEGER DEFAULT NULL,
  current_usage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 建立索引（安全）
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_valid ON coupons(valid_from, valid_until);

-- Step 3: 新增 RLS 政策（安全）
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "客戶可查看有效優惠券"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    valid_from <= NOW() AND
    valid_until >= NOW() AND
    (max_usage IS NULL OR current_usage < max_usage)
  );

CREATE POLICY "管理員可管理優惠券"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 4: 在訂單表新增優惠券欄位（安全）
ALTER TABLE orders
ADD COLUMN coupon_id UUID REFERENCES coupons(id),
ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0;

-- Step 5: 建立關聯索引（安全）
CREATE INDEX idx_orders_coupon_id ON orders(coupon_id);
```

### 範例 2：修改商品增加多圖片支援

```sql
-- Migration: 20260106_add_product_images.sql

-- Step 1: 建立商品圖片表（安全，不影響現有 products 表）
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 建立索引
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary)
  WHERE is_primary = true;

-- Step 3: 遷移現有圖片資料（安全，不刪除原欄位）
INSERT INTO product_images (product_id, image_url, is_primary, display_order)
SELECT id, image_url, true, 0
FROM products
WHERE image_url IS NOT NULL;

-- Step 4: RLS 政策
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可查看商品圖片"
  ON product_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "管理員可管理商品圖片"
  ON product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 注意：不刪除 products.image_url 欄位
-- 等應用程式完全遷移到新結構後，再執行另一個 Migration 刪除
```

---

## 危險操作與替代方案

### 案例 1：重構訂單狀態欄位

**需求**：將訂單狀態從字串改為 ENUM

#### ❌ 危險做法（會中斷服務）
```sql
-- 這樣會導致應用程式錯誤
ALTER TABLE orders ALTER COLUMN status TYPE order_status_enum;
```

#### ✅ 安全做法（零停機部署）

**Migration 1: 準備新欄位**
```sql
-- 20260105_01_add_new_status_column.sql

-- Step 1: 建立 ENUM 型別
CREATE TYPE order_status_enum AS ENUM (
  'pending', 'confirmed', 'shipping', 'completed', 'cancelled'
);

-- Step 2: 新增新欄位
ALTER TABLE orders ADD COLUMN status_new order_status_enum;

-- Step 3: 遷移資料
UPDATE orders SET status_new = status::order_status_enum;

-- Step 4: 設定預設值
ALTER TABLE orders ALTER COLUMN status_new SET DEFAULT 'pending'::order_status_enum;
```

**應用程式更新**：同時讀寫兩個欄位

**Migration 2: 切換欄位**（應用程式部署後執行）
```sql
-- 20260105_02_switch_status_column.sql

-- Step 1: 重新命名欄位
ALTER TABLE orders RENAME COLUMN status TO status_old;
ALTER TABLE orders RENAME COLUMN status_new TO status;

-- Step 2: 等待一段時間確認無問題
```

**Migration 3: 清理舊欄位**（30 天後執行）
```sql
-- 20260205_cleanup_old_status.sql
ALTER TABLE orders DROP COLUMN status_old;
```

---

## 生產環境部署流程

### 部署前檢查清單

```bash
# 1. 在本地測試環境執行 Migration
supabase db reset
pnpm dev

# 2. 檢查 Migration 檔案
cat supabase/migrations/20260105_your_migration.sql

# 3. 確認沒有危險操作
# - DROP TABLE / DROP COLUMN
# - 修改欄位型別（縮小範圍）
# - 新增 NOT NULL 約束（未填充資料）

# 4. 執行型別檢查
pnpm type-check

# 5. 執行測試
pnpm test
```

### 部署步驟

#### 方案 A：直接部署（適用於安全 Migration）

```bash
# 1. 備份生產資料庫（重要！）
# 在 Supabase Dashboard → Database → Backups
# 或使用 pg_dump
pg_dump -h your-db.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# 2. 推送 Migration 到生產環境
supabase link --project-ref qwovavytryvgchcowjof
supabase db push

# 3. 部署應用程式
firebase deploy --only hosting

# 4. 驗證功能正常
# - 檢查新功能
# - 確認舊功能未受影響
```

#### 方案 B：藍綠部署（適用於複雜 Migration）

```bash
# 1. 部署 Migration（向後相容）
supabase db push

# 2. 部署新版應用程式（同時支援新舊結構）
firebase deploy --only hosting

# 3. 監控一段時間（1-7 天）

# 4. 清理舊結構（如果需要）
# 執行清理 Migration
```

---

## 備份與還原

### 自動備份設定

Supabase 提供自動備份功能：
- **每日備份**：保留 7 天
- **每週備份**：保留 4 週
- **每月備份**：保留 3 個月

在 Supabase Dashboard 設定：
1. 進入 Settings → Database
2. 啟用 Automatic Backups
3. 設定備份頻率

### 手動備份

```bash
# 備份整個資料庫
pg_dump \
  -h db.qwovavytryvgchcowjof.supabase.co \
  -U postgres \
  -d postgres \
  -F custom \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# 備份特定表
pg_dump \
  -h db.qwovavytryvgchcowjof.supabase.co \
  -U postgres \
  -d postgres \
  -t orders -t order_items \
  -F custom \
  -f orders_backup_$(date +%Y%m%d).dump
```

### 還原資料

```bash
# 還原整個資料庫
pg_restore \
  -h db.qwovavytryvgchcowjof.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backup_20260105.dump

# 還原特定表
pg_restore \
  -h db.qwovavytryvgchcowjof.supabase.co \
  -U postgres \
  -d postgres \
  -t orders \
  backup_20260105.dump
```

---

## 緊急回滾程序

### 如果 Migration 出錯

#### 1. 立即回滾應用程式
```bash
# 回到上一個版本
firebase hosting:channel:deploy previous-version
```

#### 2. 回滾 Migration

**方案 A：使用備份還原**
```bash
# 還原到 Migration 前的狀態
pg_restore -h your-db.supabase.co -U postgres -d postgres -c backup_before_migration.dump
```

**方案 B：執行反向 Migration**
```sql
-- 如果是新增欄位，刪除欄位
ALTER TABLE products DROP COLUMN new_column;

-- 如果是新增表，刪除表
DROP TABLE new_table;

-- 如果是修改欄位，改回原樣
ALTER TABLE products ALTER COLUMN price TYPE INTEGER;
```

#### 3. 通知用戶
準備公告模板，說明系統維護與預計恢復時間

---

## 最佳實踐總結

### ✅ DO（應該做）

1. **每次部署前備份資料庫**
2. **優先使用新增操作**（ADD COLUMN, CREATE TABLE）
3. **分階段執行複雜變更**（新增 → 遷移 → 刪除）
4. **在測試環境完整測試**
5. **使用交易（BEGIN/COMMIT）包裹多個操作**
6. **建立索引時使用 CONCURRENTLY**（避免鎖表）
7. **保留舊結構一段時間**（至少 7-30 天）
8. **記錄每次 Migration 的影響範圍**
9. **準備回滾計畫**

### ❌ DON'T（不應該做）

1. **不要直接刪除欄位或表**（先重新命名）
2. **不要在尖峰時段執行 Migration**
3. **不要跳過備份**
4. **不要在生產環境測試 Migration**
5. **不要一次執行多個複雜 Migration**
6. **不要修改主鍵或外鍵**（除非絕對必要）
7. **不要使用 CASCADE 刪除**（除非完全理解影響）

---

## Migration 範本

### 安全新增功能範本

```sql
-- Migration: 20260105_add_feature_name.sql
-- Description: 新增 XXX 功能
-- Impact: 無資料遺失風險
-- Rollback: DROP TABLE/COLUMN if needed

BEGIN;

-- Step 1: 建立新表
CREATE TABLE feature_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 欄位定義
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: 建立索引
CREATE INDEX idx_feature_table_field ON feature_table(field);

-- Step 3: RLS 政策
ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;
-- 政策定義...

-- Step 4: 新增關聯欄位（如需要）
ALTER TABLE existing_table
ADD COLUMN feature_id UUID REFERENCES feature_table(id);

COMMIT;
```

---

**最後更新**: 2026-01-05
**文件版本**: 1.0.0
