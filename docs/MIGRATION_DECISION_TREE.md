# Migration 工作流程決策樹

> **最後更新**: 2026-01-07
> **目的**: 快速選擇正確的 Migration 工具

---

## 🎯 快速決策流程圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                  需要更新資料庫結構嗎？                              │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
      是                      否
       │                       │
       ▼                       ▼
 ┌──────────────┐      ┌──────────────────┐
 │ 想保留現有    │      │ 需要備份或還原？ │
 │ 資料嗎？      │      └────────┬─────────┘
 └──┬───────────┘               │
    │                     ┌─────┴─────┐
 ┌──┴───┐                │           │
 是     否              備份        還原
 │      │                │           │
 │      │                ▼           ▼
 ▼      ▼          ┌──────────┐ ┌─────────┐
✅      ⚠️          │pnpm      │ │pnpm     │
使用    使用       │db:backup │ │db:restore│
pnpm    pnpm       └──────────┘ └─────────┘
db:migrate db:reset
```

---

## 📊 指令選擇對照表

| 情境 | 推薦指令 | 優先級 | 資料保留 |
|------|---------|--------|---------|
| **日常開發：新增 Migration 並套用** | `pnpm db:migrate` | ⭐ **首選** | ✅ 保留 |
| **預覽將套用的 Migration** | `pnpm db:migrate:preview` | ⭐ 推薦 | N/A（僅預覽） |
| **需要全新的資料庫環境** | `pnpm db:reset` | ⚠️ 謹慎使用 | ❌ 清空 |
| **測試資料已污染，需要重建** | `pnpm db:reset` | ⚠️ 謹慎使用 | ❌ 清空 |
| **測試完整 Migration 流程** | `pnpm db:reset` | ⚠️ 謹慎使用 | ❌ 清空 |
| **執行危險操作前備份** | `pnpm db:backup` | ✅ 推薦 | N/A |
| **資料遺失後恢復** | `pnpm db:restore` | ✅ 推薦 | N/A |
| **驗證資料庫健康狀態** | `pnpm db:health` | ✅ 推薦 | N/A |

---

## 🔍 詳細決策指南

### 情境 1：我新增了一個 Migration，想套用到本地資料庫

**問題**：會清空現有資料嗎？
**答案**：否，資料會完整保留

**推薦流程**：
```bash
# 1. 建立新 Migration
supabase migration new add_feature_name

# 2. 編輯 Migration 檔案
# supabase/migrations/YYYYMMDD_add_feature_name.sql

# 3. 套用 Migration（保留資料）
pnpm db:migrate

# 4. 驗證結果
pnpm db:health
```

**為什麼推薦**：
- ✅ 僅套用新的 Migration（增量更新）
- ✅ 保留所有測試資料（訂單、商品、客戶）
- ✅ Supabase 官方推薦做法
- ✅ 適合日常開發（每天多次使用）

---

### 情境 2：我想預覽將執行的 Migration，但不實際套用

**問題**：如何查看即將執行的 SQL？
**答案**：使用預覽模式

**推薦流程**：
```bash
# 預覽將套用的 Migration（不實際執行）
pnpm db:migrate:preview

# 確認無誤後，正式套用
pnpm db:migrate
```

**為什麼推薦**：
- ✅ 執行前確認變更內容
- ✅ 避免意外的資料損失
- ✅ 提升 Migration 安全性

---

### 情境 3：測試資料已污染，我想要全新的資料庫環境

**問題**：會清空現有資料嗎？
**答案**：是，會清空所有資料

**推薦流程**：
```bash
# 警告：此操作會清空所有資料！
pnpm db:reset

# 重新填充測試資料（可選）
# 執行 seed.sql 或手動建立測試資料
```

**使用時機**：
- ⚠️ 測試資料已污染，無法繼續測試
- ⚠️ 需要驗證完整 Migration 流程（從頭開始）
- ⚠️ 確定不需要保留現有資料

**風險**：
- ❌ 會清空所有資料（訂單、商品、客戶）
- ❌ 需要重新建立測試資料
- ❌ 不適合日常開發

---

### 情境 4：執行危險操作前，我想先備份

**問題**：如何手動備份？
**答案**：使用備份指令

**推薦流程**：
```bash
# 1. 手動備份
pnpm db:backup

# 2. 執行危險操作
# （例如：測試新 Migration、修改資料）

# 3. 若出現問題，從備份還原
pnpm db:restore
```

**備份位置**：
- 檔案位置：`backups/YYYYMMDD_HHMMSS_manual_backup.sql`
- 備份內容：完整資料庫結構 + 資料

---

### 情境 5：資料遺失了，我想從備份還原

**問題**：如何還原到備份狀態？
**答案**：使用還原指令

**推薦流程**：
```bash
# 1. 查看可用備份
ls backups\ | Sort-Object LastWriteTime -Descending

# 2. 從備份還原（互動式選擇）
pnpm db:restore

# 3. 驗證還原結果
pnpm db:health
```

**注意事項**：
- ⚠️ 還原會覆蓋當前資料
- ⚠️ 建議還原前先備份當前狀態
- ✅ 還原後自動驗證資料完整性

---

## 🚨 常見錯誤與解決方案

### 錯誤 1：執行 `pnpm db:migrate` 後資料遺失

**原因**：可能誤用了 `pnpm db:reset`

**解決方案**：
```bash
# 1. 從備份還原
pnpm db:restore

# 2. 下次記得使用 db:migrate 而非 db:reset
pnpm db:migrate
```

---

### 錯誤 2：Migration 套用失敗

**原因**：Migration 檔案有 SQL 語法錯誤

**解決方案**：
```bash
# 1. 查看錯誤訊息
pnpm db:migrate

# 2. 修正 Migration 檔案中的錯誤
# 檔案位置: supabase/migrations/

# 3. 重新執行
pnpm db:migrate
```

---

### 錯誤 3：資料庫狀態異常

**原因**：Migration 執行過程中斷或失敗

**解決方案**：
```bash
# 1. 執行健康檢查
pnpm db:health

# 2. 根據檢查結果決定：
#    - 若可修復：修正 Migration 後重新套用
#    - 若無法修復：從備份還原

# 選項 A：重新套用 Migration
pnpm db:migrate

# 選項 B：從備份還原
pnpm db:restore
```

---

## 📋 快速參考卡

### 日常開發常用指令

```bash
# 套用新 Migration（保留資料）⭐ 首選
pnpm db:migrate

# 預覽將套用的 Migration
pnpm db:migrate:preview

# 驗證資料庫健康狀態
pnpm db:health

# 手動備份
pnpm db:backup
```

### 緊急情況指令

```bash
# 完全重建資料庫（清空資料）⚠️ 謹慎使用
pnpm db:reset

# 從備份還原
pnpm db:restore
```

---

## 🎓 關鍵原則

### 黃金守則

1. **日常開發永遠使用 `pnpm db:migrate`**
   - 僅套用新 Migration
   - 保留所有現有資料
   - Supabase 官方推薦

2. **危險操作前先備份**
   - 使用 `pnpm db:backup`
   - 備份檔案永久保留
   - 可隨時還原

3. **`pnpm db:reset` 僅限特殊情況**
   - 測試資料污染
   - 需要全新環境
   - 測試完整流程
   - **必須先詢問使用者同意**

4. **遠端/生產環境絕對禁止 `db:reset`**
   - 會清空生產資料
   - 必須使用 `supabase db push`（遠端）
   - 詳見 [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md)

---

## 📖 延伸閱讀

- [Migration 工作流程指南](MIGRATION_WORKFLOW.md) - 完整的工作流程說明
- [Supabase Migration 研究報告](SUPABASE_MIGRATION_RESEARCH.md) - 官方最佳實踐
- [備份還原快速參考](BACKUP_RESTORE_CHEATSHEET.md) - 備份與還原指南
- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md) - 安全規範

---

**建立時間**: 2026-01-07
**維護者**: Vsale 開發團隊
