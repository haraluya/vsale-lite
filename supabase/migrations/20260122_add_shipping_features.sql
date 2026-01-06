-- Migration: 新增運費設定功能
-- Feature: 011-shipping-and-order-edit
-- Date: 2026-01-06
-- Description: 為會員等級與訂單新增運費相關欄位，建立自訂費用表與運費計算函數

-- ============================================
-- PART 1: 擴展 tiers 表（運費設定）
-- ============================================

-- 新增運費相關欄位
ALTER TABLE tiers
ADD COLUMN shipping_fee DECIMAL(10,2) DEFAULT 0 NOT NULL
  CHECK (shipping_fee >= 0),
ADD COLUMN free_shipping_threshold DECIMAL(10,2) DEFAULT NULL
  CHECK (free_shipping_threshold IS NULL OR free_shipping_threshold > 0);

-- 註解說明
COMMENT ON COLUMN tiers.shipping_fee IS '基本運費金額（0 表示不收運費）';
COMMENT ON COLUMN tiers.free_shipping_threshold IS '滿額免運門檻（NULL 表示不提供免運）';

-- ============================================
-- PART 2: 擴展 orders 表（訂單運費）
-- ============================================

-- 新增運費欄位
ALTER TABLE orders
ADD COLUMN shipping_fee DECIMAL(10,2) DEFAULT 0 NOT NULL
  CHECK (shipping_fee >= 0);

-- 註解說明
COMMENT ON COLUMN orders.shipping_fee IS '訂單運費金額（建立時快照儲存）';

-- ============================================
-- PART 3: 建立 order_custom_fees 表（自訂費用項目）
-- ============================================

CREATE TABLE IF NOT EXISTS order_custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fee_name TEXT NOT NULL CHECK (LENGTH(fee_name) > 0 AND LENGTH(fee_name) <= 50),
  amount DECIMAL(10,2) NOT NULL CHECK (amount <> 0),  -- 可為負數（減免）
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 確保同一訂單的費用名稱不重複
  UNIQUE(order_id, fee_name)
);

-- 註解說明
COMMENT ON TABLE order_custom_fees IS '訂單自訂費用項目（如手續費、包裝費、額外運費等）';
COMMENT ON COLUMN order_custom_fees.amount IS '費用金額（正數=收費、負數=減免）';

-- 建立索引
CREATE INDEX idx_order_custom_fees_order_id ON order_custom_fees(order_id);
CREATE INDEX idx_order_custom_fees_created_at ON order_custom_fees(created_at DESC);

-- ============================================
-- PART 4: RLS Policy for order_custom_fees
-- ============================================

ALTER TABLE order_custom_fees ENABLE ROW LEVEL SECURITY;

-- 客戶僅能查看自己的訂單費用
CREATE POLICY "Clients can view their order custom fees"
ON order_custom_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_custom_fees.order_id
    AND orders.user_id = auth.uid()
  )
);

-- 管理員可查看所有費用
CREATE POLICY "Admins can view all order custom fees"
ON order_custom_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理員可新增、修改、刪除費用
CREATE POLICY "Admins can insert order custom fees"
ON order_custom_fees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update order custom fees"
ON order_custom_fees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete order custom fees"
ON order_custom_fees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- PART 5: PostgreSQL Function - 運費計算
-- ============================================

CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_user_id UUID,
  p_subtotal DECIMAL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shipping_fee DECIMAL(10,2);
  v_free_threshold DECIMAL(10,2);
BEGIN
  -- 查詢客戶等級的運費設定（單次查詢 JOIN）
  SELECT t.shipping_fee, t.free_shipping_threshold
  INTO v_shipping_fee, v_free_threshold
  FROM profiles p
  JOIN tiers t ON t.id = p.tier_id
  WHERE p.id = p_user_id;

  -- 若查無客戶或等級，預設不收運費
  IF v_shipping_fee IS NULL THEN
    RETURN 0;
  END IF;

  -- 若基本運費為 0，直接返回 0
  IF v_shipping_fee = 0 THEN
    RETURN 0;
  END IF;

  -- 若設定了滿額免運門檻且商品總額達標，返回 0
  IF v_free_threshold IS NOT NULL AND p_subtotal >= v_free_threshold THEN
    RETURN 0;
  END IF;

  -- 否則返回基本運費
  RETURN v_shipping_fee;
END;
$$;

-- 註解說明
COMMENT ON FUNCTION calculate_shipping_fee IS '計算訂單運費（依客戶等級與商品總額）';

-- 授權給已認證用戶呼叫（客戶與管理員）
GRANT EXECUTE ON FUNCTION calculate_shipping_fee TO authenticated;

-- ============================================
-- Migration 完成
-- ============================================

-- 驗證 Migration 成功（可在部署後執行以下查詢檢查）
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tiers' AND column_name IN ('shipping_fee', 'free_shipping_threshold');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_fee';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'order_custom_fees';
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'calculate_shipping_fee';
