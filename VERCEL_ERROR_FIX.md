# 🚨 Vercel 部署錯誤完整修復指南

## 錯誤分析

從錯誤日誌中發現兩個問題：

### 問題 1: GitHub Actions 缺少 VERCEL_TOKEN ❌
```
Error: Input required and not supplied: vercel-token
```

### 問題 2: Vercel 環境變數未設定 ❌
```
[Error: supabaseKey is required.]
```

---

## 🎯 完整修復步驟

### 步驟 1: 修復 Vercel 環境變數（優先處理）

#### 1.1 前往 Vercel 專案設定
https://vercel.com/haraluyas-projects/vsale/settings/environment-variables

#### 1.2 新增環境變數

點擊「**Add New**」，新增以下 2 個變數：

| Variable Name | Value | Environments |
|---------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qwovavytryvgchcowjof.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 Supabase Anon Key | Production, Preview, Development |

**如何取得 SUPABASE_ANON_KEY**:
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard/project/qwovavytryvgchcowjof/settings/api)
2. 複製「Project API keys」下的 `anon` `public` 金鑰

#### 1.3 重新部署
1. 前往 [Vercel Deployments](https://vercel.com/haraluyas-projects/vsale)
2. 選擇最新的部署
3. 點擊「⋯」→「**Redeploy**」

---

### 步驟 2: 修復 GitHub Actions（可選）

如果需要自動部署功能，請設定 GitHub Secrets：

#### 2.1 建立 Vercel Token
1. 前往 https://vercel.com/account/tokens
2. 點擊「**Create Token**」
3. 設定：
   - Name: `GitHub Actions - vsale-lite`
   - Scope: `Full Account`
   - Expiration: `No Expiration`
4. 複製 Token

#### 2.2 設定 GitHub Secrets
前往 https://github.com/haraluya/vsale-lite/settings/secrets/actions

新增 3 個 Secrets：

| Name | Secret |
|------|--------|
| `VERCEL_TOKEN` | 剛才複製的 Token |
| `VERCEL_ORG_ID` | `team_qBAl7rAnjwmYd7dwQMBfMto6` |
| `VERCEL_PROJECT_ID` | `prj_LKdxGgd6X1eeArB9fdIPQbjG5jE5` |

#### 2.3 重新執行 GitHub Actions
1. 前往 https://github.com/haraluya/vsale-lite/actions
2. 選擇失敗的 workflow
3. 點擊「**Re-run all jobs**」

---

## 🔍 驗證步驟

### 驗證 Vercel 部署
1. 訪問 Vercel URL: https://vsale.vercel.app
2. 測試頁面：
   - 前台登入: `/login`
   - 後台登入: `/admin/login`
   - 商品列表: `/store`
3. 確認沒有 `supabaseKey is required` 錯誤

### 驗證 GitHub Actions（如已設定）
1. 推送測試變更或重新執行 workflow
2. 確認兩個 Jobs 都成功：
   - ✅ 程式碼品質檢查
   - ✅ 部署到 Vercel

---

## 📋 檢查清單

- [ ] **步驟 1.2**: Vercel 環境變數已新增
- [ ] **步驟 1.3**: Vercel 已重新部署
- [ ] **驗證**: 訪問網站無錯誤
- [ ] **步驟 2.1**: Vercel Token 已建立（可選）
- [ ] **步驟 2.2**: GitHub Secrets 已設定（可選）
- [ ] **步驟 2.3**: GitHub Actions 執行成功（可選）

---

## ⚠️ 重要提醒

1. **Supabase Anon Key 是敏感資訊**
   - 不要直接貼在聊天或公開場合
   - 只在 Vercel 環境變數中設定

2. **Vercel Token 只顯示一次**
   - 建立後立即複製並儲存
   - 遺失需重新建立

3. **環境變數變更後需重新部署**
   - 修改環境變數不會自動觸發部署
   - 必須手動 Redeploy 或推送新 commit

---

## 🆘 仍然有問題？

### 查看 Vercel 日誌
1. 前往 [Vercel Deployments](https://vercel.com/haraluyas-projects/vsale)
2. 選擇最新部署
3. 點擊「**View Function Logs**」
4. 查看詳細錯誤訊息

### 查看 GitHub Actions 日誌
1. 前往 [Actions](https://github.com/haraluya/vsale-lite/actions)
2. 選擇失敗的 workflow
3. 展開每個步驟查看詳細日誌

---

**優先順序**: 先完成步驟 1（修復 Vercel 環境變數），這會立即解決 500 錯誤。步驟 2 可以之後再處理。
