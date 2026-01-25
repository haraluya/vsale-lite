# Google Cloud Storage 備份設定完整指南 (純網頁操作)

**目標**: 建立一個 GCS Bucket 並設定 Service Account，讓 Vsale 系統可以自動備份資料庫到雲端。

**預估時間**: 15-20 分鐘

---

## 📋 目錄

- [Step 1: 授予自己管理員權限](#step-1-授予自己管理員權限)
- [Step 2: 建立 Storage Bucket](#step-2-建立-storage-bucket)
- [Step 3: 建立 Service Account](#step-3-建立-service-account)
- [Step 4: 授予 Service Account 存取 Bucket 的權限](#step-4-授予-service-account-存取-bucket-的權限)
- [Step 5: 下載 Service Account 金鑰](#step-5-下載-service-account-金鑰)
- [Step 6: 設定專案環境變數](#step-6-設定專案環境變數)
- [Step 7: 測試備份功能](#step-7-測試備份功能)

---

## Step 1: 授予自己管理員權限

> ⚠️ **重要**: 這步驟確保您有足夠權限完成後續操作

### 1.1 開啟 IAM 頁面

**連結**: [https://console.cloud.google.com/iam-admin/iam?project=vsale-backup](https://console.cloud.google.com/iam-admin/iam?project=vsale-backup)

### 1.2 授予權限

1. 點擊頁面頂部的「**授予存取權**」或「**GRANT ACCESS**」按鈕

2. 在右側彈出的面板中填寫:
   - **新增主體 (New principals)**: `haraluya777@gmail.com`
   - **選取角色 (Select a role)**:
     - 搜尋「Owner」或「擁有者」
     - 選擇「**Owner (擁有者)**」

3. 點擊「**儲存 (Save)**」

### 1.3 驗證權限

重新整理頁面，您應該會在列表中看到:
```
haraluya777@gmail.com    Owner (擁有者)
```

✅ **權限設定完成！** 現在您可以進行所有後續操作。

---

## Step 2: 建立 Storage Bucket

### 2.1 開啟 Cloud Storage 頁面

**連結**: [https://console.cloud.google.com/storage/browser?project=vsale-backup](https://console.cloud.google.com/storage/browser?project=vsale-backup)

### 2.2 建立 Bucket

1. 點擊頁面頂部的「**建立值區 (CREATE BUCKET)**」按鈕

2. **設定 Bucket 名稱**:
   ```
   vsale-backups
   ```
   > 📌 **注意**: Bucket 名稱在全球唯一，如果已被使用，請改用 `vsale-backups-YOUR_NAME` (例如: `vsale-backups-haraluya`)

3. **選擇資料儲存位置** (Choose where to store your data):
   - 點選「**Region (區域)**」
   - 下拉選單選擇「**asia-east1 (Taiwan)**」

4. **選擇資料儲存類別** (Choose a storage class):
   - 點選「**Standard**」

5. **選擇存取控制** (Choose how to control access):
   - 點選「**Uniform (統一)**」

6. **資料保護** (Data protection):
   - 保持預設值 (不需勾選任何選項)

7. 點擊頁面底部的「**建立 (CREATE)**」按鈕

### 2.3 驗證 Bucket 已建立

您應該會看到:
- 左側列表出現「**vsale-backups**」
- 頁面顯示「Bucket 詳細資料」

✅ **Bucket 建立完成！**

---

## Step 3: 建立 Service Account

### 3.1 開啟 Service Accounts 頁面

**連結**: [https://console.cloud.google.com/iam-admin/serviceaccounts?project=vsale-backup](https://console.cloud.google.com/iam-admin/serviceaccounts?project=vsale-backup)

### 3.2 建立 Service Account

1. 點擊頁面頂部的「**建立服務帳戶 (CREATE SERVICE ACCOUNT)**」按鈕

2. **服務帳戶詳細資料** (Service account details):
   - **服務帳戶名稱**: `vsale-backup`
   - **服務帳戶 ID**: `vsale-backup` (自動產生，不需修改)
   - **說明**: `用於自動備份系統的服務帳號`

3. 點擊「**建立並繼續 (CREATE AND CONTINUE)**」

4. **授予這個服務帳戶專案存取權** (Grant this service account access to project):
   - 點擊「**選取角色 (Select a role)**」下拉選單
   - 搜尋「Storage Object Admin」
   - 選擇「**Storage Object Admin (儲存空間物件管理員)**」

5. 點擊「**繼續 (CONTINUE)**」

6. **授予使用者這個服務帳戶的存取權** (Grant users access to this service account):
   - **跳過這步驟**，直接點擊「**完成 (DONE)**」

### 3.3 驗證 Service Account 已建立

您應該會看到列表中出現:
```
vsale-backup@vsale-backup.iam.gserviceaccount.com
```

✅ **Service Account 建立完成！**

---

## Step 4: 授予 Service Account 存取 Bucket 的權限

> 📌 **為什麼需要這步驟？**
> Service Account 雖然有「Storage Object Admin」角色，但需要**明確授權**才能存取特定 Bucket。

### 4.1 返回 Cloud Storage 頁面

**連結**: [https://console.cloud.google.com/storage/browser?project=vsale-backup](https://console.cloud.google.com/storage/browser?project=vsale-backup)

### 4.2 設定 Bucket 權限

1. 在左側列表中，點擊「**vsale-backups**」Bucket 名稱

2. 切換到「**權限 (PERMISSIONS)**」分頁 (頁面頂部)

3. 點擊「**授予存取權 (GRANT ACCESS)**」按鈕

4. 在右側彈出的面板中填寫:
   - **新增主體 (New principals)**:
     ```
     vsale-backup@vsale-backup.iam.gserviceaccount.com
     ```
   - **選取角色 (Select a role)**:
     - 搜尋「Storage Object Admin」
     - 選擇「**Storage Object Admin**」

5. 點擊「**儲存 (Save)**」

### 4.3 驗證權限

在「權限」分頁中，您應該會看到:
```
vsale-backup@vsale-backup.iam.gserviceaccount.com    Storage Object Admin
```

✅ **Bucket 權限設定完成！**

---

## Step 5: 下載 Service Account 金鑰

> 🔐 **安全提醒**: 這個 JSON 金鑰檔案等同於「萬能鑰匙」，務必妥善保管，**不要上傳到 Git**！

### 5.1 開啟 Service Accounts 頁面

**連結**: [https://console.cloud.google.com/iam-admin/serviceaccounts?project=vsale-backup](https://console.cloud.google.com/iam-admin/serviceaccounts?project=vsale-backup)

### 5.2 建立金鑰

1. 點擊「**vsale-backup@vsale-backup.iam.gserviceaccount.com**」這一列的**任何位置** (會進入詳細頁面)

2. 切換到「**金鑰 (KEYS)**」分頁 (頁面頂部)

3. 點擊「**新增金鑰 (ADD KEY)**」下拉選單

4. 選擇「**建立新的金鑰 (Create new key)**」

5. 在彈出視窗中:
   - 選擇「**JSON**」格式 (預設已選)
   - 點擊「**建立 (CREATE)**」

6. **金鑰檔案會自動下載** 到您的「下載」資料夾，檔名類似:
   ```
   vsale-backup-a1b2c3d4e5f6.json
   ```

### 5.3 移動金鑰檔案到專案目錄

**方法 1: 使用檔案總管 (推薦)**

1. 開啟「下載」資料夾
2. 找到剛下載的 `vsale-backup-XXXXXX.json` 檔案
3. **剪下 (Ctrl+X)** 該檔案
4. 前往專案根目錄: `d:\APP\vsale\`
5. **貼上 (Ctrl+V)**
6. **重新命名**為: `service-account-key.json`

**方法 2: 使用指令** (如果您知道檔案的完整名稱)

在 PowerShell 或 CMD 中執行:
```powershell
# 替換 XXXXXX 為實際的檔案名稱
move C:\Users\YOUR_USERNAME\Downloads\vsale-backup-XXXXXX.json d:\APP\vsale\service-account-key.json
```

### 5.4 驗證檔案位置

確認 `d:\APP\vsale\service-account-key.json` 存在，並且內容類似:
```json
{
  "type": "service_account",
  "project_id": "vsale-backup",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "vsale-backup@vsale-backup.iam.gserviceaccount.com",
  ...
}
```

✅ **金鑰下載完成！**

---

## Step 6: 設定專案環境變數

### 6.1 開啟 `.env.local` 檔案

使用 VSCode 或任何文字編輯器開啟:
```
d:\APP\vsale\.env.local
```

### 6.2 新增 GCS 設定

在檔案**最下方**新增以下內容:

```env
# ========================================
# Google Cloud Storage 備份設定
# ========================================

# GCS Bucket 名稱
GCS_BUCKET_NAME=vsale-backups

# Service Account 金鑰檔案路徑 (相對於專案根目錄)
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

> 📌 **注意**:
> - 如果您的 Bucket 名稱不是 `vsale-backups`，請修改 `GCS_BUCKET_NAME` 的值
> - 金鑰檔案路徑使用相對路徑 `./service-account-key.json` (從專案根目錄計算)

### 6.3 儲存檔案

- **VSCode**: `Ctrl+S`
- **記事本**: `Ctrl+S` 或「檔案 > 儲存」

### 6.4 驗證 `.gitignore` 已排除金鑰檔案

開啟 `d:\APP\vsale\.gitignore`，確認包含以下內容:

```gitignore
# Service Account 金鑰 (絕對不要上傳到 Git!)
service-account-key.json
```

如果沒有，請手動新增這行。

✅ **環境變數設定完成！**

---

## Step 7: 測試備份功能

### 7.1 重啟開發伺服器 (如果正在執行)

如果您的 `pnpm dev` 正在執行，請重啟以載入新的環境變數:

```powershell
# 按 Ctrl+C 停止
# 然後重新啟動
pnpm dev
```

### 7.2 執行測試備份指令

在專案根目錄執行:

```powershell
# 方法 1: 使用 PowerShell 腳本 (如果已建立)
.\scripts\db-backup.ps1

# 方法 2: 使用 Node.js 直接測試 (需要建立測試腳本)
node scripts/test-gcs-upload.js
```

### 7.3 驗證備份檔案已上傳

**方法 1: 使用 GCP Console (推薦)**

1. 前往 [Cloud Storage Browser](https://console.cloud.google.com/storage/browser/vsale-backups?project=vsale-backup)
2. 您應該會看到類似的檔案:
   ```
   vsale_backup_20260109_143022.sql
   ```

**方法 2: 使用 gsutil CLI**

```powershell
gsutil ls gs://vsale-backups/
```

### 7.4 預期輸出

成功的備份應該會顯示:
```
✅ 備份成功上傳到 GCS
📦 檔案名稱: vsale_backup_20260109_143022.sql
🔗 GCS 路徑: gs://vsale-backups/vsale_backup_20260109_143022.sql
```

✅ **備份功能測試完成！**

---

## 🎉 完成檢查清單

請確認以下所有項目都已完成:

- [ ] **Step 1**: ✅ 授予自己 Owner 權限
- [ ] **Step 2**: ✅ 建立 `vsale-backups` Bucket (asia-east1 區域)
- [ ] **Step 3**: ✅ 建立 `vsale-backup` Service Account
- [ ] **Step 4**: ✅ 授予 Service Account 存取 Bucket 的權限
- [ ] **Step 5**: ✅ 下載並移動 `service-account-key.json` 到專案根目錄
- [ ] **Step 6**: ✅ 在 `.env.local` 設定環境變數
- [ ] **Step 7**: ✅ 執行測試備份並在 GCS Console 看到檔案

---

## 🔧 常見問題排除

### Q1: Bucket 名稱已被使用

**錯誤訊息**: "The bucket you tried to create already exists"

**解決方法**:
- 改用 `vsale-backups-YOUR_NAME` (例如: `vsale-backups-haraluya`)
- 記得同步修改 `.env.local` 的 `GCS_BUCKET_NAME`

### Q2: Service Account 找不到

**症狀**: 在「授予存取權」時輸入 Service Account Email 顯示「找不到」

**解決方法**:
- 確認 Service Account Email 正確: `vsale-backup@vsale-backup.iam.gserviceaccount.com`
- 確認您已完成 Step 3 建立 Service Account

### Q3: 測試備份時顯示「權限不足」

**錯誤訊息**: "403 Forbidden" 或 "Permission denied"

**解決方法**:
- 確認 Step 4 已正確授予 Service Account 權限
- 前往 [Bucket 權限頁面](https://console.cloud.google.com/storage/browser/vsale-backups;tab=permissions?project=vsale-backup) 檢查

### Q4: 找不到金鑰檔案

**症狀**: 執行備份時顯示「Cannot find service-account-key.json」

**解決方法**:
- 確認檔案位置: `d:\APP\vsale\service-account-key.json`
- 確認檔案名稱完全正確 (不要有多餘的空格或副檔名)
- 確認 `.env.local` 的 `GOOGLE_APPLICATION_CREDENTIALS` 路徑正確

### Q5: 環境變數沒有載入

**症狀**: 程式顯示 `GCS_BUCKET_NAME is undefined`

**解決方法**:
- 確認 `.env.local` 已儲存
- 重啟開發伺服器 (`Ctrl+C` 然後 `pnpm dev`)
- 確認變數名稱沒有拼寫錯誤

---

## 📚 補充資源

- [Google Cloud Storage 官方文件](https://cloud.google.com/storage/docs)
- [Service Account 最佳實踐](https://cloud.google.com/iam/docs/best-practices-for-using-service-accounts)
- [GCS 定價說明](https://cloud.google.com/storage/pricing)

---

## 🔐 安全建議

1. **絕對不要**將 `service-account-key.json` 上傳到 Git
2. **定期輪換** Service Account 金鑰 (建議每 90 天)
3. **啟用 GCS 物件版本控制** (可在 Bucket 設定中啟用)
4. **設定 Lifecycle Policy** 自動刪除舊備份 (例如保留 30 天)

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-09
**適用專案**: Vsale-lite
**作者**: Claude Code
