# Vercel 環境變數設定指南

## 問題診斷
線上版本備份失敗，錯誤訊息：
```
Missing required database environment variables:
DB_HOST, DB_PORT, DB_NAME, DB_PASSWORD
```

## 解決方案：設定 Vercel 環境變數

### 方法 1: 使用 Vercel Dashboard（推薦 - 最簡單）

#### 1. 前往 Vercel 專案設定
https://vercel.com/haraluyas-projects/vsale/settings/environment-variables

#### 2. 新增環境變數

點擊 "Add New" 按鈕，逐一新增以下環境變數：

| 變數名稱 | 值 | 環境 |
|---------|---|------|
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Production, Preview, Development |
| `DB_PORT` | `6543` | Production, Preview, Development |
| `DB_NAME` | `postgres` | Production, Preview, Development |
| `DB_USER` | `postgres.qwovavytryvgchcowjof` | Production, Preview, Development |
| `DB_PASSWORD` | （你的 Supabase 資料庫密碼） | Production, Preview, Development |

**重要提示**：
- ✅ 勾選所有環境（Production、Preview、Development）
- ✅ 使用 "Sensitive" 類型來隱藏密碼
- ✅ 儲存後需要重新部署

#### 3. 儲存並重新部署

點擊 "Save" 後，Vercel 會提示你重新部署。點擊 "Redeploy" 按鈕。

---

### 方法 2: 使用 Vercel CLI

#### 1. 安裝 Vercel CLI
```bash
npm install -g vercel
```

#### 2. 登入 Vercel
```bash
vercel login
```

#### 3. 連結專案
```bash
cd d:\APP\vsale
vercel link
```

#### 4. 設定環境變數
```bash
# Production 環境
vercel env add DB_HOST production
# 輸入: aws-0-ap-southeast-1.pooler.supabase.com

vercel env add DB_PORT production
# 輸入: 6543

vercel env add DB_NAME production
# 輸入: postgres

vercel env add DB_USER production
# 輸入: postgres.qwovavytryvgchcowjof

vercel env add DB_PASSWORD production
# 輸入: 你的 Supabase 資料庫密碼

# Preview 環境（重複上述步驟，將 production 改為 preview）
vercel env add DB_HOST preview
# ...

# Development 環境（重複上述步驟，將 production 改為 development）
vercel env add DB_HOST development
# ...
```

#### 5. 驗證設定
```bash
# 列出所有環境變數
vercel env ls
```

#### 6. 重新部署
```bash
vercel --prod
```

---

## 如何取得 Supabase 資料庫連線資訊

### 步驟 1: 前往 Supabase Dashboard
https://supabase.com/dashboard/project/qwovavytryvgchcowjof

### 步驟 2: 進入 Database Settings
1. 點擊左側選單的 **"Settings"**
2. 點擊 **"Database"**

### 步驟 3: 複製連線字串
1. 找到 **"Connection String"** 區塊
2. 選擇 **"Connection pooler"** 模式（推薦，使用 Port 6543）
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
- **DB_PORT**: `6543` （Connection Pooler）
- **DB_NAME**: `postgres`
- **DB_USER**: `postgres.qwovavytryvgchcowjof` （或 `postgres`）
- **DB_PASSWORD**: `your-password`（替換為實際密碼）

**注意**：使用 Connection Pooler (Port 6543) 而非直接連線 (Port 5432)，以避免連線數限制問題。

---

## 快速設定腳本（推薦）

我已經準備好一個自動化腳本，執行以下指令：

```powershell
# 1. 安裝 Vercel CLI（如果尚未安裝）
npm install -g vercel

# 2. 登入 Vercel
vercel login

# 3. 連結專案
cd d:\APP\vsale
vercel link

# 4. 執行設定腳本（互動式輸入）
node scripts/setup-vercel-env-auto.mjs
```

---

## 驗證設定

### 1. 檢查環境變數是否生效

前往 Vercel Dashboard:
https://vercel.com/haraluyas-projects/vsale/settings/environment-variables

確認所有 5 個環境變數都已正確設定。

### 2. 觸發重新部署

前往 Deployments 頁面:
https://vercel.com/haraluyas-projects/vsale/deployments

點擊最新的部署 → 點擊右上角的 "..." → 選擇 "Redeploy"

### 3. 測試備份功能

等待重新部署完成後，前往線上版本的備份管理頁面：
https://vsale-lite.vercel.app/admin/system/settings

點擊 "立即備份" 按鈕，檢查是否成功。

---

## 同步 GCS 備份記錄到資料庫

如果你已經還原資料庫，導致 `backup_jobs` 表的記錄消失，但 GCS 中的備份檔案還在，可以執行同步腳本：

```bash
# 同步 GCS 備份檔案到資料庫
node scripts/sync-backup-records.mjs
```

這會自動掃描 GCS 中的備份檔案，並在資料庫中重新建立對應的記錄。

---

## 常見問題

### Q1: 設定後備份還是失敗？
**A**:
1. 確認環境變數已正確儲存（Vercel Dashboard）
2. 確認已重新部署應用程式
3. 檢查 Vercel Logs 查看詳細錯誤訊息
4. 確認 Supabase 資料庫連線正常

### Q2: 如何查看 Vercel Logs？
**A**:
1. 前往 Vercel Dashboard
2. 選擇你的專案
3. 點擊 "Deployments" 標籤
4. 點擊最新的部署
5. 點擊 "Functions" 標籤查看 Server Actions 的執行記錄

### Q3: Connection Pooler 與 Direct Connection 的差異？
**A**:
- **Connection Pooler (Port 6543)** - 推薦，適合 Serverless 環境，避免連線數限制
- **Direct Connection (Port 5432)** - 直接連線，可能會遇到連線數限制

Vercel 是 Serverless 環境，強烈建議使用 Connection Pooler。

### Q4: 環境變數與 .env.local 的差異？
**A**:
- `.env.local` - 本機開發環境使用
- Vercel 環境變數 - 線上生產環境使用
- 兩者需要分別設定

---

## 安全性提醒

⚠️ **資料庫密碼是敏感資訊，請務必：**
1. 使用 Vercel "Sensitive" 類型儲存（預設會自動隱藏）
2. 不要將密碼提交到 Git Repository
3. 定期更換資料庫密碼
4. 限制 Vercel 專案的存取權限

---

## 相關文件

- Vercel 環境變數: https://vercel.com/docs/projects/environment-variables
- Supabase Connection Pooler: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- 備份系統規格: `specs/015-cloud-backup/spec.md`
- 同步備份記錄: `scripts/sync-backup-records.mjs`
