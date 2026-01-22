# Storage 圖片自動遷移指南

**工具**: Node.js 腳本 + Supabase SDK
**執行時間**: 約 2-5 分鐘（視圖片數量而定）

---

## 🚀 快速開始

### 步驟 1: 取得站點二 Service Role Key

1. 前往站點二 Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   ```

2. 點擊左側 **Settings** → **API**

3. 找到 **Project API keys** 區域

4. 複製 **service_role** key（標示為 `secret`）

**重要**: Service Role Key 具有完整權限，請勿分享或提交到 Git

---

### 步驟 2: 設定環境變數

在 PowerShell 中執行:

```powershell
# 設定站點二 Service Role Key（請替換為實際的 key）
$env:SITE2_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey..."
```

**或者**，建立 `.env.local` 檔案（腳本會自動讀取）:

```env
SITE2_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

---

### 步驟 3: 執行遷移腳本

```bash
# 確保在專案根目錄
cd d:\APP\vsale

# 執行遷移腳本
node scripts/migrate-storage.mjs
```

---

## 📊 執行過程

腳本會自動執行以下步驟:

```
╔═══════════════════════════════════════════════════════════════╗
║   Supabase Storage 自動遷移工具                               ║
║   主站 → 站點二                                              ║
╚═══════════════════════════════════════════════════════════════╝

📦 正在遷移 Bucket: products
  ℹ️  列出檔案...
  ✅ 找到 48 個檔案
  [1/48] 0f600aа5-bdf5-4be9-97...
    ✅ 成功
  [2/48] 03004ff8-cf4f-4029-97f...
    ✅ 成功
  ...

📦 正在遷移 Bucket: public
  ℹ️  列出檔案...
  ✅ 找到 5 個檔案
  ...

📦 正在遷移 Bucket: announcements
  ℹ️  列出檔案...
  ✅ 找到 0 個檔案
  ⚠️  Bucket announcements 為空，跳過

╔═══════════════════════════════════════════════════════════════╗
║   ✅ 遷移完成！                                              ║
╚═══════════════════════════════════════════════════════════════╝

📊 遷移統計:

  products:
    - 成功: 48 個
    - 失敗: 0 個
    - 總計: 48 個

  public:
    - 成功: 5 個
    - 失敗: 0 個
    - 總計: 5 個

  announcements:
    - 成功: 0 個
    - 失敗: 0 個
    - 總計: 0 個

  總計:
    - 成功: 53 個
    - 失敗: 0 個
    - 總計: 53 個
    - 耗時: 45.3 秒
```

---

## ✅ 驗證遷移結果

### 方法 1: Supabase Dashboard

1. 前往站點二 Storage:
   ```
   https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/storage/buckets
   ```

2. 檢查每個 Bucket:
   - **products**: 商品圖片（應該有檔案）
   - **public**: 公共圖片（應該有檔案）
   - **announcements**: 公告圖片（可能為空）

3. 隨機開啟幾個檔案,確認圖片正確顯示

### 方法 2: 測試網站

1. 前往站點二網站:
   ```
   https://vsale-site2.vercel.app
   ```

2. 檢查商品列表是否正確顯示圖片

3. 檢查商品詳情頁圖片是否正確

---

## ⚠️ 常見問題

### Q: 執行時出現 "Please install @supabase/supabase-js" 錯誤?

**A**: 專案已安裝 Supabase SDK,但如果有問題可以重新安裝:

```bash
npm install @supabase/supabase-js
```

### Q: 執行時出現 "SITE2_SERVICE_KEY 未設定" 錯誤?

**A**: 確認已正確設定環境變數:

```powershell
# 檢查環境變數
$env:SITE2_SERVICE_KEY

# 如果為空,重新設定
$env:SITE2_SERVICE_KEY = "your-service-role-key"
```

### Q: 部分檔案遷移失敗?

**A**: 可能原因:
1. 網路問題 - 重新執行腳本即可（會自動覆蓋）
2. 檔案權限問題 - 檢查主站檔案是否可公開存取
3. 站點二 Storage 容量不足 - 檢查 Supabase Dashboard

**解決方案**: 重新執行腳本,腳本會使用 `upsert: true` 自動覆蓋已存在的檔案

### Q: 執行很慢?

**A**: 正常情況,因為需要:
1. 從主站下載每個檔案
2. 上傳到站點二
3. 網路速度影響執行時間

**預計速度**: 每個檔案約 1-2 秒

---

## 🔧 進階選項

### 僅遷移特定 Bucket

修改腳本中的 `BUCKETS` 陣列:

```javascript
// 只遷移 products
const BUCKETS = ['products']

// 只遷移 products 和 public
const BUCKETS = ['products', 'public']
```

### 檢視臨時檔案

腳本會在 `temp-storage/` 目錄暫存下載的檔案,完成後自動刪除。

如果想保留臨時檔案（除錯用）,註解掉刪除程式碼:

```javascript
// 清理臨時目錄
// try {
//   fs.rmSync(TEMP_DIR, { recursive: true, force: true })
// } catch {}
```

---

## 📝 注意事項

1. **Service Role Key 安全性**
   - 不要提交到 Git
   - 不要分享給他人
   - 使用後可以重新產生

2. **網路穩定性**
   - 建議在網路穩定時執行
   - 如果中斷,可以重新執行（會自動覆蓋）

3. **Storage 容量**
   - 確認站點二有足夠的 Storage 容量
   - Supabase Free Plan: 1GB
   - Pro Plan: 100GB

4. **檔案覆蓋**
   - 腳本使用 `upsert: true`,會覆蓋已存在的同名檔案
   - 如果不想覆蓋,需要修改腳本

---

## 🎯 完整遷移檢查清單

遷移完成後,請確認:

- [ ] 站點二 Storage Buckets 有檔案
- [ ] 檔案數量與主站一致
- [ ] 隨機檢查幾個圖片可以開啟
- [ ] 站點二網站商品圖片正常顯示
- [ ] 站點二網站公告圖片正常顯示（如有）

---

**最後更新**: 2026-01-22
**文件版本**: 1.0.0
