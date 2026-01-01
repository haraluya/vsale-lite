# Server Actions API Contracts

**Feature**: 002-product-management
**Date**: 2026-01-02
**Version**: 1.1.0 (Edge Cases 決策完成)

## 概述

本文件定義商品管理系統的 Server Actions 介面規格。所有 Server Actions 遵循 Next.js 15 標準,使用 Zod 進行輸入驗證,並回傳統一的回應格式。

**設計原則**:
- ✅ 輸入驗證: 使用 Zod Schema 驗證所有輸入
- ✅ 錯誤處理: 統一回應格式 (success/error)
- ✅ 權限檢查: 在 Action 內部驗證使用者角色
- ✅ 路徑重新驗證: 使用 `revalidatePath` 同步快取

---

## 通用型別定義

### ActionResult<T>
```typescript
type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }
```

---

## 1. Categories Management Actions

### 1.1 getCategories

**用途**: 查詢所有商品分類 (依 sort_order 排序)

**檔案位置**: `lib/actions/categories.ts`

**權限要求**: 無 (已認證使用者即可)

**函式簽章**:
```typescript
async function getCategories(): Promise<Category[]>

type Category = {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
```

**回應範例**:
```typescript
[
  {
    id: 'uuid-1',
    name: '飲料',
    description: '各式飲料商品',
    sort_order: 1,
    created_at: '2026-01-02T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z'
  },
  {
    id: 'uuid-2',
    name: '零食',
    description: '零食與點心',
    sort_order: 2,
    created_at: '2026-01-02T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z'
  }
]
```

**業務邏輯**:
1. 查詢 `categories` 表
2. 依 `sort_order ASC` 排序
3. 回傳所有分類

---

### 1.2 createCategory

**用途**: 建立新商品分類

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function createCategory(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>>
```

**輸入驗證 Schema**:
```typescript
// lib/validations/category.schema.ts
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
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | 分類名稱 (如: 飲料、零食) |
| `description` | string | ❌ | 分類描述 |
| `sort_order` | number | ❌ | 排序數字 (預設 0) |

**回應範例**:
```typescript
// 成功
{ success: true, data: { id: 'uuid-xxx' }, message: '分類建立成功' }

// 失敗 - 名稱重複
{ success: false, message: '此分類名稱已存在' }

// 失敗 - 權限不足
{ success: false, message: '權限不足,僅管理員可執行此操作' }
```

**業務邏輯**:
1. 驗證當前使用者為 Admin (`checkAuth('admin')`)
2. 驗證輸入欄位
3. 檢查分類名稱是否重複
4. 寫入 `categories` 表
5. `revalidatePath('/admin/categories')`

---

### 1.3 updateCategory

**用途**: 更新商品分類

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function updateCategory(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult>
```

**輸入驗證 Schema**:
```typescript
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 分類 ID (URL 參數) |
| `name` | string | ❌ | 新的分類名稱 |
| `description` | string | ❌ | 新的描述 |
| `sort_order` | number | ❌ | 新的排序數字 |

**回應範例**:
```typescript
// 成功
{ success: true, message: '分類更新成功' }

// 失敗 - 分類不存在
{ success: false, message: '分類不存在' }

// 失敗 - 名稱重複
{ success: false, message: '此分類名稱已存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查分類是否存在
3. 若修改 `name`,檢查是否與其他分類重複
4. 更新 `categories` 表
5. `revalidatePath('/admin/categories')`

---

### 1.4 deleteCategory

**用途**: 刪除商品分類

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function deleteCategory(id: string): Promise<ActionResult>
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 分類 ID |

**回應範例**:
```typescript
// 成功
{ success: true, message: '分類刪除成功' }

// 失敗 - 有商品使用
{
  success: false,
  message: '此分類已有 15 個商品使用,無法刪除'
}
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 查詢 `products` 表計算使用此分類的商品數量
3. 若 `count > 0`,回傳錯誤訊息並附上商品數量（建議使用 migrateCategoryProducts 遷移後再刪除）
4. 若 `count === 0`,執行硬刪除
5. `revalidatePath('/admin/categories')`

**錯誤處理**:
```typescript
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
```

---

### 1.5 migrateCategoryProducts

**用途**: 將某分類的所有商品批量遷移至其他分類 (用於刪除前的資料遷移)

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function migrateCategoryProducts(
  fromCategoryId: string,
  toCategoryId: string
): Promise<ActionResult<{ count: number }>>
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `fromCategoryId` | string | ✅ | 來源分類 ID (要刪除的分類) |
| `toCategoryId` | string | ✅ | 目標分類 ID (遷移目的地) |

**回應範例**:
```typescript
// 成功
{
  success: true,
  data: { count: 15 },
  message: '已成功將 15 個商品從「飲料」遷移至「食品」'
}

// 失敗 - 來源分類不存在
{ success: false, message: '來源分類不存在' }

// 失敗 - 目標分類不存在
{ success: false, message: '目標分類不存在' }

// 失敗 - 相同分類
{ success: false, message: '來源分類與目標分類不可相同' }

// 成功但無商品
{
  success: true,
  data: { count: 0 },
  message: '此分類沒有商品需要遷移'
}
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 驗證 `fromCategoryId` 與 `toCategoryId` 不可相同
3. 查詢來源分類與目標分類是否存在:
   ```typescript
   const [fromCategory, toCategory] = await Promise.all([
     supabase.from('categories').select('id, name').eq('id', fromCategoryId).single(),
     supabase.from('categories').select('id, name').eq('id', toCategoryId).single()
   ])

   if (!fromCategory.data) {
     return { success: false, message: '來源分類不存在' }
   }
   if (!toCategory.data) {
     return { success: false, message: '目標分類不存在' }
   }
   ```
4. 批量更新商品分類:
   ```typescript
   const { count } = await supabase
     .from('products')
     .update({ category_id: toCategoryId })
     .eq('category_id', fromCategoryId)
     .select('*', { count: 'exact', head: true })
   ```
5. `revalidatePath('/admin/categories')`
6. `revalidatePath('/admin/products')`
7. 回傳成功訊息與遷移商品數量

**使用場景**:
```typescript
// 前端流程範例
async function handleDeleteCategory(categoryId: string) {
  // 1. 檢查是否有商品使用
  const { count } = await checkCategoryUsage(categoryId)

  if (count > 0) {
    // 2. 顯示遷移對話框
    const targetCategoryId = await showMigrationDialog(categoryId)

    // 3. 執行遷移
    const migrateResult = await migrateCategoryProducts(categoryId, targetCategoryId)

    if (!migrateResult.success) {
      alert(migrateResult.message)
      return
    }
  }

  // 4. 刪除分類
  const deleteResult = await deleteCategory(categoryId)

  if (deleteResult.success) {
    alert('分類刪除成功')
  }
}
```

**效能考量**:
- 使用單一 UPDATE 查詢批量更新,避免逐筆操作
- 適用於商品數量 < 10,000 的情況
- 若商品數量過多,可考慮使用背景任務處理

**交易安全**:
- Supabase PostgreSQL 保證 UPDATE 操作的原子性
- 若更新失敗,所有變更會自動回滾

---

## 2. Products Management Actions

### 2.1 getProducts

**用途**: 查詢商品列表 (含搜尋、篩選、分頁)

**權限要求**:
- Admin: 可查看所有商品 (包含 inactive)
- Client: 僅可查看 active 商品 (由 RLS 策略控制)

**函式簽章**:
```typescript
async function getProducts(params?: {
  search?: string         // 商品編號或名稱關鍵字
  category_id?: string    // 分類篩選
  status?: 'active' | 'inactive' | 'all'  // 狀態篩選 (Admin only)
  page?: number           // 頁碼 (預設 1)
  limit?: number          // 每頁筆數 (預設 20)
}): Promise<{
  products: Product[]
  total: number
  page: number
  limit: number
}>

type Product = {
  id: string
  code: string
  name: string
  category_id: string
  category_name: string
  description: string | null
  stock: number
  unit: string
  image_url: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `search` | string | ❌ | - | 商品編號或名稱關鍵字 (模糊搜尋) |
| `category_id` | string | ❌ | - | 依分類篩選 |
| `status` | string | ❌ | 'active' | 狀態篩選 (僅 Admin 可用 'all') |
| `page` | number | ❌ | 1 | 頁碼 |
| `limit` | number | ❌ | 20 | 每頁筆數 |

**回應範例**:
```typescript
{
  products: [
    {
      id: 'uuid-1',
      code: 'DRINK-001',
      name: '可口可樂 350ml',
      category_id: 'cat-uuid',
      category_name: '飲料',
      description: '經典可樂',
      stock: 100,
      unit: '罐',
      image_url: 'https://xxx.supabase.co/storage/v1/object/public/products/uuid-1/main.jpg',
      status: 'active',
      created_at: '2026-01-02T10:00:00Z',
      updated_at: '2026-01-02T10:00:00Z'
    },
    // ...more
  ],
  total: 150,  // 總筆數
  page: 1,
  limit: 20
}
```

**業務邏輯**:
1. 建立查詢基礎:
   ```typescript
   let query = supabase
     .from('products')
     .select('*, categories(name)', { count: 'exact' })
     .order('created_at', { ascending: false })
   ```

2. 套用搜尋條件 (ILIKE 查詢):
   ```typescript
   if (search) {
     query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
   }
   ```

3. 套用分類篩選:
   ```typescript
   if (category_id) {
     query = query.eq('category_id', category_id)
   }
   ```

4. 套用狀態篩選:
   ```typescript
   if (status !== 'all') {
     query = query.eq('status', status)
   }
   ```

5. 套用分頁:
   ```typescript
   const from = (page - 1) * limit
   query = query.range(from, from + limit - 1)
   ```

6. 執行查詢並轉換資料格式

**效能優化**:
- 使用 B-tree 索引 (`idx_products_code`, `idx_products_name`)
- 商品數量 > 1000 筆時,改用 Full-Text Search

---

### 2.2 getProduct

**用途**: 取得單一商品詳細資料

**權限要求**: 已認證使用者

**函式簽章**:
```typescript
async function getProduct(id: string): Promise<Product | null>
```

**回應範例**:
```typescript
// 成功
{
  id: 'uuid-1',
  code: 'DRINK-001',
  name: '可口可樂 350ml',
  category_id: 'cat-uuid',
  category_name: '飲料',
  description: '經典可樂',
  stock: 100,
  unit: '罐',
  image_url: 'https://xxx.supabase.co/storage/v1/object/public/products/uuid-1/main.jpg',
  status: 'active',
  created_at: '2026-01-02T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z'
}

// 失敗 (商品不存在或權限不足)
null
```

**業務邏輯**:
1. 查詢 `products` 表 (JOIN `categories`)
2. 由 RLS 策略控制權限 (客戶僅能看 active 商品)
3. 回傳商品資料或 null

---

### 2.3 createProduct

**用途**: 建立新商品

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function createProduct(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>>
```

**輸入驗證 Schema**:
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
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `code` | string | ✅ | - | 商品編號 (SKU) |
| `name` | string | ✅ | - | 商品名稱 |
| `category_id` | string | ✅ | - | 商品分類 ID |
| `description` | string | ❌ | - | 商品描述 |
| `stock` | number | ❌ | 0 | 庫存數量 (支援負數) |
| `unit` | string | ❌ | '件' | 單位 |
| `status` | string | ❌ | 'active' | 狀態 |

**回應範例**:
```typescript
// 成功
{ success: true, data: { id: 'uuid-xxx' }, message: '商品建立成功' }

// 失敗 - 商品編號重複
{ success: false, message: '此商品編號已存在' }

// 失敗 - 分類不存在
{ success: false, message: '選擇的分類不存在' }

// 失敗 - 驗證錯誤
{
  success: false,
  errors: {
    code: ['商品編號僅可包含英數字、連字號、底線']
  },
  message: '驗證失敗'
}
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 驗證輸入欄位 (Zod Schema)
3. 檢查商品編號是否重複
4. 驗證 `category_id` 是否存在
5. 寫入 `products` 表
6. `revalidatePath('/admin/products')`

---

### 2.4 updateProduct

**用途**: 更新商品資料

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function updateProduct(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult>
```

**輸入驗證 Schema**:
```typescript
export const updateProductSchema = z.object({
  // 注意: code 欄位不應出現在更新 Schema 中 (建立後不可修改)
  name: z.string().min(1).max(200).optional(),
  category_id: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  stock: z.coerce.number().int().optional(),
  unit: z.string().min(1).max(20).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 商品 ID (URL 參數) |
| `name` | string | ❌ | 新的商品名稱 |
| `category_id` | string | ❌ | 新的分類 ID |
| `description` | string | ❌ | 新的描述 |
| `stock` | number | ❌ | 新的庫存數量 |
| `unit` | string | ❌ | 新的單位 |
| `status` | string | ❌ | 新的狀態 |

**注意**: 商品編號 (code) **建立後不可修改**,不接受此參數。

**回應範例**:
```typescript
// 成功
{ success: true, message: '商品更新成功' }

// 失敗 - 商品不存在
{ success: false, message: '商品不存在' }

// 失敗 - 分類不存在
{ success: false, message: '選擇的分類不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查商品是否存在
3. 若修改 `category_id`,驗證新分類是否存在
4. 更新 `products` 表（不包含 `code` 欄位）
5. `revalidatePath('/admin/products')`
6. `revalidatePath(\`/admin/products/\${id}\`)`

---

### 2.5 deleteProduct

**用途**: 刪除商品 (混合策略: 有訂單軟刪除,無訂單硬刪除)

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function deleteProduct(id: string): Promise<ActionResult>
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 商品 ID |

**回應範例**:
```typescript
// 成功 - 硬刪除
{ success: true, message: '商品刪除成功' }

// 成功 - 軟刪除
{
  success: true,
  message: '此商品已有訂單記錄,已改為「停用」狀態'
}

// 失敗 - 商品不存在
{ success: false, message: '商品不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查是否已有訂單記錄:
   ```typescript
   const { count } = await supabase
     .from('order_items')  // 未來實作訂單功能時
     .select('*', { count: 'exact', head: true })
     .eq('product_id', id)
   ```
3. **若有訂單記錄** (軟刪除):
   - 更新 `status` 為 'inactive'
   - 回傳訊息: "已改為停用狀態"
4. **若無訂單記錄** (硬刪除):
   - 刪除圖片:
     ```typescript
     await supabase.storage.from('products').remove([
       `${id}/main.jpg`,
       `${id}/main.png`,
       `${id}/main.webp`
     ])
     ```
   - 刪除商品記錄
5. `revalidatePath('/admin/products')`

**錯誤處理**:
- 圖片刪除失敗不影響商品刪除 (可能圖片不存在)
- 訂單檢查失敗時回傳錯誤

---

## 3. Image Management Actions

### 3.1 uploadProductImage

**用途**: 上傳商品圖片

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function uploadProductImage(
  productId: string,
  file: File
): Promise<ActionResult<{ url: string }>>
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `productId` | string | ✅ | 商品 ID |
| `file` | File | ✅ | 圖片檔案 (JPG/PNG/WebP) |

**回應範例**:
```typescript
// 成功
{
  success: true,
  data: { url: 'https://xxx.supabase.co/storage/v1/object/public/products/uuid-1/main.jpg' },
  message: '圖片上傳成功'
}

// 失敗 - 格式錯誤
{ success: false, message: '僅支援 JPG, PNG, WebP 格式' }

// 失敗 - 檔案過大
{ success: false, message: '檔案大小不可超過 5MB' }

// 失敗 - 商品不存在
{ success: false, message: '商品不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查商品是否存在
3. 驗證檔案格式:
   ```typescript
   const validFormats = ['image/jpeg', 'image/png', 'image/webp']
   if (!validFormats.includes(file.type)) {
     return { success: false, message: '僅支援 JPG, PNG, WebP 格式' }
   }
   ```
4. 驗證檔案大小:
   ```typescript
   const maxSize = 5 * 1024 * 1024 // 5MB
   if (file.size > maxSize) {
     return { success: false, message: '檔案大小不可超過 5MB' }
   }
   ```
5. 上傳到 Storage (覆寫模式):
   ```typescript
   const ext = file.type.split('/')[1]
   const filePath = `${productId}/main.${ext}`

   await supabase.storage
     .from('products')
     .upload(filePath, file, {
       cacheControl: '3600',
       upsert: true,  // 覆寫舊檔案
     })
   ```
6. 取得公開 URL:
   ```typescript
   const { data } = supabase.storage
     .from('products')
     .getPublicUrl(filePath)
   ```
7. 更新 `products.image_url`:
   ```typescript
   await supabase
     .from('products')
     .update({ image_url: data.publicUrl })
     .eq('id', productId)
   ```
8. `revalidatePath('/admin/products')`
9. `revalidatePath(\`/admin/products/\${productId}\`)`

**使用範例** (前端):
```typescript
'use client'

async function handleUpload(productId: string, file: File) {
  const result = await uploadProductImage(productId, file)

  if (result.success) {
    console.log('圖片 URL:', result.data.url)
  } else {
    alert(result.message)
  }
}
```

---

### 3.2 deleteProductImage

**用途**: 刪除商品圖片

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function deleteProductImage(productId: string): Promise<ActionResult>
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `productId` | string | ✅ | 商品 ID |

**回應範例**:
```typescript
// 成功
{ success: true, message: '圖片刪除成功' }

// 失敗 - 商品不存在
{ success: false, message: '商品不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查商品是否存在
3. 刪除 Storage 圖片 (所有可能的副檔名):
   ```typescript
   await supabase.storage.from('products').remove([
     `${productId}/main.jpg`,
     `${productId}/main.png`,
     `${productId}/main.webp`
   ])
   ```
4. 更新 `products.image_url` 為 NULL:
   ```typescript
   await supabase
     .from('products')
     .update({ image_url: null })
     .eq('id', productId)
   ```
5. `revalidatePath('/admin/products')`

**注意事項**:
- 刪除 Storage 時不檢查錯誤 (圖片可能不存在)
- 僅在資料庫更新失敗時回傳錯誤

---

## 4. 權限檢查 Helper

### checkAuth

**用途**: 驗證當前使用者身份與權限 (重用現有實作)

**檔案位置**: `lib/actions/helpers.ts`

**函式簽章**:
```typescript
async function checkAuth(requiredRole?: 'admin' | 'client'): Promise<AuthContext>

type AuthContext = {
  userId: string
  role: 'client' | 'admin'
  tierId?: string
}
```

**使用範例**:
```typescript
export async function createProduct(prevState: any, formData: FormData) {
  // 1. 驗證權限
  const auth = await checkAuth('admin')  // 若非 admin 會拋出錯誤

  // 2. 業務邏輯...
}
```

---

## 5. 錯誤碼定義

| 錯誤碼 | HTTP 狀態 | 說明 | 處理方式 |
|--------|----------|------|---------|
| `VALIDATION_ERROR` | 400 | 輸入驗證失敗 | 顯示欄位錯誤訊息 |
| `UNAUTHORIZED` | 401 | 未登入 | 重導向至登入頁 |
| `FORBIDDEN` | 403 | 權限不足 | 顯示錯誤訊息或重導向 |
| `NOT_FOUND` | 404 | 資源不存在 | 顯示錯誤訊息 |
| `CONFLICT` | 409 | 資料衝突 (如重複) | 顯示具體衝突原因 |
| `FILE_TOO_LARGE` | 413 | 檔案過大 | 顯示檔案大小限制 |
| `UNSUPPORTED_MEDIA` | 415 | 不支援的檔案格式 | 顯示支援的格式 |
| `INTERNAL_ERROR` | 500 | 伺服器錯誤 | 顯示通用錯誤訊息 |

---

## 6. 測試範例

### 單元測試 (Vitest)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createProduct } from '@/lib/actions/products'

describe('createProduct', () => {
  it('應該成功建立商品', async () => {
    const formData = new FormData()
    formData.append('code', 'TEST-001')
    formData.append('name', '測試商品')
    formData.append('category_id', 'valid-uuid')
    formData.append('stock', '100')
    formData.append('unit', '件')

    const result = await createProduct(null, formData)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBeDefined()
  })

  it('應該拒絕重複的商品編號', async () => {
    const formData = new FormData()
    formData.append('code', 'DRINK-001')  // 已存在
    formData.append('name', '測試商品')
    formData.append('category_id', 'valid-uuid')

    const result = await createProduct(null, formData)

    expect(result.success).toBe(false)
    expect(result.message).toContain('已存在')
  })

  it('應該拒絕無效的商品編號格式', async () => {
    const formData = new FormData()
    formData.append('code', 'TEST 001')  // 包含空格
    formData.append('name', '測試商品')
    formData.append('category_id', 'valid-uuid')

    const result = await createProduct(null, formData)

    expect(result.success).toBe(false)
    expect(result.errors?.code).toBeDefined()
  })
})

describe('uploadProductImage', () => {
  it('應該拒絕過大的檔案', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg'
    })

    const result = await uploadProductImage('valid-uuid', largeFile)

    expect(result.success).toBe(false)
    expect(result.message).toContain('5MB')
  })

  it('應該拒絕不支援的檔案格式', async () => {
    const gifFile = new File(['GIF89a'], 'test.gif', {
      type: 'image/gif'
    })

    const result = await uploadProductImage('valid-uuid', gifFile)

    expect(result.success).toBe(false)
    expect(result.message).toContain('JPG, PNG, WebP')
  })
})
```

---

## 7. 使用範例 (前端整合)

### 建立商品表單

```typescript
'use client'

import { useActionState } from 'react'
import { createProduct } from '@/lib/actions/products'

export function CreateProductForm({ categories }: { categories: Category[] }) {
  const [state, formAction] = useActionState(createProduct, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label>商品編號</label>
        <input name="code" className="input-neo" />
        {state?.errors?.code && (
          <p className="text-red-500">{state.errors.code[0]}</p>
        )}
      </div>

      <div>
        <label>商品名稱</label>
        <input name="name" className="input-neo" />
        {state?.errors?.name && (
          <p className="text-red-500">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label>商品分類</label>
        <select name="category_id" className="input-neo">
          <option value="">請選擇</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {state?.errors?.category_id && (
          <p className="text-red-500">{state.errors.category_id[0]}</p>
        )}
      </div>

      <div>
        <label>庫存</label>
        <input name="stock" type="number" className="input-neo" />
        {state?.errors?.stock && (
          <p className="text-red-500">{state.errors.stock[0]}</p>
        )}
      </div>

      <div>
        <label>單位</label>
        <input name="unit" className="input-neo" defaultValue="件" />
      </div>

      {state?.message && (
        <div className={state.success ? 'text-green-600' : 'text-red-600'}>
          {state.message}
        </div>
      )}

      <button type="submit" className="btn-neo">建立商品</button>
    </form>
  )
}
```

### 圖片上傳元件

```typescript
'use client'

import { useState } from 'react'
import { uploadProductImage } from '@/lib/actions/products'

export function ImageUpload({ productId }: { productId: string }) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    const result = await uploadProductImage(productId, file)

    if (result.success) {
      setMessage('圖片上傳成功')
    } else {
      setMessage(result.message)
    }

    setUploading(false)
  }

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>上傳中...</p>}
      {message && <p>{message}</p>}
    </div>
  )
}
```

---

## 總結

本 API Contracts 定義涵蓋:
- ✅ **5 個分類管理 Actions** (查詢、建立、更新、刪除、**遷移**)
- ✅ 5 個商品管理 Actions (查詢列表、查詢單筆、建立、更新、刪除)
- ✅ 2 個圖片管理 Actions (上傳、刪除)
- ✅ 統一的錯誤處理與回應格式
- ✅ 完整的權限檢查機制
- ✅ Zod Schema 輸入驗證
- ✅ Supabase Storage 整合
- ✅ 負庫存支援
- ✅ 軟刪除/硬刪除混合策略
- ✅ 商品編號建立後不可修改

**新增功能** (v1.1):
- ✅ `migrateCategoryProducts`: 批量遷移商品分類 (FR-009-A)
- ✅ 圖片格式支援 WebP
- ✅ 商品編號強制格式驗證 (`/^[A-Za-z0-9-_]+$/`)

**版本**: 1.1.0
**最後更新**: 2026-01-02
**下一步**: 開始實作 Phase 1 (Database Setup)
