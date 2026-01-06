-- ========================================
-- Rollback Script: 運費功能
-- ========================================
-- Migration: 20260122_add_shipping_features.sql
-- 建立日期: 2026-01-06
--
-- ⚠️ 警告: 此腳本會刪除運費相關功能與資料
-- ⚠️ 執行前請先備份資料庫！
--
-- 使用方式:
-- psql -h <host> -p <port> -U postgres -d postgres -f rollback/01_rollback_shipping_features.sql
--
-- ========================================

BEGIN;

-- 1. 刪除 PostgreSQL Functions
DROP FUNCTION IF EXISTS calculate_shipping_fee(UUID, DECIMAL);

-- 2. 刪除 order_custom_fees 表（CASCADE 會自動刪除 FK 約束與索引）
DROP TABLE IF EXISTS order_custom_fees CASCADE;

-- 3. 移除 orders 表的運費欄位
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_fee;

-- 4. 移除 tiers 表的運費欄位
ALTER TABLE tiers DROP COLUMN IF EXISTS shipping_fee;
ALTER TABLE tiers DROP COLUMN IF EXISTS free_shipping_threshold;

-- 5. 驗證回滾結果
DO $$
BEGIN
  -- 檢查 order_custom_fees 表是否已刪除
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_custom_fees') THEN
    RAISE EXCEPTION 'order_custom_fees 表刪除失敗';
  END IF;

  -- 檢查 orders.shipping_fee 欄位是否已刪除
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_fee'
  ) THEN
    RAISE EXCEPTION 'orders.shipping_fee 欄位刪除失敗';
  END IF;

  -- 檢查 tiers.shipping_fee 欄位是否已刪除
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'tiers' AND column_name = 'shipping_fee'
  ) THEN
    RAISE EXCEPTION 'tiers.shipping_fee 欄位刪除失敗';
  END IF;

  -- 檢查 calculate_shipping_fee 函數是否已刪除
  IF EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'calculate_shipping_fee'
  ) THEN
    RAISE EXCEPTION 'calculate_shipping_fee 函數刪除失敗';
  END IF;

  RAISE NOTICE '運費功能回滾成功！';
END;
$$;

COMMIT;

-- ========================================
-- 回滾完成檢查清單
-- ========================================
--
-- [ ] 1. 確認 order_custom_fees 表已刪除
-- [ ] 2. 確認 orders.shipping_fee 欄位已刪除
-- [ ] 3. 確認 tiers.shipping_fee 與 free_shipping_threshold 欄位已刪除
-- [ ] 4. 確認 calculate_shipping_fee 函數已刪除
-- [ ] 5. 現有訂單資料完整（total_amount 未受影響）
-- [ ] 6. 前端程式碼已回滾（移除運費相關 UI）
-- [ ] 7. Server Actions 已回滾（移除運費計算邏輯）
-- [ ] 8. TypeScript 型別定義已回滾
--
-- ========================================
