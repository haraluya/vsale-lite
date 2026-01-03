# API Contract: 商品標籤管理 API

**Feature**: US9 - 商品標籤 (Tags) 系統
**版本**: 1.0.0
**最後更新**: 2026-01-04

---

## Server Action 1: `updateProductTags`

### 功能描述
更新單一商品的標籤陣列。

---

### 簽名

```typescript
async function updateProductTags(
  product_id: string,
  tags: string[]
): Promise<ActionResult<Product>>
```

---

### 請求參數

#### `product_id` (required)
- **型別**: `string`
- **約束**: UUID 格式

#### `tags` (required)
- **型別**: `string[]`
- **約束**:
  - 最多 5 個標籤
  - 每個標籤 2-8 字元
  - 僅允許中英文與數字

---

### 回傳格式

#### 成功回應

```typescript
{
  success: true,
  data: Product,
  message: "標籤更新成功"
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

```typescript
// 設定標籤
const result = await updateProductTags('product-uuid', ['熱銷', '新品', '限量']);

// 清空標籤
const result = await updateProductTags('product-uuid', []);
```

---

### 實作邏輯

```typescript
// lib/actions/tags.ts
'use server';
import { z } from 'zod';

const tagNameSchema = z.string()
  .min(2, '標籤名稱至少 2 個字元')
  .max(8, '標籤名稱最多 8 個字元')
  .regex(/^[\u4e00-\u9fa5a-zA-Z0-9]+$/, '標籤僅允許中英文與數字');

const updateTagsSchema = z.object({
  product_id: z.string().uuid(),
  tags: z.array(tagNameSchema)
    .max(5, '最多只能設定 5 個標籤')
});

export async function updateProductTags(product_id: string, tags: string[]) {
  // 1. 驗證權限
  const { user } = await checkAuth();
  if (user.role !== 'admin') {
    return { success: false, message: '無權限執行此操作' };
  }

  // 2. 驗證輸入
  const validated = updateTagsSchema.parse({ product_id, tags });

  // 3. 更新資料庫
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .update({ tags: validated.tags })
    .eq('id', validated.product_id)
    .select()
    .single();

  if (error) {
    return { success: false, message: '更新失敗' };
  }

  revalidatePath('/admin/products');
  return { success: true, data, message: '標籤更新成功' };
}
```

---

## Server Action 2: `batchUpdateProductTags`

### 功能描述
批次為多個商品新增或移除標籤。

---

### 簽名

```typescript
async function batchUpdateProductTags(
  product_ids: string[],
  operation: 'add' | 'remove',
  tags: string[]
): Promise<ActionResult<BatchUpdateResult>>
```

---

### 請求參數

#### `product_ids` (required)
- **型別**: `string[]`
- **約束**: 陣列長度 1-100

#### `operation` (required)
- **型別**: `'add' | 'remove'`
- **說明**:
  - `add`: 新增標籤 (不重複)
  - `remove`: 移除標籤

#### `tags` (required)
- **型別**: `string[]`
- **約束**: 同 `updateProductTags`

---

### 回傳格式

```typescript
interface BatchUpdateResult {
  total_count: number;      // 總商品數
  success_count: number;    // 成功數量
  error_count: number;      // 失敗數量
  errors: {
    product_id: string;
    message: string;
  }[];
}
```

---

### 範例

#### 批次新增標籤

```typescript
const result = await batchUpdateProductTags(
  ['uuid-1', 'uuid-2', 'uuid-3'],
  'add',
  ['促銷']
);

// 回傳結果
{
  success: true,
  data: {
    total_count: 3,
    success_count: 3,
    error_count: 0,
    errors: []
  },
  message: "批次更新成功: 3 個商品已新增標籤"
}
```

#### 批次移除標籤

```typescript
const result = await batchUpdateProductTags(
  ['uuid-1', 'uuid-2'],
  'remove',
  ['新品']
);
```

---

### 實作邏輯

```typescript
export async function batchUpdateProductTags(
  product_ids: string[],
  operation: 'add' | 'remove',
  tags: string[]
) {
  // 1. 驗證權限
  const { user } = await checkAuth();
  if (user.role !== 'admin') {
    return { success: false, message: '無權限執行此操作' };
  }

  // 2. 驗證輸入
  if (product_ids.length === 0 || product_ids.length > 100) {
    return { success: false, message: '商品數量需為 1-100' };
  }

  // 3. 批次更新
  const supabase = await createClient();
  let successCount = 0;
  const errors = [];

  for (const product_id of product_ids) {
    try {
      // 查詢當前標籤
      const { data: product } = await supabase
        .from('products')
        .select('tags')
        .eq('id', product_id)
        .single();

      if (!product) {
        errors.push({ product_id, message: '商品不存在' });
        continue;
      }

      // 計算新標籤陣列
      let newTags = product.tags || [];
      if (operation === 'add') {
        // 新增標籤 (去重)
        newTags = [...new Set([...newTags, ...tags])];
      } else {
        // 移除標籤
        newTags = newTags.filter(t => !tags.includes(t));
      }

      // 驗證標籤數量限制
      if (newTags.length > 5) {
        errors.push({ product_id, message: '標籤數量超過 5 個' });
        continue;
      }

      // 更新資料庫
      await supabase
        .from('products')
        .update({ tags: newTags })
        .eq('id', product_id);

      successCount++;
    } catch (error) {
      errors.push({ product_id, message: error.message });
    }
  }

  revalidatePath('/admin/products');

  return {
    success: true,
    data: {
      total_count: product_ids.length,
      success_count: successCount,
      error_count: errors.length,
      errors
    },
    message: `批次更新成功: ${successCount} 個商品已${operation === 'add' ? '新增' : '移除'}標籤`
  };
}
```

---

## Server Action 3: `getAvailableTags`

### 功能描述
取得系統中所有已使用的標籤清單 (用於前端篩選或選擇)。

---

### 簽名

```typescript
async function getAvailableTags(): Promise<ActionResult<TagStats[]>>
```

---

### 回傳格式

```typescript
interface TagStats {
  name: string;           // 標籤名稱
  product_count: number;  // 使用該標籤的商品數量
}
```

---

### 範例

```typescript
const result = await getAvailableTags();

// 回傳結果
{
  success: true,
  data: [
    { name: '熱銷', product_count: 50 },
    { name: '新品', product_count: 30 },
    { name: '限量', product_count: 10 },
    { name: '促銷', product_count: 20 }
  ]
}
```

---

### 實作邏輯

```typescript
export async function getAvailableTags() {
  const supabase = await createClient();

  // 查詢所有商品的標籤
  const { data: products } = await supabase
    .from('products')
    .select('tags')
    .eq('status', 'active');

  if (!products) {
    return { success: true, data: [] };
  }

  // 統計標籤使用次數
  const tagCountMap = new Map<string, number>();

  products.forEach(product => {
    if (product.tags && product.tags.length > 0) {
      product.tags.forEach(tag => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
    }
  });

  // 轉換為陣列並排序
  const tagStats = Array.from(tagCountMap.entries())
    .map(([name, product_count]) => ({ name, product_count }))
    .sort((a, b) => b.product_count - a.product_count); // 按使用次數降序

  return { success: true, data: tagStats };
}
```

---

## Server Action 4: `deleteOrder`

### 功能描述
刪除 pending 狀態的訂單 (硬刪除)。

---

### 簽名

```typescript
async function deleteOrder(
  order_id: string,
  reason?: string
): Promise<ActionResult<void>>
```

---

### 請求參數

#### `order_id` (required)
- **型別**: `string`
- **約束**: UUID 格式

#### `reason` (optional)
- **型別**: `string`
- **約束**: 5-200 字元

---

### 回傳格式

```typescript
{
  success: true,
  message: "訂單已刪除"
}
```

---

### 範例

```typescript
const result = await deleteOrder('order-uuid', '測試訂單');
```

---

### 實作邏輯

```typescript
// lib/actions/orders.ts
export async function deleteOrder(order_id: string, reason?: string) {
  // 1. 驗證權限
  const { user } = await checkAuth();
  if (user.role !== 'admin') {
    return { success: false, message: '無權限執行此操作' };
  }

  // 2. 查詢訂單狀態
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, status')
    .eq('id', order_id)
    .single();

  if (!order) {
    return { success: false, message: '訂單不存在' };
  }

  if (order.status !== 'pending') {
    return { success: false, message: '僅允許刪除 pending 狀態的訂單' };
  }

  // 3. 記錄操作歷史 (在刪除前記錄)
  await supabase.from('order_timelines').insert({
    order_id,
    type: 'deleted',
    content: `管理員刪除訂單 (原因: ${reason || '未提供'})`,
    actor_id: user.id
  });

  // 4. 刪除訂單 (硬刪除)
  await supabase.from('orders').delete().eq('id', order_id);

  revalidatePath('/admin/orders');

  return { success: true, message: `訂單 ${order.order_number} 已刪除` };
}
```

---

### 錯誤處理

| 錯誤碼 | 情境 | 訊息 |
|-------|------|------|
| `UNAUTHORIZED` | 非管理員 | "無權限執行此操作" |
| `NOT_FOUND` | 訂單不存在 | "訂單不存在" |
| `INVALID_STATUS` | 訂單狀態不是 pending | "僅允許刪除 pending 狀態的訂單" |

---

### 測試案例

```typescript
describe('deleteOrder', () => {
  it('應成功刪除 pending 狀態的訂單', async () => {
    const result = await deleteOrder('pending-order-uuid');
    expect(result.success).toBe(true);
  });

  it('應拒絕刪除 confirmed 狀態的訂單', async () => {
    const result = await deleteOrder('confirmed-order-uuid');
    expect(result.success).toBe(false);
    expect(result.message).toContain('pending');
  });

  it('應記錄刪除操作於 order_timelines', async () => {
    await deleteOrder('order-uuid', '測試訂單');
    const timeline = await getOrderTimelines('order-uuid');
    expect(timeline.some(t => t.type === 'deleted')).toBe(true);
  });
});
```

---

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
