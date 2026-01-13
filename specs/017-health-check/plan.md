# Implementation Plan: 專案健康檢查系統

**Branch**: `017-health-check` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-health-check/spec.md`

## Summary

**主要需求**: 建立全面的專案健康檢查系統,涵蓋架構、API、UX、設計、效能、Bug、安全七大領域,自動產生 Markdown + JSON 雙格式報告,支援問題追蹤與修復建議。

**技術方法**:
1. **Phase 0 (Setup & Foundational)**: 安裝依賴、建立目錄結構、型別定義
2. **Phase 1 (US1 - 架構檢查)**: 使用 ts-morph 檢查路由、Server Actions、Supabase Client、模組依賴
3. **Phase 2 (US2 - API 檢查)**: 檢查 Server Actions 品質、權限驗證、Zod 驗證、RLS Policies
4. **Phase 3 (US3 - UX 檢查)**: 手動測試清單 + 操作流程驗證
5. **Phase 4 (US4 - 設計檢查)**: 正規表示式檢查 Neo-Brutalism 風格、響應式設計、設計 Token
6. **Phase 5 (US5 - 效能檢查)**: Lighthouse CI + Web Vitals + 資料庫查詢效能監控
7. **Phase 6 (US6 - Bug 檢查)**: 手動測試案例 + 邊界條件驗證
8. **Phase 7 (US7 - 安全檢查)**: RLS Policies、Migration 品質、備份系統、索引檢查
9. **Phase 8 (報告產生與匯出)**: generate-report.ts、export-to-github-issues.ts
10. **Phase 9 (主執行腳本)**: run-health-check.ts 並行執行所有檢查
11. **Phase 10 (Polish)**: 測試、文件、CI/CD 整合

**核心亮點**:
- ✅ 七大領域全面檢查：架構、API、UX、設計、效能、Bug、安全
- ✅ 自動化與手動測試混合：自動化檢查 + 手動測試清單
- ✅ Markdown + JSON 雙格式報告：人類易讀 + 機器可解析
- ✅ 問題追蹤與修復建議：每個問題包含具體修復步驟與參考資料
- ✅ GitHub Issues 整合：一鍵匯出問題為 GitHub Issues
- ✅ 可重複性與版本控制：所有報告儲存為檔案,使用 Git 追蹤變更
- ✅ 評分系統：0-100 分量化健康度,清晰呈現系統狀態

---

## Technical Context

**Language/Version**: TypeScript 5.7+
**Primary Framework**: Next.js 15 (App Router) + React 19
**Analysis Tools**: ts-morph (TypeScript AST 分析)
**Testing Tools**: Vitest + React Testing Library + Lighthouse CI
**Database**: Supabase (PostgreSQL)
**Storage**: 檔案系統 (Markdown + JSON 報告)
**Performance Goals**:
- 單一檢查腳本執行時間 < 10 秒
- 完整健康檢查時間 < 10 分鐘
- 報告產生時間 < 1 分鐘
**Constraints**:
- 必須符合專案憲章所有適用原則
- 檢查腳本不影響生產環境資料
- 報告檔案大小 < 1 MB (易於 Git 追蹤)
- 支援並行執行加速檢查流程
**Scale/Scope**:
- 新增 10 個檢查腳本 (run-health-check.ts + 7 個領域檢查 + generate-report.ts + export-to-github-issues.ts)
- 產生 Markdown + JSON 雙格式報告
- 支援 CLI 參數與選項
- 預計影響 ~3000 行程式碼變更

---

## Constitution Check

*GATE: Must pass before Phase 0 implementation.*

### ✅ I. 使用者角色優先 (User Role First)
- **符合性**: N/A (健康檢查工具不涉及使用者角色)
- **合規狀態**: ✅ 不適用

### ✅ II. 等級綁定價格 (Tier-Based Pricing)
- **符合性**: N/A (健康檢查工具不涉及價格機制)
- **合規狀態**: ✅ 不適用

### ✅ III. 使用者故事驅動開發 (User Story Driven Development)
- **符合性**: Spec 包含 7 個獨立可測試的使用者故事 (P0 × 5、P1 × 2)
- **實施方式**:
  - US1 (P0): 架構健康度檢查
  - US2 (P0): API 整合度與資料流檢查
  - US3 (P1): 使用者體驗與操作流程檢查
  - US4 (P1): 設計系統一致性檢查
  - US5 (P1): 效能與速度檢查
  - US6 (P0): 潛在 Bug 與邏輯錯誤檢查
  - US7 (P0): 資料庫安全與 Migration 檢查
- **合規狀態**: ✅ 通過

### ✅ IV. API 模組化與職責分離 (API Modularization)
- **符合性**: 檢查腳本按領域模組化設計
- **實施方式**:
  - 每個領域獨立實作檢查腳本 (check-architecture.ts、check-api.ts 等)
  - 報告產生器獨立 (generate-report.ts)
  - GitHub Issues 匯出器獨立 (export-to-github-issues.ts)
  - 主執行腳本協調所有檢查 (run-health-check.ts)
- **合規狀態**: ✅ 通過

### ✅ V. 設計系統一致性 (Design System Consistency)
- **符合性**: N/A (健康檢查工具僅產生報告檔案,無 UI)
- **合規狀態**: ✅ 不適用

### ✅ VI. 負庫存支援 (Negative Stock Support)
- **符合性**: N/A (健康檢查工具不涉及庫存邏輯)
- **合規狀態**: ✅ 不適用

### ✅ VII. 響應式設計規範 (Responsive Design)
- **符合性**: N/A (健康檢查工具無 UI)
- **合規狀態**: ✅ 不適用

### ✅ VIII. 統一對話框系統 (Unified Dialog)
- **符合性**: N/A (健康檢查工具無對話框需求)
- **合規狀態**: ✅ 不適用

**總結**: ✅ 所有適用原則都已符合,無違反項目,可進入 Phase 0 實作。

---

## Project Structure

### Documentation (this feature)

```text
specs/017-health-check/
├── spec.md              # 功能規格 (已完成)
├── research.md          # 技術研究報告 (已完成)
├── data-model.md        # 資料模型文件 (已完成)
├── plan.md              # 本檔案 (實作計畫)
├── quickstart.md        # 快速上手指南 (已完成)
├── contracts/           # API 合約 (已完成)
│   ├── types.ts         # TypeScript 型別定義
│   └── check-scripts.md # 檢查腳本 API 合約
├── reports/             # 健康檢查報告目錄 (將產生)
│   ├── YYYY-MM-DD-HHMMSS/  # 報告時間戳目錄
│   │   ├── summary.md      # 綜合健康檢查報告 (Markdown)
│   │   ├── summary.json    # 綜合健康檢查報告 (JSON)
│   │   ├── architecture.json  # 架構檢查詳細報告
│   │   ├── api.json           # API 檢查詳細報告
│   │   ├── ux.json            # UX 檢查詳細報告
│   │   ├── design.json        # 設計檢查詳細報告
│   │   ├── performance.json   # 效能檢查詳細報告
│   │   ├── bugs.json          # Bug 檢查詳細報告
│   │   ├── security.json      # 安全檢查詳細報告
│   │   └── issues/            # 問題清單 (依嚴重程度分類)
│   │       ├── critical.md
│   │       ├── high.md
│   │       ├── medium.md
│   │       └── low.md
│   └── latest -> YYYY-MM-DD-HHMMSS/  # 符號連結指向最新報告
└── scripts/             # 健康檢查腳本 (將產生)
    ├── run-health-check.ts           # 主執行腳本
    ├── check-architecture.ts         # 架構檢查腳本
    ├── check-api.ts                  # API 檢查腳本
    ├── check-ux.ts                   # UX 檢查腳本
    ├── check-design.ts               # 設計檢查腳本
    ├── check-performance.ts          # 效能檢查腳本
    ├── check-bugs.ts                 # Bug 檢查腳本
    ├── check-security.ts             # 安全檢查腳本
    ├── generate-report.ts            # 報告產生器
    └── export-to-github-issues.ts    # GitHub Issues 匯出器
```

### Source Code (repository root)

```text
# 健康檢查系統腳本位置

# ========== 檢查腳本 ==========
scripts/health-check/
├── run-health-check.ts           # ✅ 主執行腳本 (並行執行所有檢查)
├── check-architecture.ts         # ✅ 架構檢查 (ts-morph)
├── check-api.ts                  # ✅ API 檢查 (ts-morph + Supabase CLI)
├── check-ux.ts                   # ✅ UX 檢查 (手動測試清單產生)
├── check-design.ts               # ✅ 設計檢查 (正規表示式)
├── check-performance.ts          # ✅ 效能檢查 (Lighthouse CI)
├── check-bugs.ts                 # ✅ Bug 檢查 (手動測試案例產生)
├── check-security.ts             # ✅ 安全檢查 (Supabase CLI + Migration 掃描)
├── generate-report.ts            # ✅ 報告產生器 (Markdown + JSON)
├── export-to-github-issues.ts    # ✅ GitHub Issues 匯出器
└── utils/                        # ✅ 工具函式
    ├── ts-ast-helpers.ts         # TypeScript AST 輔助函式
    ├── report-formatter.ts       # 報告格式化工具
    └── github-api-helpers.ts     # GitHub API 輔助函式

# ========== 報告儲存位置 ==========
specs/017-health-check/reports/
└── (自動產生時間戳目錄)

# ========== Package.json Scripts ==========
package.json (新增腳本):
- pnpm health-check                    # 執行完整健康檢查
- pnpm health-check:architecture       # 執行架構檢查
- pnpm health-check:api                # 執行 API 檢查
- pnpm health-check:design             # 執行設計檢查
- pnpm health-check:performance        # 執行效能檢查
- pnpm health-check:ci                 # CI/CD 用腳本

# ========== Lighthouse CI 配置 ==========
lighthouserc.js                         # ✅ Lighthouse CI 設定檔

# ========== GitHub Actions ==========
.github/workflows/health-check.yml      # ✅ CI/CD 健康檢查工作流程
```

**Structure Decision**: 所有檢查腳本集中在 `scripts/health-check/` 目錄,報告儲存在 `specs/017-health-check/reports/` 目錄。使用 Git 追蹤報告變更歷史,方便比較不同時間點的健康度。

---

## Complexity Tracking

**無違反項目**: 本實作完全符合專案憲章所有適用原則,無需額外複雜度說明。

**技術挑戰**:
1. **TypeScript AST 分析複雜度**: 使用 ts-morph 分析 TypeScript 程式碼需要理解 AST 結構
2. **並行執行協調**: 7 個領域檢查並行執行,需要正確處理錯誤與結果收集
3. **報告格式化**: Markdown 報告需要包含表格、清單、超連結等複雜格式
4. **GitHub API 整合**: 匯出 Issues 需要處理 Rate Limit、錯誤重試等

---

## Phase 0: Setup & Foundational

### 目標
- 安裝必要依賴 (ts-morph、glob、@octokit/rest、@lhci/cli)
- 建立目錄結構 (scripts/health-check、reports)
- 定義 TypeScript 型別 (HealthCheckReport、Issue、Recommendation 等)
- 建立工具函式 (報告格式化、GitHub API 輔助)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `package.json` | 新增依賴: ts-morph, glob, @octokit/rest, @lhci/cli |
| `scripts/health-check/utils/ts-ast-helpers.ts` | TypeScript AST 輔助函式 (檢查 use server、checkAuth、Zod 驗證等) |
| `scripts/health-check/utils/report-formatter.ts` | 報告格式化工具 (Markdown 表格、清單、程式碼區塊) |
| `scripts/health-check/utils/github-api-helpers.ts` | GitHub API 輔助函式 (建立 Issue、設定 Label、Milestone) |

### 實作重點

#### Task 0.1: 安裝依賴
```bash
pnpm add -D ts-morph glob @octokit/rest @lhci/cli
```

#### Task 0.2: 建立目錄結構
```bash
mkdir -p scripts/health-check/utils
mkdir -p specs/017-health-check/reports
```

#### Task 0.3: TypeScript 型別定義
- 使用已完成的 `specs/017-health-check/contracts/types.ts`
- 包含 `HealthCheckReport`、`Issue`、`Recommendation`、`DomainScore` 等型別

#### Task 0.4: 工具函式實作
- `ts-ast-helpers.ts`: 提供 `hasUseServer()`、`hasCheckAuth()`、`hasZodValidation()` 等檢查函式
- `report-formatter.ts`: 提供 `formatMarkdownTable()`、`formatIssueList()` 等格式化函式
- `github-api-helpers.ts`: 提供 `createIssue()`、`ensureMilestone()` 等 GitHub API 封裝

### 驗證步驟
- ✅ 依賴安裝成功 (`pnpm list ts-morph`)
- ✅ 目錄結構建立完成
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ 工具函式單元測試通過 (`pnpm test scripts/health-check/utils`)

---

## Phase 1: US1 - 架構健康度檢查

### 目標
- 檢查路由結構是否符合雙入口設計
- 檢查 Server Actions 是否包含必要步驟 (use server、checkAuth、Zod 驗證、revalidatePath)
- 檢查 Supabase Client 使用是否正確分離 (Server/Client)
- 檢查模組依賴關係 (無循環依賴)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/check-architecture.ts` | 架構檢查腳本 (主函式 + 4 個子檢查) |

### 實作重點

#### Check 1: Route Structure (路由結構)
- 檢查 `app/(auth)`、`app/(shop)`、`app/(admin)` 路由群組是否存在
- 檢查 `middleware.ts` 是否正確實作權限檢查
- 使用檔案系統 API 檢查目錄結構

#### Check 2: Server Actions Pattern (Server Actions 模式)
- 使用 ts-morph 掃描 `lib/actions/**/*.ts` 檔案
- 檢查每個匯出函式是否包含 `'use server'` 指令
- 檢查 create/update/delete 函式是否呼叫 `checkAuth()`
- 檢查是否使用 Zod 驗證 (`.parse()` 或 `.safeParse()`)
- 檢查回傳型別是否為 `ActionResult<T>` 或 `Promise<ActionResult<T>>`

#### Check 3: Supabase Client Usage (Supabase Client 使用)
- 檢查 `lib/supabase/server.ts` 和 `lib/supabase/client.ts` 是否存在
- 檢查 Server Actions 是否使用 `lib/supabase/server.ts`
- 檢查 Client Components 是否使用 `lib/supabase/client.ts`

#### Check 4: Module Dependencies (模組依賴)
- 使用 ts-morph 分析 import 語句
- 檢測循環依賴 (DFS 演算法)
- 產生依賴關係圖 (可選)

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-architecture.ts`)
- ✅ 產生 `architecture.json` 報告
- ✅ 檢查結果符合預期 (通過項目 vs 失敗項目)
- ✅ 發現的問題包含檔案位置與建議

---

## Phase 2: US2 - API 整合度與資料流檢查

### 目標
- 檢查所有 Server Actions 的品質 (必要步驟、錯誤處理、回傳型別)
- 檢查權限驗證是否完整 (checkAuth)
- 檢查輸入驗證是否使用 Zod
- 檢查 RLS Policies 是否完整 (所有表啟用 RLS)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/check-api.ts` | API 檢查腳本 (主函式 + 4 個子檢查) |

### 實作重點

#### Check 1: Server Actions Quality (Server Actions 品質)
- 複用 Phase 1 的部分邏輯
- 統計 Server Actions 數量與符合規範的數量
- 產生 `serverActionsStats` 統計資料

#### Check 2: Error Handling (錯誤處理)
- 檢查 Server Actions 是否包含 try-catch
- 檢查錯誤訊息是否友善 (繁體中文)
- 檢查是否回傳 `ActionResult<T>` 格式

#### Check 3: Authorization Checks (權限驗證)
- 檢查 create/update/delete 函式是否呼叫 `checkAuth()`
- 檢查 `checkAuth()` 的參數是否正確 ('admin' vs 'client')

#### Check 4: RLS Policies (RLS Policies)
- 使用 Supabase CLI 查詢 RLS 設定:
  ```bash
  supabase db inspect --schema public
  ```
- 檢查所有表是否啟用 RLS (`rls_enabled = true`)
- 統計 RLS Policies 數量

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-api.ts`)
- ✅ 產生 `api.json` 報告
- ✅ `serverActionsStats` 統計正確
- ✅ RLS Policies 檢查結果正確

---

## Phase 3: US3 - 使用者體驗與操作流程檢查

### 目標
- 產生手動測試清單 (Given-When-Then 格式)
- 涵蓋前台核心操作流程 (登入、瀏覽、購物車、結帳、訂單)
- 涵蓋後台核心操作流程 (登入、開戶、商品管理、訂單管理)

### 檔案清單

| 檔案路征 | 說明 |
|---------|------|
| `scripts/health-check/check-ux.ts` | UX 檢查腳本 (產生手動測試清單) |

### 實作重點

#### 手動測試清單格式
- 使用 Markdown Tasklist + Given-When-Then 混合格式
- 參考 `specs/017-health-check/research.md` Q4 的範例格式
- 包含前台 5 個核心流程、後台 5 個核心流程

#### 測試流程清單
**前台流程**:
1. 客戶登入 → 瀏覽商品
2. 瀏覽商品 → 加入購物車
3. 購物車 → 套用優惠券 → 結帳
4. 結帳 → 訂單確認 → 查看訂單
5. 查看訂單詳情

**後台流程**:
1. 管理員登入 → 查看 Dashboard
2. 快速開設客戶帳號
3. 商品管理 (建立、編輯、上傳圖片)
4. 訂單管理 (確認、標記出貨、取消)
5. 會員等級管理 (建立、編輯、運費設定)

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-ux.ts`)
- ✅ 產生 `ux.json` 報告
- ✅ 手動測試清單格式正確 (Markdown Tasklist)
- ✅ 涵蓋所有核心操作流程

---

## Phase 4: US4 - 設計系統一致性檢查

### 目標
- 檢查所有 UI 元件是否遵循 Neo-Brutalism 設計規範
- 檢查響應式設計是否正確 (邊框、陰影、斷點)
- 檢查是否使用設計 Token 而非硬編碼樣式
- 檢查是否使用統一對話框系統 (禁止原生對話框)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/check-design.ts` | 設計檢查腳本 (正規表示式掃描) |

### 實作重點

#### Check 1: Neo-Brutalism Style (Neo-Brutalism 風格)
- 使用正規表示式掃描 `**/*.tsx` 檔案的 className 屬性
- 檢查邊框是否使用 `border-2 md:border-3`
- 檢查陰影是否使用 `shadow-neo-sm md:shadow-neo`
- 檢查點擊效果是否包含 `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`

#### Check 2: Responsive Design (響應式設計)
- 檢查是否使用 Mobile-First 策略
- 檢查響應式斷點是否正確 (`md:` 為 768px)
- 檢查觸控目標是否 >= 44px × 44px

#### Check 3: Design Tokens (設計 Token)
- 檢查是否使用 `lib/design-tokens.ts` 定義的 Token
- 搜尋硬編碼的顏色值 (#RRGGBB)、邊框寬度 (3px) 等

#### Check 4: Dialog System (對話框系統)
- 使用 ESLint 規則檢查是否使用原生對話框
- 搜尋 `window.alert`、`window.confirm`、`window.prompt`
- 建議使用 `useAlert`、`useConfirm`、`usePrompt` hooks

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-design.ts`)
- ✅ 產生 `design.json` 報告
- ✅ 檢測到的樣式問題包含檔案位置與建議
- ✅ 統計符合設計規範的元件百分比

---

## Phase 5: US5 - 效能與速度檢查

### 目標
- 使用 Lighthouse CI 測量頁面載入時間
- 測量 Web Vitals (LCP、FID、CLS、TTFB、FCP)
- 測量資料庫查詢效能 (p50、p95、p99)
- 檢查圖片優化 (Next.js Image、sizes 屬性、WebP 格式)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/check-performance.ts` | 效能檢查腳本 (Lighthouse CI 整合) |
| `lighthouserc.js` | Lighthouse CI 設定檔 |

### 實作重點

#### Lighthouse CI 設定
- 測試 URL: `/`、`/login`、`/store`、`/admin/dashboard`、`/admin/products`
- 執行次數: 3 次取平均值
- 效能預算:
  - First Contentful Paint < 2s
  - Largest Contentful Paint < 2.5s
  - Cumulative Layout Shift < 0.1
  - Total Blocking Time < 300ms

#### Web Vitals 測量
- 使用 Next.js `useReportWebVitals` hook 收集真實用戶資料
- 儲存到 JSON 檔案供分析

#### 資料庫查詢效能
- 使用 Supabase Dashboard API 取得查詢統計
- 或實作自訂效能監控 (參考 `research.md` Q3 範例)

### 驗證步驟
- ✅ Lighthouse CI 執行成功
- ✅ 產生 `performance.json` 報告
- ✅ 效能指標符合目標 (頁面載入 < 2s、查詢 < 100ms)
- ✅ 慢查詢包含修復建議

---

## Phase 6: US6 - 潛在 Bug 與邏輯錯誤檢查

### 目標
- 產生手動測試案例清單 (邊界條件、資料一致性、並發操作)
- 涵蓋負庫存、等級價格、訂單編號、優惠券、運費計算等邏輯
- 提供測試資料與預期結果

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/check-bugs.ts` | Bug 檢查腳本 (產生測試案例) |

### 實作重點

#### 測試案例類別
1. **邊界條件測試**: 空值、負數、超大數值、特殊字元
2. **資料一致性測試**: 庫存扣減/回補、訂單狀態更新、優惠券使用
3. **並發操作測試**: 多使用者同時操作、資料庫鎖機制
4. **錯誤恢復測試**: 服務不可用、網路中斷、操作失敗

#### 測試案例格式
- Given-When-Then 格式
- 包含測試資料、操作步驟、預期結果
- 參考 `spec.md` Edge Cases 章節

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-bugs.ts`)
- ✅ 產生 `bugs.json` 報告
- ✅ 測試案例涵蓋所有關鍵邏輯
- ✅ 測試案例格式正確 (Given-When-Then)

---

## Phase 7: US7 - 資料庫安全與 Migration 檢查

### 目標
- 檢查所有表是否啟用 RLS
- 檢查 Migration 檔案品質 (增量式、無破壞性變更)
- 檢查備份系統設定 (自動備份、雲端儲存、滾動刪除)
- 檢查索引完整性 (外鍵索引、常用查詢索引)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/check-security.ts` | 安全檢查腳本 (Supabase CLI + Migration 掃描) |

### 實作重點

#### Check 1: RLS Policies (RLS Policies)
- 複用 Phase 2 的 RLS 檢查邏輯
- 統計 RLS 覆蓋率 (已啟用 RLS 的表數量 / 總表數量)
- 列出未啟用 RLS 的表

#### Check 2: Migration Quality (Migration 品質)
- 掃描 `supabase/migrations/**/*.sql` 檔案
- 檢查是否包含破壞性關鍵字 (DROP TABLE、TRUNCATE、DROP COLUMN)
- 檢查是否包含註解 (COMMENT)
- 統計安全 Migration 與危險 Migration 數量

#### Check 3: Backup System (備份系統)
- 檢查 `specs/015-cloud-backup/` 功能是否啟用
- 檢查 Vercel Cron 設定
- 檢查 Google Cloud Storage 與 Vercel Blob 整合
- 統計備份數量與最後備份時間

#### Check 4: Indexes (索引)
- 使用 Supabase CLI 查詢索引:
  ```bash
  supabase db inspect --schema public
  ```
- 檢查所有外鍵是否有索引
- 檢查常用查詢欄位是否有索引

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/check-security.ts`)
- ✅ 產生 `security.json` 報告
- ✅ RLS 覆蓋率統計正確
- ✅ Migration 品質檢查結果正確
- ✅ 備份系統狀態檢查正確

---

## Phase 8: 報告產生與匯出

### 目標
- 產生綜合健康檢查報告 (Markdown + JSON)
- 計算整體健康度評分 (0-100 分)
- 依嚴重程度分類問題清單 (Critical / High / Medium / Low)
- 支援匯出問題為 GitHub Issues

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/generate-report.ts` | 報告產生器 (Markdown + JSON) |
| `scripts/health-check/export-to-github-issues.ts` | GitHub Issues 匯出器 |

### 實作重點

#### Report Generation (報告產生)
- 讀取 7 個領域的檢查結果 (architecture.json、api.json 等)
- 計算整體健康度評分:
  ```
  整體評分 = Σ(領域評分 × 權重)
  權重: 架構 15%、API 15%、UX 15%、設計 10%、效能 15%、Bug 15%、安全 15%
  ```
- 產生 Markdown 報告 (`summary.md`):
  - 總覽表格 (各領域評分、狀態、問題數)
  - 各領域詳細報告 (通過項目、失敗項目、問題清單)
  - 修復優先級建議 (Critical → High → Medium → Low)
- 產生 JSON 報告 (`summary.json`):
  - 完整資料結構 (符合 `HealthCheckReport` 型別)

#### GitHub Issues Export (GitHub Issues 匯出)
- 使用 `@octokit/rest` 呼叫 GitHub API
- 僅匯出 Critical + High 問題 (預設)
- 建立 Milestone (使用 feature branch 名稱)
- 設定 Labels (`health-check`、`critical`、`high` 等)
- Issue 格式參考 `data-model.md` 範例

### 驗證步驟
- ✅ 報告產生成功 (`summary.md` + `summary.json`)
- ✅ 整體評分計算正確
- ✅ Markdown 報告格式正確 (表格、清單、超連結)
- ✅ JSON 報告結構符合型別定義
- ✅ GitHub Issues 匯出成功 (含 Milestone 與 Labels)

---

## Phase 9: 主執行腳本

### 目標
- 並行執行 7 個領域檢查
- 收集所有檢查結果並產生綜合報告
- 支援 CLI 參數與選項
- 支援部分領域檢查 (如僅執行架構 + API)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/run-health-check.ts` | 主執行腳本 (CLI 介面) |

### 實作重點

#### CLI 參數
```bash
# 執行完整健康檢查
tsx scripts/health-check/run-health-check.ts

# 執行特定領域檢查
tsx scripts/health-check/run-health-check.ts --domains architecture,api

# 詳細輸出模式
tsx scripts/health-check/run-health-check.ts --verbose

# 僅產生 JSON 報告 (不產生 Markdown)
tsx scripts/health-check/run-health-check.ts --no-markdown

# 匯出為 GitHub Issues
tsx scripts/health-check/run-health-check.ts --export-issues
```

#### 並行執行邏輯
- 使用 `Promise.all()` 並行執行 7 個領域檢查
- 錯誤處理: 單一領域失敗不影響其他領域
- 執行時間統計: 記錄每個領域的執行時間

#### 報告儲存
- 建立時間戳目錄: `specs/017-health-check/reports/YYYY-MM-DD-HHMMSS/`
- 儲存所有報告檔案: `summary.md`、`summary.json`、7 個領域詳細報告
- 更新符號連結: `latest` → 最新報告目錄

### 驗證步驟
- ✅ 腳本執行成功 (`tsx scripts/health-check/run-health-check.ts`)
- ✅ 並行執行邏輯正確 (7 個領域同時執行)
- ✅ 錯誤處理正確 (單一領域失敗不影響其他)
- ✅ CLI 參數正確解析 (`--domains`、`--verbose` 等)
- ✅ 報告儲存成功 (時間戳目錄 + 符號連結)

---

## Phase 10: Polish & Testing

### 目標
- 撰寫單元測試 (工具函式、報告格式化)
- 撰寫整合測試 (執行完整健康檢查)
- 撰寫文件 (quickstart.md、contracts/)
- 整合到 CI/CD (GitHub Actions)

### 檔案清單

| 檔案路徑 | 說明 |
|---------|------|
| `scripts/health-check/__tests__/*.test.ts` | 單元測試 (Vitest) |
| `.github/workflows/health-check.yml` | GitHub Actions 工作流程 |
| `package.json` | 新增 scripts (pnpm health-check 等) |

### 實作重點

#### Task 10.1: 單元測試
- 測試工具函式 (`ts-ast-helpers.ts`、`report-formatter.ts`)
- 測試報告產生邏輯 (`generate-report.ts`)
- 測試 GitHub API 輔助函式 (`github-api-helpers.ts`)

#### Task 10.2: 整合測試
- 執行完整健康檢查並驗證報告格式
- 執行部分領域檢查並驗證結果
- 執行 GitHub Issues 匯出並驗證 API 呼叫

#### Task 10.3: 文件撰寫
- `quickstart.md` 已完成,檢查是否需要更新
- `contracts/check-scripts.md` 已完成,檢查是否需要更新

#### Task 10.4: CI/CD 整合
- 建立 `.github/workflows/health-check.yml`:
  - 觸發條件: Pull Request to master、每週一次定時執行
  - 執行完整健康檢查
  - 上傳報告為 Artifact
  - 評分 < 80 時失敗 CI
  - 自動在 PR 留言報告摘要

#### Task 10.5: Package.json Scripts
```json
{
  "scripts": {
    "health-check": "tsx scripts/health-check/run-health-check.ts",
    "health-check:architecture": "tsx scripts/health-check/check-architecture.ts",
    "health-check:api": "tsx scripts/health-check/check-api.ts",
    "health-check:design": "tsx scripts/health-check/check-design.ts",
    "health-check:performance": "lhci autorun && tsx scripts/health-check/check-performance.ts",
    "health-check:ci": "pnpm health-check && pnpm health-check:performance"
  }
}
```

### 驗證步驟
- ✅ 所有單元測試通過 (`pnpm test scripts/health-check`)
- ✅ 整合測試通過 (`pnpm health-check`)
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ ESLint 檢查通過 (`pnpm lint`)
- ✅ GitHub Actions 工作流程執行成功
- ✅ 文件完整且易於理解

---

## Timeline Estimation

| Phase | 任務內容 | 預計時間 | 累計時間 |
|-------|---------|---------|---------|
| **Phase 0** | Setup & Foundational | 0.5-1 天 | 0.5-1 天 |
| **Phase 1** | US1 - 架構檢查 | 1-2 天 | 1.5-3 天 |
| **Phase 2** | US2 - API 檢查 | 1-2 天 | 2.5-5 天 |
| **Phase 3** | US3 - UX 檢查 | 0.5-1 天 | 3-6 天 |
| **Phase 4** | US4 - 設計檢查 | 1 天 | 4-7 天 |
| **Phase 5** | US5 - 效能檢查 | 1-2 天 | 5-9 天 |
| **Phase 6** | US6 - Bug 檢查 | 0.5-1 天 | 5.5-10 天 |
| **Phase 7** | US7 - 安全檢查 | 1 天 | 6.5-11 天 |
| **Phase 8** | 報告產生與匯出 | 1-2 天 | 7.5-13 天 |
| **Phase 9** | 主執行腳本 | 0.5-1 天 | 8-14 天 |
| **Phase 10** | Polish & Testing | 1-2 天 | 9-16 天 |
| **Total** | | **9-16 天** | |

**風險緩衝**: 預留 2-3 天處理意外問題 (TypeScript AST 複雜度、Lighthouse CI 設定、GitHub API Rate Limit 等)

**最終預估**: **11-19 天**

---

## Testing Strategy

### 單元測試 (Vitest)
- **工具函式測試**: `ts-ast-helpers.ts`、`report-formatter.ts`、`github-api-helpers.ts`
- **Zod Schema 測試**: 驗證 `HealthCheckReport`、`Issue`、`Recommendation` 型別
- **報告格式化測試**: 驗證 Markdown 表格、清單、程式碼區塊格式

### 整合測試 (Vitest)
- **完整健康檢查測試**: 執行 `run-health-check.ts` 並驗證報告格式
- **部分領域檢查測試**: 執行 `--domains architecture,api` 並驗證結果
- **GitHub Issues 匯出測試**: 使用測試 Repository 驗證 API 呼叫

### 端對端測試 (手動)
- 執行完整健康檢查並檢查報告內容
- 執行 GitHub Issues 匯出並驗證 Issue 格式
- 驗證 CI/CD 整合 (GitHub Actions)

---

## Deployment & Rollout

### Git Commit 策略
- **Phase 0**: `chore: 建立健康檢查系統基礎設施 (依賴、目錄、型別)`
- **Phase 1-7**: `feat: 實作 {領域} 健康檢查腳本` (每個領域一個 commit)
- **Phase 8**: `feat: 實作健康檢查報告產生器與 GitHub Issues 匯出`
- **Phase 9**: `feat: 實作主執行腳本與 CLI 介面`
- **Phase 10**: `test: 新增健康檢查系統單元測試與整合測試`
- **Final**: `docs: 更新健康檢查系統文件與 CI/CD 整合`

### 合併到 master 的條件
- ✅ 所有 Phase 完成 (Phase 0-10)
- ✅ TypeScript 型別檢查通過 (`pnpm type-check`)
- ✅ ESLint 檢查通過 (`pnpm lint`)
- ✅ 所有單元測試通過 (`pnpm test`)
- ✅ 完整健康檢查執行成功 (`pnpm health-check`)
- ✅ 產生的報告格式正確 (Markdown + JSON)
- ✅ GitHub Actions 工作流程執行成功
- ✅ 整體健康度評分 >= 80 分

---

## Risks & Mitigations

### 高風險項目

1. **TypeScript AST 分析複雜度**: ts-morph 學習曲線陡峭
   - **緩解**: Phase 0 建立完整的工具函式庫,Phase 1 先實作簡單案例再擴充

2. **Lighthouse CI 執行時間過長**: 效能測試可能超過 10 分鐘
   - **緩解**: 限制測試 URL 數量 (5 個)、使用 headless mode、考慮跳過 PWA 測試

3. **GitHub API Rate Limit**: 匯出大量 Issues 可能觸發 Rate Limit
   - **緩解**: 僅匯出 Critical + High 問題、加入 Rate Limit 檢查與等待邏輯

### 中風險項目

4. **並行執行協調複雜度**: 7 個領域並行執行需要正確處理錯誤
   - **緩解**: 使用 `Promise.allSettled()` 而非 `Promise.all()`、記錄失敗原因

5. **報告檔案大小過大**: JSON 報告可能超過 1 MB
   - **緩解**: 限制問題清單數量 (前 100 個)、壓縮報告檔案

6. **CI/CD 整合失敗率**: GitHub Actions 可能因環境問題失敗
   - **緩解**: 本地先完整測試、使用穩定的 Node.js 版本 (v22 LTS)

### 低風險項目

7. **Markdown 格式化錯誤**: 表格、清單可能格式不正確
   - **緩解**: 使用成熟的 Markdown 格式化函式庫、撰寫單元測試

8. **報告比較功能缺失**: 無法比較兩次健康檢查的差異
   - **緩解**: 未來擴充功能,使用 Git diff 比較 JSON 報告

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

## Future Enhancements

1. **Web Dashboard**: 建立網頁介面查看報告 (使用 Next.js App Router)
2. **歷史趨勢圖表**: 使用 Chart.js 顯示評分趨勢
3. **自動化修復**: 部分問題支援一鍵修復 (如格式化、加入 checkAuth)
4. **增量檢查**: 僅檢查變更的檔案 (使用 Git diff)
5. **Watch Mode**: 監看檔案變更並自動執行檢查
6. **Email Notifications**: Critical 問題自動發送 Email
7. **Slack Integration**: 發送報告摘要到 Slack

---

## Next Steps

1. **開始 Phase 0 實作**: 安裝依賴、建立目錄結構、定義型別
2. **建立工具函式庫**: `ts-ast-helpers.ts`、`report-formatter.ts`、`github-api-helpers.ts`
3. **實作第一個檢查腳本**: `check-architecture.ts` (驗證可行性)
4. **產生測試報告**: 執行 `check-architecture.ts` 並檢查報告格式
5. **逐步完成 Phase 1-10**: 依序實作所有領域檢查與報告產生

**Planning Command Complete** - 準備進入 Phase 0 實作 (安裝依賴、建立目錄結構、定義型別)
