# 資料庫健康檢查 - 快速開始指南

**3 分鐘快速上手**

---

## 步驟 1: 確保 Supabase 正在執行

```powershell
# 啟動 Supabase（若未啟動）
supabase start

# 等待服務啟動（約 30 秒）
# 看到 "Started supabase local development setup." 表示成功
```

---

## 步驟 2: 執行健康檢查

```powershell
# 基本執行（顯示於終端機）
.\scripts\db-health-check.ps1
```

**預期輸出**:
```
========================================
  資料庫健康檢查工具
========================================

[1/5] 檢查 Supabase 服務狀態...
✅ Supabase 服務正在執行

[2/5] 取得資料庫連線資訊...
✅ 連線資訊已取得

[3/5] 執行資料庫健康檢查（預計 30 秒）...
✅ 健康檢查執行完成

[4/5] 解析檢查結果...
✅ 檢查結果已解析

========================================
  健康檢查摘要報告
========================================

檢查項目總數: 225

✅ 通過 (OK):    220 (97.8%)
⚠️  警告 (WARNING): 3 (1.3%)
❌ 錯誤 (ERROR):  2 (0.9%)

整體狀態: 需要注意
```

---

## 步驟 3: 解讀結果

### 狀態說明

| 狀態 | 圖示 | 意義 | 建議 |
|------|------|------|------|
| **OK** | ✅ | 檢查通過 | 無需處理 |
| **WARNING** | ⚠️ | 警告（次要問題） | 可選修復 |
| **ERROR** | ❌ | 錯誤（嚴重問題） | **必須修復** |

### 判斷標準

- **健康**: 0 錯誤，≤2 警告
- **需要注意**: 0 錯誤，3-5 警告
- **不健康**: ≥1 錯誤

---

## 步驟 4: 查看詳細問題（若有錯誤或警告）

### 方法 1: 終端機顯示
檢查報告會自動顯示「問題清單（ERROR + WARNING）」區塊

### 方法 2: SQL 查詢
```sql
-- 連接到資料庫
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

-- 查看所有錯誤與警告
SELECT
  status AS "狀態",
  category AS "類別",
  target_name AS "目標",
  message AS "訊息"
FROM health_check_results
WHERE status IN ('ERROR', 'WARNING')
ORDER BY status, category;
```

---

## 常見問題修復

### 問題 1: 索引缺失

**症狀**:
```
❌ ERROR | Index | idx_products_tags
訊息: 索引缺失，查詢效能可能受影響
```

**修復**:
```sql
-- 建立缺失的索引
CREATE INDEX idx_products_tags ON products USING GIN(tags);
```

---

### 問題 2: RLS Policy 缺失

**症狀**:
```
❌ ERROR | RLS | orders → Admins can delete orders
訊息: Policy 缺失，權限控制可能失效
```

**修復**:
```sql
-- 建立缺失的 Policy
CREATE POLICY "Admins can delete orders"
ON orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

### 問題 3: 函數未授權

**症狀**:
```
⚠️ WARNING | Function | calculate_shipping_fee
訊息: 函數未授權給 authenticated 角色
```

**修復**:
```sql
-- 授予函數執行權限
GRANT EXECUTE ON FUNCTION calculate_shipping_fee(UUID, NUMERIC) TO authenticated;
```

---

### 問題 4: 重複索引

**症狀**:
```
⚠️ WARNING | Index | products
訊息: 發現重複索引: idx_products_name, idx_products_name_2
```

**修復**:
```sql
-- 刪除重複索引
DROP INDEX IF EXISTS idx_products_name_2;
```

---

## 進階使用

### 儲存報告到檔案

```powershell
# 儲存報告到 .\reports\ 目錄
.\scripts\db-health-check.ps1 -SaveReport

# 報告檔名範例: health-check-20260107_120530.txt
```

### 僅查看特定類別的結果

```sql
-- 僅查看索引相關的檢查
SELECT * FROM health_check_results WHERE category = 'Index';

-- 僅查看 RLS 相關的檢查
SELECT * FROM health_check_results WHERE category = 'RLS';
```

### 統計各類別的通過率

```sql
-- 按類別統計通過率
SELECT
  category AS "類別",
  COUNT(*) FILTER (WHERE status = 'OK') AS "通過",
  COUNT(*) FILTER (WHERE status = 'WARNING') AS "警告",
  COUNT(*) FILTER (WHERE status = 'ERROR') AS "錯誤",
  COUNT(*) AS "總數",
  ROUND(COUNT(*) FILTER (WHERE status = 'OK')::NUMERIC / COUNT(*) * 100, 1) AS "通過率 %"
FROM health_check_results
GROUP BY category
ORDER BY category;
```

---

## 完整文件

需要更多資訊？請參考以下文件：

📋 **檢查清單文件**（50 頁）
- 路徑: `specs/012-migration-consolidation/health-check-checklist.md`
- 內容: 225 個檢查項目的詳細說明與修復方案

📚 **PostgreSQL 系統表查詢參考**（40 頁）
- 路徑: `specs/012-migration-consolidation/pg-system-tables-reference.md`
- 內容: 34 個 SQL 查詢範例，快速定位問題

🎨 **設計文件**（30 頁）
- 路徑: `specs/012-migration-consolidation/health-check-design.md`
- 內容: 系統架構、檢查機制設計、擴展指南

📝 **研究成果摘要**（20 頁）
- 路徑: `specs/012-migration-consolidation/HEALTH_CHECK_SUMMARY.md`
- 內容: 完整成果摘要、FAQ、版本歷史

---

## 疑難排解

### 問題: Supabase 未啟動

**錯誤訊息**:
```
❌ 錯誤: Supabase 服務未啟動
請先執行以下指令啟動 Supabase:
  supabase start
```

**解決**: 執行 `supabase start` 並等待服務啟動

---

### 問題: 找不到健康檢查 SQL 檔案

**錯誤訊息**:
```
❌ 錯誤: 找不到健康檢查 SQL 檔案
預期路徑: D:\APP\vsale\specs\012-migration-consolidation\db-health-check.sql
```

**解決**: 確認檔案存在，若不存在請重新建立（參考研究文件）

---

### 問題: psql 指令找不到

**錯誤訊息**:
```
❌ 錯誤: 無法執行健康檢查 SQL
'psql' is not recognized as an internal or external command
```

**解決**: 安裝 PostgreSQL 客戶端工具或使用 Supabase Studio SQL Editor

---

## 下一步

✅ 已完成健康檢查？接下來可以：

1. **修復問題**: 根據報告修復所有 ERROR 項目
2. **優化警告**: 可選修復 WARNING 項目
3. **整合到開發流程**: 設定 Git Pre-commit Hook
4. **定期檢查**: 設定排程每週執行

---

**快速啟動指南版本**: 1.0.0
**最後更新**: 2026-01-07
