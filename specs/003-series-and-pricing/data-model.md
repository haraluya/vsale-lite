# Data Model: 商品系列與等級價格管理

**Feature**: 003-series-and-pricing
**Date**: 2026-01-02
**Status**: Phase 1 Design

## Schema Overview

本功能新增 2 個資料表（`series`, `tier_prices`），修改 2 個資料表（`categories`, `products`）。

```
categories (修改)
    ↓ 1:N
  series (新增)
    ↓ 1:N
 products (修改)
    ↓ N:M (透過 tier_prices)
  tiers (既有)

tier_prices (新增): 連接 products ↔ tiers
```

---

## Entity Definitions

### 1. categories (修改)

**用途**: 商品分類（最上層），新增分類代碼欄位用於商品編號生成。

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 主鍵 |
| name | TEXT | NOT NULL | 分類名稱（如「飲料」） |
| **code** | **VARCHAR(10)** | **UNIQUE, NOT NULL, CHECK (格式 ^[A-Z]{3,10}$)** | **🆕 分類代碼（如 DRK）** |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 排序權重 |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK (IN 'active', 'inactive') | 狀態 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新時間 |

**索引**:
- `UNIQUE(code)`: 確保分類代碼唯一

**約束**:
- `CHECK (code ~ '^[A-Z]{3,10}$')`: 分類代碼必須為 3-10 個大寫字母

**範例資料**:
```sql
INSERT INTO categories (name, code) VALUES
  ('飲料', 'DRK'),
  ('零食', 'SNK'),
  ('日用品', 'DAI');
```

---

### 2. series (新增)

**用途**: 商品系列（中間層），組織商品的集合，如「美粒果系列果汁」。

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 主鍵 |
| category_id | UUID | FK → categories(id) ON DELETE RESTRICT, NULLABLE | 所屬分類（可為 NULL） |
| name | TEXT | NOT NULL | 系列名稱 |
| description | TEXT | NULLABLE | 系列描述 |
| image_url | TEXT | NULLABLE | 系列主圖 URL（Supabase Storage 路徑） |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK (IN 'active', 'inactive') | 系列狀態 |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 排序權重（同分類內排序） |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新時間 |

**索引**:
- `idx_series_category_id ON series(category_id)`: 加速分類查詢
- `idx_series_status ON series(status)`: 加速狀態過濾
- `idx_series_sort_order ON series(sort_order)`: 加速排序

**關聯**:
- **1:N with products**: 一個系列包含多個商品

**刪除保護**:
- `ON DELETE RESTRICT`: 若系列下仍有商品，禁止刪除系列

**RLS 策略**:
```sql
-- 客戶僅能讀取 active 系列
CREATE POLICY "Allow authenticated users to read active series"
  ON series FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 管理員可管理所有系列
CREATE POLICY "Allow admin to manage series"
  ON series FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

### 3. products (修改)

**用途**: 商品單品，修改為關聯系列（取代原有的 category_id），新增原價與庫存狀態。

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 主鍵 |
| **series_id** | **UUID** | **FK → series(id) ON DELETE RESTRICT, NOT NULL** | **🆕 所屬系列（取代 category_id）** |
| ~~category_id~~ | ~~UUID~~ | ~~已刪除~~ | ~~原有關聯分類欄位（已移除）~~ |
| code | VARCHAR(50) | UNIQUE, NOT NULL, **自動產生** | 商品編號（如 DRK-0001） |
| name | TEXT | NOT NULL | 商品名稱 |
| **retail_price** | **DECIMAL(10, 2)** | **NULLABLE, CHECK (>= 0)** | **🆕 原價/建議售價** |
| stock | INTEGER | NOT NULL, DEFAULT 0 | 實際庫存數量（可為負數） |
| **stock_status** | **TEXT** | **NOT NULL, DEFAULT 'sufficient', CHECK (IN 'sufficient', 'low', 'out_of_stock')** | **🆕 庫存狀態** |
| unit | TEXT | NOT NULL, DEFAULT '件' | 單位 |
| image_url | TEXT | NULLABLE | 商品主圖 URL |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK (IN 'active', 'inactive') | 商品狀態 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新時間 |

**索引**:
- `UNIQUE(code)`: 確保商品編號唯一
- `idx_products_series_id ON products(series_id)`: 加速系列查詢
- `idx_products_stock_status ON products(stock_status)`: 加速庫存狀態過濾

**自動編號邏輯**:
- Trigger `trigger_auto_generate_product_code` 在 INSERT 前執行
- Function `generate_product_code(series_id)` 產生編號

**關聯**:
- **N:1 with series**: 多個商品屬於一個系列
- **N:M with tiers (透過 tier_prices)**: 多個商品對應多個等級價格

**RLS 策略**:
```sql
-- 客戶僅能讀取 active 商品（且系列也必須 active）
CREATE POLICY "Allow users to read active products in active series"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = products.series_id
      AND (
        (products.status = 'active' AND s.status = 'active') OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );
```

---

### 4. tier_prices (新增)

**用途**: 等級價格表，儲存每個商品在每個會員等級的對應價格。

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 主鍵 |
| tier_id | UUID | FK → tiers(id) ON DELETE CASCADE, NOT NULL | 會員等級 ID |
| product_id | UUID | FK → products(id) ON DELETE CASCADE, NOT NULL | 商品 ID |
| price | DECIMAL(10, 2) | NOT NULL, CHECK (>= 0) | 該等級對應的價格 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新時間 |
| **UNIQUE(tier_id, product_id)** | - | **複合唯一鍵** | **確保每個等級 × 商品只有一個價格** |

**索引**:
- `idx_tier_prices_tier_id ON tier_prices(tier_id)`: 加速等級查詢
- `idx_tier_prices_product_id ON tier_prices(product_id)`: 加速商品查詢
- `idx_tier_prices_lookup ON tier_prices(tier_id, product_id)`: 複合索引，加速價格查詢

**關聯**:
- **N:1 with tiers**: 多個價格記錄屬於一個等級
- **N:1 with products**: 多個價格記錄屬於一個商品

**刪除策略**:
- `ON DELETE CASCADE`: 商品或等級刪除時，對應價格記錄自動刪除

**RLS 策略**:
```sql
-- 所有已認證用戶可讀（Server Action 負責過濾 tier_id）
CREATE POLICY "Allow authenticated users to read tier_prices"
  ON tier_prices FOR SELECT
  TO authenticated
  USING (true);

-- 管理員可管理所有價格
CREATE POLICY "Allow admin to manage tier_prices"
  ON tier_prices FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## Relationships Diagram

```
┌─────────────────┐
│   categories    │
│  (分類)         │
│  - id           │
│  - name         │
│  - code (新增)  │
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐
│     series      │
│  (系列)         │
│  - id           │
│  - category_id  │
│  - name         │
│  - image_url    │
│  - status       │
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐      ┌─────────────────┐
│    products     │      │   tier_prices   │
│  (商品)         │◄────►│  (等級價格)     │
│  - id           │ N:M  │  - tier_id      │
│  - series_id    │      │  - product_id   │
│  - code (自動)  │      │  - price        │
│  - retail_price │      └────────┬────────┘
│  - stock_status │               │ N:1
└─────────────────┘               ↓
                          ┌─────────────────┐
                          │      tiers      │
                          │  (會員等級)     │
                          │  - id           │
                          │  - name         │
                          │  - rank         │
                          └─────────────────┘
```

---

## Data Migration Strategy

### Phase 1: 新增資料表與欄位

1. 修改 `categories` 表，新增 `code` 欄位
2. 建立 `series` 表
3. 建立 `tier_prices` 表
4. 修改 `products` 表，新增 `series_id`, `retail_price`, `stock_status`

### Phase 2: 資料遷移

1. 為每個分類建立「未分類系列」：
   ```sql
   INSERT INTO series (category_id, name, description, status, sort_order)
   SELECT id, name || ' - 未分類', '自動遷移的商品暫存系列', 'active', 999
   FROM categories;
   ```

2. 將現有商品遷移到對應的「未分類系列」：
   ```sql
   UPDATE products p
   SET series_id = s.id
   FROM series s
   INNER JOIN categories c ON s.category_id = c.id
   WHERE p.category_id = c.id AND s.name LIKE '%未分類%';
   ```

3. 驗證所有商品都有 `series_id`（檢查 NULL）

4. 設定 `series_id` 為 NOT NULL

5. 刪除 `products.category_id` 欄位

### Phase 3: 自動編號邏輯

1. 建立 `generate_product_code(series_id)` Function
2. 建立 `auto_generate_product_code()` Trigger Function
3. 建立 Trigger `trigger_auto_generate_product_code`

### Phase 4: RLS 策略

1. 啟用 `series` 表 RLS
2. 啟用 `tier_prices` 表 RLS
3. 更新 `products` 表 RLS（改為透過 series 判斷 active）

---

## Validation Rules

### categories.code

- **格式**: 3-10 個大寫字母（正則：`^[A-Z]{3,10}$`）
- **唯一性**: UNIQUE 約束
- **範例**: `DRK`, `SNK`, `DAIRY`, `HOUSEHOLD`

### products.code

- **格式**: `<category_code>-<4位數字>`（正則：`^[A-Z]{3,10}-\d{4}$`）
- **唯一性**: UNIQUE 約束
- **自動產生**: INSERT 時 Trigger 自動產生，無需手動輸入
- **範例**: `DRK-0001`, `SNK-0042`

### products.stock_status

- **允許值**: `sufficient` (充足), `low` (緊張), `out_of_stock` (缺貨)
- **預設值**: `sufficient`
- **說明**: 與實際庫存數量 (stock) 分離，由管理員手動設定

### tier_prices.price

- **型別**: DECIMAL(10, 2)
- **約束**: 必須 >= 0
- **唯一性**: (tier_id, product_id) 複合唯一鍵

---

## State Transitions

### series.status

```
[新建] → active (預設)
active → inactive (下架)
inactive → active (重新上架)
[inactive + 無商品] → [刪除] (軟刪除，保留記錄)
```

### products.status

```
[新建] → active (預設)
active → inactive (下架)
inactive → active (重新上架)
```

### 前台顯示邏輯

```
顯示商品 = series.status = 'active' AND products.status = 'active'
```

---

## Performance Considerations

### 查詢優化

1. **系列列表查詢**（前台）:
   ```sql
   SELECT * FROM series
   WHERE category_id = $1 AND status = 'active'
   ORDER BY sort_order ASC;
   ```
   - 使用索引：`idx_series_category_id`, `idx_series_status`

2. **系列商品與價格查詢**（前台）:
   ```sql
   SELECT p.*, tp.price AS user_price
   FROM products p
   INNER JOIN series s ON p.series_id = s.id
   LEFT JOIN tier_prices tp ON p.id = tp.product_id AND tp.tier_id = $2
   WHERE p.series_id = $1 AND p.status = 'active' AND s.status = 'active';
   ```
   - 使用索引：`idx_products_series_id`, `idx_tier_prices_lookup`

3. **商品編號查詢**（自動產生時）:
   ```sql
   SELECT MAX(CAST(SUBSTRING(code FROM '\d+') AS INTEGER))
   FROM products p
   INNER JOIN series s ON p.series_id = s.id
   INNER JOIN categories c ON s.category_id = c.id
   WHERE c.code = $1 AND p.code ~ ('^' || $1 || '-\d{4}$');
   ```
   - 使用索引：`UNIQUE(code)`, `idx_products_series_id`

### 預期查詢量

- 系列列表查詢：100 req/min（前台首頁）
- 商品與價格查詢：200 req/min（系列詳情頁）
- 商品編號產生：10 req/min（後台建立商品）

---

## Security Notes

### RLS vs Server Actions 職責分離

| 層級 | 職責 | 範例 |
|------|------|------|
| **RLS (資料庫)** | 基本權限（authenticated vs admin, active vs inactive） | 客戶僅能讀取 active 系列 |
| **Server Actions (應用)** | 細粒度過濾（tier_id, user-specific data） | 僅查詢當前用戶的 tier_id 價格 |

### 價格安全性

- ❌ **禁止** 前端直接查詢 tier_prices 表
- ✅ **必須** 透過 Server Action 查詢，Server Action 過濾 `tier_id`
- ✅ 訂單建立時，價格從資料庫重新查詢（不信任前端傳遞的價格）

---

## Phase 1 Data Model Complete

✅ 所有實體定義完成
✅ 關聯圖與遷移策略明確
✅ 驗證規則與安全性策略完整

可進入下一步：生成 API 合約文件。
