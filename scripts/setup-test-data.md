# Feature 003 測試資料設定指南

## 快速開始

### 步驟 1: 執行 Migration（已完成 ✅）

Migration 已經成功推送到雲端 Supabase：
```bash
supabase db push  # ✅ 已執行
```

驗證 Migration 狀態：
```bash
supabase migration list
# 應該看到 20260102 在 Remote 欄位顯示已應用
```

---

### 步驟 2: 生成測試資料

**方法 1: 使用 Supabase Dashboard（推薦）**

1. 開啟 Supabase SQL Editor:
   https://app.supabase.com/project/qwovavytryvgchcowjof/sql/new

2. 複製以下檔案的完整內容：
   ```
   specs/003-series-and-pricing/seed-test-data.sql
   ```

3. 貼上到 SQL Editor 並點擊「Run」

4. 確認輸出訊息顯示：
   - ✓ 分類建立完成（飲料、零食、日用品）
   - ✓ 系列建立完成（美粒果系列、茶飲系列、洋芋片系列）
   - ✓ 商品建立完成（5 個商品，自動產生編號）
   - ✓ 等級價格設定完成（批發 $50、零售 $60、經銷商 $45）

---

### 步驟 3: 建立測試用戶

使用後台「快速開戶」功能建立測試帳號：

1. 登入後台管理介面：
   http://localhost:3002/admin/login

2. 使用管理員帳號登入

3. 進入「客戶管理」→「新增客戶」

4. 建立以下測試帳號：

   **批發客戶**:
   - 手機號碼: `0912345678`
   - 會員等級: 批發
   - 預設密碼: 系統自動產生

   **零售客戶**:
   - 手機號碼: `0987654321`
   - 會員等級: 零售
   - 預設密碼: 系統自動產生

---

### 步驟 4: 開始測試

參考測試指南進行測試：
```
specs/003-series-and-pricing/README_TESTING.md
specs/003-series-and-pricing/TEST_CHECKLIST.md
```

---

## 驗證資料是否正確建立

在 Supabase SQL Editor 中執行：

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
```

---

## 重置測試資料（選用）

如果需要重新開始，可以刪除測試資料：

```sql
-- 警告：這會刪除所有資料！
DELETE FROM tier_prices;
DELETE FROM products;
DELETE FROM series;
-- 分類與等級建議保留
```

---

## 常見問題

### Q: Migration 執行失敗怎麼辦？

A: 檢查錯誤訊息，常見問題：
- 權限不足：確認使用 service_role key
- 資料表已存在：執行 `supabase migration repair --status applied 20260102`
- 網路問題：重新執行 `supabase db push`

### Q: 測試資料沒有正確建立？

A: 確認：
1. Migration 已成功執行（`supabase migration list`）
2. SQL 檔案內容完整複製
3. 在 SQL Editor 中查看錯誤訊息

### Q: 前台無法看到商品？

A: 檢查：
1. 系列狀態是否為 `active`
2. 商品狀態是否為 `active`
3. 用戶是否已登入
4. RLS 策略是否正確

---

**測試順利！** 🎉
