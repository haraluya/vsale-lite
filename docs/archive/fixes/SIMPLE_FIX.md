# ⚡ 超簡單修復 - 複製貼上即可

## 問題
網站 500 錯誤，因為 Vercel 環境變數未設定。

## 修復步驟（2 分鐘）

### 步驟 1: 前往 Vercel 環境變數頁面
點擊這個連結 → https://vercel.com/haraluyas-projects/vsale/settings/environment-variables

### 步驟 2: 新增第一個變數
1. 點擊「**Add New**」按鈕
2. **Key**: 複製貼上 → `NEXT_PUBLIC_SUPABASE_URL`
3. **Value**: 複製貼上 → `https://qwovavytryvgchcowjof.supabase.co`
4. **Environments**: 勾選 `Production`、`Preview`、`Development` (全勾)
5. 點擊「**Save**」

### 步驟 3: 新增第二個變數
1. 再次點擊「**Add New**」按鈕
2. **Key**: 複製貼上 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Value**: 複製貼上 → `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyODE1NzQsImV4cCI6MjA4Mjg1NzU3NH0.YEwJNjDv5HJgj-GMN_IdisI6dU13aHA6ruaZCXUpZLA`
4. **Environments**: 勾選 `Production`、`Preview`、`Development` (全勾)
5. 點擊「**Save**」

### 步驟 4: 重新部署
1. 前往 https://vercel.com/haraluyas-projects/vsale
2. 找到最新的部署（最上面那個）
3. 點擊右側「**⋯**」(三個點)
4. 選擇「**Redeploy**」
5. 點擊「**Redeploy**」確認

## 完成！
等待 2-3 分鐘部署完成，然後訪問 https://vsale.vercel.app 應該就正常了！

---

## 為什麼 vercel.json 中的設定沒有生效？

`vercel.json` 中的 `env` 欄位**不會自動同步到 Vercel Dashboard**。
這些環境變數必須手動在 Vercel 網頁介面中新增。

---

## 快速連結
- 環境變數設定：https://vercel.com/haraluyas-projects/vsale/settings/environment-variables
- 部署列表：https://vercel.com/haraluyas-projects/vsale
- 網站 URL：https://vsale.vercel.app
