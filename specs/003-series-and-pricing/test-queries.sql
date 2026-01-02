-- ============================================
-- 測試查詢：Feature 003 資料庫驗證
-- ============================================
-- 用途：在 Supabase SQL Editor 中執行以下查詢，驗證資料庫狀態
-- ============================================

-- ============================================
-- 1. 驗證資料表結構
-- ============================================

-- 1.1 檢查 series 表是否存在
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'series'
ORDER BY ordinal_position;

-- 預期結果：應該看到 id, category_id, name, description, image_url, status, sort_order, created_at, updated_at

-- 1.2 檢查 tier_prices 表是否存在
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tier_prices'
ORDER BY ordinal_position;

-- 預期結果：應該看到 id, tier_id, product_id, price, created_at, updated_at

-- 1.3 檢查 products 表是否包含新欄位
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('series_id', 'retail_price', 'stock_status');

-- 預期結果：應該看到 series_id (uuid), retail_price (numeric), stock_status (text)

-- 1.4 檢查 categories 表是否包含 code 欄位
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name = 'code';

-- 預期結果：應該看到 code (character varying)

-- ============================================
-- 2. 驗證約束與索引
-- ============================================

-- 2.1 檢查 UNIQUE 約束
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_name IN ('categories', 'products', 'tier_prices')
ORDER BY tc.table_name, kcu.column_name;

-- 預期結果：
-- - categories.code (UNIQUE)
-- - products.code (UNIQUE)
-- - tier_prices (tier_id, product_id) 複合 UNIQUE

-- 2.2 檢查索引
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('series', 'tier_prices', 'products')
ORDER BY tablename, indexname;

-- 預期結果：應該看到多個索引（idx_series_category_id, idx_tier_prices_lookup 等）

-- ============================================
-- 3. 驗證 PostgreSQL Function 與 Trigger
-- ============================================

-- 3.1 檢查商品編號自動產生函式
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name IN ('generate_product_code', 'auto_generate_product_code');

-- 預期結果：應該看到兩個函式

-- 3.2 檢查 Trigger
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_generate_product_code';

-- 預期結果：BEFORE INSERT ON products

-- ============================================
-- 4. 驗證 RLS 策略
-- ============================================

-- 4.1 檢查 series 表 RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'series';

-- 預期結果：應該有 2 個策略（讀取 active 系列、管理員管理）

-- 4.2 檢查 tier_prices 表 RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'tier_prices';

-- 預期結果：應該有 2 個策略（已認證用戶讀取、管理員管理）

-- 4.3 檢查 products 表 RLS（更新後）
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'products';

-- 預期結果：應該有策略檢查 products.status AND series.status

-- ============================================
-- 5. 驗證資料遷移
-- ============================================

-- 5.1 檢查系列數量
SELECT COUNT(*) as series_count FROM series;

-- 預期結果：應該有 3 個系列（若已執行 Migration 的資料遷移部分）

-- 5.2 檢查所有商品是否都有 series_id
SELECT
    COUNT(*) as total_products,
    COUNT(series_id) as products_with_series,
    COUNT(*) - COUNT(series_id) as products_without_series
FROM products;

-- 預期結果：products_without_series 應為 0

-- 5.3 檢查「未分類系列」
SELECT
    s.id,
    s.name,
    s.category_id,
    c.name as category_name,
    COUNT(p.id) as product_count
FROM series s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN products p ON p.series_id = s.id
WHERE s.name LIKE '%未分類%'
GROUP BY s.id, s.name, s.category_id, c.name;

-- 預期結果：應該看到每個分類都有一個「未分類」系列

-- ============================================
-- 6. 測試資料查詢
-- ============================================

-- 6.1 查詢所有分類與其代碼
SELECT id, name, code, status FROM categories ORDER BY name;

-- 6.2 查詢所有系列與其所屬分類
SELECT
    s.id,
    s.name as series_name,
    c.name as category_name,
    c.code as category_code,
    s.status,
    COUNT(p.id) as product_count
FROM series s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN products p ON p.series_id = s.id
GROUP BY s.id, s.name, c.name, c.code, s.status
ORDER BY c.name, s.name;

-- 6.3 查詢所有商品與其編號
SELECT
    p.id,
    p.code,
    p.name,
    s.name as series_name,
    c.code as category_code,
    p.retail_price,
    p.stock,
    p.stock_status,
    p.status
FROM products p
INNER JOIN series s ON p.series_id = s.id
INNER JOIN categories c ON s.category_id = c.id
ORDER BY p.code;

-- 6.4 查詢所有等級與其價格設定
SELECT
    p.code as product_code,
    p.name as product_name,
    t.name as tier_name,
    tp.price
FROM products p
CROSS JOIN tiers t
LEFT JOIN tier_prices tp ON tp.product_id = p.id AND tp.tier_id = t.id
ORDER BY p.code, t.rank;

-- ============================================
-- 7. 測試商品編號自動產生
-- ============================================

-- 7.1 測試自動編號 Function（不實際插入）
DO $$
DECLARE
    test_series_id UUID;
    test_code VARCHAR(50);
BEGIN
    -- 取得第一個系列的 ID
    SELECT id INTO test_series_id FROM series LIMIT 1;

    -- 測試產生編號
    test_code := generate_product_code(test_series_id);

    RAISE NOTICE '測試產生的商品編號: %', test_code;
END $$;

-- 預期結果：NOTICE 顯示類似 DRK-0001 的編號

-- ============================================
-- 8. 測試 RLS 策略（模擬客戶查詢）
-- ============================================

-- 8.1 模擬客戶查詢 active 系列
-- 注意：此查詢在 SQL Editor 中以管理員身份執行，所以會看到所有系列
-- 實際 RLS 策略在應用程式中透過 auth.uid() 檢查
SELECT
    id,
    name,
    status,
    category_id
FROM series
WHERE status = 'active';

-- 8.2 模擬客戶查詢 active 商品（含 active 系列）
SELECT
    p.id,
    p.code,
    p.name,
    p.status as product_status,
    s.status as series_status
FROM products p
INNER JOIN series s ON p.series_id = s.id
WHERE p.status = 'active' AND s.status = 'active';

-- ============================================
-- 9. 清理測試資料（選用）
-- ============================================

-- 警告：以下指令會刪除資料，請謹慎使用！
-- 僅在需要重置測試環境時執行

-- -- 刪除所有等級價格
-- DELETE FROM tier_prices;

-- -- 刪除所有商品
-- DELETE FROM products;

-- -- 刪除所有系列
-- DELETE FROM series;

-- ============================================
-- 10. 效能測試查詢
-- ============================================

-- 10.1 查詢執行計畫 - 系列商品與價格（前台核心查詢）
EXPLAIN ANALYZE
SELECT
    p.*,
    tp.price as user_price
FROM products p
INNER JOIN series s ON p.series_id = s.id
LEFT JOIN tier_prices tp ON p.id = tp.product_id
WHERE p.series_id = (SELECT id FROM series LIMIT 1)
    AND p.status = 'active'
    AND s.status = 'active'
    AND tp.tier_id = (SELECT id FROM tiers LIMIT 1);

-- 預期結果：Execution Time < 100ms

-- 10.2 查詢執行計畫 - 商品編號自動產生
EXPLAIN ANALYZE
SELECT COALESCE(
    MAX(CAST(SUBSTRING(code FROM '\d+') AS INTEGER)),
    0
) as max_number
FROM products p
INNER JOIN series s ON p.series_id = s.id
INNER JOIN categories c ON s.category_id = c.id
WHERE c.code = 'DRK'
    AND p.code ~ ('^DRK-\d{4}$');

-- 預期結果：Execution Time < 50ms

-- ============================================
-- 查詢完成
-- ============================================
-- 以上所有查詢均可在 Supabase SQL Editor 中執行
-- 若有任何查詢失敗，請檢查 Migration 是否正確執行
-- ============================================
