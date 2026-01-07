# 資料庫自動化腳本

此目錄包含資料庫管理與維護的 PowerShell 自動化腳本。

## 腳本清單

| 腳本名稱 | 功能 | 使用場景 |
|---------|------|---------|
| `db-backup.ps1` | 資料庫備份 | 重置前、部署前、手動備份 |
| `db-restore.ps1` | 資料庫還原 | 從備份還原 |
| `db-health-check.ps1` | 健康檢查 | 驗證 Schema 一致性 |
| `safe-db-reset.ps1` | 安全重置 | 自動備份 + 重置 |

---

## 快速開始

### 1. 安全重置資料庫

```powershell
# 自動備份 + 重置
.\scripts\safe-db-reset.ps1
```

### 2. 手動備份資料庫

```powershell
# 基本備份
.\scripts\db-backup.ps1

# 指定備份原因
.\scripts\db-backup.ps1 -Reason "before_migration"
```

### 3. 還原資料庫

```powershell
# 互動式選擇備份檔案
.\scripts\db-restore.ps1
```

### 4. 健康檢查

```powershell
# 執行健康檢查
.\scripts\db-health-check.ps1
```

---

## 腳本詳細說明

### `db-backup.ps1` - 資料庫備份

**功能**:
- 使用 `pg_dump` 備份本機 Supabase 資料庫
- 自動產生時間戳檔名
- 儲存備份元數據（大小、表數量、原因）
- 自動清理舊備份（保留最近 10 次）

**參數**:
```powershell
.\scripts\db-backup.ps1 [-Reason <string>]
```

- `-Reason`: 備份原因（選填）
  - `before_reset`: 重置前備份
  - `before_migration`: Migration 前備份
  - `manual_backup`: 手動備份
  - `before_deploy`: 部署前備份

**範例**:
```powershell
# 預設原因（manual_backup）
.\scripts\db-backup.ps1

# 部署前備份
.\scripts\db-backup.ps1 -Reason "before_deploy"
```

**輸出**:
```
========================================
  資料庫備份工具
========================================

[1/5] 檢查 Supabase 服務狀態...
✅ Supabase 服務正在執行

[2/5] 取得資料庫連線資訊...
✅ 連線資訊已取得

[3/5] 執行資料庫備份...
✅ 備份檔案已建立: backups/20260107_120530_before_deploy.sql
✅ 元數據檔案已建立: backups/20260107_120530_metadata.json

[4/5] 備份資訊:
- 檔案大小: 1.2 MB
- 表數量: 18
- 備份時間: 3.4 秒

[5/5] 清理舊備份（保留最近 10 次）...
✅ 清理完成（刪除 2 個舊備份）

========================================
  備份成功完成
========================================
```

---

### `db-restore.ps1` - 資料庫還原

**功能**:
- 列出所有可用的備份檔案
- 互動式選擇要還原的備份
- 顯示備份元數據（時間、原因、大小）
- 執行還原並驗證

**參數**:
```powershell
.\scripts\db-restore.ps1
```

**範例**:
```powershell
# 互動式還原
.\scripts\db-restore.ps1
```

**輸出**:
```
========================================
  資料庫還原工具
========================================

[1/3] 掃描備份檔案...
✅ 找到 5 個備份檔案

請選擇要還原的備份:

[1] 20260107_120530_before_deploy.sql
    時間: 2026-01-07 12:05:30
    原因: before_deploy
    大小: 1.2 MB
    表數量: 18

[2] 20260107_100000_before_reset.sql
    時間: 2026-01-07 10:00:00
    原因: before_reset
    大小: 1.1 MB
    表數量: 18

請輸入編號 [1-5]:
```

---

### `db-health-check.ps1` - 資料庫健康檢查

**功能**:
- 驗證 Schema 一致性（表、欄位、型別）
- 檢查索引完整性（缺失索引、重複索引）
- 檢查 RLS 覆蓋率（Policy 數量）
- 檢查函數授權（GRANT EXECUTE）
- 產生健康報告

**參數**:
```powershell
.\scripts\db-health-check.ps1 [-SaveReport]
```

- `-SaveReport`: 儲存報告到檔案（選填）

**範例**:
```powershell
# 基本檢查
.\scripts\db-health-check.ps1

# 儲存報告
.\scripts\db-health-check.ps1 -SaveReport
```

**輸出**:
```
========================================
  資料庫健康檢查工具
========================================

[1/5] 檢查 Supabase 服務狀態...
✅ Supabase 服務正在執行

[2/5] 取得資料庫連線資訊...
✅ 連線資訊已取得

[3/5] 執行資料庫健康檢查（預計 30 秒）...
✅ 健康檢查執行完成

[4/5] 解析檢查結果...
✅ 檢查結果已解析

========================================
  健康檢查摘要報告
========================================

檢查項目總數: 225

✅ 通過 (OK):    220 (97.8%)
⚠️  警告 (WARNING): 3 (1.3%)
❌ 錯誤 (ERROR):  2 (0.9%)

整體狀態: 需要注意

========================================
  問題清單（ERROR + WARNING）
========================================

❌ ERROR | Index | idx_products_tags
訊息: 索引缺失，查詢效能可能受影響

⚠️ WARNING | Function | calculate_shipping_fee
訊息: 函數未授權給 authenticated 角色

========================================
```

---

### `safe-db-reset.ps1` - 安全重置資料庫

**功能**:
- 自動執行備份（`db-backup.ps1`）
- 執行 `supabase db reset`
- 驗證重置結果

**參數**:
```powershell
.\scripts\safe-db-reset.ps1 [-SkipBackup]
```

- `-SkipBackup`: 跳過自動備份（僅限測試環境）

**範例**:
```powershell
# 安全重置（含備份）
.\scripts\safe-db-reset.ps1

# 跳過備份（測試用）
.\scripts\safe-db-reset.ps1 -SkipBackup
```

**輸出**:
```
========================================
  安全資料庫重置工具
========================================

[1/3] 執行備份...
✅ 備份完成: backups/20260107_120530_before_reset.sql

[2/3] 執行資料庫重置...
✅ 資料庫重置完成

[3/3] 驗證重置結果...
✅ 資料庫驗證成功

========================================
  重置成功完成
========================================
```

---

## 環境需求

- **PowerShell**: 5.1 或以上
- **Supabase CLI**: 已安裝並啟動
- **PostgreSQL 客戶端**: `psql` 與 `pg_dump` 已安裝
- **本機 Supabase**: 執行中（`supabase start`）

---

## 疑難排解

### 問題 1: Supabase 服務未啟動

**錯誤訊息**:
```
❌ 錯誤: Supabase 服務未啟動
```

**解決方法**:
```powershell
supabase start
```

### 問題 2: psql 指令找不到

**錯誤訊息**:
```
'psql' is not recognized as an internal or external command
```

**解決方法**:
1. 安裝 PostgreSQL 客戶端工具
2. 或使用 Supabase Studio SQL Editor (http://127.0.0.1:54323)

---

## 進階使用

### 自訂備份保留數量

編輯 `db-backup.ps1`，修改以下變數:

```powershell
$MAX_BACKUPS = 10  # 預設保留 10 次，可修改為其他數字
```

### 查詢特定類別的健康檢查結果

```sql
-- 連接到資料庫
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

-- 查看索引相關的檢查
SELECT * FROM health_check_results WHERE category = 'Index';

-- 查看 RLS 相關的檢查
SELECT * FROM health_check_results WHERE category = 'RLS';
```

---

## 相關文件

- 📖 [安全 Migration 指南](../docs/SAFE_MIGRATION_GUIDE.md)
- 📖 [備份還原快速參考](../docs/BACKUP_RESTORE_CHEATSHEET.md)
- 📖 [資料庫安全協議](../docs/DATABASE_SAFETY_PROTOCOL.md)
- 📖 [健康檢查快速開始](../specs/012-migration-consolidation/quickstart.md)

---

**最後更新**: 2026-01-07
