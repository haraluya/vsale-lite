# 資料庫重置指南
Database Reset Guide

> **最後更新**: 2026-01-07
> **適用範圍**: 本地開發環境

---

## 🎯 快速開始

### 情境 1：Reset 後想保留資料（推薦）

```powershell
# 自動備份 → Reset → 恢復資料
.\scripts\safe-db-reset-with-data.ps1
```

**適用情況**：
- ✅ 新增或修改 Migration 後需要套用
- ✅ 想保留現有測試資料
- ✅ 資料表結構變更，但資料仍需保留

---

### 情境 2：Reset 後不需要資料（全新開始）

```powershell
# 自動備份 → Reset（無資料恢復）
.\scripts\safe-db-reset.ps1
```

**適用情況**：
- ✅ 想要全新的資料庫環境
- ✅ 測試資料已過時，不需保留
- ✅ 僅需要 Migration 產生的預設資料（如會員等級）

---

### 情境 3：僅備份不 Reset

```powershell
# 手動備份
.\scripts\db-backup.ps1
```

**適用情況**：
- ✅ 在執行危險操作前先備份
- ✅ 定期備份資料
- ✅ 準備部署到生產環境前備份

---

## 📋 腳本對比

| 腳本名稱 | 備份 | Reset | 恢復資料 | 用途 |
|---------|-----|-------|---------|-----|
| `safe-db-reset-with-data.ps1` | ✅ | ✅ | ✅ | **推薦**：保留資料的 Reset |
| `safe-db-reset.ps1` | ✅ | ✅ | ❌ | 全新開始的 Reset |
| `db-backup.ps1` | ✅ | ❌ | ❌ | 僅備份 |
| `db-restore.ps1` | ❌ | ❌ | ✅ | 從備份還原 |

---

## 🔄 完整流程說明

### `safe-db-reset-with-data.ps1` 執行流程

```
Step 1: 檢查 Supabase 服務狀態
   ↓
Step 2: 確認操作（需要輸入 'yes'）
   ↓
Step 3: 執行資料庫備份
   → 備份檔案: backups/YYYYMMDD_HHMMSS_pre_reset_backup.sql
   ↓
Step 4: 執行 supabase db reset
   → 清空資料庫
   → 重建所有資料表（套用 Migrations）
   → 執行 seed.sql（建立預設管理員帳號）
   ↓
Step 5: 恢復資料到新結構
   → 使用 psql 匯入備份資料
   → 自動跳過不相容的資料表
   → 保留 Migration 產生的預設資料
   ↓
Step 6: 驗證資料完整性
   → 統計各資料表的資料筆數
   → 顯示總筆數
```

---

## 📊 資料恢復邏輯

### 什麼會被保留？

✅ **會保留的資料**：
- 使用者建立的所有資料（商品、訂單、客戶等）
- 上傳的圖片（Supabase Storage 不受影響）
- 系統設定

❌ **不會保留的資料**：
- Migration 產生的預設資料會使用新版本（如會員等級的欄位變更）
- 資料表結構變更導致無法相容的資料

### 範例情境

**情境 A：新增欄位**
```sql
-- Migration: 新增 tiers.shipping_fee 欄位
ALTER TABLE tiers ADD COLUMN shipping_fee INTEGER DEFAULT 0;
```
- ✅ 舊資料會保留，新欄位使用預設值

**情境 B：修改欄位型別**
```sql
-- Migration: 將 price 從 INTEGER 改為 DECIMAL
ALTER TABLE products ALTER COLUMN price TYPE DECIMAL(10,2);
```
- ✅ 舊資料會自動轉換型別

**情境 C：刪除欄位**
```sql
-- Migration: 刪除 products.old_field 欄位
ALTER TABLE products DROP COLUMN old_field;
```
- ⚠️ 備份中的 old_field 資料會被忽略

---

## ⚠️ 常見問題

### Q1: Reset 後資料沒有完全恢復？

**可能原因**：
1. 資料表結構變更（欄位新增/刪除/改名）
2. 外鍵約束衝突
3. 預設資料與備份資料衝突（如 tiers 表）

**解決方案**：
```powershell
# 檢查恢復時的錯誤訊息
# 若需要完全還原到備份狀態：
.\scripts\db-restore.ps1
```

---

### Q2: 如何知道哪些資料成功恢復？

腳本執行完畢後會顯示資料表統計：

```
資料表統計:
----------------------------------------
   tiers: 3 筆
   profiles: 15 筆
   categories: 5 筆
   series: 12 筆
   products: 48 筆
   ...
----------------------------------------
   總計: 250 筆資料
```

對比備份前後的筆數即可確認。

---

### Q3: Reset 失敗怎麼辦？

腳本會自動嘗試從備份恢復。若仍失敗：

```powershell
# 1. 檢查 Migration 語法錯誤
.\scripts\db-health-check.ps1

# 2. 手動還原到備份狀態
.\scripts\db-restore.ps1

# 3. 查看最近的備份檔案
ls backups\ | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

---

### Q4: 可以跳過確認提示嗎？

可以，但**不建議**在生產環境使用：

```powershell
# 跳過確認（謹慎使用）
.\scripts\safe-db-reset-with-data.ps1 -SkipConfirmation
```

---

## 🛡️ 安全機制

### 四層保護

1. **預防層**：執行前要求輸入 'yes' 確認
2. **備份層**：自動備份當前資料庫
3. **錯誤處理層**：Reset 失敗自動嘗試還原
4. **驗證層**：完成後驗證資料完整性

### 備份保留策略

- 備份檔案永久保留（不自動刪除）
- 檔案命名格式：`YYYYMMDD_HHMMSS_pre_reset_backup.sql`
- 建議定期清理舊備份（保留最近 10 次）

---

## 📝 最佳實踐

### 開發流程建議

1. **修改 Migration 前**：
   ```powershell
   # 先備份
   .\scripts\db-backup.ps1
   ```

2. **新增 Migration 後**：
   ```powershell
   # 檢查語法
   supabase migration list

   # 套用 Migration 並保留資料
   .\scripts\safe-db-reset-with-data.ps1
   ```

3. **測試完成後**：
   ```powershell
   # 執行健康檢查
   .\scripts\db-health-check.ps1
   ```

---

## 🚀 快速參考

```powershell
# 推薦：Reset 並保留資料
.\scripts\safe-db-reset-with-data.ps1

# 全新開始（清空資料）
.\scripts\safe-db-reset.ps1

# 僅備份
.\scripts\db-backup.ps1

# 從備份還原
.\scripts\db-restore.ps1

# 健康檢查
.\scripts\db-health-check.ps1
```

---

## 📚 相關文件

- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md)
- [安全 Migration 指南](SAFE_MIGRATION_GUIDE.md)
- [備份與還原快速參考](BACKUP_RESTORE_CHEATSHEET.md)
