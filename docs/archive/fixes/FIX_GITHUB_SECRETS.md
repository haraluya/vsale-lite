# 🔧 GitHub Secrets 快速修正

## 問題原因

GitHub Secrets 中的 `VERCEL_PROJECT_ID` 使用了**錯誤的專案 ID**。

**錯誤的 ID**: `prj_LKdxGgd6X1eeArB9fdIPQbjG5jE5` (舊的 vsale 專案)  
**正確的 ID**: `prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI` (新的 vsale 專案)

---

## ✅ 立即修正步驟

### 步驟 1: 更新 VERCEL_PROJECT_ID

1. 前往 [GitHub Secrets 設定](https://github.com/haraluya/vsale-lite/settings/secrets/actions)
2. 找到 `VERCEL_PROJECT_ID` Secret
3. 點擊「**Update**」或「**編輯**」
4. 將值更新為：

```
prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI
```

5. 點擊「**Update secret**」

### 步驟 2: 驗證其他 Secrets

確認以下 Secrets 正確設定：

| Secret Name | 正確的值 | 狀態 |
|-------------|---------|------|
| `VERCEL_TOKEN` | 你的 Vercel Token | ✅ 需檢查 |
| `VERCEL_ORG_ID` | `team_qBAl7rAnjwmYd7dwQMBfMto6` | ✅ 正確 |
| `VERCEL_PROJECT_ID` | `prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI` | ❌ **需更新** |

### 步驟 3: 重新執行 GitHub Actions

1. 前往 [GitHub Actions](https://github.com/haraluya/vsale-lite/actions)
2. 選擇最新失敗的 workflow
3. 點擊「**Re-run all jobs**」

---

## 🔍 驗證結果

成功後應該看到：
- ✅ 程式碼品質檢查通過
- ✅ 部署到 Vercel 成功
- ✅ 可以訪問 https://vsale.vercel.app

---

## ⚠️ 如果 VERCEL_TOKEN 仍然缺少

如果您尚未建立 Vercel Token，請執行以下步驟：

1. **建立 Token**:
   - 前往 https://vercel.com/account/tokens
   - 點擊「**Create Token**」
   - Name: `GitHub Actions - vsale-lite`
   - Scope: `Full Account`
   - Expiration: `No Expiration`
   - 點擊「**Create**」
   - **立即複製 Token**（只顯示一次）

2. **新增 Secret**:
   - 前往 https://github.com/haraluya/vsale-lite/settings/secrets/actions
   - 點擊「**New repository secret**」
   - Name: `VERCEL_TOKEN`
   - Secret: 貼上剛才複製的 Token
   - 點擊「**Add secret**」

---

## 📋 完整 Secrets 檢查清單

更新後，您的 GitHub Secrets 應該包含：

- [x] `VERCEL_TOKEN` - 你的 Vercel API Token
- [x] `VERCEL_ORG_ID` - `team_qBAl7rAnjwmYd7dwQMBfMto6`
- [x] `VERCEL_PROJECT_ID` - `prj_RidqMdlWv7rdjBSbtbw6qEX6ZaLI` ⚠️ **已更新**

---

**優先順序**: 立即更新 `VERCEL_PROJECT_ID`，這是導致部署失敗的主因。
