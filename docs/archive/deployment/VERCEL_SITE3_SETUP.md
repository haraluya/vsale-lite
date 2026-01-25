# Vercel 站點三環境變數設定指南

**專案名稱**: vsale-site3
**Supabase Project ID**: dewhcpfzrzewgknaqzwy
**更新日期**: 2026-01-23

---

## 📋 在 Vercel 設定環境變數

### 方式一：透過 Vercel Dashboard UI

1. **前往專案設定頁面**
   - 網址：https://vercel.com/dashboard
   - 找到 `vsale-site3` 專案
   - 點選 Settings → Environment Variables

2. **新增環境變數**（請完整複製以下內容）

#### Production 環境變數（必需）

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dewhcpfzrzewgknaqzwy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODA4OTYsImV4cCI6MjA4NDY1Njg5Nn0.S4qBXSktlnnVAKw7w1mMCOwX8tcwB22XrXIaauDP5bk` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4MDg5NiwiZXhwIjoyMDg0NjU2ODk2fQ.XDa2SNZLtIMyT4dmlCmKWzIP9RDJwAirruPUyzueO8s` |

3. **選擇環境**
   - 勾選 `Production`
   - 勾選 `Preview`（可選，建議勾選）
   - 勾選 `Development`（可選，建議勾選）

4. **儲存設定**
   - 點選 "Save" 按鈕
   - 等待環境變數套用完成

---

### 方式二：透過 Vercel CLI（推薦）

#### 前置準備

```powershell
# 安裝 Vercel CLI（如果尚未安裝）
npm i -g vercel

# 登入 Vercel
vercel login

# 切換到專案目錄
cd d:\APP\vsale
```

#### 執行指令設定環境變數

```powershell
# 設定 Production 環境變數
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 輸入值: https://dewhcpfzrzewgknaqzwy.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 輸入值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODA4OTYsImV4cCI6MjA4NDY1Njg5Nn0.S4qBXSktlnnVAKw7w1mMCOwX8tcwB22XrXIaauDP5bk

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# 輸入值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4MDg5NiwiZXhwIjoyMDg0NjU2ODk2fQ.XDa2SNZLtIMyT4dmlCmKWzIP9RDJwAirruPUyzueO8s

# 驗證環境變數（可選）
vercel env ls
```

---

## 🔍 驗證環境變數設定

### 方式一：檢查 Vercel Dashboard

1. 前往 Settings → Environment Variables
2. 確認以下三個變數已正確設定：
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`

### 方式二：觸發重新部署

```powershell
# 在專案目錄下執行
vercel --prod

# 或透過 Git 推送觸發自動部署
git add .
git commit -m "chore: 設定站點三環境變數"
git push origin master
```

### 方式三：檢查部署日誌

1. 前往 Vercel Dashboard → Deployments
2. 點選最新的部署記錄
3. 檢查 "Build Logs" 確認環境變數是否正確載入

---

## ⚠️ 注意事項

### 環境變數優先級

```
1. Vercel 環境變數（Production） → 線上站點使用
2. .env.local（本地開發） → 本地測試使用
3. .env.production（不建議使用） → 已棄用
```

### 安全提醒

- ⚠️ **絕對不要將 `.env.local` 提交到 Git**
- 🔒 **Service Role Key 具有完整權限** - 僅在 Server Actions 使用
- 📧 **Anon Key 可公開** - 受 RLS（Row Level Security）保護
- 🛡️ **定期輪換密鑰** - 建議每季度更新一次

### 常見問題

#### Q1: 環境變數更新後站點沒有反應？
**A**: 需要觸發重新部署。透過以下方式之一：
- 推送新的 Git Commit
- 在 Vercel Dashboard 點選 "Redeploy"
- 執行 `vercel --prod`

#### Q2: 如何確認環境變數是否正確載入？
**A**: 在 Next.js 中可透過以下方式檢查（僅限開發環境）：
```javascript
// app/api/test-env/route.ts
export async function GET() {
  return Response.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
```

#### Q3: Preview 和 Development 環境需要設定嗎？
**A**: 建議設定，確保所有環境一致。但如果只測試 Production，可以只設定 Production 環境。

---

## 📚 相關文件

- [站點憑證資訊](SITE_CREDENTIALS.md)
- [Vercel 環境變數檢查清單](VERCEL_ENV_CHECKLIST.md)
- [資料庫 Migration 部署指南](MIGRATION_DEPLOYMENT_GUIDE.md)
- [Vercel 官方文件 - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**最後更新**: 2026-01-23
**文件版本**: 1.0.0
