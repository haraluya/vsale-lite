# Safe DB Reset Script API

**Script**: `scripts/safe-db-reset.ps1`
**Version**: 1.0
**Purpose**: 安全地重置本機資料庫，自動備份後執行 `supabase db reset`

---

## Synopsis

```powershell
.\scripts\safe-db-reset.ps1 [[-BackupReason] <string>] [[-MaxBackups] <int>] [-SkipBackup] [-WhatIf]
```

---

## Description

此腳本在執行 `supabase db reset` 前自動備份資料庫，確保資料安全。支援自動清理舊備份（保留最近 N 次）、互動式確認、錯誤處理與回滾機制。

**安全特性**:
- ✅ 自動備份（預設啟用）
- ✅ 互動式確認（防止誤操作）
- ✅ 備份失敗時中止執行
- ✅ 自動清理舊備份
- ✅ 產生備份元數據

---

## Parameters

### -BackupReason <string>

備份原因說明（用於元數據記錄）

- **Type**: String
- **Required**: No
- **Default**: `"Before DB Reset"`
- **Valid Values**:
  - `"before_reset"` - 重置前備份
  - `"before_migration"` - Migration 前備份
  - `"manual_backup"` - 手動備份
  - 任何自訂字串

**Example**:
```powershell
.\scripts\safe-db-reset.ps1 -BackupReason "before_migration"
```

---

### -MaxBackups <int>

保留最大備份數量（自動刪除最舊的備份）

- **Type**: Integer
- **Required**: No
- **Default**: `10`
- **Valid Range**: `1-50`

**Example**:
```powershell
.\scripts\safe-db-reset.ps1 -MaxBackups 20
```

---

### -SkipBackup

跳過自動備份（僅限測試環境，**不建議使用**）

- **Type**: Switch
- **Required**: No
- **Default**: `$false`
- **Warning**: ⚠️ 使用此參數會跳過備份，資料將無法還原！

**Example**:
```powershell
.\scripts\safe-db-reset.ps1 -SkipBackup
```

---

### -WhatIf

模擬執行模式（顯示將執行的操作，但不實際執行）

- **Type**: Switch
- **Required**: No
- **Default**: `$false`

**Example**:
```powershell
.\scripts\safe-db-reset.ps1 -WhatIf
```

---

## Outputs

### Console Output

```
========== 安全資料庫重置工具 ==========
[INFO] 檢查 Supabase 狀態...
[OK] Supabase 已啟動 (http://127.0.0.1:54321)

[INFO] 開始備份資料庫...
[INFO] 執行 pg_dump...
[OK] 備份完成: D:\APP\vsale\backups\20260107_120530_before_reset.sql (1.2 MB)
[INFO] 產生備份元數據...
[OK] 元數據已儲存: D:\APP\vsale\backups\20260107_120530_metadata.json

[INFO] 自動清理舊備份 (保留最近 10 次)...
[INFO] 刪除舊備份: 20260101_083000_before_reset.sql
[OK] 清理完成 (當前備份數: 10)

[WARN] 即將執行 supabase db reset，此操作將清空所有資料！
確定要繼續嗎？ (y/N): y

[INFO] 執行 supabase db reset...
[OK] 資料庫重置完成！

========================================
備份檔案: D:\APP\vsale\backups\20260107_120530_before_reset.sql
如需還原，請執行: .\scripts\db-restore.ps1
========================================
```

### Exit Codes

| Exit Code | 描述 |
|-----------|------|
| `0` | 成功執行 |
| `1` | Supabase 未啟動 |
| `2` | 備份失敗 |
| `3` | 使用者取消操作 |
| `4` | `supabase db reset` 失敗 |
| `5` | 參數錯誤 |

---

## Files Created

### 1. 備份 SQL 檔案

**路徑**: `backups/YYYYMMDD_HHMMSS_before_reset.sql`

**格式**: PostgreSQL plain-text dump

**範例**:
```
D:\APP\vsale\backups\20260107_120530_before_reset.sql
```

### 2. 備份元數據檔案

**路徑**: `backups/YYYYMMDD_HHMMSS_metadata.json`

**格式**: JSON

**範例**:
```json
{
  "backup_time": "2026-01-07T12:05:30.123Z",
  "reason": "before_reset",
  "environment": "local",
  "database": {
    "host": "127.0.0.1",
    "port": 54322,
    "name": "postgres"
  },
  "file": {
    "name": "20260107_120530_before_reset.sql",
    "path": "D:\\APP\\vsale\\backups\\20260107_120530_before_reset.sql",
    "size_bytes": 1234567,
    "format": "plain"
  },
  "statistics": {
    "table_count": 18,
    "total_rows": 452,
    "backup_duration_ms": 3456
  }
}
```

---

## Error Handling

### Error 1: Supabase 未啟動

**錯誤訊息**:
```
[ERROR] Supabase 未啟動，請先執行: supabase start
```

**解決方法**:
```powershell
supabase start
```

---

### Error 2: 備份失敗

**錯誤訊息**:
```
[ERROR] 備份失敗，中止執行
原因: pg_dump 執行錯誤
```

**可能原因**:
1. PostgreSQL 客戶端工具未安裝
2. 資料庫連線失敗
3. 磁碟空間不足

**解決方法**:
1. 安裝 PostgreSQL 客戶端工具
2. 檢查 Supabase 狀態 (`supabase status`)
3. 檢查磁碟空間 (`Get-PSDrive C`)

---

### Error 3: supabase db reset 失敗

**錯誤訊息**:
```
[ERROR] supabase db reset 執行失敗
備份檔案已保留: D:\APP\vsale\backups\20260107_120530_before_reset.sql
```

**解決方法**:
```powershell
# 使用備份還原
.\scripts\db-restore.ps1
```

---

## Examples

### Example 1: 標準使用（推薦）

```powershell
.\scripts\safe-db-reset.ps1
```

執行流程：
1. 自動備份（原因: "Before DB Reset"）
2. 自動清理舊備份（保留最近 10 次）
3. 互動式確認
4. 執行 `supabase db reset`

---

### Example 2: 自訂備份原因

```powershell
.\scripts\safe-db-reset.ps1 -BackupReason "測試整合 Migration"
```

---

### Example 3: 保留更多備份

```powershell
.\scripts\safe-db-reset.ps1 -MaxBackups 20
```

---

### Example 4: 模擬執行（測試用）

```powershell
.\scripts\safe-db-reset.ps1 -WhatIf
```

輸出：
```
[WHATIF] 將執行以下操作：
1. 備份資料庫到: D:\APP\vsale\backups\20260107_120530_before_reset.sql
2. 產生元數據檔案
3. 清理舊備份（保留最近 10 次）
4. 執行 supabase db reset
```

---

### Example 5: ⚠️ 跳過備份（不建議）

```powershell
.\scripts\safe-db-reset.ps1 -SkipBackup
```

**警告**: 此操作將無法還原資料！

---

## Dependencies

### Required

- **Supabase CLI** (`supabase`)
- **PowerShell** 5.1+ or PowerShell Core 7+

### Optional

- **PostgreSQL Client Tools** (`pg_dump`) - 若 Supabase CLI 內建，則無需額外安裝

---

## Related Scripts

| Script | Description |
|--------|-------------|
| `db-restore.ps1` | 還原資料庫備份 |
| `db-health-check.ps1` | 健康檢查腳本 |
| `Backup-Database.ps1` | 手動備份腳本 |

---

## Security Notes

1. **本機環境限定**: 此腳本僅適用於本機 Docker Supabase，**絕不可在生產環境執行**
2. **備份加密**: 備份檔案未加密，請妥善保管
3. **權限控制**: 備份目錄 (`backups/`) 應設定適當的檔案權限

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-07 | 初始版本 |

---

**Last Updated**: 2026-01-07
**Maintainer**: Claude Sonnet 4.5
