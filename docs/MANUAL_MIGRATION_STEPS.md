# 手動遷移步驟指南

**目標**: 使用 Supabase Dashboard SQL Editor 將主站完整遷移到站點二

**備份檔案位置**: `backup/full-migration-20260122-145653/main-site-full-backup.sql`
**備份大小**: 118KB (3777 行)
**包含內容**: Schema + Data + Functions + Triggers

---

## 🎯 執行方式

### 方法 A: 使用 Supabase Dashboard SQL Editor（推薦）⭐

#### 步驟 1: 開啟站點二 SQL Editor
1. 前往站點二 Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   ```

2. 點擊左側選單 **SQL Editor**

3. 點擊 **New Query** 建立新查詢

#### 步驟 2: 載入備份 SQL 檔案
1. 在 SQL Editor 中,點擊右上角的 **⋮** (更多選項)

2. 選擇 **Upload SQL File**（或直接貼上 SQL 內容）

3. 選擇檔案:
   ```
   d:\APP\vsale\backup\full-migration-20260122-145653\main-site-full-backup.sql
   ```

4. 或者手動複製貼上:
   - 用文字編輯器開啟 `main-site-full-backup.sql`
   - 全選複製 (Ctrl+A, Ctrl+C)
   - 貼到 SQL Editor (Ctrl+V)

#### 步驟 3: 執行 SQL
1. ⚠️ **重要**: 確認您了解此操作會覆蓋站點二的現有資料

2. 點擊 **Run** 或按 **Ctrl+Enter** 執行

3. 等待執行完成（可能需要幾分鐘）

4. 檢查執行結果:
   - ✅ 如果顯示 "Success",表示匯入成功
   - ❌ 如果有錯誤,檢查錯誤訊息並參考下方「常見錯誤處理」

---

### 方法 B: 分段執行（如果完整檔案太大）

如果一次執行整個 SQL 檔案失敗,可以分段執行:

#### 步驟 1: 執行 Schema 部分（CREATE TABLE、FUNCTION 等）
```sql
-- 只執行 CREATE、ALTER、FUNCTION 語句
-- 跳過 INSERT 語句
```

#### 步驟 2: 執行 Data 部分（INSERT 語句）
```sql
-- 只執行 INSERT 語句
```

#### 步驟 3: 執行 Constraints 和 Indexes
```sql
-- 執行 ADD CONSTRAINT、CREATE INDEX 語句
```

---

## 🔍 驗證遷移結果

### 1. 檢查資料表記錄數
在 SQL Editor 執行:

```sql
SELECT
  'tiers' AS table_name, COUNT(*) AS count FROM tiers
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'series', COUNT(*) FROM series
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'tier_prices', COUNT(*) FROM tier_prices
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
ORDER BY table_name;
```

### 2. 檢查關鍵資料
```sql
-- 檢查會員等級
SELECT * FROM tiers ORDER BY created_at;

-- 檢查商品分類
SELECT * FROM categories ORDER BY created_at;

-- 檢查商品（前 10 筆）
SELECT id, name, series_id, retail_price, stock, status
FROM products
ORDER BY created_at
LIMIT 10;

-- 檢查客戶數量
SELECT COUNT(*) as total_customers FROM profiles;

-- 檢查訂單數量
SELECT COUNT(*) as total_orders FROM orders;
```

### 3. 檢查函數和觸發器
```sql
-- 列出所有自訂函數
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 列出所有觸發器
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

---

## ⚠️ 常見錯誤處理

### 錯誤 1: "relation already exists"
**原因**: 站點二已有同名的資料表

**解決方案**:
```sql
-- 選項 A: 先刪除現有表（會遺失資料！）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 然後重新執行備份 SQL

-- 選項 B: 僅清空資料,保留結構
TRUNCATE TABLE coupon_series_restrictions CASCADE;
TRUNCATE TABLE coupon_tier_restrictions CASCADE;
TRUNCATE TABLE order_coupons CASCADE;
TRUNCATE TABLE user_coupons CASCADE;
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE order_custom_fees CASCADE;
TRUNCATE TABLE order_timelines CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE tier_prices CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE series CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE tiers CASCADE;
TRUNCATE TABLE admin_users CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE backup_jobs CASCADE;

-- 然後僅執行 INSERT 語句
```

### 錯誤 2: "foreign key constraint violation"
**原因**: 匯入順序不正確

**解決方案**:
```sql
-- 暫時停用外鍵檢查
SET session_replication_role = replica;

-- 執行匯入 SQL

-- 重新啟用外鍵檢查
SET session_replication_role = DEFAULT;
```

### 錯誤 3: "duplicate key value violates unique constraint"
**原因**: 資料已存在

**解決方案**:
```sql
-- 先清空所有資料
-- 參考「錯誤 1 - 選項 B」
```

---

## 📊 遷移後檢查清單

### Database
- [ ] 所有資料表記錄數正確
- [ ] 抽樣檢查資料正確性
- [ ] 函數和觸發器已正確建立
- [ ] 索引已正確建立
- [ ] RLS 策略已正確建立

### Storage (需要另外遷移)
- [ ] products bucket 圖片
- [ ] public bucket 圖片
- [ ] announcements bucket 圖片

### 測試
- [ ] 管理後台可登入（需先建立管理員帳號）
- [ ] 商品列表正確顯示
- [ ] 前台可登入（使用主站遷移的客戶帳號）
- [ ] 購物車功能正常
- [ ] 訂單功能正常

---

## 🖼️ Storage 圖片遷移

### 方法 A: 手動下載上傳

#### 主站下載
1. 前往主站 Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/qwovavytryvgchcowjof
   ```

2. Storage → products
   - 選擇所有檔案
   - 點擊 Download

3. Storage → public
   - 選擇所有檔案
   - 點擊 Download

4. Storage → announcements
   - 選擇所有檔案
   - 點擊 Download

#### 站點二上傳
1. 前往站點二 Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   ```

2. Storage → products
   - 點擊 Upload
   - 選擇主站下載的檔案

3. Storage → public
   - 點擊 Upload
   - 選擇主站下載的檔案

4. Storage → announcements
   - 點擊 Upload
   - 選擇主站下載的檔案

### 方法 B: 使用 Supabase CLI (如果有 psql)

```bash
# 備份主站 Storage
supabase link --project-ref qwovavytryvgchcowjof
supabase storage download --bucket products --output downloads/products

# 上傳到站點二
supabase link --project-ref rdyvmgomjdglflrcfijs
supabase storage upload --bucket products --source downloads/products
```

---

## 📝 相關資訊

### 站點二資訊
- **Supabase Dashboard**: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
- **API URL**: https://rdyvmgomjdglflrcfijs.supabase.co
- **Vercel 網站**: https://vsale-site2.vercel.app

### 備份檔案位置
- **完整備份**: `d:\APP\vsale\backup\full-migration-20260122-145653\main-site-full-backup.sql`
- **檔案大小**: 118KB
- **行數**: 3777 行
- **包含內容**: Schema + Data + Functions + Triggers + RLS

### 快速檢查指令
```bash
# 檢查備份檔案
ls -lh backup/full-migration-20260122-145653/main-site-full-backup.sql
wc -l backup/full-migration-20260122-145653/main-site-full-backup.sql

# 查看檔案內容（前 50 行）
head -50 backup/full-migration-20260122-145653/main-site-full-backup.sql

# 查看檔案內容（最後 50 行）
tail -50 backup/full-migration-20260122-145653/main-site-full-backup.sql
```

---

**最後更新**: 2026-01-22
**文件版本**: 1.0.0
