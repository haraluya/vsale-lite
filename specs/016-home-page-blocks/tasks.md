# Implementation Tasks: 首頁廣告區塊系統

**Feature**: 016-home-page-blocks | **Generated**: 2026-01-13 | **Status**: Ready for Implementation

---

## Task Summary

| Phase | Description | Tasks | Completed |
|-------|-------------|-------|-----------|
| **Phase 1** | Setup & Infrastructure | 6 | 0/6 |
| **Phase 2** | Foundational (Blocking Prerequisites) | 8 | 0/8 |
| **Phase 3** | US1 - 前台路由與導覽切換 | 7 | 0/7 |
| **Phase 4** | US2 - 圖片輪播區塊 | 5 | 0/5 |
| **Phase 5** | US3 - 商品展示區塊 | 5 | 0/5 |
| **Phase 6** | US4 - 文字區塊 | 3 | 0/3 |
| **Phase 7** | US5 - 管理員建立與管理首頁廣告區塊 | 12 | 0/12 |
| **Phase 8** | US6 - 管理員調整區塊排序 | 4 | 0/4 |
| **Phase 9** | US7 - 圖片清理與資料一致性 | 7 | 0/7 |
| **Phase 10** | US8 - 後台廣告管理整合與 Tab 切換 | 3 | 0/3 |
| **Phase 11** | Polish & Quality Assurance | 8 | 0/8 |
| **Total** | | **68** | **0/68** |

---

## Phase 1: Setup & Infrastructure

**Goal**: 初始化專案環境，建立資料庫結構基礎。

**Prerequisites**: None (blocking phase for all user stories)

### Tasks

- [ ] T000 [CRITICAL] Execute Migration safety check: run `pnpm db:migrate:preview` to preview changes, confirm no destructive operations (DROP TABLE/COLUMN), and execute backup if in production environment (follows Database Safety Protocol from CLAUDE.md)
- [ ] T001 Create database migration file at supabase/migrations/20260113_home_page_blocks.sql with table schema, indexes, triggers, RLS policies, and comments
- [ ] T002 Execute database migration using pnpm db:migrate and verify table creation in Supabase dashboard (verify home_page_blocks table exists, RLS enabled, indexes created)
- [ ] T003 [P] Update types/index.ts to add BlockType, ImageCarouselConfig, ProductDisplayConfig, TextBlockConfig, and HomePageBlock type definitions
- [ ] T004 [P] Create lib/validations/home-block.schema.ts with Zod schemas for all three block types using discriminated union
- [ ] T004a [P] Verify JSONB Config default values and NULL handling logic for all three block types (optional fields must use .optional() or .nullable(), required fields must have default values documented)

**Acceptance Criteria**:
- ✅ home_page_blocks table exists with all columns and constraints
- ✅ Indexes idx_home_blocks_active_sort and idx_home_blocks_type are created
- ✅ RLS policies are enabled and working correctly
- ✅ TypeScript types compile without errors
- ✅ Zod schemas validate all three block types correctly
- ✅ JSONB Config default values documented and tested (e.g., auto_play defaults to true, interval_ms defaults to 5000)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: 建立核心 Server Actions 與工具函式，所有使用者故事依賴此階段。

**Prerequisites**: Phase 1 (Setup)

**Must Complete Before**: US1, US2, US3, US4, US5, US6, US7, US8 (所有使用者故事)

### Tasks

- [ ] T005 Create lib/actions/home-blocks.ts with getActiveHomeBlocks() Server Action for frontend query (returns active blocks sorted by sort_order)
- [ ] T006 [P] Implement getAllHomeBlocks() Server Action in lib/actions/home-blocks.ts for admin query (includes checkAuth('admin'))
- [ ] T007 [P] Implement getHomeBlockById(blockId: string) Server Action in lib/actions/home-blocks.ts with admin permission check
- [ ] T008 Implement createHomeBlock(input: CreateHomeBlockInput) Server Action in lib/actions/home-blocks.ts with Zod validation and revalidatePath
- [ ] T009 Implement updateHomeBlock(input: UpdateHomeBlockInput) Server Action in lib/actions/home-blocks.ts with partial update support
- [ ] T010 Implement deleteHomeBlock(blockId: string) Server Action in lib/actions/home-blocks.ts (image cleanup will be added in Phase 9)
- [ ] T011 [P] Implement moveBlockUp(blockId: string) Server Action in lib/actions/home-blocks.ts to swap sort_order with previous block
- [ ] T012 [P] Implement moveBlockDown(blockId: string) Server Action in lib/actions/home-blocks.ts to swap sort_order with next block

**Acceptance Criteria**:
- ✅ All Server Actions return ActionResult<T> format
- ✅ Admin-only actions include checkAuth('admin') and throw error for non-admin users
- ✅ Zod validation correctly discriminates between block types
- ✅ CRUD operations successfully create, read, update, and delete blocks
- ✅ Sort order swap logic works correctly for moveBlockUp/moveBlockDown

---

## Phase 3: US1 - 前台路由與導覽切換

**Goal**: 客戶可以在「首頁」和「商品頁」之間切換，首頁顯示廣告區塊，商品頁顯示系列與商品列表。

**Priority**: P0

**Prerequisites**: Phase 1, Phase 2

**Independent Test**: 客戶可以從 `/store` 自動導向首頁，使用 Segment Control 切換到商品頁，兩個頁面都顯示歡迎字樣與會員等級。

### Tasks

- [ ] T013 [US1] Create app/(shop)/store/home/page.tsx as homepage container (placeholder for blocks, will be populated in Phase 4-6)
- [ ] T014 [US1] Create app/(shop)/store/products/page.tsx by moving existing /store/page.tsx content (series and product list)
- [ ] T015 [US1] Update app/(shop)/store/page.tsx to redirect('/store/home') with permanent redirect (301 status code)
- [ ] T016 [US1] Create components/shop/home-blocks/SegmentControl.tsx with two buttons ('首頁', '商品'), using usePathname() for active state highlighting
- [ ] T017 [US1] Update SegmentControl.tsx to ensure touch target >= 44px x 44px with min-h-[44px] and Neo-Brutalism active state (green bg + shadow)
- [ ] T018 [US1] Update app/(shop)/layout.tsx to add SegmentControl component and welcome message "{userName} 您好！會員等級: {tierName}"
- [ ] T019 [US1] Test route redirection, segment control switching, and welcome message display across mobile and desktop viewports

**Acceptance Criteria**:
- ✅ Accessing /store automatically redirects to /store/home
- ✅ Segment Control switches between /store/home and /store/products
- ✅ Current page button highlights with green background and Neo-Brutalism shadow
- ✅ Welcome message displays user name and tier name correctly
- ✅ Touch targets meet WCAG 2.1 AA standards (>= 44px)

---

## Phase 4: US2 - 圖片輪播區塊

**Goal**: 客戶在首頁看到圖片輪播區塊，可以自動播放或手動切換圖片，點擊圖片可跳轉到指定系列頁面。

**Priority**: P0

**Prerequisites**: Phase 1, Phase 2, Phase 3 (US1 - 前台路由架構)

**Independent Test**: 客戶可以看到自動輪播的廣告圖片，點擊圖片下方的指示器切換圖片，點擊圖片本身跳轉到指定系列。

### Tasks

- [ ] T020 [US2] Create components/shop/home-blocks/ImageCarousel.tsx with auto-play logic using useEffect and setInterval (default 5s interval)
- [ ] T021 [US2] Implement manual switch with indicator dots in ImageCarousel.tsx (clicking dot switches image and resets auto-play timer)
- [ ] T022 [US2] Add series link support in ImageCarousel.tsx (onClick redirects to /store/products/series/{seriesId} if series_id exists)
- [ ] T023 [US2] Apply responsive image height in ImageCarousel.tsx (h-64 on mobile, h-96 on desktop) using Next.js Image with sizes attribute
- [ ] T024 [US2] Apply Neo-Brutalism styling to ImageCarousel.tsx (border-2 md:border-3, shadow-neo-sm md:shadow-neo, rounded-none)

**Acceptance Criteria**:
- ✅ Images auto-play with configurable interval (default 5 seconds)
- ✅ Clicking indicator dots switches images and resets timer
- ✅ Clicking image with series_id redirects to series page
- ✅ Clicking image without series_id does nothing (pure display)
- ✅ Responsive design works on mobile (256px) and desktop (384px)
- ✅ Neo-Brutalism styling matches design system

---

## Phase 5: US3 - 商品展示區塊

**Goal**: 客戶在首頁看到商品展示區塊，顯示指定系列或標籤的商品卡片，可左右滑動查看更多商品，點擊商品卡片跳轉到商品詳情頁。

**Priority**: P0

**Prerequisites**: Phase 1, Phase 2, Phase 3 (US1 - 前台路由架構)

**Independent Test**: 客戶可以看到商品卡片網格，左右滑動查看更多商品，點擊商品卡片跳轉到商品詳情頁。

### Tasks

- [ ] T025 [US3] Implement getProductsByBlockConfig(config: ProductDisplayConfig) Server Action in lib/actions/home-blocks.ts with series and tag filtering (AND logic)
- [ ] T026 [US3] Create components/shop/home-blocks/ProductDisplay.tsx calling getProductsByBlockConfig() and using ProductWithPriceCard component
- [ ] T027 [US3] Implement responsive grid in ProductDisplay.tsx (grid-cols-2 on mobile, grid-cols-3 on desktop) with CSS scroll-snap for horizontal scrolling
- [ ] T028 [US3] Add scroll hint "← 左右滑動查看更多 →" in ProductDisplay.tsx when products exceed one row (conditionally rendered)
- [ ] T029 [US3] Integrate tier-based pricing in ProductDisplay.tsx by passing user tier to getProductsByBlockConfig() (shows "價格未設定" if no tier price)

**Acceptance Criteria**:
- ✅ Product query filters by series_ids AND tag_ids correctly
- ✅ Responsive grid displays 2 products per row on mobile, 3 on desktop
- ✅ Horizontal scroll works smoothly with CSS scroll-snap
- ✅ Scroll hint appears only when products exceed one row
- ✅ Tier-based pricing displays correctly for each product
- ✅ Clicking product card redirects to /store/products/{productId}

---

## Phase 6: US4 - 文字區塊

**Goal**: 客戶在首頁看到文字區塊，顯示管理員自訂的宣傳文字，支援自訂字體大小與顏色。

**Priority**: P1

**Prerequisites**: Phase 1, Phase 2, Phase 3 (US1 - 前台路由架構)

**Independent Test**: 客戶可以看到自訂字體大小與顏色的文字區塊。

### Tasks

- [ ] T030 [US4] Create components/shop/home-blocks/TextBlock.tsx displaying config.content with dynamic font size and color
- [ ] T031 [US4] Implement responsive width in TextBlock.tsx (w-full, padding adjusts to viewport) with Neo-Brutalism styling
- [ ] T032 [US4] Add support for 7 font sizes (12px, 16px, 20px, 24px, 32px, 40px, 48px) using Tailwind text-* classes

**Acceptance Criteria**:
- ✅ Text block displays custom content, font size, and color correctly
- ✅ Width adjusts responsively to screen width without overflow
- ✅ All 7 font sizes render correctly (12px to 48px)
- ✅ Hex color (#RRGGBB) applies correctly to text
- ✅ Neo-Brutalism styling matches design system

---

## Phase 7: US5 - 管理員建立與管理首頁廣告區塊

**Goal**: 管理員在後台建立首頁廣告區塊，選擇區塊類型（圖片輪播、商品展示、文字區塊），設定對應參數，並可查看、編輯、刪除區塊。

**Priority**: P0

**Prerequisites**: Phase 1, Phase 2

**Independent Test**: 管理員可以建立各種類型的區塊，設定所有參數，保存後在區塊列表中看到新建立的區塊，並可編輯或刪除。

### Tasks

- [ ] T033 [US5] Create components/admin/home-blocks/BlockTypeSelector.tsx with dropdown for 3 block types (image_carousel, product_display, text_block)
- [ ] T034 [US5] Create components/admin/home-blocks/ImageUploadMultiple.tsx supporting up to 5 images with preview and delete functionality
- [ ] T035 [US5] Implement uploadBlockImage(blockId, index, file) Server Action in lib/actions/home-blocks.ts with file validation (JPG/PNG/WebP, max 5MB)
- [ ] T036 [US5] Update uploadBlockImage() to delete old images at all extensions (.jpg/.png/.webp) before uploading new image
- [ ] T037 [US5] Create components/admin/home-blocks/HomeBlockForm.tsx with block name, type selector, and is_active toggle
- [ ] T038 [US5] Add conditional fields to HomeBlockForm.tsx for image_carousel type (ImageUploadMultiple, auto_play toggle, interval_ms input)
- [ ] T039 [US5] Add conditional fields to HomeBlockForm.tsx for product_display type (series dropdown, tags dropdown, max_items input)
- [ ] T040 [US5] Add conditional fields to HomeBlockForm.tsx for text_block type (content textarea, font_size dropdown, color picker)
- [ ] T041 [US5] Implement form submission in HomeBlockForm.tsx calling createHomeBlock() or updateHomeBlock() with Zod validation and useConfirm for delete
- [ ] T042 [US5] Create components/admin/home-blocks/HomeBlockCard.tsx displaying block thumbnail (first image for carousel), name, type, and edit/delete buttons
- [ ] T043 [US5] Create components/admin/home-blocks/HomeBlockList.tsx calling getAllHomeBlocks() and rendering HomeBlockCard components with "新增區塊" button
- [ ] T044 [US5] Test admin can create all 3 block types, edit parameters, upload images, and delete blocks with confirmation dialog

**Acceptance Criteria**:
- ✅ Admin can select block type and see corresponding form fields
- ✅ Image upload supports up to 5 images with preview
- ✅ File validation rejects invalid formats or oversized files (>5MB)
- ✅ Form submission creates/updates blocks correctly with Zod validation
- ✅ Block list displays all blocks (including inactive) with thumbnails
- ✅ Edit and delete buttons work correctly with unified dialog confirmation
- ✅ New block appears at top of list after creation

---

## Phase 8: US6 - 管理員調整區塊排序

**Goal**: 管理員在後台調整首頁廣告區塊的顯示順序，前台按照管理員設定的順序顯示區塊。

**Priority**: P0

**Prerequisites**: Phase 1, Phase 2, Phase 7 (US5 - 區塊管理)

**Independent Test**: 管理員可以使用上移/下移按鈕調整區塊順序，前台立即反映順序變更。

### Tasks

- [ ] T045 [US6] Add "向上移動" and "向下移動" buttons to components/admin/home-blocks/HomeBlockCard.tsx
- [ ] T046 [US6] Implement button click handlers in HomeBlockCard.tsx calling moveBlockUp() or moveBlockDown() Server Actions
- [ ] T047 [US6] Disable "向上移動" button for first block and "向下移動" button for last block (gray color, cursor-not-allowed)
- [ ] T048 [US6] Test sort order changes reflect immediately in admin list and frontend homepage after revalidation

**Acceptance Criteria**:
- ✅ "向上移動" button swaps current block with previous block
- ✅ "向下移動" button swaps current block with next block
- ✅ First block's "向上移動" button is disabled (gray, unclickable)
- ✅ Last block's "向下移動" button is disabled (gray, unclickable)
- ✅ Frontend homepage reflects sort order changes immediately

---

## Phase 9: US7 - 圖片清理與資料一致性

**Goal**: 系統在刪除或更換區塊圖片時，自動清理 Supabase Storage 中的舊圖片檔案，避免孤兒檔案殘留。

**Priority**: P0

**Prerequisites**: Phase 1, Phase 2, Phase 7 (US5 - 區塊管理)

**Independent Test**: 管理員刪除區塊或更換圖片後，Supabase Storage 中的舊圖片檔案被自動刪除。

### Tasks

- [ ] T049 [US7] Create lib/utils/block-image-cleanup.ts with deleteBlockImages(blockId, scenario) function supporting 4 cleanup scenarios
- [ ] T050 [US7] Implement Scenario 1 in deleteBlockImages(): delete entire block directory when deleting block (home-page-blocks/{blockId}/*)
- [ ] T051 [US7] Implement Scenario 2 in deleteBlockImages(): delete specific index image when replacing (home-page-blocks/{blockId}/image-{index}.*)
- [ ] T052 [US7] Implement Scenario 3 in deleteBlockImages(): delete excess images when reducing image count (delete image-{oldCount-1} to image-{newCount})
- [ ] T053 [US7] Implement Scenario 4 in deleteBlockImages(): delete all images when changing block type from image_carousel to non-image type
- [ ] T054 [US7] Add error tolerance to deleteBlockImages(): log warnings on failure but do not throw errors (prevent blocking main flow)
- [ ] T054a [US7] Manually test image deletion failure scenarios (disconnect network during deletion, simulate permission error) and verify warning logs appear in console without blocking main operations

**Acceptance Criteria**:
- ✅ Deleting block removes all images from Storage
- ✅ Replacing image deletes old image at all extensions (.jpg/.png/.webp)
- ✅ Reducing image count deletes excess images
- ✅ Changing block type deletes images if new type is not image_carousel
- ✅ Storage deletion failures log warnings but do not block operations
- ✅ Cleanup success rate > 95% in manual testing
- ✅ Failure scenarios (network error, permission error) handled gracefully with console.warn() output

---

## Phase 10: US8 - 後台廣告管理整合與 Tab 切換

**Goal**: 管理員在後台「廣告管理」頁面使用 Tab 切換器，切換「商品頁廣告」和「首頁廣告」兩個功能區域。

**Priority**: P1

**Prerequisites**: Phase 1, Phase 2, Phase 7 (US5 - 區塊管理)

**Independent Test**: 管理員可以在「商品頁廣告」和「首頁廣告」之間自由切換，兩個功能互不干擾。

### Tasks

- [ ] T055 [US8] Create components/admin/announcements/TabSwitcher.tsx with two tabs ('商品頁廣告', '首頁廣告') using URL query params ?tab=products|home
- [ ] T056 [US8] Update app/(admin)/admin/announcements/page.tsx to integrate TabSwitcher and conditionally render announcement list or HomeBlockList based on tab
- [ ] T057 [US8] Test tab switching preserves state, URL query params update correctly, and both features work independently

**Acceptance Criteria**:
- ✅ Tab switcher displays "商品頁廣告" and "首頁廣告" tabs
- ✅ Clicking tab updates URL query param (?tab=products or ?tab=home)
- ✅ Active tab highlights with green background and Neo-Brutalism shadow
- ✅ Both features (announcements and home blocks) work independently
- ✅ Switching tabs does not lose unsaved changes in forms

---

## Phase 11: Polish & Quality Assurance

**Goal**: 完成整體系統優化、測試與文件撰寫，確保所有功能符合品質標準。

**Prerequisites**: Phase 3-10 (All User Stories)

### Tasks

- [ ] T058 Create components/shop/home-blocks/BlockRenderer.tsx with switch statement rendering ImageCarousel, ProductDisplay, or TextBlock based on block_type
- [ ] T059 Update app/(shop)/store/home/page.tsx to call getActiveHomeBlocks() and use BlockRenderer to render all blocks in sort_order
- [ ] T060 Optimize ImageCarousel.tsx with React.memo() to prevent unnecessary re-renders
- [ ] T061 Add priority attribute to Next.js Image in ImageCarousel.tsx for first image (above-the-fold optimization)
- [ ] T062 [P] Add error handling to all Server Actions with try-catch blocks and meaningful error messages
- [ ] T063 [P] Add loading states to admin forms using isSubmitting flag and disabled buttons during submission
- [ ] T064 Run TypeScript type check (pnpm type-check) and ESLint (pnpm lint) ensuring 0 errors
- [ ] T065 Update specs/016-home-page-blocks/quickstart.md with usage examples, troubleshooting, and best practices

**Acceptance Criteria**:
- ✅ Homepage loads in < 2 seconds on Mobile 4G
- ✅ Product query responds in < 300ms
- ✅ Image carousel switches in < 100ms
- ✅ TypeScript type check passes with 0 errors
- ✅ ESLint check passes with 0 errors
- ✅ All forms show loading states during submission
- ✅ Error messages are user-friendly and actionable
- ✅ Quickstart guide is complete and accurate

---

## Dependencies & Order

### User Story Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundational)
                      ↓
                  Phase 3 (US1)
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Phase 4 (US2) Phase 5 (US3) Phase 6 (US4)
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                 Phase 7 (US5) ← Core CRUD
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Phase 8 (US6) Phase 9 (US7) Phase 10 (US8)
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                 Phase 11 (Polish)
```

### Blocking Dependencies

**Must Complete First** (Phase 1 & 2):
- T001-T004: Database schema and types
- T005-T012: Core Server Actions

**US1 必須優先** (Phase 3):
- 前台路由架構是 US2, US3, US4 的基礎

**US5 必須優先於 US6, US7, US8** (Phase 7):
- 區塊管理 CRUD 是排序、圖片清理、Tab 整合的基礎

### Parallel Execution Opportunities

**Phase 2** (After T005):
- T006-T007 (查詢功能)
- T008-T010 (CRUD 功能)
- T011-T012 (排序功能)

**Phase 4-6** (After Phase 3 完成):
- T020-T024 (US2 - 圖片輪播)
- T025-T029 (US3 - 商品展示)
- T030-T032 (US4 - 文字區塊)
可同時開發（前台區塊互不依賴）

**Phase 7** (Admin CRUD):
- T033-T035 (圖片上傳元件)
- T037-T040 (表單欄位)
- T042-T043 (列表與卡片元件)
可分工並行開發

**Phase 8-10** (After Phase 7):
- T045-T048 (US6 - 排序)
- T049-T054 (US7 - 圖片清理)
- T055-T057 (US8 - Tab 整合)
可同時進行（功能獨立）

**Phase 11** (Polish):
- T060-T061 (效能優化)
- T062-T063 (錯誤處理)
可同步進行

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**包含**:
- ✅ Phase 1-2: Setup & Foundational
- ✅ Phase 3: US1 (前台路由架構)
- ✅ Phase 4: US2 (圖片輪播區塊)
- ✅ Phase 7: US5 (管理員建立與管理區塊)
- ✅ Phase 8: US6 (管理員調整區塊排序)
- ✅ Phase 9: US7 (圖片清理)

**總計**: 47 個任務（72% 的完整功能）

**MVP 驗收**:
- 管理員可建立圖片輪播區塊並調整順序
- 客戶可在首頁查看圖片輪播
- 圖片清理機制正常運作
- 前台路由架構完成（首頁/商品頁切換）

### Incremental Delivery Plan

**Sprint 1** (3-4 天): MVP 核心功能
- Phase 1-2: Setup & Foundational
- Phase 3: US1 (前台路由)
- Phase 4: US2 (圖片輪播前台)
- Phase 7: US5 (後台 CRUD)

**Sprint 2** (2-3 天): 排序與清理
- Phase 8: US6 (排序功能)
- Phase 9: US7 (圖片清理)

**Sprint 3** (2-3 天): 商品展示與文字區塊
- Phase 5: US3 (商品展示區塊)
- Phase 6: US4 (文字區塊)

**Sprint 4** (1 天): Tab 整合與優化
- Phase 10: US8 (Tab 切換器)
- Phase 11: Polish & QA

**總時程**: 8-11 天（符合 plan.md 的 10-14 天估計）

---

## Testing Strategy

### Unit Tests (可選，若時間允許)
- Zod Schema 驗證（image_carousel, product_display, text_block）
- deleteBlockImages() 四種清理場景
- moveBlockUp/moveBlockDown 排序邏輯

### Integration Tests (建議執行)
- Server Actions CRUD 操作（建立、查詢、更新、刪除）
- 圖片上傳與清理流程
- 前台區塊渲染與查詢

### Manual Testing (必須執行)
- 所有 User Story 的 Acceptance Scenarios（spec.md 第 8-150 行）
- 跨瀏覽器測試（Chrome, Firefox, Edge）
- 行動裝置測試（iOS Safari, Android Chrome）
- 響應式設計測試（手機、平板、桌面）
- 無障礙測試（ARIA 標籤、鍵盤導航）

---

## Notes

### Critical Path (關鍵路徑)
T001-T004 → T005-T012 → T013-T019 → T033-T044 → T045-T048 → T049-T054

若關鍵路徑任務延遲，將影響整體交付時間。

### Risk Mitigation (風險緩解)
- **JSONB 驗證複雜度**: Phase 1 建立完整測試案例（T004）
- **圖片清理失敗**: Phase 9 實作容錯機制（T054）
- **商品展示效能**: Phase 5 限制 max_items = 50，資料庫索引優化

### Definition of Done (完成標準)
每個 Phase 完成後必須：
1. 所有任務打勾 (checkbox checked)
2. Acceptance Criteria 全部通過
3. TypeScript 型別檢查通過（`pnpm type-check`）
4. ESLint 檢查通過（`pnpm lint`）
5. 手動測試該 Phase 對應的 User Story

---

**Tasks Generated** - 總計 65 個任務，組織為 11 個 Phase，支援 8 個獨立可測試的使用者故事。
