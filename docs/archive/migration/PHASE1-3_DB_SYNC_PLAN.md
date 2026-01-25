# Phase 1-3 資料庫同步計畫

**目標**: 將主站點的性能優化 Migration（Phase 1-3）同步到站點二

**建立日期**: 2026-01-25
**狀態**: ✅ 準備就緒

---

## 📋 需要同步的 Migration 清單

### Phase 1: 快取與並行查詢優化

#### 1. `20260124151211_optimize_home_page_queries.sql`
**功能**: 首頁查詢性能優化索引

**新增的索引**:
- `idx_products_series_status` - 商品依系列+狀態查詢
- `idx_tier_prices_product_tier` - 等級價格複合索引
- `idx_products_tags` - 標籤 GIN 索引
- `idx_home_blocks_active_sort` - 首頁區塊查詢索引
- `idx_series_category_status` - 系列依分類+狀態查詢

**影響範圍**:
- 首頁商品展示
- 等級價格查詢
- 標籤篩選

**預期提升**: 查詢時間 200-500ms → 50-100ms

---

#### 2. `20260125125922_performance_indexes.sql`
**功能**: 後台管理系統性能索引

**新增的索引**:
- `idx_orders_user_id_status` - 訂單列表篩選索引
- `idx_orders_created_at` - 訂單時間排序索引
- `idx_order_items_order_id` - 訂單明細查詢索引
- `idx_profiles_tier_id` - 客戶等級查詢索引
- `idx_orders_status_created_at` - 訂單狀態+時間複合索引（Dashboard）

**影響範圍**:
- 訂單列表查詢
- Dashboard 待處理訂單
- 客戶列表篩選

**預期提升**:
- 訂單列表: 300ms → 80ms (-73%)
- Dashboard: 200ms → 50ms (-75%)

---

### Phase 3.3: PostgreSQL Materialized View

#### 3. `20260125135954_product_list_materialized_view.sql`
**功能**: 商品列表 Materialized View（預先計算 JOIN 結果）

**新增的資料庫物件**:
- **Materialized View**: `product_list_view`（products LEFT JOIN series）
- **Trigger Function**: `refresh_product_list_view()`
- **Triggers**:
  - `trigger_refresh_product_list_on_insert` (products)
  - `trigger_refresh_product_list_on_update` (products)
  - `trigger_refresh_product_list_on_delete` (products)
  - `trigger_refresh_product_list_on_series_update` (series)
  - `trigger_refresh_product_list_on_series_delete` (series)
- **索引**:
  - `idx_product_list_view_id` (UNIQUE, 支援 CONCURRENTLY refresh)
  - `idx_product_list_view_series_status_created`
  - `idx_product_list_view_tags`
  - `idx_product_list_view_search`

**影響範圍**:
- 後台商品列表查詢（`getProducts()`）
- 商品篩選與搜尋

**預期提升**: 查詢時間 200ms → 120ms (-40%)

**Trade-off**:
- ✅ 讀取操作（頻繁）：提升 40-44%
- ⚠️ 寫入操作（較少）：增加 10-50ms（Trigger 刷新時間）
- ✅ 整體效益：正向（讀多寫少場景）

---

## 🚀 同步執行計畫

### 前置檢查

```bash
# 1. 確認目前在主站點
supabase status

# 2. 確認所有 Migration 已在主站點成功執行
supabase migration list

# 3. 確認站點二環境變數已設定
# 檢查 .env.local 中是否有以下變數：
# NEXT_PUBLIC_SUPABASE_URL_SITE2=https://rdyvmgomjdglflrcfijs.supabase.co
# SUPABASE_SERVICE_ROLE_KEY_SITE2=...
```

### 步驟 1: 連線到站點二

```bash
# 切換到站點二專案
supabase link --project-ref rdyvmgomjdglflrcfijs

# 確認連線成功
supabase status
```

**預期輸出**:
```
Linked to project: rdyvmgomjdglflrcfijs
```

---

### 步驟 2: 推送 Migration

```bash
# 推送所有未執行的 Migration 到站點二
supabase db push
```

**系統會顯示待推送的 Migration 清單**:
```
Do you want to push these migrations to the remote database?
 • 20260124151211_optimize_home_page_queries.sql
 • 20260125125922_performance_indexes.sql
 • 20260125135954_product_list_materialized_view.sql

 [Y/n]
```

**按 Y 確認推送**

---

### 步驟 3: 驗證同步結果

#### 3.1 檢查索引是否建立成功

```sql
-- 連線到站點二的 SQL Editor，執行以下查詢

-- 檢查 Phase 1 索引
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**預期結果**: 應包含以下索引
- `idx_products_series_status`
- `idx_tier_prices_product_tier`
- `idx_products_tags`
- `idx_home_blocks_active_sort`
- `idx_series_category_status`
- `idx_orders_user_id_status`
- `idx_orders_created_at`
- `idx_order_items_order_id`
- `idx_profiles_tier_id`
- `idx_orders_status_created_at`
- `idx_product_list_view_id`
- `idx_product_list_view_series_status_created`
- `idx_product_list_view_tags`
- `idx_product_list_view_search`

---

#### 3.2 檢查 Materialized View 是否建立成功

```sql
-- 檢查 Materialized View
SELECT
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public';
```

**預期結果**: 應包含
- `product_list_view`

---

#### 3.3 檢查 Triggers 是否建立成功

```sql
-- 檢查 Triggers
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trigger_refresh_product_list_%'
ORDER BY trigger_name;
```

**預期結果**: 應包含 5 個 Triggers
- `trigger_refresh_product_list_on_insert`
- `trigger_refresh_product_list_on_update`
- `trigger_refresh_product_list_on_delete`
- `trigger_refresh_product_list_on_series_update`
- `trigger_refresh_product_list_on_series_delete`

---

#### 3.4 測試 Materialized View 查詢

```sql
-- 測試查詢 Materialized View
SELECT
  id,
  code,
  name,
  series_name,
  series_color,
  status
FROM product_list_view
WHERE status = 'active'
LIMIT 10;
```

**預期結果**: 應回傳商品資料（含 series_name 和 series_color）

---

### 步驟 4: 切換回主站點

```bash
# 切換回主站點專案
supabase link --project-ref qwovavytryvgchcowjof

# 確認連線成功
supabase status
```

---

## ⚠️ 注意事項

### 安全性檢查
1. ✅ **備份優先**: 推送前確認站點二已有最新備份
2. ✅ **增量式 Migration**: 所有 Migration 都是增量式（僅新增索引和 View）
3. ✅ **無破壞性操作**: 不包含 DROP, TRUNCATE, ALTER ... DROP COLUMN
4. ✅ **使用 IF NOT EXISTS**: 避免重複執行錯誤

### 性能影響
1. ⚡ **索引建立時間**: 約 10-30 秒（取決於資料量）
2. ⚡ **Materialized View 初次建立**: 約 5-15 秒（取決於商品數量）
3. ⚡ **無鎖表操作**: 使用 `CREATE INDEX IF NOT EXISTS` 和 `CONCURRENTLY`（Materialized View 除外）

### 回滾計畫（萬一需要）

如果同步後發現問題，可執行以下 SQL 回滾：

```sql
-- 回滾 Materialized View
DROP MATERIALIZED VIEW IF EXISTS product_list_view CASCADE;

-- 回滾索引（Phase 1）
DROP INDEX IF EXISTS idx_products_series_status;
DROP INDEX IF EXISTS idx_tier_prices_product_tier;
DROP INDEX IF EXISTS idx_products_tags;
DROP INDEX IF EXISTS idx_home_blocks_active_sort;
DROP INDEX IF EXISTS idx_series_category_status;

-- 回滾索引（Phase 1.3）
DROP INDEX IF EXISTS idx_orders_user_id_status;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_profiles_tier_id;
DROP INDEX IF EXISTS idx_orders_status_created_at;

-- 回滾索引（Phase 3.3）
DROP INDEX IF EXISTS idx_product_list_view_id;
DROP INDEX IF EXISTS idx_product_list_view_series_status_created;
DROP INDEX IF EXISTS idx_product_list_view_tags;
DROP INDEX IF EXISTS idx_product_list_view_search;

-- 回滾 Trigger Function
DROP FUNCTION IF EXISTS refresh_product_list_view CASCADE;
```

**注意**: 使用 `CASCADE` 會自動刪除所有依賴的 Triggers

---

## 📊 同步完成檢查清單

- [ ] 步驟 1: 連線到站點二成功
- [ ] 步驟 2: 推送 3 個 Migration 成功
- [ ] 步驟 3.1: 驗證 14 個索引存在
- [ ] 步驟 3.2: 驗證 `product_list_view` 存在
- [ ] 步驟 3.3: 驗證 5 個 Triggers 存在
- [ ] 步驟 3.4: 測試查詢 Materialized View 成功
- [ ] 步驟 4: 切換回主站點成功

---

## 🎯 同步後應用程式碼無需修改

**重要**: 應用程式碼（`lib/actions/products.ts`）已修改為使用 `product_list_view`，因此同步後無需額外修改程式碼。

站點二的應用程式會自動使用 Materialized View，享受性能提升。

---

## 📞 聯絡資訊

如有問題，請參考：
- [站點資訊](SITE_CREDENTIALS.md)
- [完整遷移指南](SITE2_MIGRATION_GUIDE.md)
- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md)

---

**建立者**: Claude Code
**最後更新**: 2026-01-25
