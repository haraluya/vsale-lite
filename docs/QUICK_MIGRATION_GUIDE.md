# 快速遷移指南 - 使用 Supabase Dashboard

**目標**: 將主站完整遷移到站點二（包含所有資料）

**已準備的備份檔案**:
- ✅ Schema: `backup/full-migration-20260122-145653/main-site-full-backup.sql` (118KB)
- ✅ Data: `backup/full-migration-20260122-145653/main-site-data.sql` (617KB)

---

## 🚀 5 步驟完成遷移

### 步驟 1: 開啟站點二 SQL Editor

1. 前往站點二 Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   ```

2. 點擊左側選單 **SQL Editor**

3. 點擊 **New Query** 建立新查詢

---

### 步驟 2: 清空站點二現有資料（重要！）

在 SQL Editor 中執行以下 SQL:

```sql
-- 警告：此操作會刪除所有現有資料！
-- 確認您已備份站點二的重要資料

-- 清空 public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 清空 auth schema 的資料表（保留結構）
TRUNCATE TABLE auth.users CASCADE;
TRUNCATE TABLE auth.sessions CASCADE;
TRUNCATE TABLE auth.refresh_tokens CASCADE;
TRUNCATE TABLE auth.identities CASCADE;
TRUNCATE TABLE auth.instances CASCADE;
TRUNCATE TABLE auth.audit_log_entries CASCADE;

-- 清空 storage schema 的資料表（保留結構）
TRUNCATE TABLE storage.objects CASCADE;
TRUNCATE TABLE storage.buckets CASCADE;

SELECT 'Database cleared successfully!' AS status;
```

**執行方式**: 貼上 SQL → 點擊 **Run** 或按 **Ctrl+Enter**

**預期結果**: 顯示 "Database cleared successfully!"

---

### 步驟 3: 匯入 Schema（資料庫結構）

1. 在 SQL Editor 中,點擊右上角的 **⋮** (更多選項)

2. 選擇 **Upload SQL File**

3. 選擇檔案:
   ```
   d:\APP\vsale\backup\full-migration-20260122-145653\main-site-full-backup.sql
   ```

4. 或者手動複製貼上:
   - 用記事本/VS Code 開啟 `main-site-full-backup.sql`
   - 全選複製 (Ctrl+A, Ctrl+C)
   - 貼到 SQL Editor (Ctrl+V)
   - 點擊 **Run**

**執行時間**: 約 10-30 秒

**預期結果**: 建立所有資料表、函數、觸發器、索引、RLS 策略

---

### 步驟 4: 匯入 Data（所有資料）

1. 建立新查詢 (點擊 **New Query**)

2. 上傳或貼上資料檔案:
   ```
   d:\APP\vsale\backup\full-migration-20260122-145653\main-site-data.sql
   ```

3. **重要**: 在執行前,確認檔案開頭有這行:
   ```sql
   SET session_replication_role = replica;
   ```
   這會停用觸發器,避免重複加密等問題

4. 點擊 **Run** 執行

**執行時間**: 約 30-60 秒

**預期結果**: 匯入所有使用者、商品、訂單等資料

---

### 步驟 5: 驗證遷移結果

在 SQL Editor 執行以下查詢檢查:

```sql
-- 檢查所有資料表的記錄數
SELECT
  'auth.users' AS table_name, COUNT(*) AS count FROM auth.users
UNION ALL
SELECT 'tiers', COUNT(*) FROM tiers
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
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
ORDER BY table_name;
```

**預期結果** (以主站為例):
```
table_name          | count
--------------------|-------
admin_users         | 1
auth.users          | 6
categories          | ?
coupons             | ?
orders              | ?
order_items         | ?
products            | ?
profiles            | ?
series              | ?
tier_prices         | ?
tiers               | ?
```

---

## ✅ 完成！資料庫遷移成功

### 接下來的步驟

#### 1. 測試登入功能

**管理後台**:
```
https://vsale-site2.vercel.app/admin/login
```
- 使用主站的管理員帳號登入
- 如果主站管理員是 `haraluya@admin.local`,直接使用相同密碼

**前台客戶登入**:
```
https://vsale-site2.vercel.app/login
```
- 使用主站的客戶手機號碼登入
- 密碼與主站相同

#### 2. 檢查資料顯示

在站點二管理後台檢查:
- ✅ 商品列表是否正確顯示
- ✅ 分類列表是否正確顯示
- ✅ 會員等級是否正確顯示
- ✅ 客戶列表是否正確顯示
- ✅ 訂單列表是否正確顯示

#### 3. 遷移 Storage 圖片（重要！）

**資料庫遷移不包含實際圖片檔案**,需要額外遷移 Storage:

**簡單方式 - 手動下載上傳**:

1. **主站下載圖片**:
   - 前往: https://supabase.com/dashboard/project/qwovavytryvgchcowjof
   - Storage → products → 選擇所有檔案 → Download
   - Storage → public → 選擇所有檔案 → Download
   - Storage → announcements → 選擇所有檔案 → Download

2. **站點二上傳圖片**:
   - 前往: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   - Storage → products → Upload → 選擇主站下載的檔案
   - Storage → public → Upload → 選擇主站下載的檔案
   - Storage → announcements → Upload → 選擇主站下載的檔案

#### 4. 更新 Vercel 環境變數

站點二的 Vercel 需要設定正確的環境變數:

前往: https://vercel.com/dashboard (搜尋 vsale-site2)

Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://rdyvmgomjdglflrcfijs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<站點二的 Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<站點二的 Service Role Key>
```

取得 Keys:
- 前往站點二 Dashboard: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
- Settings → API
- 複製 `anon public` 和 `service_role` keys

---

## ⚠️ 常見問題

### Q: 執行 SQL 時出現 "relation already exists" 錯誤?

**A**: 確認已執行步驟 2 清空資料庫。如果還是有問題,手動刪除特定表:

```sql
DROP TABLE IF EXISTS <table_name> CASCADE;
```

### Q: 執行 SQL 時出現 "permission denied" 錯誤?

**A**: 確認您使用的是站點二的 **Service Role Key** 而非 Anon Key。

在 SQL Editor 中,Supabase 會自動使用正確的權限。

### Q: 商品圖片無法顯示?

**A**: 資料庫遷移不包含 Storage 實際檔案,需要額外遷移圖片（參考步驟 3）。

### Q: 無法登入管理後台?

**A**: 檢查:
1. Vercel 環境變數是否設定正確
2. 使用主站的管理員帳號和密碼
3. 確認 `admin_users` 表有資料:
   ```sql
   SELECT * FROM admin_users;
   ```

### Q: 執行 SQL 時間過長?

**A**: 資料量大時可能需要 1-2 分鐘,請耐心等待。如果超過 5 分鐘,可以:
1. 重新整理頁面
2. 分段執行 (先執行 Schema,再執行 Data)

---

## 📊 遷移檢查清單

### 遷移前
- [ ] 確認站點二 Dashboard 可登入
- [ ] 確認已備份站點二現有資料（如有需要）
- [ ] 確認備份檔案完整 (118KB + 617KB)

### 遷移中
- [ ] 執行步驟 2: 清空資料庫
- [ ] 執行步驟 3: 匯入 Schema
- [ ] 執行步驟 4: 匯入 Data
- [ ] 執行步驟 5: 驗證結果

### 遷移後
- [ ] 記錄數量與主站一致
- [ ] 管理後台可登入
- [ ] 前台客戶可登入
- [ ] 商品資料正確顯示
- [ ] 訂單資料正確顯示
- [ ] 遷移 Storage 圖片
- [ ] 更新 Vercel 環境變數
- [ ] 完整功能測試

---

## 🎯 預計執行時間

- 步驟 1-2: 5 分鐘
- 步驟 3: 1 分鐘
- 步驟 4: 1 分鐘
- 步驟 5: 2 分鐘
- **總計**: 約 10 分鐘

---

## 📚 相關文件

- [SITE_CREDENTIALS.md](SITE_CREDENTIALS.md) - 站點連線資訊
- [BACKUP_ANALYSIS_REPORT.md](BACKUP_ANALYSIS_REPORT.md) - 備份系統分析
- [MANUAL_MIGRATION_STEPS.md](MANUAL_MIGRATION_STEPS.md) - 詳細手動步驟

---

**最後更新**: 2026-01-22
**文件版本**: 1.0.0
**執行環境**: Windows 11 + Supabase Dashboard
