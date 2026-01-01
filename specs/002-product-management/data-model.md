# Data Model: 商品管理系統

**Feature**: 002-product-management
**Date**: 2026-01-02
**Status**: Phase 1 Design Complete

## 概述

本文件定義商品管理系統所需的資料庫結構,包含實體關係、欄位定義、約束條件及索引策略。設計遵循憲章「負庫存支援」原則,並整合 Supabase Storage 進行圖片管理。

---

## 實體關係圖 (ERD)

```
┌─────────────────┐         ┌─────────────────┐
│   categories    │ 1:N     │    products     │
│  ───────────────│◄────────│  ───────────────│
│ • id (PK)       │         │ • id (PK)       │
│ • name          │         │ • code (UNIQUE) │
│ • description   │         │ • name          │
│ • sort_order    │         │ • category_id(FK)│
│ • created_at    │         │ • description   │
│ • updated_at    │         │ • stock         │
└─────────────────┘         │ • unit          │
                            │ • image_url     │
                            │ • status        │
                            │ • created_at    │
                            │ • updated_at    │
                            └─────────────────┘

Supabase Storage:
┌───────────────────────┐
│  Bucket: products     │
│  ─────────────────────│
│  {product_id}/        │
│    └─ main.{ext}      │
│  placeholders/        │
│    └─ default.png     │
└───────────────────────┘
```

**關鍵關係**:
- `categories` ← `products`: 1:N (一個分類可有多個商品)
- `products.category_id` → `categories.id`: `ON DELETE RESTRICT` (保護已使用的分類)

---

## 實體定義

### 1. categories (商品分類)

**用途**: 組織商品為不同類別,方便客戶篩選與管理

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 分類唯一識別碼 |
| `name` | TEXT | NOT NULL, UNIQUE | 分類名稱 (如: 飲料、零食、日用品) |
| `description` | TEXT | NULLABLE | 分類描述 (選填) |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | 排序權重 (數字越小越優先顯示) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 最後更新時間 (觸發器自動更新) |

**索引**:
```sql
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
```

**業務規則**:
- `name` 必須唯一,避免重複分類名稱造成混淆
- `sort_order` 用於前台列表排序,可透過拖曳調整
- 刪除保護: 若該分類有關聯的 products,禁止刪除 (透過外鍵約束 `ON DELETE RESTRICT`)

**範例資料**:
```sql
INSERT INTO categories (name, description, sort_order) VALUES
  ('飲料', '各式飲料商品', 1),
  ('零食', '零食與點心', 2),
  ('日用品', '日常用品', 3);
```

---

### 2. products (商品)

**用途**: 儲存商品基本資料、庫存與圖片

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 商品唯一識別碼 |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | 商品編號 (SKU),用於快速查詢 |
| `name` | TEXT | NOT NULL | 商品名稱 |
| `category_id` | UUID | NOT NULL, REFERENCES categories(id) ON DELETE RESTRICT | 商品分類 |
| `description` | TEXT | NULLABLE | 商品描述 (選填) |
| `stock` | INTEGER | NOT NULL, DEFAULT 0 | 庫存數量 (支援負數) |
| `unit` | TEXT | NOT NULL, DEFAULT '件' | 單位 (如: 件、箱、盒、包) |
| `image_url` | TEXT | NULLABLE | 商品圖片 URL (Supabase Storage) |
| `status` | TEXT | NOT NULL, DEFAULT 'active', CHECK (status IN ('active', 'inactive')) | 商品狀態 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 最後更新時間 (觸發器自動更新) |

**索引**:
```sql
-- 基礎索引 (總是啟用)
CREATE UNIQUE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- 全文搜尋索引 (商品數量 > 1000 筆時啟用)
-- 註解說明: 當商品數量超過 1000 筆時,取消註解以啟用 Full-Text Search
-- CREATE INDEX idx_products_search ON products USING GIN (
--   to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(code, ''))
-- );
```

**欄位型別選擇說明**:

| 欄位 | 型別 | 理由 |
|------|------|------|
| `code` | `VARCHAR(50)` | 限制長度提升索引效能,防止過長編號 |
| `name` | `TEXT` | 商品名稱長度不定,使用 TEXT 更彈性 |
| `stock` | `INTEGER` | 支援負數 (欠貨/預購),範圍 -2^31 ~ 2^31-1 足夠使用 |
| `image_url` | `TEXT` | 儲存完整 Supabase Storage 公開 URL |
| `status` | `TEXT` | 使用 CHECK 約束限制為 'active' 或 'inactive',實作軟刪除 |

**外鍵行為**:
- `category_id` → `categories(id)`: `ON DELETE RESTRICT` (禁止刪除有商品使用的分類)

**業務規則**:
- **商品編號 (code)**:
  - 必須唯一,用於快速查詢與識別
  - 建議格式: 字母+數字 (如 `A001`, `DRINK-001`)
  - 僅允許英數字、連字號、底線 (由 Zod Schema 驗證)

- **庫存 (stock)**:
  - 支援負數,代表欠貨/預購狀態
  - 下單時不檢查庫存是否足夠 (遵循憲章「負庫存支援」原則)
  - 前端顯示策略:
    - `stock > 0`: 顯示 "庫存 {stock}"
    - `stock === 0`: 顯示 "暫無庫存"
    - `stock < 0`: 顯示 "欠貨 {Math.abs(stock)} 單位 (可預購)"

- **狀態 (status)**:
  - `active`: 啟用中 (客戶可見可購買)
  - `inactive`: 停用 (不顯示於前台,實作軟刪除)

**範例資料**:
```sql
-- 取得飲料分類 ID
WITH category_id AS (
  SELECT id FROM categories WHERE name = '飲料' LIMIT 1
)
INSERT INTO products (code, name, category_id, stock, unit, status) VALUES
  ('DRINK-001', '可口可樂 350ml', (SELECT id FROM category_id), 100, '罐', 'active'),
  ('DRINK-002', '雪碧 350ml', (SELECT id FROM category_id), 50, '罐', 'active');
```

---

## 資料驗證規則

### 商品編號格式
- **格式**: 英數字、連字號、底線 (建議 5-20 字元)
- **範例**: `A001`, `DRINK-001`, `SKU_12345`
- **驗證**: 應用層使用 Zod Schema 驗證 (`/^[A-Za-z0-9-_]+$/`)

### 商品名稱
- **長度**: 1-200 字元
- **驗證**: Zod Schema `z.string().min(1).max(200)`

### 庫存數值
- **範圍**: -2,147,483,648 ~ 2,147,483,647 (INTEGER 範圍)
- **驗證**: Zod Schema `z.coerce.number().int()`

### 單位
- **常見值**: 件、箱、盒、包、罐、瓶、袋、條
- **驗證**: Zod Schema `z.string().min(1)`

---

## 狀態轉換

### Category 生命週期
```
[建立] → [啟用中] → [刪除檢查]
                         ├─ 有商品使用 → [禁止刪除]
                         └─ 無商品使用 → [已刪除]
```

### Product 生命週期
```
[建立] → [啟用中] → [管理員停用] → [停用狀態]
            ↓                         ↓
      [客戶可見可購]              [客戶不可見]
            ↓
      [刪除檢查]
         ├─ 有訂單記錄 → [改為 inactive 軟刪除]
         └─ 無訂單記錄 → [刪除商品 + 刪除圖片]
```

---

## Supabase Storage 配置

### Bucket 設定

**Bucket 名稱**: `products`

**建立指令** (在 Supabase Dashboard 執行):
```sql
-- 1. 建立 products bucket (公開讀取)
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true);
```

### 資料夾結構

```
products/
├── {product_id}/
│   └── main.{ext}          # 主圖片 (jpg/png/webp)
└── placeholders/
    └── default.png         # 預設佔位圖
```

### 圖片檔案規格

| 項目 | 規格 |
|------|------|
| **格式** | JPEG, PNG, WebP |
| **大小限制** | 5MB |
| **建議尺寸** | 800x800px (正方形) |
| **命名規則** | `{product_id}/main.{ext}` |

**範例**:
```
products/550e8400-e29b-41d4-a716-446655440000/main.jpg
products/6ba7b810-9dad-11d1-80b4-00c04fd430c8/main.png
```

### RLS (Row Level Security) 策略

```sql
-- 允許公開讀取 (所有人可看圖片)
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'products');

-- 允許管理員上傳
CREATE POLICY "Allow admin to upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員更新
CREATE POLICY "Allow admin to update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員刪除
CREATE POLICY "Allow admin to delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 圖片上傳流程

```typescript
// 1. 管理員上傳圖片 (透過 Server Action)
const result = await uploadProductImage(productId, file)

// 2. Server Action 驗證格式與大小
// 3. 上傳至 Storage (覆寫模式,upsert: true)
const filePath = `${productId}/main.${ext}`
supabase.storage.from('products').upload(filePath, file, { upsert: true })

// 4. 取得公開 URL
const { data } = supabase.storage.from('products').getPublicUrl(filePath)

// 5. 更新 products.image_url
supabase.from('products').update({ image_url: publicUrl }).eq('id', productId)
```

### 圖片刪除流程

```typescript
// 刪除商品時清理圖片 (刪除所有可能的副檔名)
await supabase.storage.from('products').remove([
  `${productId}/main.jpg`,
  `${productId}/main.png`,
  `${productId}/main.webp`
])
// 註: 不檢查錯誤,因為圖片可能不存在
```

---

## 查詢模式

### 常見查詢場景

#### 1. 前台商品列表 (客戶)
```sql
-- 查詢啟用中商品,依分類排序
SELECT
  p.id,
  p.code,
  p.name,
  p.stock,
  p.unit,
  p.image_url,
  c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active'
ORDER BY c.sort_order ASC, p.created_at DESC
LIMIT 20 OFFSET 0;
```

#### 2. 依分類篩選
```sql
SELECT * FROM products
WHERE category_id = 'target-category-uuid'
  AND status = 'active'
ORDER BY created_at DESC;
```

#### 3. 商品搜尋 (初期: ILIKE 查詢)
```sql
-- 搜尋商品編號或名稱
SELECT * FROM products
WHERE (code ILIKE '%keyword%' OR name ILIKE '%keyword%')
  AND status = 'active'
LIMIT 20;
```

#### 4. 商品搜尋 (進階: Full-Text Search,商品 > 1000 筆時啟用)
```sql
-- 使用 GIN 索引進行全文搜尋
SELECT * FROM products
WHERE to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(code, ''))
      @@ to_tsquery('simple', 'coffee')
  AND status = 'active'
ORDER BY ts_rank(
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(code, '')),
  to_tsquery('simple', 'coffee')
) DESC
LIMIT 20;
```

#### 5. 檢查分類是否可刪除
```sql
-- 若回傳 count > 0,則禁止刪除
SELECT COUNT(*)
FROM products
WHERE category_id = 'target-category-uuid';
```

#### 6. 檢查商品是否可硬刪除
```sql
-- 若回傳 count > 0,則使用軟刪除 (改為 inactive)
SELECT COUNT(*)
FROM order_items  -- 未來實作訂單功能時
WHERE product_id = 'target-product-uuid';
```

---

## 效能考量

### 索引策略

| 索引名稱 | 索引類型 | 覆蓋欄位 | 使用場景 | 效能預期 |
|---------|---------|---------|---------|---------|
| `idx_products_code` | B-tree (UNIQUE) | `code` | 商品編號精確查詢 | < 5ms |
| `idx_products_name` | B-tree | `name` | 商品名稱排序 | < 20ms |
| `idx_products_category_id` | B-tree | `category_id` | 分類篩選 | < 10ms |
| `idx_products_status` | B-tree | `status` | 狀態篩選 | < 10ms |
| `idx_categories_sort_order` | B-tree | `sort_order` | 分類排序 | < 5ms |
| `idx_products_search` (選用) | GIN | `to_tsvector(name + code)` | 全文搜尋 (> 1000 筆) | < 100ms |

### 預期負載

- **資料規模**: 初期 500 商品,10-20 分類
- **查詢頻率**:
  - 商品列表: 高頻 (客戶瀏覽)
  - 商品搜尋: 高頻 (客戶查找)
  - 分類篩選: 中頻 (客戶操作)
  - 商品 CRUD: 低頻 (管理員操作)

### 優化建議

1. **初期 (< 1000 筆商品)**:
   - 使用 ILIKE 查詢商品名稱與編號
   - 不啟用 GIN Full-Text Search 索引
   - 查詢時間預期 < 50ms

2. **成長期 (> 1000 筆商品)**:
   - 啟用 GIN Full-Text Search 索引
   - 改用 `to_tsvector` 查詢
   - 查詢時間預期 < 100ms

3. **圖片優化**:
   - 前端使用 Next.js `<Image>` 元件自動優化
   - Supabase Storage 設定 `cacheControl: '3600'` (1小時)
   - 考慮使用 WebP 格式減少檔案大小

---

## 資料完整性保證

### 參照完整性
- ✅ `products.category_id` → `categories.id`: `ON DELETE RESTRICT` (保護有商品的分類)
- ✅ 未來: `order_items.product_id` → `products.id`: `ON DELETE RESTRICT` (保護有訂單的商品)

### 業務邏輯完整性
- ✅ CHECK 約束: 確保 `status` 僅為 'active' 或 'inactive'
- ✅ UNIQUE 約束: 防止重複的商品編號
- ✅ NOT NULL 約束: 必填欄位 (code, name, category_id, stock, unit, status)

### 觸發器

```sql
-- 自動更新 updated_at (重用現有函式)
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**註**: `update_updated_at_column()` 函式已在 001-user-tier-management 中建立,此處直接使用。

---

## Migration 策略

### Migration 檔案

**檔案位置**: `supabase/migrations/20260102_products_schema.sql`

**執行順序**:
1. 建立 `categories` 表
2. 建立 `products` 表
3. 建立索引 (基礎索引,不含 GIN)
4. 建立觸發器 (updated_at)
5. 建立 Supabase Storage Bucket
6. 建立 Storage RLS 策略
7. 插入預設分類資料

**完整 Migration SQL**:
```sql
-- ================================================
-- Vsale-lite Products Schema Migration
-- Feature: 002-product-management
-- Date: 2026-01-02
-- ================================================

-- 1. 建立商品分類表
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立商品表
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '件',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 建立索引
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE UNIQUE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- 4. 建立觸發器 (自動更新 updated_at)
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. 建立 Supabase Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 6. 建立 Storage RLS 策略
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'products');

CREATE POLICY "Allow admin to upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admin to update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admin to delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. 插入預設分類
INSERT INTO categories (name, description, sort_order) VALUES
  ('飲料', '各式飲料商品', 1),
  ('零食', '零食與點心', 2),
  ('日用品', '日常用品', 3);

-- 8. 啟用 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 9. 建立 RLS 策略 (資料表)
-- 允許所有已認證使用者讀取分類
CREATE POLICY "Allow authenticated users to read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- 允許管理員管理分類
CREATE POLICY "Allow admin to manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許所有已認證使用者讀取商品 (客戶僅能看 active,管理員看全部)
CREATE POLICY "Allow users to read products"
  ON products FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員管理商品
CREATE POLICY "Allow admin to manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### Rollback 策略

```sql
-- Rollback Script
DROP POLICY IF EXISTS "Allow admin to manage products" ON products;
DROP POLICY IF EXISTS "Allow users to read products" ON products;
DROP POLICY IF EXISTS "Allow admin to manage categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON categories;

DROP POLICY IF EXISTS "Allow admin to delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'products';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
```

---

## 未來擴充性

### 已預留欄位
- `categories.description`: 分類描述
- `products.description`: 商品描述

### 可能的擴充方向

1. **多圖片支援**:
   - 新增 `product_images` 表
   - 保留 `products.image_url` 作為主圖
   - Storage 結構改為 `{product_id}/1.jpg`, `{product_id}/2.jpg`

2. **商品規格變體**:
   - 新增 `product_variants` 表 (如: 不同尺寸/顏色)
   - 每個變體有獨立的 SKU 與庫存

3. **階層式分類**:
   - 新增 `categories.parent_id` 欄位
   - 支援多層分類 (如: 飲料 > 咖啡 > 美式咖啡)

4. **全文搜尋優化**:
   - 啟用 GIN 索引 (`idx_products_search`)
   - 使用 PostgreSQL Full-Text Search

**擴充原則**: 所有新增表格必須符合憲章「正規化設計」原則,避免在既有表格新增過多欄位。

---

## 總結

本資料模型設計完整支援:
- ✅ 商品與分類 CRUD
- ✅ 負庫存管理 (支援負數)
- ✅ 軟刪除機制 (status 欄位)
- ✅ Supabase Storage 圖片管理
- ✅ 搜尋與篩選 (初期 ILIKE,進階 Full-Text Search)
- ✅ 效能優化 (索引策略)
- ✅ 資料完整性 (約束與外鍵)
- ✅ RLS 安全性 (管理員/客戶權限分離)

**下一步**: 定義 API Contracts (Server Actions 介面規格)
