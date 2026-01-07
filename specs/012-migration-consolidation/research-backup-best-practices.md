# PostgreSQL 備份與還原最佳實踐研究報告

**研究日期**: 2026-01-07
**研究目的**: 設計安全的資料庫重置流程與自動備份腳本
**目標環境**: Supabase Local (Docker PostgreSQL)

---

## 一、Supabase 本機資料庫連線資訊

### 1.1 連線參數（從 `supabase status` 取得）

| 參數 | 值 |
|------|---|
| **Host** | `127.0.0.1` |
| **Port** | `54322` |
| **Database** | `postgres` |
| **User** | `postgres` |
| **Password** | `postgres` |
| **Connection URL** | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### 1.2 相關服務

- **Studio**: http://127.0.0.1:54323 (資料庫管理介面)
- **API URL**: http://127.0.0.1:54321
- **GraphQL**: http://127.0.0.1:54321/graphql/v1

---

## 二、`pg_dump` 最佳參數研究

### 2.1 參數分類與用途

#### A. 基礎格式參數

| 參數 | 用途 | 建議 |
|------|------|------|
| `--format=plain` (或 `-Fp`) | 輸出為 SQL 腳本 | ✅ **推薦用於本機開發** - 容易檢視與編輯 |
| `--format=custom` (或 `-Fc`) | 輸出為壓縮二進位格式 | ⚠️ 適合生產環境 - 需要 `pg_restore` 還原 |
| `--format=directory` (或 `-Fd`) | 輸出為目錄 + 多個檔案 | ⚠️ 適合大型資料庫 - 可選擇性還原 |
| `--format=tar` (或 `-Ft`) | 輸出為 tar 壓縮檔 | ⚠️ 較少使用 |

**建議**: 本機開發使用 `plain` 格式（預設），生產環境使用 `custom` 格式。

---

#### B. 清理與重建參數

| 參數 | 用途 | 風險 | 建議 |
|------|------|------|------|
| `--clean` | 在 CREATE 前先 DROP 物件 | ⚠️ 會刪除現有物件 | ✅ **推薦** - 確保還原時清除舊資料 |
| `--if-exists` | 搭配 `--clean`，使用 `DROP IF EXISTS` | 無風險 | ✅ **必須搭配 `--clean`** - 避免「物件不存在」錯誤 |
| `--create` | 包含建立資料庫的指令 | ⚠️ 僅適合完整資料庫備份 | ❌ 本專案不需要 - 資料庫已存在 |

**結論**: **必須同時使用 `--clean` 與 `--if-exists`**，避免還原時發生錯誤。

---

#### C. 權限與擁有者參數

| 參數 | 用途 | 風險 | 建議 |
|------|------|------|------|
| `--no-owner` | 不輸出 `ALTER ... OWNER TO ...` 指令 | 無風險 | ✅ **推薦** - 避免權限問題（本機與雲端使用者不同） |
| `--no-acl` | 不輸出 ACL 權限設定 | 無風險 | ✅ **推薦** - 簡化備份檔案 |
| `--no-privileges` | 同 `--no-acl` | 無風險 | ✅ 可選（與 `--no-acl` 功能相同） |

**結論**: **必須使用 `--no-owner` 與 `--no-acl`**，確保備份可在不同環境還原。

---

#### D. 資料內容參數

| 參數 | 用途 | 使用場景 |
|------|------|---------|
| `--data-only` | 僅備份資料（不含 Schema） | ⚠️ 不適合本專案 |
| `--schema-only` | 僅備份 Schema（不含資料） | ⚠️ 不適合本專案 |
| `--exclude-table-data=<table>` | 排除特定表的資料 | ⚠️ 可選 - 排除日誌表 |

**結論**: **不使用這些參數**，需要完整備份（Schema + 資料）。

---

### 2.2 最終推薦參數組合

#### **方案 A：本機開發備份（推薦）**

```bash
pg_dump \
  -h 127.0.0.1 \
  -p 54322 \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -f "backup_YYYYMMDD_HHMMSS_reason.sql"
```

**優點**:
- ✅ 輸出為 SQL 文字檔，容易檢視與編輯
- ✅ 包含 `DROP IF EXISTS`，確保還原時清除舊資料
- ✅ 不包含擁有者與權限，避免環境差異問題

**缺點**:
- ⚠️ 檔案較大（未壓縮）

---

#### **方案 B：生產環境備份（可選）**

```bash
pg_dump \
  -h db.qwovavytryvgchcowjof.supabase.co \
  -U postgres \
  -d postgres \
  --format=custom \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -f "backup_YYYYMMDD_HHMMSS.dump"
```

**優點**:
- ✅ 壓縮格式，檔案較小
- ✅ 可使用 `pg_restore` 選擇性還原

**缺點**:
- ⚠️ 需要 `pg_restore` 還原（較複雜）
- ⚠️ 無法直接檢視內容

---

## 三、備份檔案命名格式設計

### 3.1 命名規則

**格式**: `YYYYMMDD_HHMMSS_reason.sql`

**範例**:
- `20260107_120530_before_reset.sql` - 重置前備份
- `20260107_143210_before_migration.sql` - Migration 前備份
- `20260107_180045_manual_backup.sql` - 手動備份

### 3.2 命名規則說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| `YYYYMMDD` | 日期（年月日） | `20260107` |
| `HHMMSS` | 時間（時分秒） | `120530` |
| `reason` | 備份原因（slug 格式） | `before_reset`, `before_migration`, `manual_backup` |

### 3.3 備份原因分類（Reason Codes）

| Reason Code | 中文說明 | 使用場景 |
|------------|---------|---------|
| `before_reset` | 重置前備份 | 執行 `supabase db reset` 前 |
| `before_migration` | Migration 前備份 | 執行 `supabase db push` 前 |
| `manual_backup` | 手動備份 | 使用者主動執行備份 |
| `daily_backup` | 每日自動備份 | 自動化排程備份 |
| `before_deploy` | 部署前備份 | 部署到生產環境前 |

---

## 四、備份元數據 Schema 設計

### 4.1 元數據 JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "backup_time": {
      "type": "string",
      "format": "date-time",
      "description": "備份時間（ISO 8601 格式）"
    },
    "reason": {
      "type": "string",
      "enum": ["before_reset", "before_migration", "manual_backup", "daily_backup", "before_deploy"],
      "description": "備份原因"
    },
    "environment": {
      "type": "string",
      "enum": ["local", "production"],
      "description": "環境類型"
    },
    "database": {
      "type": "object",
      "properties": {
        "host": { "type": "string" },
        "port": { "type": "integer" },
        "name": { "type": "string" }
      },
      "required": ["host", "port", "name"]
    },
    "file": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "description": "備份檔案名稱" },
        "path": { "type": "string", "description": "備份檔案絕對路徑" },
        "size_bytes": { "type": "integer", "description": "檔案大小（bytes）" },
        "format": {
          "type": "string",
          "enum": ["plain", "custom", "directory", "tar"],
          "description": "備份格式"
        }
      },
      "required": ["name", "path", "size_bytes", "format"]
    },
    "statistics": {
      "type": "object",
      "properties": {
        "table_count": { "type": "integer", "description": "資料表數量" },
        "total_rows": { "type": "integer", "description": "總記錄數（可選）" },
        "backup_duration_ms": { "type": "integer", "description": "備份耗時（毫秒）" }
      },
      "required": ["table_count"]
    },
    "supabase": {
      "type": "object",
      "properties": {
        "version": { "type": "string", "description": "Supabase CLI 版本" },
        "postgres_version": { "type": "string", "description": "PostgreSQL 版本" }
      }
    }
  },
  "required": ["backup_time", "reason", "environment", "database", "file", "statistics"]
}
```

---

### 4.2 元數據範例

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
  },
  "supabase": {
    "version": "1.50.0",
    "postgres_version": "15.6"
  }
}
```

---

## 五、自動清理策略設計

### 5.1 清理規則

| 環境 | 保留策略 | 說明 |
|------|---------|------|
| **本機開發** | 保留最近 **10 次**備份 | 避免佔用過多磁碟空間 |
| **生產環境** | 保留最近 **30 天**備份 | 符合監管要求 |

### 5.2 清理邏輯（偽代碼）

```javascript
function cleanupOldBackups(backupDir, maxCount = 10) {
  // 1. 掃描備份目錄，取得所有備份檔案
  const backupFiles = getBackupFiles(backupDir);

  // 2. 依照時間戳排序（新 → 舊）
  backupFiles.sort((a, b) => b.timestamp - a.timestamp);

  // 3. 保留最近 N 次備份
  const filesToKeep = backupFiles.slice(0, maxCount);
  const filesToDelete = backupFiles.slice(maxCount);

  // 4. 刪除舊備份
  for (const file of filesToDelete) {
    deleteFile(file.path);
    deleteMetadata(file.metadataPath); // 同時刪除元數據
  }

  return {
    kept: filesToKeep.length,
    deleted: filesToDelete.length
  };
}
```

### 5.3 清理時機

- **自動清理**: 每次備份完成後自動執行
- **手動清理**: 使用者執行 `pnpm backup:cleanup` 指令

---

## 六、PowerShell 腳本參數規格

### 6.1 腳本功能需求

| 功能 | 優先級 | 說明 |
|------|--------|------|
| **備份資料庫** | P0 | 執行 `pg_dump` 備份本機 Supabase |
| **生成元數據** | P1 | 建立 JSON 元數據檔案 |
| **自動清理** | P1 | 保留最近 N 次備份 |
| **還原資料庫** | P1 | 執行 `psql` 還原備份 |
| **列出備份** | P2 | 顯示所有備份清單 |

---

### 6.2 腳本參數規格（PowerShell）

#### **A. 備份腳本 (`Backup-Database.ps1`)**

```powershell
<#
.SYNOPSIS
備份 Supabase 本機資料庫

.PARAMETER Reason
備份原因（before_reset | before_migration | manual_backup）

.PARAMETER MaxBackups
保留最近 N 次備份（預設 10）

.PARAMETER Output
備份檔案輸出路徑（預設 backups/）

.EXAMPLE
.\Backup-Database.ps1 -Reason "before_reset"

.EXAMPLE
.\Backup-Database.ps1 -Reason "manual_backup" -MaxBackups 5
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("before_reset", "before_migration", "manual_backup", "daily_backup", "before_deploy")]
  [string]$Reason,

  [Parameter(Mandatory = $false)]
  [int]$MaxBackups = 10,

  [Parameter(Mandatory = $false)]
  [string]$Output = "backups"
)
```

---

#### **B. 還原腳本 (`Restore-Database.ps1`)**

```powershell
<#
.SYNOPSIS
還原 Supabase 本機資料庫

.PARAMETER BackupFile
備份檔案路徑（相對或絕對路徑）

.PARAMETER Confirm
是否需要確認（預設 true）

.EXAMPLE
.\Restore-Database.ps1 -BackupFile "backups\20260107_120530_before_reset.sql"

.EXAMPLE
.\Restore-Database.ps1 -BackupFile "backups\20260107_120530_before_reset.sql" -Confirm:$false
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,

  [Parameter(Mandatory = $false)]
  [bool]$Confirm = $true
)
```

---

#### **C. 列出備份腳本 (`List-Backups.ps1`)**

```powershell
<#
.SYNOPSIS
列出所有備份檔案

.PARAMETER Count
顯示最近 N 次備份（預設 10）

.PARAMETER Reason
篩選備份原因（可選）

.EXAMPLE
.\List-Backups.ps1

.EXAMPLE
.\List-Backups.ps1 -Count 5 -Reason "before_reset"
#>
param(
  [Parameter(Mandatory = $false)]
  [int]$Count = 10,

  [Parameter(Mandatory = $false)]
  [string]$Reason = $null
)
```

---

### 6.3 腳本輸出格式

#### **成功輸出範例**

```powershell
✅ 備份成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 檔案名稱: 20260107_120530_before_reset.sql
📂 檔案路徑: D:\APP\vsale\backups\20260107_120530_before_reset.sql
📊 檔案大小: 1.18 MB
⏱️  備份耗時: 3.5 秒
🗃️  資料表數: 18
📄 元數據檔: 20260107_120530_before_reset.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧹 已清理 3 個舊備份（保留最近 10 次）
```

#### **失敗輸出範例**

```powershell
❌ 備份失敗！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
錯誤訊息: pg_dump: error: connection to server at "127.0.0.1", port 54322 failed
建議操作:
  1. 檢查 Supabase 是否正在執行: supabase status
  2. 啟動 Supabase: supabase start
  3. 重新執行備份腳本
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 七、參考資料

### 7.1 官方文件

1. [PostgreSQL: pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html) - 官方 `pg_dump` 完整參數說明
2. [PostgreSQL: Backup Manifest Format](https://www.postgresql.org/docs/current/backup-manifest-format.html) - PostgreSQL 官方備份元數據格式
3. [Google Cloud: Export and import using pg_dump](https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-dmp) - Google Cloud 的 pg_dump 最佳實踐
4. [SimpleBackups: PostgreSQL pg_dump & pg_restore Guide](https://simplebackups.com/blog/postgresql-pgdump-and-pgrestore-guide-examples) - pg_dump 完整範例與最佳實踐

### 7.2 專案內部文件

- [資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md) - 專案資料庫安全最高指導原則
- [安全 Migration 指南](../../docs/SAFE_MIGRATION_GUIDE.md) - Migration 安全操作指南
- [備份與還原快速參考](../../docs/BACKUP_RESTORE_CHEATSHEET.md) - 快速操作指令
- [現有備份腳本 (Bash)](../../scripts/backup-before-deploy.sh) - 生產環境部署前備份腳本

---

## 八、總結與建議

### 8.1 關鍵決策

| 項目 | 決策 | 理由 |
|------|------|------|
| **備份格式** | `plain` (SQL 文字檔) | 容易檢視與編輯，適合本機開發 |
| **必須參數** | `--clean --if-exists --no-owner --no-acl` | 確保還原成功，避免權限問題 |
| **命名格式** | `YYYYMMDD_HHMMSS_reason.sql` | 可排序、可讀性高、包含備份原因 |
| **元數據格式** | JSON | 標準化、易於解析、支援擴充 |
| **清理策略** | 保留最近 10 次備份 | 平衡磁碟空間與安全性 |

### 8.2 下一步行動

1. ✅ 完成研究報告（本文件）
2. 📝 設計 PowerShell 腳本架構
3. 🛠️ 實作 `Backup-Database.ps1` 腳本
4. 🛠️ 實作 `Restore-Database.ps1` 腳本
5. 🛠️ 實作 `List-Backups.ps1` 腳本
6. ✅ 整合到 `package.json` 腳本
7. 📖 撰寫使用者文件

---

**研究完成日期**: 2026-01-07
**文件版本**: 1.0.0
**研究者**: Claude Sonnet 4.5 (via Claude Code)
