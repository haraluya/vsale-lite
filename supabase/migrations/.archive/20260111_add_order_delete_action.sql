-- Migration: 20260111_add_order_delete_action.sql
-- Date: 2026-01-04
-- Feature: 006-ux-enhancement - 訂單刪除功能
-- Description: 擴充 order_timelines.action_type 支援 'deleted' 操作類型

BEGIN;

-- =====================================================
-- 1. 更新 order_timelines.action_type 約束
-- =====================================================
-- 新增 'deleted' 操作類型到現有約束
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'confirmed', 'status_updated', 'cancelled', 'comment', 'deleted'));

-- =====================================================
-- 2. 更新欄位註解
-- =====================================================
COMMENT ON COLUMN order_timelines.action_type IS '操作類型: created, confirmed, status_updated, cancelled, comment, deleted';

-- =====================================================
-- 3. 說明
-- =====================================================
-- 'deleted' 類型用於記錄訂單刪除操作（僅限 status = ''pending'' 的訂單）
-- 刪除操作記錄範例：
-- INSERT INTO order_timelines (order_id, action_type, content, actor_id)
-- VALUES ('order-uuid', 'deleted', '管理員刪除訂單 (原因: 測試訂單)', 'admin-uuid');

COMMIT;
