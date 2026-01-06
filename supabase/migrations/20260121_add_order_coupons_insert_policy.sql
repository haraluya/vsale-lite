-- ============================================================================
-- Migration: 新增 order_coupons INSERT Policy
-- Feature: 009-coupon-system
-- Date: 2026-01-21
-- ============================================================================
--
-- 問題：order_coupons 表僅有 SELECT Policy，缺少 INSERT Policy
-- 導致客戶建立訂單時無法插入優惠券快照
--
-- 修復：新增 INSERT Policy 允許客戶在建立自己的訂單時插入優惠券快照
--
-- ============================================================================

-- 1. 新增客戶 INSERT Policy
-- ============================================================================

CREATE POLICY "Clients can insert order coupons for their own orders"
  ON order_coupons FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 確保是自己的訂單
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_coupons.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 2. 新增管理員 INSERT Policy（方便後台手動建立）
-- ============================================================================

CREATE POLICY "Admins can insert order coupons"
  ON order_coupons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 說明
-- ============================================================================
--
-- 這兩個 Policy 確保：
-- 1. 客戶只能在建立自己的訂單時插入優惠券快照
-- 2. 管理員可以為任何訂單插入優惠券快照（後台管理需求）
-- 3. WITH CHECK 在 INSERT 時檢查條件，確保安全性
--
-- ============================================================================
