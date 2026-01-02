# API Contract: Orders (訂單管理)

**Module**: `lib/actions/orders.ts`
**Date**: 2026-01-03
**Status**: Phase 1 Design

## Overview

訂單管理 Server Actions，負責訂單的建立、查詢、狀態更新與取消操作。所有操作包含權限驗證、輸入驗證與資料庫交易管理。

---

## Common Types

```typescript
// types/index.ts

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled'

export interface Order {
  id: string
  order_number: string
  user_id: string
  total_amount: number
  status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name_snapshot: string
  deal_price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface OrderTimeline {
  id: string
  order_id: string
  action_type: 'created' | 'status_changed' | 'cancelled'
  actor_id: string | null
  actor_role: 'client' | 'admin'
  old_status: string | null
  new_status: string | null
  notes: string | null
  created_at: string
}

export interface OrderWithDetails extends Order {
  items: OrderItem[]
  customer: {
    id: string
    full_name: string
    phone: string
    tier_name: string
  }
  timelines?: OrderTimeline[]
}

export interface CartItem {
  productId: string
  quantity: number
}
```

---

## Server Actions

### 1. createOrder

**用途**: 建立訂單（客戶端）

**路徑**: `lib/actions/orders.ts`

**簽名**:
```typescript
export async function createOrder(
  items: CartItem[],
  notes?: string
): Promise<ActionResult<{ orderId: string; orderNumber: string }>>
```

**權限**: 客戶 (role = 'client')

**輸入驗證** (Zod Schema):
```typescript
// lib/validations/order.schema.ts
export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1, '購物車不能為空'),
  notes: z.string().max(500).optional()
})
```

**處理流程**:
1. 驗證用戶權限 (`checkAuth()`)
2. 驗證輸入 (Zod schema)
3. 查詢商品資訊與等級價格：
   ```sql
   SELECT p.id, p.name, tp.price
   FROM products p
   INNER JOIN tier_prices tp ON p.id = tp.product_id
   WHERE p.id IN (...) AND p.status = 'active' AND tp.tier_id = :user_tier_id
   ```
4. 驗證所有商品都有價格設定
5. 計算訂單總金額
6. 產生訂單編號 (`generate_order_number()`)
7. 插入訂單主表 (`orders`)
8. 插入訂單明細 (`order_items`)，保存商品名稱與價格快照
9. 建立訂單歷史記錄 (`order_timelines`, action_type='created')
10. 執行 `revalidatePath('/store/orders')`
11. 回傳訂單 ID 與編號

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: {
    orderId: '123e4567-e89b-12d3-a456-426614174000',
    orderNumber: 'ORD-20260103-0001'
  },
  message: '訂單建立成功'
}

// 失敗
{
  success: false,
  message: '部分商品未設定價格',
  errors: {
    items: ['商品「珍珠奶茶」未設定您的等級價格']
  }
}
```

**錯誤處理**:
- 購物車為空: `{ success: false, message: '購物車不能為空' }`
- 商品不存在或已停用: `{ success: false, message: '商品不存在或已停用' }`
- 商品未設定價格: `{ success: false, message: '部分商品未設定價格' }`
- 訂單編號衝突 (極端情況): 重試最多 3 次

---

### 2. getOrders

**用途**: 查詢訂單列表（支援篩選與搜尋）

**簽名**:
```typescript
export async function getOrders(filters?: {
  status?: OrderStatus
  search?: string  // 搜尋訂單編號或客戶名稱 (管理員)
  limit?: number
  offset?: number
}): Promise<ActionResult<{ orders: Order[]; total: number }>>
```

**權限**:
- 客戶: 只能查看自己的訂單 (RLS 自動過濾)
- 管理員: 可查看所有訂單

**輸入驗證**:
```typescript
export const getOrdersSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipping', 'completed', 'cancelled']).optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
})
```

**查詢邏輯**:
```typescript
let query = supabase
  .from('orders')
  .select('*, profiles!inner(full_name, phone)', { count: 'exact' })
  .order('created_at', { ascending: false })

if (filters?.status) {
  query = query.eq('status', filters.status)
}

if (filters?.search && role === 'admin') {
  query = query.or(`order_number.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`)
}

query = query.range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20) - 1)
```

**回傳範例**:
```typescript
{
  success: true,
  data: {
    orders: [
      {
        id: '...',
        order_number: 'ORD-20260103-0001',
        total_amount: 1500,
        status: 'pending',
        created_at: '2026-01-03T10:30:00Z',
        customer: {
          full_name: '王小明',
          phone: '0912345678'
        }
      }
    ],
    total: 42
  }
}
```

---

### 3. getOrderById

**用途**: 查詢訂單詳情（含訂單明細與操作歷史）

**簽名**:
```typescript
export async function getOrderById(
  orderId: string
): Promise<ActionResult<OrderWithDetails>>
```

**權限**:
- 客戶: 只能查看自己的訂單 (RLS 過濾)
- 管理員: 可查看所有訂單

**查詢邏輯**:
```typescript
const { data: order } = await supabase
  .from('orders')
  .select(`
    *,
    profiles!inner(id, full_name, phone, tiers(name)),
    order_items(
      id, product_id, product_name_snapshot, deal_price, quantity, subtotal
    ),
    order_timelines(
      id, action_type, actor_id, actor_role, old_status, new_status, created_at,
      profiles(full_name)
    )
  `)
  .eq('id', orderId)
  .single()
```

**回傳範例**:
```typescript
{
  success: true,
  data: {
    id: '...',
    order_number: 'ORD-20260103-0001',
    total_amount: 1500,
    status: 'confirmed',
    notes: '請盡快出貨',
    created_at: '2026-01-03T10:30:00Z',
    customer: {
      id: '...',
      full_name: '王小明',
      phone: '0912345678',
      tier_name: '批發商'
    },
    items: [
      {
        id: '...',
        product_id: '...',
        product_name_snapshot: '珍珠奶茶',
        deal_price: 30,
        quantity: 50,
        subtotal: 1500
      }
    ],
    timelines: [
      {
        id: '...',
        action_type: 'created',
        actor_role: 'client',
        new_status: 'pending',
        created_at: '2026-01-03T10:30:00Z'
      },
      {
        id: '...',
        action_type: 'status_changed',
        actor_role: 'admin',
        old_status: 'pending',
        new_status: 'confirmed',
        created_at: '2026-01-03T11:00:00Z'
      }
    ]
  }
}
```

---

### 4. confirmOrder

**用途**: 確認訂單並扣減庫存（管理員）

**簽名**:
```typescript
export async function confirmOrder(
  orderId: string
): Promise<ActionResult<{ orderId: string }>>
```

**權限**: 管理員 (role = 'admin')

**處理流程**:
1. 驗證管理員權限
2. 呼叫 PostgreSQL Function:
   ```typescript
   const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
     p_order_id: orderId,
     p_actor_id: user.id
   })
   ```
3. 檢查回傳結果 (`data.success`)
4. 執行 `revalidatePath('/admin/orders')`

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: { orderId: '...' },
  message: '訂單已確認，庫存已扣減'
}

// 失敗
{
  success: false,
  message: 'Order status must be pending'
}
```

---

### 5. updateOrderStatus

**用途**: 更新訂單狀態（confirmed → shipping → completed）

**簽名**:
```typescript
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'confirmed' | 'shipping' | 'completed'
): Promise<ActionResult<{ orderId: string; newStatus: string }>>
```

**權限**: 管理員

**輸入驗證**:
```typescript
export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.enum(['confirmed', 'shipping', 'completed'])
})
```

**處理流程**:
1. 驗證管理員權限
2. 呼叫 PostgreSQL Function:
   ```typescript
   const { data } = await supabase.rpc('update_order_status', {
     p_order_id: orderId,
     p_new_status: newStatus,
     p_actor_id: user.id
   })
   ```
3. 執行 `revalidatePath('/admin/orders')`

---

### 6. cancelOrder

**用途**: 取消訂單並回補庫存（管理員）

**簽名**:
```typescript
export async function cancelOrder(
  orderId: string
): Promise<ActionResult<{ orderId: string }>>
```

**權限**: 管理員

**限制**: 僅能取消 `pending` 或 `confirmed` 狀態的訂單

**處理流程**:
1. 驗證管理員權限
2. 呼叫 PostgreSQL Function:
   ```typescript
   const { data } = await supabase.rpc('cancel_order_and_restore_stock', {
     p_order_id: orderId,
     p_actor_id: user.id
   })
   ```
3. 若訂單已確認，自動回補庫存
4. 執行 `revalidatePath('/admin/orders')`

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: { orderId: '...' },
  message: '訂單已取消，庫存已回補'
}

// 失敗 (訂單已出貨)
{
  success: false,
  message: 'Cannot cancel order with status shipping'
}
```

---

## Error Handling

所有 Server Actions 遵循統一的錯誤處理模式：

```typescript
try {
  // 1. 權限檢查
  const { user, role, tier_id } = await checkAuth()
  if (role !== 'admin') {
    return { success: false, message: '權限不足' }
  }

  // 2. 輸入驗證
  const validated = schema.safeParse(input)
  if (!validated.success) {
    return {
      success: false,
      message: '輸入驗證失敗',
      errors: validated.error.flatten().fieldErrors
    }
  }

  // 3. 業務邏輯
  // ...

  // 4. 成功回傳
  revalidatePath(path)
  return { success: true, data, message }

} catch (error) {
  console.error('[Server Action Error]', error)
  return {
    success: false,
    message: error instanceof Error ? error.message : '系統錯誤'
  }
}
```

---

## Performance Considerations

1. **批次查詢**: `getOrders` 使用分頁 (limit/offset)，避免一次載入過多資料
2. **索引優化**: 查詢時使用 `idx_orders_user_status` 複合索引
3. **RLS 自動過濾**: 客戶查詢時自動限定 `user_id`，無需應用層過濾
4. **Revalidation**: 僅重新驗證受影響的路徑，避免全頁重新整理

---

## Testing Checklist

- [ ] 客戶可成功建立訂單
- [ ] 購物車為空時無法下單
- [ ] 商品未設定價格時無法下單
- [ ] 訂單編號唯一性（並發測試）
- [ ] 管理員可確認訂單並正確扣減庫存
- [ ] 管理員可取消訂單並正確回補庫存
- [ ] 客戶只能查看自己的訂單 (RLS 驗證)
- [ ] 管理員可查看所有訂單
- [ ] 訂單狀態轉換邏輯正確
- [ ] 負庫存扣減與回補正確

---

**Status**: ✅ Completed
**Related**: cart.md, order-timelines.md
**Date**: 2026-01-03
