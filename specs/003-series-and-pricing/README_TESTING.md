# Feature 003 測試快速啟動指南

**快速開始測試 Feature 003 - 商品系列與等級價格管理**

---

## 🚀 快速啟動（5 分鐘）

### Step 1: 執行 Migration

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 進入專案 → SQL Editor
3. 複製並執行以下 SQL 檔案內容：
   ```
   D:\APP\vsale\supabase\migrations\20260102_series_and_tier_prices.sql
   ```
4. 確認輸出訊息顯示「Migration 完成」

### Step 2: 建立測試資料

在 Supabase SQL Editor 中執行：
```
D:\APP\vsale\specs\003-series-and-pricing\seed-test-data.sql
```

這會自動建立：
- ✅ 3 個分類（飲料、零食、日用品）
- ✅ 3 個系列（美粒果系列等）
- ✅ 5 個商品（蘋果汁、橘子汁等）
- ✅ 所有等級價格設定

### Step 3: 建立測試用戶

使用後台「快速開戶」功能（`/admin/clients/new`）建立：

| 手機號碼 | 會員等級 | 用途 |
|---------|---------|------|
| 0912345678 | 批發 | 測試批發價格 |
| 0987654321 | 零售 | 測試零售價格 |

### Step 4: 啟動開發伺服器

```bash
cd D:\APP\vsale
pnpm dev
```

開啟瀏覽器：`http://localhost:3000`

### Step 5: 開始測試

開啟測試檢查清單：
```
D:\APP\vsale\specs\003-series-and-pricing\TEST_CHECKLIST.md
```

按照清單逐項測試 ✅

---

## 📁 測試文件導航

### 核心測試文件

| 檔案 | 用途 | 何時使用 |
|------|------|---------|
| [testing-guide.md](./testing-guide.md) | 📘 詳細測試指南（20 個測試項目） | 查看測試步驟與預期結果 |
| [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) | ✅ 測試檢查清單 | 追蹤測試進度、記錄 Bug |
| [seed-test-data.sql](./seed-test-data.sql) | 🗃️ 測試資料生成腳本 | 快速建立測試資料 |
| [test-queries.sql](./test-queries.sql) | 🔍 資料庫驗證查詢 | 驗證 Migration 執行結果 |

### 參考文件

| 檔案 | 用途 |
|------|------|
| [spec.md](./spec.md) | 功能規格與使用者故事 |
| [data-model.md](./data-model.md) | 資料庫 Schema 與關聯 |
| [quickstart.md](./quickstart.md) | 開發者快速上手指南 |
| [contracts/](./contracts/) | Server Actions API 合約 |

---

## 🧪 測試項目總覽

### P0（必須通過）- 9 項

| ID | 測試項目 | 涵蓋功能 |
|----|---------|---------|
| T-001 | 系列管理 CRUD | 後台管理 |
| T-002 | 系列圖片上傳 | 後台管理 |
| T-003 | 商品建立與自動編號 | 後台管理、自動編號 |
| T-004 | 商品編輯（編號唯讀） | 後台管理 |
| T-005 | 等級價格設定 | 後台管理 |
| T-006 | 前台系列列表 | 前台瀏覽 |
| T-007 | 前台價格顯示（批發） | 前台瀏覽、等級價格 |
| T-008 | 前台價格顯示（零售） | 前台瀏覽、等級價格 |
| T-009 | 前台導航列與登出 | 前台 UX |

### P1（建議通過）- 3 項

| ID | 測試項目 | 涵蓋功能 |
|----|---------|---------|
| T-010 | 系列上下架 | 上下架管理 |
| T-011 | 商品上下架 | 上下架管理 |
| T-012 | 庫存狀態顯示 | 庫存狀態管理 |

### P2（選填）- 6 項

| ID | 測試項目 | 涵蓋功能 |
|----|---------|---------|
| T-013 | 商品編號斷號 | Edge Case |
| T-014 | 並發建立商品 | Edge Case、效能 |
| T-015 | 未設定價格商品 | Edge Case |
| T-016 | 系列刪除保護 | Edge Case |
| T-017 | 分類代碼衝突 | Edge Case |
| T-018 | 系列遷移 | Edge Case |

---

## 🔧 常用測試命令

### 開發環境

```bash
# 啟動開發伺服器
pnpm dev

# 型別檢查
pnpm type-check

# 建置檢查
pnpm build
```

### 資料庫查詢（Supabase SQL Editor）

```sql
-- 查詢所有商品與編號
SELECT code, name, series_id FROM products ORDER BY code;

-- 查詢商品價格設定
SELECT
    p.code,
    p.name,
    t.name as tier_name,
    tp.price
FROM products p
CROSS JOIN tiers t
LEFT JOIN tier_prices tp ON tp.product_id = p.id AND tp.tier_id = t.id
ORDER BY p.code, t.rank;

-- 驗證 RLS 策略
SELECT
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN ('series', 'tier_prices', 'products');
```

---

## 🐛 已知問題與限制

### 1. 購物車功能尚未實作

**影響**：
- ProductWithPriceCard 中的 Link 連結到 `/store/${product.id}`
- 該頁面尚未整合購物車功能

**測試策略**：
- 忽略「加入購物車」功能測試
- 專注於價格顯示與系列瀏覽功能

**未來改善**（Feature 004）：
- 在 ProductWithPriceCard 中加入數量選擇器
- 加入「加入購物車」按鈕

### 2. ESLint 需要互動設定

**影響**：
- `pnpm lint` 命令會要求互動設定

**測試策略**：
- 跳過 lint 檢查
- 專注於 `pnpm type-check` 和 `pnpm build`

---

## ✅ 測試完成條件

### 最低要求（可驗收）

- ✅ 所有 P0 測試通過（9/9）
- ✅ `pnpm type-check` 通過
- ✅ `pnpm build` 成功
- ✅ 無重大 Bug

### 理想狀態（高品質）

- ✅ 所有 P0 測試通過（9/9）
- ✅ 所有 P1 測試通過（3/3）
- ✅ 大部分 P2 測試通過（至少 4/6）
- ✅ 效能測試符合預期
- ✅ 無已知 Bug

---

## 📞 測試支援

### 遇到問題時

1. **檢查 Migration 是否正確執行**
   - 執行 `test-queries.sql` 第 1-4 節
   - 確認所有資料表、欄位、Function 都存在

2. **檢查測試資料是否正確建立**
   - 執行 `test-queries.sql` 第 5-6 節
   - 確認商品、系列、價格都存在

3. **檢查測試帳號是否正確建立**
   - 登入 Supabase Dashboard
   - Table Editor → `profiles` 表
   - 確認測試帳號存在且等級正確

4. **查看瀏覽器 Console**
   - F12 開啟開發者工具
   - 查看 Console 面板的錯誤訊息
   - 查看 Network 面板的 API 請求

5. **記錄 Bug**
   - 在 `TEST_CHECKLIST.md` 的「Bug 記錄」區域記錄
   - 包含：測試編號、問題描述、重現步驟、截圖

---

## 🎯 測試重點提示

### 關鍵測試場景

1. **等級價格機制**（核心功能）
   - 不同等級看到不同價格
   - 價格完全由後端控制
   - 未設定價格顯示「價格未設定」

2. **商品編號自動產生**
   - 建立商品時不需輸入編號
   - 編號格式：分類代碼-流水號（如 DRK-0001）
   - 編號建立後不可修改

3. **上下架管理**
   - 系列下架 → 所有商品隱藏
   - 商品下架 → 僅該商品隱藏
   - 前台即時生效

4. **庫存狀態管理**
   - 前台不顯示實際庫存數量
   - 僅顯示狀態標籤（充足/緊張/缺貨）
   - 狀態由管理員手動設定

---

## 📊 測試進度追蹤

使用 `TEST_CHECKLIST.md` 追蹤測試進度：

```markdown
## ✅ 基礎功能測試（P0）- 必須全部通過

- [X] T-001: 系列管理 CRUD
- [X] T-002: 系列圖片上傳
- [ ] T-003: 商品建立與自動編號
- [ ] T-004: 商品編輯（編號唯讀）
...
```

**測試進度**：9 / 9 項通過 ✅

---

## 🎉 測試成功後

1. **更新 tasks.md**
   - 標記所有測試任務為完成 `[X]`

2. **填寫測試總結**
   - 在 `TEST_CHECKLIST.md` 填寫測試統計與結論

3. **準備驗收**
   - 確認所有 P0 測試通過
   - 執行 `pnpm build` 確認建置成功

4. **合併到 master**
   - 經過驗收後，合併 `003-series-and-pricing` 分支到 `master`

---

**祝測試順利！** 🚀

有任何問題，請參考：
- [testing-guide.md](./testing-guide.md) - 詳細測試步驟
- [quickstart.md](./quickstart.md) - 開發者指南
- [spec.md](./spec.md) - 功能規格
