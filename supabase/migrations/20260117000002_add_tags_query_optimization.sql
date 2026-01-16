-- Migration: 優化標籤查詢效能 - 建立 get_active_tags RPC 函數
-- Description: 建立 RPC 函數以優化標籤查詢，使用 PostgreSQL 聚合避免客戶端去重
-- Author: Claude Code
-- Date: 2026-01-17

-- =====================================================================
-- 建立 RPC 函數：取得所有活躍商品的標籤列表
-- =====================================================================

CREATE OR REPLACE FUNCTION get_active_tags()
RETURNS TABLE (tag TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(tags)::TEXT AS tag
  FROM products
  WHERE status = 'active'
    AND tags IS NOT NULL
    AND array_length(tags, 1) > 0
  ORDER BY tag ASC;
END;
$$;

-- =====================================================================
-- 授權給已認證使用者
-- =====================================================================

GRANT EXECUTE ON FUNCTION get_active_tags() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_tags() TO anon;

-- =====================================================================
-- 註解
-- =====================================================================

COMMENT ON FUNCTION get_active_tags() IS
  '取得所有活躍商品的標籤列表（去重排序，避免客戶端處理）';

-- =====================================================================
-- 使用範例
-- =====================================================================

-- 測試查詢：
-- SELECT * FROM get_active_tags();
