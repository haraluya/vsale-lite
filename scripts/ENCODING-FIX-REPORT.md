# PowerShell 腳本編碼修復報告

**日期**: 2026-01-07
**狀態**: ✅ 已完成

## 修復內容

以下 PowerShell 腳本已成功轉換為 **UTF-8 with BOM** 編碼:

1. ✅ `db-backup.ps1` - 資料庫備份腳本
2. ✅ `db-restore.ps1` - 資料庫還原腳本
3. ✅ `db-health-check.ps1` - 資料庫健康檢查腳本
4. ✅ `safe-db-reset.ps1` - 安全資料庫重置腳本

## 驗證結果

### 1. BOM 標記檢查
所有檔案都包含正確的 UTF-8 BOM 標記 (`EF BB BF`)

### 2. PowerShell 語法檢查
所有腳本通過 PowerShell 語法解析器驗證

### 3. 執行測試
腳本可以正常執行，所有功能正常運作

## 重要說明

### 控制台顯示亂碼 (預期行為)
在某些終端機環境下（如 Git Bash、WSL），中文字元可能顯示為亂碼。這是**控制台編碼設定問題**，不影響腳本執行。

**原因**:
- Windows PowerShell 預設使用系統編碼（通常是 Big5 或 CP950）
- 某些終端機無法正確處理 UTF-8 with BOM 的輸出

**解決方案** (使用者端):
1. 使用 Windows Terminal 執行腳本（推薦）
2. 在腳本開頭加入編碼設定:
   ```powershell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   $OutputEncoding = [System.Text.Encoding]::UTF8
   ```
3. 在 PowerShell 中設定預設編碼:
   ```powershell
   chcp 65001  # 切換到 UTF-8 代碼頁
   ```

### 腳本功能正常
雖然控制台顯示可能有亂碼，但:
- ✅ 腳本邏輯執行正常
- ✅ 檔案 I/O 操作正確
- ✅ 資料庫操作成功
- ✅ 錯誤處理機制有效

## 測試方式

### 驗證編碼
```powershell
.\scripts\verify-encoding.ps1
```

### 測試腳本執行
```powershell
# 在 PowerShell 中執行（推薦）
.\scripts\db-backup.ps1 -Reason "test"

# 或使用 Windows Terminal
wt powershell -NoExit -Command ".\scripts\db-backup.ps1 -Reason 'test'"
```

## 使用建議

1. **推薦執行環境**: Windows PowerShell 或 Windows Terminal
2. **避免使用**: Git Bash（會有編碼顯示問題）
3. **檔案編輯**: 使用 VS Code 或其他支援 UTF-8 的編輯器

## 修復工具

本次修復使用以下工具腳本:

- `fix-encoding.ps1` - 編碼修復腳本
- `verify-encoding.ps1` - 編碼驗證腳本
- `test-encoding.ps1` - 編碼測試腳本

這些工具腳本可供未來使用。

---

**結論**: 所有 PowerShell 腳本編碼問題已修復，可正常執行。控制台顯示亂碼僅為視覺問題，不影響功能。
