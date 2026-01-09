# Vsale-lite 備份目錄
# Backup Directory

⚠️ **重要通知：本專案已改用雲端備份系統**

---

## 🔄 系統變更說明

自 2026-01-09 起，Vsale-lite 已將備份系統從**本地 Docker 備份**遷移至**雲端備份系統（Google Cloud Storage）**。

### 為什麼改用雲端備份？

1. ✅ **自動化備份**: 每日凌晨 2:00 自動執行（Vercel Cron）
2. ✅ **可靠性**: 備份儲存在 Google Cloud Storage（雙重備援：GCS + Vercel Blob）
3. ✅ **易於管理**: 後台 UI 可查看、下載、刪除備份
4. ✅ **滾動刪除**: 自動保留最近 10 個自動備份
5. ✅ **災難恢復**: 備份永久保留在雲端，無需擔心本地檔案遺失

### 舊系統功能（已移除）

以下功能已不再使用：

❌ 本地 Docker 備份腳本（`scripts/db-backup.ps1` 等 8 個腳本）
❌ 本地備份檔案儲存（`backups/*.sql`）
❌ 手動備份與還原流程

---

## 🚀 新系統使用方式

### 1. 手動觸發備份

**前台管理介面**:
1. 登入後台：https://your-production-url.vercel.app/admin/login
2. 前往「系統設定」：https://your-production-url.vercel.app/admin/system/settings
3. 點擊「立即備份」按鈕
4. 等待備份完成（通常 30-60 秒）

**命令列（使用 Cron API）**:
```bash
curl -X GET https://your-production-url.vercel.app/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. 查看備份列表

前往後台「系統設定」頁面，捲動到「備份管理」區塊，可查看：
- 備份狀態（成功/失敗/進行中）
- 上次成功備份時間
- 備份列表（檔名、大小、類型、時間）

### 3. 下載備份

在備份列表中點擊「下載」按鈕：
- 系統會產生臨時簽名 URL（有效期 1 小時）
- 瀏覽器自動下載 `.sql.gz` 檔案
- 使用 `gunzip` 解壓縮後可在 Supabase SQL Editor 執行

### 4. 還原備份

**方式 1: Supabase Dashboard（推薦）**:
1. 下載並解壓縮備份檔案（`.sql.gz` → `.sql`）
2. 開啟 Supabase Dashboard → SQL Editor
3. 複製 `.sql` 檔案內容
4. 執行 SQL（需 5-10 分鐘）

**方式 2: psql 命令列**:
```bash
gunzip vsale-backup-20260109-020000.sql.gz
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f "./vsale-backup-20260109-020000.sql"
```

### 5. 刪除備份

在備份列表中點擊「刪除」按鈕：
- 系統會顯示確認對話框（使用統一對話框系統）
- 確認後從 GCS 刪除檔案 + 從資料庫刪除記錄
- 自動備份會滾動刪除（保留最近 10 個）
- 手動備份永久保留（需手動刪除）

---

## 📖 相關文件

- **雲端備份指南**: [`docs/CLOUD_BACKUP_GUIDE.md`](../docs/CLOUD_BACKUP_GUIDE.md) - GCS 設定與使用
- **備份還原指南**: [`docs/BACKUP_RESTORE_CLOUD.md`](../docs/BACKUP_RESTORE_CLOUD.md) - 雲端備份還原流程
- **部署檢查清單**: [`docs/BACKUP_DEPLOYMENT_CHECKLIST.md`](../docs/BACKUP_DEPLOYMENT_CHECKLIST.md) - 部署前檢查
- **功能規格**: [`specs/015-cloud-backup/spec.md`](../specs/015-cloud-backup/spec.md) - 完整技術規格

---

## 🔒 安全注意事項

1. ✅ **環境變數保護**: GCS 金鑰儲存在 Vercel 環境變數（不 commit 到 Git）
2. ✅ **最小權限 IAM**: GCS Service Account 僅擁有 Storage Object Creator + Viewer 權限
3. ✅ **RLS 權限控制**: 僅管理員可查看、下載、刪除備份
4. ✅ **雙重備援**: GCS 失敗時自動切換到 Vercel Blob

---

## 📦 舊系統歸檔

舊的本地 Docker 備份系統文檔已歸檔到：
- [`docs/.archive/local-docker-backup/`](../docs/.archive/local-docker-backup/)

---

**最後更新**: 2026-01-09
**系統版本**: Vsale-lite v2.0 (Cloud Backup)
