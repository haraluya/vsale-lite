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

**最後更新**: 2026-01-22
