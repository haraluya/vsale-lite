-- ============================================
-- 測試資料生成：Feature 003
-- ============================================
-- 用途：快速建立測試資料供手動測試使用
-- 執行環境：Supabase SQL Editor
-- 注意：執行前請確認 Migration 已完成
-- ============================================

-- ============================================
-- 1. 確認現有資料
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '開始檢查現有資料...';
    RAISE NOTICE '============================================';
END $$;

-- 檢查分類數量
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM categories;
    RAISE NOTICE '現有分類數量: %', category_count;
END $$;

-- 檢查系列數量
DO $$
DECLARE
    series_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO series_count FROM series;
    RAISE NOTICE '現有系列數量: %', series_count;
END $$;

-- 檢查商品數量
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    RAISE NOTICE '現有商品數量: %', product_count;
END $$;

-- 檢查會員等級數量
DO $$
DECLARE
    tier_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tier_count FROM tiers;
    RAISE NOTICE '現有會員等級數量: %', tier_count;
END $$;

-- ============================================
-- 2. 建立測試分類（若不存在）
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '建立測試分類...';
    RAISE NOTICE '============================================';
END $$;

-- 插入分類（使用 ON CONFLICT DO NOTHING 避免重複）
INSERT INTO categories (name, code, status, sort_order) VALUES
    ('飲料', 'DRK', 'active', 1),
    ('零食', 'SNK', 'active', 2),
    ('日用品', 'DAI', 'active', 3)
ON CONFLICT (code) DO NOTHING;

-- 顯示結果
DO $$
BEGIN
    RAISE NOTICE '✓ 分類建立完成';
    RAISE NOTICE '  - 飲料 (DRK)';
    RAISE NOTICE '  - 零食 (SNK)';
    RAISE NOTICE '  - 日用品 (DAI)';
END $$;

-- ============================================
-- 3. 建立測試系列
-- ============================================

DO $$
DECLARE
    v_drk_category_id UUID;
    v_snk_category_id UUID;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '建立測試系列...';
    RAISE NOTICE '============================================';

    -- 取得分類 ID
    SELECT id INTO v_drk_category_id FROM categories WHERE code = 'DRK';
    SELECT id INTO v_snk_category_id FROM categories WHERE code = 'SNK';

    -- 插入系列
    INSERT INTO series (category_id, name, description, status, sort_order) VALUES
        (v_drk_category_id, '美粒果系列', '100% 純果汁系列', 'active', 1),
        (v_drk_category_id, '茶飲系列', '健康茶飲系列', 'active', 2),
        (v_snk_category_id, '洋芋片系列', '各式口味洋芋片', 'active', 1)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✓ 系列建立完成';
    RAISE NOTICE '  - 美粒果系列 (飲料)';
    RAISE NOTICE '  - 茶飲系列 (飲料)';
    RAISE NOTICE '  - 洋芋片系列 (零食)';
END $$;

-- ============================================
-- 4. 建立測試商品
-- ============================================

DO $$
DECLARE
    v_series_id UUID;
    v_product_1_id UUID;
    v_product_2_id UUID;
    v_product_3_id UUID;
    v_product_4_id UUID;
    v_product_5_id UUID;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '建立測試商品...';
    RAISE NOTICE '============================================';

    -- 取得「美粒果系列」ID
    SELECT id INTO v_series_id FROM series WHERE name = '美粒果系列';

    IF v_series_id IS NULL THEN
        RAISE NOTICE '警告：找不到「美粒果系列」，請先執行步驟 3';
        RETURN;
    END IF;

    -- 插入商品（編號會自動產生）
    INSERT INTO products (series_id, name, retail_price, stock, stock_status, unit, status)
    VALUES
        (v_series_id, '蘋果汁 500ml', 60, 100, 'sufficient', '瓶', 'active')
    RETURNING id INTO v_product_1_id;

    INSERT INTO products (series_id, name, retail_price, stock, stock_status, unit, status)
    VALUES
        (v_series_id, '橘子汁 500ml', 60, 80, 'sufficient', '瓶', 'active')
    RETURNING id INTO v_product_2_id;

    INSERT INTO products (series_id, name, retail_price, stock, stock_status, unit, status)
    VALUES
        (v_series_id, '葡萄汁 500ml', 65, 50, 'low', '瓶', 'active')
    RETURNING id INTO v_product_3_id;

    INSERT INTO products (series_id, name, retail_price, stock, stock_status, unit, status)
    VALUES
        (v_series_id, '水蜜桃汁 500ml', 70, 0, 'out_of_stock', '瓶', 'active')
    RETURNING id INTO v_product_4_id;

    -- 新增一個無原價的商品（測試價格顯示）
    INSERT INTO products (series_id, name, retail_price, stock, stock_status, unit, status)
    VALUES
        (v_series_id, '哈密瓜汁 500ml', NULL, 100, 'sufficient', '瓶', 'active')
    RETURNING id INTO v_product_5_id;

    RAISE NOTICE '✓ 商品建立完成';
    RAISE NOTICE '  - 蘋果汁 500ml (ID: %)', v_product_1_id;
    RAISE NOTICE '  - 橘子汁 500ml (ID: %)', v_product_2_id;
    RAISE NOTICE '  - 葡萄汁 500ml (ID: %)', v_product_3_id;
    RAISE NOTICE '  - 水蜜桃汁 500ml (ID: %)', v_product_4_id;
    RAISE NOTICE '  - 哈密瓜汁 500ml (ID: %)', v_product_5_id;

    -- 顯示自動產生的商品編號
    RAISE NOTICE '';
    RAISE NOTICE '自動產生的商品編號：';
    FOR rec IN
        SELECT code, name FROM products WHERE id IN (v_product_1_id, v_product_2_id, v_product_3_id, v_product_4_id, v_product_5_id)
        ORDER BY code
    LOOP
        RAISE NOTICE '  - % : %', rec.code, rec.name;
    END LOOP;
END $$;

-- ============================================
-- 5. 建立測試會員等級（若不存在）
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '建立測試會員等級...';
    RAISE NOTICE '============================================';
END $$;

-- 插入等級（使用 ON CONFLICT DO NOTHING 避免重複）
INSERT INTO tiers (name, rank) VALUES
    ('批發', 1),
    ('零售', 2),
    ('經銷商', 3)
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✓ 會員等級建立完成';
    RAISE NOTICE '  - 批發 (Rank 1)';
    RAISE NOTICE '  - 零售 (Rank 2)';
    RAISE NOTICE '  - 經銷商 (Rank 3)';
END $$;

-- ============================================
-- 6. 設定商品等級價格
-- ============================================

DO $$
DECLARE
    v_tier_wholesale_id UUID;
    v_tier_retail_id UUID;
    v_tier_dealer_id UUID;
    v_product_id UUID;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '設定商品等級價格...';
    RAISE NOTICE '============================================';

    -- 取得等級 ID
    SELECT id INTO v_tier_wholesale_id FROM tiers WHERE name = '批發';
    SELECT id INTO v_tier_retail_id FROM tiers WHERE name = '零售';
    SELECT id INTO v_tier_dealer_id FROM tiers WHERE name = '經銷商';

    -- 為每個商品設定價格（除了哈密瓜汁，測試未設定價格場景）
    FOR v_product_id IN
        SELECT id FROM products WHERE name != '哈密瓜汁 500ml'
    LOOP
        -- 批發價格（最低）
        INSERT INTO tier_prices (tier_id, product_id, price)
        VALUES (v_tier_wholesale_id, v_product_id, 50)
        ON CONFLICT (tier_id, product_id) DO UPDATE SET price = 50;

        -- 零售價格（等於原價）
        INSERT INTO tier_prices (tier_id, product_id, price)
        VALUES (v_tier_retail_id, v_product_id, 60)
        ON CONFLICT (tier_id, product_id) DO UPDATE SET price = 60;

        -- 經銷商價格（特惠）
        INSERT INTO tier_prices (tier_id, product_id, price)
        VALUES (v_tier_dealer_id, v_product_id, 45)
        ON CONFLICT (tier_id, product_id) DO UPDATE SET price = 45;
    END LOOP;

    RAISE NOTICE '✓ 等級價格設定完成';
    RAISE NOTICE '  - 批發價格: $50';
    RAISE NOTICE '  - 零售價格: $60';
    RAISE NOTICE '  - 經銷商價格: $45';
    RAISE NOTICE '';
    RAISE NOTICE '  注意：「哈密瓜汁」未設定價格（用於測試）';
END $$;

-- ============================================
-- 7. 建立測試用戶（若不存在）
-- ============================================

DO $$
DECLARE
    v_tier_wholesale_id UUID;
    v_tier_retail_id UUID;
    v_admin_user_id UUID;
    v_client_user_id UUID;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '建立測試用戶...';
    RAISE NOTICE '============================================';

    -- 取得等級 ID
    SELECT id INTO v_tier_wholesale_id FROM tiers WHERE name = '批發';
    SELECT id INTO v_tier_retail_id FROM tiers WHERE name = '零售';

    -- 注意：以下 INSERT 可能因為 profiles 表結構或 auth.users 限制而失敗
    -- 建議手動使用後台「快速開戶」功能建立測試帳號

    RAISE NOTICE '請使用後台「快速開戶」功能建立以下測試帳號：';
    RAISE NOTICE '';
    RAISE NOTICE '測試帳號 1（批發客戶）：';
    RAISE NOTICE '  手機號碼: 0912345678';
    RAISE NOTICE '  會員等級: 批發';
    RAISE NOTICE '';
    RAISE NOTICE '測試帳號 2（零售客戶）：';
    RAISE NOTICE '  手機號碼: 0987654321';
    RAISE NOTICE '  會員等級: 零售';
    RAISE NOTICE '';
    RAISE NOTICE '管理員帳號：';
    RAISE NOTICE '  Email: admin@example.com';
    RAISE NOTICE '  (應該已存在)';
END $$;

-- ============================================
-- 8. 驗證測試資料
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '驗證測試資料...';
    RAISE NOTICE '============================================';
END $$;

-- 8.1 顯示所有商品與其價格
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '商品與價格總覽：';
    RAISE NOTICE '--------------------------------------------';
END $$;

SELECT
    p.code,
    p.name,
    p.retail_price as 原價,
    MAX(CASE WHEN t.name = '批發' THEN tp.price END) as 批發價,
    MAX(CASE WHEN t.name = '零售' THEN tp.price END) as 零售價,
    MAX(CASE WHEN t.name = '經銷商' THEN tp.price END) as 經銷商價,
    p.stock_status as 庫存狀態
FROM products p
LEFT JOIN tier_prices tp ON p.id = tp.product_id
LEFT JOIN tiers t ON tp.tier_id = t.id
WHERE p.series_id IN (SELECT id FROM series WHERE name = '美粒果系列')
GROUP BY p.code, p.name, p.retail_price, p.stock_status
ORDER BY p.code;

-- 8.2 顯示系列商品統計
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '系列商品統計：';
    RAISE NOTICE '--------------------------------------------';
END $$;

SELECT
    s.name as 系列名稱,
    c.name as 分類名稱,
    c.code as 分類代碼,
    COUNT(p.id) as 商品數量,
    s.status as 狀態
FROM series s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN products p ON p.series_id = s.id
GROUP BY s.name, c.name, c.code, s.status
ORDER BY c.name, s.name;

-- ============================================
-- 9. 測試資料生成完成
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '測試資料生成完成！';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '1. 使用後台建立測試用戶（快速開戶）';
    RAISE NOTICE '   - 0912345678 (批發)';
    RAISE NOTICE '   - 0987654321 (零售)';
    RAISE NOTICE '';
    RAISE NOTICE '2. 開始執行測試指南中的測試項目';
    RAISE NOTICE '   檔案：specs/003-series-and-pricing/testing-guide.md';
    RAISE NOTICE '';
    RAISE NOTICE '3. 驗證前台價格顯示：';
    RAISE NOTICE '   - 批發客戶應看到 $50';
    RAISE NOTICE '   - 零售客戶應看到 $60';
    RAISE NOTICE '';
    RAISE NOTICE '祝測試順利！🎉';
    RAISE NOTICE '============================================';
END $$;
