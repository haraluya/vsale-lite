-- Migration: 修復訂單編號產生的併發問題
-- Feature: 004-cart-and-orders (Bug Fix)
-- 使用 Advisory Lock 確保同一時間只有一個事務能產生訂單編號

-- ============================================================
-- 重新建立 generate_order_number 函數（使用 Advisory Lock）
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."generate_order_number"()
RETURNS "text"
LANGUAGE "plpgsql"
AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  order_num TEXT;
  max_digits INTEGER;
  lock_key BIGINT := 123456789; -- Advisory Lock 鍵值（固定值）
BEGIN
  -- 1. 取得 Advisory Lock（確保同一時間只有一個事務執行此函數）
  -- 使用 pg_advisory_xact_lock 會在事務結束時自動釋放鎖定
  PERFORM pg_advisory_xact_lock(lock_key);

  -- 2. 取得今日日期
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- 3. 查詢當日最大流水號
  SELECT COALESCE(
    MAX(
      SUBSTRING(order_number FROM LENGTH('ORD-' || today || '-') + 1)::INTEGER
    ), 0
  ) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- 4. 決定流水號位數（最少 4 位，超過 9999 自動擴展）
  max_digits := GREATEST(4, LENGTH(seq_num::TEXT));

  -- 5. 產生訂單編號
  order_num := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, max_digits, '0');

  -- 6. 返回訂單編號（Advisory Lock 會在事務結束時自動釋放）
  RETURN order_num;
END;
$$;

-- ============================================================
-- 更新函數註解
-- ============================================================

COMMENT ON FUNCTION "public"."generate_order_number"() IS
'產生唯一訂單編號 (ORD-YYYYMMDD-XXXX)
⭐ 使用 Advisory Lock 防止併發衝突
- 使用 pg_advisory_xact_lock 確保同一時間只有一個事務執行
- Lock 會在事務結束時自動釋放
- 完全解決併發下單時的編號衝突問題';
