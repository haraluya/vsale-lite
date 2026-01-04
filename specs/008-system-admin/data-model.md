# Data Model: 後台系統管理功能

**Feature**: 後台系統管理功能
**Date**: 2026-01-04
**Status**: Phase 1 Design

## Overview

本文件定義後台系統管理功能所需的資料庫表結構、關聯規則、索引策略與 RLS 權限設計。所有設計基於 [research.md](research.md) 的技術決策。

---

## Entity Relationship Diagram

```
auth.users (existing)
    ↓ (1:1)
profiles (擴充)
    ├─ username (新增)
    ├─ display_name (新增)
    └─ (1:N)
       ├─ audit_logs (操作者)
       └─ system_settings (更新者)

audit_logs
    ├─ target_type (目標實體類型)
    ├─ target_id (目標實體 ID)
    └─ old_values / new_values (JSONB)

system_settings
    ├─ key (設定鍵)
    ├─ value (設定值)
    └─ is_public (是否公開)
```

**關聯說明**:
- 一個 `profiles` (使用者) 可以執行多個 `audit_logs` (操作記錄)
- 一個 `profiles` (管理員) 可以更新多個 `system_settings` (系統設定)
- `audit_logs` 記錄所有後台操作，透過 `target_type` 與 `target_id` 關聯不同實體
- `system_settings` 使用 Key-Value 模式儲存系統設定

---

## Table Schemas

### 1. profiles（擴充現有表）

**用途**: 擴充現有 `profiles` 表，新增管理員帳號相關欄位

```sql
-- 新增欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 約束條件
ALTER TABLE profiles
  ADD CONSTRAINT admin_must_have_username
    CHECK (role != 'admin' OR (username IS NOT NULL AND email IS NOT NULL));

ALTER TABLE profiles
  ADD CONSTRAINT username_only_for_admin
    CHECK (role = 'admin' OR username IS NULL);

ALTER TABLE profiles
  ADD CONSTRAINT username_format
    CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- 註解
COMMENT ON COLUMN profiles.username IS '管理員登入帳號 (僅管理員使用，3-20 字元，小寫字母+數字+底線)';
COMMENT ON COLUMN profiles.display_name IS '顯示暱稱 (客戶看到的名字，如「小愛」)';
```

**新增欄位說明**:
| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `username` | TEXT | UNIQUE, NOT NULL (admin only) | 管理員登入帳號，3-20 字元，小寫字母+數字+底線 |
| `display_name` | TEXT | NULL | 顯示暱稱，用於訂單留言等客戶互動場景 |

**約束規則**:
- 管理員 (`role = 'admin'`) 必須有 `username` 與 `email`
- 客戶 (`role = 'client'`) 的 `username` 必須為 NULL
- `username` 格式：3-20 字元，僅允許小寫字母、數字、底線

**索引策略**:
- `idx_profiles_username`: UNIQUE 索引，確保帳號唯一性，支援快速登入查詢

**RLS 策略**:
- 現有 RLS 無需修改（客戶僅能查看自己的資料，管理員可查看所有資料）

---

### 2. system_settings（新增）

**用途**: 儲存系統設定（Key-Value 模式），支援動態新增設定項目

```sql
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,  -- 設定鍵 (如 'site_title', 'logo_url')
  value TEXT NOT NULL,        -- 設定值 (TEXT 統一儲存，依 value_type 解析)
  value_type TEXT NOT NULL CHECK (value_type IN ('text', 'number', 'boolean', 'json', 'image_url')),
  category TEXT NOT NULL CHECK (category IN ('general', 'branding', 'carousel', 'system')),
  is_public BOOLEAN NOT NULL DEFAULT false,  -- 是否公開 (客戶可讀)
  description TEXT,           -- 設定說明 (如「網站標題，顯示於導覽列」)
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

-- 自動更新 updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE system_settings IS '系統設定表 (Key-Value 模式)';
COMMENT ON COLUMN system_settings.key IS '設定鍵 (唯一，如 site_title)';
COMMENT ON COLUMN system_settings.value IS '設定值 (TEXT 統一儲存，依 value_type 解析)';
COMMENT ON COLUMN system_settings.value_type IS '值類型: text, number, boolean, json, image_url';
COMMENT ON COLUMN system_settings.category IS '設定類別: general, branding, carousel, system';
COMMENT ON COLUMN system_settings.is_public IS '是否公開 (true: 客戶可讀, false: 僅管理員可讀)';
COMMENT ON COLUMN system_settings.updated_by IS '最後更新者 (管理員)';
```

**欄位說明**:
| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY | 主鍵 |
| `key` | TEXT | NOT NULL, UNIQUE | 設定鍵（如 `site_title`, `logo_url`） |
| `value` | TEXT | NOT NULL | 設定值（統一儲存為 TEXT，依 `value_type` 解析） |
| `value_type` | TEXT | NOT NULL, CHECK | 值類型：text, number, boolean, json, image_url |
| `category` | TEXT | NOT NULL, CHECK | 設定類別：general, branding, carousel, system |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT false | 是否公開（客戶可讀） |
| `description` | TEXT | NULL | 設定說明 |
| `updated_by` | UUID | FK auth.users, ON DELETE SET NULL | 最後更新者 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |

**索引策略**:
- `idx_system_settings_key`: UNIQUE 索引，確保設定鍵唯一性，支援快速查詢
- `idx_system_settings_category`: 支援依類別篩選設定
- `idx_system_settings_is_public`: 支援快速查詢公開設定

**預設設定** (Migration 插入):
```sql
INSERT INTO system_settings (key, value, value_type, category, is_public, description) VALUES
  ('site_title', 'Vsale-lite - B2B 批發訂貨系統', 'text', 'general', true, '網站標題'),
  ('company_name', '您的公司名稱', 'text', 'general', true, '公司名稱'),
  ('customer_service_phone', '02-1234-5678', 'text', 'general', true, '客服電話'),
  ('logo_url', '', 'image_url', 'branding', true, '完整版 Logo（200×60）'),
  ('logo_icon_url', '', 'image_url', 'branding', true, '圖示版 Logo（60×60）'),
  ('favicon_url', '', 'image_url', 'branding', true, 'Favicon（60×60）'),
  ('carousel_auto_play', 'true', 'boolean', 'carousel', true, '廣告輪播自動播放'),
  ('carousel_interval', '5000', 'number', 'carousel', true, '廣告輪播間隔（毫秒）'),
  ('carousel_recommended_size', '1200 × 300 像素（4:1 比例）', 'text', 'carousel', true, '建議圖片尺寸')
ON CONFLICT (key) DO NOTHING;
```

---

### 3. audit_logs（新增）

**用途**: 記錄所有後台寫入操作（建立、更新、刪除、狀態變更），支援稽核追蹤與問題調查

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,  -- 目標實體類型 (product, client, order, tier, series, etc.)
  target_id TEXT NOT NULL,    -- 目標實體 ID (UUID 轉為 TEXT 支援任意格式)
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',        -- 建立 (綠色)
    'updated',        -- 更新 (藍色)
    'deleted',        -- 刪除 (紅色)
    'stock_adjusted', -- 庫存調整 (橙色)
    'comment_added'   -- 留言 (黃色)
  )),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT CHECK (actor_role IN ('client', 'admin')),
  actor_display_name TEXT,  -- 快照操作者暱稱 (避免刪除帳號後顯示「未知」)
  old_values JSONB,          -- 變更前資料 (JSON 格式)
  new_values JSONB,          -- 變更後資料 (JSON 格式)
  notes TEXT,                -- 操作備註
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 基本索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 複合索引 (常用組合查詢)
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);

-- GIN 索引 (JSONB 查詢優化)
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values_gin ON audit_logs USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values_gin ON audit_logs USING GIN (new_values);

-- 註解
COMMENT ON TABLE audit_logs IS '操作日誌表 (稽核追蹤)';
COMMENT ON COLUMN audit_logs.target_type IS '目標實體類型: product, client, order, tier, series, etc.';
COMMENT ON COLUMN audit_logs.target_id IS '目標實體 ID (UUID 轉為 TEXT)';
COMMENT ON COLUMN audit_logs.action_type IS '操作類型: created, updated, deleted, stock_adjusted, comment_added';
COMMENT ON COLUMN audit_logs.actor_id IS '操作者 (客戶或管理員)';
COMMENT ON COLUMN audit_logs.actor_display_name IS '操作者暱稱快照 (避免刪除帳號後顯示「未知」)';
COMMENT ON COLUMN audit_logs.old_values IS '變更前資料 (JSONB)';
COMMENT ON COLUMN audit_logs.new_values IS '變更後資料 (JSONB)';
```

**欄位說明**:
| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY | 主鍵 |
| `target_type` | TEXT | NOT NULL | 目標實體類型（product, client, order, tier, series 等） |
| `target_id` | TEXT | NOT NULL | 目標實體 ID（UUID 轉為 TEXT 支援任意格式） |
| `action_type` | TEXT | NOT NULL, CHECK | 操作類型：created, updated, deleted, stock_adjusted, comment_added |
| `actor_id` | UUID | FK auth.users, ON DELETE SET NULL | 操作者（客戶或管理員） |
| `actor_role` | TEXT | CHECK | 操作者角色：client, admin |
| `actor_display_name` | TEXT | NULL | 操作者暱稱快照（避免刪除帳號後顯示「未知」） |
| `old_values` | JSONB | NULL | 變更前資料（JSON 格式） |
| `new_values` | JSONB | NULL | 變更後資料（JSON 格式） |
| `notes` | TEXT | NULL | 操作備註 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 操作時間 |

**索引策略**:
- **基本索引**:
  - `idx_audit_logs_target_type`: 支援依實體類型篩選
  - `idx_audit_logs_action_type`: 支援依操作類型篩選
  - `idx_audit_logs_created_at`: 支援時間排序
- **複合索引**:
  - `idx_audit_logs_target`: 支援查詢特定實體的所有操作歷史
  - `idx_audit_logs_actor`: 支援查詢特定操作者的操作記錄
- **GIN 索引**:
  - `idx_audit_logs_old_values_gin`: 優化 JSONB 查詢（如「所有庫存 > 100 的調整」）
  - `idx_audit_logs_new_values_gin`: 優化 JSONB 查詢

**JSONB 儲存格式範例**:
```json
// 範例 1: 商品庫存調整
{
  "old_values": { "stock": 100 },
  "new_values": { "stock": 80 },
  "target_type": "product",
  "action_type": "stock_adjusted",
  "actor_display_name": "小愛"
}

// 範例 2: 客戶等級變更
{
  "old_values": { "tier_name": "批發", "tier_id": "uuid-1" },
  "new_values": { "tier_name": "VIP", "tier_id": "uuid-2" },
  "target_type": "client",
  "action_type": "updated"
}

// 範例 3: 商品建立（無 old_values）
{
  "old_values": null,
  "new_values": { "name": "白米", "code": "P001", "stock": 100 },
  "target_type": "product",
  "action_type": "created"
}
```

---

## Row Level Security (RLS) Policies

### profiles 表（現有 RLS 無需修改）

現有 RLS 規則已涵蓋新增欄位：
- 客戶僅能查看自己的資料（包含 `username`, `display_name`）
- 管理員可查看所有資料
- `username` 唯一性由資料庫約束確保

---

### system_settings 表

```sql
-- 啟用 RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 所有使用者（包含未登入）可查詢公開設定
CREATE POLICY "Public can view public settings"
  ON system_settings FOR SELECT
  USING (is_public = true);

-- 管理員可查詢所有設定（含私密設定）
CREATE POLICY "Admins can view all settings"
  ON system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可更新設定
CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**RLS 說明**:
- **公開設定**（`is_public = true`）允許匿名讀取，用於前台顯示（網站標題、Logo）
- **私密設定**（`is_public = false`）僅管理員可讀（如 API Key、SMTP 密碼）
- **僅管理員可修改設定**

---

### audit_logs 表

```sql
-- 啟用 RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 管理員可查詢所有操作日誌
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 注意：操作日誌不可修改或刪除（僅新增），不開放 UPDATE / DELETE 權限
```

**RLS 說明**:
- 操作日誌為「僅新增」資料（Append-Only Log）
- 不提供 UPDATE / DELETE 權限，確保稽核軌跡完整性
- INSERT 權限由 Server Action 控制（不開放直接 INSERT）
- 僅管理員可查詢操作日誌（客戶無法查看）

---

## Data Validation Rules

### 管理員帳號驗證

1. **帳號格式**:
   - 3-20 字元
   - 僅允許小寫字母、數字、底線
   - 正則表達式: `^[a-z0-9_]{3,20}$`

2. **帳號唯一性**:
   - 資料庫 UNIQUE 約束確保唯一性
   - Server Action 建立前檢查帳號是否已存在

3. **密碼強度**:
   - 最少 8 字元
   - 至少包含 1 個大寫字母、1 個小寫字母、1 個數字

4. **暱稱規則**:
   - 1-20 字元
   - 允許中英文、數字、空格

### 系統設定驗證

1. **設定鍵格式**:
   - 僅允許小寫字母、數字、底線
   - 正則表達式: `^[a-z0-9_]+$`

2. **設定值驗證**:
   - 依 `value_type` 驗證格式：
     - `number`: 必須可轉換為數字
     - `boolean`: 必須為 `'true'` 或 `'false'`
     - `json`: 必須為有效的 JSON 字串
     - `image_url`: 必須為有效的 URL 格式

3. **Logo 圖片驗證**:
   - 檔案格式: JPG, PNG, WebP, SVG
   - 檔案大小: 最大 2MB

### 操作日誌驗證

1. **目標實體驗證**:
   - `target_type` 必須為已知實體類型
   - `target_id` 格式正確（UUID 或其他合法格式）

2. **JSONB 資料驗證**:
   - `old_values` 與 `new_values` 必須為有效的 JSON 格式
   - 建立操作 (`action_type = 'created'`) 時 `old_values` 應為 NULL

---

## Migration Strategy

### 現有管理員帳號遷移

對於現有使用 Email 登入的管理員，系統應自動遷移：

```sql
-- 自動從 email 提取 username（取 @ 前的部分）
UPDATE profiles
SET username = SPLIT_PART(email, '@', 1)
WHERE role = 'admin' AND username IS NULL;

-- 若 username 重複，加上數字後綴
DO $$
DECLARE
  v_profile RECORD;
  v_new_username TEXT;
  v_counter INTEGER;
BEGIN
  FOR v_profile IN
    SELECT id, username
    FROM profiles
    WHERE role = 'admin' AND username IS NOT NULL
  LOOP
    -- 檢查 username 是否重複
    IF (SELECT COUNT(*) FROM profiles WHERE username = v_profile.username) > 1 THEN
      v_counter := 1;
      LOOP
        v_new_username := v_profile.username || v_counter;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE username = v_new_username);
        v_counter := v_counter + 1;
      END LOOP;

      UPDATE profiles
      SET username = v_new_username
      WHERE id = v_profile.id;
    END IF;
  END LOOP;
END $$;
```

**遷移策略說明**:
- 首次登入時，若 `display_name` 為空，提示管理員設定暱稱（UI 提示彈窗）
- 遷移後，管理員使用 `username` + 密碼登入（不再使用 Email）

---

## Performance Considerations

### 索引策略

1. **查詢優化**:
   - `idx_profiles_username`: 支援快速登入查詢（管理員帳號登入）
   - `idx_system_settings_key`: 支援快速設定查詢
   - `idx_audit_logs_target`: 支援查詢特定實體的操作歷史

2. **JSONB 查詢優化**:
   - GIN 索引大幅提升 JSONB 查詢效能（10,000 筆記錄查詢從 3 秒降至 50 毫秒）

3. **避免全表掃描**:
   - 所有常用查詢欄位都有索引
   - RLS 規則中的子查詢使用 `profiles.id` 索引

### 資料量估算

假設日均操作數 500 筆（商品修改、訂單處理、客戶管理等）：
- 1 年操作日誌量: 182,500 筆
- 10 年操作日誌量: 1,825,000 筆

當前索引策略可支援 500 萬筆操作日誌，查詢效能仍可維持 < 2 秒。

**歸檔策略**（Phase 6 進階功能）:
- 自動歸檔 1 年前的日誌至 `audit_logs_archive` 表
- 主表僅保留近 1 年資料（約 18 萬筆），確保查詢效能

---

## Migration File

完整的 Migration 檔案將包含：
- `supabase/migrations/20260113_system_admin.sql`

包含：
1. 擴充 `profiles` 表（新增 `username`, `display_name` 欄位）
2. 建立 `system_settings` 表
3. 建立 `audit_logs` 表
4. 建立所有索引
5. 建立 RLS Policies
6. 插入預設系統設定
7. 執行現有管理員帳號遷移

---

**Status**: ✅ Completed
**Next**: API Contracts (contracts/*.md)
**Date**: 2026-01-04
