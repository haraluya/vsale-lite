# Tasks: 專案可移植性修復

**Feature Branch**: `019-portability-fixes`
**Created**: 2026-01-23
**Status**: Ready for Implementation
**Related**: [spec.md](./spec.md) | [plan.md](./plan.md) | [research.md](./research.md) | [quickstart.md](./quickstart.md)

---

## Summary

本任務清單將專案可移植性修復功能分解為 **8 個階段 (Phases)**,包含 **Setup、Foundational、5 個 User Stories (US1-US5)、種子資料優化與最終驗證**。所有任務遵循清單格式,每個任務都可獨立完成並驗證。

**總任務數**: 112 個任務
**預估時間**: 11.5 小時（約 1.5 個工作日）
**MVP 範圍**: Phase 0-3 (Setup + Foundational + US1-US2) - 提供環境範本、移除硬編碼、環境檢查工具

**修正記錄**:
- ✅ H2 修正：明確列出常見問題清單標題（T075, T086-T090）
- ✅ M3 修正：新增 `.env` 檔案 Git 歷史檢查（T092A）
- ✅ M4 修正：標記 T082 為可並行任務 `[P]`

---

## Task Organization

### Phase Structure

- **Phase 0**: Setup（專案準備、驗證先決條件）
- **Phase 1**: Foundational（環境變數範本系統、安全保護）
- **Phase 2**: US1 - 移除硬編碼專案識別符 (FR2, P0)
- **Phase 3**: US2 - 自動化環境檢查工具 (FR3, P0)
- **Phase 4**: US3 - 資料庫初始化自動化 (FR4, P0)
- **Phase 5**: US4 - 部署驗證工具 (FR5, P1)
- **Phase 6**: US5 - 新用戶部署指南 (FR6, FR7, FR9, P0)
- **Phase 7**: US6 - 種子資料優化與敏感信息保護 (FR8, FR10, P0/P1)
- **Phase 8**: Polish & Verification（最終驗證與文檔）

### Dependency Graph

```
Phase 0 (Setup)
    ↓
Phase 1 (Foundational) ← 環境變數範本是所有後續 Phase 的基礎
    ↓
Phase 2 (US1 - 移除硬編碼) ← 依賴 Phase 1 的環境變數範本
    ↓
Phase 3-5 (US2-US4) ← 可部分並行執行（US3-US4 可並行）
    ↓
Phase 6 (US5 - 文檔) ← 依賴 Phase 3-5 的工具腳本
    ↓
Phase 7 (US6 - 種子資料) ← 可獨立執行
    ↓
Phase 8 (Polish & Verification)
```

### Parallelization Opportunities

**Phase 3-5** 的工具腳本可部分並行開發：
- US3（資料庫初始化）和 US4（部署驗證）可並行開發
- US2（環境檢查）需要先完成，因為其他工具需要引用它

**Phase 1** 的任務可並行執行：
```bash
# 範例：並行建立範本和強化 .gitignore
創建環境變數範本 &
強化 .gitignore 規則 &
wait
```

---

## Phase 0: Setup

**目標**: 驗證先決條件、確保在正確分支、準備開發環境

### Tasks

- [X] T001 確認當前在 019-portability-fixes 分支
- [X] T002 [P] 備份現有 .env.local 為 .env.local.backup（如存在）
- [X] T003 [P] 檢查專案依賴是否安裝完整（pnpm install）
- [X] T004 [P] 執行型別檢查確保起點無錯誤（pnpm type-check）
- [X] T005 確認 Git 狀態乾淨或僅包含預期的未追蹤檔案

**驗證步驟**:
- ✅ 執行 `git branch --show-current` 顯示 `019-portability-fixes`
- ✅ 依賴安裝成功（`pnpm list` 無錯誤）
- ✅ TypeScript 檢查通過（`pnpm type-check`）
- ✅ Git 狀態符合預期

**完成標準**: 所有先決條件已滿足,可進入 Phase 1

---

## Phase 1: Foundational

**目標**: 建立環境變數範本系統、強化敏感信息保護

### Tasks

- [X] T006 建立 .env.local.example 檔案於專案根目錄
- [X] T007 新增 3 個必要環境變數說明於 .env.local.example（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY）
- [X] T008 [P] 新增 8 個可選環境變數說明於 .env.local.example（DB 直連 4 個、GCS 備份 2 個、站點二 2 個）
- [X] T009 為每個環境變數新增繁體中文註解說明取得方式於 .env.local.example
- [X] T010 [P] 檢查 .gitignore 是否包含 .env*.local 規則
- [X] T011 [P] 檢查 .gitignore 是否包含 .env.vercel 規則
- [X] T012 [P] 新增 service-account-key.json 相關規則於 .gitignore（如缺失）
- [X] T013 執行 git status --ignored 驗證敏感檔案被排除

**驗證步驟**:
- ✅ `.env.local.example` 存在且包含所有 11 個變數
- ✅ 每個變數都有繁體中文註解
- ✅ `.gitignore` 包含所有敏感檔案規則
- ✅ `.env.local` 不在 Git 追蹤中

**完成標準**: 環境變數範本完整,敏感信息保護機制健全

---

## Phase 2: US1 - 移除硬編碼專案識別符 (Priority: P0)

**User Story**: 作為開發者,我需要確保專案不包含任何硬編碼的 Supabase 專案 ID,以便專案可以在任何 Supabase 環境中運行。

**Independent Test**: 可以執行 `git grep "qwovavytryvgchcowjof"` 驗證程式碼中無硬編碼專案 ID（文檔除外）,並測試 API 端點是否正確動態提取專案 ID。

### Tasks

- [ ] T014 [US1] 移除 vercel.json 的 env 區塊（第 7-10 行）於 vercel.json
- [ ] T015 [US1] 保留 vercel.json 的其他配置（buildCommand, framework, regions, crons）於 vercel.json
- [ ] T016 [US1] 重構站點偵測邏輯為動態提取 projectRef 於 app/api/env-test/route.ts
- [ ] T017 [US1] 移除硬編碼的 isMainSite 和 isSite2 檢查於 app/api/env-test/route.ts
- [ ] T018 [US1] 新增 hasMainSiteConfig 和 hasSite2Config 檢查於 app/api/env-test/route.ts
- [ ] T019 [US1] 移除硬編碼專案 ID 檢查於 app/api/check-connection/route.ts
- [ ] T020 [US1] 改為通用的專案 ID 提取邏輯於 app/api/check-connection/route.ts
- [ ] T021 [US1] 修改 import-data.ps1 使用環境變數 DB_PASSWORD_SITE2 而非硬編碼密碼於 import-data.ps1
- [ ] T022 [US1] 新增環境變數檢查與錯誤提示於 import-data.ps1
- [ ] T023 [US1] 移除硬編碼專案 ID 改為動態提取於 restore-backup.js
- [ ] T024 [US1] 執行本機測試驗證 API 端點顯示動態 projectRef
- [ ] T025 [US1] 執行 git grep "qwovavytryvgchcowjof" 驗證僅在文檔中出現
- [ ] T026 [US1] 執行 git grep "Devape-BM69" 驗證無硬編碼密碼
- [ ] T027 [US1] 執行 git grep "4Og37Vy1GzQJFq6K" 驗證無硬編碼資料庫密碼

**驗證步驟**:
- ✅ `vercel.json` 無 `env` 區塊,保留其他配置
- ✅ 訪問 `http://localhost:3000/api/env-test` 顯示 `projectRef` 而非硬編碼檢查
- ✅ `git grep "qwovavytryvgchcowjof" -- '*.ts' '*.js'` 無結果
- ✅ `git grep "Devape-BM69"` 無結果
- ✅ 本機建置成功（`pnpm build`）

**完成標準**: US1 所有驗收標準通過,專案無硬編碼專案 ID

---

## Phase 3: US2 - 自動化環境檢查工具 (Priority: P0)

**User Story**: 作為開發者,我需要快速驗證環境變數是否正確設定,以便避免因配置錯誤導致應用啟動失敗。

**Independent Test**: 可以刪除 `.env.local` 並執行 `pnpm check-env`,驗證工具是否正確提示缺少變數；建立不完整配置並驗證是否列出缺少的變數；建立完整配置並驗證是否顯示成功。

### Tasks

- [ ] T028 [US2] 建立環境檢查腳本檔案於 scripts/check-environment.js
- [ ] T029 [US2] 實作環境變數載入邏輯使用 dotenv 於 scripts/check-environment.js
- [ ] T030 [US2] 定義必要環境變數清單（3 個）於 scripts/check-environment.js
- [ ] T031 [US2] 定義可選環境變數清單（8 個）於 scripts/check-environment.js
- [ ] T032 [US2] 實作必要變數存在性檢查於 scripts/check-environment.js
- [ ] T033 [US2] 實作 Supabase URL 格式驗證（Regex）於 scripts/check-environment.js
- [ ] T034 [US2] 實作繁體中文成功/失敗訊息於 scripts/check-environment.js
- [ ] T035 [US2] 實作可選變數提示資訊於 scripts/check-environment.js
- [ ] T036 [US2] 新增 check-env 指令於 package.json
- [ ] T037 [US2] 測試缺少 .env.local 時顯示錯誤
- [ ] T038 [US2] 測試不完整配置時列出缺少變數
- [ ] T039 [US2] 測試完整配置時顯示成功訊息

**驗證步驟**:
- ✅ `scripts/check-environment.js` 檔案存在
- ✅ `pnpm check-env` 可執行
- ✅ 缺少必要變數時顯示 ❌ 並列出變數名稱
- ✅ URL 格式錯誤時顯示警告
- ✅ 所有檢查通過時顯示 ✅
- ✅ 輸出使用繁體中文

**完成標準**: US2 所有驗收場景通過,環境檢查工具正確運作

---

## Phase 4: US3 - 資料庫初始化自動化 (Priority: P0)

**User Story**: 作為開發者,我需要初始化資料庫並建立管理員帳號,以便開始使用系統。

**Independent Test**: 可以執行 `pnpm init-db`,輸入管理員資訊,驗證帳號是否建立成功並可登入後台；重複執行驗證是否跳過建立。

### Tasks

- [ ] T040 [P] [US3] 建立資料庫初始化腳本檔案於 scripts/init-database.js
- [ ] T041 [P] [US3] 實作 readline 互動式輸入邏輯於 scripts/init-database.js
- [ ] T042 [US3] 實作提示輸入管理員 Email 於 scripts/init-database.js
- [ ] T043 [US3] 實作提示輸入密碼（最少 8 字元驗證）於 scripts/init-database.js
- [ ] T044 [US3] 實作提示輸入顯示名稱（可選,預設「系統管理員」）於 scripts/init-database.js
- [ ] T045 [US3] 實作使用 Supabase Admin API 建立使用者於 scripts/init-database.js
- [ ] T046 [US3] 實作插入管理員到 profiles 表（role = 'admin'）於 scripts/init-database.js
- [ ] T047 [US3] 實作顯示登入資訊於 scripts/init-database.js
- [ ] T048 [US3] 實作重複執行檢查（避免建立重複帳號）於 scripts/init-database.js
- [ ] T049 [US3] 新增 init-db 指令於 package.json
- [ ] T050 [US3] 執行 pnpm init-db 並輸入管理員資訊
- [ ] T051 [US3] 驗證可使用建立的帳號登入後台
- [ ] T052 [US3] 重複執行驗證不會建立重複帳號

**驗證步驟**:
- ✅ `scripts/init-database.js` 檔案存在
- ✅ `pnpm init-db` 可執行
- ✅ 提示輸入 Email、密碼、名稱
- ✅ 成功建立管理員帳號
- ✅ 可使用建立的帳號登入後台
- ✅ 重複執行不會建立重複帳號
- ✅ 輸出使用繁體中文

**完成標準**: US3 所有驗收場景通過,資料庫初始化工具正確運作

---

## Phase 5: US4 - 部署驗證工具 (Priority: P1)

**User Story**: 作為開發者,我需要驗證線上環境是否正確配置,以便確認部署成功且功能正常。

**Independent Test**: 可以執行 `pnpm verify-deploy https://test-url.vercel.app`,驗證工具是否測試所有端點並提供通過/失敗報告。

### Tasks

- [ ] T053 [P] [US4] 建立部署驗證腳本檔案於 scripts/verify-deployment.js
- [ ] T054 [P] [US4] 實作接受部署 URL 參數邏輯於 scripts/verify-deployment.js
- [ ] T055 [P] [US4] 實作 HTTP 請求函式使用 Node.js https 模組於 scripts/verify-deployment.js
- [ ] T056 [US4] 實作測試前台登入頁面（/login）於 scripts/verify-deployment.js
- [ ] T057 [US4] 實作測試後台登入頁面（/admin/login）於 scripts/verify-deployment.js
- [ ] T058 [US4] 實作測試環境變數 API（/api/env-test）於 scripts/verify-deployment.js
- [ ] T059 [US4] 實作測試資料庫連線 API（/api/check-connection）於 scripts/verify-deployment.js
- [ ] T060 [US4] 實作驗證回應狀態碼和內容於 scripts/verify-deployment.js
- [ ] T061 [US4] 實作顯示測試總結（通過/失敗數量）於 scripts/verify-deployment.js
- [ ] T062 [US4] 實作失敗時提供除錯提示於 scripts/verify-deployment.js
- [ ] T063 [US4] 新增 verify-deploy 指令於 package.json
- [ ] T064 [US4] 執行 pnpm verify-deploy http://localhost:3000 測試本機環境

**驗證步驟**:
- ✅ `scripts/verify-deployment.js` 檔案存在
- ✅ `pnpm verify-deploy <URL>` 可執行
- ✅ 測試 4 個端點（/login, /admin/login, /api/env-test, /api/check-connection）
- ✅ 顯示通過/失敗報告
- ✅ 失敗時提供除錯提示
- ✅ 輸出使用繁體中文

**完成標準**: US4 所有驗收場景通過,部署驗證工具正確運作

---

## Phase 6: US5 - 新用戶部署指南 (Priority: P0)

**User Story**: 作為新開發者,我需要完整的部署指南,以便在 2 小時內完成從複製到部署的全流程。

**Independent Test**: 可以邀請未接觸過專案的開發者按文檔執行,記錄完成時間與遇到的問題,驗證成功率 >= 90%。

### Tasks

- [ ] T065 [P] [US5] 建立新用戶部署指南文檔於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T066 [P] [US5] 建立環境變數檢查清單文檔於 docs/ENV_VARIABLES_CHECKLIST.md
- [ ] T067 [US5] 撰寫步驟 1：Fork 專案於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T068 [US5] 撰寫步驟 2：建立 Supabase 專案於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T069 [US5] 撰寫步驟 3：環境變數設定於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T070 [US5] 撰寫步驟 4：初始化資料庫於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T071 [US5] 撰寫步驟 5：本機測試於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T072 [US5] 撰寫步驟 6：部署到 Vercel 於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T073 [US5] 撰寫步驟 7：驗證線上環境於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T074 [US5] 撰寫步驟 8：設定 GitHub Actions（可選）於 docs/NEW_DEPLOYMENT_GUIDE.md
- [ ] T075 [US5] 新增常見問題章節於 docs/NEW_DEPLOYMENT_GUIDE.md，包含以下 4 個問題：1) 環境變數遺漏（缺少 SUPABASE_URL 或 ANON_KEY）、2) Migration 失敗（外鍵約束錯誤）、3) 連線錯誤（Supabase 專案 ID 不正確）、4) 部署失敗（Vercel 環境變數未設定）
- [ ] T076 [US5] 列出 3 個必填變數於 docs/ENV_VARIABLES_CHECKLIST.md
- [ ] T077 [US5] 列出 8 個可選變數於 docs/ENV_VARIABLES_CHECKLIST.md
- [ ] T078 [US5] 新增環境差異對照表（本機 vs Vercel）於 docs/ENV_VARIABLES_CHECKLIST.md
- [ ] T079 [US5] 更新 README.md 「快速開始」章節
- [ ] T080 [US5] 新增連結到 NEW_DEPLOYMENT_GUIDE.md 於 README.md
- [ ] T081 [US5] 移除 README.md 所有硬編碼的專案資訊
- [ ] T082 [P] [US5] 更新 DEPLOYMENT.md 標記為舊版並指向新指南

**驗證步驟**:
- ✅ `docs/NEW_DEPLOYMENT_GUIDE.md` 包含 8 個步驟
- ✅ 每步驟有預估時間與成功標準
- ✅ 常見問題章節包含至少 4 個明確的問題與解決方案
- ✅ `docs/ENV_VARIABLES_CHECKLIST.md` 列出所有 11 個變數
- ✅ `README.md` 連結到新部署指南
- ✅ `README.md` 無硬編碼專案 ID 或 URL
- ✅ 所有文檔使用繁體中文

**完成標準**: US5 所有驗收場景通過,文檔完整且清晰

---

## Phase 7: US6 - 種子資料優化與敏感信息保護 (Priority: P0/P1)

**User Story**: 作為開發者,我需要確保種子資料支援重複執行且無敏感信息洩露,以便安全地初始化資料庫。

**Independent Test**: 可以執行 `supabase db seed` 兩次,驗證第二次執行時跳過建立；檢查 Git 歷史驗證無敏感信息。

### Tasks

- [ ] T083 [P] [US6] 編輯 supabase/seed.sql 新增存在性檢查邏輯
- [ ] T084 [P] [US6] 新增警告註解說明僅用於開發環境於 supabase/seed.sql
- [ ] T085 [US6] 建立故障排除指南文檔於 docs/TROUBLESHOOTING.md
- [ ] T086 [US6] 撰寫常見問題 1：環境變數遺漏（症狀、原因、解決步驟）於 docs/TROUBLESHOOTING.md
- [ ] T087 [US6] 撰寫常見問題 2：Migration 失敗（外鍵約束錯誤、語法錯誤）於 docs/TROUBLESHOOTING.md
- [ ] T088 [US6] 撰寫常見問題 3：連線錯誤（Supabase URL 格式、網路問題）於 docs/TROUBLESHOOTING.md
- [ ] T089 [US6] 撰寫常見問題 4：部署失敗（Vercel 環境變數、建置錯誤）於 docs/TROUBLESHOOTING.md
- [ ] T090 [US6] 撰寫常見問題 5：備份 Cron Job 失敗（GCS 憑證、權限問題）於 docs/TROUBLESHOOTING.md
- [ ] T091 [US6] 執行 supabase db seed 兩次驗證冪等性
- [ ] T092 [US6] 執行 git log -- .env.local .env.vercel 驗證無歷史記錄
- [ ] T092A [US6] 執行 git log -- .env 驗證無歷史記錄（補充檢查）

**驗證步驟**:
- ✅ `supabase/seed.sql` 包含存在性檢查
- ✅ 已存在管理員時跳過建立
- ✅ 新增警告註解
- ✅ 執行兩次不會建立重複帳號
- ✅ `docs/TROUBLESHOOTING.md` 列出至少 5 個常見問題，每個問題包含症狀、原因、解決步驟
- ✅ `git log -- .env.local .env.vercel .env` 無輸出（完整檢查）

**完成標準**: US6 所有驗收場景通過,種子資料冪等且無敏感信息洩露

---

## Phase 8: Polish & Verification

**目標**: 執行最終驗證、確保所有功能正常、文檔完整、向後相容

### Tasks

- [ ] T093 [P] 執行完整型別檢查（pnpm type-check）
- [ ] T094 [P] 執行 ESLint 檢查（pnpm lint）
- [ ] T095 [P] 執行環境檢查驗證工具正確運作（pnpm check-env）
- [ ] T096 [P] 執行資料庫初始化驗證工具正確運作（pnpm init-db）
- [ ] T097 執行本機開發測試（pnpm dev）驗證所有頁面正常
- [ ] T098 測試前台登入功能
- [ ] T099 測試商品瀏覽功能
- [ ] T100 測試加入購物車功能
- [ ] T101 測試建立訂單功能
- [ ] T102 測試後台登入功能
- [ ] T103 測試管理商品功能
- [ ] T104 測試查看訂單功能
- [ ] T105 執行建置驗證無錯誤（pnpm build）
- [ ] T106 審查所有新建檔案使用繁體中文
- [ ] T107 執行 git grep "qwovavytryvgchcowjof" 最終驗證（應僅在文檔中）
- [ ] T108 執行 git grep "Devape-BM69" 最終驗證（應無結果）
- [ ] T109 執行 git status 驗證無未預期的變更
- [ ] T110 建立 Git commit 提交所有變更

**驗證步驟**:
- ✅ TypeScript 型別檢查 0 errors
- ✅ ESLint 檢查 0 errors
- ✅ 所有自動化工具正確運作
- ✅ 所有前後台功能正常
- ✅ 建置成功無錯誤
- ✅ 無硬編碼專案 ID（程式碼中）
- ✅ 無硬編碼密碼
- ✅ 所有文檔使用繁體中文

**完成標準**: 所有驗證通過,功能完整且向後相容,準備合併到 master

---

## Testing Strategy

### Manual Testing (手動測試)

**測試範圍**:
- 環境檢查工具測試（缺少變數、格式錯誤、完整配置）
- 資料庫初始化工具測試（建立帳號、重複執行、登入驗證）
- 部署驗證工具測試（本機環境、線上環境）
- 本機開發完整流程測試（從設定環境變數到啟動應用）

**執行指令**:
```bash
# 環境檢查測試
rm .env.local  # 測試缺少配置
pnpm check-env  # 應顯示錯誤
cp .env.local.example .env.local  # 建立範本
# 填入實際值
pnpm check-env  # 應顯示成功

# 資料庫初始化測試
pnpm init-db  # 輸入管理員資訊
pnpm init-db  # 重複執行應跳過

# 部署驗證測試
pnpm verify-deploy http://localhost:3000
```

### Integration Testing (整合測試)

**測試範圍**:
- 本機開發完整流程（環境設定 → Migration → 初始化 → 啟動 → 測試功能）
- Vercel 部署流程（設定環境變數 → 部署 → 驗證）
- 向後相容性測試（所有現有功能正常運作）

**執行方式**:
```bash
# 本機開發流程
cp .env.local.example .env.local
# 填入 Supabase 憑證
pnpm check-env
supabase db push
pnpm init-db
pnpm dev
# 測試前後台功能

# 向後相容性測試
git checkout master
pnpm dev
# 測試所有功能
git checkout 019-portability-fixes
pnpm dev
# 重複相同測試,結果應一致
```

### User Acceptance Testing (用戶驗收測試)

**測試範圍**:
- 邀請 1-2 位未接觸過專案的開發者
- 按 `docs/NEW_DEPLOYMENT_GUIDE.md` 完成部署
- 記錄完成時間與遇到的問題
- 收集反饋改進文檔

**成功標準**:
- ✅ 90% 的測試者在 2 小時內完成
- ✅ 無阻斷性錯誤
- ✅ 文檔清晰度評分 >= 4/5

---

## Deployment Strategy

### Git Commit Strategy

採用**小步提交**策略,每完成一個 Phase 或重要 Task 就提交：

- **Phase 1**: `feat: 建立環境變數範本系統與敏感信息保護機制 (spec 019)`
- **Phase 2**: `feat: 移除所有硬編碼專案識別符 (spec 019)`
- **Phase 3**: `feat: 實作自動化環境檢查工具 (spec 019)`
- **Phase 4**: `feat: 實作資料庫初始化自動化工具 (spec 019)`
- **Phase 5**: `feat: 實作部署驗證工具 (spec 019)`
- **Phase 6**: `docs: 新增新用戶部署指南與環境變數檢查清單 (spec 019)`
- **Phase 7**: `feat: 參數化種子資料與新增故障排除指南 (spec 019)`
- **Phase 8**: `feat: 完成專案可移植性修復計畫 (spec 019)`

### Commit Message 格式

```
feat: [簡短描述]

[詳細變更內容]

- 變更 1
- 變更 2
- 變更 3

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 合併到 master 的條件

- ✅ 所有 Phase 完成 (Phase 0-8)
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ ESLint 檢查通過 (`pnpm lint`)
- ✅ 建置成功 (`pnpm build`)
- ✅ 所有自動化工具正確運作
- ✅ 向後相容性測試通過（所有現有功能正常）
- ✅ 文檔完整且使用繁體中文
- ✅ 無硬編碼專案 ID（程式碼中）
- ✅ 無敏感信息洩露

---

## Implementation Notes

### Critical Path (關鍵路徑)

以下任務構成關鍵路徑,必須按順序執行：

```
T001-T005 (Setup)
    ↓
T006-T009 (環境變數範本) ← 阻斷性基礎
    ↓
T014-T027 (移除硬編碼) ← 依賴環境變數範本
    ↓
T028-T039 (環境檢查工具)
    ↓
T065-T082 (部署指南) ← 依賴工具腳本完成
    ↓
T093-T110 (最終驗證)
```

### Parallel Execution Opportunities

以下任務可並行執行,提升開發效率：

**Phase 1 並行任務**:
- T007-T009（環境變數說明）可並行
- T010-T012（.gitignore 規則）可並行

**Phase 2 並行任務**:
- T014-T015（vercel.json）與 T021-T022（import-data.ps1）可並行
- T016-T018（env-test API）與 T019-T020（check-connection API）可並行

**Phase 4-5 並行開發**:
- US3（資料庫初始化,T040-T052）與 US4（部署驗證,T053-T064）可並行開發

**Phase 6 並行任務**:
- T065（部署指南）與 T066（檢查清單）可並行撰寫
- T076-T078（檢查清單內容）可獨立撰寫
- T082（更新 DEPLOYMENT.md）可與 T079-T081 並行

**Phase 7 並行任務**:
- T083-T084（種子資料）與 T085-T090（故障排除指南）可並行

**Phase 8 並行任務**:
- T093-T096（檢查指令）可並行執行
- T098-T104（功能測試）可並行執行

### MVP Scope

**最小可行產品 (MVP)** 包含：
- Phase 0: Setup
- Phase 1: Foundational（環境變數範本）
- Phase 2: US1（移除硬編碼）
- Phase 3: US2（環境檢查工具）

**MVP 可交付價值**:
- 提供環境變數範本,新用戶知道需要設定哪些變數
- 移除硬編碼,專案可在任何環境運行
- 環境檢查工具,幫助開發者快速驗證配置

---

## Progress Tracking

### Task Completion Summary

| Phase | 任務數 | 完成數 | 進度 | 狀態 |
|-------|-------|-------|------|------|
| Phase 0: Setup | 5 | 0 | 0% | 📋 待開始 |
| Phase 1: Foundational | 8 | 0 | 0% | 📋 待開始 |
| Phase 2: US1 - 移除硬編碼 | 14 | 0 | 0% | 📋 待開始 |
| Phase 3: US2 - 環境檢查 | 12 | 0 | 0% | 📋 待開始 |
| Phase 4: US3 - 資料庫初始化 | 13 | 0 | 0% | 📋 待開始 |
| Phase 5: US4 - 部署驗證 | 12 | 0 | 0% | 📋 待開始 |
| Phase 6: US5 - 部署指南 | 18 | 0 | 0% | 📋 待開始 |
| Phase 7: US6 - 種子資料 | 11 | 0 | 0% | 📋 待開始 |
| Phase 8: Polish & Verification | 18 | 0 | 0% | 📋 待開始 |
| **總計** | **112** | **0** | **0%** | **📋 準備開始實施** |

### Milestone Timeline

| Milestone | 預估完成時間 | 實際完成日期 | 狀態 |
|-----------|------------|------------|------|
| Phase 0-1 完成 (Setup + Foundational) | 45 分鐘 | - | 📋 待開始 |
| Phase 2 完成 (US1 - MVP 基礎) | +45 分鐘 | - | 📋 待開始 |
| Phase 3 完成 (US2 - MVP 完整) | +1 小時 | - | 📋 待開始 |
| Phase 4-5 完成 (US3-US4) | +2.5 小時 | - | 📋 待開始 |
| Phase 6 完成 (US5 - 文檔) | +2.5 小時 | - | 📋 待開始 |
| Phase 7 完成 (US6) | +1.5 小時 | - | 📋 待開始 |
| Phase 8 完成 (Polish & Verification) | +2 小時 | - | 📋 待開始 |
| 合併到 master | +1 小時（PR Review） | - | 📋 待開始 |

**總預估時間**: 11.5 小時（約 1.5 個工作日）

---

## Success Criteria

### 量化指標

- ✅ 0 個硬編碼專案 ID（程式碼中,文檔除外）
- ✅ 0 個硬編碼密碼或憑證
- ✅ 11 個環境變數完整說明於範本
- ✅ 3 個自動化工具可用（環境檢查、資料庫初始化、部署驗證）
- ✅ 環境檢查執行時間 < 5 秒
- ✅ 部署驗證執行時間 < 30 秒
- ✅ 新用戶部署時間 < 2 小時
- ✅ 部署成功率 > 90%（基於 UAT 測試）

### 質化指標

- ✅ 文檔清晰度評分 >= 4/5（基於用戶反饋）
- ✅ 所有文檔使用繁體中文
- ✅ 向後相容性 100%（所有現有功能正常）
- ✅ TypeScript 型別檢查 0 errors
- ✅ ESLint 檢查 0 errors
- ✅ 建置成功無錯誤

### 安全性指標

- ✅ 0 個敏感信息在 Git 歷史中
- ✅ `.gitignore` 覆蓋所有敏感檔案變體
- ✅ 所有腳本從環境變數讀取憑證（無硬編碼）

---

## References

- [功能規格文件](./spec.md) - 完整的功能需求與驗收標準
- [實施計畫](./plan.md) - 技術選型與實施策略
- [技術研究報告](./research.md) - 技術決策與替代方案分析
- [快速上手指南](./quickstart.md) - 開發者快速參考
- [需求檢查清單](./checklists/requirements.md) - 詳細需求驗收清單
- [專案憲章](../../CLAUDE.md) - 專案核心原則與規範

---

**任務清單產生時間**: 2026-01-23
**最後修正時間**: 2026-01-23（分析報告修正）
**總任務數**: 112（原 110 + 新增 T092A + 修正）
**預估完成時間**: 11.5 小時（約 1.5 個工作日）
**下一步**: 開始 Phase 0 實作（確認分支、備份環境變數、檢查依賴）
