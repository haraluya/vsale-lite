-- Migration: 優化商品查詢效能 - 建立 get_products_with_user_price RPC 函數
-- Description: 建立 RPC 函數以優化商品列表查詢，避免 JOIN 笛卡爾積
-- Author: Claude Code
-- Date: 2026-01-17

-- =====================================================================
-- 建立 RPC 函數：取得系列下的商品與使用者等級價格
-- =====================================================================

CREATE OR REPLACE FUNCTION get_products_with_user_price(
  p_series_id UUID,
  p_tier_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  retail_price NUMERIC(10, 2),
  image_url TEXT,
  stock INTEGER,
  status TEXT,
  display_order INTEGER,
  series_id UUID,
  series_name TEXT,
  series_color TEXT,
  user_price NUMERIC(10, 2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.retail_price,
    p.image_url,
    p.stock,
    p.status,
    p.display_order,
    p.series_id,
    s.name AS series_name,
    s.color AS series_color,
    tp.price AS user_price
  FROM products p
  INNER JOIN series s ON p.series_id = s.id
  LEFT JOIN tier_prices tp ON (
    p.id = tp.product_id AND
    tp.tier_id = p_tier_id
  )
  WHERE p.status = 'active'
    AND s.id = p_series_id
    AND s.status = 'active'
  ORDER BY p.display_order ASC;
END;
$$;

-- =====================================================================
-- 授權給已認證使用者
-- =====================================================================

GRANT EXECUTE ON FUNCTION get_products_with_user_price(UUID, UUID) TO authenticated;

-- =====================================================================
-- 註解
-- =====================================================================

COMMENT ON FUNCTION get_products_with_user_price(UUID, UUID) IS
  '取得系列下的商品與使用者等級價格（優化查詢，避免 N+1 問題）';

-- =====================================================================
-- 使用範例
-- =====================================================================

-- 測試查詢：
-- SELECT * FROM get_products_with_user_price(
--   '<series_id>'::UUID,
--   '<tier_id>'::UUID
-- );
