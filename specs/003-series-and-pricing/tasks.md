# Tasks: 商品系列與等級價格管理

**Feature**: 003-series-and-pricing
**Branch**: `003-series-and-pricing`
**Input**: 設計文件來自 `/specs/003-series-and-pricing/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 本功能未要求 TDD，測試任務為選填項目。

**Organization**: 任務依使用者故事分組，使每個故事可獨立實作與測試。

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無相依性）
- **[Story]**: 所屬使用者故事（US1, US2, US3...）
- 包含完整檔案路徑

---

## Phase 1: Setup (專案初始化)

**目的**: 建立專案結構與基礎設定

- [X] T001 執行資料庫 Migration (supabase/migrations/20260102_series_and_tier_prices.sql)
- [X] T002 [P] 新增 Series 型別定義至 types/index.ts
- [X] T003 [P] 新增 TierPrice 型別定義至 types/index.ts
- [X] T004 [P] 新增 ProductWithPrice 型別定義至 types/index.ts
- [X] T005 [P] 新增 TierWithPrice 型別定義至 types/index.ts
- [X] T006 [P] 建立 lib/validations/series.schema.ts (createSeriesSchema, updateSeriesSchema)
- [X] T007 [P] 建立 lib/validations/tier-price.schema.ts (setTierPriceSchema, batchSetTierPricesSchema)
- [X] T008 更新 lib/validations/product.schema.ts (新增 series_id, retail_price, stock_status 欄位)

**Checkpoint**: 資料庫 Schema 與型別定義就緒

---

## Phase 2: Foundational (基礎建設 - 阻擋所有使用者故事)

**目的**: 所有使用者故事依賴的核心基礎建設

**⚠️ CRITICAL**: 此階段完成前，無法開始任何使用者故事

- [X] T009 [P] 實作 lib/supabase/storage.ts 新增 uploadSeriesImage() 函式
- [X] T010 [P] 實作 lib/actions/series.ts - getSeries() (查詢系列列表)
- [X] T011 [P] 實作 lib/actions/series.ts - getSeriesById() (查詢單一系列)
- [X] T012 [P] 實作 lib/actions/tier-prices.ts - getAllTiersWithPrices() (查詢所有等級與價格)
- [X] T013 更新 lib/actions/products.ts - 修改 createProduct() 使用 series_id 取代 category_id
- [X] T014 更新 lib/actions/products.ts - 修改 updateProduct() 新增 retail_price 與 stock_status 欄位

**Checkpoint**: 基礎建設完成 - 使用者故事可開始平行實作

---

## Phase 3: User Story 1 - 客戶瀏覽系列並查看等級價格 (Priority: P0) 🎯 MVP

**Goal**: 批發客戶登入後，能清楚看到自己會員等級對應的優惠價格，並與原價比較，了解折扣力度。

**Independent Test**:
1. 使用「批發」等級帳號 (0912345678) 登入
2. 進入「飲料 > 美粒果系列」頁面
3. 驗證看到「原價 $60 您的價格 $50（批發）」
4. 切換「零售」等級帳號 (0987654321) 登入
5. 驗證看到「原價 $60 您的價格 $60（零售）」

### Implementation for User Story 1

- [X] T015 [P] [US1] 實作 lib/actions/shop.ts - getActiveSeries() (查詢 active 系列列表)
- [X] T016 [P] [US1] 實作 lib/actions/shop.ts - getSeriesProductsWithPrice() (查詢系列商品與價格)
- [X] T017 [P] [US1] 建立 components/shop/SeriesCard.tsx (Neo-Brutalism 風格系列卡片)
- [X] T018 [P] [US1] 建立 components/shop/ProductCard.tsx (含價格顯示與庫存狀態 - 實際建立為 ProductWithPriceCard)
- [X] T019 [US1] 更新 app/(shop)/store/page.tsx (顯示系列卡片，取代商品列表)
- [X] T020 [US1] 建立 app/(shop)/store/series/[id]/page.tsx (系列詳情頁 - 顯示商品列表)

**Checkpoint**: User Story 1 完成 - 客戶可瀏覽系列並查看等級價格

---

## Phase 4: User Story 2 - 管理員設定商品系列與等級價格 (Priority: P0)

**Goal**: 管理員能建立系列、上傳圖片、新增商品（自動編號）、批量設定各等級價格。

**Independent Test**:
1. 管理員登入 (admin@example.com)
2. 建立「美粒果系列」，選擇分類「飲料」，上傳系列圖片
3. 新增商品「蘋果汁 500ml」，選擇系列「美粒果系列」
4. 驗證商品編號自動產生為 `DRK-0001`
5. 進入價格管理頁面，設定批發價 $50，零售價 $60，經銷商價 $45
6. 驗證前台不同等級客戶看到對應價格

### Implementation for User Story 2

- [X] T021 [P] [US2] 實作 lib/actions/series.ts - createSeries() (建立系列)
- [X] T022 [P] [US2] 實作 lib/actions/series.ts - updateSeries() (更新系列)
- [X] T023 [P] [US2] 實作 lib/actions/series.ts - deleteSeries() (刪除系列，含商品檢查)
- [X] T024 [P] [US2] 實作 lib/actions/series.ts - uploadSeriesImage() (上傳系列圖片)
- [X] T025 [P] [US2] 實作 lib/actions/tier-prices.ts - setTierPrice() (設定單一商品價格 UPSERT)
- [X] T026 [P] [US2] 實作 lib/actions/tier-prices.ts - batchSetTierPrices() (批量設定價格)
- [X] T027 [P] [US2] 實作 lib/actions/tier-prices.ts - getProductTierPrices() (查詢商品所有等級價格)
- [X] T028 [P] [US2] 建立 components/admin/SeriesForm.tsx (系列表單 - 名稱、描述、分類、圖片)
- [X] T029 [P] [US2] 建立 components/admin/TierPriceTable.tsx (等級價格批量設定表格)
- [X] T030 [US2] 建立 app/(admin)/admin/series/page.tsx (系列列表頁)
- [X] T031 [US2] 建立 app/(admin)/admin/series/new/page.tsx (建立系列頁面)
- [X] T032 [US2] 建立 app/(admin)/admin/series/[id]/page.tsx (編輯系列頁面)
- [X] T033 [US2] 建立 app/(admin)/admin/pricing/page.tsx (價格管理頁面 - 批量設定表格)
- [X] T034 [US2] 更新 app/(admin)/admin/products/new/page.tsx (修改為選擇系列，編號自動產生 - 已在前面完成)
- [X] T035 [US2] 更新 app/(admin)/admin/products/[id]/page.tsx (新增原價與庫存狀態欄位 - 已在 ProductForm 中支援)

**Checkpoint**: User Story 2 完成 - 管理員可設定系列與等級價格

---

## Phase 5: User Story 3 - 前台使用者查看個人資訊與登出 (Priority: P0)

**Goal**: 客戶登入後，頂部導航列顯示手機號碼、會員等級，並能隨時登出。

**Independent Test**:
1. 客戶登入 (0912345678)
2. 驗證頂部導航列顯示「0912345678 | 會員等級: 批發」與登出按鈕
3. 點擊登出
4. 驗證導回登入頁面，Session 清除

### Implementation for User Story 3

- [X] T036 [P] [US3] 實作 lib/actions/shop.ts - getCurrentUser() (查詢當前用戶資訊)
- [X] T037 [P] [US3] 實作 lib/actions/shop.ts - logout() (登出功能)
- [X] T038 [P] [US3] 建立 components/shop/Navbar.tsx (導航列 - 手機號碼、等級、登出按鈕)
- [X] T039 [US3] 更新 app/(shop)/layout.tsx (新增 Navbar 元件)

**Checkpoint**: User Story 3 完成 - 客戶可查看個人資訊與登出

---

## Phase 6: User Story 4 - 系列上下架管理 (Priority: P1)

**Goal**: 管理員能將系列或商品下架，前台客戶不可見已下架內容。

**Independent Test**:
1. 管理員將「美粒果系列」狀態改為 inactive
2. 驗證前台不顯示該系列（即使其下商品是 active）
3. 管理員將系列改回 active，將「蘋果汁」改為 inactive
4. 驗證系列顯示但該商品不顯示

### Implementation for User Story 4

- [ ] T040 [US4] 更新 app/(admin)/admin/series/[id]/page.tsx (新增狀態切換功能 active/inactive)
- [ ] T041 [US4] 更新 app/(admin)/admin/products/[id]/page.tsx (新增商品狀態切換功能)
- [ ] T042 [US4] 驗證 RLS 策略 - 前台僅顯示 active 系列與商品

**Checkpoint**: User Story 4 完成 - 系列與商品上下架管理

---

## Phase 7: User Story 5 - 庫存狀態管理 (Priority: P1)

**Goal**: 管理員手動設定商品庫存狀態（充足/緊張/缺貨），客戶看不到實際庫存數量。

**Independent Test**:
1. 管理員設定商品實際庫存為 -50（欠貨）
2. 但庫存狀態設為「充足」
3. 驗證前台顯示「庫存充足」而非負數

### Implementation for User Story 5

- [ ] T043 [P] [US5] 建立 components/shop/StockStatus.tsx (庫存狀態顯示元件)
- [ ] T044 [US5] 更新 components/shop/ProductCard.tsx (整合 StockStatus 元件)
- [ ] T045 [US5] 驗證前台不顯示實際庫存數量（僅顯示狀態標籤）

**Checkpoint**: User Story 5 完成 - 庫存狀態管理

---

## Phase 8: User Story 6 - 商品編號自動產生 (Priority: P2)

**Goal**: 管理員建立商品時，系統自動產生編號（分類代碼-流水號），無需手動輸入。

**Independent Test**:
1. 管理員在「飲料 > 美粒果系列」新增商品「蘋果汁」
2. 驗證商品編號自動產生為 `DRK-0001`
3. 再新增「橘子汁」
4. 驗證編號自動產生為 `DRK-0002`

### Implementation for User Story 6

- [ ] T046 [US6] 驗證 PostgreSQL Function `generate_product_code()` 與 Trigger 已在 Migration 中建立
- [ ] T047 [US6] 更新 app/(admin)/admin/products/new/page.tsx (移除編號輸入欄位)
- [ ] T048 [US6] 更新 app/(admin)/admin/products/[id]/page.tsx (編號欄位設為唯讀)
- [ ] T049 [US6] 測試並發建立商品（2 個管理員同時建立），驗證編號不重複

**Checkpoint**: User Story 6 完成 - 商品編號自動產生

---

## Phase 9: Polish & Cross-Cutting Concerns

**目的**: 跨使用者故事的改善與優化

- [ ] T050 [P] 執行 pnpm type-check 確認無型別錯誤
- [ ] T051 [P] 執行 pnpm lint 修正 ESLint 問題
- [ ] T052 [P] 執行 pnpm build 確認建置成功
- [ ] T053 [P] Edge Case 測試 - 商品刪除後編號斷號（不回填）
- [ ] T054 [P] Edge Case 測試 - 系列遷移後編號不變
- [ ] T055 [P] Edge Case 測試 - 未設定價格的商品顯示「價格未設定」並禁用加入購物車
- [ ] T056 [P] Edge Case 測試 - 分類代碼衝突時顯示錯誤訊息
- [ ] T057 [P] Edge Case 測試 - 系列刪除保護（系列下有商品時拒絕刪除）
- [ ] T058 [P] 效能驗證 - 價格查詢響應時間 < 300ms
- [ ] T059 [P] 效能驗證 - 資料庫查詢 < 100ms (p95)
- [ ] T060 [P] 效能驗證 - 商品編號自動產生 < 50ms（並發安全）
- [ ] T061 執行 quickstart.md 中的驗收測試流程

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - 可立即開始
- **Foundational (Phase 2)**: 相依 Setup 完成 - **阻擋所有使用者故事**
- **User Stories (Phase 3-8)**: 全部相依 Foundational phase 完成
  - 使用者故事可平行實作（若有多位開發者）
  - 或依優先級循序實作（P0 → P1 → P2）
- **Polish (Phase 9)**: 相依所有期望的使用者故事完成

### User Story Dependencies

- **User Story 1 (P0)**: Foundational 完成後可開始 - **無相依其他故事**
- **User Story 2 (P0)**: Foundational 完成後可開始 - **無相依其他故事**（但需與 US1 整合驗證）
- **User Story 3 (P0)**: Foundational 完成後可開始 - **無相依其他故事**
- **User Story 4 (P1)**: Foundational 完成後可開始 - 需整合 US1 與 US2 的系列/商品功能
- **User Story 5 (P1)**: Foundational 完成後可開始 - 需整合 US1 的商品卡片
- **User Story 6 (P2)**: Foundational 完成後可開始 - 需整合 US2 的商品建立功能

### Within Each User Story

- Server Actions 優先於 UI 元件
- 共用元件（如 SeriesCard, ProductCard）可平行開發
- 頁面元件相依對應的 Server Actions 與 UI 元件

### Parallel Opportunities

- Phase 1 所有標記 [P] 的任務可平行執行
- Phase 2 所有標記 [P] 的任務可平行執行
- Phase 2 完成後，US1, US2, US3 可平行實作（若團隊人力允許）
- 每個 User Story 內標記 [P] 的任務可平行執行

---

## Parallel Example: User Story 1

```bash
# Phase 3 User Story 1 - 可平行執行的任務:
Task T015: "實作 lib/actions/shop.ts - getActiveSeries()"
Task T016: "實作 lib/actions/shop.ts - getSeriesProductsWithPrice()"
Task T017: "建立 components/shop/SeriesCard.tsx"
Task T018: "建立 components/shop/ProductCard.tsx"

# 這 4 個任務操作不同檔案，無相依性，可同時執行
```

---

## Parallel Example: User Story 2

```bash
# Phase 4 User Story 2 - 可平行執行的任務（第一批）:
Task T021: "實作 lib/actions/series.ts - createSeries()"
Task T022: "實作 lib/actions/series.ts - updateSeries()"
Task T023: "實作 lib/actions/series.ts - deleteSeries()"
Task T024: "實作 lib/actions/series.ts - uploadSeriesImage()"
Task T025: "實作 lib/actions/tier-prices.ts - setTierPrice()"
Task T026: "實作 lib/actions/tier-prices.ts - batchSetTierPrices()"
Task T027: "實作 lib/actions/tier-prices.ts - getProductTierPrices()"

# 這 7 個任務操作不同函式，可同時執行
```

---

## Implementation Strategy

### MVP First (P0 使用者故事優先)

**建議**: 先完成 P0 使用者故事（US1, US2, US3），即可上線基本功能。

1. ✅ 完成 Phase 1: Setup
2. ✅ 完成 Phase 2: Foundational（**關鍵 - 阻擋所有故事**）
3. ✅ 完成 Phase 3: User Story 1（客戶瀏覽系列與價格）
4. ✅ 完成 Phase 4: User Story 2（管理員設定系列與價格）
5. ✅ 完成 Phase 5: User Story 3（導航列與登出）
6. **STOP and VALIDATE**: 測試 P0 功能獨立運作
7. 部署/展示（MVP 完成！）

### Incremental Delivery

**建議**: 每個使用者故事完成後獨立測試與部署。

1. Setup + Foundational → 基礎建設完成
2. 新增 User Story 1 → 獨立測試 → 部署/展示（客戶可瀏覽價格）
3. 新增 User Story 2 → 獨立測試 → 部署/展示（管理員可設定價格）
4. 新增 User Story 3 → 獨立測試 → 部署/展示（完整 MVP）
5. 新增 User Story 4 → 獨立測試 → 部署/展示（上下架管理）
6. 新增 User Story 5 → 獨立測試 → 部署/展示（庫存狀態）
7. 新增 User Story 6 → 獨立測試 → 部署/展示（自動編號）
8. 每個故事增加價值，不破壞先前故事

### Parallel Team Strategy

**若有多位開發者**:

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後:
   - 開發者 A: User Story 1（前台瀏覽）
   - 開發者 B: User Story 2（後台設定）
   - 開發者 C: User Story 3（導航列）
3. 故事獨立完成後整合測試

---

## Notes

- **[P] 任務** = 不同檔案，無相依性，可平行執行
- **[Story] 標籤** = 追溯任務所屬使用者故事
- 每個使用者故事應可獨立完成與測試
- 在每個 Checkpoint 驗證故事獨立運作
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨故事相依

---

## Task Count Summary

- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (US1 - P0)**: 6 tasks
- **Phase 4 (US2 - P0)**: 15 tasks
- **Phase 5 (US3 - P0)**: 4 tasks
- **Phase 6 (US4 - P1)**: 3 tasks
- **Phase 7 (US5 - P1)**: 3 tasks
- **Phase 8 (US6 - P2)**: 4 tasks
- **Phase 9 (Polish)**: 12 tasks

**Total Tasks**: 61 tasks

**Parallel Opportunities**:
- Phase 1: 7 tasks 可平行
- Phase 2: 5 tasks 可平行
- Phase 3: 4 tasks 可平行
- Phase 4: 9 tasks 可平行
- Phase 5: 2 tasks 可平行
- Phase 7: 1 task 可平行
- Phase 9: 10 tasks 可平行

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5（P0 使用者故事）

---

**Format Validation**: ✅ 所有任務遵循 `- [ ] [ID] [P?] [Story?] Description with file path` 格式
