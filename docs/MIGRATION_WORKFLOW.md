# Migration 工作流程指南

> **最後更新**: 2026-01-07
> **適用範圍**: Vsale 專案本地開發與遠端部署

---

## 🎯 快速開始

### 情境 1：新增 Migration 並套用（日常開發）⭐ 推薦

```bash
# 1. 建立新 Migration
supabase migration new add_feature_name

# 2. 編輯 Migration 檔案
# 檔案位置: supabase/migrations/YYYYMMDD_add_feature_name.sql

# 3. 套用 Migration（保留現有資料）
pnpm db:migrate

# 或使用 Supabase CLI 直接執行
supabase db push --local
```

**✅ 好處**：
- 保留所有測試資料（訂單、商品、客戶）
- 僅套用新的 Migration
- 適合日常開發

---

### 情境 2：完全重建資料庫（清空資料）

```bash
# 警告：此操作會清空所有資料！
pnpm db:reset
```

**⚠️ 使用時機**：
- 需要全新的資料庫環境
- 測試資料已污染
- 測試完整 Migration 流程

**❌ 不適合**：
- 日常開發
- 有重要測試資料時

---

## 📚 完整工作流程

### 本地開發流程（保留資料）

```
┌─────────────────────────────────────┐
│ 1. 建立新 Migration                  │
│    supabase migration new <name>     │
├─────────────────────────────────────┤
│ 2. 編輯 Migration 檔案               │
│    supabase/migrations/YYYYMMDD.sql │
├─────────────────────────────────────┤
│ 3. 套用 Migration（保留資料）        │
│    pnpm db:migrate                   │ ← 推薦！
│    或 supabase db push --local       │
├─────────────────────────────────────┤
│ 4. 測試新功能                        │
│    pnpm dev                          │
├─────────────────────────────────────┤
│ 5. Commit 變更                       │
│    git add .                         │
│    git commit -m "feat: 新功能描述"  │
└─────────────────────────────────────┘
```

---

## 🔧 可用指令

### 日常開發指令

| 指令 | 功能 | 何時使用 |
|-----|------|---------|
| `pnpm db:migrate` | 套用新 Migration（保留資料）| ⭐ **日常開發首選** |
| `pnpm db:migrate:preview` | 預覽將套用的 Migration | 執行前確認變更 |
| `pnpm db:reset` | 完全重建資料庫（清空資料）| 需要全新環境時 |
| `pnpm db:backup` | 手動備份資料庫 | 執行危險操作前 |
| `pnpm db:restore` | 從備份還原 | 資料遺失時恢復 |
| `pnpm db:health` | 資料庫健康檢查 | 驗證資料庫狀態 |

### Supabase CLI 原生指令

```bash
# 建立新 Migration
supabase migration new <description>

# 列出 Migration 狀態
supabase migration list

# 套用 Migration（本地）
supabase db push --local

# 套用 Migration（遠端）
supabase db push

# 預覽變更（不實際執行）
supabase db push --local --dry-run

# 檢查資料庫差異
supabase db diff

# 完全重建（清空資料）
supabase db reset
```

---

## ⚖️ 指令對比

### `supabase db push --local` vs `supabase db reset`

| 比較項目 | `db push --local` | `db reset` |
|---------|------------------|-----------|
| **資料保留** | ✅ 完全保留 | ❌ 全部清空 |
| **執行方式** | 增量更新（僅新 Migration）| 完全重建（所有 Migration）|
| **使用頻率** | ⭐ 每天多次 | 🔴 很少使用 |
| **風險等級** | 🟢 低 | 🔴 高 |
| **適用場景** | 日常開發 | 測試完整流程 |

---

## 📋 最佳實踐

### ✅ 建議做法

1. **日常開發使用 `pnpm db:migrate`**
   ```bash
   # 這是最安全的方式
   pnpm db:migrate
   ```

2. **執行前預覽變更**
   ```bash
   # 查看將執行的 SQL
   pnpm db:migrate:preview
   ```

3. **重要操作前先備份**
   ```bash
   pnpm db:backup
   ```

4. **遵循 Migration 命名規範**
   ```bash
   # ✅ 好的命名
   supabase migration new add_shipping_fee
   supabase migration new fix_order_status
   supabase migration new remove_old_column

   # ❌ 避免的命名
   supabase migration new update_db
   supabase migration new fix
   ```

5. **Migration 檔案使用冪等性設計**
   ```sql
   -- ✅ 推薦（可重複執行）
   CREATE TABLE IF NOT EXISTS users (...);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

   -- ❌ 避免（會報錯）
   CREATE TABLE users (...);
   ALTER TABLE users ADD COLUMN email TEXT;
   ```

### ❌ 避免做法

1. **不要在有重要資料時執行 `db reset`**
   - 會清空所有測試資料
   - 使用 `pnpm db:migrate` 代替

2. **不要在遠端環境執行 `db reset`**
   - **絕對禁止** `supabase db reset --linked`
   - 會清空生產資料庫

3. **不要手動修改已推送的 Migration**
   - 建立新 Migration 進行修正
   - 保持 Migration 歷史的一致性

4. **不要跳過測試直接部署**
   - 本地測試完成後再推送到遠端

---

## 🚀 遠端部署流程

### 部署到雲端 Supabase

```bash
# 1. 連結雲端專案
supabase link --project-ref qwovavytryvgchcowjof

# 2. 預覽將執行的 Migration
supabase db push --dry-run

# 3. 備份生產資料庫（重要！）
pnpm db:backup

# 4. 推送 Migration 到遠端
supabase db push

# 5. 驗證結果
supabase db diff  # 應顯示 "No changes detected"
```

---

## 🆘 常見問題

### Q1: 不小心執行了 `supabase db reset` 導致資料遺失？

**A**: 從最近的備份恢復
```bash
pnpm db:restore
# 選擇最近的備份檔案
```

### Q2: Migration 套用失敗怎麼辦？

**A**: 檢查錯誤訊息並修正
```bash
# 1. 查看詳細錯誤訊息
pnpm db:migrate

# 2. 修正 Migration 檔案中的錯誤

# 3. 重新執行
pnpm db:migrate
```

### Q3: 如何確認 Migration 已成功？

**A**: 使用以下指令驗證
```bash
# 檢查 Migration 狀態
supabase migration list

# 檢查資料庫差異（應該沒有差異）
supabase db diff

# 執行健康檢查
pnpm db:health
```

### Q4: 可以跳過確認提示嗎？

**A**: 使用自動化指令
```bash
# 直接套用（無確認提示）
supabase db push --local

# 使用 npm script（有確認提示）
pnpm db:migrate
```

---

## 📖 延伸閱讀

- [Supabase Migration 研究報告](SUPABASE_MIGRATION_RESEARCH.md) - 官方最佳實踐
- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md) - 安全規範
- [備份還原指南](BACKUP_RESTORE_CHEATSHEET.md) - 備份與還原
- [Migration 決策樹](MIGRATION_DECISION_TREE.md) - 快速選擇工具

---

## 🎓 關鍵觀念

### 為什麼推薦使用 `db push --local`？

1. **增量更新**：僅執行尚未套用的 Migration
2. **資料保留**：不會清空現有資料
3. **官方推薦**：Supabase 官方推薦的標準做法
4. **生產環境適用**：同樣的指令可用於遠端部署

### Migration 版本控制機制

Supabase 使用 `supabase_migrations` 表追蹤已套用的 Migration：
- 每個 Migration 執行後會記錄到此表
- `db push` 會比對此表，僅執行新 Migration
- `db reset` 會重建此表，重新執行所有 Migration

---

**建立時間**: 2026-01-07
**維護者**: Vsale 開發團隊
