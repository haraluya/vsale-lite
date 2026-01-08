# 🚨 快速修復 Vercel 部署錯誤

## 問題原因
GitHub Actions 缺少必要的 Vercel Secrets，導致部署失敗。

---

## ✅ 解決方案 1: 設定 GitHub Secrets（推薦）

### 步驟 1: 建立 Vercel Token

1. 前往 [Vercel Account Tokens](https://vercel.com/account/tokens)
2. 點擊「**Create Token**」
3. 填寫資訊：
   - **Token Name**: `GitHub Actions - vsale-lite`
   - **Scope**: `Full Account`
   - **Expiration**: `No Expiration`
4. 點擊「**Create**」
5. **立即複製 Token**（只顯示一次！）

### 步驟 2: 在 GitHub 設定 Secrets

1. 前往 https://github.com/haraluya/vsale-lite/settings/secrets/actions
2. 點擊「**New repository secret**」
3. 新增以下 3 個 Secrets：

#### Secret 1: VERCEL_TOKEN
- **Name**: `VERCEL_TOKEN`
- **Secret**: 貼上剛才複製的 Token

#### Secret 2: VERCEL_ORG_ID
- **Name**: `VERCEL_ORG_ID`
- **Secret**: `team_qBAl7rAnjwmYd7dwQMBfMto6`

#### Secret 3: VERCEL_PROJECT_ID
- **Name**: `VERCEL_PROJECT_ID`
- **Secret**: `prj_LKdxGgd6X1eeArB9fdIPQbjG5jE5`

### 步驟 3: 重新觸發部署

1. 推送任何變更到 master 分支，或
2. 前往 [Actions](https://github.com/haraluya/vsale-lite/actions)
3. 選擇失敗的 workflow
4. 點擊「**Re-run all jobs**」

---

## ✅ 解決方案 2: 暫時停用 GitHub Actions 部署

如果暫時不需要自動部署，可以停用 workflow：

### 方法 A: 刪除 workflow 檔案
```bash
git rm .github/workflows/vercel-deploy.yml
git commit -m "chore: 暫時停用 GitHub Actions 自動部署"
git push origin master
```

### 方法 B: 在 GitHub 停用 Actions
1. 前往 https://github.com/haraluya/vsale-lite/settings/actions
2. 選擇「**Disable Actions for this repository**」

---

## 🎯 推薦做法

**建議使用解決方案 1**，因為：
✅ 每次推送自動部署，不需手動操作
✅ 自動執行程式碼品質檢查
✅ 部署前自動驗證 TypeScript 與 ESLint

---

## 📋 驗證步驟

設定完成後：
1. 前往 [Actions](https://github.com/haraluya/vsale-lite/actions)
2. 重新執行失敗的 workflow
3. 確認「程式碼品質檢查」與「部署到 Vercel」都成功
4. 訪問 Vercel URL 驗證部署

---

**快速連結**:
- 建立 Token: https://vercel.com/account/tokens
- 設定 Secrets: https://github.com/haraluya/vsale-lite/settings/secrets/actions
- 查看 Actions: https://github.com/haraluya/vsale-lite/actions
