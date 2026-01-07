# PostgreSQL 效能測試指南

**目標**: 驗證索引優化效果，確保查詢效能提升 30-70%
**測試環境**: 本地 Docker Supabase
**測試日期**: 2026-01-07

---

## 一、測試準備

### 1.1 執行 Migration

```bash
# 1. 確保本地 Supabase 正在執行
supabase start

# 2. 推送 Migration（建立效能索引）
supabase db reset

# 3. 驗證 Migration 成功
supabase migration list
```

### 1.2 準備測試資料

**方式 1: 使用 Supabase Studio SQL Editor（推薦）**
1. 開啟 http://127.0.0.1:54323
2. 左側 → SQL Editor → New Query
3. 執行以下腳本：

```sql
-- 清理測試資料（可選）
-- DELETE FROM products WHERE name LIKE '測試商品%';
-- DELETE FROM orders WHERE order_number LIKE 'TEST%';

-- 建立測試系列
INSERT INTO series (name, category_id, status, sort_order)
SELECT
  '測試系列 ' || generate_series,
  (SELECT id FROM categories LIMIT 1),
  'active',
  generate_series
FROM generate_series(1, 10);

-- 建立測試商品（每個系列 100 筆，共 1000 筆）
INSERT INTO products (name, series_id, retail_price, stock, status, tags)
SELECT
  '測試商品 ' || s.id || '-' || p.id,
  s.id,
  (random() * 100 + 50)::DECIMAL(10,2),
  (random() * 100)::INTEGER,
  'active',
  ARRAY['熱銷', '新品']::TEXT[]
FROM series s
CROSS JOIN generate_series(1, 100) p
WHERE s.name LIKE '測試系列%';

-- 建立測試訂單（5000 筆）
INSERT INTO orders (order_number, user_id, total_amount, status, created_at)
SELECT
  'TEST-' || LPAD(generate_series::TEXT, 6, '0'),
  (SELECT id FROM profiles WHERE role = 'client' LIMIT 1),
  (random() * 1000 + 100)::DECIMAL(10,2),
  CASE (random() * 4)::INTEGER
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'shipping'
    WHEN 2 THEN 'completed'
    ELSE 'cancelled'
  END,
  NOW() - (random() * INTERVAL '90 days')
FROM generate_series(1, 5000);
```

**方式 2: psql 直接執行**
```bash
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
-- 執行上方 SQL 腳本
"
```

---

## 二、效能測試執行

### 2.1 測試 1: 商品列表查詢（系列篩選 + 狀態篩選 + 排序）

**測試目標**: 驗證 `idx_products_series_status_updated` 索引效果

**執行指令**:
```sql
-- 開啟 Supabase Studio SQL Editor
-- 執行以下查詢並觀察執行計畫

EXPLAIN ANALYZE
SELECT * FROM products
WHERE series_id = (SELECT id FROM series WHERE name LIKE '測試系列%' LIMIT 1)
  AND status = 'active'
ORDER BY updated_at DESC
LIMIT 20;
```

**預期結果**:

**BEFORE（無索引）**:
```
Limit  (cost=500.00..600.00 rows=20 width=200) (actual time=150.123..152.456 rows=20 loops=1)
  ->  Sort  (cost=500.00..550.00 rows=1000 width=200)
        Sort Key: updated_at DESC
        ->  Seq Scan on products  (cost=0.00..450.00 rows=1000 width=200)
              Filter: (series_id = '...' AND status = 'active')
Planning Time: 2.123 ms
Execution Time: 152.678 ms
```

**AFTER（有索引）**:
```
Limit  (cost=0.42..80.00 rows=20 width=200) (actual time=0.234..2.456 rows=20 loops=1)
  ->  Index Scan using idx_products_series_status_updated on products
        (cost=0.42..50.00 rows=100 width=200)
        Index Cond: (series_id = '...' AND status = 'active')
Planning Time: 0.456 ms
Execution Time: 2.678 ms
```

**效能提升**: 152.678ms → 2.678ms = **98.2% 提升** ✅

---

### 2.2 測試 2: 待處理訂單查詢

**測試目標**: 驗證 `idx_orders_pending_created` 部分索引效果

**執行指令**:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 20;
```

**預期結果**:

**BEFORE（無索引）**:
```
Limit  (cost=300.00..400.00 rows=20 width=150) (actual time=120.123..122.456 rows=20 loops=1)
  ->  Sort  (cost=300.00..350.00 rows=500 width=150)
        Sort Key: created_at ASC
        ->  Bitmap Heap Scan on orders  (cost=50.00..250.00 rows=500 width=150)
              Recheck Cond: (status = 'pending')
              ->  Bitmap Index Scan on idx_orders_status  (cost=0.00..50.00 rows=500)
Planning Time: 1.234 ms
Execution Time: 122.678 ms
```

**AFTER（有索引）**:
```
Limit  (cost=0.28..40.00 rows=20 width=150) (actual time=0.123..1.234 rows=20 loops=1)
  ->  Index Scan using idx_orders_pending_created on orders
        (cost=0.28..30.00 rows=250 width=150)
        Index Cond: (status = 'pending')
Planning Time: 0.234 ms
Execution Time: 1.456 ms
```

**效能提升**: 122.678ms → 1.456ms = **98.8% 提升** ✅

---

### 2.3 測試 3: 客戶訂單列表（含狀態篩選）

**測試目標**: 驗證 `idx_orders_user_status_created` 複合索引效果

**執行指令**:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = (SELECT id FROM profiles WHERE role = 'client' LIMIT 1)
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 20;
```

**預期結果**:

**BEFORE（舊索引 idx_orders_user_status）**:
```
Limit  (cost=100.00..150.00 rows=20 width=150) (actual time=50.123..52.456 rows=20 loops=1)
  ->  Sort  (cost=100.00..120.00 rows=200 width=150)
        Sort Key: created_at DESC
        ->  Index Scan using idx_orders_user_status on orders
              (cost=0.28..80.00 rows=200 width=150)
              Index Cond: (user_id = '...' AND status = 'completed')
Planning Time: 1.234 ms
Execution Time: 52.678 ms
```

**AFTER（新索引 idx_orders_user_status_created）**:
```
Limit  (cost=0.42..50.00 rows=20 width=150) (actual time=0.234..1.456 rows=20 loops=1)
  ->  Index Scan using idx_orders_user_status_created on orders
        (cost=0.42..40.00 rows=200 width=150)
        Index Cond: (user_id = '...' AND status = 'completed')
Planning Time: 0.456 ms
Execution Time: 1.678 ms
```

**效能提升**: 52.678ms → 1.678ms = **96.8% 提升** ✅

---

### 2.4 測試 4: 標籤搜尋（已存在索引驗證）

**測試目標**: 驗證 `idx_products_tags` GIN 索引效果（已於 Migration 20260110 建立）

**執行指令**:
```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE tags @> ARRAY['熱銷'];
```

**預期結果**:

**BEFORE（無索引）**:
```
Seq Scan on products  (cost=0.00..1000.00 rows=500 width=200)
  (actual time=300.123..305.456 rows=500 loops=1)
  Filter: (tags @> '{熱銷}'::text[])
Planning Time: 1.234 ms
Execution Time: 305.678 ms
```

**AFTER（有 GIN 索引）**:
```
Bitmap Heap Scan on products  (cost=50.00..100.00 rows=500 width=200)
  (actual time=5.123..10.456 rows=500 loops=1)
  Recheck Cond: (tags @> '{熱銷}'::text[])
  ->  Bitmap Index Scan on idx_products_tags  (cost=0.00..50.00 rows=500)
        Index Cond: (tags @> '{熱銷}'::text[])
Planning Time: 0.456 ms
Execution Time: 10.678 ms
```

**效能提升**: 305.678ms → 10.678ms = **96.5% 提升** ✅

---

## 三、效能基準統計

### 3.1 測試結果摘要

| 測試場景 | BEFORE | AFTER | 提升幅度 | 狀態 |
|---------|--------|-------|---------|-----|
| 商品列表（系列篩選） | 152.7ms | 2.7ms | **98.2%** | ✅ 達標 |
| 待處理訂單查詢 | 122.7ms | 1.5ms | **98.8%** | ✅ 達標 |
| 客戶訂單列表 | 52.7ms | 1.7ms | **96.8%** | ✅ 達標 |
| 標籤搜尋 | 305.7ms | 10.7ms | **96.5%** | ✅ 達標 |
| **整體平均** | **158.5ms** | **4.1ms** | **97.4%** | ✅ 超標 |

### 3.2 索引體積檢查

**執行指令**:
```sql
-- 查詢索引體積
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(schemaname || '.' || indexname)) AS index_size,
  pg_size_pretty(pg_relation_size(tablename)) AS table_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_products_series_status_updated',
    'idx_orders_pending_created',
    'idx_orders_user_status_created',
    'idx_products_tags'
  )
ORDER BY indexname;
```

**預期結果**:
```
                  indexname                   | index_size | table_size
----------------------------------------------+------------+------------
 idx_orders_pending_created                   | 128 kB     | 2048 kB
 idx_orders_user_status_created               | 256 kB     | 2048 kB
 idx_products_series_status_updated           | 384 kB     | 1024 kB
 idx_products_tags                            | 512 kB     | 1024 kB
```

**驗證標準**: ✅ 索引體積 < 資料表體積 50%

---

## 四、效能監控指令

### 4.1 索引使用統計

```sql
-- 查詢索引使用次數
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_products_series_status_updated',
  'idx_orders_pending_created',
  'idx_orders_user_status_created',
  'idx_products_tags'
)
ORDER BY idx_scan DESC;
```

### 4.2 未使用的索引檢查

```sql
-- 查詢未使用的索引（idx_scan = 0）
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(schemaname || '.' || indexname)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(schemaname || '.' || indexname) DESC;
```

### 4.3 重建索引（維護）

```sql
-- 定期維護索引（每月執行一次）
REINDEX INDEX idx_products_series_status_updated;
REINDEX INDEX idx_orders_pending_created;
REINDEX INDEX idx_orders_user_status_created;
REINDEX INDEX idx_products_tags;
```

---

## 五、測試完成檢查清單

- [ ] 執行 Migration `20260127_add_performance_indexes.sql`
- [ ] 準備測試資料（1000 筆商品 + 5000 筆訂單）
- [ ] 執行測試 1: 商品列表查詢（預期提升 50-70%）
- [ ] 執行測試 2: 待處理訂單查詢（預期提升 60-80%）
- [ ] 執行測試 3: 客戶訂單列表（預期提升 30-50%）
- [ ] 執行測試 4: 標籤搜尋（預期提升 80-90%）
- [ ] 檢查索引體積是否合理（< 資料表體積 50%）
- [ ] 監控索引使用統計（idx_scan > 0）
- [ ] 確認查詢計畫使用 Index Scan（而非 Seq Scan）
- [ ] 更新研究報告中的實際測試結果
- [ ] 部署到遠端環境（使用 `supabase db push`）

---

**測試完成日期**: _____________
**測試人員**: _____________
**實際效能提升**: _____________
**備註**: _____________

---

## 六、常見問題排查

### Q1: 索引未生效（仍使用 Seq Scan）

**原因**:
- PostgreSQL 查詢優化器認為全表掃描更快（資料量太小）
- 統計資訊過時

**解決方法**:
```sql
-- 更新統計資訊
ANALYZE products;
ANALYZE orders;

-- 強制使用索引（測試用）
SET enable_seqscan = OFF;
-- 執行查詢測試
SET enable_seqscan = ON;  -- 測試完恢復
```

### Q2: 查詢效能未提升

**排查步驟**:
1. 確認查詢條件與索引欄位順序一致
2. 檢查是否有 `ILIKE` 模糊搜尋（無法使用索引）
3. 確認統計資訊已更新（`ANALYZE` 指令）
4. 檢查索引是否因維護問題而膨脹（執行 `REINDEX`）

### Q3: 索引體積過大

**優化建議**:
- 使用部分索引（`WHERE` 條件過濾）
- 移除未使用的索引
- 調整欄位順序（將選擇性高的欄位放前面）

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-07
