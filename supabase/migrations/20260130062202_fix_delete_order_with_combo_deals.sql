-- =============================================
-- Migration: 修復刪除訂單功能（支援組合優惠項目）
-- 問題: 刪除訂單時未處理 order_combo_deal_items 和 order_coupons 表
-- 修正: 更新函式註解，明確說明 CASCADE 會處理所有關聯表
-- =============================================

-- 更新函數註解（明確說明所有會被刪除的關聯表）
COMMENT ON FUNCTION "public"."delete_order_pending"(uuid, uuid, text) IS
'刪除 pending 狀態訂單並退還優惠券（原子性操作，繞過 RLS）

CASCADE 會自動刪除以下關聯表的記錄：
- order_items (訂單明細)
- order_combo_deal_items (組合優惠項目)
- order_coupons (優惠券快照)
- order_custom_fees (自訂費用)
- order_timelines (操作歷史)

注意: user_coupons 表的 used_at 與 order_id 會被重置（非刪除）';

-- 驗證外鍵約束是否正確設定 CASCADE
-- 如果執行失敗，表示外鍵約束有問題
DO $$
DECLARE
  v_missing_cascade TEXT[];
BEGIN
  -- 檢查所有應該有 CASCADE 的外鍵
  WITH expected_cascades AS (
    SELECT unnest(ARRAY[
      'order_items.order_id',
      'order_combo_deal_items.order_id',
      'order_coupons.order_id',
      'order_custom_fees.order_id',
      'order_timelines.order_id'
    ]) AS fk_column
  ),
  actual_cascades AS (
    SELECT
      tc.table_name || '.' || kcu.column_name AS fk_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE
      tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = 'public'
      AND rc.delete_rule = 'CASCADE'
      AND kcu.column_name LIKE '%order_id%'
      AND tc.table_name IN ('order_items', 'order_combo_deal_items', 'order_coupons', 'order_custom_fees', 'order_timelines')
  )
  SELECT array_agg(ec.fk_column)
  INTO v_missing_cascade
  FROM expected_cascades ec
  LEFT JOIN actual_cascades ac ON ec.fk_column = ac.fk_column
  WHERE ac.fk_column IS NULL;

  IF array_length(v_missing_cascade, 1) > 0 THEN
    RAISE WARNING '以下外鍵缺少 CASCADE 設定: %', array_to_string(v_missing_cascade, ', ');
  ELSE
    RAISE NOTICE '所有外鍵 CASCADE 設定正確 ✓';
  END IF;
END $$;
