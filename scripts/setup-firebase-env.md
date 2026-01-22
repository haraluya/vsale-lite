# Firebase App Hosting 環境變數設定指南

## 問題診斷
線上版本備份失敗，錯誤訊息：
```
Missing required database environment variables:
DB_HOST, DB_PORT, DB_NAME, DB_PASSWORD
```

## 解決方案：設定 Firebase 環境變數

### 方法 1: 使用 Firebase CLI（推薦）

#### 1. 確認已登入 Firebase
```bash
firebase login
```

#### 2. 設定環境變數
```bash
# 設定資料庫連線資訊（替換為你的實際值）
firebase apphosting:secrets:set DB_HOST --data-file -
# 輸入: aws-0-ap-southeast-1.pooler.supabase.com
# 按 Ctrl+D (Windows) 或 Ctrl+Z (Mac) 結束輸入

firebase apphosting:secrets:set DB_PORT --data-file -
# 輸入: 6543

firebase apphosting:secrets:set DB_NAME --data-file -
# 輸入: postgres

firebase apphosting:secrets:set DB_USER --data-file -
# 輸入: postgres.qwovavytryvgchcowjof
# （或直接輸入 postgres）

firebase apphosting:secrets:set DB_PASSWORD --data-file -
# 輸入: 你的 Supabase 資料庫密碼
```

#### 3. 驗證設定
```bash
# 列出所有環境變數
firebase apphosting:secrets:list
```

#### 4. 重新部署
```bash
# 觸發重新部署以套用新的環境變數
firebase deploy --only hosting
```

---

### 方法 2: 使用 Firebase Console（網頁介面）

#### 1. 前往 Firebase Console
https://console.firebase.google.com/project/vsale-lite/apphosting

#### 2. 選擇你的 App Hosting 應用

#### 3. 點擊 "Settings"（設定）標籤

#### 4. 找到 "Environment Variables"（環境變數）區塊

#### 5. 新增以下環境變數

點擊 "Add Variable" 按鈕，逐一新增：

| 變數名稱 | 值 | 類型 |
|---------|---|------|
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Secret |
| `DB_PORT` | `6543` | Secret |
| `DB_NAME` | `postgres` | Secret |
| `DB_USER` | `postgres.qwovavytryvgchcowjof` | Secret |
| `DB_PASSWORD` | （你的 Supabase 資料庫密碼） | Secret |

#### 6. 儲存並重新部署

點擊 "Save" 後，Firebase 會自動觸發重新部署。

---

## 如何取得 Supabase 資料庫連線資訊

### 步驟 1: 前往 Supabase Dashboard
https://supabase.com/dashboard/project/qwovavytryvgchcowjof

### 步驟 2: 進入 Database Settings
1. 點擊左側選單的 **"Settings"**
2. 點擊 **"Database"**

### 步驟 3: 複製連線字串
1. 找到 **"Connection String"** 區塊
2. 選擇 **"URI"** 模式
3. 點擊 **"Show"** 顯示密碼
4. 複製完整的連線字串

### 步驟 4: 解析連線字串

連線字串格式：
```
postgresql://postgres.[PROJECT-ID]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

範例：
```
postgresql://postgres.qwovavytryvgchcowjof:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

解析結果：
- **DB_HOST**: `aws-0-ap-southeast-1.pooler.supabase.com`
- **DB_PORT**: `6543`
- **DB_NAME**: `postgres`
- **DB_USER**: `postgres.qwovavytryvgchcowjof`
- **DB_PASSWORD**: `your-password`（替換為實際密碼）

---

## 驗證設定

### 1. 檢查環境變數是否生效

前往線上版本的備份管理頁面：
https://vsale-lite.web.app/admin/system/settings

點擊 "立即備份" 按鈕，檢查是否還有錯誤訊息。

### 2. 查看備份記錄

如果設定正確，應該可以看到：
- 備份狀態：成功（綠色）
- 檔案大小：非 0 KB
- 可以下載備份檔案

---

## 常見問題

### Q1: 找不到 Database Settings？
**A**: 確保你有 Supabase 專案的管理員權限。如果沒有權限，請聯絡專案擁有者。

### Q2: 連線字串中的密碼是什麼？
**A**: 這是你建立 Supabase 專案時設定的資料庫密碼。如果忘記，可以在 Supabase Dashboard 的 Database Settings 中重設密碼。

### Q3: 設定後備份還是失敗？
**A**:
1. 檢查環境變數是否正確儲存（Firebase Console）
2. 確認已重新部署應用程式
3. 檢查 Supabase 資料庫連線是否正常（在本機測試 `supabase db push`）

### Q4: 環境變數與 .env.local 的差異？
**A**:
- `.env.local` - 本機開發環境使用
- Firebase 環境變數 - 線上生產環境使用
- 兩者需要分別設定

---

## 安全性提醒

⚠️ **資料庫密碼是敏感資訊，請務必：**
1. 使用 Firebase Secrets 儲存（不要使用一般環境變數）
2. 不要將密碼提交到 Git Repository
3. 定期更換資料庫密碼
4. 限制 Firebase 專案的存取權限

---

## 相關文件

- Firebase App Hosting 環境變數: https://firebase.google.com/docs/app-hosting/manage-env-vars
- Supabase 資料庫連線: https://supabase.com/docs/guides/database/connecting-to-postgres
- 備份系統規格: `specs/015-cloud-backup/spec.md`
