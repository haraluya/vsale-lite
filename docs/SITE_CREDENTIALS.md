# Vsale 多站點環境資訊

**最後更新**: 2026-01-26

> ⚠️ **重要提醒**: 此檔案包含敏感資訊，請勿提交到 Git！已加入 `.gitignore`

---

## 站點 1 - 主站（Main Site）

### Vercel 部署
- **專案名稱**: vsale-lite（主專案）
- **URL**: https://vsale-lite.vercel.app
- **Vercel 帳號**: （原始帳號）

### Supabase 資料庫
- **專案 ID**: `qwovavytryvgchcowjof`
- **區域**: AWS ap-southeast-1 (Singapore)
- **Dashboard**: https://supabase.com/dashboard/project/qwovavytryvgchcowjof

#### 連線資訊
- **API URL**: `https://qwovavytryvgchcowjof.supabase.co`
- **Pooler Host**: `aws-0-ap-southeast-1.pooler.supabase.com`
- **Port**: `6543` (Transaction Pooler) / `5432` (Direct)
- **Database**: `postgres`
- **Database User**: `postgres.qwovavytryvgchcowjof`
- **Database Password**: `qoR78vd1Mj5aquN9`

#### Supabase API Keys
- **Anon Key**: （從 Vercel 環境變數取得）
- **Service Role Key**: （從 Vercel 環境變數取得）

### 環境變數（Vercel）
```env
NEXT_PUBLIC_SUPABASE_URL=https://qwovavytryvgchcowjof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

---

## 站點 2 - Site 2

### Vercel 部署
- **專案名稱**: vsale-site2
- **URL**: https://vsale-site2.vercel.app
- **Vercel 帳號**: （與主站相同）

### Supabase 資料庫
- **專案 ID**: `rdyvmgomjdglflrcfijs`
- **區域**: AWS ap-southeast-1 (Singapore)
- **Dashboard**: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs

#### 連線資訊
- **API URL**: `https://rdyvmgomjdglflrcfijs.supabase.co`
- **Pooler Host**: `aws-0-ap-southeast-1.pooler.supabase.com`
- **Port**: `6543` (Transaction Pooler) / `5432` (Direct)
- **Database**: `postgres`
- **Database User**: `postgres.rdyvmgomjdglflrcfijs`
- **Database Password**: `Devape-BM69`

#### Supabase API Keys
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeXZtZ29tamRnbGZscmNmaWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU5NjIsImV4cCI6MjA4NDU4MTk2Mn0.K9G6bC-9U1ZMIurLMQA-3888-dj4DVl4McWRN0UcCOE`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeXZtZ29tamRnbGZscmNmaWpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAwNTk2MiwiZXhwIjoyMDg0NTgxOTYyfQ.MzbZsoLp2RdHJj8qSuwnZ3FsQGuIBCAO8ExmC5YyUTE`

### 環境變數（Vercel）
```env
NEXT_PUBLIC_SUPABASE_URL=https://rdyvmgomjdglflrcfijs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

---

## 站點 3 - Site 3

### Vercel 部署
- **專案名稱**: `vsale-site3`
- **URL**: https://vsale-site3.vercel.app
- **Vercel 帳號**: （與主站相同）

### Supabase 資料庫
- **專案 ID**: `dewhcpfzrzewgknaqzwy`
- **區域**: AWS ap-south-1 (Mumbai)
- **Dashboard**: https://supabase.com/dashboard/project/dewhcpfzrzewgknaqzwy

#### 連線資訊
- **API URL**: `https://dewhcpfzrzewgknaqzwy.supabase.co`
- **Pooler Host**: `aws-0-ap-south-1.pooler.supabase.com`
- **Port**: `6543` (Transaction Pooler) / `5432` (Direct)
- **Database**: `postgres`
- **Database User**: `postgres.dewhcpfzrzewgknaqzwy`
- **Database Password**: `Devape-BM69`

#### Supabase API Keys
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODA4OTYsImV4cCI6MjA4NDY1Njg5Nn0.S4qBXSktlnnVAKw7w1mMCOwX8tcwB22XrXIaauDP5bk`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4MDg5NiwiZXhwIjoyMDg0NjU2ODk2fQ.XDa2SNZLtIMyT4dmlCmKWzIP9RDJwAirruPUyzueO8s`

### 環境變數（Vercel）
```env
NEXT_PUBLIC_SUPABASE_URL=https://dewhcpfzrzewgknaqzwy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODA4OTYsImV4cCI6MjA4NDY1Njg5Nn0.S4qBXSktlnnVAKw7w1mMCOwX8tcwB22XrXIaauDP5bk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4MDg5NiwiZXhwIjoyMDg0NjU2ODk2fQ.XDa2SNZLtIMyT4dmlCmKWzIP9RDJwAirruPUyzueO8s
```

---

## 共用資源 - Cloudinary CDN

**用途**: 圖片 CDN 服務（三個站點共用同一個 Cloudinary 帳號）

### Cloudinary 帳號資訊
- **Cloud Name**: `dq3e7q3aq`
- **API Key**: `847781913351469`
- **API Secret**: `_AZ9RjpN-Rbl3okHFZk_qwnRcdk`
- **Dashboard**: https://console.cloudinary.com/console/c-dq3e7q3aq

### 資料夾結構
```
dq3e7q3aq/
├── vsale/              # 主站圖片
│   ├── series/         # 系列圖片
│   ├── products/       # 商品圖片
│   ├── announcements/  # 廣告圖片
│   └── home-blocks/    # 首頁區塊圖片
├── vsale-site2/        # 站點 2 圖片
│   ├── series/
│   ├── products/
│   ├── announcements/
│   └── home-blocks/
└── vsale-site3/        # 站點 3 圖片
    ├── series/
    ├── products/
    ├── announcements/
    └── home-blocks/
```

### Vercel 環境變數設定

所有站點的 Vercel 專案都需要設定以下環境變數（**Production + Preview + Development**）：

```env
# Cloudinary CDN（所有站點共用）
CLOUDINARY_CLOUD_NAME=dq3e7q3aq
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dq3e7q3aq
CLOUDINARY_API_KEY=847781913351469
CLOUDINARY_API_SECRET=_AZ9RjpN-Rbl3okHFZk_qwnRcdk
```

**設定步驟**:
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案 → Settings → Environment Variables
3. 點擊 "Add New" 新增變數
4. **重要**: 確保勾選 Production、Preview、Development 三個環境
5. 儲存後需要 Redeploy 才會生效

**驗證環境變數**:
- 主站: https://vsale-lite.vercel.app/api/check-env
- 站點 2: https://vsale-site2.vercel.app/api/check-env
- 站點 3: https://vsale-site3.vercel.app/api/check-env

查看 `isConfigured: true` 表示設定正確。

### 圖片遷移狀態

| 站點 | 系列圖片 | 商品圖片 | 廣告圖片 | 首頁區塊 |
|------|---------|---------|---------|---------|
| 主站 | ✅ 完成 | ✅ 完成 | ✅ 完成 | ✅ 完成 |
| 站點 2 | ✅ 完成 (37) | ✅ 完成 (199/201) | ✅ 完成 (2) | ✅ 完成 |
| 站點 3 | ✅ 完成 (37) | ✅ 完成 (194/196) | ✅ 完成 | ✅ 完成 |

**注意**: 部分商品圖片上傳失敗是因為 Supabase Storage 中檔案不存在。

### 相關腳本
```bash
# 檢查圖片路徑
tsx scripts/check-cloudinary-paths.ts

# 修正圖片路徑
tsx scripts/fix-all-cloudinary-paths.ts

# 遷移站點 2 圖片
pnpm migrate:cloudinary:site2

# 遷移站點 3 圖片
pnpm migrate:cloudinary:site3
```

---

## 資料遷移狀態

### 站點 2（Site 2）

| 項目 | 狀態 | 說明 |
|-----|------|-----|
| 資料庫結構（Migration） | ✅ 完成 | 已推送所有 Migration 到 Site 2 |
| 商品資料 | ⏳ 進行中 | 正在從主站備份並還原到 Site 2 |
| 客戶資料 | ❌ 不遷移 | 每個站點獨立客戶資料 |
| 訂單資料 | ❌ 不遷移 | 每個站點獨立訂單資料 |
| Supabase Storage 圖片 | ⏳ 進行中 | 包含在備份中 |

### 站點 3（Site 3）

| 項目 | 狀態 | 說明 |
|-----|------|-----|
| 資料庫結構（Migration） | ⏳ 待執行 | 等待站點 3 資訊完成後推送 |
| 商品資料 | ⏳ 待執行 | 等待 Migration 完成後遷移 |
| 客戶資料 | ❌ 不遷移 | 每個站點獨立客戶資料 |
| 訂單資料 | ❌ 不遷移 | 每個站點獨立訂單資料 |
| Supabase Storage 圖片 | ⏳ 待執行 | 等待資料遷移階段 |

### 待同步的 Migration 清單（Phase 1-3）

以下 Migration 需要同步到站點 2 和站點 3：

1. `20260124151211_optimize_home_page_queries.sql` - 首頁查詢優化
2. `20260125125922_performance_indexes.sql` - 效能索引優化
3. `20260125135954_product_list_materialized_view.sql` - 商品列表物化視圖

### 需要遷移的資料表
- `categories` - 商品分類
- `tiers` - 會員等級
- `series` - 商品系列
- `products` - 商品資料
- `tier_prices` - 等級價格
- `coupons` - 優惠券（可選）
- `coupon_tier_restrictions` - 優惠券等級限制
- `coupon_series_restrictions` - 優惠券系列限制

### 不遷移的資料表
- `profiles` - 使用者個人資料
- `orders` - 訂單
- `order_items` - 訂單項目
- `order_timelines` - 訂單歷史
- `order_custom_fees` - 訂單自訂費用
- `user_coupons` - 使用者優惠券
- `order_coupons` - 訂單優惠券
- `admin_users` - 管理員帳號
- `audit_logs` - 稽核日誌
- `backup_jobs` - 備份記錄

---

## 使用 psql 連線指令

### 主站（Site 1）
```bash
# 使用 Transaction Pooler（建議）
PGPASSWORD="qoR78vd1Mj5aquN9" psql \
  -h aws-0-ap-southeast-1.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.qwovavytryvgchcowjof

# 使用 Direct Connection
PGPASSWORD="qoR78vd1Mj5aquN9" psql \
  -h db.qwovavytryvgchcowjof.supabase.co \
  -p 5432 \
  -d postgres \
  -U postgres.qwovavytryvgchcowjof
```

### 站點 2（Site 2）
```bash
# 使用 Transaction Pooler（建議）
PGPASSWORD="Devape-BM69" psql \
  -h aws-0-ap-southeast-1.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.rdyvmgomjdglflrcfijs

# 使用 Direct Connection
PGPASSWORD="Devape-BM69" psql \
  -h db.rdyvmgomjdglflrcfijs.supabase.co \
  -p 5432 \
  -d postgres \
  -U postgres.rdyvmgomjdglflrcfijs
```

### 站點 3（Site 3）
```bash
# 使用 Transaction Pooler（建議）
PGPASSWORD="Devape-BM69" psql \
  -h aws-0-ap-south-1.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.dewhcpfzrzewgknaqzwy

# 使用 Direct Connection
PGPASSWORD="Devape-BM69" psql \
  -h db.dewhcpfzrzewgknaqzwy.supabase.co \
  -p 5432 \
  -d postgres \
  -U postgres.dewhcpfzrzewgknaqzwy
```

---

## PowerShell 連線指令

### 主站（Site 1）
```powershell
$env:PGPASSWORD = "qoR78vd1Mj5aquN9"
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.qwovavytryvgchcowjof
```

### 站點 2（Site 2）
```powershell
$env:PGPASSWORD = "Devape-BM69"
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.rdyvmgomjdglflrcfijs
```

### 站點 3（Site 3）
```powershell
$env:PGPASSWORD = "Devape-BM69"
psql -h aws-0-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.dewhcpfzrzewgknaqzwy
```

---

## CLI Access Tokens

### 站點 2 & 3 帳號 Access Token

**用途**: Supabase CLI 多帳號切換（用於站點 2 和站點 3）

```
sbp_501d50c8ca940f93b0a3a60179ea552b8704999f
```

**使用方式**:
```powershell
# 設定環境變數
$env:SUPABASE_ACCESS_TOKEN = "sbp_501d50c8ca940f93b0a3a60179ea552b8704999f"

# 連結站點 2
supabase link --project-ref rdyvmgomjdglflrcfijs

# 連結站點 3
supabase link --project-ref dewhcpfzrzewgknaqzwy
```

**或使用切換腳本**:
```powershell
# 切換到站點 2
.\scripts\switch-to-site23.ps1 site2

# 切換到站點 3
.\scripts\switch-to-site23.ps1 site3
```

**注意事項**:
- ⚠️ 此 Token 具有站點 2 & 3 完整管理權限
- ⚠️ 請勿分享或提交到 Git
- 🔄 建議每 3-6 個月輪換一次
- 📅 Token 生成日期: 2026-01-25

---

## 快速參考

### Supabase Dashboard URLs
- **主站**: https://supabase.com/dashboard/project/qwovavytryvgchcowjof
- **Site 2**: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
- **Site 3**: https://supabase.com/dashboard/project/dewhcpfzrzewgknaqzwy

### Vercel Dashboard URLs
- **主站**: https://vercel.com/dashboard （搜尋 vsale-lite）
- **Site 2**: https://vercel.com/dashboard （搜尋 vsale-site2）
- **Site 3**: https://vercel.com/dashboard （搜尋 vsale-site3）

### GitHub Repository
- **URL**: https://github.com/haraluya/vsale-lite
- **Branch**: master

---

## 安全注意事項

1. ⚠️ **絕對不要將此檔案提交到 Git**
2. 🔒 **資料庫密碼僅用於緊急維護**（日常使用 Supabase Dashboard）
3. 🛡️ **Service Role Key 具有完整權限**（僅用於伺服器端）
4. 📧 **Anon Key 可公開**（前端使用，受 RLS 保護）
5. 🔐 **定期輪換資料庫密碼**（建議每季度更換）

---

## 相關文件

- [客戶交付檢查清單](CLIENT_DELIVERY_CHECKLIST.md)
- [客戶上線 SOP](CLIENT_ONBOARDING_SOP.md)
- [Vercel 環境變數檢查清單](VERCEL_ENV_CHECKLIST.md)
- [Migration 部署指南](MIGRATION_DEPLOYMENT_GUIDE.md)
- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md)
