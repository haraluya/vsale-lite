# 站點二快速設定指南

**目的**: 5 分鐘內完成站點二資料遷移設定

---

## 步驟 1: 取得站點二的 Supabase 金鑰

### 方法 A：從 Supabase Dashboard 取得

1. 前往站點二的 Supabase Dashboard
2. 點擊 `Settings` （左下角齒輪圖示）
3. 點擊 `API`
4. 複製以下資訊：
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL_SITE2
   - `service_role` key (非 anon key) → SUPABASE_SERVICE_ROLE_KEY_SITE2

### 方法 B：從截圖中的資訊判斷

根據您的截圖，站點二資訊可能是：
- Project Ref: `rdyvmgomjdglflrcfijs`
- URL: `https://rdyvmgomjdglflrcfijs.supabase.co`

---

## 步驟 2: 在 .env.local 新增站點二配置

開啟 `d:\APP\vsale\.env.local`，在檔案最後新增：

```env
# ================================================
# 站點二 Supabase 配置（用於資料遷移）
# ================================================
NEXT_PUBLIC_SUPABASE_URL_SITE2=https://rdyvmgomjdglflrcfijs.supabase.co
SUPABASE_SERVICE_ROLE_KEY_SITE2=請填入您的_service_role_key
```

**重要**: 必須使用 `service_role` key，不是 `anon` key

---

## 步驟 3: 執行比較

```bash
pnpm site2:compare
```

**預期輸出（範例）**:

```
🔍 站點資料比較工具

主站點: https://qwovavytryvgchcowjof.supabase.co
站點二: https://rdyvmgomjdglflrcfijs.supabase.co

============================================================

📊 比較資料表: tiers
  主站點: 5 筆
  站點二: 0 筆
  ❌ 數量不一致 (差異: 5 筆)
  ✅ 欄位結構一致

📊 比較資料表: categories
  主站點: 12 筆
  站點二: 0 筆
  ❌ 數量不一致 (差異: 12 筆)
  ✅ 欄位結構一致

...

============================================================

📋 比較總結:

✅ 一致: 0 個資料表
❌ 不一致: 9 個資料表
⚠️  錯誤: 0 個資料表

不一致的資料表:
  - tiers: 主站 5 筆 vs 站點二 0 筆
  - categories: 主站 12 筆 vs 站點二 0 筆
  - products: 主站 150 筆 vs 站點二 0 筆
  ...
```

---

## 步驟 4: 執行遷移

確認比較結果後，執行遷移：

```bash
pnpm site2:migrate
```

**執行流程**:

```
🚀 智慧型站點遷移工具

來源: https://qwovavytryvgchcowjof.supabase.co
目標: https://rdyvmgomjdglflrcfijs.supabase.co

⚠️  警告: 此操作會清空站點二的所有資料！
請確認您已備份重要資料。

5 秒後開始遷移... (Ctrl+C 取消)

============================================================

📦 遷移: 會員等級 (tiers)
  總共 5 筆資料
  🗑️  清空站點二的 tiers 資料...
  📥 批次 1/1 (1-5)... ✅ 完成 (5/5)
  ✅ 遷移完成: 5 筆

📦 遷移: 商品分類 (categories)
  總共 12 筆資料
  🗑️  清空站點二的 categories 資料...
  📥 批次 1/1 (1-12)... ✅ 完成 (12/12)
  ✅ 遷移完成: 12 筆

...

============================================================

📋 遷移總結:

✅ 成功: 9 個資料表
❌ 失敗: 0 個資料表

成功遷移:
  - tiers: 5 筆
  - categories: 12 筆
  - series: 8 筆
  - products: 150 筆
  - tier_prices: 450 筆
  - coupons: 3 筆
  - coupon_tier_restrictions: 5 筆
  - coupon_series_restrictions: 2 筆
  - system_settings: 10 筆

📊 總計遷移: 645 筆資料
============================================================
```

---

## 步驟 5: 驗證結果

再次執行比較確認：

```bash
pnpm site2:compare
```

**預期結果**: 所有資料表應該顯示 `✅ 數量一致`

---

## 疑難排解

### 錯誤 1: `Cannot read property 'url' of undefined`

**原因**: .env.local 中缺少站點二配置

**解決**: 檢查是否已新增：
```bash
# Windows PowerShell
Select-String -Path .env.local -Pattern "SITE2"

# 應該看到兩行
```

### 錯誤 2: `permission denied for table xxx`

**原因**: 使用的不是 service_role key

**解決**:
1. 前往 Supabase Dashboard → Settings → API
2. 確認複製的是 `service_role` key（有 "secret" 警告標示）
3. **不是** `anon` / `public` key

### 錯誤 3: `connect ECONNREFUSED`

**原因**: URL 錯誤或網路問題

**解決**:
```bash
# 測試連線
ping rdyvmgomjdglflrcfijs.supabase.co

# 確認 URL 格式
# ✅ 正確: https://rdyvmgomjdglflrcfijs.supabase.co
# ❌ 錯誤: http://rdyvmgomjdglflrcfijs.supabase.co (沒有 s)
# ❌ 錯誤: rdyvmgomjdglflrcfijs.supabase.co (缺少 https://)
```

---

## 完整 .env.local 範例

```env
# ================================================
# 主站點（當前使用）
# ================================================
NEXT_PUBLIC_SUPABASE_URL=https://qwovavytryvgchcowjof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ================================================
# 站點二（資料遷移目標）
# ================================================
NEXT_PUBLIC_SUPABASE_URL_SITE2=https://rdyvmgomjdglflrcfijs.supabase.co
SUPABASE_SERVICE_ROLE_KEY_SITE2=eyJhbGci...YOUR_SERVICE_ROLE_KEY_HERE

# ... 其他配置 ...
```

---

## 步驟 6: 配置站點二的環境變數（重要）

### ⚠️ 站點二需要獨立設定環境變數

**重要提醒**: 站點二是**獨立的應用實例**，需要在 Vercel 設定自己的環境變數。

### 最小配置（推薦）

站點二僅需要 **3 個核心變數**即可正常運作：

1. 前往 [站點二 Vercel 環境變數設定](https://vercel.com/haraluyas-projects/vsale-site2/settings/environment-variables)

2. 確認已設定以下 3 個變數（**勾選所有環境**）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://rdyvmgomjdglflrcfijs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_site2_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_site2_service_role_key
```

**取得站點二金鑰**：
1. 前往 [站點二 Supabase Dashboard](https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs)
2. Settings → API
3. 複製 `Project URL` 和 `anon` / `service_role` 金鑰

### 移除未使用的變數

**檢查並移除** `SITE_IDENTIFIER` 變數（此變數未被程式碼使用）：

1. 在 Vercel 環境變數列表中找到 `SITE_IDENTIFIER`
2. 點擊右側「⋯」→「Remove」
3. 確認刪除

### 進階配置：新增 GCS 雲端備份（強烈推薦）

**⚠️ 重要**: Supabase 免費版沒有自動備份功能，強烈建議設定 GCS 備份保護資料安全。

#### 快速同步（10 分鐘）

請參考 **[站點二 GCS 備份同步指南](SYNC_GCS_TO_SITE2.md)** 完成以下步驟：

1. 從主站複製 4 個 GCS 環境變數
2. 新增到站點二（所有環境勾選）
3. 觸發重新部署
4. 測試備份功能

**新增的變數**：
- `GCS_SERVICE_ACCOUNT_KEY` - Google Cloud 服務帳號金鑰
- `GCS_BUCKET_NAME` - GCS 儲存桶名稱（與主站共用）
- `GCS_PROJECT_ID` - Google Cloud 專案 ID
- `CRON_SECRET` - Cron Job 安全驗證

**優點**：
- ✅ 與主站同等級的資料保護
- ✅ 自動化每日備份（凌晨 2:00）
- ✅ 異地容災保護
- ✅ 共用 GCS 儲存桶（成本約 $1/月）

**常見問題**：
- ❓ **站點二需要備份嗎？**
  - ✅ **強烈建議**。Supabase 免費版沒有內建備份功能
- ❓ **與主站共用儲存桶會衝突嗎？**
  - ✅ **不會**。透過檔名時間戳區分，不會互相覆蓋
- ❓ **如果不想要備份呢？**
  - ⚠️ **風險很高**。資料遺失無法復原，僅適合測試環境

詳細說明請參考：
- [站點二 GCS 備份同步指南](SYNC_GCS_TO_SITE2.md) - **⭐ 完整同步步驟**
- [站點二環境變數分析](SITE2_ENV_ANALYSIS.md) - 詳細的變數說明

---

## 步驟 7: 測試站點二功能

遷移完成後，測試站點二的核心功能：

### 測試前台

```bash
# 訪問站點二 URL（假設為 vsale-site2.vercel.app）
open https://vsale-site2.vercel.app/login
```

**測試項目**：
- ✅ 頁面正常載入
- ✅ 可以使用測試帳號登入
- ✅ 可以瀏覽商品（應顯示遷移的商品資料）
- ✅ 可以加入購物車
- ✅ 可以建立訂單

### 測試後台

```bash
open https://vsale-site2.vercel.app/admin/login
```

**測試項目**：
- ✅ 可以使用管理員帳號登入
- ✅ 可以查看遷移的會員等級、分類、商品
- ✅ 可以管理訂單

### 使用驗證工具（推薦）

```bash
# 下載驗證工具到本地
pnpm verify-deploy https://vsale-site2.vercel.app
```

**預期結果**：
```
🔍 部署驗證工具 v1.0.0
目標 URL: https://vsale-site2.vercel.app

============================================================

✅ 測試 1/5: 首頁連線
   狀態碼: 200
   回應時間: 245ms

✅ 測試 2/5: 前台登入頁
   狀態碼: 200
   回應時間: 180ms

✅ 測試 3/5: 後台登入頁
   狀態碼: 200
   回應時間: 195ms

✅ 測試 4/5: API 健康檢查
   狀態碼: 200
   環境變數: ✅ 已設定

✅ 測試 5/5: 資料庫連線
   狀態碼: 200
   Supabase: ✅ 連線正常

============================================================

📊 驗證結果: 5/5 通過
✅ 站點二部署成功！
```

---

**最後更新**: 2026-01-23
**相關文件**:
- [站點二環境變數分析](SITE2_ENV_ANALYSIS.md) - 詳細的變數說明與配置建議
- [環境變數檢查清單](ENV_VARIABLES_CHECKLIST.md) - 所有變數的用途說明
