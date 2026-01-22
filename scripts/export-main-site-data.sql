-- Vsale 主站商品資料匯出腳本
-- 執行於：主站 SQL Editor (qwovavytryvgchcowjof)
-- 用途：生成可直接在 Site 2 執行的 INSERT 語句

-- ============================================
-- 1. 匯出 Categories（商品分類）
-- ============================================

SELECT
  '-- Categories (商品分類)' as export_sql
UNION ALL
SELECT
  format(
    'INSERT INTO categories (id, name, description, display_order, status, created_at, updated_at) VALUES (%L, %L, %L, %s, %L, %L, %L);',
    id, name, description, display_order, status, created_at, updated_at
  )
FROM categories
ORDER BY display_order;

-- ============================================
-- 2. 匯出 Tiers（會員等級）
-- ============================================

SELECT
  '-- Tiers (會員等級)' as export_sql
UNION ALL
SELECT
  format(
    'INSERT INTO tiers (id, name, discount_rate, description, display_order, status, created_at, updated_at) VALUES (%L, %L, %s, %L, %s, %L, %L, %L);',
    id, name, discount_rate, description, display_order, status, created_at, updated_at
  )
FROM tiers
ORDER BY display_order;

-- ============================================
-- 3. 匯出 Series（商品系列）
-- ============================================

SELECT
  '-- Series (商品系列)' as export_sql
UNION ALL
SELECT
  format(
    'INSERT INTO series (id, name, description, category_id, display_order, status, created_at, updated_at) VALUES (%L, %L, %L, %L, %s, %L, %L, %L);',
    id, name, description, category_id, display_order, status, created_at, updated_at
  )
FROM series
ORDER BY display_order;

-- ============================================
-- 4. 匯出 Products（商品）
-- ============================================

SELECT
  '-- Products (商品)' as export_sql
UNION ALL
SELECT
  format(
    'INSERT INTO products (id, series_id, sku, name, description, retail_price, stock, unit, image_url, status, display_order, created_at, updated_at) VALUES (%L, %L, %L, %L, %L, %s, %s, %L, %L, %L, %s, %L, %L);',
    id, series_id, sku, name, description, retail_price, stock, unit, image_url, status, display_order, created_at, updated_at
  )
FROM products
ORDER BY display_order;

-- ============================================
-- 5. 匯出 Tier Prices（等級價格）
-- ============================================

SELECT
  '-- Tier Prices (等級價格)' as export_sql
UNION ALL
SELECT
  format(
    'INSERT INTO tier_prices (id, product_id, tier_id, price, created_at, updated_at) VALUES (%L, %L, %L, %s, %L, %L);',
    id, product_id, tier_id, price, created_at, updated_at
  )
FROM tier_prices;

-- ============================================
-- 6. 匯出 Coupons（優惠券 - 可選）
-- ============================================

SELECT
  '-- Coupons (優惠券)' as export_sql
UNION ALL
SELECT
  format(
    'INSERT INTO coupons (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, start_date, end_date, status, created_at, updated_at, created_by) VALUES (%L, %L, %L, %L, %L, %s, %s, %s, %s, %s, %L, %L, %L, %L, %L, %L);',
    id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, start_date, end_date, status, created_at, updated_at, created_by
  )
FROM coupons
WHERE status = 'active';
