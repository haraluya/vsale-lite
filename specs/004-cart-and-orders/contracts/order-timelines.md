# API Contract: Order Timelines (訂單操作歷史)

**Module**: `lib/actions/order-timelines.ts`
**Date**: 2026-01-03
**Status**: Phase 1 Design

## Overview

訂單操作歷史 Server Actions，負責記錄與查詢訂單的所有狀態變更與操作記錄。**主要由 PostgreSQL Functions 自動建立記錄**，Server Actions 僅提供查詢功能。

---

## Server Actions

### 1. getOrderTimelines

**用途**: 查詢訂單的操作歷史

**簽名**:
```typescript
export async function getOrderTimelines(
  orderId: string
): Promise<ActionResult<OrderTimeline[]>>
```

**權限**:
- 客戶: 只能查看自己訂單的歷史 (RLS 過濾)
- 管理員: 可查看所有訂單歷史

**查詢邏輯**:
```typescript
const { data: timelines } = await supabase
  .from('order_timelines')
  .select(`
    id,
    order_id,
    action_type,
    actor_id,
    actor_role,
    old_status,
    new_status,
    notes,
    created_at,
    profiles(full_name)
  `)
  .eq('order_id', orderId)
  .order('created_at', { ascending: true })
```

**回傳範例**:
```typescript
{
  success: true,
  data: [
    {
      id: '...',
      order_id: '...',
      action_type: 'created',
      actor_id: '...',
      actor_role: 'client',
      old_status: null,
      new_status: 'pending',
      notes: null,
      created_at: '2026-01-03T10:30:00Z',
      actor_name: '王小明'
    },
    {
      id: '...',
      action_type: 'status_changed',
      actor_id: '...',
      actor_role: 'admin',
      old_status: 'pending',
      new_status: 'confirmed',
      notes: null,
      created_at: '2026-01-03T11:00:00Z',
      actor_name: '管理員張三'
    }
  ]
}
```

---

## Automatic Timeline Creation

### 由 PostgreSQL Functions 自動建立

訂單操作歷史記錄由以下 PostgreSQL Functions 自動建立：

#### 1. 訂單建立時

```sql
-- 在 createOrder Server Action 中
INSERT INTO order_timelines (
  order_id,
  action_type,
  actor_id,
  actor_role,
  new_status
) VALUES (
  v_order_id,
  'created',
  auth.uid(),
  'client',
  'pending'
);
```

#### 2. 訂單狀態變更時

```sql
-- 在 confirm_order_and_deduct_stock() Function 中
INSERT INTO order_timelines (
  order_id,
  action_type,
  actor_id,
  actor_role,
  old_status,
  new_status
) VALUES (
  p_order_id,
  'status_changed',
  p_actor_id,
  'admin',
  'pending',
  'confirmed'
);
```

#### 3. 訂單取消時

```sql
-- 在 cancel_order_and_restore_stock() Function 中
INSERT INTO order_timelines (
  order_id,
  action_type,
  actor_id,
  actor_role,
  old_status,
  new_status
) VALUES (
  p_order_id,
  'cancelled',
  p_actor_id,
  'admin',
  v_order.status,
  'cancelled'
);
```

---

## UI Display Format

### 時間軸顯示範例

```typescript
function OrderTimeline({ timelines }: { timelines: OrderTimeline[] }) {
  return (
    <div className="space-y-4">
      {timelines.map((timeline) => (
        <div key={timeline.id} className="flex gap-4">
          <div className="text-sm text-gray-500">
            {formatDate(timeline.created_at)}
          </div>
          <div>
            {renderTimelineMessage(timeline)}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderTimelineMessage(timeline: OrderTimeline) {
  switch (timeline.action_type) {
    case 'created':
      return `${timeline.actor_name} 建立訂單`

    case 'status_changed':
      return `${timeline.actor_name} 將訂單狀態從「${getStatusLabel(timeline.old_status)}」改為「${getStatusLabel(timeline.new_status)}」`

    case 'cancelled':
      return `${timeline.actor_name} 取消訂單`

    default:
      return '未知操作'
  }
}

function getStatusLabel(status: string | null) {
  const labels = {
    pending: '待確認',
    confirmed: '已確認',
    shipping: '出貨中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return labels[status as keyof typeof labels] || status
}
```

**顯示效果**:
```
2026-01-03 10:30  王小明 建立訂單
2026-01-03 11:00  管理員張三 將訂單狀態從「待確認」改為「已確認」
2026-01-03 15:30  管理員張三 將訂單狀態從「已確認」改為「出貨中」
```

---

## Testing Checklist

- [ ] 訂單建立時自動記錄 `created` 歷史
- [ ] 訂單狀態變更時自動記錄 `status_changed` 歷史
- [ ] 訂單取消時自動記錄 `cancelled` 歷史
- [ ] 客戶只能查看自己訂單的歷史 (RLS 驗證)
- [ ] 管理員可查看所有訂單歷史
- [ ] 操作歷史按時間正序排列
- [ ] 操作者名稱正確顯示

---

**Status**: ✅ Completed
**Related**: orders.md
**Date**: 2026-01-03
