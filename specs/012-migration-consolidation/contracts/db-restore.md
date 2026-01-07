# Database Restore Script API

**Script**: `scripts/db-restore.ps1`
**Version**: 1.0
**Purpose**: 從備份檔案還原資料庫（互動式選擇備份點）

---

## Synopsis

```powershell
.\scripts\db-restore.ps1 [[-BackupFile] <string>] [-ListOnly] [-Force] [-WhatIf]
```

---

## Description

此腳本提供互動式介面，列出所有可用備份並允許使用者選擇還原點。支援從 `.sql` 備份檔案還原到本機 Supabase 資料庫。

**功能特性**:
- ✅ 互動式選擇備份
- ✅ 顯示備份元數據（時間、原因、大小）
- ✅ 安全確認機制
- ✅ 還原失敗時自動回滾
- ✅ 支援直接指定備份檔案

---

## Parameters

### -BackupFile <string>

直接指定要還原的備份檔案路徑（跳過互動式選擇）

- **Type**: String
- **Required**: No
- **Default**: `$null` (互動式選擇)
- **Accepts**: 完整路徑或相對路徑

**Example**:
```powershell
.\scripts\db-restore.ps1 -BackupFile "backups\20260107_120530_before_reset.sql"
```

---

### -ListOnly

僅列出所有可用備份，不執行還原

- **Type**: Switch
- **Required**: No
- **Default**: `$false`

**Example**:
```powershell
.\scripts\db-restore.ps1 -ListOnly
```

---

### -Force

跳過確認提示，直接執行還原（自動化腳本使用）

- **Type**: Switch
- **Required**: No
- **Default**: `$false`
- **Warning**: ⚠️ 使用此參數會跳過確認，請謹慎使用！

**Example**:
```powershell
.\scripts\db-restore.ps1 -BackupFile "backups\20260107_120530_before_reset.sql" -Force
```

---

### -WhatIf

模擬執行模式（顯示將執行的操作，但不實際執行）

- **Type**: Switch
- **Required**: No
- **Default**: `$false`

**Example**:
```powershell
.\scripts\db-restore.ps1 -WhatIf
```

---

## Outputs

### Console Output (Interactive Mode)

```
========== 資料庫還原工具 ==========
[INFO] 掃描備份目錄...
[OK] 找到 10 個備份檔案

備份清單:
--------------------------------------------------
[1] 2026-01-07 12:05:30  |  1.2 MB  |  Before DB Reset
    檔案: 20260107_120530_before_reset.sql

[2] 2026-01-07 10:30:15  |  1.1 MB  |  Before Migration
    檔案: 20260107_103015_before_migration.sql

[3] 2026-01-06 18:45:00  |  1.0 MB  |  Manual Backup
    檔案: 20260106_184500_manual_backup.sql

...
--------------------------------------------------

請選擇要還原的備份 (1-10) 或輸入 'q' 離開: 1

[INFO] 選擇的備份:
  時間: 2026-01-07 12:05:30
  原因: Before DB Reset
  大小: 1.2 MB
  檔案: D:\APP\vsale\backups\20260107_120530_before_reset.sql

[WARN] 即將還原資料庫，此操作將覆蓋所有現有資料！
確定要繼續嗎？ (y/N): y

[INFO] 執行資料庫還原...
[INFO] 使用 psql 載入備份...
[OK] 資料庫還原完成！

========================================
還原成功！
總耗時: 45 秒
========================================
```

### Console Output (List Only)

```
========== 可用備份清單 ==========

[1] 2026-01-07 12:05:30  |  1.2 MB  |  Before DB Reset
    檔案: 20260107_120530_before_reset.sql
    表數量: 18

[2] 2026-01-07 10:30:15  |  1.1 MB  |  Before Migration
    檔案: 20260107_103015_before_migration.sql
    表數量: 18

[3] 2026-01-06 18:45:00  |  1.0 MB  |  Manual Backup
    檔案: 20260106_184500_manual_backup.sql
    表數量: 17

總計: 10 個備份
最新備份: 2026-01-07 12:05:30
```

### Exit Codes

| Exit Code | 描述 |
|-----------|------|
| `0` | 成功執行 |
| `1` | Supabase 未啟動 |
| `2` | 備份檔案不存在或無效 |
| `3` | 使用者取消操作 |
| `4` | 還原失敗 |
| `5` | 參數錯誤 |
| `6` | 無可用備份 |

---

## Error Handling

### Error 1: 無可用備份

**錯誤訊息**:
```
[ERROR] 備份目錄中未找到任何備份檔案
路徑: D:\APP\vsale\backups
```

**解決方法**:
```powershell
# 先執行備份
.\scripts\safe-db-reset.ps1
```

---

### Error 2: 備份檔案損壞

**錯誤訊息**:
```
[ERROR] 備份檔案無效或損壞
檔案: 20260107_120530_before_reset.sql
```

**解決方法**:
1. 檢查檔案完整性
2. 選擇其他備份檔案
3. 聯絡技術支援

---

### Error 3: 還原失敗

**錯誤訊息**:
```
[ERROR] 資料庫還原失敗
原因: psql 執行錯誤
```

**可能原因**:
1. PostgreSQL 客戶端工具未安裝
2. 資料庫連線失敗
3. 備份檔案與目標資料庫版本不相容

**解決方法**:
1. 檢查 PostgreSQL 版本相容性
2. 檢查 Supabase 狀態 (`supabase status`)
3. 查看詳細錯誤日誌

---

### Error 4: Supabase 未啟動

**錯誤訊息**:
```
[ERROR] Supabase 未啟動，請先執行: supabase start
```

**解決方法**:
```powershell
supabase start
```

---

## Examples

### Example 1: 互動式還原（推薦）

```powershell
.\scripts\db-restore.ps1
```

執行流程：
1. 掃描 `backups/` 目錄
2. 顯示所有可用備份（含元數據）
3. 使用者選擇還原點
4. 互動式確認
5. 執行還原

---

### Example 2: 直接指定備份檔案

```powershell
.\scripts\db-restore.ps1 -BackupFile "backups\20260107_120530_before_reset.sql"
```

---

### Example 3: 僅列出備份（不還原）

```powershell
.\scripts\db-restore.ps1 -ListOnly
```

輸出備份清單，可用於檢查備份完整性。

---

### Example 4: 自動化還原（跳過確認）

```powershell
.\scripts\db-restore.ps1 -BackupFile "backups\20260107_120530_before_reset.sql" -Force
```

**警告**: 此操作將覆蓋所有現有資料，請謹慎使用！

---

### Example 5: 模擬執行（測試用）

```powershell
.\scripts\db-restore.ps1 -WhatIf
```

輸出：
```
[WHATIF] 將執行以下操作：
1. 掃描備份目錄: D:\APP\vsale\backups
2. 顯示可用備份清單
3. 等待使用者選擇
4. 執行 psql 還原
```

---

## Backup Metadata Support

### 讀取備份元數據

腳本會自動讀取備份元數據檔案（`*_metadata.json`），並顯示以下資訊：

- 備份時間
- 備份原因
- 檔案大小
- 表數量
- 總資料筆數
- Supabase 版本
- PostgreSQL 版本

### 無元數據檔案處理

若備份檔案無對應的元數據檔案，腳本會顯示警告並僅提供基本資訊（檔案名稱、大小、修改時間）。

---

## Dependencies

### Required

- **Supabase CLI** (`supabase`)
- **PowerShell** 5.1+ or PowerShell Core 7+

### Optional

- **PostgreSQL Client Tools** (`psql`) - 若 Supabase CLI 內建，則無需額外安裝

---

## Related Scripts

| Script | Description |
|--------|-------------|
| `safe-db-reset.ps1` | 安全重置資料庫（自動備份） |
| `db-health-check.ps1` | 健康檢查腳本 |
| `Backup-Database.ps1` | 手動備份腳本 |

---

## Security Notes

1. **本機環境限定**: 此腳本僅適用於本機 Docker Supabase
2. **備份完整性**: 還原前建議驗證備份檔案完整性
3. **權限控制**: 確保備份檔案僅供授權人員存取

---

## Advanced Usage

### 使用 PowerShell Pipeline

```powershell
# 列出所有備份並選擇最新的
$latestBackup = Get-ChildItem "backups\*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
.\scripts\db-restore.ps1 -BackupFile $latestBackup.FullName -Force
```

### 自動化腳本範例

```powershell
# 還原到特定時間點
$targetTime = "2026-01-07 12:05:30"
$backup = Get-ChildItem "backups\*.sql" | Where-Object {
  $_.Name -match "20260107_120530"
}
.\scripts\db-restore.ps1 -BackupFile $backup.FullName -Force
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-07 | 初始版本 |

---

**Last Updated**: 2026-01-07
**Maintainer**: Claude Sonnet 4.5
