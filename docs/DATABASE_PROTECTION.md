# 資料庫保護機制

## 🎯 目的

防止在開發過程中意外清空測試資料,保護使用者手動建立的訂單、商品、客戶等重要資料。

---

## 🚨 核心原則

### ❌ 禁止的操作
```bash
# 這會清空所有資料,包含您的測試資料!
supabase db reset
```

### ✅ 正確的做法
```bash
# 1. 建立新 Migration
.\scripts\safe-migration.ps1 -Name "add_new_feature"

# 2. 編輯 Migration 檔案
# (位於 supabase/migrations/)

# 3. 推送 Migration (保留現有資料)
.\scripts\safe-migration.ps1 -Push
```

---

## 🛠️ 安全工具

### 1. Safe Migration 腳本

**建立新 Migration**:
```powershell
.\scripts\safe-migration.ps1 -Name "add_shipping_fee_column"
```

**推送 Migration**:
```powershell
.\scripts\safe-migration.ps1 -Push
```

**查看幫助**:
```powershell
.\scripts\safe-migration.ps1 -Help
```

### 2. Pre-DB-Reset Hook

如果意外執行 `supabase db reset`,系統會:
1. ⚠️ 顯示警告訊息
2. ❓ 要求雙重確認
3. 🛡️ 提供取消選項

---

## 📋 標準工作流程

### 情境 1: 新增欄位到現有資料表

```powershell
# 1. 建立 Migration
.\scripts\safe-migration.ps1 -Name "add_discount_column"

# 2. 編輯產生的 SQL 檔案
# supabase/migrations/YYYYMMDD_add_discount_column.sql
ALTER TABLE orders ADD COLUMN discount DECIMAL(10,2) DEFAULT 0;

# 3. 推送變更
.\scripts\safe-migration.ps1 -Push
```

**結果**: ✅ 新欄位已新增,現有訂單資料完整保留

---

### 情境 2: 建立新資料表

```powershell
# 1. 建立 Migration
.\scripts\safe-migration.ps1 -Name "create_shipping_addresses"

# 2. 編輯 SQL 檔案
CREATE TABLE shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

# 3. 推送變更
.\scripts\safe-migration.ps1 -Push
```

**結果**: ✅ 新資料表已建立,現有資料不受影響

---

### 情境 3: 修改 PostgreSQL Function

```powershell
# 1. 建立 Migration
.\scripts\safe-migration.ps1 -Name "update_calculate_total_function"

# 2. 編輯 SQL 檔案
CREATE OR REPLACE FUNCTION calculate_order_total(...)
RETURNS ...
AS $$
  -- 新邏輯
$$;

# 3. 推送變更
.\scripts\safe-migration.ps1 -Push
```

**結果**: ✅ 函數已更新,現有訂單資料完整保留

---

## ⚠️ 例外情況：真的需要重置時

如果真的需要清空資料庫（例如架構大幅變更）:

```powershell
# 執行 supabase db reset 時會出現雙重確認
supabase db reset

# 系統會詢問:
# 1. "您確定要繼續重置資料庫嗎? (yes/no)"
# 2. "請輸入 'DELETE ALL DATA' 以確認"

# 只有當您輸入正確的確認文字時,才會真的重置
```

---

## 🔍 驗證 Migration 結果

### 方法 1: Supabase Studio (推薦)
1. 開啟 http://127.0.0.1:54323
2. 左側選單 → Table Editor
3. 確認新欄位/資料表已出現
4. 確認現有資料完整

### 方法 2: SQL Query
```sql
-- 檢查資料表結構
\d orders

-- 檢查資料是否完整
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM profiles WHERE role = 'client';
```

---

## 📚 相關文件

- [安全 Migration 指南](./SAFE_MIGRATION_GUIDE.md)
- [備份與還原快速參考](./BACKUP_RESTORE_CHEATSHEET.md)
- [資料庫安全協議](./DATABASE_SAFETY_PROTOCOL.md)

---

## 🆘 常見問題

### Q: 我已經執行了 `supabase db reset`,資料不見了怎麼辦?
**A**: 如果沒有備份,資料無法復原。未來請使用 `.\scripts\safe-migration.ps1 -Push` 來推送變更。

### Q: Migration 推送失敗怎麼辦?
**A**: 檢查錯誤訊息,常見原因:
- SQL 語法錯誤
- 違反約束條件（例如新增 NOT NULL 欄位但未提供 DEFAULT）
- Migration 檔案時間戳衝突

### Q: 如何查看目前有哪些 Migration?
**A**:
```bash
supabase migration list
```

### Q: 可以回滾 Migration 嗎?
**A**: 需要手動建立一個反向 Migration。例如:
```sql
-- 原始: ALTER TABLE orders ADD COLUMN discount DECIMAL(10,2);
-- 回滾: ALTER TABLE orders DROP COLUMN discount;
```

---

**最後更新**: 2026-01-06
**版本**: 1.0.0
