# ⚠️ 需要立即執行 Migration

## 問題原因

資料庫尚未執行 Migration，導致以下錯誤：
- ❌ `series` 表不存在
- ❌ `tier_prices` 表不存在
- ❌ `products` 表缺少 `series_id`, `retail_price`, `stock_status` 欄位

## 📋 立即執行步驟（2 分鐘）

### 步驟 1: 開啟 Supabase SQL Editor

點擊以下連結：
```
https://app.supabase.com/project/qwovavytryvgchcowjof/sql/new
```

### 步驟 2: 複製 Migration 內容

開啟檔案：
```
D:\APP\vsale\supabase\migrations\20260102_series_and_tier_prices.sql
```

**複製完整內容**（約 500 行）

### 步驟 3: 貼上並執行

1. 將內容貼到 SQL Editor
2. 點擊右下角「Run」按鈕
3. 等待執行完成（約 5-10 秒）

### 步驟 4: 確認成功

執行完成後，應該看到類似以下訊息：
```
NOTICE: 資料遷移成功：所有商品已遷移到系列
NOTICE: 資料遷移完成統計：
NOTICE: - 系列數量：3
NOTICE: - 商品數量：X
NOTICE: Migration 完成: 003-series-and-pricing
```

---

## 🎯 執行完成後

Migration 成功後：

1. ✅ 重新整理瀏覽器（F5）
2. ✅ 進入「系列管理」應該可以正常開啟
3. ✅ 進入「價格管理」應該可以正常開啟
4. ✅ 可以開始建立系列與設定價格

---

## 📞 遇到錯誤？

### 錯誤: "relation already exists"

**原因**: Migration 已經部分執行過

**解決**: 忽略該錯誤，繼續執行即可

---

### 錯誤: "permission denied"

**原因**: 權限不足

**解決**:
1. 確認已登入正確的 Supabase 專案
2. 確認帳號有管理員權限

---

### 錯誤: SQL 語法錯誤

**原因**: 內容複製不完整

**解決**:
1. 重新複製完整的 SQL 檔案內容
2. 確認從第一行 `-- ===` 開始到最後一行都有複製

---

## ⏭️ 下一步

Migration 成功後，執行測試資料生成：

1. 開啟 SQL Editor（同上）
2. 複製檔案：`specs/003-series-and-pricing/seed-test-data.sql`
3. 貼上並執行

完成後即可開始測試！🎉
