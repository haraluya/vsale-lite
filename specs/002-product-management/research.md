# Research: 商品管理系統

**Feature**: 002-product-management
**Date**: 2026-01-02
**Status**: Phase 0 Research Complete

## 研究目標

針對商品管理系統的關鍵技術決策進行最佳實踐研究,特別聚焦於:
1. Supabase Storage 圖片管理策略
2. 資料表設計與索引優化
3. 搜尋與篩選效能實作
4. 負庫存處理機制
5. 刪除保護與資料完整性

---

## 1. Supabase Storage 圖片管理策略

### 問題
如何設計商品圖片的儲存、上傳、刪除與存取機制?

### 研究發現

#### 1.1 Bucket 組織架構

**決策**: 建立單一 `products` bucket,使用資料夾結構組織

```
products/
├── {product_id}/
│   └── main.{ext}     # 主圖片
└── placeholders/
    └── default.png    # 預設佔位圖
```

**理由**:
- Supabase 官方建議按照「安全性與存取規則」劃分 bucket,而非功能類型
- 所有商品圖片共用相同的 RLS 規則 (管理員可寫,已認證使用者可讀)
- 使用資料夾結構方便未來擴充 (如多圖片支援)
- 資料夾路徑可用於 RLS 策略的精細控制

**替代方案被拒絕**:
- **多 bucket 設計** (如 `product-images`, `product-thumbnails`): 過度複雜,且 Supabase 免費版僅支援有限數量的 bucket
- **扁平化結構** (所有圖片放根目錄): 難以管理,無法用資料夾做權限控制

#### 1.2 圖片檔案命名策略

**決策**: 使用 `{product_id}/main.{ext}` 格式

**理由**:
- **一致性**: 每個商品都有固定的圖片路徑 (`products/{id}/main.jpg`)
- **易於更新**: 上傳新圖片時直接覆寫舊檔案,無需清理
- **效能優化**: 固定路徑方便 CDN 快取管理
- **簡化查詢**: 前端無需查詢資料庫取得圖片 URL,直接拼接即可

**檔名範例**:
```
products/550e8400-e29b-41d4-a716-446655440000/main.jpg
products/6ba7b810-9dad-11d1-80b4-00c04fd430c8/main.png
```

**替代方案被拒絕**:
- **UUID 檔名**: 增加資料庫儲存負擔,需額外查詢
- **時間戳記檔名**: 無法自動清理舊圖片,浪費儲存空間

#### 1.3 圖片上傳流程

**決策**: 使用 Server Action 代理上傳 (非客戶端直傳)

**實作流程**:
```typescript
// lib/actions/products.ts
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<ActionResult<{ url: string }>> {
  // 1. 驗證權限 (僅管理員)
  await checkAuth('admin')

  // 2. 驗證檔案格式與大小
  const validFormats = ['image/jpeg', 'image/png', 'image/webp']
  if (!validFormats.includes(file.type)) {
    return { success: false, message: '僅支援 JPG, PNG, WebP 格式' }
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { success: false, message: '檔案大小不可超過 5MB' }
  }

  // 3. 上傳到 Storage (覆寫模式)
  const supabase = await createClient()
  const ext = file.type.split('/')[1]
  const filePath = `${productId}/main.${ext}`

  const { data, error } = await supabase.storage
    .from('products')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // 覆寫舊檔案
    })

  if (error) {
    return { success: false, message: '上傳失敗' }
  }

  // 4. 更新資料庫記錄
  const { data: publicUrlData } = supabase.storage
    .from('products')
    .getPublicUrl(filePath)

  await supabase
    .from('products')
    .update({ image_url: publicUrlData.publicUrl })
    .eq('id', productId)

  return { success: true, data: { url: publicUrlData.publicUrl } }
}
```

**理由**:
- **安全性**: Server Action 可驗證權限,防止未授權上傳
- **驗證一致性**: 檔案格式、大小驗證在伺服器端執行更可靠
- **資料庫同步**: 上傳成功後自動更新 `products.image_url`
- **錯誤處理**: 統一的錯誤處理機制

**替代方案被拒絕**:
- **客戶端直傳**: 雖然效能較好,但無法可靠驗證權限 (RLS 策略可能繞過),且需額外處理資料庫更新

#### 1.4 舊圖片刪除機制

**決策**: 使用 `upsert: true` 覆寫,不手動刪除

**理由**:
- **簡化邏輯**: 上傳新圖片時自動覆寫舊圖片
- **避免競態條件**: 不需要「刪除 → 上傳」的兩步驟操作
- **減少 API 呼叫**: 僅需一次 `upload()` 操作
- **CDN 快取處理**: 固定路徑搭配 `Cache-Control` 自動更新

**特殊情況**: 刪除商品時清理圖片

```typescript
// 在 deleteProduct() 中
const { error: storageError } = await supabase.storage
  .from('products')
  .remove([`${productId}/main.jpg`, `${productId}/main.png`, `${productId}/main.webp`])

// 註: 不檢查錯誤,因為圖片可能不存在
```

#### 1.5 RLS 策略配置

```sql
-- 建立 products bucket (公開讀取,管理員寫入)
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
```

#### 1.6 公開 URL 產生與快取

**決策**: 使用 `getPublicUrl()` 並儲存於 `products.image_url`

```typescript
// 產生公開 URL
const { data } = supabase.storage
  .from('products')
  .getPublicUrl(`${productId}/main.jpg`)

// data.publicUrl 格式:
// https://{project_ref}.supabase.co/storage/v1/object/public/products/{product_id}/main.jpg
```

**CDN 快取策略**:
- 上傳時設定 `cacheControl: '3600'` (1小時)
- 前端使用 Next.js `<Image>` 元件進一步優化
- 若需強制更新快取,可在 URL 加上時間戳參數

### 參考資料
- [Storage Image Transformations | Supabase Docs](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Next.js and Supabase: How to Store and Serve Images](https://kodaschool.com/blog/next-js-and-supabase-how-to-store-and-serve-images)
- [Storage Access Control | Supabase Docs](https://supabase.com/docs/guides/storage/security/access-control)

---

## 2. 資料表設計與索引優化

### 問題
如何設計 `products` 與 `categories` 表以支援效能與擴充性?

### 資料表設計決策

#### 2.1 Categories 表

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
```

**設計說明**:
- `sort_order`: 支援管理員自訂排序 (拖曳調整)
- `name UNIQUE`: 防止重複分類名稱
- 初期不支援階層式分類 (避免過度設計)

#### 2.2 Products 表

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,           -- 商品編號 (SKU)
  name TEXT NOT NULL,                          -- 商品名稱
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT,                            -- 商品描述
  image_url TEXT,                              -- 商品圖片 URL
  stock INTEGER NOT NULL DEFAULT 0,            -- 庫存 (支援負數)
  unit TEXT NOT NULL DEFAULT '件',             -- 單位 (件/箱/盒)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- 全文搜尋索引 (使用 GIN)
CREATE INDEX idx_products_search ON products USING GIN (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(code, ''))
);
```

**欄位型別選擇**:

| 欄位 | 型別 | 理由 |
|------|------|------|
| `code` | `VARCHAR(50)` | 限制長度,防止過長編號,提升索引效能 |
| `name` | `TEXT` | 商品名稱長度不定,使用 TEXT 更彈性 |
| `stock` | `INTEGER` | 支援負數 (欠貨/預購),範圍 -2^31 ~ 2^31-1 足夠 |
| `image_url` | `TEXT` | 儲存完整 Supabase Storage URL |

**不使用 `product_images` 獨立表**:
- 當前需求僅需「單一主圖」
- 獨立表增加 JOIN 複雜度與查詢成本
- 若未來需多圖片,可新增 `product_images` 表並保留 `image_url` 作為主圖

#### 2.3 觸發器 (自動更新 `updated_at`)

```sql
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**註**: `update_updated_at_column()` 函式已在 001-user-tier-management 中建立

---

## 3. 搜尋與篩選效能實作

### 問題
如何實作高效能的商品搜尋與篩選?

### 研究發現

#### 3.1 PostgreSQL 全文搜尋 vs LIKE 查詢

**效能比較** (基於研究):
- **LIKE 查詢**:
  - 無法有效使用索引 (特別是 `%keyword%` 模式)
  - 大數據集時退化為 Sequential Scan
  - 查詢時間隨資料量線性增長
- **Full-Text Search (GIN 索引)**:
  - 查詢速度提升 60-100 倍 (4.7秒 → 75ms)
  - 支援複雜搜尋 (前綴、詞幹、排名)
  - 索引大小約為資料的 40-60%

#### 3.2 決策: 混合策略

**精確搜尋** (商品編號): 使用 B-tree 索引 + ILIKE

```typescript
// 搜尋商品編號 "A001"
const { data } = await supabase
  .from('products')
  .select('*')
  .ilike('code', 'A001%')  // 前綴匹配,可使用索引
```

**模糊搜尋** (商品名稱): 使用 Full-Text Search

```typescript
// 搜尋商品名稱包含 "咖啡"
const { data } = await supabase
  .from('products')
  .select('*')
  .textSearch('name', 'coffee', {
    type: 'websearch',
    config: 'simple'
  })
```

**初期實作 (簡化版)**: 使用 ILIKE 查詢

**理由**:
- 批發系統初期商品數量 < 1000 筆
- ILIKE 查詢在小數據集下效能可接受 (< 50ms)
- 減少開發複雜度
- 預留全文搜尋索引,待商品數量成長後啟用

```typescript
// lib/actions/products.ts
export async function getProducts(params?: {
  search?: string
  category_id?: string
  status?: 'active' | 'inactive'
  page?: number
  limit?: number
}) {
  const { search = '', category_id, status = 'active', page = 1, limit = 20 } = params || {}

  let query = supabase
    .from('products')
    .select('*, categories(name)', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })

  // 搜尋: 商品編號或名稱
  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
  }

  // 分類篩選
  if (category_id) {
    query = query.eq('category_id', category_id)
  }

  // 分頁
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query

  // ...
}
```

#### 3.3 索引策略總結

| 搜尋類型 | 索引類型 | 使用時機 |
|---------|---------|---------|
| 商品編號精確查詢 | B-tree (`idx_products_code`) | 總是使用 |
| 商品名稱搜尋 | GIN Full-Text (`idx_products_search`) | 商品數量 > 1000 筆時啟用 |
| 分類篩選 | B-tree (`idx_products_category_id`) | 總是使用 |
| 狀態篩選 | B-tree (`idx_products_status`) | 總是使用 |

### 參考資料
- [PostgreSQL Full-Text Search vs LIKE Queries | Sling Academy](https://www.slingacademy.com/article/postgresql-full-text-search-vs-like-queries-when-to-use-each/)
- [Postgres Full-Text Search | Crunchy Data](https://www.crunchydata.com/blog/postgres-full-text-search-a-search-engine-in-a-database)
- [PostgreSQL: Preferred Index Types for Text Search](https://www.postgresql.org/docs/current/textsearch-indexes.html)

---

## 4. 負庫存處理機制

### 問題
如何在前後端正確處理與顯示負庫存?

### 設計決策

#### 4.1 資料庫層級

**決策**: `stock INTEGER` 不設定 CHECK 約束,允許任意整數

```sql
CREATE TABLE products (
  -- ...
  stock INTEGER NOT NULL DEFAULT 0,  -- 範圍: -2,147,483,648 ~ 2,147,483,647
  -- ...
);
```

**理由**:
- 批發業務常見預購/欠貨情境
- 允許負庫存提供彈性 (如: -10 表示欠 10 單位)
- 管理員可手動調整庫存至負數 (如盤點後發現短缺)

#### 4.2 前端顯示策略

**商品列表 (客戶端)**:
```tsx
// components/shop/ProductCard.tsx
function StockBadge({ stock }: { stock: number }) {
  if (stock > 0) {
    return <span className="text-green-600">庫存 {stock}</span>
  } else if (stock === 0) {
    return <span className="text-gray-500">暫無庫存</span>
  } else {
    return (
      <span className="text-orange-600">
        欠貨 {Math.abs(stock)} 單位 (可預購)
      </span>
    )
  }
}
```

**管理後台**:
- 顯示實際數字 (包含負數)
- 提供「調整庫存」功能 (可輸入負數)

#### 4.3 下單驗證

**決策**: 不檢查庫存,允許負庫存下單

```typescript
// lib/actions/orders.ts (未來實作)
export async function createOrder(items: CartItem[]) {
  // ❌ 不做此檢查:
  // if (product.stock < quantity) {
  //   return { success: false, message: '庫存不足' }
  // }

  // ✅ 直接扣除庫存 (允許變成負數)
  await supabase
    .from('products')
    .update({ stock: product.stock - quantity })
    .eq('id', productId)
}
```

**理由**:
- 批發客戶下單後,賣家可自行判斷是否接受負庫存訂單
- 避免因庫存不足導致下單失敗,影響客戶體驗
- 訂單成立後,管理員可透過後台調整或取消

---

## 5. 刪除保護與資料完整性

### 問題
如何防止誤刪已被使用的商品或分類?

### 研究發現

#### 5.1 軟刪除 vs 硬刪除

**效能比較** (基於研究):

| 策略 | 優勢 | 劣勢 |
|------|------|------|
| **軟刪除** | 可恢復、保留歷史、避免級聯刪除效能問題 | 增加查詢複雜度、索引膨脹、資料庫大小增加 |
| **硬刪除** | 查詢簡單、效能最佳、資料庫輕量 | 無法恢復、需謹慎處理外鍵關聯 |

**PostgreSQL 優化**: 使用 Partial Index 可減輕軟刪除的效能問題

```sql
-- 僅索引未刪除的商品
CREATE INDEX idx_products_active ON products(name)
WHERE deleted_at IS NULL;
```

#### 5.2 決策: 混合策略

**分類刪除**: 使用刪除保護 + 硬刪除

```typescript
// lib/actions/categories.ts
export async function deleteCategory(id: string): Promise<ActionResult> {
  await checkAuth('admin')

  // 檢查是否有商品使用此分類
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return {
      success: false,
      message: `此分類已有 ${count} 個商品使用,無法刪除`,
    }
  }

  // 硬刪除
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, message: '刪除失敗' }
  }

  revalidatePath('/admin/categories')
  return { success: true, message: '分類刪除成功' }
}
```

**商品刪除**: 使用 `status` 欄位實作軟刪除

```sql
-- 不新增 deleted_at,使用現有 status 欄位
ALTER TABLE products
  ADD CONSTRAINT check_status
  CHECK (status IN ('active', 'inactive'));
```

```typescript
// lib/actions/products.ts
export async function deleteProduct(id: string): Promise<ActionResult> {
  await checkAuth('admin')

  // 檢查是否已有訂單
  const { count } = await supabase
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', id)

  if (count && count > 0) {
    // 軟刪除 (改為 inactive)
    const { error } = await supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('id', id)

    if (error) {
      return { success: false, message: '停用失敗' }
    }

    revalidatePath('/admin/products')
    return {
      success: true,
      message: `此商品已有訂單記錄,已改為「停用」狀態`,
    }
  } else {
    // 硬刪除 (未有訂單)
    // 1. 刪除圖片
    await supabase.storage
      .from('products')
      .remove([`${id}/main.jpg`, `${id}/main.png`, `${id}/main.webp`])

    // 2. 刪除商品
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, message: '刪除失敗' }
    }

    revalidatePath('/admin/products')
    return { success: true, message: '商品刪除成功' }
  }
}
```

**理由**:
- **分類**: 較少變動,硬刪除保持資料庫輕量
- **商品**: 可能有訂單關聯,使用 `status` 欄位避免破壞歷史訂單
- **避免過度設計**: 不新增 `deleted_at` 欄位,使用現有 `status` 欄位

#### 5.3 外鍵約束策略

```sql
-- 分類刪除時,禁止刪除 (保護商品資料)
ALTER TABLE products
  ADD CONSTRAINT fk_products_category
  FOREIGN KEY (category_id) REFERENCES categories(id)
  ON DELETE RESTRICT;

-- 未來: 訂單項目刪除時,保留商品資料 (歷史訂單可見)
ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_product
  FOREIGN KEY (product_id) REFERENCES products(id)
  ON DELETE RESTRICT;
```

### 參考資料
- [Soft deletion with PostgreSQL | Evil Martians](https://evilmartians.com/chronicles/soft-deletion-with-postgresql-but-with-logic-on-the-database)
- [Soft Deletion Probably Isn't Worth It | brandur.org](https://brandur.org/soft-deletion)
- [Hard Delete vs Soft Delete in SQL | Medium](https://medium.com/yavar/hard-delete-vs-soft-delete-in-sql-f5088716a72a)

---

## 6. Server Actions 實作模式

### 問題
如何設計一致且安全的 Server Actions API?

### 最佳實踐 (基於現有實作)

#### 6.1 標準 CRUD Action 結構

參考 `lib/actions/tiers.ts` 與 `lib/actions/clients.ts`:

```typescript
// 1. 建立 (Create)
export async function createProduct(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // Step 1: 驗證權限
    await checkAuth('admin')

    // Step 2: 驗證輸入 (Zod Schema)
    const validatedFields = createProductSchema.safeParse({
      code: formData.get('code'),
      name: formData.get('name'),
      // ...
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    // Step 3: 業務邏輯檢查 (如: 唯一性驗證)
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('code', validatedFields.data.code)
      .single()

    if (existingProduct) {
      return { success: false, message: '此商品編號已存在' }
    }

    // Step 4: 資料庫操作
    const { data, error } = await supabase
      .from('products')
      .insert(validatedFields.data)
      .select('id')
      .single()

    if (error) {
      console.error('建立商品失敗:', error)
      return { success: false, message: '建立失敗' }
    }

    // Step 5: Revalidate 快取
    revalidatePath('/admin/products')

    return {
      success: true,
      data: { id: data.id },
      message: '商品建立成功',
    }
  } catch (error) {
    console.error('createProduct error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立失敗',
    }
  }
}
```

#### 6.2 Zod Schema 定義

```typescript
// lib/validations/product.schema.ts
import { z } from 'zod'

export const createProductSchema = z.object({
  code: z.string()
    .min(1, '商品編號不可為空')
    .max(50, '商品編號最多 50 字元')
    .regex(/^[A-Za-z0-9-_]+$/, '商品編號僅可包含英數字、連字號、底線'),
  name: z.string()
    .min(1, '商品名稱不可為空')
    .max(200, '商品名稱最多 200 字元'),
  category_id: z.string().uuid('請選擇商品分類'),
  description: z.string().optional(),
  stock: z.coerce.number().int('庫存必須為整數'),
  unit: z.string().min(1, '單位不可為空').default('件'),
})

export const updateProductSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().max(200).optional(),
  category_id: z.string().uuid().optional(),
  description: z.string().optional(),
  stock: z.coerce.number().int().optional(),
  unit: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
```

#### 6.3 錯誤處理模式

**統一的 ActionResult 型別**:
```typescript
// types/index.ts
export type ActionResult<T = void> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>  // Zod 驗證錯誤
}
```

**客戶端使用**:
```tsx
'use client'

import { useActionState } from 'react'
import { createProduct } from '@/lib/actions/products'

export function ProductForm() {
  const [state, formAction] = useActionState(createProduct, null)

  return (
    <form action={formAction}>
      <input name="code" />
      {state?.errors?.code && (
        <p className="text-red-500">{state.errors.code[0]}</p>
      )}

      {state?.message && (
        <div className={state.success ? 'text-green-600' : 'text-red-600'}>
          {state.message}
        </div>
      )}

      <button type="submit">儲存</button>
    </form>
  )
}
```

---

## 研究總結

### 關鍵技術決策紀錄

| 決策項目 | 選擇 | 替代方案 | 理由 |
|---------|------|---------|------|
| **Storage 架構** | 單一 `products` bucket + 資料夾 | 多 bucket 設計 | 簡化管理,統一 RLS 策略 |
| **圖片檔名** | `{product_id}/main.{ext}` | UUID 檔名 | 固定路徑,易於更新與快取 |
| **圖片上傳** | Server Action 代理 | 客戶端直傳 | 安全性與驗證一致性 |
| **商品編號型別** | `VARCHAR(50)` | `TEXT` | 限制長度提升索引效能 |
| **庫存型別** | `INTEGER` (無約束) | `INTEGER CHECK (stock >= 0)` | 支援負庫存 (欠貨/預購) |
| **搜尋策略 (初期)** | ILIKE 查詢 | 全文搜尋 | 商品數量少時效能可接受 |
| **搜尋策略 (擴展)** | GIN Full-Text Search | ElasticSearch | 原生 PostgreSQL,減少外部依賴 |
| **分類刪除** | 硬刪除 + 保護檢查 | 軟刪除 | 資料庫輕量,分類變動少 |
| **商品刪除** | 混合策略 (有訂單軟刪除,無訂單硬刪除) | 全部軟刪除 | 平衡資料完整性與效能 |
| **分頁策略** | Limit/Offset | Cursor-based | 初期資料量少,實作簡單 |

### 效能目標

| 操作 | 目標 | 策略 |
|------|------|------|
| 商品列表載入 | < 300ms | B-tree 索引 + 分頁 |
| 商品搜尋 | < 200ms | ILIKE (初期), Full-Text (後期) |
| 圖片上傳 | < 2s (5MB) | Server Action + Supabase Storage |
| 分類篩選 | < 100ms | `idx_products_category_id` 索引 |

### 安全性檢查清單

- ✅ 所有 Server Actions 包含 `checkAuth('admin')` 權限檢查
- ✅ 所有輸入使用 Zod Schema 驗證
- ✅ Storage 使用 RLS 策略保護
- ✅ 刪除操作包含保護檢查 (防止誤刪)
- ✅ 圖片上傳限制格式與大小

### 可擴展性考量

**未來功能預留**:
1. **多圖片支援**: 新增 `product_images` 表,保留 `image_url` 作為主圖
2. **全文搜尋**: 已建立 GIN 索引,待商品數量 > 1000 筆時啟用
3. **階層式分類**: 可擴充 `categories` 表新增 `parent_id` 欄位
4. **商品規格變體**: 可新增 `product_variants` 表 (如: 不同尺寸/顏色)

### 下一步: Phase 1 設計

所有技術不確定性已消除,可進入 Phase 1 進行:
- 資料模型設計 (data-model.md)
- API 合約定義 (contracts/server-actions.md)
- 實作計畫 (plan.md)
- 任務分解 (tasks.md)

---

**研究完成日期**: 2026-01-02
**研究者**: Claude Sonnet 4.5
**專案**: Vsale-lite B2B 批發訂貨系統
