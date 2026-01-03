-- Migration: 007_system_enhancement.sql
-- Date: 2026-01-03
-- Feature: 系統擴充功能集
-- Description: 訂單留言系統、客戶資訊完整化、廣告輪播系統

BEGIN;

-- =====================================================
-- 1. 擴充 order_timelines.action_type ENUM
-- =====================================================
-- 新增 'comment' 類型以支援訂單留言功能
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'confirmed', 'status_updated', 'cancelled', 'comment'));

-- =====================================================
-- 2. 擴充 profiles 表新增欄位
-- =====================================================
-- 新增常用地址與管理員備註欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- =====================================================
-- 3. 新增 announcements 表（廣告輪播）
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. 建立索引
-- =====================================================
-- 廣告輪播查詢索引（僅啟用的廣告，依排序順序）
CREATE INDEX IF NOT EXISTS idx_announcements_active_sort
  ON announcements(is_active, sort_order)
  WHERE is_active = true;

-- =====================================================
-- 5. 啟用 RLS
-- =====================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. 建立 RLS 策略（order_timelines - 留言功能）
-- =====================================================

-- 客戶端：僅能查詢自己的訂單歷史與留言
DROP POLICY IF EXISTS "client_select_order_timelines" ON order_timelines;
CREATE POLICY "client_select_order_timelines" ON order_timelines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timelines.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 客戶端：僅能在自己的訂單新增留言
DROP POLICY IF EXISTS "client_insert_comment" ON order_timelines;
CREATE POLICY "client_insert_comment" ON order_timelines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action_type = 'comment' AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timelines.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員：可查詢所有訂單歷史與留言
DROP POLICY IF EXISTS "admin_select_order_timelines" ON order_timelines;
CREATE POLICY "admin_select_order_timelines" ON order_timelines
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 管理員：可在任何訂單新增留言
DROP POLICY IF EXISTS "admin_insert_comment" ON order_timelines;
CREATE POLICY "admin_insert_comment" ON order_timelines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action_type = 'comment' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- 7. 建立 RLS 策略（announcements - 廣告輪播）
-- =====================================================

-- 所有使用者（包含未登入）可查詢啟用的廣告
DROP POLICY IF EXISTS "public_select_active_announcements" ON announcements;
CREATE POLICY "public_select_active_announcements" ON announcements
  FOR SELECT
  TO public
  USING (is_active = true);

-- 管理員可查詢所有廣告
DROP POLICY IF EXISTS "admin_select_all_announcements" ON announcements;
CREATE POLICY "admin_select_all_announcements" ON announcements
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 管理員可管理廣告（新增、編輯、刪除）
DROP POLICY IF EXISTS "admin_manage_announcements" ON announcements;
CREATE POLICY "admin_manage_announcements" ON announcements
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

COMMIT;
