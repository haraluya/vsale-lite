-- ============================================================================
-- Migration 範本：安全新增功能
-- ============================================================================
--
-- 使用說明：
-- 1. 複製此檔案並重新命名為 YYYYMMDDHHMMSS_your_feature_name.sql
-- 2. 填寫以下 Metadata
-- 3. 遵循安全操作原則（參考 docs/SAFE_MIGRATION_GUIDE.md）
-- 4. 部署前執行檢查清單（參考 supabase/migrations/_CHECKLIST.md）
--
-- ============================================================================

-- ============================================================================
-- METADATA（請填寫）
-- ============================================================================
-- Migration Name: [功能名稱，例如：add_coupons]
-- Description: [功能描述，例如：新增優惠券管理功能]
-- Impact: [影響範圍，例如：新增 3 張表、1 個索引、2 個 RLS 政策]
-- Risk Level: [LOW/MEDIUM/HIGH]
--   - LOW: 僅新增操作（ADD COLUMN, CREATE TABLE, CREATE INDEX）
--   - MEDIUM: 修改現有結構（RENAME, ALTER TYPE 擴大）
--   - HIGH: 刪除或縮小操作（DROP, ALTER TYPE 縮小）
-- Rollback Plan: [如何回滾，例如：DROP TABLE coupon_table]
-- Author: [開發者名稱]
-- Date: [建立日期，YYYY-MM-DD]
-- Feature Spec: [對應的功能規格文件路徑，例如：specs/009-coupons/spec.md]
-- ============================================================================

-- ============================================================================
-- 安全檢查清單（執行前確認）
-- ============================================================================
-- [ ] 已在本地環境測試（supabase db reset）
-- [ ] 已執行型別檢查（pnpm type-check）
-- [ ] 已備份生產資料庫
-- [ ] Migration 中沒有 DROP COLUMN/DROP TABLE（除非已保留 30 天）
-- [ ] 沒有縮小欄位型別（VARCHAR 變小、BIGINT → INTEGER）
-- [ ] 新增 NOT NULL 前已填充資料
-- [ ] 已準備回滾計畫
-- [ ] 已通知團隊即將部署
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: 建立新資料表（如需要）
-- ============================================================================
--
-- ✅ 安全操作：CREATE TABLE 不會影響現有資料
--
-- 命名規範：
--   - 使用複數形式（products, orders, categories）
--   - 使用底線分隔（order_items, tier_prices）
--
-- 必備欄位：
--   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
--   - created_at TIMESTAMPTZ DEFAULT NOW()
--   - updated_at TIMESTAMPTZ DEFAULT NOW()
--
-- ============================================================================

-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--
--   -- 業務欄位
--   name VARCHAR(100) NOT NULL,
--   description TEXT,
--   status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
--
--   -- 外鍵關聯
--   -- 使用 ON DELETE RESTRICT（需手動處理關聯）或 CASCADE（自動刪除）
--   -- user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--
--   -- 時間戳記
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- ============================================================================
-- Step 2: 建立索引（如需要）
-- ============================================================================
--
-- ✅ 安全操作：CREATE INDEX 不會影響資料
--
-- 建議使用 CONCURRENTLY 避免鎖表（生產環境）：
--   CREATE INDEX CONCURRENTLY idx_name ON table(column);
--
-- 索引命名規範：
--   - 單欄位：idx_tablename_columnname
--   - 多欄位：idx_tablename_col1_col2
--   - 唯一索引：uniq_tablename_columnname
--
-- ============================================================================

-- CREATE INDEX idx_example_table_status ON example_table(status);
-- CREATE INDEX idx_example_table_created_at ON example_table(created_at);

-- 外鍵索引（提升 JOIN 效能）
-- CREATE INDEX idx_example_table_user_id ON example_table(user_id);

-- 複合索引（常一起查詢的欄位）
-- CREATE INDEX idx_example_table_status_created ON example_table(status, created_at);

-- ============================================================================
-- Step 3: 新增 RLS 政策（如需要）
-- ============================================================================
--
-- ✅ 安全操作：啟用 RLS 並設定政策
--
-- 政策命名規範：
--   - 使用繁體中文描述操作
--   - 例如："客戶可查看自己的訂單"、"管理員可管理所有商品"
--
-- 角色檢查：
--   - 管理員：profiles.role = 'admin'
--   - 客戶：profiles.role = 'customer'
--   - 當前用戶：auth.uid()
--
-- ============================================================================

-- ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- 客戶政策：僅能查看自己的資料
-- CREATE POLICY "客戶可查看自己的資料"
--   ON example_table FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());

-- 管理員政策：可管理所有資料
-- CREATE POLICY "管理員可管理所有資料"
--   ON example_table FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
--     )
--   );

-- ============================================================================
-- Step 4: 新增欄位到現有資料表（如需要）
-- ============================================================================
--
-- ✅ 安全操作：ADD COLUMN 不會刪除資料
--
-- 建議：
--   - 新欄位設為可為 NULL，或提供 DEFAULT 值
--   - 避免立即設定 NOT NULL（除非已提供 DEFAULT）
--
-- ============================================================================

-- ALTER TABLE existing_table
-- ADD COLUMN new_field VARCHAR(50) DEFAULT NULL;

-- 如需要立即設定 NOT NULL，先填充資料：
-- UPDATE existing_table SET new_field = 'default_value' WHERE new_field IS NULL;
-- ALTER TABLE existing_table ALTER COLUMN new_field SET NOT NULL;

-- ============================================================================
-- Step 5: 建立 Database Functions（如需要）
-- ============================================================================
--
-- ✅ 安全操作：CREATE FUNCTION 不會影響資料
--
-- 用途：
--   - 複雜業務邏輯（訂單確認、庫存扣減）
--   - 原子性操作（需要 Transaction）
--   - Trigger Functions（自動更新 updated_at）
--
-- ============================================================================

-- 範例：自動更新 updated_at
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_example_table_updated_at
--   BEFORE UPDATE ON example_table
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Step 6: 資料遷移（如需要）
-- ============================================================================
--
-- ⚠️ 謹慎操作：UPDATE/INSERT 會影響資料
--
-- 建議：
--   - 先在測試環境驗證
--   - 使用 WHERE 條件避免誤更新
--   - 考慮分批執行（大量資料）
--
-- ============================================================================

-- 範例：遷移現有資料到新欄位
-- UPDATE example_table
-- SET new_field = old_field
-- WHERE new_field IS NULL;

-- ============================================================================
-- Step 7: 建立預設資料（如需要）
-- ============================================================================
--
-- ✅ 安全操作：INSERT 不會刪除資料
--
-- 用途：
--   - 系統預設設定
--   - 初始分類/等級
--   - 測試資料（僅開發環境）
--
-- ============================================================================

-- 範例：建立預設系統設定
-- INSERT INTO system_settings (key, value, type, description)
-- VALUES
--   ('site_name', 'Vsale 下單系統', 'string', '網站名稱'),
--   ('enable_registration', 'false', 'boolean', '是否開放註冊')
-- ON CONFLICT (key) DO NOTHING; -- 避免重複執行時出錯

COMMIT;

-- ============================================================================
-- 回滾指令（僅供參考，不要包含在 Migration 中）
-- ============================================================================
--
-- 如果需要回滾此 Migration，執行以下指令：
--
-- BEGIN;
-- DROP TABLE IF EXISTS example_table CASCADE;
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_field;
-- COMMIT;
--
-- ============================================================================

-- ============================================================================
-- 驗證指令（部署後執行）
-- ============================================================================
--
-- 檢查表是否建立成功：
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'example_table';
--
-- 檢查索引是否建立：
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'example_table';
--
-- 檢查 RLS 政策：
-- SELECT policyname FROM pg_policies
-- WHERE tablename = 'example_table';
--
-- ============================================================================
