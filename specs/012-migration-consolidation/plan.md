# Implementation Plan: Migration 整合與資料庫優化

**Branch**: `012-migration-consolidation` | **Date**: 2026-01-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-migration-consolidation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

將現有 27 個分散的 Migration 檔案整合為 8 個功能模組化檔案，並建立完整的資料庫安全機制（自動備份、健康檢查、索引優化）。目標是提升程式碼可維護性（減少 70% 檔案數量）、加強資料安全（防止誤操作）、優化查詢效能（提升 30-70%）。

**技術策略**:
- 使用功能模組化分組（認證/商品/訂單/優惠券等）取代時間序列分組
- 開發 PowerShell 腳本提供自動化備份與還原流程
- 新增 4 個效能關鍵索引（複合索引 + 部分索引 + GIN 索引）
- 建立健康檢查機制驗證 Schema 一致性（200+ 檢查項目）

## Technical Context

**Language/Version**: PostgreSQL 15+ (Supabase), PowerShell 7+, TypeScript 5.7+
**Primary Dependencies**: Supabase CLI, pg_dump/psql, Next.js 15
**Storage**: Supabase PostgreSQL (本機 Docker + 雲端)
**Testing**: 手動測試（功能驗收）+ SQL 驗證腳本
**Target Platform**: Windows 11 開發環境, Supabase Cloud 生產環境
**Project Type**: Web (資料庫層優化，不涉及前端變更)
**Performance Goals**:
  - 商品列表查詢提升 30-50% (500ms → 200ms)
  - 待處理訂單查詢提升 50-70% (300ms → 100ms)
  - 健康檢查執行時間 < 30 秒
  - 備份與還原總時間 < 2 分鐘
**Constraints**:
  - 整合後 Schema 必須與現有 100% 一致（通過健康檢查）
  - 不可在生產環境執行 `supabase db reset`
  - 整合過程中會清空本機資料庫（需事前告知使用者）
  - 每個整合檔案完成後需立即驗證（避免累積錯誤）
**Scale/Scope**:
  - 18 個資料表
  - 50+ 個索引
  - 60+ 個 RLS Policies
  - 9 個 PostgreSQL Functions
  - 27 → 8 個 Migration 檔案（減少 70%）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 (User Role First)
✅ **PASS** - 本功能為技術債務清理，不涉及使用者介面變更，不影響角色分離。

### II. 等級綁定價格 (Tier-Based Pricing)
✅ **PASS** - 整合過程不修改價格機制，僅重新組織 Migration 檔案。

### III. 使用者故事驅動開發 (User Story Driven Development)
✅ **PASS** - 規格包含 5 個明確的使用者故事（開發者為主要使用者），每個故事可獨立測試與交付。

### IV. API 模組化與職責分離 (API Modularization)
✅ **PASS** - 本功能為資料庫層優化，不涉及 API 變更。

### V. 設計系統一致性 (Design System Consistency)
✅ **PASS** - 本功能不涉及 UI 變更。

### VI. 負庫存支援 (Negative Stock Support)
✅ **PASS** - 整合過程保留所有負庫存邏輯。

### VII. 使用者體驗優先 (User Experience First)
✅ **PASS** - 效能優化（查詢速度提升）間接提升使用者體驗。

### VIII. 資料庫安全至上 (Database Safety First)
⚠️ **CRITICAL** - 本功能核心目標即為加強資料庫安全機制：
  - ✅ 建立自動備份腳本（`safe-db-reset.ps1`）
  - ✅ 建立還原腳本（`db-restore.ps1`）
  - ✅ 建立健康檢查腳本（`db-health-check.ps1`）
  - ✅ 封存舊 Migration（`.archive/` 目錄）
  - ✅ 提供回滾計畫（緊急還原程序）
  - ⚠️ 整合過程需執行 `supabase db reset`（僅限本機，需明確告知使用者）

**憲章合規性**: ✅ **PASS** - 本功能完全符合憲章原則，並強化第 VIII 號原則的執行機制。

## Project Structure

### Documentation (this feature)

```text
specs/012-migration-consolidation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command) - 整合檔案對應表
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - 腳本 API 規格
├── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
└── spec.md              # Feature specification (already exists)
```

### Source Code (repository root)

```text
# 資料庫 Migration 檔案（整合後）
supabase/migrations/
├── .archive/                          # 封存舊 Migration（整合前的 27 個檔案）
│   ├── 20241201_*.sql                 # 原始 Migration（保留備份）
│   └── README.md                      # 封存說明與還原指引
├── 20260107100000_core_auth_and_tiers.sql          # 01. 核心認證與會員等級
├── 20260107110000_product_catalog_system.sql       # 02. 商品目錄系統
├── 20260107120000_orders_and_workflow.sql          # 03. 訂單與工作流程
├── 20260107130000_shipping_and_custom_fees.sql     # 04. 運費與自訂費用
├── 20260107140000_coupon_system.sql                # 05. 優惠券系統
├── 20260107150000_system_admin_and_audit.sql       # 06. 系統管理與稽核
├── 20260107160000_indexes_and_performance.sql      # 07. 索引與效能優化
├── 20260107170000_rls_policies.sql                 # 08. RLS 策略
├── _TEMPLATE_safe_migration.sql                    # Migration 範本（已存在）
└── _CHECKLIST.md                                   # 部署檢查清單（已存在）

# 自動化腳本（新增）
scripts/
├── safe-db-reset.ps1                  # 安全重置腳本（自動備份 + 重置）
├── db-restore.ps1                     # 資料庫還原腳本（互動式選擇備份）
├── db-health-check.ps1                # 健康檢查腳本（驗證 Schema 一致性）
└── README.md                          # 腳本使用說明

# 備份儲存（不納入 Git）
backups/
├── .gitignore                         # 忽略所有 .sql 備份檔案
├── 20260107_120530_before_reset.sql   # 範例備份檔案（含時間戳）
└── 20260107_120530_metadata.json      # 備份元數據（原因、大小、表數量）

# 文件（更新）
docs/
├── SAFE_MIGRATION_GUIDE.md            # 安全 Migration 指南（已存在）
├── BACKUP_RESTORE_CHEATSHEET.md       # 備份還原快速參考（已存在）
└── DATABASE_SAFETY_PROTOCOL.md        # 資料庫安全協議（已存在）
```

**Structure Decision**:
- 整合後的 Migration 採用「功能模組化」架構，每個檔案代表一個業務模組（認證/商品/訂單等）
- 使用時間戳前綴確保執行順序（`20260107100000` → `20260107170000`）
- 舊 Migration 封存於 `.archive/` 目錄，保留回滾能力
- 自動化腳本集中於 `scripts/` 目錄，提供安全操作流程

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違規項目，本功能完全符合憲章原則。

---

## Phase 0: Research & Unknowns Resolution

**目標**: 解決所有 Technical Context 中的 NEEDS CLARIFICATION，並為整合策略提供技術依據。

### Research Tasks

1. **Migration 整合策略研究**
   - **問題**: 如何安全地將 27 個 Migration 整合為 8 個，並確保功能完整性？
   - **研究方向**:
     - 分析現有 Migration 的依賴關係（哪些表依賴其他表？）
     - 確認 PostgreSQL 執行順序（CREATE TABLE → ALTER TABLE → CREATE INDEX → RLS）
     - 驗證冪等性（重複執行不會產生錯誤）
   - **預期產出**: 整合分組邏輯、執行順序規範、驗證方法

2. **備份與還原最佳實踐**
   - **問題**: 如何設計可靠的備份與還原流程？
   - **研究方向**:
     - `pg_dump` 參數選擇（`--clean`, `--if-exists`, `--no-owner`）
     - 備份檔案命名與元數據儲存格式
     - 自動清理策略（保留最近 N 次）
   - **預期產出**: 腳本參數規格、元數據 Schema

3. **健康檢查項目設計**
   - **問題**: 如何全面驗證資料庫健康狀態？
   - **研究方向**:
     - Schema 一致性檢查（表、欄位、型別）
     - 索引完整性檢查（缺失索引、重複索引）
     - RLS 覆蓋率檢查（哪些表未啟用 RLS？）
     - 函數授權檢查（`GRANT EXECUTE ON FUNCTION`）
   - **預期產出**: 檢查清單（200+ 項目）、SQL 查詢範例

4. **索引優化策略**
   - **問題**: 哪些索引能有效提升查詢效能？
   - **研究方向**:
     - 分析常見查詢模式（商品列表、待處理訂單）
     - 複合索引設計（多欄位組合）
     - 部分索引設計（僅索引特定條件資料）
     - GIN 索引使用場景（JSONB、陣列）
   - **預期產出**: 4 個索引定義、效能測試計畫

### Research Deliverables

- `research.md`: 包含所有研究結果、技術決策與參考資料
- 整合檔案對應表草稿（哪些舊 Migration 合併到哪個新檔案）
- 備份腳本參數規格
- 健康檢查 SQL 查詢範例

---

## Phase 1: Design & Contracts

**目標**: 產生資料模型、API 合約、快速上手指南，並更新 Agent Context。

### 1.1 Data Model (`data-model.md`)

**內容**:
- **整合檔案對應表**: 記錄 27 個舊 Migration 如何分組到 8 個新檔案
- **Migration 依賴關係圖**: 表與表之間的 FK 依賴（確保執行順序正確）
- **備份元數據 Schema**: JSON 格式，包含 `backup_time`, `reason`, `size`, `table_count`
- **健康檢查報告格式**: 錯誤數、警告數、具體問題清單

範例格式：
```markdown
## 整合檔案對應表

| 新 Migration 檔案 | 包含的舊 Migration | 功能描述 |
|-------------------|-------------------|----------|
| 01_core_auth_and_tiers.sql | 20241201_init_auth.sql, 20241202_add_tiers.sql | 認證與會員等級 |
| 02_product_catalog_system.sql | 20241203_categories.sql, 20241204_series.sql, 20241205_products.sql | 商品目錄 |
| ... | ... | ... |
```

### 1.2 API Contracts (`contracts/`)

**內容**: PowerShell 腳本的 API 規格（參數、回傳值、錯誤處理）

檔案結構：
```text
contracts/
├── safe-db-reset.md          # 安全重置腳本 API
├── db-restore.md             # 還原腳本 API
└── db-health-check.md        # 健康檢查腳本 API
```

範例（`safe-db-reset.md`）：
```markdown
# Safe DB Reset Script API

## Synopsis
.\scripts\safe-db-reset.ps1 [-SkipBackup] [-BackupReason <string>]

## Parameters
- `-SkipBackup`: (Optional) 跳過自動備份（僅限測試環境）
- `-BackupReason`: (Optional) 備份原因說明（預設: "Before DB Reset"）

## Output
- 備份檔案路徑
- 重置執行結果

## Errors
- 備份失敗時中止執行
- Supabase 未啟動時提示錯誤
```

### 1.3 Quickstart Guide (`quickstart.md`)

**內容**: 使用者快速上手指南，包含常見操作流程

範例章節：
- 如何安全重置資料庫？
- 如何還原到特定備份？
- 如何執行健康檢查？
- 如何新增索引？
- 故障排除（常見錯誤與解決方法）

### 1.4 Agent Context Update

執行腳本更新 Agent Context：
```powershell
.\\.specify\scripts\powershell\update-agent-context.ps1 -AgentType claude
```

新增技術棧：
- Migration 整合策略
- PowerShell 自動化腳本
- 健康檢查機制

---

## Phase 2: Task Generation

**注意**: 此階段由 `/speckit.tasks` 指令執行，不在本計畫範圍內。

**預期產出**: `tasks.md` 檔案，包含所有實作任務（預估 80-100 個任務）。

---

## Risk Mitigation

### 高風險項目

1. **整合過程中資料遺失**
   - **緩解措施**: 執行自動備份腳本，封存舊 Migration
   - **回滾計畫**: 使用 `.archive/` 目錄的舊 Migration 重建

2. **整合後 Schema 不一致**
   - **緩解措施**: 每個檔案完成後立即執行健康檢查
   - **驗證方法**: 與舊 Schema 比對（表數量、欄位型別）

3. **效能優化無效**
   - **緩解措施**: 使用 `EXPLAIN ANALYZE` 驗證索引生效
   - **備用方案**: 保留舊索引定義，可回滾

### 中風險項目

4. **PowerShell 腳本相容性問題**
   - **緩解措施**: 支援 PowerShell 5.1 與 7+
   - **測試環境**: Windows 11 開發環境

5. **備份檔案過大**
   - **緩解措施**: 自動清理（保留最近 10 次）
   - **壓縮選項**: 使用 `gzip` 壓縮備份檔案

---

## Timeline Estimation

**總工作量**: 29-38 小時（分 6 天執行，每天 5-6 小時）

| 階段 | 工作時間 | 產出 |
|------|---------|------|
| Phase 0: Research | 4-5 小時 | research.md |
| Phase 1: Design & Contracts | 5-6 小時 | data-model.md, contracts/, quickstart.md |
| Phase 2: Task Generation | 2-3 小時 | tasks.md |
| Phase 3: 腳本開發 | 6-8 小時 | safe-db-reset.ps1, db-restore.ps1, db-health-check.ps1 |
| Phase 4: Migration 整合 | 8-10 小時 | 8 個整合檔案 |
| Phase 5: 測試驗證 | 3-4 小時 | 手動測試清單 |
| Phase 6: 部署 | 1-2 小時 | 雲端部署 |

---

## Success Metrics

- ✅ Migration 檔案數量 27 → 8（減少 70%）
- ✅ 新成員理解時間 < 10 分鐘
- ✅ 商品列表查詢效能提升 30-50%
- ✅ 待處理訂單查詢效能提升 50-70%
- ✅ 健康檢查執行時間 < 30 秒
- ✅ 備份與還原總時間 < 2 分鐘
- ✅ 健康檢查通過（0 錯誤，≤2 警告）
- ✅ 所有手動測試通過（10 項功能）
