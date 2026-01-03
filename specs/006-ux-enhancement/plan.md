# Implementation Plan: UI/UX 優化與功能強化

**Branch**: `006-ux-enhancement` | **Date**: 2026-01-04 | **Spec**: [FEATURE_PLAN.md](./FEATURE_PLAN.md)
**Input**: Feature specification from `/specs/006-ux-enhancement/FEATURE_PLAN.md`

**Note**: This template is filled in by the `/speckit.planning` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

在完成核心業務功能後，本計畫聚焦於提升 Vsale-lite 的使用者體驗、介面美化與操作效率。透過深化現有功能、新增視覺引導、優化互動流程，使系統從「能用」進化到「好用且愛用」。

**核心交付物**:
- 前台: 全域搜尋、快速篩選、導航優化、商品卡片視覺優化 (4 項使用者故事)
- 後台: 側邊欄分類、客戶快篩、Excel 匯入/匯出、訂單刪除、商品標籤管理、儀表板視覺化 (6 項使用者故事)
- 品牌: Vsale Logo 設計與整合 (1 項使用者故事)

**技術方法**:
- 資料庫: 新增 `products.tags` 欄位支援標籤系統
- 前端: 使用防抖搜尋、多選篩選、色彩區分狀態
- 後端: SheetJS 處理 Excel 匯入/匯出、Server Actions 處理批次操作
- 設計: Neo-Brutalism 風格 Logo、品牌色彩系統

## Technical Context

**Language/Version**: TypeScript 5.7+ / Node.js v22.x LTS
**Primary Dependencies**: Next.js 15.1+ (App Router), React 19.x, Supabase (PostgreSQL), SheetJS (xlsx), Recharts (圖表庫, 選用)
**Storage**: Supabase PostgreSQL (雲端資料庫) + Supabase Storage (圖片儲存)
**Testing**: Vitest + React Testing Library (jsdom 環境)
**Target Platform**: Web (桌面與行動響應式設計)
**Project Type**: Web Application (前後台分離的單一 Next.js 專案)
**Performance Goals**:
- 搜尋響應時間 < 300ms (含防抖)
- 客戶篩選切換 < 200ms
- Excel 匯入 100 筆客戶 < 5s
- 首頁載入 < 2s (Mobile 4G)
**Constraints**:
- 必須符合 Neo-Brutalism 設計風格 (黑色邊框、硬邊陰影)
- 資料庫變更僅新增欄位，不修改現有結構 (向後相容)
- 前台優化行動裝置，後台優化桌面裝置
- 部署以最小上傳大小為原則 (Firebase App Hosting)
**Scale/Scope**:
- 11 項使用者故事 (US1-US11)
- 2 個資料庫 Migration
- 6+ 個新增 Server Actions
- 10+ 個 UI 元件更新或新增
- 預估 2-3 週開發週期

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 ✅ PASS
- **檢查**: 是否嚴格區分客戶與管理員的操作環境?
- **結果**: **通過** - 前台優化 (US1-US4) 針對行動裝置單手操作，後台優化 (US5-US10) 針對桌面批量操作，完全符合憲章要求。
- **證據**: US1-US4 明確標註 "Mobile First"，US5-US10 明確標註 "Desktop Optimized"。

### II. 等級綁定價格 ✅ PASS
- **檢查**: 是否維護「不同人看不同價」的價格隔離機制?
- **結果**: **通過** - 本功能不涉及價格邏輯變更，僅優化 UI 顯示（如 US4 提到「原價刪除線 + 您的價格醒目」），不破壞現有價格機制。
- **證據**: 無任何 Migration 修改 `tier_prices` 表結構。

### III. 使用者故事驅動開發 ✅ PASS
- **檢查**: 是否以使用者故事為設計核心?
- **結果**: **通過** - 所有功能均從使用者故事出發（US1-US11），每個故事包含角色、需求、功能、驗收標準、優先級。
- **證據**: FEATURE_PLAN.md 明確定義 11 項使用者故事，並標註 P0/P1/P2 優先級。

### IV. API 模組化與職責分離 ✅ PASS
- **檢查**: UI 元件是否僅負責顯示，API/Server Actions 負責業務邏輯?
- **結果**: **通過** - 所有資料操作（搜尋、篩選、Excel 匯入/匯出、訂單刪除）均透過 Server Actions 處理。
- **證據**: EXECUTIVE_SUMMARY.md 明確列出 6+ 個新增 Server Actions (searchProducts, filterProducts, exportClients, importClients, deleteOrder, batchUpdateProductTags)。

### V. 設計系統一致性 ✅ PASS
- **檢查**: 是否遵循 Neo-Brutalism 設計風格?
- **結果**: **通過** - US11 Logo 設計明確要求符合 Neo-Brutalism 風格，色彩系統新增品牌色時保留黑色邊框與硬邊陰影。
- **證據**: FEATURE_PLAN.md 色彩系統章節明確說明「保留黑色邊框與硬邊陰影 (Neo-Brutalism 核心)」。

### VI. 負庫存支援 ✅ PASS
- **檢查**: 是否支援負庫存下單，不檢查 Stock > 0?
- **結果**: **通過** - 本功能不涉及下單流程變更，US4 提到色彩區分庫存狀態（紅色邊框顯示「缺貨/預購」），不阻擋下單。
- **證據**: US4 驗收標準「預購商品顯示『可預購』提示」，未提及禁止下單。

### VII. 使用者體驗優先 ✅ PASS
- **檢查**: 是否在功能完備後持續優化 UI/UX?
- **結果**: **通過** - 本計畫正是憲章第七原則的直接實踐，所有使用者故事均聚焦於提升操作效率、視覺引導、品牌識別。
- **證據**: 本計畫為 Phase 006 - UX Enhancement，在 001-004 核心功能完成後啟動。

### 技術規範檢查 ✅ PASS
- **強制技術棧**: 完全符合 (Next.js 15, React 19, Supabase, Tailwind, SheetJS)
- **部署策略**: 符合最小上傳大小原則
- **Git Commit 規範**: 將使用繁體中文 commit message

### 資料庫規範檢查 ✅ PASS
- **正規化要求**: `products.tags TEXT[]` 新增欄位不破壞現有正規化結構
- **約束檢查**: Migration 包含 `CHECK (array_length(tags, 1) <= 5)` 約束
- **索引優化**: 建立 GIN 索引支援陣列查詢效能

### 總結
**GATE STATUS**: ✅ **ALL PASS** - 可進入 Phase 0 研究階段

**無違規需要正當化**，所有設計決策完全符合憲章 7 項核心原則與技術規範。

## Project Structure

### Documentation (this feature)

```text
specs/006-ux-enhancement/
├── FEATURE_PLAN.md      # 完整功能規劃 (已存在)
├── EXECUTIVE_SUMMARY.md # 執行摘要 (已存在)
├── plan.md              # 本文件 (/speckit.planning 輸出)
├── research.md          # Phase 0 輸出 (技術研究與決策)
├── data-model.md        # Phase 1 輸出 (資料模型設計)
├── quickstart.md        # Phase 1 輸出 (快速上手指南)
├── contracts/           # Phase 1 輸出 (API 合約定義)
│   ├── search-api.md
│   ├── filter-api.md
│   ├── excel-api.md
│   └── tags-api.md
└── tasks.md             # Phase 2 輸出 (/speckit.tasks 產生 - 尚未建立)
```

### Source Code (repository root)

**專案類型**: Next.js 15 Web Application (App Router 架構)

```text
vsale/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 認證路由群組
│   │   ├── login/                # 前台登入
│   │   └── admin/login/          # 後台登入
│   ├── (shop)/                   # 客戶端路由群組 (將新增/優化)
│   │   ├── layout.tsx            # 客戶端 Layout (US3: 導航優化)
│   │   └── store/                # 商店首頁 (US1-US4: 搜尋/篩選/視覺優化)
│   │       └── page.tsx          # 🆕 將大幅更新
│   └── (admin)/                  # 管理端路由群組 (將新增/優化)
│       └── admin/
│           ├── layout.tsx        # 🆕 US5: 側邊欄視覺分類
│           ├── dashboard/        # 🆕 US10: 儀表板視覺化
│           │   └── page.tsx
│           ├── users/            # 🆕 US6-US7: 客戶管理優化 + Excel
│           │   └── page.tsx
│           ├── products/         # 🆕 US9: 商品標籤管理
│           │   └── page.tsx
│           └── orders/           # 🆕 US8: 訂單刪除
│               └── [id]/page.tsx
│
├── components/
│   ├── ui/                       # 基礎 UI 元件 (Neo-Brutalism)
│   │   ├── logo.tsx              # 🆕 US11: Vsale Logo 元件
│   │   ├── search-bar.tsx        # 🆕 US1: 搜尋欄元件
│   │   ├── filter-buttons.tsx   # 🆕 US2: 篩選按鈕元件
│   │   └── tag-badge.tsx         # 🆕 US4/US9: 標籤徽章元件
│   ├── shop/                     # 前台元件
│   │   ├── product-card.tsx      # 🆕 US4: 商品卡片視覺優化
│   │   └── breadcrumb.tsx        # 🆕 US3: 麵包屑導航
│   └── admin/                    # 後台元件
│       ├── sidebar.tsx           # 🆕 US5: 側邊欄視覺分類
│       ├── client-filter.tsx    # 🆕 US6: 客戶快速切換
│       ├── excel-import.tsx     # 🆕 US7: Excel 匯入元件
│       ├── excel-export.tsx     # 🆕 US7: Excel 匯出元件
│       ├── tag-manager.tsx      # 🆕 US9: 標籤管理元件
│       └── dashboard-card.tsx   # 🆕 US10: 儀表板卡片
│
├── lib/
│   ├── actions/                  # Server Actions (將新增 6+ 個)
│   │   ├── products.ts           # 🆕 searchProducts, filterProducts
│   │   ├── clients.ts            # 🆕 exportClients, importClients
│   │   ├── orders.ts             # 🆕 deleteOrder
│   │   └── tags.ts               # 🆕 batchUpdateProductTags
│   ├── validations/              # Zod Schemas
│   │   ├── search.schema.ts      # 🆕 搜尋驗證
│   │   ├── filter.schema.ts      # 🆕 篩選驗證
│   │   └── excel.schema.ts       # 🆕 Excel 匯入驗證
│   └── utils/
│       └── excel.ts              # 🆕 SheetJS 工具函式
│
├── public/
│   ├── logo.svg                  # 🆕 US11: Vsale Logo SVG
│   ├── logo-icon.svg             # 🆕 US11: Logo 圖示版
│   └── favicon.ico               # 🆕 US11: Favicon
│
└── supabase/migrations/
    ├── 20260109_add_product_tags.sql        # 🆕 新增 products.tags 欄位
    └── 20260110_add_order_delete_action.sql # 🆕 訂單刪除操作記錄
```

**Structure Decision**:
- 採用 Next.js App Router 架構，前後台共用同一專案但使用路由群組分離
- 新增元件主要集中於 `components/shop/` 與 `components/admin/`
- Server Actions 集中於 `lib/actions/` 並依功能模組分檔
- 資料庫變更透過 Migration 檔案管理 (Supabase CLI)
- Logo 與靜態資源放置於 `public/` 目錄

## Complexity Tracking

> **無違規需要正當化** - Constitution Check 全部通過，無需填寫此表。

---

## Post-Design Constitution Re-Check

**執行時間**: 2026-01-04 (Phase 1 設計完成後)

### 驗證結果: ✅ **ALL PASS** (再次驗證)

經過 Phase 0 研究與 Phase 1 設計後，所有設計決策持續符合憲章要求:

1. **技術選擇驗證**:
   - ✅ SheetJS (xlsx) - 業界標準，符合簡單性原則
   - ✅ Recharts - React 原生，符合技術棧一致性
   - ✅ PostgreSQL TEXT[] 陣列 - 原生支援，無過度正規化

2. **架構設計驗證**:
   - ✅ Server Actions 模式 - 完全符合憲章第四原則
   - ✅ 資料庫變更向後相容 - 僅新增欄位，無修改現有結構
   - ✅ 前後台分離 - 維持雙入口設計

3. **API 合約驗證**:
   - ✅ 所有 API 包含權限檢查 (`checkAuth()`)
   - ✅ 所有輸入使用 Zod 驗證
   - ✅ 所有操作記錄操作歷史 (如訂單刪除)

4. **效能目標驗證**:
   - ✅ 搜尋響應 < 300ms (含防抖)
   - ✅ 篩選切換 < 200ms
   - ✅ Excel 匯入 100 筆 < 5s
   - ✅ 標籤查詢使用 GIN 索引 < 100ms

**結論**: 無新增風險或違規，可進入 Phase 2 任務拆分階段。

---

## Phase 2: Tasks Generation (Next Step)

**注意**: 本計畫 (plan.md) 的產出到此結束。下一步請執行:

```bash
/speckit.tasks
```

該指令將基於本計畫生成詳細的任務清單 (`tasks.md`)，包含:
- 任務拆分 (依 Phase 與 US 分組)
- 優先級排序 (P0/P1/P2)
- 預估工作量
- 依賴關係
- 驗收標準

---

## 文件產出總覽

本次 `/speckit.planning` 執行已完成以下文件:

1. ✅ `plan.md` - 本文件 (技術實作計畫)
2. ✅ `research.md` - 技術研究與決策記錄
3. ✅ `data-model.md` - 資料模型設計
4. ✅ `quickstart.md` - 快速上手指南
5. ✅ `contracts/search-api.md` - 搜尋 API 合約
6. ✅ `contracts/filter-api.md` - 篩選 API 合約
7. ✅ `contracts/excel-api.md` - Excel 匯入/匯出 API 合約
8. ✅ `contracts/tags-api.md` - 標籤管理 API 合約

**Agent Context 更新**: ✅ CLAUDE.md 已更新，新增技術棧資訊

---

**規劃完成日期**: 2026-01-04
**分支**: 006-ux-enhancement
**下一步**: 執行 `/speckit.tasks` 生成任務清單
