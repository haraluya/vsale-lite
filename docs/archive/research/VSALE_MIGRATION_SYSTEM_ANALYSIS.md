# Vsale 專案 Migration 系統全面分析報告

> **分析日期**: 2026-01-07
> **分析範圍**: Vsale-lite B2B 批發訂貨系統
> **目的**: 盤點專案現有 Migration 相關工具與檔案

---

## 📋 目錄

1. [專案 Migration 架構概況](#1-專案-migration-架構概況)
2. [關鍵工具與腳本](#2-關鍵工具與腳本)
3. [Migration 執行流程](#3-migration-執行流程)
4. [Migration 規範與標準](#4-migration-規範與標準)
5. [安全機制與防護](#5-安全機制與防護)
6. [部署檢查清單](#6-部署檢查清單)
7. [關鍵文檔位置](#7-關鍵文檔位置)
8. [常見問題與解決方案](#8-常見問題與解決方案)
9. [專案獨特特色](#9-專案獨特特色)

---

## 1. 專案 Migration 架構概況

### 當前狀態（2026-01-07）

- **活躍 Migration 檔案**: 10 個（已整合）
- **封存舊檔案**: 27 個（在 `.archive` 目錄）
- **整合完成度**: 70% 檔案數減少
- **資料庫**: PostgreSQL v17（本地 Docker 開發）
- **部署平台**: Firebase App Hosting (asia-east1)

### Migration 整合情況

| 模組 | 檔案名稱 | 功能 | 狀態 |
|------|---------|------|------|
| M1 | `20260107100000_core_auth_and_tiers.sql` | 核心認證與會員等級 | ✅ |
| M2 | `20260107110000_product_catalog_system.sql` | 商品目錄系統 | ✅ |
| M3 | `20260107120000_orders_and_workflow.sql` | 訂單與工作流程 | ✅ |
| M4 | `20260107130000_shipping_and_custom_fees.sql` | 運費與自訂費用 | ✅ |
| M5 | `20260107140000_coupon_system.sql` | 優惠券系統 | ✅ |
| M6 | `20260107150000_system_admin_and_audit.sql` | 系統管理與稽核 | ✅ |
| M7 | `20260107160000_indexes_and_performance.sql` | 索引與效能優化 | ✅ |
| M8 | `20260107170000_rls_policies.sql` | RLS 策略 | ✅ |
| M9 | `20260107180000_add_announcements_table.sql` | 廣告輪播表 | ✅ |
| Fix | `20260107105000_add_missing_is_protected_to_tiers.sql` | Tiers 欄位補缺 | ✅ |

### 整合優勢

- ✅ **可讀性提升**: 新開發者 10 分鐘內理解資料庫架構（原 30+ 分鐘）
- ✅ **維護性提升**: 按功能模組組織，快速找到需要修改的位置
- ✅ **完整註解**: 每個表、欄位、函數都有 COMMENT 說明
- ✅ **集中管理**: M7 集中管理所有索引，M8 集中管理所有 RLS

---

## 2. 關鍵工具與腳本

### PowerShell 資料庫管理腳本

位置: `scripts/` 目錄

| 腳本名稱 | 功能 | 使用情境 |
|---------|------|---------|
| **db-backup.ps1** | 完整備份本地 Supabase | 重置前、部署前、手動備份 |
| **db-restore.ps1** | 互動式還原備份 | 從備份恢復資料 |
| **db-health-check.ps1** | Schema 一致性檢查 | 驗證 225+ 檢查項目 |
| **safe-db-reset.ps1** | 自動備份+重置 | 安全重置開發環境 |
| **safe-db-reset-with-data.ps1** | 備份+重置+恢復資料 | 保留資料的重置 |
| **safe-migration.ps1** | 安全 Migration 輔助 | 建立與推送 Migration |
| **apply-migration.ps1** | 直接執行 SQL | 遠端部署 Migration |

### 腳本特色

- ✅ **自動備份管理**: 保留最近 10 次備份，自動清理舊檔
- ✅ **元數據追蹤**: 記錄備份時間、大小、表數量、備份原因
- ✅ **互動式選擇**: 還原時可選擇備份檔案
- ✅ **UTF-8 編碼**: 支援繁體中文輸出
- ✅ **Docker 容器支援**: 使用 `docker exec` 執行 pg_dump

---

## 3. Migration 執行流程

### 本地開發環境流程

```
1. 啟動本地 Supabase
   → supabase start

2. 建立新 Migration
   → .\scripts\safe-migration.ps1 -Name "add_feature_name"
   或 supabase migration new add_feature_name

3. 編輯 Migration 檔案
   → supabase/migrations/YYYYMMDD_description.sql

4. 套用 Migration（兩種方式）
   A. 增量更新（保留資料）⭐ 推薦
      → supabase db push --local

   B. 完全重置（清空資料）
      → .\scripts\safe-db-reset.ps1
      或 supabase db reset

5. 測試與驗證
   → pnpm dev
   → 手動測試新功能

6. Commit 變更
   → git add .
   → git commit -m "feat: 新增功能描述"
```

### Supabase 本地配置

**檔案**: `supabase/config.toml`
- API 埠: 54321
- 資料庫埠: 54322
- Studio 埠: 54323
- 種子資料: `seed.sql`（重置時自動執行）

### 環境變數管理

**檔案**: `.env.local`
- **本地開發** (當前): `http://127.0.0.1:54321`
- **雲端部署** (注釋中): `https://qwovavytryvgchcowjof.supabase.co`
- 需切換部署時，在檔案中註解/取消註解相應設定

---

## 4. Migration 規範與標準

### 檔案命名規範

格式: `YYYYMMDD_description.sql`

**優先使用的動詞**:
- ✅ `create_xxx`: 建立新表或功能
- ✅ `add_xxx`: 新增欄位或索引
- ✅ `fix_xxx`: 修復問題
- ✅ `remove_xxx`: 移除不需要的項目
- ✅ `extend_xxx`: 擴展現有功能

**避免使用**:
- ❌ 時分秒時間戳（如 `20260107153045`）
- ❌ 過長的描述（超過 50 字元）
- ❌ 不明確的名稱（如 `update_db`）

### Migration 結構規範

**必須包含 8 個區塊**:

1. **清理舊資料**（DROP IF EXISTS...）
2. **Schema 變更**（CREATE TABLE, ALTER TABLE）
3. **資料遷移**（UPDATE, INSERT）
4. **建立索引**（CREATE INDEX IF NOT EXISTS）
5. **RLS Policy**（ALTER TABLE ENABLE ROW LEVEL SECURITY）
6. **PostgreSQL Functions**（CREATE OR REPLACE）
7. **授權**（GRANT EXECUTE）
8. **註解**（COMMENT ON TABLE/COLUMN）

### 冪等性設計（重複執行無害）

```sql
✅ CREATE TABLE IF NOT EXISTS
✅ ALTER TABLE ... ADD COLUMN IF NOT EXISTS
✅ CREATE INDEX IF NOT EXISTS
✅ CREATE OR REPLACE FUNCTION
✅ DROP POLICY IF EXISTS ... CREATE POLICY

❌ CREATE TABLE（會報錯）
❌ CREATE FUNCTION（會報錯）
❌ DROP TABLE（危險操作）
```

### RLS Policy 檢查清單

每個新表必須包含完整的 RLS Policy:
- [ ] SELECT - 客戶端/管理端
- [ ] INSERT - 客戶端/管理端
- [ ] UPDATE - 客戶端/管理端
- [ ] DELETE - 管理端

---

## 5. 安全機制與防護

### 四層安全防護

1. **預防層**: Migration 流程 + Git Pre-commit Hook
2. **提示層**: Pre-DB-Reset Hook（雙重確認）
3. **檢查層**: 部署前檢查清單 + 自動備份
4. **回滾層**: 備份檔案 + 反向 Migration

### 絕對禁止事項

| 禁止項目 | 環境 | 原因 | 替代方案 |
|---------|------|------|---------|
| `supabase db reset` | 遠端/生產 | 會清除所有資料 | 使用 `supabase db push` |
| `supabase db reset --linked` | 任何 | 清空遠端資料庫 | **永遠不要使用** |
| 未備份直接部署 | 所有環境 | 無法回滾 | 先執行備份腳本 |
| 手動編輯 Migration | 已推送後 | 破壞版本控制 | 建立新 Migration 反向操作 |
| 跳過型別檢查 | 全部 | 部署失敗 | `pnpm type-check` |

### 備份策略

- **自動備份**: 每次執行 `safe-db-reset.ps1` 自動備份
- **手動備份**: 部署前執行 `db-backup.ps1 -Reason "before_deploy"`
- **備份保留**: 保留最近 10 次（自動清理舊備份）
- **備份恢復**: 使用 `db-restore.ps1` 互動式選擇

---

## 6. 部署檢查清單（6 Phase）

### Phase 1: 規劃階段
- [ ] 填寫 Migration Metadata（名稱、描述、影響範圍、風險等級）
- [ ] 檢查操作類型（優先新增，避免刪除）
- [ ] 規劃分階段執行（如需複雜變更）
- [ ] 準備回滾計畫

### Phase 2: 開發階段
- [ ] 本地測試（`supabase db push --local` 或 `db reset`）
- [ ] 型別檢查（`pnpm type-check`）
- [ ] 執行測試（`pnpm test`）
- [ ] 驗證 Migration 語法與邏輯

### Phase 3: 部署前準備
- [ ] 備份生產資料庫
- [ ] 記錄當前系統狀態（Git Commit Hash、部署版本）
- [ ] 通知團隊即將部署
- [ ] 評估影響範圍與停機時間

### Phase 4: 部署執行
- [ ] 連結正確的雲端專案
- [ ] 確認將執行的 Migration
- [ ] 執行 Migration（`supabase db push`）
- [ ] 驗證成功（`supabase db diff` → No changes）

### Phase 5: 部署後驗證
- [ ] 首頁和新功能正常運作
- [ ] 舊功能未受影響
- [ ] 資料庫連線正常
- [ ] 監控錯誤日誌（30 分鐘）

### Phase 6: 收尾與文件
- [ ] 更新部署記錄
- [ ] 更新 CLAUDE.md 文件
- [ ] 建立 Git Commit
- [ ] 通知團隊部署完成

---

## 7. 關鍵文檔位置

| 文檔 | 位置 | 用途 |
|------|------|------|
| 安全 Migration 指南 | `docs/SAFE_MIGRATION_GUIDE.md` | 詳細的操作規範 |
| 備份還原快速參考 | `docs/BACKUP_RESTORE_CHEATSHEET.md` | 部署檢查清單 |
| 資料庫安全協議 | `docs/DATABASE_SAFETY_PROTOCOL.md` | 完整的安全原則 |
| 資料庫重置指南 | `docs/DATABASE_RESET_GUIDE.md` | Reset 相關指令說明 |
| Migration 規範 | `supabase/migrations/MIGRATION_STANDARDS.md` | 命名與結構規範 |
| 部署檢查清單 | `supabase/migrations/_CHECKLIST.md` | 6 Phase 檢查項目 |
| Migration 範本 | `supabase/migrations/_TEMPLATE_safe_migration.sql` | 新增 Migration 範本 |
| 舊檔案對應表 | `supabase/migrations/.archive/MAPPING.md` | 27 個舊檔案→8 個新檔案 |
| Migration 索引 | `supabase/migrations/README.md` | 所有 Migration 的索引 |

---

## 8. 常見問題與解決方案

### Q1: Migration 執行失敗怎麼辦？

**A**:
1. 檢查錯誤訊息
2. 若是語法錯誤，修正後重新執行
3. 若是資料問題，使用 `db-restore.ps1` 還原備份
4. 記錄失敗原因，修正後重新規劃部署

### Q2: 如何確認 Migration 已成功？

**A**:
```bash
supabase migration list          # 檢查 Migration 狀態
supabase db diff                 # 應顯示 "No changes detected"
.\scripts\db-health-check.ps1   # 執行健康檢查
```

### Q3: 本地開發時不小心執行 `supabase db reset`？

**A**:
1. 執行 `.\scripts\db-restore.ps1` 選擇之前的備份
2. 重新執行 `supabase db push --local` 確保 Migration 一致

### Q4: 如何測試 RLS Policy？

**A**:
使用不同角色（客戶/管理員）帳號登入測試查詢：
```sql
-- 測試客戶端權限
SET LOCAL ROLE authenticated;
SELECT * FROM orders;  -- 應該只看到自己的訂單

-- 測試管理員權限
SET LOCAL ROLE authenticated;
SELECT * FROM orders;  -- 應該看到所有訂單
```

### Q5: 備份檔案在哪裡？

**A**:
```bash
# 列出所有備份
ls backups\*.sql | Sort-Object LastWriteTime -Descending

# 查看備份元數據
cat backups\<timestamp>_metadata.json
```

---

## 9. 專案獨特特色

### 優勢

✅ **完整的 Migration 整合**: 27 → 10 檔案，70% 減少
✅ **自動化備份系統**: PowerShell 腳本完全自動化
✅ **詳細的安全規範**: 4 層防護 + 6 Phase 檢查清單
✅ **豐富的文件**: 8 份詳細指南 + 檢查清單
✅ **設計系統**: 完整的 Neo-Brutalism 設計 Token
✅ **中文優先**: 所有文件、註解、Commit 訊息使用繁體中文

### 建議優化方向

1. **採用 Supabase 官方做法**: 使用 `supabase db push --local` 進行增量更新
2. **自動化測試**: 為 Migration 新增 SQL 層級測試
3. **CI/CD 整合**: GitHub Actions 自動檢查 Migration
4. **監控告警**: 部署失敗自動通知
5. **版本控制**: Git Tag 標記每個部署版本

---

## 📊 總結

Vsale 專案擁有**行業級的 Migration 管理系統**，包括：
- 完整的自動化腳本（備份、還原、健康檢查）
- 詳細的安全規範與檢查清單
- 清晰的本地→遠端部署流程
- 多層次的安全防護機制

### 目前的挑戰

❌ **問題**：使用 `supabase db reset` 導致本地測試資料被清空
✅ **解決方案**：採用 Supabase 官方推薦的 `supabase db push --local` 進行增量更新

---

**分析完成時間**: 2026-01-07
**分析者**: Claude Sonnet 4.5 (Agent a930722)
**資料庫版本**: PostgreSQL v17 (Docker)
**部署平台**: Firebase App Hosting (asia-east1)
