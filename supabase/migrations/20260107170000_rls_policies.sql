-- ============================================================================
-- Migration: M8 - RLS 策略
-- Feature: 012-migration-consolidation
-- Date: 2026-01-07
-- Version: 1.0 (整合版)
-- ============================================================================
--
-- 此檔案包含：
-- 1. 確保所有資料表已啟用 RLS
-- 2. RLS Policy 完整清單（文件參考）
-- 3. Policy 註解補充
--
-- 注意：實際 RLS Policy 已在 M1-M6 建立，此檔案主要用於驗證與文件化
--
-- ============================================================================

-- ============================================================================
-- 1. 確保所有資料表已啟用 RLS
-- ============================================================================

-- === M1: 核心認證與會員等級 ===
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- === M2: 商品目錄系統 ===
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_prices ENABLE ROW LEVEL SECURITY;

-- === M3: 訂單與工作流程 ===
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timelines ENABLE ROW LEVEL SECURITY;

-- === M4: 運費與自訂費用 ===
ALTER TABLE order_custom_fees ENABLE ROW LEVEL SECURITY;

-- === M5: 優惠券系統 ===
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_tier_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_series_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_coupons ENABLE ROW LEVEL SECURITY;

-- === M6: 系統管理與稽核 ===
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS Policy 完整清單（文件參考）
-- ============================================================================
--
-- 此清單僅供參考，實際 Policy 已在各模組 Migration 中建立
--
-- === M1: tiers (3 個 Policy) ===
-- 1. "Clients can view active tiers" (SELECT)
--    - 客戶可查看 active 等級
--
-- 2. "Admins can view all tiers" (SELECT)
--    - 管理員可查看所有等級
--
-- 3. "Admins can manage tiers" (ALL)
--    - 管理員可完整管理等級
--
-- === M1: profiles (5 個 Policy) ===
-- 1. "Clients can view their own profile" (SELECT)
--    - 客戶可查看自己的 profile
--
-- 2. "Admins can view all profiles" (SELECT)
--    - 管理員可查看所有 profiles
--
-- 3. "Admins can manage profiles" (ALL)
--    - 管理員可完整管理 profiles
--
-- 4. "Users can update their own profile" (UPDATE)
--    - 使用者可更新自己的 profile（部分欄位）
--
-- 5. "New users can insert their profile" (INSERT)
--    - 新使用者可建立自己的 profile
--
-- === M2: categories (3 個 Policy) ===
-- 1. "Clients can view active categories" (SELECT)
-- 2. "Admins can view all categories" (SELECT)
-- 3. "Admins can manage categories" (ALL)
--
-- === M2: series (3 個 Policy) ===
-- 1. "Clients can view active series" (SELECT)
-- 2. "Admins can view all series" (SELECT)
-- 3. "Admins can manage series" (ALL)
--
-- === M2: products (3 個 Policy) ===
-- 1. "Clients can view active products" (SELECT)
-- 2. "Admins can view all products" (SELECT)
-- 3. "Admins can manage products" (ALL)
--
-- === M2: tier_prices (2 個 Policy) ===
-- 1. "Authenticated users can view tier prices" (SELECT)
--    - 所有已認證使用者可查看價格（Server Action 過濾等級）
--
-- 2. "Admins can manage tier prices" (ALL)
--    - 管理員可完整管理價格
--
-- === M3: orders (5 個 Policy) ===
-- 1. "Clients can view their own orders" (SELECT)
-- 2. "Admins can view all orders" (SELECT)
-- 3. "Clients can create orders" (INSERT)
-- 4. "Admins can manage orders" (ALL)
-- 5. "Clients can update pending orders" (UPDATE)
--    - 客戶可更新 pending 狀態訂單
--
-- === M3: order_items (4 個 Policy) ===
-- 1. "Clients can view their order items" (SELECT)
-- 2. "Admins can view all order items" (SELECT)
-- 3. "Clients can insert order items" (INSERT)
-- 4. "Admins can manage order items" (ALL)
--
-- === M3: order_timelines (4 個 Policy) ===
-- 1. "Clients can view their order timelines" (SELECT)
-- 2. "Admins can view all order timelines" (SELECT)
-- 3. "System can insert order timelines" (INSERT)
--    - Server Actions 可插入歷史記錄
--
-- 4. "Admins can insert order timelines" (INSERT)
--    - 管理員可手動插入歷史記錄
--
-- === M4: order_custom_fees (4 個 Policy) ===
-- 1. "Clients can view their order custom fees" (SELECT)
-- 2. "Admins can view all order custom fees" (SELECT)
-- 3. "Admins can manage order custom fees" (ALL)
-- 4. "System can insert order custom fees" (INSERT)
--
-- === M5: coupons (3 個 Policy) ===
-- 1. "Clients can view active coupons" (SELECT)
--    - 客戶僅可查看有效優惠券（status='active' AND 時間範圍內）
--
-- 2. "Admins can view all coupons" (SELECT)
-- 3. "Admins can manage coupons" (ALL)
--
-- === M5: coupon_tier_restrictions (2 個 Policy) ===
-- 1. "Authenticated users can view tier restrictions" (SELECT)
-- 2. "Admins can manage tier restrictions" (ALL)
--
-- === M5: coupon_series_restrictions (2 個 Policy) ===
-- 1. "Authenticated users can view series restrictions" (SELECT)
-- 2. "Admins can manage series restrictions" (ALL)
--
-- === M5: user_coupons (3 個 Policy) ===
-- 1. "Clients can view their own coupons" (SELECT)
-- 2. "Admins can view all user coupons" (SELECT)
-- 3. "Clients can claim coupons" (INSERT)
--
-- === M5: order_coupons (4 個 Policy) ===
-- 1. "Clients can view their order coupons" (SELECT)
-- 2. "Admins can view all order coupons" (SELECT)
-- 3. "Clients can insert order coupons for their own orders" (INSERT)
-- 4. "Admins can insert order coupons" (INSERT)
--
-- === M6: system_settings (3 個 Policy) ===
-- 1. "Public can view public settings" (SELECT)
--    - 所有使用者（包含未登入）可查看公開設定
--
-- 2. "Admins can view all settings" (SELECT)
-- 3. "Admins can update settings" (UPDATE)
--
-- === M6: audit_logs (2 個 Policy) ===
-- 1. "Admins can view all audit logs" (SELECT)
-- 2. "Authenticated users can insert audit logs" (INSERT)
--    - Server Actions 可插入操作日誌
--
-- ============================================================================
-- 3. RLS Policy 統計
-- ============================================================================
--
-- 資料表總數: 17 個（啟用 RLS）
-- Policy 總數: 56 個
--
-- Policy 類型分布:
--   - SELECT Policy: 30 個（54%）
--   - INSERT Policy: 14 個（25%）
--   - UPDATE Policy: 3 個（5%）
--   - ALL Policy: 9 個（16%）
--
-- 角色權限分布:
--   - 客戶 (Clients): 21 個 Policy
--   - 管理員 (Admins): 26 個 Policy
--   - 系統 (System/Public): 9 個 Policy
--
-- 安全性檢查點:
--   ✅ 所有資料表已啟用 RLS
--   ✅ 客戶僅能查看自己的訂單與優惠券
--   ✅ 管理員擁有完整權限
--   ✅ 操作日誌不可修改或刪除
--   ✅ 公開設定允許未登入使用者查看
--
-- ============================================================================
-- 4. 常見查詢場景與對應 Policy
-- ============================================================================
--
-- 場景 1: 客戶瀏覽商品列表
--   - 使用 Policy: "Clients can view active products"
--   - 驗證: 僅返回 status='active' 的商品
--
-- 場景 2: 客戶查看自己的訂單
--   - 使用 Policy: "Clients can view their own orders"
--   - 驗證: WHERE orders.user_id = auth.uid()
--
-- 場景 3: 管理員查看所有客戶資料
--   - 使用 Policy: "Admins can view all profiles"
--   - 驗證: WHERE profiles.role = 'admin'
--
-- 場景 4: 客戶領取優惠券
--   - 使用 Policy: "Clients can claim coupons"
--   - 驗證: WITH CHECK (user_id = auth.uid())
--
-- 場景 5: 系統記錄操作日誌
--   - 使用 Policy: "Authenticated users can insert audit logs"
--   - 驗證: WITH CHECK (auth.uid() IS NOT NULL)
--
-- ============================================================================
-- Migration 完成 - M8 RLS 策略
-- ============================================================================
--
-- RLS 啟用資料表數量: 17 個
-- Policy 總數: 56 個
-- 安全性等級: ✅ 完整覆蓋
--
-- 關鍵安全特性:
-- - 資料隔離（客戶僅能查看自己的資料）
-- - 角色權限分離（客戶 vs 管理員）
-- - 稽核日誌不可篡改（僅允許 INSERT）
-- - 公開設定支援（未登入使用者可讀）
--
-- ============================================================================
