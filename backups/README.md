# 資料庫備份儲存目錄

此目錄用於儲存本機資料庫備份檔案。

## 檔案命名規則

```
<YYYYMMDD>_<HHMMSS>_<reason>.sql       # 備份檔案
<YYYYMMDD>_<HHMMSS>_metadata.json      # 備份元數據
```

## 範例

```
20260107_120530_before_reset.sql       # 重置前備份
20260107_120530_metadata.json          # 備份元數據（大小、表數量、原因）
```

## 備份保留策略

- **自動清理**: 腳本會自動保留最近 10 次備份
- **手動備份**: 使用 `.\scripts\db-backup.ps1 -Reason "manual_backup"` 建立

## 使用腳本

```powershell
# 建立備份
.\scripts\db-backup.ps1 -Reason "before_migration"

# 還原備份（互動式選擇）
.\scripts\db-restore.ps1
```

## 注意事項

⚠️ **重要**: 此目錄下的所有 `.sql` 和 `.json` 檔案都會被 `.gitignore` 排除，不會提交到 Git。

若需要保留特定備份，請移至其他目錄。
