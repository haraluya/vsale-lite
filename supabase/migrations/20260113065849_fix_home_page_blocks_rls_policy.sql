-- ================================================
-- Fix home_page_blocks RLS Policy
-- Issue: Missing WITH CHECK clause for INSERT/UPDATE operations
-- Date: 2026-01-13
-- ================================================

-- 1. 移除舊的 Policy
DROP POLICY IF EXISTS "allow_admin_to_manage_blocks" ON home_page_blocks;

-- 2. 建立新的 Policy（含 USING 與 WITH CHECK）
CREATE POLICY "allow_admin_to_manage_blocks"
  ON home_page_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. 說明
COMMENT ON POLICY "allow_admin_to_manage_blocks" ON home_page_blocks IS '管理員可以管理所有首頁廣告區塊（包含 INSERT/UPDATE/DELETE）';

-- 4. 輸出成功訊息
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 完成：home_page_blocks RLS Policy 已修復';
  RAISE NOTICE '   - 新增 WITH CHECK 子句，確保 INSERT/UPDATE 操作可正常執行';
  RAISE NOTICE '   - 管理員現在可以建立、更新、刪除首頁廣告區塊';
END $$;
