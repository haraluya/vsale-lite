# Tasks: 專案健康檢查系統

**Feature Branch**: `017-health-check`
**Created**: 2026-01-14
**Status**: Ready for Implementation
**Related**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md)

---

## Summary

本任務清單將健康檢查系統的實作分解為 **10 個階段 (Phases)**，包含 **Setup、Foundational、7 個 User Stories (US1-US7)、報告產生與主執行腳本**。所有任務遵循清單格式，每個任務都可獨立完成並驗證。

**總任務數**: 95 個任務
**預估時間**: 11-19 天
**MVP 範圍**: Phase 0-2 (Setup + Foundational + US1-US2) - 提供基礎架構與 API 檢查功能

---

## Task Organization

### Phase Structure

- **Phase 0**: Setup (專案初始化、依賴安裝、目錄結構)
- **Phase 1**: Foundational (型別定義、工具函式、基礎設施)
- **Phase 2**: US1 - 架構健康度檢查 (P0)
- **Phase 3**: US2 - API 整合度與資料流檢查 (P0)
- **Phase 4**: US3 - 使用者體驗與操作流程檢查 (P1)
- **Phase 5**: US4 - 設計系統一致性檢查 (P1)
- **Phase 6**: US5 - 效能與速度檢查 (P1)
- **Phase 7**: US6 - 潛在 Bug 與邏輯錯誤檢查 (P0)
- **Phase 8**: US7 - 資料庫安全與 Migration 檢查 (P0)
- **Phase 9**: 報告產生與 GitHub Issues 匯出
- **Phase 10**: 主執行腳本與 CLI 介面
- **Phase 11**: Polish & Testing

### Dependency Graph

```
Phase 0 (Setup)
    ↓
Phase 1 (Foundational) ← 所有後續 Phase 依賴
    ↓
Phase 2-8 (User Stories) ← 可獨立並行執行
    ↓
Phase 9 (報告產生) ← 依賴所有 User Stories
    ↓
Phase 10 (主執行腳本) ← 依賴報告產生
    ↓
Phase 11 (Polish & Testing)
```

### Parallelization Opportunities

**Phase 2-8** 的 User Stories 可並行開發，因為每個 User Story 產生獨立的 JSON 報告：

```bash
# 範例：並行執行 US1-US3
tsx scripts/health-check/check-architecture.ts &
tsx scripts/health-check/check-api.ts &
tsx scripts/health-check/check-ux.ts &
wait
```

---

## Phase 0: Setup

**目標**: 安裝依賴、建立目錄結構、準備開發環境

### Tasks

- [X] T001 安裝專案依賴套件 (ts-morph, glob, @octokit/rest, @lhci/cli) 於 package.json
- [X] T002 建立健康檢查腳本目錄結構 scripts/health-check/
- [X] T003 建立工具函式目錄結構 scripts/health-check/utils/
- [X] T004 建立報告儲存目錄結構 specs/017-health-check/reports/
- [X] T005 [P] 建立檢查清單範本目錄 specs/017-health-check/checklists/
- [X] T006 [P] 新增 package.json scripts (health-check, health-check:architecture 等)
- [X] T007 建立 .gitignore 規則（排除報告時間戳目錄，保留 latest 符號連結）

**驗證步驟**:
- ✅ 依賴安裝成功 (`pnpm list ts-morph glob @octokit/rest @lhci/cli`)
- ✅ 目錄結構建立完成
- ✅ package.json scripts 正確設定

**完成標準**: 所有目錄與依賴已準備好，可進入 Phase 1

---

## Phase 1: Foundational

**目標**: 實作核心工具函式、型別定義、報告格式化工具

### Tasks

- [X] T008 [P] 建立 TypeScript 型別定義檔 scripts/health-check/types.ts（從 contracts/types.ts 複製並調整）
- [X] T009 [P] 實作 TypeScript AST 輔助函式 scripts/health-check/utils/ts-ast-helpers.ts (hasUseServer, hasCheckAuth, hasZodValidation)
- [X] T010 [P] 實作報告格式化工具 scripts/health-check/utils/report-formatter.ts (formatMarkdownTable, formatIssueList)
- [X] T011 [P] 實作 GitHub API 輔助函式 scripts/health-check/utils/github-api-helpers.ts (createIssue, ensureMilestone)
- [X] T012 [P] 實作檔案系統工具函式 scripts/health-check/utils/fs-helpers.ts (ensureDir, createSymlink)
- [ ] T013 撰寫工具函式單元測試 scripts/health-check/utils/__tests__/
- [X] T014 執行 TypeScript 型別檢查驗證型別定義正確

**驗證步驟**:
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ 工具函式單元測試通過 (`pnpm test scripts/health-check/utils`)
- ✅ 所有工具函式可正確匯入使用

**完成標準**: 所有工具函式實作完成並通過測試

---

## Phase 2: US1 - 架構健康度檢查 (Priority: P0)

**User Story**: 作為技術負責人，我需要對專案進行全面的架構健康度檢查，確保代碼組織、模組化設計、職責分離等符合最佳實踐。

**Independent Test**: 可以獨立檢查專案的目錄結構、模組依賴關係、Server Actions 設計模式、Supabase Client 使用規則等，不需要實際執行功能即可驗證架構合規性。

### Tasks

- [ ] T015 [US1] 實作路由結構檢查函式 checkRouteStructure() 於 scripts/health-check/check-architecture.ts
- [ ] T016 [US1] 實作 Middleware 權限檢查函式 checkMiddleware() 於 scripts/health-check/check-architecture.ts
- [ ] T017 [US1] 實作 Server Actions 模式檢查函式 checkServerActionsPattern() 於 scripts/health-check/check-architecture.ts
- [ ] T018 [US1] 實作 Supabase Client 使用檢查函式 checkSupabaseClientUsage() 於 scripts/health-check/check-architecture.ts
- [ ] T019 [US1] 實作模組依賴檢查函式 checkModuleDependencies() 於 scripts/health-check/check-architecture.ts (含循環依賴檢測)
- [ ] T020 [US1] 整合所有檢查函式為主函式 checkArchitecture() 於 scripts/health-check/check-architecture.ts
- [ ] T021 [US1] 實作架構檢查報告產生器 generateArchitectureReport() 於 scripts/health-check/check-architecture.ts
- [ ] T022 [US1] 產生架構檢查 JSON 報告檔案 architecture.json
- [ ] T023 [US1] 撰寫架構檢查整合測試 scripts/health-check/__tests__/check-architecture.test.ts
- [ ] T024 [US1] 執行架構檢查驗證所有檢查項目運作正常

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-architecture.ts`)
- ✅ 產生 `architecture.json` 報告
- ✅ 檢查結果包含所有 4 個子檢查項目
- ✅ 發現的問題包含檔案位置與建議

**完成標準**: US1 所有驗收場景通過，架構檢查報告正確產生

---

## Phase 3: US2 - API 整合度與資料流檢查 (Priority: P0)

**User Story**: 作為技術負責人，我需要檢查所有 Server Actions 的設計品質、錯誤處理、權限驗證、輸入驗證等，確保 API 層的健壯性和安全性。

**Independent Test**: 可以逐一檢查每個 Server Action 的實作，驗證是否包含 'use server'、checkAuth()、Zod 驗證、revalidatePath() 等必要步驟，確認回傳型別符合 ActionResult<T> 規範。

### Tasks

- [X] T025 [US2] 實作 Server Actions 品質檢查函式 checkServerActionsQuality() 於 scripts/health-check/check-api.ts
- [X] T026 [US2] 實作錯誤處理檢查函式 checkErrorHandling() 於 scripts/health-check/check-api.ts
- [X] T027 [US2] 實作權限驗證檢查函式 checkAuthorizationChecks() 於 scripts/health-check/check-api.ts
- [X] T028 [US2] 實作 RLS Policies 檢查函式 checkRLSPolicies() 於 scripts/health-check/check-api.ts
- [X] T029 [US2] 實作 Server Actions 統計函式 calculateServerActionsStats() 於 scripts/health-check/check-api.ts
- [X] T030 [US2] 整合所有檢查函式為主函式 checkAPI() 於 scripts/health-check/check-api.ts
- [ ] T031 [US2] 實作 API 檢查報告產生器 generateAPIReport() 於 scripts/health-check/check-api.ts
- [X] T032 [US2] 產生 API 檢查 JSON 報告檔案 api.json
- [ ] T033 [US2] 撰寫 API 檢查整合測試 scripts/health-check/__tests__/check-api.test.ts
- [X] T034 [US2] 執行 API 檢查驗證所有檢查項目運作正常

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-api.ts`)
- ✅ 產生 `api.json` 報告
- ✅ `serverActionsStats` 統計正確
- ✅ RLS Policies 檢查結果正確

**完成標準**: US2 所有驗收場景通過，API 檢查報告正確產生

---

## Phase 4: US3 - 使用者體驗與操作流程檢查 (Priority: P1)

**User Story**: 作為產品負責人，我需要檢查前台（客戶端）和後台（管理端）的操作流程是否順暢、是否符合使用者習慣、是否有不合理的操作步驟，以提升使用者滿意度。

**Independent Test**: 可以逐一走訪前台和後台的核心操作流程（登入、瀏覽商品、加入購物車、下單、訂單管理等），記錄每個流程的步驟數、等待時間、錯誤提示清晰度等。

### Tasks

- [ ] T035 [US3] 建立前台操作流程測試清單範本 specs/017-health-check/checklists/client-ux-checklist.md
- [ ] T036 [US3] 建立後台操作流程測試清單範本 specs/017-health-check/checklists/admin-ux-checklist.md
- [X] T037 [US3] 實作 UX 檢查腳本 checkUX() 於 scripts/health-check/check-ux.ts（產生手動測試清單）
- [X] T038 [US3] 實作前台核心流程清單產生器 generateClientFlowChecklist() 於 scripts/health-check/check-ux.ts
- [X] T039 [US3] 實作後台核心流程清單產生器 generateAdminFlowChecklist() 於 scripts/health-check/check-ux.ts
- [ ] T040 [US3] 實作 UX 檢查報告產生器 generateUXReport() 於 scripts/health-check/check-ux.ts
- [X] T041 [US3] 產生 UX 檢查 JSON 報告檔案 ux.json
- [ ] T042 [US3] 撰寫 UX 檢查整合測試 scripts/health-check/__tests__/check-ux.test.ts
- [X] T043 [US3] 執行 UX 檢查驗證手動測試清單格式正確

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-ux.ts`)
- ✅ 產生 `ux.json` 報告
- ✅ 手動測試清單格式正確 (Markdown Tasklist + Given-When-Then)
- ✅ 涵蓋所有核心操作流程（前台 5 個、後台 5 個）

**完成標準**: US3 所有驗收場景通過，UX 檢查報告正確產生

---

## Phase 5: US4 - 設計系統一致性檢查 (Priority: P1)

**User Story**: 作為設計負責人，我需要檢查所有 UI 元件是否遵循 Neo-Brutalism 設計風格、響應式設計規範、設計 Token 系統是否正確使用，確保視覺一致性和品牌識別。

**Independent Test**: 可以逐一檢查所有 UI 元件（按鈕、卡片、表單、對話框等），驗證是否使用正確的邊框寬度、陰影效果、點擊狀態、響應式斷點等。

### Tasks

- [X] T044 [US4] 實作 Neo-Brutalism 風格檢查函式 checkNeoBrutalismStyle() 於 scripts/health-check/check-design.ts
- [X] T045 [US4] 實作響應式設計檢查函式 checkResponsiveDesign() 於 scripts/health-check/check-design.ts
- [X] T046 [US4] 實作設計 Token 使用檢查函式 checkDesignTokenUsage() 於 scripts/health-check/check-design.ts
- [X] T047 [US4] 實作對話框系統檢查函式 checkDialogSystemUsage() 於 scripts/health-check/check-design.ts
- [ ] T048 [US4] 實作無障礙支援檢查函式 checkAccessibility() 於 scripts/health-check/check-design.ts
- [X] T049 [US4] 整合所有檢查函式為主函式 checkDesign() 於 scripts/health-check/check-design.ts
- [ ] T050 [US4] 實作設計檢查報告產生器 generateDesignReport() 於 scripts/health-check/check-design.ts
- [X] T051 [US4] 產生設計檢查 JSON 報告檔案 design.json
- [ ] T052 [US4] 撰寫設計檢查整合測試 scripts/health-check/__tests__/check-design.test.ts
- [X] T053 [US4] 執行設計檢查驗證所有檢查項目運作正常

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-design.ts`)
- ✅ 產生 `design.json` 報告
- ✅ 檢測到的樣式問題包含檔案位置與建議
- ✅ 統計符合設計規範的元件百分比

**完成標準**: US4 所有驗收場景通過，設計檢查報告正確產生

---

## Phase 6: US5 - 效能與速度檢查 (Priority: P1)

**User Story**: 作為技術負責人，我需要檢查專案的載入速度、資料庫查詢效能、圖片優化、快取策略等，確保符合效能目標（頁面首次載入 < 2s，資料庫查詢 < 100ms p95）。

**Independent Test**: 可以使用 Chrome DevTools、Lighthouse、Vercel Analytics 等工具測量頁面載入時間、資料庫查詢時間、圖片載入時間等，並與效能目標比較。

### Tasks

- [ ] T054 [US5] 建立 Lighthouse CI 設定檔 lighthouserc.js
- [ ] T055 [US5] 實作效能檢查腳本 checkPerformance() 於 scripts/health-check/check-performance.ts
- [ ] T056 [US5] 實作 Lighthouse 報告整合函式 integrateLighthouseReport() 於 scripts/health-check/check-performance.ts
- [ ] T057 [US5] 實作 Web Vitals 測量函式 measureWebVitals() 於 scripts/health-check/check-performance.ts
- [ ] T058 [US5] 實作資料庫查詢效能測量函式 measureDatabaseQueries() 於 scripts/health-check/check-performance.ts
- [ ] T059 [US5] 實作圖片優化檢查函式 checkImageOptimization() 於 scripts/health-check/check-performance.ts
- [ ] T060 [US5] 實作效能預算檢查函式 checkPerformanceBudgets() 於 scripts/health-check/check-performance.ts
- [ ] T061 [US5] 實作效能檢查報告產生器 generatePerformanceReport() 於 scripts/health-check/check-performance.ts
- [ ] T062 [US5] 產生效能檢查 JSON 報告檔案 performance.json
- [ ] T063 [US5] 撰寫效能檢查整合測試 scripts/health-check/__tests__/check-performance.test.ts
- [ ] T064 [US5] 執行 Lighthouse CI 驗證效能測試運作正常

**驗證步驟**:
- ✅ Lighthouse CI 執行成功
- ✅ 產生 `performance.json` 報告
- ✅ 效能指標符合目標 (頁面載入 < 2s、查詢 < 100ms)
- ✅ 慢查詢包含修復建議

**完成標準**: US5 所有驗收場景通過，效能檢查報告正確產生

---

## Phase 7: US6 - 潛在 Bug 與邏輯錯誤檢查 (Priority: P0)

**User Story**: 作為 QA 負責人，我需要系統性地檢查專案可能存在的 Bug、邏輯錯誤、邊界條件處理不當等問題，並提供修復建議。

**Independent Test**: 可以設計各種邊界條件測試案例（空值、負數、超大數值、特殊字元等），逐一驗證系統行為是否符合預期。

### Tasks

- [ ] T065 [US6] 建立邊界條件測試案例範本 specs/017-health-check/checklists/edge-cases-checklist.md
- [ ] T066 [US6] 實作 Bug 檢查腳本 checkBugs() 於 scripts/health-check/check-bugs.ts
- [ ] T067 [US6] 實作邊界條件測試案例產生器 generateEdgeCaseTests() 於 scripts/health-check/check-bugs.ts
- [ ] T068 [US6] 實作資料一致性測試案例產生器 generateDataConsistencyTests() 於 scripts/health-check/check-bugs.ts
- [ ] T069 [US6] 實作並發操作測試案例產生器 generateConcurrencyTests() 於 scripts/health-check/check-bugs.ts
- [ ] T070 [US6] 實作錯誤恢復測試案例產生器 generateErrorRecoveryTests() 於 scripts/health-check/check-bugs.ts
- [ ] T071 [US6] 實作 Bug 檢查報告產生器 generateBugsReport() 於 scripts/health-check/check-bugs.ts
- [ ] T072 [US6] 產生 Bug 檢查 JSON 報告檔案 bugs.json
- [ ] T073 [US6] 撰寫 Bug 檢查整合測試 scripts/health-check/__tests__/check-bugs.test.ts
- [ ] T074 [US6] 執行 Bug 檢查驗證測試案例格式正確

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-bugs.ts`)
- ✅ 產生 `bugs.json` 報告
- ✅ 測試案例涵蓋所有關鍵邏輯
- ✅ 測試案例格式正確 (Given-When-Then)

**完成標準**: US6 所有驗收場景通過，Bug 檢查報告正確產生

---

## Phase 8: US7 - 資料庫安全與 Migration 檢查 (Priority: P0)

**User Story**: 作為技術負責人，我需要檢查專案的資料庫安全設定、Migration 品質、備份策略等，確保生產環境資料安全無虞。

**Independent Test**: 可以檢查 RLS policies、Migration 檔案品質、備份系統設定、資料庫索引等，不需要實際執行操作即可驗證安全性。

### Tasks

- [ ] T075 [US7] 實作 RLS Policies 完整性檢查函式 checkRLSCoverage() 於 scripts/health-check/check-security.ts
- [ ] T076 [US7] 實作 Migration 品質檢查函式 checkMigrationQuality() 於 scripts/health-check/check-security.ts
- [ ] T077 [US7] 實作備份系統檢查函式 checkBackupSystem() 於 scripts/health-check/check-security.ts
- [ ] T078 [US7] 實作索引檢查函式 checkDatabaseIndexes() 於 scripts/health-check/check-security.ts
- [ ] T079 [US7] 實作安全性統計函式 calculateSecurityStats() 於 scripts/health-check/check-security.ts
- [ ] T080 [US7] 整合所有檢查函式為主函式 checkSecurity() 於 scripts/health-check/check-security.ts
- [ ] T081 [US7] 實作安全檢查報告產生器 generateSecurityReport() 於 scripts/health-check/check-security.ts
- [ ] T082 [US7] 產生安全檢查 JSON 報告檔案 security.json
- [ ] T083 [US7] 撰寫安全檢查整合測試 scripts/health-check/__tests__/check-security.test.ts
- [ ] T084 [US7] 執行安全檢查驗證所有檢查項目運作正常

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-security.ts`)
- ✅ 產生 `security.json` 報告
- ✅ RLS 覆蓋率統計正確
- ✅ Migration 品質檢查結果正確
- ✅ 備份系統狀態檢查正確

**完成標準**: US7 所有驗收場景通過，安全檢查報告正確產生

---

## Phase 9: 報告產生與 GitHub Issues 匯出

**目標**: 產生綜合健康檢查報告 (Markdown + JSON)，計算整體健康度評分，支援匯出問題為 GitHub Issues

### Tasks

- [ ] T085 [P] 實作報告產生器 generateReport() 於 scripts/health-check/generate-report.ts
- [ ] T086 [P] 實作整體健康度評分計算函式 calculateOverallScore() 於 scripts/health-check/generate-report.ts
- [ ] T087 [P] 實作問題分類函式 categorizeIssues() 於 scripts/health-check/generate-report.ts
- [ ] T088 [P] 實作 Markdown 報告產生器 generateMarkdownReport() 於 scripts/health-check/generate-report.ts
- [ ] T089 [P] 實作 JSON 報告產生器 generateJSONReport() 於 scripts/health-check/generate-report.ts
- [ ] T090 [P] 實作問題清單檔案產生器 generateIssueFiles() 於 scripts/health-check/generate-report.ts (critical.md, high.md, medium.md, low.md)
- [ ] T091 [P] 實作 GitHub Issues 匯出器 exportToGitHubIssues() 於 scripts/health-check/export-to-github-issues.ts
- [ ] T092 [P] 撰寫報告產生器整合測試 scripts/health-check/__tests__/generate-report.test.ts
- [ ] T093 執行報告產生驗證所有報告格式正確

**驗證步驟**:
- ✅ 報告產生成功 (`summary.md` + `summary.json`)
- ✅ 整體評分計算正確
- ✅ Markdown 報告格式正確 (表格、清單、超連結)
- ✅ JSON 報告結構符合型別定義
- ✅ GitHub Issues 匯出成功 (含 Milestone 與 Labels)

**完成標準**: 報告產生器可正確產生 Markdown + JSON 雙格式報告

---

## Phase 10: 主執行腳本與 CLI 介面

**目標**: 並行執行所有領域檢查，收集結果並產生綜合報告，支援 CLI 參數與選項

### Tasks

- [ ] T094 實作主執行腳本 runHealthCheck() 於 scripts/health-check/run-health-check.ts
- [ ] T095 實作 CLI 參數解析函式 parseArgs() 於 scripts/health-check/run-health-check.ts
- [ ] T096 實作並行執行邏輯 runChecksInParallel() 於 scripts/health-check/run-health-check.ts
- [ ] T097 實作錯誤處理邏輯 handleCheckErrors() 於 scripts/health-check/run-health-check.ts
- [ ] T098 實作報告儲存邏輯 saveReports() 於 scripts/health-check/run-health-check.ts
- [ ] T099 實作符號連結更新邏輯 updateLatestSymlink() 於 scripts/health-check/run-health-check.ts
- [ ] T100 實作執行時間統計函式 trackExecutionTime() 於 scripts/health-check/run-health-check.ts
- [ ] T101 撰寫主執行腳本整合測試 scripts/health-check/__tests__/run-health-check.test.ts
- [ ] T102 執行主執行腳本驗證所有功能運作正常

**驗證步驟**:
- ✅ 腳本執行成功 (`tsx scripts/health-check/run-health-check.ts`)
- ✅ 並行執行邏輯正確 (7 個領域同時執行)
- ✅ 錯誤處理正確 (單一領域失敗不影響其他)
- ✅ CLI 參數正確解析 (`--domains`、`--verbose` 等)
- ✅ 報告儲存成功 (時間戳目錄 + 符號連結)

**完成標準**: 主執行腳本可正確並行執行所有檢查並產生報告

---

## Phase 11: Polish & Testing

**目標**: 撰寫完整測試、文件、CI/CD 整合，確保系統穩定性與可維護性

### Tasks

- [ ] T103 [P] 撰寫工具函式單元測試 scripts/health-check/utils/__tests__/*.test.ts
- [ ] T104 [P] 撰寫各領域檢查整合測試 scripts/health-check/__tests__/check-*.test.ts
- [ ] T105 [P] 撰寫報告產生器整合測試 scripts/health-check/__tests__/generate-report.test.ts
- [ ] T106 [P] 撰寫主執行腳本整合測試 scripts/health-check/__tests__/run-health-check.test.ts
- [ ] T107 建立 GitHub Actions 工作流程 .github/workflows/health-check.yml
- [ ] T108 設定 GitHub Actions 觸發條件（PR to master、每週定時執行）
- [ ] T109 設定 GitHub Actions 報告上傳（Artifact）
- [ ] T110 設定 GitHub Actions 自動在 PR 留言報告摘要
- [ ] T111 設定 GitHub Actions 評分閾值檢查（< 80 分失敗 CI）
- [ ] T112 更新 package.json scripts（health-check、health-check:ci 等）
- [ ] T113 更新專案 CLAUDE.md 文件（新增健康檢查系統說明）
- [ ] T114 更新 README.md 文件（新增健康檢查指令說明）
- [ ] T115 執行完整健康檢查驗證所有功能正常運作
- [ ] T116 執行 TypeScript 型別檢查驗證無錯誤
- [ ] T117 執行 ESLint 檢查驗證無錯誤
- [ ] T118 執行所有單元測試與整合測試驗證通過率 100%

**驗證步驟**:
- ✅ 所有單元測試通過 (`pnpm test scripts/health-check`)
- ✅ 整合測試通過 (`pnpm health-check`)
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ ESLint 檢查通過 (`pnpm lint`)
- ✅ GitHub Actions 工作流程執行成功
- ✅ 文件完整且易於理解

**完成標準**: 所有測試通過，CI/CD 整合完成，文件完整

---

## Testing Strategy

### Unit Tests (單元測試)

**測試範圍**:
- 工具函式測試 (ts-ast-helpers, report-formatter, github-api-helpers)
- Zod Schema 測試 (驗證型別定義)
- 報告格式化測試 (驗證 Markdown 表格、清單、程式碼區塊格式)

**測試框架**: Vitest + @vitest/ui

**執行指令**:
```bash
pnpm test scripts/health-check/utils
```

### Integration Tests (整合測試)

**測試範圍**:
- 完整健康檢查測試 (執行 run-health-check.ts 並驗證報告格式)
- 部分領域檢查測試 (執行 --domains architecture,api 並驗證結果)
- GitHub Issues 匯出測試 (使用測試 Repository 驗證 API 呼叫)

**執行指令**:
```bash
pnpm test scripts/health-check
```

### End-to-End Tests (端對端測試)

**測試範圍**:
- 執行完整健康檢查並檢查報告內容
- 執行 GitHub Issues 匯出並驗證 Issue 格式
- 驗證 CI/CD 整合 (GitHub Actions)

**執行方式**: 手動執行 (不使用自動化測試框架)

---

## Deployment Strategy

### Git Commit Strategy

- **Phase 0**: `chore: 建立健康檢查系統基礎設施 (依賴、目錄、型別)`
- **Phase 1**: `chore: 實作健康檢查核心工具函式與型別定義`
- **Phase 2**: `feat: 實作架構健康度檢查腳本 (US1)`
- **Phase 3**: `feat: 實作 API 整合度檢查腳本 (US2)`
- **Phase 4**: `feat: 實作使用者體驗檢查腳本 (US3)`
- **Phase 5**: `feat: 實作設計系統一致性檢查腳本 (US4)`
- **Phase 6**: `feat: 實作效能檢查腳本 (US5)`
- **Phase 7**: `feat: 實作 Bug 檢查腳本 (US6)`
- **Phase 8**: `feat: 實作資料庫安全檢查腳本 (US7)`
- **Phase 9**: `feat: 實作健康檢查報告產生器與 GitHub Issues 匯出`
- **Phase 10**: `feat: 實作主執行腳本與 CLI 介面`
- **Phase 11**: `test: 新增健康檢查系統完整測試與 CI/CD 整合`

### 合併到 master 的條件

- ✅ 所有 Phase 完成 (Phase 0-11)
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ ESLint 檢查通過 (`pnpm lint`)
- ✅ 所有單元測試通過 (`pnpm test`)
- ✅ 完整健康檢查執行成功 (`pnpm health-check`)
- ✅ 產生的報告格式正確 (Markdown + JSON)
- ✅ GitHub Actions 工作流程執行成功
- ✅ 整體健康度評分 >= 80 分

---

## Implementation Notes

### Parallel Execution

所有領域檢查 (Phase 2-8) 可並行開發：

```bash
# 範例：並行執行所有領域檢查
pnpm run health-check:architecture &
pnpm run health-check:api &
pnpm run health-check:ux &
pnpm run health-check:design &
pnpm run health-check:performance &
pnpm run health-check:bugs &
pnpm run health-check:security &
wait
```

### Dependencies Between Phases

- **Phase 0 → Phase 1**: Setup 必須先完成才能實作工具函式
- **Phase 1 → Phase 2-8**: 工具函式必須先完成才能實作各領域檢查
- **Phase 2-8 → Phase 9**: 所有領域檢查完成後才能產生綜合報告
- **Phase 9 → Phase 10**: 報告產生器完成後才能實作主執行腳本
- **Phase 10 → Phase 11**: 主執行腳本完成後才能整合測試與 CI/CD

### MVP Scope

**最小可行產品 (MVP)** 包含：
- Phase 0: Setup
- Phase 1: Foundational
- Phase 2: US1 - 架構健康度檢查
- Phase 3: US2 - API 整合度檢查

**MVP 可交付價值**:
- 自動檢查 Server Actions 模式與架構合規性
- 產生基本健康檢查報告（JSON 格式）
- 驗證核心工具函式與型別定義

---

## Progress Tracking

### Task Completion Summary

| Phase | 任務數 | 完成數 | 進度 | 狀態 |
|-------|-------|-------|------|------|
| Phase 0: Setup | 7 | 0 | 0% | ⬜ 待開始 |
| Phase 1: Foundational | 7 | 0 | 0% | ⬜ 待開始 |
| Phase 2: US1 - 架構檢查 | 10 | 0 | 0% | ⬜ 待開始 |
| Phase 3: US2 - API 檢查 | 10 | 0 | 0% | ⬜ 待開始 |
| Phase 4: US3 - UX 檢查 | 9 | 0 | 0% | ⬜ 待開始 |
| Phase 5: US4 - 設計檢查 | 10 | 0 | 0% | ⬜ 待開始 |
| Phase 6: US5 - 效能檢查 | 11 | 0 | 0% | ⬜ 待開始 |
| Phase 7: US6 - Bug 檢查 | 10 | 0 | 0% | ⬜ 待開始 |
| Phase 8: US7 - 安全檢查 | 10 | 0 | 0% | ⬜ 待開始 |
| Phase 9: 報告產生 | 9 | 0 | 0% | ⬜ 待開始 |
| Phase 10: 主執行腳本 | 9 | 0 | 0% | ⬜ 待開始 |
| Phase 11: Polish & Testing | 16 | 0 | 0% | ⬜ 待開始 |
| **總計** | **118** | **0** | **0%** | |

### Milestone Timeline

| Milestone | 預計完成日期 | 實際完成日期 | 狀態 |
|-----------|------------|------------|------|
| Phase 0-1 完成 (Setup + Foundational) | - | - | ⬜ 待開始 |
| Phase 2-3 完成 (US1-US2 - MVP) | - | - | ⬜ 待開始 |
| Phase 4-8 完成 (US3-US7) | - | - | ⬜ 待開始 |
| Phase 9-10 完成 (報告產生 + 主執行腳本) | - | - | ⬜ 待開始 |
| Phase 11 完成 (Polish & Testing) | - | - | ⬜ 待開始 |
| 合併到 master | - | - | ⬜ 待開始 |

---

## Success Criteria

### 量化指標

- ✅ 7 個 User Story 全部通過驗收測試
- ✅ 單一檢查腳本執行時間 < 10 秒
- ✅ 完整健康檢查時間 < 10 分鐘
- ✅ 報告產生時間 < 1 分鐘
- ✅ TypeScript 型別檢查 0 errors
- ✅ ESLint 檢查 0 errors
- ✅ 報告檔案大小 < 1 MB
- ✅ 整體健康度評分 >= 85 分 (目標)

### 質化指標

- ✅ 報告內容完整且易於理解
- ✅ 問題清單包含檔案位置與修復建議
- ✅ GitHub Issues 匯出格式正確
- ✅ CI/CD 整合順暢無錯誤
- ✅ 文件完整且易於上手 (quickstart.md)
- ✅ 開發者反饋：健康檢查工具實用且準確

---

## References

- [功能規格文件](./spec.md) - 完整的功能需求與驗收標準
- [實作計畫](./plan.md) - 技術選型與實作策略
- [資料模型](./data-model.md) - 報告資料結構定義
- [技術研究報告](./research.md) - 工具選型與技術決策
- [快速上手指南](./quickstart.md) - 使用說明與常見問題
- [TypeScript 型別定義](./contracts/types.ts) - 型別系統
- [檢查腳本 API 合約](./contracts/check-scripts.md) - 腳本介面規範

---

**任務清單產生時間**: 2026-01-14
**總任務數**: 118
**預估完成時間**: 11-19 天
**下一步**: 開始 Phase 0 實作 (安裝依賴、建立目錄結構)
