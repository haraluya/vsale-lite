# PostgreSQL 系統表查詢快速參考

**Feature**: 012-migration-consolidation
**Created**: 2026-01-07
**Purpose**: 提供查詢 PostgreSQL 系統表的常用 SQL 語句，用於資料庫健康檢查與 Schema 驗證

---

## 1. 表相關查詢

### 1.1 查詢所有表
```sql
-- 查詢 public schema 的所有表
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 1.2 查詢表數量
```sql
-- 統計 public schema 的表數量
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
```

### 1.3 查詢表的詳細資訊
```sql
-- 查詢表的 OID、大小、註解
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.reltuples AS row_estimate,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  obj_description(c.oid) AS comment
FROM pg_class c
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY c.relname;
```

---

## 2. 欄位相關查詢

### 2.1 查詢指定表的所有欄位
```sql
-- 查詢 orders 表的所有欄位
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
ORDER BY ordinal_position;
```

### 2.2 查詢所有表的欄位總數
```sql
-- 統計每個表的欄位數量
SELECT
  table_name,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

### 2.3 查詢特定欄位的詳細資訊
```sql
-- 查詢所有表的 status 欄位
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'status'
ORDER BY table_name;
```

### 2.4 查詢欄位註解
```sql
-- 查詢所有欄位的註解
SELECT
  c.table_name,
  c.column_name,
  pgd.description AS comment
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables st
  ON c.table_schema = st.schemaname AND c.table_name = st.relname
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = st.relid
  AND pgd.objsubid = c.ordinal_position
WHERE c.table_schema = 'public'
  AND pgd.description IS NOT NULL
ORDER BY c.table_name, c.ordinal_position;
```

---

## 3. 索引相關查詢

### 3.1 查詢所有索引
```sql
-- 查詢 public schema 的所有索引
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 3.2 查詢索引總數
```sql
-- 統計索引數量（不含主鍵索引）
SELECT COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey';
```

### 3.3 查詢指定表的索引
```sql
-- 查詢 products 表的所有索引
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'products'
ORDER BY indexname;
```

### 3.4 查詢重複索引
```sql
-- 查詢重複索引（相同的 indexdef）
SELECT
  tablename,
  STRING_AGG(indexname, ', ') AS duplicate_indexes,
  COUNT(*) AS count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
GROUP BY tablename, indexdef
HAVING COUNT(*) > 1
ORDER BY tablename;
```

### 3.5 查詢 GIN 索引
```sql
-- 查詢所有 GIN 索引
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%USING gin%'
ORDER BY tablename, indexname;
```

### 3.6 查詢未使用的索引
```sql
-- 查詢未使用的索引（需啟用 pg_stat_statements）
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 4. 約束相關查詢

### 4.1 查詢所有約束
```sql
-- 查詢 public schema 的所有約束
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
```

### 4.2 查詢 UNIQUE 約束
```sql
-- 查詢所有 UNIQUE 約束
SELECT
  tc.table_name,
  tc.constraint_name,
  STRING_AGG(kcu.column_name, ', ') AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;
```

### 4.3 查詢外鍵約束
```sql
-- 查詢所有外鍵約束（含刪除規則）
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 4.4 查詢 CHECK 約束
```sql
-- 查詢所有 CHECK 約束（含條件）
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
  AND tc.table_schema = cc.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;
```

---

## 5. RLS 相關查詢

### 5.1 查詢 RLS 啟用狀態
```sql
-- 查詢所有表的 RLS 啟用狀態
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 5.2 查詢未啟用 RLS 的表
```sql
-- 查詢未啟用 RLS 的表
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
```

### 5.3 查詢所有 RLS Policies
```sql
-- 查詢 public schema 的所有 RLS Policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 5.4 查詢指定表的 Policies
```sql
-- 查詢 orders 表的所有 Policies
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
ORDER BY policyname;
```

### 5.5 統計每個表的 Policy 數量
```sql
-- 統計每個表的 Policy 數量
SELECT
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;
```

---

## 6. PostgreSQL 函數相關查詢

### 6.1 查詢所有函數
```sql
-- 查詢 public schema 的所有函數
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### 6.2 查詢函數參數
```sql
-- 查詢函數參數
SELECT
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
  ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_type = 'FUNCTION'
ORDER BY r.routine_name, p.ordinal_position;
```

### 6.3 查詢函數授權
```sql
-- 查詢函數授權（GRANT EXECUTE）
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND privilege_type = 'EXECUTE'
ORDER BY routine_name, grantee;
```

### 6.4 查詢未授權給 authenticated 角色的函數
```sql
-- 查詢未授權的函數
SELECT r.routine_name
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
  AND r.routine_type = 'FUNCTION'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges rp
    WHERE rp.routine_schema = r.routine_schema
      AND rp.routine_name = r.routine_name
      AND rp.grantee = 'authenticated'
      AND rp.privilege_type = 'EXECUTE'
  )
ORDER BY r.routine_name;
```

### 6.5 查詢函數原始碼
```sql
-- 查詢函數原始碼
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
```

---

## 7. Trigger 相關查詢

### 7.1 查詢所有 Triggers
```sql
-- 查詢所有 Triggers
SELECT
  trigger_name,
  event_manipulation AS event,
  event_object_table AS table_name,
  action_statement AS trigger_function
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 7.2 查詢指定表的 Triggers
```sql
-- 查詢 products 表的 Triggers
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'products'
ORDER BY trigger_name;
```

---

## 8. View 相關查詢

### 8.1 查詢所有 Views
```sql
-- 查詢所有 Views
SELECT
  table_name AS view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 8.2 查詢 View 使用的表
```sql
-- 查詢 View 相依的表
SELECT
  v.table_name AS view_name,
  vt.table_name AS dependent_table
FROM information_schema.views v
JOIN information_schema.view_table_usage vt
  ON v.table_name = vt.view_name
  AND v.table_schema = vt.view_schema
WHERE v.table_schema = 'public'
ORDER BY v.table_name, vt.table_name;
```

---

## 9. 統計資訊查詢

### 9.1 查詢表的統計資訊
```sql
-- 查詢表的大小與行數估計
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS data_size,
  n_live_tup AS row_estimate,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### 9.2 查詢索引效能統計
```sql
-- 查詢索引使用統計
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## 10. 快速檢查腳本

### 10.1 資料庫整體健康檢查
```sql
-- 快速健康檢查（一次性查詢）
SELECT
  '表數量' AS check_item,
  COUNT(*)::TEXT AS result
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT
  '索引數量（不含主鍵）',
  COUNT(*)::TEXT
FROM pg_indexes
WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'

UNION ALL

SELECT
  'RLS 啟用表數量',
  COUNT(*)::TEXT
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT
  'RLS Policy 數量',
  COUNT(*)::TEXT
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
  'PostgreSQL 函數數量',
  COUNT(*)::TEXT
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'

UNION ALL

SELECT
  'CHECK 約束數量',
  COUNT(*)::TEXT
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'CHECK'

UNION ALL

SELECT
  '外鍵約束數量',
  COUNT(*)::TEXT
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';
```

### 10.2 檢查缺失項目（快速掃描）
```sql
-- 檢查未啟用 RLS 的表
SELECT
  '未啟用 RLS 的表' AS issue_type,
  tablename AS detail
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false

UNION ALL

-- 檢查 Policy 數量過少的表
SELECT
  'Policy 數量 < 2 的表',
  tablename
FROM (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
  HAVING COUNT(*) < 2
) AS t

UNION ALL

-- 檢查未使用的索引
SELECT
  '未使用的索引',
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0;
```

---

## 11. 常用查詢組合

### 11.1 完整的表資訊
```sql
-- 查詢表的完整資訊（欄位、索引、約束、RLS）
WITH table_info AS (
  SELECT 'orders' AS target_table
)
SELECT
  'Columns' AS category,
  column_name AS name,
  data_type AS detail
FROM information_schema.columns, table_info
WHERE table_schema = 'public' AND table_name = target_table

UNION ALL

SELECT
  'Indexes',
  indexname,
  indexdef
FROM pg_indexes, table_info
WHERE schemaname = 'public' AND tablename = target_table

UNION ALL

SELECT
  'Constraints',
  constraint_name,
  constraint_type
FROM information_schema.table_constraints, table_info
WHERE table_schema = 'public' AND table_name = target_table

UNION ALL

SELECT
  'RLS Policies',
  policyname,
  cmd::TEXT
FROM pg_policies, table_info
WHERE schemaname = 'public' AND tablename = target_table

ORDER BY category, name;
```

---

## 使用範例

### 範例 1: 檢查新增的欄位是否存在
```sql
-- 檢查 tiers 表是否有 shipping_fee 欄位
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'tiers'
    AND column_name = 'shipping_fee'
) AS column_exists;
```

### 範例 2: 檢查索引是否建立成功
```sql
-- 檢查 idx_products_tags GIN 索引是否存在
SELECT EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_products_tags'
    AND indexdef LIKE '%USING gin%'
) AS gin_index_exists;
```

### 範例 3: 檢查 RLS Policy 是否正確設定
```sql
-- 檢查 orders 表的客戶 SELECT Policy
SELECT
  policyname,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
  AND policyname = 'Clients can view their own orders';
```

---

## 附錄: 系統表參考

| 系統表/視圖 | 用途 | 常用欄位 |
|------------|------|---------|
| `information_schema.tables` | 查詢表清單 | table_name, table_type |
| `information_schema.columns` | 查詢欄位清單 | column_name, data_type, is_nullable |
| `pg_indexes` | 查詢索引清單 | indexname, indexdef |
| `pg_tables` | 查詢表詳細資訊 | tablename, rowsecurity |
| `pg_policies` | 查詢 RLS Policies | policyname, tablename, qual |
| `information_schema.table_constraints` | 查詢約束清單 | constraint_name, constraint_type |
| `information_schema.routines` | 查詢函數清單 | routine_name, routine_type |
| `information_schema.routine_privileges` | 查詢函數授權 | routine_name, grantee, privilege_type |
| `pg_stat_user_tables` | 查詢表統計資訊 | n_live_tup, last_vacuum |
| `pg_stat_user_indexes` | 查詢索引統計資訊 | idx_scan, idx_tup_read |

---

**最後更新**: 2026-01-07
