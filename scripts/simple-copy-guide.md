# Vsale 資料複製簡易指南

由於資料量較大（超過 100 個商品），最快的方式是使用 **CSV 匯出/匯入**。

## 📋 操作步驟（約 10 分鐘）

### 步驟 1：從主站匯出 CSV（5 分鐘）

**前往主站 Table Editor**：
```
https://supabase.com/dashboard/project/qwovavytryvgchcowjof/editor
```

**依序匯出以下表格為 CSV**（順序無所謂）：

1. **categories**（商品分類）
   - 點擊表格 → 右上角「...」→「Export to CSV」
   - 儲存為：`d:\APP\vsale\backup\categories.csv`

2. **tiers**（會員等級）
   - Export to CSV
   - 儲存為：`d:\APP\vsale\backup\tiers.csv`

3. **series**（商品系列）
   - Export to CSV
   - 儲存為：`d:\APP\vsale\backup\series.csv`

4. **products**（商品）
   - Export to CSV
   - 儲存為：`d:\APP\vsale\backup\products.csv`

5. **tier_prices**（等級價格）
   - Export to CSV
   - 儲存為：`d:\APP\vsale\backup\tier_prices.csv`

6. **coupons**（優惠券 - 可選）
   - Export to CSV
   - 儲存為：`d:\APP\vsale\backup\coupons.csv`

---

### 步驟 2：匯入到 Site 2（5 分鐘）

**前往 Site 2 Table Editor**：
```
https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/editor
```

**⚠️ 必須依照以下順序匯入**（因為有外鍵依賴）：

1. **categories** ← 先匯入（其他表依賴它）
   - 點擊「categories」表
   - 右上角「...」→「Import data from CSV」
   - 選擇：`d:\APP\vsale\backup\categories.csv`
   - 等待匯入完成

2. **tiers** ← 第二（tier_prices 依賴它）
   - 點擊「tiers」表
   - Import data from CSV
   - 選擇：`d:\APP\vsale\backup\tiers.csv`

3. **series** ← 第三（依賴 categories，products 依賴它）
   - 點擊「series」表
   - Import data from CSV
   - 選擇：`d:\APP\vsale\backup\series.csv`

4. **products** ← 第四（依賴 series，tier_prices 依賴它）
   - 點擊「products」表
   - Import data from CSV
   - 選擇：`d:\APP\vsale\backup\products.csv`

5. **tier_prices** ← 第五（依賴 tiers 和 products）
   - 點擊「tier_prices」表
   - Import data from CSV
   - 選擇：`d:\APP\vsale\backup\tier_prices.csv`

6. **coupons** ← 最後（可選）
   - 點擊「coupons」表
   - Import data from CSV
   - 選擇：`d:\APP\vsale\backup\coupons.csv`

---

### 步驟 3：驗證資料（1 分鐘）

**前往 Site 2 SQL Editor**：
```
https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/sql
```

**執行以下查詢**：

```sql
-- 檢查各表資料筆數
SELECT
  'categories' as table_name,
  COUNT(*) as row_count
FROM categories
UNION ALL
SELECT 'tiers', COUNT(*) FROM tiers
UNION ALL
SELECT 'series', COUNT(*) FROM series
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'tier_prices', COUNT(*) FROM tier_prices
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
ORDER BY table_name;
```

**比對主站筆數**：

在主站 SQL Editor 執行相同查詢，確認筆數一致。

---

## ✅ 完成！

複製完成後：

1. 前往 Site 2 後台：`https://vsale-site2.vercel.app/admin/login`
2. 登入：`admin@site2.com` / `Admin123456!`
3. 檢查商品管理頁面
4. 測試前台商品顯示

---

## ⚠️ 注意事項

### 如果匯入失敗

**錯誤：Duplicate key value violates unique constraint**

**原因**：表格已有資料

**解決**：先清空表格

```sql
-- 在 Site 2 SQL Editor 執行（依序執行）
TRUNCATE TABLE tier_prices CASCADE;
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE series CASCADE;
TRUNCATE TABLE tiers CASCADE;
TRUNCATE TABLE categories CASCADE;
```

然後重新匯入。

---

## 📊 預期資料量

根據您提到的「超過 100 個商品」：

- Categories: 約 10-20 筆
- Tiers: 約 3-5 筆
- Series: 約 20-30 筆
- Products: 100+ 筆
- Tier Prices: 300-500 筆（Products × Tiers）
- Coupons: 0-10 筆

**總計：CSV 匯出/匯入約 10 分鐘完成**
