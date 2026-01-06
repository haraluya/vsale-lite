# 🛡️ 資料庫管理與遷移協議 (Database Management & Migration Protocol)

> 📖 **相關文件**:
> - [專案憲章第 VIII 號原則](../.specify/memory/constitution.md#viii-資料庫安全至上-database-safety-first)
> - [CLAUDE.md 安全指導原則](../CLAUDE.md#⚠️-資料庫安全最高指導原則)
> - [完整安全指南](SAFE_MIGRATION_GUIDE.md)
> - [快速參考](BACKUP_RESTORE_CHEATSHEET.md)

---

## 📌 為什麼需要這個協議？

**問題場景**: 在開發過程中，當資料庫結構需要修改時，開發者可能會：
1. 直接在遠端/生產環境執行 `supabase db reset`（❌ **災難性操作**）
2. 忘記生成 Migration 檔案，導致本機與遠端不一致
3. 跳過備份直接部署，無法回滾

**後果**: 所有生產資料**永久遺失**，無法恢復。

**解決方案**: 本協議定義「最高指導原則」+ 標準流程，確保資料庫安全。

---

## ⚠️ 最高指導原則 (CRITICAL RULE)

**絕對禁止**在遠端/生產環境 (Remote/Production) 執行 `supabase db reset`。此指令會清除所有資料庫資料。若需要更新資料庫結構，必須嚴格遵守以下「遷移 (Migration)」流程。

---

## ⚡ 快速檢查清單（執行前必看）

**當你要執行資料庫操作時，先問自己 3 個問題**:

### 1. **我在哪個環境？**
   - 本機（Docker Supabase）→ ✅ 可以執行 `db reset`
   - 遠端/生產（Supabase Cloud）→ ❌ **絕對禁止** `db reset`

### 2. **我要執行什麼指令？**
   - `supabase db diff` / `db push` / `db pull` → ✅ 推薦
   - `supabase db reset` 在遠端 → 🚨 **立即停止！**

### 3. **我有備份嗎？**
   - 已執行 `pnpm deploy:db` 或 `pg_dump` → ✅ 可繼續
   - 沒有備份 → ⏸️ 先備份再執行

**如果以上任一問題答案為「❌」或「⏸️」，請停止操作並參考**:
- 📖 [完整安全指南](SAFE_MIGRATION_GUIDE.md)
- 🚀 [快速參考](BACKUP_RESTORE_CHEATSHEET.md)
- 📋 [6 Phase 檢查清單](../supabase/migrations/_CHECKLIST.md)

---

## 📋 標準開發流程 (SOP)

當需要修改資料庫結構（如新增欄位、建立資料表）時，請執行以下步驟：

### 1.  **本機優先 (Local First)**
* 確保本機 Supabase 正在執行 (`supabase start`)。
* 先在**本機**環境進行修改或測試。

### 2.  **生成遷移檔案 (Generate Migration)**
* 執行 `supabase db diff -f <描述性名稱>`。
* *範例*：`supabase db diff -f add_user_nickname`
* 檢查生成的 SQL 檔案，確保沒有意外的 `DROP` 指令。

### 3.  **安全部署 (Safe Deploy)**
* 使用 `supabase db push` 將變更應用到遠端。
* **例外處理**：如果 `db push` 提示發生衝突並要求重置 (Reset)，**請立即停止並詢問我**，絕不允許自動執行重置。

---

## ✅ 指令白名單與黑名單

### ✅ **推薦使用**
```bash
supabase db diff   # 生成 Migration 檔案
supabase db push   # 推送 Migration 到遠端
supabase db pull   # 從遠端拉取 Schema
```

### ⚠️ **謹慎使用**
```bash
supabase db reset  # 僅限本機環境！絕不在遠端執行！
```
**使用條件**: 僅允許在明確指示要重置「本機」環境時使用

### ❌ **嚴格禁止**
```bash
# 在遠端/生產環境執行以下指令
supabase db reset --db-url <remote-url>  # ❌ 災難性操作
supabase db reset --linked              # ❌ 清除雲端資料
```

---

## 🛡️ 三層安全機制

### 1. **預防層 (Prevention)**
- 使用 Migration 流程，避免手動修改生產資料庫
- 本機優先測試，確保變更正確
- Git Pre-commit Hook 自動檢測危險操作

### 2. **檢查層 (Verification)**
- 部署前執行 6 Phase 檢查清單（見 `../supabase/migrations/_CHECKLIST.md`）
- 自動備份腳本（`pnpm deploy:db`）
- Migration 檔案 Code Review

### 3. **回滾層 (Recovery)**
- 完整備份（使用 `pg_dump`）
- 回滾程序（見 `BACKUP_RESTORE_CHEATSHEET.md`）
- Migration 執行日誌（追蹤變更歷史）

---

## 🚨 例外處理

### 情境: Migration 衝突提示要求 reset

**提示訊息範例**:
```
Error: Local schema is out of sync with remote.
Do you want to reset the database? (y/n)
```

**正確處理流程**:
1. **立即選擇 No (n)**
2. **停止所有操作**
3. **尋求人工審查**（檢查衝突原因）
4. **參考完整指南**（`SAFE_MIGRATION_GUIDE.md`）
5. **準備備份與回滾計畫**

**絕不允許**: 自動選擇 Yes 或跳過衝突檢查

---

## 📊 自動化工具

### 自動備份腳本（推薦使用）
```bash
# 部署前自動備份 + 推送 Migration
pnpm deploy:db
```

### Git Pre-commit Hook（自動檢查）
- 檢測 Migration 檔案中的危險操作（DROP TABLE, TRUNCATE）
- 檢測腳本中的 `supabase db reset` 指令
- 提交前警告並允許取消

---

## 📖 延伸閱讀

| 文件 | 用途 | 閱讀時機 |
|------|------|---------|
| **[SAFE_MIGRATION_GUIDE.md](SAFE_MIGRATION_GUIDE.md)** | 完整安全指南（7 種操作類型） | 建立 Migration 前參考 |
| **[BACKUP_RESTORE_CHEATSHEET.md](BACKUP_RESTORE_CHEATSHEET.md)** | 快速參考與部署檢查清單 | 部署到生產環境前使用 |
| **[Migration 檢查清單](../supabase/migrations/_CHECKLIST.md)** | 6 Phase 完整驗證流程 | 部署過程中逐項勾選 |
| **[Migration 範本](../supabase/migrations/_TEMPLATE_safe_migration.sql)** | 可直接複製的安全範本 | 建立新 Migration 時使用 |

---

## ⚖️ 治理與責任

### 憲章權威
本協議為**專案憲章第 VIII 號核心原則**的一部分，具有最高優先級。

### 違規處理
- 任何違反本協議的操作 **必須** 經過團隊審查
- 生產環境資料庫操作 **必須** 雙人確認（操作者 + 審查者）
- 緊急情況需執行資料庫重置時，**必須** 完成完整備份並記錄操作理由

---

**版本**: 1.0.0 | **最後更新**: 2026-01-06 | **文件狀態**: 正式生效
