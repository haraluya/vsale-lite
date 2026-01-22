# Vsale 多站點環境資訊

**最後更新**: 2026-01-22

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

## 資料遷移狀態

| 項目 | 狀態 | 說明 |
|-----|------|-----|
| 資料庫結構（Migration） | ✅ 完成 | 已推送所有 Migration 到 Site 2 |
| 商品資料 | ⏳ 進行中 | 正在從主站備份並還原到 Site 2 |
| 客戶資料 | ❌ 不遷移 | 每個站點獨立客戶資料 |
| 訂單資料 | ❌ 不遷移 | 每個站點獨立訂單資料 |
| Supabase Storage 圖片 | ⏳ 進行中 | 包含在備份中 |

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

---

## 快速參考

### Supabase Dashboard URLs
- **主站**: https://supabase.com/dashboard/project/qwovavytryvgchcowjof
- **Site 2**: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs

### Vercel Dashboard URLs
- **主站**: https://vercel.com/dashboard （搜尋 vsale-lite）
- **Site 2**: https://vercel.com/dashboard （搜尋 vsale-site2）

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
