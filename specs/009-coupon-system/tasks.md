# Tasks: 優惠券系統 (Coupon System)

**Input**: Design documents from `/specs/009-coupon-system/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/coupons.ts, research.md, quickstart.md

**Tests**: 本功能規格未明確要求測試，因此不包含測試任務。

**Organization**: 任務按使用者故事分組，確保每個故事可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行執行（不同檔案、無相依性）
- **[Story]**: 任務所屬使用者故事（如 US1, US2, US3）
- 任務描述包含完整檔案路徑

## Path Conventions

本專案為 Next.js 15 App Router 單體應用：
- 前端頁面：`app/(shop)/` 或 `app/(admin)/`
- 元件：`components/shop/` 或 `components/admin/`
- Server Actions：`lib/actions/`
- 驗證 Schema：`lib/validations/`
- 工具函式：`lib/utils/`
- 資料庫 Migration：`supabase/migrations/`
- 型別定義：`types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與基礎結構

- [X] T001 建立資料庫 Migration 檔案 `supabase/migrations/20260119_create_coupons.sql`（5 個資料表 + 1 個 View + RLS Policies）
- [X] T002 [P] 建立優惠券型別定義在 `types/index.ts`（Coupon, UserCoupon, OrderCoupon, CouponDiscountResult）
- [X] T003 [P] 建立優惠券 Zod Schema 在 `lib/validations/coupon.schema.ts`（createCouponSchema, updateCouponSchema, claimCouponSchema, validateCouponSchema）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心基礎設施，必須在所有使用者故事開始前完成

**⚠️ CRITICAL**: 此階段完成前，無法開始任何使用者故事的實作

- [X] T004 執行資料庫 Migration（建立 coupons, coupon_tier_restrictions, coupon_series_restrictions, user_coupons, order_coupons 表與 active_coupons View）
- [X] T005 建立優惠券工具函式 `lib/utils/coupon-helpers.ts`（calculateCouponDiscount, validateCouponConditions）
- [X] T006 擴充購物車 Zustand Store `stores/cart.ts`（新增 appliedCoupon, couponDiscount, applyCoupon, removeCoupon 方法）
- [X] T007 建立優惠券 Server Actions 檔案 `lib/actions/coupons.ts`（createCoupon, updateCoupon, deleteCoupon, getCoupons, getCouponById, claimCoupon, getUserCoupons, validateCoupon, getCouponStats）

**Checkpoint**: ✅ 基礎設施就緒 - 使用者故事實作現可並行開始

---

## Phase 3: User Story 1 - 客戶領取與使用優惠券 (Priority: P0) 🎯 MVP

**Goal**: 客戶可透過輸入優惠券代碼領取優惠券，並在購物車結帳時使用優惠券享受折扣

**Independent Test**: 客戶輸入有效優惠券代碼「WELCOME100」領取成功，購物車金額達 $600 時顯示可用提示，使用後訂單金額正確折扣為 $500

### Implementation for User Story 1

- [X] T008 [P] [US1] 實作 Server Action `claimCoupon` 在 `lib/actions/coupons.ts`（優惠券領取、重複檢查、有效性驗證）
- [X] T009 [P] [US1] 實作 Server Action `getUserCoupons` 在 `lib/actions/coupons.ts`（查詢客戶已領取優惠券列表）
- [X] T010 [P] [US1] 實作 Server Action `validateCoupon` 在 `lib/actions/coupons.ts`（驗證優惠券使用條件與計算折扣）
- [X] T011 [P] [US1] 建立優惠券卡片元件 `components/shop/coupons/CouponCard.tsx`（Coupang 風格設計、Neo-Brutalism 樣式）
- [X] T012 [P] [US1] 建立優惠券輸入口令元件 `components/shop/coupons/CouponCodeInput.tsx`（Foodpanda 風格設計、大寫轉換、即時驗證）
- [X] T013 [P] [US1] 建立優惠券選擇器元件 `components/shop/coupons/CouponSelector.tsx`（購物車使用、顯示可用優惠券、應用/移除邏輯）
- [X] T014 [US1] 建立前台優惠券頁面 `app/(shop)/store/coupons/page.tsx`（顯示已領取優惠券列表 + 輸入口令入口）
- [X] T015 [US1] 整合購物車頁面 `app/(shop)/store/cart/page.tsx`（新增「可使用優惠券」提示按鈕、整合 CouponSelector、顯示折扣摘要）
- [X] T016 [US1] 修改訂單建立 Server Action `lib/actions/orders.ts`（新增優惠券快照邏輯、建立 order_coupons 記錄、更新 user_coupons.used_at）
- [X] T017 [US1] 修改訂單詳情頁面 `app/(shop)/store/orders/[id]/page.tsx`（顯示使用的優惠券代碼與折扣金額）

**Checkpoint**: 此階段完成後，User Story 1 應完全可用且可獨立測試（客戶可領取、使用優惠券並在訂單中看到快照）

---

## Phase 4: User Story 2 - 管理員建立與管理優惠券 (Priority: P0)

**Goal**: 管理員可在後台建立優惠券，設定代碼、折扣方式、使用限制、生效時間，並可查看、編輯、刪除優惠券

**Independent Test**: 管理員建立優惠券「WELCOME100」（現金折扣 $100、滿 $500 可用），保存後在優惠券列表中看到新建立的優惠券，並可編輯或刪除

### Implementation for User Story 2

- [ ] T018 [P] [US2] 建立優惠券表單元件 `components/admin/coupons/CouponForm.tsx`（建立/編輯表單、等級限制選擇器、系列限制選擇器、生效時間選擇器）
- [ ] T019 [P] [US2] 建立優惠券列表元件 `components/admin/coupons/CouponList.tsx`（表格顯示、狀態 Badge、操作按鈕）
- [ ] T020 [P] [US2] 建立優惠券篩選器元件 `components/admin/coupons/CouponFilters.tsx`（狀態篩選、折扣方式篩選、代碼搜尋）
- [ ] T021 [US2] 建立後台優惠券管理頁面 `app/(admin)/admin/coupons/page.tsx`（優惠券列表 + 篩選器 + 新增按鈕）
- [ ] T022 [US2] 建立後台優惠券編輯頁面 `app/(admin)/admin/coupons/[id]/page.tsx`（載入優惠券詳情、編輯表單、保存更新）
- [ ] T023 [US2] 實作優惠券刪除邏輯在 `lib/actions/coupons.ts`（檢查已領取數量、顯示確認提示、軟刪除 + CASCADE 清理）

**Checkpoint**: 此階段完成後，User Story 2 應完全可用且可獨立測試（管理員可建立、編輯、刪除優惠券）

---

## Phase 5: User Story 3 - 優惠券使用限制與驗證 (Priority: P1)

**Goal**: 系統根據優惠券的使用限制（等級、最低金額、系列）自動驗證客戶是否可使用該優惠券，並即時顯示提示

**Independent Test**: 客戶等級為「零售」嘗試使用「批發會員」限定優惠券時，系統顯示「此優惠券限批發會員使用」錯誤訊息

### Implementation for User Story 3

- [ ] T024 [US3] 實作等級限制驗證邏輯在 `lib/utils/coupon-helpers.ts`（檢查客戶等級是否在 coupon_tier_restrictions 列表中）
- [ ] T025 [US3] 實作最低金額驗證邏輯在 `lib/utils/coupon-helpers.ts`（計算購物車總額、比對 min_order_amount）
- [ ] T026 [US3] 實作系列限制驗證邏輯在 `lib/utils/coupon-helpers.ts`（篩選限定系列商品、計算適用金額）
- [ ] T027 [US3] 實作購物車商品變更監聽在 `stores/cart.ts`（addItem, removeItem, updateQuantity 時自動重新驗證優惠券）
- [ ] T028 [US3] 實作優惠券自動移除邏輯在 `stores/cart.ts`（條件不符時移除優惠券並顯示 toast 提示）
- [ ] T029 [US3] 修改 CouponSelector 元件 `components/shop/coupons/CouponSelector.tsx`（顯示「不符合條件」狀態、顯示錯誤原因）

**Checkpoint**: 此階段完成後，User Story 3 應完全可用且可獨立測試（優惠券使用限制自動驗證並即時提示）

---

## Phase 6: User Story 4 - 優惠券視覺化設計 (Priority: P1)

**Goal**: 前台優惠券採用 Coupang 風格的卡片化設計，提供領取入口（Foodpanda 風格的輸入口令），並在購物車顯示醒目的可使用提示

**Independent Test**: 客戶進入優惠券頁面看到精美卡片，輸入口令「WELCOME100」領取成功，購物車顯示橙色「您有可使用的優惠券」提示按鈕

### Implementation for User Story 4

- [ ] T030 [US4] 優化 CouponCard 元件 `components/shop/coupons/CouponCard.tsx`（新增鋸齒狀切口效果、色彩區分狀態、有效期限顯示）
- [ ] T031 [US4] 優化 CouponCodeInput 元件 `components/shop/coupons/CouponCodeInput.tsx`（新增領取成功動畫效果、大觸控按鈕、placeholder 提示）
- [ ] T032 [US4] 建立優惠券提示按鈕元件 `components/shop/coupons/CouponPrompt.tsx`（醒目橙色/綠色高亮、顯示可用優惠券數量）
- [ ] T033 [US4] 整合優惠券提示按鈕至購物車頁面 `app/(shop)/store/cart/page.tsx`（判斷是否有可用優惠券、顯示提示）
- [ ] T034 [US4] 建立折扣摘要元件 `components/shop/coupons/DiscountSummary.tsx`（顯示原價、折扣金額、折後價）
- [ ] T035 [US4] 整合折扣摘要至購物車頁面 `app/(shop)/store/cart/page.tsx`（顯示優惠券折扣明細）

**Checkpoint**: 此階段完成後，User Story 4 應完全可用且可獨立測試（優惠券視覺化設計完整、使用者體驗良好）

---

## Phase 7: User Story 5 - 訂單優惠券快照與歷史記錄 (Priority: P2)

**Goal**: 系統在訂單中記錄使用的優惠券快照（代碼、折扣方式、折扣金額），即使優惠券被刪除，訂單中的記錄仍保留

**Independent Test**: 管理員刪除優惠券「SAVE100」後，查看使用該優惠券的訂單，訂單詳情中仍顯示「使用優惠券: SAVE100 (現金折扣 $100)」

### Implementation for User Story 5

- [ ] T036 [US5] 修改訂單建立 Server Action `lib/actions/orders.ts`（建立 order_coupons 記錄、儲存優惠券快照）
- [ ] T037 [US5] 修改訂單詳情 Server Action `lib/actions/orders.ts`（JOIN order_coupons 表、回傳優惠券快照資料）
- [ ] T038 [US5] 修改訂單詳情頁面 `app/(shop)/store/orders/[id]/page.tsx`（顯示優惠券快照資訊）
- [ ] T039 [US5] 修改後台訂單詳情頁面 `app/(admin)/admin/orders/[id]/page.tsx`（顯示優惠券快照資訊）

**Checkpoint**: 此階段完成後，User Story 5 應完全可用且可獨立測試（訂單優惠券快照永久保留）

---

## Phase 8: User Story 6 - 優惠券代碼唯一性與大小寫處理 (Priority: P2)

**Goal**: 系統確保優惠券代碼的唯一性，並自動將代碼轉換為大寫儲存與顯示

**Independent Test**: 管理員嘗試建立重複代碼「welcome100」時，系統顯示「優惠券代碼已存在」錯誤；客戶輸入小寫代碼「welcome100」時，系統自動識別並領取優惠券

### Implementation for User Story 6

- [ ] T040 [US6] 修改 createCoupon Server Action `lib/actions/coupons.ts`（檢查 code_normalized 唯一性、自動轉大寫）
- [ ] T041 [US6] 修改 claimCoupon Server Action `lib/actions/coupons.ts`（查詢時使用 UPPER() 函式轉大寫）
- [ ] T042 [US6] 修改 CouponForm 元件 `components/admin/coupons/CouponForm.tsx`（輸入時即時轉大寫、顯示預覽）
- [ ] T043 [US6] 修改 CouponCodeInput 元件 `components/shop/coupons/CouponCodeInput.tsx`（輸入時即時轉大寫）

**Checkpoint**: 此階段完成後，User Story 6 應完全可用且可獨立測試（優惠券代碼唯一性與大小寫處理正確）

---

## Phase 9: User Story 7 - 管理員刪除優惠券時清理客戶已領取記錄 (Priority: P2)

**Goal**: 管理員刪除優惠券時，系統自動刪除所有客戶已領取的該優惠券記錄，確保資料一致性

**Independent Test**: 管理員刪除優惠券「SAVE100」後，客戶的優惠券列表中不再顯示該優惠券

### Implementation for User Story 7

- [ ] T044 [US7] 修改 deleteCoupon Server Action `lib/actions/coupons.ts`（查詢已領取客戶數量、顯示確認提示）
- [ ] T045 [US7] 建立刪除確認對話框元件 `components/admin/coupons/DeleteCouponDialog.tsx`（顯示影響客戶數量、確認/取消按鈕）
- [ ] T046 [US7] 整合刪除確認對話框至優惠券列表 `components/admin/coupons/CouponList.tsx`（點擊刪除時顯示對話框）
- [ ] T047 [US7] 驗證 CASCADE 刪除邏輯（測試刪除優惠券後 user_coupons 自動清理）

**Checkpoint**: 此階段完成後，User Story 7 應完全可用且可獨立測試（優惠券刪除時客戶記錄自動清理）

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 改進影響多個使用者故事的功能

- [ ] T048 [P] 實作優惠券統計 Server Action `getCouponStats` 在 `lib/actions/coupons.ts`（查詢領取數、使用數、總折扣金額）
- [ ] T049 [P] 建立優惠券統計卡片元件 `components/admin/coupons/CouponStatsCard.tsx`（顯示統計資料）
- [ ] T050 [P] 整合優惠券統計至後台優惠券詳情頁面 `app/(admin)/admin/coupons/[id]/page.tsx`
- [ ] T051 [P] 新增優惠券過期自動清理 PostgreSQL Function（定期清理 30 天前過期的客戶領取記錄）
- [ ] T052 [P] 建立優惠券測試資料生成 SQL 腳本 `specs/009-coupon-system/seed-test-data.sql`（建立範例優惠券、等級限制、系列限制）
- [ ] T053 TypeScript 型別檢查（執行 `pnpm type-check` 確保無型別錯誤）
- [ ] T054 更新 CLAUDE.md 文件（記錄 009-coupon-system 功能完成狀態與核心實作）
- [ ] T055 執行 quickstart.md 驗證（依照 quickstart.md 步驟測試所有功能）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻擋所有使用者故事**
- **User Stories (Phase 3-9)**: 全部依賴 Foundational 完成
  - 使用者故事可並行執行（若有足夠人力）
  - 或依優先級順序執行（P0 → P1 → P2）
- **Polish (Phase 10)**: 依賴所有期望的使用者故事完成

### User Story Dependencies

- **User Story 1 (P0)**: 可在 Foundational (Phase 2) 後開始 - 無依賴其他故事
- **User Story 2 (P0)**: 可在 Foundational (Phase 2) 後開始 - 無依賴其他故事
- **User Story 3 (P1)**: 依賴 US1 完成（需要優惠券領取與購物車整合）
- **User Story 4 (P1)**: 依賴 US1 完成（需要優惠券卡片與輸入口令元件）
- **User Story 5 (P2)**: 依賴 US1 完成（需要訂單建立流程）
- **User Story 6 (P2)**: 依賴 US1, US2 完成（需要領取與建立邏輯）
- **User Story 7 (P2)**: 依賴 US2 完成（需要刪除邏輯）

### Within Each User Story

- Server Actions 優先於元件
- 元件優先於頁面
- 核心實作優先於整合
- 故事完成後再移至下一優先級

### Parallel Opportunities

- Phase 1 所有標記 [P] 的任務可並行執行
- Phase 2 所有任務可並行執行（在 Phase 1 完成後）
- Phase 3 (US1) 中標記 [P] 的 Server Actions (T008-T010) 可並行執行
- Phase 3 (US1) 中標記 [P] 的元件 (T011-T013) 可並行執行
- Phase 4 (US2) 中標記 [P] 的元件 (T018-T020) 可並行執行
- Phase 10 所有標記 [P] 的任務可並行執行
- US1 與 US2 可由不同團隊成員並行開發（兩者皆為 P0，無相依性）

---

## Parallel Example: User Story 1

```bash
# 同時啟動 User Story 1 的所有 Server Actions:
Task: "實作 Server Action claimCoupon 在 lib/actions/coupons.ts"
Task: "實作 Server Action getUserCoupons 在 lib/actions/coupons.ts"
Task: "實作 Server Action validateCoupon 在 lib/actions/coupons.ts"

# 同時啟動 User Story 1 的所有元件:
Task: "建立優惠券卡片元件 components/shop/coupons/CouponCard.tsx"
Task: "建立優惠券輸入口令元件 components/shop/coupons/CouponCodeInput.tsx"
Task: "建立優惠券選擇器元件 components/shop/coupons/CouponSelector.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL - 阻擋所有故事)
3. 完成 Phase 3: User Story 1（客戶領取與使用）
4. 完成 Phase 4: User Story 2（管理員建立與管理）
5. **STOP and VALIDATE**: 測試 US1 + US2 獨立運作
6. 部署/展示（MVP 就緒）

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 + 2 → 獨立測試 → 部署/展示（MVP！）
3. 新增 User Story 3 → 獨立測試 → 部署/展示
4. 新增 User Story 4 → 獨立測試 → 部署/展示
5. 新增 User Story 5-7 → 獨立測試 → 部署/展示
6. 每個故事新增價值且不破壞先前故事

### Parallel Team Strategy

多位開發者時：

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後：
   - 開發者 A: User Story 1（客戶功能）
   - 開發者 B: User Story 2（管理員功能）
   - 開發者 C: User Story 3（驗證邏輯）
3. 故事獨立完成與整合

---

## Notes

- [P] 任務 = 不同檔案、無相依性
- [Story] 標籤將任務對應到特定使用者故事，方便追蹤
- 每個使用者故事應可獨立完成與測試
- 在每個任務或邏輯群組後提交 commit
- 在任何檢查點停止以獨立驗證故事
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨故事相依性

---

## Summary

- **總任務數**: 55 個任務
- **任務分佈**:
  - Phase 1 (Setup): 3 個任務
  - Phase 2 (Foundational): 4 個任務
  - Phase 3 (US1 - P0): 10 個任務
  - Phase 4 (US2 - P0): 6 個任務
  - Phase 5 (US3 - P1): 6 個任務
  - Phase 6 (US4 - P1): 6 個任務
  - Phase 7 (US5 - P2): 4 個任務
  - Phase 8 (US6 - P2): 4 個任務
  - Phase 9 (US7 - P2): 4 個任務
  - Phase 10 (Polish): 8 個任務
- **並行機會**: 28 個任務標記為 [P]（可並行執行）
- **獨立測試準則**: 每個 Phase 結束時都有明確的 Checkpoint
- **建議 MVP 範圍**: Phase 1-4（US1 + US2，共 23 個任務）

---

**Generated**: 2026-01-06
**Feature**: 009-coupon-system
**Format Version**: 1.0.0
