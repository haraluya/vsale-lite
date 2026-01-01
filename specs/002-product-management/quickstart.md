# Quickstart Guide: 商品管理系統開發環境設定

**Feature**: 002-product-management
**Date**: 2026-01-02
**Estimated Setup Time**: 20 分鐘

## 概述

本指南幫助開發者快速設定商品管理系統的開發環境,包含資料庫 Migration、Supabase Storage 配置及測試資料準備。完成後即可開始開發商品與分類管理功能。

**前置需求**:
- ✅ 已完成 001-user-tier-management 功能
- ✅ Vsale-lite 專案已初始化
- ✅ Supabase 專案已建立並連線
- ✅ Next.js 開發伺服器可正常啟動

---

## Step 1: 執行資料庫 Migration

### 1.1 建立 Migration 檔案

**檔案位置**: `supabase/migrations/20260102_products_schema.sql`

建立檔案並貼上以下 SQL:

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

-- 允許使用者讀取商品 (客戶僅能看 active,管理員看全部)
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

### 1.2 執行 Migration

**方法 1: 使用 Supabase Dashboard (推薦)**

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案 → 側邊欄 "SQL Editor"
3. 點擊 "New Query"
4. 貼上上述 SQL
5. 點擊 "Run" 執行

**方法 2: 使用 Supabase CLI**

```bash
# 確認已登入 Supabase CLI
supabase login

# 執行 Migration
supabase db push
```

### 1.3 驗證 Migration 成功

在 Supabase Dashboard 執行以下查詢:

```sql
-- 檢查表是否建立成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('categories', 'products');

-- 檢查預設分類是否插入
SELECT * FROM categories ORDER BY sort_order;

-- 檢查 Storage Bucket 是否建立
SELECT * FROM storage.buckets WHERE id = 'products';
```

應該看到:
- ✅ `categories` 和 `products` 表已建立
- ✅ 3 個預設分類 (飲料、零食、日用品)
- ✅ `products` bucket 已建立

---

## Step 2: 建立測試資料

### 2.1 插入測試商品

在 Supabase SQL Editor 執行:

```sql
-- 取得飲料分類 ID
WITH drink_category AS (
  SELECT id FROM categories WHERE name = '飲料' LIMIT 1
)
INSERT INTO products (code, name, category_id, description, stock, unit, status)
SELECT
  'DRINK-001',
  '可口可樂 350ml',
  id,
  '經典可樂風味',
  100,
  '罐',
  'active'
FROM drink_category;

WITH drink_category AS (
  SELECT id FROM categories WHERE name = '飲料' LIMIT 1
)
INSERT INTO products (code, name, category_id, description, stock, unit, status)
SELECT
  'DRINK-002',
  '雪碧 350ml',
  id,
  '清爽檸檬風味',
  50,
  '罐',
  'active'
FROM drink_category;

-- 取得零食分類 ID
WITH snack_category AS (
  SELECT id FROM categories WHERE name = '零食' LIMIT 1
)
INSERT INTO products (code, name, category_id, description, stock, unit, status)
SELECT
  'SNACK-001',
  '乖乖奶油椰子',
  id,
  '台灣經典零食',
  200,
  '包',
  'active'
FROM snack_category;

-- 測試負庫存商品
WITH drink_category AS (
  SELECT id FROM categories WHERE name = '飲料' LIMIT 1
)
INSERT INTO products (code, name, category_id, description, stock, unit, status)
SELECT
  'DRINK-003',
  '芬達橘子 350ml',
  id,
  '果香橘子風味 (欠貨預購中)',
  -10,
  '罐',
  'active'
FROM drink_category;

-- 測試停用商品
WITH snack_category AS (
  SELECT id FROM categories WHERE name = '零食' LIMIT 1
)
INSERT INTO products (code, name, category_id, description, stock, unit, status)
SELECT
  'SNACK-999',
  '停產商品測試',
  id,
  '此商品已停產',
  0,
  '包',
  'inactive'
FROM snack_category;
```

### 2.2 驗證測試資料

```sql
-- 查詢所有商品
SELECT
  p.code,
  p.name,
  c.name AS category_name,
  p.stock,
  p.unit,
  p.status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at;
```

應該看到 5 筆測試商品,包含:
- ✅ 正常庫存商品
- ✅ 負庫存商品 (DRINK-003)
- ✅ 停用商品 (SNACK-999)

---

## Step 3: 建立 TypeScript 型別定義

### 3.1 更新 Database Types

**檔案位置**: `types/database.types.ts`

在現有型別檔案中新增:

```typescript
export interface Database {
  public: {
    Tables: {
      // ... 現有的 tiers, profiles

      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }

      products: {
        Row: {
          id: string
          code: string
          name: string
          category_id: string
          description: string | null
          stock: number
          unit: string
          image_url: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          category_id: string
          description?: string | null
          stock?: number
          unit?: string
          image_url?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category_id?: string
          description?: string | null
          stock?: number
          unit?: string
          image_url?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
```

### 3.2 建立應用層型別

**檔案位置**: `types/index.ts`

新增以下型別:

```typescript
// ... 現有的 Tier, Client, ActionResult

export type Category = {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  code: string
  name: string
  category_id: string
  category_name?: string  // JOIN 後的分類名稱
  description: string | null
  stock: number
  unit: string
  image_url: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

---

## Step 4: 建立 Zod Validation Schemas

### 4.1 Category Schema

**檔案位置**: `lib/validations/category.schema.ts`

```typescript
import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string()
    .min(1, '分類名稱不可為空')
    .max(50, '分類名稱最多 50 字'),
  description: z.string()
    .max(500, '描述最多 500 字')
    .optional(),
  sort_order: z.coerce.number()
    .int('排序必須為整數')
    .min(0, '排序必須大於等於 0')
    .default(0),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
})
```

### 4.2 Product Schema

**檔案位置**: `lib/validations/product.schema.ts`

```typescript
import { z } from 'zod'

export const createProductSchema = z.object({
  code: z.string()
    .min(1, '商品編號不可為空')
    .max(50, '商品編號最多 50 字元')
    .regex(/^[A-Za-z0-9-_]+$/, '商品編號僅可包含英數字、連字號、底線'),
  name: z.string()
    .min(1, '商品名稱不可為空')
    .max(200, '商品名稱最多 200 字元'),
  category_id: z.string()
    .uuid('請選擇商品分類'),
  description: z.string()
    .max(1000, '描述最多 1000 字')
    .optional(),
  stock: z.coerce.number()
    .int('庫存必須為整數')
    .default(0),
  unit: z.string()
    .min(1, '單位不可為空')
    .max(20, '單位最多 20 字元')
    .default('件'),
  status: z.enum(['active', 'inactive'])
    .default('active'),
})

export const updateProductSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Za-z0-9-_]+$/).optional(),
  name: z.string().min(1).max(200).optional(),
  category_id: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  stock: z.coerce.number().int().optional(),
  unit: z.string().min(1).max(20).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
```

---

## Step 5: 建立 Server Actions 骨架

### 5.1 Categories Actions

**檔案位置**: `lib/actions/categories.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations/category.schema'
import type { ActionResult, Category } from '@/types'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'

/**
 * 查詢所有商品分類 (依 sort_order 排序)
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('查詢分類失敗:', error)
    return []
  }

  return data || []
}

/**
 * 建立新分類
 */
export async function createCategory(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await checkAuth('admin')

    const validatedFields = createCategorySchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      sort_order: formData.get('sort_order') || undefined,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const supabase = await createClient()

    // 檢查名稱是否重複
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', validatedFields.data.name)
      .single()

    if (existingCategory) {
      return {
        success: false,
        message: '此分類名稱已存在',
      }
    }

    // 建立分類
    const { data, error } = await supabase
      .from('categories')
      .insert(validatedFields.data)
      .select('id')
      .single()

    if (error) {
      console.error('建立分類失敗:', error)
      return {
        success: false,
        message: '建立失敗,請稍後再試',
      }
    }

    revalidatePath('/admin/categories')

    return {
      success: true,
      data: { id: data.id },
      message: '分類建立成功',
    }
  } catch (error) {
    console.error('createCategory error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立失敗',
    }
  }
}

// TODO: 實作 updateCategory, deleteCategory
```

### 5.2 Products Actions

**檔案位置**: `lib/actions/products.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product.schema'
import type { ActionResult, Product } from '@/types'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'

/**
 * 查詢商品列表 (含搜尋、篩選、分頁)
 */
export async function getProducts(params?: {
  search?: string
  category_id?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}): Promise<{
  products: Product[]
  total: number
  page: number
  limit: number
}> {
  const { search = '', category_id, status = 'active', page = 1, limit = 20 } = params || {}

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*, categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  // 搜尋條件
  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
  }

  // 分類篩選
  if (category_id) {
    query = query.eq('category_id', category_id)
  }

  // 狀態篩選
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // 分頁
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('查詢商品列表失敗:', error)
    return { products: [], total: 0, page, limit }
  }

  // 轉換資料格式
  const products: Product[] = (data || []).map((item: any) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    category_id: item.category_id,
    category_name: item.categories?.name,
    description: item.description,
    stock: item.stock,
    unit: item.unit,
    image_url: item.image_url,
    status: item.status,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))

  return {
    products,
    total: count || 0,
    page,
    limit,
  }
}

// TODO: 實作 getProduct, createProduct, updateProduct, deleteProduct
// TODO: 實作 uploadProductImage, deleteProductImage
```

---

## Step 6: 驗證環境設定

### 6.1 測試資料庫查詢

建立測試頁面 `app/test-products/page.tsx`:

```typescript
import { getCategories } from '@/lib/actions/categories'
import { getProducts } from '@/lib/actions/products'

export default async function TestProductsPage() {
  const categories = await getCategories()
  const { products, total } = await getProducts({ limit: 5 })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">商品管理系統測試</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">分類列表</h2>
        <p className="mb-2">查詢到 {categories.length} 個分類:</p>
        <ul className="list-disc pl-6">
          {categories.map((cat) => (
            <li key={cat.id}>
              {cat.sort_order}. {cat.name} - {cat.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">商品列表</h2>
        <p className="mb-2">共 {total} 個商品 (顯示前 5 筆):</p>
        <ul className="list-disc pl-6">
          {products.map((product) => (
            <li key={product.id}>
              [{product.code}] {product.name} - 庫存: {product.stock} {product.unit} ({product.status})
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

訪問 `http://localhost:3000/test-products`,應該顯示:
- ✅ 3 個分類
- ✅ 5 個測試商品

### 6.2 測試 Storage Bucket

在 Supabase Dashboard:
1. 前往 "Storage" → "Buckets"
2. 應該看到 `products` bucket
3. 點擊 "Upload file" 測試上傳
4. 確認公開 URL 可正常存取

---

## Step 7: 建立目錄結構

```bash
# Windows (PowerShell)
mkdir -p app\(admin)\admin\categories
mkdir -p app\(admin)\admin\products
mkdir -p components\admin\categories
mkdir -p components\admin\products
```

---

## 完成 Checklist

開發環境設定完成後,請確認以下項目:

- ✅ 資料庫 Migration 已執行 (categories, products 表已建立)
- ✅ 索引與觸發器已建立
- ✅ Supabase Storage `products` bucket 已建立
- ✅ Storage RLS 策略已設定
- ✅ 預設分類已插入 (飲料、零食、日用品)
- ✅ 測試商品已插入 (包含負庫存與停用商品)
- ✅ TypeScript 型別已定義 (Category, Product)
- ✅ Zod Schema 已建立 (category.schema.ts, product.schema.ts)
- ✅ Server Actions 骨架已建立 (categories.ts, products.ts)
- ✅ 測試頁面可正常顯示分類與商品

---

## 下一步

環境設定完成後,可以開始開發功能:

### Phase 2: 實作後台管理介面

1. **分類管理頁面**:
   - `app/(admin)/admin/categories/page.tsx` - 分類列表
   - `app/(admin)/admin/categories/new/page.tsx` - 建立分類
   - `app/(admin)/admin/categories/[id]/edit/page.tsx` - 編輯分類

2. **商品管理頁面**:
   - `app/(admin)/admin/products/page.tsx` - 商品列表
   - `app/(admin)/admin/products/new/page.tsx` - 建立商品
   - `app/(admin)/admin/products/[id]/edit/page.tsx` - 編輯商品

3. **UI 元件**:
   - `components/admin/categories/CategoryForm.tsx` - 分類表單
   - `components/admin/products/ProductForm.tsx` - 商品表單
   - `components/admin/products/ImageUpload.tsx` - 圖片上傳元件
   - `components/admin/products/StockBadge.tsx` - 庫存狀態顯示

### Phase 3: 實作前台商品展示

4. **客戶端商品頁面**:
   - `app/(shop)/store/page.tsx` - 商品列表
   - `app/(shop)/store/[id]/page.tsx` - 商品詳情

5. **UI 元件**:
   - `components/shop/ProductCard.tsx` - 商品卡片
   - `components/shop/CategoryFilter.tsx` - 分類篩選器
   - `components/shop/SearchBar.tsx` - 搜尋列

詳細實作請參考:
- [API Contracts](./contracts/server-actions.md)
- [Data Model](./data-model.md)
- [Research](./research.md)

---

## 常見問題

### Q: Migration 執行失敗怎麼辦?

**A**: 檢查以下項目:
1. 確認 `update_updated_at_column()` 函式已存在 (應在 001-user-tier-management 中建立)
2. 確認 `profiles` 表已存在 (Storage RLS 策略需要)
3. 若重複執行 Migration,先執行 Rollback Script

### Q: Storage Bucket 建立失敗?

**A**:
1. 檢查 `storage.buckets` 表是否有 `products` 記錄
2. 手動建立: Dashboard → Storage → "New Bucket" → 名稱: `products`, Public: ✅

### Q: RLS 策略導致無法查詢資料?

**A**: 初期開發可以暫時關閉 RLS:
```sql
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
```
**⚠️ 上線前務必重新啟用!**

### Q: 測試商品顯示負庫存異常?

**A**: 這是正常的!負庫存支援是專案需求,前端需正確處理顯示:
- `stock > 0`: "庫存 100"
- `stock === 0`: "暫無庫存"
- `stock < 0`: "欠貨 10 單位 (可預購)"

### Q: 圖片上傳權限錯誤?

**A**: 確認:
1. 已登入且角色為 `admin`
2. Storage RLS 策略已正確設定
3. 檢查 `profiles.role` 是否為 'admin'

---

## 效能基準

完成設定後,應符合以下效能基準:

| 操作 | 目標時間 | 實測方式 |
|------|---------|---------|
| 分類列表載入 | < 50ms | `getCategories()` |
| 商品列表載入 (20筆) | < 300ms | `getProducts({ limit: 20 })` |
| 商品搜尋 | < 200ms | `getProducts({ search: 'keyword' })` |
| 圖片上傳 (1MB) | < 2s | `uploadProductImage()` |

---

**環境設定完成!** 現在可以開始開發商品管理功能了。
