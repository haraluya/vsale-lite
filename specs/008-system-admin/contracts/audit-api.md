# API Contract: Audit Logs (操作日誌)

**Module**: `lib/actions/audit.ts`
**Date**: 2026-01-04
**Status**: Phase 1 Design

## Overview

操作日誌 Server Actions，負責記錄所有後台寫入操作（建立、更新、刪除、狀態變更）與查詢操作歷史。所有日誌為 Append-Only（僅新增），確保稽核軌跡完整性。

---

## Common Types

```typescript
// types/index.ts

export type AuditActionType = 'created' | 'updated' | 'deleted' | 'stock_adjusted' | 'comment_added'

export interface AuditLog {
  id: string
  target_type: string
  target_id: string
  action_type: AuditActionType
  actor_id: string | null
  actor_role: 'client' | 'admin'
  actor_display_name: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  notes: string | null
  created_at: string
}

export interface AuditLogWithActor extends AuditLog {
  actor: {
    id: string
    full_name: string
    username?: string
  } | null
}

export interface AuditLogFilters {
  targetType?: string
  actionType?: AuditActionType
  actorId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
}
```

---

## Server Actions

### 1. logAudit

**用途**: 記錄操作日誌（由其他 Server Actions 呼叫）

**路徑**: `lib/actions/audit.ts`

**簽名**:
```typescript
export async function logAudit(params: {
  targetType: string
  targetId: string
  actionType: AuditActionType
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
  notes?: string
}): Promise<void>
```

**權限**: 內部函式（由其他 Server Actions 呼叫，不直接暴露給前端）

**處理流程**:
1. 取得當前使用者資訊:
   ```typescript
   const { user, role } = await checkAuth()  // 可為 client 或 admin
   ```
2. 取得使用者暱稱（用於快照）:
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('display_name, full_name, username')
     .eq('id', user.id)
     .single()

   const displayName = profile?.display_name
     || profile?.username
     || profile?.full_name
     || '未知'
   ```
3. 插入操作日誌:
   ```typescript
   const adminClient = createAdminClient()  // 使用 Service Role 繞過 RLS

   await adminClient
     .from('audit_logs')
     .insert({
       target_type: params.targetType,
       target_id: params.targetId,
       action_type: params.actionType,
       actor_id: user.id,
       actor_role: role,
       actor_display_name: displayName,
       old_values: params.oldValues || null,
       new_values: params.newValues || null,
       notes: params.notes || null
     })
   ```

**使用範例**:
```typescript
// lib/actions/products.ts
export async function updateProduct(input: UpdateProductInput) {
  // 1. 查詢舊資料
  const { data: oldProduct } = await supabase
    .from('products')
    .select('stock')
    .eq('id', input.productId)
    .single()

  // 2. 更新商品
  await supabase
    .from('products')
    .update({ stock: input.stock })
    .eq('id', input.productId)

  // 3. 記錄操作日誌
  await logAudit({
    targetType: 'product',
    targetId: input.productId,
    actionType: 'stock_adjusted',
    oldValues: { stock: oldProduct.stock },
    newValues: { stock: input.stock }
  })

  return { success: true }
}
```

**JSONB 儲存策略**:
- **建立操作** (`action_type = 'created'`): `old_values = null`, `new_values = { ... }`
- **更新操作** (`action_type = 'updated'`): `old_values = { ... }`, `new_values = { ... }`
- **刪除操作** (`action_type = 'deleted'`): `old_values = { ... }`, `new_values = null`

---

### 2. getAuditLogs

**用途**: 查詢操作日誌列表（支援篩選與搜尋）

**簽名**:
```typescript
export async function getAuditLogs(
  filters?: AuditLogFilters
): Promise<ActionResult<{ logs: AuditLogWithActor[]; total: number }>>
```

**權限**: 管理員 (role = 'admin')

**輸入驗證**:
```typescript
// lib/validations/audit.schema.ts
export const getAuditLogsSchema = z.object({
  targetType: z.string().optional(),
  actionType: z.enum(['created', 'updated', 'deleted', 'stock_adjusted', 'comment_added']).optional(),
  actorId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
})
```

**查詢邏輯**:
```typescript
const supabase = await createClient()

let query = supabase
  .from('audit_logs')
  .select(`
    *,
    actor:profiles!actor_id(id, full_name, username)
  `, { count: 'exact' })
  .order('created_at', { ascending: false })

// 篩選：目標實體類型
if (filters?.targetType) {
  query = query.eq('target_type', filters.targetType)
}

// 篩選：操作類型
if (filters?.actionType) {
  query = query.eq('action_type', filters.actionType)
}

// 篩選：操作者
if (filters?.actorId) {
  query = query.eq('actor_id', filters.actorId)
}

// 篩選：日期範圍
if (filters?.dateFrom) {
  query = query.gte('created_at', filters.dateFrom)
}
if (filters?.dateTo) {
  query = query.lte('created_at', filters.dateTo)
}

// 搜尋：目標 ID 或操作者暱稱
if (filters?.search) {
  query = query.or(`target_id.ilike.%${filters.search}%,actor_display_name.ilike.%${filters.search}%`)
}

// 分頁
const limit = filters?.limit || 20
const offset = filters?.offset || 0
query = query.range(offset, offset + limit - 1)

const { data: logs, count } = await query
```

**回傳範例**:
```typescript
{
  success: true,
  data: {
    logs: [
      {
        id: '...',
        target_type: 'product',
        target_id: 'product-uuid',
        action_type: 'stock_adjusted',
        actor_id: 'admin-uuid',
        actor_role: 'admin',
        actor_display_name: '小愛',
        old_values: { stock: 100 },
        new_values: { stock: 80 },
        notes: null,
        created_at: '2026-01-04T10:30:00Z',
        actor: {
          id: 'admin-uuid',
          full_name: '王小愛',
          username: 'alice'
        }
      },
      {
        id: '...',
        target_type: 'client',
        target_id: 'client-uuid',
        action_type: 'updated',
        actor_id: 'admin-uuid',
        actor_role: 'admin',
        actor_display_name: '小寶',
        old_values: { tier_name: '批發' },
        new_values: { tier_name: 'VIP' },
        notes: '升級為 VIP 客戶',
        created_at: '2026-01-04T09:00:00Z',
        actor: {
          id: 'admin-uuid',
          full_name: '李小寶',
          username: 'bob'
        }
      }
    ],
    total: 42
  }
}
```

---

### 3. getAuditLogsByTarget

**用途**: 查詢特定實體的操作歷史（如訂單、商品、客戶）

**簽名**:
```typescript
export async function getAuditLogsByTarget(
  targetType: string,
  targetId: string
): Promise<ActionResult<AuditLogWithActor[]>>
```

**權限**: 管理員 (role = 'admin')

**查詢邏輯**:
```typescript
const { data: logs } = await supabase
  .from('audit_logs')
  .select(`
    *,
    actor:profiles!actor_id(id, full_name, username)
  `)
  .eq('target_type', targetType)
  .eq('target_id', targetId)
  .order('created_at', { ascending: true })  // 時間軸由舊到新
```

**回傳範例**:
```typescript
{
  success: true,
  data: [
    {
      id: '...',
      target_type: 'order',
      target_id: 'order-uuid',
      action_type: 'created',
      actor_id: 'client-uuid',
      actor_role: 'client',
      actor_display_name: '張三',
      old_values: null,
      new_values: { order_number: 'ORD-20260104-0001', total_amount: 1500 },
      notes: null,
      created_at: '2026-01-04T10:00:00Z',
      actor: {
        id: 'client-uuid',
        full_name: '張三',
        username: null
      }
    },
    {
      id: '...',
      target_type: 'order',
      target_id: 'order-uuid',
      action_type: 'updated',
      actor_id: 'admin-uuid',
      actor_role: 'admin',
      actor_display_name: '小愛',
      old_values: { status: 'pending' },
      new_values: { status: 'confirmed' },
      notes: '訂單已確認',
      created_at: '2026-01-04T10:30:00Z',
      actor: {
        id: 'admin-uuid',
        full_name: '王小愛',
        username: 'alice'
      }
    }
  ]
}
```

**使用場景**:
- 訂單詳情頁：顯示該訂單的完整操作時間軸
- 商品編輯頁：顯示該商品的價格與庫存變更歷史
- 客戶詳情頁：顯示該客戶的等級調整記錄

---

### 4. getAuditLogStats

**用途**: 查詢操作日誌統計（依操作類型分組）

**簽名**:
```typescript
export async function getAuditLogStats(
  dateFrom?: string,
  dateTo?: string
): Promise<ActionResult<Record<AuditActionType, number>>>
```

**權限**: 管理員 (role = 'admin')

**查詢邏輯**:
```typescript
const supabase = await createClient()

let query = supabase
  .from('audit_logs')
  .select('action_type')

if (dateFrom) {
  query = query.gte('created_at', dateFrom)
}
if (dateTo) {
  query = query.lte('created_at', dateTo)
}

const { data: logs } = await query

// 統計各操作類型數量
const stats = logs.reduce((acc, log) => {
  acc[log.action_type] = (acc[log.action_type] || 0) + 1
  return acc
}, {} as Record<AuditActionType, number>)
```

**回傳範例**:
```typescript
{
  success: true,
  data: {
    created: 120,
    updated: 450,
    deleted: 10,
    stock_adjusted: 200,
    comment_added: 80
  }
}
```

**使用場景**:
- 管理員儀表板：顯示本週/本月操作統計
- 系統健康監控：分析操作頻率與類型分布

---

## JSONB Query Examples

### 查詢所有庫存從 100 調整的操作

```typescript
const { data: logs } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('action_type', 'stock_adjusted')
  .contains('old_values', { stock: 100 })  // JSONB @> 運算子
```

### 查詢所有價格調整操作

```typescript
const { data: logs } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('target_type', 'tier_price')
  .eq('action_type', 'updated')
  .or('old_values->price.neq.new_values->price')  // JSONB ->> 運算子
```

### 查詢特定欄位的變更

```typescript
const { data: logs } = await supabase
  .from('audit_logs')
  .select('*')
  .filter('old_values', 'cs', '{"tier_name"}')  // JSONB ? 運算子 (contains key)
```

---

## UI 顏色編碼

操作類型使用顏色編碼以提升可讀性：

| `action_type` | 顏色 | Tailwind 類別 | 說明 |
|--------------|------|--------------|------|
| `created` | 🟢 綠色 | `bg-green-100 text-green-800` | 建立操作 |
| `updated` | 🔵 藍色 | `bg-blue-100 text-blue-800` | 更新操作 |
| `deleted` | 🔴 紅色 | `bg-red-100 text-red-800` | 刪除操作 |
| `stock_adjusted` | 🟠 橙色 | `bg-orange-100 text-orange-800` | 庫存操作 |
| `comment_added` | 🟡 黃色 | `bg-yellow-100 text-yellow-800` | 溝通操作 |

**UI 元件範例**:
```tsx
function ActionTypeBadge({ actionType }: { actionType: AuditActionType }) {
  const colorMap = {
    created: 'bg-green-100 text-green-800',
    updated: 'bg-blue-100 text-blue-800',
    deleted: 'bg-red-100 text-red-800',
    stock_adjusted: 'bg-orange-100 text-orange-800',
    comment_added: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <span className={`px-2 py-1 rounded ${colorMap[actionType]}`}>
      {actionType}
    </span>
  )
}
```

---

## Error Handling

所有 Server Actions 遵循統一的錯誤處理模式：

```typescript
try {
  // 1. 權限檢查
  await checkAuth('admin')

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
  return { success: true, data }

} catch (error) {
  console.error('[Audit API Error]', error)
  return {
    success: false,
    message: error instanceof Error ? error.message : '系統錯誤'
  }
}
```

**注意**: `logAudit` 函式不應拋出錯誤，以免影響主流程：

```typescript
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    // ... 記錄邏輯
  } catch (error) {
    console.error('[Audit Log Error]', error)
    // 不拋出錯誤，避免影響主流程
  }
}
```

---

## Performance Considerations

1. **索引優化**:
   - `idx_audit_logs_target`: 支援快速查詢特定實體的操作歷史
   - `idx_audit_logs_actor`: 支援快速查詢特定操作者的操作記錄
   - GIN 索引：支援 JSONB 查詢（如「所有庫存 > 100 的調整」）

2. **分頁載入**: `getAuditLogs` 使用 `limit` / `offset` 分頁，避免一次載入過多資料

3. **非同步記錄**: `logAudit` 應在主流程完成後執行，不阻塞使用者操作

4. **RLS 繞過**: 使用 Service Role Client (`createAdminClient`) 寫入日誌，避免 RLS INSERT 限制

---

## Testing Checklist

- [ ] 商品建立時記錄操作日誌
- [ ] 商品更新時記錄變更前後資料
- [ ] 商品刪除時記錄刪除的資料快照
- [ ] 庫存調整記錄正確的舊值與新值
- [ ] 管理員可查詢所有操作日誌
- [ ] 管理員可依操作類型篩選日誌
- [ ] 管理員可依日期範圍篩選日誌
- [ ] 管理員可搜尋目標 ID 或操作者
- [ ] 查詢特定實體的操作歷史正確顯示時間軸
- [ ] 刪除操作者後日誌仍保留暱稱快照
- [ ] 操作日誌不可修改或刪除（RLS 驗證）
- [ ] 客戶無法查看操作日誌（RLS 驗證）
- [ ] JSONB 查詢正確運作（如「庫存 > 100」）
- [ ] 分頁載入效能正常（10,000 筆記錄）

---

**Status**: ✅ Completed
**Related**: admin-api.md, system-api.md
**Date**: 2026-01-04
