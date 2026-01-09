# Migration 規範與最佳實踐

**版本**: 1.0.0
**最後更新**: 2026-01-07
**專案**: Vsale-lite

---

## 一、命名規範

### 檔案命名格式
```
YYYYMMDD_description.sql
```

**範例**:
- ✅ `20260101_initial_schema.sql`
- ✅ `20260107_create_orders.sql`
- ❌ `20260106154402_add_delete_order_function.sql` (不要包含時分秒)

### 描述性命名模式

| 操作類型 | 命名模式 | 範例 |
|---------|---------|------|
| 建立新功能 | `create_xxx` | `create_orders`, `create_coupons` |
| 新增欄位/功能 | `add_xxx` | `add_series_code`, `add_product_tags` |
| 修復問題 | `fix_xxx` | `fix_profiles_rls`, `fix_orders_rls_insert` |
| 移除功能 | `remove_xxx` | `remove_confirmed_status` |
| 擴展功能 | `extend_xxx` | `extend_order_timelines` |
| 更新設定 | `update_xxx` | `update_system_settings_description` |

---

## 二、Migration 結構規範

### 必須包含的區塊

```sql
-- ============================================================
-- Migration: [功能名稱]
-- Feature: [Feature 編號，如 004-cart-and-orders]
-- Date: YYYY-MM-DD
-- Description: [簡短描述，1-2 句話]
-- Dependencies: [依賴的 Migration，如 20260107]
-- ============================================================

-- 1. 清理舊資料（可選）
-- DROP IF EXISTS...

-- 2. Schema 變更
-- CREATE TABLE, ALTER TABLE, ADD COLUMN...

-- 3. 資料遷移（可選）
-- UPDATE, INSERT...

-- 4. 建立索引
-- CREATE INDEX...

-- 5. RLS Policy
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY...

-- 6. PostgreSQL Functions
-- CREATE OR REPLACE FUNCTION...

-- 7. 授權（必須與 Function 建立在同一檔案）
-- GRANT EXECUTE ON FUNCTION xxx TO authenticated;

-- 8. 註解與說明
-- COMMENT ON TABLE...
-- COMMENT ON COLUMN...
```

### 範例：完整的 Migration 檔案

```sql
-- ============================================================
-- Migration: 建立優惠券系統
-- Feature: 009-coupon-system
-- Date: 2026-01-06
-- Description: 建立優惠券主表、限制表、客戶領取記錄表與相關 RLS Policy
-- Dependencies: 20260103 (series), 20260101 (tiers)
-- ============================================================

-- 1. 建立主表
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- 3. 啟用 RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy（必須包含 SELECT, INSERT, UPDATE, DELETE 四種操作）
CREATE POLICY "所有人可查看有效優惠券"
  ON coupons FOR SELECT
  USING (deleted_at IS NULL AND expires_at > now());

CREATE POLICY "管理員可執行所有操作"
  ON coupons FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 5. PostgreSQL Function + 立即授權
CREATE OR REPLACE FUNCTION claim_coupon(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_coupon_id UUID;
BEGIN
  -- 函數邏輯...
  RETURN v_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 立即授權（不要分離到另一個 Migration）
GRANT EXECUTE ON FUNCTION claim_coupon TO authenticated;

-- 6. 註解
COMMENT ON TABLE coupons IS '優惠券主表';
COMMENT ON COLUMN coupons.code IS '優惠券代碼（唯一、大小寫不敏感）';
COMMENT ON COLUMN coupons.discount_type IS '折扣類型：fixed（固定金額）、percentage（百分比）';
```

---

## 三、RLS Policy 檢查清單

每個新表都必須包含完整的 RLS Policy：

| 操作類型 | Policy 名稱建議 | 適用對象 |
|---------|---------------|---------|
| SELECT | `所有人可查看有效資料` | 客戶端 |
| SELECT | `管理員可查看所有資料` | 管理端 |
| INSERT | `客戶可建立自己的資料` | 客戶端 |
| INSERT | `管理員可建立所有資料` | 管理端 |
| UPDATE | `客戶可更新自己的資料` | 客戶端 |
| UPDATE | `管理員可更新所有資料` | 管理端 |
| DELETE | `管理員可刪除資料` | 管理端 |

**常見錯誤**:
- ❌ 缺少 INSERT policy（導致無法建立記錄）
- ❌ 缺少管理員的全域 policy（導致管理端操作失敗）
- ❌ Policy 條件過於嚴格（導致正常操作被阻擋）

---

## 四、PostgreSQL Function 規範

### Function 建立與授權必須在同一檔案

**❌ 錯誤做法（分離建立與授權）**:
```sql
-- 20260107_create_orders.sql
CREATE OR REPLACE FUNCTION generate_order_number() ...

-- 20260117_grant_order_functions.sql (另一個檔案)
GRANT EXECUTE ON FUNCTION generate_order_number TO authenticated;
```

**✅ 正確做法（建立後立即授權）**:
```sql
-- 20260107_create_orders.sql
CREATE OR REPLACE FUNCTION generate_order_number() ...

-- 立即授權
GRANT EXECUTE ON FUNCTION generate_order_number TO authenticated;
```

### Function 命名規範

| Function 用途 | 命名模式 | 範例 |
|--------------|---------|------|
| 資料查詢 | `get_xxx` | `get_user_coupons()` |
| 資料建立 | `create_xxx` | `create_order()` |
| 資料更新 | `update_xxx` | `update_order_status()` |
| 資料刪除 | `delete_xxx` | `delete_order_pending()` |
| 計算邏輯 | `calculate_xxx` | `calculate_shipping_fee()` |
| 驗證邏輯 | `validate_xxx` | `validate_coupon()` |
| 產生資料 | `generate_xxx` | `generate_order_number()` |

---

## 五、冪等性設計

所有 Migration 必須支援重複執行而不產生錯誤。

### 表與欄位建立
```sql
-- ✅ 使用 IF NOT EXISTS
CREATE TABLE IF NOT EXISTS xxx (...);
ALTER TABLE xxx ADD COLUMN IF NOT EXISTS yyy TEXT;

-- ❌ 不使用 IF NOT EXISTS（重複執行會報錯）
CREATE TABLE xxx (...);
ALTER TABLE xxx ADD COLUMN yyy TEXT;
```

### 索引建立
```sql
-- ✅ 使用 IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_xxx ON xxx(yyy);

-- ❌ 不使用 IF NOT EXISTS
CREATE INDEX idx_xxx ON xxx(yyy);
```

### Function 建立
```sql
-- ✅ 使用 CREATE OR REPLACE
CREATE OR REPLACE FUNCTION xxx() ...

-- ❌ 使用 CREATE（重複執行會報錯）
CREATE FUNCTION xxx() ...
```

### Policy 建立
```sql
-- ✅ 先刪除再建立
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...

-- ⚠️ 直接 CREATE（若 Policy 已存在會報錯）
CREATE POLICY "policy_name" ON table_name ...
```

---

## 六、JSONB 欄位規範

### 自動建立 GIN 索引

所有 JSONB 欄位都應該建立 GIN 索引以提升查詢效能：

```sql
-- 新增 JSONB 欄位
ALTER TABLE xxx ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- 立即建立 GIN 索引
CREATE INDEX IF NOT EXISTS idx_xxx_metadata ON xxx USING GIN(metadata);
```

### JSONB 欄位命名建議

| 用途 | 欄位名稱 | 範例內容 |
|-----|---------|---------|
| 一般元數據 | `metadata` | `{"tags": ["featured"], "version": 1}` |
| 歷史變更記錄 | `modifications` | `{"old": {...}, "new": {...}}` |
| 限制條件 | `restrictions` | `{"min_amount": 1000, "tier_ids": [1, 2]}` |
| 快照資料 | `snapshot` | `{"price": 300, "name": "商品 A"}` |

---

## 七、資料遷移注意事項

### 大量資料遷移

若需要更新大量資料（>10,000 筆），使用批次處理：

```sql
-- ✅ 批次處理（避免長時間鎖表）
DO $$
DECLARE
  v_batch_size INT := 1000;
  v_offset INT := 0;
  v_updated INT;
BEGIN
  LOOP
    UPDATE products
    SET updated_at = now()
    WHERE id IN (
      SELECT id FROM products
      ORDER BY id
      LIMIT v_batch_size OFFSET v_offset
    );

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    EXIT WHEN v_updated = 0;

    v_offset := v_offset + v_batch_size;
    COMMIT;
  END LOOP;
END $$;

-- ❌ 直接更新全部（可能造成長時間鎖表）
UPDATE products SET updated_at = now();
```

---

## 八、常見錯誤與解決方案

### 錯誤 1: 缺少 INSERT Policy

**症狀**: Server Action 回傳 `new row violates row-level security policy`

**解決方案**:
```sql
CREATE POLICY "客戶可建立訂單"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

---

### 錯誤 2: Function 無權限執行

**症狀**: `permission denied for function xxx`

**解決方案**:
```sql
GRANT EXECUTE ON FUNCTION xxx TO authenticated;
```

---

### 錯誤 3: 欄位重複新增

**症狀**: `column "xxx" already exists`

**解決方案**:
```sql
-- 使用 IF NOT EXISTS
ALTER TABLE xxx ADD COLUMN IF NOT EXISTS yyy TEXT;
```

---

### 錯誤 4: UNIQUE 約束違反

**症狀**: `duplicate key value violates unique constraint`

**解決方案**:
```sql
-- 新增 UNIQUE 約束前，先確保資料唯一性
-- 1. 找出重複資料
SELECT name, COUNT(*) FROM products GROUP BY name HAVING COUNT(*) > 1;

-- 2. 清理重複資料（手動處理或使用腳本）

-- 3. 新增 UNIQUE 約束
ALTER TABLE products ADD CONSTRAINT unique_product_name UNIQUE (name);
```

---

## 九、Migration 審查檢查清單

在提交 Migration 前，請確認以下項目：

### 基本檢查
- [ ] 檔案命名符合 `YYYYMMDD_description.sql` 格式
- [ ] 包含 Migration 標頭註解（功能、Feature、日期、描述、依賴）
- [ ] 所有操作支援冪等性（IF NOT EXISTS, CREATE OR REPLACE, DROP IF EXISTS）
- [ ] 本機測試通過（`supabase db reset`）

### Schema 檢查
- [ ] 所有表都啟用 RLS（`ENABLE ROW LEVEL SECURITY`）
- [ ] 所有表都包含完整的 RLS Policy（SELECT, INSERT, UPDATE, DELETE）
- [ ] 所有 JSONB 欄位都建立 GIN 索引
- [ ] 所有外鍵關聯明確定義 ON DELETE 行為

### Function 檢查
- [ ] Function 建立後立即授權（不分離到另一個檔案）
- [ ] Function 使用 `SECURITY DEFINER` 時已考慮安全性
- [ ] Function 包含錯誤處理（EXCEPTION WHEN）

### 註解檢查
- [ ] 所有表都有 COMMENT ON TABLE
- [ ] 所有欄位都有 COMMENT ON COLUMN（說明用途與格式）
- [ ] 複雜邏輯包含內嵌註解

### 安全性檢查
- [ ] 不包含敏感資料（密碼、金鑰、測試資料）
- [ ] RLS Policy 不會洩漏未授權資料
- [ ] Function 參數已驗證（防止 SQL Injection）

### 效能檢查
- [ ] 查詢欄位都建立索引
- [ ] 大量資料遷移使用批次處理
- [ ] 避免 N+1 查詢（使用 JOIN 或批次查詢）

---

## 十、部署流程

### 本機開發
```bash
# 1. 建立新 Migration
supabase migration new add_feature_name

# 2. 編輯 SQL 檔案

# 3. 測試 Migration
supabase db reset

# 4. 驗證功能
pnpm dev
```

### 雲端部署（生產環境）

**⚠️ 危險區域 - 必須嚴格遵守**

```bash
# 1. 備份資料庫（必須！）
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 審查 Migration（使用檢查清單）
cat supabase/migrations/_CHECKLIST.md

# 3. 推送到雲端
supabase db push

# 4. 驗證部署
supabase db pull  # 確認 Schema 一致

# 5. 測試功能與部署
# 本機驗證
pnpm build && pnpm type-check && pnpm lint

# 部署到 Vercel (自動)
git push origin master  # GitHub Actions 自動執行部署

# 或手動部署
vercel --prod
```

**🚨 絕對禁止**:
- ❌ 在雲端/生產環境執行 `supabase db reset`（會清空所有資料）
- ❌ 跳過備份步驟直接部署
- ❌ 未經測試的 Migration 直接推送到生產環境

---

## 十一、參考資料

- [安全 Migration 指南](../docs/SAFE_MIGRATION_GUIDE.md)
- [備份與還原快速參考](../docs/BACKUP_RESTORE_CHEATSHEET.md)
- [資料庫安全協議](../docs/DATABASE_SAFETY_PROTOCOL.md)
- [Migration 範本](supabase/migrations/_TEMPLATE_safe_migration.sql)
- [Supabase RLS 文件](https://supabase.com/docs/guides/auth/row-level-security)

---

**版本歷史**:
- 1.0.0 (2026-01-07): 初始版本
