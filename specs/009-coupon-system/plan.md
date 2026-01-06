# Implementation Plan: 優惠券系統 (Coupon System)

**Branch**: `009-coupon-system` | **Date**: 2026-01-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-coupon-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作完整的優惠券系統，支援前台客戶透過輸入口令領取優惠券（Foodpanda 風格）、後台管理員建立與管理優惠券（包含代碼、等級限制、金額限制、系列限制、生效時間、折扣方式）、購物車智能提示可使用優惠券、以及訂單優惠券快照機制。

**核心技術方案**:
- 資料庫設計：5 個核心資料表（coupons, coupon_tier_restrictions, coupon_series_restrictions, user_coupons, order_coupons）
- Server Actions：優惠券 CRUD、領取驗證、使用驗證、折扣計算、訂單快照
- 前端元件：Coupang 風格卡片、Foodpanda 風格輸入口令、購物車優惠券選擇器
- 整合點：購物車狀態管理（Zustand）、訂單建立流程（Feature 004）

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js v22.x LTS (Iron)
**Primary Dependencies**: Next.js 15.1+ (App Router), React 19.x, Supabase SDK (@supabase/supabase-js v2.47+, @supabase/ssr v0.5+), Zustand 5.0+, Zod 3.24+
**Storage**: Supabase (PostgreSQL) - 5 個新資料表 (coupons, coupon_tier_restrictions, coupon_series_restrictions, user_coupons, order_coupons) + 1 個擴充欄位 (orders.coupon_snapshot)
**Testing**: Vitest + React Testing Library (P0 功能需整合測試)
**Target Platform**: Web (行動優先前台 + 響應式後台), Firebase App Hosting (asia-east1)
**Project Type**: Web Application (Next.js App Router 單體應用)
**Performance Goals**:
- 優惠券領取響應時間 < 500ms
- 購物車優惠券驗證 < 300ms
- 優惠券列表載入 < 1s (含圖片)
- 折扣計算即時更新 < 100ms
**Constraints**:
- 必須支援離線優惠券緩存 (Zustand persist)
- 必須支援優惠券過期自動清理 (PostgreSQL Trigger)
- 必須支援大小寫不敏感代碼查詢 (PostgreSQL UPPER() 函式)
**Scale/Scope**:
- 預期優惠券數量: 100-500 張
- 預期客戶領取數: 10,000-50,000 筆
- 前端新增頁面: 2 個 (前台優惠券頁面 + 後台優惠券管理頁面)
- 前端新增元件: 8 個 (優惠券卡片、輸入口令、優惠券選擇器、折扣摘要等)
- Server Actions: 10-12 個函式

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 ✅ PASS

**檢查項目**:
- ✅ 雙入口設計：前台客戶優惠券頁面 (`/store/coupons`) + 後台管理優惠券頁面 (`/admin/coupons`)
- ✅ 客戶端行動優先：優惠券卡片採用觸控友善設計，輸入口令使用大觸控按鈕
- ✅ 管理端桌面優化：優惠券管理表格支援批次操作（批次刪除、批次啟用/停用）
- ✅ 權限隔離：RLS 確保客戶僅能查看自己領取的優惠券，管理員可查看所有優惠券

**符合度**: 100% - 完全符合

---

### II. 等級綁定價格 ✅ PASS

**檢查項目**:
- ✅ 優惠券支援等級限制 (`coupon_tier_restrictions` 表)
- ✅ 優惠券折扣不影響等級綁定價格邏輯（先套用等級價格，再套用優惠券折扣）
- ✅ 優惠券最低金額計算基於「限定系列的商品總額」（若有系列限制）或「整單總額」（若無系列限制）

**符合度**: 100% - 完全符合

---

### III. 使用者故事驅動開發 ✅ PASS

**檢查項目**:
- ✅ 規格包含 7 個使用者故事，優先級明確（P0 至 P2）
- ✅ 每個使用者故事可獨立測試與交付
- ✅ P0 故事為核心 MVP（客戶領取使用 + 管理員建立管理）

**符合度**: 100% - 完全符合

---

### IV. API 模組化與職責分離 ✅ PASS

**檢查項目**:
- ✅ UI 元件僅負責顯示與呼叫 Server Actions
- ✅ 所有優惠券操作透過 Server Actions 處理（`lib/actions/coupons.ts`）
- ✅ 所有 Server Actions 包含 Zod 驗證 (`lib/validations/coupon.schema.ts`) 與權限檢查 (`checkAuth()`)
- ✅ 購物車優惠券狀態由 Zustand 管理，訂單優惠券快照由 Server 管理

**符合度**: 100% - 完全符合

---

### V. 設計系統一致性 ✅ PASS

**檢查項目**:
- ✅ 優惠券卡片採用 Neo-Brutalism 風格（2-3px 黑邊框、硬邊陰影、點擊位移效果）
- ✅ 優惠券入口按鈕採用 Foodpanda 風格（醒目色彩、大觸控區域）
- ✅ 購物車優惠券提示採用橙色或綠色高亮（符合系統色彩規範）

**符合度**: 100% - 完全符合

---

### VI. 負庫存支援 ✅ PASS

**檢查項目**:
- ✅ 優惠券折扣計算不受負庫存影響
- ✅ 支援負庫存商品的優惠券使用（不檢查庫存狀態）

**符合度**: 100% - 完全符合

---

### VII. 使用者體驗優先 ✅ PASS

**檢查項目**:
- ✅ 前台提供視覺化優惠券卡片（Coupang 風格），提升領取意願
- ✅ 購物車提供醒目的「可使用優惠券」提示，引導客戶使用
- ✅ 優惠券即時驗證與錯誤提示，避免使用失敗
- ✅ 後台支援優惠券批次管理，減少重複操作

**符合度**: 100% - 完全符合

---

### 總結

**狀態**: ✅ 全部通過（7/7）

**無需額外複雜度說明**: 本功能完全符合專案憲章所有原則，無需額外複雜度辯護。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
vsale/
├── app/
│   ├── (shop)/                     # 前台客戶路由群組
│   │   └── store/
│   │       └── coupons/            # 【新增】優惠券頁面
│   │           └── page.tsx        # 優惠券列表 + 輸入口令入口
│   │
│   ├── (admin)/                    # 後台管理路由群組
│   │   └── admin/
│   │       └── coupons/            # 【新增】優惠券管理頁面
│   │           ├── page.tsx        # 優惠券列表 + 批次管理
│   │           └── [id]/           # 【新增】優惠券編輯頁面
│   │               └── page.tsx
│   │
│   └── (auth)/                     # 認證路由群組（無修改）
│
├── components/
│   ├── shop/                       # 前台元件
│   │   └── coupons/                # 【新增】優惠券元件
│   │       ├── CouponCard.tsx      # 優惠券卡片（Coupang 風格）
│   │       ├── CouponInput.tsx     # 輸入口令元件（Foodpanda 風格）
│   │       └── CouponSelector.tsx  # 優惠券選擇器（購物車使用）
│   │
│   ├── admin/                      # 後台元件
│   │   └── coupons/                # 【新增】優惠券管理元件
│   │       ├── CouponForm.tsx      # 優惠券建立/編輯表單
│   │       ├── CouponList.tsx      # 優惠券列表表格
│   │       └── CouponFilters.tsx   # 優惠券篩選器
│   │
│   └── ui/                         # 共用 UI 元件（無修改）
│
├── lib/
│   ├── actions/
│   │   └── coupons.ts              # 【新增】優惠券 Server Actions
│   │
│   ├── validations/
│   │   └── coupon.schema.ts        # 【新增】優惠券 Zod Schema
│   │
│   └── utils/
│       └── coupon-helpers.ts       # 【新增】優惠券工具函式（折扣計算、驗證邏輯）
│
├── stores/
│   └── cart.ts                     # 【修改】擴充購物車狀態（新增 appliedCoupon 欄位）
│
├── types/
│   └── index.ts                    # 【修改】新增優惠券型別定義
│
└── supabase/
    └── migrations/
        └── 20260106_create_coupon_tables.sql  # 【新增】優惠券資料表 Migration
```

**Structure Decision**: 採用 Next.js 15 App Router 單體應用架構，符合專案現有結構。所有新增檔案遵循專案既有的目錄組織慣例（前台 `(shop)`、後台 `(admin)`、共用 `lib`）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
