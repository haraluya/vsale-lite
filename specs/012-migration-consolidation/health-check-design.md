# 資料庫健康檢查機制設計文件

**Feature**: 012-migration-consolidation
**Created**: 2026-01-07
**Author**: Claude Sonnet 4.5
**Status**: Design Complete

---

## 執行摘要

本文件描述一套全面的資料庫健康檢查機制，用於驗證整合後的 Migration 是否與現有 Schema 100% 一致。系統包含：

- **225+ 個檢查項目**，涵蓋 Schema、索引、RLS、函數、約束
- **自動化 PowerShell 腳本**，一鍵執行健康檢查並產生報告
- **詳細檢查清單文件**，提供完整的驗證標準
- **PostgreSQL 系統表查詢參考**，快速定位問題

---

## 設計目標

### 主要目標
1. **100% Schema 一致性驗證**：確保整合後的 Migration 完全還原現有資料庫結構
2. **快速問題定位**：在 30 秒內完成 225+ 項檢查，立即報告錯誤與警告
3. **自動化報告生成**：產生結構化報告，支援 Console、Text、JSON 格式
4. **可追溯性**：所有檢查結果儲存於暫存表，可重複查詢與分析

### 次要目標
- 提供 PostgreSQL 系統表查詢範例，降低學習門檻
- 建立完整的檢查清單文件，作為 Migration 開發指南
- 支援增量檢查，可僅檢查特定類別（如僅檢查索引）

---

## 架構設計

### 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                  資料庫健康檢查系統                           │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ PowerShell    │   │ SQL 檢查檔案   │   │ 檢查清單文件   │
│ 執行腳本       │   │ (225+ 檢查)    │   │ (驗證標準)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                  ┌────────────────────┐
                  │ PostgreSQL 系統表   │
                  │ - pg_tables        │
                  │ - pg_indexes       │
                  │ - pg_policies      │
                  │ - information_sch…│
                  └────────────────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ 檢查結果暫存表      │
                  │ health_check_results│
                  └────────────────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ 報告輸出            │
                  │ - Console 顯示     │
                  │ - Text 檔案儲存    │
                  │ - SQL 查詢結果     │
                  └────────────────────┘
```

---

## 檢查項目設計

### 檢查類別分佈

| 類別 | 檢查項目數 | 嚴重性 | 預期通過率 |
|------|-----------|--------|-----------|
| **Schema 一致性** | 85 項 | 🔴 高 | 100% |
| **索引完整性** | 70 項 | 🟡 中 | ≥95% |
| **RLS 覆蓋率** | 40 項 | 🔴 高 | 100% |
| **函數授權** | 15 項 | 🔴 高 | 100% |
| **約束完整性** | 15 項 | 🟡 中 | ≥90% |
| **總計** | **225 項** | - | **≥98%** |

---

### PART 1: Schema 一致性檢查（85 項）

#### 1.1 表數量與存在性（19 項）
```sql
-- 檢查 1: 表數量 = 18
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- 預期: 18

-- 檢查 2-19: 18 個必要表存在性
-- tiers, profiles, categories, series, products, tier_prices,
-- orders, order_items, order_timelines, order_custom_fees,
-- system_settings, audit_logs, coupons, coupon_tier_restrictions,
-- coupon_series_restrictions, user_coupons, order_coupons, announcements
```

#### 1.2 欄位完整性（50 項）
- 關鍵欄位存在性：`tiers.shipping_fee`, `profiles.username`, `products.tags`, `orders.shipping_fee`, `order_timelines.modifications`
- 型別正確性：UUID, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, ARRAY
- 檢查方法：查詢 `information_schema.columns` 比對 `data_type`

#### 1.3 唯一性約束（12 項）
- UNIQUE 約束：`tiers.name`, `profiles.phone`, `series.code`, `products.code`, `orders.order_number`
- 複合 UNIQUE：`tier_prices(tier_id, product_id)`, `user_coupons(user_id, coupon_id)`
- 部分索引：`profiles.phone WHERE phone IS NOT NULL`

#### 1.4 外鍵約束（5 項）
- 總數檢查：≥ 20 個外鍵
- CASCADE 刪除：`order_items.order_id` → `orders.id`
- RESTRICT 刪除：`products.series_id` → `series.id`
- SET NULL 刪除：`audit_logs.actor_id` → `auth.users.id`

#### 1.5 CHECK 約束（8 項）
- 角色限制：`profiles.role IN ('client', 'admin')`
- 狀態限制：`orders.status IN ('pending', 'shipping', 'completed', 'cancelled')`
- 業務規則：`coupons.valid_until > valid_from`

---

### PART 2: 索引完整性檢查（70 項）

#### 2.1 索引總數（1 項）
```sql
-- 檢查索引總數 ≥ 65 個（不含主鍵）
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey';
-- 預期: 65-75
```

#### 2.2 必要索引存在性（65 項）
**基本索引**（50 項）:
- 單欄索引：`idx_tiers_rank`, `idx_profiles_phone`, `idx_products_code`
- 複合索引：`idx_tier_prices_lookup(tier_id, product_id)`, `idx_orders_user_status(user_id, status)`
- 部分索引：`idx_products_status_updated_at` (WHERE status = 'active')

**效能優化索引**（12 項）:
- 商品查詢：`idx_products_series_status`, `idx_products_active_series_updated`
- 訂單查詢：`idx_orders_pending_created` (WHERE status = 'pending')
- 優惠券查詢：`idx_coupons_valid_time(valid_from, valid_until)`

**GIN 索引**（3 項）:
- `idx_products_tags` (標籤 ARRAY 查詢)
- `idx_audit_logs_old_values_gin` (JSONB 查詢)
- `idx_audit_logs_new_values_gin` (JSONB 查詢)

#### 2.3 重複索引檢查（1 項）
- 比對 `indexdef`，檢查相同定義的索引
- 警告：移除重複索引以節省空間

#### 2.4 未使用索引檢查（1 項）
- 查詢 `pg_stat_user_indexes.idx_scan = 0`
- 建議：移除從未使用的索引

---

### PART 3: RLS 覆蓋率檢查（40 項）

#### 3.1 RLS 啟用狀態（19 項）
```sql
-- 檢查 1: RLS 總覆蓋率 = 100%
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- 預期: 18 / 18

-- 檢查 2-19: 逐表 RLS 啟用檢查
-- 所有 18 個業務表必須啟用 RLS
```

#### 3.2 Policy 數量檢查（2 項）
- Policy 總數 ≥ 70 個
- 每個表至少 2 個 Policies（客戶 SELECT + 管理員 ALL）

#### 3.3 關鍵 Policy 存在性（19 項）
**認證與使用者相關**（5 項）:
- `tiers:Allow authenticated users to read tiers`
- `profiles:Allow users to read own profile`
- `profiles:Allow admin to read all profiles`

**訂單相關**（7 項）:
- `orders:Clients can view their own orders`
- `orders:Clients can create their own orders`
- `orders:Admins can update orders`
- `order_items:Clients can insert items for their own orders`

**優惠券相關**（4 項）:
- `coupons:Clients can view active coupons`
- `user_coupons:Clients can claim coupons`

**系統設定相關**（3 項）:
- `system_settings:Public can view public settings`
- `audit_logs:Admins can view all audit logs`

---

### PART 4: PostgreSQL 函數授權檢查（15 項）

#### 4.1 函數存在性（9 項）
```sql
-- 檢查關鍵函數是否存在
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN (
  'generate_order_number',
  'generate_product_code',
  'mark_order_as_shipping',
  'cancel_order_and_restore_stock',
  'update_order_status',
  'delete_order_pending',
  'calculate_shipping_fee',
  'update_order_with_modifications'
);
-- 預期: 9 個函數
```

#### 4.2 函數授權檢查（5 項）
- 授權總數：≥ 9 個函數授予 `authenticated` 角色 EXECUTE 權限
- 關鍵函數授權：`generate_order_number()`, `calculate_shipping_fee()`, `mark_order_as_shipping()`

#### 4.3 Trigger Function 檢查（1 項）
- `update_updated_at_column()` - 所有表使用

---

### PART 5: 約束完整性檢查（15 項）

#### 5.1 CHECK 約束總數（1 項）
- CHECK 約束總數 ≥ 30 個

#### 5.2 關鍵 CHECK 約束（8 項）
- `profiles:client_must_have_phone`
- `profiles:admin_must_have_username`
- `categories:check_code_format` (^[A-Z]{3,10}$)
- `coupons:valid_time_range`

#### 5.3 預設值檢查（6 項）
- `orders.status` → 'pending'
- `coupons.status` → 'active'
- `system_settings.is_public` → false

---

## SQL 檢查檔案設計

### 檔案結構

```sql
-- ================================================================
-- db-health-check.sql
-- ================================================================

-- 1. 建立暫存表（儲存檢查結果）
CREATE TEMP TABLE health_check_results (
  check_id SERIAL PRIMARY KEY,
  category TEXT,
  check_type TEXT,
  target_name TEXT,
  status TEXT CHECK (status IN ('OK', 'WARNING', 'ERROR')),
  expected_value TEXT,
  actual_value TEXT,
  message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 執行 225+ 個檢查（使用 DO $$ ... END $$ 區塊）
-- PART 1: Schema 一致性檢查（85 項）
-- PART 2: 索引完整性檢查（70 項）
-- PART 3: RLS 覆蓋率檢查（40 項）
-- PART 4: PostgreSQL 函數授權檢查（15 項）
-- PART 5: 約束完整性檢查（15 項）

-- 3. 產生檢查報告
-- 3.1 統計摘要
-- 3.2 詳細結果（按狀態與類別排序）
-- 3.3 僅顯示錯誤與警告
```

### 檢查結果範例

```
========== 資料庫健康檢查報告 ==========
檢查時間: 2026-01-07 12:05:30

檢查項目總數: 225
通過 (OK):    220 (97.8%)
警告 (WARNING): 3 (1.3%)
錯誤 (ERROR):  2 (0.9%)

========================================

┌─────────┬──────────┬─────────────────────────────────┬──────────────────────────┐
│ 狀態     │ 類別      │ 目標                             │ 訊息                      │
├─────────┼──────────┼─────────────────────────────────┼──────────────────────────┤
│ ERROR   │ Index    │ idx_products_series_status      │ 索引缺失，查詢效能受影響    │
│ ERROR   │ RLS      │ orders → admin_delete_orders    │ Policy 缺失，權限控制失效  │
│ WARNING │ Index    │ products                        │ 發現重複索引              │
│ WARNING │ Function │ calculate_shipping_fee          │ 函數未授權                │
│ WARNING │ Constraint│ coupons → code_length          │ 約束缺失                  │
└─────────┴──────────┴─────────────────────────────────┴──────────────────────────┘
```

---

## PowerShell 腳本設計

### 腳本流程

```
┌─────────────────────────────────────────┐
│ 1. 檢查 Supabase 服務狀態                │
│    - 執行 supabase status               │
│    - 若未啟動則提示執行 supabase start   │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 2. 取得資料庫連線資訊                    │
│    - Host: 127.0.0.1                    │
│    - Port: 54322                        │
│    - Database: postgres                 │
│    - User: postgres                     │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 3. 執行健康檢查 SQL                      │
│    - 使用 psql 執行 db-health-check.sql │
│    - 預計執行時間: 30 秒                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 4. 解析檢查結果                          │
│    - 提取統計資訊（OK/WARNING/ERROR）   │
│    - 判斷整體健康狀態                    │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 5. 顯示摘要報告                          │
│    - Console 顯示彩色輸出                │
│    - 僅顯示錯誤與警告                    │
│    - 提示儲存報告選項                    │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 6. 儲存報告（可選）                      │
│    - 檔名: health-check-YYYYMMDD_HHMMSS.txt │
│    - 目錄: .\reports\                   │
└─────────────────────────────────────────┘
```

### 使用範例

```powershell
# 基本執行（顯示於終端機）
.\scripts\db-health-check.ps1

# 儲存報告到檔案
.\scripts\db-health-check.ps1 -SaveReport

# 指定報告目錄
.\scripts\db-health-check.ps1 -SaveReport -ReportDir ".\reports\2026-01"
```

---

## 檢查清單文件設計

### 文件結構

1. **檢查清單摘要**（1 頁）
   - 檢查類別分佈表
   - 預期通過率標準

2. **PART 1: Schema 一致性檢查**（15 頁）
   - 1.1 表數量與存在性（19 項）
   - 1.2 欄位完整性（50 項）
   - 1.3 唯一性約束（12 項）
   - 1.4 外鍵約束（5 項）
   - 1.5 CHECK 約束（8 項）

3. **PART 2: 索引完整性檢查**（10 頁）
   - 2.1 索引總數（1 項）
   - 2.2 必要索引存在性（65 項）
   - 2.3 重複索引檢查（1 項）
   - 2.4 GIN 索引檢查（3 項）

4. **PART 3: RLS 覆蓋率檢查**（8 頁）
   - 3.1 RLS 啟用狀態（19 項）
   - 3.2 Policy 數量檢查（2 項）
   - 3.3 關鍵 Policy 存在性（19 項）

5. **PART 4: PostgreSQL 函數授權檢查**（5 頁）
   - 4.1 函數存在性（9 項）
   - 4.2 函數授權檢查（5 項）
   - 4.3 Trigger Function 檢查（1 項）

6. **PART 5: 約束完整性檢查**（3 頁）
   - 5.1 CHECK 約束總數（1 項）
   - 5.2 關鍵 CHECK 約束（8 項）
   - 5.3 預設值檢查（6 項）

7. **附錄**（5 頁）
   - 檢查報告範例
   - 使用方式
   - 常見問題與解決方案
   - 版本歷史

---

## PostgreSQL 系統表查詢參考

### 提供查詢範例

#### 1. 表相關查詢（6 個範例）
- 查詢所有表
- 查詢表數量
- 查詢表的詳細資訊（大小、註解）

#### 2. 欄位相關查詢（4 個範例）
- 查詢指定表的所有欄位
- 查詢欄位註解

#### 3. 索引相關查詢（6 個範例）
- 查詢所有索引
- 查詢重複索引
- 查詢 GIN 索引
- 查詢未使用的索引

#### 4. 約束相關查詢（4 個範例）
- 查詢 UNIQUE 約束
- 查詢外鍵約束（含刪除規則）
- 查詢 CHECK 約束

#### 5. RLS 相關查詢（5 個範例）
- 查詢 RLS 啟用狀態
- 查詢所有 Policies
- 統計每個表的 Policy 數量

#### 6. 函數相關查詢（5 個範例）
- 查詢所有函數
- 查詢函數授權
- 查詢函數原始碼

#### 7. 統計資訊查詢（2 個範例）
- 查詢表的大小與行數
- 查詢索引效能統計

#### 8. 快速檢查腳本（2 個範例）
- 資料庫整體健康檢查（一次性查詢）
- 檢查缺失項目（快速掃描）

---

## 實作檔案清單

| 檔案 | 路徑 | 大小 | 用途 |
|------|------|------|------|
| `db-health-check.sql` | `specs/012-migration-consolidation/` | ~15 KB | SQL 檢查檔案（225+ 檢查項目） |
| `db-health-check.ps1` | `scripts/` | ~5 KB | PowerShell 執行腳本 |
| `health-check-checklist.md` | `specs/012-migration-consolidation/` | ~30 KB | 檢查清單文件（50 頁） |
| `pg-system-tables-reference.md` | `specs/012-migration-consolidation/` | ~20 KB | PostgreSQL 系統表查詢參考 |
| `health-check-design.md` | `specs/012-migration-consolidation/` | ~12 KB | 本設計文件 |

---

## 預期效果

### 成功指標

1. **檢查覆蓋率 ≥ 98%**
   - 225+ 個檢查項目，涵蓋所有關鍵 Schema 元素
   - 允許 ≤5 個警告（次要索引、效能優化項目）

2. **執行時間 < 30 秒**
   - 單次檢查完成時間
   - 報告生成時間 < 2 秒

3. **錯誤定位準確率 100%**
   - 所有 ERROR 狀態的檢查項目都必須包含明確的修復建議
   - 警告項目提供優化建議

4. **報告可讀性**
   - Console 輸出使用彩色標示（綠色 OK、黃色 WARNING、紅色 ERROR）
   - 表格化輸出，易於掃描
   - 提供完整的 SQL 查詢結果儲存於暫存表

---

## 使用場景

### 場景 1: Migration 整合後驗證
**時機**: 完成 8 個整合檔案後
**操作**:
```powershell
# 執行健康檢查
.\scripts\db-health-check.ps1 -SaveReport

# 預期結果: 0 錯誤，≤2 警告
```

### 場景 2: 每日開發驗證
**時機**: 每天開始開發前
**操作**:
```powershell
# 快速檢查
.\scripts\db-health-check.ps1

# 若有問題，查詢詳細結果
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM health_check_results WHERE status IN ('ERROR', 'WARNING');"
```

### 場景 3: 部署前最終驗證
**時機**: 部署到雲端前
**操作**:
```powershell
# 執行完整檢查並儲存報告
.\scripts\db-health-check.ps1 -SaveReport -ReportDir ".\reports\pre-deployment"

# 確認通過率 ≥ 98%
# 確認無 ERROR
```

---

## 維護計畫

### 版本更新
- 當新增 Migration 時，同步更新檢查項目
- 維護 `health-check-checklist.md` 的檢查項目清單
- 更新 `pg-system-tables-reference.md` 的查詢範例

### 效能優化
- 定期檢查 SQL 執行計畫，優化慢查詢
- 考慮將常用檢查合併為單一查詢
- 評估是否需要建立專用的檢查結果表（永久儲存）

### 擴展計畫
- 支援 JSON 格式報告輸出
- 支援 HTML 格式報告（含圖表）
- 整合到 CI/CD Pipeline（GitHub Actions）
- 建立 Git Pre-commit Hook（自動執行健康檢查）

---

## 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|-------|------|---------|
| PostgreSQL 版本差異導致系統表查詢失敗 | 低 | 高 | 使用穩定的系統表（information_schema），避免使用過新的功能 |
| 檢查項目過多導致執行時間過長 | 中 | 中 | 優化查詢、合併檢查、使用索引 |
| 暫存表被意外刪除導致結果遺失 | 低 | 低 | 提供 `-SaveReport` 選項儲存到檔案 |
| 檢查標準與實際需求不符 | 中 | 中 | 定期檢視檢查清單，根據實際情況調整 |

---

## 總結

本設計提供一套完整的資料庫健康檢查機制，包含：

✅ **225+ 個檢查項目**，涵蓋 Schema、索引、RLS、函數、約束
✅ **自動化執行腳本**，一鍵完成檢查並產生報告
✅ **詳細檢查清單文件**，提供完整的驗證標準與修復建議
✅ **PostgreSQL 系統表查詢參考**，降低學習門檻

**預期效果**:
- 檢查覆蓋率 ≥ 98%
- 執行時間 < 30 秒
- 錯誤定位準確率 100%

**下一步行動**:
1. 執行健康檢查腳本驗證設計
2. 根據實際結果調整檢查項目
3. 整合到 Migration 開發流程
4. 建立自動化測試 Pipeline

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-07
