# Tasks: 商品管理系統

**Feature**: 002-product-management
**Generated**: 2026-01-02
**Input**: Design documents from `/specs/002-product-management/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/server-actions.md

**Tests**: 本功能 **不包含** 測試任務,專注於 MVP 快速交付。測試可在後續迭代中加入。

**Organization**: 任務依使用者故事分組,確保每個故事可獨立實作與測試。

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行 (不同檔案,無相依性)
- **[Story]**: 所屬使用者故事 (US1, US2, US3, US4, US5, US6)
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

## Phase 1: Foundational (基礎建設)

**Purpose**: 建立資料庫、型別定義與驗證架構,所有使用者故事的必要前置作業

**⚠️ CRITICAL**: 此階段未完成前,禁止開始任何使用者故事的實作

### 1.1 Database Setup

- [X] T001 建立 SQL Migration 檔案 (supabase/migrations/20260102_products_and_categories.sql)
- [X] T002 執行 Migration 建立 categories 與 products 資料表 **✅ 使用者已在 Supabase 執行**
- [X] T003 建立 Supabase Storage Bucket: products **✅ Migration 中已包含並執行**
- [X] T004 設定 Storage RLS 策略 (管理員可寫,公開可讀) **✅ Migration 中已包含並執行**
- [X] T005 插入預設分類測試資料 (飲料、零食、日用品) **✅ Migration 中已包含並執行**

### 1.2 TypeScript Types

- [X] T006 [P] 更新資料庫型別定義 (types/database.types.ts) - 新增 Category, Product
- [X] T007 [P] 更新共用型別定義 (types/index.ts) - 匯出 Category, Product

### 1.3 Validation Schemas

- [X] T008 [P] 建立分類驗證 Schema (lib/validations/category.schema.ts)
- [X] T009 [P] 建立商品驗證 Schema (lib/validations/product.schema.ts)

### 1.4 Storage Helper

- [X] T010 建立 Supabase Storage 工具函式 (lib/supabase/storage.ts)

**Checkpoint**: 資料庫建立完成,型別與驗證架構就緒 ✅ 使用者故事實作可開始

---

## Phase 2: User Story 2 - 管理員管理商品分類 (Priority: P1) 🎯 MVP

**Goal**: 管理員可在後台建立、編輯、刪除商品分類,並在刪除前檢查是否有商品使用

**Independent Test**: 管理員可建立至少 3 個分類,驗證刪除保護機制 (已有商品的分類無法刪除),不需要商品功能即可驗證

**Why First**: 商品建立時需要選擇分類,因此分類管理必須優先實作

### Implementation for US2

- [X] T011 [P] [US2] 建立 Server Action: getCategories() (lib/actions/categories.ts)
- [X] T012 [P] [US2] 建立 Server Action: createCategory() (lib/actions/categories.ts)
- [X] T013 [P] [US2] 建立 Server Action: updateCategory() (lib/actions/categories.ts)
- [X] T014 [P] [US2] 建立 Server Action: deleteCategory() (lib/actions/categories.ts)
- [X] T020-A [US2] 實作分類遷移功能 (Server Action: migrateCategoryProducts) - 批量更新商品分類後刪除 (FR-009-A)
- [X] T015 [US2] 建立分類列表頁面 (app/(admin)/admin/categories/page.tsx)
- [X] T016 [P] [US2] 建立 CategoryTable 元件 (components/admin/category-table.tsx)
- [X] T017 [P] [US2] 建立 CategoryForm 元件 (components/admin/category-form.tsx)
- [X] T018 [US2] 建立新增分類頁面 (app/(admin)/admin/categories/new/page.tsx)
- [X] T019 [US2] 建立編輯分類頁面 (app/(admin)/admin/categories/[id]/edit/page.tsx)
- [X] T020-B [US2] 建立分類刪除確認對話框 - 若有商品則顯示遷移選項 (已整合在 CategoryTable 中)
- [X] T021 [US2] 更新後台導航選單 (app/(admin)/admin/layout.tsx) - 新增「分類管理」連結

**Checkpoint**: 管理員可完整管理商品分類 (CRUD),可展示與驗證

---

## Phase 3: User Story 1 - 管理員建立商品基本資料 (Priority: P1) 🎯 MVP

**Goal**: 管理員可在後台建立商品,包含商品名稱、編號、描述、庫存、單位等基本資訊

**Independent Test**: 管理員可建立至少 5 個不同的商品,驗證商品編號唯一性、負庫存支援,不需要圖片或價格功能

### Implementation for US1

- [X] T022 [P] [US1] 建立 Server Action: getProducts() (lib/actions/products.ts)
- [X] T023 [P] [US1] 建立 Server Action: getProduct() (lib/actions/products.ts)
- [X] T024 [P] [US1] 建立 Server Action: createProduct() (lib/actions/products.ts)
- [X] T025 [P] [US1] 建立 Server Action: updateProduct() (lib/actions/products.ts)
- [X] T026 [P] [US1] 建立 Server Action: deleteProduct() (lib/actions/products.ts)
- [X] T027 [US1] 建立商品列表頁面 (app/(admin)/admin/products/page.tsx)
- [X] T028 [P] [US1] 建立 ProductTable 元件 (components/admin/product-table.tsx)
- [X] T029 [P] [US1] 建立 ProductForm 元件 (components/admin/product-form.tsx)
- [X] T030 [US1] 建立新增商品頁面 (app/(admin)/admin/products/new/page.tsx)
- [X] T031 [US1] 建立編輯商品頁面 (app/(admin)/admin/products/[id]/edit/page.tsx)
- [X] T032 [US1] 實作商品編號唯一性與格式驗證 (Zod: `/^[A-Za-z0-9-_]+$/`) - FR-002
- [X] T033 [US1] 實作負庫存支援驗證 (庫存可為負數)
- [X] T034 [US1] 更新後台導航選單 (app/(admin)/admin/layout.tsx) - 新增「商品管理」連結

**Checkpoint**: 管理員可完整管理商品基本資料 (CRUD),支援負庫存

---

## Phase 4: User Story 3 - 管理員編輯商品資訊與庫存 (Priority: P1) 🎯 MVP

**Goal**: 管理員可快速更新商品資訊與庫存數量,支援負庫存調整

**Independent Test**: 管理員可編輯已建立的商品,修改名稱、描述、庫存等欄位,驗證庫存可更新為負數

**Why Separate**: 雖與 US1 相關,但編輯功能涉及額外的狀態管理與驗證邏輯,獨立實作更清晰

### Implementation for US3

- [X] T035 [US3] 實作商品編輯表單預填邏輯 (app/(admin)/admin/products/[id]/edit/page.tsx)
- [X] T036 [US3] 實作商品編號欄位唯讀保護 (禁止編輯，UI 顯示為唯讀或禁用狀態)
- [X] T037 [US3] 實作分類變更驗證 (檢查新分類是否存在)
- [X] T038 [US3] 實作庫存快速調整功能 (在列表頁直接輸入庫存)

**Checkpoint**: 管理員可快速編輯商品資訊與庫存,負庫存功能完整

---

## Phase 5: User Story 4 - 管理員上傳商品圖片 (Priority: P2)

**Goal**: 管理員可為商品上傳單一主圖,圖片儲存在 Supabase Storage 中

**Independent Test**: 管理員可為商品上傳圖片 (JPG/PNG),驗證圖片成功儲存並在商品詳情頁顯示,也可以替換或刪除圖片

### Implementation for US4

- [X] T039 [P] [US4] 建立 Server Action: uploadProductImage() (lib/actions/products.ts)
- [X] T040 [P] [US4] 建立 Server Action: deleteProductImage() (lib/actions/products.ts)
- [X] T041 [P] [US4] 建立 ImageUpload UI 元件 (components/ui/image-upload.tsx)
- [X] T042 [US4] 整合圖片上傳至商品表單 (components/admin/product-form.tsx)
- [X] T043 [US4] 實作圖片格式驗證 (僅支援 JPG, PNG, WebP)
- [X] T044 [US4] 實作圖片大小驗證 (限制 5MB)
- [X] T045 [US4] 實作圖片替換邏輯 (覆寫舊圖片)
- [X] T046 [US4] 實作圖片刪除邏輯 (清理 Storage 檔案)
- [X] T047 [US4] 實作圖片預覽功能 (顯示上傳後的圖片)

**Checkpoint**: 管理員可完整管理商品圖片,上傳、替換、刪除功能完整

---

## Phase 6: User Story 5 - 管理員搜尋與篩選商品 (Priority: P2)

**Goal**: 管理員可使用商品名稱、編號、分類進行搜尋和篩選,快速找到特定商品

**Independent Test**: 管理員可在商品列表頁面輸入關鍵字搜尋,使用分類篩選器,驗證即時搜尋響應

### Implementation for US5

- [X] T048 [P] [US5] 建立 SearchInput 元件 (已整合在 ProductTable 中)
- [X] T049 [US5] 實作商品列表即時搜尋 (商品名稱或編號關鍵字)
- [X] T050 [P] [US5] 建立 CategoryFilter 元件 (已整合在 ProductTable 中)
- [X] T051 [US5] 實作依分類篩選商品
- [X] T052 [US5] 實作搜尋與篩選組合查詢
- [X] T053 [US5] 實作商品列表分頁功能 (支援 20/50/100 筆可選) - FR-020
- [X] T054 [P] [US5] 建立 Pagination 元件 (components/admin/pagination.tsx) - 含每頁筆數選擇器
- [X] T055 [US5] 整合搜尋、篩選、分頁至商品列表頁面

**Checkpoint**: 管理員可高效搜尋與篩選商品,分頁功能完整

---

## Phase 7: User Story 6 - 前台客戶瀏覽商品列表 (Priority: P2)

**Goal**: 客戶可在前台瀏覽商品列表,依分類篩選商品,查看商品詳情 (不含價格)

**Independent Test**: 客戶可登入前台,瀏覽商品列表,依分類篩選商品,查看商品詳情,驗證庫存顯示正確 (包含負庫存顯示)

### Implementation for US6

- [X] T056 [US6] 更新前台商品列表頁面 (app/(shop)/store/page.tsx) - 顯示實際商品
- [X] T057 [P] [US6] 建立 ProductCard 元件 (components/shop/product-card.tsx)
- [X] T058 [P] [US6] 建立 ProductList 元件 (components/shop/product-list.tsx)
- [X] T059 [P] [US6] 建立 CategoryFilter 元件 (components/shop/category-filter.tsx)
- [X] T060 [US6] 建立商品詳情頁面 (app/(shop)/store/[id]/page.tsx)
- [X] T061 [US6] 實作庫存狀態顯示邏輯 (正數、零、負數的不同顯示)
- [X] T062 [US6] 實作分類篩選功能 (前台)
- [X] T063 [US6] 確保前台不顯示價格 (FR-024)

**Checkpoint**: 客戶可完整瀏覽商品列表與詳情,庫存顯示準確

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 優化使用者體驗與錯誤處理

### 8.1 UI Enhancement

- [X] T064 [P] 實作商品表單 Loading 狀態 (useActionState isPending) **✅ 已在 ProductForm 實作**
- [X] T065 [P] 實作圖片上傳 Loading 狀態 (Loader2 Spinner) **✅ 已在 ImageUpload 實作**
- [ ] T066 [P] 實作錯誤訊息統一顯示 (使用 ErrorInline 元件) **⏭ 已有基本錯誤顯示,可選**
- [ ] T067 [P] 實作成功訊息 Toast 通知 (商品建立、更新、刪除) **⏭ 需額外 Toast 庫,可選**

### 8.2 Performance Optimization (Optional)

- [X] T068 [P] 使用 Next.js Image 元件優化商品圖片載入 **✅ 已在 ProductCard 與商品詳情頁實作**
- [ ] T069 [P] 實作商品列表 Skeleton Loading
- [X] T070 [P] 啟用 Supabase Storage 快取 (cacheControl: 3600) **✅ 已在 uploadProductImage 實作**
- [ ] T071 [P] 驗證商品搜尋查詢效能 (目標 < 200ms)
- [ ] T071-A [P] 建立圖片上傳效能測試腳本 (tests/performance/image-upload.spec.ts) - 驗證 SC-003
- [ ] T071-B [P] 建立搜尋功能效能基準測試 (tests/performance/search-benchmark.spec.ts) - 驗證 SC-004

### 8.3 Data Integrity

- [ ] T072 實作商品刪除保護邏輯 (檢查是否有訂單記錄) - 預留介面 **⏭ 實際邏輯在 004-shopping-cart 實作**
- [X] T072-A [P] 實作非管理員操作阻擋前端驗證 (UI 層隱藏操作按鈕) - FR-027 **✅ 架構上已透過路由群組保護**
- [X] T072-B [P] 實作非管理員操作阻擋後端驗證 (Server Actions 權限檢查) - FR-027 **✅ 所有 Server Actions 已使用 checkAuth**
- [X] T073 實作圖片刪除錯誤處理 (圖片可能不存在) **✅ 已在 deleteProductImage 實作**
- [X] T074-A 在 Out of Scope 文件中說明訂單快照機制 (FR-028,將在 004 實作) **✅ 已在 spec.md 說明**

### 8.4 Final Validation

- [X] T075 [P] TypeScript 型別檢查 (pnpm type-check) **✅ 通過**
- [X] T076 執行 pnpm build 驗證編譯成功 **✅ 通過**
- [ ] T077 [P] 程式碼格式化與 Linting 檢查
- [ ] T078 更新 README.md (新增商品管理功能說明)

**Checkpoint**: 功能完整,可進行 Demo 或部署

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational) ← BLOCKS ALL USER STORIES
    ↓
Phase 2 (US2 - 分類管理) ← BLOCKS US1, US3
    ↓
┌───────────────┬───────────────┐
│  Phase 3      │  Phase 5      │  可平行開發
│  (US1)        │  (US4)        │
└───────────────┴───────────────┘
    ↓                 ↓
Phase 4 (US3)    Phase 6 (US5)
    ↓                 ↓
Phase 7 (US6)
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

- **US2 (商品分類管理)**: 獨立,但 BLOCKS US1, US3 (商品需要分類)
- **US1 (商品基本資料)**: 依賴 US2 (需要分類選項)
- **US3 (商品編輯)**: 依賴 US1 (需要商品資料)
- **US4 (圖片上傳)**: 可獨立開發,與 US1 平行
- **US5 (搜尋篩選)**: 依賴 US1 (需要商品資料)
- **US6 (前台展示)**: 依賴 US1 (需要商品資料)

**建議執行順序** (單人開發):
1. Phase 1 (Foundational) → 必須完成
2. Phase 2 (US2) → 分類管理
3. Phase 3 (US1) + Phase 5 (US4) → 商品 CRUD + 圖片上傳 (可平行)
4. Phase 4 (US3) → 商品編輯優化
5. Phase 6 (US5) → 搜尋篩選
6. Phase 7 (US6) → 前台展示
7. Phase 8 (Polish) → 優化

**平行開發** (多人團隊):
- Developer A: Phase 2 (US2) → Phase 3 (US1) → Phase 4 (US3)
- Developer B: Phase 5 (US4) → Phase 6 (US5)
- Developer C: Phase 7 (US6) → Phase 8 (Polish)

### Within Each User Story

- Server Actions 優先 (可平行)
- 頁面元件依賴 Server Actions
- 表單元件可與頁面平行開發
- 整合邏輯最後完成

### Parallel Opportunities

**Phase 1 平行機會** (4 個任務可同時執行):
- T006: 更新資料庫型別定義
- T007: 更新共用型別定義
- T008: 建立分類驗證 Schema
- T009: 建立商品驗證 Schema

**Phase 2 平行機會** (4 個 Server Actions):
- T011: getCategories()
- T012: createCategory()
- T013: updateCategory()
- T014: deleteCategory()

**Phase 3 平行機會** (5 個 Server Actions):
- T022: getProducts()
- T023: getProduct()
- T024: createProduct()
- T025: updateProduct()
- T026: deleteProduct()

**UI 元件平行開發**:
- 所有 components/admin/* 可平行
- 所有 components/shop/* 可平行
- 所有 components/ui/* 可平行

---

## Parallel Example: Phase 2 (US2)

```bash
# 同時啟動 4 個 Server Actions:
Task: "建立 Server Action: getCategories() (lib/actions/categories.ts)"
Task: "建立 Server Action: createCategory() (lib/actions/categories.ts)"
Task: "建立 Server Action: updateCategory() (lib/actions/categories.ts)"
Task: "建立 Server Action: deleteCategory() (lib/actions/categories.ts)"

# 同時啟動 2 個 UI 元件:
Task: "建立 CategoryTable 元件 (components/admin/category-table.tsx)"
Task: "建立 CategoryForm 元件 (components/admin/category-form.tsx)"
```

---

## Parallel Example: Phase 3 (US1) + Phase 5 (US4)

```bash
# Phase 3 (US1) - Developer A:
Task: "建立 Server Action: createProduct() (lib/actions/products.ts)"
Task: "建立 Server Action: updateProduct() (lib/actions/products.ts)"
Task: "建立 ProductTable 元件 (components/admin/product-table.tsx)"

# Phase 5 (US4) - Developer B (平行):
Task: "建立 Server Action: uploadProductImage() (lib/actions/products.ts)"
Task: "建立 ImageUpload UI 元件 (components/ui/image-upload.tsx)"
```

---

## Implementation Strategy

### MVP First (US2, US1, US3 Only)

**最小可行產品範圍**:
1. ✅ Phase 1: Foundational (CRITICAL)
2. ✅ Phase 2: US2 - 商品分類管理
3. ✅ Phase 3: US1 - 商品基本資料管理
4. ✅ Phase 4: US3 - 商品編輯與庫存

**驗證點**:
- 管理員可建立商品分類 ✓
- 管理員可建立商品 (含負庫存) ✓
- 管理員可編輯商品資訊 ✓
- 商品編號唯一性驗證 ✓
- 分類刪除保護機制 ✓

**可 Demo 功能**:
- 展示商品 CRUD 流程
- 展示負庫存支援
- 展示分類刪除保護

### Incremental Delivery

1. **Sprint 1** (Foundational + 分類管理):
   - 完成 Phase 1 + Phase 2 (T001-T021)
   - 產出: 資料庫建立完成,分類管理功能可用

2. **Sprint 2** (商品 CRUD):
   - 完成 Phase 3 + Phase 4 (T022-T038)
   - 產出: 商品基本資料管理完整 (MVP!)

3. **Sprint 3** (圖片上傳 + 搜尋):
   - 完成 Phase 5 + Phase 6 (T039-T055)
   - 產出: 圖片管理與搜尋功能

4. **Sprint 4** (前台展示):
   - 完成 Phase 7 (T056-T063)
   - 產出: 前台商品瀏覽功能

5. **Sprint 5** (優化):
   - 完成 Phase 8 (T064-T077)
   - 產出: Production-ready 版本

### Parallel Team Strategy

**3 人團隊建議分工**:

**Week 1: Foundational + 分類管理 (全員協作)**
- Developer A: T001-T005 (Database Setup)
- Developer B: T006-T009 (Types & Validation)
- Developer C: T010 (Storage Helper) → T011-T014 (Server Actions)

**Week 2: 商品 CRUD + 圖片上傳 (平行開發)**
- Developer A: Phase 3 (US1) - T022-T034 (商品基本資料)
- Developer B: Phase 5 (US4) - T039-T047 (圖片上傳)
- Developer C: Phase 4 (US3) - T035-T038 (商品編輯)

**Week 3: 搜尋篩選 + 前台展示**
- Developer A: Phase 6 (US5) - T048-T055 (搜尋篩選)
- Developer B: Phase 7 (US6) - T056-T063 (前台展示)
- Developer C: Phase 8 (Polish) - T064-T073 (優化)

**Week 4: Final Validation**
- 全員: Phase 8 (T074-T077) - 最終驗證與文件更新

---

## Task Summary

### Total Tasks: 85

**Phase Breakdown**:
- Phase 1 (Foundational): 10 tasks
- Phase 2 (US2 - 分類管理): 13 tasks (+2: 分類遷移功能)
- Phase 3 (US1 - 商品 CRUD): 13 tasks
- Phase 4 (US3 - 商品編輯): 4 tasks
- Phase 5 (US4 - 圖片上傳): 9 tasks
- Phase 6 (US5 - 搜尋篩選): 8 tasks
- Phase 7 (US6 - 前台展示): 8 tasks
- Phase 8 (Polish): 20 tasks (+4: 權限驗證、訂單快照說明)

**Parallelizable Tasks**: 38 tasks (標記 [P])

**User Story Distribution**:
- US2 (分類管理): 13 tasks (+2: 遷移功能)
- US1 (商品 CRUD): 13 tasks
- US3 (商品編輯): 4 tasks
- US4 (圖片上傳): 9 tasks
- US5 (搜尋篩選): 8 tasks
- US6 (前台展示): 8 tasks

**MVP Scope**: 40 tasks (Phase 1 + Phase 2 + Phase 3 + Phase 4)

---

## Notes

- **[P] 標記**: 表示任務可平行執行,無檔案衝突或依賴問題
- **[Story] 標籤**: 追蹤任務所屬使用者故事,便於驗證獨立完整性
- **檔案路徑**: 所有任務都包含明確的檔案位置,可直接執行
- **Checkpoint**: 每個階段都有驗證點,確保可獨立測試
- **建議**: 在每個 Checkpoint 提交 Git Commit,便於回滾與追蹤進度
- **測試策略**: 本版本專注 MVP 快速交付,測試可在後續加入
- **避免**: 模糊任務描述、同檔案衝突、跨故事強依賴
- **負庫存支援**: 所有庫存相關欄位都支援負數,不檢查 stock >= 0
- **圖片管理**: 使用 Supabase Storage,路徑格式 `{product_id}/main.{ext}`
- **搜尋策略**: 初期使用 ILIKE 查詢,商品數量 > 1000 筆時可升級為 Full-Text Search
