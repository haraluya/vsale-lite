-- Migration: 補充 audit_logs 的 INSERT policy
-- Created: 2026-01-04
-- Description: 修復操作日誌無法記錄的問題

-- =============================================
-- 新增 INSERT Policy - audit_logs
-- =============================================

-- 所有已認證使用者都可以插入操作日誌（Server Actions 會呼叫 logAudit）
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 註解：INSERT 僅允許透過 Server Actions 呼叫，不開放直接新增
COMMENT ON TABLE audit_logs IS '操作日誌表 (稽核追蹤) - INSERT 僅允許透過 Server Actions';
