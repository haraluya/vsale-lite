# Migration 整合對應表

此文件說明 27 個舊 Migration 如何整合到 8 個新 Migration 檔案。

**整合日期**: 2026-01-07
**整合前檔案數量**: 27 個
**整合後檔案數量**: 8 個
**減少比例**: 70%

---

## 整合對應關係

### M1: 核心認證與會員等級

**新檔案**: `20260107100000_core_auth_and_tiers.sql`

**整合來源** (2 個檔案):

| 編號 | 舊檔案名稱 | 功能說明 |
|------|-----------|---------|
| 1 | `20260101_initial_schema.sql` | 基礎資料表 (tiers, profiles) |
| 2 | `20260104_fix_profiles_rls.sql` | RLS Policy 修復 |

**包含內容**:
- ✅ `tiers` 表（會員等級）
- ✅ `profiles` 表（使用者業務資料）
- ✅ 預設資料（3 個會員等級）
- ✅ RLS Policies

---

### M2: 商品目錄系統

**新檔案**: `20260107110000_product_catalog_system.sql`

**整合來源** (7 個檔案):

| 編號 | 舊檔案名稱 | 功能說明 |
|------|-----------|---------|
| 1 | `20260102_products_and_categories.sql` | 基礎資料表 (categories, products) |
| 2 | `20260103_series_and_tier_prices.sql` | 系列與等級價格機制 |
| 3 | `20260105_retail_price_protection.sql` | 零售價格保護 |
| 4 | `20260106_add_series_code.sql` | 系列代碼 |
| 5 | `20260110_add_product_tags.sql` | 商品標籤功能 |
| 6 | `20260112_add_product_search_indexes.sql` | 搜尋索引 |
| 7 | `20260116_add_unique_name_constraints.sql` | 唯一性約束 |

**包含內容**:
- ✅ `categories` 表（商品分類）- 含代碼、狀態、排序
- ✅ `series` 表（產品系列）- 含代碼、狀態、排序
- ✅ `products` 表（商品）- 含標籤、零售價格、庫存狀態
- ✅ `tier_prices` 表（等級價格）- 多對多關聯
- ✅ 商品編號自動生成函數（格式：[分類代碼]-[系列代碼]-[01]）
- ✅ Storage Bucket（products）與 RLS Policies
- ✅ 預設資料（3 個分類）
- ✅ 商品標籤 (`tags` 欄位)
- ✅ GIN 索引 (tags 全文搜尋)
- ✅ 唯一性約束 (products.name, series.name)
- ✅ Storage Bucket
- ✅ RLS Policies

---

### M3: 訂單與工作流程

**新檔案**: `20260107120000_orders_and_workflow.sql`

**整合來源** (6 個檔案):

| 編號 | 舊檔案名稱 | 功能說明 |
|------|-----------|---------|
| 1 | `20260107_create_orders.sql` | 訂單基礎資料表 |
| 2 | `20260108_fix_orders_rls_insert.sql` | RLS 修復 |
| 3 | `20260106_add_delete_order_function.sql` | 刪除訂單函數 |
| 4 | `20260111_add_order_delete_action.sql` | 刪除操作支援 |
| 5 | `20260117_grant_order_functions.sql` | 函數權限授予 |
| 6 | `20260118_fix_order_functions_action_type.sql` | action_type 修復 |

**包含內容**:
- ✅ `orders` 表（訂單主表）
- ✅ `order_items` 表（訂單明細）
- ✅ `order_timelines` 表（訂單操作歷史）
- ✅ Function: `generate_order_number()`
- ✅ Function: `cancel_order_and_restore_stock()`
- ✅ Function: `update_order_status()`
- ✅ GRANT EXECUTE 權限
- ✅ RLS Policies

---

### M4: 運費與自訂費用

**新檔案**: `20260107130000_shipping_and_custom_fees.sql`

**整合來源** (5 個檔案):

| 編號 | 舊檔案名稱 | 功能說明 |
|------|-----------|---------|
| 1 | `20260122_add_shipping_features.sql` | 運費設定 |
| 2 | `20260123_remove_confirmed_status.sql` | 移除 confirmed 狀態 |
| 3 | `20260124_extend_order_timelines.sql` | 訂單修改歷程 |
| 4 | `20260125_fix_order_modifications_function.sql` | 修改函數修復 |
| 5 | `20260126_fix_cancel_order_allow_shipping.sql` | 取消訂單修復 |

**包含內容**:
- ✅ 擴充 `tiers` 表（shipping_fee, free_shipping_threshold）
- ✅ 擴充 `orders` 表（shipping_fee）
- ✅ 擴充 `order_timelines` 表（modifications JSONB）
- ✅ `order_custom_fees` 表（自訂費用）
- ✅ Function: `calculate_shipping_fee()`
- ✅ Function: `mark_order_as_shipping()`
- ✅ Function: `update_order_with_modifications()`
- ✅ Function: `cancel_order_and_restore_stock()` (修正版)
- ✅ 移除 `confirmed` 狀態
- ✅ RLS Policies

---

### M5: 優惠券系統

**新檔案**: `20260107140000_coupon_system.sql`

**整合來源** (3 個檔案):

| 編號 | 舊檔案名稱 | 功能說明 |
|------|-----------|---------|
| 1 | `20260119_create_coupons.sql` | 優惠券基礎資料表 |
| 2 | `20260120_add_coupon_claim_limit.sql` | 領取張數限制 |
| 3 | `20260121_add_order_coupons_insert_policy.sql` | 訂單優惠券 RLS |

**包含內容**:
- ✅ `coupons` 表（優惠券主表，含 claim_limit）
- ✅ `coupon_tier_restrictions` 表（等級限制）
- ✅ `coupon_series_restrictions` 表（系列限制）
- ✅ `user_coupons` 表（領取記錄）
- ✅ `order_coupons` 表（訂單快照）
- ✅ View: `active_coupons`
- ✅ Generated Column: `code_normalized`
- ✅ RLS Policies

---

### M6: 系統管理與稽核

**新檔案**: `20260107150000_system_admin_and_audit.sql`

**整合來源** (3 個檔案):

| 編號 | 舊檔案名稱 | 功能說明 |
|------|-----------|---------|
| 1 | `20260113_system_admin.sql` | 管理員與系統設定 |
| 2 | `20260114_add_audit_logs_insert_policy.sql` | 操作日誌 RLS |
| 3 | `20260115_update_system_settings_description.sql` | 設定描述欄位 |

**包含內容**:
- ✅ 擴充 `profiles` 表（username, display_name）
- ✅ `system_settings` 表（系統設定）
- ✅ `audit_logs` 表（操作日誌）
- ✅ 預設資料（9 個系統設定）
- ✅ RLS Policies

**⚠️ 注意**：以下欄位整合時遺漏，已於 Migration `20260109073747` 補充：
- ❌ ~~擴充 `order_timelines` 表（content 欄位）~~ → 補充於 `20260109073747`
- ❌ ~~擴充 `profiles` 表（address, admin_notes）~~ → 補充於 `20260109073747`
- ❌ ~~`announcements` 表（廣告輪播）~~ → 獨立於 `20260107180000`

---

### M7: 索引與效能優化

**新檔案**: `20260107160000_indexes_and_performance.sql`

**整合來源**: 整合所有現有索引 + 新增效能優化索引

**包含內容**:
- ✅ 整合所有現有索引定義
- ✅ 新增 `idx_products_series_status` (複合索引)
- ✅ 新增 `idx_products_active_series_updated` (部分索引)
- ✅ 新增 `idx_orders_pending_created` (部分索引)
- ✅ 確認 `idx_products_tags` (GIN 索引)
- ✅ COMMENT 註解說明

---

### M8: RLS 策略

**新檔案**: `20260107170000_rls_policies.sql`

**整合來源**: 整合所有 RLS Policy 定義

**包含內容**:
- ✅ 18 個資料表的 RLS 啟用
- ✅ 60+ 個 RLS Policy
- ✅ COMMENT 註解說明

---

## 快速查找指南

### 若要修改...

| 功能 | 查看檔案 |
|------|---------|
| 會員等級邏輯 | M1: `20260107100000_core_auth_and_tiers.sql` |
| 商品分類與系列 | M2: `20260107110000_product_catalog_system.sql` |
| 商品標籤與搜尋 | M2: `20260107110000_product_catalog_system.sql` |
| 等級價格設定 | M2: `20260107110000_product_catalog_system.sql` |
| 訂單建立流程 | M3: `20260107120000_orders_and_workflow.sql` |
| 訂單狀態更新 | M3: `20260107120000_orders_and_workflow.sql` |
| 運費計算邏輯 | M4: `20260107130000_shipping_and_custom_fees.sql` |
| 訂單修改功能 | M4: `20260107130000_shipping_and_custom_fees.sql` |
| 優惠券建立與使用 | M5: `20260107140000_coupon_system.sql` |
| 優惠券限制規則 | M5: `20260107140000_coupon_system.sql` |
| 系統設定項目 | M6: `20260107150000_system_admin_and_audit.sql` |
| 操作日誌記錄 | M6: `20260107150000_system_admin_and_audit.sql` |
| 查詢效能優化 | M7: `20260107160000_indexes_and_performance.sql` |
| 權限控制規則 | M8: `20260107170000_rls_policies.sql` |

---

## 回滾指引

若整合後發現問題，需要回滾到原始狀態：

### 步驟 1: 刪除整合後的檔案

```powershell
cd supabase/migrations
Remove-Item 20260107*.sql
```

### 步驟 2: 還原封存的檔案

```powershell
Copy-Item .archive/*.sql .
```

### 步驟 3: 重置資料庫

```powershell
supabase db reset
```

⚠️ **警告**: 此操作會清空本機資料庫，請先備份！

---

## 整合統計

| 項目 | 數量 |
|------|-----|
| 整合前 Migration 數量 | 27 個 |
| 整合後 Migration 數量 | 8 個 |
| 減少數量 | 19 個 |
| 減少比例 | **70%** |
| 整合前總行數 | ~3200 行 |
| 整合後總行數 | ~3900 行 (含註解) |

---

**最後更新**: 2026-01-07
**維護者**: Claude Sonnet 4.5
