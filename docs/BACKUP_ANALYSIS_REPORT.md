# 備份系統完整性分析報告

**分析日期**: 2026-01-22
**目標**: 評估現有備份系統能否完整還原站點到新 Supabase 資料庫

---

## 📊 執行摘要

**結論**: ❌ **現有備份檔案無法直接還原完整站點**

**關鍵問題**:
1. ⚠️ 現有備份檔案僅 41 bytes，內容不完整
2. ⚠️ 備份策略使用 `--data-only`，不包含資料庫結構（Schema）
3. ⚠️ Storage 圖片備份需手動觸發
4. ⚠️ 缺少完整的端到端還原測試

**建議方案**: 需要執行「完整備份」（Schema + Data + Storage）才能還原到新站點

---

## 🔍 詳細分析

### 1. 現有備份檔案狀態

#### 本地備份檔案
```
backup/
├── main-site-data.sql                      (41 bytes) ⚠️ 不完整
├── main-site-data-20260122-143416.sql      (41 bytes) ⚠️ 不完整
└── main-site-data-20260122-143423.sql      (41 bytes) ⚠️ 不完整
```

#### 檔案內容
所有備份檔案僅包含：
```sql
SET session_replication_role = replica;
```

**問題診斷**:
- ✅ 備份指令語法正確
- ❌ 資料庫可能為空，或備份時機不正確
- ❌ 使用 `--data-only` 模式，不包含 CREATE TABLE 語句

---

### 2. 備份系統架構分析

#### 備份策略（lib/backup/db-backup.ts）

**方案 1: Supabase CLI**
```bash
supabase db dump --linked --data-only --schema public --schema auth
```

**方案 2: pg_dump**
```bash
pg_dump -F p --data-only --schema=public --schema=auth --no-owner --no-acl
```

**分析**:
| 項目 | 包含 | 不包含 |
|------|------|--------|
| ✅ 資料 (INSERT) | ✅ | |
| ❌ Schema (CREATE TABLE) | | ❌ |
| ❌ 索引 (CREATE INDEX) | | ❌ |
| ❌ 觸發器 (TRIGGER) | | ❌ |
| ❌ RLS 策略 (POLICY) | | ❌ |
| ❌ 函數 (FUNCTION) | | ❌ |
| ⚠️ Storage 圖片 | 需手動觸發 | |

---

### 3. 完整還原需要的元件

要完整還原站點到新 Supabase 資料庫，需要：

#### ✅ 已具備（透過 Migration）
```
1. 資料庫結構（Schema）         → supabase/migrations/*.sql
2. 索引（Indexes）              → 20260107160000_indexes_and_performance.sql
3. RLS 策略（Policies）         → 20260107170000_rls_policies.sql
4. 觸發器（Triggers）           → 各 Migration 檔案
5. 函數（Functions）            → 各 Migration 檔案
```

#### ⚠️ 需要備份（資料）
```
1. 資料表資料（Data）           → db-backup.ts（--data-only 模式）
2. Supabase Storage 圖片        → storage-backup.ts
3. 認證使用者（auth.users）     → 需要額外處理
```

---

## 🎯 完整還原方案

### 方案 A：推薦 - 階段式遷移（最安全）

**適用場景**: 站點二為全新獨立站點，需要選擇性遷移資料

#### 階段 1: 建立資料庫結構（已完成 ✅）
```bash
# 在站點二執行
cd d:\APP\vsale
supabase link --project-ref rdyvmgomjdglflrcfijs
supabase db push
```

**結果**: 站點二已具備完整 Schema、索引、RLS 策略

#### 階段 2: 選擇性資料遷移

**需要遷移的資料表**（參考 SITE_CREDENTIALS.md）:
```
✅ categories              - 商品分類
✅ tiers                   - 會員等級
✅ series                  - 商品系列
✅ products                - 商品資料
✅ tier_prices             - 等級價格
✅ coupons                 - 優惠券（可選）
✅ coupon_tier_restrictions - 優惠券等級限制
✅ coupon_series_restrictions - 優惠券系列限制
```

**不遷移的資料表**（站點獨立）:
```
❌ profiles                - 使用者個人資料
❌ orders                  - 訂單
❌ order_items             - 訂單項目
❌ order_timelines         - 訂單歷史
❌ order_custom_fees       - 訂單自訂費用
❌ user_coupons            - 使用者優惠券
❌ order_coupons           - 訂單優惠券
❌ admin_users             - 管理員帳號
❌ audit_logs              - 稽核日誌
❌ backup_jobs             - 備份記錄
```

#### 階段 3: 執行選擇性資料匯出/匯入

**方法 1: 使用 pg_dump + psql（單表匯出）**
```bash
# 主站匯出（在 Windows PowerShell）
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
$TABLES = @("categories", "tiers", "series", "products", "tier_prices", "coupons", "coupon_tier_restrictions", "coupon_series_restrictions")

foreach ($table in $TABLES) {
  pg_dump -h db.qwovavytryvgchcowjof.supabase.co `
    -p 5432 `
    -U postgres.qwovavytryvgchcowjof `
    -d postgres `
    -t $table `
    --data-only `
    --column-inserts `
    -f "backup\site1-$table.sql"
}

# 站點二匯入
$env:PGPASSWORD = "Devape-BM69"
foreach ($table in $TABLES) {
  psql -h db.rdyvmgomjdglflrcfijs.supabase.co `
    -p 5432 `
    -U postgres.rdyvmgomjdglflrcfijs `
    -d postgres `
    -f "backup\site1-$table.sql"
}
```

**方法 2: 使用 Supabase Studio（手動）**
1. 主站：Database → Table Editor → 匯出為 CSV
2. 站點二：Database → Table Editor → 匯入 CSV

#### 階段 4: 遷移 Supabase Storage 圖片

**選項 A: 手動下載上傳**
```bash
# 1. 主站下載所有 Buckets
# Dashboard → Storage → products → Download all files

# 2. 站點二上傳
# Dashboard → Storage → products → Upload files
```

**選項 B: 使用備份系統**
```bash
# 1. 主站執行 Storage 備份
# 需要在管理後台觸發「包含 Storage」的手動備份

# 2. 下載備份 ZIP
# 從 GCS 或 Vercel Blob 下載

# 3. 站點二上傳圖片
# 使用 Supabase CLI 或 Dashboard 上傳
```

---

### 方案 B：完整備份還原（高風險 ⚠️）

**適用場景**: 站點二需要完全複製主站（包含所有資料）

**⚠️ 警告**: 此方法會完全覆蓋站點二的資料庫

#### 步驟 1: 主站執行完整備份
```bash
# 備份 Schema + Data（不使用 --data-only）
supabase db dump --linked --schema public --schema auth -f backup/full-backup.sql

# 或使用 pg_dump
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
pg_dump -h db.qwovavytryvgchcowjof.supabase.co `
  -p 5432 `
  -U postgres.qwovavytryvgchcowjof `
  -d postgres `
  --schema=public `
  --schema=auth `
  --no-owner `
  --no-acl `
  -f backup/full-backup.sql
```

#### 步驟 2: 站點二清空並還原
```bash
# ⚠️ 危險操作：會清空所有資料
$env:PGPASSWORD = "Devape-BM69"
psql -h db.rdyvmgomjdglflrcfijs.supabase.co `
  -p 5432 `
  -U postgres.rdyvmgomjdglflrcfijs `
  -d postgres `
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 還原資料
psql -h db.rdyvmgomjdglflrcfijs.supabase.co `
  -p 5432 `
  -U postgres.rdyvmgomjdglflrcfijs `
  -d postgres `
  -f backup/full-backup.sql
```

---

## ✅ 建議執行步驟（方案 A）

根據 [SITE_CREDENTIALS.md](SITE_CREDENTIALS.md) 的需求，建議使用**方案 A - 階段式遷移**：

### 第一步：準備環境
```bash
# 1. 確認 psql 工具已安裝
psql --version

# 2. 確認 Supabase CLI 已連結站點二
supabase link --project-ref rdyvmgomjdglflrcfijs

# 3. 確認站點二 Migration 已推送（已完成 ✅）
supabase db diff
```

### 第二步：匯出主站資料
```powershell
# 建立備份目錄
New-Item -Path "backup\site1-migration" -ItemType Directory -Force

# 設定主站連線
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
$DB_HOST = "db.qwovavytryvgchcowjof.supabase.co"
$DB_USER = "postgres.qwovavytryvgchcowjof"

# 需要遷移的資料表
$TABLES = @(
  "categories",
  "tiers",
  "series",
  "products",
  "tier_prices",
  "coupons",
  "coupon_tier_restrictions",
  "coupon_series_restrictions"
)

# 逐表匯出（使用 --column-inserts 確保相容性）
foreach ($table in $TABLES) {
  Write-Host "匯出 $table..."
  pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
    -t $table `
    --data-only `
    --column-inserts `
    --disable-triggers `
    -f "backup\site1-migration\$table.sql"
}
```

### 第三步：匯入站點二
```powershell
# 設定站點二連線
$env:PGPASSWORD = "Devape-BM69"
$DB_HOST = "db.rdyvmgomjdglflrcfijs.supabase.co"
$DB_USER = "postgres.rdyvmgomjdglflrcfijs"

# 逐表匯入（按照外鍵依賴順序）
$IMPORT_ORDER = @(
  "tiers",              # 1. 先匯入會員等級（無依賴）
  "categories",         # 2. 商品分類（無依賴）
  "series",             # 3. 商品系列（依賴 categories）
  "products",           # 4. 商品（依賴 series, categories）
  "tier_prices",        # 5. 等級價格（依賴 tiers, products）
  "coupons",            # 6. 優惠券（無依賴）
  "coupon_tier_restrictions",  # 7. 優惠券等級限制（依賴 coupons, tiers）
  "coupon_series_restrictions" # 8. 優惠券系列限制（依賴 coupons, series）
)

foreach ($table in $IMPORT_ORDER) {
  Write-Host "匯入 $table..."
  psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
    -f "backup\site1-migration\$table.sql"
}
```

### 第四步：驗證資料完整性
```powershell
# 檢查每個表的記錄數
$env:PGPASSWORD = "Devape-BM69"
foreach ($table in $TABLES) {
  $count = psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
    -t -c "SELECT COUNT(*) FROM $table;"
  Write-Host "$table`: $count 筆記錄"
}
```

### 第五步：遷移 Storage 圖片
1. 在主站管理後台執行「包含 Storage」的手動備份
2. 下載備份 ZIP 檔案
3. 在站點二 Supabase Dashboard 上傳圖片到對應 Buckets

---

## 🚨 重要注意事項

### 執行前必讀
1. ✅ **站點二已推送 Migration**（資料庫結構已完成）
2. ⚠️ **不要使用 `supabase db reset`**（會清空生產資料）
3. ⚠️ **auth.users 不遷移**（每個站點獨立認證）
4. ✅ **使用 Transaction**（確保原子性）
5. ✅ **匯入後驗證資料完整性**

### 回滾計畫
如果匯入失敗：
```bash
# 刪除已匯入的資料（逐表清空）
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -c "
  TRUNCATE TABLE coupon_series_restrictions CASCADE;
  TRUNCATE TABLE coupon_tier_restrictions CASCADE;
  TRUNCATE TABLE coupons CASCADE;
  TRUNCATE TABLE tier_prices CASCADE;
  TRUNCATE TABLE products CASCADE;
  TRUNCATE TABLE series CASCADE;
  TRUNCATE TABLE categories CASCADE;
  TRUNCATE TABLE tiers CASCADE;
"
```

---

## 📝 相關文件

- [SITE_CREDENTIALS.md](SITE_CREDENTIALS.md) - 站點連線資訊
- [BACKUP_RESTORE_CHEATSHEET.md](BACKUP_RESTORE_CHEATSHEET.md) - 備份還原快速參考
- [DATABASE_SAFETY_PROTOCOL.md](DATABASE_SAFETY_PROTOCOL.md) - 資料庫安全協議
- [SAFE_MIGRATION_GUIDE.md](SAFE_MIGRATION_GUIDE.md) - 安全 Migration 指南

---

**報告產生時間**: 2026-01-22
**分析人員**: Claude Sonnet 4.5
**文件版本**: 1.0.0
