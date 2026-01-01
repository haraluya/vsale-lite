# Tasks: 客戶與會員等級管理

**Feature**: 001-user-tier-management
**Generated**: 2026-01-01
**Input**: Design documents from `/specs/001-user-tier-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md

**Tests**: 本功能 **不包含** 測試任務,專注於 MVP 快速交付。測試可在後續迭代中加入。

**Organization**: 任務依使用者故事分組,確保每個故事可獨立實作與測試。

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行 (不同檔案,無相依性)
- **[Story]**: 所屬使用者故事 (US1, US2, US3, US4, US5)
- 所有描述包含明確檔案路徑

---

## Path Conventions

本專案採用 **Next.js 15 App Router** 架構,路徑規範:
- `app/`: Next.js 路由與頁面
- `components/`: React 元件
- `lib/`: 工具函式、Server Actions、Supabase Clients
- `types/`: TypeScript 型別定義
- `supabase/migrations/`: SQL Migration 檔案

---

## Phase 1: Setup (專案初始化)

**Purpose**: 建立專案基礎結構與依賴套件

- [X] T001 初始化 Next.js 15 專案,使用 TypeScript、Tailwind CSS、App Router
- [X] T002 [P] 安裝核心依賴: @supabase/supabase-js, @supabase/ssr, zod, zustand
- [X] T003 [P] 安裝 UI 依賴: lucide-react, class-variance-authority, clsx, tailwind-merge
- [X] T004 [P] 配置 Vitest 測試環境 (vitest.config.ts, vitest.setup.ts)
- [X] T005 配置 Tailwind CSS (tailwind.config.ts) 實作 Neo-Brutalism 設計系統
- [X] T006 [P] 建立專案目錄結構 (app/, components/, lib/, types/)
- [X] T007 [P] 設定環境變數範本 (.env.local.example)
- [X] T008 更新 package.json scripts (dev, build, test, type-check)

**Checkpoint**: 專案結構已建立,依賴已安裝,可開始基礎建設

---

## Phase 2: Foundational (核心基礎建設)

**Purpose**: 所有使用者故事的必要前置作業,必須 100% 完成才能開始任何故事

**⚠️ CRITICAL**: 此階段未完成前,禁止開始任何使用者故事的實作

### 2.1 Supabase 設定

- [X] T009 建立 Supabase 專案並取得 API Keys
- [X] T010 配置 .env.local 環境變數 (SUPABASE_URL, SUPABASE_ANON_KEY)
- [X] T011 執行 SQL Migration 建立資料庫 Schema (supabase/migrations/20260101_initial_schema.sql)
- [X] T012 插入預設會員等級資料 (零售、批發、經銷商)
- [X] T013 建立測試管理員帳號 (admin@test.com)
- [X] T014 產生 TypeScript 型別定義 (types/database.types.ts)

### 2.2 Supabase Client 工具

- [X] T015 [P] 實作 Supabase Browser Client (lib/supabase/client.ts)
- [X] T016 [P] 實作 Supabase Server Client (lib/supabase/server.ts)
- [X] T017 [P] 實作 Supabase Middleware Client (lib/supabase/middleware.ts)
- [X] T018 [P] 建立工具函式 cn() (lib/utils.ts)

### 2.3 基礎 UI 元件 (Neo-Brutalism)

- [X] T019 [P] 建立 Button 元件 (components/ui/button.tsx)
- [X] T020 [P] 建立 Input 元件 (components/ui/input.tsx)
- [X] T021 [P] 建立 Card 元件 (components/ui/card.tsx)
- [X] T022 [P] 建立 Label 元件 (components/ui/label.tsx)
- [X] T023 [P] 更新 globals.css (Neo-Brutalism 樣式類別)

### 2.4 驗證 Schema (Zod)

- [X] T024 [P] 建立登入驗證 Schema (lib/validations/auth.schema.ts)
- [X] T025 [P] 建立會員等級驗證 Schema (lib/validations/tier.schema.ts)
- [X] T026 [P] 建立客戶驗證 Schema (lib/validations/user.schema.ts)

### 2.5 型別定義

- [X] T027 建立共用型別定義 (types/index.ts) - Tier, Profile, AuthContext, ActionResult

**Checkpoint**: 基礎建設完成 ✅ 使用者故事實作可開始平行進行

---

## Phase 3: User Story 1 - 管理員建立會員等級制度 (Priority: P1) 🎯 MVP

**Goal**: 管理員可在後台建立和管理會員等級,設定等級名稱和排序順序

**Independent Test**: 管理員可建立至少 3 個會員等級,每個等級都能獨立查看、編輯和排序,不需要其他功能即可驗證完整性

### Implementation for US1

- [X] T028 [P] [US1] 建立 Server Action: getTiers() (lib/actions/tiers.ts)
- [X] T029 [P] [US1] 建立 Server Action: createTier() (lib/actions/tiers.ts)
- [X] T030 [P] [US1] 建立 Server Action: updateTier() (lib/actions/tiers.ts)
- [X] T031 [P] [US1] 建立 Server Action: deleteTier() (lib/actions/tiers.ts)
- [X] T032 [US1] 建立會員等級列表頁面 (app/(admin)/admin/tiers/page.tsx)
- [X] T033 [P] [US1] 建立 TierTable 元件 (components/admin/tier-table.tsx)
- [X] T034 [P] [US1] 建立 TierForm 元件 (components/admin/tier-form.tsx)
- [X] T035 [US1] 建立新增等級頁面 (app/(admin)/admin/tiers/new/page.tsx)
- [X] T036 [US1] 建立編輯等級頁面 (app/(admin)/admin/tiers/[id]/edit/page.tsx)
- [X] T037 [US1] 實作刪除等級保護邏輯 (檢查是否有客戶使用)
- [X] T038 [US1] 實作等級排序拖曳功能 (選用,可改為手動輸入 rank)

**Checkpoint**: 管理員可完整管理會員等級 (CRUD),可展示與驗證

---

## Phase 4: User Story 2 - 管理員快速開設客戶帳號 (Priority: P1)

**Goal**: 管理員在後台輸入客戶手機號碼、選擇會員等級,系統自動產生預設密碼並提供一鍵複製功能

**Independent Test**: 管理員可完整測試從建立客戶到取得登入資訊的流程,使用產生的帳密登入前台驗證功能正確性,不需要商品或訂單功能

### Implementation for US2

- [X] T039 [P] [US2] 建立 Server Action: createClient() (lib/actions/clients.ts)
- [X] T040 [P] [US2] 建立 Server Action: updateClient() (lib/actions/clients.ts)
- [X] T041 [P] [US2] 建立 Server Action: getClients() (lib/actions/clients.ts)
- [X] T042 [US2] 建立客戶列表頁面 (app/(admin)/admin/clients/page.tsx)
- [X] T043 [P] [US2] 建立 ClientTable 元件 (components/admin/client-table.tsx)
- [X] T044 [P] [US2] 建立 ClientForm 元件 (components/admin/client-form.tsx)
- [X] T045 [US2] 建立新增客戶頁面 (app/(admin)/admin/clients/new/page.tsx)
- [X] T046 [US2] 建立編輯客戶頁面 (app/(admin)/admin/clients/[id]/edit/page.tsx)
- [X] T047 [US2] 實作預設密碼生成邏輯 (手機號碼後六碼)
- [X] T048 [US2] 實作「複製帳密」功能 (含格式化訊息)
- [X] T049 [US2] 實作手機號碼驗證 (台灣格式: 09 開頭,10 碼)
- [X] T050 [US2] 實作手機號碼重複檢查

**Checkpoint**: 管理員可快速開戶並取得帳密,可使用產生的帳密測試登入

---

## Phase 5: User Story 3 - 客戶使用手機號碼登入前台 (Priority: P1)

**Goal**: 客戶使用手機號碼和預設密碼登入前台購物介面,登入成功後可看到自己所屬等級的商品價格

**Independent Test**: 可使用 Story 2 建立的測試帳號完整測試登入流程,驗證不同等級帳號登入後的權限隔離,不需要實際商品資料

### Implementation for US3

- [X] T051 [P] [US3] 建立 Server Action: loginWithPhone() (lib/actions/auth.ts)
- [X] T052 [P] [US3] 建立 Server Action: logout() (lib/actions/auth.ts)
- [X] T053 [P] [US3] 建立權限檢查 Helper: checkAuth() (lib/actions/helpers.ts)
- [X] T054 [US3] 建立前台登入頁面 (app/(auth)/login/page.tsx)
- [X] T055 [P] [US3] 建立 ClientLoginForm 元件 (components/auth/client-login-form.tsx)
- [X] T056 [US3] 實作登入驗證邏輯 (手機號碼格式 + 角色檢查)
- [X] T057 [US3] 實作登入成功後重導向至 /store
- [X] T058 [US3] 實作登入錯誤訊息顯示
- [X] T059 [US3] 建立前台佔位首頁 (app/(shop)/store/page.tsx) - 顯示「歡迎登入」訊息

**Checkpoint**: 客戶可使用手機號碼登入前台,驗證通過後可看到歡迎頁面

---

## Phase 6: User Story 4 - 管理員使用 Email 登入後台 (Priority: P1)

**Goal**: 管理員使用 Email 帳號登入後台管理介面,確保後台與前台登入方式完全隔離

**Independent Test**: 管理員可使用 Email 登入後台,驗證無法使用手機號碼登入後台,也無法使用 Email 登入前台,確認雙入口隔離機制

### Implementation for US4

- [X] T060 [P] [US4] 建立 Server Action: loginWithEmail() (lib/actions/auth.ts)
- [X] T061 [US4] 建立後台登入頁面 (app/(auth)/admin/login/page.tsx)
- [X] T062 [P] [US4] 建立 AdminLoginForm 元件 (components/auth/admin-login-form.tsx)
- [X] T063 [US4] 實作 Email 格式驗證
- [X] T064 [US4] 實作管理員角色檢查 (role === 'admin')
- [X] T065 [US4] 實作登入成功後重導向至 /admin/dashboard
- [X] T066 [US4] 建立後台 Dashboard 佔位頁面 (app/(admin)/admin/dashboard/page.tsx)
- [X] T067 [P] [US4] 建立後台 Layout (app/(admin)/admin/layout.tsx) - Sidebar 導航
- [X] T068 [US4] 實作前台登入頁面的 Email 格式阻擋提示

**Checkpoint**: 雙入口登入機制完成,前後台完全隔離

---

## Phase 7: User Story 5 - 管理員查看和管理客戶列表 (Priority: P2)

**Goal**: 管理員可查看所有客戶的基本資料、所屬等級、註冊時間等資訊,並能快速搜尋特定客戶進行編輯

**Independent Test**: 使用 Story 2 建立多個測試客戶後,可在列表中查看、搜尋、編輯這些客戶資料,驗證管理功能的完整性

### Implementation for US5

- [X] T069 [US5] 實作客戶列表分頁邏輯 (getClients 中的 limit/offset)
- [X] T070 [P] [US5] 建立搜尋輸入框元件 (components/admin/search-input.tsx)
- [X] T071 [US5] 實作客戶列表即時搜尋 (手機號碼關鍵字)
- [X] T072 [P] [US5] 建立會員等級篩選器元件 (components/admin/tier-filter.tsx)
- [X] T073 [US5] 實作依會員等級篩選客戶
- [X] T074 [P] [US5] 建立分頁元件 (components/admin/pagination.tsx)
- [X] T075 [US5] 整合分頁、搜尋、篩選功能至客戶列表頁面
- [X] T076 [US5] 實作客戶資料編輯功能 (會員等級變更、備註編輯)

**Checkpoint**: 管理員可高效管理大量客戶,所有查詢與編輯功能完整

---

## Phase 8: Middleware & Route Protection

**Purpose**: 實作路由保護,確保權限隔離

- [X] T077 建立 Next.js Middleware (middleware.ts)
- [X] T078 實作未登入重導向邏輯 (/store/* → /login)
- [X] T079 實作客戶訪問後台阻擋 (/admin/* → 403 或 /login)
- [X] T080 實作管理員全域訪問權限 (上帝視角)
- [X] T081 實作 Session 更新機制 (updateSession)
- [ ] T082 測試所有路由保護場景

**Checkpoint**: 權限控制完整,前後台完全隔離

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 優化與完善

- [X] T083 [P] 建立 Loading 狀態元件 (components/ui/loading.tsx)
- [X] T084 [P] 建立 Error 狀態元件 (components/ui/error.tsx)
- [X] T085 [P] 實作 Optimistic UI (客戶列表操作 - 使用 useTransition)
- [X] T086 實作表單送出後的 Loading 狀態 (LoadingSpinner in buttons)
- [X] T087 實作錯誤訊息統一顯示 (使用 ErrorInline 元件)
- [X] T088 [P] 程式碼格式化與 Linting 檢查

### 效能優化任務組 (Performance Optimization) - Optional

- [ ] T089a [P] 使用 Lighthouse 測試首頁載入效能 (目標: Mobile 4G < 2s) - Optional
- [ ] T089b [P] 優化登入 API 回應時間 (使用 Supabase 查詢優化,目標 < 500ms) - Optional
- [ ] T089c [P] 優化客戶搜尋查詢 (使用 PostgreSQL EXPLAIN ANALYZE,目標 < 300ms) - Optional
- [ ] T089d [P] 建立資料庫索引效能測試 (驗證查詢 p95 < 100ms) - Optional
- [ ] T089e [P] 實作 Next.js Image Optimization (app/(shop)/store 圖片最佳化) - Optional
- [ ] T089f [P] 實作 Dynamic Import / Lazy Loading (非關鍵 UI 元件延遲載入) - Optional
- [ ] T089g [P] 啟用 Next.js App Router Streaming (使用 Suspense 改善 TTFB) - Optional

### 最終驗證任務

- [X] T090 [P] TypeScript 型別檢查 (pnpm type-check)
- [X] T091 執行 pnpm build 驗證編譯成功
- [ ] T092 依照 quickstart.md 驗證開發環境設定流程 - Optional
- [X] T093 建立 README.md (專案說明與啟動指令)
- [ ] T094 [P] 截圖與示範資料準備 (用於展示) - Optional

**Checkpoint**: 功能完整,可進行 Demo 或部署

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS ALL USER STORIES
    ↓
┌───────┬───────┬───────┬───────┐
│  US1  │  US2  │  US3  │  US4  │  US5  ← 可平行開發
└───────┴───────┴───────┴───────┘
    ↓
Phase 8 (Middleware) ← 依賴 US3, US4 (登入功能)
    ↓
Phase 9 (Polish)
```

### User Story Dependencies

- **US1 (會員等級管理)**: 獨立,無依賴
- **US2 (快速開戶)**: 依賴 US1 (需要選擇會員等級)
- **US3 (客戶登入)**: 依賴 US2 (需要測試帳號)
- **US4 (管理員登入)**: 獨立,無依賴
- **US5 (客戶列表管理)**: 依賴 US2 (需要客戶資料)

**建議執行順序** (單人開發):
1. Phase 1 → Phase 2 (必須完成)
2. US1 → US4 → US2 → US3 → US5 (依優先級與依賴關係)
3. Phase 8 → Phase 9

**平行開發** (多人團隊):
- Developer A: US1 + US2
- Developer B: US4 + US3
- Developer C: US5 (需等待 US2 完成)

### Within Each User Story

- Server Actions 優先 (可平行)
- 頁面元件依賴 Server Actions
- 表單元件可與頁面平行開發
- 整合邏輯最後完成

### Parallel Opportunities

**Phase 2 平行機會** (10 個任務可同時執行):
- T015-T018: 4 個 Supabase Client
- T019-T023: 5 個 UI 元件
- T024-T026: 3 個 Zod Schema

**US1 平行機會** (4 個 Server Actions):
- T028: getTiers()
- T029: createTier()
- T030: updateTier()
- T031: deleteTier()

**US2 平行機會** (3 個 Server Actions):
- T039: createClient()
- T040: updateClient()
- T041: getClients()

**UI 元件平行開發**:
- 所有 components/ui/* 可平行
- 所有 components/admin/* 可平行
- 所有 components/auth/* 可平行

---

## Parallel Example: Phase 2 Foundational

```bash
# 同時啟動 4 個 Supabase Client 開發:
Task: "實作 Supabase Browser Client (lib/supabase/client.ts)"
Task: "實作 Supabase Server Client (lib/supabase/server.ts)"
Task: "實作 Supabase Middleware Client (lib/supabase/middleware.ts)"
Task: "建立工具函式 cn() (lib/utils.ts)"

# 同時啟動 5 個 UI 元件開發:
Task: "建立 Button 元件 (components/ui/button.tsx)"
Task: "建立 Input 元件 (components/ui/input.tsx)"
Task: "建立 Card 元件 (components/ui/card.tsx)"
Task: "建立 Label 元件 (components/ui/label.tsx)"
Task: "更新 globals.css (Neo-Brutalism 樣式類別)"
```

---

## Parallel Example: User Story 1

```bash
# 同時啟動所有 Server Actions:
Task: "建立 Server Action: getTiers() (lib/actions/tiers.ts)"
Task: "建立 Server Action: createTier() (lib/actions/tiers.ts)"
Task: "建立 Server Action: updateTier() (lib/actions/tiers.ts)"
Task: "建立 Server Action: deleteTier() (lib/actions/tiers.ts)"

# 同時啟動 UI 元件:
Task: "建立 TierTable 元件 (components/admin/tier-table.tsx)"
Task: "建立 TierForm 元件 (components/admin/tier-form.tsx)"
```

---

## Implementation Strategy

### MVP First (User Story 1-4 Only)

**最小可行產品範圍**:
1. ✅ Phase 1: Setup
2. ✅ Phase 2: Foundational (CRITICAL)
3. ✅ Phase 3: US1 - 會員等級管理
4. ✅ Phase 4: US2 - 快速開戶
5. ✅ Phase 5: US3 - 客戶登入
6. ✅ Phase 6: US4 - 管理員登入
7. ✅ Phase 8: Middleware (路由保護)

**驗證點**:
- 管理員可建立會員等級 ✓
- 管理員可建立客戶帳號 ✓
- 客戶可使用手機號碼登入 ✓
- 管理員可使用 Email 登入 ✓
- 前後台完全隔離 ✓

**可 Demo 功能**:
- 展示雙入口設計
- 展示快速開戶流程 (複製帳密功能)
- 展示權限隔離 (客戶無法訪問後台)

### Incremental Delivery

1. **Sprint 1** (Setup + Foundational):
   - 完成 Phase 1 + Phase 2 (T001-T027)
   - 產出: 專案環境就緒,資料庫建立完成

2. **Sprint 2** (會員等級 + 後台登入):
   - 完成 US1 + US4 (T028-T038, T060-T068)
   - 產出: 管理員可登入後台並管理會員等級

3. **Sprint 3** (客戶開戶 + 前台登入):
   - 完成 US2 + US3 (T039-T059)
   - 產出: 完整的開戶與登入流程 (MVP!)

4. **Sprint 4** (客戶列表 + 權限保護):
   - 完成 US5 + Phase 8 (T069-T082)
   - 產出: 完整的客戶管理功能

5. **Sprint 5** (優化):
   - 完成 Phase 9 (T083-T093)
   - 產出: Production-ready 版本

### Parallel Team Strategy

**3 人團隊建議分工**:

**Week 1: Setup + Foundational (全員協作)**
- Developer A: T001-T008 (專案設定)
- Developer B: T009-T018 (Supabase 設定)
- Developer C: T019-T027 (UI 元件與型別)

**Week 2: User Stories (平行開發)**
- Developer A: US1 (T028-T038) - 會員等級管理
- Developer B: US4 (T060-T068) - 後台登入
- Developer C: US2 (T039-T050) - 快速開戶

**Week 3: Integration**
- Developer A: US3 (T051-T059) - 前台登入
- Developer B: US5 (T069-T076) - 客戶列表管理
- Developer C: Phase 8 (T077-T082) - Middleware

**Week 4: Polish**
- 全員: Phase 9 (T083-T093) - 優化與驗證

---

## Task Summary

### Total Tasks: 99

**Phase Breakdown**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 19 tasks
- Phase 3 (US1): 11 tasks
- Phase 4 (US2): 12 tasks
- Phase 5 (US3): 9 tasks
- Phase 6 (US4): 9 tasks
- Phase 7 (US5): 8 tasks
- Phase 8 (Middleware): 6 tasks
- Phase 9 (Polish): 17 tasks
  - 效能優化子組: 7 tasks (T089a-g)

**Parallelizable Tasks**: 51 tasks (標記 [P])

**User Story Distribution**:
- US1: 11 tasks (會員等級管理)
- US2: 12 tasks (快速開戶)
- US3: 9 tasks (客戶登入)
- US4: 9 tasks (管理員登入)
- US5: 8 tasks (客戶列表管理)

**MVP Scope**: 54 tasks (Phase 1 + 2 + US1-4 + Phase 8)

---

## Notes

- **[P] 標記**: 表示任務可平行執行,無檔案衝突或依賴問題
- **[Story] 標籤**: 追蹤任務所屬使用者故事,便於驗證獨立完整性
- **檔案路徑**: 所有任務都包含明確的檔案位置,可直接執行
- **Checkpoint**: 每個階段都有驗證點,確保可獨立測試
- **建議**: 在每個 Checkpoint 提交 Git Commit,便於回滾與追蹤進度
- **測試策略**: 本版本專注 MVP 快速交付,測試可在後續加入
- **避免**: 模糊任務描述、同檔案衝突、跨故事強依賴
