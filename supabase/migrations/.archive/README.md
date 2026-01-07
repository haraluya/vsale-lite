# Migration 封存目錄

此目錄儲存整合前的 27 個原始 Migration 檔案，作為回滾備份。

## 整合日期

**2026-01-07**: 將 27 個 Migration 檔案整合為 8 個功能模組化檔案

## 封存檔案清單

整合前的原始檔案（按時間戳排序）:

1. `20260101_initial_schema.sql` - 基礎資料表
2. `20260102_products_and_categories.sql` - 商品與分類
3. `20260103_series_and_tier_prices.sql` - 系列與等級價格
4. `20260104_fix_profiles_rls.sql` - RLS 修復
5. `20260105_retail_price_protection.sql` - 零售價格保護
6. `20260106_add_series_code.sql` - 系列代碼
7. `20260106_add_delete_order_function.sql` - 刪除訂單函數
8. `20260107_create_orders.sql` - 訂單基礎資料表
9. `20260108_fix_orders_rls_insert.sql` - 訂單 RLS 修復
10. `20260109_system_enhancement.sql` - 系統擴充
11. `20260110_add_product_tags.sql` - 商品標籤
12. `20260111_add_order_delete_action.sql` - 訂單刪除操作
13. `20260112_add_product_search_indexes.sql` - 搜尋索引
14. `20260113_system_admin.sql` - 系統管理
15. `20260114_add_audit_logs_insert_policy.sql` - 稽核日誌 RLS
16. `20260115_update_system_settings_description.sql` - 系統設定描述
17. `20260116_add_unique_name_constraints.sql` - 唯一性約束
18. `20260117_grant_order_functions.sql` - 函數權限授予
19. `20260118_fix_order_functions_action_type.sql` - action_type 修復
20. `20260119_create_coupons.sql` - 優惠券基礎資料表
21. `20260120_add_coupon_claim_limit.sql` - 優惠券領取限制
22. `20260121_add_order_coupons_insert_policy.sql` - 訂單優惠券 RLS
23. `20260122_add_shipping_features.sql` - 運費設定
24. `20260123_remove_confirmed_status.sql` - 移除 confirmed 狀態
25. `20260124_extend_order_timelines.sql` - 訂單修改歷程
26. `20260125_fix_order_modifications_function.sql` - 修改函數修復
27. `20260126_fix_cancel_order_allow_shipping.sql` - 取消訂單修復

## 整合對應表

詳細對應關係請參考: [MAPPING.md](./MAPPING.md)

## 還原指引

若需要回滾到整合前狀態:

1. **刪除整合後的 Migration 檔案** (20260107100000_*.sql - 20260107170000_*.sql)
2. **將此目錄下的檔案複製回 `supabase/migrations/` 目錄**
3. **執行資料庫重置**: `supabase db reset`

⚠️ **警告**: 回滾操作會清空資料庫，請先備份！

## 使用 MAPPING.md 查找功能

若需要修改特定功能，可參考 [MAPPING.md](./MAPPING.md) 找到對應的整合檔案。

範例：

- **修改會員等級邏輯**: 查看 M1 對應的整合檔案 `20260107100000_core_auth_and_tiers.sql`
- **修改商品目錄結構**: 查看 M2 對應的整合檔案 `20260107110000_product_catalog_system.sql`
