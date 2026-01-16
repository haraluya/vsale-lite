# Vsale-lite Database Migrations

**最後更新**: 2026-01-17
**當前版本**: 1.0.0 Consolidated Baseline

---

## 📋 當前 Active Migrations

### 主要檔案

| 檔案 | 說明 | 用途 |
|------|------|------|
| `20260116171402_consolidated_v1_baseline.sql` | **統一基線 (v1.0)** | 新環境部署時使用的完整 schema |
| `_TEMPLATE_safe_migration.sql` | 安全 Migration 範本 | 建立新 migration 時的參考範本 |

### 特殊檔案（不參與執行）

| 檔案 | 說明 |
|------|------|
| `_CHECKLIST.md` | Migration 部署前檢查清單 |
| `MIGRATION_STANDARDS.md` | Migration 撰寫標準與規範 |

---

## 🗂️ 歷史 Migration 歸檔

### .archive/2026-01-17-pre-consolidation/

**歸檔日期**: 2026-01-17
**歸檔數量**: 39 個 migration 檔案

此目錄儲存整合前的所有歷史 migration，包括：

#### 核心模組 (M1-M8) - 8 個檔案
- `20260107100000_core_auth_and_tiers.sql` (M1)
- `20260107110000_product_catalog_system.sql` (M2)
- `20260107120000_orders_and_workflow.sql` (M3)
- `20260107130000_shipping_and_custom_fees.sql` (M4)
- `20260107140000_coupon_system.sql` (M5)
- `20260107150000_system_admin_and_audit.sql` (M6)
- `20260107160000_indexes_and_performance.sql` (M7)
- `20260107170000_rls_policies.sql` (M8)

#### 修復性 Migration - 20 個檔案
- 優惠券系統修復：8 個
- 訂單系統修復：6 個
- 商品目錄修復：2 個
- 其他修復：4 個

#### 功能增強 Migration - 11 個檔案
- 性能優化：4 個
- 功能新增：7 個

**完整清單**: 請查看 `.archive/2026-01-17-pre-consolidation/` 目錄

---

## 🚀 Migration 整合說明

### 為什麼要整合？

在 2026-01-17 之前，專案累積了 40 個 migration 檔案：
- **問題**: 50% 為修復性質，核心函數被覆寫 2-3 次
- **影響**: 新環境重建需執行 40+ 個檔案，維護成本高
- **解決**: 建立統一基線，將所有變更整合為單一檔案

### 整合策略

**方法**: Migration 整合壓縮（Consolidation）

1. 匯出生產環境完整 schema（使用 `supabase db dump`）
2. 建立新的 baseline migration（包含所有最終版本）
3. 歸檔歷史 migration（保留完整歷史）
4. 更新文檔與指南

### 資料安全保證

✅ **生產環境零影響**
- Supabase 記錄已執行的 migration 版本號
- 歷史 migration 不會在生產環境重複執行
- Baseline 僅用於新環境部署

✅ **完整歷史保留**
- 所有舊檔案歸檔至 `.archive/` 目錄
- 保留完整的 git 歷史
- 可隨時查看舊版本

✅ **可回滾**
- 歸檔檔案可隨時復原
- Git 版本控制提供完整回滾機制

---

## 📚 核心資料模型

### 資料表清單

**認證與會員**:
- `tiers` - 會員等級
- `profiles` - 使用者業務資料

**商品目錄**:
- `categories` - 商品分類
- `series` - 系列
- `products` - 商品
- `tier_prices` - 等級價格

**訂單系統**:
- `orders` - 訂單主表
- `order_items` - 訂單明細
- `order_timelines` - 訂單歷程
- `order_custom_fees` - 自訂費用

**優惠券系統**:
- `coupons` - 優惠券主表
- `user_coupons` - 使用者領取記錄
- `coupon_tier_restrictions` - 等級限制
- `coupon_series_restrictions` - 系列限制
- `order_coupons` - 訂單使用記錄

**系統管理**:
- `admin_users` - 管理員帳號
- `audit_logs` - 操作日誌
- `system_settings` - 系統設定

**首頁管理**:
- `announcements` - 公告
- `home_page_blocks` - 首頁區塊

### 核心函數（最終版本）

**訂單處理**:
- `cancel_order_and_restore_stock()` - 取消訂單並退還庫存與優惠券
- `confirm_order_and_deduct_stock()` - 確認訂單並扣減庫存
- `delete_order_pending()` - 刪除待處理訂單
- `update_order_status()` - 更新訂單狀態
- `update_order_with_modifications()` - 更新訂單並記錄修改

**商品查詢**:
- `get_products_with_user_price()` - 取得商品及使用者價格
- `get_active_tags()` - 取得使用中的標籤

**運費計算**:
- `calculate_shipping_fee()` - 計算運費（含滿額免運）

**自動化**:
- `auto_assign_series_color()` - 自動分配系列顏色
- `auto_generate_product_code()` - 自動產生商品編號
- `generate_order_number()` - 產生訂單編號

### 核心 Views

- `active_coupons` - 使用中的優惠券（含安全性設定）

---

## 🔧 Migration 工作流程

### 標準 Migration 流程（生產環境）

```bash
# 1. 建立新 Migration
supabase migration new <feature_name>

# 2. 編輯 Migration 檔案
# 檔案位置: supabase/migrations/YYYYMMDD_<feature_name>.sql

# 3. 推送到生產環境（⚠️ 會直接影響線上資料）
pnpm db:migrate
# 或
supabase db push
```

### 生產環境操作注意事項

⚠️ **本專案使用線上 Supabase 生產資料庫**

**允許的操作**:
- ✅ `supabase migration new <name>` - 建立新 Migration
- ✅ `pnpm db:migrate` / `supabase db push` - 推送 Migration（執行前必須備份）
- ✅ `supabase migration list` - 查看 Migration 狀態
- ✅ `pnpm db:diff` - 檢查資料庫差異

**絕對禁止**:
- ❌ `supabase db reset` 或 `pnpm db:reset` - 會清空所有生產資料
- ❌ 破壞性變更（DROP TABLE、TRUNCATE）- 除非明確必要
- ❌ 直接在生產環境測試未驗證的 Migration

**部署前檢查清單**: 參見 `_CHECKLIST.md`

---

## 📖 相關文檔

### 專案根目錄
- `CLAUDE.md` - 完整專案文檔與憲章
- `DEPLOYMENT.md` - 部署指南

### docs/ 目錄
- `DATABASE_SAFETY_PROTOCOL.md` - 資料庫安全協議
- `SAFE_MIGRATION_GUIDE.md` - 安全 Migration 指南
- `BACKUP_RESTORE_CHEATSHEET.md` - 備份還原速查表
- `MIGRATION_CONSOLIDATION_GUIDE.md` - Migration 整合指南（本次整合的詳細記錄）

### supabase/migrations/ 目錄
- `_TEMPLATE_safe_migration.sql` - 安全 Migration 範本
- `_CHECKLIST.md` - 部署前檢查清單
- `MIGRATION_STANDARDS.md` - Migration 撰寫標準

---

## 🎯 未來 Migration 策略

### 定期整合計畫

建議每季度或當 migration 數量超過 20 個時，執行一次整合：

1. **評估時機**: 累積 15-20 個修復性 migration
2. **執行整合**: 使用與本次相同的流程
3. **版本升級**: v1.0 → v1.1 → v2.0...
4. **文檔更新**: 更新 README 和 MAPPING 文檔

### 最佳實踐

**編寫 Migration 時**:
1. 優先使用新增操作（ADD COLUMN, CREATE TABLE）
2. 避免刪除操作（先重新命名，保留 30 天）
3. 複雜變更分階段執行
4. 準備回滾計畫

**測試流程**:
1. 本地環境驗證
2. 測試環境完整測試
3. Code Review
4. 生產環境部署

---

## 🔍 查找與維護

### 如何查找特定功能的 Migration？

**方法 1**: 使用 Git 歷史
```bash
# 查找特定表或函數的變更歷史
git log --all --full-history -- "supabase/migrations/*" | grep -A 5 "table_name"
```

**方法 2**: 查看歸檔目錄
- 歷史 migration 按時間戳排序
- 檔名清楚標註功能（如 `fix_coupon_restore_on_cancel`）

**方法 3**: 查看 Baseline 檔案
- 新功能開發時，參考 baseline 中的最終版本
- Baseline 包含所有表、函數、View 的完整定義

### 如何修改現有功能？

**步驟**:
1. 建立新的 migration（不要修改 baseline）
2. 使用 `ALTER` 或 `CREATE OR REPLACE` 語句
3. 遵循安全 Migration 規範
4. 測試後推送到生產環境

**範例**:
```sql
-- 新增欄位
ALTER TABLE products ADD COLUMN new_field TEXT;

-- 修改函數
CREATE OR REPLACE FUNCTION calculate_shipping_fee(...)
RETURNS numeric AS $$
  -- 新邏輯
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🚨 故障排除

### Migration 執行失敗

**問題**: `supabase db push` 失敗

**解決步驟**:
1. 檢查錯誤訊息（語法錯誤 / 權限問題 / 衝突）
2. 使用 `supabase db diff` 查看差異
3. 修正 migration 檔案
4. 重新推送

### Baseline 與生產環境不一致

**問題**: 新環境部署後與生產環境有差異

**解決步驟**:
1. 重新匯出生產環境 schema: `supabase db dump`
2. 比對差異: `diff` 工具
3. 更新 baseline 檔案
4. 建立新的 migration 修正差異

### 需要回滾到舊版本

**步驟**:
1. 從 `.archive/` 復原舊檔案
2. 刪除 baseline migration
3. 重新執行歷史 migration（僅限測試環境）
4. 生產環境使用備份還原

**⚠️ 警告**: 回滾操作需謹慎，建議先在測試環境驗證

---

## 📞 聯絡與支援

**問題回報**: 請建立 GitHub Issue
**緊急支援**: 聯絡專案負責人

---

**文檔版本**: 1.0
**最後維護**: 2026-01-17
