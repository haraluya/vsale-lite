# 🚨 緊急修復：GitHub Secrets 未更新

## 問題確認

GitHub Actions 仍然顯示「Project not found」錯誤，這表示：

**您的 GitHub Secrets 中的 `VERCEL_PROJECT_ID` 還沒有更新！**

---

## ⚡ 立即修復（5 分鐘）

### 步驟 1: 檢查現有 Secrets

1. 前往 [GitHub Secrets 設定](https://github.com/haraluya/vsale-lite/settings/secrets/actions)
2. 檢查是否有以下 3 個 Secrets：
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

### 步驟 2: 更新或新增 Secrets

#### 情況 A: 如果已有 `VERCEL_PROJECT_ID`
1. 點擊 `VERCEL_PROJECT_ID` 旁的「**Update**」
2. 將值更新為：`prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI`
3. 點擊「**Update secret**」

#### 情況 B: 如果沒有任何 Secrets
請完整新增以下 3 個 Secrets：

**Secret 1: VERCEL_TOKEN**
1. 前往 [Vercel Tokens](https://vercel.com/account/tokens)
2. 點擊「**Create Token**」
3. 填寫資訊：
   - Token Name: `GitHub Actions - vsale-lite`
   - Scope: `Full Account`
   - Expiration: `No Expiration`
4. 點擊「**Create**」
5. **立即複製 Token**（只顯示一次！）
6. 回到 [GitHub Secrets](https://github.com/haraluya/vsale-lite/settings/secrets/actions)
7. 點擊「**New repository secret**」
8. Name: `VERCEL_TOKEN`
9. Secret: 貼上 Token
10. 點擊「**Add secret**」

**Secret 2: VERCEL_ORG_ID**
1. 點擊「**New repository secret**」
2. Name: `VERCEL_ORG_ID`
3. Secret: `team_qBAl7rAnjwmYd7dwQMBfMto6`
4. 點擊「**Add secret**」

**Secret 3: VERCEL_PROJECT_ID**
1. 點擊「**New repository secret**」
2. Name: `VERCEL_PROJECT_ID`
3. Secret: `prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI`
4. 點擊「**Add secret**」

### 步驟 3: 重新執行部署

1. 前往 [GitHub Actions](https://github.com/haraluya/vsale-lite/actions)
2. 選擇最新失敗的 workflow（「fix: 更新正確的 Vercel 專案 ID」）
3. 點擊「**Re-run all jobs**」
4. 等待約 2-3 分鐘

---

## ✅ 成功標誌

修復成功後，您會看到：
- ✅ 「程式碼品質檢查」通過（綠勾勾）
- ✅ 「部署到 Vercel」成功（綠勾勾）
- ✅ 可以訪問 https://vsale.vercel.app

---

## 📋 完整 Secrets 檢查表

| Secret Name | 正確的值 | 必須 |
|-------------|---------|------|
| `VERCEL_TOKEN` | 你的 Vercel API Token | ✅ 必須 |
| `VERCEL_ORG_ID` | `team_qBAl7rAnjwmYd7dwQMBfMto6` | ✅ 必須 |
| `VERCEL_PROJECT_ID` | `prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI` | ✅ 必須 |

---

## ⚠️ 重要提醒

1. **Secrets 是私密的**
   - 在 GitHub 介面中，Secrets 的值不會顯示
   - 只能新增或更新，無法查看現有值

2. **VERCEL_TOKEN 只顯示一次**
   - 建立後立即複製
   - 如果遺失，必須刪除舊的並重新建立

3. **更新後立即生效**
   - 更新 Secrets 後，下次 Actions 執行時就會使用新值

---

## 🆘 如果仍然失敗

請檢查：
1. ✅ 3 個 Secrets 都已正確新增
2. ✅ `VERCEL_PROJECT_ID` 的值確實是 `prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI`
3. ✅ `VERCEL_TOKEN` 有效（未過期）
4. ✅ Vercel 專案 `vsale` 存在且可訪問

---

**關鍵點**：GitHub Secrets 必須**手動在網頁介面設定**，無法透過程式碼或 CLI 自動設定。
