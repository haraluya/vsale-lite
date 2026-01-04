# 備份與還原快速參考

## 🚀 快速操作指令

### 部署前備份（必做！）

```bash
# 1. 在 Supabase Dashboard 手動建立備份
# Dashboard → Database → Backups → Create Backup

# 2. 或使用 pg_dump（推薦用於本地備份）
# 設定環境變數
export PGPASSWORD="your-database-password"
export DB_HOST="db.qwovavytryvgchcowjof.supabase.co"
export DB_USER="postgres"
export DB_NAME="postgres"

# 執行備份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -F custom \
  -f "backup_$(date +%Y%m%d_%H%M%S).dump"

# 或備份為 SQL 檔案（更容易檢視）
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### 部署 Migration

```bash
# 1. 確認已連結到正確專案
supabase link --project-ref qwovavytryvgchcowjof

# 2. 檢查將要執行的 Migration
ls -la supabase/migrations/

# 3. 推送 Migration
supabase db push

# 4. 驗證 Migration 成功
supabase db diff
```

### 緊急還原

```bash
# 方案 A：從 Supabase Dashboard 還原
# Dashboard → Database → Backups → Restore

# 方案 B：從本地備份檔還原
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --clean \
  --if-exists \
  backup_20260105_140000.dump

# 或從 SQL 檔案還原
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f backup_20260105_140000.sql
```

---

## 📋 部署檢查清單

### 部署前（Pre-deployment）

- [ ] 在本地測試環境執行 `supabase db reset`
- [ ] 執行 `pnpm type-check` 確認無型別錯誤
- [ ] 執行 `pnpm test`（如有測試）
- [ ] 檢查 Migration 檔案無危險操作（DROP、修改型別）
- [ ] 備份生產資料庫
- [ ] 記錄當前應用程式版本號
- [ ] 通知團隊即將部署

### 部署中（Deployment）

- [ ] 推送 Migration: `supabase db push`
- [ ] 部署應用程式: `firebase deploy --only hosting`
- [ ] 檢查部署日誌無錯誤
- [ ] 驗證首頁可正常開啟

### 部署後（Post-deployment）

- [ ] 測試新功能正常運作
- [ ] 測試舊功能未受影響
- [ ] 檢查資料庫連線正常
- [ ] 監控錯誤日誌（至少 30 分鐘）
- [ ] 更新部署記錄
- [ ] 通知團隊部署完成

---

## 🎯 常見場景

### 場景 1：新增優惠券功能（安全）

```bash
# 1. 備份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f "backup_before_coupons_$(date +%Y%m%d).sql"

# 2. 推送 Migration
supabase db push

# 3. 部署應用程式
firebase deploy --only hosting

# 4. 測試優惠券功能
# - 建立優惠券
# - 套用優惠券到訂單
# - 檢查折扣計算正確
```

### 場景 2：修改商品欄位（需謹慎）

**需求**：商品名稱從 VARCHAR(100) 改為 VARCHAR(200)

```sql
-- ✅ 安全：擴大範圍
-- Migration: 20260105_expand_product_name.sql
ALTER TABLE products
ALTER COLUMN name TYPE VARCHAR(200);
```

```bash
# 1. 備份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -t products \
  -f "backup_products_$(date +%Y%m%d).sql"

# 2. 推送 Migration
supabase db push

# 3. 驗證欄位型別
supabase db diff
```

### 場景 3：重構欄位（複雜）

**需求**：訂單狀態從 TEXT 改為 ENUM

**Phase 1: 新增新欄位**
```sql
-- Migration: 20260105_01_add_status_enum.sql
CREATE TYPE order_status_enum AS ENUM (
  'pending', 'confirmed', 'shipping', 'completed', 'cancelled'
);

ALTER TABLE orders ADD COLUMN status_new order_status_enum;
UPDATE orders SET status_new = status::order_status_enum;
```

**Phase 2: 更新應用程式**（同時讀寫兩個欄位）

**Phase 3: 切換欄位**（7-30 天後）
```sql
-- Migration: 20260205_02_switch_status.sql
ALTER TABLE orders RENAME COLUMN status TO status_old;
ALTER TABLE orders RENAME COLUMN status_new TO status;
```

**Phase 4: 清理**（再 30 天後）
```sql
-- Migration: 20260305_03_cleanup_status.sql
ALTER TABLE orders DROP COLUMN status_old;
```

---

## ⚠️ 危險操作警示

### 絕對不要做的事

```sql
-- ❌ 不要刪除欄位（資料會永久遺失）
ALTER TABLE products DROP COLUMN old_field;

-- ❌ 不要刪除表（資料會永久遺失）
DROP TABLE old_table;

-- ❌ 不要縮小欄位型別（可能截斷資料）
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(10);

-- ❌ 不要在有資料時直接加 NOT NULL
ALTER TABLE products ALTER COLUMN description SET NOT NULL;
```

### 替代安全做法

```sql
-- ✅ 刪除欄位 → 先重新命名
ALTER TABLE products RENAME COLUMN old_field TO deprecated_old_field;
-- 等 30 天後確認無問題再刪除

-- ✅ 刪除表 → 先重新命名
ALTER TABLE old_table RENAME TO deprecated_old_table;
-- 等 30 天後確認無問題再刪除

-- ✅ 縮小型別 → 先檢查資料
SELECT COUNT(*) FROM users WHERE LENGTH(username) > 10;
-- 如果有記錄，先處理這些記錄

-- ✅ 加 NOT NULL → 先填充資料
UPDATE products SET description = '' WHERE description IS NULL;
ALTER TABLE products ALTER COLUMN description SET NOT NULL;
```

---

## 🔄 回滾程序

### 如果 Migration 失敗

#### 方法 1：從備份還原（最安全）

```bash
# 1. 停止應用程式（避免寫入資料）
firebase hosting:disable

# 2. 還原資料庫
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --clean --if-exists \
  backup_before_migration.dump

# 3. 重新部署舊版應用程式
git checkout previous-release
firebase deploy --only hosting

# 4. 驗證系統正常
```

#### 方法 2：執行反向 Migration

```sql
-- 如果 Migration 是新增欄位
ALTER TABLE products DROP COLUMN new_column;

-- 如果 Migration 是新增表
DROP TABLE new_table;

-- 如果 Migration 是新增索引
DROP INDEX idx_name;
```

### 如果應用程式出錯（但 Migration 成功）

```bash
# 1. 回到上一個版本
git checkout previous-release

# 2. 重新部署
firebase deploy --only hosting

# 3. 驗證系統正常
# 注意：Migration 已執行，只是應用程式版本回退
```

---

## 📊 監控與驗證

### 部署後檢查項目

```bash
# 1. 檢查 Migration 狀態
supabase migration list

# 2. 檢查資料庫連線
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT NOW();"

# 3. 檢查表結構
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "\d+ table_name"

# 4. 檢查資料筆數
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT
        (SELECT COUNT(*) FROM products) as products_count,
        (SELECT COUNT(*) FROM orders) as orders_count,
        (SELECT COUNT(*) FROM users) as users_count;"

# 5. 檢查最近建立的記錄
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;"
```

### 錯誤處理

```bash
# 如果連線失敗
# 1. 檢查網路連線
ping db.qwovavytryvgchcowjof.supabase.co

# 2. 檢查防火牆設定
# Supabase Dashboard → Settings → Database → Connection Pooling

# 3. 檢查密碼是否正確
# 在 Supabase Dashboard 重設密碼
```

---

## 🛡️ 預防措施

### 定期備份排程

建議設定自動備份腳本（每日執行）：

```bash
#!/bin/bash
# backup-daily.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/path/to/backups"

# 備份資料庫
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -F custom \
  -f "$BACKUP_DIR/daily_backup_$DATE.dump"

# 保留最近 30 天的備份
find $BACKUP_DIR -name "daily_backup_*.dump" -mtime +30 -delete

# 上傳到雲端儲存（選用）
# aws s3 cp "$BACKUP_DIR/daily_backup_$DATE.dump" s3://your-bucket/backups/
```

### 部署時間建議

- **最佳時間**：離峰時段（凌晨 2-4 AM）
- **避免時間**：尖峰時段（中午 12-14、晚上 18-21）
- **特殊情況**：節日前後、促銷活動期間

---

**記住**：寧可多花 10 分鐘備份，也不要花 10 小時修復資料！

**最後更新**: 2026-01-05
