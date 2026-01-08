# 🚨 修復 500 錯誤 - Vercel 環境變數未設定

## 問題確認

網站顯示 500 錯誤，日誌顯示：`[Error: supabaseKey is required.]`

**原因**：Vercel 專案的環境變數尚未設定！

---

## ⚡ 立即修復（3 分鐘）

### 步驟 1: 取得 Supabase Anon Key

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard/project/qwovavytryvgchcowjof/settings/api)
2. 找到「**Project API keys**」區塊
3. 複製 `anon` `public` 金鑰（通常是很長的 JWT Token）

### 步驟 2: 在 Vercel 設定環境變數

1. 前往 [Vercel 環境變數設定](https://vercel.com/haraluyas-projects/vsale/settings/environment-variables)
2. 點擊「**Add New**」

#### 變數 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://qwovavytryvgchcowjof.supabase.co`
- **Environments**: 勾選 `Production`、`Preview`、`Development`
- 點擊「**Save**」

#### 變數 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: *(貼上剛才從 Supabase 複製的 anon key)*
- **Environments**: 勾選 `Production`、`Preview`、`Development`
- 點擊「**Save**」

### 步驟 3: 重新部署

**重要**：新增環境變數後，Vercel 不會自動重新部署！

1. 前往 [Vercel Deployments](https://vercel.com/haraluyas-projects/vsale)
2. 找到最新的部署
3. 點擊右側「**⋯**」選單
4. 選擇「**Redeploy**」
5. 點擊「**Redeploy**」確認

---

## ✅ 驗證修復

重新部署完成後（約 2-3 分鐘）：

1. 訪問 https://vsale.vercel.app
2. 應該看到登入頁面，而不是 500 錯誤
3. 測試前台登入：https://vsale.vercel.app/login
4. 測試後台登入：https://vsale.vercel.app/admin/login

---

## 📋 完整環境變數檢查表

| 變數名稱 | 值 | 狀態 |
|---------|---|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qwovavytryvgchcowjof.supabase.co` | ❌ 需新增 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(從 Supabase Dashboard 取得)* | ❌ 需新增 |

---

## 🔍 如何取得正確的 Supabase Anon Key

### 方法 1: 從 Supabase Dashboard（推薦）

1. 前往 https://supabase.com/dashboard/project/qwovavytryvgchcowjof/settings/api
2. 在「**Project API keys**」區塊
3. 找到「**anon public**」或「**anon**」金鑰
4. 金鑰格式像這樣：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (很長的字串)
5. 點擊「**Copy**」或「**Reveal**」後複製

### 方法 2: 從 vercel.json（如果有的話）

檢查專案中的 `vercel.json` 檔案，裡面可能有預設的環境變數。

---

## ⚠️ 重要提醒

1. **環境變數變更後必須重新部署**
   - Vercel 不會自動重新部署
   - 必須手動 Redeploy

2. **Anon Key 是公開金鑰**
   - 可以安全地暴露在前端程式碼中
   - 用於客戶端 Supabase 連線

3. **不要混淆 Service Role Key**
   - `SUPABASE_SERVICE_ROLE_KEY` 是私密金鑰，只用於後端
   - 前端使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🆘 如果仍然出現 500 錯誤

### 檢查 Vercel 部署日誌

1. 前往 [Vercel Deployments](https://vercel.com/haraluyas-projects/vsale)
2. 點擊最新的部署
3. 點擊「**Function Logs**」或「**Runtime Logs**」
4. 查看詳細錯誤訊息

### 檢查環境變數是否正確載入

1. 在 Vercel 部署頁面
2. 點擊「**Environment Variables**」頁籤
3. 確認 2 個變數都已顯示
4. 確認 `Production` 環境已勾選

---

## 🎯 快速連結

- 🔑 [Supabase API 設定](https://supabase.com/dashboard/project/qwovavytryvgchcowjof/settings/api)
- ⚙️ [Vercel 環境變數](https://vercel.com/haraluyas-projects/vsale/settings/environment-variables)
- 🚀 [Vercel 部署列表](https://vercel.com/haraluyas-projects/vsale)
- 📊 [Vercel 日誌](https://vercel.com/haraluyas-projects/vsale/logs)

---

**預計修復時間**：5 分鐘（設定環境變數） + 2-3 分鐘（重新部署）
