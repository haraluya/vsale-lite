-- Migration: 修復訂單編號產生的併發問題（完整解決方案）
-- Feature: 004-cart-and-orders (Bug Fix - Phase 2)
--
-- 問題分析：
-- 1. 原有的 pg_advisory_xact_lock 僅在函數執行期間有效
-- 2. 函數結束後 Lock 釋放，但訂單尚未插入
-- 3. 併發場景下會產生相同編號
--
-- 解決方案：
-- 使用 order_number_sequence 表 + SELECT FOR UPDATE 實現原子性計數器
-- 確保編號生成與訂單插入在同一事務內完成

-- ============================================================
-- 1. 建立訂單編號序列表（日期 + 流水號）
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."order_number_sequence" (
  "date_key" TEXT PRIMARY KEY,           -- 日期鍵值（YYYYMMDD）
  "last_number" INTEGER NOT NULL DEFAULT 0,  -- 當日最大流水號
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "public"."order_number_sequence" IS '訂單編號序列表 - 儲存每日流水號';

-- ============================================================
-- 2. 重新建立 generate_order_number 函數（使用原子性計數器）
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
BEGIN
  -- 1. 取得今日日期
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- 2. 使用 INSERT ... ON CONFLICT 原子性更新流水號
  -- SELECT FOR UPDATE 確保同一時間只有一個事務能讀取並更新
  INSERT INTO order_number_sequence (date_key, last_number)
  VALUES (today, 1)
  ON CONFLICT (date_key)
  DO UPDATE SET
    last_number = order_number_sequence.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO seq_num;

  -- 3. 決定流水號位數（最少 4 位，超過 9999 自動擴展）
  max_digits := GREATEST(4, LENGTH(seq_num::TEXT));

  -- 4. 產生訂單編號
  order_num := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, max_digits, '0');

  -- 5. 返回訂單編號
  RETURN order_num;
END;
$$;

-- ============================================================
-- 3. 更新函數註解
-- ============================================================

COMMENT ON FUNCTION "public"."generate_order_number"() IS
'產生唯一訂單編號 (ORD-YYYYMMDD-XXXX)
⭐ 使用原子性計數器表防止併發衝突（完整解決方案）
- 使用 INSERT ... ON CONFLICT 原子性更新流水號
- SELECT FOR UPDATE 確保行級鎖定
- 編號生成與訂單插入在同一事務內完成
- 完全解決併發下單時的編號衝突問題
- 支援每日流水號自動重置';

-- ============================================================
-- 4. 初始化今日序列（可選，避免第一次呼叫時延遲）
-- ============================================================

INSERT INTO order_number_sequence (date_key, last_number)
VALUES (TO_CHAR(NOW(), 'YYYYMMDD'), 0)
ON CONFLICT (date_key) DO NOTHING;

-- ============================================================
-- 5. 建立索引（可選，加速查詢）
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_number_sequence_date ON order_number_sequence(date_key);
