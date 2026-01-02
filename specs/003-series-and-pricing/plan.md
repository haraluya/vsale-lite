# Implementation Plan: 商品系列與等級價格管理

**Branch**: `003-series-and-pricing` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-series-and-pricing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

將商品管理系統從「分類 > 產品」雙層架構升級為「分類 > 系列 > 產品」三層架構，實作核心的等級綁定價格機制。系統必須支援：(1) 三層階層架構 (2) 等級價格表 (tier_prices) (3) 前台根據用戶等級顯示價格 (4) 商品編號自動產生 (分類代碼-流水號) (5) 系列與商品獨立上下架管理。技術實作包含 PostgreSQL Function 自動編號、RLS 策略更新、Server Actions 價格查詢與批量設定、前台系列頁面與後台價格管理介面。

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js v22.x LTS
**Primary Dependencies**: Next.js 15.1+ (App Router), React 19.x, Supabase (@supabase/supabase-js v2.89+, @supabase/ssr v0.8+), Zod 4.3+, Zustand 5.0+
**Storage**: Supabase (PostgreSQL) + Supabase Storage (系列與商品圖片)
**Testing**: Vitest + React Testing Library (jsdom)
**Target Platform**: Web (Mobile-First 前台 + Desktop-First 後台), Firebase App Hosting (asia-east1)
**Project Type**: Web (Monorepo with Next.js App Router)
**Performance Goals**:
- 頁面首次載入 < 2s (Mobile 4G)
- 價格查詢響應 < 300ms
- 資料庫查詢 < 100ms (p95)
- 商品編號自動產生 < 50ms (並發安全)

**Constraints**:
- 前台客戶無法得知實際庫存數量（僅顯示狀態）
- 價格必須從資料庫查詢，不信任前端傳遞的價格
- 商品編號建立後不可修改（唯讀）
- 系列下架時，該系列及其下所有商品在前台隱藏
- 支援負庫存（憲章 VI）

**Scale/Scope**:
- 預期 10 個會員等級（P0: 3 個等級測試）
- 預期 50 個系列、500 個商品
- 預期 100 個並發客戶瀏覽
- 10 個管理員同時建立商品（編號不重複）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 (User Role First) ✅

**檢查項目**:
- ✅ 前台客戶僅看到自己等級的價格（不顯示其他等級價格）
- ✅ 前台優化行動裝置（系列卡片、大觸控熱區）
- ✅ 後台優化桌面裝置（價格批量設定表格）
- ✅ 雙入口設計不受影響（前台 /store，後台 /admin）

**結論**: 符合憲章，無違反項目。

---

### II. 等級綁定價格 (Tier-Based Pricing) ✅

**檢查項目**:
- ✅ 價格以正規化方式儲存（tier_prices 表，tier_id + product_id 唯一組合鍵）
- ✅ 未設定價格顯示 "價格未設定" 並禁用加入購物車
- ✅ 新增等級時僅需在資料庫新增記錄，無需修改程式碼
- ✅ 前端查詢價格時 Server Action 過濾 tier_id，不信任前端

**結論**: 符合憲章，實作核心等級價格機制。

---

### III. 使用者故事驅動開發 (User Story Driven Development) ✅

**檢查項目**:
- ✅ Spec 包含 6 個使用者故事，依優先級排序（P0: 3 個，P1: 2 個，P2: 1 個）
- ✅ 每個故事可獨立測試（Independent Test 欄位明確）
- ✅ 每個故事可獨立交付（如 P0 User Story 1 即可上線）

**結論**: 符合憲章，使用者故事完整且可獨立驗證。

---

### IV. API 模組化與職責分離 (API Modularization) ✅

**檢查項目**:
- ✅ UI 元件僅負責顯示與呼叫 Server Actions
- ✅ Server Actions 負責驗證（Zod Schema）、權限檢查（checkAuth）、資料庫操作
- ✅ 價格查詢邏輯在 Server Action 中執行（getSeriesProductsWithPrice）
- ✅ 價格設定使用 Server Action（setTierPrice, batchSetTierPrices）

**結論**: 符合憲章，UI 與 API 職責分離清晰。

---

### V. 設計系統一致性 (Design System Consistency) ✅

**檢查項目**:
- ✅ 所有元件使用 Neo-Brutalism 風格（2-3px 黑邊框、硬邊陰影）
- ✅ 點擊效果包含位移（translate-x-[2px] translate-y-[2px] shadow-none）
- ✅ 使用現有 UI 元件庫（components/ui/）
- ✅ 不引入新的設計風格或外部元件庫

**結論**: 符合憲章，延續現有設計系統。

---

### VI. 負庫存支援 (Negative Stock Support) ✅

**檢查項目**:
- ✅ 系統支援負庫存（stock 可為負數）
- ✅ 下單流程不檢查 stock > 0（本功能未實作下單，但設計已考慮）
- ✅ 前台僅顯示庫存狀態（stock_status: sufficient/low/out_of_stock），不顯示實際數字
- ✅ 庫存狀態與實際庫存數量分離（手動設定）

**結論**: 符合憲章，庫存機制支援負庫存。

---

### 整體評估

**PASS** ✅ - 本功能設計完全符合專案憲章所有核心原則，無違反項目。

## Project Structure

### Documentation (this feature)

```text
specs/003-series-and-pricing/
├── spec.md              # Feature specification (已存在)
├── plan.md              # This file (/speckit.planning command output)
├── research.md          # Phase 0 output (技術研究與決策記錄)
├── data-model.md        # Phase 1 output (資料庫 Schema 與關聯)
├── quickstart.md        # Phase 1 output (開發者快速上手指南)
└── contracts/           # Phase 1 output (Server Actions API 合約)
    ├── series.md        # 系列管理 API
    ├── tier-prices.md   # 等級價格 API
    └── shop.md          # 前台商品與價格查詢 API
```

### Source Code (repository root)

```text
vsale/
├── app/                          # Next.js 15 App Router
│   ├── (shop)/                   # 客戶保護路由群組
│   │   ├── layout.tsx            # 🆕 新增導航列（手機號碼、等級、登出）
│   │   └── store/
│   │       ├── page.tsx          # 🔄 修改為顯示系列卡片（不顯示商品）
│   │       └── series/
│   │           └── [id]/
│   │               └── page.tsx  # 🆕 系列詳情頁（顯示商品列表與價格）
│   └── (admin)/                  # 管理員保護路由群組
│       └── admin/
│           ├── series/           # 🆕 系列管理 CRUD
│           │   ├── page.tsx      # 系列列表
│           │   ├── new/
│           │   │   └── page.tsx  # 建立系列
│           │   └── [id]/
│           │       └── page.tsx  # 編輯系列
│           ├── products/
│           │   ├── new/
│           │   │   └── page.tsx  # 🔄 修改為選擇系列（編號自動產生）
│           │   └── [id]/
│           │       └── page.tsx  # 🔄 修改為顯示系列、原價、庫存狀態
│           └── pricing/          # 🆕 價格管理
│               └── page.tsx      # 批量設定等級價格
│
├── components/
│   ├── shop/                     # 🆕 前台元件
│   │   ├── SeriesCard.tsx        # 系列卡片
│   │   ├── ProductCard.tsx       # 商品卡片（含價格顯示）
│   │   └── Navbar.tsx            # 導航列（手機號碼、等級、登出）
│   └── admin/
│       ├── SeriesForm.tsx        # 🆕 系列表單
│       └── TierPriceTable.tsx    # 🆕 等級價格批量設定表格
│
├── lib/
│   ├── actions/
│   │   ├── series.ts             # 🆕 系列 CRUD Server Actions
│   │   ├── tier-prices.ts        # 🆕 等級價格 Server Actions
│   │   ├── shop.ts               # 🆕 前台商品與價格查詢 Server Actions
│   │   └── products.ts           # 🔄 修改為使用 series_id，移除 category_id
│   ├── validations/
│   │   ├── series.schema.ts      # 🆕 系列驗證 Schema
│   │   ├── tier-price.schema.ts  # 🆕 等級價格驗證 Schema
│   │   └── product.schema.ts     # 🔄 修改為包含 series_id, retail_price, stock_status
│   └── supabase/
│       └── storage.ts            # 🔄 新增 uploadSeriesImage 函式
│
├── types/
│   └── index.ts                  # 🔄 新增 Series, TierPrice 型別定義
│
└── supabase/
    └── migrations/
        └── 20260102_series_and_tier_prices.sql  # ✅ Migration 已準備（已存在）
```

**Structure Decision**:

採用 **Next.js App Router 單體架構**（Option 2: Web application 的變體）。專案使用 Next.js 15 的 App Router 模式，前台與後台路由使用路由群組 `(shop)` 與 `(admin)` 區分，共享相同的資料庫與 Server Actions。

**關鍵設計決策**:
1. **前台路由**: `/store` (系列列表) → `/store/series/[id]` (系列詳情頁，顯示商品與價格)
2. **後台路由**: `/admin/series` (系列管理) + `/admin/pricing` (價格管理)
3. **Server Actions 職責分離**: `series.ts` (CRUD), `tier-prices.ts` (價格設定), `shop.ts` (前台查詢，含價格過濾)
4. **Migration 策略**: 單一 SQL 檔案包含所有 Phase（資料表、遷移、自動編號、RLS）

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**N/A** - 本功能設計無違反憲章項目，無需填寫複雜度追蹤表。
