# Supabase RLS 效能優化 - 快速參考卡

**版本**: 1.0 | **日期**: 2026-01-03 | **專案**: Vsale-lite (004-cart-and-orders)

---

## 核心決策樹

### 我應該使用哪個 Supabase Client？

```
┌─ 我在寫什麼操作？
│
├─ 讀取單一記錄 (getOrderById)
│  └─ 是否是管理員？
│     ├─ YES → 使用 Admin Client (快速)
│     └─ NO  → 使用普通 Client (RLS 自動過濾)
│
├─ 列表查詢 (getOrders)
│  └─ 是否需要聚合/計數？
│     ├─ YES (getOrders with COUNT) → Admin Client
│     └─ NO  (簡單分頁) → 普通 Client
│
├─ 建立/更新/刪除 (createOrder, updateOrder)
│  └─ 務必使用普通 Client
│     (讓 RLS 防止意外修改其他用戶的資料)
│
└─ 報表聚合 (getSalesReport)
   └─ 必須使用 Admin Client
      (RLS 會 10-15 倍放慢聚合查詢)
```

---

## TypeScript 實作模板

### 模板 A: 簡單讀取 (客戶端或管理員)

```typescript
// ✅ 推薦用於: getOrderById, 單一記錄查詢
export async function getOrderById(orderId: string) {
  const supabase = await createClient()
  const { role } = await checkAuth()

  // 普通 Client，RLS 會自動過濾
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  // RLS 保證：
  // - 客戶只能看自己的訂單
  // - 管理員可以看所有訂單
}
```

### 模板 B: 列表查詢 + 計數 (管理員)

```typescript
// ✅ 推薦用於: getOrders (管理員視圖)
// 問題: COUNT(*) 也會套用 RLS，導致 10-15 倍放慢
export async function getOrders(params?: GetOrdersInput) {
  const supabase = await createClient()
  const { role } = await checkAuth()

  // ❌ 舊方式 (慢)
  // let query = supabase.from('orders').select('*', { count: 'exact' })

  // ✅ 新方式 (快 10-15 倍)
  const client = role === 'admin' ? createAdminClient() : supabase
  let query = client.from('orders').select('*', { count: 'exact' })

  // 後續程式碼保持不變
  const { data: orders, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
}
```

### 模板 C: 聚合查詢 (報表)

```typescript
// ✅ 推薦用於: 報表、統計、儀表板
export async function getSalesReport(startDate: string, endDate: string) {
  const { role } = await checkAuth()

  // 權限檢查 (應用層)
  if (role !== 'admin') {
    return { success: false, message: '僅管理員可查看' }
  }

  // 使用 Admin Client 繞過 RLS
  const adminClient = createAdminClient()

  // 直接聚合查詢 (快速)
  const { data: report, error } = await adminClient
    .from('orders')
    .select(`
      DATE_TRUNC('day', created_at) AS order_date,
      COUNT(*) AS total_orders,
      SUM(total_amount) AS daily_revenue,
      AVG(total_amount) AS avg_order_value
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .returns<SalesReportRow[]>()

  if (error) throw error

  return { success: true, data: report }
}
```

### 模板 D: 寫入操作 (防止意外修改)

```typescript
// ✅ 推薦用於: createOrder, updateOrder, deleteOrder
// 務必使用普通 Client，讓 RLS 保護資料
export async function updateOrder(orderId: string, updates: any) {
  const supabase = await createClient()
  const { userId } = await checkAuth()

  // ✅ 使用普通 Client (RLS 會檢查)
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .single()

  // RLS 會檢查：
  // - 客戶只能修改自己的訂單 (user_id = auth.uid())
  // - 管理員可以修改所有訂單 (role = 'admin')
}
```

---

## 效能對比速查表

| 操作 | 方式 | 耗時 | 推薦度 |
|------|------|------|--------|
| 單一記錄讀取 | Client (RLS) | ~20ms | ✅ |
| 列表查詢 (無計數) | Client (RLS) | ~30-50ms | ✅ |
| 列表 + 計數 | Client (RLS) | ~150-200ms | ❌ |
| 列表 + 計數 | Admin Client | ~30-50ms | ✅✅ |
| 日期聚合 (100K行) | Client (RLS) | ~500ms | ❌ |
| 日期聚合 (100K行) | Admin Client | ~20ms | ✅✅ |
| 複雜聚合 | Security Definer Function | ~25ms | ✅✅ |

---

## 安全性檢查清單

### 使用 Admin Client 時

- [ ] 權限檢查必須在應用層 (checkAuth())
- [ ] Service Role Key 不能暴露給客戶端
- [ ] Service Role Key 只在 Server Actions 中使用
- [ ] 敏感操作必須記錄（audit log）
- [ ] 定期檢查慢查詢日誌

### RLS 政策檢查

- [ ] 所有表都啟用 RLS? `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`
- [ ] 是否有「遺漏」的政策允許全表讀取?
- [ ] 管理員政策是否使用 EXISTS (可能很慢)?
- [ ] 寫入操作是否有 RLS 保護?

### 測試

- [ ] 客戶端是否只能看自己的資料?
- [ ] 管理員是否可以看所有資料?
- [ ] 報表查詢是否在 100ms 內完成?
- [ ] COUNT(*) 查詢是否快速響應?

---

## 常見錯誤與修復

### 錯誤 1: 對聚合查詢使用普通 Client

```typescript
// ❌ 錯誤 (慢)
export async function getSalesReport(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*')  // 錯誤：獲取所有行然後在前端計算
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // 手動聚合 (非常低效)
  const daily = {}
  for (const order of data) {
    // ...
  }
}

// ✅ 正確 (快)
export async function getSalesReport(startDate: string, endDate: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('orders')
    .select(`
      DATE_TRUNC('day', created_at) AS order_date,
      COUNT(*) AS total_orders,
      SUM(total_amount) AS daily_revenue
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
}
```

### 錯誤 2: 在客戶端使用 Service Role Key

```typescript
// ❌ 危險
// lib/supabase/client.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY  // ❌ 會洩露到前端!
)

// ✅ 正確
// lib/supabase/server.ts
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('只能在伺服器端使用!')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ 伺服器端環境變數
  )
}
```

### 錯誤 3: 依賴 RLS 過濾客戶數據但沒驗證

```typescript
// ❌ 不安全
export async function getMyOrders(limit: number) {
  const supabase = await createClient()
  // RLS 會自動過濾，但如果 RLS 政策有問題...
  const { data } = await supabase
    .from('orders')
    .select('*')
    .limit(limit)
}

// ✅ 安全
export async function getMyOrders(limit: number) {
  const supabase = await createClient()
  const { userId } = await checkAuth()

  // 明確指定 user_id (雙重保護)
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)  // 應用層檢查
    .limit(limit)
    // RLS 也會檢查 (policy: user_id = auth.uid())
}
```

---

## 索引最佳實踐

### 必需的索引

```sql
-- ✅ 必須有 (已在您的 migration 中)
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ✅ 強烈推薦 (報表查詢)
CREATE INDEX idx_orders_created_status ON orders(created_at DESC, status);

-- ✅ 推薦 (複合篩選)
CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at DESC);

-- ✅ 可選 (高頻查詢)
CREATE INDEX idx_orders_confirmed_amount ON orders(created_at DESC, total_amount)
WHERE status = 'confirmed';
```

### 監控索引

```bash
# 在 Supabase Studio 執行
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;

# 找出未使用的索引
SELECT indexname
FROM pg_stat_user_indexes
WHERE tablename = 'orders' AND idx_scan = 0;
```

---

## 效能優化步驟

### Step 1: 診斷 (5 分鐘)

```bash
# 在 Supabase Studio 執行以下 SQL
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders;

EXPLAIN ANALYZE
SELECT * FROM orders ORDER BY created_at DESC LIMIT 50;

EXPLAIN ANALYZE
SELECT DATE_TRUNC('day', created_at), COUNT(*)
FROM orders
GROUP BY DATE_TRUNC('day', created_at);
```

### Step 2: 改進 (30 分鐘)

```typescript
// 修改 lib/actions/orders.ts
// 第 237 行：改用 Admin Client
- const supabase = await createClient()
+ const client = role === 'admin' ? createAdminClient() : supabase
- let query = supabase.from('orders')
+ let query = client.from('orders')
```

### Step 3: 測試 (15 分鐘)

```bash
# 執行效能測試
pnpm test performance/orders

# 檢查改進
# 預期: 從 200-300ms → 50-80ms (3-5倍改進)
```

### Step 4: 監控 (持續)

```sql
-- 定期檢查慢查詢
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%orders%'
ORDER BY mean_exec_time DESC;
```

---

## 決策表：何時使用 Admin Client

| 查詢場景 | 使用 Admin Client | 理由 |
|----------|------------------|------|
| 客戶查看自己的訂單 | ❌ | RLS 已足夠，支援分頁 |
| 管理員查看訂單列表 | ✅ | COUNT(*) 會被 RLS 拖慢 |
| 管理員查看單一訂單 | ✅ | 避免 RLS EXISTS 檢查 |
| 產生銷售報表 | ✅✅ | 必須，否則 10-15 倍慢 |
| 產生庫存報表 | ✅✅ | 必須，複雜聚合 |
| 客戶建立訂單 | ❌ | RLS 保護用戶隔離 |
| 管理員修改訂單 | ❌ | RLS 防止意外修改 |
| API 分頁搜尋 | ⚠️ | 取決於頻率與複雜度 |

---

## 程式碼檢查清單

開發時執行這個檢查：

```typescript
// 1. 檢查 Server Actions 中的權限
export async function myServerAction() {
  const { role } = await checkAuth()  // ✅
  // NOT: 沒有權限檢查就直接查詢
}

// 2. 檢查 Admin Client 的使用
export async function adminOnlyReport() {
  const { role } = await checkAuth()
  if (role !== 'admin') return { error: 'Unauthorized' }  // ✅

  const adminClient = createAdminClient()  // ✅
  // NOT: 在前端使用 Admin Client
}

// 3. 檢查寫入操作的 RLS
export async function updateOrder() {
  const supabase = await createClient()  // ✅ 普通 Client
  // NOT: 使用 Admin Client 繞過 RLS

  const { data, error } = await supabase
    .from('orders')
    .update({...})
    .eq('id', orderId)
}

// 4. 檢查聚合查詢的 Client 選擇
export async function getDailyStats() {
  const client = isAdmin ? createAdminClient() : supabase  // ✅
  // NOT: 一律使用 supabase

  const { data } = await client
    .from('orders')
    .select(`DATE_TRUNC('day', created_at), COUNT(*)`)
    .group_by(...)  // ✅ 在資料庫端聚合
    // NOT: 在前端聚合
}
```

---

## 部署清單

在部署到 Firebase 前檢查：

- [ ] 所有 Server Actions 有權限檢查
- [ ] 報表查詢使用 Admin Client
- [ ] 索引已建立並驗證
- [ ] 效能測試通過 (< 100ms)
- [ ] 安全審計完成
- [ ] RLS 政策審查
- [ ] 備份 `.env.local` 中的 Service Role Key
- [ ] Migrations 已在本地測試
- [ ] 沒有 console.log() 和 TODO

---

## 常見 FAQ

**Q: Admin Client 安全嗎？**
A: 是的，只要：
1. Service Role Key 不暴露給前端
2. Server Actions 中有權限檢查
3. 敏感操作有日誌記錄

**Q: 是否應該一律使用 Admin Client？**
A: 不。使用分層方法：
- 讀取：優先 Client + RLS
- 寫入：一律 Client (RLS 保護)
- 聚合：Admin Client (性能)

**Q: RLS 政策很複雜會影響性能嗎？**
A: 會。簡單政策 (EXISTS 一個表) < 複雜政策 (EXISTS 多個表)。
使用 Admin Client 完全繞過此問題。

**Q: 如何測試性能？**
A: 使用 EXPLAIN ANALYZE：
```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE ...;
```

**Q: 何時應該用物化視圖？**
A: 當報表每小時變更 < 10 次時。否則成本不值得。

---

## 相關資源

- 完整研究報告: `SUPABASE_RLS_PERFORMANCE_RESEARCH.md`
- SQL 範例: `specs/004-cart-and-orders/RLS_OPTIMIZATION_EXAMPLES.sql`
- 實作指南: `specs/004-cart-and-orders/REPORTING_IMPLEMENTATION_GUIDE.md`
- Supabase 官方: https://supabase.com/docs/guides/database/postgres/row-level-security

---

**最後更新**: 2026-01-03
**版本**: 1.0
**維護者**: Claude Code Agent
