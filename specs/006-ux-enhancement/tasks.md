# Tasks: UI/UX 優化與功能強化

**Feature**: 006-ux-enhancement
**Input**: Design documents from `/specs/006-ux-enhancement/`
**Prerequisites**: plan.md, FEATURE_PLAN.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema and Logo design

- [X] T001 執行 Migration 新增 products.tags 欄位 (supabase/migrations/20260110_add_product_tags.sql)
- [X] T002 執行 Migration 新增訂單刪除操作記錄 (supabase/migrations/20260111_add_order_delete_action.sql)
- [X] T003 [P] 安裝新增 npm 套件 (pnpm add xlsx @types/xlsx recharts)
- [X] T004 [P] 設計 Vsale Logo SVG 檔案 (public/logo.svg)
- [X] T005 [P] 設計 Logo 圖示版 SVG (public/logo-icon.svg)
- [X] T006 [P] 產生 Favicon (public/favicon.svg)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 建立 Logo 元件 (components/ui/logo.tsx)
- [X] T008 [P] 建立搜尋驗證 Schema (lib/validations/search.schema.ts)
- [X] T009 [P] 建立篩選驗證 Schema (lib/validations/filter.schema.ts)
- [X] T010 [P] 建立 Excel 匯入驗證 Schema (lib/validations/excel.schema.ts)
- [X] T011 [P] 建立標籤驗證 Schema (lib/validations/tags.schema.ts)
- [X] T012 [P] 建立 Excel 工具函式 (lib/utils/excel.ts)
- [X] T013 擴充 Tailwind 色彩設定新增品牌色 (tailwind.config.ts)

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 全域搜尋與即時篩選 (Priority: P0) 🎯 MVP

**Goal**: 客戶可在商店首頁快速搜尋商品，支援商品名稱與商品編號模糊查詢，即時顯示結果

**Independent Test**:
1. 訪問 `/store` 首頁
2. 在搜尋欄輸入「可樂」
3. 應在 300ms 內顯示包含「可樂」的商品列表
4. 搜尋欄清空後應回復所有商品

### Implementation for User Story 1

- [ ] T014 [P] [US1] 實作 searchProducts Server Action (lib/actions/products.ts)
- [ ] T015 [P] [US1] 建立搜尋欄元件 (components/ui/search-bar.tsx)
- [ ] T016 [US1] 整合搜尋欄到商店首頁 (app/(shop)/store/page.tsx)
- [ ] T017 [US1] 實作防抖機制 (300ms) 於搜尋欄元件
- [ ] T018 [US1] 新增載入指示器與無結果提示
- [ ] T019 [US1] 建立 products.name 索引優化搜尋效能 (Migration 或手動執行)

**Checkpoint**: 搜尋功能完整可用，可獨立測試

---

## Phase 4: User Story 2 - 類別與標籤快速篩選 (Priority: P0)

**Goal**: 客戶可透過類別與標籤快速篩選商品，支援多選組合篩選

**Independent Test**:
1. 訪問 `/store` 首頁
2. 點擊「飲料」類別按鈕
3. 應僅顯示飲料類別的商品
4. 再點擊「熱銷」標籤按鈕
5. 應顯示飲料且包含熱銷標籤的商品
6. 點擊「清除篩選」應回復所有商品

### Implementation for User Story 2

- [ ] T020 [P] [US2] 實作 filterProducts Server Action (lib/actions/products.ts)
- [ ] T021 [P] [US2] 建立篩選按鈕元件 (components/ui/filter-buttons.tsx)
- [ ] T022 [US2] 整合篩選按鈕到商店首頁 (app/(shop)/store/page.tsx)
- [ ] T023 [US2] 實作多選篩選邏輯 (支援類別與標籤組合)
- [ ] T024 [US2] 新增篩選結果數量即時顯示
- [ ] T025 [US2] 新增清除篩選按鈕
- [ ] T026 [US2] 實作篩選狀態持久化 (localStorage 或 URL query)

**Checkpoint**: 篩選功能完整可用，可獨立測試

---

## Phase 5: User Story 3 - 導航優化與回到首頁 (Priority: P0)

**Goal**: 客戶在瀏覽商品詳情時可快速回到首頁，提供麵包屑導航與固定置頂導航列

**Independent Test**:
1. 訪問任意商品詳情頁
2. 點擊導航列左側 Logo
3. 應返回 `/store` 首頁
4. 滾動頁面時導航列應保持置頂
5. 麵包屑應正確顯示當前位置

### Implementation for User Story 3

- [ ] T027 [P] [US3] 建立麵包屑導航元件 (components/shop/breadcrumb.tsx)
- [ ] T028 [US3] 整合 Logo 到前台 Layout (app/(shop)/layout.tsx)
- [ ] T029 [US3] 實作導航列固定置頂 (sticky positioning)
- [ ] T030 [US3] 實作麵包屑導航路徑邏輯
- [ ] T031 [US3] 手機版導航列精簡優化 (僅顯示 Logo 圖示)

**Checkpoint**: 導航功能完整可用，可獨立測試

---

## Phase 6: User Story 4 - 商品卡片視覺優化 (Priority: P1)

**Goal**: 客戶一眼就能看出商品庫存狀態與標籤，價格顯示更醒目

**Independent Test**:
1. 訪問 `/store` 首頁
2. 庫存 > 10 的商品應顯示綠色邊框
3. 0 < 庫存 <= 10 的商品應顯示黃色邊框
4. 庫存 <= 0 的商品應顯示紅色邊框與「可預購」提示
5. 商品標籤徽章應顯示於卡片左上角

### Implementation for User Story 4

- [ ] T032 [P] [US4] 建立標籤徽章元件 (components/ui/tag-badge.tsx)
- [ ] T033 [US4] 更新商品卡片元件新增庫存色彩邏輯 (components/shop/product-card.tsx)
- [ ] T034 [US4] 實作標籤徽章顯示邏輯 (最多顯示 2 個)
- [ ] T035 [US4] 優化價格顯示樣式 (原價刪除線 + 您的價格醒目)
- [ ] T036 [US4] 實作缺貨商品禁用加入購物車按鈕
- [ ] T037 [US4] 新增預購商品提示文字

**Checkpoint**: 商品卡片視覺優化完成，可獨立測試

---

## Phase 7: User Story 5 - 側邊欄視覺分類 (Priority: P1)

**Goal**: 管理員可快速找到對應的管理功能，側邊欄使用分隔線與標題區分功能模組

**Independent Test**:
1. 以管理員身分登入
2. 訪問 `/admin/dashboard`
3. 側邊欄應顯示分隔線與標題區分功能模組
4. 當前頁面應使用不同背景色高亮顯示

### Implementation for User Story 5

- [ ] T038 [US5] 更新後台側邊欄元件新增視覺分類 (components/admin/sidebar.tsx)
- [ ] T039 [US5] 實作功能模組分隔線與標題
- [ ] T040 [US5] 實作當前頁面高亮邏輯
- [ ] T041 [US5] 調整側邊欄色彩與間距符合設計規範

**Checkpoint**: 側邊欄視覺分類完成，可獨立測試

---

## Phase 8: User Story 6 - 客戶管理快速切換與搜尋 (Priority: P0)

**Goal**: 管理員可快速查看特定等級的客戶或搜尋特定客戶

**Independent Test**:
1. 以管理員身分登入
2. 訪問 `/admin/users`
3. 點擊「批發」等級按鈕
4. 應僅顯示批發等級的客戶
5. 在搜尋欄輸入手機號碼
6. 應即時顯示符合條件的客戶

### Implementation for User Story 6

- [ ] T042 [P] [US6] 實作 filterClients Server Action (lib/actions/clients.ts)
- [ ] T043 [P] [US6] 建立客戶快速篩選元件 (components/admin/client-filter.tsx)
- [ ] T044 [US6] 整合篩選元件到客戶管理頁面 (app/(admin)/admin/users/page.tsx)
- [ ] T045 [US6] 實作等級快速切換按鈕
- [ ] T046 [US6] 實作客戶搜尋欄 (支援手機號碼與姓名)
- [ ] T047 [US6] 新增搜尋結果高亮關鍵字功能
- [ ] T048 [US6] 新增篩選狀態清除按鈕與結果數量顯示

**Checkpoint**: 客戶管理快速切換與搜尋完成，可獨立測試

---

## Phase 9: User Story 7 - 客戶資料批次匯入/匯出 Excel (Priority: P0)

**Goal**: 管理員可批次匯入客戶資料或匯出當前篩選結果為 Excel

**Independent Test**:
1. 以管理員身分登入
2. 訪問 `/admin/users`
3. 點擊「匯出 Excel」按鈕
4. 應下載包含當前客戶資料的 .xlsx 檔案
5. 上傳包含客戶資料的 Excel 檔案
6. 應顯示匯入進度與結果

### Implementation for User Story 7

- [ ] T049 [P] [US7] 實作 exportClients Server Action (lib/actions/clients.ts)
- [ ] T050 [P] [US7] 實作 importClients Server Action (lib/actions/clients.ts)
- [ ] T051 [P] [US7] 實作 downloadClientTemplate Server Action (lib/actions/clients.ts)
- [ ] T052 [P] [US7] 建立 Excel 匯出元件 (components/admin/excel-export.tsx)
- [ ] T053 [P] [US7] 建立 Excel 匯入元件 (components/admin/excel-import.tsx)
- [ ] T054 [US7] 整合匯出元件到客戶管理頁面 (app/(admin)/admin/users/page.tsx)
- [ ] T055 [US7] 整合匯入元件到客戶管理頁面 (app/(admin)/admin/users/page.tsx)
- [ ] T056 [US7] 實作匯入進度顯示與錯誤報告
- [ ] T057 [US7] 實作試算模式 (dry_run) 驗證功能
- [ ] T058 [US7] 新增範本下載按鈕

**Checkpoint**: Excel 匯入/匯出功能完整可用，可獨立測試

---

## Phase 10: User Story 8 - 訂單刪除功能 (Priority: P1)

**Goal**: 管理員可刪除測試訂單或錯誤建立的 pending 狀態訂單

**Independent Test**:
1. 以管理員身分登入
2. 訪問訂單詳情頁 (pending 狀態訂單)
3. 點擊「刪除訂單」按鈕
4. 應顯示確認對話框並顯示訂單編號
5. 確認後訂單應被刪除並記錄於操作歷史

### Implementation for User Story 8

- [ ] T059 [US8] 實作 deleteOrder Server Action (lib/actions/orders.ts)
- [ ] T060 [US8] 更新訂單詳情頁新增刪除按鈕 (app/(admin)/admin/orders/[id]/page.tsx)
- [ ] T061 [US8] 實作刪除確認對話框元件
- [ ] T062 [US8] 實作訂單狀態檢查邏輯 (僅允許刪除 pending)
- [ ] T063 [US8] 實作刪除操作記錄於 order_timelines
- [ ] T064 [US8] 實作刪除成功後導向訂單列表

**Checkpoint**: 訂單刪除功能完整可用，可獨立測試

---

## Phase 11: User Story 9 - 商品標籤系統 (Priority: P0)

**Goal**: 管理員可為商品新增標籤，支援批次設定，前台客戶可透過標籤篩選商品

**Independent Test**:
1. 以管理員身分登入
2. 訪問 `/admin/products`
3. 編輯商品新增標籤「熱銷」
4. 批次選擇多個商品新增標籤「促銷」
5. 前台訪問 `/store` 應可透過標籤篩選商品

### Implementation for User Story 9

- [ ] T065 [P] [US9] 實作 updateProductTags Server Action (lib/actions/tags.ts)
- [ ] T066 [P] [US9] 實作 batchUpdateProductTags Server Action (lib/actions/tags.ts)
- [ ] T067 [P] [US9] 實作 getAvailableTags Server Action (lib/actions/tags.ts)
- [ ] T068 [P] [US9] 建立標籤管理元件 (components/admin/tag-manager.tsx)
- [ ] T069 [US9] 整合標籤管理到商品管理頁面 (app/(admin)/admin/products/page.tsx)
- [ ] T070 [US9] 實作商品編輯頁面標籤輸入框
- [ ] T071 [US9] 實作批次標籤設定功能 (選擇多個商品)
- [ ] T072 [US9] 實作標籤自動完成與常用標籤選擇
- [ ] T073 [US9] 驗證標籤數量與長度約束 (最多 5 個，2-8 字元)

**Checkpoint**: 商品標籤系統完整可用，可獨立測試

---

## Phase 12: User Story 10 - 儀表板視覺化 (Priority: P2)

**Goal**: 管理員可在首頁快速了解業務概況，包含訂單數、營收、庫存警示

**Independent Test**:
1. 以管理員身分登入
2. 訪問 `/admin/dashboard`
3. 應顯示今日與本月訂單數
4. 應顯示今日與本月營收
5. 應顯示庫存警示商品數與待處理訂單數
6. 圖表應正確顯示近 7 日訂單趨勢

### Implementation for User Story 10

- [ ] T074 [P] [US10] 實作 getDashboardStats Server Action (lib/actions/dashboard.ts)
- [ ] T075 [P] [US10] 建立儀表板卡片元件 (components/admin/dashboard-card.tsx)
- [ ] T076 [P] [US10] 建立訂單趨勢圖表元件 (components/admin/order-trend-chart.tsx)
- [ ] T077 [US10] 更新儀表板頁面整合指標卡片 (app/(admin)/admin/dashboard/page.tsx)
- [ ] T078 [US10] 實作今日/本月訂單數查詢
- [ ] T079 [US10] 實作今日/本月營收查詢
- [ ] T080 [US10] 實作庫存警示商品數查詢
- [ ] T081 [US10] 實作待處理訂單數查詢
- [ ] T082 [US10] 實作近 7 日訂單趨勢圖表
- [ ] T083 [US10] 實作指標卡片點擊跳轉詳細頁面

**Checkpoint**: 儀表板視覺化完整可用，可獨立測試

---

## Phase 13: User Story 11 - Vsale Logo 設計與整合 (Priority: P1)

**Goal**: 系統建立專業的品牌識別，所有頁面統一顯示 Logo

**Independent Test**:
1. 訪問前台 `/store`
2. 導航列應顯示 Vsale Logo
3. 訪問後台 `/admin/dashboard`
4. 側邊欄頂部應顯示 Logo
5. 訪問登入頁面
6. 應顯示完整 Logo
7. 瀏覽器分頁應顯示 Favicon

### Implementation for User Story 11

- [ ] T084 [US11] 整合 Logo 到前台導航列 (app/(shop)/layout.tsx)
- [ ] T085 [US11] 整合 Logo 到後台側邊欄 (app/(admin)/admin/layout.tsx)
- [ ] T086 [US11] 整合 Logo 到前台登入頁面 (app/(auth)/login/page.tsx)
- [ ] T087 [US11] 整合 Logo 到後台登入頁面 (app/(auth)/admin/login/page.tsx)
- [ ] T088 [US11] 設定 Favicon 於 HTML head
- [ ] T089 [US11] 手機版導航列僅顯示 Logo 圖示

**Checkpoint**: Logo 整合完成，所有頁面統一顯示

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T090 [P] 檢查所有 UI 元件符合 Neo-Brutalism 設計風格
- [ ] T091 [P] 驗證色彩對比符合無障礙標準 (WCAG AA)
- [ ] T092 [P] 優化行動裝置響應式設計 (前台)
- [ ] T093 [P] 優化桌面裝置版面 (後台)
- [ ] T094 程式碼清理與重構 (移除未使用的匯入與變數)
- [ ] T095 執行型別檢查 (pnpm type-check)
- [ ] T096 執行建置檢查 (pnpm build)
- [ ] T097 驗證搜尋響應時間 < 300ms
- [ ] T098 驗證篩選切換 < 200ms
- [ ] T099 驗證 Excel 匯入 100 筆 < 5s
- [ ] T100 執行 quickstart.md 驗證流程
- [ ] T101 更新 CLAUDE.md 新增 006 功能概述
- [ ] T102 準備 Git Commit 訊息 (繁體中文)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-13)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P0 → P1 → P2)
- **Polish (Phase 14)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P0)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US2 (P0)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US3 (P0)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US4 (P1)**: 依賴 US2 (需要標籤徽章元件)
- **US5 (P1)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US6 (P0)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US7 (P0)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US8 (P1)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US9 (P0)**: 可在 Foundational 完成後開始 - 前台篩選功能依賴 US2
- **US10 (P2)**: 可在 Foundational 完成後開始 - 無其他故事依賴
- **US11 (P1)**: 依賴 Phase 1 T004-T006 (Logo 設計)

### Within Each User Story

- Models/Schemas before Server Actions
- Server Actions before UI Components
- UI Components before Page Integration
- Core implementation before optimization
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, P0 user stories can start in parallel (if team capacity allows)
- All Server Actions within a story marked [P] can run in parallel
- All UI Components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch both tasks for User Story 1 together:
Task T014: "實作 searchProducts Server Action (lib/actions/products.ts)"
Task T015: "建立搜尋欄元件 (components/ui/search-bar.tsx)"
```

---

## Implementation Strategy

### MVP First (P0 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete P0 Stories: US1, US2, US3, US6, US7, US9
4. **STOP and VALIDATE**: Test all P0 stories independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (搜尋) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (篩選) → Test independently → Deploy/Demo
4. Add US3 (導航) → Test independently → Deploy/Demo
5. Add US6 (客戶管理) → Test independently → Deploy/Demo
6. Add US7 (Excel) → Test independently → Deploy/Demo
7. Add US9 (標籤) → Test independently → Deploy/Demo
8. Add US4, US5, US8, US11 (P1 stories) → Test → Deploy
9. Add US10 (P2 story) → Test → Deploy
10. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 + US2 (搜尋與篩選)
   - Developer B: US6 + US7 (客戶管理與 Excel)
   - Developer C: US9 + US11 (標籤與 Logo)
3. Stories complete and integrate independently

---

## Progress Summary

**Total Tasks**: 102
**By Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 7 tasks
- Phase 3 (US1): 6 tasks
- Phase 4 (US2): 7 tasks
- Phase 5 (US3): 5 tasks
- Phase 6 (US4): 6 tasks
- Phase 7 (US5): 4 tasks
- Phase 8 (US6): 7 tasks
- Phase 9 (US7): 10 tasks
- Phase 10 (US8): 6 tasks
- Phase 11 (US9): 9 tasks
- Phase 12 (US10): 10 tasks
- Phase 13 (US11): 6 tasks
- Phase 14 (Polish): 13 tasks

**By Priority**:
- P0 (必須): US1, US2, US3, US6, US7, US9 - 45 tasks
- P1 (重要): US4, US5, US8, US11 - 25 tasks
- P2 (Nice to Have): US10 - 10 tasks
- Setup + Foundational: 13 tasks
- Polish: 13 tasks

**Parallel Opportunities**: 32 tasks marked [P] can run in parallel within their phases

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1-US11)
- Each user story should be independently completable and testable
- Commit after each task or logical group (使用繁體中文 commit message)
- Stop at any checkpoint to validate story independently
- 部署前執行 `pnpm type-check` 與 `pnpm build`
- 部署到 Firebase 使用 `firebase deploy --only hosting`
- 使用 `supabase db push` 推送 Migrations 到雲端資料庫

---

**Generated**: 2026-01-04
**Feature**: 006-ux-enhancement
**Status**: Ready for implementation
