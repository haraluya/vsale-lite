# 手動還原指引 - Vsale-lite 備份系統

**最後更新**: 2026-01-09
**適用版本**: v1.0+

---

## ⚠️ 重要警告

**執行還原前必讀**：
- ❌ **還原操作會覆蓋現有資料**，無法復原
- ✅ **執行前必須備份**當前資料庫
- ⏸️ **建議在維護時段執行**（避免用戶使用期間）
- 🔒 **僅由技術人員執行**（需具備資料庫管理權限）

---

## 📋 前置準備

### 必要工具

#### Windows 環境
- **PostgreSQL 客戶端工具** (psql)
  下載：https://www.postgresql.org/download/windows/
- **7-Zip** 或 **WinRAR** (解壓縮工具)

#### macOS 環境
```bash
# 安裝 PostgreSQL 客戶端
brew install postgresql

# 檢查安裝
psql --version
```

#### Linux 環境
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql

# 檢查安裝
psql --version
```

### 環境變數準備

從 Supabase Dashboard 取得資料庫連線資訊：
1. 前往 Supabase Dashboard → Settings → Database
2. 複製以下資訊：
   - **Host**: `db.xxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: (顯示密碼)

---

## 🚀 步驟 1：下載備份檔案

### 1.1 從後台下載

1. 前往後台：`/admin/system/settings`
2. 找到「備份管理」區塊
3. 選擇要還原的備份記錄
4. 點擊「下載」按鈕（或下拉選單）
5. 下載檔案：
   - **資料庫備份**: `vsale-backup-YYYYMMDD-HHMMSS.sql.gz`
   - **圖片備份** (如果有): `vsale-backup-YYYYMMDD-HHMMSS-storage.zip`

### 1.2 驗證檔案完整性

```bash
# Windows PowerShell
(Get-FileHash .\vsale-backup-20260109-020000.sql.gz -Algorithm SHA256).Hash

# macOS / Linux
shasum -a 256 vsale-backup-20260109-020000.sql.gz
```

---

## 📦 步驟 2：解壓縮備份檔案

### 2.1 解壓縮資料庫備份 (.sql.gz)

#### Windows
```powershell
# 使用 PowerShell
Expand-Archive -Path vsale-backup-20260109-020000.sql.gz -DestinationPath .

# 或使用 7-Zip (右鍵 → 7-Zip → Extract Here)
```

#### macOS / Linux
```bash
gunzip vsale-backup-20260109-020000.sql.gz
# 產生: vsale-backup-20260109-020000.sql
```

### 2.2 檢查 SQL 檔案

```bash
# 檢查檔案大小
ls -lh vsale-backup-20260109-020000.sql

# 檢查檔案內容（前 50 行）
head -n 50 vsale-backup-20260109-020000.sql
```

**預期輸出**：
```sql
-- Vsale-lite Database Backup
-- Generated: 2026-01-09T02:00:00.000Z
SET session_replication_role = 'replica';

-- Table: tiers
DELETE FROM tiers;
INSERT INTO tiers (id, name, description, ...) VALUES ...
```

---

## 🗄️ 步驟 3：還原資料庫

### 方式 1：使用 Supabase SQL Editor (推薦)

**優點**: 網頁操作、無需安裝工具、自動記錄執行歷史

1. 前往 Supabase Dashboard → SQL Editor
2. 點擊「New query」
3. 將 `.sql` 檔案內容複製貼上
4. 點擊「Run」執行

**注意事項**：
- ⏱️ 大型備份可能需要 5-10 分鐘
- 📊 執行過程中可查看進度（底部狀態列）
- ❌ 如果出現錯誤，請檢查錯誤訊息並聯絡技術支援

### 方式 2：使用 psql 指令列

**優點**: 速度快、適合大型備份、支援自動化

#### Windows
```powershell
# 設定環境變數
$env:PGPASSWORD="your_database_password"

# 執行還原
psql -h db.xxx.supabase.co -U postgres -d postgres -p 5432 -f vsale-backup-20260109-020000.sql

# 清除密碼環境變數
Remove-Item Env:\PGPASSWORD
```

#### macOS / Linux
```bash
# 設定環境變數
export PGPASSWORD="your_database_password"

# 執行還原
psql -h db.xxx.supabase.co -U postgres -d postgres -p 5432 -f vsale-backup-20260109-020000.sql

# 清除密碼環境變數
unset PGPASSWORD
```

**執行時間預估**：
- 小型資料庫 (<1000 筆記錄): 30 秒 - 1 分鐘
- 中型資料庫 (1000-10000 筆): 2-5 分鐘
- 大型資料庫 (10000+ 筆): 5-15 分鐘

---

## 🖼️ 步驟 4：還原 Storage 圖片 (選用)

**僅適用於**：備份包含「Storage 圖片」的記錄

### 4.1 解壓縮 Storage ZIP

```bash
# Windows / macOS / Linux
unzip vsale-backup-20260109-020000-storage.zip -d vsale-storage
```

**解壓縮後目錄結構**：
```
vsale-storage/
├── products/
│   ├── {product_id_1}/
│   │   └── main.jpg
│   └── {product_id_2}/
│       └── main.png
├── public/
│   ├── logo.png
│   ├── logo-icon.png
│   └── favicon.ico
└── announcements/
    ├── {announcement_id_1}.jpg
    └── {announcement_id_2}.png
```

### 4.2 手動上傳到 Supabase Storage

1. 前往 Supabase Dashboard → Storage
2. 選擇對應的 Bucket：
   - `products` - 商品圖片
   - `public` - 系統圖片
   - `announcements` - 公告圖片
3. 上傳對應資料夾中的檔案
4. **確認路徑正確**（路徑必須與資料庫記錄一致）

### 4.3 使用 Supabase CLI 批次上傳 (進階)

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 登入 Supabase
supabase login

# 連結到專案
supabase link --project-ref your-project-ref

# 批次上傳 products bucket
supabase storage upload products vsale-storage/products/* --project-ref your-project-ref

# 批次上傳 public bucket
supabase storage upload public vsale-storage/public/* --project-ref your-project-ref

# 批次上傳 announcements bucket
supabase storage upload announcements vsale-storage/announcements/* --project-ref your-project-ref
```

---

## ✅ 步驟 5：驗證還原結果

### 5.1 檢查資料表記錄數

前往 Supabase Dashboard → SQL Editor，執行以下查詢：

```sql
-- 檢查主要資料表記錄數
SELECT 'tiers' AS table_name, COUNT(*) AS row_count FROM tiers
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
ORDER BY table_name;
```

**預期輸出**：
```
table_name    | row_count
--------------|-----------
orders        | 150
order_items   | 500
products      | 80
profiles      | 25
tiers         | 3
```

### 5.2 測試前台登入

1. 前往前台：`/login`
2. 使用測試帳號登入
3. 驗證功能：
   - ✅ 可正常瀏覽商品
   - ✅ 購物車功能正常
   - ✅ 可查看訂單歷史

### 5.3 測試後台功能

1. 前往後台：`/admin/login`
2. 使用管理員帳號登入
3. 驗證功能：
   - ✅ 可查看客戶列表
   - ✅ 可查看訂單列表
   - ✅ 商品圖片正確顯示

### 5.4 檢查 Storage 圖片

```sql
-- 查詢商品圖片 URL
SELECT id, name, image_url
FROM products
WHERE image_url IS NOT NULL
LIMIT 10;
```

手動訪問圖片 URL，確認可正常顯示。

---

## 🐛 常見問題

### Q1: psql 指令找不到

**問題**：執行 `psql` 時顯示「command not found」

**解決方案**：
```bash
# Windows: 將 PostgreSQL bin 目錄加入 PATH
# 預設路徑: C:\Program Files\PostgreSQL\16\bin

# macOS: 重新安裝 PostgreSQL
brew install postgresql

# Linux: 安裝客戶端工具
sudo apt-get install postgresql-client
```

### Q2: 還原時出現「permission denied」錯誤

**問題**：執行還原時出現權限錯誤

**解決方案**：
- 確認使用 `postgres` 使用者（擁有完整權限）
- 檢查 Supabase Database Password 是否正確
- 嘗試使用 Supabase SQL Editor 執行（網頁介面自動處理權限）

### Q3: 還原後資料遺失

**問題**：還原完成後發現部分資料遺失

**可能原因**：
1. 備份檔案損壞（檔案大小異常）
2. 備份時間點問題（備份時資料尚未建立）
3. 還原過程中斷（網路問題、逾時）

**解決方案**：
- 下載另一個備份檔案重試
- 檢查備份檔案的 `metadata.rows` 欄位（確認記錄數）
- 使用 psql 指令列執行（較穩定）

### Q4: Storage 圖片無法顯示

**問題**：資料庫還原成功，但圖片無法顯示

**檢查清單**：
- [ ] 確認 Storage Bucket 是否已上傳檔案
- [ ] 檢查檔案路徑是否正確（區分大小寫）
- [ ] 驗證 Bucket 權限設定（需設為 Public）
- [ ] 清除瀏覽器快取後重試

---

## 📞 技術支援

如果在還原過程中遇到問題，請聯絡技術支援並提供以下資訊：

1. **備份檔案名稱**: `vsale-backup-YYYYMMDD-HHMMSS.sql.gz`
2. **還原方式**: Supabase SQL Editor / psql 指令列
3. **錯誤訊息**: 完整的錯誤訊息截圖
4. **執行環境**: Windows / macOS / Linux
5. **Supabase 專案 ID**: `qwovavytryvgchcowjof`

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-09
**適用專案**: Vsale-lite
**相關文件**: `specs/015-cloud-backup/E2E-TESTING-GUIDE.md`
