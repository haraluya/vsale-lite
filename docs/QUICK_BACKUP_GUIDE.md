# 🚀 快速備份與還原指南

**適合對象**：習慣手動控制資料備份的開發者

**使用場景**：
- 修改專案前先備份
- 如果資料被清空，手動還原

---

## ⚡ 超級簡單的兩個指令

### 📦 備份資料庫

```bash
pnpm db:save
```

**執行結果**：
```
💾 快速備份資料庫...

📦 正在備份...

✅ 備份完成！

📄 備份檔案：
   D:\APP\vsale\backups\20260107_154530_quick_backup.sql

📊 備份資訊：
   時間：2026-01-07 15:45:30
   大小：125.5 KB
   資料表：18 個

💡 還原指令：
   pnpm db:load
```

---

### 📥 還原資料庫

```bash
pnpm db:load
```

**執行結果**：
```
📥 快速還原資料庫

📋 可用的備份：

   [1] 20260107_154530_quick_backup.sql (最新)
       時間：2026-01-07 15:45:30 | 大小：125.5 KB

   [2] 20260107_143216_quick_backup.sql
       時間：2026-01-07 14:32:16 | 大小：120.3 KB

   [3] 20260107_132458_test_final.sql
       時間：2026-01-07 13:24:58 | 大小：255.0 KB

請選擇要還原的備份 [1-3]
（直接按 Enter 還原最新備份，或輸入 0 取消）：

選擇: [直接按 Enter]

✅ 選擇最新備份

📄 還原檔案：20260107_154530_quick_backup.sql

⚠️  警告：此操作會覆蓋當前資料庫的資料

請輸入 'yes' 確認繼續（或按 Enter 取消）：yes

📥 正在還原...

[1/3] 清空現有資料...
   ✅ 已清空現有資料

[2/3] 還原備份資料...
   ✅ 資料已還原

[3/3] 驗證還原結果...
   ✅ 驗證完成

========================================
  還原成功！
========================================

📊 還原資訊：
   備份檔案：20260107_154530_quick_backup.sql
   資料表數：18 個
   還原時間：2026-01-07 15:47:12
```

---

## 📚 完整使用流程

### 情境 1：修改專案前備份

```bash
# 1. 備份當前資料
pnpm db:save

# 2. 進行修改（例如執行 Migration）
pnpm db:migrate

# 3. 如果出問題，還原備份
pnpm db:load
```

### 情境 2：測試危險操作

```bash
# 1. 備份
pnpm db:save

# 2. 執行危險操作（例如 reset）
pnpm db:reset

# 3. 如果需要，還原
pnpm db:load
```

### 情境 3：資料被清空後還原

```bash
# 發現資料被清空了！
# 直接還原最新備份
pnpm db:load
# 按 Enter 選擇最新備份
# 輸入 'yes' 確認
```

---

## 🎯 最佳實踐

### 建議的備份時機

**✅ 建議備份**：
- 每天開始開發前
- 修改資料庫結構前（執行 Migration）
- 測試新功能前
- 重大修改前

**⏰ 備份頻率建議**：
- 日常開發：每天 1 次
- 重大修改：修改前 + 修改後
- 測試階段：每個測試前

### 備份檔案管理

**自動清理規則**（專案已內建）：
- 保留最近 30 天的備份
- 每天最多保留 10 個備份
- 自動刪除過期備份

**手動清理**：
```bash
# 檢視備份目錄
ls D:\APP\vsale\backups

# 刪除舊備份（可選）
# 手動刪除不需要的 .sql 和 .json 檔案
```

---

## 🔧 進階用法

### 指定還原特定備份

```bash
# 還原時會顯示列表，輸入對應編號即可
pnpm db:load
# 選擇: 2  （還原第 2 個備份）
```

### 備份檔案位置

所有備份都儲存在：
```
D:\APP\vsale\backups\
```

**檔案命名規則**：
```
YYYYMMDD_HHmmss_quick_backup.sql      # 資料備份
YYYYMMDD_HHmmss_quick_backup.json     # 備份 metadata
```

**範例**：
```
20260107_154530_quick_backup.sql      # 2026-01-07 15:45:30 的備份
20260107_154530_quick_backup.json     # 對應的 metadata
```

### 查看備份資訊

```bash
# 使用任何文字編輯器開啟 JSON 檔案
cat D:\APP\vsale\backups\20260107_154530_quick_backup.json
```

**Metadata 內容**：
```json
{
  "timestamp": "20260107_154530",
  "datetime": "2026-01-07 15:45:30",
  "filename": "20260107_154530_quick_backup.sql",
  "size_bytes": 128512,
  "size_kb": 125.5,
  "table_count": 18,
  "backup_type": "quick_manual"
}
```

---

## ❓ 常見問題

### Q1: 備份包含什麼內容？

**A:** 包含所有資料表的資料（Data Only），但不包含：
- 資料表結構（Schema） - 由 Migration 管理
- Functions、Triggers - 由 Migration 管理
- RLS Policies - 由 Migration 管理

**只備份**：
- 客戶資料（profiles, tiers）
- 商品資料（categories, series, products, tier_prices）
- 訂單資料（orders, order_items, order_timelines）
- 優惠券資料（coupons, user_coupons）
- 系統設定（system_settings）

### Q2: 還原會影響資料庫結構嗎？

**A:** 不會。還原只會：
1. 清空現有資料（TRUNCATE TABLE）
2. 插入備份的資料（INSERT）

資料表結構保持不變。

### Q3: 如果還原失敗怎麼辦？

**A:**
1. 檢查錯誤訊息
2. 確認 Supabase 是否正在運行（`supabase status`）
3. 嘗試執行資料庫健康檢查：`pnpm db:health`
4. 如果還是失敗，聯繫技術支援

### Q4: 可以還原到不同的時間點嗎？

**A:** 可以！`pnpm db:load` 會列出所有可用備份，您可以選擇任何一個。

### Q5: 備份會很慢嗎？

**A:** 不會。通常：
- 備份：2-5 秒
- 還原：3-8 秒

取決於資料量大小。

### Q6: 備份會佔用很多空間嗎？

**A:** 不會。典型大小：
- 基礎測試資料：~50 KB
- 包含商品與訂單：~100-200 KB
- 完整業務資料：~500 KB - 2 MB

30 天的備份約佔用 10-50 MB。

---

## 🆚 與其他備份指令的比較

| 指令 | 用途 | 速度 | 易用性 |
|------|------|------|--------|
| `pnpm db:save` | 快速手動備份 | ⚡ 極快 | 🟢 最簡單 |
| `pnpm db:load` | 快速手動還原 | ⚡ 極快 | 🟢 最簡單 |
| `pnpm db:backup` | 完整備份（含 metadata） | 🟡 較慢 | 🟡 中等 |
| `pnpm db:restore` | 互動式還原 | 🟡 較慢 | 🟡 中等 |
| `.\scripts\safe-db-reset.ps1` | 重置資料庫（自動備份） | 🔴 最慢 | 🟡 中等 |

**建議**：
- 日常使用：`pnpm db:save` / `pnpm db:load` ⭐
- 部署前：`pnpm db:backup`
- 重大修改：`pnpm db:backup`

---

## 🎓 學習資源

- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md)
- [Migration 工作流程](MIGRATION_WORKFLOW.md)
- [備份與還原快速參考](BACKUP_RESTORE_CHEATSHEET.md)

---

## 📞 需要協助？

如果遇到問題：
1. 執行健康檢查：`pnpm db:health`
2. 檢查 Supabase 狀態：`supabase status`
3. 查看備份目錄：`ls D:\APP\vsale\backups`

---

**最後更新**: 2026-01-07
**版本**: 1.0.0
