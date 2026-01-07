# Supabase Migration 工作流程研究報告

> **研究日期**: 2026-01-07
> **研究目的**: 了解 Supabase 官方推薦的 Migration 最佳實踐，以及如何在本地開發時套用新 Migration 且保留資料

---

## 📚 目錄

1. [Supabase 官方推薦的 Migration 工作流程](#1-supabase-官方推薦的-migration-工作流程)
2. [`supabase db reset` vs `supabase db push` 的核心差異](#2-supabase-db-reset-vs-supabase-db-push-的核心差異)
3. [在本地開發環境套用新 Migration 且保留資料的方法](#3-在本地開發環境套用新-migration-且保留資料的方法)
4. [Supabase CLI 的增量式 Migration 功能](#4-supabase-cli-的增量式-migration-功能)
5. [最佳實踐總結](#5-最佳實踐總結)
6. [參考資料](#6-參考資料)

---

## 1. Supabase 官方推薦的 Migration 工作流程

Supabase 推薦的標準工作流程分為**本地開發**和**遠端部署**兩個階段：

### 本地開發環節

```bash
1. supabase init              # 初始化專案結構
2. supabase start             # 啟動本地 Docker Supabase 堆疊
3. supabase migration new     # 建立新 Migration 檔案
4. supabase migration up      # 套用 Migration 到本地資料庫
5. 本地測試與開發             # 在 http://127.0.0.1:54323 操作資料
```

### 遠端部署環節

```bash
1. supabase link              # 連結遠端 Supabase 專案
2. supabase db push           # 推送本地 Migration 到遠端（保留資料）
3. 驗證並監控                 # 檢查遠端資料庫是否正常運作
```

### 核心原則

- **Version Control First**: 所有 Migration 檔案存放在 `supabase/migrations/` 目錄並納入版本控制
- **Incremental Updates**: 每個 Migration 代表一個具體的、獨立的變更
- **Test Locally First**: 在本地環境充分測試後再推送到遠端
- **Seed Data Separation**: 測試資料應該定義在 `supabase/seed.sql` 中，與 Migration 分開

---

## 2. `supabase db reset` vs `supabase db push` 的核心差異

### 詳細對比表

| 方面 | `db reset` | `db push` |
|-----|----------|----------|
| **目標環境** | 本地開發環境 | 遠端開發/生產環境 |
| **資料保護** | **清除所有資料** | **保留現有資料** |
| **操作類型** | 完全重建（Destructive） | 增量應用（Safe） |
| **使用時機** | 回到已知狀態、測試完整流程 | 部署新變更到遠端 |
| **種子資料** | 自動執行 `seed.sql` 重新填充 | 不影響現有資料 |

### `supabase db reset` （本地專用）

**行為**:
- 重建本地 PostgreSQL 容器
- 依序套用 `supabase/migrations/` 中的所有 Migration
- 執行 `supabase/seed.sql` 重新填充測試資料

**結果**: 本地資料庫回到完全乾淨的已知狀態

**使用場景**:
- ✅ 開始新的開發循環
- ✅ 需要重現完整流程時
- ✅ 本地測試資料污染後的恢復
- ❌ 日常開發（會清空資料）

### `supabase db push` （遠端專用）

**行為**:
- 比較本地 Migration 與遠端已應用的 Migration
- 僅應用遠端尚未有的新 Migration
- **不觸及現有資料**

**結果**: 遠端資料庫增量更新

**使用場景**:
- ✅ 部署新功能到遠端
- ✅ 生產環境更新
- ✅ 保留現有客戶資料

---

## 3. 在本地開發環境套用新 Migration 且保留資料的方法

### ⭐ 官方推薦做法：使用 `supabase db push --local`

這是最重要的發現！Supabase CLI 提供了 `--local` 旗標，讓 `db push` 也能用於本地環境。

### 標準流程（保留資料）

```bash
# 1. 建立新 Migration
supabase migration new add_new_feature

# 2. 編輯產生的檔案
# supabase/migrations/[timestamp]_add_new_feature.sql
# （在編輯器中撰寫你的 SQL 變更）

# 3. 套用到本地資料庫（保留現有資料）⭐ 關鍵步驟
supabase db push --local

# 4. 測試新變更
# ... 在本地應用中測試功能 ...
```

### 重點說明

- ✅ **正確做法**：`supabase db push --local` → **保留資料**
- ❌ **避免使用**：`supabase db reset` → **會清空所有資料**

### 為什麼要使用 `db push --local`？

根據官方文件，`db push` 設計用來：
1. 比較本地 Migration 版本與已套用版本的差異
2. 僅執行尚未套用的 Migration（增量更新）
3. **不影響既有資料** → 你之前建立的訂單、商品、客戶資訊都保留

### 如果不小心執行了 `db reset`？

若已執行 `db reset` 導致資料遺失，可以：
1. 從備份恢復（使用 `pg_dump` 建立的備份）
2. 重新填充測試資料（執行 `supabase/seed.sql`）
3. 使用版本控制復原開發中的資料狀態

---

## 4. Supabase CLI 的增量式 Migration 功能

### ✅ 是的，Supabase CLI 有完整的增量式 Migration 支援

#### 核心命令

```bash
# 建立新 Migration（含自動時間戳記）
supabase migration new <描述性名稱>

# 列出所有 Migration 狀態
supabase migration list

# 套用待處理的 Migration
supabase migration up

# 生成 Migration 檔案（從 Dashboard 變更推導）
supabase db diff -f <migration_name>

# 推送到遠端（增量應用）
supabase db push

# 從遠端拉取 Migration 記錄
supabase migration fetch
```

#### 進階功能

##### 1. `supabase db diff` - 智能差異比較
- 比較你的宣告式 Schema 與現有 Migration
- 自動生成新 Migration 檔案
- 支援 `--schema public` 篩選特定 Schema

##### 2. 宣告式 Schema（Declarative Schemas）
- 在 `supabase/schemas/` 定義目標狀態
- Supabase 自動生成 Migration
- 無需手寫所有 SQL

##### 3. Migration Squashing - 合併多個 Migration
```bash
supabase migration squash
```
- 將多個小 Migration 合併為一個
- 減少檔案數量，提高效率

##### 4. Migration Repair - 修復不同步問題
```bash
supabase migration repair
```
- 當本地與遠端 Migration 歷史不同步時使用
- 手動標記已套用的 Migration

### 內建的安全機制

✅ **Supabase 提供的保護**:
- Migration 版本控制（防止重複執行）
- 時間戳記排序（確保執行順序）
- `supabase_migrations` 表追蹤已套用的 Migration
- `--dry-run` 預覽模式（`supabase db push --dry-run`）

---

## 5. 最佳實踐總結

### 本地開發環境（開發者必讀）

```
循環工作流程：
┌─────────────────────────────────────┐
│ 1. supabase migration new [name]    │
│    (建立新 Migration)                │
├─────────────────────────────────────┤
│ 2. 編輯 Migration 檔案               │
│    (撰寫 SQL 變更)                   │
├─────────────────────────────────────┤
│ 3. supabase db push --local         │ ← 保留資料！
│    (套用到本地資料庫)                │
├─────────────────────────────────────┤
│ 4. 本地測試與驗證                    │
│    (在 http://127.0.0.1:54323 測試) │
├─────────────────────────────────────┤
│ 5. git commit & git push            │
│    (版本控制 Migration 檔案)         │
└─────────────────────────────────────┘
```

### 遠端部署（生產環境）

```
部署工作流程：
┌──────────────────────────────────────┐
│ 1. supabase link --project-ref [id] │
│    (連結遠端專案)                    │
├──────────────────────────────────────┤
│ 2. supabase db push --dry-run       │ ← 預覽
│    (查看將執行的變更)                │
├──────────────────────────────────────┤
│ 3. 備份生產資料庫                     │ ← 重要！
│    (pg_dump 或 Supabase Point-in-Time)
├──────────────────────────────────────┤
│ 4. supabase db push                 │ ← 執行
│    (推送 Migration 到遠端)            │
├──────────────────────────────────────┤
│ 5. 驗證遠端資料庫                     │
│    (檢查資料完整性與應用功能)         │
└──────────────────────────────────────┘
```

### 絕對禁止事項（紅線）

#### ❌ 在本地開發時
- 勿在遠端環境執行 `db reset`（會清空生產資料）
- 勿執行 `db reset --linked`（清空遠端資料庫）
- 勿跳過本地測試直接部署

#### ❌ 在遠端環境時
- 勿在 Dashboard 直接修改 Schema（應使用 Migration）
- 勿未備份即執行 Migration
- 勿使用本地資料覆蓋遠端資料

---

## 6. 參考資料

### 官方文件
- [Local development with schema migrations | Supabase Docs](https://supabase.com/docs/guides/local-development/overview)
- [Supabase CLI Reference | Supabase Docs](https://supabase.com/docs/reference/cli/introduction)
- [Database Migrations | Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations)
- [Declarative database schemas | Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)

### 社群資源
- [Supabase Local Dev: migrations, branching, and observability](https://supabase.com/blog/supabase-local-dev)
- [Managing Supabase Database Migrations Across Multiple Environments | DEV Community](https://dev.to/parth24072001/supabase-managing-database-migrations-across-multiple-environments-local-staging-production-4emg)
- [Supabase: A Guide to Local Development](https://www.maxrohowsky.com/blog/supabase-local-development)
- [How does local development work? | Supabase Discussions](https://github.com/orgs/supabase/discussions/6366)

---

## 📊 關鍵收穫

根據這次研究，最重要的三個結論是：

### 1. `supabase db push --local` 是保留本地資料的正確方法
這是官方設計用來進行增量式 Migration 而不清空資料的指令。

### 2. `supabase db reset` 應該只在本地開發環境使用，且會完全清空資料
不適合在有重要資料的情況下執行。

### 3. Supabase 的增量式 Migration 是完全內建的
通過 `supabase migration new`、`supabase db push` 和自動版本追蹤，確保每個 Migration 只執行一次。

---

**研究完成時間**: 2026-01-07
**研究者**: Claude Sonnet 4.5 (Agent a02dfb7)
