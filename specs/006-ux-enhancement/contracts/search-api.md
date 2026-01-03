# API Contract: 全域搜尋 API

**Feature**: US1 - 全域搜尋與即時篩選
**版本**: 1.0.0
**最後更新**: 2026-01-04

---

## Server Action: `searchProducts`

### 功能描述
提供前台客戶端商品全域搜尋功能，支援商品名稱與商品編號模糊查詢，即時回傳搜尋結果。

---

### 簽名

```typescript
async function searchProducts(
  query: string,
  options?: SearchOptions
): Promise<ActionResult<Product[]>>
```

---

### 請求參數

#### `query` (required)
- **型別**: `string`
- **約束**:
  - 長度: 0-100 字元
  - 允許空字串 (回傳所有商品)
- **說明**: 搜尋關鍵字，支援商品名稱與商品編號

#### `options` (optional)
- **型別**: `SearchOptions`
- **說明**: 搜尋選項

```typescript
interface SearchOptions {
  limit?: number;        // 回傳筆數上限，預設 50
  offset?: number;       // 分頁偏移量，預設 0
  category_id?: string;  // 篩選特定分類
  tags?: string[];       // 篩選特定標籤
}
```

---

### 回傳格式

#### 成功回應

```typescript
{
  success: true,
  data: Product[],
  message?: string
}
```

**Product 型別**:
```typescript
interface Product {
  id: string;
  series_id: string;
  name: string;
  product_code: string;
  retail_price: number;
  stock: number;
  specific_image_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;

  // 關聯資料
  series: {
    id: string;
    name: string;
    category_id: string;
    default_image_url: string;
  };

  // 使用者等級價格 (根據當前登入使用者)
  user_price: number | null;
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

#### 請求範例 1: 基本搜尋

```typescript
const result = await searchProducts('可口可樂');

// 回傳結果
{
  success: true,
  data: [
    {
      id: 'uuid-1',
      name: '可口可樂 330ml',
      product_code: 'COLA-330',
      retail_price: 30,
      stock: 100,
      tags: ['熱銷', '新品'],
      user_price: 25,  // 當前使用者的價格
      series: {
        name: '可樂系列',
        default_image_url: '/images/cola.jpg'
      }
    },
    {
      id: 'uuid-2',
      name: '可口可樂 600ml',
      product_code: 'COLA-600',
      retail_price: 50,
      stock: 50,
      tags: ['熱銷'],
      user_price: 40,
      series: {
        name: '可樂系列',
        default_image_url: '/images/cola.jpg'
      }
    }
  ]
}
```

#### 請求範例 2: 帶選項搜尋

```typescript
const result = await searchProducts('可樂', {
  limit: 10,
  offset: 0,
  category_id: 'beverage-uuid',
  tags: ['熱銷']
});
```

#### 請求範例 3: 空查詢 (回傳所有商品)

```typescript
const result = await searchProducts('', { limit: 20 });
```

---

### 實作邏輯

#### SQL 查詢

```sql
SELECT
  p.*,
  s.name as series_name,
  s.category_id,
  s.default_image_url,
  tp.amount as user_price
FROM products p
LEFT JOIN series s ON p.series_id = s.id
LEFT JOIN tier_prices tp ON (
  tp.product_id = p.id
  AND tp.tier_id = $user_tier_id
)
WHERE
  p.status = 'active'
  AND s.is_active = true
  AND (
    p.name ILIKE '%' || $query || '%'
    OR p.product_code ILIKE '%' || $query || '%'
  )
  -- 選用篩選條件
  AND ($category_id IS NULL OR s.category_id = $category_id)
  AND ($tags IS NULL OR p.tags && $tags)
ORDER BY
  p.updated_at DESC,
  p.name ASC
LIMIT $limit
OFFSET $offset;
```

#### 防抖 (Debounce) 實作

**前端元件**:
```typescript
'use client';
import { useDebouncedCallback } from 'use-debounce';
import { searchProducts } from '@/lib/actions/products';

export function SearchBar() {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useDebouncedCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const result = await searchProducts(query);
    if (result.success) {
      setResults(result.data);
    }
    setLoading(false);
  }, 300);  // 300ms 防抖

  return (
    <input
      type="search"
      placeholder="搜尋商品名稱或編號..."
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```

---

### 驗證規則

#### 輸入驗證 (Zod Schema)

```typescript
// lib/validations/search.schema.ts
export const searchProductsSchema = z.object({
  query: z.string()
    .max(100, '搜尋關鍵字過長'),
  options: z.object({
    limit: z.number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50),
    offset: z.number()
      .int()
      .min(0)
      .optional()
      .default(0),
    category_id: z.string().uuid().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});
```

---

### 效能指標

- **目標響應時間**: < 300ms (包含防抖)
- **資料庫查詢時間**: < 100ms (p95)
- **回傳筆數上限**: 50 筆 (可透過 options.limit 調整)

---

### 錯誤處理

| 錯誤碼 | 情境 | 訊息 |
|-------|------|------|
| `VALIDATION_ERROR` | 輸入格式錯誤 | "搜尋關鍵字過長" |
| `UNAUTHORIZED` | 未登入 | "請先登入" |
| `DATABASE_ERROR` | 資料庫查詢失敗 | "搜尋失敗，請稍後再試" |

---

### 安全性考量

1. **輸入驗證**: 使用 Zod Schema 驗證輸入長度與格式
2. **SQL 注入防護**: 使用 Supabase 參數化查詢
3. **權限檢查**: 僅回傳當前使用者等級可見的價格
4. **速率限制**: 建議實作 Rate Limiting (每分鐘最多 60 次查詢)

---

### 測試案例

#### 單元測試

```typescript
describe('searchProducts', () => {
  it('應回傳符合關鍵字的商品', async () => {
    const result = await searchProducts('可樂');
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('應支援商品編號搜尋', async () => {
    const result = await searchProducts('COLA-330');
    expect(result.success).toBe(true);
    expect(result.data[0].product_code).toBe('COLA-330');
  });

  it('空查詢應回傳所有商品 (限制 50 筆)', async () => {
    const result = await searchProducts('');
    expect(result.success).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(50);
  });

  it('應驗證輸入長度', async () => {
    const longQuery = 'a'.repeat(101);
    const result = await searchProducts(longQuery);
    expect(result.success).toBe(false);
    expect(result.message).toContain('過長');
  });
});
```

---

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
