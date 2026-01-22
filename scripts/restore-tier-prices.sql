-- ================================================================
-- 恢復 tier_prices 資料的 SQL 腳本
-- 用途：為所有商品批次建立等級價格
-- ================================================================

DO $$
DECLARE
    v_wholesale_tier_id UUID;
    v_retail_tier_id UUID;
    v_dealer_tier_id UUID;
    v_product_record RECORD;
    v_count INT := 0;
BEGIN
    -- 1. 取得會員等級 ID
    SELECT id INTO v_wholesale_tier_id FROM tiers WHERE name = '批發' LIMIT 1;
    SELECT id INTO v_retail_tier_id FROM tiers WHERE name = '零售' LIMIT 1;
    SELECT id INTO v_dealer_tier_id FROM tiers WHERE name = '經銷商' LIMIT 1;

    RAISE NOTICE '會員等級 ID:';
    RAISE NOTICE '  批發: %', v_wholesale_tier_id;
    RAISE NOTICE '  零售: %', v_retail_tier_id;
    RAISE NOTICE '  經銷商: %', v_dealer_tier_id;

    -- 2. 為每個商品建立等級價格
    -- 策略：使用 retail_price 作為基準
    --   - 批發價 = retail_price * 0.75 (75折)
    --   - 零售價 = retail_price
    --   - 經銷商價 = retail_price * 0.85 (85折)

    FOR v_product_record IN
        SELECT
            id,
            name,
            retail_price,
            sku
        FROM products
        WHERE status = 'active'
        AND retail_price > 0
    LOOP
        -- 批發價
        INSERT INTO tier_prices (id, tier_id, product_id, price)
        VALUES (
            gen_random_uuid(),
            v_wholesale_tier_id,
            v_product_record.id,
            ROUND(v_product_record.retail_price * 0.75, 0)
        )
        ON CONFLICT (tier_id, product_id) DO UPDATE
        SET price = EXCLUDED.price;

        -- 零售價
        INSERT INTO tier_prices (id, tier_id, product_id, price)
        VALUES (
            gen_random_uuid(),
            v_retail_tier_id,
            v_product_record.id,
            v_product_record.retail_price
        )
        ON CONFLICT (tier_id, product_id) DO UPDATE
        SET price = EXCLUDED.price;

        -- 經銷商價
        INSERT INTO tier_prices (id, tier_id, product_id, price)
        VALUES (
            gen_random_uuid(),
            v_dealer_tier_id,
            v_product_record.id,
            ROUND(v_product_record.retail_price * 0.85, 0)
        )
        ON CONFLICT (tier_id, product_id) DO UPDATE
        SET price = EXCLUDED.price;

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ 完成！已為 % 個商品建立等級價格', v_count;
    RAISE NOTICE '   總計建立 % 筆 tier_prices 記錄', v_count * 3;

    -- 3. 驗證結果
    RAISE NOTICE '';
    RAISE NOTICE '📊 驗證結果:';
    RAISE NOTICE '  tier_prices 總數: %', (SELECT COUNT(*) FROM tier_prices);
    RAISE NOTICE '  批發價數量: %', (SELECT COUNT(*) FROM tier_prices WHERE tier_id = v_wholesale_tier_id);
    RAISE NOTICE '  零售價數量: %', (SELECT COUNT(*) FROM tier_prices WHERE tier_id = v_retail_tier_id);
    RAISE NOTICE '  經銷商價數量: %', (SELECT COUNT(*) FROM tier_prices WHERE tier_id = v_dealer_tier_id);

END $$;

-- 列出前 10 筆結果供檢查
SELECT
    p.name as 商品名稱,
    t.name as 等級,
    tp.price as 價格,
    p.retail_price as 原零售價
FROM tier_prices tp
JOIN products p ON tp.product_id = p.id
JOIN tiers t ON tp.tier_id = t.id
ORDER BY p.name, t.rank
LIMIT 10;
