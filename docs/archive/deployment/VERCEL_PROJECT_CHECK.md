# Vercel 專案檢查指南

**問題**: Dashboard 顯示環境變數為空

---

## 🔍 問題診斷

### 步驟 1: 確認當前查看的專案

請檢查 Vercel Dashboard 上方的專案名稱：

#### ✅ 正確的專案（主站）
- **專案名稱**: `vsale-lite`
- **URL**: https://vercel.com/haraluyas-projects/vsale-lite/settings/environment-variables
- **生產環境 URL**: https://sale.devape.me

#### ❌ 錯誤的專案（空專案）
- **專案名稱**: `vsale`
- **URL**: https://vercel.com/haraluyas-projects/vsale/settings/environment-variables
- **生產環境 URL**: 無（未部署）

---

## 📋 主站環境變數狀態（vsale-lite）

根據 CLI 查詢結果，所有變數已正確設定：

| 變數名稱 | 狀態 | 環境 | 設定時間 |
|---------|------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Encrypted | Production, Preview, Development | 15 天前 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Encrypted | Production, Preview, Development | 15 天前 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `DB_USER` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `DB_PASSWORD` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `DB_HOST` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `DB_PORT` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `DB_NAME` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `GCS_PROJECT_ID` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `GCS_BUCKET_NAME` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `GCS_SERVICE_ACCOUNT_KEY` | ✅ Encrypted | Production, Preview, Development | 14 天前 |
| `CRON_SECRET` | ✅ Encrypted | Production, Preview, Development | 14 天前 |

**總計**: 12 個變數，全部已設定 ✅

---

## 🔄 解決方法

### 方法 1: 切換到正確的專案

1. 在 Vercel Dashboard 上方點擊專案名稱下拉選單
2. 選擇 **`vsale-lite`**（不是 `vsale`）
3. 進入 Settings → Environment Variables
4. 確認所有變數都有值

### 方法 2: 直接訪問正確的 URL

點擊此連結直接前往主站環境變數頁面：

**[👉 vsale-lite 環境變數設定](https://vercel.com/haraluyas-projects/vsale-lite/settings/environment-variables)**

### 方法 3: 重新整理 Dashboard

有時 Dashboard 快取會導致顯示舊資料：
1. 按 `Ctrl + F5`（Windows）或 `Cmd + Shift + R`（Mac）強制重新整理
2. 或清除瀏覽器快取後重新載入

---

## ❓ 如果仍然顯示 Empty

如果確認在 `vsale-lite` 專案下仍有變數顯示為空，請執行以下操作：

### 檢查特定變數的值

```bash
# 切換到主站專案
cd d:\APP\vsale
vercel link --project=vsale-lite --yes

# 檢查特定變數
vercel env pull .env.production
cat .env.production
```

這會下載 Production 環境的所有變數到 `.env.production` 檔案，您可以檢查哪些是空的。

### 重新設定空變數

如果發現特定變數確實為空，可以使用以下指令重新設定：

```bash
# 範例：重新設定 SUPABASE_SERVICE_ROLE_KEY
echo "您的金鑰值" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

---

## 🎯 快速驗證腳本

執行以下 PowerShell 腳本快速驗證：

```powershell
# 切換到正確專案並檢查環境變數
cd d:\APP\vsale
vercel link --project=vsale-lite --yes
vercel env ls

# 下載實際值並檢查
vercel env pull .env.production
Write-Host "`n已下載環境變數到 .env.production，請檢查是否有空值"
```

---

## 📸 截圖對比

### ❌ 錯誤專案 (vsale) - 變數為空
```
專案名稱: vsale
URL: 無部署記錄
環境變數: Empty (因為這是空專案)
```

### ✅ 正確專案 (vsale-lite) - 變數已設定
```
專案名稱: vsale-lite
URL: https://sale.devape.me
環境變數: 12 個，全部 Encrypted
```

---

## 🚀 下一步

確認環境變數正確後：

1. **測試主站是否正常運作**
   - 訪問 https://sale.devape.me/login
   - 確認頁面正常載入（不會出現 500 錯誤）

2. **如果主站仍然 500 錯誤**
   - 檢查 Vercel 部署日誌
   - 確認最後一次部署是否成功
   - 可能需要觸發重新部署：`vercel --prod`

---

**最後更新**: 2026-01-23
