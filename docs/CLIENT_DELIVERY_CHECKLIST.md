# 客戶交付檢查清單

**用途**: 確保每個新客戶站點在正式交付前完成所有必要設定和測試

**使用方式**: 每開一個新站點，複製此清單並逐項檢查

---

## 📋 交付檢查清單

### 第一階段：基礎設施準備

#### GitHub Repository
- [ ] 已建立客戶專用 Private Repository
- [ ] Repository 命名格式：`vsale-client-{客戶名稱}`
- [ ] 已推送完整程式碼到 master 分支
- [ ] 已確認 `.gitignore` 正確（不包含 `.env` 等敏感檔案）
- [ ] 已設定 Repository 權限（如客戶需要存取）
- [ ] GitHub Repo URL: _____________________________

#### Supabase 專案
- [ ] 已建立 Supabase 專案
- [ ] 專案名稱：`vsale-client-{客戶名稱}`
- [ ] 區域選擇：Singapore (Southeast Asia)
- [ ] 已記錄 Supabase Project ID: _____________________________
- [ ] 已記錄 Supabase Project URL: _____________________________
- [ ] 已記錄 Anon Key（前 10 字元）: _____________________________
- [ ] 已記錄 Service Role Key（安全儲存）
- [ ] 已記錄 Database Password（安全儲存）

#### Vercel 專案
- [ ] 客戶已註冊 Vercel 帳號
- [ ] 已建立 Vercel 專案並綁定 GitHub Repo
- [ ] 專案名稱：`vsale-client-{客戶名稱}`
- [ ] Framework Preset 設定為 Next.js
- [ ] Build Command 設定為 `pnpm build`
- [ ] Vercel 專案 URL: _____________________________

---

### 第二階段：環境變數設定

#### 必要環境變數（Vercel）
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - 已設定於 Prod/Preview/Dev
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 已設定於 Prod/Preview/Dev
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - **僅設定於 Production**
- [ ] `SITE_IDENTIFIER` - 已設定（值：____________________）

#### 可選環境變數（備份功能，如需要）
- [ ] `CRON_SECRET` - 已設定於 Production
- [ ] `GCS_PROJECT_ID` - 已設定於 Production
- [ ] `GCS_BUCKET_NAME` - 已設定於 Production
- [ ] `GCS_SERVICE_ACCOUNT_KEY` - 已設定於 Production（JSON 格式）
- [ ] `DB_HOST` - 已設定於 Production
- [ ] `DB_PORT` - 已設定於 Production
- [ ] `DB_NAME` - 已設定於 Production（值：`postgres`）
- [ ] `DB_USER` - 已設定於 Production（格式：`postgres.{project-id}`）
- [ ] `DB_PASSWORD` - 已設定於 Production

---

### 第三階段：資料庫設定

#### Migration 推送
- [ ] 已推送所有 Migration 到 Supabase（`supabase db push --project-ref {PROJECT_ID}`）
- [ ] 已驗證 Migration 狀態（`supabase migration list --project-ref {PROJECT_ID}`）
- [ ] 所有 8 個 Migration 檔案都顯示 ✅ Applied
- [ ] Migration 列表：
  - [ ] `20260107100000_core_auth_and_tiers.sql`
  - [ ] `20260107110000_product_catalog_system.sql`
  - [ ] `20260107120000_orders_and_workflow.sql`
  - [ ] `20260107130000_shipping_and_custom_fees.sql`
  - [ ] `20260107140000_coupon_system.sql`
  - [ ] `20260107150000_system_admin_and_audit.sql`
  - [ ] `20260107160000_indexes_and_performance.sql`
  - [ ] `20260107170000_rls_policies.sql`

#### 管理員帳號建立
- [ ] 已在 Supabase SQL Editor 執行管理員建立 SQL
- [ ] 管理員 Email: _____________________________
- [ ] 管理員密碼: _____________________________ （安全記錄）
- [ ] 已驗證管理員帳號存在（Supabase Dashboard → Authentication）
- [ ] 已驗證 `profiles` 表有對應記錄（role = 'admin'）

---

### 第四階段：部署驗證

#### 首次部署
- [ ] Vercel 首次部署已完成
- [ ] 部署狀態：✅ Ready
- [ ] 部署時間：約 2-3 分鐘
- [ ] 沒有建置錯誤（Build Logs 無紅色錯誤）

#### 自動部署測試
- [ ] 已推送測試 commit 到 GitHub
- [ ] Vercel 自動觸發新的部署
- [ ] 新部署成功完成
- [ ] 已清理測試檔案（如 `TEST.md`）

#### 域名設定（如需要）
- [ ] 已在 Vercel 新增自訂域名
- [ ] 自訂域名: _____________________________
- [ ] DNS 設定完成（CNAME 記錄）
- [ ] DNS 已生效（可正常訪問）
- [ ] SSL 憑證已自動配置

---

### 第五階段：功能測試

#### 前台測試
- [ ] 訪問首頁 `/` → 自動導向登入頁
- [ ] 訪問 `/login` → 顯示手機號碼登入表單
- [ ] Neo-Brutalism 設計風格正確顯示
- [ ] 響應式設計正常（手機/桌面）

#### 後台登入測試
- [ ] 訪問 `/admin/login`
- [ ] 使用管理員帳號登入成功
- [ ] 登入後導向 `/admin/dashboard`
- [ ] Dashboard 顯示正常（無錯誤）

#### 後台功能測試
- [ ] 瀏覽會員等級管理 (`/admin/tiers`)
- [ ] 建立測試會員等級（例如：「一般會員」）
  - 等級名稱: _____________________________
  - 折扣比例: _____________________________
- [ ] 瀏覽客戶管理 (`/admin/users`)
- [ ] 建立測試客戶帳號
  - 手機號碼: _____________________________
  - 姓名: _____________________________
  - 密碼: _____________________________
  - 會員等級: _____________________________
- [ ] 瀏覽商品管理 (`/admin/products`) - 應為空白，正常
- [ ] 瀏覽訂單管理 (`/admin/orders`) - 應為空白，正常
- [ ] 系統設定頁面可正常訪問 (`/admin/settings`)

#### 前台登入測試（使用測試帳號）
- [ ] 登出後台帳號
- [ ] 使用測試客戶帳號登入前台 (`/login`)
- [ ] 登入後導向 `/store`
- [ ] 商品列表顯示正常（即使為空）
- [ ] 購物車圖示顯示（右上角）
- [ ] 導覽列顯示會員等級和姓名
- [ ] 登出功能正常

#### 資料隔離驗證
- [ ] 確認無法看到其他客戶的資料
- [ ] 確認 Supabase Project ID 獨立
- [ ] 確認備份檔案命名包含站點識別（如有啟用）

---

### 第六階段：備份與監控（如有啟用）

#### Cron Job 備份
- [ ] 已設定 `vercel.json` 的 Cron 配置
- [ ] Cron 執行時間：每日 18:00 UTC（或自訂）
- [ ] 已手動測試備份功能
  - 訪問 `/api/cron/backup?secret={CRON_SECRET}`
  - 回應狀態：200 OK
  - 備份檔案已出現在 GCS Bucket
  - 檔案命名格式：`{SITE_IDENTIFIER}-backup-YYYYMMDD-HHMMSS.sql.gz`

#### Google Cloud Storage
- [ ] GCS Bucket 已建立
- [ ] Bucket 名稱：`vsale-backups-{SITE_IDENTIFIER}`
- [ ] 已測試備份檔案上傳
- [ ] 已驗證備份檔案可下載
- [ ] 已設定 Lifecycle Policy（可選，例如：30 天後刪除）

---

### 第七階段：文件與交付

#### 客戶文件準備
- [ ] 已準備交付 Email（參考 [CLIENT_ONBOARDING_SOP.md](CLIENT_ONBOARDING_SOP.md) 範本）
- [ ] 已記錄所有登入資訊（後台管理員帳號密碼）
- [ ] 已記錄 Vercel Dashboard URL
- [ ] 已記錄 Supabase Dashboard URL
- [ ] 已準備系統使用手冊（如有）
- [ ] 已準備常見問題 FAQ（如有）

#### 客戶帳號權限
- [ ] Vercel 專案權限設定（客戶為 Viewer 或 Member）
- [ ] Supabase 專案權限設定（客戶為 Developer 或保留給您）
- [ ] GitHub Repo 權限設定（如客戶需要查看程式碼）

#### 內部記錄
- [ ] 已更新客戶管理表格（Excel/Notion）
  - 客戶名稱
  - GitHub Repo URL
  - Supabase Project ID
  - Vercel 專案 URL
  - 自訂域名
  - 管理員 Email
  - 開站日期
  - 最後 Migration 版本
- [ ] 已記錄敏感資訊到密碼管理器（如 1Password, LastPass）
  - Supabase Service Role Key
  - Database Password
  - 管理員密碼
  - CRON_SECRET
  - GCS Service Account Key

---

### 第八階段：客戶培訓與交付

#### 客戶培訓（可選）
- [ ] 已進行後台操作培訓
  - 會員等級管理
  - 客戶帳號管理
  - 商品管理
  - 訂單管理
- [ ] 已說明前台客戶使用流程
- [ ] 已說明資料庫備份機制（如有啟用）
- [ ] 已說明系統更新流程

#### 正式交付
- [ ] 已發送交付 Email 給客戶
- [ ] 客戶已確認收到所有登入資訊
- [ ] 客戶已成功登入後台
- [ ] 客戶已了解基本操作
- [ ] 已提供技術支援聯絡方式
- [ ] 已確認客戶滿意度

---

### 第九階段：後續維護準備

#### 監控設定
- [ ] 已設定 Vercel Email 通知（部署失敗時）
- [ ] 已設定 Supabase Email 通知（資料庫異常時）
- [ ] 已加入監控清單（定期檢查）

#### 更新計畫
- [ ] 客戶已加入 Migration 推送清單
- [ ] 客戶已加入版本更新通知清單
- [ ] 已說明未來功能更新流程

#### 備份驗證（如有啟用）
- [ ] 已設定每週備份驗證提醒
- [ ] 已確認首次自動備份成功
- [ ] 已記錄備份保留政策（例如：保留 30 天）

---

## 🚨 常見問題快速檢查

### 部署失敗
- [ ] 檢查環境變數是否都已設定
- [ ] 檢查 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否正確
- [ ] 檢查 Vercel Build Logs 找出錯誤訊息
- [ ] 確認 `package.json` 和 `pnpm-lock.yaml` 都已推送

### 登入失敗
- [ ] 確認 Migration 已全部推送
- [ ] 確認管理員帳號已建立（Supabase Authentication 頁面）
- [ ] 確認環境變數正確（Vercel Settings）
- [ ] 檢查 Vercel Function Logs（可能是 RLS 策略問題）

### 資料庫連線失敗
- [ ] 確認 `NEXT_PUBLIC_SUPABASE_URL` 正確
- [ ] 確認 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正確
- [ ] 確認 `SUPABASE_SERVICE_ROLE_KEY` 僅設定於 Production
- [ ] 檢查 Supabase 專案狀態（是否暫停）

### 備份失敗（如有啟用）
- [ ] 確認所有備份相關環境變數都已設定
- [ ] 確認 `GCS_SERVICE_ACCOUNT_KEY` 是完整 JSON 格式
- [ ] 確認 `DB_PASSWORD` 正確
- [ ] 確認 GCS Bucket 權限設定正確

---

## ✅ 最終確認

### 交付前最終檢查
- [ ] 所有上述檢查項目都已完成
- [ ] 已進行完整功能測試（前台 + 後台）
- [ ] 已測試自動部署功能
- [ ] 已準備好客戶交付文件
- [ ] 已記錄所有必要資訊到內部系統

### 交付簽核
- **客戶名稱**: _____________________________
- **站點 URL**: _____________________________
- **開站日期**: _____________________________
- **執行人員**: _____________________________
- **客戶確認**: _____________________________（簽名/Email 確認）

---

## 📊 交付統計（選填）

- **總耗時**: __________ 小時
- **GitHub 設定**: __________ 分鐘
- **Supabase 設定**: __________ 分鐘
- **Vercel 設定**: __________ 分鐘
- **測試時間**: __________ 分鐘
- **遇到的問題**: _____________________________
- **解決方式**: _____________________________

---

## 📝 備註欄

（記錄任何特殊設定、客戶特殊需求、或未來需要注意的事項）

_____________________________________________________________________

_____________________________________________________________________

_____________________________________________________________________

_____________________________________________________________________

---

**檢查清單版本**: 1.0.0
**最後更新**: 2026-01-22
**適用專案**: Vsale-lite

---

## 相關文件

- [客戶開站 SOP](CLIENT_ONBOARDING_SOP.md) - 完整開站流程指南
- [Vercel 環境變數檢查清單](VERCEL_ENV_CHECKLIST.md) - 環境變數詳細說明
- [Migration 推送指南](MIGRATION_DEPLOYMENT_GUIDE.md) - 資料庫更新流程
