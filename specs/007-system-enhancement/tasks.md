# Tasks: 系統擴充功能集

**Feature**: 007-system-enhancement
**Input**: Design documents from `/specs/007-system-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: 任務依使用者故事分組，以支援獨立實作與測試

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無依賴關係）
- **[Story]**: 任務所屬的使用者故事（US1, US2, US3, US4, US5）
- 描述包含明確的檔案路徑

---

## Phase 1: Setup (專案初始化)

**目的**: 資料庫 Migration 與基礎設定

- [X] T001 執行資料庫 Migration 腳本 supabase/migrations/20260109_system_enhancement.sql
- [X] T002 驗證資料表與欄位建立（profiles.address, profiles.admin_notes, announcements 表）
- [X] T003 驗證 RLS 策略啟用（order_timelines 留言策略、announcements 策略）
- [X] T004 [P] 更新 TypeScript 型別定義 types/index.ts（OrderTimeline, Announcement, AdminClientProfile）

---

## Phase 2: Foundational (基礎建設)

**目的**: 所有使用者故事依賴的核心基礎設施

**⚠️ 關鍵**: 此階段完成前，無法開始任何使用者故事實作

- [X] T005 [P] 新增訂單留言 Zod Schema lib/validations/order.schema.ts（addOrderCommentSchema）
- [X] T006 [P] 新增客戶管理 Zod Schema lib/validations/client.schema.ts（updateClientSchema）
- [X] T007 [P] 新增廣告管理 Zod Schema lib/validations/announcement.schema.ts（createAnnouncementSchema, updateAnnouncementSchema）
- [X] T008 驗證既有 checkAuth() helper 可正確區分客戶與管理員角色 lib/actions/helpers.ts

**檢查點**: 基礎建設完成 ✅ - 使用者故事可開始平行實作

---

## Phase 3: User Story 1 - 訂單雙向溝通系統 (Priority: P0) 🎯

**目標**: 實作訂單留言功能，允許客戶與管理員在訂單處理過程中進行雙向溝通

**獨立測試**: 建立測試訂單，由客戶端與管理端分別新增留言，驗證留言顯示、時間軸排序、角色區分是否正確

### Implementation for User Story 1

- [X] T009 [P] [US1] 實作 addOrderComment Server Action lib/actions/orders.ts
- [X] T010 [P] [US1] 實作 getOrderTimeline Server Action lib/actions/orders.ts
- [ ] T011 [US1] 更新前台訂單詳情頁 app/(shop)/store/orders/[id]/page.tsx（新增留言區塊與時間軸顯示）
- [ ] T012 [US1] 更新後台訂單詳情頁 app/(admin)/admin/orders/[id]/page.tsx（新增留言區塊與時間軸顯示）
- [ ] T013 [US1] 新增訂單時間軸元件 components/orders/OrderTimeline.tsx（氣泡式設計，客戶左灰、管理員右藍）
- [ ] T014 [US1] 新增留言輸入元件 components/orders/CommentInput.tsx（獨立可重用元件，含字數統計 X/500，可用於前台與後台）
- [ ] T015 [US1] 測試客戶僅能在自己的訂單留言（權限驗證）
- [ ] T016 [US1] 測試管理員可在任何訂單留言（權限驗證）
- [ ] T017 [US1] 測試留言字數超過 500 字時的錯誤處理

**檢查點**: User Story 1 應完全可用且可獨立測試

---

## Phase 4: User Story 2 - 客戶資訊完整化管理 (Priority: P0)

**目標**: 擴充客戶資料管理功能，支援常用地址與管理員備註，並確保 RLS 完全隔離

**獨立測試**: 編輯客戶資料，新增地址與備註，然後在訂單詳情頁驗證資訊顯示，並確認客戶端無法看到管理員備註

### Implementation for User Story 2

- [ ] T018 [P] [US2] 實作 getClientProfile Server Action lib/actions/clients.ts（客戶端，排除 admin_notes）
- [ ] T019 [P] [US2] 實作 getAdminClientProfile Server Action lib/actions/clients.ts（管理端，包含 admin_notes）
- [ ] T020 [P] [US2] 實作 updateClient Server Action lib/actions/clients.ts（管理端，可更新 address 與 admin_notes）
- [ ] T021 [P] [US2] 實作 getClientList Server Action lib/actions/clients.ts（管理端，含摘要欄位）
- [ ] T022 [US2] 更新客戶編輯頁 app/(admin)/admin/users/[id]/edit/page.tsx（新增地址與備註欄位）
- [ ] T023 [US2] 更新客戶列表頁 app/(admin)/admin/users/page.tsx（顯示地址與備註摘要，最多 30 字）
- [ ] T024 [US2] 更新訂單詳情頁客戶資訊區塊（前台與後台，顯示地址與備註）
- [ ] T025 [US2] 新增客戶編輯表單元件 components/admin/clients/ClientEditForm.tsx（含地址與備註 Textarea）
- [ ] T026 [US2] 測試客戶端無法查詢 admin_notes 欄位（RLS 驗證）
- [ ] T027 [US2] 測試管理員可查詢與編輯 admin_notes（功能驗證）

**檢查點**: User Stories 1 和 2 應可獨立運作

---

## Phase 5: User Story 3 - 系列頁商品圖片即時預覽 (Priority: P1)

**目標**: 實作系列頁面的商品圖片切換功能，客戶點擊商品卡片可切換大圖

**獨立測試**: 在系列頁點擊有圖片的商品卡片，驗證大圖切換，並測試點擊空白處或 X 按鈕恢復系列圖片

### Implementation for User Story 3

- [ ] T028 [P] [US3] 新增系列頁圖片切換元件 components/series/SeriesHeroImage.tsx（使用 CSS Transition 淡入淡出）
- [ ] T029 [US3] 更新系列詳情頁 app/(shop)/store/series/[id]/page.tsx（整合圖片切換元件）
- [ ] T030 [US3] 更新商品卡片樣式（有圖片：可點擊，無圖片：禁用狀態半透明）
- [ ] T031 [US3] 新增大圖關閉按鈕（X 圖示，點擊恢復系列圖片）
- [ ] T032 [US3] 測試圖片切換動畫流暢度（300ms 過渡效果）
- [ ] T033 [US3] 測試無圖片商品卡片禁用狀態

**檢查點**: User Stories 1, 2, 3 應可獨立運作

---

## Phase 6: User Story 4 - 廣告輪播系統 (Priority: P1)

**目標**: 實作前台首頁廣告輪播功能與後台廣告管理系統

**獨立測試**: 在後台新增測試廣告並設定連結，然後在前台首頁驗證輪播顯示、點擊跳轉、左右切換

### Implementation for User Story 4

- [ ] T034 [P] [US4] 實作 getActiveAnnouncements Server Action lib/actions/announcements.ts（前台，僅啟用的廣告）
- [ ] T035 [P] [US4] 實作 getAllAnnouncements Server Action lib/actions/announcements.ts（管理端，所有廣告）
- [ ] T036 [P] [US4] 實作 createAnnouncement Server Action lib/actions/announcements.ts（管理端）
- [ ] T037 [P] [US4] 實作 updateAnnouncement Server Action lib/actions/announcements.ts（管理端）
- [ ] T038 [P] [US4] 實作 deleteAnnouncement Server Action lib/actions/announcements.ts（管理端，同時刪除圖片）
- [ ] T039 [P] [US4] 實作 uploadAnnouncementImage Server Action lib/actions/announcements.ts（管理端，儲存至 Supabase Storage，路徑：announcements/{id}/main.{ext}，含檔案大小驗證最大 5MB）
- [ ] T040 [US4] 新增廣告輪播元件 components/announcements/AnnouncementCarousel.tsx（自動播放、左右箭頭、指示器）
- [ ] T041 [US4] 更新前台首頁 app/(shop)/store/page.tsx（整合廣告輪播元件）
- [ ] T042 [US4] 新增後台廣告管理頁面 app/(admin)/admin/announcements/page.tsx（列表顯示、CRUD 操作）
- [ ] T043 [US4] 新增後台廣告編輯頁面 app/(admin)/admin/announcements/[id]/edit/page.tsx（表單與圖片上傳）
- [ ] T044 [US4] 新增廣告表單元件 components/admin/announcements/AnnouncementForm.tsx（標題、連結、排序、圖片上傳）
- [ ] T045 [US4] 測試輪播自動播放功能（每 5 秒切換）
- [ ] T046 [US4] 測試左右箭頭切換功能
- [ ] T047 [US4] 測試廣告點擊跳轉功能
- [ ] T048 [US4] 測試停用廣告後前台不顯示
- [ ] T049 [US4] 測試廣告超過 5 則時僅顯示前 5 則

**檢查點**: User Stories 1, 2, 3, 4 應可獨立運作

---

## Phase 7: User Story 5 - 價格管理優化（選擇商品模式） (Priority: P2)

**目標**: 新增「選擇商品」模式的價格管理 UI，支援針對單一商品設定所有等級的價格

**獨立測試**: 在價格管理頁切換至「選擇商品」模式，選擇單一商品，驗證所有等級的價格顯示與儲存功能

### Implementation for User Story 5

- [ ] T050 [P] [US5] 實作 getProductPriceMatrix Server Action lib/actions/pricing.ts（查詢商品 × 所有等級的價格矩陣）
- [ ] T051 [P] [US5] 實作 batchSetProductPrices Server Action lib/actions/pricing.ts（批次設定商品價格，UPSERT 邏輯）
- [ ] T052 [P] [US5] 實作 getProductsForPricing Server Action lib/actions/pricing.ts（查詢商品列表用於下拉選單）
- [ ] T053 [US5] 更新價格管理頁 app/(admin)/admin/pricing/page.tsx（新增標籤切換 UI）
- [ ] T054 [US5] 新增商品價格表單元件 components/admin/pricing/ProductPricingForm.tsx（商品下拉選單、價格矩陣表格）
- [ ] T055 [US5] 實作價格矩陣表格（零售價格唯讀、其他等級可編輯）
- [ ] T056 [US5] 新增零售價格提示訊息（「零售價格請至商品編輯頁修改」）
- [ ] T057 [US5] 測試選擇商品後價格矩陣正確顯示
- [ ] T058 [US5] 測試零售等級價格唯讀無法修改
- [ ] T059 [US5] 測試批次儲存價格功能
- [ ] T060 [US5] 測試「選擇系列」與「選擇商品」模式切換

**檢查點**: 所有使用者故事應可獨立運作

---

## Phase 8: Polish & Cross-Cutting Concerns

**目的**: 跨功能改善與品質保證

- [ ] T061 [P] 更新 CLAUDE.md 文件（記錄新增功能與架構變更）
- [ ] T062 [P] 更新 README.md（新增功能說明）
- [ ] T063 程式碼清理與重構（移除重複程式碼、優化效能）
- [ ] T064 [P] 執行 TypeScript 型別檢查 pnpm type-check
- [ ] T065 [P] 執行 ESLint 檢查 pnpm lint
- [ ] T066 驗證所有 Neo-Brutalism 設計風格一致性（2-3px 黑邊框、shadow-neo）
- [ ] T067 驗證所有 Server Actions 包含 Zod 驗證與權限檢查
- [ ] T068 驗證所有 RLS 策略正確啟用（order_timelines, profiles, announcements）
- [ ] T069 執行 quickstart.md 驗證流程（Phase 1-5 所有測試案例）
- [ ] T070 效能測試（訂單留言提交 < 3s、圖片切換 < 1s、輪播自動播放流暢）
- [ ] T071 安全性測試（客戶端無法查詢 admin_notes、客戶無法在他人訂單留言）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴關係 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Phase 1 完成 - **阻擋所有使用者故事**
- **User Stories (Phase 3-7)**: 所有依賴 Phase 2 完成
  - User Stories 可平行進行（若有人力）
  - 或依優先級順序執行（P0 → P1 → P2）
- **Polish (Phase 8)**: 依賴所有必要的 User Stories 完成

### User Story Dependencies

- **User Story 1 (P0)**: 可在 Phase 2 完成後開始 - 無其他故事依賴
- **User Story 2 (P0)**: 可在 Phase 2 完成後開始 - 無其他故事依賴
- **User Story 3 (P1)**: 可在 Phase 2 完成後開始 - 無其他故事依賴
- **User Story 4 (P1)**: 可在 Phase 2 完成後開始 - 無其他故事依賴
- **User Story 5 (P2)**: 可在 Phase 2 完成後開始 - 無其他故事依賴

### Within Each User Story

- Server Actions 先於 UI 元件
- UI 元件先於整合測試
- 核心實作先於整合功能
- 故事完成後再進入下一優先級

### Parallel Opportunities

- Phase 1 所有任務標記 [P] 可平行執行
- Phase 2 所有任務標記 [P] 可平行執行
- Phase 2 完成後，所有 User Stories 可平行開始（若團隊人力允許）
- 每個 User Story 內標記 [P] 的任務可平行執行
- 不同 User Stories 可由不同團隊成員平行開發

---

## Parallel Example: User Story 1

```bash
# 同時啟動 User Story 1 的所有 Server Actions（標記 [P]）:
Task: "實作 addOrderComment Server Action lib/actions/orders.ts"
Task: "實作 getOrderTimeline Server Action lib/actions/orders.ts"

# Server Actions 完成後，可同時開發前台與後台 UI:
Task: "更新前台訂單詳情頁 app/(shop)/store/orders/[id]/page.tsx"
Task: "更新後台訂單詳情頁 app/(admin)/admin/orders/[id]/page.tsx"
Task: "新增訂單時間軸元件 components/orders/OrderTimeline.tsx"
Task: "新增留言輸入元件 components/orders/CommentInput.tsx"
```

---

## Parallel Example: User Story 4

```bash
# 同時啟動 User Story 4 的所有 Server Actions（標記 [P]）:
Task: "實作 getActiveAnnouncements Server Action lib/actions/announcements.ts"
Task: "實作 getAllAnnouncements Server Action lib/actions/announcements.ts"
Task: "實作 createAnnouncement Server Action lib/actions/announcements.ts"
Task: "實作 updateAnnouncement Server Action lib/actions/announcements.ts"
Task: "實作 deleteAnnouncement Server Action lib/actions/announcements.ts"
Task: "實作 uploadAnnouncementImage Server Action lib/actions/announcements.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - P0 優先)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（**關鍵 - 阻擋所有故事**）
3. 完成 Phase 3: User Story 1（訂單留言系統）
4. 完成 Phase 4: User Story 2（客戶管理擴充）
5. **停止並驗證**: 獨立測試 US1 與 US2
6. 準備好即可部署/展示

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎建設就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示（MVP - P0!）
3. 新增 User Story 2 → 獨立測試 → 部署/展示（MVP - P0!）
4. 新增 User Story 3 → 獨立測試 → 部署/展示（P1）
5. 新增 User Story 4 → 獨立測試 → 部署/展示（P1）
6. 新增 User Story 5 → 獨立測試 → 部署/展示（P2）
7. 每個故事增加價值而不破壞先前的故事

### Parallel Team Strategy

若有多位開發者：

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後：
   - Developer A: User Story 1 (P0)
   - Developer B: User Story 2 (P0)
   - Developer C: User Story 3 (P1)
   - Developer D: User Story 4 (P1)
3. 故事獨立完成並整合

---

## Summary

### Total Tasks: 71

### Tasks by User Story:
- **Setup (Phase 1)**: 4 任務
- **Foundational (Phase 2)**: 4 任務
- **User Story 1 (P0)**: 9 任務（訂單雙向溝通系統）
- **User Story 2 (P0)**: 10 任務（客戶資訊完整化管理）
- **User Story 3 (P1)**: 6 任務（系列頁商品圖片即時預覽）
- **User Story 4 (P1)**: 16 任務（廣告輪播系統）
- **User Story 5 (P2)**: 11 任務（價格管理優化）
- **Polish (Phase 8)**: 11 任務

### Parallel Opportunities Identified:
- Phase 1: 1 個平行任務
- Phase 2: 3 個平行任務
- User Story 1: 2 個平行任務
- User Story 2: 4 個平行任務
- User Story 3: 1 個平行任務
- User Story 4: 6 個平行任務
- User Story 5: 3 個平行任務
- Phase 8: 4 個平行任務

### Independent Test Criteria:
- **US1**: 建立測試訂單，由客戶端與管理端分別新增留言，驗證留言顯示、時間軸排序、角色區分
- **US2**: 編輯客戶資料，新增地址與備註，在訂單詳情頁驗證資訊顯示，確認客戶端無法看到管理員備註
- **US3**: 在系列頁點擊有圖片的商品卡片，驗證大圖切換，測試點擊空白處或 X 按鈕恢復系列圖片
- **US4**: 在後台新增測試廣告並設定連結，在前台首頁驗證輪播顯示、點擊跳轉、左右切換
- **US5**: 在價格管理頁切換至「選擇商品」模式，選擇單一商品，驗證所有等級的價格顯示與儲存

### Suggested MVP Scope:
**Phase 1 + Phase 2 + User Story 1 + User Story 2** (P0 優先功能)
- 訂單雙向溝通系統（解決 LINE/電話溝通混亂問題）
- 客戶資訊完整化管理（提升訂單處理效率）
- 總計：27 任務

### Format Validation:
✅ 所有任務遵循 checklist 格式（checkbox + ID + labels + file paths）
✅ 所有 User Story 任務包含 [Story] 標籤（US1-US5）
✅ 所有平行任務包含 [P] 標記
✅ Setup 與 Foundational 任務無 [Story] 標籤
✅ Polish 任務無 [Story] 標籤

---

## Notes

- [P] 任務 = 不同檔案、無依賴關係
- [Story] 標籤將任務對應到特定使用者故事以便追蹤
- 每個使用者故事應可獨立完成與測試
- 在每個檢查點停止以獨立驗證故事
- 每個任務或邏輯群組後提交 commit
- 避免：模糊任務、相同檔案衝突、破壞獨立性的跨故事依賴
