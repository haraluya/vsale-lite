# Tasks: 統一對話框系統

**Input**: Design documents from `/specs/013-unified-dialog/`
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), contracts/ (✅)

**Tests**: 本專案未明確要求測試，因此任務清單不包含測試任務。

**Organization**: 任務按使用者故事分組，每個故事可獨立實作和驗證。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行執行（不同檔案、無相依性）
- **[Story]**: 所屬使用者故事（US1, US2, US3, US4）
- 包含明確檔案路徑

---

## Phase 1: Setup (共用基礎設施)

**Purpose**: 專案初始化與基本結構（Phase 0 已完成大部分工作）

- [x] T001 建立對話框元件目錄結構 `components/ui/dialogs/`
- [x] T002 初始化 TypeScript 型別定義 `types/dialog.ts`
- [x] T003 [P] 安裝 sonner Toast 依賴 `pnpm add sonner`

**Checkpoint**: ✅ Phase 0 已完成 - 基礎元件與 DialogProvider 已建立

---

## Phase 2: Foundational (阻塞性前置作業)

**Purpose**: 所有使用者故事都依賴的核心基礎設施

**⚠️ CRITICAL**: 此階段必須完成後才能進行使用者故事實作

- [x] T004 建立 DialogProvider Context `lib/contexts/dialog-context.tsx`
- [x] T005 [P] 實作 useAlert Hook 邏輯 `lib/contexts/dialog-context.tsx`
- [x] T006 [P] 實作 useConfirm Hook 邏輯 `lib/contexts/dialog-context.tsx`
- [x] T007 [P] 實作 usePrompt Hook 邏輯 `lib/contexts/dialog-context.tsx`
- [x] T008 [P] 建立 AlertDialog 元件 `components/ui/dialogs/alert-dialog.tsx`
- [x] T009 [P] 建立 ConfirmDialog 元件 `components/ui/dialogs/confirm-dialog.tsx`
- [x] T010 [P] 建立 PromptDialog 元件 `components/ui/dialogs/prompt-dialog.tsx`
- [x] T011 整合 DialogProvider 至根 Layout `app/layout.tsx`
- [x] T012 整合 sonner Toaster 至根 Layout `app/layout.tsx`
- [x] T013 建立樣本頁面 `app/(admin)/admin/dialog-samples/page.tsx`

**Checkpoint**: ✅ Phase 0 已完成 - 基礎設施就緒，使用者故事可並行實作

---

## Phase 3: User Story 1 - 開發者使用統一 Hook 替代原生對話框 (Priority: P1) 🎯 MVP

**Goal**: 提供完整可用的 Hook API，開發者可在元件中使用 useAlert、useConfirm、usePrompt

**Independent Test**: 在任一元件中匯入 Hook 並呼叫，驗證對話框正常顯示且符合設計規範

### Implementation for User Story 1

- [x] T014 [US1] 驗證 useAlert Hook API 可正常呼叫 `lib/contexts/dialog-context.tsx`
- [x] T015 [US1] 驗證 useConfirm Hook API 可正常呼叫 `lib/contexts/dialog-context.tsx`
- [x] T016 [US1] 驗證 usePrompt Hook API 可正常呼叫 `lib/contexts/dialog-context.tsx`
- [x] T017 [US1] 驗證對話框佇列機制（連續呼叫處理）`lib/contexts/dialog-context.tsx`
- [x] T018 [US1] 驗證背景滾動鎖定功能 `components/ui/dialogs/*.tsx`
- [x] T019 [US1] 驗證 ESC 鍵關閉功能 `components/ui/dialogs/*.tsx`
- [x] T020 [US1] 驗證背景點擊關閉功能 `components/ui/dialogs/*.tsx`

**Checkpoint**: ✅ Phase 0 已完成 - 使用者故事 1 可獨立驗證且功能完整

---

## Phase 4: User Story 2 - 使用者在所有頁面看到一致的對話框設計 (Priority: P1)

**Goal**: 遷移專案中所有原生對話框，確保設計一致性

**Independent Test**: 瀏覽任一功能，觸發對話框時驗證 Neo-Brutalism 設計規範

### P0 高頻核心功能遷移 (5 個檔案，7 個對話框)

- [x] T021 [P] [US2] 遷移會員等級刪除確認 `components/admin/tier-table.tsx:141`
- [x] T022 [P] [US2] 遷移優惠券刪除確認 `components/admin/coupons/CouponList.tsx`
- [x] T023 [P] [US2] 遷移訂單取消確認 `components/admin/order-actions.tsx`
- [x] T024 [US2] 遷移商品管理對話框（3 confirm + 3 alert）`components/admin/product-table.tsx`
- [x] T025 [P] [US2] 遷移分類刪除確認 `components/admin/category-table.tsx`

### P1 中頻功能遷移 (10 個檔案，40 個對話框)

- [ ] T026 [P] [US2] 遷移公告表單驗證 `components/admin/announcements/AnnouncementForm.tsx`
- [ ] T027 [P] [US2] 遷移公告列表對話框 `components/admin/announcements/AnnouncementListClient.tsx`
- [ ] T028 [P] [US2] 遷移 Logo 上傳驗證 `components/admin/LogoUploader.tsx`
- [ ] T029 [P] [US2] 遷移系列刪除按鈕對話框 `components/admin/series-delete-button.tsx`
- [ ] T030 [P] [US2] 遷移商品標籤表格對話框 `components/admin/product-table-with-tags.tsx`
- [ ] T031 [US2] 遷移成員管理對話框（含 prompt）`components/admin/MemberListClient.tsx`
- [ ] T032 [P] [US2] 遷移客戶表格 alert `components/admin/client-table.tsx`
- [ ] T033 [P] [US2] 遷移會員等級表單 alert `components/admin/tier-form.tsx`
- [ ] T034 [P] [US2] 遷移密碼更新表單 alert `components/admin/update-password-form.tsx`
- [ ] T035 [P] [US2] 遷移價格表單 alert `components/admin/pricing/ProductPricingForm.tsx`

### P2 低頻功能遷移 (9 個檔案，25 個對話框)

- [ ] T036 [US2] 遷移訂單編輯器對話框（3 alert + 2 confirm + 2 prompt）`components/admin/orders/order-editor.tsx`
- [ ] T037 [P] [US2] 遷移訂單詳情確認 `components/admin/orders/order-detail-content.tsx`
- [ ] T038 [P] [US2] 遷移前台商品卡 alert `components/shop/product-with-price-card.tsx`
- [ ] T039 [US2] 遷移前台導覽列對話框（confirm + alert）`components/shop/navbar.tsx`
- [ ] T040 [P] [US2] 遷移圖片上傳確認 `components/ui/image-upload.tsx`
- [ ] T041 [P] [US2] 遷移客戶表單 alert `components/admin/client-form.tsx`
- [ ] T042 [P] [US2] 遷移客戶表單 v2 alert `components/admin/client-form-v2.tsx`
- [ ] T043 [P] [US2] 遷移分類表單 alert `components/admin/category-form.tsx`

**Checkpoint**: 所有 18 個檔案的 72 個原生對話框已替換，設計一致性達成

---

## Phase 5: User Story 3 - 系統管理員批量遷移現有對話框 (Priority: P2)

**Goal**: 完成所有檔案遷移，驗證功能正常且無錯誤

**Independent Test**: 執行全專案搜尋 `alert(`、`confirm(`、`prompt(`，僅找到型別定義中的引用

### Implementation for User Story 3

- [ ] T044 [US3] 執行全專案搜尋驗證無原生對話框呼叫
- [ ] T045 [US3] 執行 TypeScript 型別檢查 `pnpm type-check`
- [ ] T046 [US3] 執行 ESLint 檢查 `pnpm lint`
- [ ] T047 [US3] 執行全功能手動測試（18 個檔案逐一驗證）
- [ ] T048 [US3] 執行跨瀏覽器測試（Chrome、Firefox、Edge）
- [ ] T049 [US3] 執行行動裝置測試（iOS Safari、Android Chrome）

**Checkpoint**: 所有檔案遷移完成，功能測試通過，無原生對話框殘留

---

## Phase 6: User Story 4 - 開發者被 ESLint 阻止使用原生對話框 (Priority: P3)

**Goal**: 配置 ESLint 規則，預防未來引入原生對話框

**Independent Test**: 撰寫包含 `alert('test')` 的程式碼，執行 ESLint 應顯示錯誤

### Implementation for User Story 4

- [ ] T050 [US4] 配置 ESLint no-restricted-globals 規則 `.eslintrc.json`
- [ ] T051 [US4] 測試 ESLint 規則生效（alert 錯誤提示）
- [ ] T052 [US4] 測試 ESLint 規則生效（confirm 錯誤提示）
- [ ] T053 [US4] 測試 ESLint 規則生效（prompt 錯誤提示）
- [ ] T054 [US4] 驗證測試檔案排除清單正確
- [ ] T055 [US4] 更新 Git pre-commit hook（若存在）

**Checkpoint**: ESLint 規則成功阻止新程式碼使用原生對話框

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 影響多個使用者故事的改善項目

- [ ] T056 [P] 更新 CLAUDE.md 對話框使用規範 `CLAUDE.md`
- [ ] T057 [P] 更新 quickstart.md 使用範例 `specs/013-unified-dialog/quickstart.md`
- [ ] T058 [P] 更新 API 合約文件 `specs/013-unified-dialog/contracts/`
- [ ] T059 [P] 執行無障礙測試（axe DevTools）
- [ ] T060 [P] 執行螢幕閱讀器測試（NVDA/VoiceOver）
- [ ] T061 [P] 執行效能監控（響應時間、動畫 FPS）
- [ ] T062 程式碼清理（移除已棄用的 confirm-dialog.tsx）
- [ ] T063 最終品質檢查（Constitution Check、Success Criteria）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - ✅ 已完成
- **Foundational (Phase 2)**: 依賴 Setup - ✅ 已完成 - 阻塞所有使用者故事
- **User Stories (Phase 3-6)**: 所有依賴 Foundational 完成
  - User Story 1 (Phase 3): ✅ 已完成 - 獨立可測試
  - User Story 2 (Phase 4): 可並行遷移多個檔案 - **當前階段**
  - User Story 3 (Phase 5): 依賴 User Story 2 完成
  - User Story 4 (Phase 6): 依賴 User Story 2-3 完成
- **Polish (Phase 7)**: 依賴所有使用者故事完成

### User Story Dependencies

- **User Story 1 (P1)**: ✅ 已完成 - 無依賴
- **User Story 2 (P1)**: 可開始 - 遷移可並行（不同檔案無衝突）
- **User Story 3 (P2)**: 依賴 User Story 2 完成 - 驗證遷移成果
- **User Story 4 (P3)**: 依賴 User Story 2-3 完成 - 預防未來引入

### Within Each User Story

- **User Story 2 遷移策略**:
  - P0 檔案優先（T021-T025）- 5 個任務可並行
  - P1 檔案次之（T026-T035）- 10 個任務可並行
  - P2 檔案最後（T036-T043）- 8 個任務可並行
  - 每個檔案遷移後立即測試，確認功能正常再進行下一個

### Parallel Opportunities

- **Setup Phase**: T001-T003 可並行（不同檔案）
- **Foundational Phase**: T005-T010 可並行（獨立元件）
- **User Story 1**: T014-T020 可並行（驗證測試）
- **User Story 2**:
  - P0 遷移：T021-T023, T025 可並行（不同檔案，僅 T024 較複雜需單獨處理）
  - P1 遷移：T026-T030, T032-T035 可並行（僅 T031 需單獨處理）
  - P2 遷移：T037-T043 可並行（僅 T036, T039 需單獨處理）
- **User Story 4**: T051-T054 可並行（測試不同規則）
- **Polish Phase**: T056-T061 可並行（獨立任務）

---

## Parallel Example: User Story 2 - P0 遷移

```bash
# 並行遷移 P0 高頻檔案（4 個簡單檔案同時處理）:
Task: "遷移會員等級刪除確認 components/admin/tier-table.tsx:141"
Task: "遷移優惠券刪除確認 components/admin/coupons/CouponList.tsx"
Task: "遷移訂單取消確認 components/admin/order-actions.tsx"
Task: "遷移分類刪除確認 components/admin/category-table.tsx"

# 單獨處理複雜檔案:
Task: "遷移商品管理對話框（3 confirm + 3 alert）components/admin/product-table.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 P0)

1. ✅ 完成 Phase 1: Setup
2. ✅ 完成 Phase 2: Foundational
3. ✅ 完成 Phase 3: User Story 1（Hook API 驗證）
4. 完成 Phase 4 - P0 遷移（5 個高頻檔案）
5. **STOP and VALIDATE**: 測試 5 個高頻功能是否正常
6. 部署/示範（若就緒）

### Incremental Delivery

1. ✅ Setup + Foundational → 基礎設施就緒
2. ✅ User Story 1 → Hook API 可用 → 示範 `/admin/dialog-samples`（MVP!）
3. User Story 2 - P0 → 高頻功能遷移 → 測試獨立 → 部署/示範
4. User Story 2 - P1 → 中頻功能遷移 → 測試獨立 → 部署/示範
5. User Story 2 - P2 → 低頻功能遷移 → 測試獨立 → 部署/示範
6. User Story 3 → 驗證遷移完整性
7. User Story 4 → ESLint 規則預防未來問題
8. Phase 7 → 文件與品質保證

### Parallel Team Strategy

若有多位開發者：

1. ✅ 團隊共同完成 Setup + Foundational
2. 一旦 Foundational 完成：
   - **Developer A**: User Story 2 - P0 遷移（T021-T025）
   - **Developer B**: User Story 2 - P1 遷移（T026-T035）
   - **Developer C**: User Story 2 - P2 遷移（T036-T043）
3. 遷移完成後：
   - **Developer A**: User Story 3 驗證
   - **Developer B**: User Story 4 ESLint 配置
   - **Developer C**: Phase 7 文件撰寫

---

## Notes

- **[P] 任務** = 不同檔案、無相依性，可並行執行
- **[Story] 標籤** 用於追蹤任務屬於哪個使用者故事
- 每個使用者故事應可獨立完成和測試
- 在任何 Checkpoint 停下來驗證故事獨立性
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨故事依賴
- **遷移檢查清單**（每個檔案）:
  1. 匯入 Hook（`useAlert` / `useConfirm` / `usePrompt`）
  2. 替換原生對話框為 Hook 呼叫
  3. 選擇適當 variant（success / error / warning / info / danger）
  4. 測試對話框功能（ESC、背景點擊、按鈕效果）
  5. 測試業務邏輯正常
  6. TypeScript 型別檢查通過
  7. Git commit 單一檔案變更

---

## Progress Tracking

**Phase 0 (Setup & Foundational)**: ✅ 13/13 已完成 (100%)
**Phase 3 (US1 - Hook API)**: ✅ 7/7 已完成 (100%)
**Phase 4 (US2 - 遷移)**: 🚧 5/23 進行中 (22%)
  - P0 高頻: ✅ 5/5 已完成 (100%)
  - P1 中頻: 📋 0/10 待開始 (0%)
  - P2 低頻: 📋 0/8 待開始 (0%)
**Phase 5 (US3 - 驗證)**: 📋 0/6 待開始 (0%)
**Phase 6 (US4 - ESLint)**: 📋 0/6 待開始 (0%)
**Phase 7 (Polish)**: 📋 0/8 待開始 (0%)

**總進度**: 25/63 任務完成 (40%)

**下一步**: 繼續 Phase 4 - User Story 2 遷移（P1 中頻檔案）
