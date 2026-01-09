# Migration 整合檢查清單

**用途**：在整合多個 Migration 檔案時，使用此清單確保不遺漏任何欄位或功能。

**最後更新**：2026-01-09
**維護者**：Claude Sonnet 4.5

---

## 📋 整合前準備

### 1. 備份現有 Migration
- [ ] 建立 `.archive/` 資料夾
- [ ] 複製所有 Migration 檔案到 `.archive/`
- [ ] 建立 `MAPPING.md` 記錄整合對應關係

### 2. 分析 Migration 結構
- [ ] 列出所有 Migration 檔案（依時間順序）
- [ ] 分類功能模組（認證、商品、訂單、系統等）
- [ ] 識別相依性（哪些 Migration 必須先執行）

---

## 🔍 資料表欄位檢查清單

### Tier 1: 核心資料表（必須完整）

#### `profiles` 表
- [ ] `id` (UUID PRIMARY KEY)
- [ ] `phone` (TEXT UNIQUE)
- [ ] `email` (TEXT UNIQUE)
- [ ] `role` (TEXT NOT NULL)
- [ ] `tier_id` (UUID REFERENCES tiers)
- [ ] `created_at` (TIMESTAMPTZ)
- [ ] `display_name` (TEXT) - **Feature 001**
- [ ] `notes` (TEXT) - **Feature 001**
- [ ] `username` (TEXT UNIQUE) - **Feature 008**
- [ ] `address` (TEXT) - **Feature 007** ⚠️
- [ ] `admin_notes` (TEXT) - **Feature 007** ⚠️

#### `orders` 表
- [ ] `id` (UUID PRIMARY KEY)
- [ ] `order_number` (TEXT UNIQUE NOT NULL)
- [ ] `user_id` (UUID REFERENCES auth.users)
- [ ] `total_amount` (DECIMAL)
- [ ] `status` (TEXT)
- [ ] `notes` (TEXT)
- [ ] `created_at` (TIMESTAMPTZ)
- [ ] `updated_at` (TIMESTAMPTZ)
- [ ] `shipping_fee` (DECIMAL) - **Feature 011** ⚠️

#### `order_timelines` 表
- [ ] `id` (UUID PRIMARY KEY)
- [ ] `order_id` (UUID REFERENCES orders)
- [ ] `action_type` (TEXT)
- [ ] `actor_id` (UUID REFERENCES auth.users)
- [ ] `actor_role` (TEXT)
- [ ] `old_status` (TEXT)
- [ ] `new_status` (TEXT)
- [ ] `notes` (TEXT)
- [ ] `created_at` (TIMESTAMPTZ)
- [ ] `content` (TEXT) - **Feature 007** ⚠️
- [ ] `modifications` (JSONB) - **Feature 011** ⚠️

#### `tiers` 表
- [ ] `id` (UUID PRIMARY KEY)
- [ ] `name` (TEXT UNIQUE NOT NULL)
- [ ] `rank` (INTEGER)
- [ ] `status` (TEXT)
- [ ] `created_at` (TIMESTAMPTZ)
- [ ] `updated_at` (TIMESTAMPTZ)
- [ ] `shipping_fee` (DECIMAL) - **Feature 011** ⚠️
- [ ] `free_shipping_threshold` (DECIMAL) - **Feature 011** ⚠️

### Tier 2: 次要資料表

#### `order_custom_fees` 表
- [ ] `id` (UUID PRIMARY KEY)
- [ ] `order_id` (UUID REFERENCES orders)
- [ ] `fee_name` (TEXT NOT NULL)
- [ ] `amount` (DECIMAL NOT NULL)
- [ ] `created_at` (TIMESTAMPTZ)
- [ ] `created_by` (UUID REFERENCES auth.users)

#### `order_coupons` 表
- [ ] `id` (UUID PRIMARY KEY)
- [ ] `order_id` (UUID REFERENCES orders)
- [ ] `coupon_code` (TEXT NOT NULL)
- [ ] `discount_type` (TEXT NOT NULL)
- [ ] `discount_value` (DECIMAL NOT NULL)
- [ ] `discount_amount` (DECIMAL NOT NULL)
- [ ] `created_at` (TIMESTAMPTZ)

---

## 🔧 功能元件檢查清單

### 1. PostgreSQL Functions
- [ ] `generate_order_number()` - 訂單編號產生
- [ ] `cancel_order_and_restore_stock()` - 取消訂單與回補庫存
- [ ] `update_order_status()` - 更新訂單狀態
- [ ] `calculate_shipping_fee()` - 計算運費 ⚠️
- [ ] `mark_order_as_shipping()` - 標記出貨 ⚠️
- [ ] `update_order_with_modifications()` - 批次修改訂單 ⚠️
- [ ] `delete_order_pending()` - 刪除待確認訂單

### 2. Triggers
- [ ] 商品編號自動生成 Trigger
- [ ] `updated_at` 自動更新 Trigger（各資料表）

### 3. Views
- [ ] `active_coupons` - 有效優惠券 View

### 4. Constraints
- [ ] UNIQUE 約束（檢查所有唯一性欄位）
- [ ] CHECK 約束（檢查所有業務規則）
- [ ] FOREIGN KEY 約束（檢查所有關聯）

### 5. Indexes
- [ ] 主鍵索引
- [ ] 外鍵索引
- [ ] 查詢效能索引（GIN、部分索引）
- [ ] 唯一性索引

### 6. RLS Policies
- [ ] 每個資料表的 `ENABLE ROW LEVEL SECURITY`
- [ ] 客戶端 SELECT Policy
- [ ] 客戶端 INSERT Policy
- [ ] 管理員 SELECT Policy
- [ ] 管理員 INSERT/UPDATE/DELETE Policy

---

## ✅ 整合後驗證

### 1. 語法檢查
```bash
# 檢查 SQL 語法
psql -f supabase/migrations/M1_*.sql --dry-run
```

### 2. 欄位完整性檢查
```sql
-- 檢查 profiles 表所有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 檢查 order_timelines 表所有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_timelines'
ORDER BY ordinal_position;

-- 檢查 orders 表所有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 檢查 tiers 表所有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tiers'
ORDER BY ordinal_position;
```

### 3. 功能驗證
- [ ] 本機執行 `supabase db reset` 測試完整流程
- [ ] 執行應用程式，測試所有功能模組
- [ ] 檢查 TypeScript 型別檢查通過（`pnpm type-check`）
- [ ] 檢查 ESLint 通過（`pnpm lint`）

### 4. 文件更新
- [ ] 更新 `MAPPING.md` 記錄整合對應關係
- [ ] 更新 `README.md` 記錄 Migration 檔案結構
- [ ] 更新 `CLAUDE.md` 記錄資料庫結構變更

---

## 🚨 常見遺漏項目（基於實際經驗）

### 2026-01-09 修復經驗

**遺漏欄位**：
- ❌ `profiles.address`（Feature 007）
- ❌ `profiles.admin_notes`（Feature 007）
- ❌ `order_timelines.content`（Feature 007）
- ❌ `order_timelines.modifications`（Feature 011）

**原因分析**：
- 整合時僅查看主要功能，忽略後續擴充欄位
- 未逐一比對舊 Migration 的所有 `ALTER TABLE` 語句
- 未使用自動化工具驗證欄位完整性

**預防措施**：
1. ✅ 使用此檢查清單逐項確認
2. ✅ 執行 SQL 查詢比對本機與整合後的資料表結構
3. ✅ 在測試環境完整測試所有功能
4. ✅ 檢查終端是否有 `column does not exist` 錯誤

---

## 🔄 回滾計畫

若整合後發現問題：

### 步驟 1: 評估影響範圍
- [ ] 是否僅本機環境受影響？
- [ ] 是否已推送到雲端？
- [ ] 是否有資料遺失風險？

### 步驟 2: 選擇修復策略

#### 策略 A：補充 Migration（推薦）
- 適用：遺漏欄位、索引、約束
- 優點：保留現有資料、影響最小
- 做法：建立新 Migration 補上遺漏項目

#### 策略 B：修正整合檔案後重置
- 適用：結構性錯誤、大量遺漏
- 優點：確保完整性
- 做法：
  1. 修正整合後的 Migration 檔案
  2. 本機執行 `supabase db reset`
  3. 測試驗證無誤後推送雲端

#### 策略 C：完全回滾
- 適用：整合失敗、無法修復
- 優點：回到已知正確狀態
- 做法：
  1. 刪除整合後的檔案
  2. 還原 `.archive/` 的檔案
  3. 執行 `supabase db reset`

---

## 📚 參考資源

- [Supabase Migration 指南](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Schema 文件](https://www.postgresql.org/docs/current/ddl.html)
- 專案 Migration 索引：`supabase/migrations/README.md`
- Migration 對應表：`supabase/migrations/.archive/MAPPING.md`

---

**維護說明**：
- 此檢查清單應隨專案成長持續更新
- 每次 Migration 整合後記錄經驗教訓
- 定期審查並補充新的檢查項目
