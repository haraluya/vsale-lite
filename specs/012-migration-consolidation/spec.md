# Feature Specification: Migration 整合與資料庫優化

**Feature Branch**: `012-migration-consolidation`
**Created**: 2026-01-07
**Status**: Draft
**Input**: 整合 27 個 Migration 檔案為 8 個核心檔案，並建立完整的自動化備份、健康檢查與索引優化機制

## User Scenarios & Testing

### User Story 1 - 開發者可以輕鬆理解資料庫結構 (Priority: P0)

身為開發者，我希望能快速理解專案的資料庫結構，而不需要閱讀 27 個分散的 Migration 檔案。整合後的 8 個功能模組化檔案能讓我在 10 分鐘內掌握整個資料庫架構。

**Why this priority**: 這是整合工作的核心價值，直接影響團隊效率與新成員上手速度。

**Independent Test**: 請一位新團隊成員閱讀整合後的 Migration 檔案，10 分鐘內能說出專案有哪些主要功能模組（認證、商品、訂單、優惠券等）。

**Acceptance Scenarios**:

1. **Given** 開發者查看 `supabase/migrations/` 目錄，**When** 列出所有檔案，**Then** 看到 8 個檔案，每個檔名清楚標示功能模組（如 `01_core_auth_and_tiers.sql`）
2. **Given** 開發者開啟 `02_product_catalog_system.sql`，**When** 閱讀檔案內容，**Then** 能看到完整的商品目錄系統定義（categories, series, products, tier_prices）含註解
3. **Given** 開發者需要了解 RLS 策略，**When** 開啟 `08_rls_policies.sql`，**Then** 能一次看到所有 18 個表的完整 RLS 定義

---

### User Story 2 - 開發者可以安全地重置資料庫 (Priority: P0)

身為開發者，我希望在執行 `supabase db reset` 前能自動備份資料庫，避免誤操作導致測試資料遺失，並能在 1 分鐘內快速還原。

**Why this priority**: 資料安全是基礎需求，直接影響開發信心與效率。

**Independent Test**: 執行安全重置腳本，確認能在重置前自動備份，重置後能一鍵還原到備份狀態。

**Acceptance Scenarios**:

1. **Given** 開發者執行 `.\scripts\safe-db-reset.ps1`，**When** 腳本開始執行，**Then** 自動產生備份檔案於 `backups/` 目錄，並顯示備份檔案路徑
2. **Given** 開發者執行 `supabase db reset` 後發現問題，**When** 執行 `.\scripts\db-restore.ps1`，**Then** 列出可用備份並能選擇還原點
3. **Given** 備份目錄有 15 個備份檔案，**When** 執行新備份，**Then** 自動刪除最舊的備份，僅保留最近 10 次

---

### User Story 3 - 開發者可以驗證資料庫健康狀態 (Priority: P1)

身為開發者，我希望能快速檢查資料庫是否完整（所有表、索引、RLS、函數授權），在部署前確保沒有遺漏。

**Why this priority**: 預防性檢查能避免生產環境問題，提升部署信心。

**Independent Test**: 執行健康檢查腳本，能在 30 秒內產生完整報告，指出任何缺失項目。

**Acceptance Scenarios**:

1. **Given** 開發者執行 `.\scripts\db-health-check.ps1`，**When** 腳本完成，**Then** 顯示檢查結果（Schema 一致性、索引完整性、RLS 覆蓋率、函數授權）與錯誤/警告數量
2. **Given** 資料庫缺少某個索引，**When** 執行健康檢查，**Then** 報告中明確指出缺少的索引名稱與所屬表
3. **Given** 所有檢查通過，**When** 檢視報告，**Then** 顯示「✅ 資料庫健康狀態良好! 錯誤: 0, 警告: 0」

---

### User Story 4 - 系統查詢效能提升 30-70% (Priority: P1)

身為使用者，我希望在瀏覽商品列表、查看待處理訂單時能更快看到結果（從 500ms 降至 200ms 以下）。

**Why this priority**: 效能直接影響使用者體驗與系統負載能力。

**Independent Test**: 使用 `EXPLAIN ANALYZE` 驗證新增索引生效，查詢計畫顯示使用複合索引而非全表掃描。

**Acceptance Scenarios**:

1. **Given** 管理員查詢系列 A 的所有 active 商品，**When** 執行查詢，**Then** PostgreSQL 使用 `idx_products_series_status` 複合索引，查詢時間 < 100ms
2. **Given** 管理員查看待處理訂單列表，**When** 執行查詢，**Then** PostgreSQL 使用 `idx_orders_pending_created` 部分索引，查詢時間 < 50ms
3. **Given** 客戶在前台搜尋標籤為「熱銷」的商品，**When** 執行查詢，**Then** PostgreSQL 使用 `idx_products_tags` GIN 索引，查詢時間 < 100ms

---

### User Story 5 - 開發者可以快速找到特定功能的 Migration (Priority: P2)

身為開發者，我希望當需要修改訂單系統時，能快速找到相關的 Migration 檔案（而不是在 27 個檔案中搜尋）。

**Why this priority**: 提升維護效率，減少尋找時間。

**Independent Test**: 開發者需要修改訂單狀態流程，能在 30 秒內找到 `03_orders_and_workflow.sql` 檔案。

**Acceptance Scenarios**:

1. **Given** 開發者需要修改優惠券邏輯，**When** 查看 `supabase/migrations/` 目錄，**Then** 立即看到 `05_coupon_system.sql` 檔案
2. **Given** 開發者需要新增索引，**When** 開啟 `07_indexes_and_performance.sql`，**Then** 看到所有現有索引的定義，並能在同一處新增
3. **Given** 開發者需要修改 RLS Policy，**When** 開啟 `08_rls_policies.sql`，**Then** 一次看到所有表的 RLS 定義，易於比對與修改

---

### Edge Cases

- **What happens when 備份失敗？** 安全重置腳本應中止執行並顯示錯誤訊息，不執行 `supabase db reset`
- **How does system handle 整合後的 Migration 執行失敗？** 提供緊急回滾計畫，可使用封存的舊 Migration 還原
- **What happens when 健康檢查發現多個錯誤？** 報告中列出所有錯誤項目與修復建議，但不自動修復
- **How does system handle 同時有多個開發者執行備份？** 備份檔名包含時間戳（精確到秒），避免檔名衝突
- **What happens when Supabase 未啟動時執行健康檢查？** 腳本應檢測 Supabase 狀態，若未啟動則提示開發者先執行 `supabase start`

## Requirements

### Functional Requirements

- **FR-001**: 系統必須將 27 個現有 Migration 整合為 8 個功能模組化檔案（認證、商品、訂單、運費、優惠券、系統管理、索引、RLS）
- **FR-002**: 整合後的 Migration 必須保持功能完整性（與現有 Schema 100% 一致）
- **FR-003**: 整合後的 Migration 必須支援冪等性（可重複執行 `supabase db reset` 而不產生錯誤）
- **FR-004**: 系統必須提供自動備份腳本，在執行危險操作前自動產生備份檔案
- **FR-005**: 系統必須提供還原腳本，能列出所有可用備份並互動式選擇還原點
- **FR-006**: 系統必須提供健康檢查腳本，能驗證 Schema 一致性、索引完整性、RLS 覆蓋率、函數授權
- **FR-007**: 系統必須新增 4 個效能優化索引（`idx_products_series_status`, `idx_products_active_series_updated`, `idx_orders_pending_created`, 確認 `idx_products_tags` 存在）
- **FR-008**: 系統必須保留所有關鍵資料遷移邏輯（如 categories → series 的資料遷移）
- **FR-009**: 系統必須為每個 PostgreSQL Function 提供 GRANT 授權（在同一 Migration 檔案中，不分離）
- **FR-010**: 系統必須為每個表、欄位、索引、函數提供完整註解（COMMENT ON）
- **FR-011**: 備份腳本必須支援自動清理（僅保留最近 10 次備份）
- **FR-012**: 健康檢查腳本必須檢查 18 個必要表、50+ 個索引、60+ 個 RLS Policies、9 個函數授權
- **FR-013**: 系統必須提供完整的回滾計畫（封存舊 Migration、提供還原步驟）
- **FR-014**: 整合檔案必須採用 `YYYYMMDDHHMMSS_description.sql` 命名格式

### Key Entities

- **Migration 檔案**: 整合後的 SQL 檔案，每個檔案代表一個功能模組，包含表定義、索引、RLS、函數、註解
- **備份檔案**: 使用 `pg_dump` 產生的資料庫備份，含元數據檔案（備份原因、時間、大小）
- **健康檢查報告**: 驗證結果，包含錯誤數、警告數、具體問題清單
- **整合檔案對應表**: 記錄每個整合檔案包含哪些原始 Migration（用於追溯）

## Success Criteria

### Measurable Outcomes

- **SC-001**: Migration 檔案數量從 27 個減少至 8 個（減少 70%）
- **SC-002**: 新成員能在 10 分鐘內理解資料庫架構（透過閱讀整合後的 Migration）
- **SC-003**: 商品列表查詢效能提升 30-50%（使用複合索引後，從 500ms 降至 200ms 以下）
- **SC-004**: 待處理訂單查詢效能提升 50-70%（使用部分索引後，從 300ms 降至 100ms 以下）
- **SC-005**: 健康檢查腳本執行時間 < 30 秒，能檢測 200+ 個項目
- **SC-006**: 備份與還原流程總時間 < 2 分鐘（備份 30 秒 + 還原 90 秒）
- **SC-007**: 整合後的 Migration 通過健康檢查（0 錯誤，≤2 警告）
- **SC-008**: 所有手動測試通過（管理員登入、商品瀏覽、訂單建立、優惠券使用等 10 項功能）
- **SC-009**: 開發者找到特定功能 Migration 的時間 < 30 秒（透過清晰的檔名）
- **SC-010**: 整合工作完成時間 29-38 小時（分 6 天執行，每天 5-6 小時）

## Assumptions

- 開發環境使用本地 Docker Supabase，整合完成後再部署到雲端
- 使用者同意整合過程中清空本機資料庫（測試資料將透過種子資料恢復）
- PostgreSQL 版本支援所有使用的功能（Generated Columns, GIN 索引, JSONB）
- 開發者熟悉 PowerShell 腳本（自動化腳本使用 PowerShell）
- Git 分支策略採用 Feature Branch（整合工作在 `012-migration-consolidation` 分支進行）
- 現有 Migration 已充分測試且功能正常（整合僅重新組織，不修改邏輯）
- 備份保留策略為最近 10 次（可透過參數調整）
- 健康檢查腳本僅報告問題，不自動修復（避免意外修改）

## Out of Scope

- 雲端資料庫的直接整合（僅在本機完成整合與測試，部署到雲端使用標準流程）
- Migration 邏輯優化（僅重新組織，不修改現有邏輯）
- 新功能開發（僅整合現有功能）
- 自動化測試腳本（手動測試清單已提供）
- CI/CD 整合（健康檢查腳本可手動執行，未來可整合到 CI/CD）
- Windows Task Scheduler 排程（備份腳本可手動執行，未來可設定排程）
- Git Pre-commit Hook（建議在後續優化中實作）

## Dependencies

- Supabase CLI 工具（用於 `db reset`, `db push`）
- PostgreSQL 客戶端工具（`pg_dump`, `psql`）
- PowerShell 5.1+ 或 PowerShell Core 7+（執行自動化腳本）
- Git 版本控制（分支管理、封存舊 Migration）
- 現有種子資料檔案（`supabase/seed.sql` 及各 spec 的測試資料）
- 已完成的功能規格（001-011），確保理解現有功能

## Constraints

- 整合後的 Migration 必須與現有 Schema 100% 一致（通過健康檢查驗證）
- 不可在遠端/生產環境執行 `supabase db reset`（違反安全協議）
- 整合過程中會清空本機資料庫（使用者已同意）
- 備份檔案儲存於本機 `backups/` 目錄（不上傳到 Git）
- 健康檢查腳本依賴本機 Supabase 運行（需先執行 `supabase start`）
- 整合工作需分階段執行（前置準備、建立腳本、整合檔案、測試驗證、部署）
- 每個整合檔案完成後需立即驗證（避免累積錯誤）

## Notes

- 此功能為技術債務清理，提升程式碼可維護性與團隊效率
- 整合策略已經過詳細分析（Agent ab4079b, ae36a13, ae1d417）
- 完整實作計畫已撰寫於 `C:\Users\haral\.claude\plans\floofy-petting-clover.md`
- 關鍵風險已識別並提供緩解措施（詳見計畫檔案第六節）
- 預估工作時間 29-38 小時，建議分 6 天完成
- 整合後的 Migration 採用功能模組化架構，易於理解與維護
