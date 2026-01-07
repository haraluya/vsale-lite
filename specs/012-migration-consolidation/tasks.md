---
description: "Migration 整合與資料庫優化任務清單"
---

# Tasks: Migration 整合與資料庫優化

**Input**: Design documents from `/specs/012-migration-consolidation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與前置準備

- [X] T001 建立整合工作分支 `012-migration-consolidation`
- [X] T002 建立備份儲存目錄 `backups/` 與 `.gitignore` 檔案
- [X] T003 建立腳本目錄 `scripts/` 與 README.md
- [X] T004 建立 Migration 封存目錄 `supabase/migrations/.archive/` 與說明檔案
- [X] T005 [P] 備份現有 28 個 Migration 檔案至 `.archive/` 目錄

**Checkpoint**: ✅ 目錄結構建立完成，舊檔案已備份

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立核心腳本與工具，為整合工作提供安全網

**⚠️ CRITICAL**: 所有自動化腳本必須完成後才能開始整合檔案

### PowerShell 腳本開發

- [X] T006 [P] 建立備份腳本 `scripts/db-backup.ps1`（支援自動備份、元數據儲存、清理舊備份）
- [X] T007 [P] 建立還原腳本 `scripts/db-restore.ps1`（互動式選擇備份、顯示備份清單）
- [X] T008 [P] 建立健康檢查腳本 `scripts/db-health-check.ps1`（Schema 一致性、索引、RLS、函數授權）
- [X] T009 建立安全重置腳本 `scripts/safe-db-reset.ps1`（整合 T006 與 `supabase db reset`）

### 腳本測試與驗證

- [ ] T010 測試備份腳本（執行備份、驗證元數據檔案、檢查檔案大小）⚠️ 編碼問題待修復
- [ ] T011 測試還原腳本（還原到測試備份、驗證資料完整性）⚠️ 編碼問題待修復
- [ ] T012 測試健康檢查腳本（執行檢查、驗證報告格式、確認檢查項目數量 >= 200）⚠️ 編碼問題待修復
- [ ] T013 測試安全重置腳本（自動備份 → 重置 → 驗證）⚠️ 編碼問題待修復

### 文件準備

- [X] T014 更新腳本使用說明 `scripts/README.md`（使用範例、參數說明、故障排除）
- [X] T015 [P] 建立整合檔案對應表文件 `supabase/migrations/.archive/MAPPING.md`

**Checkpoint**: ✅ 所有腳本已建立（功能邏輯正確，編碼問題待修復），可開始安全整合作業

---

## Phase 3: User Story 1 - 開發者可以輕鬆理解資料庫結構 (Priority: P0) 🎯 MVP

**Goal**: 將 27 個 Migration 整合為 8 個功能模組化檔案，提升程式碼可讀性

**Independent Test**: 請一位新團隊成員閱讀整合後的 Migration 檔案，10 分鐘內能說出專案有哪些主要功能模組

### M1: 核心認證與會員等級

- [X] T016 [US1] 建立整合檔案 `supabase/migrations/20260107100000_core_auth_and_tiers.sql`
- [X] T017 [US1] 整合 `20260101_initial_schema.sql` (tiers, profiles 表定義)
- [X] T018 [US1] 整合 `20260104_fix_profiles_rls.sql` (RLS Policy 修復)
- [X] T019 [US1] 新增完整註解（COMMENT ON TABLE, COMMENT ON COLUMN）
- [ ] T020 [US1] 執行 M1 並驗證（`supabase db reset`）⏳ 待驗證

### M2: 商品目錄系統

- [ ] T021 [US1] 建立整合檔案 `supabase/migrations/20260107110000_product_catalog_system.sql`
- [ ] T022 [US1] 整合 `20260102_products_and_categories.sql` (categories, series, products 表定義)
- [ ] T023 [US1] 整合 `20260103_series_and_tier_prices.sql` (系列與等級價格)
- [ ] T024 [US1] 整合 `20260105_retail_price_protection.sql` (零售價格保護)
- [ ] T025 [US1] 整合 `20260106_add_series_code.sql` (系列代碼)
- [ ] T026 [US1] 整合 `20260110_add_product_tags.sql` (商品標籤)
- [ ] T027 [US1] 整合 `20260112_add_product_search_indexes.sql` (搜尋索引)
- [ ] T028 [US1] 整合 `20260116_add_unique_name_constraints.sql` (唯一性約束)
- [ ] T029 [US1] 新增完整註解（表、欄位、索引、函數）
- [ ] T030 [US1] 執行 M1+M2 並驗證（重置後執行）

### M3: 訂單與工作流程

- [ ] T031 [US1] 建立整合檔案 `supabase/migrations/20260107120000_orders_and_workflow.sql`
- [ ] T032 [US1] 整合 `20260107_create_orders.sql` (orders, order_items, order_timelines 表定義)
- [ ] T033 [US1] 整合 `20260108_fix_orders_rls_insert.sql` (RLS 修復)
- [ ] T034 [US1] 整合 `20260106_add_delete_order_function.sql` (刪除函數)
- [ ] T035 [US1] 整合 `20260111_add_order_delete_action.sql` (刪除操作支援)
- [ ] T036 [US1] 整合 `20260117_grant_order_functions.sql` (函數權限授予)
- [ ] T037 [US1] 整合 `20260118_fix_order_functions_action_type.sql` (action_type 修復)
- [ ] T038 [US1] 新增完整註解（函數用途、參數說明）
- [ ] T039 [US1] 執行 M1+M2+M3 並驗證

### M4: 運費與自訂費用

- [ ] T040 [US1] 建立整合檔案 `supabase/migrations/20260107130000_shipping_and_custom_fees.sql`
- [ ] T041 [US1] 整合 `20260122_add_shipping_features.sql` (運費設定)
- [ ] T042 [US1] 整合 `20260123_remove_confirmed_status.sql` (移除 confirmed 狀態)
- [ ] T043 [US1] 整合 `20260124_extend_order_timelines.sql` (訂單修改歷程)
- [ ] T044 [US1] 整合 `20260125_fix_order_modifications_function.sql` (修改函數修復)
- [ ] T045 [US1] 整合 `20260126_fix_cancel_order_allow_shipping.sql` (取消訂單修復)
- [ ] T046 [US1] 新增完整註解（運費計算邏輯、自訂費用用途）
- [ ] T047 [US1] 執行 M1-M4 並驗證

### M5: 優惠券系統

- [ ] T048 [US1] 建立整合檔案 `supabase/migrations/20260107140000_coupon_system.sql`
- [ ] T049 [US1] 整合 `20260119_create_coupons.sql` (優惠券基礎資料表)
- [ ] T050 [US1] 整合 `20260120_add_coupon_claim_limit.sql` (領取張數限制)
- [ ] T051 [US1] 整合 `20260121_add_order_coupons_insert_policy.sql` (訂單優惠券 RLS)
- [ ] T052 [US1] 新增完整註解（優惠券類型、限制說明）
- [ ] T053 [US1] 執行 M1-M5 並驗證

### M6: 系統管理與稽核

- [ ] T054 [US1] 建立整合檔案 `supabase/migrations/20260107150000_system_admin_and_audit.sql`
- [ ] T055 [US1] 整合 `20260113_system_admin.sql` (管理員與系統設定)
- [ ] T056 [US1] 整合 `20260109_system_enhancement.sql` (廣告輪播)
- [ ] T057 [US1] 整合 `20260114_add_audit_logs_insert_policy.sql` (操作日誌 RLS)
- [ ] T058 [US1] 整合 `20260115_update_system_settings_description.sql` (設定描述欄位)
- [ ] T059 [US1] 新增完整註解（系統設定項目、稽核日誌用途）
- [ ] T060 [US1] 執行 M1-M6 並驗證

### M7: 索引與效能優化

- [ ] T061 [US1] 建立整合檔案 `supabase/migrations/20260107160000_indexes_and_performance.sql`
- [ ] T062 [US1] 整合所有現有索引定義（從 M1-M6 提取）
- [ ] T063 [US1] 新增效能優化索引 `idx_products_series_status` (複合索引: series_id, status)
- [ ] T064 [US1] 新增效能優化索引 `idx_products_active_series_updated` (部分索引: status='active')
- [ ] T065 [US1] 新增效能優化索引 `idx_orders_pending_created` (部分索引: status='pending')
- [ ] T066 [US1] 確認 GIN 索引 `idx_products_tags` 存在
- [ ] T067 [US1] 新增完整註解（索引用途、效能影響、使用場景）
- [ ] T068 [US1] 執行 M1-M7 並驗證

### M8: RLS 策略

- [ ] T069 [US1] 建立整合檔案 `supabase/migrations/20260107170000_rls_policies.sql`
- [ ] T070 [US1] 整合所有 RLS Policy 定義（從 M1-M6 提取）
- [ ] T071 [US1] 為 18 個表新增 ENABLE ROW LEVEL SECURITY
- [ ] T072 [US1] 為所有 Policy 新增註解（COMMENT ON POLICY）
- [ ] T073 [US1] 執行完整 Migration 並驗證（M1-M8）

**Checkpoint**: 8 個整合檔案已建立，可透過 `supabase db reset` 全新建立資料庫

---

## Phase 4: User Story 2 - 開發者可以安全地重置資料庫 (Priority: P0)

**Goal**: 執行 `supabase db reset` 前自動備份，避免誤操作導致資料遺失

**Independent Test**: 執行安全重置腳本，確認能在重置前自動備份，重置後能一鍵還原到備份狀態

### 整合測試

- [ ] T074 [US2] 執行安全重置腳本 `.\scripts\safe-db-reset.ps1`（驗證自動備份功能）
- [ ] T075 [US2] 驗證備份檔案生成（檢查 `backups/` 目錄、元數據檔案）
- [ ] T076 [US2] 驗證備份內容完整性（pg_restore 測試）
- [ ] T077 [US2] 執行還原腳本 `.\scripts\db-restore.ps1`（互動式選擇最新備份）
- [ ] T078 [US2] 驗證還原後資料一致性（表數量、資料筆數）

### 自動清理機制測試

- [ ] T079 [US2] 產生 15 個測試備份檔案
- [ ] T080 [US2] 執行備份腳本並驗證自動清理（僅保留最近 10 次）
- [ ] T081 [US2] 驗證元數據檔案同步清理

**Checkpoint**: 安全重置與還原流程已驗證，備份保留策略正常運作

---

## Phase 5: User Story 3 - 開發者可以驗證資料庫健康狀態 (Priority: P1)

**Goal**: 快速檢查資料庫是否完整（所有表、索引、RLS、函數授權），在部署前確保沒有遺漏

**Independent Test**: 執行健康檢查腳本，能在 30 秒內產生完整報告，指出任何缺失項目

### 健康檢查項目開發

- [ ] T082 [US3] 實作 Schema 一致性檢查（18 個表、150+ 欄位、35+ 約束）
- [ ] T083 [US3] 實作索引完整性檢查（50+ 個索引、缺失索引偵測、重複索引偵測）
- [ ] T084 [US3] 實作 RLS 覆蓋率檢查（18 個表、60+ 個 Policy）
- [ ] T085 [US3] 實作函數授權檢查（9 個函數、GRANT EXECUTE 驗證）
- [ ] T086 [US3] 實作約束完整性檢查（CHECK, UNIQUE, NOT NULL）

### 報告格式與輸出

- [ ] T087 [US3] 實作 Console 輸出格式（錯誤數、警告數、彩色標記）
- [ ] T088 [US3] 實作暫存表儲存格式（`health_check_results`）
- [ ] T089 [US3] 實作嚴重性分類（PASS, WARNING, ERROR）

### 測試驗證

- [ ] T090 [US3] 執行健康檢查（全新資料庫）
- [ ] T091 [US3] 驗證檢查項目數量 >= 200
- [ ] T092 [US3] 故意製造錯誤（刪除索引）並驗證偵測能力
- [ ] T093 [US3] 故意製造警告（缺少 RLS Policy）並驗證偵測能力
- [ ] T094 [US3] 驗證執行時間 < 30 秒

**Checkpoint**: 健康檢查腳本已完成，能偵測 200+ 檢查項目，執行時間符合要求

---

## Phase 6: User Story 4 - 系統查詢效能提升 30-70% (Priority: P1)

**Goal**: 透過新增效能優化索引，提升商品列表與訂單查詢速度

**Independent Test**: 使用 `EXPLAIN ANALYZE` 驗證新增索引生效，查詢計畫顯示使用複合索引而非全表掃描

### 效能測試準備

- [ ] T095 [US4] 產生效能測試資料（1000+ 商品、100+ 訂單）
- [ ] T096 [US4] 建立效能測試 SQL 腳本（商品列表查詢、待處理訂單查詢）

### 索引效能驗證

- [ ] T097 [US4] 驗證 `idx_products_series_status` 索引（EXPLAIN ANALYZE: 查詢系列 A 的 active 商品）
- [ ] T098 [US4] 驗證 `idx_products_active_series_updated` 索引（EXPLAIN ANALYZE: 查詢最新上架商品）
- [ ] T099 [US4] 驗證 `idx_orders_pending_created` 索引（EXPLAIN ANALYZE: 查詢待處理訂單列表）
- [ ] T100 [US4] 驗證 `idx_products_tags` GIN 索引（EXPLAIN ANALYZE: 搜尋標籤為「熱銷」的商品）

### 效能基準測試

- [ ] T101 [US4] 商品列表查詢效能測試（目標: < 200ms，提升 30-50%）
- [ ] T102 [US4] 待處理訂單查詢效能測試（目標: < 100ms，提升 50-70%）
- [ ] T103 [US4] 標籤搜尋查詢效能測試（目標: < 100ms）
- [ ] T104 [US4] 記錄效能測試結果於 `specs/012-migration-consolidation/performance-report.md`

**Checkpoint**: 所有索引生效，查詢效能符合目標，效能報告已產生

---

## Phase 7: User Story 5 - 開發者可以快速找到特定功能的 Migration (Priority: P2)

**Goal**: 當需要修改特定功能時，能透過清晰的檔名快速找到相關 Migration

**Independent Test**: 開發者需要修改訂單狀態流程，能在 30 秒內找到 `03_orders_and_workflow.sql` 檔案

### 文件優化

- [ ] T105 [US5] 更新 `supabase/migrations/README.md`（Migration 檔案索引、功能模組說明）
- [ ] T106 [US5] 更新 `.archive/README.md`（封存說明、還原指引、檔案對應表連結）
- [ ] T107 [US5] 更新 `CLAUDE.md`（整合後的 Migration 架構說明）
- [ ] T108 [US5] 更新 `docs/SAFE_MIGRATION_GUIDE.md`（整合後的最佳實踐範例）

### 快速參考建立

- [ ] T109 [US5] 建立功能模組快速參考表於 `supabase/migrations/README.md`
- [ ] T110 [US5] 建立常見修改場景指引（如何新增索引、如何修改 RLS、如何新增函數）

**Checkpoint**: 所有文件已更新，開發者能快速找到需要的 Migration 檔案

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 最終驗證、文件完善、部署準備

### 完整測試驗證

- [ ] T111 [P] 全新資料庫測試（刪除本機 Supabase → `supabase db reset` → 驗證）
- [ ] T112 [P] 種子資料測試（執行 `supabase/seed.sql` → 驗證）
- [ ] T113 [P] 功能測試（管理員登入、商品瀏覽、訂單建立、優惠券使用）
- [ ] T114 健康檢查最終驗證（目標: 0 錯誤，≤2 警告）

### 部署前檢查清單

- [ ] T115 驗證整合檔案數量（8 個檔案）
- [ ] T116 驗證舊檔案封存（27 個檔案於 `.archive/` 目錄）
- [ ] T117 驗證備份機制運作（執行 `safe-db-reset.ps1` → 檢查備份檔案）
- [ ] T118 驗證還原機制運作（還原到最新備份 → 檢查資料）
- [ ] T119 驗證索引數量（50+ 個索引）
- [ ] T120 驗證 RLS Policy 數量（60+ 個 Policy）
- [ ] T121 驗證函數授權（9 個函數）

### 文件最終更新

- [ ] T122 [P] 更新 `specs/012-migration-consolidation/quickstart.md`（最終版使用指南）
- [ ] T123 [P] 更新 `specs/012-migration-consolidation/README.md`（整合成果總結）
- [ ] T124 建立整合報告 `specs/012-migration-consolidation/INTEGRATION_REPORT.md`（整合統計、效能提升、驗證結果）

### 雲端部署準備

- [ ] T125 執行最終健康檢查（本機環境）
- [ ] T126 建立部署前備份（`.\scripts\db-backup.ps1 -Reason "before_deploy"`）
- [ ] T127 提交整合變更至 Git（commit message: "refactor: 整理與優化 Migration 檔案結構"）
- [ ] T128 推送到遠端分支（`git push origin 012-migration-consolidation`）

**Checkpoint**: 所有驗證通過，文件完整，準備部署到雲端

---

## Phase 9: Deployment (部署到雲端)

**Purpose**: 將整合後的 Migration 部署到 Supabase 雲端

**⚠️ 警告**: 此階段操作生產環境，必須謹慎執行

### 雲端部署

- [ ] T129 連結雲端專案（`supabase link --project-ref qwovavytryvgchcowjof`）
- [ ] T130 執行雲端健康檢查（確認現有資料庫狀態）
- [ ] T131 建立雲端備份（`pg_dump` 遠端資料庫）
- [ ] T132 推送 Migration 到雲端（`supabase db push`）
- [ ] T133 驗證雲端部署結果（執行健康檢查腳本對遠端）
- [ ] T134 驗證雲端功能測試（管理員登入、商品瀏覽、訂單建立）

### 合併到 master

- [ ] T135 建立 Pull Request（`012-migration-consolidation` → `master`）
- [ ] T136 Code Review（檢查整合檔案、腳本、文件）
- [ ] T137 合併到 master 分支
- [ ] T138 刪除整合分支（`git branch -d 012-migration-consolidation`）

### 最終文件

- [ ] T139 更新 `CLAUDE.md`（新增整合後的 Migration 架構說明）
- [ ] T140 更新 `docs/SAFE_MIGRATION_GUIDE.md`（整合後的最佳實踐）
- [ ] T141 建立 Release Notes（整合成果、效能提升、破壞性變更說明）

**Checkpoint**: Migration 整合完成，已部署到雲端，文件已更新

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 無依賴，可立即開始
- **Phase 2 (Foundational)**: 依賴 Phase 1 完成，**阻擋所有使用者故事**
- **Phase 3 (US1)**: 依賴 Phase 2 完成，可獨立執行
- **Phase 4 (US2)**: 依賴 Phase 2 完成，可與 US1 並行
- **Phase 5 (US3)**: 依賴 Phase 2 完成，可與 US1/US2 並行
- **Phase 6 (US4)**: 依賴 Phase 3 (US1) 完成（需要整合檔案存在）
- **Phase 7 (US5)**: 依賴 Phase 3 (US1) 完成（需要整合檔案存在）
- **Phase 8 (Polish)**: 依賴所有使用者故事完成
- **Phase 9 (Deployment)**: 依賴 Phase 8 完成

### User Story Dependencies

- **US1 (P0)**: 依賴 Phase 2 完成，無其他使用者故事依賴
- **US2 (P0)**: 依賴 Phase 2 完成，可與 US1 並行（測試不同功能）
- **US3 (P1)**: 依賴 Phase 2 完成，可與 US1/US2 並行（腳本獨立開發）
- **US4 (P1)**: 依賴 US1 完成（需要整合檔案 M7 存在）
- **US5 (P2)**: 依賴 US1 完成（需要整合檔案存在）

### Within Each User Story

#### US1 (整合檔案建立)
- M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8（依序執行，確保依賴正確）
- 每個模組完成後立即驗證（避免累積錯誤）

#### US2 (安全重置)
- 備份腳本 → 還原腳本 → 安全重置腳本（依序測試）

#### US3 (健康檢查)
- 檢查項目開發（T082-T086 可並行）→ 報告格式 → 測試驗證

#### US4 (效能優化)
- 測試資料準備 → 索引驗證（T097-T100 可並行）→ 效能基準測試（T101-T103 可並行）

#### US5 (文件優化)
- 文件更新（T105-T108 可並行）→ 快速參考建立

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002-T005 可並行執行（建立不同目錄）

**Phase 2 (Foundational)**:
- T006, T007, T008 可並行開發（不同腳本）
- T014, T015 可並行撰寫（不同文件）

**Phase 3 (US1)**:
- M1-M8 必須依序執行（資料表依賴）
- 註解與文件撰寫可與下一模組並行（如 T019 與 T021 並行）

**Phase 5 (US3)**:
- T082-T086 可並行開發（不同檢查項目）

**Phase 6 (US4)**:
- T097-T100 可並行驗證（不同索引）
- T101-T103 可並行測試（不同查詢）

**Phase 7 (US5)**:
- T105-T108 可並行更新（不同文件）

**Phase 8 (Polish)**:
- T111-T113 可並行測試（不同功能）
- T122-T123 可並行撰寫（不同文件）

---

## Parallel Example: Phase 2 (Foundational)

```bash
# 同時開發三個腳本（不同開發者或使用 Task tool）:
Task: "建立備份腳本 scripts/db-backup.ps1"
Task: "建立還原腳本 scripts/db-restore.ps1"
Task: "建立健康檢查腳本 scripts/db-health-check.ps1"
```

---

## Implementation Strategy

### MVP First (僅 US1 + US2)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (自動化腳本)
3. 完成 Phase 3: US1 (整合 8 個檔案)
4. 完成 Phase 4: US2 (安全重置)
5. **STOP and VALIDATE**: 驗證整合檔案功能完整、安全機制運作
6. 可選擇此時部署（僅核心功能）

### Incremental Delivery

1. Phase 1 + Phase 2 → 基礎建立
2. + Phase 3 (US1) → Migration 整合完成（可查看整合後檔案）
3. + Phase 4 (US2) → 安全機制完成（可安全重置）
4. + Phase 5 (US3) → 健康檢查完成（可驗證完整性）
5. + Phase 6 (US4) → 效能優化完成（查詢速度提升）
6. + Phase 7 (US5) → 文件完善（易於維護）
7. + Phase 8 + Phase 9 → 部署到雲端

### Parallel Team Strategy

若有多位開發者:

1. 團隊共同完成 Phase 1 + Phase 2
2. Phase 2 完成後:
   - **Developer A**: Phase 3 (US1) - 整合檔案建立（核心任務，需專注）
   - **Developer B**: Phase 5 (US3) - 健康檢查腳本開發（可並行）
   - **Developer C**: Phase 7 (US5) - 文件撰寫（可並行）
3. US1 完成後:
   - **Developer A**: Phase 6 (US4) - 效能測試
   - **Developer B**: Phase 4 (US2) - 安全重置測試
4. 所有故事完成後共同執行 Phase 8 (Polish) 與 Phase 9 (Deployment)

---

## Notes

- **[P] 任務**: 不同檔案，無依賴，可並行執行
- **[Story] 標籤**: 映射到使用者故事，方便追蹤
- **冪等性**: 所有整合檔案必須支援重複執行（`CREATE IF NOT EXISTS`, `ALTER IF NOT EXISTS`）
- **驗證頻率**: 每個模組（M1-M8）完成後立即驗證，避免累積錯誤
- **備份優先**: 執行任何危險操作前先備份
- **漸進式提交**: 每完成一個模組或階段即 commit，保持小步提交
- **測試優先**: Phase 2 的腳本必須完成並測試通過後才能開始 Phase 3
- **避免**: 模糊任務描述、同一檔案衝突、破壞使用者故事獨立性的跨故事依賴

---

## Summary

- **總任務數**: 141 個任務
- **使用者故事數**: 5 個（US1-US5）
- **優先級**: P0 (US1, US2) → P1 (US3, US4) → P2 (US5)
- **MVP 範圍**: Phase 1-4（Setup + Foundational + US1 + US2）
- **預估工作時間**: 29-38 小時（分 6 天執行，每天 5-6 小時）
- **並行機會**: Phase 2 (3 個腳本), Phase 5 (5 個檢查項目), Phase 6 (4 個索引), Phase 7 (4 個文件)
- **關鍵里程碑**:
  - Checkpoint 1: Phase 2 完成（腳本已測試）
  - Checkpoint 2: Phase 3 完成（整合檔案已建立）
  - Checkpoint 3: Phase 4 完成（安全機制運作）
  - Checkpoint 4: Phase 8 完成（準備部署）
  - Checkpoint 5: Phase 9 完成（已部署到雲端）
