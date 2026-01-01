# Data Model: 客戶與會員等級管理

**Feature**: 001-user-tier-management
**Date**: 2026-01-01
**Status**: Phase 1 Design Complete

## 概述

本文件定義客戶與會員等級管理功能所需的資料庫結構,包含實體關係、欄位定義、約束條件及索引策略。設計遵循憲章「等級綁定價格」原則,為後續價格體系奠定正規化基礎。

---

## 實體關係圖 (ERD)

```
┌─────────────────┐
│   auth.users    │ (Supabase 內建認證表)
│  ──────────────│
│ • id (PK)       │
│ • email         │
│ • phone         │
│ • encrypted_pw  │
└────────┬────────┘
         │
         │ 1:1
         │
         ↓
┌─────────────────┐         ┌─────────────────┐
│    profiles     │ N:1     │      tiers      │
│  ───────────────│────────▶│  ───────────────│
│ • id (PK, FK)   │         │ • id (PK)       │
│ • phone         │         │ • name          │
│ • email         │         │ • rank          │
│ • role          │         │ • created_at    │
│ • tier_id (FK)  │         │ • updated_at    │
│ • created_at    │         └─────────────────┘
└─────────────────┘
```

**關鍵關係**:
- `auth.users` ← `profiles`: 1:1 (Supabase Auth 使用者對應到業務 Profile)
- `tiers` ← `profiles`: 1:N (一個等級可被多個客戶使用)

---

## 實體定義

### 1. tiers (會員等級)

**用途**: 定義客戶分類層級,作為價格策略的基礎維度

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | 等級唯一識別碼 |
| `name` | TEXT | NOT NULL, UNIQUE | 等級名稱 (如: 零售、批發、經銷商) |
| `rank` | INTEGER | NOT NULL | 排序權重 (數字越小越優先顯示) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 最後更新時間 (觸發器自動更新) |

**索引**:
```sql
CREATE INDEX idx_tiers_rank ON tiers(rank);  -- 排序查詢優化
```

**業務規則**:
- `name` 必須唯一,避免重複等級名稱造成混淆
- `rank` 用於後台列表排序,不影響業務邏輯 (如價格計算)
- 刪除保護: 若該等級有關聯的 profiles,禁止刪除 (透過外鍵約束)

**範例資料**:
```sql
INSERT INTO tiers (name, rank) VALUES
  ('零售', 1),
  ('批發', 2),
  ('經銷商', 3);
```

---

### 2. profiles (使用者業務資料)

**用途**: 擴充 Supabase Auth 的使用者資料,儲存業務相關欄位

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | 使用者 ID (關聯 Supabase Auth) |
| `phone` | TEXT | UNIQUE, NULLABLE | 手機號碼 (客戶登入用,格式: 09xxxxxxxx) |
| `email` | TEXT | UNIQUE, NULLABLE | Email (管理員登入用,與 auth.users.email 同步) |
| `role` | TEXT | NOT NULL, CHECK (role IN ('client', 'admin')) | 角色標記 |
| `tier_id` | UUID | NULLABLE, REFERENCES tiers(id) ON DELETE RESTRICT | 會員等級 (僅客戶需要) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 帳號建立時間 |
| `display_name` | TEXT | NULLABLE | 顯示名稱 (選填,未來擴充用) |
| `notes` | TEXT | NULLABLE | 管理員備註 (如: "VIP 客戶") |

**索引**:
```sql
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_tier_id ON profiles(tier_id);  -- 依等級查詢客戶
CREATE INDEX idx_profiles_role ON profiles(role);        -- 依角色查詢
```

**約束條件**:
```sql
-- 客戶必須有 phone 和 tier_id
ALTER TABLE profiles ADD CONSTRAINT client_must_have_phone
  CHECK (role != 'client' OR (phone IS NOT NULL AND tier_id IS NOT NULL));

-- 管理員必須有 email
ALTER TABLE profiles ADD CONSTRAINT admin_must_have_email
  CHECK (role != 'admin' OR email IS NOT NULL);

-- Phone 或 Email 至少有一個
ALTER TABLE profiles ADD CONSTRAINT must_have_identifier
  CHECK (phone IS NOT NULL OR email IS NOT NULL);
```

**外鍵行為**:
- `tier_id` → `tiers(id)`: `ON DELETE RESTRICT` (禁止刪除有客戶使用的等級)
- `id` → `auth.users(id)`: `ON DELETE CASCADE` (刪除 Auth 使用者時同步刪除 Profile)

**業務規則**:
- **客戶 (role='client')**:
  - 必須有 `phone` (作為登入帳號)
  - 必須有 `tier_id` (決定價格)
  - `email` 可為 NULL (非必要)

- **管理員 (role='admin')**:
  - 必須有 `email` (作為登入帳號)
  - `phone` 和 `tier_id` 必須為 NULL (不適用)

**範例資料**:
```sql
-- 客戶範例
INSERT INTO profiles (id, phone, role, tier_id) VALUES
  ('uuid-1', '0912345678', 'client', 'tier-uuid-wholesale');

-- 管理員範例
INSERT INTO profiles (id, email, role) VALUES
  ('uuid-2', 'admin@vsale.com', 'admin');
```

---

## 資料驗證規則

### 手機號碼格式
- **格式**: 台灣手機號碼 (09 開頭,10 碼純數字)
- **儲存**: 移除空格、連字號後儲存 (例: `0912-345-678` → `0912345678`)
- **驗證**: 應用層使用 Zod Schema 驗證 (參考 research.md)

### Email 格式
- **格式**: 標準 Email 格式 (符合 RFC 5322)
- **驗證**: Supabase Auth 自動驗證

### Role 驗證
- **允許值**: `'client'` 或 `'admin'`
- **預設值**: 客戶建立時預設為 `'client'`

---

## 狀態轉換

### Tier 生命週期
```
[建立] → [啟用中] → [刪除檢查]
                         ├─ 有客戶使用 → [禁止刪除]
                         └─ 無客戶使用 → [已刪除]
```

### Profile 生命週期
```
[管理員建立] → [啟用中] → [客戶登入] → [正常使用]
                    ↓
              [管理員修改等級] → [等級已更新]
                    ↓
              [管理員刪除] → [已刪除] (同步刪除 auth.users)
```

---

## 查詢模式

### 常見查詢場景

#### 1. 客戶登入驗證
```sql
-- 前台登入: 使用手機號碼查詢
SELECT p.id, p.role, p.tier_id
FROM profiles p
WHERE p.phone = '0912345678'
  AND p.role = 'client';
```

#### 2. 後台客戶列表
```sql
-- 分頁查詢,依建立時間倒序
SELECT
  p.id,
  p.phone,
  t.name AS tier_name,
  p.created_at
FROM profiles p
LEFT JOIN tiers t ON p.tier_id = t.id
WHERE p.role = 'client'
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0;
```

#### 3. 依等級篩選客戶
```sql
SELECT p.phone, p.created_at
FROM profiles p
WHERE p.tier_id = 'target-tier-uuid'
  AND p.role = 'client';
```

#### 4. 檢查等級是否可刪除
```sql
-- 若回傳 count > 0,則禁止刪除
SELECT COUNT(*)
FROM profiles
WHERE tier_id = 'target-tier-uuid';
```

#### 5. 手機號碼搜尋 (即時搜尋)
```sql
SELECT p.phone, p.id, t.name
FROM profiles p
LEFT JOIN tiers t ON p.tier_id = t.id
WHERE p.phone LIKE '0912%'
  AND p.role = 'client'
LIMIT 10;
```

---

## 效能考量

### 索引策略
- **主要查詢路徑**: `phone` 和 `email` (登入),`tier_id` (客戶分類)
- **避免全表掃描**: 使用 Partial Index (`WHERE phone IS NOT NULL`) 減少索引大小

### 預期負載
- **資料規模**: 初期 1000 位客戶,3-5 個等級
- **查詢頻率**:
  - 登入驗證: 高頻 (每次使用者登入)
  - 客戶列表: 中頻 (管理員操作)
  - 等級查詢: 低頻 (管理員設定)

### 優化建議
- 登入查詢使用索引 (`idx_profiles_phone`, `idx_profiles_email`)
- 客戶列表使用分頁 (LIMIT/OFFSET 或 Cursor-based)
- 考慮使用 Supabase RLS (Row Level Security) 進一步保護資料

---

## 資料完整性保證

### 參照完整性
- ✅ `profiles.tier_id` → `tiers.id`: `ON DELETE RESTRICT` (保護有使用的等級)
- ✅ `profiles.id` → `auth.users.id`: `ON DELETE CASCADE` (同步刪除)

### 業務邏輯完整性
- ✅ CHECK 約束: 確保客戶有 phone + tier_id,管理員有 email
- ✅ UNIQUE 約束: 防止重複的手機號碼或 Email
- ✅ NOT NULL 約束: 必填欄位 (role, name)

### 觸發器 (選用)
```sql
-- 自動更新 tiers.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tiers_updated_at
BEFORE UPDATE ON tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration 策略

### 初始 Migration
檔案位置: `supabase/migrations/20260101_initial_schema.sql`

**執行順序**:
1. 建立 `tiers` 表
2. 建立 `profiles` 表
3. 建立索引
4. 建立約束
5. 插入預設資料 (零售、批發、經銷商等級)
6. 建立觸發器 (選用)

**Rollback 策略**:
```sql
-- Rollback Script
DROP TRIGGER IF EXISTS update_tiers_updated_at ON tiers;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tiers CASCADE;
```

---

## 未來擴充性

### 已預留欄位
- `profiles.display_name`: 客戶顯示名稱
- `profiles.notes`: 管理員備註

### 可能的擴充方向
1. **客戶分組**: 新增 `groups` 表,支援批次操作
2. **等級權益**: 新增 `tier_benefits` 表,定義各等級的特殊權益
3. **登入日誌**: 新增 `login_logs` 表,記錄登入時間與 IP
4. **地址管理**: 新增 `addresses` 表,支援多地址配送

**擴充原則**: 所有新增表格必須符合憲章「正規化設計」原則,避免在既有表格新增過多欄位。

---

## 總結

本資料模型設計完整支援:
- ✅ 雙入口登入 (手機號碼 vs Email)
- ✅ 會員等級 CRUD
- ✅ 客戶帳號快速開設
- ✅ 等級綁定價格基礎 (tier_id 關聯)
- ✅ 效能優化 (索引策略)
- ✅ 資料完整性 (約束與外鍵)

**下一步**: 定義 API Contracts (Server Actions 介面規格)
