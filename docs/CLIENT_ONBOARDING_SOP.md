# Vsale-lite 客戶開站 SOP（單一 GitHub + 多客戶 Vercel）

**架構說明**: 您的 GitHub 帳號管理所有客戶的程式碼，每個客戶使用自己的 Vercel 帳號部署

**適用情境**:
- 您統一管理程式碼維護與更新
- 客戶各自承擔 Vercel 費用
- 每個客戶獨立 Supabase 資料庫
- 自動部署功能（push to master → 自動更新）

**預估時間**: 每個新客戶約 1-1.5 小時

---

## 架構圖

```
您的 GitHub 帳號
  └── vsale-client-a (Private Repo)
        ├── push to master
        └──→ Vercel 自動部署 ──→ 客戶A的 Vercel 帳號
                                    └──→ 客戶A的 Supabase 資料庫

您的 GitHub 帳號
  └── vsale-client-b (Private Repo)
        ├── push to master
        └──→ Vercel 自動部署 ──→ 客戶B的 Vercel 帳號
                                    └──→ 客戶B的 Supabase 資料庫
```

---

## 前置準備（一次性設定）

### 1. 準備主專案範本

在您的本機確保主專案是最新版本：

```bash
cd d:\APP\vsale
git checkout master
git pull origin master
```

---

## 開站流程

### 階段 1: GitHub 準備（您執行，10 分鐘）

#### 1.1 建立客戶專用 Repository

**方法 A: 透過 GitHub 網頁（建議）**

1. 前往 https://github.com/new
2. 填寫資訊：
   - **Repository name**: `vsale-client-{客戶名稱}`（例如：`vsale-client-abc`）
   - **Description**: `Vsale-lite B2B 訂貨系統 - {客戶公司名稱}`
   - **可見性**: **Private**（重要！保護客戶資料）
   - ✅ **勾選** "Add a README file"
3. 點擊 "Create repository"

**方法 B: 透過指令（進階）**

```bash
# 建立新資料夾
cd d:\APP
mkdir vsale-client-abc
cd vsale-client-abc

# 複製主專案
xcopy /E /I /H d:\APP\vsale\* .

# 刪除 Git 歷史
rmdir /S /Q .git

# 初始化新 Git Repo
git init
git add .
git commit -m "feat: 初始化客戶站點

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 推送到 GitHub（需先在 GitHub 建立空 repo）
git remote add origin https://github.com/YOUR_USERNAME/vsale-client-abc.git
git branch -M master
git push -u origin master
```

#### 1.2 Repository 權限設定（可選）

如果客戶需要查看程式碼：
1. 前往 Repo → Settings → Collaborators
2. 點擊 "Add people"
3. 輸入客戶的 GitHub 帳號
4. 選擇權限：**Read**（唯讀，防止誤改）

---

### 階段 2: Supabase 建立（您或客戶執行，20 分鐘）

#### 2.1 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 點擊 "New Project"
3. 填寫資訊：
   - **Name**: `vsale-client-abc`
   - **Database Password**: 自動生成（務必記錄！）
   - **Region**: `Southeast Asia (Singapore)`
   - **Pricing Plan**: Free（或依需求選擇）
4. 等待專案建立（約 2 分鐘）

#### 2.2 記錄 Supabase 連線資訊

前往 Project Settings → API，記錄以下資訊：

| 項目 | 位置 | 範例值 |
|------|------|--------|
| **Project URL** | Configuration → URL | `https://abcdefgh.supabase.co` |
| **Project ID** | 從 URL 取得 | `abcdefgh` |
| **Anon Key** | Project API keys → anon public | `eyJhbGc...` |
| **Service Role Key** | Project API keys → service_role | `eyJhbGc...` |

前往 Project Settings → Database，記錄：

| 項目 | 位置 | 範例值 |
|------|------|--------|
| **Database Password** | 建立專案時設定的密碼 | `your-password-here` |
| **Host** | Connection parameters → Host | `aws-0-ap-southeast-1.pooler.supabase.com` |
| **Port** | Connection parameters → Port | `6543` |

#### 2.3 推送 Migration 到 Supabase

**在您的本機執行**：

```bash
# 切換到主專案目錄
cd d:\APP\vsale

# 推送 Migration（替換 PROJECT_ID）
supabase db push --project-ref abcdefgh
```

**驗證 Migration 狀態**：

```bash
supabase migration list --project-ref abcdefgh
```

應該看到 8 個 Migration 都顯示 ✅ Applied

#### 2.4 建立管理員帳號

在 Supabase Dashboard → SQL Editor，執行以下 SQL：

```sql
-- 建立管理員帳號
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@client-abc.com',  -- 替換為客戶 Email
  crypt('Admin123456!', gen_salt('bf')),  -- 替換為安全密碼
  now(),
  now(),
  now(),
  '',
  '{"role": "admin"}'::jsonb,
  '{}'::jsonb
);

-- 建立 profiles 記錄
INSERT INTO profiles (user_id, role, display_name)
SELECT id, 'admin', '系統管理員'
FROM auth.users
WHERE email = 'admin@client-abc.com';
```

**記錄管理員帳號**：
- Email: `admin@client-abc.com`
- Password: `Admin123456!`

---

### 階段 3: Vercel 設定（客戶執行，您協助，30 分鐘）

#### 3.1 客戶註冊 Vercel 帳號

引導客戶前往 [Vercel](https://vercel.com/signup) 註冊帳號：
- **建議**: 使用 GitHub 登入（簡化流程）
- **Plan**: Hobby（免費）或 Pro（依需求）

#### 3.2 授權客戶存取您的 GitHub Repo

**客戶在 Vercel Dashboard 執行**：

1. 點擊 "Add New..." → "Project"
2. 在 "Import Git Repository" 區域：
   - 如果看不到您的 Repo，點擊 "Adjust GitHub App Permissions"
   - 會跳轉到 GitHub 授權頁面
   - 選擇 "Only select repositories"
   - 勾選 `vsale-client-abc`
   - 點擊 "Save"

**您在 GitHub 執行（如需要）**：

1. 前往 https://github.com/settings/installations
2. 找到客戶的 Vercel 安裝
3. 點擊 "Configure"
4. 在 "Repository access" 選擇 "Only select repositories"
5. 勾選 `vsale-client-abc`
6. 點擊 "Save"

#### 3.3 建立 Vercel 專案

**客戶在 Vercel Dashboard 執行**：

1. 回到 "Add New Project" 頁面
2. 找到 `vsale-client-abc`，點擊 "Import"
3. 填寫專案設定：
   - **Project Name**: `vsale-client-abc`（或自訂）
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`（保持預設）
   - **Build and Output Settings**:
     - Build Command: `pnpm build`
     - Output Directory: `.next`（保持預設）
     - Install Command: `pnpm install`

4. **先不要部署**，點擊 "Environment Variables" 設定環境變數

#### 3.4 設定 Vercel 環境變數

**在 Environment Variables 區域新增以下變數**：

| 變數名稱 | 值 | 環境 |
|---------|---|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [從 Supabase 複製 Anon Key] | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | [從 Supabase 複製 Service Role Key] | **僅 Production** |
| `SITE_IDENTIFIER` | `client-abc` | Production, Preview, Development |

**可選變數（如需要資料庫備份功能）**：

| 變數名稱 | 值 | 環境 |
|---------|---|------|
| `CRON_SECRET` | [隨機生成 32+ 字元] | Production |
| `GCS_PROJECT_ID` | `vsale-backup` | Production |
| `GCS_BUCKET_NAME` | `vsale-backups-client-abc` | Production |
| `GCS_SERVICE_ACCOUNT_KEY` | [GCS JSON 金鑰] | Production |
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Production |
| `DB_PORT` | `6543` | Production |
| `DB_NAME` | `postgres` | Production |
| `DB_USER` | `postgres.abcdefgh` | Production |
| `DB_PASSWORD` | [Supabase Database Password] | Production |

**生成 CRON_SECRET 方式**：
```bash
# 在 PowerShell 執行
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

#### 3.5 部署專案

1. 確認環境變數都已設定
2. 點擊 "Deploy"
3. 等待建置完成（約 2-3 分鐘）
4. 部署成功後會顯示專案 URL（例如：`vsale-client-abc.vercel.app`）

#### 3.6 綁定自訂域名（可選）

**客戶在 Vercel Dashboard 執行**：

1. 前往專案 → Settings → Domains
2. 點擊 "Add"
3. 輸入客戶的域名（例如：`order.client-abc.com`）
4. 依照指示設定 DNS 記錄：
   - **Type**: CNAME
   - **Name**: `order`（或 `@` 如果是根域名）
   - **Value**: `cname.vercel-dns.com`
5. 等待 DNS 生效（最多 48 小時，通常 10 分鐘內）

---

### 階段 4: 功能測試（您或客戶執行，20 分鐘）

#### 4.1 測試清單

訪問客戶的站點（例如：`https://vsale-client-abc.vercel.app`）

**前台測試**：
- [ ] 訪問首頁 `/`（應該自動導向登入頁）
- [ ] 前台登入 `/login`（暫時無法測試，需先建立客戶帳號）
- [ ] 後台登入 `/admin/login`（使用階段 2.4 建立的管理員帳號）

**後台測試**：
- [ ] 登入後台
- [ ] 瀏覽會員等級管理 `/admin/tiers`
- [ ] 建立測試會員等級（例如：「一般會員」）
- [ ] 建立測試客戶帳號 `/admin/users`
  - 手機號碼：`0912345678`
  - 姓名：`測試客戶`
  - 密碼：`test123456`
  - 會員等級：選擇剛建立的等級
- [ ] 登出後台

**前台測試（使用測試帳號）**：
- [ ] 前台登入（手機號碼：`0912345678`，密碼：`test123456`）
- [ ] 瀏覽商品頁面 `/store`（應該是空的，正常）
- [ ] 檢查購物車功能
- [ ] 登出

#### 4.2 驗證自動部署

**在您的本機執行**：

```bash
# 切換到客戶的 Repo
cd d:\APP\vsale-client-abc

# 測試修改（新增測試檔案）
echo "# Test Auto Deploy" > TEST.md
git add TEST.md
git commit -m "test: 測試自動部署功能"
git push origin master
```

**客戶在 Vercel Dashboard 觀察**：
1. 前往專案 → Deployments
2. 應該看到新的部署正在進行
3. 等待部署完成（約 1-2 分鐘）
4. 訪問站點，確認更新已生效

**清理測試檔案**：
```bash
git rm TEST.md
git commit -m "chore: 移除測試檔案"
git push origin master
```

---

### 階段 5: 客戶交付（10 分鐘）

#### 5.1 交付文件

提供給客戶以下資訊：

**📧 交付 Email 範本**

```
主旨：Vsale-lite B2B 訂貨系統 - 站點設定完成

您好，

您的 Vsale-lite 訂貨系統已設定完成，以下是相關資訊：

【站點資訊】
- 網址：https://vsale-client-abc.vercel.app
- 自訂域名：https://order.client-abc.com（如已設定）

【後台管理帳號】
- 登入網址：https://vsale-client-abc.vercel.app/admin/login
- Email：admin@client-abc.com
- 密碼：Admin123456!
- ⚠️ 請登入後立即修改密碼

【Vercel 專案管理】
- Dashboard：https://vercel.com/dashboard
- 您可以在此查看：
  - 部署歷史
  - 網站流量
  - 錯誤日誌
  - 環境變數管理

【Supabase 資料庫管理】
- Dashboard：https://supabase.com/dashboard
- Project ID：abcdefgh
- ⚠️ 請勿直接修改資料庫結構

【重要注意事項】
1. 初次登入後請立即修改管理員密碼
2. 建議啟用 Vercel 的 Email 通知（部署失敗時通知）
3. 資料庫備份已自動啟用（每日 18:00 UTC）
4. 如需協助，請隨時聯繫

【後續操作指南】
請參考附件：
- 《系統使用手冊》
- 《常見問題 FAQ》
- 《聯絡支援方式》

祝您使用愉快！
```

#### 5.2 後續支援說明

**程式碼更新流程**：
1. 您在主專案開發新功能
2. 測試完成後，複製到客戶的 Repo
3. Push 到 master 分支
4. Vercel 自動部署（客戶無需操作）

**Migration 更新流程**（當有資料庫變更時）：
```bash
# 在您的本機執行
cd d:\APP\vsale-client-abc

# 推送新的 Migration
supabase db push --project-ref abcdefgh
```

---

## 常見問題 FAQ

### Q1: 客戶看不到我的 GitHub Repo？

**解決方式**：
1. 確認 Repo 是 Private 且您已授權客戶的 Vercel 存取
2. 客戶在 Vercel 點擊 "Adjust GitHub App Permissions"
3. 您在 GitHub Settings → Installations 確認授權

### Q2: Vercel 部署失敗，顯示 "Build failed"？

**常見原因**：
1. 環境變數未設定或錯誤
   - 檢查 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Node.js 版本不符
   - Vercel 預設使用 Node.js 20.x，應該相容
3. 依賴安裝失敗
   - 確認 `package.json` 和 `pnpm-lock.yaml` 都已推送

**除錯方式**：
- 在 Vercel Dashboard → Deployments → 點擊失敗的部署
- 查看 "Build Logs" 找到錯誤訊息

### Q3: 前台/後台登入失敗？

**檢查步驟**：
1. 確認 Supabase Migration 已推送（`supabase migration list`）
2. 確認管理員帳號已建立（在 Supabase Dashboard → Authentication 查看）
3. 確認環境變數正確（Vercel → Settings → Environment Variables）
4. 檢查 Vercel Function Logs（可能是 RLS 策略問題）

### Q4: 如何為客戶新增測試資料？

**建議流程**：
1. 使用後台介面操作（最安全）
2. 或在 Supabase Dashboard → SQL Editor 執行 SQL
3. **不建議** 直接在 Supabase Table Editor 新增（可能違反 RLS）

### Q5: 客戶想要自己管理程式碼怎麼辦？

**移交流程**：
1. 在 GitHub Repo → Settings → Options → Transfer Ownership
2. 輸入客戶的 GitHub 帳號
3. 客戶接受轉移
4. 在客戶的 Vercel 重新綁定（已自動綁定，無需操作）

---

## 檢查清單

### 開站前檢查

- [ ] 已準備好主專案的最新版本
- [ ] 已與客戶確認域名（如需要）
- [ ] 已與客戶確認管理員 Email
- [ ] 客戶已註冊 Vercel 帳號

### GitHub 階段

- [ ] 已建立客戶專用 Private Repo
- [ ] 已推送完整程式碼
- [ ] 已設定 Repo 權限（如需要）

### Supabase 階段

- [ ] 已建立 Supabase 專案（Singapore 區域）
- [ ] 已記錄所有連線資訊（URL, Keys, Password）
- [ ] 已推送所有 Migration（8 個檔案）
- [ ] 已驗證 Migration 狀態
- [ ] 已建立管理員帳號
- [ ] 已測試管理員登入（在 Supabase Auth 頁面）

### Vercel 階段

- [ ] 客戶已授權存取 GitHub Repo
- [ ] 已建立 Vercel 專案
- [ ] 已設定所有必要環境變數（至少 4 個）
- [ ] 已完成首次部署
- [ ] 已綁定自訂域名（如需要）
- [ ] 已驗證 DNS 生效

### 測試階段

- [ ] 後台登入成功
- [ ] 已建立測試會員等級
- [ ] 已建立測試客戶帳號
- [ ] 前台登入成功
- [ ] 自動部署功能正常

### 交付階段

- [ ] 已提供客戶所有登入資訊
- [ ] 已提供 Vercel 和 Supabase 管理權限說明
- [ ] 已說明後續更新流程
- [ ] 已提供支援聯絡方式

---

## 時間估算

| 階段 | 預估時間 | 執行者 |
|------|---------|-------|
| GitHub 準備 | 10 分鐘 | 您 |
| Supabase 建立 | 20 分鐘 | 您或客戶 |
| Vercel 設定 | 30 分鐘 | 客戶（您協助） |
| 功能測試 | 20 分鐘 | 您或客戶 |
| 客戶交付 | 10 分鐘 | 您 |
| **總計** | **約 1.5 小時** | - |

---

## 下一步

開站完成後，您可能需要：

1. **建立客戶管理表格**（Excel 或 Notion）
   - 記錄每個客戶的 Repo、Supabase ID、Vercel URL
   - 方便日後批次更新

2. **設定批次 Migration 推送腳本**
   - 當有資料庫更新時，一鍵推送到所有客戶

3. **建立版本發布流程**
   - 在主專案標記版本（例如：v1.2.0）
   - 通知客戶更新內容
   - 排程推送到客戶 Repo

4. **設定監控系統**
   - 使用 Vercel Analytics 監控網站效能
   - 設定 Supabase Webhooks 監控資料庫異常

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-22
**維護者**: 您的名字
