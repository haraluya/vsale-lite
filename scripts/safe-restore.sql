-- =====================================================
-- Vsale-lite 安全還原腳本
-- 用途：在執行備份還原前，先清空資料但保留表結構
-- 使用方式：在 Supabase SQL Editor 執行此腳本，然後執行備份 SQL
-- =====================================================

-- ⚠️ 警告：此腳本會清空所有資料，但保留表結構
-- 執行前請確認已下載備份檔案

BEGIN;

-- 暫時停用 RLS 與 Trigger，避免權限問題
SET session_replication_role = 'replica';

-- =====================================================
-- 1. 清空所有資料表（保留表結構）
-- =====================================================

-- 訂單相關
DELETE FROM order_timelines;
DELETE FROM order_items;
DELETE FROM order_custom_fees;
DELETE FROM orders;

-- 優惠券相關
DELETE FROM user_coupons;
DELETE FROM coupon_series_restrictions;
DELETE FROM coupon_tier_restrictions;
DELETE FROM coupons;

-- 商品相關
DELETE FROM tier_prices;
DELETE FROM products;
DELETE FROM series;
DELETE FROM categories;

-- 使用者相關
DELETE FROM profiles WHERE role != 'admin'; -- 保留管理員帳號
-- DELETE FROM profiles; -- 如果要清空所有使用者，取消此行註解

-- 會員等級（保留預設等級）
-- DELETE FROM tiers; -- 通常不刪除等級資料

-- 系統相關
DELETE FROM backup_jobs;
DELETE FROM audit_logs;
DELETE FROM announcements;
DELETE FROM admin_users WHERE username != 'admin'; -- 保留主要管理員
-- DELETE FROM admin_users; -- 如果要清空所有管理員，取消此行註解

-- 重置序列（如果有使用 SERIAL）
-- SELECT setval('your_sequence_name', 1, false);

-- =====================================================
-- 2. 重啟 RLS 與 Trigger
-- =====================================================
SET session_replication_role = 'origin';

COMMIT;

-- =====================================================
-- 執行結果
-- =====================================================
-- ✅ 資料已清空，表結構保留
-- ✅ RLS 策略與 Trigger 仍然有效
-- ✅ 現在可以執行備份 SQL 檔案還原資料

-- =====================================================
-- 下一步
-- =====================================================
-- 1. 下載備份檔案並解壓縮
-- 2. 開啟備份 SQL 檔案
-- 3. 移除所有 CREATE TABLE、ALTER TABLE、CREATE INDEX 等 DDL 語句
-- 4. 僅保留 DELETE 與 INSERT 語句
-- 5. 在此執行修改後的 SQL

-- =====================================================
-- 或者使用方案 1（完全重建）
-- =====================================================
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
-- 然後直接執行完整備份 SQL（包含 CREATE TABLE）
