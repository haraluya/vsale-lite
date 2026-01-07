# 資料庫健康檢查清單（200+ 項目）

**Feature**: 012-migration-consolidation
**Created**: 2026-01-07
**Purpose**: 驗證整合後的 Migration 是否與現有 Schema 100% 一致

---

## 檢查清單摘要

| 類別 | 檢查項目數 | 預期通過率 | 備註 |
|------|-----------|-----------|------|
| Schema 一致性 | 85 項 | 100% | 表、欄位、型別、約束 |
| 索引完整性 | 70 項 | ≥95% | 必要索引、重複索引、GIN 索引 |
| RLS 覆蓋率 | 40 項 | 100% | 啟用狀態、Policy 數量與內容 |
| 函數授權 | 15 項 | 100% | 函數存在性、授權完整性 |
| 約束完整性 | 15 項 | ≥90% | CHECK 約束、預設值 |
| **總計** | **225 項** | **≥98%** | 允許 ≤5 個警告 |

---

## PART 1: Schema 一致性檢查（85 項）

### 1.1 表數量與存在性檢查（19 項）

#### 1.1.1 表數量檢查（1 項）
- [ ] **檢查項目**: 公開 Schema 表數量 = 18
  - **預期值**: 18 個業務表
  - **檢查方法**: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`
  - **失敗原因**: 可能有 Migration 未執行或測試表未清理

#### 1.1.2 必要表存在性檢查（18 項）
- [ ] **tiers** 表存在（會員等級）
- [ ] **profiles** 表存在（使用者業務資料）
- [ ] **categories** 表存在（商品分類）
- [ ] **series** 表存在（商品系列）
- [ ] **products** 表存在（商品）
- [ ] **tier_prices** 表存在（等級價格）
- [ ] **orders** 表存在（訂單主表）
- [ ] **order_items** 表存在（訂單明細）
- [ ] **order_timelines** 表存在（訂單歷史）
- [ ] **order_custom_fees** 表存在（自訂費用）
- [ ] **system_settings** 表存在（系統設定）
- [ ] **audit_logs** 表存在（操作日誌）
- [ ] **coupons** 表存在（優惠券主表）
- [ ] **coupon_tier_restrictions** 表存在（優惠券等級限制）
- [ ] **coupon_series_restrictions** 表存在（優惠券系列限制）
- [ ] **user_coupons** 表存在（客戶優惠券領取記錄）
- [ ] **order_coupons** 表存在（訂單優惠券快照）
- [ ] **announcements** 表存在（公告表）

---

### 1.2 欄位完整性檢查（50 項）

#### 1.2.1 tiers 表欄位（6 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `name` (TEXT) - 等級名稱，UNIQUE
- [ ] `rank` (INTEGER) - 等級排序
- [ ] `shipping_fee` (NUMERIC) - 基本運費
- [ ] `free_shipping_threshold` (NUMERIC) - 滿額免運門檻
- [ ] `created_at`, `updated_at` (TIMESTAMPTZ) - 時間戳

#### 1.2.2 profiles 表欄位（9 項）
- [ ] `id` (UUID) - 主鍵，外鍵至 auth.users
- [ ] `phone` (TEXT) - 手機號碼，UNIQUE
- [ ] `email` (TEXT) - 電子郵件，UNIQUE
- [ ] `role` (TEXT) - 角色（client/admin）
- [ ] `tier_id` (UUID) - 外鍵至 tiers
- [ ] `username` (TEXT) - 管理員登入帳號，UNIQUE
- [ ] `display_name` (TEXT) - 顯示暱稱
- [ ] `notes` (TEXT) - 備註
- [ ] `created_at` (TIMESTAMPTZ) - 建立時間

#### 1.2.3 categories 表欄位（5 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `name` (TEXT) - 分類名稱
- [ ] `code` (VARCHAR) - 分類代碼，UNIQUE
- [ ] `status` (TEXT) - 狀態（active/inactive）
- [ ] `sort_order` (INTEGER) - 排序

#### 1.2.4 series 表欄位（7 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `code` (VARCHAR) - 系列代碼，UNIQUE
- [ ] `category_id` (UUID) - 外鍵至 categories
- [ ] `name` (TEXT) - 系列名稱，UNIQUE
- [ ] `description` (TEXT) - 描述
- [ ] `status` (TEXT) - 狀態（active/inactive）
- [ ] `sort_order` (INTEGER) - 排序

#### 1.2.5 products 表欄位（9 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `code` (VARCHAR) - 商品編號，UNIQUE
- [ ] `series_id` (UUID) - 外鍵至 series
- [ ] `name` (TEXT) - 商品名稱，UNIQUE
- [ ] `retail_price` (NUMERIC) - 原價
- [ ] `stock` (INTEGER) - 庫存數量（支援負數）
- [ ] `stock_status` (TEXT) - 庫存狀態
- [ ] `status` (TEXT) - 狀態（active/inactive）
- [ ] `tags` (TEXT[]) - 標籤陣列

#### 1.2.6 tier_prices 表欄位（4 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `tier_id` (UUID) - 外鍵至 tiers
- [ ] `product_id` (UUID) - 外鍵至 products
- [ ] `price` (NUMERIC) - 等級價格，UNIQUE(tier_id, product_id)

#### 1.2.7 orders 表欄位（7 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `order_number` (TEXT) - 訂單編號，UNIQUE
- [ ] `user_id` (UUID) - 外鍵至 auth.users
- [ ] `status` (TEXT) - 訂單狀態（pending/shipping/completed/cancelled）
- [ ] `total_amount` (NUMERIC) - 訂單總金額
- [ ] `shipping_fee` (NUMERIC) - 運費
- [ ] `notes` (TEXT) - 客戶備註

#### 1.2.8 order_items 表欄位（5 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `order_id` (UUID) - 外鍵至 orders
- [ ] `product_id` (UUID) - 外鍵至 products
- [ ] `product_name_snapshot` (TEXT) - 商品名稱快照
- [ ] `deal_price` (NUMERIC) - 成交價格

#### 1.2.9 order_timelines 表欄位（6 項）
- [ ] `id` (UUID) - 主鍵
- [ ] `order_id` (UUID) - 外鍵至 orders
- [ ] `action_type` (TEXT) - 操作類型
- [ ] `actor_id` (UUID) - 操作者
- [ ] `modifications` (JSONB) - 修改內容（新增欄位）
- [ ] `created_at` (TIMESTAMPTZ) - 操作時間

#### 1.2.10 其他表欄位（持續新增...）
- [ ] **order_custom_fees** 表欄位檢查（4 項）
- [ ] **coupons** 表欄位檢查（9 項）
- [ ] **user_coupons** 表欄位檢查（5 項）
- [ ] **order_coupons** 表欄位檢查（6 項）
- [ ] **system_settings** 表欄位檢查（7 項）
- [ ] **audit_logs** 表欄位檢查（8 項）

---

### 1.3 唯一性約束檢查（12 項）

- [ ] `tiers.name` - UNIQUE 約束存在
- [ ] `profiles.phone` - UNIQUE 約束存在（部分索引，WHERE phone IS NOT NULL）
- [ ] `profiles.email` - UNIQUE 約束存在（部分索引，WHERE email IS NOT NULL）
- [ ] `profiles.username` - UNIQUE 約束存在
- [ ] `categories.code` - UNIQUE 約束存在
- [ ] `series.code` - UNIQUE 約束存在
- [ ] `series.name` - UNIQUE 約束存在（20260116 新增）
- [ ] `products.code` - UNIQUE 約束存在
- [ ] `products.name` - UNIQUE 約束存在（20260116 新增）
- [ ] `orders.order_number` - UNIQUE 約束存在
- [ ] `system_settings.key` - UNIQUE 約束存在
- [ ] `tier_prices(tier_id, product_id)` - 複合 UNIQUE 約束存在

---

### 1.4 外鍵約束檢查（5 項）

- [ ] **外鍵總數** ≥ 20 個
- [ ] **CASCADE 刪除** - `order_items.order_id` ON DELETE CASCADE
- [ ] **RESTRICT 刪除** - `products.series_id` ON DELETE RESTRICT
- [ ] **SET NULL 刪除** - `audit_logs.actor_id` ON DELETE SET NULL
- [ ] **參照完整性** - 所有外鍵都指向有效的表與欄位

---

### 1.5 CHECK 約束檢查（8 項）

- [ ] `profiles.role` CHECK (role IN ('client', 'admin'))
- [ ] `profiles.client_must_have_phone` - 客戶必須有手機與等級
- [ ] `profiles.admin_must_have_email` - 管理員必須有 email
- [ ] `profiles.admin_must_have_username` - 管理員必須有 username
- [ ] `categories.check_code_format` - 分類代碼格式 ^[A-Z]{3,10}$
- [ ] `orders.status` CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'))
- [ ] `coupons.discount_type` CHECK (discount_type IN ('fixed', 'percentage'))
- [ ] `coupons.valid_time_range` - valid_until > valid_from

---

## PART 2: 索引完整性檢查（70 項）

### 2.1 索引總數檢查（1 項）
- [ ] **檢查項目**: 索引總數 ≥ 65 個（不含主鍵索引）
  - **預期值**: 65-75 個
  - **檢查方法**: `SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'`
  - **失敗原因**: 可能有 Migration 未執行或索引建立失敗

---

### 2.2 必要索引存在性檢查（65 項）

#### 2.2.1 tiers 表索引（1 項）
- [ ] `idx_tiers_rank` - 等級排序索引

#### 2.2.2 profiles 表索引（5 項）
- [ ] `idx_profiles_phone` - 手機號碼索引（部分索引，WHERE phone IS NOT NULL）
- [ ] `idx_profiles_email` - 電子郵件索引（部分索引，WHERE email IS NOT NULL）
- [ ] `idx_profiles_tier_id` - 等級 ID 索引
- [ ] `idx_profiles_role` - 角色索引
- [ ] `idx_profiles_username` - 管理員帳號索引（UNIQUE）

#### 2.2.3 categories 表索引（3 項）
- [ ] `idx_categories_code` - 分類代碼索引（UNIQUE）
- [ ] `idx_categories_status` - 狀態索引
- [ ] `idx_categories_sort_order` - 排序索引

#### 2.2.4 series 表索引（5 項）
- [ ] `idx_series_code` - 系列代碼索引（UNIQUE）
- [ ] `idx_series_name` - 系列名稱索引（20260116 新增）
- [ ] `idx_series_category_id` - 分類 ID 索引
- [ ] `idx_series_status` - 狀態索引
- [ ] `idx_series_sort_order` - 排序索引

#### 2.2.5 products 表索引（7 項）
- [ ] `idx_products_code` - 商品編號索引（UNIQUE）
- [ ] `idx_products_name` - 商品名稱索引（20260116 新增）
- [ ] `idx_products_series_id` - 系列 ID 索引
- [ ] `idx_products_status` - 狀態索引
- [ ] `idx_products_stock_status` - 庫存狀態索引
- [ ] `idx_products_tags` - 標籤 GIN 索引（20260110 新增）
- [ ] `idx_products_status_updated_at` - 複合索引（狀態 + 更新時間）

#### 2.2.6 tier_prices 表索引（3 項）
- [ ] `idx_tier_prices_tier_id` - 等級 ID 索引
- [ ] `idx_tier_prices_product_id` - 商品 ID 索引
- [ ] `idx_tier_prices_lookup` - 複合索引（tier_id, product_id）

#### 2.2.7 orders 表索引（5 項）
- [ ] `idx_orders_order_number` - 訂單編號索引（UNIQUE）
- [ ] `idx_orders_user_id` - 客戶 ID 索引
- [ ] `idx_orders_status` - 訂單狀態索引
- [ ] `idx_orders_created_at` - 建立時間索引（DESC）
- [ ] `idx_orders_user_status` - 複合索引（user_id, status）

#### 2.2.8 order_items 表索引（2 項）
- [ ] `idx_order_items_order_id` - 訂單 ID 索引
- [ ] `idx_order_items_product_id` - 商品 ID 索引

#### 2.2.9 order_timelines 表索引（3 項）
- [ ] `idx_order_timelines_order_id` - 訂單 ID 索引
- [ ] `idx_order_timelines_created_at` - 操作時間索引（DESC）
- [ ] `idx_order_timelines_modifications` - 修改內容 GIN 索引（20260124 新增）

#### 2.2.10 order_custom_fees 表索引（2 項）
- [ ] `idx_order_custom_fees_order_id` - 訂單 ID 索引
- [ ] `idx_order_custom_fees_created_at` - 建立時間索引（DESC）

#### 2.2.11 coupons 表索引（4 項）
- [ ] `idx_coupons_code_normalized` - 大寫代碼索引（UNIQUE, WHERE status != 'deleted'）
- [ ] `idx_coupons_status` - 狀態索引
- [ ] `idx_coupons_valid_time` - 有效期間複合索引（valid_from, valid_until）
- [ ] `idx_coupons_discount_type` - 折扣方式索引

#### 2.2.12 coupon_tier_restrictions 表索引（2 項）
- [ ] `idx_coupon_tier_restrictions_coupon_id` - 優惠券 ID 索引
- [ ] `idx_coupon_tier_restrictions_tier_id` - 等級 ID 索引

#### 2.2.13 coupon_series_restrictions 表索引（2 項）
- [ ] `idx_coupon_series_restrictions_coupon_id` - 優惠券 ID 索引
- [ ] `idx_coupon_series_restrictions_series_id` - 系列 ID 索引

#### 2.2.14 user_coupons 表索引（4 項）
- [ ] `idx_user_coupons_user_id` - 客戶 ID 索引
- [ ] `idx_user_coupons_coupon_id` - 優惠券 ID 索引
- [ ] `idx_user_coupons_used_at` - 使用時間索引
- [ ] `idx_user_coupons_user_coupon` - 複合索引（user_id, coupon_id）

#### 2.2.15 order_coupons 表索引（2 項）
- [ ] `idx_order_coupons_order_id` - 訂單 ID 索引
- [ ] `idx_order_coupons_coupon_code` - 優惠券代碼索引

#### 2.2.16 system_settings 表索引（3 項）
- [ ] `idx_system_settings_key` - 設定鍵索引（UNIQUE）
- [ ] `idx_system_settings_category` - 類別索引
- [ ] `idx_system_settings_is_public` - 公開狀態索引

#### 2.2.17 audit_logs 表索引（7 項）
- [ ] `idx_audit_logs_target_type` - 目標類型索引
- [ ] `idx_audit_logs_action_type` - 操作類型索引
- [ ] `idx_audit_logs_created_at` - 建立時間索引（DESC）
- [ ] `idx_audit_logs_target` - 複合索引（target_type, target_id）
- [ ] `idx_audit_logs_actor` - 複合索引（actor_id, created_at DESC）
- [ ] `idx_audit_logs_old_values_gin` - 舊值 GIN 索引
- [ ] `idx_audit_logs_new_values_gin` - 新值 GIN 索引

#### 2.2.18 announcements 表索引（1 項）
- [ ] `idx_announcements_active_sort` - 複合索引（status, sort_order）

---

### 2.3 重複索引檢查（1 項）
- [ ] **檢查項目**: 無重複索引
  - **預期值**: 0 個重複索引
  - **檢查方法**: 比對相同 indexdef 的索引
  - **失敗原因**: Migration 重複執行或索引未使用 IF NOT EXISTS

---

### 2.4 GIN 索引檢查（3 項）
- [ ] `idx_products_tags` - 標籤 GIN 索引（ARRAY 欄位）
- [ ] `idx_audit_logs_old_values_gin` - 舊值 GIN 索引（JSONB 欄位）
- [ ] `idx_audit_logs_new_values_gin` - 新值 GIN 索引（JSONB 欄位）

---

## PART 3: RLS 覆蓋率檢查（40 項）

### 3.1 RLS 啟用狀態檢查（19 項）

#### 3.1.1 RLS 總覆蓋率（1 項）
- [ ] **檢查項目**: 18 個表啟用 RLS = 100% 覆蓋率
  - **預期值**: 18 / 18
  - **檢查方法**: `SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true`
  - **失敗原因**: 部分表未啟用 RLS，資料安全受威脅

#### 3.1.2 逐表 RLS 啟用檢查（18 項）
- [ ] `tiers` - RLS 已啟用
- [ ] `profiles` - RLS 已啟用
- [ ] `categories` - RLS 已啟用
- [ ] `series` - RLS 已啟用
- [ ] `products` - RLS 已啟用
- [ ] `tier_prices` - RLS 已啟用
- [ ] `orders` - RLS 已啟用
- [ ] `order_items` - RLS 已啟用
- [ ] `order_timelines` - RLS 已啟用
- [ ] `order_custom_fees` - RLS 已啟用
- [ ] `system_settings` - RLS 已啟用
- [ ] `audit_logs` - RLS 已啟用
- [ ] `coupons` - RLS 已啟用
- [ ] `coupon_tier_restrictions` - RLS 已啟用
- [ ] `coupon_series_restrictions` - RLS 已啟用
- [ ] `user_coupons` - RLS 已啟用
- [ ] `order_coupons` - RLS 已啟用
- [ ] `announcements` - RLS 已啟用

---

### 3.2 RLS Policy 數量檢查（2 項）

- [ ] **Policy 總數** ≥ 70 個
  - **預期值**: 70-80 個
  - **檢查方法**: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'`

- [ ] **每個表的 Policy 數量** ≥ 2 個
  - **預期值**: 每個表至少 2 個（客戶 SELECT + 管理員 ALL）
  - **檢查方法**: `SELECT tablename, COUNT(*) FROM pg_policies GROUP BY tablename HAVING COUNT(*) < 2`

---

### 3.3 關鍵 Policy 存在性檢查（19 項）

#### 3.3.1 認證與使用者相關（5 項）
- [ ] `tiers:Allow authenticated users to read tiers` - 所有已認證使用者可讀取等級
- [ ] `tiers:Allow admin to manage tiers` - 管理員可管理等級
- [ ] `profiles:Allow users to read own profile` - 客戶可讀取自己的資料
- [ ] `profiles:Allow admin to read all profiles` - 管理員可讀取所有資料
- [ ] `profiles:Allow admin to manage profiles` - 管理員可管理所有資料

#### 3.3.2 訂單相關（7 項）
- [ ] `orders:Clients can view their own orders` - 客戶可查看自己的訂單
- [ ] `orders:Clients can create their own orders` - 客戶可建立訂單
- [ ] `orders:Admins can view all orders` - 管理員可查看所有訂單
- [ ] `orders:Admins can update orders` - 管理員可更新訂單
- [ ] `order_items:Clients can view their order items` - 客戶可查看訂單明細
- [ ] `order_items:Admins can view all order items` - 管理員可查看所有明細
- [ ] `order_items:Clients can insert items for their own orders` - 客戶可新增明細

#### 3.3.3 優惠券相關（4 項）
- [ ] `coupons:Clients can view active coupons` - 客戶可查看有效優惠券
- [ ] `coupons:Admins can view all coupons` - 管理員可查看所有優惠券
- [ ] `user_coupons:Clients can view their own coupons` - 客戶可查看已領取優惠券
- [ ] `user_coupons:Clients can claim coupons` - 客戶可領取優惠券

#### 3.3.4 系統設定相關（3 項）
- [ ] `system_settings:Public can view public settings` - 公開設定可被所有人讀取
- [ ] `system_settings:Admins can view all settings` - 管理員可查看所有設定
- [ ] `audit_logs:Admins can view all audit logs` - 管理員可查看所有操作日誌

---

## PART 4: PostgreSQL 函數授權檢查（15 項）

### 4.1 函數存在性檢查（9 項）

- [ ] `generate_order_number()` - 產生訂單編號
- [ ] `generate_product_code(UUID)` - 產生商品編號
- [ ] `confirm_order_and_deduct_stock(UUID, UUID)` - 確認訂單並扣減庫存（已廢棄，改用 mark_order_as_shipping）
- [ ] `cancel_order_and_restore_stock(UUID, UUID)` - 取消訂單並回補庫存
- [ ] `update_order_status(UUID, TEXT, UUID)` - 更新訂單狀態
- [ ] `delete_order_pending(UUID, UUID, TEXT)` - 刪除待處理訂單
- [ ] `calculate_shipping_fee(UUID, NUMERIC)` - 計算運費
- [ ] `mark_order_as_shipping(UUID, UUID)` - 標記出貨並扣減庫存（20260123 新增）
- [ ] `update_order_with_modifications(...)` - 批次修改訂單（20260124 新增）

---

### 4.2 函數授權檢查（5 項）

- [ ] **授權總數** ≥ 9 個函數授予 `authenticated` 角色 EXECUTE 權限
  - **預期值**: ≥ 9 個
  - **檢查方法**: `SELECT COUNT(*) FROM information_schema.routine_privileges WHERE grantee = 'authenticated' AND privilege_type = 'EXECUTE'`

- [ ] `generate_order_number()` - 已授予 EXECUTE 權限
- [ ] `calculate_shipping_fee()` - 已授予 EXECUTE 權限
- [ ] `mark_order_as_shipping()` - 已授予 EXECUTE 權限
- [ ] `update_order_with_modifications()` - 已授予 EXECUTE 權限

---

### 4.3 Trigger Function 檢查（1 項）

- [ ] `update_updated_at_column()` - 自動更新 updated_at 欄位（所有表使用）

---

## PART 5: 約束完整性檢查（15 項）

### 5.1 CHECK 約束總數（1 項）
- [ ] **檢查項目**: CHECK 約束總數 ≥ 30 個
  - **預期值**: 30-40 個
  - **檢查方法**: `SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'CHECK'`

---

### 5.2 關鍵 CHECK 約束存在性（8 項）

- [ ] `profiles:client_must_have_phone` - 客戶必須有手機與等級
- [ ] `profiles:admin_must_have_email` - 管理員必須有 email
- [ ] `profiles:admin_must_have_username` - 管理員必須有 username
- [ ] `categories:check_code_format` - 分類代碼格式限制
- [ ] `orders:orders_status_check` - 訂單狀態限制
- [ ] `order_timelines:order_timelines_action_type_check` - 操作類型限制
- [ ] `coupons:coupons_discount_type_check` - 折扣方式限制
- [ ] `coupons:valid_time_range` - 有效期間限制

---

### 5.3 預設值檢查（6 項）

- [ ] `tiers.created_at` - 預設值 NOW()
- [ ] `profiles.created_at` - 預設值 NOW()
- [ ] `orders.status` - 預設值 'pending'
- [ ] `coupons.status` - 預設值 'active'
- [ ] `system_settings.is_public` - 預設值 false
- [ ] `products.stock_status` - 預設值 'sufficient'

---

## 檢查報告範例

```
========== 資料庫健康檢查報告 ==========
檢查時間: 2026-01-07 12:05:30

檢查項目總數: 225
通過 (OK):    220 (97.8%)
警告 (WARNING): 3 (1.3%)
錯誤 (ERROR):  2 (0.9%)

整體狀態: 需要注意

========================================

========== 問題清單（ERROR + WARNING） ==========

[ERROR] Index | IndexExists | idx_products_series_status
訊息: 索引缺失，查詢效能可能受影響

[ERROR] RLS | PolicyExists | order_timelines → admin_insert_comment
訊息: Policy 缺失，權限控制可能失效

[WARNING] Index | DuplicateIndex | products
訊息: 發現重複索引: idx_products_name, idx_products_name_2，建議移除以節省空間

[WARNING] Function | FunctionGrant | calculate_shipping_fee
訊息: 函數未授權給 authenticated 角色，客戶端可能無法呼叫

[WARNING] Constraint | CheckConstraintExists | coupons → code_length
訊息: 約束缺失，資料驗證可能失效

========================================
```

---

## 使用方式

### 執行健康檢查

```powershell
# 基本執行（顯示於終端機）
.\scripts\db-health-check.ps1

# 儲存報告到檔案
.\scripts\db-health-check.ps1 -SaveReport

# 指定報告目錄
.\scripts\db-health-check.ps1 -SaveReport -ReportDir ".\reports\2026-01"
```

### 直接執行 SQL

```powershell
# 使用 psql 直接執行
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f specs/012-migration-consolidation/db-health-check.sql
```

### 查詢檢查結果

```sql
-- 查看所有檢查結果
SELECT * FROM health_check_results ORDER BY status, category;

-- 僅查看錯誤與警告
SELECT * FROM health_check_results WHERE status IN ('ERROR', 'WARNING');

-- 按類別統計
SELECT category, status, COUNT(*) AS count
FROM health_check_results
GROUP BY category, status
ORDER BY category, status;
```

---

## 常見問題與解決方案

### 1. 索引缺失
**問題**: `idx_products_series_status` 索引不存在
**解決**: 執行 `CREATE INDEX idx_products_series_status ON products(series_id, status);`

### 2. RLS Policy 缺失
**問題**: 部分表缺少客戶端 INSERT Policy
**解決**: 檢查 Migration 檔案，補充遺漏的 Policy

### 3. 函數未授權
**問題**: PostgreSQL 函數未授予 EXECUTE 權限
**解決**: 執行 `GRANT EXECUTE ON FUNCTION function_name() TO authenticated;`

### 4. 重複索引
**問題**: 相同欄位有多個索引
**解決**: 刪除重複索引 `DROP INDEX IF EXISTS idx_xxx_duplicate;`

### 5. CHECK 約束缺失
**問題**: 關鍵約束未建立
**解決**: 執行 `ALTER TABLE table_name ADD CONSTRAINT constraint_name CHECK (condition);`

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| 1.0.0 | 2026-01-07 | 初版，包含 225 個檢查項目 |

