# API Contract: 商品篩選 API

**Feature**: US2 - 類別與標籤快速篩選
**版本**: 1.0.0
**最後更新**: 2026-01-04

---

## Server Action: `filterProducts`

### 功能描述
提供前台客戶端商品多條件篩選功能，支援類別與標籤多選組合篩選，即時回傳篩選結果。

---

### 簽名

```typescript
async function filterProducts(
  filters: ProductFilters
): Promise<ActionResult<FilteredProductsResult>>
```

---

### 請求參數

#### `filters` (required)
- **型別**: `ProductFilters`

```typescript
interface ProductFilters {
  category_ids?: string[];   // 類別 ID 陣列 (多選)
  tags?: string[];            // 標籤陣列 (多選)
  stock_status?: StockStatus; // 庫存狀態篩選
  limit?: number;             // 回傳筆數上限，預設 100
  offset?: number;            // 分頁偏移量，預設 0
}

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';
// in_stock: stock > 10
// low_stock: 0 < stock <= 10
// out_of_stock: stock <= 0
// all: 不限 (預設)
```

---

### 回傳格式

#### 成功回應

```typescript
{
  success: true,
  data: FilteredProductsResult,
  message?: string
}
```

**FilteredProductsResult 型別**:
```typescript
interface FilteredProductsResult {
  products: Product[];
  total_count: number;     // 符合條件的總筆數 (用於分頁)
  applied_filters: {       // 已套用的篩選條件
    categories: Category[];
    tags: string[];
    stock_status: StockStatus;
  };
}

interface Product {
  // (同 search-api.md 的 Product 型別)
  id: string;
  name: string;
  product_code: string;
  retail_price: number;
  stock: number;
  tags: string[];
  user_price: number | null;
  series: {
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface Category {
  id: string;
  name: string;
  product_count: number;   // 該類別的商品數量
}
```

#### 失敗回應

```typescript
{
  success: false,
  message: string,
  errors?: Record<string, string[]>
}
```

---

### 範例

#### 請求範例 1: 單一類別篩選

```typescript
const result = await filterProducts({
  category_ids: ['beverage-uuid']
});

// 回傳結果
{
  success: true,
  data: {
    products: [ /* 飲料類別的商品 */ ],
    total_count: 50,
    applied_filters: {
      categories: [
        { id: 'beverage-uuid', name: '飲料', product_count: 50 }
      ],
      tags: [],
      stock_status: 'all'
    }
  }
}
```

#### 請求範例 2: 多標籤組合篩選

```typescript
const result = await filterProducts({
  tags: ['熱銷', '新品']
});

// 回傳結果: 包含「熱銷」或「新品」任一標籤的商品
{
  success: true,
  data: {
    products: [ /* 符合標籤的商品 */ ],
    total_count: 30,
    applied_filters: {
      categories: [],
      tags: ['熱銷', '新品'],
      stock_status: 'all'
    }
  }
}
```

#### 請求範例 3: 複合篩選 (類別 + 標籤 + 庫存)

```typescript
const result = await filterProducts({
  category_ids: ['beverage-uuid', 'snack-uuid'],
  tags: ['熱銷'],
  stock_status: 'in_stock',
  limit: 20,
  offset: 0
});

// 回傳結果: 飲料或零食類別 + 熱銷標籤 + 庫存充足的商品
```

---

### 實作邏輯

#### SQL 查詢

```sql
WITH filtered_products AS (
  SELECT
    p.*,
    s.name as series_name,
    s.category_id,
    c.name as category_name,
    s.default_image_url,
    tp.amount as user_price,
    COUNT(*) OVER() as total_count
  FROM products p
  LEFT JOIN series s ON p.series_id = s.id
  LEFT JOIN categories c ON s.category_id = c.id
  LEFT JOIN tier_prices tp ON (
    tp.product_id = p.id
    AND tp.tier_id = $user_tier_id
  )
  WHERE
    p.status = 'active'
    AND s.is_active = true
    -- 類別篩選 (OR 邏輯)
    AND (
      $category_ids IS NULL
      OR s.category_id = ANY($category_ids)
    )
    -- 標籤篩選 (OR 邏輯)
    AND (
      $tags IS NULL
      OR p.tags && $tags
    )
    -- 庫存狀態篩選
    AND (
      $stock_status = 'all'
      OR ($stock_status = 'in_stock' AND p.stock > 10)
      OR ($stock_status = 'low_stock' AND p.stock > 0 AND p.stock <= 10)
      OR ($stock_status = 'out_of_stock' AND p.stock <= 0)
    )
  ORDER BY
    p.updated_at DESC,
    p.name ASC
  LIMIT $limit
  OFFSET $offset
)
SELECT * FROM filtered_products;

-- 同時查詢類別統計
SELECT
  c.id,
  c.name,
  COUNT(DISTINCT p.id) as product_count
FROM categories c
LEFT JOIN series s ON c.id = s.category_id
LEFT JOIN products p ON s.id = p.series_id
WHERE c.status = 'active' AND p.status = 'active'
GROUP BY c.id, c.name
ORDER BY c.name;
```

---

### 驗證規則

#### 輸入驗證 (Zod Schema)

```typescript
// lib/validations/filter.schema.ts
export const productFiltersSchema = z.object({
  category_ids: z.array(z.string().uuid())
    .max(10, '最多選擇 10 個類別')
    .optional(),
  tags: z.array(z.string())
    .max(5, '最多選擇 5 個標籤')
    .optional(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'all'])
    .optional()
    .default('all'),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100),
  offset: z.number()
    .int()
    .min(0)
    .optional()
    .default(0)
});
```

---

### 前端整合

#### React 元件範例

```typescript
'use client';
import { useState } from 'react';
import { filterProducts } from '@/lib/actions/products';

export function ProductFilter() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const handleFilter = async () => {
    const result = await filterProducts({
      category_ids: selectedCategories,
      tags: selectedTags
    });

    if (result.success) {
      setProducts(result.data.products);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 篩選狀態變更時自動觸發查詢
  useEffect(() => {
    handleFilter();
  }, [selectedCategories, selectedTags]);

  return (
    <div>
      {/* 類別按鈕 */}
      <div className="flex gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={selectedCategories.includes(cat.id) ? 'active' : ''}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 標籤按鈕 */}
      <div className="flex gap-2">
        {availableTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={selectedTags.includes(tag) ? 'active' : ''}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      <div className="grid grid-cols-2 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

---

### 效能指標

- **目標響應時間**: < 200ms (資料庫查詢)
- **索引使用**:
  - `categories.id` (主鍵索引)
  - `products.tags` (GIN 索引)
  - `series.category_id` (外鍵索引)

---

### 錯誤處理

| 錯誤碼 | 情境 | 訊息 |
|-------|------|------|
| `VALIDATION_ERROR` | 超過篩選數量限制 | "最多選擇 10 個類別" |
| `UNAUTHORIZED` | 未登入 | "請先登入" |
| `DATABASE_ERROR` | 資料庫查詢失敗 | "篩選失敗，請稍後再試" |

---

### 測試案例

```typescript
describe('filterProducts', () => {
  it('應支援單一類別篩選', async () => {
    const result = await filterProducts({
      category_ids: ['beverage-uuid']
    });
    expect(result.success).toBe(true);
    expect(result.data.products.length).toBeGreaterThan(0);
  });

  it('應支援多標籤組合篩選 (OR 邏輯)', async () => {
    const result = await filterProducts({
      tags: ['熱銷', '新品']
    });
    expect(result.success).toBe(true);
    // 驗證每個商品至少包含一個標籤
    result.data.products.forEach(p => {
      expect(
        p.tags.includes('熱銷') || p.tags.includes('新品')
      ).toBe(true);
    });
  });

  it('應支援庫存狀態篩選', async () => {
    const result = await filterProducts({
      stock_status: 'in_stock'
    });
    expect(result.success).toBe(true);
    result.data.products.forEach(p => {
      expect(p.stock).toBeGreaterThan(10);
    });
  });

  it('應驗證類別數量限制', async () => {
    const result = await filterProducts({
      category_ids: new Array(11).fill('uuid')
    });
    expect(result.success).toBe(false);
  });
});
```

---

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
