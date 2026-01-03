# Tasks: 購物車與訂單管理系統

**Input**: Design documents from `/specs/004-cart-and-orders/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 本功能為 P0 核心功能，包含整合測試任務確保系統穩定性。

**Organization**: 任務按使用者故事組織，每個故事可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無相依性）
- **[Story]**: 所屬使用者故事（US1, US2, US3, US4, US5）
- 所有任務包含明確的檔案路徑

## Path Conventions

本專案為 Next.js 15 App Router 架構：
- **app/**: 路由與頁面
- **components/**: UI 元件
- **lib/actions/**: Server Actions
- **lib/validations/**: Zod Schemas
- **stores/**: Zustand 狀態管理
- **types/**: TypeScript 型別定義
- **supabase/migrations/**: 資料庫 Migration

---

## Phase 1: Setup (專案基礎設施)

**目的**: 建立購物車與訂單系統的基礎架構

- [X] T001 安裝 Zustand 相依套件 (pnpm install zustand)
- [X] T002 [P] 建立訂單相關型別定義於 types/index.ts (Order, OrderItem, OrderTimeline, CartItem)
- [X] T003 [P] 建立購物車 Zod Schema 於 lib/validations/cart.schema.ts
- [X] T004 [P] 建立訂單 Zod Schema 於 lib/validations/order.schema.ts

---

## Phase 2: Foundational (阻塞性前置任務)

**目的**: 建立資料庫與核心函式，所有使用者故事都依賴此階段完成

**⚠️ 關鍵**: 此階段完成前無法開始任何使用者故事實作

- [X] T005 建立資料庫 Migration 檔案 supabase/migrations/20260107_create_orders.sql
- [X] T006 [P] 在 Migration 中建立 orders 表（含索引、RLS、觸發器）
- [X] T007 [P] 在 Migration 中建立 order_items 表（含索引、RLS）
- [X] T008 [P] 在 Migration 中建立 order_timelines 表（含索引、RLS）
- [X] T009 [P] 在 Migration 中建立 PostgreSQL Function: generate_order_number()
- [X] T010 [P] 在 Migration 中建立 PostgreSQL Function: confirm_order_and_deduct_stock()
- [X] T011 [P] 在 Migration 中建立 PostgreSQL Function: cancel_order_and_restore_stock()
- [X] T012 [P] 在 Migration 中建立 PostgreSQL Function: update_order_status()
- [X] T013 執行資料庫 Migration (supabase db reset)
- [X] T014 驗證 Migration 成功（檢查表、函式、索引、RLS 規則）

**檢查點**: 資料庫基礎架構完成，可開始使用者故事實作

---

## Phase 3: User Story 1 - 客戶加入商品到購物車 (Priority: P0) 🎯 MVP

**目標**: 客戶可將商品加入購物車、調整數量、查看總價，購物車資料持久化儲存

**獨立測試**: 客戶可在商品頁面加入購物車，在購物車頁面調整數量、移除商品、查看總價，重新整理後購物車內容仍存在

### 實作 User Story 1

- [X] T015 [P] [US1] 建立 Zustand 購物車 Store 於 stores/cart.ts（含 persist middleware）
- [X] T016 [P] [US1] 建立購物車 Server Action: validateCartItem 於 lib/actions/cart.ts
- [X] T017 [P] [US1] 建立購物車 Server Action: getCartItemsWithPrices 於 lib/actions/cart.ts
- [X] T018 [P] [US1] 建立購物車 Server Action: validateCartBeforeCheckout 於 lib/actions/cart.ts
- [X] T019 [P] [US1] 建立購物車商品項目元件於 components/shop/cart-item.tsx
- [X] T020 [P] [US1] 建立購物車摘要元件於 components/shop/cart-summary.tsx
- [X] T021 [US1] 建立購物車頁面於 app/(shop)/store/cart/page.tsx（整合 Zustand 與 Server Actions）
- [X] T022 [US1] 在客戶端 Navbar 新增購物車圖示與數量徽章
- [X] T023 [US1] 在商品頁面新增「加入購物車」按鈕（ProductWithPriceCard 元件）
- [X] T024 [US1] 整合測試：加入商品、調整數量、移除商品、購物車持久化

**檢查點**: User Story 1 完整可用，購物車功能可獨立測試 ✅

---

## Phase 4: User Story 2 - 客戶送出訂單 (Priority: P0)

**目標**: 客戶可從購物車送出訂單，系統產生訂單編號，清空購物車，客戶可查看訂單歷史

**獨立測試**: 客戶可在購物車點擊結帳，填寫備註，確認訂單後送出，系統顯示訂單編號與成功訊息，購物車清空，可在「我的訂單」頁面看到訂單

### 實作 User Story 2

- [X] T025 [P] [US2] 建立訂單 Server Action: createOrder 於 lib/actions/orders.ts（含訂單編號產生、價格快照、清空購物車）
- [X] T026 [P] [US2] 建立訂單 Server Action: getOrders 於 lib/actions/orders.ts（支援篩選與分頁）
- [X] T027 [P] [US2] 建立訂單 Server Action: getOrderById 於 lib/actions/orders.ts（含訂單明細與操作歷史）
- [X] T028 [P] [US2] 建立訂單狀態徽章元件於 components/shop/order-status-badge.tsx
- [X] T029 [P] [US2] 建立訂單卡片元件於 components/shop/order-card.tsx
- [X] T030 [US2] 建立訂單確認頁面於 app/(shop)/store/checkout/page.tsx（顯示商品列表、總金額、備註輸入）
- [X] T031 [US2] 建立客戶訂單列表頁面於 app/(shop)/store/orders/page.tsx（含狀態篩選）
- [X] T032 [US2] 建立客戶訂單詳情頁面於 app/(shop)/store/orders/[id]/page.tsx（顯示訂單明細）
- [X] T033 [US2] 整合測試：送出訂單、訂單編號唯一性、購物車清空、查看訂單歷史

**檢查點**: User Story 2 完整可用，客戶可獨立完成下單流程 ✅

---

## Phase 5: User Story 3 - 管理員查看與處理訂單 (Priority: P0)

**目標**: 管理員可查看所有訂單、篩選狀態、查看詳情、更新訂單狀態（待確認→已確認→出貨中→已完成）、取消訂單

**獨立測試**: 管理員可在 /admin/orders 查看訂單列表，點擊訂單查看詳情，將狀態從「待確認」改為「已確認」，系統記錄操作並扣減庫存，管理員也可取消訂單並回補庫存

### 實作 User Story 3

- [X] T034 [P] [US3] 建立訂單 Server Action: confirmOrder 於 lib/actions/orders.ts（呼叫 PostgreSQL Function 扣減庫存）
- [X] T035 [P] [US3] 建立訂單 Server Action: updateOrderStatus 於 lib/actions/orders.ts（更新訂單狀態）
- [X] T036 [P] [US3] 建立訂單 Server Action: cancelOrder 於 lib/actions/orders.ts（呼叫 PostgreSQL Function 回補庫存）
- [X] T037 [P] [US3] 建立訂單時間軸 Server Action: getOrderTimelines 於 lib/actions/order-timelines.ts
- [X] T038 [P] [US3] 建立管理員訂單列表元件於 components/admin/order-table.tsx（含篩選與搜尋）
- [X] T039 [P] [US3] 建立訂單狀態更新器元件於 components/admin/order-status-updater.tsx
- [X] T040 [P] [US3] 建立訂單操作歷史時間軸元件於 components/admin/order-timeline.tsx
- [X] T041 [P] [US3] 建立取消訂單按鈕元件於 components/admin/order-cancel-button.tsx（含確認對話框）
- [X] T042 [US3] 建立管理員訂單列表頁面於 app/(admin)/admin/orders/page.tsx
- [X] T043 [US3] 建立管理員訂單詳情頁面於 app/(admin)/admin/orders/[id]/page.tsx（含狀態更新、取消訂單、操作歷史）
- [X] T044 [US3] 整合測試：確認訂單並扣減庫存、更新訂單狀態、取消訂單並回補庫存、操作歷史記錄

**檢查點**: User Story 3 完整可用，管理員可獨立處理訂單流程 ✅

---

## Phase 6: User Story 4 - 客戶查看訂單歷史 (Priority: P1)

**目標**: 客戶可在前台查看自己的所有訂單列表、篩選狀態、查看訂單詳情

**獨立測試**: 客戶可在前台導航列點擊「我的訂單」，看到自己的所有訂單列表，篩選狀態，點擊訂單查看詳細資訊

### 實作 User Story 4

- [X] T045 [US4] 在客戶端導航列 (app/(shop)/layout.tsx) 新增「我的訂單」連結
- [X] T046 [US4] 驗證客戶訂單列表頁面 (app/(shop)/store/orders/page.tsx) 的 RLS 權限（客戶只能看到自己的訂單）
- [X] T047 [US4] 驗證客戶訂單詳情頁面 (app/(shop)/store/orders/[id]/page.tsx) 的 RLS 權限
- [X] T048 [US4] 整合測試：客戶 A 無法查看客戶 B 的訂單、空訂單列表顯示提示訊息

**檢查點**: User Story 4 完整可用，客戶可獨立查看訂單歷史

---

## Phase 7: User Story 5 - 訂單操作歷史記錄 (Priority: P2)

**目標**: 系統自動記錄訂單的所有狀態變更操作，管理員可在訂單詳情中查看完整的操作時間軸

**獨立測試**: 管理員可在訂單詳情頁面看到「操作歷史」區塊，顯示每個狀態變更的時間、操作者、動作描述

### 實作 User Story 5

- [X] T049 [US5] 驗證訂單建立時自動記錄操作歷史（action_type='created'）
- [X] T050 [US5] 驗證訂單狀態變更時自動記錄操作歷史（action_type='status_changed'）
- [X] T051 [US5] 驗證訂單取消時自動記錄操作歷史（action_type='cancelled'）
- [X] T052 [US5] 驗證操作歷史顯示正確的操作者名稱與時間
- [X] T053 [US5] 整合測試：完整訂單流程的操作歷史記錄完整性

**檢查點**: User Story 5 完整可用，訂單操作歷史可獨立追蹤

---

## Phase 8: Polish & Cross-Cutting Concerns

**目的**: 跨使用者故事的優化與品質保證

- [ ] T054 [P] 建立測試資料腳本於 specs/004-cart-and-orders/seed-test-data.sql
- [ ] T055 [P] 更新 CLAUDE.md 文件，記錄購物車與訂單系統的實作狀態
- [ ] T056 [P] Neo-Brutalism 設計風格一致性檢查（購物車與訂單相關 UI 元件）
- [ ] T057 [P] 效能優化：訂單列表查詢索引驗證
- [ ] T058 [P] 安全性檢查：RLS 規則完整性測試
- [ ] T059 執行 quickstart.md 驗證流程（資料庫 Migration → 測試資料 → 功能測試）
- [ ] T060 負庫存支援測試（下單、確認、取消訂單的負庫存情境）
- [ ] T061 並發訂單測試（訂單編號唯一性、庫存扣減一致性）
- [ ] T062 Edge Cases 測試（購物車中商品價格變更、商品停用、空購物車下單）
- [ ] T063 程式碼清理與重構（移除未使用的 import、統一命名規範）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成，**阻塞所有使用者故事**
- **User Stories (Phase 3-7)**: 全部依賴 Foundational 完成
  - US1-US3 為 P0 優先級，應優先完成
  - US4 為 P1，可在 US1-US3 後進行
  - US5 為 P2，可最後實作
- **Polish (Phase 8)**: 依賴所有使用者故事完成

### User Story Dependencies

- **User Story 1 (P0)**: 依賴 Foundational (Phase 2)，無其他故事相依性
- **User Story 2 (P0)**: 依賴 Foundational (Phase 2) + User Story 1（購物車功能）
- **User Story 3 (P0)**: 依賴 Foundational (Phase 2) + User Story 2（訂單資料）
- **User Story 4 (P1)**: 依賴 Foundational (Phase 2) + User Story 2（訂單資料），與 US3 獨立
- **User Story 5 (P2)**: 依賴 Foundational (Phase 2)，由 PostgreSQL Functions 自動實作，主要為驗證任務

### Within Each User Story

- Server Actions 可平行實作（標記 [P] 的任務）
- UI 元件可平行實作（標記 [P] 的任務）
- 頁面實作依賴對應的 Server Actions 與元件完成
- 整合測試必須在該故事的所有實作任務完成後執行

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 可平行執行（不同檔案）
- **Phase 2**: T006-T012 可平行執行（同一 Migration 檔案的不同區塊）
- **User Story 1**: T015-T020 可平行執行（不同檔案）
- **User Story 2**: T025-T029 可平行執行（不同檔案）
- **User Story 3**: T034-T041 可平行執行（不同檔案）
- **Phase 8**: T054-T058 可平行執行（不同檔案）
- **跨故事平行**：Foundation 完成後，US1 與 US4 可同時開始（US4 不依賴 US1）

---

## Parallel Example: User Story 1

```bash
# 同時啟動 Zustand Store 與 Server Actions（不同檔案）:
Task: "建立 Zustand 購物車 Store 於 stores/cart.ts"
Task: "建立購物車 Server Action: validateCartItem 於 lib/actions/cart.ts"
Task: "建立購物車 Server Action: getCartItemsWithPrices 於 lib/actions/cart.ts"
Task: "建立購物車 Server Action: validateCartBeforeCheckout 於 lib/actions/cart.ts"

# 同時啟動所有 UI 元件（不同檔案）:
Task: "建立購物車商品項目元件於 components/shop/cart-item.tsx"
Task: "建立購物車摘要元件於 components/shop/cart-summary.tsx"
```

---

## Parallel Example: User Story 3

```bash
# 同時啟動所有 Server Actions（不同函式，同一檔案可分區塊編輯）:
Task: "建立訂單 Server Action: confirmOrder 於 lib/actions/orders.ts"
Task: "建立訂單 Server Action: updateOrderStatus 於 lib/actions/orders.ts"
Task: "建立訂單 Server Action: cancelOrder 於 lib/actions/orders.ts"
Task: "建立訂單時間軸 Server Action: getOrderTimelines 於 lib/actions/order-timelines.ts"

# 同時啟動所有管理員 UI 元件（不同檔案）:
Task: "建立管理員訂單列表元件於 components/admin/order-table.tsx"
Task: "建立訂單狀態更新器元件於 components/admin/order-status-updater.tsx"
Task: "建立訂單操作歷史時間軸元件於 components/admin/order-timeline.tsx"
Task: "建立取消訂單按鈕元件於 components/admin/order-cancel-button.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only - P0 Core)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（**關鍵阻塞點**）
3. 完成 Phase 3: User Story 1（購物車）
4. **檢查點**: 測試購物車功能獨立運作
5. 完成 Phase 4: User Story 2（訂單建立）
6. **檢查點**: 測試完整下單流程
7. 完成 Phase 5: User Story 3（管理員訂單處理）
8. **檢查點**: 測試端到端訂單流程（客戶下單 → 管理員處理 → 庫存扣減）
9. **MVP 完成**: 可進行端到端測試與部署

### Incremental Delivery

1. **Foundation Ready**: Setup + Foundational → 資料庫與基礎架構完成
2. **Add US1**: 購物車功能 → 測試獨立運作 → 可展示購物車
3. **Add US2**: 訂單建立功能 → 測試獨立運作 → 可展示完整下單流程
4. **Add US3**: 管理員訂單處理 → 測試獨立運作 → **MVP 可部署**
5. **Add US4**: 客戶訂單歷史 → 測試獨立運作 → 增強客戶體驗
6. **Add US5**: 訂單操作歷史 → 測試獨立運作 → 完整稽核追蹤
7. **Polish**: 跨故事優化 → 生產環境準備就緒

### Parallel Team Strategy

若有多位開發者：

1. **全員完成 Setup + Foundational**
2. **Foundational 完成後分工**:
   - 開發者 A: User Story 1（購物車）
   - 開發者 B: User Story 4（客戶訂單歷史，不依賴 US1）
   - 開發者 C: 準備測試資料與驗證腳本
3. **US1 完成後**:
   - 開發者 A: User Story 2（訂單建立）
   - 開發者 B: User Story 5（操作歷史驗證）
4. **US2 完成後**:
   - 開發者 A: User Story 3（管理員訂單處理）
   - 開發者 B: 整合測試與文件更新
5. **故事獨立整合，互不阻塞**

---

## Notes

- **[P] 任務** = 不同檔案或不同函式，無相依性，可平行執行
- **[Story] 標籤** = 將任務對應到特定使用者故事，確保可追溯性
- **每個使用者故事應獨立可完成與測試**，避免跨故事的強耦合
- **負庫存支援** (憲章 VI): 所有庫存扣減與回補邏輯必須支援負數
- **價格快照機制**: 訂單明細必須保存下單當時的價格，後續價格調整不影響歷史訂單
- **RLS 權限控制**: 客戶只能查看自己的訂單，管理員可查看所有訂單
- **原子性操作**: 訂單確認與庫存扣減、訂單取消與庫存回補必須使用 PostgreSQL Functions 確保原子性
- **在每個檢查點驗證故事獨立運作**，確保增量交付品質
- **建議每完成一個任務或邏輯群組就 commit**，保持版本控制清晰

---

## Summary

- **總任務數**: 63 個任務
- **User Story 1 (P0)**: 10 個任務（購物車核心功能）
- **User Story 2 (P0)**: 9 個任務（訂單建立流程）
- **User Story 3 (P0)**: 11 個任務（管理員訂單處理）
- **User Story 4 (P1)**: 4 個任務（客戶訂單歷史）
- **User Story 5 (P2)**: 5 個任務（訂單操作歷史驗證）
- **Setup + Foundational**: 14 個任務（基礎架構）
- **Polish**: 10 個任務（品質保證與優化）

**建議 MVP 範圍**: Phase 1-5（US1-US3），共 44 個任務，涵蓋完整的購物車與訂單核心流程

**平行機會識別**:
- Phase 1: 3 個任務可平行
- Phase 2: 7 個任務可平行（資料表與函式）
- User Story 1: 6 個任務可平行（Store、Server Actions、UI 元件）
- User Story 2: 5 個任務可平行（Server Actions、UI 元件）
- User Story 3: 8 個任務可平行（Server Actions、UI 元件）
- Phase 8: 5 個任務可平行（測試與文件）

**格式驗證**: ✅ 所有任務遵循 `- [ ] [ID] [P?] [Story?] Description with file path` 格式

---

**Status**: ✅ Generated
**Generated by**: /speckit.tasks
**Date**: 2026-01-03
**Next**: Begin implementation following MVP-first strategy (Phase 1 → Phase 2 → Phase 3-5)
