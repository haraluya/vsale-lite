# Implementation Plan: 購物車與訂單管理系統

**Branch**: `004-cart-and-orders` | **Date**: 2026-01-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-cart-and-orders/spec.md`

## Summary

實作完整的 B2B 批發訂單系統，包含購物車（前端狀態管理）、訂單建立（含訂單編號產生）、訂單狀態管理（待確認→已確認→出貨中→已完成）、庫存扣減機制（支援負庫存）、管理員訂單處理與客戶訂單查詢功能。採用 Next.js 15 Server Actions 處理所有資料操作，Zustand persist 管理購物車狀態，Supabase PostgreSQL 儲存訂單資料，並透過 RLS 確保客戶只能存取自己的訂單。

## Technical Context

**Language/Version**: TypeScript 5.7+ with Node.js v22.x LTS (Iron)
**Primary Dependencies**:
- Next.js 15.1+ (App Router with Server Actions)
- React 19.x
- Zustand 5.0+ (購物車狀態管理，含 persist middleware)
- @supabase/supabase-js v2.47+ (資料庫操作)
- Zod 3.24+ (表單驗證)

**Storage**: Supabase (PostgreSQL 15+)
- 新增資料表：`orders`, `order_items`, `order_timelines`
- 使用現有表：`profiles`, `products`, `tier_prices`

**Testing**: Vitest + React Testing Library (P0 功能需整合測試)

**Target Platform**: Web Application (雙入口設計)
- 客戶端：行動優先 (Mobile-first, responsive)
- 管理端：桌面優先 (Desktop-first, data-intensive UI)

**Project Type**: Web (Next.js App Router - 前後端整合)

**Performance Goals**:
- 購物車操作響應 < 100ms (本地狀態，無網路延遲)
- 訂單建立響應 < 2s (含資料庫寫入與訂單編號產生)
- 訂單列表查詢 < 1s (含篩選與搜尋，資料量 < 10,000 筆)
- 訂單狀態更新與庫存扣減原子性操作 < 500ms

**Constraints**:
- 購物車資料持久化儲存於 localStorage (Zustand persist)
- 訂單編號唯一性保證 (格式：ORD-YYYYMMDD-XXXX，當日流水號)
- 負庫存支援 (憲章 VI 要求，不檢查 stock >= 0)
- RLS 權限控制 (客戶只能讀自己的訂單，管理員可讀寫所有訂單)
- 訂單明細需保存商品名稱與價格快照 (後續商品刪除或價格調整不影響歷史訂單)

**Scale/Scope**:
- 預期訂單量：短期 < 10 萬筆 (需建立索引優化查詢)
- 並發處理：支援 50+ 並發訂單建立與處理
- 購物車項目：單一購物車 < 100 項商品 (合理上限)
- 訂單明細：單筆訂單 < 50 項商品 (合理上限)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 ✅ PASS

**符合性**:
- ✅ 雙入口設計：客戶在前台 `/store/cart` 操作購物車與訂單，管理員在後台 `/admin/orders` 處理訂單
- ✅ 客戶端行動優先：購物車 UI 優化單手操作、大觸控熱區
- ✅ 管理端桌面優先：訂單列表支援篩選、搜尋、批量操作 (未來擴充)
- ✅ 權限分離：客戶只能查看自己的訂單 (RLS)，管理員可查看所有訂單

### II. 等級綁定價格 ✅ PASS

**符合性**:
- ✅ 購物車加入商品時檢查是否有設定等級價格 (FR-002)
- ✅ 訂單建立時記錄購買價格 (下單當時的 tier_price)，儲存於 `order_items.deal_price`
- ✅ 價格快照機制：後續價格調整不影響已下訂單 (FR-014)
- ✅ 前端不直接查詢 products.price，而是透過 Server Action 取得當前用戶的等級價格

### III. 使用者故事驅動開發 ✅ PASS

**符合性**:
- ✅ 規格包含 5 個獨立可測試的使用者故事 (P0 × 3, P1 × 1, P2 × 1)
- ✅ 每個故事都有明確的驗收場景與獨立測試方法
- ✅ P0 故事 (購物車、下單、管理員處理) 為核心 MVP，可優先交付

### IV. API 模組化與職責分離 ✅ PASS

**符合性**:
- ✅ 所有資料操作透過 Server Actions：
  - `lib/actions/cart.ts`: 購物車相關 (驗證商品價格、庫存檢查)
  - `lib/actions/orders.ts`: 訂單 CRUD、狀態更新、庫存扣減
  - `lib/actions/order-timelines.ts`: 訂單操作歷史記錄
- ✅ 購物車使用 Zustand 管理前端狀態 (`stores/cart.ts`)
- ✅ UI 元件僅負責顯示與呼叫 API，不包含業務邏輯
- ✅ 所有 Server Actions 包含 Zod 驗證與權限檢查 (`checkAuth()`)

### V. 設計系統一致性 ✅ PASS

**符合性**:
- ✅ 購物車與訂單相關 UI 元件遵循 Neo-Brutalism 風格
- ✅ 2-3px 實心黑邊框、硬邊陰影、點擊位移效果
- ✅ 複用現有 UI 元件 (`components/ui/*`)，不引入新的設計風格

### VI. 負庫存支援 ✅ PASS

**符合性**:
- ✅ 下單流程不檢查 stock > 0 (FR-027)
- ✅ 訂單確認時支援負庫存扣減 (扣減後庫存可為負數)
- ✅ 訂單取消時正確回補庫存 (包括負庫存情境)
- ✅ 前台顯示庫存狀態：stock > 0 (綠)、stock === 0 (黃)、stock < 0 (紅「可預購」)

**結論**: ✅ 所有憲章原則皆符合，無違規項目，可進入 Phase 0 研究階段。

## Project Structure

### Documentation (this feature)

```text
specs/004-cart-and-orders/
├── spec.md              # 功能規格 (已完成)
├── plan.md              # 本文件 (技術規劃)
├── research.md          # Phase 0 輸出 (技術研究與決策)
├── data-model.md        # Phase 1 輸出 (資料模型設計)
├── quickstart.md        # Phase 1 輸出 (快速上手指南)
├── contracts/           # Phase 1 輸出 (API 合約)
│   ├── cart.md          # 購物車 Server Actions
│   ├── orders.md        # 訂單 Server Actions
│   └── order-timelines.md  # 訂單歷史 Server Actions
├── checklists/          # 品質檢查清單 (已完成)
│   └── requirements.md
└── tasks.md             # Phase 2 輸出 (實作任務，由 /speckit.tasks 生成)
```

### Source Code (repository root)

```text
app/
├── (shop)/                         # 客戶端路由群組
│   ├── store/
│   │   ├── cart/
│   │   │   └── page.tsx            # 購物車頁面
│   │   ├── checkout/
│   │   │   └── page.tsx            # 訂單確認頁面
│   │   └── orders/
│   │       ├── page.tsx            # 客戶訂單列表
│   │       └── [id]/
│   │           └── page.tsx        # 客戶訂單詳情
│   └── layout.tsx                  # 客戶端 Layout (含購物車圖示)
│
└── (admin)/                        # 管理員路由群組
    └── admin/
        └── orders/
            ├── page.tsx            # 管理員訂單列表
            └── [id]/
                └── page.tsx        # 管理員訂單詳情 (含狀態更新、取消)

components/
├── shop/
│   ├── cart-item.tsx               # 購物車商品項目
│   ├── cart-summary.tsx            # 購物車摘要 (總價、結帳按鈕)
│   ├── order-card.tsx              # 訂單卡片 (列表用)
│   └── order-status-badge.tsx      # 訂單狀態徽章
│
└── admin/
    ├── order-table.tsx             # 訂單列表表格 (含篩選、搜尋)
    ├── order-status-updater.tsx    # 訂單狀態更新器
    ├── order-timeline.tsx          # 訂單操作歷史時間軸
    └── order-cancel-button.tsx     # 取消訂單按鈕 (含確認對話框)

lib/
├── actions/
│   ├── cart.ts                     # 購物車 Server Actions (驗證商品價格、庫存)
│   ├── orders.ts                   # 訂單 CRUD、狀態更新、庫存扣減
│   └── order-timelines.ts          # 訂單操作歷史記錄
│
├── validations/
│   ├── cart.schema.ts              # 購物車 Zod Schema
│   └── order.schema.ts             # 訂單 Zod Schema
│
└── utils/
    └── order-number.ts             # 訂單編號產生器 (ORD-YYYYMMDD-XXXX)

stores/
└── cart.ts                         # Zustand 購物車狀態管理 (含 persist)

types/
└── index.ts                        # 新增 Order, OrderItem, OrderTimeline 型別

supabase/
└── migrations/
    └── 20260104_create_orders.sql  # 新增訂單相關資料表與 RLS 規則
```

**Structure Decision**: 採用 Next.js App Router 結構 (Option 2: Web application)，前後端整合於同一專案。客戶端與管理端透過路由群組 `(shop)` 與 `(admin)` 分離，Server Actions 統一放置於 `lib/actions/`，購物車狀態使用 Zustand 管理於 `stores/cart.ts`。

## Complexity Tracking

> **本功能無憲章違規項目，此表格留空**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

## Phase 0: Research & Technical Decisions

### Key Technical Questions

以下問題需要在 Phase 0 研究階段解答：

1. **訂單編號產生機制**
   - 如何確保 `ORD-YYYYMMDD-XXXX` 格式的唯一性？
   - 當日流水號如何避免並發衝突？
   - 當日訂單超過 9999 筆如何處理？

2. **庫存扣減與訂單狀態的原子性**
   - 如何確保訂單狀態更新與庫存扣減在同一交易中完成？
   - Supabase 是否支援交易 (Transaction)？
   - 若交易失敗如何回滾？

3. **購物車持久化策略**
   - Zustand persist 的 storage key 命名規則？
   - 購物車資料結構設計 (僅儲存 product_id + quantity，還是包含價格快照)？
   - 購物車商品價格如何處理 (每次讀取時重新查詢 tier_price vs. 快照)？

4. **訂單時間軸 (order_timelines) 表結構**
   - 是否複用現有的 timelines 表？
   - 需要記錄哪些欄位 (操作類型、操作者、舊狀態、新狀態、時間、備註)？
   - 如何與訂單關聯 (order_id 外鍵)？

5. **RLS 規則設計**
   - 客戶查詢訂單的 RLS 規則：`auth.uid() = user_id`
   - 管理員查詢訂單的 RLS 規則：`role = 'admin'`
   - 訂單明細 (order_items) 是否需要獨立的 RLS 規則？

### Research Tasks

將在 `research.md` 中記錄以下研究任務的決策：

- [ ] 研究 Supabase 交易 (Transaction) 支援與最佳實踐
- [ ] 研究訂單編號產生的並發安全策略 (Database Sequence vs. UUID vs. Timestamp-based)
- [ ] 研究 Zustand persist 的最佳實踐與資料結構設計
- [ ] 研究 RLS 規則設計模式 (特別是訂單與訂單明細的關聯規則)
- [ ] 研究負庫存扣減與回補的邊界情況處理

## Phase 1: Design Artifacts

### Data Model (data-model.md)

將設計以下資料表：

1. **orders** (訂單主表)
   - 欄位：id, order_number, user_id, total_amount, status, notes, created_at, updated_at
   - 索引：order_number (unique), user_id, status, created_at
   - RLS：客戶只能讀自己的訂單，管理員可讀寫所有訂單

2. **order_items** (訂單明細)
   - 欄位：id, order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal
   - 索引：order_id
   - RLS：繼承 orders 表的規則

3. **order_timelines** (訂單操作歷史)
   - 欄位：id, order_id, action_type, actor_id, actor_role, old_status, new_status, created_at, notes
   - 索引：order_id, created_at
   - RLS：繼承 orders 表的規則

### API Contracts (contracts/)

將設計以下 Server Actions：

1. **cart.ts**
   - `validateCartItem(product_id, quantity)`: 驗證商品是否可加入購物車 (檢查價格設定)
   - `getCartItemPrice(product_id, tier_id)`: 取得商品的等級價格

2. **orders.ts**
   - `createOrder(items, notes)`: 建立訂單 (含訂單編號產生、價格快照、清空購物車)
   - `getOrders(filters)`: 查詢訂單列表 (支援狀態篩選、搜尋)
   - `getOrderById(order_id)`: 查詢訂單詳情
   - `updateOrderStatus(order_id, new_status)`: 更新訂單狀態 (含庫存扣減/回補)
   - `cancelOrder(order_id)`: 取消訂單 (含庫存回補)

3. **order-timelines.ts**
   - `createTimeline(order_id, action_type, details)`: 建立訂單操作記錄
   - `getTimelines(order_id)`: 查詢訂單操作歷史

### Quickstart Guide (quickstart.md)

將提供以下快速上手內容：

1. 資料庫 Migration 執行步驟
2. 測試資料建立 (範例訂單、訂單明細、訂單歷史)
3. 本地開發環境設定 (Supabase Studio 查看訂單資料)
4. 購物車與訂單功能測試流程 (客戶端 + 管理端)

## Implementation Notes

### Critical Dependencies

- **憲章依賴**:
  - ✅ 等級綁定價格 (003-series-and-pricing): 需要 `tier_prices` 表
  - ✅ 用戶與等級管理 (001-user-tier-management): 需要 `profiles` 與 `tiers` 表
  - ✅ 商品管理 (002-product-management): 需要 `products` 表

- **技術依賴**:
  - Zustand 5.0+ (需安裝 `zustand` 與 `zustand/middleware`)
  - Supabase Transaction 支援 (需研究確認)

### Known Risks

1. **訂單編號並發衝突**
   - 風險：多個客戶同時下單時可能產生重複編號
   - 緩解：使用資料庫 Sequence 或 Unique Constraint 避免衝突

2. **庫存扣減原子性**
   - 風險：訂單確認與庫存扣減可能部分成功
   - 緩解：使用 Supabase Transaction 確保原子性

3. **購物車資料過期**
   - 風險：購物車中商品價格或庫存狀態可能已變更
   - 緩解：下單時重新驗證商品狀態與價格，顯示錯誤並要求客戶更新購物車

### Testing Strategy

- **P0 功能** (必須測試):
  - 購物車加入/移除/調整商品
  - 訂單建立流程 (含編號產生、價格快照、購物車清空)
  - 訂單狀態更新與庫存扣減原子性
  - 訂單取消與庫存回補
  - RLS 權限驗證 (客戶只能查看自己的訂單)

- **P1 功能** (建議測試):
  - 訂單列表篩選與搜尋
  - 訂單操作歷史記錄

- **P2 功能** (可選測試):
  - 邊界情況 (空購物車、商品已刪除、並發訂單處理)

## Next Steps

1. ✅ Phase 0: 執行研究任務，產生 `research.md`
2. ⏳ Phase 1: 設計資料模型與 API 合約，產生 `data-model.md`, `contracts/`, `quickstart.md`
3. ⏳ Phase 2: 使用 `/speckit.tasks` 產生實作任務清單 (`tasks.md`)

---

**Status**: Phase 0 Ready
**Next Command**: Begin Phase 0 research
**Last Updated**: 2026-01-03
