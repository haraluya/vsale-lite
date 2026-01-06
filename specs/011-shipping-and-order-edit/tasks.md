# Tasks: Feature 011 - 運費設定與訂單修改系統

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**輸入文件**: spec.md, plan.md, data-model.md, research.md, contracts/
**最後更新**: 2026-01-06
**總任務數**: 91 個
**預估工作量**: 15-16 小時

---

## 格式說明

- **[P]**: 可並行執行（不同檔案、無相依性）
- **[Story]**: 所屬使用者故事（US1, US2, US3...）
- 所有任務包含明確的檔案路徑

---

## Phase 1: Setup（專案準備）

**目的**: 環境準備與相依性檢查

- [ ] T001 確認本地 Supabase 正常運行（supabase start）
- [ ] T002 檢查現有訂單資料（確認是否有 confirmed 狀態訂單）
- [ ] T003 [P] 備份生產環境資料庫（pg_dump）
- [ ] T004 [P] 建立 Feature Branch: feature/011-shipping-and-order-edit

**Checkpoint**: 環境準備完成，可開始開發

---

## Phase 2: Foundational（資料庫基礎建設）

**目的**: 核心資料表結構與函數，所有使用者故事的前置條件

**⚠️ CRITICAL**: 此階段必須完成後，所有使用者故事才能開始實作

### 資料庫 Migration

- [ ] T005 建立 Migration: supabase/migrations/20260106_add_shipping_features.sql
- [ ] T006 [P] 在 Migration 中新增 tiers.shipping_fee, tiers.free_shipping_threshold 欄位
- [ ] T007 [P] 在 Migration 中新增 orders.shipping_fee 欄位
- [ ] T008 在 Migration 中建立 order_custom_fees 表（含索引與 RLS）
- [ ] T009 在 Migration 中建立 calculate_shipping_fee() PostgreSQL Function
- [ ] T010 建立 Migration: supabase/migrations/20260107_remove_confirmed_status.sql
- [ ] T011 在 Migration 中更新現有訂單狀態（confirmed → shipping）
- [ ] T012 在 Migration 中修改 orders.status CHECK 約束（移除 confirmed）
- [ ] T013 在 Migration 中刪除 confirm_order_and_deduct_stock() 函數
- [ ] T014 在 Migration 中建立 mark_order_as_shipping() PostgreSQL Function
- [ ] T015 建立 Migration: supabase/migrations/20260108_extend_order_timelines.sql
- [ ] T016 在 Migration 中新增 order_timelines.modifications JSONB 欄位
- [ ] T017 在 Migration 中擴展 order_timelines.action_type CHECK 約束（新增 order_modified）
- [ ] T018 在 Migration 中建立 update_order_with_modifications() PostgreSQL Function
- [ ] T019 在 Migration 中建立 GIN 索引於 order_timelines.modifications

### TypeScript 型別定義

- [ ] T020 [P] 在 types/index.ts 新增 OrderCustomFee 型別
- [ ] T021 [P] 在 types/index.ts 新增 OrderModifications 型別（含 JSONB 結構）
- [ ] T022 [P] 在 types/index.ts 移除 OrderStatus 的 'confirmed' 狀態
- [ ] T023 [P] 在 types/index.ts 新增 ShippingFeeResult 型別

### Zod Schema 驗證

- [ ] T024 [P] 在 lib/validations/order.schema.ts 新增 orderCustomFeeSchema
- [ ] T025 [P] 在 lib/validations/order.schema.ts 新增 orderModificationsSchema
- [ ] T026 [P] 在 lib/validations/tier.schema.ts 擴展 tierSchema（新增 shipping_fee, free_shipping_threshold）

### Migration 測試

- [ ] T027 執行 supabase db reset（本地環境）
- [ ] T028 測試 calculate_shipping_fee() 函數（3 種情境：未滿門檻、滿門檻、免運）

**Checkpoint**: 資料庫結構完成，所有使用者故事可開始並行實作

---

## Phase 3: US1 - 運費設定管理（管理員）🎯 MVP

**目標**: 管理員可為不同會員等級設定運費規則
**優先級**: P0
**獨立測試**: 進入會員等級編輯頁面，設定運費後儲存，檢查資料庫 tiers 表是否正確更新

### Server Actions

- [ ] T029 [P] [US1] 在 lib/actions/tiers.ts 擴展 updateTier() 函數（處理 shipping_fee, free_shipping_threshold）
- [ ] T030 [P] [US1] 在 lib/actions/tiers.ts 新增運費欄位驗證（非負數檢查、門檻大於 0）

### UI 元件

- [ ] T031 [US1] 建立 components/admin/tiers/shipping-fee-settings.tsx（運費設定元件）
- [ ] T032 [US1] 在 app/(admin)/admin/tiers/page.tsx 整合運費設定區塊（含條件顯示）

### 測試資料

- [ ] T033 [US1] 執行種子資料 SQL（設定零售、批發、經銷商運費）

**Checkpoint**: 管理員可在會員等級頁面設定運費，資料正確儲存於資料庫

---

## Phase 4: US2 - 訂單建立時自動計算運費（客戶 + 系統）

**目標**: 客戶結帳時自動計算運費，顯示免運提示
**優先級**: P0
**獨立測試**: 客戶加入商品至購物車，檢查運費顯示是否正確（未滿門檻收費、滿額免運、優惠券不影響免運門檻）

### Server Actions

- [ ] T034 [P] [US2] 在 lib/actions/orders.ts 擴展 createOrder() 函數（新增運費計算）
- [ ] T035 [P] [US2] 在 lib/actions/orders.ts 新增 calculateShippingFee() Server Action（呼叫 PostgreSQL Function）
- [ ] T036 [US2] 在 lib/actions/orders.ts 實作優惠券與運費互動邏輯（免運門檻依原始商品金額）

### UI 元件

- [ ] T037 [P] [US2] 建立 components/shop/cart/shipping-fee-preview.tsx（運費預覽元件）
- [ ] T038 [US2] 在 components/shop/cart-summary.tsx 整合運費顯示（含免運提示、差額顯示）
- [ ] T039 [US2] 在 app/(shop)/cart/page.tsx 整合運費預覽元件

**Checkpoint**: 客戶購物車顯示正確運費，訂單建立後 shipping_fee 欄位正確儲存

---

## Phase 5: US3 - 管理員修改訂單（核心功能）

**目標**: 管理員可修改待確認訂單的商品、價格、運費
**優先級**: P0
**獨立測試**: 管理員進入訂單詳情頁，進入編輯模式，修改商品單價與數量，儲存後檢查訂單總額與修改歷程

### Server Actions

- [ ] T040 [P] [US3] 在 lib/actions/orders.ts 新增 updateOrderDetails() Server Action（批次修改訂單）
- [ ] T041 [P] [US3] 在 lib/actions/orders.ts 新增 addOrderItem() Server Action（加入商品至訂單）
- [ ] T042 [P] [US3] 在 lib/actions/orders.ts 新增 removeOrderItem() Server Action（移除訂單商品）
- [ ] T043 [P] [US3] 在 lib/actions/orders.ts 新增 addCustomFee() Server Action（新增自訂費用）
- [ ] T044 [P] [US3] 在 lib/actions/orders.ts 新增 adjustTotalAmount() Server Action（直接修改總金額）
- [ ] T045 [P] [US3] 在 lib/actions/orders.ts 新增 updateShippingFee() Server Action（修改訂單運費）

### UI 元件

- [ ] T046 [US3] 建立 components/admin/orders/order-editor.tsx（訂單編輯器核心元件）
- [ ] T047 [P] [US3] 建立 components/admin/orders/order-item-editor.tsx（商品明細編輯器）
- [ ] T048 [P] [US3] 建立 components/admin/orders/order-custom-fees.tsx（自訂費用元件）
- [ ] T049 [P] [US3] 建立 components/admin/orders/shipping-fee-editor.tsx（運費編輯器）
- [ ] T050 [US3] 在 components/admin/orders/order-editor.tsx 實作即時總額計算邏輯
- [ ] T051 [US3] 在 components/admin/orders/order-editor.tsx 實作編輯確認視窗（顯示變更摘要）
- [ ] T052 [US3] 在 app/(admin)/admin/orders/[id]/page.tsx 整合訂單編輯器（新增編輯模式切換）

### 狀態限制

- [ ] T053 [US3] 在 components/admin/orders/order-editor.tsx 實作狀態檢查（僅 pending 可編輯）

**Checkpoint**: 管理員可完整修改待確認訂單，所有變更正確儲存並記錄於修改歷程

---

## Phase 6: US4 - 修改歷程記錄與顯示

**目標**: 客戶與管理員可查看訂單的完整修改歷程
**優先級**: P1
**獨立測試**: 修改訂單後，進入訂單詳情頁，檢查操作歷史是否顯示修改內容（含商品變更、費用新增、運費調整）

### UI 元件

- [ ] T054 [P] [US4] 建立 components/admin/orders/order-modification-timeline.tsx（修改歷程顯示器）
- [ ] T055 [US4] 在 order-modification-timeline.tsx 實作 JSONB 格式化邏輯（顯示修改項目）
- [ ] T056 [US4] 在 order-modification-timeline.tsx 實作視覺區分（修改歷程 vs 留言，黃色 vs 藍色背景）
- [ ] T057 [US4] 在 app/(admin)/admin/orders/[id]/page.tsx 整合修改歷程顯示器

### 工具函式

- [ ] T058 [P] [US4] 建立 lib/utils/order-modification-formatter.ts（修改歷程格式化工具）
- [ ] T059 [US4] 在 order-modification-formatter.ts 實作 formatModificationItem() 函數（格式化修改項目）

**Checkpoint**: 訂單操作歷史正確顯示所有修改，內容清晰易讀

---

## Phase 7: US5 - 優惠券與運費互動

**目標**: 優惠券驗證與運費計算明確分離
**優先級**: P1
**獨立測試**: 建立包含優惠券的訂單，修改訂單後檢查優惠券驗證邏輯（若不符合條件顯示警告）

### Server Actions

- [ ] T060 [US5] 在 lib/actions/orders.ts 的 updateOrderDetails() 中實作優惠券驗證邏輯
- [ ] T061 [US5] 在 lib/actions/orders.ts 的 updateOrderDetails() 中實作優惠券移除提示機制

### UI 元件

- [ ] T062 [US5] 在 components/admin/orders/order-editor.tsx 實作優惠券警告視窗（顯示不符合條件訊息）
- [ ] T063 [US5] 在 components/admin/orders/order-editor.tsx 實作優惠券保留/移除選項

### 工具函式

- [ ] T064 [P] [US5] 建立 lib/utils/shipping-calculator.ts（運費計算工具）
- [ ] T065 [US5] 在 shipping-calculator.ts 實作 calculateShippingFee() 函數（本地運費計算）
- [ ] T066 [US5] 在 shipping-calculator.ts 實作 validateShippingFee() 函數（運費驗證）

**Checkpoint**: 訂單修改後優惠券驗證正確，不符合條件時顯示警告並允許管理員選擇

---

## Phase 8: US6 - 訂單狀態流程調整

**目標**: 移除 confirmed 狀態，簡化訂單流程
**優先級**: P0
**獨立測試**: 建立訂單後標記出貨，檢查庫存扣減是否正確，取消出貨中訂單檢查庫存回補

### Server Actions

- [ ] T067 [P] [US6] 在 lib/actions/orders.ts 新增 markAsShipping() Server Action（標記出貨並扣減庫存）
- [ ] T068 [P] [US6] 在 lib/actions/orders.ts 修改 updateOrderStatus() 函數（移除 confirmed 邏輯）
- [ ] T069 [P] [US6] 在 lib/actions/orders.ts 修改 cancelOrder() 函數（支援 shipping 狀態回補庫存）
- [ ] T070 [US6] 在 lib/actions/orders.ts 刪除 confirmOrder() 函數（由 markAsShipping 取代）

### UI 元件

- [ ] T071 [US6] 在 components/admin/orders/order-actions.tsx 移除「確認訂單」按鈕
- [ ] T072 [US6] 在 components/admin/orders/order-actions.tsx 新增「標記出貨（扣減庫存）」按鈕
- [ ] T073 [US6] 在 components/admin/orders/order-actions.tsx 修改取消訂單邏輯（支援 shipping 狀態回補庫存）
- [ ] T074 [US6] 在 app/(admin)/admin/orders/[id]/page.tsx 更新按鈕顯示邏輯（依新狀態流程）

### 狀態轉換邏輯

- [ ] T075 [P] [US6] 建立 lib/utils/order-status-helpers.ts（訂單狀態輔助函式）
- [ ] T076 [US6] 在 order-status-helpers.ts 實作 isValidStatusTransition() 函數
- [ ] T077 [US6] 在 order-status-helpers.ts 實作 getOrderStatusLabel() 函數
- [ ] T078 [US6] 在 order-status-helpers.ts 實作 getOrderStatusColor() 函數

**Checkpoint**: 訂單狀態流程正確（pending → shipping → completed），庫存扣減與回補邏輯正確

---

## Phase 9: Polish & Cross-Cutting Concerns（優化與整合）

**目的**: 跨故事優化、文件更新、完整測試

### TypeScript 型別檢查

- [ ] T079 [P] 執行 pnpm type-check，修復所有 TypeScript 錯誤
- [ ] T080 [P] 檢查所有 Server Actions 回傳型別為 ActionResult

### RLS Policy 驗證

- [ ] T081 [P] 驗證 order_custom_fees 表的 RLS Policy（客戶僅能查看自己的訂單費用）
- [ ] T082 [P] 驗證 order_timelines 表的 RLS Policy（modifications 欄位權限）

### UI/UX 優化

- [ ] T083 [P] 在 components/admin/orders/order-editor.tsx 實作離開確認提示（beforeunload）
- [ ] T084 [P] 在 components/admin/orders/order-editor.tsx 實作鍵盤操作支援（Tab、Enter）
- [ ] T085 [P] 在 components/admin/orders/order-modification-timeline.tsx 實作摺疊/展開功能（避免資訊過載）

### 效能優化

- [ ] T086 [P] 在 lib/actions/orders.ts 的 updateOrderDetails() 中加入 Transaction 超時設定（10s）
- [ ] T087 [P] 檢查 calculate_shipping_fee() PostgreSQL Function 查詢效能（< 200ms）

### 錯誤處理

- [ ] T088 [P] 在所有 Server Actions 新增詳細錯誤訊息（例：「運費不可為負數」）
- [ ] T089 [P] 在 updateOrderDetails() 中實作 Transaction 失敗 ROLLBACK 錯誤訊息

### 文件更新

- [ ] T090 [P] 更新 CLAUDE.md 的「當前開發狀態」章節（新增 Feature 011）
- [ ] T091 [P] 更新 specs/011-shipping-and-order-edit/README.md（實作完成摘要）

---

## 相依性與執行順序

### Phase 相依性

- **Setup (Phase 1)**: 無相依 - 立即開始
- **Foundational (Phase 2)**: 依賴 Setup - **阻擋所有使用者故事**
- **US1-US6 (Phase 3-8)**: 全部依賴 Foundational 完成
  - US1, US2, US5 可完全並行（不同檔案）
  - US3 必須在 US2 完成後（擴展 orders.ts）
  - US4 必須在 US3 完成後（需要修改歷程資料）
  - US6 可並行於 US1-US5（獨立的狀態流程）
- **Polish (Phase 9)**: 依賴所有使用者故事完成

### 使用者故事相依性

- **US1 (運費設定)**: 可在 Foundational 完成後立即開始 - 無相依
- **US2 (運費計算)**: 可在 Foundational 完成後立即開始 - 無相依
- **US3 (訂單修改)**: 建議在 US2 完成後（共用 orders.ts）
- **US4 (修改歷程)**: 必須在 US3 完成後（需要修改資料）
- **US5 (優惠券互動)**: 可在 Foundational 完成後立即開始 - 無相依
- **US6 (狀態流程)**: 可在 Foundational 完成後立即開始 - 無相依

### 單一使用者故事內執行順序

**US1 範例**:
1. T029, T030 (Server Actions) - 可並行
2. T031 (UI 元件)
3. T032 (頁面整合)
4. T033 (測試資料)

**US3 範例**:
1. T040-T045 (Server Actions) - 全部可並行
2. T046-T049 (UI 元件) - 可並行
3. T050-T052 (編輯器邏輯與整合) - 依序執行
4. T053 (狀態檢查)

### 並行執行機會

**Foundational Phase (Phase 2)**:
```bash
# 並行執行所有資料庫 Migration 任務
Task: "在 Migration 中新增 tiers.shipping_fee, tiers.free_shipping_threshold 欄位"
Task: "在 Migration 中新增 orders.shipping_fee 欄位"

# 並行執行所有型別定義任務
Task: "在 types/index.ts 新增 OrderCustomFee 型別"
Task: "在 types/index.ts 新增 OrderModifications 型別"
Task: "在 types/index.ts 移除 OrderStatus 的 'confirmed' 狀態"

# 並行執行所有 Zod Schema 任務
Task: "在 lib/validations/order.schema.ts 新增 orderCustomFeeSchema"
Task: "在 lib/validations/order.schema.ts 新增 orderModificationsSchema"
```

**US1 並行範例**:
```bash
Task: "在 lib/actions/tiers.ts 擴展 updateTier() 函數"
Task: "在 lib/actions/tiers.ts 新增運費欄位驗證"
```

**US3 並行範例**:
```bash
# 所有 Server Actions 可並行
Task: "新增 updateOrderDetails() Server Action"
Task: "新增 addOrderItem() Server Action"
Task: "新增 removeOrderItem() Server Action"
Task: "新增 addCustomFee() Server Action"
Task: "新增 adjustTotalAmount() Server Action"
Task: "新增 updateShippingFee() Server Action"

# UI 元件可並行
Task: "建立 order-item-editor.tsx"
Task: "建立 order-custom-fees.tsx"
Task: "建立 shipping-fee-editor.tsx"
```

---

## 實作策略

### MVP First（僅 US1 + US2 + US6）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（**CRITICAL - 阻擋所有故事**）
3. 完成 Phase 3: US1（運費設定）
4. 完成 Phase 4: US2（運費計算）
5. 完成 Phase 8: US6（狀態流程）
6. **STOP 並驗證**: 測試運費設定與計算、訂單狀態流程
7. 部署/展示 MVP

### 漸進式交付

1. 完成 Setup + Foundational → 基礎完成
2. 新增 US1 → 測試運費設定 → 部署
3. 新增 US2 → 測試運費計算 → 部署
4. 新增 US6 → 測試狀態流程 → 部署（**MVP 完成**）
5. 新增 US3 → 測試訂單修改 → 部署
6. 新增 US4 → 測試修改歷程 → 部署
7. 新增 US5 → 測試優惠券互動 → 部署
8. 完成 Polish → 最終測試 → 正式發布

### 並行團隊策略

若有多位開發者：

1. 團隊共同完成 Setup + Foundational
2. Foundational 完成後：
   - **開發者 A**: US1（運費設定）+ US2（運費計算）
   - **開發者 B**: US6（狀態流程）
   - **開發者 C**: US5（優惠券互動）
3. US1-US6 完成後：
   - **開發者 A + B**: US3（訂單修改，複雜度高）
   - **開發者 C**: US4（修改歷程）
4. 所有故事完成後共同執行 Polish

---

## 注意事項

### 資料庫安全

- **絕對禁止**在遠端/生產環境執行 `supabase db reset`
- 所有 Migration 必須先在本地測試
- 部署前必須備份生產環境資料庫（使用 `pnpm deploy:db` 或 `pg_dump`）
- 詳見 [資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md)

### Migration 檢查清單

每個 Migration 必須包含：
1. ✅ IF NOT EXISTS / IF EXISTS 檢查（避免重複執行錯誤）
2. ✅ DEFAULT 值設定（確保向下相容）
3. ✅ CHECK 約束（資料驗證）
4. ✅ 索引建立（效能優化）
5. ✅ RLS Policy（安全性）
6. ✅ 註解說明（可讀性）

### 測試策略

- Phase 2 完成後：測試所有 PostgreSQL Functions（使用 Supabase Studio SQL Editor）
- 每個使用者故事完成後：執行對應的獨立測試（見各 Phase 的 Checkpoint）
- 全部完成後：執行 quickstart.md 的完整測試流程

### Commit 規範

- 每個任務或相關任務群組完成後 commit
- Commit message 使用繁體中文
- 格式: `feat: 新增運費計算功能` 或 `fix: 修復訂單修改歷程顯示錯誤`
- Commit 結尾自動加入 Claude Code 署名

### 避免的錯誤

- ❌ 模糊的任務描述（例：「建立訂單相關功能」）
- ❌ 相同檔案的並行衝突（例：同時修改 orders.ts 的不同函數標記為 [P]）
- ❌ 跨故事的強相依（破壞獨立性）
- ❌ 未測試即部署（每個 Checkpoint 都需驗證）

---

## 進度統計

**總任務數**: 91 個任務
**MVP 範圍**: US1 + US2 + US6（約 40 個任務，8-9 小時）
**完整範圍**: US1-US6 + Polish（91 個任務，15-16 小時）

### 各 Phase 任務數

| Phase | 名稱 | 任務數 | 預估時間 |
|-------|------|--------|---------|
| Phase 1 | Setup | 4 | 0.5 小時 |
| Phase 2 | Foundational | 24 | 3 小時 |
| Phase 3 | US1 - 運費設定 | 5 | 1 小時 |
| Phase 4 | US2 - 運費計算 | 6 | 1.5 小時 |
| Phase 5 | US3 - 訂單修改 | 14 | 3 小時 |
| Phase 6 | US4 - 修改歷程 | 6 | 1.5 小時 |
| Phase 7 | US5 - 優惠券互動 | 7 | 1.5 小時 |
| Phase 8 | US6 - 狀態流程 | 12 | 2 小時 |
| Phase 9 | Polish | 13 | 2 小時 |
| **總計** | - | **91** | **15-16 小時** |

---

**最後更新**: 2026-01-06
**狀態**: ✅ 任務規劃完成
**版本**: v2.0.0（依使用者故事重組）
