# 站點二完整遷移指南

**目標**: 將主站的商品、分類、會員等級資料完整遷移到站點二

**最後更新**: 2026-01-22

---

## 📋 目錄

1. [遷移概述](#遷移概述)
2. [前置準備](#前置準備)
3. [遷移步驟](#遷移步驟)
4. [驗證與測試](#驗證與測試)
5. [常見問題](#常見問題)
6. [緊急回滾](#緊急回滾)

---

## 遷移概述

### 🎯 遷移範圍

#### ✅ 會遷移的資料
```
✅ categories              - 商品分類
✅ tiers                   - 會員等級
✅ series                  - 商品系列
✅ products                - 商品資料
✅ tier_prices             - 等級價格
✅ coupons                 - 優惠券
✅ coupon_tier_restrictions - 優惠券等級限制
✅ coupon_series_restrictions - 優惠券系列限制
```

#### ❌ 不遷移的資料（站點獨立）
```
❌ profiles                - 使用者個人資料
❌ orders                  - 訂單
❌ order_items             - 訂單項目
❌ order_timelines         - 訂單歷史
❌ admin_users             - 管理員帳號
❌ audit_logs              - 稽核日誌
```

### 📊 遷移策略

**方法**: 選擇性資料遷移（Selective Data Migration）

**原理**:
1. ✅ 站點二已透過 Migration 建立完整資料庫結構
2. ✅ 僅遷移業務資料（商品、分類等）
3. ✅ 保留站點二的獨立使用者/訂單資料
4. ✅ 使用 `--data-only` 模式避免結構衝突

---

## 前置準備

### 1️⃣ 安裝必要工具

#### Windows 環境
```powershell
# 檢查 PostgreSQL 客戶端工具
psql --version

# 如未安裝，請下載：
# https://www.postgresql.org/download/windows/
# 或使用 Chocolatey:
choco install postgresql
```

#### macOS/Linux 環境
```bash
# macOS (Homebrew)
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# 驗證安裝
psql --version
```

### 2️⃣ 確認站點二 Migration 已完成

```bash
# 連結站點二
cd d:\APP\vsale
supabase link --project-ref rdyvmgomjdglflrcfijs

# 確認無待推送的 Migration
supabase db diff

# 如有差異，推送 Migration
supabase db push
```

### 3️⃣ 測試資料庫連線

#### 主站連線測試
```powershell
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
psql -h db.qwovavytryvgchcowjof.supabase.co `
     -p 5432 `
     -U postgres.qwovavytryvgchcowjof `
     -d postgres `
     -c "SELECT NOW();"
```

#### 站點二連線測試
```powershell
$env:PGPASSWORD = "Devape-BM69"
psql -h db.rdyvmgomjdglflrcfijs.supabase.co `
     -p 5432 `
     -U postgres.rdyvmgomjdglflrcfijs `
     -d postgres `
     -c "SELECT NOW();"
```

---

## 遷移步驟

### 方案 A：使用自動化腳本（推薦）⭐

#### 步驟 1: 模擬執行（Dry Run）
```powershell
cd d:\APP\vsale
.\scripts\migrate-to-site2.ps1 -DryRun
```

**預期輸出**:
```
✅ 主站連線成功
✅ 站點二連線成功
ℹ️  主站資料統計：
  - tiers: 3 筆記錄
  - categories: 5 筆記錄
  - series: 10 筆記錄
  - products: 50 筆記錄
  ...
⚠️  [DRY RUN] 模擬執行（不實際執行）
```

#### 步驟 2: 執行遷移
```powershell
# 互動模式（會詢問確認）
.\scripts\migrate-to-site2.ps1

# 自動模式（跳過確認）
.\scripts\migrate-to-site2.ps1 -Force
```

**執行流程**:
```
[1/6] 執行前置檢查
  ✅ PostgreSQL 客戶端已安裝
  ✅ 主站連線成功
  ✅ 站點二連線成功

[2/6] 建立備份目錄
  ✅ 備份目錄已建立: backup\site1-migration-20260122-150000

[3/6] 匯出主站資料
  ✅ 已匯出 tiers (1234 bytes)
  ✅ 已匯出 categories (2345 bytes)
  ...

[4/6] 備份站點二現有資料
  ✅ 已備份 tiers
  ✅ 已備份 categories
  ...

[5/6] 清空站點二資料表
  ✅ 已清空 coupon_series_restrictions
  ✅ 已清空 coupon_tier_restrictions
  ...

[6/6] 匯入資料到站點二
  ✅ 已匯入 tiers (3 筆記錄)
  ✅ 已匯入 categories (5 筆記錄)
  ...

✅ 遷移完成！
```

#### 步驟 3: 驗證資料
參考 [驗證與測試](#驗證與測試) 章節

---

### 方案 B：手動執行（進階）

#### 步驟 1: 建立備份目錄
```powershell
New-Item -Path "backup\manual-migration" -ItemType Directory -Force
```

#### 步驟 2: 匯出主站資料
```powershell
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
$DB_HOST = "db.qwovavytryvgchcowjof.supabase.co"
$DB_USER = "postgres.qwovavytryvgchcowjof"

# 匯出會員等級
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t tiers `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\tiers.sql"

# 匯出商品分類
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t categories `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\categories.sql"

# 匯出商品系列
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t series `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\series.sql"

# 匯出商品
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t products `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\products.sql"

# 匯出等級價格
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t tier_prices `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\tier_prices.sql"

# 匯出優惠券
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t coupons `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\coupons.sql"

pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t coupon_tier_restrictions `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\coupon_tier_restrictions.sql"

pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d postgres `
  -t coupon_series_restrictions `
  --data-only `
  --column-inserts `
  --disable-triggers `
  -f "backup\manual-migration\coupon_series_restrictions.sql"
```

#### 步驟 3: 匯入站點二
```powershell
$env:PGPASSWORD = "Devape-BM69"
$DB_HOST = "db.rdyvmgomjdglflrcfijs.supabase.co"
$DB_USER = "postgres.rdyvmgomjdglflrcfijs"

# 按照外鍵依賴順序匯入
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\tiers.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\categories.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\series.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\products.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\tier_prices.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\coupons.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\coupon_tier_restrictions.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\manual-migration\coupon_series_restrictions.sql"
```

---

## 驗證與測試

### 1️⃣ 資料完整性檢查

#### 比對記錄數量
```powershell
# 主站記錄數
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
psql -h db.qwovavytryvgchcowjof.supabase.co -p 5432 -U postgres.qwovavytryvgchcowjof -d postgres -c "
SELECT 'tiers' AS table_name, COUNT(*) FROM tiers
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'series', COUNT(*) FROM series
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'tier_prices', COUNT(*) FROM tier_prices;
"

# 站點二記錄數（應該與主站相同）
$env:PGPASSWORD = "Devape-BM69"
psql -h db.rdyvmgomjdglflrcfijs.supabase.co -p 5432 -U postgres.rdyvmgomjdglflrcfijs -d postgres -c "
SELECT 'tiers' AS table_name, COUNT(*) FROM tiers
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'series', COUNT(*) FROM series
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'tier_prices', COUNT(*) FROM tier_prices;
"
```

#### 抽樣檢查資料
```powershell
# 檢查會員等級
$env:PGPASSWORD = "Devape-BM69"
psql -h db.rdyvmgomjdglflrcfijs.supabase.co -p 5432 -U postgres.rdyvmgomjdglflrcfijs -d postgres -c "
SELECT * FROM tiers ORDER BY created_at;
"

# 檢查商品分類
psql -h db.rdyvmgomjdglflrcfijs.supabase.co -p 5432 -U postgres.rdyvmgomjdglflrcfijs -d postgres -c "
SELECT * FROM categories ORDER BY created_at;
"

# 檢查商品（前 5 筆）
psql -h db.rdyvmgomjdglflrcfijs.supabase.co -p 5432 -U postgres.rdyvmgomjdglflrcfijs -d postgres -c "
SELECT id, name, series_id, retail_price, stock FROM products ORDER BY created_at LIMIT 5;
"
```

### 2️⃣ 功能測試（在站點二 Vercel 網站）

#### 管理後台測試
1. **登入後台**
   - URL: https://vsale-site2.vercel.app/admin/login
   - 使用站點二的管理員帳號登入（需先建立）

2. **檢查商品管理**
   - 路徑: `/admin/products`
   - ✅ 商品列表顯示正確
   - ✅ 商品圖片顯示正確（需先遷移 Storage）
   - ✅ 編輯商品功能正常

3. **檢查分類管理**
   - 路徑: `/admin/categories`
   - ✅ 分類列表顯示正確
   - ✅ 分類層級關係正確

4. **檢查會員等級管理**
   - 路徑: `/admin/tiers`
   - ✅ 等級列表顯示正確
   - ✅ 等級價格設定正常

5. **檢查優惠券管理**
   - 路徑: `/admin/coupons`
   - ✅ 優惠券列表顯示正確
   - ✅ 限制條件設定正確

#### 前台測試（需先建立測試客戶）
1. **登入前台**
   - URL: https://vsale-site2.vercel.app/login
   - 建立測試客戶帳號

2. **瀏覽商品**
   - 路徑: `/store`
   - ✅ 商品列表顯示正確
   - ✅ 商品價格依會員等級顯示
   - ✅ 商品圖片顯示（需先遷移 Storage）

3. **購物車功能**
   - ✅ 加入購物車
   - ✅ 價格計算正確
   - ✅ 建立訂單

### 3️⃣ 遷移 Supabase Storage 圖片

#### 選項 A：手動下載上傳（簡單）

1. **主站下載圖片**
   - 前往 https://supabase.com/dashboard/project/qwovavytryvgchcowjof
   - Storage → products → 選擇所有檔案 → Download
   - Storage → public → 選擇所有檔案 → Download
   - Storage → announcements → 選擇所有檔案 → Download

2. **站點二上傳圖片**
   - 前往 https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   - Storage → products → Upload files（上傳主站下載的檔案）
   - Storage → public → Upload files
   - Storage → announcements → Upload files

#### 選項 B：使用備份系統（進階）

**注意**: 目前備份系統的 Storage 備份功能需要在 Vercel 環境執行

1. 在主站管理後台觸發「包含 Storage」的手動備份
2. 下載備份 ZIP 檔案
3. 解壓縮並手動上傳到站點二

---

## 常見問題

### Q1: 遷移後站點二無法登入？
**A**: 站點二需要獨立建立管理員帳號和客戶帳號

**解決方案**:
```sql
-- 方法 1: 在 Supabase Dashboard 建立管理員
-- Dashboard → Authentication → Users → Add User

-- 方法 2: 使用註冊功能建立帳號
-- 前往 https://vsale-site2.vercel.app/admin/login
-- 如果開放註冊，可以直接註冊
```

### Q2: 商品圖片無法顯示？
**A**: Storage 圖片需要額外遷移

**解決方案**: 參考 [遷移 Supabase Storage 圖片](#3️⃣-遷移-supabase-storage-圖片)

### Q3: 遷移後商品價格顯示「價格未設定」？
**A**: 檢查 `tier_prices` 表是否正確匯入

**檢查方式**:
```sql
-- 檢查等級價格
SELECT tp.*, p.name AS product_name, t.name AS tier_name
FROM tier_prices tp
JOIN products p ON p.id = tp.product_id
JOIN tiers t ON t.id = tp.tier_id
ORDER BY tp.created_at DESC
LIMIT 10;
```

### Q4: 遷移時出現外鍵錯誤？
**A**: 確保按照正確順序匯入（腳本已自動處理）

**正確順序**:
1. tiers（無依賴）
2. categories（無依賴）
3. series（依賴 categories）
4. products（依賴 series, categories）
5. tier_prices（依賴 tiers, products）
6. coupons（無依賴）
7. coupon_tier_restrictions（依賴 coupons, tiers）
8. coupon_series_restrictions（依賴 coupons, series）

### Q5: 如何回滾到遷移前狀態？
**A**: 使用回滾腳本

**執行方式**: 參考 [緊急回滾](#緊急回滾)

---

## 緊急回滾

### 使用回滾腳本
```powershell
# 使用遷移時自動備份的目錄
.\scripts\rollback-site2.ps1 -BackupDir "backup\site1-migration-20260122-150000\site2-before-import"

# 強制執行（跳過確認）
.\scripts\rollback-site2.ps1 -BackupDir "backup\site1-migration-20260122-150000\site2-before-import" -Force
```

### 手動回滾
```powershell
$env:PGPASSWORD = "Devape-BM69"
$DB_HOST = "db.rdyvmgomjdglflrcfijs.supabase.co"
$DB_USER = "postgres.rdyvmgomjdglflrcfijs"

# 清空所有資料表（反向順序）
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

# 還原備份（如有）
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\site2-before-import\tiers.sql"
psql -h $DB_HOST -p 5432 -U $DB_USER -d postgres -f "backup\site2-before-import\categories.sql"
# ... 其他表
```

---

## 📚 相關文件

- [BACKUP_ANALYSIS_REPORT.md](BACKUP_ANALYSIS_REPORT.md) - 備份系統完整性分析
- [SITE_CREDENTIALS.md](SITE_CREDENTIALS.md) - 站點連線資訊
- [BACKUP_RESTORE_CHEATSHEET.md](BACKUP_RESTORE_CHEATSHEET.md) - 備份還原快速參考
- [DATABASE_SAFETY_PROTOCOL.md](DATABASE_SAFETY_PROTOCOL.md) - 資料庫安全協議

---

## 🎯 檢查清單

### 遷移前
- [ ] 確認 PostgreSQL 客戶端工具已安裝
- [ ] 確認站點二 Migration 已推送
- [ ] 測試主站資料庫連線
- [ ] 測試站點二資料庫連線
- [ ] 確認主站有資料需要遷移

### 遷移中
- [ ] 執行遷移腳本（或手動遷移）
- [ ] 確認備份檔案已建立
- [ ] 確認站點二現有資料已備份
- [ ] 確認匯入過程無錯誤

### 遷移後
- [ ] 檢查記錄數量是否一致
- [ ] 抽樣檢查資料正確性
- [ ] 測試管理後台功能
- [ ] 遷移 Storage 圖片
- [ ] 建立站點二管理員帳號
- [ ] 建立測試客戶帳號
- [ ] 測試前台完整流程

---

**最後更新**: 2026-01-22
**文件版本**: 1.0.0
**維護者**: Vsale 開發團隊
