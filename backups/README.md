# Vsale-lite 備份目錄
# Backup Directory

此目錄用於儲存資料庫備份檔案（**僅限本機，不 commit 到 Git**）。

---

## 📁 檔案結構

```
backups/
├── README.md                              # 本檔案
├── DISASTER_RECOVERY_TEST_REPORT.md       # 災難恢復測試報告
├── check_db_stats.js                      # 資料庫統計查詢腳本
├── YYYYMMDD_HHMMSS_manual_backup.sql      # 手動備份檔案
├── YYYYMMDD_HHMMSS_metadata.json          # 備份元數據
└── (其他備份檔案)
```

---

## 🚀 快速上手

### 備份雲端資料庫

```bash
# 方法 1: 使用 PowerShell 腳本（推薦）
.\scripts\db-backup.ps1

# 方法 2: 使用 Supabase CLI
supabase db dump -f "./backups/schema_$(date +%Y%m%d_%H%M%S).sql"  # Schema only
supabase db dump --data-only -f "./backups/data_$(date +%Y%m%d_%H%M%S).sql"  # Data only
```

### 還原雲端資料庫

```bash
# 使用 PostgreSQL psql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f "./backups/data_YYYYMMDD_HHMMSS.sql"

# 或使用 Supabase Dashboard SQL Editor
# 1. 開啟 https://supabase.com/dashboard/project/qwovavytryvgchcowjof/sql
# 2. 複製備份檔案內容
# 3. 執行 SQL
```

### 檢查資料庫狀態

```bash
cd backups
node check_db_stats.js
```

---

## ⚠️ 重要提醒

### Git 忽略規則

**備份檔案不應 commit 到版本控制**。請確保 `.gitignore` 包含：

```gitignore
# 資料庫備份檔案
backups/*.sql
backups/*.dump
backups/*.tar.gz
backups/*.json
!backups/README.md
!backups/check_db_stats.js
!backups/DISASTER_RECOVERY_TEST_REPORT.md
```

### 安全注意事項

1. ❌ **不要將備份檔案 commit 到 Git**（包含敏感資料）
2. ✅ **定期清理舊備份**（保留最近 30 天）
3. ✅ **上傳到私有雲端儲存**（S3、Google Cloud Storage）
4. ✅ **加密敏感備份**（使用 GPG 或 7-Zip AES-256）

---

## 📖 相關文件

- [災難恢復測試報告](./DISASTER_RECOVERY_TEST_REPORT.md) - 完整測試流程與結果
- [安全 Migration 指南](../docs/SAFE_MIGRATION_GUIDE.md) - Migration 最佳實踐
- [備份還原速查表](../docs/BACKUP_RESTORE_CHEATSHEET.md) - 常用指令參考

---

**最後更新**: 2026-01-09
