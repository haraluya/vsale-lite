# Feature 003 快速設定指南（5 分鐘完成）

## ✅ 已完成項目

1. **Migration 已推送到雲端**
   - ✅ `series` 表已建立
   - ✅ `tier_prices` 表已建立
   - ✅ `products` 表已更新（新增 series_id, retail_price, stock_status）
   - ✅ 商品編號自動產生 Function 已建立
   - ✅ RLS 策略已設定

2. **後台導航已更新**
   - ✅ 新增「系列管理」入口
   - ✅ 新增「價格管理」入口

3. **開發環境運行中**
   - ✅ Next.js 開發伺服器: http://localhost:3002

---

## 🚀 接下來要做的事（3 個步驟）

### 步驟 1: 生成測試資料（必須）⭐

1. 開啟 Supabase SQL Editor:
   ```
   https://app.supabase.com/project/qwovavytryvgchcowjof/sql/new
   ```

2. 複製檔案內容並執行:
   ```
   D:\APP\vsale\specs\003-series-and-pricing\seed-test-data.sql
   ```

3. 確認輸出顯示成功訊息

---

### 步驟 2: 建立測試用戶（必須）⭐

1. 開啟後台管理:
   ```
   http://localhost:3002/admin/login
   ```

2. 登入管理員帳號

3. 進入「客戶管理」→「新增客戶」，建立兩個測試帳號:
   - 手機: `0912345678`，等級: 批發
   - 手機: `0987654321`，等級: 零售

---

### 步驟 3: 開始測試（參考測試清單）

開啟測試指南:
```
D:\APP\vsale\specs\003-series-and-pricing\README_TESTING.md
D:\APP\vsale\specs\003-series-and-pricing\TEST_CHECKLIST.md
```

按照清單逐項測試 ✅

---

## 📋 測試重點

### 後台測試（管理員）

1. **系列管理** (`/admin/series`)
   - [ ] 點擊「新增系列」建立新系列
   - [ ] 上傳系列圖片
   - [ ] 編輯系列資訊
   - [ ] 切換系列狀態（啟用/停用）

2. **商品管理** (`/admin/products`)
   - [ ] 建立新商品（編號自動產生）
   - [ ] 編輯商品（編號唯讀）
   - [ ] 商品編號格式正確（如 DRK-0001）

3. **價格管理** (`/admin/pricing`)
   - [ ] 選擇商品
   - [ ] 設定各等級價格（批發、零售、經銷商）
   - [ ] 儲存後價格正確顯示

### 前台測試（客戶）

1. **系列列表** (`/store`)
   - [ ] 登入批發帳號（0912345678）
   - [ ] 看到系列卡片與圖片
   - [ ] 點擊進入系列詳情頁

2. **價格顯示** (`/store/series/[id]`)
   - [ ] 批發帳號看到批發價 $50
   - [ ] 零售帳號看到零售價 $60
   - [ ] 顯示折扣百分比（批發有折扣）
   - [ ] 庫存狀態正確顯示（充足/緊張/缺貨）

---

## 🔧 常用指令

```bash
# 開發伺服器
pnpm dev

# 型別檢查
pnpm type-check

# 建置
pnpm build

# Supabase Migration
supabase db push         # 推送 Migration 到雲端
supabase migration list  # 查看 Migration 狀態
supabase db pull         # 拉取雲端 Schema
```

---

## 📞 遇到問題？

### 錯誤: "Could not find the table 'public.series'"

**原因**: 測試資料尚未生成

**解決**: 執行步驟 1（生成測試資料）

---

### 錯誤: "getProducts error"

**原因**: Migration 未正確執行或測試資料缺失

**解決**:
1. 確認 Migration 狀態: `supabase migration list`
2. 確認 20260102 在 Remote 欄位已標記
3. 重新執行測試資料生成

---

### 前台看不到系列或商品

**可能原因**:
1. 測試資料未生成 → 執行步驟 1
2. 系列或商品狀態為 inactive → 在後台改為 active
3. RLS 策略問題 → 確認用戶已登入

---

**準備就緒！開始測試吧！** 🎉

完成測試後，記得填寫測試檢查清單：
`specs/003-series-and-pricing/TEST_CHECKLIST.md`
