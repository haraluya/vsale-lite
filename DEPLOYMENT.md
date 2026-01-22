# Vsale-lite 部署指南（舊版）

> ⚠️ **此文件已歸檔** - 本文件包含舊版部署資訊，僅供參考。
>
> **推薦使用新版指南**：[新用戶部署指南](docs/NEW_DEPLOYMENT_GUIDE.md)
>
> **新版指南優勢**：
> - ✅ 無硬編碼專案資訊（適用於任何 Supabase 專案）
> - ✅ 完整的自動化工具（環境檢查、資料庫初始化、部署驗證）
> - ✅ 繁體中文詳細說明
> - ✅ 常見問題與疑難排解
> - ✅ 預估 2 小時內完成部署
>
> **其他相關文件**：
> - [環境變數檢查清單](docs/ENV_VARIABLES_CHECKLIST.md) - 環境變數設定說明
> - [故障排除指南](docs/TROUBLESHOOTING.md) - 常見問題解決方案

---

# 以下為舊版內容（僅供參考）

本文件說明如何將 Vsale-lite 部署到 Vercel，並設定 GitHub 自動部署。

## 📋 前置需求

- ✅ GitHub 帳號
- ✅ Vercel 帳號（可使用 GitHub 登入）
- ✅ Supabase 專案（已設定資料庫）

---

## 🚀 快速部署流程

### 步驟 1: 在 Vercel 匯入專案

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊「**Add New Project**」
3. 選擇「**Import Git Repository**」
4. 如果尚未連結 GitHub，點擊「**Connect GitHub Account**」
5. 搜尋並選擇 `haraluya/vsale-lite` 倉庫
6. 點擊「**Import**」

### 步驟 2: 配置專案設定

Vercel 會自動偵測 Next.js 專案，但請確認以下設定：

| 設定項目 | 值 |
|---------|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `./` (預設) |
| **Build Command** | `pnpm build` |
| **Output Directory** | `.next` (預設) |
| **Install Command** | `pnpm install` |
| **Node.js Version** | `22.x` |

### 步驟 3: 設定環境變數

在「**Environment Variables**」區塊新增以下變數：

```env
NEXT_PUBLIC_SUPABASE_URL=https://qwovavytryvgchcowjof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY
```

**如何取得 Supabase 金鑰**:
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案 `qwovavytryvgchcowjof`
3. 左側選單 → **Project Settings** → **API**
4. 複製 `anon` `public` 金鑰

### 步驟 4: 部署

1. 點擊「**Deploy**」開始首次部署
2. 等待約 2-3 分鐘完成建置
3. 部署完成後會顯示專案 URL（如 `https://vsale-lite.vercel.app`）

---

## 🔄 自動部署設定

### 自動部署流程

已設定 GitHub Actions，每次推送到 `master` 分支時會自動：

1. ✅ 執行 TypeScript 型別檢查
2. ✅ 執行 ESLint 程式碼檢查
3. ✅ 部署到 Vercel Production 環境

### 設定 GitHub Secrets

為了讓 GitHub Actions 能自動部署到 Vercel，需要設定以下 Secrets：

1. 前往 GitHub 倉庫頁面：https://github.com/haraluya/vsale-lite
2. 點擊「**Settings**」→「**Secrets and variables**」→「**Actions**」
3. 點擊「**New repository secret**」，新增以下 3 個 Secrets：

#### 必要的 Secrets

| Secret Name | 值 | 如何取得 |
|-------------|---|---------|
| `VERCEL_TOKEN` | Vercel API Token | [Vercel Tokens](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | `team_qBAl7rAnjwmYd7dwQMBfMto6` | 在 `.vercel/project.json` 中 |
| `VERCEL_PROJECT_ID` | `prj_GobC4pfN8TiN7NCTWQr9nxfHzTVr` | 在 `.vercel/project.json` 中 |

#### 取得 VERCEL_TOKEN

1. 前往 [Vercel Account Tokens](https://vercel.com/account/tokens)
2. 點擊「**Create Token**」
3. Token Name: `GitHub Actions - vsale-lite`
4. Scope: `Full Account`
5. Expiration: `No Expiration`（或選擇合適期限）
6. 點擊「**Create**」
7. **立即複製並儲存** Token（只會顯示一次）

---

## 🔍 驗證部署

### 檢查部署狀態

1. **Vercel Dashboard**
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 選擇 `vsale-lite` 專案
   - 查看 **Deployments** 頁籤

2. **GitHub Actions**
   - 前往 GitHub 倉庫 → **Actions** 頁籤
   - 查看最新的工作流程執行狀態

### 測試部署

訪問部署 URL（如 `https://vsale-lite.vercel.app`）並測試：

- ✅ 前台登入頁面: `/login`
- ✅ 後台登入頁面: `/admin/login`
- ✅ 商品列表頁面: `/store`

---

## 🌐 自訂網域（可選）

### 設定自訂網域

1. 前往 Vercel 專案頁面
2. 點擊「**Settings**」→「**Domains**」
3. 新增網域（如 `sale.yourdomain.com`）
4. 依照指示設定 DNS 記錄：
   - **類型**: `CNAME`
   - **名稱**: `sale`
   - **值**: `cname.vercel-dns.com`
5. 等待 DNS 生效（通常 5-10 分鐘）

---

## 📊 監控與日誌

### 查看部署日誌

1. Vercel Dashboard → 選擇專案
2. 點擊特定 Deployment
3. 查看「**Build Logs**」與「**Function Logs**」

### 錯誤排查

如果部署失敗，檢查：

1. **Build Logs**: 查看建置錯誤訊息
2. **環境變數**: 確認 Supabase 金鑰正確
3. **TypeScript 型別**: 本機執行 `pnpm type-check`
4. **ESLint 檢查**: 本機執行 `pnpm lint`

---

## 🔧 常見問題

### Q: 為什麼推送到 GitHub 後沒有自動部署？

**A**: 檢查以下項目：
1. GitHub Actions Secrets 是否正確設定
2. GitHub Actions 是否啟用（Settings → Actions → General）
3. 查看 Actions 頁籤是否有錯誤訊息

### Q: 部署後出現「500 Internal Server Error」

**A**: 可能原因：
1. 環境變數未正確設定
2. Supabase 金鑰錯誤或過期
3. 資料庫 Migration 未執行

### Q: 如何回滾到先前版本？

**A**:
1. Vercel Dashboard → Deployments
2. 找到要回滾的版本
3. 點擊「⋯」→「Promote to Production」

---

## 📝 部署檢查清單

部署前確認：

- [ ] 本機測試通過（`pnpm dev`）
- [ ] TypeScript 型別檢查通過（`pnpm type-check`）
- [ ] ESLint 檢查通過（`pnpm lint`）
- [ ] 環境變數已設定
- [ ] Supabase 資料庫已初始化
- [ ] GitHub Secrets 已設定（如使用 GitHub Actions）
- [ ] `.gitignore` 已排除敏感檔案

---

## 🎉 完成

恭喜！您的 Vsale-lite 系統已成功部署到 Vercel。

每次推送到 `master` 分支時，系統會自動執行檢查並部署最新版本。

**部署 URL**: https://vsale.vercel.app

---

## 📝 部署記錄

### 2026-01-09: Vercel 環境變數設定完成 ✅

**問題**：線上版本備份失敗（pg_dump 指令無法在 Vercel Serverless 環境執行）

**解決方案**：
1. ✅ 使用 Supabase 原生備份（commit 6ae5c51）
2. ✅ 設定 GCS 環境變數到 Vercel
3. ✅ 重新部署生產環境

**新增環境變數**：
- `GCS_PROJECT_ID` = vsale-backup
- `GCS_BUCKET_NAME` = vsale-backups-haraluya
- `GCS_SERVICE_ACCOUNT_KEY` = (JSON 金鑰)
- `CRON_SECRET` = (Cron Job 驗證金鑰)

**部署資訊**：
- 部署 URL: https://vsale-lite-71dthzbpn-haraluyas-projects.vercel.app
- 部署 ID: 3ir4PTh51b4vcCdGkT3Y4XknKE8j
- Git Commit: 6ae5c51
- 部署時間: 2026-01-09 17:53 (UTC+8)

**測試步驟**：
1. 前往後台系統設定頁面
2. 點擊「立即備份」按鈕
3. 檢查備份狀態是否顯示「成功」
4. 檢查備份檔案大小是否 > 0 KB（通常 10-50 KB，gzip 壓縮後）

**備份系統架構**：
- ✅ Vercel Serverless 相容（無需 PostgreSQL 客戶端工具）
- ✅ 使用 Supabase API 直接查詢資料
- ✅ Node.js zlib 壓縮（gzip）
- ✅ 上傳到 Google Cloud Storage
- ✅ 備份 19 個資料表（含 admin_users 成員管理）

**自動備份設定**：
- Vercel Cron Job: 每日凌晨 2:00 (UTC+8) 自動執行
- API 端點: `/api/cron/backup`
- 滾動刪除舊備份（保留最近 10 個）

---

## 📚 相關資源

- [Vercel 文件](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Supabase 文件](https://supabase.com/docs)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
- [詳細備份修復指南](docs/BACKUP_VERCEL_FIX.md)（本地文件）
- [環境變數設定指南](docs/VERCEL_ENV_SETUP_COMPLETE.md)（本地文件）
